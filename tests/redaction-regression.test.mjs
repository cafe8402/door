import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
function url(file, replacements = []) {
  let source = stripTypeScriptTypes(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  return 'data:text/javascript;base64,' + Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64');
}
const scanner = url('../src/services/localSecurityScanner.ts');
const { scanFileContent, maskSecret } = await import(scanner);
const { buildReport, reportMarkdown, reportHtml } = await import(url('../src/services/report.ts', [['./localSecurityScanner', scanner]]));
const { beginnerRepairPrompt } = await import(url('../src/services/repairGuide.ts', [['./localSecurityScanner', scanner], ['./presentation', url('../src/services/presentation.ts')]]));
const { readSourceFiles } = await import(url('../src/services/fileInput.ts'));
const fake = 'SyntheticOnly' + 'z'.repeat(27);
const aws = 'AKIA' + 'A'.repeat(16);

test('adjacent AWS secret never reaches evidence, either prompt, or report exports', () => {
  const issues = scanFileContent('.env', `AWS_ACCESS_KEY_ID=${aws}\nAWS_SECRET_ACCESS_KEY=${fake}`);
  assert.ok(issues.some(i => i.ruleId === '#VULN-KEY-34'));
  const data = { systemName: 'test', issues, scannedStats: { files: 1, lines: 2 } };
  for (const output of [JSON.stringify(issues), ...issues.map(i => beginnerRepairPrompt(i, 'test')), JSON.stringify(buildReport(data)), reportMarkdown(data), reportHtml(data)]) {
    assert.ok(!output.includes(fake));
    assert.ok(!output.includes(aws));
  }
});

test('generic keys, foreign IDs and all supported private-key blocks are redacted', () => {
  for (const source of [`CUSTOM_KEY=${fake}`, `MY_SECRET_ACCESS_KEY: "${fake}"`, `password = '${fake}'`, `token: \`${fake}\``]) assert.ok(!maskSecret(source).includes(fake));
  for (const digit of ['5','6','7','8']) assert.ok(!maskSecret(`900101-${digit}123456`).includes(`${digit}123456`));
  for (const type of ['PRIVATE KEY','RSA PRIVATE KEY','DSA PRIVATE KEY','ENCRYPTED PRIVATE KEY','PGP PRIVATE KEY BLOCK']) {
    for (const end of [`\n-----END ${type}-----`, '']) {
      const content = `-----BEGIN ${type}-----\n${fake}\n${aws}${end}`;
      const issues = scanFileContent('sample.pem', content);
      assert.ok(issues.some(i => i.ruleId === '#VULN-KEY-10'));
      assert.ok(!JSON.stringify(issues).includes(fake));
      assert.equal(maskSecret(content).split('\n').length, content.split('\n').length);
    }
  }
});

test('multiline assignments are redacted before neighboring evidence is extracted', () => {
  const content = `CUSTOM_KEY="first\n${fake}\n${aws}\nlast"`;
  const issues = scanFileContent('config.py', content);
  assert.ok(issues.length);
  assert.ok(!JSON.stringify(issues).includes(fake));
  assert.equal(issues[0].line, 3);
  const masked = maskSecret(content);
  assert.equal(maskSecret(masked), masked);
});

test('new common signatures detect while conditional Firebase and environment passwords stay clear', () => {
  for (const [source, rule] of [[`password = "${fake}"`, '#VULN-KEY-35'], ['hf_'+'a'.repeat(34), '#VULN-KEY-36'], ['allow read, write: if true;', '#VULN-FIREBASE-37']]) assert.ok(scanFileContent('sample.txt', source).some(i => i.ruleId === rule));
  assert.ok(scanFileContent('sample.txt', 'ASIA'+'A'.repeat(16)).length);
  assert.equal(scanFileContent('sample.rules', 'allow read: if request.auth != null;').length, 0);
  assert.equal(scanFileContent('sample.py', 'password = os.environ["PASSWORD"]').length, 0);
});

test('AI handoff omits even unrecognized raw evidence', () => {
  const issue = scanFileContent('test.txt', aws)[0];
  issue.codeSnippet = 'unrecognized-sensitive-evidence';
  assert.ok(!beginnerRepairPrompt(issue, 'test').includes(issue.codeSnippet));
  assert.ok(!issue.aiPrompt.includes(aws));
});

test('reports redact nested metadata and remediation, including old stored findings', () => {
  const issue = scanFileContent('test.txt', aws)[0];
  issue.codeSnippet = `CUSTOM_KEY=${fake}`;
  issue.resolutionSteps = [{ title: 'test', desc: `CUSTOM_KEY=${fake}` }];
  const data = { systemName: 'test', issues: [issue], scannedStats: {files: 1, lines: 1}, scanMetadata: { warnings: [`CUSTOM_KEY=${fake}`] } };
  assert.ok(!JSON.stringify(buildReport(data)).includes(fake));
});

test('new file extensions are accepted as UTF-8 text; binary still rejected', async () => {
  for (const ext of ['pem','key','ipynb','rules','vue','svelte','kt','rs','tf','properties','csv']) {
    const files = await readSourceFiles([{name:`example.${ext}`,size:2,text:async()=> '{}'}], []);
    assert.equal(files.length, 1);
  }
  await assert.rejects(readSourceFiles([{name:'example.key',text:async()=> '\0'}]), /UTF-8/);
});

test('notebooks inspect decoded cell source and outputs with cell locations', () => {
  const notebook = JSON.stringify({cells: [{source: [`password = "${fake}"\n`], outputs: [{text: [`AWS_SECRET_ACCESS_KEY=${fake}\n`]}]}]});
  const issues = scanFileContent('sample.ipynb', notebook);
  assert.ok(issues.some(i => i.location.includes('1번 셀 코드')));
  assert.ok(issues.some(i => i.location.includes('1번 셀 출력')));
  assert.ok(issues.every(i => i.filePath === 'sample.ipynb'));
  assert.ok(!JSON.stringify(issues).includes(fake));
  assert.throws(() => scanFileContent('bad.ipynb', '{}'), /셀 목록/);
});
