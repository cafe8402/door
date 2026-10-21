import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Globe2, FolderCode, KeyRound, Fingerprint, TerminalSquare, Bot, LockKeyhole, ShieldCheck, PanelTop, Cookie, FileSearch, Check, ArrowRight, Sparkles, ClipboardCheck, Wrench, FileDown, Copy, Download, FileText, ChevronDown, CircleHelp, AlertTriangle, Info, CheckCircle2, Code2, Printer } from 'lucide-react';
import { ApiCheckSummary } from './ApiCheckSummary';
import { buildReport, downloadText, reportHtml, reportMarkdown } from '../services/report';
import type { ReportData } from '../services/report';
import { issueTitle, issueLocation, severityLabel, severityStyle, simpleWarning, manualReviewForInput, orderIssues } from '../services/presentation';

interface ModalProps { isOpen: boolean; onClose: () => void; }
const Modal: React.FC<ModalProps & { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; wide?: boolean }> = ({ isOpen, onClose, title, subtitle, icon, children, wide }) => {
  const panel = useRef<HTMLDivElement>(null), close = useRef(onClose); close.current = onClose;
  const id = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, textarea, summary, [tabindex="0"]') || []).filter(element => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`report-panel bg-work-panel rounded-3xl w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90dvh] overflow-auto shadow-2xl outline-none`}>
      <header className="modal-heading sticky top-0 z-10 bg-work-panel/95 backdrop-blur-md border-b border-work-line-soft px-5 py-5 sm:px-7 flex items-start gap-3"><span className="bg-work-tint text-work-accent-copy p-2.5 rounded-xl shrink-0">{icon}</span><div className="flex-1"><h2 id={id} className="font-bold text-lg sm:text-xl text-work-title">{title}</h2><p className="text-xs text-work-muted mt-1">{subtitle}</p></div><button className="no-print text-work-faint hover:text-work-copy p-1 rounded-lg hover:bg-work-soft" aria-label="닫기" onClick={onClose}><X className="w-5 h-5" /></button></header>
      <div className="p-5 sm:p-7 space-y-6">{children}</div>
    </div>
  </div>;
};
const MethodSwitch: React.FC<{ mode: 'url' | 'upload'; onChange: (mode: 'url' | 'upload') => void }> = ({ mode, onChange }) => <div className="grid grid-cols-2 rounded-xl bg-work-soft p-1" role="group" aria-label="안내할 검사 방법">{([{ id: 'url' as const, text: '웹사이트 주소', Icon: Globe2 }, { id: 'upload' as const, text: '코드 파일', Icon: FolderCode }]).map(({ id, text, Icon }) => <button key={id} aria-pressed={mode === id} onClick={() => onChange(id)} className={`flex gap-2 justify-center items-center rounded-lg py-2.5 text-sm font-semibold ${mode === id ? 'bg-work-panel text-work-accent-copy shadow-sm' : 'text-work-muted'}`}><Icon className="w-4 h-4" />{text}</button>)}</div>;

