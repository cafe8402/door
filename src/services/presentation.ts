import type { SecurityIssue, ScanInputData } from '../types/security';

const titles: Record<string, string> = {
  '#VULN-SQL-15': '입력한 글이 자료를 다루는 명령으로 바뀔 수 있어요',
  '#VULN-SQL-16': '자료를 읽고 바꾸는 명령을 확인해야 해요',
  '#VULN-RLS-17': '자료를 볼 수 있는 사람을 제한하지 않는 설정이 있어요',
  '#VULN-RLS-18': '모든 자료를 허용하는 접근 정책이 있어요',
  '#VULN-PUBLIC-19': '방문자에게 보이는 설정에 비밀값이 있을 수 있어요',
  '#VULN-KEY-20': 'Stripe 서버 접속 키가 보여요',
  '#VULN-KEY-21': 'Stripe 웹훅 서명 비밀값이 보여요',
  '#VULN-KEY-22': 'Supabase 서버 비밀키가 보여요',
  '#VULN-KEY-23': 'Supabase 관리 권한 키가 보여요',
  '#VULN-KEY-24': 'Supabase 관리 토큰이 보여요',
  '#VULN-KEY-25': 'Slack 접속 토큰이 보여요',
  '#VULN-KEY-26': 'Slack 메시지 발송 주소가 보여요',
  '#VULN-KEY-27': 'GitLab 접속 토큰이 보여요',
  '#VULN-KEY-28': 'npm 패키지 배포 토큰이 보여요',
  '#VULN-KEY-29': 'SendGrid 메일 발송 키가 보여요',
  '#VULN-KEY-30': 'Azure 저장소 비밀값이 보여요',
  '#VULN-KEY-31': 'DB 비밀번호가 연결 주소에 들어 있어요',
  '#VULN-KEY-32': '로그인 토큰의 서명 비밀값이 보여요',
  '#VULN-KEY-33': 'Resend 메일 발송 키가 보여요',
  '#API-BOLA': '다른 사람의 비공개 자료를 볼 수 있어요',
  '#API-BFLA': '일반 사용자가 관리자 자료를 볼 수 있어요',
  '#API-AUTH': '로그인 없이 비공개 자료가 보여요',
  '#VULN-KEY-01': 'OpenAI 비밀키가 코드에 보여요',
  '#VULN-KEY-02': 'Claude 비밀키가 코드에 보여요',
  '#VULN-KEY-03': '클라우드 접속 키가 코드에 보여요',
  '#VULN-BROWSER-04': '브라우저에서 비밀키를 사용할 수 있어요',
  '#VULN-PII-05': '주민번호처럼 보이는 값이 있어요',
  '#VULN-CORS-06': '모든 웹사이트의 접근을 허용해요',
  '#VULN-EVAL-07': '문자열을 코드로 실행하는 기능이 있어요',
  '#VULN-KEY-08': 'Google 접속 키가 코드에 보여요',
  '#VULN-KEY-09': 'GitHub 접속 키가 코드에 보여요',
  '#VULN-KEY-10': '비밀 인증 파일의 내용이 보여요',
  '#VULN-EXEC-11': '컴퓨터 명령을 실행하는 코드가 있어요',
  '#VULN-XSS-12': '외부 내용을 화면에 바로 넣는 코드가 있어요',
  '#VULN-TLS-13': '서버 인증서 확인이 꺼져 있어요',
  '#VULN-AGENT-14': 'AI의 작업 확인을 건너뛰는 설정이 있어요',
  '#WEB-HTTP': '안전한 주소(HTTPS) 연결을 확인해 주세요',
  '#WEB-TLS': '사이트의 인증서를 확인하지 못했어요',
  '#WEB-CSP': '웹페이지의 코드 실행 제한을 확인해 주세요',
  '#WEB-HSTS': '안전한 연결을 유지하는 설정이 없어요',
  '#WEB-FRAME': '화면 퍼가기를 막는 설정이 보이지 않아요',
  '#WEB-NOSNIFF': '파일 종류를 확인하는 보호 설정이 없어요',
  '#WEB-REFERRER': '방문 주소의 공유 범위를 확인해 주세요',
  '#WEB-COOKIE': '웹사이트 저장 정보의 보호 설정을 확인해 주세요',
  '#WEB-MIXED': '보안 연결이 없는 자료를 불러와요',
  '#WEB-SERVER': '서버의 종류와 버전이 공개돼 있어요',
};
export const issueTitle = (issue: SecurityIssue): string => titles[issue.ruleId || ''] || issue.title;
export function issueExplanation(issue: SecurityIssue): string {
  if (issue.ruleId?.includes('-SQL-')) return '검색창 등에 적은 글을 자료를 읽거나 바꾸는 명령에 그대로 붙일 수 있는 코드예요. 입력한 글이 명령으로 실행되지 않도록 AI나 담당자에게 확인을 부탁하세요. 실제로 그렇게 쓰이는지는 추가 확인이 필요해요.';
  if (issue.ruleId?.includes('-RLS-')) return '자료마다 볼 수 있는 사람을 정하는 잠금장치를 느슨하게 만드는 설정이에요. 모든 사람이 봐도 되는 자료인지, 이 설정이 실제 서비스에 적용됐는지 확인해야 해요.';
  if (issue.ruleId?.includes('-PUBLIC-')) return '방문자의 컴퓨터에 전달되는 설정에 비밀값이 들어 있을 수 있어요. 서비스 접속용 비밀키라면 서버에서만 쓰도록 바꿔야 해요. 원래 공개해도 되는 키인지 먼저 확인하세요.';
  if (issue.ruleId?.startsWith('#API-')) return '허용되지 않은 테스트 계정의 응답에서 가상 비공개 자료를 확인했어요. 서버에서 누가 어떤 자료를 읽을 수 있는지 확인해야 해요. 실제 서비스에도 같은 문제가 있다는 뜻은 아니에요.';
  if (issue.ruleId?.includes('KEY')) return '접속 키는 서비스를 여는 비밀번호 같은 값이에요. 이 값이 실제로 쓰는 키이고 다른 사람에게 보인다면, 그 사람이 내 비용으로 서비스를 쓰거나 자료에 접근할 수 있어요. 실제 키인지 확인하고, 노출됐다면 새 키로 바꿔야 해요.';
  if (issue.ruleId === '#VULN-PII-05') return '개인을 알아볼 수 있는 정보일 수 있어요. 실제 정보인지 확인하고, 필요하지 않다면 지우거나 가려 주세요.';
  if (issue.ruleId === '#VULN-AGENT-14') return 'AI가 중요한 작업을 하기 전에 사람의 확인을 받는지 살펴봐 주세요.';
  if (['#VULN-EXEC-11', '#VULN-EVAL-07'].includes(issue.ruleId || '')) return '사용자나 AI가 만든 내용이 이 기능으로 전달되는지 확인해 주세요. 의도하지 않은 작업으로 이어질 수 있어요.';
  if (issue.ruleId?.startsWith('#WEB-')) return '사이트를 보호하는 설정을 확인할 부분이 있어요. 서비스의 용도에 맞는 설정인지 살펴보고 고쳐 주세요.';
  return '자동 검사에서 확인이 필요한 부분을 찾았어요. 실제로 쓰이는 코드인지 살펴보고, AI 수정 요청문을 활용해 보세요.';
}
export const severityLabel = { high: '먼저 확인', medium: '추가 확인', info: '참고' };
export const severityStyle = { high: 'bg-work-danger-bg text-work-danger-copy ring-work-danger-line', medium: 'bg-work-warn-bg text-work-warn-copy ring-work-warn-line', info: 'bg-work-info-bg text-work-info-copy ring-work-info-line' };
export const orderIssues = (issues: SecurityIssue[]) => [...issues].sort((a, b) => ({ high: 0, medium: 1, info: 2 }[a.severity] - { high: 0, medium: 1, info: 2 }[b.severity]));
export function issueLocation(issue: SecurityIssue): string {
  if (/\.ipynb$/i.test(issue.filePath || '')) return issue.location;
  if (issue.ruleId?.startsWith('#API-')) return issue.location;
  if (issue.filePath && !['document', 'transport'].includes(issue.filePath)) return `${issue.filePath.replace(/^script:/, '')}${issue.line ? ` · ${issue.line}번째 줄` : ''}`;
  return issue.location.replace(/\s*\(.*/, '');
}
export function simpleWarning(message: string): string {
  if (message.includes('로컬 더미')) return '예제 사이트는 보안 연결 검사를 제외해요. 실제 사이트에서는 함께 확인해요.';
  if (/HTTP (401|403)/.test(message)) return '사이트가 접근을 허용하지 않아 내용을 확인하지 못했어요.';
  if (/HTTP \d+/.test(message)) return '사이트가 정상 응답을 보내지 않아 일부 내용을 확인하지 못했어요.';
  if (message.includes('HTTP→HTTPS')) return '일반 주소에서 보안 주소로 이동하는지 확인하지 못했어요.';
  if (message.includes('JavaScript') && message.includes('3개')) return '연결된 코드 파일은 최대 3개까지 확인해요.';
  if (message.includes('외부 출처')) return '다른 웹사이트에서 불러오는 코드 파일은 검사하지 않아요.';
  if (message.includes('JavaScript')) return '연결된 코드 파일 일부를 읽지 못했어요. 해결 여부도 확인할 수 없어요.';
  return message;
}
export const manualReview = [
  '다른 사람의 자료에 접근할 수 있는지는 따로 확인해야 해요.',
  'AI가 파일을 지우거나 외부로 보내는 권한은 따로 확인해야 해요.',
  '문제가 발견되지 않아도 서비스 전체의 안전을 보장하지는 않아요.',
];
export function manualReviewForInput(input?: ScanInputData): string[] {
  const items = [manualReview[2]];
  if (input?.q1DataPrivacy !== 'no') items.push('개인정보와 회사 자료가 기록되거나 오래 보관되는지도 확인해 주세요.');
  if (input?.q2ExternalAi !== 'no') items.push('외부 AI나 다른 서비스로 어떤 자료를 보내는지 확인해 주세요.');
  if (input?.q3AuthControl !== 'no') items.push(manualReview[0]);
  if (input?.q4AiExecution !== 'no' || input?.serviceTypes.includes('ai-agent')) items.push(manualReview[1]);
  return items;
}
