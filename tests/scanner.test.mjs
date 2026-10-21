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
const { scanFileContent, runLocalSecurityScan, compareScanResults, maskSecret, RULE_COUNT, SAMPLE_VULNERABLE_FILES } = await import(scannerUrl);
const { readSourceFiles } = await import(moduleUrl('../src/services/fileInput.ts'));
const { compareUrlScanResults } = await import(moduleUrl('../src/services/scanClient.ts', [['./localSecurityScanner', scannerUrl]]));
const { buildReport, reportMarkdown, reportHtml, manualReviewItems } = await import(moduleUrl('../src/services/report.ts', [['./localSecurityScanner', scannerUrl]]));
const file = (name, content) => ({ name, content, size: Buffer.byteLength(content) });
const input = files => ({ inputTab: 'upload', files });
const key = 'sk-proj-' + 'x'.repeat(32);

test('sample files are actually scanned, without preset resolved states', async () => {
  const result = await runLocalSecurityScan(input(SAMPLE_VULNERABLE_FILES.map(item => file(item.name, item.content))));
  assert.equal(result.issues.length, 6);
  assert.equal(result.scannedFilesCount, 2);
  assert.equal(result.ruleCount, RULE_COUNT);
  assert.equal(result.mode, 'real_file');
  assert.ok(result.issues.every(issue => issue.recheckStatus === 'unverified'));
});
test('Claude tokens do not also match OpenAI', () => {
  const issues = scanFileContent('client.ts', 'const key = "sk-ant-' + 'a'.repeat(32) + '";');
  assert.deepEqual(issues.map(issue => issue.ruleId), ['#VULN-KEY-02']);
});
test('all matching lines and separate file identities are preserved', async () => {
  const result = await runLocalSecurityScan(input([file('src/a.ts', 'eval(a)\neval(b)'), file('test/a.ts', 'eval(c)')]));
  assert.equal(result.issues.length, 3);
  assert.equal(new Set(result.issues.map(issue => issue.id)).size, 3);
  assert.deepEqual(result.issues.slice(0, 2).map(issue => issue.line), [1, 2]);
});
test('CORS multiline config is detected at its opening line', () => {
  const issues = scanFileContent('server.ts', '// config\napp.use(cors({\n  credentials: false,\n  origin: "*"\n}));');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].line, 2);
});
test('every additional rule has a working fixture', () => {
  const fixtures = [
    ['#VULN-KEY-08', 'AIza' + 'a'.repeat(35)],
    ['#VULN-KEY-09', 'ghp_' + 'a'.repeat(30)],
    ['#VULN-KEY-10', '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----'],
    ['#VULN-EXEC-11', 'subprocess.run(command, shell=True)'],
    ['#VULN-XSS-12', 'node.innerHTML = content'],
    ['#VULN-TLS-13', 'rejectUnauthorized: false'],
    ['#VULN-AGENT-14', 'agent --dangerously-skip-permissions'],
  ];
  for (const [rule, content] of fixtures) assert.ok(scanFileContent('file.txt', content).some(issue => issue.ruleId === rule), rule);
  assert.equal(RULE_COUNT, 37);
});
test('PII and tokens are redacted in snippets and AI prompts', () => {
  const issues = scanFileContent('a.ts', `const apiKey = "${key}";\nconst ssn = "900101-1234567";`);
  for (const issue of issues) for (const value of [issue.aiPrompt, issue.codeSnippet]) {
    assert.ok(!value.includes(key)); assert.ok(!value.includes('900101-1234567'));
  }
  assert.ok(!maskSecret('password = "a secret with spaces"').includes('with spaces'));
});
test('PEM bodies never appear in context snippets of nearby findings', () => {
  const issues = scanFileContent('a.txt', '-----BEGIN PRIVATE KEY-----\nPEM_BODY_SENSITIVE\neval(x)\n-----END PRIVATE KEY-----');
  assert.ok(issues.length >= 2);
  for (const issue of issues) assert.ok(!issue.codeSnippet.includes('PEM_BODY_SENSITIVE'));
});
test('missing files stay unverified; changed lines persist; removed patterns resolve; new patterns appear', () => {
  const previous = [...scanFileContent('a.js', 'eval(x)\neval(y)'), ...scanFileContent('missing.js', 'eval(z)')];
  const current = scanFileContent('a.js', '// moved\neval(y)\nnode.innerHTML = x');
  const entries = compareScanResults(previous, current, ['a.js']);
  assert.equal(entries.filter(entry => entry.status === 'persisting').length, 1);
  assert.equal(entries.find(entry => entry.status === 'persisting').issue.line, 2);
  assert.equal(entries.filter(entry => entry.status === 'resolved').length, 1);
  assert.equal(entries.filter(entry => entry.status === 'unverified').length, 1);
  assert.equal(entries.filter(entry => entry.status === 'new').length, 1);
});
test('empty files are inspected and URL/empty/missing/duplicate submissions fail explicitly', async () => {
  const result = await runLocalSecurityScan(input([file('empty.ts', '')]));
  assert.equal(result.issues.length, 0); assert.equal(result.scannedFilesCount, 1);
  await assert.rejects(runLocalSecurityScan({ inputTab: 'url', files: [] }), /URL/);
  await assert.rejects(runLocalSecurityScan(input([])), /파일/);
  await assert.rejects(runLocalSecurityScan(input([{ name: 'missing.ts', size: 0 }])), /읽지/);
  await assert.rejects(runLocalSecurityScan(input([file('a.ts', ''), file('a.ts', '')])), /중복/);
});
test('progress reports actual scanned files', async () => {
  const progress = [];
  await runLocalSecurityScan(input([file('a.ts', ''), file('b.ts', 'eval(x)')]), (...args) => progress.push(args));
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
});
test('uploads validate text encoding, ZIP and duplicate paths', async () => {
  await assert.rejects(readSourceFiles([new File(['x'], 'a.zip')]), /압축/);
  await assert.rejects(readSourceFiles([new File(['\0'], 'a.ts')]), /UTF-8/);
  await assert.rejects(readSourceFiles([new File([''], 'a.ts')], [file('a.ts', '')]), /같은 경로/);
});
test('uploads and scanner accept files beyond former size and count limits without dropping findings', async () => {
  const content = '// ordinary project documentation\n'.repeat(70000) + '\neval(userInput);';
  assert.ok(new Blob([content]).size > 2 * 1024 * 1024);
  const large = await readSourceFiles([new File([content], 'large.ts')]);
  const many = await readSourceFiles(Array.from({ length: 201 }, (_, index) => new File(['// empty'], `part-${index}.ts`)), large);
  const scanned = await runLocalSecurityScan(input(many));
  assert.equal(scanned.scannedFilesCount, 202);
  assert.ok(scanned.issues.some(issue => issue.ruleId === '#VULN-EVAL-07'));
  // The combined payload also crosses the previous 20 MiB total limit.
  const combined = await readSourceFiles(Array.from({ length: 10 }, (_, index) => new File([content], `large-${index}.ts`)));
  assert.ok(combined.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024);
  const total = await runLocalSecurityScan(input(combined));
  assert.equal(total.scannedFilesCount, 10);
  assert.equal(total.issues.filter(issue => issue.ruleId === '#VULN-EVAL-07').length, 10);
});
test('folders preserve relative paths, skip dependencies and binary files', async () => {
  const folderFile = (name, path) => { const value = new File(['eval(x)'], name); Object.defineProperty(value, 'webkitRelativePath', { value: path }); return value; };
  const result = await readSourceFiles([
    folderFile('a.ts', 'project/src/a.ts'), folderFile('b.ts', 'project/node_modules/b.ts'), folderFile('logo.png', 'project/logo.png'),
  ]);
  assert.deepEqual(result.map(item => item.name), ['src/a.ts']);
});
test('download reports contain real metadata and no raw credentials, internal fingerprints or preset demo results', async () => {
  const result = await runLocalSecurityScan(input([file('a.ts', `const key = "${key}";`)]));
  const data = { systemName: 'test', issues: result.issues, scannedAt: result.scannedAt, scannedStats: { files: 1, lines: 1 }, ruleCount: 14 };
  const report = buildReport(data), markdown = reportMarkdown(data);
  assert.equal(report.scannedAt, result.scannedAt);
  assert.ok(!JSON.stringify(report).includes(key)); assert.ok(!markdown.includes(key));
  assert.ok(!JSON.stringify(report).includes('fingerprint'));
  assert.ok(markdown.includes('AI 수정 요청문'));
});
test('questionnaire answers change manual guidance without fabricating findings', () => {
  const all = manualReviewItems();
  const none = manualReviewItems({ q1DataPrivacy: 'no', q2ExternalAi: 'no', q3AuthControl: 'no', q4AiExecution: 'no', serviceTypes: ['web'] });
  assert.ok(all.length > none.length); assert.equal(none.length, 1);
});