export const WhatWeCheckModal: React.FC<ModalProps> = props => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const cards = mode === 'url' ? [
    { Icon: LockKeyhole, title: '안전하게 연결되나요?', desc: '사이트 주소의 보안 연결과 인증서를 확인해요.', example: '예: HTTPS가 꺼져 있거나 인증서가 만료된 경우', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: PanelTop, title: '화면 보호가 설정됐나요?', desc: '다른 사이트의 화면 퍼가기 등을 막는 설정을 봐요.', example: '예: 웹페이지 보호 설정이 빠진 경우', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: Cookie, title: '저장 정보를 보호하나요?', desc: '웹사이트가 저장하는 정보의 보호 설정을 확인해요.', example: '예: 로그인 쿠키의 보호 옵션이 없는 경우', color: 'bg-work-warn-bg text-work-warn-copy' },
    { Icon: FileSearch, title: '비밀 정보가 보이나요?', desc: '공개된 화면과 연결된 코드에서 비밀키를 찾아요.', example: '예: 누구나 읽을 수 있는 코드에 AI 접속 키가 포함된 경우', color: 'bg-work-danger-bg text-work-danger-copy' },
  ] : [
    { Icon: FileSearch, title: '입력값이 SQL을 바꾸나요?', desc: '문자열 결합 SQL과 위험한 원시 쿼리를 찾아요.', example: '예: SELECT 문에 입력값을 직접 붙이는 코드', color: 'bg-work-danger-bg text-work-danger-copy' },
    { Icon: LockKeyhole, title: '자료 접근 제한이 열려 있나요?', desc: 'RLS 끄기·모든 행 허용 정책을 찾아요.', example: 'DB의 현재 설정은 별도로 확인해야 해요.', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: Globe2, title: '공개 변수에 비밀값이 있나요?', desc: 'NEXT_PUBLIC_·VITE_ 비밀값 사용을 확인해요.', example: '공개용 Supabase·Stripe 키는 비밀키와 구분해요.', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: KeyRound, title: '비밀키가 들어 있나요?', desc: 'AI와 클라우드 서비스의 접속 키를 찾아요.', example: '예: 코드에 직접 적어 둔 OpenAI 키', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: Fingerprint, title: '개인정보가 보이나요?', desc: '주민번호 형식의 값이 남아 있는지 확인해요.', example: '예: 테스트 자료에 마스킹 없이 적힌 주민번호', color: 'bg-work-danger-bg text-work-danger-copy' },
    { Icon: TerminalSquare, title: '위험한 실행 코드가 있나요?', desc: '코드나 컴퓨터 명령을 실행하는 부분을 찾아요.', example: '예: 입력된 글자를 그대로 실행하는 기능', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: Bot, title: 'AI의 권한이 너무 넓나요?', desc: '작업 전 확인을 건너뛰는 설정 등을 살펴봐요.', example: '예: AI가 확인 없이 작업하도록 하는 옵션', color: 'bg-work-warn-bg text-work-warn-copy' },
  ];
  return <Modal {...props} title="무엇을 검사하나요?" subtitle="내 서비스에서 놓치기 쉬운 부분을 먼저 살펴봐요." icon={<FileSearch className="w-5 h-5" />}>
    <MethodSwitch mode={mode} onChange={setMode} />
    <div className="grid sm:grid-cols-2 gap-3">{cards.map(({ Icon, title, desc, example, color }) => <article key={title} className="border border-work-line rounded-2xl p-5"><span className={`inline-flex rounded-xl p-2.5 mb-4 ${color}`}><Icon className="w-5 h-5" /></span><h3 className="font-bold text-sm text-work-title">{title}</h3><p className="text-xs text-work-muted leading-relaxed mt-2">{desc}</p><p className="mt-3 p-2.5 bg-work-layer rounded-lg text-[11px] text-work-muted leading-relaxed">{example}</p></article>)}</div>
    <div className="flex gap-3 rounded-xl bg-work-tint px-4 py-3"><CheckCircle2 className="w-4 h-4 shrink-0 text-work-accent-copy mt-0.5" /><p className="text-xs text-work-accent-copy leading-relaxed">결과마다 발견한 위치와 고치는 방법을 알려드려요. AI에게 전달할 수정 요청문도 함께 만들어요.</p></div>
    <div className="text-xs text-work-muted space-y-2"><p className="font-semibold text-work-copy flex gap-2 items-center"><Info className="w-4 h-4" />자동 검사로 알 수 없는 것도 있어요</p><p className="leading-relaxed">실제 서비스에서 다른 사람의 자료를 볼 수 있는지, AI가 어디까지 작업할 수 있는지는 별도로 확인해야 해요. DB의 현재 RLS 설정과 임직원별 실제 권한은 소스 파일만으로 확정할 수 없어요. 문제가 안 보여도 전체가 안전하다는 뜻은 아니에요.</p></div>
  </Modal>;
};

