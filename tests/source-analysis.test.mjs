import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSourceContext} from '../src/services/sourceAnalysis.mjs';
import {runLocalSecurityScan} from '../src/services/localSecurityScanner.ts';
const synthetic = 'sk-proj-' + 'a9B3c7D2e8F4g6H1j5K0m9N3p7Q2';
function assess(name,content,rule='#VULN-KEY-01',line=1,others=[]) {
 const issues=[{filePath:name,line,ruleId:rule}];const coverage=analyzeSourceContext([{name,content},...others],issues);return {result:issues[0].sourceAssessment,coverage};
}
test('direct assignment is actionable; descriptions and comments are not executable assignments',()=>{
 assert.equal(assess('server.js',`const apiKey="${synthetic}"`).result.status,'actionable');
 assert.equal(assess('docs.js',`const description='const apiKey="${synthetic}"'`).result.status,'review');
 assert.equal(assess('server.js',`// const apiKey="${synthetic}"`).result.status,'review');
 assert.equal(assess('tests/real.js',`const apiKey="${synthetic}"`).result.status,'actionable');
});
test('browser graph and environment storage have distinct conclusions',()=>{
 const out=assess('config.js',`export const apiKey="${synthetic}"`,undefined,1,[{name:'index.html',content:'<script src="/main.js"></script>'},{name:'main.js',content:'import "./config.js";'}]);
 assert.equal(out.result.kind,'browser-secret');
 assert.equal(assess('.env',`API_KEY=${synthetic}`).result.status,'review');
 assert.equal(assess('.env',`VITE_API_KEY=${synthetic}`).result.kind,'browser-secret');
 assert.equal(assess('server.js','const apiKey="sk-proj-DUMMY_TEST_KEY_NOT_REAL_0000000000"').result.status,'example');
});
test('write rules require actual uncommented unconditional write statement',()=>{
 assert.equal(assess('firestore.rules','allow read, write: if true;','#VULN-FIREBASE-37').result.status,'actionable');
 for(const code of ['// allow write: if true;','/*\nallow write: if true;\n*/','allow read: if true;','allow write: if request.auth != null;'])assert.notEqual(assess('firestore.rules',code,'#VULN-FIREBASE-37',code.startsWith('/*')?2:1).result.status,'actionable');
});
test('external request directly concatenated into SQL differs from parameter binding',()=>{
 assert.equal(assess('api.js','app.get("/people",(req,res)=> db.query("SELECT * FROM people WHERE id=" + req.query.id));','#VULN-SQL-15').result.kind,'request-sql');
 assert.equal(assess('api.js','db.query("SELECT * FROM people WHERE id=$1", [req.query.id]);','#VULN-SQL-15').result.status,'review');
 assert.equal(assess('api.js','eval(req.body.code);','#VULN-EVAL-01').result.kind,'request-command');
});
test('unsupported and broken syntax are explicitly incomplete',()=>{
 assert.equal(assess('bad.ts','const apiKey = {').coverage.parseFailures,1);
 assert.equal(assess('main.py','api_key="abc"').coverage.unsupportedFiles,1);
});
test('full scanner carries assessment and never exports literal secret',async()=>{
 const content=`const apiKey="${synthetic}";`;
 const out=await runLocalSecurityScan({inputTab:'upload',files:[{name:'config.js',content,size:content.length}]});
 assert.ok(out.issues.some(issue=>issue.sourceAssessment.status==='actionable'));
 assert.equal(JSON.stringify(out).includes(synthetic),false);
 const fixed=await runLocalSecurityScan({inputTab:'upload',files:[{name:'config.js',content:'const apiKey=process.env.API_KEY;',size:34}]});
 assert.equal(fixed.issues.length,0);
});