test('URL rechecks require the exact check to have run, including TLS and cookies', () => {
  const previous = [{ id: 'cookie', ruleId: '#WEB-COOKIE', filePath: 'document', fingerprint: 'cookie' }, { id: 'tls', ruleId: '#WEB-TLS', filePath: 'transport', fingerprint: 'tls' }];
  const result = { issues: [], scannedFileNames: ['document'], checks: [{ ruleId: '#WEB-COOKIE', resource: 'document', status: 'unverified' }, { ruleId: '#WEB-TLS', resource: 'transport', status: 'completed' }] };
  const entries = compareUrlScanResults(previous, result);
  assert.equal(entries.find(entry => entry.issue.id === 'cookie').status, 'unverified');
  assert.equal(entries.find(entry => entry.issue.id === 'tls').status, 'resolved');
});

test('URL report includes real scope, warnings and performed checks', () => {
  const data = { systemName: 'URL test', issues: [], scannedStats: { files: 0, lines: 0 }, scanMetadata: { mode: 'url', scope: 'LIMITED URL RESPONSE CHECK', targetUrl: 'https://example.invalid/', finalUrl: 'https://example.invalid/', warnings: ['HTTP 403: no content inspected'], checks: [{ ruleId: '#WEB-TLS', resource: 'transport', status: 'completed', detail: 'verified' }] } };
  const markdown = reportMarkdown(data), json = buildReport(data);
  assert.equal(json.mode, 'url'); assert.ok(markdown.includes('HTTP 403')); assert.ok(markdown.includes('LIMITED URL RESPONSE CHECK')); assert.ok(markdown.includes('#WEB-TLS'));
});

