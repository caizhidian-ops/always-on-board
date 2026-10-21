// NODE_PATH must expose playwright. Chrome is launched with a fresh profile.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/images');
const now=Date.now();
const job=(id,note,state,extra={})=>({id,title:id,note,state,scope:'user',management:'launchd',runtimeStatus:'loaded',program:'node',plistPath:`~/Library/LaunchAgents/${id}.plist`,running:state==='ok',reason:state==='fail'?'exited-nonzero':state==='idle'?'not-loaded':'running',pid:state==='ok'?42001:null,exitCode:state==='fail'?1:0,ports:[],lastUpdate:now-120000,...extra});
const tasks=[job('com.example.preview','本地项目预览服务','ok',{ports:['127.0.0.1:4173']}),job('com.example.daily-report','每日生成示例项目摘要','fail'),job('com.example.archive','旧项目归档任务，尚未加载','idle',{management:'definition',runtimeStatus:'not-loaded'}),{...job('process:demo-api','示例 API 开发服务','ok'),title:'demo-api',kind:'process',management:'unassociated',category:'project',projectPath:'~/Projects/demo/api',rootPids:[42010],instanceCount:1,members:[{pid:42010,ppid:42000,startedAt:'2026-10-21T01:00:00Z',identity:'demo-identity',program:'node'}],ports:['127.0.0.1:3000'],cpuPercent:0.2,rssMiB:48,observedAt:'2026-10-21T02:00:00Z'}, {...job('process:demo-worker','示例队列 worker','ok'),title:'demo-worker',kind:'process',rootPids:[42020],members:[{pid:42020}],ports:[]}];
let empty=true;const errors=[];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,locale:'zh-CN',colorScheme:'light'});
 await context.addInitScript(()=>localStorage.setItem('always-on-board.language','zh'));
 const p=await context.newPage();
 p.setDefaultTimeout(10000);
 p.on('pageerror',e=>errors.push(e.message));
 // All network is restricted to the isolated host; snapshot comes from this file.
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='127.0.0.1') return route.abort();
  if(url.pathname==='/plugins/ops-board/state.json') {
   const rows=empty?[]:tasks;const summary={total:rows.length,ok:0,warn:0,fail:0,idle:0};rows.forEach(t=>summary[t.state]++);
   return route.fulfill({json:{generatedAt:new Date(now).toISOString(),host:'demo-mac',sources:['~/Library/LaunchAgents','/Library/LaunchDaemons','current-user processes (ps + lsof)'],summary,notes:{count:3},tasks:rows}});
  }
  return route.continue();
 });
 const log=fs.readFileSync(process.env.AOB_HOST_LOG || '/tmp/always-on-board-docs.log','utf8');
 await p.goto(log.match(/http:\/\/127[^\s]+/)[0]);
 await p.waitForTimeout(1000);
 if(await p.getByRole('button',{name:'继续',exact:true}).isVisible()) await p.getByRole('button',{name:'继续',exact:true}).click();
 await p.keyboard.press('Escape');
 await p.waitForTimeout(300);
 await p.getByText('Always-on Board',{exact:true}).click();
 
 await p.locator('.dsh-ops-empty').filter({hasText:'没有发现任务或匹配的进程'}).waitFor();
 await p.mouse.move(1400,880);
 const emptyImage=await p.screenshot();
 empty=false;await p.getByRole('button',{name:'刷新',exact:true}).click();
 await p.getByText('com.example.preview',{exact:true}).waitFor();
 const listImage=await p.screenshot();
 const row=p.getByRole('group',{name:'com.example.preview 右键选择操作',exact:true});
 await row.click({button:'right',position:{x:400,y:20}});
 await p.getByRole('menu').waitFor();
 await p.getByRole('menuitem',{name:'解释',exact:true}).hover();
 const menuImage=await p.screenshot({clip:{x:280,y:0,width:1160,height:430}});
 await p.getByRole('menuitem',{name:'解释',exact:true}).click();
 const editor=p.locator('[contenteditable="true"]').first();
 await editor.waitFor();
 await p.waitForFunction(()=>document.querySelector('[contenteditable="true"]')?.textContent.includes('com.example.preview'));
 const draft=await editor.innerText();
 if(!draft.includes('只查看，不修改') || !draft.includes('~/Library/LaunchAgents/com.example.preview.plist')) throw Error('Wrong draft');
 console.log('Real DSH composer draft verified; no send action performed.');
 // Keep the actual composer and host labels, crop away unused whitespace above it.
 const editorBox=await editor.boundingBox();
 const draftImage=await p.screenshot({clip:{x:280,y:Math.max(0,Math.min(540,editorBox.y-60)),width:1160,height:350}});
 const presentation=await context.newPage();await presentation.unrouteAll();
 const uri=buf=>'data:image/png;base64,'+buf.toString('base64');
 const style=`<style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:system-ui,-apple-system,sans-serif}header{height:100px;padding:24px 32px;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between}h1{font-size:24px;margin:0;font-weight:600}small{font-size:14px;color:#555}img{display:block} .step{font-size:16px;margin:12px 140px 8px}</style>`;
 async function render(name,title,body){await presentation.setViewportSize({width:1440,height:1000});await presentation.setContent(`${style}<header><h1>${title}</h1><small>Always-on Board · 隔离演示 / 示例数据</small></header>${body}`);await presentation.evaluate(()=>document.fonts.ready);await presentation.screenshot({path:path.join(out,name)});}
 await render('01-empty.png','01 · 初次打开：没有匹配任务',`<img width="1440" height="900" src="${uri(emptyImage)}">`);
 await render('02-setup.png','02 · 安装本地 bundle 并启用',`<main style="margin:68px auto;width:1100px"><p style="font-size:16px;color:#555">安装配置说明 · 非产品向导</p><h2 style="font-size:24px;margin:30px 0 18px">将源码目录交给 DSH 插件管理器</h2><pre style="font:19px/1.9 ui-monospace,monospace;background:#f5f5f5;border:1px solid #ddd;border-radius:12px;padding:24px">git clone https://github.com/caizhidian-ops/always-on-board.git\ncd always-on-board</pre><p style="font-size:18px;margin-top:36px">① 在支持 plugin_manager 的 DSH 中安装本地 bundle：</p><pre style="font:19px/1.9 ui-monospace,monospace;background:#f5f5f5;border:1px solid #ddd;border-radius:12px;padding:24px">install_bundle target=/Users/demo/Projects/demo/always-on-board</pre><p style="font-size:15px;color:#555">target 请替换为本机仓库的绝对路径；此处为脱敏路径示意。</p><p style="font-size:18px;margin-top:36px">② 启用 @local/dsh-ops-board → 从侧边栏打开 Always-on Board。</p><p style="font-size:18px;margin-top:28px">③ 保留源码目录；先在 DSH 创建 Workspace，再使用右键草稿入口。</p></main>`);
 await render('03-lists.png','03 · 查看常驻任务与运行进程',`<img width="1440" height="900" src="${uri(listImage)}">`);
 await render('04-explain-draft.png','04 · 右键“解释” → 检查 Agent 草稿',`<p class="step">① 选择“解释”</p><img style="margin:0 auto;border:1px solid #ddd" width="1160" height="430" src="${uri(menuImage)}"><p class="step">② DSH 新会话中已填入草稿，由你检查并发送（本次未发送）</p><img style="margin:0 auto;border:1px solid #ddd" width="1160" height="350" src="${uri(draftImage)}">`);
 if(errors.length) throw Error(errors.join('\n'));
 await browser.close();console.log('4 images written. No browser errors.');
})().catch(e=>{console.error(e);process.exit(1)});
