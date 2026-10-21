import React, { useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
const captions = [
  ['업무시스템, 배포 전에 확인하세요', '임직원의 자료와 서비스 접속 키를 보호하는 첫 점검'],
  ['01. 코드와 설정 파일을 선택해요', '프로젝트 폴더 · .env · SQL 마이그레이션도 함께 확인'],
  ['02. 무엇이 누구에게 보이는지 확인해요', '공개 변수의 비밀키 / 데이터 접근 제한 / 위험한 SQL'],
  ['03. 발견한 위치와 수정 방법을 확인해요', '예: 브라우저 공개 변수에 서버 비밀키를 넣으면 안 돼요'],
  ['04. 고친 뒤 같은 자료로 다시 검사해요', '결과 비교와 보고서 저장 · 실제 권한과 운영 설정은 별도 확인'],
];
export const WorkGuideVideo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const panel = useRef<HTMLDivElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button, video, a[href], summary') || []).filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 sm:p-8 flex items-center justify-center" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guide-video-title" className="w-full max-w-5xl bg-work-panel rounded-2xl p-5 sm:p-6 max-h-[95vh] overflow-auto outline-none"><div className="flex justify-between items-center gap-3 mb-4"><div><h2 id="guide-video-title" className="font-bold text-lg">업무시스템 점검, 20초 이용 안내</h2><p className="text-xs text-work-muted mt-1">가상 예시와 한글 자막으로 보는 사용 방법 · 음성 없음</p></div><button onClick={onClose} aria-label="영상 닫기" className="p-2"><X className="w-5 h-5" /></button></div><video controls playsInline preload="metadata" src="/media/mundansok-work-guide.webm" aria-label="업무시스템 점검 안내 영상" className="w-full rounded-xl bg-work-deep">이 브라우저에서는 WebM 재생을 지원하지 않습니다. 아래 링크로 영상을 저장해 주세요.</video><div className="mt-4 flex flex-wrap gap-3 items-center justify-between"><p className="text-xs text-work-muted">재생 버튼을 누르면 바로 볼 수 있어요. 인터넷 연결이나 외부 서비스는 필요 없어요.</p><a href="/media/mundansok-work-guide.webm" download="mundansok-work-guide.webm" className="inline-flex items-center gap-2 text-sm font-bold text-work-accent-copy border border-work-accent-line px-4 py-3 rounded-xl"><Download className="w-4 h-4" />안내 영상 저장 · WebM</a></div><details className="mt-4 text-xs text-work-muted"><summary className="cursor-pointer">영상 자막 읽기</summary><ol className="mt-3 space-y-2">{captions.map(([title, text]) => <li key={title}><strong>{title}</strong> — {text}</li>)}</ol></details></div></div>;
};
