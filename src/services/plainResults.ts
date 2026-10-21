import type { SecurityIssue } from '../types/security';
import { isExampleFinding } from './resultGroups';

export function concernOf(issue: SecurityIssue): 'privacy' | 'access' | 'other' {
  const rule = issue.ruleId || '';
  if (/-(?:KEY|PII|PUBLIC|BROWSER)-/.test(rule)) return 'privacy';
  if (/^#API-|-(?:SQL|RLS|FIREBASE|CORS)-/.test(rule)) return 'access';
  return 'other';
}
export function plainFinding(issue: SecurityIssue): string {
  const rule = issue.ruleId || '';
  if (rule.includes('-PII-')) return '개인정보처럼 보이는 내용이 있어요';
  if (concernOf(issue) === 'privacy') return '서비스 접속에 쓰는 비밀값을 확인해야 해요';
  if (rule.startsWith('#API-')) return '연습용 서비스에서 자료 접근을 확인했어요';
  if (concernOf(issue) === 'access') return '자료를 볼 수 있는 사람을 정하는 코드를 확인해야 해요';
  return '서비스를 보호하는 설정을 확인해야 해요';
}
export function plainResults(issues: SecurityIssue[], mode?: string) {
  const general = issues.filter(issue => !isExampleFinding(issue));
  const demo = mode === 'api_demo';
  return ([
    { id: 'privacy', question: '회사 자료가 밖에서 보이나요?', unknown: '이번 검사로는 회사 자료가 밖에 보이는지 알 수 없어요.', detail: '개인정보나 서비스 접속에 쓰는 비밀값처럼 보이는 내용을 찾았어요. 실제 정보인지, 연습용인지 먼저 확인해야 해요.' },
    { id: 'access', question: '다른 사람의 자료도 볼 수 있나요?', unknown: '실제 사용자 계정으로 확인하지 않아 다른 사람의 자료가 열리는지는 알 수 없어요.', detail: '자료를 읽거나 접근을 허용하는 코드에 확인할 부분이 있어요. 다른 사람의 자료가 실제로 열린다는 뜻은 아니에요.' },
    { id: 'other', question: '그 밖에 확인할 부분이 있나요?', unknown: '살펴본 범위에서는 추가 단서를 찾지 못했어요. 확인하지 못한 설정은 남아 있을 수 있어요.', detail: '서비스를 보호하는 설정에서 확인할 부분을 찾았어요. 실제 사용 중인 설정인지 먼저 확인해야 해요.' },
  ] as const).map(section => {
    const matches = general.filter(issue => concernOf(issue) === section.id);
    return { ...section, issues: matches,
      status: demo ? '연습 결과예요' : matches.length ? '확인이 더 필요해요' : '이번 검사로는 알 수 없어요',
      explanation: demo ? '가짜 자료로 만든 연습용 서비스의 결과예요. 내 회사 서비스에서 같은 문제가 확인된 것은 아니에요.' : matches.length ? section.detail : section.unknown,
    };
  });
}
