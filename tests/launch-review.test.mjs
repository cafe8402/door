import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
function moduleUrl(file, replacements = []) {
  let source = stripTypeScriptTypes(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  for (const [before, after] of replacements) source = source.replaceAll(before, after);
  return 'data:text/javascript;base64,' + Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64');
}
const scannerUrl = moduleUrl('../src/services/localSecurityScanner.ts');
const { launchReview, summarySvg, repairPrompt } = await import(moduleUrl('../src/services/launchReview.ts', [['./localSecurityScanner', scannerUrl]]));
const { createApiDemoScanner } = await import('../server/api-demo-scanner.mjs');
const { DEMO_DOCUMENTS, DEMO_ADMIN_REPORT } = await import('../server/api-demo-data.mjs');
const records = { 'documents/doc-a': DEMO_DOCUMENTS['doc-a'], 'documents/doc-b': DEMO_DOCUMENTS['doc-b'], 'admin/report': DEMO_ADMIN_REPORT };
const scan = createApiDemoScanner({ port: 3000, requester: async (version, scenario) => version === 'vulnerable' || scenario.control ? { status: 200, body: { record: records[scenario.path] } } : { status: 403, body: {} } });

test('launch checklist follows real demo findings and never marks unrelated source checks complete', async () => {
  const before = await scan('vulnerable');
  const after = await scan('fixed');
  assert.equal(launchReview(before)[1].status, 'action');
  assert.equal(launchReview(after)[1].status, 'checked');
  assert.equal(launchReview(after)[0].status, 'unknown');
  assert.equal(launchReview(after)[2].status, 'unknown');
  assert.equal(launchReview(after)[3].status, 'unknown');
  after.apiChecks[0].outcome = 'unverified';
  assert.equal(launchReview(after)[1].status, 'unknown');
});
test('source scans do not claim real API authorization; incomplete rechecks remain actionable', () => {
  const result = { mode: 'real_file', issues: [], scannedAt: new Date().toISOString() };
  assert.equal(launchReview(result)[0].status, 'checked');
  assert.equal(launchReview(result)[1].status, 'unknown');
  assert.equal(launchReview(result, [{ status: 'unverified' }])[2].status, 'action');
  assert.equal(launchReview(result, [{ status: 'persisting' }])[2].status, 'action');
});
test('summary export escapes injected markup, masks keys and preserves demo scope and unresolved counts', async () => {
  const result = await scan('fixed');
  const svg = summarySvg('<script>&"', result, [{ status: 'resolved' }, { status: 'unverified' }]);
  assert.ok(svg.includes('&lt;script&gt;&amp;&quot;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('실제 서비스 결과 아님'));
  assert.ok(svg.includes('재검사 미검출 1건 · 추가 확인 1건'));
  const secret = 'sk-proj-' + 'x'.repeat(32);
  assert.ok(!summarySvg(secret, result).includes(secret.slice(0, 22)));
});
test('AI handoff includes discovered evidence and completion conditions without claiming automatic repairs', async () => {
  const result = await scan('vulnerable');
  const prompt = repairPrompt(result, '가상 쇼핑몰');
  assert.ok(prompt.includes('실제 프로젝트의 취약점을 확인한 것이 아닙니다'));
  assert.ok(prompt.includes('정상 조회는 유지'));
  assert.ok(prompt.includes('승인 없이 배포'));
  assert.ok(result.issues.every(issue => prompt.includes(issue.aiPrompt)));
});
