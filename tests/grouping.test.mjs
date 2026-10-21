import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {classify} from '../index.js'
const source=await readFile(new URL('../client.js',import.meta.url),'utf8')
const extract=(name,next)=>source.slice(source.indexOf(`        function ${name}`),source.indexOf(`        function ${next}`,source.indexOf(`        function ${name}`)))
const sections=Function(`${extract('taskSections','Panel')} return taskSections`)()
const symbol=Function(`${extract('stateSymbol','taskSections')} return stateSymbol`)()
test('management is the outer partition and purpose/project is the inner grouping',()=>{
 const rows=[{id:'api',management:'launchd',category:'project',projectPath:'/repo'}, {id:'worker',management:'launchd',category:'project',projectPath:'/repo'}, {id:'tool',kind:'process',management:'unassociated',category:'agent'}, {id:'dev',kind:'process',management:'unassociated',category:'project',projectPath:'/repo'}, {id:'old',management:'definition',category:'project',projectPath:'/repo'}, {id:'vendor',management:'definition',category:'other'}]
 const result=sections(rows)
 assert.deepEqual(result.map(s=>s.management),['launchd','unassociated','definition'])
 assert.deepEqual(result[0].groups[0].rows.map(t=>t.id),['api','worker'])
 assert.deepEqual(result[1].groups.map(g=>g.category),['project','agent'])
 assert.equal(result.flatMap(s=>s.groups.flatMap(g=>g.rows)).length,rows.length)
})
test('unloaded and unverified definitions never imply KeepAlive failure',()=>{
 for(const status of ['not-loaded','unknown']){
  const result=classify({runtimeStatus:status,keepAlive:true,exitCode:1},Date.now())
  assert.equal(result.state,'idle');assert.equal(result.reason,status==='unknown'?'runtime-unknown':'not-loaded')
 }
 assert.equal(classify({runtimeStatus:'loaded',running:false,exitCode:1},Date.now()).state,'fail')
})
test('status symbols retain distinctions without visible state prose',()=>{
 assert.equal(symbol({reason:'not-loaded',state:'idle'}),'—')
 assert.equal(symbol({reason:'runtime-unknown',state:'idle'}),'?')
 assert.equal(symbol({state:'fail'}),'!')
 assert.equal(symbol({running:true,state:'ok'}),'✓')
 assert.equal(symbol({running:false,state:'ok'}),'◷')
})
