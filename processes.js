import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createHash} from 'node:crypto'
import {stat} from 'node:fs/promises'
import {basename, dirname, join, parse} from 'node:path'
import {homedir} from 'node:os'

const exec = promisify(execFile)
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 24)
const runtime = /(?:^|\/)(node|nodejs|python[\d.]*|Python|npm|npx|uv|uvicorn|gunicorn|nohup|pm2|tsx|vite|bun|deno)(?=\s|$)/i

export function parseProcesses(text, uid) {
  return text.split('\n').flatMap(line => {
    // ps lstart has five words; retain the rest of the line as internal evidence only.
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+[\d:]+\s+\d+)\s+([\s\S]+)$/)
    if (!match || Number(match[3]) !== uid) return []
    const [,pid,ppid,,cpu,rss,startedAt,command] = match
    return [{pid:Number(pid),ppid:Number(ppid),cpuPercent:Number(cpu),rssMiB:Number(rss)/1024,
      startedAt,command,identity:hash(`${pid}:${startedAt}:${command}`),program:runtime.exec(command)?.[1] || basename(command.split(' ')[0]) || 'process'}]
  })
}

export function parseLsof(text) {
  const result = new Map(); let entry
  for (const line of text.split('\n')) {
    if (line.startsWith('p')) { const pid=Number(line.slice(1)); entry=result.get(pid) || {ports:[],cwd:null}; result.set(pid,entry) }
    else if (line.startsWith('n') && entry) {
      const name=line.slice(1)
      if (name.startsWith('/')) entry.cwd=name
      else if (!entry.ports.includes(name)) entry.ports.push(name)
    }
  }
  return result
}

export function agentTool(command, cwd='') {
  const text = `${command} ${cwd}`
  for (const [pattern,name] of [
    [/blender-mcp/i,'Blender MCP'], [/cua-repl/i,'Computer Use'], [/code-review-plugin/i,'Code Review MCP'],
    [/codex-app-tools/i,'Codex App Tools'], [/ops-board.*(?:server|index)|ops-board-codex/i,'Always-on Board MCP'],
    [/node_repl|kernel\.js|trusted-worker\.js/i,'Agent JavaScript Runtime'], [/artifact-session/i,'Artifact Runtime'],
  ]) if (pattern.test(text)) return name
  const plugin = text.match(/\/plugins\/cache\/([^/\s]+)\/([^/\s]+)/)
  return plugin ? `Plugin: ${plugin[2]}` : null
}

async function projectPath(cwd, cache) {
  if (!cwd || cwd === homedir() || cwd === '/') return null
  if (cache.has(cwd)) return cache.get(cwd)
  let dir=cwd, found=null
  while (dir !== parse(dir).root && dir !== homedir()) {
    if (await stat(join(dir,'.git')).then(()=>true,()=>false)) { found=dir; break }
    if (!found && (await Promise.all(['package.json','pyproject.toml','Cargo.toml','go.mod'].map(f=>stat(join(dir,f)).then(()=>true,()=>false)))).some(Boolean)) found=dir
    dir=dirname(dir)
  }
  // Unmarked working directories are useful, but never claim verified project ownership.
  cache.set(cwd,found || cwd)
  return found || cwd
}

export function buildProcessGroups(processes, metadata, launchTasks, projectPaths = new Map()) {
  const byPid=new Map(processes.map(p=>[p.pid,p])), children=new Map()
  for (const p of processes) { if (!children.has(p.ppid)) children.set(p.ppid,[]); children.get(p.ppid).push(p.pid) }
  const selected=new Set(), assigned=new Set(), groups=new Map()
  const tree = root => { const ids=[], seen=new Set(); const visit=pid=>{ if(seen.has(pid)||!byPid.has(pid))return;seen.add(pid);ids.push(pid);for(const c of children.get(pid)||[])visit(c) };visit(root);return ids }
  const resource = ids => {
    const members=ids.map(pid=>{const p=byPid.get(pid), m=metadata.get(pid);return {pid,ppid:p.ppid,startedAt:p.startedAt,identity:p.identity,program:p.program,cpuPercent:p.cpuPercent,rssMiB:p.rssMiB,cwd:m?.cwd || null,ports:m ? m.ports : null}})
    return {members,cpuPercent:Number(members.reduce((n,p)=>n+p.cpuPercent,0).toFixed(1)),rssMiB:Number(members.reduce((n,p)=>n+p.rssMiB,0).toFixed(1)),
      ports:members.every(p=>p.ports!==null)?[...new Set(members.flatMap(p=>p.ports))].sort():null}
  }
  for(const task of launchTasks) {
    if (!task.pid || !byPid.has(task.pid)) continue
    const ids=tree(task.pid);ids.forEach(pid=>assigned.add(pid));Object.assign(task,resource(ids));task.rootPids=[task.pid];task.observedAt=processes.observedAt
  }
  for(const p of processes) if(runtime.test(p.command)) for(const pid of tree(p.pid)) selected.add(pid)
  for(const pid of assigned) selected.delete(pid)
  for(const pid of selected) {
    const p=byPid.get(pid)
    if(selected.has(p.ppid))continue
    const ids=tree(pid).filter(id=>selected.has(id)), m=metadata.get(pid)
    const tool=agentTool(p.command,m?.cwd || ''), project=projectPaths.get(p.pid) || projectPaths.get(m?.cwd) || m?.cwd || null
    const category=tool?'agent':project && project!=='/' && project!==homedir()?'project':'other'
    const label=tool || (category==='project'?basename(project):'Unattributed processes')
    const key=`${category}:${tool || (category==='project'?project:`${p.program}:${pid}`)}`
    if(!groups.has(key))groups.set(key,{id:`process:${hash(key)}`,kind:'process',category,management:'unassociated',sourceStatus:'unknown',groupLabel:label,title:label,projectPath:category==='project'?project:null,
      scope:'user',program:p.program,args:[],running:true,state:'ok',reason:'running',pid,rootPids:[],ids:[],lastUpdate:Date.now(),plistPath:null})
    const g=groups.get(key);g.ids.push(...ids);g.rootPids.push(pid)
  }
  return [...groups.values()].map(g=>{const {ids,...rest}=g;return {...rest,...resource([...new Set(ids)]),instanceCount:g.rootPids.length}})
}

