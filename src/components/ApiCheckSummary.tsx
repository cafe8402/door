import React from 'react';
import { CheckCircle2, AlertCircle, CircleHelp, ChevronDown, FlaskConical } from 'lucide-react';
import type { ScanResultPayload } from '../services/localSecurityScanner';
const outcomeText = { passed: '예상대로 동작', failed: '권한 문제 발견', unverified: '확인 못함' };
const outcomeStyle = { passed: 'bg-work-success-bg text-work-success-copy', failed: 'bg-work-danger-bg text-work-danger-copy', unverified: 'bg-work-warn-bg text-work-warn-copy' };
export const ApiCheckSummary: React.FC<{ result: ScanResultPayload }> = ({ result }) => {
  const checks = result.apiChecks || [];
  const permissions = checks.filter(check => check.expected === '거절');
  const controls = checks.filter(check => check.expected === '허용');
  return <section className="rounded-2xl border border-work-accent-line bg-work-panel overflow-hidden">
    <div className="bg-work-tint/60 border-b border-work-accent-line p-5"><p className="inline-flex gap-1.5 items-center text-xs font-bold text-work-accent-copy"><FlaskConical className="w-4 h-4" />가상 API 권한 검사 · {result.demoVersion === 'fixed' ? '수정 후 예제' : '수정 전 예제'}</p><h2 className="text-base font-bold text-work-title mt-2">허용되지 않은 요청은 거절됐나요?</h2><p className="text-xs text-work-muted mt-2 leading-relaxed">응답 코드와 비공개 테스트 자료의 포함 여부를 함께 비교했어요. 실제 서비스의 검사 결과는 아니에요.</p></div>
    <div className="divide-y divide-work-line-soft">{permissions.map(check => <div key={check.id} className="px-5 py-4"><div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between"><h3 className="text-sm font-semibold text-work-title">{check.title}</h3><span className={`self-start shrink-0 rounded-md text-[10px] font-bold px-2 py-1 inline-flex items-center gap-1 ${outcomeStyle[check.outcome]}`}>{check.outcome === 'passed' ? <CheckCircle2 className="w-3 h-3" /> : check.outcome === 'failed' ? <AlertCircle className="w-3 h-3" /> : <CircleHelp className="w-3 h-3" />}{outcomeText[check.outcome]}</span></div><p className="text-xs text-work-muted leading-relaxed mt-2">{check.evidence}</p></div>)}</div>
    <details className="group border-t border-work-line-soft p-5"><summary className="text-xs font-semibold text-work-muted list-none cursor-pointer flex items-center justify-between">정상 접근도 함께 확인했어요<ChevronDown className="w-4 h-4 group-open:rotate-180" /></summary><div className="space-y-3 mt-3">{controls.map(check => <div key={check.id} className="text-xs"><p className="font-semibold text-work-copy">{check.title} · {outcomeText[check.outcome]}</p><p className="text-work-faint mt-1">{check.evidence}</p></div>)}</div></details>
  </section>;
};
