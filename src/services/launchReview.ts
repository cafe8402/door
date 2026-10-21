import { maskSecret } from './localSecurityScanner';
import type { ScanResultPayload } from './localSecurityScanner';
import type { ComparisonEntry } from '../types/security';
export const experienceStories = [
  { id: 'approval', name: '사내 결재 시스템', description: '비공개 기안, 허용된 임직원만 볼 수 있을까요?', resource: 'B의 비공개 기안', field: '검토 안건', value: '미공개 조직 개편 검토안', impact: '인사·예산 기안이 권한 없는 임직원에게 보일 수 있어요.', icon: 'approval' },
  { id: 'crm', name: '고객 관리 서비스', description: '우리 팀의 고객 자료, 담당자만 볼 수 있을까요?', resource: 'B의 고객 메모', field: '상담 내용', value: '다음 주 견적 상담 예정', impact: '다른 담당자의 비공개 고객 메모가 보일 수 있어요.', icon: 'users' },
  { id: 'chat', name: 'AI 업무 도우미', description: '사내 자료와 대화, 다른 계정에 보이지 않을까요?', resource: 'B의 대화 기록', field: '대화 주제', value: '미공개 업무 계획 검토', impact: '다른 임직원의 비공개 대화가 보일 수 있어요.', icon: 'chat' },
] as const;
export type ExperienceStory = typeof experienceStories[number];
export interface LaunchItem { title: string; status: 'action' | 'checked' | 'unknown'; label: string; detail: string; }
export function launchReview(result: ScanResultPayload, entries?: ComparisonEntry[]): LaunchItem[] {
  const keys = result.issues.filter(issue => /^#VULN-(?:KEY|PUBLIC)-/.test(issue.ruleId || ''));
  const keyChecked = result.mode === 'real_file' || Boolean(result.checks?.some(check => check.ruleId === '*source' && check.status === 'completed'));
  const permission = result.apiChecks?.filter(check => check.expected === '거절') || [];
  const controls = result.apiChecks?.filter(check => check.expected === '허용') || [];
  const complete = permission.length === 4 && controls.length === 3 && [...permission, ...controls].every(check => check.outcome === 'passed');
  return [
    { title: '비밀키가 공개됐나요?', status: keys.length ? 'action' : keyChecked ? 'checked' : 'unknown', label: keys.length ? `${keys.length}건 먼저 확인` : keyChecked ? '확인한 코드에서 미검출' : '아직 확인하지 않았어요', detail: '제출한 코드 또는 수집한 공개 코드의 패턴만 확인해요.' },
    { title: '다른 사람의 자료가 보이나요?', status: permission.some(check => check.outcome === 'failed') ? 'action' : complete ? 'checked' : 'unknown', label: permission.some(check => check.outcome === 'failed') ? '가상 예제에서 접근 문제 발견' : complete ? '가상 예제의 금지 요청 거절' : '실제 서비스에서 별도 확인', detail: result.mode === 'api_demo' ? '가상 API 4가지 금지 요청의 결과예요. 실제 서비스는 미검사예요.' : '주소·파일 검사로 계정별 접근 권한을 확정할 수 없어요.' },
    { title: '고친 뒤 다시 확인했나요?', status: entries ? entries.some(entry => entry.status !== 'resolved') ? 'action' : 'checked' : 'unknown', label: entries ? `${entries.filter(entry => entry.status === 'resolved').length}건 미검출 · ${entries.filter(entry => entry.status !== 'resolved').length}건 추가 확인` : '재검사가 필요해요', detail: '재검사에서 확인한 범위의 변화예요. 기능이 유지되는지도 확인하세요.' },
    { title: '배포 전에 남은 확인은요?', status: 'unknown', label: '실제 계정·운영 환경 확인', detail: 'DB의 현재 RLS·임직원별 실제 권한·자료 보관 정책은 따로 확인하세요.' },
  ];
}
export function repairPrompt(result: ScanResultPayload, name: string): string {
  return `[${name}]의 점검 결과를 바탕으로 수정 계획을 작성해 주세요.\n${result.mode === 'api_demo' ? '이 결과는 가상 API 실습이며 실제 프로젝트의 취약점을 확인한 것이 아닙니다. 실제 코드의 권한 정책을 확인해 주세요.\n' : ''}\n${result.issues.map(issue => issue.aiPrompt).join('\n\n---\n\n')}\n\n[수정 완료 조건]\n1. 본인 자료에 대한 정상 조회는 유지합니다.\n2. 타인 자료와 관리자 자료는 서버에서 권한을 확인합니다.\n3. 미로그인 조회를 거절하고, 응답에 비공개 자료를 넣지 않습니다.\n4. 변경한 파일, 이유, 테스트와 미확인 범위를 알려 주세요.\n5. 내 승인 없이 배포하거나 자료를 삭제하지 마세요.`;
}
const xml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
export function summarySvg(name: string, result: ScanResultPayload, entries?: ComparisonEntry[]): string {
  name = maskSecret(name);
  const rows = launchReview(result, entries);
  const remaining = entries?.filter(entry => entry.status !== 'resolved').length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="920" viewBox="0 0 1000 920"><rect width="1000" height="920" rx="32" fill="#f8faff"/><rect width="1000" height="240" rx="32" fill="#102944"/><g font-family="Arial, sans-serif"><text x="56" y="68" fill="#93c5fd" font-size="20">AI 업무도구 보안점검 · 업무시스템 점검 기록</text><text x="56" y="125" fill="white" font-size="34" font-weight="bold">${xml(name.length > 22 ? name.slice(0, 22) + '…' : name)}</text><text x="56" y="172" fill="#cbd5e1" font-size="18">${xml(new Date(result.scannedAt).toLocaleString('ko-KR'))}</text><text x="56" y="208" fill="#cbd5e1" font-size="18">${result.mode === 'api_demo' ? '가상 API 실습 · 실제 서비스 결과 아님' : '제출한 자료·공개 응답에서 확인한 범위의 기록'}</text><text x="56" y="294" fill="#0f172a" font-size="24" font-weight="bold">이번 발견 ${result.issues.length}건${entries ? ` · 재검사 미검출 ${entries.filter(entry => entry.status === 'resolved').length}건 · 추가 확인 ${remaining}건` : ''}</text>${rows.map((row, index) => `<rect x="40" y="${324 + index * 116}" width="920" height="100" rx="16" fill="white" stroke="#e2e8f0"/><circle cx="72" cy="${360 + index * 116}" r="7" fill="${row.status === 'checked' ? '#059669' : row.status === 'action' ? '#e11d48' : '#d97706'}"/><text x="94" y="${366 + index * 116}" font-size="20" fill="#0f172a" font-weight="bold">${xml(row.title)}</text><text x="64" y="${402 + index * 116}" font-size="18" fill="#475569">${xml(row.label)}</text>`).join('')}<text x="56" y="836" font-size="18" fill="#475569">자동 검사 결과는 안전 인증이 아닙니다.</text><text x="56" y="872" font-size="18" fill="#475569">실제 서비스의 계정별 권한과 운영 환경은 별도 확인이 필요합니다.</text></g></svg>`;
}
