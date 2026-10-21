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
const scanner = await import(scannerUrl);
const presentationUrl = moduleUrl('../src/services/presentation.ts');
const p = await import(moduleUrl('../src/services/portfolio.ts', [['./localSecurityScanner', scannerUrl], ['./presentation', presentationUrl]]));
const input = { files: [{name:'src/api.js',content:'not retained',size:12}], targetUrl:'' };
const issue = { id:'i',ruleId:'#VULN-KEY-01',filePath:'src/api.js',line:1,title:'접속 키 노출',severity:'high',category:'detected',impactDescription:'API 사용료가 발생할 수 있어요.',resolutionSteps:[{title:'키 교체'}],codeSnippet:'secret original source',aiPrompt:'unredacted prompt',fingerprint:'sensitive-fingerprint' };
const base = () => ({...p.emptyPortfolio(), systems:[{id:'s',name:'업무 서비스',department:'개발',owner:'담당자',description:'',url:'',mode:'upload',createdAt:'2026-10-20T00:00:00Z',archived:false}]});
let counter=0;
const result = (changes={}) => ({mode:'real_file',issues:[issue],scannedAt:new Date(Date.UTC(2026,0,1,0,0,counter++)).toISOString(),scannedFilesCount:1,totalLinesScanned:20,scannedFileNames:['src/api.js'],ruleCount:33,warnings:[],...changes});
const record = (data, changes={}) => p.recordRun(data,'s',input,result(changes));

