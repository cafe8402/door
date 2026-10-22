import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
function url(file,replacements=[]){let s=stripTypeScriptTypes(fs.readFileSync(new URL(file,import.meta.url),'utf8'));for(const [a,b]of replacements)s=s.replaceAll(a,b);return 'data:text/javascript;base64,'+Buffer.from(s.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64')}
const {resultActions,actionPrompt,actionExplanation}=await import(url('../src/services/resultActions.ts',[['./resultGroups',url('../src/services/resultGroups.ts')],['./localSecurityScanner',url('../src/services/localSecurityScanner.ts')],['./presentation',url('../src/services/presentation.ts')]]));
const issue=(ruleId,filePath='src/a.ts',line=1)=>({id:filePath+ruleId+line,ruleId,filePath,line,location:filePath,title:'test'});
test('PII has concrete conditional change without inventing real exposure or fake-data certainty',()=>{const a=resultActions([issue('#VULN-PII-05')])[0];assert.match(a.title,/주민번호/);assert.match(a.change,/실제 사람/);assert.match(a.change,/가짜 예시/);assert.match(a.fact,/확인하지 못했어요/);});
test('copy includes all locations across related secret rules and no raw evidence',()=>{const items=[issue('#VULN-KEY-01'),issue('#VULN-KEY-34','src/b.ts',5)];items[0].codeSnippet='DO_NOT_COPY_EVIDENCE';const a=resultActions(items)[0];assert.equal(a.issues.length,2);const p=actionPrompt(a,'test');assert.match(p,/src\/a.ts/);assert.match(p,/src\/b.ts/);assert.ok(!p.includes('DO_NOT_COPY_EVIDENCE'));assert.match(p,/지금 단계에서는 코드를 변경하지 마세요/);});
test('examples retain all findings separately and empty results create no action',()=>{const actions=resultActions([issue('#VULN-KEY-01'),issue('#VULN-KEY-01','tests/a.ts')]);assert.equal(actions.length,2);assert.equal(actions.filter(a=>a.example).length,1);assert.deepEqual(resultActions([]),[]);});
test('SQL, permission and execution fixes remain distinct and demos remain explicitly simulated',()=>{const a=resultActions([issue('#VULN-SQL-15'),issue('#VULN-RLS-17'),issue('#VULN-EVAL-07')]);assert.equal(a.length,3);assert.match(a.find(g=>g.kind==='sql').change,/분리/);assert.match(resultActions([issue('#API-BOLA')],'api_demo')[0].fact,/연습/);});

test('static hits never become confirmed fixes even with detected category or fake markers',()=>{for(const rule of ['#VULN-KEY-01','#VULN-PII-05','#VULN-SQL-15','#VULN-RLS-17']) {const a=resultActions([{...issue(rule),category:'detected',verifiedControl:'invalid-tls'}],'real_file')[0];assert.equal(a.decision,'review');}});
test('only explicit matching transport observations qualify; header hints and legacy results do not',()=>{const http={...issue('#WEB-HTTP','transport'),verifiedControl:'unencrypted-http'};const tls={...issue('#WEB-TLS','transport'),verifiedControl:'invalid-tls'};assert.ok(resultActions([http,tls],'url').every(a=>a.decision==='fix'));assert.equal(resultActions([issue('#WEB-HTTP','transport')],'url')[0].decision,'review');assert.equal(resultActions([{...http,ruleId:'#WEB-CSP'}],'url')[0].decision,'review');assert.equal(resultActions([http],'real_file')[0].decision,'review');assert.equal(resultActions([tls],'api_demo')[0].decision,'example');assert.match(actionPrompt(resultActions([http],'url')[0],'site'),/HTTPS/);});

test('source assessments show source-specific facts and changes without TLS advice',()=>{const item={...issue('#VULN-KEY-01'),sourceAssessment:{status:'actionable',kind:'hardcoded-secret',title:'비밀키 직접 대입',reason:'실제 변수 대입 확인',change:'서버 저장소로 이동'}};const a=resultActions([item],'real_file')[0];assert.equal(a.decision,'fix');assert.equal(a.title,'비밀키 직접 대입');assert.match(actionPrompt(a,'서비스'),/실제 변수 대입 확인/);assert.doesNotMatch(actionPrompt(a,'서비스'),/인증서/);});

test('plain risk explanation distinguishes actionable code from unconfirmed candidates',()=>{
  const candidate=resultActions([issue('#VULN-SQL-15')],'real_file')[0];
  assert.equal(actionExplanation(candidate),null);
  const actionable=resultActions([{...issue('#VULN-SQL-15'),sourceAssessment:{status:'actionable',kind:'sql',title:'입력 연결',reason:'direct flow',change:'separate values'}}],'real_file')[0];
  const explanation=actionExplanation(actionable);
  assert.match(explanation.harm,/범위/);
  assert.match(explanation.why,/조회 조건/);
  assert.match(explanation.scope,/확인한 것은 아니/);
});
