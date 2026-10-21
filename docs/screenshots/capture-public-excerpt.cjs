// Render a reviewed display-only projection of current real data in isolated DSH.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const snapshot=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:2,locale:'zh-CN'});
 await context.addInitScript(()=>localStorage.setItem('always-on-board.language','zh'));
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();return u.pathname==='/plugins/ops-board/state.json'?r.fulfill({json:snapshot}):r.continue()});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const log=fs.readFileSync(process.env.AOB_HOST_LOG,'utf8');await p.goto(log.match(/http:\/\/127[^\s]+/)[0]);
 await p.waitForTimeout(1000);if(await p.getByRole('button',{name:'继续',exact:true}).isVisible())await p.getByRole('button',{name:'继续',exact:true}).click();await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.getByRole('button',{name:'Always-on Board',exact:true}).click();await p.locator('.dsh-ops-row').last().waitFor();
 if(await p.locator('.dsh-ops-row').count()!==6)throw Error('Expected six real rows');
 const text=await p.locator('.dsh-ops-root').innerText();if(/\/Users\/|VPN|Clash|Tunnelblick|sg-agent/.test(text))throw Error('Unexpected private text');
 const box=await p.locator('.dsh-ops-root').boundingBox();const table=await p.locator('.dsh-ops-table').boundingBox();
 await p.mouse.move(1590,890);await p.screenshot({path:path.resolve(__dirname,'../images/05-real-public-tasks.png'),clip:{x:box.x,y:box.y,width:box.width,height:Math.ceil(table.y+table.height-box.y+28)},animations:'disabled'});
 if(errors.length)throw Error(errors.join('\n'));console.log('Six real rows rendered; no messages or task actions performed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
