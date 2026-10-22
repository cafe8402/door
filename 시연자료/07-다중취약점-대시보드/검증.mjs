import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
function moduleUrl(file,replacements=[]){let s=stripTypeScriptTypes(fs.readFileSync(file,'utf8'));for(const [a,b]of replacements)s=s.replaceAll(a,b);s=s.replaceAll('./sourceAnalysis.mjs',new URL('../../src/services/sourceAnalysis.mjs',import.meta.url).href);return 'data:text/javascript;base64,'+Buffer.from(s).toString('base64');}
const scanner=moduleUrl('src/services/localSecurityScanner.ts');
const {runLocalSecurityScan}=await import(scanner);
const {resultActions}=await import(moduleUrl('src/services/resultActions.ts', [['./resultGroups',moduleUrl('src/services/resultGroups.ts')],['./localSecurityScanner',scanner],['./presentation',moduleUrl('src/services/presentation.ts')]]));
const root='시연자료/07-다중취약점-대시보드';
const dir=path.join(root,'업무포털');
function read(dir,prefix){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?read(path.join(dir,entry.name),prefix+'/'+entry.name):[{name:prefix+'/'+entry.name,content:fs.readFileSync(path.join(dir,entry.name),'utf8'),size:fs.statSync(path.join(dir,entry.name)).size}]);}
const files=read(dir,'업무포털');
const result=await runLocalSecurityScan({inputTab:'upload',files});
const actions=resultActions(result.issues,'real_file');
for(const file of files)for(const key of file.content.match(/sk-proj-[a-f0-9]{48}/g)||[])assert.ok(!JSON.stringify(result).includes(key),'키 원문 누출');
const summary={files:files.length,fix:0,review:0,example:0,groups:actions.map(a=>({분류:a.decision,내용:a.title,위치수:a.issues.length}))};
for(const action of actions)summary[action.decision]+=action.issues.length;
assert.ok(summary.fix>=30,'다중 수정 항목 확인');
fs.writeFileSync(path.join(root,'검증결과.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
