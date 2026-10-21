import { useCallback, useEffect, useState } from 'react';
import { emptyPortfolio, parsePortfolio, PORTFOLIO_KEY, writePortfolio } from './portfolio';
import type { Portfolio } from './portfolio';

export function usePortfolio() {
  const [data, setData] = useState<Portfolio>(emptyPortfolio);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    try { setData(parsePortfolio(localStorage.getItem(PORTFOLIO_KEY))); setError(''); }
    catch { setError('관리 기록을 읽지 못했어요. 기존 기록은 덮어쓰지 않았습니다. 브라우저의 저장 허용 설정과 백업을 확인해 주세요.'); }
  }, []);
  useEffect(() => {
    refresh();
    const sync = (event: StorageEvent) => { if (event.key === PORTFOLIO_KEY || event.key === null) refresh(); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, [refresh]);
  const commit = useCallback((change: (previous: Portfolio) => Portfolio) => {
    try {
      // Read the newest version at mutation time, including writes from other tabs.
      const next = change(parsePortfolio(localStorage.getItem(PORTFOLIO_KEY)));
      writePortfolio(localStorage, next); setData(next); setError(''); return true;
    } catch (cause) {
      setError(cause instanceof Error ? `저장하지 못했어요. ${cause.message}` : '저장 공간을 확인해 주세요.'); return false;
    }
  }, []);
  return { data, error, commit, refresh };
}
