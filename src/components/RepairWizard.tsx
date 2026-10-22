import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Copy, AlertCircle } from 'lucide-react';
import type { resultActions } from '../services/resultActions';
import { actionPrompt, actionExplanation } from '../services/resultActions';
import { issueLocation } from '../services/presentation';
import { FindingCode } from './FindingCode';

type Action = ReturnType<typeof resultActions>[number];
export function RepairWizard({ actions, systemName, onRescan }: { actions: Action[]; systemName: string; onRescan: () => void }) {
  const reviewOnly = actions.every(action => action.decision !== 'fix');
  const [step, setStep] = useState(0);
  const [locationIndex, setLocationIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState('');
  const count = actions.reduce((sum, action) => sum + action.issues.length, 0);
  const prompt = actions.map((action, index) => `요청 ${index + 1}/${actions.length}\n${actionPrompt(action, systemName)}`).join('\n\n');
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setManual(false); setMessage('복사했어요. 서비스를 만든 AI 대화창에 붙여 넣으세요.'); }
    catch { setManual(true); setMessage('아래 문구를 직접 선택해서 복사해 주세요.'); }
  }
  return <section className="repair-wizard" aria-label={reviewOnly ? "단계별 확인 안내" : "단계별 수정 안내"}>
    <p className="wizard-warning"><AlertCircle size={22}/><strong>{reviewOnly ? "확인 필요" : "수정 필요"} · {count}곳</strong></p>
    <ol className="wizard-steps" aria-label={reviewOnly ? "확인 진행 단계" : "수정 진행 단계"}>{(reviewOnly ? ['내용 보기', 'AI에게 확인 부탁', '답변 후 할 일'] : ['문제 확인', 'AI에게 수정 부탁', '다시 검사']).map((label,index)=><li key={label} aria-current={step === index ? 'step' : undefined} className={step===index?'active':''}><span>{index+1}</span>{label}</li>)}</ol>
    <div className="wizard-content" key={step}>
      {step === 0 && <>
        <h2>{reviewOnly ? "이 내용이 실제 문제인지 확인하세요" : `고쳐야 할 곳이 ${count}곳 있어요`}</h2>
        <ul className="wizard-findings">{actions.map(action=>{const explanation = actionExplanation(action); return <li key={action.key}>
          {explanation ? <div className="wizard-risk">
            <span className="wizard-field-label">왜 고쳐야 하나요?</span>
            <strong>{explanation.harm}</strong>
            <p>{explanation.why}</p>
          </div> : <><span className="wizard-field-label">확인할 내용</span><strong>{action.title}</strong></>}
          <div className="wizard-location">
            <span className="wizard-field-label">{reviewOnly ? "확인할 위치" : "여기를 고쳐주세요"}</span>
            <div className="finding-pagination"><span>위치 {locationIndex + 1} / {action.issues.length}</span><div><button aria-label="이전 위치" disabled={locationIndex === 0} onClick={()=>setLocationIndex(i=>i-1)}><ArrowLeft size={17}/></button><button aria-label="다음 위치" disabled={locationIndex >= action.issues.length-1} onClick={()=>setLocationIndex(i=>i+1)}><ArrowRight size={17}/></button></div></div>
            <strong>{issueLocation(action.issues[Math.min(locationIndex, action.issues.length-1)])}</strong>
            <FindingCode issue={action.issues[Math.min(locationIndex, action.issues.length-1)]} />
            {action.issues.length > 1 && <p className="wizard-scope">요청문에는 이 종류의 모든 위치가 포함돼요.</p>}
          </div>
          {!reviewOnly && <div className="wizard-change"><span className="wizard-field-label">어떻게 고치나요?</span><p>{action.kind === 'sql' ? '입력한 글을 조회 명령과 분리해서 전달하도록 바꾸세요. 기존 검색 기능과 접근 권한은 유지해야 해요.' : action.change}</p></div>}
          {explanation && <p className="wizard-scope">{explanation.scope}</p>}
        </li>})}</ul>
        <p>{reviewOnly ? "직접 코드를 판단할 필요 없어요. 확인할 위치를 담은 질문을 준비했어요." : "아래 문구를 복사해서, 이 서비스를 만든 AI에게 붙여 넣으세요."}</p>
        <button className="repair-action" onClick={()=>{void copy();setStep(1);}}><Copy size={20}/>{reviewOnly ? "확인 질문 복사" : "수정 요청문 복사"}</button>
        <p className="wizard-flow">① 문구 복사 → ② 개발에 쓴 AI에 붙여넣기 → ③ {reviewOnly ? "답변 확인" : "고친 파일 다시 검사"}</p>
      </>}
      {step === 1 && <><h2>이 문구를 AI에게 보내세요</h2><p>{reviewOnly ? "이 서비스를 만든 AI에게 붙여 넣으세요. 실제 문제인지, 왜 그런지 먼저 물어봅니다." : "이 서비스를 만든 AI 대화창에 붙여 넣고 수정을 요청하세요."}</p><button className="repair-action" onClick={()=>void copy()}><Copy size={20}/>{reviewOnly ? (copied ? '확인 질문 다시 복사' : '확인 질문 복사') : (copied ? '수정 요청문 다시 복사' : '수정 요청문 복사')}</button><p role="status" className="wizard-status">{message}</p>{manual && <><textarea aria-label="직접 복사할 수정 요청문" readOnly value={prompt} rows={7}/><button className="wizard-secondary" onClick={()=>{setCopied(true);setManual(false);setMessage('AI 대화창에 붙여 넣으세요.');}}>직접 복사했어요</button></>}{copied && <div className="wizard-next"><p>{reviewOnly ? "AI의 답변을 읽은 뒤 다음으로 넘어가세요." : "AI의 수정이 끝나면 다음으로 넘어가세요."}</p><button className="repair-action" onClick={()=>setStep(2)}>{reviewOnly ? "답변을 받았어요 · 다음" : "AI에서 수정했어요 · 다음"}<ArrowRight size={20}/></button></div>}<details><summary>보낼 문구와 주의사항 보기</summary><p>회사에서 허용한 AI를 사용하세요. 이 앱은 문구만 복사하며 파일을 자동으로 수정하거나 전송하지 않아요.</p><pre>{prompt}</pre></details></>}
      {step === 2 && reviewOnly && <><h2>AI가 뭐라고 답했나요?</h2><ul className="wizard-findings"><li><strong>문제가 있다고 해요</strong><p>AI에게 수정을 부탁한 뒤, 고친 자료로 다시 검사하세요.</p></li><li><strong>예제이거나 문제없다고 해요</strong><p>이유를 확인하세요. 이 앱의 결과가 자동으로 안전 판정으로 바뀌지는 않아요.</p></li><li><strong>판단하기 어렵다고 해요</strong><p>확인 질문과 AI 답변을 개발 담당자에게 전달하세요.</p></li></ul><button className="repair-action" onClick={onRescan}>자료를 고쳤다면 · 다시 검사<ArrowRight size={20}/></button></>}
      {step === 2 && !reviewOnly && <><h2>고친 자료로 다시 검사하세요</h2><p>파일 검사라면 <strong>수정한 파일·폴더</strong>를 선택하세요.<br/>주소 검사라면 수정 사항을 사이트에 반영한 뒤 검사하세요.</p><button className="repair-action" onClick={onRescan}>고친 자료 다시 검사<ArrowRight size={20}/></button><p className="wizard-status">아직 해결 완료가 아니에요. 다시 검사해서 확인합니다.</p></>}
      {step > 0 && <button className="wizard-back" onClick={()=>setStep(step-1)}><ArrowLeft size={18}/>이전 단계</button>}
    </div>
    <details className="wizard-evidence"><summary>{reviewOnly ? "발견 위치와 자세한 근거" : "왜 고쳐야 하나요? · 자세한 근거"}</summary>{actions.map(action=><div key={action.key}><h3>{action.title}</h3><p>{action.fact}</p><p>{action.change}</p>{action.issues.map(issue=><p key={issue.id}>{issueLocation(issue)}</p>)}</div>)}</details>
  </section>;
}
