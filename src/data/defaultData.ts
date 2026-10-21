import type { ScanInputData, RescanInputData } from '../types/security';
export const initialScanInput: ScanInputData = {
  serviceTypes: ['web', 'ai-agent'], targetUrl: '', files: [], inputTab: 'upload',
  q1DataPrivacy: 'unsure', q2ExternalAi: 'unsure', q3AuthControl: 'unsure', q4AiExecution: 'unsure',
  authConfirmed: false, systemName: '내 프로젝트',
};
export const defaultRescanInput: RescanInputData = {
  patchUrl: '', patchVersion: '', patchMemo: '', submissionTab: 'upload', targetConfirmed: false, files: [],
};
