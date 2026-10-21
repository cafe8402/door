import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApiMiddleware } from '../server/api.mjs';
import { createUrlScanner } from '../server/url-scanner.mjs';
import { createRequester, parseTarget, resolveTarget, isPublicIP, displayUrl } from '../server/safe-request.mjs';
import { compareScanResults } from '../src/services/localSecurityScanner.ts';

async function serverFor(handler) {
  const server = http.createServer(handler); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function withApi(run) {
  const api = createApiMiddleware();
  const { server, origin } = await serverFor((req, res) => api(req, res));
  try { await run(origin); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (origin, url, extra = {}) => fetch(origin + '/api/scan-url', { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra.headers }, body: JSON.stringify({ url, authConfirmed: true, ...extra.body }) });

test('URL and special IP parsing blocks local, mapped, metadata, reserved and alternate numeric addresses', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.1.1.1', '::1', '::ffff:8.8.8.8', 'fe80::1', '2001:db8::1', '2002:808:808::1', '3fff::1']) assert.equal(isPublicIP(address), false, address);
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2001:4860:4860::8888']) assert.equal(isPublicIP(address), true, address);
  for (const target of ['http://2130706433', 'http://0x7f000001', 'http://[::1]', 'http://169.254.169.254']) await assert.rejects(resolveTarget(parseTarget(target)), /주소/);
  for (const target of ['file:///etc/passwd', 'ftp://example.com', 'https://user:pass@example.com', 'not-a-url']) assert.throws(() => parseTarget(target));
  await assert.rejects(resolveTarget(parseTarget('https://example.com:8443')), /포트/);
});
test('every DNS answer is checked; mixed public/private answers are rejected', async () => {
  await assert.rejects(resolveTarget(parseTarget('https://example.com'), { lookup: async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }] }), /내부망/);
  const records = await resolveTarget(parseTarget('https://example.com'), { lookup: async () => [{ address: '8.8.8.8', family: 4 }] });
  assert.equal(records[0].address, '8.8.8.8');
  assert.equal(displayUrl('https://example.com/a?token=PRIVATE#secret'), 'https://example.com/a');
});
test('explicit fixture exception cannot reach sibling local paths or redirect into them', async () => {
  let sensitiveHits = 0;
  const { server, origin } = await serverFor((req, res) => {
    if (req.url === '/__fixtures/vulnerable') { res.writeHead(302, { Location: '/private' }); res.end(); }
    else { sensitiveHits++; res.end('PRIVATE'); }
  });
  try {
    const request = createRequester({ fixtureOrigin: origin });
    await assert.rejects(request(origin + '/__fixtures/vulnerable', { budget: { requests: 0, bytes: 0 } }), /포트|내부망/);
    assert.equal(sensitiveHits, 0);
    await assert.rejects(resolveTarget(parseTarget(origin + '/api/scan-url'), { fixtureOrigin: origin }), /포트|내부망/);
  } finally { server.closeAllConnections(); server.close(); }
});
test('real HTTP API scans vulnerable and fixed dummy sites, masks tokens/cookie values, and resolves only checked resources', async () => withApi(async origin => {
  const badResponse = await post(origin, origin + '/__fixtures/vulnerable');
  assert.equal(badResponse.status, 200); const bad = await badResponse.json();
  assert.equal(bad.mode, 'url'); assert.equal(bad.scannedFilesCount, 2); assert.equal(bad.issues.length, 7);
  assert.ok(bad.issues.some(issue => issue.ruleId === '#VULN-KEY-01'));
  assert.ok(!JSON.stringify(bad).includes('sk-proj-' + 'DUMMY'.repeat(7)));
  assert.ok(!JSON.stringify(bad).includes('demo_session=DUMMY'));
  const good = await (await post(origin, origin + '/__fixtures/fixed')).json();
  assert.equal(good.issues.length, 0); assert.equal(good.scannedFilesCount, 2);
  const rows = compareScanResults(bad.issues, good.issues, good.scannedFileNames);
  assert.ok(rows.every(row => row.status === 'resolved'));
  assert.ok(good.warnings.some(message => message.includes('HTTP')));
}));
test('API denies missing authorization, browser cross-origin requests, alternate Host and private targets', async () => withApi(async origin => {
  assert.equal((await post(origin, origin + '/__fixtures/fixed', { body: { authConfirmed: false } })).status, 400);
  assert.equal((await post(origin, origin + '/__fixtures/fixed', { headers: { Origin: 'https://attacker.invalid' } })).status, 403);
  assert.equal((await fetch(origin + '/api/scan-url')).status, 405);
  assert.equal((await fetch(origin + '/api/scan-url', { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await post(origin, 'http://127.0.0.1/')).status, 400);
  assert.equal((await post(origin, 'http://169.254.169.254/latest/meta-data/')).status, 400);
  const response = await new Promise(resolve => {
    const req = http.request(origin + '/api/scan-url', { method: 'POST', headers: { Host: 'attacker.invalid', 'Content-Type': 'application/json' } }, res => { res.resume(); resolve(res.statusCode); }); req.end('{}');
  });
  assert.equal(response, 403);
}));
test('API limits oversized requests and request rate', async () => withApi(async origin => {
  assert.equal((await post(origin, 'https://example.invalid/' + 'a'.repeat(4500))).status, 413);
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await post(origin, 'file:///tmp')).status);
  assert.ok(statuses.includes(429));
}));
const response = (overrides = {}) => ({ url: 'https://example.com/', status: 200, headers: { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'strict-transport-security': 'max-age=31536000' }, body: '<p>OK</p>', redirects: [], tls: { validTo: 'Jan 1 2030' }, ...overrides });
test('HTTPS certificate failure is reported without reading content or falsely resolving prior issues', async () => {
  const error = Object.assign(new Error('PRIVATE ERROR'), { code: 'CERT_HAS_EXPIRED' });
  const result = await createUrlScanner({ requester: async () => { throw error; } })('https://example.com');
  assert.equal(result.issues[0].ruleId, '#WEB-TLS'); assert.equal(result.scannedFilesCount, 0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE ERROR'));
  assert.ok(!result.checks.some(check => check.ruleId === '*source'));
});
test('failed script and denied page stay unverified; non-HTML responses do not get HTML-only findings', async () => {
  const scan = createUrlScanner({ requester: async url => {
    if (url.endsWith('/app.js')) throw new Error('blocked');
    if (url.startsWith('http:')) throw new Error('not available');
    return response({ body: '<script src="/app.js"></script>' });
  } });
  const result = await scan('https://example.com');
  assert.deepEqual(result.scannedFileNames, ['document']); assert.ok(result.warnings.length > 0);
  const denied = await createUrlScanner({ requester: async () => response({ status: 403 }) })('https://example.com');
  assert.deepEqual(denied.scannedFileNames, []);
  const json = await createUrlScanner({ requester: async () => response({ headers: { 'content-type': 'application/json', 'x-content-type-options': 'nosniff' }, body: '{}' }) })('https://example.com');
  assert.ok(!json.issues.some(issue => ['#WEB-CSP', '#WEB-FRAME', '#WEB-REFERRER'].includes(issue.ruleId)));
});
test('HTTP upgrade probe, mixed content and cookie policy produce independent findings', async () => {
  const result = await createUrlScanner({ requester: async url => url.startsWith('http:') ? response({ url }) : response({ body: '<img src="http://example.com/image.png">', headers: { ...response().headers, 'set-cookie': ['session=SECRET; SameSite=None'] } }) })('https://example.com');
  for (const id of ['#WEB-HTTP', '#WEB-MIXED', '#WEB-COOKIE']) assert.ok(result.issues.some(issue => issue.ruleId === id), id);
  assert.ok(!JSON.stringify(result).includes('session=SECRET'));
});
test('script count and cross-origin collection are bounded and disclosed', async () => {
  let scriptCount = 0;
  const result = await createUrlScanner({ requester: async url => {
    if (url.startsWith('http:')) throw new Error('closed');
    if (url.endsWith('.js')) { scriptCount++; return response({ url, headers: { 'content-type': 'application/javascript' }, body: 'console.info("test")' }); }
    return response({ body: '<script src="https://outside.invalid/a.js"></script>' + Array.from({ length: 5 }, (_, i) => `<script src="/${i}.js"></script>`).join('') });
  } })('https://example.com');
  assert.equal(scriptCount, 3); assert.ok(result.warnings.some(item => item.includes('3개'))); assert.ok(result.warnings.some(item => item.includes('외부')));
});

test('resource size, request budget, redirect loops and abort are bounded', async () => {
  const { server, origin } = await serverFor((req, res) => {
    if (req.url.endsWith('/app.js')) { res.setHeader('Content-Type', 'application/javascript'); res.end('x'.repeat(1024 * 1024 + 1)); }
    else { res.writeHead(302, { Location: '/__fixtures/vulnerable' }); res.end(); }
  });
  try {
    const request = createRequester({ fixtureOrigin: origin });
    await assert.rejects(request(origin + '/__fixtures/vulnerable/app.js', { budget: { requests: 0, bytes: 0 } }), /크기/);
    await assert.rejects(request(origin + '/__fixtures/vulnerable', { budget: { requests: 0, bytes: 0 } }), /리다이렉트/);
    await assert.rejects(request(origin + '/__fixtures/vulnerable', { budget: { requests: 8, bytes: 0 } }), /개수/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(request(origin + '/__fixtures/vulnerable', { signal: controller.signal, budget: { requests: 0, bytes: 0 } }), /abort/i);
  } finally { server.closeAllConnections(); server.close(); }
});
