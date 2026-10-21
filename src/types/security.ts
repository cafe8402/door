export type ScreenType = 
  | 'intro'
  | 'home'
  | 'portfolio'
  | 'experience'
  | 'api_setup'
  | 'start'        // ai_6: 검사 시작
  | 'progress'     // ai_2: 검사 진행
  | 'result'       // ai_3: 검사 결과
  | 'detail'       // ai_4: 문제 상세와 AI 수정 요청문
  | 'rescan_input' // ai_5: 수정한 자료로 재검사
  | 'comparison';  // ai_1: 이전 검사와 재검사 결과 비교

export type ServiceType = 'web' | 'api' | 'ai-agent' | 'automation' | 'other';

export type TriState = 'yes' | 'no' | 'unsure';

export interface ScanInputData {
  serviceTypes: ServiceType[];
  targetUrl: string;
  files: { name: string; size: number; content?: string }[];
  inputTab: 'url' | 'upload' | 'api_demo';
  apiDemoVersion?: 'vulnerable' | 'fixed';
  q1DataPrivacy: TriState;       // 개인정보/회사 내부 자료 처리 여부
  q2ExternalAi: TriState;        // 외부 AI / 서드파티 전송 여부
  q3AuthControl: TriState;       // 로그인/권한 제어 여부
  q4AiExecution: TriState;       // AI 직접 실행/수정 여부
  authConfirmed: boolean;        // 권한 확인 동의
  systemName: string;
}

export type IssueSeverity = 'high' | 'medium' | 'info';
export type IssueCategory = 'detected' | 'suspected' | 'unverified'; // 발견한 문제 | 문제일 수 있어요 | 확인하지 못했어요

export interface GuideStep {
  step: string;
  title: string;
  desc: string;
  badge: string;
}

export interface SecurityIssue {
  sourceAssessment?: { status: 'actionable' | 'review' | 'example'; kind?: string; title?: string; reason: string; change?: string };
  verifiedControl?: 'unencrypted-http' | 'invalid-tls';
  ruleId?: string;
  filePath?: string;
  line?: number;
  fingerprint?: string;
  id: string;               // e.g. #VULN-AUTH-01
  title: string;            // e.g. 브라우저 코드에 API 키가 포함되어 있어요.
  shortDescription: string; // concise description (2 lines)
  severity: IssueSeverity;
  category: IssueCategory;
  cwe?: string;
  
  // 1. 무엇이 문제인가요?
  whatIsIssue: string;
  whatIsIssueTip: string;
  whatIsIssueMeta: string;
  
  // 2. 어떤 영향이 있나요?
  impactDescription: string;
  impactItems: { title: string; desc: string; icon: string }[];
  impactMeta: string;

  // 3. 어디에서 확인했나요? (탐지 증거)
  detectionSignature: string;
  location: string;
  codeSnippet: string;
  detailedAuditLog: string;

  // 4. 어떻게 수정하나요? (단계별 해결 가이드)
  resolutionSteps: GuideStep[];

  // AI 수정 요청문
  aiPrompt: string;

  // 자가 점검 체크리스트
  checklist: { title: string; desc: string }[];

  // 재검사 비교 정보
  recheckStatus?: 'resolved' | 'persisting' | 'unverified';
  recheckPreviousSnippet?: string;
  recheckCurrentSnippet?: string;
  recheckAuditTrace?: string;
  recheckAdvice?: string;
}

export interface ScanProgressItem {
  id: number;
  name: string;
  desc: string;
  status: 'pending' | 'running' | 'completed' | 'insufficient_data' | 'failed';
  resultText?: string;
  canRetry?: boolean;
}

export interface RescanInputData {
  apiDemoVersion?: 'vulnerable' | 'fixed';
  patchUrl: string;
  patchVersion: string;
  patchMemo: string;
  submissionTab: 'url' | 'upload';
  uploadedFile?: { name: string; size: number };
  targetConfirmed: boolean;
  files?: ScanInputData['files'];
}

export interface ComparisonEntry {
  issue: SecurityIssue;
  status: 'resolved' | 'persisting' | 'unverified' | 'new';
  currentIssue?: SecurityIssue;
}