export async function collectProcesses(launchTasks) {
  const observedAt=new Date().toISOString(), gaps=[]
  let processes
  try {
    const {stdout}=await exec('/bin/ps',['-axo','pid=,ppid=,uid=,%cpu=,rss=,lstart=,args='],{timeout:4000,maxBuffer:16*1024*1024,env:{...process.env,LC_ALL:'C'}})
    processes=parseProcesses(stdout,process.getuid())
  } catch { return {tasks:[],observedAt,gaps:['Process query unavailable; resource values are unknown.']} }
  // Exclude the observer itself. Keep its independently running services visible.
  processes=processes.filter(p=>p.pid!==process.pid);processes.observedAt=observedAt
  const metadata=new Map()
  // Batch lsof calls. No arbitrary command strings, shell evaluation or per-process subprocess loop.
  for(let i=0;i<processes.length;i+=200) {
    const pids=processes.slice(i,i+200).map(p=>p.pid).join(',')
    for(const args of [['-d','cwd'],['-iTCP','-sTCP:LISTEN']]) {
      let output=''
      try { output=(await exec('/usr/sbin/lsof',['-nP','-a','-p',pids,...args,'-Fpn'],{timeout:5000,maxBuffer:8*1024*1024})).stdout }
      catch(error) { if(error.code===1&&!error.stderr)output=error.stdout || '';else {gaps.push(`lsof ${args[0]} unavailable for a process batch.`);continue} }
      const found=parseLsof(output)
      for(const p of processes.slice(i,i+200)) {
        const m=metadata.get(p.pid)||{cwd:null,ports:null}
        if(args[0]==='-d')m.cwd=found.get(p.pid)?.cwd || null
        else m.ports=found.get(p.pid)?.ports || (m.cwd ? [] : null)
        metadata.set(p.pid,m)
      }
    }
  }
  const paths=new Map()
  for(const m of metadata.values())if(m.cwd)await projectPath(m.cwd,paths)
  for(const p of processes) {
    const target=p.command.match(/--directory\s+(.+?)(?=\s+--|$)/)?.[1]
    if(target?.startsWith('/') && await stat(target).then(s=>s.isDirectory(),()=>false)) paths.set(p.pid,await projectPath(target,paths))
  }
  for (const task of launchTasks) {
    const cwd = task.workingDirectory || metadata.get(task.pid)?.cwd
    const command = [task.program,...(task.args || [])].join(' ')
    const tool = agentTool(command,cwd || '')
    const directory = command.match(/--directory\s+(.+?)(?=\s+--|$)/)?.[1]
    const candidate = directory?.startsWith('/') ? directory : cwd
    const project = candidate ? await projectPath(candidate,paths) : null
    task.category = tool ? 'agent' : project ? 'project' : 'other'
    task.projectPath = tool ? null : project
    task.groupLabel = tool || (project ? basename(project) : null)
    task.purposeEvidence = tool ? 'tool-pattern' : project ? 'directory-inference' : 'unknown'
  }
  const tasks=buildProcessGroups(processes,metadata,launchTasks,paths).map(t=>({...t,observedAt}))
  if(processes.some(p=>!metadata.get(p.pid)?.cwd))gaps.push('Some working directories unavailable; project attribution may be incomplete.')
  return {tasks,observedAt,gaps:[...new Set(gaps)],metrics:'CPU: ps average (% of one core); RSS: sum in MiB, shared pages may be counted more than once. Ports: TCP LISTEN only; empty does not prove health.'}
}
