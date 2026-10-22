import type { SecurityIssue, ScanInputData } from '../types/security';
import { maskSecret, RULE_COUNT } from './localSecurityScanner';
import type { ScanResultPayload } from './localSecurityScanner';
export interface ReportData {
  systemName: string;
  issues: SecurityIssue[];
  scannedAt?: string;
  scannedStats: { files: number; lines: number };
  ruleCount?: number;
  inputData?: ScanInputData;
  scanMetadata?: ScanResultPayload;
}
export function manualReviewItems(input?: ScanInputData): string[] {
  const items = ['인증·인가 우회(IDOR), 서버 내부 동작과 의존 라이브러리 CVE는 검사하지 않았습니다.'];
  if (input?.q1DataPrivacy !== 'no') items.push('개인정보·회사 자료의 수집 범위, 로그 마스킹과 보관 기간을 확인하세요.');
  if (input?.q2ExternalAi !== 'no') items.push('외부 AI·서비스로 보내는 데이터와 전송 동의·접근 권한을 확인하세요.');
  if (input?.q3AuthControl !== 'no') items.push('서로 다른 두 테스트 계정으로 타인 자료 접근이 거부되는지 검증하세요.');
  if (input?.q4AiExecution !== 'no' || input?.serviceTypes.includes('ai-agent')) items.push('AI 도구의 파일·셸·네트워크 권한, 승인 절차, 격리와 프롬프트 인젝션 방어를 검증하세요.');
  return items;
}
function redactReport<T>(value: T): T {
  if (typeof value === 'string') return maskSecret(value) as T;
  if (Array.isArray(value)) return value.map(redactReport) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactReport(item)])) as T;
  return value;
}
export function buildReport(data: ReportData) {
  return redactReport({
    schemaVersion: 1,
    systemName: maskSecret(data.systemName),
    scannedAt: data.scannedAt || null,
    interpretation: '탐지 내역은 확인 후보를 포함합니다. 패턴 발견이나 category=detected만으로 실제 취약점 또는 수정 필요가 확인된 것은 아닙니다.',
    scope: data.scanMetadata?.sourceReview?.scope || data.scanMetadata?.scope || '브라우저 로컬 정규식 분석. 패턴 일치이며 실제 악용 가능성이나 안전을 보증하지 않습니다.',
    sourceReview: data.scanMetadata?.sourceReview,
    apiChecks: data.scanMetadata?.apiChecks,
    demoVersion: data.scanMetadata?.demoVersion,
    mode: data.scanMetadata?.mode || 'real_file',
    targetUrl: data.scanMetadata?.targetUrl,
    finalUrl: data.scanMetadata?.finalUrl,
    checks: data.scanMetadata?.checks,
    warnings: data.scanMetadata?.warnings,
    redirects: data.scanMetadata?.redirects,
    tls: data.scanMetadata?.tls,
    ...data.scannedStats,
    ruleCount: data.ruleCount || RULE_COUNT,
    manualReview: manualReviewItems(data.inputData),
    issues: data.issues.map(issue => ({
      sourceAssessment: issue.sourceAssessment,
      verifiedControl: issue.verifiedControl,
      ruleId: issue.ruleId, severity: issue.severity, category: issue.category,
      title: maskSecret(issue.sourceAssessment?.title || issue.title), location: maskSecret(issue.location),
      evidence: maskSecret(issue.codeSnippet), description: maskSecret(issue.sourceAssessment?.reason || issue.shortDescription),
      remediation: issue.sourceAssessment ? [{step:'1', title:issue.sourceAssessment.status === 'actionable' ? '바꿀 내용' : '먼저 확인', desc:issue.sourceAssessment.change || issue.sourceAssessment.reason, badge:'문맥 분석'}] : issue.resolutionSteps, aiPrompt: maskSecret(issue.sourceAssessment ? `${issue.sourceAssessment.title || issue.title}\n확인한 사실: ${issue.sourceAssessment.reason}\n위치: ${issue.location}\n${issue.sourceAssessment.change || '실제 사용 여부와 위험 근거를 확인해주세요. 근거 없이 코드를 변경하지 마세요.'}\n비밀값과 개인정보를 대화에 출력하지 마세요.` : issue.aiPrompt),
    })),
  });
}
export function reportMarkdown(data: ReportData): string {
  const report = buildReport(data);
  return `# ai-work-security 보고서\n\n대상: ${report.systemName}\n\n검사 시각: ${report.scannedAt || '미실행'}\n\n${report.files}개 ${report.mode === 'api_demo' ? '조회 요청' : report.mode === 'url' ? '리소스' : '파일'} · ${report.lines}줄 · ${report.ruleCount}개 규칙 · ${report.issues.length}건 발견\n\n${report.scope}\n\n${report.mode !== 'real_file' ? `대상: ${report.targetUrl}\n\n최종 응답: ${report.finalUrl}\n\n미확인·제한 사항:\n\n${(report.warnings || []).map(item => '- ' + item).join('\n') || '- 별도 경고 없음'}\n\n수행 항목:\n\n${(report.checks || []).map(check => `- ${check.status}: ${check.ruleId} (${check.resource}) — ${check.detail}`).join('\n')}\n\n` : ''}${report.apiChecks ? `## 가상 API 실습 결과\n\n예제: ${report.demoVersion === 'fixed' ? '수정 후' : '수정 전'}\n\n실제 서비스의 검사 결과가 아닙니다.\n\n${report.apiChecks.map(check => `- ${check.title}: ${check.outcome === 'passed' ? '예상대로 동작' : check.outcome === 'failed' ? '권한 문제 발견' : '확인 못함'} / ${check.evidence}`).join('\n')}\n\n` : ''}## 수동 확인 항목\n\n${report.manualReview.map(item => `- ${item}`).join('\n')}\n\n## 탐지 내역\n\n${report.issues.map(issue => `### ${issue.title}\n\n- 위험도: ${issue.severity}\n- 위치: ${issue.location}\n- 설명: ${issue.description}\n\n증거:\n\n\`\`\`text\n${issue.evidence.replace(/\`/g, 'ˋ')}\n\`\`\`\n\n조치:\n\n${issue.remediation.map(step => `- ${step.title}: ${step.desc}`).join('\n')}\n\nAI 수정 요청문:\n\n\`\`\`text\n${issue.aiPrompt.replace(/\`/g, 'ˋ')}\n\`\`\``).join('\n\n') || '검사한 규칙에서 위험 패턴을 찾지 못했습니다.'}\n`;
}
export function downloadText(content: string, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportHtml(data: ReportData): string {
  const report = buildReport(data);
  const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const label = { high: '먼저 확인', medium: '추가 확인', info: '참고' };
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>ai-work-security 검사 보고서</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#182a40;font:14px/1.7 system-ui,sans-serif}main{max-width:900px;margin:40px auto;background:white;padding:44px;border-radius:20px}header{border-bottom:2px solid #e8edf5;padding-bottom:24px}h1{font-size:28px;line-height:1.4;margin:8px 0}h2{font-size:18px;margin-top:30px}.brand{color:#2563eb;font-weight:700}small,.muted{color:#65748a}.summary{display:flex;gap:12px;margin:24px 0}.summary div{flex:1;background:#f4f7fb;padding:18px;border-radius:12px}.summary strong{display:block;font-size:25px}article{border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:14px 0;break-inside:avoid}h3{font-size:16px;margin:8px 0}.badge{font-size:11px;font-weight:700;background:#eef4ff;padding:4px 8px;border-radius:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f8fb;border-radius:8px;padding:14px;font:12px/1.7 monospace}.note{background:#fff9e9;border-radius:12px;padding:16px;margin:20px 0}li{margin:6px 0}@media(max-width:600px){main{margin:0;padding:24px;border-radius:0}.summary{gap:6px}.summary div{padding:12px}}@media print{body{background:white}main{margin:0;padding:0;max-width:none}article{break-inside:avoid}}@page{margin:18mm}
  </style></head><body><main><header><span class="brand">ai-work-security · 검사 보고서</span><h1>${escape(report.systemName || '내 프로젝트')}</h1><p class="muted">${escape(report.scannedAt ? new Date(report.scannedAt).toLocaleString('ko-KR') : '검사 시각 없음')} · ${report.mode === 'api_demo' ? '가상 API 권한 실습 (실제 서비스 결과 아님)' : report.mode === 'url' ? '웹사이트 주소 검사' : '코드 파일 검사'}</p></header><section class="summary"><div>${report.mode === 'api_demo' ? '실행한 조회 요청' : '살펴본 자료'}<strong>${report.files}개</strong></div><div>확인할 항목<strong>${report.issues.length}개</strong></div><div>먼저 확인<strong>${report.issues.filter(issue => issue.severity === 'high').length}개</strong></div></section>${report.finalUrl ? `<p>검사 주소: ${escape(report.finalUrl)}</p>` : ''}<div class="note">자동 검사로 찾은 단서예요. 실제 문제인지 확인한 뒤 조치해 주세요.${report.warnings?.length ? `<ul>${report.warnings.map(warning => `<li>${escape(warning)}</li>`).join('')}</ul>` : ''}</div>${report.apiChecks ? `<h2>가상 API 권한 비교 · ${report.demoVersion === 'fixed' ? '수정 후 예제' : '수정 전 예제'}</h2><ul>${report.apiChecks.map(check => `<li><strong>${escape(check.title)}</strong> — ${check.outcome === 'passed' ? '예상대로 동작' : check.outcome === 'failed' ? '권한 문제 발견' : '확인 못함'}<p>${escape(check.evidence)}</p></li>`).join('')}</ul>` : ''}<h2>확인할 항목</h2>${report.issues.map((issue, index) => `<article><span class="badge">${index + 1} · ${label[issue.severity]}</span><h3>${escape(issue.title)}</h3><p class="muted">${escape(issue.location)}</p><p>${escape(issue.description)}</p><pre>${escape(issue.evidence)}</pre><h4>어떻게 고치나요?</h4><ul>${issue.remediation.map(step => `<li><strong>${escape(step.title)}</strong> — ${escape(step.desc)}</li>`).join('')}</ul><h4>AI에게 전달할 수정 요청</h4><pre>${escape(issue.aiPrompt)}</pre></article>`).join('') || '<p>이번 검사에서는 의심 항목을 찾지 못했어요. 서비스 전체의 안전을 보장하는 결과는 아니에요.</p>'}<h2>직접 확인할 부분</h2><ul>${report.manualReview.map(item => `<li>${escape(item)}</li>`).join('')}</ul><details><summary>자세한 검사 범위</summary><p>${escape(report.scope)}</p><ul>${(report.checks || []).map(check => `<li>${check.status === 'completed' ? '확인' : '미확인'} · ${escape(check.ruleId)} · ${escape(check.detail)}</li>`).join('')}</ul></details><p class="muted">ai-work-security · 이 보고서는 검사 당시 제공된 자료와 공개된 응답을 기준으로 만들었어요.</p></main></body></html>`;
}
