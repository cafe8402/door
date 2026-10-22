import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, FileDown, Search } from 'lucide-react';
import type { SecurityIssue, ScanInputData } from '../types/security';
import type { ScanResultPayload } from '../services/localSecurityScanner';
import { resultActions } from '../services/resultActions';
import { issueLocation, simpleWarning, manualReviewForInput } from '../services/presentation';
import { RepairWizard } from './RepairWizard';
import { LaunchReview } from './LaunchReview';
import { ApiCheckSummary } from './ApiCheckSummary';
interface Props {
  systemName: string; targetUrl: string; issues: SecurityIssue[]; selectedCategoryFilter: string;
  scanMode?: 'real_file' | 'url' | 'api_demo'; scanMetadata?: ScanResultPayload;
  scannedStats?: { files: number; lines: number }; scannedAt?: string; ruleCount?: number; inputData?: ScanInputData;
  onSelectCategoryFilter: (category: string) => void; onSelectIssue: (issue: SecurityIssue) => void;
  onStartRescanInput: () => void; onResetNewScan: () => void; onOpenReportModal: () => void;
}
export const ScreenScanResult: React.FC<Props> = ({systemName, issues, scanMode, scanMetadata, scannedStats, scannedAt, inputData, onSelectIssue, onStartRescanInput, onResetNewScan, onOpenReportModal}) => {
  const actions = resultActions(issues, scanMode);
  const [filter, setFilter] = useState<'fix'|'review'|'scope'>('fix');
  const [selectedKey, setSelectedKey] = useState<string|null>(null);
  const selected = actions.find(action => action.key === selectedKey);
  const fixes = actions.filter(action => action.decision === 'fix');
  const reviews = actions.filter(action => action.decision === 'review');
  const count = (items: typeof actions) => items.reduce((sum, action) => sum + action.issues.length, 0);
  const warnings = [...new Set(scanMetadata?.warnings || [])];
  const unverified = (scanMetadata?.checks || []).filter(check => check.status === 'unverified');
  const apiUnverified = (scanMetadata?.apiChecks || []).filter(check => check.outcome === 'unverified');
  const parseFailures = scanMetadata?.sourceReview?.parseFailures || 0;
  const unsupported = scanMetadata?.sourceReview?.unsupportedFiles || 0;
  const limited = !!(warnings.length || unverified.length || apiUnverified.length || parseFailures || unsupported || (scanMode === 'url' && !scannedStats?.files));
  const visible = filter === 'fix' ? fixes : reviews;
  const changeFilter = (next: typeof filter) => {setFilter(next);setSelectedKey(null);};
  return <div className="result-workspace result-dashboard">
    <header className="dashboard-header"><div><p className="dashboard-eyebrow">검사 결과</p><h1>무엇부터 고치면 될까요?</h1><p>{systemName || '내 프로젝트'}{scannedAt ? ` · ${new Date(scannedAt).toLocaleDateString('ko-KR')}` : ''}</p></div><button className="wizard-secondary" onClick={onOpenReportModal}><FileDown size={18}/> 결과 저장</button></header>
    {scanMode === 'api_demo' && <p className="dashboard-caption">가짜 자료로 만든 연습 결과예요. 실제 회사 서비스의 검사 결과가 아니에요.</p>}
    <div className="dashboard-stats" aria-label="검사 결과 요약">
      <button className="stat-fix" aria-pressed={filter==='fix'} onClick={()=>changeFilter('fix')}><span>수정 필요</span><strong>{count(fixes)}<small>곳</small></strong><span>{fixes.length}개 종류 · 고칠 방법 보기 →</span></button>
      <button className="stat-review" aria-pressed={filter==='review'} onClick={()=>changeFilter('review')}><span>추가 확인</span><strong>{count(reviews)}<small>곳</small></strong><span>{reviews.length}개 종류 · 실제 문제인지 확인 →</span></button>
      <button aria-pressed={filter==='scope'} onClick={()=>changeFilter('scope')}><span>검사 범위</span><strong className="scope-value">{limited ? '제한 있음' : '기록 보기'}</strong><span>읽은 자료와 확인하지 못한 내용 →</span></button>
    </div>
    <p className="dashboard-caption">발견 위치 기준이에요. 같은 종류는 묶어서 보여드려요. 실제 피해나 유출을 확인한 결과는 아니에요.</p>
    <div className={`dashboard-columns ${selected ? 'has-selection' : ''}`}>
      <section className="dashboard-list" aria-label="종류별 검사 결과">
        <div className="dashboard-tabs" role="group" aria-label="결과 분류">{([{id:'fix',label:'수정 필요'}, {id:'review',label:'추가 확인'}, {id:'scope',label:'검사 범위'}] as const).map(tab=><button key={tab.id} aria-pressed={filter===tab.id} onClick={()=>changeFilter(tab.id)}>{tab.label}</button>)}</div>
        {filter === 'scope' ? <div className="dashboard-scope"><h2>확인한 범위와 남은 확인</h2><p>{scannedStats?.files ?? scanMetadata?.scannedFilesCount ?? 0}개 자료 · {scannedStats?.lines ?? scanMetadata?.totalLinesScanned ?? 0}줄 검사</p>{!!parseFailures && <p>문법을 읽지 못한 파일: {parseFailures}개</p>}{!!unsupported && <p>문법 분석 미지원 파일: {unsupported}개 (패턴 검사와 별개)</p>}{unverified.map((check,i)=><p key={i}>{check.resource} · {check.detail}</p>)}{apiUnverified.map(check=><p key={check.id}>{check.title} · {check.evidence}</p>)}{warnings.map(warning=><p key={warning}>{simpleWarning(warning)}</p>)}{manualReviewForInput(inputData).map(item=><p key={item}>· {item}</p>)}</div> : <>
          <div className="dashboard-list-heading"><h2>{filter==='fix' ? '고쳐야 할 내용' : '확인이 필요한 내용'}</h2><span>{visible.length}개 종류</span></div>
          {filter === 'review' && <p className="dashboard-caption">아직 위험으로 확정되지 않았어요. 실제 사용 여부부터 확인하세요.</p>}
          {visible.map(action=><button key={action.key} className="dashboard-row" aria-pressed={selectedKey===action.key} onClick={()=>setSelectedKey(action.key)}><span><b>{action.title}</b><small>{new Set(action.issues.map(issue=>issue.filePath || issue.location)).size}개 파일 · {action.issues.length}곳</small></span><ArrowRight size={19}/></button>)}
          {!visible.length && <div className="dashboard-empty"><Search size={28}/><h2>{filter==='fix' ? '수정 대상으로 확인된 항목이 없어요' : '추가 확인 항목이 없어요'}</h2><p>{filter==='fix' && reviews.length ? '추가 확인 탭에 남은 내용을 확인하세요.' : '검사 범위 안의 결과이며, 서비스 전체의 안전을 보장하지 않아요.'}</p>{filter==='fix' && !!reviews.length && <button className="wizard-secondary" onClick={()=>changeFilter('review')}>추가 확인 {count(reviews)}곳 보기</button>}</div>}
        </>}
      </section>
      <section className="dashboard-detail" aria-label="선택한 항목 상세">
        {selected ? <><div className="dashboard-detail-heading"><button className="wizard-secondary" onClick={()=>setSelectedKey(null)}><ArrowLeft size={16}/> 목록으로</button><span>{selected.decision==='fix' ? '수정 필요' : '추가 확인'} · {selected.issues.length}곳</span></div><h2 className="dashboard-selected-title">{selected.title}</h2><RepairWizard key={`${scannedAt}:${selected.key}`} actions={[selected]} systemName={systemName} onRescan={onStartRescanInput}/></> : <div className="dashboard-empty"><Search size={32}/><h2>항목을 선택해 주세요</h2><p>왜 문제인지, 어느 줄을 고쳐야 하는지<br/>수정 요청문까지 여기에서 확인해요.</p></div>}
      </section>
    </div>
    <details className="repair-technical"><summary>예제·테스트 기록 및 담당자용 상세</summary><p>예제·연습 기록 {count(actions.filter(action=>action.example))}곳 · 기본 수정 대상에서 구분했어요. 실제 비밀값이라면 별도 확인이 필요해요.</p>{issues.map(issue=><button key={issue.id} className="block py-2 text-left" onClick={()=>onSelectIssue(issue)}>{issueLocation(issue)}</button>)}{scanMode==='api_demo' && scanMetadata && <ApiCheckSummary result={scanMetadata}/>} {scanMetadata && <LaunchReview result={scanMetadata} name={systemName || '내 프로젝트'}/>}</details>
    <footer className="dashboard-footer"><button className="wizard-secondary" onClick={onResetNewScan}>다른 자료로 새 검사</button><button className="repair-action" onClick={onStartRescanInput}>고친 자료 다시 검사 <ArrowRight size={18}/></button></footer>
  </div>;
};
