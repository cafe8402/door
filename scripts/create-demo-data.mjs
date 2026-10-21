import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const source = stripTypeScriptTypes(fs.readFileSync(path.join(root, 'src/services/localSecurityScanner.ts'), 'utf8'));
const { runLocalSecurityScan, compareScanResults } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const output = path.join(root, 'demo-data');
const marker = '// SYNTHETIC TEST FIXTURE: static analysis input only.\n';
const scenarios = [
  ['01-openai-key', 'OpenAI 키', '#VULN-KEY-01', 'config.js', `export const apiKey = "sk-proj-${'DUMMY'.repeat(7)}";`, 'export const apiKey = process.env.OPENAI_API_KEY;'],
  ['02-anthropic-key', 'Anthropic 키', '#VULN-KEY-02', 'config.js', `export const apiKey = "sk-ant-${'DUMMY'.repeat(7)}";`, 'export const apiKey = process.env.ANTHROPIC_API_KEY;'],
  ['03-aws-key', 'AWS 키 ID', '#VULN-KEY-03', 'config.js', `export const accessKeyId = "AKIA${'A'.repeat(16)}";`, 'export const credentials = undefined; // Use the runtime role.'],
  ['04-browser-ai', '브라우저 AI 직접 호출', '#VULN-BROWSER-04', 'config.js', 'export const options = { dangerouslyAllowBrowser: true };', 'export const options = { dangerouslyAllowBrowser: false };'],
  ['05-personal-data', '주민번호 형식', '#VULN-PII-05', 'data.js', 'export const sampleId = "000000-1000000"; // Invalid date; not a real identifier.', 'export const sampleId = "[REDACTED]";'],
  ['06-cors', 'CORS 전체 허용', '#VULN-CORS-06', 'server.js', 'const configure = () => cors({\n  credentials: false,\n  origin: "*"\n});', 'const configure = () => cors({\n  origin: "https://app.example.invalid"\n});'],
  ['07-dynamic-code', '동적 코드 실행', '#VULN-EVAL-07', 'parser.js', 'export function parse(input) { return eval(input); }', 'export function parse(input) { return JSON.parse(input); }'],
  ['08-google-key', 'Google API 키', '#VULN-KEY-08', 'config.js', `export const apiKey = "AIza${'DUMMY'.repeat(7)}";`, 'export const apiKey = process.env.GOOGLE_API_KEY;'],
  ['09-github-token', 'GitHub 토큰', '#VULN-KEY-09', 'config.js', `export const token = "ghp_${'DUMMY'.repeat(7)}";`, 'export const token = process.env.GITHUB_TOKEN;'],
  ['10-private-key', '개인키 블록', '#VULN-KEY-10', 'key.txt', '-----BEGIN PRIVATE KEY-----\nTHIS_IS_NOT_A_VALID_KEY_TEST_ONLY\n-----END PRIVATE KEY-----', '[REMOVED: use a secret manager]'],
  ['11-shell-execution', '셸 실행', '#VULN-EXEC-11', 'runner.js', 'export function runTask(input) { return exec(input); }', 'const actions = { status: () => "ready" };\nexport function runTask(input) { return actions[input]?.() ?? "denied"; }'],
  ['12-html-insertion', 'HTML 직접 삽입', '#VULN-XSS-12', 'render.js', 'export function render(node, input) { node.innerHTML = input; }', 'export function render(node, input) { node.textContent = input; }'],
  ['13-tls-verification', 'TLS 검증 해제', '#VULN-TLS-13', 'config.js', 'export const tlsOptions = { rejectUnauthorized: false };', 'export const tlsOptions = { rejectUnauthorized: true };'],
  ['14-agent-approval', '에이전트 승인 우회', '#VULN-AGENT-14', 'agent.json', '{ "permissionMode": "bypassPermissions" }', '{ "permissionMode": "default" }'],
];
const manifest = [];
async function scan(files) {
  return runLocalSecurityScan({ inputTab: 'upload', files: Object.entries(files).map(([name, content]) => ({ name, content, size: Buffer.byteLength(content) })) });
}
function writeFiles(folder, files) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(output, folder, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
for (const [folder, label, ruleId, filename, beforeSource, afterSource] of scenarios) {
  const prefix = filename.endsWith('.js') ? marker : '';
  const before = { [filename]: prefix + beforeSource + '\n' };
  const after = { [filename]: prefix + afterSource + '\n' };
  const first = await scan(before), second = await scan(after);
  assert.deepEqual(first.issues.map(issue => issue.ruleId), [ruleId], folder);
  assert.equal(second.issues.length, 0, folder);
  const comparison = compareScanResults(first.issues, second.issues, second.scannedFileNames);
  assert.deepEqual(comparison.map(entry => entry.status), ['resolved'], folder);
  writeFiles(`${folder}/before`, before); writeFiles(`${folder}/after`, after);
  manifest.push({ folder, label, before: 1, after: 0, ruleId, severity: first.issues[0].severity, category: first.issues[0].category, expectedComparison: { resolved: 1, persisting: 0, unverified: 0, new: 0 } });
}

const mixedBefore = {
  'a.js': marker + 'export function parse(input) { return eval(input); }\n',
  'b.js': marker + `export const apiKey = "sk-proj-${'DUMMY'.repeat(7)}";\n`,
  'missing.js': marker + 'export function render(node, input) { node.innerHTML = input; }\n',
};
const mixedAfter = {
  'a.js': marker + '\nexport function parse(data) { return eval(data); }\n',
  'b.js': marker + 'export const apiKey = process.env.OPENAI_API_KEY;\n',
  'new.js': marker + 'export const options = { rejectUnauthorized: false };\n',
};
const first = await scan(mixedBefore), second = await scan(mixedAfter);
const comparison = compareScanResults(first.issues, second.issues, second.scannedFileNames);
const counts = Object.fromEntries(['resolved', 'persisting', 'unverified', 'new'].map(status => [status, comparison.filter(entry => entry.status === status).length]));
assert.deepEqual(counts, { resolved: 1, persisting: 1, unverified: 1, new: 1 });
writeFiles('15-mixed-rescan/before', mixedBefore); writeFiles('15-mixed-rescan/after', mixedAfter);
manifest.push({ folder: '15-mixed-rescan', label: '재검사 4개 상태 동시 검증', before: first.issues.length, after: second.issues.length, expectedComparison: counts });

const repeated = { 'a.js': marker + 'export function first(x) { return eval(x); }\nexport function second(x) { return eval(x); }\n', 'b.js': marker + 'export function third(x) { return eval(x); }\n' };
const repeatedResult = await scan(repeated);
assert.equal(repeatedResult.issues.length, 3); assert.equal(new Set(repeatedResult.issues.map(issue => issue.id)).size, 3);
writeFiles('16-repeated-findings', repeated);
manifest.push({ folder: '16-repeated-findings', label: '동일 규칙 여러 줄·파일', expected: 3, note: 'a.js 2건 + b.js 1건. 이슈 ID는 서로 달라야 함.' });

const clean = { 'app.js': marker + 'export function greet(name) { return `Hello ${String(name)}`; }\n', 'empty.txt': '' };
assert.equal((await scan(clean)).issues.length, 0);
writeFiles('17-clean-and-empty', clean);
manifest.push({ folder: '17-clean-and-empty', label: '정상 텍스트·빈 파일', expected: 0, scannedFiles: 2 });

const uncovered = { 'server.js': marker + 'export function register(app, documents) {\n  app.get("/documents/:id", (req, res) => {\n    res.json(documents[req.params.id]);\n  });\n}\n' };
assert.equal((await scan(uncovered)).issues.length, 0);
writeFiles('18-scope-limit', uncovered);
manifest.push({ folder: '18-scope-limit', label: '현재 규칙의 미탐 한계', expected: 0, note: '사용자별 인가 확인이 없는 코드 예시. 현재 규칙은 인가 우회를 분석하지 않으므로 0건이어도 안전 판정이 아님.' });

writeFiles('', {
  'expected-results.json': JSON.stringify({ description: '검사 엔진으로 생성 시 검증한 예상값. resolved의 UI 표시는 패턴 미검출.', scenarios: manifest }, null, 2) + '\n',
  'README.md': `# 문단속 더미 데이터 검증팩\n\n총 18개 유형입니다. 실제 자격증명이나 개인정보는 포함하지 않습니다. 키는 DUMMY 반복 문자열, 주민번호 형식은 존재하지 않는 날짜, 개인키는 유효하지 않은 텍스트입니다. 파일은 실행하지 않고 문단속의 정적 검사 입력으로 사용하세요.\n\n## 시작\n\n1. ZIP 압축을 풉니다. ZIP 자체를 앱에 올리지 않습니다.\n2. 문단속에서 새 검사를 시작하고, 원하는 유형의 before 폴더를 프로젝트 폴더로 선택합니다.\n3. 검사 결과를 아래 표와 비교합니다.\n4. 고친 뒤 다시 검사에서 같은 유형의 after 폴더를 프로젝트 폴더로 선택합니다.\n5. 같은 상대 경로로 비교되므로 01~14는 각각 패턴 미검출 1건이 나와야 합니다.\n\n01~14의 after는 해당 패턴 제거 예시이며, 완전한 서버 구현이나 기능 보존을 보증하지 않습니다. 한 번에 전체 demo-data 폴더를 올리면 before·after·설명 파일이 함께 스캔되므로 유형별 폴더를 선택하세요. 각 유형은 별도의 새 검사로 시작합니다.\n\n| 폴더 | 유형 | 처음 | 수정 후 |\n|---|---|---:|---:|\n${manifest.map(item => `| ${item.folder} | ${item.label} | ${item.before ?? item.expected} | ${item.after ?? '해당 없음'} |`).join('\n')}\n\n## 추천 확인 순서\n\n- 01-openai-key: 발견 위치·증거·AI 수정 요청문·보고서에서 DUMMY 키가 숨겨지는지 확인합니다.\n- 05-personal-data: 가상 주민번호가 화면과 요청문에서 마스킹되는지 확인합니다.\n- 06-cors: 여러 줄 설정도 탐지하는지 확인합니다.\n- 15-mixed-rescan: before 검사 후 after 재검사 시 패턴 미검출 1, 문제 지속 1, 확인 불가 1, 새로 발견 1입니다. 현재 코드의 새 탐지 건수는 2건입니다.\n- 16-repeated-findings: 폴더 전체를 최초 검사하면 a.js 2건, b.js 1건이며 상세 위치가 각각 달라야 합니다.\n- 17-clean-and-empty: 최초 검사 시 2개 파일을 분석하고 탐지는 0건입니다.\n- 18-scope-limit: 사용자별 인가 누락 예시지만 현재 엔진은 탐지하지 않습니다. 0건이 안전 보증을 의미하지 않는지 확인하는 한계 사례입니다.\n\n발견한 문제와 문제일 수 있어요의 구분·위험도·규칙 ID는 expected-results.json에 있습니다. 정적 패턴이므로 주석·테스트 문자열도 검출될 수 있습니다.\n`,
});
console.log(`Verified and generated ${manifest.length} scenarios in ${output}`);
