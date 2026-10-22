import type { ScanInputData, SecurityIssue } from '../types/security';
import { maskSecret, SAMPLE_VULNERABLE_FILES } from './localSecurityScanner';
import type { ScanResultPayload } from './localSecurityScanner';
import { issueTitle } from './presentation';

export const PORTFOLIO_KEY = 'mundansok.portfolio.v1';
export interface ManagedSystem {
  id: string; name: string; department: string; owner: string; description: string;
  mode: 'upload' | 'url'; url: string; createdAt: string; archived: boolean;
}
export interface ManagedFinding {
  key: string; ruleId: string; file: string; title: string; severity: SecurityIssue['severity'];
  category: SecurityIssue['category']; impact: string; advice: string; count: number; lines: number[];
  status: 'new' | 'persisting' | 'unverified' | 'not_detected';
  comparisonLimited?: boolean;
}
export interface ManagedRun {
  id: string; systemId: string; scannedAt: string; mode: ScanResultPayload['mode']; example: boolean;
  target: string; files: number; lines: number; ruleCount: number; warnings: string[];
  findings: ManagedFinding[]; parentId?: string;
}
export interface ManagedTask {
  systemId: string; key: string; assignee: string; due: string;
  status: 'open' | 'in_progress' | 'awaiting_rescan'; note: string; updatedAt: string;
}
export const MANUAL_CHECKS = [
  '일반 직원과 관리자의 계정으로 자료 접근 범위를 확인했어요.',
  '운영 DB의 접근 정책과 비밀키 보관·교체 상태를 확인했어요.',
  '회사 자료의 외부 AI 전송과 보관 기준을 확인했어요.',
  '수정 후 주요 업무 기능이 정상 동작하는지 확인했어요.',
] as const;
export interface DeploymentReview {
  id: string; systemId: string; runId: string; revision: string; reviewer: string;
  decision: 'hold' | 'follow_up' | 'reviewed'; checks: boolean[]; note: string; createdAt: string;
}
export interface Portfolio {
  version: 1; systems: ManagedSystem[]; runs: ManagedRun[]; tasks: ManagedTask[]; reviews: DeploymentReview[];
}
export const emptyPortfolio = (): Portfolio => ({ version: 1, systems: [], runs: [], tasks: [], reviews: [] });
export const makeId = () => crypto.randomUUID();
export const clean = (value: string, max = 300) => maskSecret(value).slice(0, max);
export function cleanUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? clean(`${url.protocol}//${url.host}${url.pathname}`, 2000) : ''; } catch { return ''; }
}
function hasPrivateUrlParts(value: string) {
  try { const url = new URL(value); return Boolean(url.search || url.hash || url.username || url.password); } catch { return false; }
}
export function latestRun(data: Portfolio, systemId: string, realOnly = false) {
  return data.runs.filter(r => r.systemId === systemId && (!realOnly || !r.example)).at(-1);
}
export const openFindings = (run?: ManagedRun) => run?.findings.filter(f => f.status !== 'not_detected') || [];
export function taskFor(data: Portfolio, systemId: string, key: string) {
  return data.tasks.find(t => t.systemId === systemId && t.key === key);
}
export function isOverdue(task?: ManagedTask, today = new Date().toLocaleDateString('en-CA')) {
  // Local calendar date, rather than a UTC midnight deadline.
  const now = new Date();
  const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return Boolean(task?.due && task.due < (today.match(/^\d{4}-\d{2}-\d{2}$/) ? today : localDay));
}
export function reviewRevision(data: Portfolio, run: ManagedRun) {
  return JSON.stringify([run.id, data.tasks.filter(t => t.systemId === run.systemId).map(t => [t.key, t.updatedAt]).sort()]);
}
export function currentReview(data: Portfolio, run?: ManagedRun) {
  if (!run) return undefined;
  return data.reviews.filter(r => r.systemId === run.systemId && r.revision === reviewRevision(data, run)).at(-1);
}
export function reviewReady(run: ManagedRun, checks: boolean[]) {
  return !run.example && !openFindings(run).length && !run.warnings.length && checks.length === MANUAL_CHECKS.length && checks.every(Boolean);
}
export function saveReview(data: Portfolio, run: ManagedRun, values: Pick<DeploymentReview, 'reviewer' | 'decision' | 'checks' | 'note'>): Portfolio {
  if (latestRun(data, run.systemId)?.id !== run.id) throw new Error('새 검사 기록이 있어요. 최근 검사를 열어 검토해 주세요.');
  if (!values.reviewer.trim()) throw new Error('검토자 이름을 입력해 주세요.');
  if (values.decision === 'reviewed' && !reviewReady(run, values.checks)) throw new Error('남은 항목·검사 경고·수동 확인을 먼저 검토해 주세요.');
  return { ...data, reviews: [...data.reviews, {
    ...values, reviewer: clean(values.reviewer, 80), note: clean(values.note, 1000),
    checks: MANUAL_CHECKS.map((_, i) => Boolean(values.checks[i])),
    id: makeId(), systemId: run.systemId, runId: run.id, revision: reviewRevision(data, run), createdAt: new Date().toISOString(),
  }] };
}
function isExample(input: ScanInputData, result: ScanResultPayload) {
  return result.mode === 'api_demo' || /\/__fixtures\//.test(result.targetUrl || input.targetUrl) ||
    (input.files.length === SAMPLE_VULNERABLE_FILES.length && SAMPLE_VULNERABLE_FILES.every(sample => input.files.some(f => f.name === sample.name && f.content === sample.content)));
}
function findingFrom(issue: SecurityIssue): ManagedFinding {
  const ruleId = clean(issue.ruleId || issue.id, 100), file = clean(cleanUrl(issue.filePath || '') || issue.filePath || issue.location, 500);
  return {
    key: JSON.stringify([ruleId, file]), ruleId, file, title: clean(issueTitle(issue)), severity: issue.severity,
    category: issue.category, impact: clean(issue.impactDescription, 600),
    advice: clean(issue.resolutionSteps.map(s => s.title).join(' → '), 600),
    count: 1, lines: issue.line ? [issue.line] : [], status: 'new',
    comparisonLimited: hasPrivateUrlParts(issue.filePath || ''),
  };
}
/** Store a deliberately small projection: never source text, snippets, prompts, or secret fingerprints. */
export function recordRun(data: Portfolio, systemId: string, input: ScanInputData, result: ScanResultPayload, exampleContext = false): Portfolio {
  const system = data.systems.find(s => s.id === systemId && !s.archived);
  if (!system) throw new Error('검사할 시스템을 다시 선택해 주세요.');
  const example = exampleContext || isExample(input, result);
  // Retries and React lifecycle changes must not create duplicate records.
  if (data.runs.some(r => r.systemId === systemId && r.scannedAt === result.scannedAt && r.mode === result.mode)) return data;
  const target = cleanUrl(result.targetUrl || input.targetUrl);
  const previous = data.runs.filter(r => r.systemId === systemId && r.example === example).at(-1);
  const findings: ManagedFinding[] = [];
  for (const issue of result.issues) {
    const item = findingFrom(issue);
    if (example) item.key = `example:${item.key}`;
    const existing = findings.find(f => f.key === item.key);
    if (existing) { existing.count++; existing.comparisonLimited ||= item.comparisonLimited; existing.lines = [...new Set([...existing.lines, ...item.lines])].slice(0, 100); }
    else { const old = previous?.findings.find(f => f.key === item.key && f.status !== 'not_detected'); item.status = old ? 'persisting' : 'new'; item.comparisonLimited ||= old?.comparisonLimited; findings.push(item); }
  }
  for (const old of openFindings(previous)) {
    if (findings.some(f => f.key === old.key)) continue;
    const sameScope = previous?.mode === result.mode && (result.mode === 'real_file' || previous.target === target);
    const completed = result.mode === 'real_file'
      ? result.scannedFileNames.some(file => clean(file, 500) === old.file)
      : result.checks?.some(check => check.status === 'completed' && (cleanUrl(check.resource) || clean(check.resource, 500)) === old.file && check.ruleId === (/^#(?:WEB|API)-/.test(old.ruleId) ? old.ruleId : '*source'));
    findings.push({ ...old, status: sameScope && completed && !old.comparisonLimited ? 'not_detected' : 'unverified' });
  }
  const severityOrder = { high: 0, medium: 1, info: 2 };
  findings.sort((a, b) => Number(a.status === 'not_detected') - Number(b.status === 'not_detected') || severityOrder[a.severity] - severityOrder[b.severity]);
  const run: ManagedRun = {
    id: makeId(), systemId, scannedAt: result.scannedAt, mode: result.mode, example, target,
    files: result.scannedFilesCount, lines: result.totalLinesScanned, ruleCount: result.ruleCount,
    warnings: [...(result.warnings || []).map(w => clean(w, 600)), ...((result.checks || []).some(c => c.status === 'unverified') ? ['일부 검사 범위를 확인하지 못했어요. 검사 직후 결과의 범위를 확인해 주세요.'] : [])], findings, parentId: previous?.id,
  };
  return { ...data, runs: [...data.runs, run] };
}
export function upsertTask(data: Portfolio, task: ManagedTask): Portfolio {
  if (!data.systems.some(s => s.id === task.systemId) || !data.runs.some(r => r.systemId === task.systemId && r.findings.some(f => f.key === task.key))) throw new Error('항목을 찾지 못했어요.');
  if (task.due && !/^\d{4}-\d{2}-\d{2}$/.test(task.due)) throw new Error('조치 기한을 확인해 주세요.');
  const saved = { ...task, assignee: clean(task.assignee, 80), note: clean(task.note, 1000), updatedAt: new Date().toISOString() };
  return { ...data, tasks: [...data.tasks.filter(t => t.systemId !== task.systemId || t.key !== task.key), saved] };
}
export function portfolioStats(data: Portfolio, department = '') {
  const systems = data.systems.filter(s => !s.archived && (!department || (s.department || '미지정') === department));
  const runs = systems.map(s => latestRun(data, s.id, true)).filter((r): r is ManagedRun => Boolean(r));
  const active = runs.flatMap(r => openFindings(r).map(f => ({ run: r, finding: f })));
  return { systems: systems.length, scanned: runs.length, unscanned: systems.length - runs.length,
    actionSystems: runs.filter(r => openFindings(r).length).length,
    open: active.length, high: active.filter(a => a.finding.severity === 'high').length,
    overdue: active.filter(a => isOverdue(taskFor(data, a.run.systemId, a.finding.key))).length,
    missingOwner: active.filter(a => !taskFor(data, a.run.systemId, a.finding.key)?.assignee).length,
    notDetected: runs.flatMap(r => r.findings).filter(f => f.status === 'not_detected').length,
    reviewNeeded: runs.filter(r => !currentReview(data, r) || currentReview(data, r)?.decision !== 'reviewed').length,
  };
}

// Fail closed on incompatible/corrupt data. Never overwrite a damaged store with an empty one.
export function parsePortfolio(raw: string | null): Portfolio {
  if (!raw) return emptyPortfolio();
  if (raw.length > 4_000_000) throw new Error('저장된 관리 기록의 크기가 너무 큽니다.');
  const data = JSON.parse(raw);
  const str = (v: unknown) => typeof v === 'string';
  const list = (v: unknown) => Array.isArray(v) && v.length <= 20000;
  if (data?.version !== 1 || !['systems','runs','tasks','reviews'].every(k => list(data[k]))) throw new Error('관리 기록 형식을 확인하지 못했어요.');
  if (!data.systems.every((s: ManagedSystem) => s && [s.id,s.name,s.department,s.owner,s.description,s.url,s.createdAt].every(str) && ['url','upload'].includes(s.mode) && typeof s.archived === 'boolean') || new Set(data.systems.map((s: ManagedSystem) => s.id)).size !== data.systems.length) throw new Error('시스템 기록이 손상됐어요.');
  const systemIds = new Set(data.systems.map((s: ManagedSystem) => s.id));
  if (!data.runs.every((r: ManagedRun) => r && systemIds.has(r.systemId) && [r.id,r.scannedAt,r.target].every(str) && !isNaN(Date.parse(r.scannedAt)) && ['url','real_file','api_demo'].includes(r.mode) && typeof r.example === 'boolean' && [r.files,r.lines,r.ruleCount].every(n => Number.isFinite(n) && n >= 0) && list(r.warnings) && r.warnings.every(str) && list(r.findings) && r.findings.every(f => f && [f.key,f.ruleId,f.file,f.title,f.impact,f.advice].every(str) && ['new','persisting','unverified','not_detected'].includes(f.status) && ['high','medium','info'].includes(f.severity) && ['detected','suspected','unverified'].includes(f.category) && Number.isInteger(f.count) && f.count > 0 && list(f.lines) && f.lines.every(n => Number.isInteger(n) && n > 0)))) throw new Error('검사 기록이 손상됐어요.');
  if (!data.tasks.every((t: ManagedTask) => t && systemIds.has(t.systemId) && [t.key,t.assignee,t.due,t.note,t.updatedAt].every(str) && ['open','in_progress','awaiting_rescan'].includes(t.status) && (!t.due || /^\d{4}-\d{2}-\d{2}$/.test(t.due)))) throw new Error('조치 기록이 손상됐어요.');
  if (!data.reviews.every((r: DeploymentReview) => r && systemIds.has(r.systemId) && [r.id,r.runId,r.revision,r.reviewer,r.note,r.createdAt].every(str) && ['hold','follow_up','reviewed'].includes(r.decision) && Array.isArray(r.checks) && r.checks.length === 4 && r.checks.every(v => typeof v === 'boolean'))) throw new Error('검토 기록이 손상됐어요.');
  return data;
}
export function writePortfolio(storage: Pick<Storage, 'setItem'>, data: Portfolio) {
  const raw = JSON.stringify(data);
  if (raw.length > 3_500_000) throw new Error('관리 기록 저장 공간이 부족해요. 기록을 내려받아 보관해 주세요.');
  storage.setItem(PORTFOLIO_KEY, raw);
}
const escapeHtml = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
export function executiveReport(data: Portfolio) {
  const stats = portfolioStats(data), systems = data.systems.filter(s => !s.archived);
  const e = escapeHtml;
  const rows = systems.map(s => {
    const r = latestRun(data, s.id, true), f = openFindings(r), review = currentReview(data, r);
    return `<tr><td>${e(s.name)}</td><td>${e(s.department || '미지정')}</td><td>${e(s.owner || '미지정')}</td><td>${r ? e(new Date(r.scannedAt).toLocaleDateString('ko-KR')) : '미검사'}</td><td>${f.length}</td><td>${f.filter(i => isOverdue(taskFor(data,s.id,i.key))).length}</td><td>${!r ? '검사 필요' : review?.decision === 'reviewed' ? '검토 기록 있음' : f.length ? '조치 필요' : '추가 검토 필요'}</td></tr>`;
  }).join('');
  const priority = systems.flatMap(s => openFindings(latestRun(data,s.id,true)).map(f => ({s,f,t:taskFor(data,s.id,f.key)}))).sort((a,b) => Number(isOverdue(b.t)) - Number(isOverdue(a.t)) || Number(b.f.severity === 'high') - Number(a.f.severity === 'high')).slice(0,8);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>ai-work-security · 업무시스템 보안 요약</title><style>body{font:14px/1.6 system-ui,sans-serif;color:#182238;max-width:1060px;margin:36px auto;padding:20px}h1{font-size:28px}small,p{color:#576478}.stats{display:flex;gap:12px;flex-wrap:wrap}.stat{background:#f0f2fa;border-radius:12px;padding:14px;flex:1}.stat strong{display:block;font-size:26px;color:#4338ca}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px;text-align:left;border-bottom:1px solid #dce0eb;overflow-wrap:anywhere}h2{font-size:18px;margin-top:26px}li{margin-bottom:8px}@media print{body{margin:0;padding:0;font-size:11px}h1{font-size:23px}.stat{padding:8px}tr{break-inside:avoid}@page{size:A4 landscape;margin:12mm}}</style></head><body><small>AI TOOL SECURITY / MANAGEMENT BRIEF · ${e(new Date().toLocaleString('ko-KR'))}</small><h1>우리 업무시스템, 어디까지 점검했나요?</h1><p>이 브라우저에 등록한 시스템 기준 · 예제 검사는 집계에서 제외 · 자동 보안 인증 또는 배포 승인이 아닙니다.</p><div class="stats">${[['등록 시스템',stats.systems],['실제 검사',stats.scanned],['조치 필요 시스템',stats.actionSystems],['기한 초과 항목',stats.overdue],['재검사 미검출',stats.notDetected]].map(([label,n])=>`<div class="stat">${e(label)}<strong>${n}</strong></div>`).join('')}</div><h2>시스템별 현황</h2><table><thead><tr><th>시스템</th><th>부서</th><th>책임자</th><th>최근 실제 검사</th><th>남은 항목</th><th>기한 초과</th><th>다음 할 일</th></tr></thead><tbody>${rows || '<tr><td colspan="7">등록된 시스템이 없습니다.</td></tr>'}</tbody></table><h2>먼저 확인할 항목</h2><ol>${priority.map(({s,f,t})=>`<li><strong>${e(s.name)} · ${e(f.title)}</strong> — ${e(t?.assignee || '담당자 미지정')} / ${e(t?.due || '기한 미지정')}<br><small>${e(f.file)} · ${e(f.status === 'unverified' ? '이번 검사 범위에서 확인 못함' : f.impact)}</small></li>`).join('') || '<li>현재 기록에서 남은 항목이 없습니다. 미검사 시스템과 수동 검토 여부를 확인해 주세요.</li>'}</ol><p>미검사 ${stats.unscanned}개 · 담당자 미지정 ${stats.missingOwner}항목 · 검토 필요 ${stats.reviewNeeded}시스템. 같은 규칙·파일의 여러 탐지는 하나의 조치 항목으로 묶습니다. ‘미검출’은 재검사 범위에서 같은 패턴을 찾지 못했다는 뜻이며 안전을 보장하지 않습니다. 전체 등록 목록은 JSON 백업으로 별도 보관할 수 있습니다.</p></body></html>`;
}
