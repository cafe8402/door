import type { SecurityIssue } from '../types/security';
import { isExampleFinding, findingDecision } from './resultGroups';
import { maskSecret } from './localSecurityScanner';
import { issueLocation } from './presentation';

const advice = {
  pii: { title: '주민번호 모양의 숫자가 들어 있어요', change: '실제 사람의 번호라면 코드와 예시에서 지우고 가짜 값으로 바꾸세요. 가짜 예시라면 삭제할 개인정보로 단정하지 말고, 예시가 필요한지 확인하세요.' },
  key: { title: '접속 비밀번호처럼 쓰는 값이 들어 있어요', change: '실제로 쓰는 비밀값이라면 새 값으로 교체하고, 방문자에게 전달되지 않는 보관 장소로 옮기세요. 공개용 키나 가짜 값이라면 교체가 필요하지 않을 수 있어요.' },
  access: { title: '자료를 볼 수 있는 사람의 범위가 넓어요', change: '공개해도 되는 자료인지 확인하세요. 회사 내부 자료라면 로그인한 사람 중에서도 자료 주인이나 허용된 담당자만 볼 수 있게 바꾸세요.' },
  sql: { title: '입력한 글을 자료 조회 명령에 붙이는 코드가 있어요', change: '검색창에 입력한 글을 명령문과 분리해서 전달하도록 바꾸세요. 기존 검색 기능은 그대로 유지해야 해요.' },
  cors: { title: '어느 사이트에서든 응답을 읽도록 허용하는 설정이 있어요', change: '공개용 서비스인지 먼저 확인하세요. 특정 사내 사이트에서만 써야 한다면 그 사이트 주소만 허용하세요. 이 설정만으로 자료 유출이 확인된 것은 아니에요.' },
  execute: { title: '입력받은 내용으로 컴퓨터 작업을 실행할 수 있는 코드가 있어요', change: '사람이나 AI가 입력한 내용이 그대로 실행되는지 확인하세요. 그렇다면 실행할 수 있는 작업을 정해두고, 중요한 작업은 승인을 받도록 바꾸세요.' },
  html: { title: '외부에서 받은 내용을 화면에 바로 넣는 코드가 있어요', change: '화면에 넣은 글이 프로그램으로 실행되지 않도록 바꾸세요. 단순한 글은 글자로만 표시하고, 서식이 필요하면 위험한 내용을 걸러내세요.' },
  tls: { title: '안전한 연결을 확인하는 설정에 문제가 있어요', change: '사이트 주소와 인증서가 올바른지 확인하고, 연결 상대를 확인하는 기능을 켜세요. 연결이 안 된다고 확인 기능을 끄면 안 돼요.' },
  other: { title: '사이트 보호 설정에 확인할 부분이 있어요', change: '아래 위치의 보호 설정을 서비스 용도에 맞게 적용하도록 요청하세요. 실제로 쓰지 않는 예시나 설명이라면 운영 코드를 고칠 필요는 없어요.' },
  demo: { title: '연습용 서비스에서 허용되지 않은 자료 조회를 확인했어요', change: '연습 화면에서 수정 전후를 비교해 보세요. 회사 서비스의 자료가 유출됐다는 결과는 아니에요.' },
};
function family(issue: SecurityIssue): keyof typeof advice {
  const rule = issue.ruleId || '';
  if (rule.startsWith('#API-')) return 'demo';
  if (rule.includes('-PII-')) return 'pii';
  if (/-(KEY|PUBLIC|BROWSER)-/.test(rule)) return 'key';
  if (/-(RLS|FIREBASE)-/.test(rule)) return 'access';
  if (rule.includes('-SQL-')) return 'sql';
  if (rule.includes('-CORS-')) return 'cors';
  if (/-(EXEC|EVAL|AGENT)-/.test(rule)) return 'execute';
  if (rule.includes('-XSS-')) return 'html';
  if (/-(TLS|HTTP)(-|$)/.test(rule)) return 'tls';
  return 'other';
}
export function resultActions(issues: SecurityIssue[], mode?: string) {
  const groups = new Map<string, { key: string; kind: keyof typeof advice; example: boolean; decision: ReturnType<typeof findingDecision>; issues: SecurityIssue[] }>();
  for (const issue of issues) {
    const kind = family(issue), decision = findingDecision(issue, mode), example = decision === 'example', key = `${decision}:${kind}:${decision === 'fix' ? issue.ruleId + ':' + (issue.sourceAssessment?.kind || '') : ''}`;
    const group = groups.get(key) || { key, kind, example, decision, issues: [] };
    group.issues.push(issue); groups.set(key, group);
  }
  return [...groups.values()].sort((a,b) => Object.keys(advice).indexOf(a.kind) - Object.keys(advice).indexOf(b.kind)).map(group => ({
    ...group, ...advice[group.kind],
    ...(group.decision === 'fix' ? group.issues[0].sourceAssessment?.status === 'actionable' ? { title: group.issues[0].sourceAssessment.title, change: group.issues[0].sourceAssessment.change } : group.issues[0].verifiedControl === 'unencrypted-http' ? {
      title: '사이트가 암호화되지 않은 연결을 허용하고 있어요',
      change: '사이트에 HTTPS를 적용하고 HTTP로 들어온 사람도 HTTPS 주소로 이동하도록 서버 설정을 바꾸세요.',
    } : {
      title: '사이트의 보안 연결을 정상적으로 확인할 수 없어요',
      change: '사이트 주소와 인증서의 이름·유효기간·발급 기관을 맞추고 HTTPS 연결을 유지하세요. 인증서 확인 기능을 끄지 마세요.',
    } : {}),
    ...(group.decision === 'review' && group.issues.some(issue => issue.ruleId === '#VULN-BROWSER-04') ? {title: '화면에서 AI를 직접 부르도록 허용한 설정이 있어요'} : {}),
    fact: group.issues[0].sourceAssessment?.reason || (group.decision === 'fix' ? (group.issues[0].verifiedControl === 'unencrypted-http' ? '실제 주소에 요청을 보내 암호화되지 않은 HTTP 연결이 남아 있는 것을 확인했어요. 개인정보 유출이 확인됐다는 뜻은 아니에요.' : '실제 연결에서 인증서 검증 실패 또는 보안 연결 해제를 확인했어요. 페이지 내용과 개인정보는 확인하지 못했어요.') : mode === 'api_demo' || group.kind === 'demo' ? '가짜 자료로 만든 연습 결과예요. 회사 서비스는 검사하지 않았어요.' : mode === 'url' ? '사이트가 돌려준 공개 응답에서 찾았어요. 실제 사용 중인 비밀값인지, 개인 자료인지까지 확인한 것은 아니에요.' : '선택한 파일에서 이 내용과 일치하는 부분을 찾았어요. 실제 사람의 정보인지, 사용 중인 코드인지, 밖에서 보이는지는 확인하지 못했어요.'),
  }));
}
export function actionPrompt(group: ReturnType<typeof resultActions>[number], systemName: string) {
  if (group.decision !== 'fix') return maskSecret(`아래 항목은 코드 모양으로 찾은 검토 후보이며 수정이 필요한 문제로 확인되지 않았습니다.
${group.title}
${group.fact}
위치:
${group.issues.map(issue => '- ' + issueLocation(issue)).join('\n')}
실제 사용 경로와 배포 여부, 예제·테스트·탐지 규칙인지 확인해주세요. 실제 비밀값이나 개인정보를 대화에 출력하지 마세요. 근거를 먼저 설명하고, 지금 단계에서는 코드를 변경하지 마세요.`);
  return maskSecret(`내가 만든 ${systemName || '서비스'}를 아래 내용에 따라 확인하고 필요한 부분만 고쳐주세요.
발견한 내용: ${group.title}
검사로 확인한 사실: ${group.fact}
요청할 변경: ${group.change}
대상 위치:\n${group.issues.map(issue => '- ' + issueLocation(issue)).join('\n')}
먼저 각 위치가 실제 사용 코드인지, 가짜 예시·테스트·탐지 규칙 문자열인지 구분해 주세요. 예시라는 이유만으로 실제 비밀값을 무시하지 마세요. 고칠 근거가 없으면 그대로 두고 이유를 설명해주세요.
각 위치를 빠짐없이 검토하고, 기존 기능과 보안 검사를 유지하세요. 필요한 파일이 없으면 파일명과 찾는 방법을 알려주세요. 실제 비밀번호·개인정보를 요청하거나 대화에 출력하지 마세요.
자료 삭제·권한 변경·실제 서비스 반영 전에는 영향을 설명하고 확인받으세요. 고친 내용, 실행한 테스트, 미확인 사항과 내가 다시 검사할 파일을 쉬운 말로 알려주세요. 실행하지 않은 검사는 통과했다고 말하지 마세요.`);
}
