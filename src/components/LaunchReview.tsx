import React from 'react';
import { ClipboardCheck, CircleCheck, CircleHelp, AlertCircle, Download } from 'lucide-react';
import type { ScanResultPayload } from '../services/localSecurityScanner';
import type { ComparisonEntry } from '../types/security';
import { launchReview, summarySvg } from '../services/launchReview';
import { downloadText } from '../services/report';

export const LaunchReview: React.FC<{ result: ScanResultPayload; name: string; entries?: ComparisonEntry[] }> = ({ result, name, entries }) => <section className="rounded-2xl border border-work-line bg-work-panel overflow-hidden">
  <div className="p-5 sm:p-6 border-b border-work-line-soft flex gap-3 items-center"><span className="p-2.5 rounded-xl text-work-accent-copy bg-work-tint"><ClipboardCheck className="w-5 h-5" /></span><div><p className="text-[10px] font-bold text-work-accent-copy tracking-wider">BEFORE YOU LAUNCH</p><h2 className="font-bold text-lg text-work-title">공개 전, 여기까지 확인했어요</h2></div></div>
  <div className="grid sm:grid-cols-2">{launchReview(result, entries).map(item => { const Icon = item.status === 'checked' ? CircleCheck : item.status === 'action' ? AlertCircle : CircleHelp; return <div key={item.title} className="p-5 sm:p-6 border-b border-work-line-soft"><div className="flex gap-2 items-start"><Icon className={`w-4 h-4 shrink-0 mt-0.5 ${item.status === 'checked' ? 'text-work-success-copy' : item.status === 'action' ? 'text-work-danger-copy' : 'text-work-warn-copy'}`} /><h3 className="text-sm font-bold text-work-title">{item.title}</h3></div><p className="text-sm text-work-copy mt-3 font-semibold">{item.label}</p><p className="text-xs leading-relaxed text-work-muted mt-2">{item.detail}</p></div>; })}</div>
  <div className="bg-work-layer p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-work-title">한 장으로 남기는 점검 요약</h3><p className="text-xs text-work-muted mt-1">검사 시각·확인 범위·남은 일을 이미지로 저장해요.</p></div><button onClick={() => downloadText(summarySvg(name, result, entries), 'mundansok-summary.svg', 'image/svg+xml')} className="text-sm font-bold text-work-accent-copy bg-work-panel border border-work-accent-line rounded-xl px-4 py-3 inline-flex gap-2 items-center justify-center shrink-0"><Download className="w-4 h-4" />요약 카드 저장</button></div>
</section>;
