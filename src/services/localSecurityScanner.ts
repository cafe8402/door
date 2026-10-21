import { analyzeSourceContext } from './sourceAnalysis.mjs';
import type { SecurityIssue, ScanInputData, ComparisonEntry } from '../types/security.ts';

export interface ScanResultPayload {
  sourceReview?: ReturnType<typeof analyzeSourceContext>;
  mode: 'real_file' | 'url' | 'api_demo';
  demoVersion?: 'vulnerable' | 'fixed';
  apiChecks?: { id: string; title: string; actor: string; resource: string; expected: string; actualStatus: number | null; outcome: 'passed' | 'failed' | 'unverified'; evidence: string }[];
  scannedFilesCount: number;
  totalLinesScanned: number;
  issues: SecurityIssue[];
  cleanCheckCount: number;
  scannedFileNames: string[];
  scannedAt: string;
  ruleCount: number;
  checks?: { ruleId: string; resource: string; status: 'completed' | 'unverified'; detail: string }[];
  warnings?: string[];
  scope?: string;
  targetUrl?: string;
  finalUrl?: string;
  redirects?: { from: string; to: string; status: number }[];
  tls?: { validTo?: string; protocol?: string } | null;
  requestsMade?: number;
  bytesRead?: number;
}

interface PatternRule {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'info';
  category: 'detected' | 'suspected';
  cwe: string;
  regex: RegExp;
  acceptMatch?: (match: RegExpMatchArray) => boolean;
  whatIsIssue: string;
  impactDescription: string;
  resolutionGuide: { step: string; title: string; desc: string; badge: string }[];
  aiPromptTemplate: (filename: string, line: number, snippet: string) => string;
}

