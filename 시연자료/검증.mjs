import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {runLocalSecurityScan,compareScanResults} from '../src/services/localSecurityScanner.ts';
const root=path.dirname(fileURLToPath(import.meta.url));
const cases=JSON.parse(fs.readFileSync(path.join(root,'시나리오.json'),'utf8'));
const results=[];
for(const entry of cases){
  const scan=async version=>{
    const dir=path.join(root,entry.name,version);
    const files=fs.readdirSync(dir).map(name=>{const content=fs.readFileSync(path.join(dir,name),'utf8');return {name,content,size:Buffer.byteLength(content)};});
    const output=await runLocalSecurityScan({inputTab:'upload',files});
    for(const file of files)for(const key of file.content.match(/sk-proj-[a-f0-9]{48}/g)||[])assert.equal(JSON.stringify(output).includes(key),false,'키 원문은 결과에 없어야 합니다');
    return output;
  };
  const before=await scan('수정전'),after=await scan('수정후');
  const actionable=before.issues.filter(i=>i.sourceAssessment?.status==='actionable');
  assert.ok(actionable.some(i=>i.sourceAssessment.kind===entry.kind),entry.name+' 수정 안내 누락');
  assert.equal(after.issues.filter(i=>i.sourceAssessment?.status==='actionable').length,0,entry.name+' 수정후에 문제 남음');
  const compared=compareScanResults(before.issues,after.issues,after.scannedFileNames);
  assert.ok(compared.some(i=>i.status==='resolved'),entry.name+' 재검사 변화 누락');
  results.push({유형:entry.name,수정전_수정대상:actionable.length,수정후_전체단서:after.issues.length,재검사_사라진단서:compared.filter(i=>i.status==='resolved').length,결과:'통과'});
}
fs.writeFileSync(path.join(root,'검증결과.json'),JSON.stringify({검증시각:new Date().toISOString(),검사방법:'폴더 선택과 동일하게 수정전·수정후 각각 상대 파일명으로 검사. 소스 실행·외부 요청 없음.',results},null,2));
console.log(JSON.stringify(results,null,2));
