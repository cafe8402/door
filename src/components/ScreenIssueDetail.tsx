import { resultActions, actionPrompt } from '../services/resultActions';
import { EasyExplanation } from './EasyExplanation';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react';
import type { SecurityIssue } from '../types/security';
import { issueTitle, issueLocation, issueExplanation } from '../services/presentation';
import { beginnerRepairPrompt } from '../services/repairGuide';
import { maskSecret } from '../services/localSecurityScanner';
interface Props { scanMode?: 'real_file' | 'url' | 'api_demo'; issue: SecurityIssue; systemName: string; onBackToResults: () => void; onGoToRescan: () => void; }
export const ScreenIssueDetail: React.FC<Props> = ({ issue, scanMode, systemName, onBackToResults, onGoToRescan }) => {
  const action = resultActions([issue], scanMode)[0];
  const [prompt, setPrompt] = useState(() => actionPrompt(resultActions([issue], scanMode)[0], systemName));
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setPrompt(actionPrompt(resultActions([issue], scanMode)[0], systemName)); setCopied(false); setMessage(''); }, [issue, systemName, scanMode]);
  const copy = async () => {
    try { const safe = maskSecret(prompt); setPrompt(safe); await navigator.clipboard.writeText(safe); setCopied(true); setMessage('복사했어요. 이 서비스를 만들 때 쓴 AI의 프로젝트 대화창에 붙여 넣으세요.'); }
    catch { setMessage('자동 복사가 안 됐어요. 아래 문구를 선택해서 직접 복사해 주세요.'); }
  };
  if (action.decision !== 'fix') return <div className="repair-walkthrough max-w-3xl mx-auto px-5 py-8 space-y-6"><button onClick={onBackToResults} className="repair-action"><ArrowLeft size={18}/>결과로 돌아가기</button><section className="repair-step"><p className="repair-step-number">{action.example ? '예제·테스트 기록' : '추가 확인 필요 · 수정 지시 아님'}</p><h1 className="text-2xl font-semibold">아직 고칠 문제로 확인되지 않았어요</h1><p>{action.title}</p><p>{action.fact}</p><p>담당자가 실제 사용 코드인지, 설명이나 예시인지 먼저 확인해야 해요. 이 단서만으로 값을 지우거나 기능을 바꾸지 마세요.</p><details><summary>담당자용 근거 보기</summary><p className="break-all">{issueLocation(issue)}</p><pre>{maskSecret(issue.codeSnippet)}</pre><p>{issue.ruleId}</p></details></section></div>;
  return <div className="repair-walkthrough max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-6">
    <button onClick={onBackToResults} className="flex items-center gap-2 text-work-muted"><ArrowLeft size={18} />전체 결과로 돌아가기</button>
    <header><p className="text-work-accent-copy mb-3">한 번에 하나씩, 이 순서대로 해보세요</p><h1 className="text-2xl sm:text-3xl font-semibold text-work-title">확인하고 고치는 3단계</h1><p className="mt-3 text-work-copy">코드를 몰라도 괜찮아요. 아래 설명을 읽고, 준비된 문구를 AI에 전달하세요.</p></header>
    {!issue.sourceAssessment && <EasyExplanation key={issue.id} issue={issue} />}
    <section className="repair-step"><p className="repair-step-number">1단계 · 무슨 문제인지 읽기</p><h2>{action.title}</h2><p><b>확인된 사실</b><br/>{action.fact}</p><div className="action-change"><h3>무엇을 바꾸면 되나요?</h3><p>{action.change}</p></div><details><summary>발견한 위치와 코드 보기 · 몰라도 다음 단계로 갈 수 있어요</summary><p className="break-all">{issueLocation(issue)}</p><pre>{maskSecret(issue.codeSnippet)}</pre><p className="repair-note">알려진 비밀값은 가렸어요. 모든 개인정보를 자동으로 가릴 수 있는 것은 아니에요.</p></details></section>
    <section className="repair-step repair-step-primary"><p className="repair-step-number">2단계 · AI에게 수정 부탁하기</p><h2>아래 문구를 복사해서 붙여 넣으세요</h2><ol className="repair-instructions"><li><b>‘수정 부탁 문구 복사’</b> 버튼을 누르세요.</li><li><b>이 서비스를 만들 때 쓴 AI</b>에서 같은 프로젝트를 여세요.</li><li>대화창에 붙여 넣고 보내세요. AI가 파일을 볼 수 없다면 필요한 파일과 찾는 방법을 물어보세요.</li></ol><p className="repair-note">이 버튼은 문구만 복사해요. AI에 자동 전송하거나 코드를 자동 수정하지 않아요. 회사에서 허용한 AI를 사용하고, 보내기 전 회사 자료·개인정보가 없는지 확인하세요.</p><label className="block font-semibold mt-5" htmlFor="repair-prompt">AI에 보낼 문구 · 필요한 부분은 바꿔도 돼요</label><textarea id="repair-prompt" aria-label="AI에 보낼 수정 부탁 문구" rows={9} value={prompt} onChange={event => { setPrompt(event.target.value); setCopied(false); }} className="w-full mt-3 p-4 rounded-xl border border-work-accent-line bg-work-panel text-work-copy leading-relaxed resize-y" /><button onClick={() => void copy()} className="repair-action">{copied ? <Check size={19} /> : <Copy size={19} />}{copied ? '복사했어요 · AI에 붙여 넣으세요' : '수정 부탁 문구 복사'}</button>{message && <p role="status" className="text-work-accent-copy">{message}</p>}<details><summary>AI를 쓰지 않거나 직접 고치고 싶다면</summary><p>이 문구와 검사 결과를 개발 담당자에게 전달하세요. 비밀키나 개인정보 원문은 보내지 마세요.</p><ol className="repair-instructions">{issue.resolutionSteps.map(step => <li key={step.step}><b>{step.title}</b><p>{step.desc}</p></li>)}</ol></details></section>
    <section className="repair-step"><p className="repair-step-number">3단계 · 고친 것을 다시 확인하기</p><h2>AI가 고쳤다고 하면, 직접 확인하세요</h2><ol className="repair-instructions"><li>수정한 서비스에서 평소 쓰던 버튼과 기능이 잘 되는지 확인하세요.</li><li>파일 검사였다면 <b>수정한 파일을 같은 이름·폴더 구조로</b> 다시 선택하세요. 주소 검사였다면 변경을 사이트에 반영한 뒤 같은 사이트를 검사하세요.</li><li>다시 발견한 항목과 확인하지 못한 항목이 있는지 읽어보세요.</li></ol><p className="repair-note">‘다시 발견되지 않음’은 검사한 범위에서 같은 단서가 안 보인다는 뜻이에요. 서비스 전체가 안전하다는 보증은 아니에요.</p><button onClick={onGoToRescan} className="repair-action">수정한 파일·주소로 다시 검사<ArrowRight size={18} /></button></section>
    <details className="repair-technical"><summary>개발 담당자용 상세 정보</summary><p>{issue.title} · {issue.cwe} · {issue.ruleId}</p><pre>{maskSecret(issue.detailedAuditLog)}</pre></details>
  </div>;
};
