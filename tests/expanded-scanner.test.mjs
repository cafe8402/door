import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(fs.readFileSync(new URL('../src/services/localSecurityScanner.ts', import.meta.url), 'utf8'));
const { scanFileContent, maskSecret, runLocalSecurityScan, compareScanResults, RULE_COUNT } = await import('data:text/javascript;base64,' + Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64'));
const jwt = role => Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ iss: 'supabase', role })).toString('base64url') + '.' + 'x'.repeat(43);
const has = (text, id) => scanFileContent('work-system.ts', text).some(issue => issue.ruleId === id);
test('dynamic SQL catches concatenation, templates, Python formatting and unsafe raw sinks', () => {
  for (const code of [
    'db.query("SELECT * FROM staff WHERE name = " + req.query.name)',
    'db.query(`SELECT * FROM staff WHERE id = ${req.params.id}`)',
    'cursor.execute(f"SELECT * FROM staff WHERE id = {staff_id}")',
    'cursor.execute("SELECT * FROM staff WHERE name = %s" % name)',
    'sql = "SELECT * FROM staff WHERE id = {}".format(user_id)',
  ]) assert.ok(has(code, '#VULN-SQL-15'), code);
  assert.ok(has('prisma.$queryRawUnsafe(sql)', '#VULN-SQL-16'));
});
test('parameterized SQL and unrelated template strings are not classified as dynamic SQL', () => {
  for (const code of ['db.query("SELECT * FROM staff WHERE id = $1", [id])', 'cursor.execute("SELECT * FROM staff WHERE name = %s", (name,))', 'prisma.$queryRaw`SELECT * FROM staff WHERE id = ${id}`', 'const welcome = `Hello ${name}`']) {
    // Tagged Prisma SQL binds parameters and must not be treated as unsafe string SQL.
    assert.ok(!has(code, '#VULN-SQL-15'), code);
  }
});
test('CORS catches common JS headers, JSON, Python, Django and nginx while explicit allowlists stay clear', () => {
  for (const code of ['res.setHeader("Access-Control-Allow-Origin", "*")', 'headers.set("Access-Control-Allow-Origin", "*")', '"Access-Control-Allow-Origin": "*"', 'allow_origins=["*"]', 'CORS_ALLOW_ALL_ORIGINS = True', 'add_header Access-Control-Allow-Origin *;', 'app.use(cors({\n origin: "*"\n}))']) assert.ok(has(code, '#VULN-CORS-06'), code);
  for (const code of ['app.use(cors({ origin: "https://staff.example" }))', 'allow_origins=["https://staff.example"]']) assert.ok(!has(code, '#VULN-CORS-06'), code);
});
test('RLS detects disabling and unrestricted policies but does not invent missing deployment settings', () => {
  assert.ok(has('ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;', '#VULN-RLS-17'));
  assert.ok(has('create policy "all" on public.staff for select to authenticated using (true);', '#VULN-RLS-18'));
  assert.ok(has('CREATE POLICY "write" ON public.staff FOR INSERT WITH CHECK (true);', '#VULN-RLS-18'));
  for (const code of ['alter table public.staff enable row level security;', 'create policy "own" on public.staff using (auth.uid() = owner_id);', 'create table public.staff (id uuid);']) assert.ok(!scanFileContent('migration.sql', code).some(issue => /-RLS-/.test(issue.ruleId)));
});
test('public env detects server secrets but accepts intended public Supabase and Stripe keys', () => {
  for (const code of ['VITE_OPENAI_API_KEY="private-example-value"', 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY="private-example-value"', 'process.env.NEXT_PUBLIC_JWT_SECRET', 'VITE_DATABASE_URL="postgresql://u:p@db.example/work"']) assert.ok(has(code, '#VULN-PUBLIC-19'), code);
  for (const code of ['VITE_SUPABASE_ANON_KEY="' + jwt('anon') + '"', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_' + 'a'.repeat(24) + '"', 'NEXT_PUBLIC_STRIPE_API_KEY="pk_test_' + 'a'.repeat(30) + '"', 'VITE_API_URL="https://example.invalid"']) assert.ok(!has(code, '#VULN-PUBLIC-19'), code);
});
const tokens = [
  ['#VULN-KEY-20', 'sk_live_' + 'a'.repeat(30)], ['#VULN-KEY-20', 'rk_test_' + 'a'.repeat(30)],
  ['#VULN-KEY-21', 'whsec_' + 'a'.repeat(30)], ['#VULN-KEY-22', 'sb_secret_' + 'a'.repeat(30)],
  ['#VULN-KEY-23', jwt('service_role')], ['#VULN-KEY-24', 'sbp_' + 'a'.repeat(40)],
  ['#VULN-KEY-25', 'xoxb-' + 'a'.repeat(25)], ['#VULN-KEY-26', 'https://hooks.slack.com/services/' + 'T'.repeat(9) + '/' + 'B'.repeat(9) + '/' + 'a'.repeat(24)],
  ['#VULN-KEY-27', 'glpat-' + 'a'.repeat(24)], ['#VULN-KEY-28', 'npm_' + 'a'.repeat(36)],
  ['#VULN-KEY-29', 'SG.' + 'a'.repeat(22) + '.' + 'b'.repeat(43)], ['#VULN-KEY-30', 'AccountKey=' + 'a'.repeat(44) + '=='],
  ['#VULN-KEY-31', 'postgresql://staff:fictional-password@db.example/work'], ['#VULN-KEY-32', 'JWT_SECRET="' + 'a'.repeat(24) + '"'],
  ['#VULN-KEY-33', 're_' + 'a'.repeat(30)],
];
test('every new service signature detects synthetic values and masks findings, context and AI handoff', () => {
  for (const [id, value] of tokens) {
    const issues = scanFileContent('work.env', 'eval(x)\n' + value + '\neval(y)');
    assert.ok(issues.some(issue => issue.ruleId === id), id);
    assert.ok(!maskSecret(value).includes(value), id);
    for (const issue of issues) {
      assert.ok(!issue.codeSnippet.includes(value), id + ' snippet');
      assert.ok(!issue.aiPrompt.includes(value), id + ' prompt');
    }
  }
  assert.equal(RULE_COUNT, 37);
});
test('Supabase anon and publishable keys, Stripe public keys and ordinary JWTs are not secret findings', () => {
  for (const token of [jwt('anon'), jwt('authenticated'), 'sb_publishable_' + 'a'.repeat(30), 'pk_live_' + 'a'.repeat(30)]) assert.ok(!scanFileContent('client.ts', token).some(issue => /#VULN-KEY-(?:20|22|23)/.test(issue.ruleId)), token.slice(0, 15));
});
test('public env values are redacted even when a nearby SQL finding provides the snippet', () => {
  const value = 'fictional-company-signing-value';
  for (const issue of scanFileContent('work.ts', 'VITE_JWT_SECRET="' + value + '"\neval(x)')) {
    assert.ok(!issue.codeSnippet.includes(value)); assert.ok(!issue.aiPrompt.includes(value));
  }
});
test('new rules participate in real scans and conservative recheck matching', async () => {
  const oldCode = 'db.query("SELECT * FROM staff WHERE id = " + id)\nALTER TABLE staff DISABLE ROW LEVEL SECURITY;';
  const newCode = 'db.query("SELECT * FROM staff WHERE id = $1", [id])\nALTER TABLE staff ENABLE ROW LEVEL SECURITY;';
  const scan = code => runLocalSecurityScan({ inputTab: 'upload', files: [{ name: 'work.sql', size: code.length, content: code }] });
  const before = await scan(oldCode), after = await scan(newCode);
  assert.equal(before.issues.length, 2); assert.equal(after.issues.length, 0);
  assert.equal(compareScanResults(before.issues, after.issues, after.scannedFileNames).filter(entry => entry.status === 'resolved').length, 2);
  assert.ok(compareScanResults(before.issues, [], []).every(entry => entry.status === 'unverified'));
});

test('downloadable work-system fixtures are real inputs and fixed counterparts clear the new findings', async () => {
  const scan = async version => {
    const root = new URL(`../demo-data/work-system/${version}/`, import.meta.url);
    const files = fs.readdirSync(root).map(name => { const content = fs.readFileSync(new URL(name, root), 'utf8'); return { name, content, size: Buffer.byteLength(content) }; });
    return runLocalSecurityScan({ inputTab: 'upload', files });
  };
  const before = await scan('vulnerable'), after = await scan('fixed');
  for (const id of ['#VULN-SQL-15', '#VULN-SQL-16', '#VULN-RLS-17', '#VULN-RLS-18', '#VULN-CORS-06', '#VULN-PUBLIC-19', '#VULN-KEY-22']) assert.ok(before.issues.some(issue => issue.ruleId === id), id);
  assert.equal(after.issues.length, 0);
  assert.ok(compareScanResults(before.issues, after.issues, after.scannedFileNames).every(entry => entry.status === 'resolved'));
});
