import type { SecurityIssue } from '../types/security';

// A regex hit (even category=detected) is not proof that deployment needs changing.
// Source assessments distinguish actual syntax from textual matches; URL observations remain separate.
export function findingDecision(issue: SecurityIssue, mode?: string): 'fix' | 'review' | 'example' {
  if (mode === 'api_demo' || issue.ruleId?.startsWith('#API-')) return 'example';
  if (mode === 'real_file' && issue.sourceAssessment) return issue.sourceAssessment.status === 'actionable' ? 'fix' : issue.sourceAssessment.status;
  if (isExampleFinding(issue)) return 'example';
  if (mode === 'url' && issue.filePath === 'transport' && (
    (issue.ruleId === '#WEB-HTTP' && issue.verifiedControl === 'unencrypted-http') ||
    (issue.ruleId === '#WEB-TLS' && issue.verifiedControl === 'invalid-tls')
  )) return 'fix';
  return 'review';
}

// Path hints affect presentation only. A test folder can still contain real secrets.
export function isExampleFinding(issue: SecurityIssue): boolean {
  const path = (issue.filePath || '').replace(/\\/g, '/');
  return /(?:^|\/)(?:tests?|__tests__|fixtures?|__fixtures__|demo-data|examples?|samples?)(?:\/|$)/i.test(path)
    || /\.(?:test|spec)\.[^/]+$/i.test(path);
}
export function groupFindings(issues: SecurityIssue[]) {
  const groups = new Map<string, { id: string; example: boolean; issues: SecurityIssue[] }>();
  for (const issue of issues) {
    const example = isExampleFinding(issue);
    const id = `${example ? 'example' : 'general'}:${issue.ruleId || issue.title}`;
    const group = groups.get(id) || { id, example, issues: [] };
    group.issues.push(issue);
    groups.set(id, group);
  }
  const rank = { high: 0, medium: 1, info: 2 };
  return [...groups.values()].map(group => ({ ...group, issues: [...group.issues].sort((a,b) => rank[a.severity] - rank[b.severity]) }))
    .sort((a,b) => rank[a.issues[0].severity] - rank[b.issues[0].severity]);
}
