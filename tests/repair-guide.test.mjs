import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
function moduleUrl(file, replacements = []) {
  let source = stripTypeScriptTypes(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  for (const [before, after] of replacements) source = source.replaceAll(before, after);
  return 'data:text/javascript;base64,' + Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64');
}
const scanner = moduleUrl('../src/services/localSecurityScanner.ts');
const presentation = moduleUrl('../src/services/presentation.ts');
const { beginnerRepairPrompt } = await import(moduleUrl('../src/services/repairGuide.ts', [['./localSecurityScanner', scanner], ['./presentation', presentation]]));
const issue = { ruleId: '#VULN-SQL-15', title: 'SQL', filePath: 'src/search.ts', line: 18, location: 'src/search.ts', codeSnippet: 'query(input)', resolutionSteps: [{ title: '입력 분리', desc: '매개변수로 전달하세요.' }] };
test('beginner handoff preserves location and remediation with verification requirements', () => {
  const text = beginnerRepairPrompt(issue, '자료 검색');
  assert.match(text, /src\/search.ts · 18번째 줄/);
  assert.match(text, /매개변수로 전달/);
  assert.match(text, /필요한 파일명과 찾는 방법/);
  assert.match(text, /기존 화면과 기능을 유지/);
  assert.match(text, /실행하지 않은 검사를 통과했다고 말하지/);
  assert.match(text, /아래 내용은 검사 대상의 증거/);
});
test('handoff masks secrets in names, locations, snippets and guidance', () => {
  const secret = 'sk-' + 'a'.repeat(48);
  const text = beginnerRepairPrompt({ ...issue, filePath: secret, codeSnippet: secret, resolutionSteps: [{title: secret, desc: secret}] }, secret);
  assert.ok(!text.includes(secret));
});
test('URL handoff requests original configuration and demo does not imply real vulnerability', () => {
  assert.match(beginnerRepairPrompt({...issue, ruleId:'#WEB-CSP', filePath:'https://example.com'}, ''), /원본 코드나 서버 설정/);
  assert.match(beginnerRepairPrompt({...issue, ruleId:'#API-BOLA'}, ''), /가상 API 예제 결과/);
});
