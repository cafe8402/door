import React from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import type { SecurityIssue } from '../types/security';
import { issueTitle, issueExplanation } from '../services/presentation';

function analogy(rule = '') {
  if (rule.startsWith('#API-')) return '다른 사람의 사물함을 내 열쇠로 열어본 가상 실험이에요. 예제에서 확인한 결과이며, 실제 서비스도 열린다는 뜻은 아니에요.';
  if (/KEY|PUBLIC|BROWSER/.test(rule)) return '집 열쇠를 현관 밖에 두면 다른 사람이 가져갈 수 있죠. 서비스의 비밀키도 다른 사람에게 보이면 비슷한 문제가 생길 수 있어요. 원래 공개해도 되는 키인지부터 확인해야 해요.';
  if (rule.includes('SQL')) return '손님의 주문 메모를 직원이 따라야 할 명령으로 착각하는 것과 비슷해요. 입력한 글은 자료로만 다루고, 자료를 읽고 바꾸는 명령과 분리해야 해요.';
  if (rule.includes('RLS')) return '사물함마다 주인이 있는데 누구나 열 수 있게 설정했는지 살펴보는 거예요. 함께 쓰는 공개 자료인지, 주인만 봐야 하는 자료인지 먼저 확인해요.';
  if (rule.includes('PII')) return '연락처가 적힌 종이를 공개 게시판에 붙여 둔 상황을 생각해 보세요. 진짜 개인정보인지, 공개할 필요가 있는지 확인해야 해요.';
  if (rule.includes('CORS')) return '어느 웹사이트에서 우리 서비스의 응답을 읽을 수 있는지 정하는 설정이에요. 모두 허용해도 되는 공개 서비스인지 확인해야 해요. 이것만으로 로그인 없이 자료가 유출됐다고 단정할 수는 없어요.';
  if (/EVAL|EXEC|AGENT/.test(rule)) return '누군가 적은 메모를 읽기만 해야 하는데, 그 안의 지시까지 실행하는 상황과 비슷해요. 어떤 지시를 실행할 수 있는지와 사람의 확인이 필요한지 살펴봐요.';
  if (rule.startsWith('#WEB-')) return '문이 잘 열리는지와 잠금장치가 알맞게 설정됐는지는 별개예요. 이번에는 사이트가 보내는 응답에서 보호 설정을 살펴봤어요. 실제 침입이 있었다는 뜻은 아니에요.';
  return '잘 작동하는 화면에도 확인할 설정이 남아 있을 수 있어요. 자동 검사는 확인할 위치를 알려주는 표시예요. 실제 위험인지는 그 코드가 어떻게 쓰이는지 살펴봐야 해요.';
}
export function EasyExplanation({ issue }: { issue: SecurityIssue }) {
  const demo = issue.ruleId?.startsWith('#API-');
  const web = issue.ruleId?.startsWith('#WEB-') || /^(?:script:)?https?:\/\//.test(issue.filePath || '');
  return <aside className="easy-help" aria-labelledby="easy-help-title">
    <div className="easy-help-heading"><MessageCircle size={21} aria-hidden="true" /><div><h2 id="easy-help-title">이 결과가 어려우신가요?</h2><p>쉬운 설명 도우미 · 질문을 누르면 안내가 펼쳐져요.</p></div></div>
    <p className="easy-help-context">지금 보고 있는 항목: {issueTitle(issue)}</p>
    <details><summary>이게 왜 문제예요?<ChevronDown size={18} aria-hidden="true" /></summary><div className="easy-help-answer"><p>{analogy(issue.ruleId)}</p><p>{issueExplanation(issue)}</p><p className="easy-help-hint">아래 1단계에서 내용을 읽고, 2단계의 문구로 AI나 개발 담당자에게 확인을 부탁하세요.</p></div></details>
    <details><summary>어디에 붙여 넣어요?<ChevronDown size={18} aria-hidden="true" /></summary><div className="easy-help-answer"><ol><li>아래 2단계에서 ‘수정 부탁 문구 복사’를 누르세요.</li><li>이 서비스를 만들 때 사용한 AI에서 같은 프로젝트의 대화창을 여세요.</li><li>붙여 넣고 보내세요. 파일을 볼 수 없다고 하면 ‘어떤 파일이 필요한지, 어디에서 찾는지 알려줘’라고 물어보세요.</li></ol><p className="easy-help-hint">AI를 쓰지 않는다면 개발 담당자에게 전달해도 돼요. 회사에서 허용한 도구를 사용하고, 문구에 회사 자료나 개인정보가 없는지 먼저 확인하세요. 복사 버튼만으로 전송되지는 않아요.</p></div></details>
    <details><summary>고쳤는데 또 나와요<ChevronDown size={18} aria-hidden="true" /></summary><div className="easy-help-answer"><ol>{demo ? <><li>이 항목은 가상 API 예제예요. 실제 서비스 수정 결과와 구분하세요.</li><li>재검사에서 수정 후 예제를 선택했는지 확인하세요.</li></> : web ? <><li>코드만 고친 상태라면 실제 사이트는 아직 그대로일 수 있어요. 담당자와 변경 내용이 반영됐는지 확인하세요.</li><li>처음 검사한 사이트의 주소로 다시 검사했는지 확인하세요.</li></> : <><li>AI가 제안만 한 것인지, 실제 파일을 수정하고 저장한 것인지 확인하세요.</li><li>재검사에 예전 파일이 남아 있다면 제거하고, 수정한 파일을 같은 이름·폴더 구조로 선택하세요.</li></>}<li>다시 나온 위치를 확인하세요. 같은 문제가 다른 곳에도 남아 있을 수 있어요.</li><li>판단하기 어렵다면 최신 결과를 AI나 담당자에게 보여주고 실제 문제인지 다시 확인해 달라고 하세요.</li></ol><p className="easy-help-hint">‘확인 못함’이라면 해결됐다는 뜻이 아니에요. 파일이 빠졌거나 사이트를 읽지 못한 이유부터 확인하세요. 결과를 없애려고 필요한 기능을 무작정 지우지는 마세요.</p></div></details>
    <p className="easy-help-footnote">현재 항목에 맞춘 준비된 안내예요. AI 채팅이나 외부 전송 없이 이 화면에서 열립니다.</p>
  </aside>;
}
