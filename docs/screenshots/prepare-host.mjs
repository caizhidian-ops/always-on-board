// Run with Node 22. Creates ONLY a disposable DSH_HOME supplied by the caller.
import {mkdir,readFile,writeFile,copyFile,symlink,stat} from 'node:fs/promises'
import {resolve,join} from 'node:path'
const home=resolve(process.argv[2] || '/tmp/always-on-board-docs')
const repo=resolve(import.meta.dirname,'../..')
const marker=join(home,'.aob-docs-host')
if(await stat(home).then(()=>true,()=>false)) {
  if(!await stat(marker).then(()=>true,()=>false)) throw Error('Refusing to overwrite an existing non-demo DSH_HOME')
}
await mkdir(home,{recursive:true})
await writeFile(marker,'Disposable Always-on Board documentation host\n')
const profile=join(home,'profiles/web')
const bundle=join(home,'demo-bundle')
await mkdir(bundle,{recursive:true})
await mkdir(join(profile,'node_modules/@local'),{recursive:true})
const pkg=JSON.parse(await readFile(join(repo,'package.json')))
await writeFile(join(bundle,'package.json'),JSON.stringify({...pkg, exports:{...pkg.exports,'.':'./index.js'}},null,2))
for(const file of ['client.js','icon.svg','cordis.patch.yml']) await copyFile(join(repo,file),join(bundle,file))
await mkdir(join(bundle,'locale'),{recursive:true})
for(const lang of ['en','zh']) await copyFile(join(repo,`locale/${lang}.json`),join(bundle,`locale/${lang}.json`))
// Never import the real collector: no ps, launchctl, logs, notes or user files.
await writeFile(join(bundle,'index.js'),`export const name='ops-board'; export function apply() {}`)
await symlink(bundle,join(profile,'node_modules/@local/dsh-ops-board')).catch(e=>{if(e.code!=='EEXIST') throw e})
await writeFile(join(profile,'package.json'),JSON.stringify({name:'docs-host',private:true,dependencies:{'@local/dsh-ops-board':`link:${bundle}`},dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app','@local/dsh-ops-board']}}},null,2))
await writeFile(join(profile,'cordis.yml'),'[]\n')
await writeFile(join(profile,'cordis.patch.yml'),'- id: session-title-llm\n  disabled: true\n- id: session-telemetry-otel\n  disabled: true\n')
console.log('Disposable host prepared:',home)
