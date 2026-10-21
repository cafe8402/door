import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApiMiddleware } from '../server/api.mjs';
import { createApiDemoScanner } from '../server/api-demo-scanner.mjs';
import { DEMO_ACTORS, DEMO_DOCUMENTS, DEMO_ADMIN_REPORT } from '../server/api-demo-data.mjs';
import { compareScanResults } from '../src/services/localSecurityScanner.ts';

async function withApi(run) {
  const api = createApiMiddleware(), calls = [];
  const server = http.createServer((req, res) => { calls.push({ method: req.method, path: req.url }); api(req, res); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try { await run(origin, calls); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (origin, input, headers = {}) => fetch(origin + '/api/scan-api-demo', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(input) });
const normal = async (_version, scenario) => scenario.control ? { status: 200, body: { record: scenario.record, synthetic: true } } : { status: 403, body: { error: 'DENIED' } };

test('real demo API discovers four forbidden reads, then verifies the fixed version with positive controls', async () => withApi(async (origin, calls) => {
  const beforeResponse = await post(origin, { version: 'vulnerable', authConfirmed: true });
  assert.equal(beforeResponse.status, 200); const before = await beforeResponse.json();
  assert.equal(before.mode, 'api_demo'); assert.equal(before.apiChecks.length, 7); assert.equal(before.requestsMade, 7);
  assert.equal(before.apiChecks.filter(check => check.expected === '허용' && check.outcome === 'passed').length, 3);
  assert.equal(before.issues.length, 4); assert.equal(new Set(before.issues.map(issue => issue.id)).size, 4);
  assert.deepEqual(before.issues.map(issue => issue.ruleId), ['#API-BOLA', '#API-BOLA', '#API-BFLA', '#API-AUTH']);
  const after = await (await post(origin, { version: 'fixed', authConfirmed: true })).json();
  assert.equal(after.issues.length, 0); assert.ok(after.apiChecks.every(check => check.outcome === 'passed'));
  assert.equal(after.requestsMade, 7); assert.equal(after.cleanCheckCount, 4);
  const rows = compareScanResults(before.issues, after.issues, after.scannedFileNames);
  assert.equal(rows.filter(row => row.status === 'resolved').length, 4);
  const actualRequests = calls.filter(call => call.path.startsWith('/__fixtures/api/'));
  assert.equal(actualRequests.length, 14); assert.ok(actualRequests.every(call => call.method === 'GET'));
  const report = JSON.stringify(before);
  for (const actor of Object.values(DEMO_ACTORS)) if (actor.token) assert.ok(!report.includes(actor.token));
  for (const record of [...Object.values(DEMO_DOCUMENTS), DEMO_ADMIN_REPORT]) assert.ok(!report.includes(record.privateMarker));
}));

test('fixed fixture independently enforces user identity, ownership, administrator role and GET-only', async () => withApi(async origin => {
  const url = origin + '/__fixtures/api/fixed';
  assert.equal((await fetch(url + '/documents/doc-a')).status, 401);
  assert.equal((await fetch(url + '/documents/doc-a', { headers: { Authorization: 'Bearer INVALID' } })).status, 401);
  const a = { Authorization: `Bearer ${DEMO_ACTORS.a.token}` };
  assert.equal((await fetch(url + '/documents/doc-a', { headers: a })).status, 200);
  assert.equal((await fetch(url + '/documents/doc-b', { headers: a })).status, 403);
  assert.equal((await fetch(url + '/admin/report', { headers: a })).status, 403);
  assert.equal((await fetch(url + '/admin/report', { headers: { Authorization: `Bearer ${DEMO_ACTORS.admin.token}` } })).status, 200);
  assert.equal((await fetch(url + '/documents/doc-a', { method: 'POST', headers: a })).status, 405);
}));

test('demo scan API rejects real target URLs, arbitrary versions, missing consent and cross-origin callers', async () => withApi(async origin => {
  assert.equal((await post(origin, { version: 'vulnerable', authConfirmed: false })).status, 400);
  assert.equal((await post(origin, { version: '../../private', authConfirmed: true })).status, 400);
  assert.equal((await post(origin, { version: 'fixed', authConfirmed: true, url: 'https://example.com' })).status, 400);
  assert.equal((await post(origin, { version: 'fixed', authConfirmed: true }, { Origin: 'https://outside.invalid' })).status, 403);
  assert.equal((await fetch(origin + '/api/scan-api-demo')).status, 405);
}));

test('HTTP 200 with an empty or unrelated body is inconclusive, not a permission failure or success', async () => {
  const result = await createApiDemoScanner({ port: 3000, requester: async (version, scenario) => scenario.id === 'a-to-b' ? { status: 200, body: { message: 'OK' } } : normal(version, scenario) })('fixed');
  assert.equal(result.apiChecks.find(check => check.id === 'a-to-b').outcome, 'unverified');
  assert.equal(result.issues.length, 0); assert.ok(result.warnings.length > 1);
  assert.equal(result.checks.find(check => check.resource === 'api-case:a-to-b').status, 'unverified');
});

test('HTTP 403 containing forbidden private content is still a leak', async () => {
  const result = await createApiDemoScanner({ port: 3000, requester: async (version, scenario) => scenario.id === 'a-to-b' ? { status: 403, body: { record: scenario.record } } : normal(version, scenario) })('fixed');
  assert.equal(result.apiChecks.find(check => check.id === 'a-to-b').outcome, 'failed');
  assert.equal(result.issues.length, 1);
});

test('broken positive controls skip dependent tests instead of declaring the service safe', async () => {
  let count = 0;
  const result = await createApiDemoScanner({ port: 3000, requester: async (version, scenario) => { count++; return scenario.id === 'own-a' ? { status: 403, body: { error: 'DENIED' } } : normal(version, scenario); } })('fixed');
  assert.equal(count, 3); assert.equal(result.cleanCheckCount, 0); assert.equal(result.issues.length, 0);
  assert.ok(result.apiChecks.filter(check => check.expected === '거절').every(check => check.outcome === 'unverified'));
});

test('network and response failures are inconclusive; cancellation propagates', async () => {
  const scan = createApiDemoScanner({ port: 3000, requester: async () => { throw new Error('SENSITIVE_INTERNAL_DETAIL'); } });
  const result = await scan('fixed');
  assert.ok(result.apiChecks.every(check => check.outcome === 'unverified'));
  assert.equal(result.issues.length, 0); assert.ok(!JSON.stringify(result).includes('SENSITIVE_INTERNAL_DETAIL'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(scan('fixed', { signal: controller.signal }), { name: 'AbortError' });
});
