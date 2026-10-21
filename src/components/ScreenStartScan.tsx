import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe2, FolderCode, Upload, FolderOpen, FileCode2, X, Sparkles, LockKeyhole, ChevronDown, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import type { ScanInputData, ServiceType, TriState } from '../types/security';
import { readSourceFiles } from '../services/fileInput';
import { maskSecret, SAMPLE_VULNERABLE_FILES } from '../services/localSecurityScanner';
interface Props { inputData: ScanInputData; onChangeInputData: (data: Partial<ScanInputData>) => void; onStartScan: () => void; onHome: () => void; }
export const ScreenStartScan: React.FC<Props> = ({ inputData, onChangeInputData, onStartScan, onHome }) => {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const picker = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const isUrl = inputData.inputTab === 'url';
  const load = async (selected: File[]) => {
    if (reading) return;
    const current = ++version.current; setReading(true); setError('');
    try { const files = await readSourceFiles(selected, inputData.files); if (current === version.current) onChangeInputData({ files }); }
    catch (err) { if (current === version.current) setError(maskSecret((err as Error).message)); }
    finally { if (current === version.current) setReading(false); }
  };
  const sample = () => {
    if (reading) return; setError('');
    if (isUrl) onChangeInputData({ targetUrl: window.location.origin + '/__fixtures/vulnerable' });
    else onChangeInputData({ files: SAMPLE_VULNERABLE_FILES.map(file => ({ ...file, size: new Blob([file.content]).size })) });
  };
  const start = (event: React.FormEvent) => {
    event.preventDefault(); if (reading) return;
    if (isUrl) { try { const url = new URL(inputData.targetUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { setError('https://로 시작하는 웹사이트 주소를 확인해 주세요.'); return; } }
    else if (!inputData.files.length) { setError('검사할 파일을 먼저 선택해 주세요.'); return; }
    if (!inputData.authConfirmed) { setError('검사할 수 있는 서비스인지 아래에서 확인해 주세요.'); return; }
    setError(''); onStartScan();
  };
  const questions: { key: 'q1DataPrivacy' | 'q2ExternalAi' | 'q3AuthControl' | 'q4AiExecution'; title: string }[] = [
    { key: 'q1DataPrivacy', title: '개인정보나 회사 자료를 다루나요?' }, { key: 'q2ExternalAi', title: '외부 AI나 다른 서비스로 자료를 보내나요?' },
    { key: 'q3AuthControl', title: '로그인이 필요한 서비스인가요?' }, { key: 'q4AiExecution', title: 'AI가 파일 수정·삭제 같은 작업도 하나요?' },
  ];
  const services: { id: ServiceType; title: string }[] = [{ id: 'web', title: '웹사이트' }, { id: 'api', title: '서버' }, { id: 'ai-agent', title: 'AI 챗봇·에이전트' }, { id: 'automation', title: '업무 자동화' }, { id: 'other', title: '기타' }];
  return <div className="scan-start scan-page">
    <button className="inline-flex gap-1.5 items-center text-sm text-work-muted hover:text-work-accent-copy mb-7" onClick={onHome}><ArrowLeft className="w-4 h-4" />홈으로</button>
    <div className="scan-steps flex flex-wrap gap-2 items-center text-xs text-work-faint mb-4"><span className="text-work-accent-copy font-semibold">1. 검사할 대상 선택</span><ArrowRight className="w-3 h-3" /><span>2. 결과 확인</span><ArrowRight className="w-3 h-3" /><span>3. 수정 후 확인</span></div>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-work-title">어떤 서비스를 살펴볼까요?</h1><p className="text-sm text-work-muted mt-2 mb-7">주소 하나 또는 코드 파일로 시작해 보세요. 발견 위치와 수정 안내를 받고, 고친 뒤 다시 확인할 수 있어요.</p>
    <form onSubmit={start} className="space-y-5">
      <div className="bg-work-panel rounded-2xl border border-work-line overflow-hidden">
        <div className="grid grid-cols-2 p-1.5 bg-work-layer border-b border-work-line-soft" role="group" aria-label="검사 방법">{([{ mode: 'url' as const, title: '웹사이트 주소', Icon: Globe2 }, { mode: 'upload' as const, title: '코드 파일', Icon: FolderCode }]).map(({ mode, title, Icon }) => <button type="button" key={mode} disabled={reading} aria-pressed={inputData.inputTab === mode} onClick={() => { setError(''); onChangeInputData({ inputTab: mode }); }} className={`py-3 flex gap-2 items-center justify-center text-sm font-semibold rounded-xl transition-all ${inputData.inputTab === mode ? 'bg-work-panel text-work-accent-copy shadow-sm ring-1 ring-work-line' : 'text-work-muted hover:text-work-title'}`}><Icon className="w-4 h-4" />{title}</button>)}</div>
        <div className="p-5 sm:p-7 space-y-5">
          <div className="text-xs leading-relaxed text-work-muted border-l-2 border-work-accent-line pl-3" aria-live="polite">{isUrl ? <><strong className="text-work-copy">공개된 웹 응답을 살펴봐요.</strong><br />이 컴퓨터의 검사 서버가 사이트에 접속해 보안 헤더·쿠키·일부 공개 코드를 확인해요. 로그인 이후 화면과 계정별 권한은 별도 확인이 필요해요.</> : <><strong className="text-work-copy">코드 원문은 브라우저 안에서 검사해요.</strong><br />비밀키와 위험한 코드·설정 패턴을 찾아요. 고정 용량·개수 제한은 없으며, 처리 가능한 양은 기기 메모리에 따라 달라요. 실제 운영 권한은 별도 확인이 필요해요.</>}</div>
          <label className="block text-sm font-semibold text-work-copy">검사 이름 <span className="font-normal text-work-faint text-xs">선택</span><input aria-label="검사 이름" value={inputData.systemName} maxLength={120} onChange={event => onChangeInputData({ systemName: event.target.value })} className="w-full rounded-xl border border-work-line px-4 py-3 mt-2 text-sm font-normal focus:ring-2 focus:ring-work-accent-line focus:border-work-accent-line outline-none" placeholder="예: 내가 만든 예약 서비스" /></label>
          {isUrl ? <div className="space-y-3"><label className="block text-sm font-semibold text-work-copy">웹사이트 주소<input aria-label="검사 URL" type="url" value={inputData.targetUrl} onChange={event => { setError(''); onChangeInputData({ targetUrl: event.target.value }); }} className="mt-2 w-full rounded-xl border border-work-line px-4 py-3.5 text-sm font-normal focus:ring-2 focus:ring-work-accent-line focus:border-work-accent-line outline-none" placeholder="https://my-service.com" required /></label><p className="text-xs text-work-muted">인터넷에서 접속할 수 있는 사이트를 입력해 주세요.</p></div> : <div className="space-y-3">
            <div className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-work-accent-line bg-work-tint' : 'border-work-line bg-work-layer/50'}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void load(Array.from(event.dataTransfer.files)); }}>
              <span className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-work-panel text-work-accent-copy flex items-center justify-center border border-work-line-soft"><Upload className="w-5 h-5" /></span><p className="font-semibold text-work-title text-sm">파일을 끌어 놓거나 선택해 주세요</p><p className="text-xs text-work-faint mt-1">코드와 설정 파일을 여러 개 골라도 돼요.</p>
              <div className="scan-file-actions flex flex-wrap justify-center gap-3 mt-4"><button type="button" disabled={reading} onClick={() => picker.current?.click()} className="bg-work-panel border border-work-line rounded-lg px-3 py-2.5 text-xs font-semibold text-work-copy inline-flex gap-1.5 items-center"><FileCode2 className="w-3.5 h-3.5" />파일 선택</button><button type="button" disabled={reading} onClick={() => folder.current?.click()} className="bg-work-accent text-white rounded-lg px-3 py-2.5 text-xs font-semibold inline-flex gap-1.5 items-center"><FolderOpen className="w-3.5 h-3.5" />폴더 선택</button></div>
              <input ref={picker} aria-label="코드 파일 선택" type="file" multiple className="hidden" disabled={reading} onChange={event => { if (event.target.files) void load(Array.from(event.target.files)); event.target.value = ''; }} /><input ref={folder} aria-label="프로젝트 폴더 선택" type="file" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} className="hidden" disabled={reading} onChange={event => { if (event.target.files) void load(Array.from(event.target.files)); event.target.value = ''; }} />
            </div>
            {reading && <p role="status" className="text-xs text-work-accent-copy">파일을 준비하고 있어요…</p>}
            {!!inputData.files.length && <div className="space-y-2 max-h-52 overflow-auto">{inputData.files.map((file, index) => <div key={file.name} className="flex items-center gap-2 bg-work-layer rounded-lg p-3 text-xs"><FileCode2 className="w-4 h-4 text-work-faint shrink-0" /><span className="flex-1 break-all text-work-copy">{maskSecret(file.name)}</span><span className="text-work-faint shrink-0">{(file.size / 1024).toFixed(1)} KB</span><button type="button" disabled={reading} aria-label={`${maskSecret(file.name)} 제거`} className="p-1 text-work-faint hover:text-work-danger-copy" onClick={() => onChangeInputData({ files: inputData.files.filter((_, i) => i !== index) })}><X className="w-4 h-4" /></button></div>)}</div>}
            <p className="text-xs text-work-muted flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5" />파일 내용은 외부로 보내지 않아요.</p>
          </div>}
          <div className="rounded-xl bg-work-tint/70 p-3.5 flex items-center justify-between gap-3"><span className="text-xs text-work-accent-copy">아직 준비된 자료가 없나요?</span><button type="button" disabled={reading} onClick={sample} className="inline-flex items-center gap-1.5 text-xs font-bold text-work-accent-copy shrink-0"><Sparkles className="w-3.5 h-3.5" />예제 넣기</button></div>
        </div>
      </div>
      <details className="bg-work-panel border border-work-line rounded-2xl group"><summary className="list-none cursor-pointer p-5 flex justify-between items-center text-sm font-semibold text-work-copy">내 서비스에 맞는 안내 받기 <span className="flex gap-2 items-center text-xs text-work-faint font-normal">선택<ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" /></span></summary><div className="px-5 pb-5 space-y-5"><p className="text-xs text-work-muted">답변에 따라 직접 확인할 부분을 안내해 드려요. 몰라도 검사는 할 수 있어요.</p><div className="flex flex-wrap gap-2">{services.map(service => <button type="button" key={service.id} aria-pressed={inputData.serviceTypes.includes(service.id)} className={`px-3 py-2 text-xs rounded-lg border ${inputData.serviceTypes.includes(service.id) ? 'border-work-accent-line bg-work-tint text-work-accent-copy' : 'border-work-line text-work-muted'}`} onClick={() => onChangeInputData({ serviceTypes: inputData.serviceTypes.includes(service.id) ? inputData.serviceTypes.filter(id => id !== service.id) : [...inputData.serviceTypes, service.id] })}>{service.title}</button>)}</div>{questions.map(question => <div key={question.key} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between"><span className="text-xs text-work-copy">{question.title}</span><div className="flex gap-1 shrink-0" role="group" aria-label={question.title}>{(['yes', 'no', 'unsure'] as TriState[]).map(value => <button type="button" key={value} aria-pressed={inputData[question.key] === value} onClick={() => onChangeInputData({ [question.key]: value })} className={`px-3 py-2 rounded-lg text-xs ${inputData[question.key] === value ? 'bg-work-choice text-white' : 'bg-work-layer text-work-muted'}`}>{value === 'yes' ? '네' : value === 'no' ? '아니요' : '잘 모르겠어요'}</button>)}</div></div>)}</div></details>
      <label className="flex gap-3 items-start p-1 text-sm text-work-copy cursor-pointer"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-work-accent shrink-0" checked={inputData.authConfirmed} onChange={event => onChangeInputData({ authConfirmed: event.target.checked })} /><span>내가 관리하거나, 검사 허락을 받은 서비스예요.<span className="text-xs text-work-faint ml-1">필수</span></span></label>
      {error && <p role="alert" className="text-sm text-work-danger-copy bg-work-danger-bg rounded-xl p-3 flex gap-2 items-start"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      <button disabled={reading || !inputData.authConfirmed || (isUrl ? !inputData.targetUrl.trim() : !inputData.files.length)} type="submit" className="w-full rounded-xl bg-work-accent hover:bg-work-accent-strong text-white py-4 font-bold text-sm flex justify-center items-center gap-2 disabled:bg-work-disabled disabled:text-work-faint disabled:cursor-not-allowed transition-colors"><ShieldCheck className="w-4 h-4" />검사 시작<ArrowRight className="w-4 h-4" /></button>
      <details className="text-xs text-work-faint text-center"><summary className="cursor-pointer">파일 크기와 검사 범위 안내</summary><p className="mt-2 leading-relaxed">{isUrl ? '최대 25초 동안 공개된 화면과 연결된 코드 일부를 확인해요. 로그인이나 공격 시도는 하지 않아요. 내부망 주소는 예제 외에는 검사하지 않아요.' : '파일 용량·개수의 고정 제한은 없어요. 처리 가능한 양은 기기의 메모리에 따라 달라요. ZIP은 압축을 풀어주세요. 폴더의 설치 파일과 그림 등은 제외해요.'}</p></details>
    </form>
  </div>;
};
