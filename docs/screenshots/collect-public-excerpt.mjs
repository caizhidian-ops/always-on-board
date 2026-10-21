// Read-only documentation capture. Never call the real collector's notes writer.
import {readFile,writeFile} from 'node:fs/promises'
const base=new URL('../../',import.meta.url)
let source=await readFile(new URL('index.js',base),'utf8')
const original='const { notes, meta: notesMeta } = await readNotes(tasks)'
if(!source.includes(original)) throw Error('Collector changed; review the read-only adapter')
source=source.replace("'./processes.js'",JSON.stringify(new URL('processes.js',base).href))
  .replace(original,'const notes = await readFile(NOTES_PATH, \'utf8\').then(s => JSON.parse(s).notes || {}, () => ({})); const notesMeta = {}')
const {collect}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
const all=await collect()
const taskNames=['innote.local-api','grayhole-dashboard','important-kanban']
const processNames=['remotion','Blender MCP','Code Review MCP']
const rows=[...taskNames.map(name=>all.tasks.find(t=>t.kind!=='process'&&t.title===name)),...processNames.map(name=>all.tasks.find(t=>t.kind==='process'&&t.title===name))]
if(rows.some(t=>!t))throw Error('An expected real task/process is absent; do not fabricate it')
// Export only display fields. Never publish source paths, arguments, commands,
// identities, hostnames, personal notes or unselected tasks.
// Public purpose annotations transcribed from the user's supplied screenshot.
const purposes={'innote.local-api':'innote 的本地 API，用 npm run 启动','grayhole-dashboard':'本机起一个静态网页服务，给 grayhole 看板用','important-kanban':'重要事项看板的后端服务'}
const tasks=rows.map(t=>({id:t.title,title:t.title,kind:t.kind,scope:t.scope,state:t.state,reason:t.reason,running:t.running,runtimeStatus:t.runtimeStatus,exitCode:t.exitCode,lastUpdate:t.lastUpdate,ports:t.ports,note:purposes[t.title]||t.note||t.autoNote||null,rootPids:t.rootPids?.map((_,i)=>i),members:t.members?.map(()=>({}))}))
const summary={total:tasks.length,ok:0,warn:0,fail:0,idle:0};tasks.forEach(t=>summary[t.state]++)
await writeFile(process.argv[2],JSON.stringify({generatedAt:all.generatedAt,summary,tasks},null,2))
console.log(JSON.stringify(tasks.map(({title,note,state,ports,members})=>({title,note,state,ports,processCount:members?.length})),null,2))
