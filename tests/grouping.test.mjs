import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {classify} from '../index.js'
const source=await readFile(new URL('../client.js',import.meta.url),'utf8')
const extract=(name,next)=>source.slice(source.indexOf(`        function ${name}`),source.indexOf(`        function ${next}`,source.indexOf(`        function ${name}`)))
const sections=Function(`${extract('taskSections','Panel')} return taskSections`)()
const symbol=Function(`${extract('stateSymbol','StateIcon')} return stateSymbol`)()
test('only two flat sections retain every task once, including unloaded definitions',()=>{
 const rows=[{id:'api',management:'launchd',category:'project'}, {id:'worker',management:'launchd',category:'project'}, {id:'tool',kind:'process',category:'agent'}, {id:'dev',kind:'process',category:'project'}, {id:'old',management:'definition'}, {id:'vendor',management:'definition'}]
 const result=sections(rows)
 assert.deepEqual(result.map(s=>s.key),['persistent','processes'])
 assert.deepEqual(result[0].rows.map(t=>t.id),['api','worker','old','vendor'])
 assert.deepEqual(result[1].rows.map(t=>t.id),['tool','dev'])
 assert.equal(result.flatMap(s=>s.rows).length,rows.length)
 assert.ok(result.every(s=>!s.groups))
 assert.equal(sections([rows[2]]).length,1)
 assert.deepEqual(sections([]),[])
})
test('unloaded and unverified definitions never imply KeepAlive failure',()=>{
 for(const status of ['not-loaded','unknown']){
  const result=classify({runtimeStatus:status,keepAlive:true,exitCode:1},Date.now())
  assert.equal(result.state,'idle');assert.equal(result.reason,status==='unknown'?'runtime-unknown':'not-loaded')
 }
 assert.equal(classify({runtimeStatus:'loaded',running:false,exitCode:1},Date.now()).state,'fail')
})
test('three presentation states preserve precise runtime reasons for details',()=>{
 assert.equal(symbol({reason:'not-loaded',state:'idle'}),'idle')
 assert.equal(symbol({reason:'runtime-unknown',state:'idle'}),'idle')
 assert.equal(symbol({state:'fail'}),'attention')
 assert.equal(symbol({state:'warn'}),'attention')
 assert.equal(symbol({running:true,state:'ok'}),'ok')
 assert.equal(symbol({running:false,state:'ok'}),'ok')
})
