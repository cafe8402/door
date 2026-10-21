import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ScanInputData } from '../types/security';
import type { ScanResultPayload } from '../services/localSecurityScanner';
import { RULE_COUNT } from '../services/localSecurityScanner';
import { scanTarget } from '../services/scanClient';
interface Props {
  inputData: ScanInputData;
  onFinishScan: (result: ScanResultPayload) => void;
  onCancelScan: () => void;
}
export const ScreenScanning: React.FC<Props> = ({ inputData, onFinishScan, onCancelScan }) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const finish = useRef(onFinishScan);
  finish.current = onFinishScan;
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setProgress(0);
    scanTarget(inputData, controller.signal, completed => setProgress(completed))
      .then(result => { if (!controller.signal.aborted) finish.current(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [inputData, attempt]);
  return <section className="max-w-3xl mx-auto p-6 py-12 space-y-6">
    <h1 className="text-2xl font-bold">{inputData.inputTab === 'api_demo' ? '가상 API의 접근 권한을 확인하고 있어요' : inputData.inputTab === 'url' ? '웹사이트를 살펴보고 있어요' : '코드 파일을 살펴보고 있어요'}</h1>
    <div className="bg-work-panel p-6 rounded-2xl border border-work-line space-y-4" role="status" aria-live="polite">
      {!error && <Loader2 className="animate-spin text-work-accent-copy" />}
      <p>{error || (inputData.inputTab === 'api_demo' ? '정상 계정을 확인한 뒤, 타인 문서와 관리자 자료를 읽을 수 있는지 비교해요.' : inputData.inputTab === 'url' ? '사이트에 접속해 보호 설정과 공개된 정보를 확인해요. 최대 25초가 걸릴 수 있어요.' : `${inputData.files.length}개 파일 중 ${progress}개 분석 완료`)}</p>
      {inputData.inputTab === 'upload' && <progress className="w-full accent-work-accent" max={inputData.files.length || 1} value={progress} />}
      <p className="text-sm text-work-copy">{inputData.inputTab === 'api_demo' ? '준비된 가상 서버에 최대 7회 조회 요청을 보내요. 실제 서비스 검사는 아니에요.' : inputData.inputTab === 'url' ? '공개된 내용만 읽어요. 로그인하거나 공격을 시도하지 않아요.' : `파일에서 확인할 부분을 찾고 있어요. 내용은 외부로 보내지 않아요.`}</p>
    </div>
    <div className="flex gap-3">
      <button className="px-4 py-2 rounded-lg border border-work-line" onClick={onCancelScan}>멈추고 돌아가기</button>
      {error && <button className="px-4 py-2 rounded-lg bg-work-accent text-white" onClick={() => setAttempt(value => value + 1)}>다시 시도</button>}
    </div>
  </section>;
};
