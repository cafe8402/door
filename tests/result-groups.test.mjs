import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(fs.readFileSync(new URL('../src/services/resultGroups.ts', import.meta.url), 'utf8'));
const {groupFindings, isExampleFinding} = await import('data:text/javascript;base64,'+Buffer.from(source.replaceAll('./sourceAnalysis.mjs', new URL('../src/services/sourceAnalysis.mjs', import.meta.url).href)).toString('base64'));
const issue = (id, filePath, ruleId = 'KEY', severity = 'high') => ({id,filePath,ruleId,severity});
test('repeated locations group by rule without deleting or mutating any finding', () => {
  const input = [issue('a','src/a.ts'),issue('b','src/b.ts'),issue('c','src/a.ts','SQL')];
  const copy = JSON.stringify(input);
  const groups = groupFindings(input);
  assert.equal(groups.length,2);
  assert.deepEqual(groups.flatMap(g=>g.issues.map(i=>i.id)).sort(),['a','b','c']);
  assert.equal(JSON.stringify(input),copy);
});
test('test and example paths stay separate even when they contain real credentials', () => {
  const input = [issue('a','src/a.ts'),issue('b','tests/real-secret.env'),issue('c','artifacts/copy/demo-data/before/key.txt')];
  const groups = groupFindings(input);
  assert.equal(groups.length,2);
  assert.equal(groups.find(g=>g.example).issues.length,2);
  assert.ok(isExampleFinding(issue('d','src\\auth.spec.ts')));
  assert.ok(!isExampleFinding(issue('e','src/latest/token.ts')));
  assert.ok(!isExampleFinding(issue('f','src/localSecurityScanner.ts')));
  assert.ok(!isExampleFinding(issue('g','public/assets/example.html')));
});
test('priority follows most severe occurrence and empty results remain empty', () => {
  const groups = groupFindings([issue('a','src/a.ts','A','info'),issue('b','src/b.ts','B','medium'),issue('c','src/c.ts','A','high')]);
  assert.equal(groups[0].issues[0].id,'c');
  assert.deepEqual(groupFindings([]),[]);
});
