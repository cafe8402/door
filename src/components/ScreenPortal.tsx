import React, { useEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';
import './ScreenPortal.css';

export const ScreenPortal: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [entering, setEntering] = useState(false);
  const pending = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const enter = () => {
    if (pending.current) return;
    pending.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onEnter(); return; }
    setEntering(true);
    timer.current = setTimeout(onEnter, 500);
  };
  return <div className={`portal-screen${entering ? ' portal-entering' : ''}`}>
    <div className="portal-atmosphere" aria-hidden="true">
      <i className="portal-star portal-star-a" /><i className="portal-star portal-star-b" /><i className="portal-star portal-star-c" />
      <i className="portal-star portal-star-d" /><i className="portal-star portal-star-e" /><i className="portal-star portal-star-f" />
      <i className="portal-shooting-star" /><i className="portal-shooting-star portal-shooting-star-late" />
    </div>
    <div className="portal-content">
      <header className="portal-header">
        <span className="portal-catalog">[PORTAL_01] · SECURITY VIGILANCE</span>
        <span className="portal-wordmark"><i aria-hidden="true" />AI 업무도구 보안점검 · AI TOOL SECURITY</span>
        <span className="portal-archive">2026 ARCHIVE</span>
      </header>
      <main className="portal-stage">
        <div className="portal-title"><p>THE ENCHANTED THRESHOLD</p><h1>문이 열리면, 안전한 여정이 시작됩니다.</h1></div>
        <button type="button" className="portal-door-trigger" aria-label="AI 업무도구 보안점검실 열기" aria-busy={entering} disabled={entering} onClick={enter}>
          <span className="portal-door-aura" aria-hidden="true" />
          <span className="portal-door-frame">
            <span className="portal-door-picture">
              <img src="/assets/portal/door-original.jpg" alt="별빛 하늘 아래 황금빛으로 열린 문" fetchPriority="high" width={512} height={286} />
              <span className="portal-door-shade" aria-hidden="true" />
              <i className="portal-dust portal-dust-gold" aria-hidden="true" /><i className="portal-dust portal-dust-white" aria-hidden="true" />
              <span className="portal-door-label"><span className="portal-key"><KeyRound size={17} strokeWidth={3} aria-hidden="true" /></span><span className="portal-touch">{entering ? 'ENTERING' : 'TOUCH TO ENTER'}</span><span className="portal-enter-text">{entering ? '점검실로 들어가고 있어요' : '점검의 문 열기'}</span></span>
            </span>
          </span>
        </button>
        <div className="portal-guidance"><p>빛나는 문을 터치하거나 클릭하여 <span>보안 점검실</span>로 입장하세요</p><p className="portal-privacy">파일은 브라우저에서 검사 · 외부 AI 미전송</p></div>
      </main>
      <footer className="portal-footer"><span>© 2026 AI TOOL SECURITY</span><span className="portal-footer-note">누구나 쉬운 서정적 보안 점검 가이드</span><span>LOCAL CODE INSPECTION</span></footer>
    </div>
  </div>;
};