test('stored projection omits source content, prompts, fingerprints and URL credentials/query',()=>{
  const data = record(base(),{targetUrl:'https://user:password@example.com/path?token=private#fragment'});
  const serialized=JSON.stringify(data);
  for(const secret of ['not retained','secret original source','unredacted prompt','sensitive-fingerprint','password','token=private']) assert.ok(!serialized.includes(secret),secret);
  assert.equal(data.runs[0].target,'https://example.com/path');
  assert.deepEqual(p.parsePortfolio(serialized),JSON.parse(serialized));
});
test('same rule and file group multiple hits and retain an assignment after line movement',()=>{
  let data=record(base(),{issues:[issue,{...issue,id:'i2',line:8}]});
  const key=data.runs[0].findings[0].key;
  assert.equal(data.runs[0].findings.length,1); assert.equal(data.runs[0].findings[0].count,2);
  data=p.upsertTask(data,{systemId:'s',key,assignee:'수정 담당',due:'2020-01-01',status:'awaiting_rescan',note:'수정했어요',updatedAt:''});
  data=record(data,{issues:[{...issue,line:15}]});
  assert.equal(data.runs.at(-1).findings[0].status,'persisting');
  assert.equal(p.taskFor(data,'s',key).assignee,'수정 담당');
  assert.equal(p.portfolioStats(data).overdue,1);
  assert.equal(p.portfolioStats(data).actionSystems,1,'manual completion cannot close an issue');
});
test('omitted findings carry forward as unverified until the same file is actually scanned',()=>{
  let data=record(base());
  data=record(data,{issues:[],scannedFileNames:['unrelated.js']});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
  data=record(data,{issues:[],scannedFileNames:['another.js']});
  assert.equal(p.portfolioStats(data).open,1);
  data=record(data,{issues:[],scannedFileNames:['src/api.js']});
  assert.equal(data.runs.at(-1).findings[0].status,'not_detected');
  assert.equal(p.portfolioStats(data).notDetected,1);
  assert.equal(p.portfolioStats(data).open,0);
});
test('switching scan mode cannot resolve old source issues',()=>{
  let data=record(base());
  data=record(data,{mode:'url',issues:[],scannedFileNames:['src/api.js'],targetUrl:'https://example.com'});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
});
test('URL findings require same target, resource and completed rule check to disappear',()=>{
  const web={...issue,ruleId:'#WEB-CORS',filePath:'https://example.com/api'};
  let data=record(base(),{mode:'url',issues:[web],targetUrl:'https://example.com',scannedFileNames:[web.filePath]});
  data=record(data,{mode:'url',issues:[],targetUrl:'https://example.com',scannedFileNames:[web.filePath],checks:[{ruleId:'#WEB-OTHER',resource:web.filePath,status:'completed'}]});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
  data=record(data,{mode:'url',issues:[],targetUrl:'https://other.com',checks:[{ruleId:web.ruleId,resource:web.filePath,status:'completed'}]});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
  // Back on the changed target remains unverified; then a same-target check can close it.
  data=record(data,{mode:'url',issues:[],targetUrl:'https://example.com',checks:[{ruleId:web.ruleId,resource:web.filePath,status:'completed'}]});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
  data=record(data,{mode:'url',issues:[],targetUrl:'https://example.com',checks:[{ruleId:web.ruleId,resource:web.filePath,status:'completed'}]});
  assert.equal(data.runs.at(-1).findings[0].status,'not_detected');
});
test('example scans cannot inflate executive scan counts or replace real unresolved work',()=>{
  let data=record(base());
  data=p.recordRun(data,'s',{files:scanner.SAMPLE_VULNERABLE_FILES,targetUrl:''},result({issues:[]}));
  assert.equal(data.runs.at(-1).example,true);
  assert.equal(p.portfolioStats(data).open,1);
  const onlySample=p.recordRun(base(),'s',{files:scanner.SAMPLE_VULNERABLE_FILES,targetUrl:''},result());
  assert.notEqual(onlySample.runs[0].findings[0].key,data.runs[0].findings[0].key,'example assignments are isolated from real work');
  assert.equal(p.portfolioStats(onlySample).scanned,0); assert.equal(p.portfolioStats(onlySample).unscanned,1);
  const fixedExample=p.recordRun(onlySample,'s',input,result({issues:[]}),true);
  assert.equal(fixedExample.runs.at(-1).example,true);
  assert.equal(p.portfolioStats(fixedExample).scanned,0);
});
test('redacted URL query resources cannot be falsely resolved by a different query',()=>{
  const web={...issue,ruleId:'#WEB-COOKIE',filePath:'https://example.com/api?record=one'};
  let data=record(base(),{mode:'url',issues:[web],targetUrl:'https://example.com'});
  data=record(data,{mode:'url',issues:[],targetUrl:'https://example.com',checks:[{ruleId:web.ruleId,resource:'https://example.com/api?record=two',status:'completed'}]});
  assert.equal(data.runs.at(-1).findings[0].status,'unverified');
  assert.ok(!JSON.stringify(data).includes('record=one'));
});
test('duplicate scan delivery is idempotent',()=>{
  const r=result(); const first=p.recordRun(base(),'s',input,r);
  assert.equal(p.recordRun(first,'s',input,r).runs.length,1);
});
test('completed review requires real scan, no remaining issues or warnings, and all manual checks',()=>{
  let data=record(base()); let run=data.runs.at(-1);
  const values={reviewer:'검토자',decision:'reviewed',checks:[true,true,true,true],note:''};
  assert.throws(()=>p.saveReview(data,run,values),/남은/);
  data=record(data,{issues:[]}); run=data.runs.at(-1);
  assert.throws(()=>p.saveReview(data,run,{...values,checks:[true,false,true,true]}),/남은/);
  assert.throws(()=>p.saveReview(data,run,{...values,reviewer:''}),/이름/);
  data=p.saveReview(data,run,values); assert.equal(p.currentReview(data,run).decision,'reviewed');
  data=record(data,{issues:[],checks:[{status:'unverified'}]}); run=data.runs.at(-1);
  assert.throws(()=>p.saveReview(data,run,values),/남은/);
});
test('a new scan or task change invalidates previous deployment review',()=>{
  let data=record(base()); const run=data.runs.at(-1);
  data=p.saveReview(data,run,{reviewer:'검토자',decision:'hold',checks:[false,false,false,false],note:'조치 대기'});
  assert.ok(p.currentReview(data,run));
  data=p.upsertTask(data,{systemId:'s',key:run.findings[0].key,assignee:'새 담당',due:'',status:'in_progress',note:'',updatedAt:''});
  assert.equal(p.currentReview(data,run),undefined);
  data=record(data); assert.equal(p.currentReview(data,data.runs.at(-1)),undefined);
  assert.throws(()=>p.saveReview(data,run,{reviewer:'검토자',decision:'hold',checks:[false,false,false,false],note:''}),/새 검사/);
});
test('corrupt or incompatible storage fails without writing, and quota errors propagate',()=>{
  for(const raw of ['{','{}','null',JSON.stringify({...base(),runs:[{bad:true}]})]) assert.throws(()=>p.parsePortfolio(raw));
  let written=false;
  assert.throws(()=>p.writePortfolio({setItem(){written=true;throw new Error('quota');}},base()),/quota/);
  assert.equal(written,true);
  assert.equal(p.parsePortfolio(null).systems.length,0);
});
test('archiving is reversible and removes systems from active executive counts',()=>{
  let data=record(base());
  data.systems[0].archived=true; assert.equal(p.portfolioStats(data).systems,0);
  data.systems[0].archived=false; assert.equal(p.portfolioStats(data).open,1);
  assert.equal(p.portfolioStats(data,'개발').systems,1);
  assert.equal(p.portfolioStats(data,'기타').systems,0);
});
test('executive report escapes user text and contains only real records',()=>{
  const data=record(base()); data.systems[0].name='<img src=x onerror=alert(1)>';
  const html=p.executiveReport(data);
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('secret original source')); assert.ok(html.includes('자동 보안 인증'));
});
