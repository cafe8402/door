import React, { useState, useEffect, useRef } from 'react';
import { Menu, Lock, Home as HomeIcon, ArrowLeft } from 'lucide-react';
import { 
  ScreenType, 
  ScanInputData, 
  SecurityIssue, 
  RescanInputData 
} from './types/security';
import type { ComparisonEntry } from './types/security';
import { 
  initialScanInput, 
  defaultRescanInput 
} from './data/defaultData';
import { Sidebar } from './components/Sidebar';
import { 
  WhatWeCheckModal, 
  HowToUseModal, 
  QuickGuideModal, 
  ReportModal 
} from './components/ModalPanels';
import { compareScanResults } from './services/localSecurityScanner';
import type { ScanResultPayload } from './services/localSecurityScanner';
import { scanTarget, compareUrlScanResults } from './services/scanClient';
import { ScreenApiDemo } from './components/ScreenApiDemo';
import { ScreenExperience } from './components/ScreenExperience';
import { ScreenDesk as ScreenHome } from './components/ScreenDesk';
import { ScreenStory } from './components/ScreenStory';
import { ScreenStartScan } from './components/ScreenStartScan';
import { ScreenScanning } from './components/ScreenScanning';
import { ScreenScanResult } from './components/ScreenScanResult';
import { ScreenIssueDetail } from './components/ScreenIssueDetail';
import { ScreenRescanInput } from './components/ScreenRescanInput';
import { ScreenRescanComparison } from './components/ScreenRescanComparison';
import { ScreenPortfolio } from './components/ScreenPortfolio';
import { usePortfolio } from './services/usePortfolio';
import { latestRun, recordRun } from './services/portfolio';
import type { ManagedSystem } from './services/portfolio';

