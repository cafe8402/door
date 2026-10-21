import { RepairWizard } from './RepairWizard';
import React, { useState } from 'react';
import { FileDown, ArrowRight, RotateCcw, CheckCircle2, Info, ShieldCheck, AlertCircle, CircleHelp, ChevronDown, Globe2, FolderCode, Wrench } from 'lucide-react';
import type { SecurityIssue, ScanInputData } from '../types/security';
import type { ScanResultPayload } from '../services/localSecurityScanner';
import { ApiCheckSummary } from './ApiCheckSummary';
import { resultActions, actionPrompt } from '../services/resultActions';
import { groupFindings } from '../services/resultGroups';
import { LaunchReview } from './LaunchReview';
import { issueTitle, issueLocation, severityLabel, severityStyle, simpleWarning, manualReviewForInput, orderIssues } from '../services/presentation';
interface Props {
  systemName: string; targetUrl: string; issues: SecurityIssue[]; selectedCategoryFilter: string;
  scanMode?: 'real_file' | 'url' | 'api_demo'; scanMetadata?: ScanResultPayload;
  scannedStats?: { files: number; lines: number }; scannedAt?: string; ruleCount?: number; inputData?: ScanInputData;
  onSelectCategoryFilter: (category: string) => void; onSelectIssue: (issue: SecurityIssue) => void;
  onStartRescanInput: () => void; onResetNewScan: () => void; onOpenReportModal: () => void;
}
export const ScreenScanResult: React.FC<Props> = ({ systemName, issues, selectedCategoryFilter, scanMode, scanMetadata, scannedStats, scannedAt, inputData, onSelectCategoryFilter, onSelectIssue, onStartRescanInput, onResetNewScan, onOpenReportModal }) => {
  const filtered = orderIssues(issues).filter(issue => selectedCategoryFilter === 'all' || issue.category === selectedCategoryFilter);
  const groups = groupFindings(filtered);
  const general = groups.filter(group => !group.example);
  const examples = groups.filter(group => group.example);
  const allGroups = groupFindings(issues);
  const actions = resultActions(issues, scanMode);
  const mainActions = actions.filter(action => action.decision === 'fix');
  const reviewActions = actions.filter(action => action.decision === 'review');
  const fixCount = mainActions.reduce((sum, action) => sum + action.issues.length, 0);
  const reviewCount = reviewActions.reduce((sum, action) => sum + action.issues.length, 0);
  const exampleCount = actions.filter(action => action.example).reduce((sum, action) => sum + action.issues.length, 0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  async function copyAction(action: ReturnType<typeof resultActions>[number]) {
    const prompt = actionPrompt(action, systemName);
    try { await navigator.clipboard.writeText(prompt); setManualPrompt(''); setCopyMessage('복사했어요. 이 서비스를 만든 AI 대화창에 붙여 넣으세요.'); }
    catch { setManualPrompt(prompt); setCopyMessage('자동 복사가 안 됐어요. 아래 문구를 직접 선택해서 복사하세요.'); }
  }
  function renderAction(action: ReturnType<typeof resultActions>[number]) {
    return <article key={action.key} className="repair-step">
      <p className="repair-step-number">수정 필요 · {action.issues.length}곳</p><h2>{action.title}</h2>
      <p><b>확인된 사실</b><br/>{action.fact}</p>
      <p className="repair-note break-all">발견 위치: {issueLocation(action.issues[0])}{action.issues.length > 1 ? ' 외 다른 위치도 함께 발견했어요.' : ''}</p>
      <div className="action-change"><h3>무엇을 바꾸면 되나요?</h3><p>{action.change}</p></div>
      <button className="repair-action" onClick={() => void copyAction(action)}>확인·수정 부탁 문구 복사<ArrowRight size={18}/></button>
      <p className="repair-note">이 서비스를 만든 AI 대화창에 붙여 넣으세요. 같은 내용의 모든 발견 위치가 문구에 포함돼요. 회사에서 허용한 AI를 사용하세요.</p>
      <details><summary>발견 위치별 설명 보기</summary>{action.issues.map(issue => <button key={issue.id} className="block text-left text-sm text-work-accent-copy break-all py-2" onClick={() => onSelectIssue(issue)}>{issueLocation(issue)}</button>)}</details>
    </article>;
  }
  const warnings = [...new Set(scanMetadata?.warnings || [])];
  const incomplete = (scanMode === 'url' && !scannedStats?.files) || (scanMode === 'api_demo' && scanMetadata?.apiChecks?.some(check => check.outcome === 'unverified'));
  function renderGroup(group: ReturnType<typeof groupFindings>[number]) {
    const issue = group.issues[0];
    const fileCount = new Set(group.issues.map(item => item.filePath || item.location)).size;
    return <article key={group.id} className="bg-work-panel rounded-2xl border border-work-line p-5 sm:p-6">
      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ring-1 ring-inset ${severityStyle[issue.severity]}`}>{group.example ? '사용 여부 확인' : severityLabel[issue.severity]}</span>
      <h3 className="font-bold text-base text-work-title mt-3">{issueTitle(issue).replace(/^\[[^\]]+\]\s*/, '')}</h3>
      <p className="text-sm text-work-muted mt-2">{fileCount}개 파일 · {group.issues.length}곳에서 같은 종류의 패턴 발견</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-work-accent-copy">발견 위치 {group.issues.length}곳 펼치기</summary><ul className="mt-3 space-y-3">{group.issues.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-work-line pt-3"><span className="text-sm text-work-muted break-all">{issueLocation(item)}</span><button className="repair-action" onClick={() => onSelectIssue(item)}>이 위치 확인<ArrowRight size={16}/></button></li>)}</ul></details>
    </article>;
  }
  if (mainActions.length || reviewActions.length) return <div className="result-workspace space-y-6">
    <header className="flex flex-wrap gap-3 items-center justify-between"><div><h1>{mainActions.length ? "검사 결과 · 하나씩 고쳐볼까요?" : "검사 결과 · 확인을 도와드릴게요"}</h1><p className="text-work-muted">{systemName || '내 프로젝트'}</p></div><button className="wizard-secondary" onClick={onOpenReportModal}>결과 저장</button></header>
    {!!mainActions.length && <RepairWizard key={scannedAt || issues.map(issue=>issue.id).join(',')} actions={mainActions} systemName={systemName} onRescan={onStartRescanInput}/>}
    {!!reviewCount && <section className="review-guidance" aria-label="추가 확인 진행"><div className="review-pagination"><h2>확인할 내용 {Math.min(reviewIndex+1,reviewActions.length)} / {reviewActions.length}</h2><div><button className="wizard-secondary" disabled={reviewIndex===0} onClick={()=>setReviewIndex(i=>i-1)}>이전 내용</button><button className="wizard-secondary" disabled={reviewIndex>=reviewActions.length-1} onClick={()=>setReviewIndex(i=>i+1)}>다음 내용</button></div></div><RepairWizard key={reviewActions[Math.min(reviewIndex,reviewActions.length-1)].key} actions={[reviewActions[Math.min(reviewIndex,reviewActions.length-1)]]} systemName={systemName} onRescan={onStartRescanInput}/></section>}

    <details className="repair-technical"><summary>검사 범위 · 담당자용 기록</summary><p>실제 유출과 계정별 접근 권한을 검증한 결과는 아니에요.</p>{warnings.map(warning=><p key={warning}>{simpleWarning(warning)}</p>)}{scanMetadata?.sourceReview&&<p>{scanMetadata.sourceReview.scope}</p>}<p>예제·연습 기록 {exampleCount}개</p>{issues.map(issue=><button key={issue.id} className="block py-2 text-left" onClick={()=>onSelectIssue(issue)}>{issueLocation(issue)}</button>)}{scanMetadata&&<LaunchReview result={scanMetadata} name={systemName || '내 프로젝트'}/>}</details>
    <button className="wizard-secondary" onClick={onResetNewScan}>다른 자료로 새 검사</button>
  </div>;
  return <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><span className="inline-flex gap-1.5 items-center text-xs font-semibold text-work-accent-copy mb-2"><CheckCircle2 className="w-3.5 h-3.5" />검사 결과가 나왔어요</span><h1 className="text-2xl sm:text-3xl font-bold text-work-title tracking-tight">점검 결과와 다음 할 일</h1><p className="text-sm text-work-muted mt-2">{systemName || '내 프로젝트'} · {scannedAt ? new Date(scannedAt).toLocaleDateString('ko-KR') : ''}</p></div><button onClick={onOpenReportModal} className="self-start shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border border-work-line bg-work-panel text-sm font-semibold text-work-copy hover:border-work-accent-line"><FileDown className="w-4 h-4" />결과 저장</button></div>
    <section role="status" aria-live="polite" className={`scan-verdict ${fixCount ? 'scan-verdict-danger' : reviewCount || incomplete ? 'scan-verdict-warning' : 'scan-verdict-neutral'}`}>
      <div className="scan-verdict-heading"><AlertCircle size={36} aria-hidden="true"/><div><p className="scan-verdict-label">{fixCount ? '보안 경고 · 수정 필요' : reviewCount ? '주의 · 추가 확인 필요' : incomplete ? '주의 · 검사를 마치지 못했어요' : '검사한 범위의 결과'}</p><h2>{fixCount ? `수정이 필요한 항목 ${fixCount}개를 찾았어요` : reviewCount ? `확인이 필요한 단서 ${reviewCount}개가 있어요` : incomplete ? '확인하지 못한 부분이 남아 있어요' : '이번 검사에서 수정 대상을 찾지 못했어요'}</h2></div></div>
      <p>{fixCount ? '그대로 사용하기 전에 아래 내용을 고쳐주세요. 각 항목의 수정 부탁 문구를 AI나 개발 담당자에게 전달하세요.' : reviewCount ? '아직 안전하다고 판단할 수 없어요. 아래 단서가 실제 사용되는 코드인지 먼저 확인해 주세요.' : '서비스 전체가 안전하다는 판정은 아니에요. 로그인 뒤의 개인정보와 계정별 접근 권한은 별도 확인이 필요해요.'}</p>
      <div className="scan-verdict-counts"><div><strong>{fixCount}</strong><span>수정할 항목</span></div><div><strong>{reviewCount}</strong><span>추가 확인할 단서</span></div><div><strong>{exampleCount}</strong><span>예제·연습 기록</span></div></div>
      {fixCount > 0 && <><p className="scan-verdict-caption">수정할 항목은 발견 위치 기준이에요. 같은 종류는 아래 {mainActions.length}개 카드로 묶었어요. 실제 해킹이나 유출 횟수는 아니에요.</p><button className="repair-action" onClick={() => onSelectIssue(mainActions[0].issues[0])}>첫 번째 항목 고치기<ArrowRight size={20}/></button></>}
    </section>
    {!!mainActions.length && <section aria-label="발견한 내용과 바꿀 방법" className="space-y-4"><h2 className="text-xl font-bold text-work-title">이 내용을 고쳐주세요</h2>{mainActions.map(renderAction)}</section>}

    {!!reviewActions.length && <details className="repair-technical" open={!fixCount}><summary>추가 확인이 필요한 단서 {reviewCount}개 · 위험 확정 아님</summary><p className="repair-note">코드 모양만으로 찾은 후보입니다. 담당자가 실제 사용 여부를 확인하기 전에는 수정 대상으로 표시하지 않아요.</p>{reviewActions.map(action => <article key={action.key} className="p-4 border-t border-work-line"><h3 className="font-semibold">{action.title}</h3><p className="repair-note">{action.fact}</p><button className="repair-action" onClick={() => void copyAction(action)}>확인 부탁 문구 복사</button><details><summary>담당자가 확인할 위치</summary>{action.issues.map(issue => <button key={issue.id} className="block text-left py-2 break-all" onClick={() => onSelectIssue(issue)}>{issueLocation(issue)}</button>)}</details></article>)}</details>}
    {copyMessage && <p role="status" className="repair-note">{copyMessage}</p>}
    {manualPrompt && <textarea aria-label="직접 복사할 수정 부탁 문구" className="w-full p-4 bg-work-panel text-work-copy" rows={8} readOnly value={manualPrompt}/>}
    {(incomplete || warnings.length > 0) && <p role="status" className="rounded-xl border border-work-warn-line bg-work-warn-bg p-4 text-work-warn-copy">이번 검사에는 확인하지 못했거나 범위가 제한된 부분이 있어요. 아래 ‘담당자용 자세한 내용’에 이유를 남겼어요.</p>}
    {scanMetadata?.sourceReview && <details className="repair-technical"><summary>이번 검사의 기준과 범위</summary><p>코드에 직접 적힌 비밀키 · 화면 파일과 연결된 코드 · 누구나 자료를 바꾸도록 허용한 저장소 규칙</p><p>개인정보 유출과 계정별 접근 권한은 아직 검증하지 않았어요.</p><details><summary>읽은 파일과 외부 요청을 받는 위치 보기</summary><p>문법을 읽은 파일 {scanMetadata.sourceReview.parsedFiles}개 · 문법을 읽지 못한 파일 {scanMetadata.sourceReview.parseFailures}개 · 문법 분석 미지원 파일 {scanMetadata.sourceReview.unsupportedFiles}개</p>{scanMetadata.sourceReview.routes.map((route,index)=><p key={index}>{route.file}:{route.line} · {route.method} · 접근 권한 실행 확인 필요</p>)}</details></details>}
    {!!actions.filter(action => action.example).length && <details className="repair-technical"><summary>예제·테스트 기록 · 기본 수정 대상에서 제외</summary><p className="repair-note">예제 경로 또는 가상 실습 결과입니다. 안전 판정은 아니며 원본 기록은 아래 담당자용 목록에 남아 있어요. 실제 비밀값이 들어 있다면 담당자가 별도로 확인해야 합니다.</p></details>}
    <p className="repair-note">{scanMode === 'api_demo' ? '가짜 자료로 만든 연습 결과입니다.' : '이번 결과만으로 개인정보 유출이나 다른 사람의 자료 접근이 확인된 것은 아니에요. 실제 사용자 계정으로 접근 권한을 확인하는 검사는 별도로 필요해요.'}</p>
    <details className="repair-technical"><summary>담당자용 자세한 내용 · 전체 발견 위치</summary><p className="text-sm text-work-muted my-4">발견 위치 {issues.length}곳 · {allGroups.length}개 묶음. 발견 횟수는 실제 유출이나 고칠 일의 개수가 아닙니다. 테스트·예제를 포함한 모든 위치를 보관합니다.</p>
    {scanMode === 'api_demo' && scanMetadata && <ApiCheckSummary result={scanMetadata} />}
    {!!warnings.length && <ul className="text-sm text-work-muted my-4">{warnings.map(message => <li key={message}>{simpleWarning(message)}</li>)}</ul>}
    <section className="space-y-3"><div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between"><h2 className="font-bold text-work-title">종류별로 살펴보기 <span className="text-work-accent-copy ml-1">{groups.length}개 묶음</span></h2><div className="flex gap-1.5 flex-wrap" role="group" aria-label="결과 필터">{[{ id: 'all', title: '전체' }, { id: 'detected', title: '발견한 항목' }, { id: 'suspected', title: '검토할 항목' }].map(({ id, title }) => <button key={id} onClick={() => onSelectCategoryFilter(id)} aria-pressed={selectedCategoryFilter === id} className={`px-3 py-2 text-xs rounded-lg font-medium ${selectedCategoryFilter === id ? 'bg-work-choice text-white' : 'bg-work-panel text-work-muted border border-work-line'}`}>{title}</button>)}</div></div>
      <p className="text-sm text-work-muted leading-relaxed">같은 종류를 한 묶음으로 표시했어요. 위치를 펼쳐 개별 설명을 확인할 수 있어요. 모든 위치는 보고서와 재검사에 그대로 남습니다.</p>
      {general.map(renderGroup)}
      {!!examples.length && <details className="repair-technical"><summary>테스트·예제 경로에서 발견 · {examples.length}개 묶음 / {examples.reduce((sum, group) => sum + group.issues.length, 0)}곳</summary><p className="text-sm text-work-muted my-4">경로 이름을 보고 분류했어요. 의도적으로 넣은 예시일 수 있지만, 실제 키나 운영에 쓰이는 파일이면 확인이 필요해요. 안전 판정이나 검사 제외가 아닙니다.</p><div className="space-y-3">{examples.map(renderGroup)}</div></details>}
      {!issues.length && <div className={`rounded-2xl border p-8 text-center ${incomplete ? 'bg-work-warn-bg border-work-warn-line' : 'bg-work-success-bg border-work-success-line'}`}><ShieldCheck className={`w-10 h-10 mx-auto mb-4 ${incomplete ? 'text-work-warn-copy' : 'text-work-success-copy'}`} /><h3 className="font-bold text-work-title text-base">{incomplete ? '내용을 읽지 못한 부분이 있어요' : '검사한 범위에서 의심 항목을 찾지 못했어요'}</h3><p className="text-sm text-work-muted leading-relaxed mt-2">{incomplete ? '위 안내를 확인하고 다시 시도해 주세요.' : '로그인 권한 등 직접 확인해야 할 부분은 남아 있어요.'}</p></div>}
      {!!issues.length && !filtered.length && <p className="rounded-xl p-8 text-center bg-work-panel border border-work-line text-sm text-work-muted">이 분류에 해당하는 항목은 없어요.</p>}
    </section>
    </details>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2"><button className="text-sm text-work-muted flex items-center justify-center gap-2 border border-work-line bg-work-panel rounded-xl px-4 py-3" onClick={onResetNewScan}><RotateCcw className="w-4 h-4" />새 검사 시작</button><button className="text-sm text-white font-semibold flex items-center justify-center gap-2 bg-work-accent hover:bg-work-accent-strong rounded-xl px-5 py-3.5" onClick={onStartRescanInput}>다시 검사하기<ArrowRight className="w-4 h-4" /></button></div>
    {scanMetadata && <details className="repair-technical"><summary>담당자용 배포 전 확인표 · 보고서</summary><LaunchReview result={scanMetadata} name={systemName || '내 프로젝트'} /></details>}
    <details className="border-t border-work-line pt-5 group"><summary className="list-none flex justify-between gap-2 items-center cursor-pointer text-xs font-semibold text-work-muted">검사로 알 수 없는 부분도 있어요<ChevronDown className="w-4 h-4 group-open:rotate-180" /></summary><ul className="mt-3 space-y-2 text-xs text-work-muted">{manualReviewForInput(inputData).map(item => <li key={item}>· {item}</li>)}</ul></details>
    <details className="text-xs text-work-faint"><summary className="cursor-pointer">자세한 검사 기록</summary><div className="mt-3 space-y-2 leading-relaxed"><p>{scanMode === 'url' ? scanMetadata?.scope : `${scannedStats?.files || 0}개 파일, ${scannedStats?.lines || 0}줄을 검사했어요.`}</p>{scanMetadata?.finalUrl && <p className="break-all">최종 주소: {scanMetadata.finalUrl}</p>}{scanMetadata?.checks?.map((check, index) => <p key={index}>{check.status === 'completed' ? '확인' : '미확인'} · {check.ruleId} · {check.detail}</p>)}</div></details>
  </div>;
};
