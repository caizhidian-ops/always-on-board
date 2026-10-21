import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseProcesses, parseLsof, buildProcessGroups} from '../processes.js'
const p=(pid,ppid,command,extra={})=>({pid,ppid,command,program:'node',startedAt:'Wed Oct 21 14:00:00 2026',identity:`identity-${pid}`,cpuPercent:2,rssMiB:10,...extra})
const meta=rows=>new Map(rows.map(([pid,cwd,ports=[]])=>[pid,{cwd,ports}]))
test('ps parser preserves command paths with spaces, filters other users, never publishes raw args',()=>{
 const rows=parseProcesses(' 12 1 501 2.5 2048 Wed Oct 21 14:00:00 2026 /Applications/Some App/node server.js --token=private\n 13 1 0 1.0 1024 Wed Oct 21 14:00:00 2026 /usr/bin/python app.py',501)
 assert.equal(rows.length,1);assert.equal(rows[0].rssMiB,2);assert.equal(rows[0].program,'node')
 const groups=buildProcessGroups(rows,meta([[12,'/project']]),[])
 assert.ok(!JSON.stringify(groups).includes('private'));assert.ok(!JSON.stringify(groups).includes('command'))
 assert.notEqual(rows[0].identity,parseProcesses('12 1 501 0.0 1 Thu Oct 22 14:00:00 2026 /node app.js',501)[0].identity)
})
test('parents and descendants merge, launchd trees are enriched rather than double counted',()=>{
 const rows=[p(10,1,'/node api.js'),p(11,10,'/node worker.js'),p(12,11,'/bin/helper'),p(20,1,'/node dev.js')]
 const tasks=[{pid:10}];const groups=buildProcessGroups(rows,meta(rows.map(p=>[p.pid,'/project',['127.0.0.1:3000']])),tasks)
 assert.deepEqual(tasks[0].members.map(p=>p.pid),[10,11,12]);assert.equal(tasks[0].rssMiB,30)
 assert.equal(groups.length,1);assert.deepEqual(groups[0].rootPids,[20]);assert.equal(groups[0].members.length,1)
})
test('independent instances group by project or agent tool, each member counted once',()=>{
 const rows=[p(10,1,'/uv blender-mcp'),p(11,10,'/python blender-mcp'),p(20,1,'/uv blender-mcp'),p(21,20,'/python blender-mcp'),p(30,1,'/node app.js'),p(40,1,'/node app.js')]
 const groups=buildProcessGroups(rows,meta([[10,'/a'],[11,'/a'],[20,'/b'],[21,'/b'],[30,'/project-a'],[40,'/project-b']]),[])
 const tool=groups.find(g=>g.category==='agent');assert.equal(tool.instanceCount,2);assert.equal(tool.members.length,4);assert.equal(tool.cpuPercent,8)
 assert.equal(groups.filter(g=>g.category==='project').length,2)
 assert.equal(new Set(groups.flatMap(g=>g.members.map(p=>p.pid))).size,6)
})
test('lsof parsing handles multiple ports and spaced cwd; unavailable ports stay unknown',()=>{
 const data=parseLsof('p10\nn/Users/example/My Project\np11\nn127.0.0.1:3000\nn*:8080\nn*:8080\n')
 assert.equal(data.get(10).cwd,'/Users/example/My Project');assert.deepEqual(data.get(11).ports,['127.0.0.1:3000','*:8080'])
 const group=buildProcessGroups([p(10,1,'/node app.js')],new Map(),[])[0];assert.equal(group.ports,null)
})
test('cyclic or missing ancestry terminates safely',()=>{
 const groups=buildProcessGroups([p(10,11,'/node a'),p(11,10,'/node b'),p(20,999,'/node c')],new Map(),[])
 assert.equal(groups.length,1);assert.deepEqual(groups[0].rootPids,[20])
})
test('live macOS collection observes a test-owned child listener without exposing arguments', {skip:process.platform!=='darwin',timeout:15000}, async()=>{
 const {spawn}=await import('node:child_process')
 const {collectProcesses}=await import('../processes.js')
 const child=spawn(process.execPath,['-e',"require('net').createServer().listen(0,'127.0.0.1',function(){process.send(this.address().port)})",'--','--token=live-test-secret'],{stdio:['ignore','ignore','ignore','ipc']})
 try {
  const port=await new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',()=>reject(new Error('Fixture exited before reporting port')))})
  const snapshot=await collectProcesses([])
  const matches=snapshot.tasks.flatMap(t=>t.members).filter(p=>p.pid===child.pid)
  assert.equal(matches.length,1);assert.ok(matches[0].ports.includes(`127.0.0.1:${port}`))
  assert.ok(matches[0].identity);assert.ok(matches[0].startedAt)
  assert.ok(!JSON.stringify(snapshot).includes('live-test-secret'))
 } finally {child.kill();await new Promise(resolve=>child.exitCode!==null||child.signalCode!==null?resolve():child.once('exit',resolve))}
})