export const HowToUseModal: React.FC<ModalProps & { onTryExample?: () => void }> = ({ onTryExample, ...props }) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const steps = [
    { Icon: mode === 'url' ? Globe2 : FolderCode, title: mode === 'url' ? '웹사이트 주소를 넣어요' : '코드 파일이나 폴더를 골라요', desc: mode === 'url' ? '내가 관리하는 사이트의 주소를 입력해요.' : '코드와 설정 파일을 선택해요. ZIP은 압축을 풀어주세요.', preview: mode === 'url' ? 'https://my-service.com' : '내 프로젝트 / app.js', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: ClipboardCheck, title: '확인할 항목을 살펴봐요', desc: '먼저 볼 항목부터 확인하고, 고치는 방법을 열어보세요.', preview: '먼저 확인  →  고치는 방법', color: 'bg-work-tint text-work-accent-copy' },
    { Icon: Wrench, title: '고친 뒤 다시 확인해요', desc: '수정 요청문을 AI에게 전달해요. 고친 후 다시 검사해 비교해요.', preview: 'AI에게 수정 요청  →  다시 검사', color: 'bg-work-success-bg text-work-success-copy' },
  ];
  return <Modal {...props} title="이렇게 사용해 보세요" subtitle="검사부터 수정 확인까지, 세 단계면 돼요." icon={<ClipboardCheck className="w-5 h-5" />}>
    <MethodSwitch mode={mode} onChange={setMode} />
    <div className="space-y-3">{steps.map(({ Icon, title, desc, preview, color }, index) => <article key={index} className="relative flex gap-4 rounded-2xl border border-work-line p-5"><span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="w-5 h-5" /></span><div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-work-faint mb-1">STEP 0{index + 1}</p><h3 className="text-sm font-bold text-work-title">{title}</h3><p className="text-xs text-work-muted leading-relaxed mt-1.5">{desc}</p><div className="rounded-lg bg-work-layer border border-work-line-soft px-3 py-2.5 mt-3 text-xs text-work-copy break-all">{preview}</div></div></article>)}</div>
    <div className="rounded-2xl bg-work-banner text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4"><div className="flex-1"><h3 className="font-semibold text-sm">한 번 해보는 게 가장 쉬워요</h3><p className="text-xs text-work-accent-copy/70 mt-1.5">실제 자료 없이 예제로 시작할 수 있어요.</p></div>{onTryExample && <button onClick={onTryExample} className="bg-work-panel text-work-accent-copy rounded-xl px-4 py-3 flex justify-center gap-2 items-center font-semibold text-xs shrink-0">예제로 새 검사 시작<ArrowRight className="w-4 h-4" /></button>}</div>
    <p className="text-xs text-work-muted flex items-start gap-2 leading-relaxed"><FileDown className="w-4 h-4 shrink-0" />결과를 보관하려면 ‘결과 저장’을 눌러주세요. 새로고침하면 화면의 결과는 사라져요.</p>
  </Modal>;
};
export const QuickGuideModal: React.FC<ModalProps> = props => <Modal {...props} title="궁금한 점이 있나요?" subtitle="처음 사용할 때 많이 묻는 내용을 모았어요." icon={<CircleHelp className="w-5 h-5" />}>
  <div className="space-y-3">{[
    ['문제가 없으면 안전한 건가요?', '이번 검사에서 의심 항목을 찾지 못했다는 뜻이에요. 로그인 권한이나 AI의 실제 작업 범위처럼 따로 확인해야 할 부분도 있어요.'],
    ['내 코드가 외부로 전송되나요?', '파일 검사는 내 브라우저에서 처리해요. 주소 검사는 이 컴퓨터의 서버가 사이트에 접속해 공개된 내용을 읽어요. 외부 AI에게 자료를 보내지는 않아요.'],
    ['결과를 어떻게 보관하나요?', '업무시스템에 연결한 검사 요약·담당자·조치 기한은 이 브라우저에 저장돼요. 소스코드 원문은 보관하지 않아요. 새로고침하면 상세 증거 화면은 사라지므로 결과 저장에서 PDF·보고서를 내려받으세요. 브라우저 데이터를 삭제하면 관리 기록도 지워져요. 현황판에서 기록 백업을 받을 수 있어요.'],
    ['AI 접속 키가 필요한가요?', '아니요. AI 계정이나 접속 키 없이 검사할 수 있어요. 수정 요청문을 복사해 내가 쓰는 AI에 직접 전달하면 돼요.'],
    ['다시 검사했는데 확인 불가라고 나와요.', '이전 파일이 빠졌거나, 이름이 바뀌었거나, 사이트에 접속하지 못한 경우예요. 확인하지 못한 항목은 해결됐다고 표시하지 않아요.'],
    ['비밀 정보가 전부 가려지나요?', '알려진 비밀키와 주민번호 같은 값은 가려드려요. 모든 기밀을 알아내지는 못하므로 AI에게 전달하기 전에는 내용을 한 번 더 확인해 주세요.'],
  ].map(([title, answer]) => <details key={title} className="group rounded-xl border border-work-line"><summary className="list-none cursor-pointer p-4 flex justify-between gap-3 font-semibold text-sm text-work-title">{title}<ChevronDown className="w-4 h-4 text-work-faint group-open:rotate-180 shrink-0" /></summary><p className="px-4 pb-4 text-xs text-work-muted leading-relaxed">{answer}</p></details>)}</div>
</Modal>;

export const ReportModal: React.FC<ModalProps & ReportData> = ({ isOpen, onClose, ...data }) => {
  const [message, setMessage] = useState('');
  useEffect(() => { if (isOpen) setMessage(''); }, [isOpen]);
  const high = data.issues.filter(issue => issue.severity === 'high').length;
  const warnings = [...new Set(data.scanMetadata?.warnings || [])];
  const markdown = reportMarkdown(data);
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setMessage('검사 내용을 복사했어요.'); } catch { setMessage('복사하지 못했어요. 보고서 파일로 저장해 주세요.'); } };
  return <Modal isOpen={isOpen} onClose={onClose} title="검사 결과 저장" subtitle="필요한 형식으로 보관하고, 확인할 항목을 함께 살펴봐요." icon={<FileDown className="w-5 h-5" />} wide>
    <div className="no-print grid sm:grid-cols-3 gap-3">{[
      { Icon: Printer, title: 'PDF로 저장', desc: '인쇄창에서 PDF를 선택해요', onClick: () => { setMessage('인쇄창의 저장 대상을 PDF로 선택해 주세요.'); window.print(); }, primary: true },
      { Icon: FileText, title: '보고서 파일 저장', desc: '열어서 읽을 수 있는 웹 문서', onClick: () => downloadText(reportHtml({ ...data, issues: orderIssues(data.issues).map(issue => ({ ...issue, title: issueTitle(issue), location: issueLocation(issue) })) }), 'mundansok-report.html', 'text/html;charset=utf-8') },
      { Icon: Copy, title: '내용 복사', desc: '메모나 AI에 붙여 넣어요', onClick: () => void copy() },
    ].map(({ Icon, title, desc, onClick, primary }) => <button key={title} onClick={onClick} className={`text-left p-4 rounded-2xl border transition-all ${primary ? 'bg-work-accent text-white border-work-accent-line hover:bg-work-accent-strong' : 'bg-work-panel border-work-line text-work-copy hover:border-work-accent-line hover:bg-work-tint/30'}`}><Icon className="w-5 h-5 mb-3" /><span className="block font-bold text-sm">{title}</span><span className={`block text-[11px] mt-1 ${primary ? 'text-work-accent-copy' : 'text-work-faint'}`}>{desc}</span></button>)}</div>
    {message && <p role="status" className="no-print text-sm text-work-accent-copy bg-work-tint rounded-xl p-3">{message}</p>}
    <section className="border border-work-line rounded-2xl overflow-hidden report-print-card"><div className="bg-work-layer p-5 sm:p-6 border-b border-work-line-soft"><p className="text-[10px] font-bold tracking-widest text-work-accent-copy">AI 업무도구 보안점검 · 검사 보고서</p><h3 className="text-xl font-bold mt-2 text-work-title break-words">{data.systemName || '내 프로젝트'}</h3><p className="text-xs text-work-muted mt-2">{data.scannedAt ? new Date(data.scannedAt).toLocaleString('ko-KR') : '검사 시각 없음'} · {data.scanMetadata?.mode === 'api_demo' ? '가상 API 권한 실습 · 실제 서비스 결과 아님' : data.scanMetadata?.mode === 'url' ? '웹사이트 주소 검사' : '코드 파일 검사'}</p></div><div className="grid grid-cols-3 divide-x divide-work-line-soft p-5 text-center"><div><p className="text-[11px] text-work-muted">{data.scanMetadata?.mode === 'api_demo' ? '실행한 조회 요청' : '살펴본 자료'}</p><strong className="block text-2xl text-work-title mt-1">{data.scannedStats.files}<span className="text-xs font-normal ml-1">개</span></strong></div><div><p className="text-[11px] text-work-muted">확인할 항목</p><strong className="block text-2xl text-work-title mt-1">{data.issues.length}<span className="text-xs font-normal ml-1">개</span></strong></div><div><p className="text-[11px] text-work-muted">먼저 확인</p><strong className="block text-2xl text-work-danger-copy mt-1">{high}<span className="text-xs font-normal ml-1">개</span></strong></div></div></section>
    {!!warnings.length && <div className="bg-work-warn-bg border border-work-warn-line p-4 rounded-xl flex items-start gap-3"><Info className="w-4 h-4 mt-0.5 text-work-warn-copy shrink-0" /><div><p className="text-xs font-bold text-work-warn-copy">결과와 함께 알아두세요</p><ul className="text-xs text-work-warn-copy/80 mt-2 space-y-1">{warnings.map(item => <li key={item}>{simpleWarning(item)}</li>)}</ul></div></div>}
    {data.scanMetadata?.mode === 'api_demo' && <ApiCheckSummary result={data.scanMetadata} />}
    <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-work-title">확인할 항목</h3><span className="text-xs text-work-faint">자동 검사에서 찾은 단서예요</span></div>
      {!data.issues.length && <div className="text-center rounded-2xl bg-work-success-bg p-7"><CheckCircle2 className="w-8 h-8 text-work-success-copy mx-auto mb-3" /><p className="font-bold text-sm text-work-success-copy">이번 검사에서 의심 항목을 찾지 못했어요</p><p className="text-xs text-work-success-copy/80 mt-2">서비스 전체의 안전을 보장하는 결과는 아니에요.</p></div>}
      {orderIssues(data.issues).map((issue, index) => <article key={issue.id} className="report-print-card rounded-xl border border-work-line p-4 sm:p-5"><div className="flex gap-2 items-center mb-2"><span className={`text-[10px] font-bold px-2 py-1 rounded-md ring-1 ring-inset ${severityStyle[issue.severity]}`}>{severityLabel[issue.severity]}</span><span className="text-[10px] text-work-faint">항목 {index + 1}</span></div><h4 className="font-bold text-sm text-work-title">{issueTitle(issue)}</h4><p className="text-xs text-work-muted mt-1.5 break-all">{issueLocation(issue)}</p><details className="report-evidence mt-3"><summary className="text-xs text-work-accent-copy cursor-pointer no-print">발견한 내용과 조치 방법 보기</summary><div className="mt-3 space-y-3"><pre className="rounded-xl bg-work-layer text-xs p-3 whitespace-pre-wrap break-all text-work-copy">{issue.codeSnippet}</pre><ol className="text-xs text-work-muted space-y-2">{issue.resolutionSteps.map(step => <li key={step.step}><strong className="text-work-copy">{step.title}</strong><p className="mt-1 leading-relaxed">{step.desc}</p></li>)}</ol></div></details></article>)}
    </section>
    <section className="bg-work-layer rounded-xl p-4"><p className="text-xs font-semibold text-work-copy mb-2">결과를 읽을 때 기억해 주세요</p><ul className="text-xs text-work-muted space-y-1.5">{manualReviewForInput(data.inputData).map(item => <li key={item} className="flex gap-2"><span>·</span>{item}</li>)}</ul></section>
    <details className="no-print text-xs text-work-faint"><summary className="cursor-pointer flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" />다른 형식과 자세한 검사 기록</summary><div className="mt-3 flex flex-wrap gap-2"><button className="border border-work-line px-3 py-2 rounded-lg" onClick={() => downloadText(markdown, 'mundansok-report.md', 'text/markdown;charset=utf-8')}>Markdown 문서</button><button className="border border-work-line px-3 py-2 rounded-lg" onClick={() => downloadText(JSON.stringify(buildReport(data), null, 2), 'mundansok-report.json', 'application/json')}>JSON 데이터</button></div><p className="mt-3 text-xs leading-relaxed">{data.scanMetadata?.scope || '제공한 파일을 정해진 규칙과 비교했어요. 실제 악용 여부는 별도로 확인해야 해요.'}</p>{data.scanMetadata?.checks?.map((check, index) => <p className="mt-1 break-all" key={index}>{check.status === 'completed' ? '확인' : '미확인'} · {check.ruleId} · {check.detail}</p>)}</details>
  </Modal>;
};
