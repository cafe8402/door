import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardCheck, Users, MessageSquare, Play, LockKeyhole, UserRound, FileText, Sparkles, Copy, Check, RotateCcw, LoaderCircle, ShieldCheck } from 'lucide-react';
import { initialScanInput } from '../data/defaultData';
import { scanTarget, compareUrlScanResults } from '../services/scanClient';
import type { ScanResultPayload } from '../services/localSecurityScanner';
import { experienceStories, repairPrompt } from '../services/launchReview';
import { reportHtml, downloadText } from '../services/report';
import { LaunchReview } from './LaunchReview';
import { ApiCheckSummary } from './ApiCheckSummary';
import { ExposureScene } from './ExposureScene';

const steps = ['상황 고르기', '문제 살펴보기', '수정 요청 준비', '변화 확인'] as const;
export const ScreenExperience: React.FC<{ onHome: () => void; onRealScan: () => void }> = ({ onHome, onRealScan }) => {
  const [storyId, setStoryId] = useState('approval');
  const [step, setStep] = useState(0);
  const [before, setBefore] = useState<ScanResultPayload>();
  const [after, setAfter] = useState<ScanResultPayload>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [caseId, setCaseId] = useState('a-to-b');
  const [view, setView] = useState<'before' | 'after'>('before');
  const [prompt, setPrompt] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const story = experienceStories.find(item => item.id === storyId)!;
  const entries = before && after ? compareUrlScanResults(before.issues, after) : undefined;
  const current = view === 'after' ? after : before;
  const selected = current?.apiChecks?.find(check => check.id === caseId);
  const options = [
    { id: 'a-to-b', actor: '사용자 A', resource: story.resource, title: '타인 자료', field: story.field, value: story.value },
    { id: 'user-to-admin', actor: '사용자 A', resource: '관리자 전용 현황', title: '관리자 자료', field: '내부 자료', value: '운영 현황 · 관리자 전용' },
    { id: 'anonymous-to-a', actor: '로그인 안 함', resource: 'A의 비공개 자료', title: '미로그인 접근', field: '개인 자료', value: '계정 A에게만 허용된 내용' },
  ];
  const changeStep = (next: number) => { setStep(next); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => () => controller.current?.abort(), []);
  const run = async (version: 'vulnerable' | 'fixed') => {
    if (pending.current || !consent) return;
    pending.current = true;
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    setBusy(true); setError('');
    try {
      const result = await scanTarget({ ...initialScanInput, inputTab: 'api_demo', apiDemoVersion: version, authConfirmed: true }, active.signal);
      if (active.signal.aborted) return;
      if (version === 'vulnerable') { setBefore(result); setPrompt(repairPrompt(result, story.name)); setView('before'); changeStep(1); }
      else { setAfter(result); setView('after'); changeStep(3); }
    } catch (err) { if (!active.signal.aborted) setError(err instanceof Error ? err.message : '검사를 완료하지 못했어요. 다시 시도해 주세요.'); }
    finally { if (!active.signal.aborted) setBusy(false); pending.current = false; }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setMessage('복사했어요. 사용하는 AI 코딩 도구에 붙여 넣어 주세요.'); } catch { setMessage('복사하지 못했어요. 아래 요청문을 직접 선택해 복사해 주세요.'); } };
  const restart = () => { controller.current?.abort(); setBefore(undefined); setAfter(undefined); setView('before'); setBusy(false); setError(''); setConsent(false); setCaseId('a-to-b'); changeStep(0); };
  return <div className={`max-w-5xl mx-auto px-5 sm:px-8 ${step === 1 || step === 3 ? 'py-5 space-y-4' : 'py-8 sm:py-10 space-y-6'}`}>
    {(step === 0 || step === 2) && <div className="flex justify-between items-center"><button onClick={onHome} className="text-sm text-work-muted inline-flex gap-2 items-center"><ArrowLeft className="w-4 h-4" />홈으로</button><span className="text-[11px] font-bold text-work-accent-copy bg-work-tint px-3 py-1.5 rounded-full">가상 서비스로 체험 · 약 1분</span></div>}
    {(step === 0 || step === 2) && <nav aria-label="체험 진행 단계" className="grid grid-cols-4 gap-2">{steps.map((title, index) => <div key={title} aria-current={step === index ? 'step' : undefined} className={`border-t-2 pt-3 ${step === index ? 'border-work-accent-line' : step > index ? 'border-work-success-line' : 'border-work-line'}`}><span className={`text-[10px] font-bold ${step === index ? 'text-work-accent-copy' : 'text-work-faint'}`}>0{index + 1}</span><p className={`text-[11px] sm:text-sm font-semibold mt-1 ${step === index ? 'text-work-title' : 'text-work-faint'}`}>{title}</p></div>)}</nav>}
    {step === 0 && <>
      <header className="pt-3"><span className="text-xs font-bold text-work-accent-copy">내가 만든 서비스라고 생각해 보세요</span><h1 className="text-2xl sm:text-4xl font-bold text-work-title mt-3 leading-snug">AI로 만들었어요.<br />이대로 공개해도 될까요?</h1><p className="text-sm text-work-muted leading-relaxed mt-4">다른 사람의 자료가 보이는 순간부터, 접근이 막히는 순간까지.<br />파일이나 계정 없이 보안 점검의 흐름을 경험해 보세요.</p></header>
      <div className="grid sm:grid-cols-3 gap-3">{experienceStories.map((item, index) => { const Icon = [ClipboardCheck, Users, MessageSquare][index]; return <button key={item.id} aria-pressed={storyId === item.id} onClick={() => setStoryId(item.id)} className={`text-left p-5 rounded-2xl border-2 transition-colors ${storyId === item.id ? 'bg-work-tint/70 border-work-accent-line' : 'border-work-line bg-work-panel hover:border-work-accent-line'}`}><div className="flex items-center justify-between"><span className="p-3 bg-work-panel text-work-accent-copy rounded-xl"><Icon className="w-6 h-6" /></span>{storyId === item.id && <Check className="w-5 h-5 text-work-accent-copy" />}</div><h2 className="font-bold text-work-title mt-5">{item.name}</h2><p className="text-xs text-work-muted leading-relaxed mt-2">{item.description}</p></button>; })}</div>
      <div className="bg-work-panel border border-work-line rounded-2xl p-5"><h2 className="font-bold text-sm text-work-title">이렇게 체험해요</h2><div className="grid sm:grid-cols-3 gap-4 mt-4">{['계정을 바꿔 자료 조회', 'AI 수정 요청문 준비', '수정 후 예제로 재검사'].map((text, index) => <p key={text} className="text-xs text-work-copy flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-work-soft inline-flex items-center justify-center font-bold">{index + 1}</span>{text}</p>)}</div></div>
      <p className="text-xs text-work-muted leading-relaxed">세 상황은 같은 가상 문서 API를 이해하기 위한 이야기예요. 화면의 기안·고객·대화 내용은 설명용 가상 자료이며, 판정은 서버의 실제 조회 응답을 사용해요.</p>
      <label className="flex gap-3 items-start text-sm text-work-copy"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 w-4 h-4 accent-work-accent" />가상 API에 최대 7회씩 조회하는 실습임을 확인했어요.</label>
      <button disabled={!consent || busy} onClick={() => void run('vulnerable')} className="w-full rounded-xl bg-work-accent text-white font-bold py-4 inline-flex items-center justify-center gap-2 disabled:bg-work-disabled disabled:text-work-faint">{busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{busy ? '테스트 계정으로 확인 중이에요' : '1분 보안 체험 시작'}</button>
    </>}
    {(step === 1 || step === 3) && before && <>
<p className="text-xs font-semibold text-work-muted">{story.name} · {step === 1 ? '수정 전 가상 예제' : '수정 전·후 가상 예제 비교'}</p>
      <div className="space-y-3">
        <div className="p-4 sm:px-6 bg-work-layer border-b border-work-line flex flex-wrap gap-2 items-center justify-between"><div className="flex flex-wrap gap-1.5" role="group" aria-label="체험할 접근 유형">{options.map(item => <button key={item.id} aria-pressed={caseId === item.id} onClick={() => setCaseId(item.id)} className={`text-xs font-semibold rounded-lg px-3 py-2 ${caseId === item.id ? 'bg-work-choice text-white' : 'text-work-muted bg-work-panel border border-work-line'}`}>{item.title}</button>)}</div>{after && <div role="group" aria-label="비교할 버전" className="inline-flex rounded-lg bg-work-disabled p-1"><button onClick={() => setView('before')} aria-pressed={view === 'before'} className={`px-3 py-1.5 rounded-md text-xs font-bold ${view === 'before' ? 'bg-work-panel text-work-danger-copy' : 'text-work-muted'}`}>수정 전</button><button onClick={() => setView('after')} aria-pressed={view === 'after'} className={`px-3 py-1.5 rounded-md text-xs font-bold ${view === 'after' ? 'bg-work-panel text-work-success-copy' : 'text-work-muted'}`}>수정 후</button></div>}</div>
        <ExposureScene story={story} caseId={caseId} check={selected} />
      </div>
      {step === 1 && <div className="rounded-2xl bg-work-banner text-white p-6 flex flex-col sm:flex-row sm:items-center gap-5"><div className="flex-1"><h2 className="font-bold">화면에서 버튼을 숨기면 해결될까요?</h2><p className="text-sm text-work-copy mt-2 leading-relaxed">주소나 요청을 직접 바꿀 수도 있어요.<br />서버가 로그인·자료 소유자·관리자 권한을 확인해야 해요.</p></div><button onClick={() => changeStep(2)} className="rounded-xl bg-work-panel text-work-accent-copy font-bold text-sm px-5 py-3 inline-flex items-center gap-2 justify-center">AI 수정 요청 준비<ArrowRight className="w-4 h-4" /></button></div>}
      {step === 3 && after && <>
        <div className="grid grid-cols-3 gap-3">{[{ label: '수정 전 발견', count: before.issues.length }, { label: '재검사 미검출', count: entries?.filter(entry => entry.status === 'resolved').length || 0 }, { label: '이번 발견', count: after.issues.length }].map(item => <div key={item.label} className="bg-work-panel border border-work-line rounded-xl p-4"><p className="text-[11px] text-work-muted">{item.label}</p><strong className="block text-3xl text-work-title mt-2">{item.count}<span className="text-xs text-work-faint ml-1">건</span></strong></div>)}</div>
        <LaunchReview name={`${story.name} · 가상 체험`} result={after} entries={entries} />
        <div className="rounded-2xl bg-work-banner p-6 text-white"><ShieldCheck className="w-7 h-7 text-work-accent-copy" /><h2 className="text-lg font-bold mt-4">이제 내 서비스도 확인해 볼까요?</h2><p className="text-sm text-work-copy mt-2 leading-relaxed">체험에서는 가상 API의 권한을 살펴봤어요.<br />내 자료 검사는 코드의 비밀키·위험한 설정부터 시작할 수 있어요.</p><div className="flex flex-wrap gap-3 mt-5"><button onClick={onRealScan} className="text-sm font-bold text-work-accent-copy bg-work-panel rounded-xl px-5 py-3">내 코드 검사하기</button><button onClick={() => downloadText(reportHtml({ systemName: `${story.name} · 가상 체험`, issues: after.issues, scannedAt: after.scannedAt, scannedStats: { files: after.scannedFilesCount, lines: 0 }, scanMetadata: after }), 'mundansok-experience-report.html', 'text/html')} className="text-sm font-semibold rounded-xl px-4 py-3 border border-white/30">자세한 보고서 저장</button></div></div>
        <div className="flex flex-wrap gap-4"><button onClick={() => changeStep(2)} className="text-sm text-work-accent-copy">수정 요청문 다시 보기</button><button onClick={restart} className="inline-flex items-center gap-1.5 text-sm text-work-muted"><RotateCcw className="w-3.5 h-3.5" />다른 이야기로 체험</button></div>
      </>}
      <details className="rounded-2xl border border-work-line p-4 bg-work-panel"><summary className="cursor-pointer text-xs font-semibold text-work-muted">실제 요청별 검사 기록</summary><div className="mt-4"><ApiCheckSummary result={current || before} /></div></details>
    </>}
    {step === 2 && before && <>
      <header><span className="text-xs font-bold text-work-accent-copy">발견 → 수정 요청 → 재검사</span><h1 className="text-2xl sm:text-3xl font-bold text-work-title mt-3">어떻게 고칠지, AI에게 정확히 알려주세요.</h1><p className="text-sm text-work-muted mt-3 leading-relaxed">찾은 문제와 수정 후 지켜야 할 조건을 요청문에 담았어요.<br />체험에서는 코드를 자동 수정하지 않고, 준비된 수정 후 예제로 변화를 확인해요.</p></header>
      <div className="grid sm:grid-cols-3 gap-3">{[{ Icon: UserRound, title: '정상 조회는 유지', desc: '내 자료는 계속 볼 수 있어야 해요.' }, { Icon: LockKeyhole, title: '서버에서 권한 확인', desc: '타인·관리자 자료는 거절해요.' }, { Icon: FileText, title: '응답에 자료가 없는지', desc: '거절 코드만으로 끝내지 않아요.' }].map(({ Icon, title, desc }) => <div key={title} className="bg-work-panel rounded-xl p-5 border border-work-line"><Icon className="text-work-accent-copy w-5 h-5" /><h2 className="font-bold text-sm mt-4">{title}</h2><p className="text-xs text-work-muted mt-2">{desc}</p></div>)}</div>
      <section className="bg-work-panel border border-work-accent-line rounded-2xl p-5 sm:p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><h2 className="text-base font-bold inline-flex items-center gap-2"><Sparkles className="w-5 h-5 text-work-accent-copy" />AI에게 전달할 수정 요청</h2><button onClick={() => void copy()} className="inline-flex justify-center items-center gap-2 text-sm font-bold bg-work-accent text-white px-4 py-3 rounded-xl"><Copy className="w-4 h-4" />요청문 복사</button></div><p className="text-xs text-work-muted mt-3">실제 프로젝트에 사용하기 전에 경로와 권한 정책을 확인하세요. 아래 내용은 편집할 수 있어요.</p><textarea aria-label="체험 AI 수정 요청문" value={prompt} onChange={event => setPrompt(event.target.value)} rows={12} className="w-full mt-4 p-4 rounded-xl bg-work-layer border border-work-line text-xs font-mono leading-relaxed resize-y" />{message && <p role="status" className="text-sm text-work-accent-copy mt-3">{message}</p>}</section>
      <div className="rounded-xl bg-work-warn-bg border border-work-warn-line p-4 text-xs text-work-warn-copy leading-relaxed">다음 버튼은 내 코드를 고치거나 배포하지 않아요. 같은 가상 자료와 계정으로 수정 후 예제에 최대 7회의 조회 요청을 보내요.</div>
      <div className="flex flex-col sm:flex-row gap-3"><button disabled={busy} onClick={() => changeStep(1)} className="text-sm font-semibold text-work-muted rounded-xl border border-work-line px-5 py-3">문제 장면으로</button><button disabled={busy} onClick={() => void run('fixed')} className="flex-1 text-sm font-bold text-white bg-work-accent disabled:bg-work-disabled rounded-xl px-5 py-4 inline-flex justify-center items-center gap-2">{busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}{busy ? '같은 요청으로 다시 확인 중이에요' : '수정 후 예제로 다시 확인'}</button></div>
    </>}
    {error && <p role="alert" className="text-sm text-work-danger-copy bg-work-danger-bg p-4 rounded-xl">{error} 다시 버튼을 눌러 시도할 수 있어요.</p>}
    <p className="text-[11px] text-work-faint leading-relaxed">실제 서비스·계정은 검사하지 않는 가상 체험이에요. 결과는 이 화면에만 있으며 새로고침하면 사라져요.</p>
  </div>;
};
