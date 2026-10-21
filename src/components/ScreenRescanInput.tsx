import React, { useEffect, useRef, useState } from 'react';
import type { RescanInputData, SecurityIssue } from '../types/security';
import { readSourceFiles } from '../services/fileInput';
import { maskSecret } from '../services/localSecurityScanner';
interface Props {
  systemName: string;
  previousIssues: SecurityIssue[];
  rescanData: RescanInputData;
  isUrl?: boolean;
  isApiDemo?: boolean;
  onChangeRescanData: (data: Partial<RescanInputData>) => void;
  onBackToResults: () => void;
  onTriggerRescan: () => Promise<void>;
}
export const ScreenRescanInput: React.FC<Props> = ({ systemName, previousIssues, rescanData, isUrl = false, isApiDemo = false, onChangeRescanData, onBackToResults, onTriggerRescan }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const readVersion = useRef(0);
  useEffect(() => () => { readVersion.current++; }, []);
  const files = rescanData.files || [];
  const loadFiles = async (selected: File[]) => {
    const version = ++readVersion.current;
    setBusy(true); setError('');
    try {
      const loaded = await readSourceFiles(selected, files);
      if (version === readVersion.current) onChangeRescanData({ files: loaded });
    } catch (err) { if (version === readVersion.current) setError(maskSecret((err as Error).message)); }
    finally { if (version === readVersion.current) setBusy(false); }
  };
  const start = async () => {
    if ((!isUrl && !isApiDemo && !files.length) || (isUrl && !rescanData.patchUrl.trim()) || !rescanData.targetConfirmed || busy) return;
    setBusy(true); setError('');
    try { await onTriggerRescan(); } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="max-w-4xl mx-auto p-6 py-10 space-y-6">
    <button className="text-work-accent-copy" onClick={onBackToResults}>← 검사 결과로 돌아가기</button>
    <h1 className="text-2xl font-bold">{isApiDemo ? '권한을 고친 예제로 다시 확인해요' : isUrl ? '고친 웹사이트를 다시 살펴봐요' : '고친 파일을 다시 살펴봐요'}</h1>
    <p>{systemName} · 이전 발견 {previousIssues.length}건</p>
    <div className="bg-work-panel p-6 rounded-2xl border border-work-line space-y-4">
      {isApiDemo ? <div className="space-y-3"><p className="text-sm text-work-copy">같은 테스트 계정과 가상 자료로 다시 조회해요. 실제 서비스나 계정은 사용하지 않아요.</p><label className="block text-sm font-semibold">재검사할 예제<select aria-label="재검사 예제 버전" value={rescanData.apiDemoVersion || 'fixed'} onChange={event => onChangeRescanData({ apiDemoVersion: event.target.value as 'vulnerable' | 'fixed' })} disabled={busy} className="block w-full border border-work-line p-3 rounded-xl mt-2"><option value="fixed">수정 후 예제 · 권한 확인 적용</option><option value="vulnerable">수정 전 예제 · 권한 확인 누락</option></select></label></div> : isUrl ? <label className="block font-semibold">수정한 웹사이트 주소<input aria-label="재검사 URL" type="url" value={rescanData.patchUrl} disabled={busy} className="block w-full border border-work-line rounded-lg p-3 mt-2" onChange={event => onChangeRescanData({ patchUrl: event.target.value })} /><span className="block text-xs font-normal mt-2 text-work-copy">처음 검사한 사이트의 주소를 입력해 주세요. 읽지 못한 부분은 확인 못함으로 남겨요.</span></label> : <>
      <p className="text-sm text-work-copy">이전과 같은 이름과 폴더 구조로 수정한 파일을 골라주세요. 빠진 파일은 확인 못함으로 남겨요.</p>
      <label className="block font-semibold">수정한 코드 파일 선택
        <input aria-label="수정한 소스 파일" className="block mt-3 text-sm" type="file" multiple disabled={busy} onChange={event => { if (event.target.files) void loadFiles(Array.from(event.target.files)); event.target.value = ''; }} />
      </label>
      <label className="block font-semibold">프로젝트 폴더 선택
        <input aria-label="수정한 프로젝트 폴더" className="block mt-3 text-sm" type="file" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} disabled={busy} onChange={event => { if (event.target.files) void loadFiles(Array.from(event.target.files)); event.target.value = ''; }} />
      </label>
      <p className="text-xs text-work-muted">파일 용량·개수의 고정 제한은 없어요. 처리 가능한 양은 기기의 메모리에 따라 달라요. 설치 파일과 그림 등은 제외해요.</p>
      {files.map((file, index) => <div key={file.name} className="flex justify-between text-sm gap-3"><span className="break-all">{maskSecret(file.name)}</span><button disabled={busy} onClick={() => onChangeRescanData({ files: files.filter((_, i) => i !== index) })}>제거</button></div>)}
      </>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={rescanData.targetConfirmed} onChange={event => onChangeRescanData({ targetConfirmed: event.target.checked })} />같은 서비스의 수정본이에요.</label>
    </div>
    {error && <p role="alert" className="text-work-danger-copy">{error}</p>}
    <button className="px-6 py-3 rounded-xl bg-work-accent text-white disabled:opacity-50" disabled={busy || (isApiDemo ? false : isUrl ? !rescanData.patchUrl.trim() : !files.length) || !rescanData.targetConfirmed} onClick={() => void start()}>{busy ? '처리 중…' : '다시 검사 시작'}</button>
  </section>;
};
