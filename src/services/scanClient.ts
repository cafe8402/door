import type { ScanInputData } from '../types/security';
import type { ScanResultPayload } from './localSecurityScanner';
import type { SecurityIssue } from '../types/security';
import { compareScanResults } from './localSecurityScanner';
export async function scanTarget(input: ScanInputData, signal: AbortSignal, onProgress?: (completed: number, total: number) => void): Promise<ScanResultPayload> {
  if (input.inputTab === 'upload') return scanInWorker(input, signal, onProgress);
  const apiDemo = input.inputTab === 'api_demo';
  const response = await fetch(apiDemo ? '/api/scan-api-demo' : '/api/scan-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiDemo ? { version: input.apiDemoVersion || 'vulnerable', authConfirmed: input.authConfirmed } : { url: input.targetUrl, authConfirmed: input.authConfirmed }), signal });
  let data; try { data = await response.json(); } catch { throw new Error('URL 검사 서버가 준비되지 않았습니다. 실행 창을 다시 열어주세요.'); }
  if (!response.ok) throw new Error(data.error || 'URL 검사에 실패했습니다.');
  return data;
}
export function compareUrlScanResults(previous: SecurityIssue[], current: ScanResultPayload) {
  const resources = [...new Set([...current.scannedFileNames, ...(current.checks || []).filter(check => check.status === 'completed').map(check => check.resource)])];
  return compareScanResults(previous, current.issues, resources).map(entry => {
    if (entry.status !== 'resolved') return entry;
    const rule = /^#(?:WEB|API)-/.test(entry.issue.ruleId || '') ? entry.issue.ruleId : '*source';
    const verified = current.checks?.some(check => check.ruleId === rule && check.resource === entry.issue.filePath && check.status === 'completed');
    return verified ? entry : { ...entry, status: 'unverified' as const };
  });
}
export function scanInWorker(input: ScanInputData, signal: AbortSignal, onProgress?: (completed: number, total: number) => void): Promise<ScanResultPayload> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('검사 중지', 'AbortError')); return; }
    const worker = new Worker(new URL('./securityScanner.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('검사 중지', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') onProgress?.(data.completed, data.total);
      else if (data.type === 'result') { cleanup(); resolve(data.result); }
      else if (data.type === 'error') { cleanup(); reject(new Error(data.message)); }
    };
    worker.onerror = () => { cleanup(); reject(new Error('분석 작업을 실행하지 못했습니다. 페이지를 새로고침하고 다시 시도해주세요.')); };
    worker.postMessage(input);
  });
}
