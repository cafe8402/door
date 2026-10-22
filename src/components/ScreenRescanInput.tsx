import React, { useEffect, useRef, useState } from 'react';
import type { RescanInputData, SecurityIssue } from '../types/security';
import { readSourceFiles } from '../services/fileInput';
import { maskSecret } from '../services/localSecurityScanner';
interface Props {
  systemName: string;
  previousIssues: SecurityIssue[];
  previousFileNames?: string[];
  rescanData: RescanInputData;
  isUrl?: boolean;
  isApiDemo?: boolean;
  onChangeRescanData: (data: Partial<RescanInputData>) => void;
  onBackToResults: () => void;
  onTriggerRescan: () => Promise<void>;
}
export const ScreenRescanInput: React.FC<Props> = ({ systemName, previousIssues, previousFileNames = [], rescanData, isUrl = false, isApiDemo = false, onChangeRescanData, onBackToResults, onTriggerRescan }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const readVersion = useRef(0);
  useEffect(() => () => { readVersion.current++; }, []);
  const files = rescanData.files || [];
  const expected = [...new Set(previousIssues.map(issue => issue.filePath).filter((name): name is string => !!name))];
  const selectedNames = new Set(files.map(file => file.name));
  const missing = expected.filter(name => !selectedNames.has(name));
  const folderInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
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
    <h1 className="text-2xl font-bold">{isApiDemo ? '권한을 고친 예제로 다시 확인해요' : isUrl ? '고친 웹사이트를 다시 살펴봐요' : '수정한 프로젝트 폴더를 선택하세요'}</h1>
    <p>{systemName} · 이전 발견 {previousIssues.length}건</p>
    <div className="bg-work-panel p-6 rounded-2xl border border-work-line space-y-4">
      {isApiDemo ? <div className="space-y-3"><p className="text-sm text-work-copy">같은 테스트 계정과 가상 자료로 다시 조회해요. 실제 서비스나 계정은 사용하지 않아요.</p><label className="block text-sm font-semibold">재검사할 예제<select aria-label="재검사 예제 버전" value={rescanData.apiDemoVersion || 'fixed'} onChange={event => onChangeRescanData({ apiDemoVersion: event.target.value as 'vulnerable' | 'fixed' })} disabled={busy} className="block w-full border border-work-line p-3 rounded-xl mt-2"><option value="fixed">수정 후 예제 · 권한 확인 적용</option><option value="vulnerable">수정 전 예제 · 권한 확인 누락</option></select></label></div> : isUrl ? <label className="block font-semibold">수정한 웹사이트 주소<input aria-label="재검사 URL" type="url" value={rescanData.patchUrl} disabled={busy} className="block w-full border border-work-line rounded-lg p-3 mt-2" onChange={event => onChangeRescanData({ patchUrl: event.target.value })} /><span className="block text-xs font-normal mt-2 text-work-copy">처음 검사한 사이트의 주소를 입력해 주세요. 읽지 못한 부분은 확인 못함으로 남겨요.</span></label> : <>
      <div className="rescan-guide">
        <h2>① AI가 수정한 내용을 파일로 저장하세요</h2>
        <p>AI의 답변이나 보고서가 아니라, <b>수정 내용이 저장된 코드 파일</b>이 필요해요. AI에서 ZIP으로 받았다면 먼저 압축을 풀어주세요.</p>
        <h2>② 처음 검사했던 폴더의 수정본을 선택하세요</h2>
        <p>가장 쉬운 방법은 <b>프로젝트 폴더 전체</b>를 다시 고르는 거예요. 아래 파일 경로가 그대로 들어 있는 폴더를 선택하세요.</p>
        <p className="text-sm text-work-accent-copy">시연용 ‘업무포털’을 검사했다면 → AI로 고친 파일을 저장한 ‘업무포털’ 폴더를 선택하세요. 수정 전 폴더를 다시 고르면 같은 문제가 나와요.</p>
      </div>
      <section className="rescan-targets" aria-label="다시 확인할 파일 목록">
        <h2>이전에 문제가 발견된 파일 · {expected.length}개</h2>
        <p>아래 경로는 선택할 프로젝트 폴더 안의 위치예요.</p>
        <ul>{expected.map(name=><li key={name}><code>{maskSecret(name)}</code><span>{files.length ? (selectedNames.has(name) ? '선택됨' : '아직 없음') : '다시 확인할 파일'}</span></li>)}</ul>
        {!expected.length && <p>이전 파일 경로가 남아 있지 않아요. 처음 검사한 프로젝트의 수정본 전체를 선택하세요.</p>}
        {!!previousFileNames.length && <details><summary>이전에 검사한 전체 파일 {previousFileNames.length}개 보기</summary>{previousFileNames.map(name=><p key={name}>{maskSecret(name)}</p>)}</details>}
      </section>
      <input ref={folderInput} aria-label="수정한 프로젝트 폴더" className="hidden" type="file" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} disabled={busy} onChange={event => { if (event.target.files) void loadFiles(Array.from(event.target.files)); event.target.value = ''; }} />
      <button type="button" className="repair-action" disabled={busy} onClick={()=>folderInput.current?.click()}>수정한 프로젝트 폴더 선택 · 권장</button>
      <details><summary>파일 몇 개만 수정했나요?</summary><p className="text-sm">처음에도 파일을 개별 선택했다면 같은 이름의 수정 파일을 고르세요. 처음에 폴더를 선택했다면, 경로가 달라지지 않도록 위의 폴더 선택을 사용하세요.</p>
        <input ref={fileInput} aria-label="수정한 소스 파일" className="hidden" type="file" multiple disabled={busy} onChange={event => { if (event.target.files) void loadFiles(Array.from(event.target.files)); event.target.value = ''; }} />
        <button type="button" className="wizard-secondary" disabled={busy} onClick={()=>fileInput.current?.click()}>수정한 파일 개별 선택</button>
      </details>
      {!!files.length && <section aria-label="선택한 수정본"><h2>③ 선택한 자료를 확인하고 검사를 시작하세요</h2><p role="status">{files.length}개 파일 선택 · 이전 발견 파일 {expected.length-missing.length}/{expected.length}개 포함</p>
        {!!missing.length && <p className="text-work-warn-copy">이전 발견 파일 {missing.length}개가 빠졌어요. 빠진 파일은 ‘해결됨’이 아니라 ‘확인 못함’으로 남아요. 폴더를 잘못 골랐다면 선택을 비우고 다시 골라주세요.</p>}
        <button className="wizard-secondary" disabled={busy} onClick={()=>onChangeRescanData({files:[]})}>선택 비우고 다시 고르기</button>
        <details><summary>선택한 파일 목록</summary>{files.map((file,index)=><div key={file.name} className="flex justify-between text-sm gap-3"><span className="break-all">{maskSecret(file.name)}</span><button disabled={busy} onClick={()=>onChangeRescanData({files:files.filter((_,i)=>i!==index)})}>제거</button></div>)}</details>
      </section>}
      <p className="text-xs text-work-muted">파일은 브라우저 안에서 검사해요. 이미지·설치 파일은 필요하지 않아요. 파일 크기·개수의 고정 제한은 없으며 기기 메모리에 따라 처리 범위가 달라져요.</p>
      </>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={rescanData.targetConfirmed} onChange={event => onChangeRescanData({ targetConfirmed: event.target.checked })} />같은 서비스의 수정본이에요.</label>
    </div>
    {error && <p role="alert" className="text-work-danger-copy">{error}</p>}
    <button className="px-6 py-3 rounded-xl bg-work-accent text-white disabled:opacity-50" disabled={busy || (isApiDemo ? false : isUrl ? !rescanData.patchUrl.trim() : !files.length) || !rescanData.targetConfirmed} onClick={() => void start()}>{busy ? '처리 중…' : '다시 검사 시작'}</button>
  </section>;
};