test('readable HTML report escapes user-controlled content and preserves redaction', () => {
  const issues = scanFileContent('app.js', `const apiKey = "${key}";`);
  const html = reportHtml({ systemName: '<script>alert(1)</script>', issues, scannedStats: { files: 1, lines: 1 } });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes(key));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes('확인할 항목'));
});

test('API comparison does not resolve unverified permission checks, and reports preserve the demo boundary', () => {
  const issue = { id: 'api', ruleId: '#API-BOLA', filePath: 'api-case:a-to-b', fingerprint: 'api' };
  const entry = { id: 'a-to-b', title: 'A to B', actor: 'A', resource: issue.filePath, expected: '거절', outcome: 'unverified', actualStatus: 200, evidence: 'UNKNOWN_RESPONSE' };
  const result = { mode: 'api_demo', demoVersion: 'fixed', issues: [], scannedFileNames: [], checks: [{ ruleId: '#API-BOLA', resource: issue.filePath, status: 'unverified', detail: 'not checked' }], apiChecks: [entry], scope: '가상 API만 검사' };
  assert.equal(compareUrlScanResults([issue], result)[0].status, 'unverified');
  result.checks[0].status = 'completed';
  assert.equal(compareUrlScanResults([issue], result)[0].status, 'resolved');
  const data = { systemName: 'demo', issues: [], scannedStats: { files: 7, lines: 0 }, scanMetadata: result };
  assert.equal(buildReport(data).mode, 'api_demo'); assert.equal(buildReport(data).apiChecks.length, 1);
  assert.ok(reportMarkdown(data).includes('UNKNOWN_RESPONSE'));
  assert.ok(reportHtml(data).includes('실제 서비스 결과 아님'));
});
