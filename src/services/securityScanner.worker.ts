import { runLocalSecurityScan } from './localSecurityScanner';
import type { ScanInputData } from '../types/security';
self.onmessage = async (event: MessageEvent<ScanInputData>) => {
  try {
    const result = await runLocalSecurityScan(event.data, (completed, total) => self.postMessage({ type: 'progress', completed, total }));
    self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '검사에 실패했습니다.' });
  }
};