export default function App() {
  const portfolio = usePortfolio();
  const [managedSystemId, setManagedSystemId] = useState('');
  const [pendingSave, setPendingSave] = useState<{ result: ScanResultPayload; input: ScanInputData; example?: boolean } | null>(null);
  const [portfolioFocus, setPortfolioFocus] = useState('');
  const [portfolioVisit, setPortfolioVisit] = useState(0);
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('intro');
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  // Data states
  const [inputData, setInputData] = useState<ScanInputData>(initialScanInput);
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [rescanData, setRescanData] = useState<RescanInputData>(defaultRescanInput);
  const [scanMode, setScanMode] = useState<'real_file' | 'url' | 'api_demo'>('real_file');
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null);
  const [comparison, setComparison] = useState<ComparisonEntry[]>([]);
  const [latestRescan, setLatestRescan] = useState<ScanResultPayload | null>(null);
  const [reportSource, setReportSource] = useState<'initial' | 'rescan'>('initial');
  const rescanController = useRef<AbortController | null>(null);
  const [scannedStats, setScannedStats] = useState<{ files: number; lines: number }>({ files: 0, lines: 0 });

  // Modals
  const [isWhatWeCheckOpen, setIsWhatWeCheckOpen] = useState<boolean>(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const flowVersion = useRef(0);

  // Browser History Navigation Support
  useEffect(() => {
    // Initial state push
    window.history.replaceState({ screen: 'intro', flow: flowVersion.current }, '', '');

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen && (['intro', 'home', 'portfolio'].includes(e.state.screen) || e.state.flow === flowVersion.current)) {
        setCurrentScreen(e.state.screen);
        if (e.state.issueId) {
          setSelectedIssueId(e.state.issueId);
        }
      } else {
        setCurrentScreen('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (screen: ScreenType, issueId?: string) => {
    setCurrentScreen(screen);
    setIsMobileMenuOpen(false);
    setIsWhatWeCheckOpen(false); setIsHowToUseOpen(false); setIsQuickGuideOpen(false); setIsReportOpen(false);
    if (issueId) {
      setSelectedIssueId(issueId);
    }
    window.history.pushState({ screen, issueId: issueId || selectedIssueId, flow: flowVersion.current }, '', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateInputData = (updated: Partial<ScanInputData>) => {
    setInputData((prev) => ({ ...prev, ...updated }));
  };
  const openPortfolio = (systemId = '') => { setPortfolioFocus(systemId); setPortfolioVisit(v=>v+1); navigateTo('portfolio'); };

  const handleUpdateRescanData = (updated: Partial<RescanInputData>) => {
    setRescanData((prev) => ({ ...prev, ...updated }));
  };

  const handleFinishScan = (scanResult: ScanResultPayload) => {
      if (managedSystemId) {
        const saved = portfolio.commit(data => recordRun(data, managedSystemId, inputData, scanResult));
        setPendingSave(saved ? null : { result: scanResult, input: inputData });
      }
      setScanResult(scanResult);
      setScanMode(scanResult.mode);
      setRescanData({ ...defaultRescanInput, submissionTab: scanResult.mode === 'url' ? 'url' : 'upload', patchUrl: inputData.targetUrl, apiDemoVersion: 'fixed' });
      setScannedStats({
        files: scanResult.scannedFilesCount,
        lines: scanResult.totalLinesScanned,
      });
      setIssues(scanResult.issues);
      if (scanResult.issues.length > 0) {
        setSelectedIssueId(scanResult.issues[0].id);
      }
      setSelectedCategoryFilter('all');
      setComparison([]);
      setLatestRescan(null);
    navigateTo('result');
  };

  useEffect(() => () => rescanController.current?.abort(), [currentScreen]);

  const handleRescan = async () => {
    rescanController.current?.abort();
    const controller = new AbortController();
    rescanController.current = controller;
    if (scanMode === 'url' && new URL(rescanData.patchUrl).origin !== new URL(inputData.targetUrl).origin) throw new Error('처음 검사한 사이트의 주소를 입력해 주세요. 보안 연결 방식과 포트도 같아야 해요.');
    const result = await scanTarget({ ...inputData, inputTab: scanMode === 'api_demo' ? 'api_demo' : scanMode === 'url' ? 'url' : 'upload', apiDemoVersion: rescanData.apiDemoVersion || 'fixed', targetUrl: rescanData.patchUrl, files: rescanData.files || [] }, controller.signal);
    if (controller.signal.aborted) return;
    if (managedSystemId) {
      const rescanInput = { ...inputData, files: rescanData.files || [], targetUrl: rescanData.patchUrl };
      const example = portfolio.data.runs.find(r => r.systemId === managedSystemId && r.scannedAt === scanResult?.scannedAt)?.example;
      const saved = portfolio.commit(data => recordRun(data, managedSystemId, rescanInput, result, example));
      setPendingSave(saved ? null : { result, input: rescanInput, example });
    }
    setLatestRescan(result);
    setComparison(scanMode !== 'real_file' ? compareUrlScanResults(issues, result) : compareScanResults(issues, result.issues, result.scannedFileNames));
    navigateTo('comparison');
  };

  const startNewScan = (mode: 'url' | 'upload' | 'api_demo', example = false, system?: ManagedSystem) => {
    setManagedSystemId(system?.id || ''); setPendingSave(null);
    flowVersion.current++;
    rescanController.current?.abort();
    setInputData({ ...initialScanInput, inputTab: mode, apiDemoVersion: 'vulnerable', systemName: system?.name || (mode === 'api_demo' ? '가상 API 권한 검사' : initialScanInput.systemName), targetUrl: system?.url || (example ? window.location.origin + '/__fixtures/vulnerable' : ''), files: [] });
    setRescanData({ ...defaultRescanInput, files: [] });
    setSelectedCategoryFilter('all'); setIssues([]); setSelectedIssueId('');
    setScanResult(null); setComparison([]); setLatestRescan(null); setReportSource('initial');
    setScannedStats({ files: 0, lines: 0 });
    navigateTo(mode === 'api_demo' ? 'api_setup' : 'start');
  };
  const handleResetNewScan = () => startNewScan('upload');

  const currentIssue = issues.find((i) => i.id === selectedIssueId) || issues[0];

  if (currentScreen === 'intro') return <ScreenStory onEnter={() => navigateTo('home')} onStartScan={(mode = 'upload') => startNewScan(mode)} />;

  return (
    <div className="workspace-theme min-h-screen bg-work-canvas text-work-copy flex flex-col font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        hasResult={Boolean(scanResult)}
        onHome={() => navigateTo('home')}
        onPortfolio={() => openPortfolio()}
        onReturnToPortal={() => navigateTo('intro')}
        onNavigateToScan={handleResetNewScan}
        onViewResult={() => navigateTo(latestRescan ? 'comparison' : 'result')}
        onOpenWhatWeCheck={() => setIsWhatWeCheckOpen(true)}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-work-panel/95 backdrop-blur-md border-b border-work-line/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            aria-label="메뉴 열기" onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-work-copy hover:bg-work-soft transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-work-accent flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
            <button aria-label="ai-work-security 홈" onClick={() => navigateTo('home')} className="font-bold text-base text-work-title">ai-work-security</button>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-work-tint text-work-accent-copy font-semibold border border-work-accent-line/60">
              자가 진단
            </span>
          </div>
        </div>

        <button
          onClick={() => navigateTo('home')}
          className="text-xs font-semibold text-work-accent-copy bg-work-tint px-2.5 py-1 rounded-lg"
        >
          홈으로
        </button>
      </header>

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className="flex-1 min-w-0 lg:ml-72 flex flex-col min-h-screen">
        <header className="workspace-topbar hidden lg:flex"><div className="flex items-center gap-3 min-w-0">{currentScreen !== 'home' && <button className="inline-flex items-center gap-2 text-xs font-semibold text-work-muted hover:text-work-gold shrink-0" onClick={() => navigateTo('home')}><HomeIcon className="w-3.5 h-3.5" />홈으로</button>}<span className="workspace-gate-badge">ai-work-security 점검실</span><span className="text-[11px] text-work-muted hidden xl:inline">공개하기 전 작은 확인, 수정한 뒤 한 번 더.</span></div><button onClick={() => setIsHowToUseOpen(true)} className="text-[11px] text-work-copy hover:text-work-gold shrink-0">처음이라면 이용 방법</button></header>
        <main className="flex-1">
          {portfolio.error && <div role="alert" className="m-5 p-4 rounded-xl border border-work-danger-line bg-work-danger-bg text-work-danger-copy text-sm">{portfolio.error}{pendingSave && managedSystemId && <button className="block underline mt-2" onClick={() => { if (portfolio.commit(data => recordRun(data, managedSystemId, pendingSave.input, pendingSave.result, pendingSave.example))) setPendingSave(null); }}>검사 기록 다시 저장</button>}</div>}
          {currentScreen === 'portfolio' && <ScreenPortfolio key={portfolioVisit} initialSystemId={portfolioFocus} data={portfolio.data} commit={portfolio.commit} onScan={system => startNewScan(system.mode, false, system)} />}
          {currentScreen === 'home' && <section className="desk-management"><button onClick={() => openPortfolio()} className="management-home-link w-full text-left"><span><span className="text-[10px] tracking-widest text-work-gold font-mono">MANAGEMENT DESK</span><strong className="block text-lg text-work-title mt-1">우리 업무시스템은 지금 안전할까요?</strong><span className="block text-xs text-work-muted mt-2">시스템 등록 · 담당자와 조치 기한 · 검사 이력 · 임원 보고서</span></span><span className="text-work-gold text-sm font-bold shrink-0">현황판 열기 →</span></button></section>}
          {currentScreen === 'start' && <section className="scan-page scan-system-picker"><label className="text-xs text-work-muted block">검사 이력을 연결할 업무시스템<select aria-label="검사할 업무시스템" value={managedSystemId} onChange={e=>{ const system = portfolio.data.systems.find(s=>s.id===e.target.value); setManagedSystemId(e.target.value); if (system) setInputData(v=>({...v,systemName:system.name,targetUrl:system.url||v.targetUrl})); }} className="block mt-2 w-full border border-work-line rounded-xl p-3 text-sm"><option value="">등록 없이 일회성 검사 (이력 미보관)</option>{portfolio.data.systems.filter(s=>!s.archived).map(s=><option key={s.id} value={s.id}>{s.name} · {s.department||'부서 미지정'}{latestRun(portfolio.data,s.id)?' · 이전 검사와 비교':''}</option>)}</select></label><p className="text-xs text-work-faint mt-2">연결하면 규칙·발견 위치·설명만 이 브라우저에 남겨요. 코드 원문은 보관하지 않아요.</p></section>}
          {['result','detail','comparison'].includes(currentScreen) && managedSystemId && <section className="mx-5 mt-5 p-4 rounded-xl bg-work-tint border border-work-accent-line flex flex-wrap gap-3 justify-between items-center text-sm"><span>{pendingSave ? '검사 결과는 화면에 있지만 관리 이력 저장은 실패했어요.' : '업무시스템에 검사 이력을 저장했어요. 담당자와 조치 기한을 정해 보세요.'}</span><button onClick={()=>openPortfolio(managedSystemId)} className="text-work-gold font-bold">업무시스템 현황 열기 →</button></section>}
          {currentScreen === 'home' && <ScreenHome
            onReturnToPortal={() => navigateTo('intro')}
            onStart={mode => startNewScan(mode)}
            onOpenHowToUse={() => setIsHowToUseOpen(true)} onOpenWhatWeCheck={() => setIsWhatWeCheckOpen(true)}
            onViewResult={() => navigateTo(latestRescan ? 'comparison' : 'result')}
            onSaveResult={() => { setReportSource(latestRescan ? 'rescan' : 'initial'); setIsReportOpen(true); }}
            lastScan={scanResult ? { name: inputData.systemName || '내 프로젝트', count: (latestRescan || scanResult).issues.length, date: (latestRescan || scanResult).scannedAt } : undefined}
          />}
          {currentScreen === 'experience' && <ScreenExperience onHome={() => navigateTo('home')} onRealScan={() => startNewScan('upload')} />}
          {currentScreen === 'api_setup' && <ScreenApiDemo inputData={inputData} onChange={handleUpdateInputData} onStart={() => navigateTo('progress')} onHome={() => navigateTo('home')} />}
          {currentScreen === 'start' && (
            <ScreenStartScan
              inputData={inputData}
              onChangeInputData={handleUpdateInputData}
              onStartScan={() => navigateTo('progress')}
              onHome={() => navigateTo('home')}
            />
          )}

          {currentScreen === 'progress' && (
            <ScreenScanning
              inputData={inputData}
              onFinishScan={handleFinishScan}
              onCancelScan={() => navigateTo(inputData.inputTab === 'api_demo' ? 'api_setup' : 'start')}
            />
          )}

          {currentScreen === 'result' && (
            <ScreenScanResult
              systemName={inputData.systemName}
              targetUrl={inputData.targetUrl}
              issues={issues}
              selectedCategoryFilter={selectedCategoryFilter}
              scanMode={scanMode}
              scannedStats={scannedStats}
              scannedAt={scanResult?.scannedAt}
              ruleCount={scanResult?.ruleCount}
              inputData={inputData}
              scanMetadata={scanResult || undefined}
              onSelectCategoryFilter={(cat) => setSelectedCategoryFilter(cat)}
              onSelectIssue={(issue) => navigateTo('detail', issue.id)}
              onStartRescanInput={() => navigateTo('rescan_input')}
              onResetNewScan={handleResetNewScan}
              onOpenReportModal={() => { setReportSource('initial'); setIsReportOpen(true); }}
            />
          )}

          {currentScreen === 'detail' && !currentIssue && <div className="p-8"><p>검사 결과가 없습니다. 소스 파일을 선택해 검사를 시작해주세요.</p><button className="text-work-accent-copy mt-3" onClick={() => navigateTo('start')}>검사 시작 화면</button></div>}
          {currentScreen === 'detail' && currentIssue && (
            <ScreenIssueDetail
              key={currentIssue.id}
              issue={currentIssue}
              scanMode={scanMode}
              systemName={inputData.systemName}
              onBackToResults={() => navigateTo('result')}
              onGoToRescan={() => navigateTo('rescan_input')}
            />
          )}

          {currentScreen === 'rescan_input' && (
            <ScreenRescanInput
              systemName={inputData.systemName}
              previousIssues={issues}
              previousFileNames={inputData.files.map(file => file.name)}
              rescanData={rescanData}
              isUrl={scanMode === 'url'}
              isApiDemo={scanMode === 'api_demo'}
              onChangeRescanData={handleUpdateRescanData}
              onBackToResults={() => navigateTo('result')}
              onTriggerRescan={handleRescan}
            />
          )}

          {currentScreen === 'comparison' && (
            <ScreenRescanComparison
              systemName={inputData.systemName}
              entries={comparison}
              currentResult={latestRescan || undefined}
              onOpenCurrentReport={() => { setReportSource('rescan'); setIsReportOpen(true); }}
              onBackToResults={() => navigateTo('result')}
              onResetNewScan={handleResetNewScan}
              onGoToRescanSupplement={() => navigateTo('rescan_input')}
            />
          )}
        </main>

        {/* Global Clean Footer */}
        <footer className="mt-auto border-t border-work-line/80 bg-work-panel py-6 px-6 text-xs text-work-muted">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="font-semibold text-work-title">ai-work-security · 만든 서비스에 한 번 더 안심을</p>
              <p className="text-work-faint mt-0.5">
                자동 검사는 첫걸음이에요. 실제 문제인지 확인한 뒤 조치해 주세요.
              </p>
            </div>
            <div className="font-mono text-work-faint">
              © 2026 ai-work-security. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Informational Modal Panels */}
      <WhatWeCheckModal
        isOpen={isWhatWeCheckOpen}
        onClose={() => setIsWhatWeCheckOpen(false)}
      />
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onTryExample={() => startNewScan('url', true)}
      />
      <QuickGuideModal
        isOpen={isQuickGuideOpen}
        onClose={() => setIsQuickGuideOpen(false)}
      />
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        systemName={inputData.systemName}
        issues={reportSource === 'rescan' && latestRescan ? latestRescan.issues : issues}
        scannedAt={reportSource === 'rescan' && latestRescan ? latestRescan.scannedAt : scanResult?.scannedAt}
        scannedStats={reportSource === 'rescan' && latestRescan ? { files: latestRescan.scannedFilesCount, lines: latestRescan.totalLinesScanned } : scannedStats}
        ruleCount={reportSource === 'rescan' && latestRescan ? latestRescan.ruleCount : scanResult?.ruleCount}
        inputData={inputData}
        scanMetadata={(reportSource === 'rescan' ? latestRescan : scanResult) || undefined}
      />
    </div>
  );
}
