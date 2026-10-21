import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
function extract(name, next) { return source.slice(source.indexOf(`        function ${name}`), source.indexOf(next, source.indexOf(`        function ${name}`))).trim(); }
const prompt = Function(`${extract('taskPrompt', '        async function prepareTaskDraft')} return taskPrompt;`)();
const h = (tag, props, ...children) => ({tag, props, children});
const menu = Function('h','createPortal','useRef','useEffect','window','document',`${extract('TaskMenu','        function TaskModal')} return TaskMenu;`)(h, value => value, () => ({}), () => {}, {innerWidth:1000,innerHeight:800}, {body:{}});
const task={id:'com.user.example',title:'example',scope:'user',plistPath:'~/Library/LaunchAgents/com.user.example.plist'};
function menuLabels(data) { return menu({position:{x:50,y:50},task:data,t:key=>key,onAction(){},onClose(){},rowRef:{}}).children.filter(x=>x.tag==='button').map(x=>x.children[0]); }
test('missing description offers fill, manual or automatic descriptions do not',()=>{
 assert.ok(menuLabels(task).includes('fill'));
 assert.ok(menuLabels({...task,note:'  ',autoNote:''}).includes('fill'));
 assert.ok(!menuLabels({...task,note:'任务说明'}).includes('fill'));
 assert.ok(!menuLabels({...task,autoNote:'自动说明'}).includes('fill'));
});
test('drafts stay short, identify the exact task and preserve other notes',()=>{
 for(const action of ['repair','disable','explain','fill']) { const text=prompt(task,action); assert.ok(text.length<350); assert.ok(text.includes(task.id));assert.ok(text.includes(task.plistPath)); }
 assert.ok(prompt(task,'fill').includes('保留其他条目'));
 assert.ok(prompt(task,'disable').includes('保留配置和数据'));
 assert.ok(prompt(task,'explain').includes('不修改'));
});