const SECURITY_RULES: PatternRule[] = [
  {
    id: '#VULN-KEY-01',
    title: 'OpenAI Secret API Key 노출',
    severity: 'high',
    category: 'detected',
    cwe: 'CWE-798: 하드코딩된 암호키 탐지',
    regex: /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}/g,
    whatIsIssue: '소스코드 또는 환경 파일 내에 OpenAI Secret API Key 문자열이 평문으로 직접 작성되어 있습니다.',
    impactDescription: '해당 파일이 Git 저장소나 클라이언트 브라우저 번들에 포함될 경우, 제3자가 사내 계정 크레딧을 무단 소진하거나 데이터에 접근할 수 있습니다.',
    resolutionGuide: [
      { step: '01', title: '노출된 키 즉시 폐기', desc: 'OpenAI 대시보드에서 해당 키를 Revoke(폐기)하고 재발급합니다.', badge: '즉각 조치' },
      { step: '02', title: '환경변수(.env) 분리', desc: 'process.env.OPENAI_API_KEY 형태로 분리하고 .gitignore에 등록합니다.', badge: '시크릿 격리' },
      { step: '03', title: '서버 프록시 경유', desc: '클라이언트에서 직접 호출하지 않고 백엔드 API Route를 경유하도록 변경합니다.', badge: '아키텍처 전환' },
      { step: '04', title: '빌드 산출물 확인', desc: '빌드된 dist 번들에 키 문자열이 포함되지 않는지 최종 점검합니다.', badge: '무결성 검증' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`우리 프로젝트의 [${filename}] 파일 ${line}번째 줄에서 OpenAI Secret API Key 노출 취약점(#VULN-KEY-01)이 발견되었습니다.

[취약 코드 구간]
${snippet}

다음 요구사항에 맞춰 코드를 안전하게 리팩토링해주세요:
1. 하드코딩된 Secret Key를 완전히 제거하고, 오직 서버 사이드 환경변수(process.env.OPENAI_API_KEY)에서만 로드하도록 수정해주세요.
2. 클라이언트 브라우저 코드나 공개 번들링 설정에 노출되지 않도록 백엔드 프록시 API(예: Next.js API Route 또는 Express 라우터)를 신설해주세요.
3. 이 파일과 관련 설정 파일에 .gitignore가 올바르게 적용되어 있는지 점검하는 가이드를 함께 작성해주세요.`,
  },
  {
    id: '#VULN-KEY-02',
    title: 'Anthropic Claude API Key 노출',
    severity: 'high',
    category: 'detected',
    cwe: 'CWE-798: 하드코딩된 암호키 탐지',
    regex: /(sk-ant-[A-Za-z0-9_-]{20,})/g,
    whatIsIssue: 'Anthropic Claude API Secret Key가 소스코드에 하드코딩되어 있습니다.',
    impactDescription: '외부 침해 시 Claude API 사용량 급증 및 계정 정지 위험이 발생합니다.',
    resolutionGuide: [
      { step: '01', title: 'Anthropic 키 재발급', desc: 'Anthropic 콘솔에서 기존 노출 키를 삭제합니다.', badge: '즉각 폐기' },
      { step: '02', title: '서버 환경변수 보관', desc: 'ANTHROPIC_API_KEY 환경변수로 이동합니다.', badge: '환경변수' },
      { step: '03', title: '백엔드 프록시 구축', desc: '서버 엔드포인트에서만 Claude SDK를 인스턴스화합니다.', badge: '백엔드 격리' },
      { step: '04', title: '호출 제한(Rate Limit)', desc: '프록시 엔드포인트에 비정상 요청 차단 미들웨어를 적용합니다.', badge: '보안 통제' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄의 Anthropic API Key 하드코딩 취약점을 해결해주세요.

[발견 코드]
${snippet}

1. 키 문자열을 제거하고 process.env.ANTHROPIC_API_KEY를 참조하도록 수정해주세요.
2. 브라우저에서 직접 Anthropic API를 호출하지 않도록 서버 프록시 핸들러를 작성해주세요.`,
  },
  {
    id: '#VULN-KEY-03',
    title: 'AWS 자격증명 Access Key 노출',
    severity: 'high',
    category: 'detected',
    cwe: 'CWE-798: 하드코딩된 암호키 탐지',
    regex: /((?:AKIA|ASIA)[0-9A-Z]{16})/g,
    whatIsIssue: 'AWS IAM 사용자의 Access Key ID(AKIA...)가 소스코드에 포함되어 있습니다.',
    impactDescription: '공격자가 AWS 리소스(S3, EC2, Bedrock 등)에 무단 접근하여 대규모 과금이나 데이터 탈취를 유발할 수 있습니다.',
    resolutionGuide: [
      { step: '01', title: 'IAM 키 즉각 비활성화', desc: 'AWS IAM 콘솔에서 노출된 Access Key를 비활성화(Deactivate)합니다.', badge: '즉각 조치' },
      { step: '02', title: 'IAM Role(역할) 적용', desc: '하드코딩 키 대신 인스턴스/컨테이너 IAM Role을 사용합니다.', badge: '권장 아키텍처' },
      { step: '03', title: '최소 권한 정책 부여', desc: '해당 서비스에 필요한 최소한의 IAM 정책만 허용합니다.', badge: '최소 권한' },
      { step: '04', title: 'Git 히스토리 정리', desc: 'git-filter-repo 등을 사용하여 커밋 기록에서도 키를 제거합니다.', badge: '기록 영구 삭제' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄에서 AWS Access Key(AKIA...)가 검출되었습니다.

[취약 코드]
${snippet}

AWS 보안 모범 규준에 맞춰 코드를 리팩토링해주세요:
1. 소스코드 내 AWS 자격증명 하드코딩을 제거하고 AWS SDK의 기본 자격증명 공급자 체인(Default Credential Provider Chain)을 활용하도록 수정해주세요.
2. 클라우드 런타임에서 IAM Role 또는 환경변수(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)를 사용하는 모범 설정 예시를 제공해주세요.`,
  },
  {
    id: '#VULN-BROWSER-04',
    title: '브라우저 직접 호출 허용 (dangerouslyAllowBrowser)',
    severity: 'high',
    category: 'detected',
    cwe: 'CWE-306: 중요 기능에 대한 누락된 인증',
    regex: /(dangerouslyAllowBrowser\s*:\s*true)/g,
    whatIsIssue: 'OpenAI 등 AI SDK 클라이언트 인스턴스에서 dangerouslyAllowBrowser: true 옵션이 활성화되어 있습니다.',
    impactDescription: '이 옵션은 브라우저 번들 내부에서 Secret Key를 사용하는 것을 강제 허용하므로, 사용자의 웹 브라우저에 비밀키가 고스란히 유출됩니다.',
    resolutionGuide: [
      { step: '01', title: '옵션 제거', desc: 'dangerouslyAllowBrowser 옵션을 비활성화합니다.', badge: '즉시 제거' },
      { step: '02', title: '서버 Route로 로직 이전', desc: 'AI SDK 호출부를 백엔드(Next.js API route 또는 Express)로 옮깁니다.', badge: '아키텍처 전환' },
      { step: '03', title: '스트리밍 응답 유지', desc: '프론트엔드와 백엔드 간 SSE(Server-Sent Events) 스트리밍을 연결합니다.', badge: '기능 보존' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄에서 dangerouslyAllowBrowser: true 설정이 확인되었습니다.

[취약 코드]
${snippet}

프론트엔드에서 dangerouslyAllowBrowser를 끄고, AI 호출 로직을 백엔드 API 엔드포인트(/api/chat)로 안전하게 격리 이전하는 전체 코드를 작성해주세요.`,
  },
  {
    id: '#VULN-PII-05',
    title: '대한민국 주민등록번호 평문 포함 의심',
    severity: 'medium',
    category: 'suspected',
    cwe: 'CWE-359: 민감한 개인정보(PII)의 부적절한 노출',
    regex: /(\b\d{6}-[1-8]\d{6}\b)/g,
    whatIsIssue: '소스코드, 테스트 목데이터 또는 로그 예시에 주민등록번호 형식의 번호가 평문으로 포함되어 있습니다.',
    impactDescription: '실제 개인식별정보라면 불필요한 노출과 유출 위험이 있습니다. 테스트 데이터인지 확인하세요.',
    resolutionGuide: [
      { step: '01', title: '테스트 데이터 가명화', desc: '실제 형식의 주민번호 대신 임의 마스킹 텍스트(예: 900101-1******)로 교체합니다.', badge: '가명화' },
      { step: '02', title: '로깅 필터 삽입', desc: '로거 출력 단계에서 주민번호 정규식을 감지하여 마스킹하는 인터셉터를 구축합니다.', badge: '자동 마스킹' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄에서 주민등록번호 패턴이 감지되었습니다.

[코드 구간]
${snippet}

개인정보보호 규정을 준수하도록 해당 데이터를 마스킹 처리하고, 향후 입력값에서 주민번호가 로그에 남지 않도록 정규식 마스킹 유틸리티 함수를 구현해주세요.`,
  },
  {
    id: '#VULN-CORS-06',
    title: '와일드카드(*) 전체 허용 CORS 설정',
    severity: 'medium',
    category: 'suspected',
    cwe: 'CWE-942: 과도하게 허용적인 CORS 정책',
    regex: /cors\(\s*\{[^}]{0,1000}?\borigin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*['"]|(?:setHeader|header|set|append)\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]|\b(?:allow_origins|CORS_ALLOWED_ORIGINS)\s*[:=]\s*\[\s*['"]\*['"]\s*\]|\bCORS_ALLOW_ALL_ORIGINS\s*=\s*True|\b(?:origins|origin)\s*[:=]\s*['"]\*['"]|add_header\s+Access-Control-Allow-Origin\s+["']?\*["']?/gi,
    whatIsIssue: 'CORS 정책에서 모든 출처(Origin: *)를 허용하도록 설정되어 있습니다.',
    impactDescription: '다른 출처에서 응답을 읽을 수 있는 범위가 넓어집니다. 공개 API인지, 인증 및 자격증명 설정이 적절한지 함께 확인하세요.',
    resolutionGuide: [
      { step: '01', title: '허용 도메인 화이트리스트', desc: '신뢰할 수 있는 특정 도메인(예: https://myservice.com)만 허용합니다.', badge: '화이트리스트' },
      { step: '02', title: '환경별 분리', desc: '로컬 개발(localhost)과 프로덕션 환경의 CORS 설정을 환경변수로 분리합니다.', badge: '환경 격리' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄에서 전체 도메인을 허용하는 와일드카드(*) CORS 설정이 발견되었습니다.

[코드 구간]
${snippet}

보안을 위해 허용된 신뢰할 수 있는 도메인 목록만 배열로 관리하여 검증하는 안전한 CORS 미들웨어 코드로 리팩토링해주세요.`,
  },
  {
    id: '#VULN-EVAL-07',
    title: '동적 코드 실행 함수(eval / Function) 사용',
    severity: 'high',
    category: 'detected',
    cwe: 'CWE-95: 코드 인젝션(eval)',
    regex: /(\beval\s*\(|new\s+Function\s*\()/g,
    whatIsIssue: '동적으로 문자열을 코드로 변환해 실행하는 eval() 또는 new Function() 구문이 포함되어 있습니다.',
    impactDescription: 'AI 응답이나 사용자 입력값이 전달될 경우 임의 코드 실행(RCE) 공격에 노출될 수 있습니다.',
    resolutionGuide: [
      { step: '01', title: 'eval() 전면 제거', desc: 'eval 대신 JSON.parse() 또는 안전한 정적 매퍼를 사용합니다.', badge: '코드 리팩토링' },
      { step: '02', title: '샌드박스 격리', desc: '동적 수식 계산이 필수적인 경우 제한된 수식 파서 라이브러리를 사용합니다.', badge: '격리 실행' },
    ],
    aiPromptTemplate: (filename, line, snippet) => 
`[${filename}] ${line}번째 줄에서 위험한 eval/동적 코드 실행 구문이 감지되었습니다.

[코드 구간]
${snippet}

eval() 함수를 완전히 제거하고 안전한 정적 데이터 파싱 또는 안전한 계산 라이브러리를 사용하는 방식으로 코드를 교체해주세요.`,
  },
];

// Redact whole blocks before taking line-sized evidence, including truncated keys.
const privateKeyPattern = /-----BEGIN (?:(?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----[\s\S]*?(?:-----END [A-Z ]+-----|$)/g;
const secretAssignmentPattern = /(\b[A-Za-z_][\w.-]*(?:KEY|SECRET|PASSWORD|PASSWD|TOKEN|CREDENTIAL)[\w.-]*|\b(?:key|secret|password|passwd|token|authorization))(["']?\s*[:=]\s*)("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`[^`]*`|[^\s,;}]+)/gi;
const additionalRules: { id: string; title: string; regex: RegExp; cwe: string; severity: PatternRule['severity']; advice: string }[] = [
  { id: '#VULN-KEY-08', title: 'Google API 키 형식 노출', regex: /\bAIza[A-Za-z0-9_-]{35}\b/g, cwe: 'CWE-798', severity: 'high', advice: '키의 사용처와 도메인·API 제한을 확인하고, 비밀키라면 폐기 후 서버 환경변수로 이전하세요.' },
  { id: '#VULN-KEY-09', title: 'GitHub 토큰 형식 노출', regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, cwe: 'CWE-798', severity: 'high', advice: '토큰을 폐기하고 최소 권한과 짧은 유효기간으로 재발급하세요.' },
  { id: '#VULN-KEY-10', title: '개인키 파일 내용 포함', regex: privateKeyPattern, cwe: 'CWE-321', severity: 'high', advice: '개인키를 소스에서 제거하고 키를 교체한 뒤 비밀 관리 저장소를 사용하세요. 암호화된 개인키도 공개 저장소에 두지 마세요.' },
  { id: '#VULN-EXEC-11', title: '셸 명령 실행 구문', regex: /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|os\.system)\s*\(|\bshell\s*[:=]\s*(?:true|True)/g, cwe: 'CWE-78', severity: 'high', advice: '사용자·AI 입력이 명령으로 이어지는지 확인하세요. 실행 파일과 인수를 허용 목록으로 제한하고 셸 확장과 과도한 권한을 차단하세요.' },
  { id: '#VULN-XSS-12', title: 'HTML 직접 삽입 구문', regex: /\bdangerouslySetInnerHTML\s*=|\.innerHTML\s*=/g, cwe: 'CWE-79', severity: 'medium', advice: '외부 입력과 AI 응답이 전달되는지 확인하고, 텍스트 렌더링 또는 검증된 HTML 정화 처리를 적용하세요.' },
  { id: '#VULN-TLS-13', title: 'TLS 인증서 검증 비활성화', regex: /\brejectUnauthorized\s*:\s*false|\bverify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*['"]?\s*[:=]\s*['"]?0/g, cwe: 'CWE-295', severity: 'high', advice: '인증서 검증을 활성화하고 신뢰할 수 있는 CA와 인증서 체인을 설정하세요.' },
  { id: '#VULN-AGENT-14', title: '에이전트 승인 절차 우회 설정', regex: /--dangerously-skip-permissions|--dangerously-bypass-approvals-and-sandbox|\bbypassPermissions\b|\bapproval_policy\s*[:=]\s*['"]never['"]/g, cwe: 'CWE-862', severity: 'high', advice: '실행 환경과 승인 정책을 검토하세요. 파일·네트워크·명령 권한을 최소화하고 파괴적 작업에 사람의 승인을 요구하세요.' },
];
additionalRules.forEach(rule => SECURITY_RULES.push({
  ...rule,
  category: 'suspected',
  whatIsIssue: `${rule.title} 패턴이 있습니다. 코드 문맥과 실제 사용 경로를 확인해야 합니다.`,
  impactDescription: '외부 입력이나 AI 출력과 연결되면 정보 노출 또는 허용 범위를 넘는 실행으로 이어질 수 있습니다.',
  resolutionGuide: [{ step: '01', title: '입력과 권한 흐름 검토', desc: rule.advice, badge: '검토 필요' }],
  aiPromptTemplate: (filename, line, snippet) => `[${filename}] ${line}줄의 ${rule.title} 패턴을 검토해주세요.\n\n${snippet}\n\n${rule.advice}\n실제 데이터 흐름과 기존 동작을 확인한 후 최소 범위로 수정하고 검증 방법을 알려주세요.`,
}));

// Focused signatures maintained locally, not the complete Gitleaks ruleset.
// Public Stripe / Supabase keys are deliberately excluded from secret findings.
function jwtRole(token: string): string | undefined {
  try { const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(part)).role; } catch { return undefined; }
}
const expandedRules: { id: string; title: string; regex: RegExp; advice: string; impact: string; cwe?: string; acceptMatch?: PatternRule['acceptMatch']; severity?: PatternRule['severity'] }[] = [
  { id: '#VULN-KEY-34', title: 'AWS 비밀키 직접 작성 의심', regex: /\b[A-Z0-9_]*SECRET_ACCESS_KEY["']?\s*[:=]\s*["']?[A-Za-z0-9+/]{40}={0,2}/gi, advice: '실제 키라면 교체하고 코드 대신 서버의 비밀 저장소에서 읽으세요.', impact: '함께 노출된 접근 키와 결합하면 AWS 계정 권한을 사용할 수 있습니다.' },
  { id: '#VULN-KEY-35', title: '코드에 직접 적은 비밀번호 의심', regex: /\b(?:password|passwd|[A-Z0-9_]+_PASSWORD)["']?\s*[:=]\s*(["'])[^\r\n"']{4,}\1/gi, acceptMatch: match => !/\$\{|\{\{|process\.env|os\.environ/.test(match[0]), advice: '예제 값인지 확인하세요. 실제 비밀번호라면 교체하고 서버의 비밀 저장소로 옮기세요.', impact: '실제 로그인에 사용하는 값이면 계정에 접근할 수 있습니다. 예제 문자열은 실제 비밀번호가 아닐 수 있습니다.' },
  { id: '#VULN-KEY-36', title: 'Hugging Face 토큰 노출 의심', regex: /\bhf_[A-Za-z0-9]{20,}\b/g, advice: '실제 토큰이라면 교체하고 필요한 권한만 부여해 서버에서 보관하세요.', impact: '토큰 권한에 따라 비공개 모델이나 자료에 접근할 수 있습니다.' },
  { id: '#VULN-FIREBASE-37', title: '누구나 접근할 수 있는 Firebase 규칙', regex: /\ballow\s+(?:read|write|create|update|delete|get|list)(?:\s*,\s*(?:read|write|create|update|delete|get|list))*\s*:\s*if\s+true\s*;/g, cwe: 'CWE-862', advice: '공개 자료인지 확인하세요. 업무 자료라면 로그인 사용자와 자료 소유자를 확인하는 조건을 추가하고 배포된 규칙도 검사하세요.', impact: '해당 경로에 누구나 접근할 수 있는 규칙입니다. 공개 자료에 의도적으로 적용했을 수도 있습니다.' },
  { id: '#VULN-SQL-15', title: '입력값을 이어 붙이는 SQL 문장', regex: /f["'][^\r\n]{0,800}\{[^}\r\n]{1,160}\}[^\r\n]{0,160}|`[^`]{0,1200}\$\{[^}]{1,160}\}[^`]{0,300}`|["'][^\r\n]{0,800}?["']\s*(?:\+|%|\.format\s*\()/g, acceptMatch: match => !/\$(?:queryRaw|executeRaw)\s*$/.test((match.input || '').slice(Math.max(0, (match.index || 0) - 40), match.index || 0)) && /\b(?:select\b[\s\S]*\bfrom|insert\s+into|update\b[\s\S]*\bset|delete\s+from)\b/i.test(match[0]), cwe: 'CWE-89', advice: '사용자 입력이 SQL로 이어지는지 확인하고 값은 파라미터 바인딩($1, ?, 이름 매개변수)으로 전달하세요. 테이블·컬럼 이름은 허용 목록으로 제한하세요.', impact: '입력값이 쿼리 구조를 바꾸면 사내 데이터의 무단 조회·변경으로 이어질 수 있습니다.' },
  { id: '#VULN-SQL-16', title: '안전하지 않은 원시 SQL 실행 함수', regex: /\$?(?:queryRawUnsafe|executeRawUnsafe)\s*\(/g, cwe: 'CWE-89', advice: '원시 SQL에 외부 입력을 합치는지 확인하고 안전한 태그 템플릿이나 파라미터 바인딩을 사용하세요.', impact: '문자열 SQL에 입력값이 섞이면 조회 권한을 넘어선 데이터 접근이 발생할 수 있습니다.' },
  { id: '#VULN-RLS-17', title: '데이터 행 접근 제한(RLS) 끄기', regex: /\balter\s+table\s+[^;]{1,240}?\bdisable\s+row\s+level\s+security\b|\b(?:set\s+row_security\s*(?:=|to)\s*off)\b/gi, cwe: 'CWE-862', advice: '대상 테이블의 RLS를 활성화하고 소유자·조직별 정책을 작성하세요. service_role 같은 우회 권한 사용 여부와 실제 배포 DB 설정도 별도로 확인하세요.', impact: '테이블 권한과 API 노출 조건에 따라 다른 임직원의 행까지 읽거나 수정할 수 있습니다.' },
  { id: '#VULN-RLS-18', title: '모든 행을 허용하는 RLS 정책', regex: /\bcreate\s+policy\s+[^;]{1,1200}?\b(?:using|with\s+check)\s*\(\s*(?:true|1\s*=\s*1)\s*\)/gi, cwe: 'CWE-863', advice: '공개 데이터인지 확인하세요. 비공개 업무 자료라면 auth.uid(), 조직 ID, 역할 조건으로 읽기·쓰기 정책을 제한하세요.', impact: '정책이 적용되는 역할에 모든 행이 허용될 수 있습니다. 공개 테이블은 의도된 정책일 수 있습니다.' },
  { id: '#VULN-PUBLIC-19', title: '브라우저 공개 변수에 비밀값 사용 의심', regex: /\b(?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|ACCESS_TOKEN|API_KEY|DATABASE_URL)[A-Z0-9_]*(?:["']?\s*[:=]\s*[^\r\n,;]{0,300})?/g, acceptMatch: match => !/(?:ANON_KEY|PUBLISHABLE|STRIPE_PUBLISHABLE)/.test(match[0]) && !/[:=]\s*["']?(?:pk_(?:live|test)_|sb_publishable_)/.test(match[0]) && !((match[0].match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/) || []).some(token => jwtRole(token) === 'anon')), cwe: 'CWE-200', advice: 'NEXT_PUBLIC_·VITE_ 변수는 브라우저에 포함됩니다. 비밀값은 해당 접두사 없는 서버 전용 변수로 옮기고 서버 API를 통해 사용하세요. 공개용 anon/publishable 키와 구분하세요.', impact: '이름만 환경변수여도 브라우저에 포함되면 임직원이나 코드를 읽는 사람이 값을 확인할 수 있습니다.' },
  { id: '#VULN-KEY-20', title: 'Stripe 비밀·제한 키', regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b|\bsk_org_[A-Za-z0-9_]{16,}\b/g, advice: '노출된 Stripe 비밀·제한 키는 교체하고 서버에서만 사용하세요. pk_ 공개키는 이 규칙에 포함하지 않습니다.', impact: '키 권한에 따라 결제 데이터 조회나 API 작업이 가능할 수 있습니다.' },
  { id: '#VULN-KEY-21', title: 'Stripe 웹훅 서명 비밀값', regex: /\bwhsec_[A-Za-z0-9]{16,}\b/g, advice: '웹훅 서명 비밀값을 교체하고 서버 전용 비밀 저장소에 보관하세요.', impact: '서명 검증에 쓰는 비밀값이 노출되면 위조 이벤트를 신뢰할 위험이 있습니다.' },
  { id: '#VULN-KEY-22', title: 'Supabase 서버 전용 비밀키', regex: /\bsb_secret_[A-Za-z0-9_-]{16,}/g, advice: 'Supabase secret 키를 교체하고 서버에서만 사용하세요. 이 키는 RLS를 우회할 수 있으므로 브라우저에 전달하지 마세요.', impact: 'RLS를 우회하는 서버 권한으로 업무 데이터에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-23', title: 'Supabase service_role JWT 키', regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, acceptMatch: match => jwtRole(match[0]) === 'service_role', advice: 'service_role 키를 교체하고 서버 전용으로 격리하세요. anon 역할의 공개키와 구분하세요.', impact: 'service_role 권한은 RLS를 우회하므로 다른 사용자의 데이터에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-24', title: 'Supabase 관리용 액세스 토큰', regex: /\bsbp_[a-f0-9]{40}\b/gi, advice: 'Supabase 개인 액세스 토큰을 폐기하고 서버·CI의 비밀 저장소에서만 사용하세요.', impact: '관리 API 토큰 권한으로 프로젝트 설정이나 관리 기능에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-25', title: 'Slack 액세스 토큰', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}/g, advice: 'Slack 토큰을 교체하고 앱 권한을 최소화하세요.', impact: '토큰 권한에 따라 사내 채널 메시지나 파일에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-26', title: 'Slack Incoming Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]{8,}\/[A-Za-z0-9]{8,}\/[A-Za-z0-9]{16,}/g, advice: '노출된 웹훅을 교체하고 URL을 비밀 저장소에 보관하세요.', impact: '외부에서 연결된 사내 채널에 메시지를 보낼 수 있습니다.' },
  { id: '#VULN-KEY-27', title: 'GitLab 액세스 토큰', regex: /\bglpat-[A-Za-z0-9_-]{20,}/g, advice: 'GitLab 토큰을 폐기·재발급하고 저장소 권한을 최소화하세요.', impact: '토큰 권한에 따라 사내 저장소를 읽거나 변경할 수 있습니다.' },
  { id: '#VULN-KEY-28', title: 'npm 액세스 토큰', regex: /\bnpm_[A-Za-z0-9]{36}\b/g, advice: 'npm 토큰을 교체하고 패키지 배포 권한을 제한하세요.', impact: '패키지 배포 권한이 있으면 의도하지 않은 버전이 게시될 수 있습니다.' },
  { id: '#VULN-KEY-29', title: 'SendGrid API 키', regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g, advice: 'SendGrid 키를 교체하고 발송 권한·발신 도메인을 제한하세요.', impact: '허용된 권한으로 메일이 발송되거나 업무 발송 정보가 노출될 수 있습니다.' },
  { id: '#VULN-KEY-30', title: 'Azure Storage 연결 비밀값', regex: /\bAccountKey\s*=\s*[A-Za-z0-9+/]{40,}={0,2}/g, advice: 'Storage 계정 키를 교체하고 관리 ID나 제한된 SAS 권한을 사용하세요.', impact: '연결된 저장소의 업무 파일에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-31', title: '비밀번호가 포함된 DB 연결 주소', regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:/"']+:[^\s@/"']+@[^\s"']+/gi, advice: 'DB 비밀번호를 교체하고 연결 주소를 서버 전용 비밀 저장소로 옮기세요.', impact: '네트워크 접근이 허용되면 DB 계정 권한으로 업무 자료에 접근할 수 있습니다.' },
  { id: '#VULN-KEY-32', title: '명시적으로 작성된 JWT 서명 비밀값', regex: /\b(?:JWT_SECRET|jwtSecret|SESSION_SECRET)\s*["']?\s*[:=]\s*["'][^\r\n"']{12,}["']/g, advice: '서명 비밀값을 교체하고 서버 비밀 저장소에서 주입하세요. 이미 발급된 세션의 무효화도 검토하세요.', impact: '서명 비밀값으로 인증 토큰을 위조할 위험이 있습니다.' },
  { id: '#VULN-KEY-33', title: 'Resend 메일 발송 API 키', regex: /\bre_[A-Za-z0-9]{20,}\b/g, advice: '발송 키를 교체하고 서버 전용으로 보관하세요.', impact: '연결된 도메인으로 허가되지 않은 메일이 발송될 수 있습니다.' },
];
expandedRules.forEach(rule => SECURITY_RULES.push({ ...rule, severity: rule.severity || 'high', category: 'suspected', cwe: rule.cwe || 'CWE-798', whatIsIssue: `${rule.title} 패턴을 발견했습니다. 실제 사용과 배포 문맥을 확인하세요.`, impactDescription: rule.impact, resolutionGuide: [{ step: '01', title: '업무 데이터와 접근 범위 확인', desc: rule.advice, badge: '수정·검증' }], aiPromptTemplate: (name, line, snippet) => `[${name}] ${line}줄의 ${rule.title}을 검토해주세요.\n\n${snippet}\n\n${rule.advice}\n${rule.impact}\n입력·권한 흐름과 기존 기능을 보존하고, 수정 전·후 테스트 및 확인하지 못한 범위를 알려주세요.` }));

export const RULE_COUNT = SECURITY_RULES.length;

/**
 * Redact known secrets before displaying or exporting evidence; not a complete DLP engine.
 */
export function maskSecret(text: string): string {
  return text
    .replace(privateKeyPattern, match => '[개인키 숨김]' + '\n'.repeat((match.match(/\n/g) || []).length))
    .replace(secretAssignmentPattern, (match, name, separator, value) => value.startsWith('[') ? match : `${name}${separator}[민감값 숨김]${'\n'.repeat((value.match(/\n/g) || []).length)}`)
    .replace(/\bhf_[A-Za-z0-9]{20,}\b/g, '[Hugging Face 토큰 숨김]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT 숨김]')
    .replace(/\b(?:(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+|sk_org_[A-Za-z0-9_]+|whsec_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9_-]+|sbp_[a-f0-9]{40}|xox[baprs]-[A-Za-z0-9-]+|glpat-[A-Za-z0-9_-]+|npm_[A-Za-z0-9]+|SG\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|re_[A-Za-z0-9]{20,})/g, '[서비스 비밀값 숨김]')
    .replace(/https:\/\/hooks\.slack\.com\/services\/[^\s"'`]+/g, '[Slack 웹훅 숨김]')
    .replace(/\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/)[^\s"'`]+/gi, '$1[접속 정보 숨김]')
    .replace(/(\b(?:AccountKey|JWT_SECRET|jwtSecret|SESSION_SECRET|(?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|ACCESS_TOKEN|API_KEY|DATABASE_URL)[A-Z0-9_]*)\s*["']?\s*[:=]\s*)(?:["'][^\r\n"']*["']|[^\s,;}]+)/g, '$1[비밀값 숨김]')
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|$)/g, '[개인키 숨김]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, '[API 키 숨김]')
    .replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[AWS 키 숨김]')
    .replace(/\bAIza[A-Za-z0-9_-]{35}\b/g, '[Google 키 숨김]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[GitHub 토큰 숨김]')
    .replace(/\b\d{6}-[1-8]\d{6}\b/g, '[주민번호 숨김]')
    .replace(/((?:password|passwd|secret|token|api[_-]?key|authorization)\s*["']?\s*[:=]\s*)(["'])([^\r\n]*?)\2/gi, '$1$2[민감값 숨김]$2')
    .replace(/((?:password|passwd|secret|token|api[_-]?key|authorization)\s*["']?\s*[:=]\s*)(?!["'\s\[])[^\s"',;}]+/gi, '$1[민감값 숨김]');
}

/**
 * Scan all matching lines using regular expressions. This is not AST or data-flow analysis.
 */
export function scanFileContent(fileName: string, content: string): SecurityIssue[] {
  if (/\.ipynb$/i.test(fileName)) {
    let notebook: { cells?: { source?: unknown; outputs?: unknown }[] };
    try { notebook = JSON.parse(content); } catch { throw new Error(`${maskSecret(fileName)}: 노트북 JSON을 읽을 수 없습니다.`); }
    if (!notebook || !Array.isArray(notebook.cells)) throw new Error(`${maskSecret(fileName)}: 노트북 셀 목록이 없습니다.`);
    const strings = (value: unknown): string => typeof value === 'string' ? value : Array.isArray(value) ? value.map(strings).join('') : value && typeof value === 'object' ? Object.values(value).map(strings).join('\n') : '';
    return notebook.cells.flatMap((cell, index) => {
      if (!cell || typeof cell !== 'object') throw new Error(`${maskSecret(fileName)}: 노트북 셀 형식이 올바르지 않습니다.`);
      return (['source', 'outputs'] as const).flatMap(part => {
        const label = `${index + 1}번 셀 ${part === 'source' ? '코드' : '출력'}`;
        return scanFileContent(`${fileName} (${label}).txt`, strings(cell[part])).map(issue => ({
          ...issue, filePath: fileName,
          location: `${maskSecret(fileName)} · ${label} · ${issue.line}번째 줄`,
        }));
      });
    });
  }
  const lines = content.split('\n');
  const lineStarts = [0];
  for (let offset = 0; offset < content.length; offset++) if (content[offset] === '\n') lineStarts.push(offset + 1);
  const lineAt = (offset: number) => {
    let lo = 0, hi = lineStarts.length;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid; }
    return lo;
  };
  // Redact the entire document first so a context snippet cannot expose a PEM body.
  const safeContent = maskSecret(content);
  const safeLines = safeContent.split('\n');
  const foundIssues: SecurityIssue[] = [];

  SECURITY_RULES.forEach((rule) => {
    const seenLines = new Set<number>();
    // Reset regex state
    rule.regex.lastIndex = 0;

    for (const match of content.matchAll(new RegExp(rule.regex.source, rule.regex.flags))) {
      if (rule.acceptMatch && !rule.acceptMatch(match)) continue;
      const i = lineAt(match.index);
      if (seenLines.has(i)) continue;
      seenLines.add(i);
        // Extract 3 lines of context
        const startLine = Math.max(0, i - 1);
        const endLine = Math.min(lines.length - 1, i + 1);
        const snippetLines = safeLines.slice(startLine, endLine + 1).map((l, idx) => {
          const lineNum = startLine + idx + 1;
          const masked = maskSecret(l);
          return `${lineNum === i + 1 ? '>> ' : '   '}${lineNum}: ${masked}`;
        }).join('\n');

        if (foundIssues.length >= 3000) throw new Error('한 파일에서 너무 많은 패턴이 발견되었습니다. 파일을 나눠 검사해주세요.');
        const safeName = maskSecret(fileName);
        const issueId = `${rule.id}:${encodeURIComponent(fileName)}:${i + 1}`;
        const issueTitle = `[${safeName}] ${rule.title}`;

        foundIssues.push({
          id: issueId,
          ruleId: rule.id,
          filePath: fileName,
          line: i + 1,
          fingerprint: `${rule.id}:${fileName}:${safeLines[i].trim().replace(/\s+/g, ' ')}`,
          title: issueTitle,
          shortDescription: `${safeName} 파일 ${i + 1}줄에서 패턴 발견. 실제 노출·악용 가능성은 문맥 검토가 필요합니다.`,
          severity: rule.severity,
          category: rule.category,
          cwe: rule.cwe,
          whatIsIssue: rule.whatIsIssue,
          whatIsIssueTip: `발견된 위치: ${safeName} (Line ${i + 1})`,
          whatIsIssueMeta: '브라우저 로컬 정적 패턴 매칭 분석 결과',
          impactDescription: rule.impactDescription,
          impactItems: [
            { title: '보안 정책 위반', desc: '외부 공격자에 의한 비인가 접근 및 자원 남용 위험', icon: 'shield_alert' },
            { title: '서비스 영향', desc: '계정 정지, 데이터 유출 또는 과도한 API 과금 발생 가능', icon: 'credit_card' },
          ],
          impactMeta: '실제 업로드된 파일 분석 결과',
          detectionSignature: `정규식 매칭: ${rule.regex.toString()}`,
          location: `${safeName} (Line ${i + 1})`,
          codeSnippet: snippetLines,
          detailedAuditLog: `LOCAL_SCANNER_TRACE:
File: ${safeName}
Line: ${i + 1}
Rule: ${rule.id} (${rule.title})
Matched Pattern: ${rule.regex.source}
Status: Static regex match only; exploitability has not been verified.`,
          resolutionSteps: rule.resolutionGuide,
          aiPrompt: maskSecret(rule.aiPromptTemplate(safeName, i + 1, '(비밀값 보호를 위해 코드 증거 생략. 해당 위치를 작업 환경에서 확인하세요.)')),
          checklist: [
            { title: `${safeName}의 데이터 흐름과 수정 내용 확인`, desc: '탐지된 코드의 사용 문맥을 확인하고 수정 후 기능과 보안을 검증합니다.' },
            { title: 'Git 커밋 전 diff 확인', desc: 'git status 및 git diff로 민감 설정 파일이 커밋 대상에 포함되지 않았는지 점검합니다.' },
          ],
          recheckStatus: 'unverified',
        });

    }
  });

  return foundIssues;
}

/**
 * Scan all uploaded files or provide fallback/URL based result
 */
export async function runLocalSecurityScan(inputData: ScanInputData, onProgress?: (completed: number, total: number) => void): Promise<ScanResultPayload> {
  if (inputData.inputTab !== 'upload') throw new Error('URL 직접 검사는 지원하지 않습니다. 소스 파일을 선택해주세요.');
  if (!inputData.files.length) throw new Error('검사할 파일을 선택해주세요.');
  if (new Set(inputData.files.map(file => file.name)).size !== inputData.files.length) throw new Error('중복된 파일 경로를 제거해주세요.');
  const issues: SecurityIssue[] = [];
  let totalLines = 0;
  let scannedFilesCount = 0;

  // If user uploaded files with text content
  if (inputData.inputTab === 'upload' && inputData.files.length > 0) {
    for (const file of inputData.files) {
      if (file.content !== undefined) {
        scannedFilesCount++;
        totalLines += file.content.split('\n').length;
        const fileIssues = scanFileContent(file.name, file.content);
        issues.push(...fileIssues);
        if (issues.length > 5000) throw new Error('전체 탐지 결과가 5,000건을 초과했습니다. 검사 대상을 나눠주세요.');
        onProgress?.(scannedFilesCount, inputData.files.length);
      } else throw new Error(`${maskSecret(file.name)}: 파일 내용을 읽지 못했습니다.`);
    }

    // If actual files were uploaded and scanned
    if (scannedFilesCount > 0) {
      return {
        mode: 'real_file',
        sourceReview: analyzeSourceContext(inputData.files, issues),
        scannedFilesCount,
        totalLinesScanned: totalLines,
        issues,
        cleanCheckCount: SECURITY_RULES.length - new Set(issues.map(issue => issue.ruleId)).size,
        scannedFileNames: inputData.files.map(file => file.name),
        scannedAt: new Date().toISOString(),
        ruleCount: SECURITY_RULES.length,
      };
    }
  }

  throw new Error('분석할 수 있는 파일이 없습니다.');
}

export function compareScanResults(previous: SecurityIssue[], current: SecurityIssue[], scannedFileNames: string[]): ComparisonEntry[] {
  const remaining = new Set(current);
  const entries: ComparisonEntry[] = [];
  const pending: SecurityIssue[] = [];
  // First preserve exact occurrences; then conservatively pair changed occurrences by file/rule.
  for (const issue of previous) {
    const exact = current.find(candidate => remaining.has(candidate) && candidate.fingerprint === issue.fingerprint);
    if (exact) {
      remaining.delete(exact);
      entries.push({ issue, currentIssue: exact, status: 'persisting' });
    } else pending.push(issue);
  }
  for (const issue of pending) {
    if (!issue.filePath || !scannedFileNames.includes(issue.filePath)) {
      entries.push({ issue, status: 'unverified' });
      continue;
    }
    const candidate = current.find(candidate => remaining.has(candidate) && candidate.filePath === issue.filePath && candidate.ruleId === issue.ruleId);
    if (candidate) remaining.delete(candidate);
    entries.push({ issue, currentIssue: candidate, status: candidate ? 'persisting' : 'resolved' });
  }
  for (const issue of remaining) entries.push({ issue, currentIssue: issue, status: 'new' });
  return entries;
}

/**
 * Sample vulnerable code files for instant testing
 */
export const SAMPLE_VULNERABLE_FILES = [
  {
    name: 'app.js',
    content: `import express from "express";
import { OpenAI } from "openai";

const app = express();
const openai = new OpenAI({
  apiKey: "sk-proj-DUMMY_TEST_KEY_NOT_REAL_0000000000",
  dangerouslyAllowBrowser: true
});

app.get("/api/chat", async (req, res) => {
  const prompt = req.query.prompt;
  eval("console.log('Query: ' + prompt)");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  });
  res.json(response);
});

app.listen(3000);`
  },
  {
    name: '.env.example',
    content: `PORT=3000
# SYNTHETIC TEST DATA: 아래 값은 모두 실제 접속 정보가 아닙니다.
OPENAI_API_KEY="sk-proj-DUMMY_TEST_KEY_NOT_REAL_1111111111"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
TEST_ADMIN_SSN="000000-1000000"`
  }
];
