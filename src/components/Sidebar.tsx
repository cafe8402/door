import React from 'react';
import { InspectionIcon } from './InspectionIcon';
import { Home, Plus, Search, BookOpen, CircleHelp, LockKeyhole, X, ArrowUpRight, Building2 } from 'lucide-react';
import type { ScreenType } from '../types/security';
interface Props {
  currentScreen: ScreenType;
  hasResult: boolean;
  onHome: () => void;
  onPortfolio: () => void;
  onReturnToPortal: () => void;
  onNavigateToScan: () => void;
  onViewResult: () => void;
  onOpenWhatWeCheck: () => void;
  onOpenHowToUse: () => void;
  onOpenQuickGuide: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}
export const Sidebar: React.FC<Props> = ({ currentScreen, hasResult, onHome, onPortfolio, onReturnToPortal, onNavigateToScan, onViewResult, onOpenWhatWeCheck, onOpenHowToUse, onOpenQuickGuide, isOpenMobile, onCloseMobile }) => {
  const go = (action: () => void) => { action(); onCloseMobile(); };
  const item = (active: boolean) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-work-tint text-work-accent-copy' : 'text-work-copy hover:bg-work-layer hover:text-work-title'}`;
  return <>
    {isOpenMobile && <button aria-label="메뉴 닫기" className="fixed inset-0 bg-work-deep/35 backdrop-blur-sm z-40 lg:hidden" onClick={onCloseMobile} />}
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-work-panel border-r border-work-line flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between p-6 border-b border-work-line-soft"><button aria-label="ai-work-security 홈" onClick={() => go(onHome)} className="flex items-center gap-3 text-left"><img src="/assets/brand/aws-handwritten.png" alt="" width={44} height={44} className="shrink-0 object-contain" /><span><strong className="block text-xl text-work-title tracking-tight">ai-work-security</strong><span className="text-[11px] text-work-faint">내 서비스의 첫 보안 점검</span></span></button><button aria-label="닫기" className="lg:hidden p-1 text-work-faint" onClick={onCloseMobile}><X className="w-5 h-5" /></button></div>
      <nav aria-label="주 메뉴" className="p-4 space-y-1.5"><button className={item(currentScreen === 'home')} aria-current={currentScreen === 'home' ? 'page' : undefined} onClick={() => go(onHome)}><Home className="w-4 h-4" />홈</button><button className="w-full bg-work-accent hover:bg-work-accent-strong text-white rounded-xl py-3 px-4 text-sm font-semibold flex gap-3 items-center shadow-sm shadow-work-accent/20" onClick={() => go(onNavigateToScan)}><Plus className="w-4 h-4" />새 검사 시작</button>
        {hasResult && <button className={item(['result', 'detail', 'rescan_input', 'comparison'].includes(currentScreen))} onClick={() => go(onViewResult)}><InspectionIcon kind="report" size={20} />최근 검사 결과</button>}
        <button className={item(currentScreen === 'portfolio')} aria-current={currentScreen === 'portfolio' ? 'page' : undefined} onClick={() => go(onPortfolio)}><Building2 className="w-4 h-4" />업무시스템 현황</button>
        <p className="pt-7 pb-2 px-4 text-[10px] tracking-wider font-bold text-work-faint">도움이 필요할 때</p><button className={item(false)} onClick={() => go(onOpenWhatWeCheck)}><Search className="w-4 h-4" />무엇을 검사하나요?</button><button className={item(false)} onClick={() => go(onOpenHowToUse)}><BookOpen className="w-4 h-4" />이용 방법</button><button className={item(false)} onClick={() => go(onOpenQuickGuide)}><CircleHelp className="w-4 h-4" />자주 묻는 질문</button>
        <button className={item(false)} onClick={() => go(onReturnToPortal)}><ArrowUpRight className="w-4 h-4" />문이 있는 입구로</button>
      </nav>
      <div className="mt-auto p-5 space-y-4"><div className="bg-work-layer rounded-2xl p-4"><span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-work-panel text-work-accent-copy mb-3"><LockKeyhole className="w-4 h-4" /></span><p className="text-xs font-semibold text-work-copy">내 자료는 어떻게 처리되나요?</p><p className="text-[11px] text-work-muted leading-relaxed mt-2">파일은 내 브라우저에서 확인해요.<br />주소 검사는 이 컴퓨터가 사이트에 접속해요.</p><button className="text-[11px] text-work-accent-copy font-semibold mt-3 flex items-center gap-1" onClick={() => go(onOpenQuickGuide)}>더 알아보기<ArrowUpRight className="w-3 h-3" /></button></div><p className="text-[10px] text-work-faint px-1">© 2026 ai-work-security · 누구나 쉬운 보안 점검</p></div>
    </aside>
  </>;
};
