import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=await readFile(new URL('../client.js',import.meta.url),'utf8')
const extract=(name,next)=>source.slice(source.indexOf(`        function ${name}`),source.indexOf(`        function ${next}`,source.indexOf(`        function ${name}`)))
const h=(tag,props,...children)=>({tag,props:props || {},children})
test('hover and keyboard focus render a visible tooltip; leave and blur dismiss it',()=>{
 let position=null
 const factory=Function('h','createPortal','useState','useRef','useEffect','window','document','StateIcon','stateSymbol','shortState',`let statusHintSequence=0; ${extract('StatusHint','taskSections')} return StatusHint`)
 const render=factory(h,value=>value,()=>[position,next=>{position=next}],()=>({current:null}),()=>{}, {innerWidth:800,innerHeight:600}, {body:{}},()=>null,()=> 'attention',()=> 'exit 78')
 const props={task:{},t:key=>key==='status.attention'?'Needs attention':key}
 const event={currentTarget:{getBoundingClientRect:()=>({left:750,bottom:570,width:18})}}
 render(props).props.onMouseEnter(event)
 let view=render(props);let tooltip=view.children.find(c=>c?.props?.role==='tooltip')
 assert.equal(tooltip.children[0],'Needs attention · exit 78')
 assert.ok(tooltip.props.style.left+tooltip.props.style.width<=800)
 view.props.onMouseLeave();assert.equal(position,null)
 render(props).props.onFocus(event);assert.ok(position)
 render(props).props.onBlur();assert.equal(position,null)
})
test('a configuration-only detail uses three short fields without noisy placeholders',()=>{
 const Detail=Function('h','describe','shortState',`${extract('Detail','taskPrompt')} return Detail`)(h,()=>({text:'Preview API'}),()=> 'Not loaded')
 const view=Detail({task:{plistPath:'~/Library/LaunchAgents/com.example.preview.plist'},t:key=>key})
 assert.equal(view.tag,'dl');const rows=view.children.flat();assert.equal(rows.length,3)
 assert.deepEqual(rows.map(row=>row.children[0].children[0]),['notes.label','field.reason','detail.config'])
})
