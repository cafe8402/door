import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(fs.readFileSync(new URL('../src/services/localSecurityScanner.ts', import.meta.url), 'utf8'));
const { runLocalSecurityScan, compareScanResults } = await import('data:text/javascript;base64,' + Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64'));
const root = new URL('../demo-data/acceptance/', import.meta.url);
const scan = async folder => runLocalSecurityScan({ inputTab:'upload', files: fs.readdirSync(new URL(folder+'/',root)).map(name => ({name, content: fs.readFileSync(new URL(folder+'/'+name,root),'utf8')})) });
const counts = entries => Object.fromEntries(['resolved','persisting','unverified','new'].map(s=>[s,entries.filter(e=>e.status===s).length]));
test('acceptance: four distinct findings disappear only after all three files are rescanned', async () => {
  const before=await scan('before'), fixed=await scan('fixed');
  assert.deepEqual(before.issues.map(i=>i.ruleId).sort(), ['#VULN-KEY-01','#VULN-SQL-15','#VULN-CORS-06','#VULN-RLS-17'].sort());
  assert.equal(fixed.issues.length,0);
  assert.deepEqual(counts(compareScanResults(before.issues,fixed.issues,fixed.scannedFileNames)),{resolved:4,persisting:0,unverified:0,new:0});
});
test('acceptance: partial repair keeps SQL, detects new eval and leaves omitted policy unverified',async()=>{
  const before=await scan('before'), partial=await scan('partial');
  assert.deepEqual(counts(compareScanResults(before.issues,partial.issues,partial.scannedFileNames)),{resolved:2,persisting:1,unverified:1,new:1});
});
test('acceptance: renamed fixed file is not proof the old file was fixed',async()=>{
  const before=await scan('before'), fixed=await scan('fixed');
  assert.deepEqual(counts(compareScanResults(before.issues,fixed.issues,fixed.scannedFileNames.map(n=>n==='staff.mjs'?'staff-renamed.mjs':n))),{resolved:2,persisting:0,unverified:2,new:0});
});
test('acceptance: fixed search preserves result and keeps malicious-looking input in parameter values',async()=>{
  const {searchStaff}=await import(new URL('fixed/staff.mjs',root));
  const expected=[{id:1,name:'가상 직원'}];
  for(const input of ['가상 직원', "' OR 1=1 --"]){
    let received, header;
    const result=await searchStaff({query:(...args)=>{received=args;return expected;}},{setHeader:(...args)=>header=args},input);
    assert.equal(result,expected);
    assert.deepEqual(received,['SELECT id, name FROM staff WHERE name = $1',[input]]);
    assert.deepEqual(header,['Access-Control-Allow-Origin','https://staff.example.invalid']);
  }
});
