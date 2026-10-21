import React from 'react';
import { ArrowRight, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { SecurityIssue } from '../types/security';
import { issueTitle } from '../services/presentation';

export const IssueImpact: React.FC<{ issue: SecurityIssue }> = ({ issue }) => {
  const id = issue.ruleId || '';
  const key = id.startsWith('#VULN-KEY');
  const aiKey = ['#VULN-KEY-01', '#VULN-KEY-02', '#VULN-KEY-08', '#VULN-BROWSER-04'].includes(id);
  const api = id.startsWith('#API-');
  const execution = /VULN-(EXEC|EVAL|AGENT)/.test(id);
  const pii = id.includes('PII');
  const xss = id.includes('XSS');
  const title = id.includes('-SQL-') ? '입력한 글이 SQL 명령을 바꾸면, 업무 자료를 읽거나 바꿀 수 있어요.' : id.includes('-RLS-') ? '자료별 접근 제한이 풀리면, 권한 밖의 업무 자료가 보일 수 있어요.' : id.includes('-PUBLIC-') ? '공개 변수에 넣은 비밀값은 브라우저에서 읽을 수 있어요.' : aiKey ? '내 AI 접속 키가 남에게 보이면, 내 비용으로 사용될 수 있어요.' : key ? '서비스의 열쇠가 코드에 들어 있어요. 노출 여부를 확인해야 해요.' : id === '#API-AUTH' ? '로그인하지 않아도 비공개 자료가 전달돼요.' : id === '#API-BFLA' ? '일반 사용자에게 관리자 자료가 전달돼요.' : api ? '로그인한 사람과 자료 주인이 달라도 자료가 전달돼요.' : execution ? '입력이나 AI의 판단이 실행 권한과 이어질 수 있어요.' : pii ? '개인 식별 정보가 코드와 함께 퍼질 수 있어요.' : xss ? '보여줄 글이 브라우저에서 실행되는 코드가 될 수 있어요.' : issueTitle(issue);
  const source = aiKey || key ? '코드 속 접속 키' : api ? '다른 사람의 비공개 자료' : execution ? '외부 입력 · AI의 지시' : pii ? '코드 속 개인 식별 정보' : xss ? '외부에서 받은 글' : '발견한 설정 · 코드';
  const target = aiKey || key ? '코드를 읽는 사람' : api ? '권한 없는 계정' : execution ? '파일 · 명령 실행 기능' : pii ? '코드를 받는 사람' : xss ? '사용자의 브라우저' : '서비스 이용 환경';
  const harm = aiKey ? '키가 유효하고 권한이 열려 있으면, 요금이 발생하거나 연결된 자료에 접근할 수 있어요.' : key ? '키의 종류·유효성·권한에 따라 계정이나 연결된 서비스에 접근할 수 있어요.' : api ? '수정 전 가상 API에서 타인·관리자·미로그인 접근 문제를 확인했어요. 실제 서비스는 별도 확인이 필요해요.' : execution ? '허용되지 않은 명령이나 파일 변경으로 이어질 수 있어요. 실제 입력 경로와 실행 권한을 확인하세요.' : pii ? '공개 저장소나 배포 파일에 포함되면 회수하기 어려워요. 실제 개인정보인지 확인하세요.' : xss ? '외부 입력이 그대로 연결되면 사용자의 화면에서 원하지 않는 스크립트가 실행될 수 있어요.' : issue.impactDescription;
  const fix = aiKey || key ? '공개 여부를 확인하고 노출된 비밀키는 교체해요. 비밀키는 서버에서만 사용해요.' : api ? '서버에서 자료 소유자와 역할을 확인한 뒤 허용된 자료만 전달해요.' : execution ? '입력·실행 대상을 제한하고, 중요한 실행에는 승인을 받아요.' : pii ? '개인정보를 제거하거나 가상 자료로 바꾸고, 공개된 기록도 확인해요.' : xss ? '글은 글로 표시하고, HTML이 필요하면 안전하게 정화해요.' : issue.resolutionSteps[0]?.desc || '아래 수정 안내에 따라 설정과 실제 동작을 확인해요.';
  return <section className="rounded-2xl overflow-hidden border border-work-danger-line bg-work-panel" aria-label="왜 고쳐야 하는지 한눈에 보기"><header className="px-5 sm:px-6 py-5 bg-work-danger-bg"><p className="text-[10px] font-bold text-work-danger-copy inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />이걸 그대로 두면?</p><h2 className="text-lg sm:text-xl font-bold leading-snug text-work-title mt-2">{title}</h2></header><div className="p-5 sm:p-6"><div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center"><div className="rounded-xl bg-work-soft p-4 text-center text-xs sm:text-sm font-bold text-work-title">{source}</div><div className="text-center text-work-danger-copy"><Eye className="w-4 h-4 mx-auto" /><ArrowRight className="w-6 h-6 mt-1" /></div><div className="rounded-xl bg-work-danger-bg border border-work-danger-line p-4 text-center text-xs sm:text-sm font-bold text-work-danger-copy">{target}</div></div><div className="grid sm:grid-cols-2 gap-5 mt-5"><div><h3 className="text-xs font-bold text-work-danger-copy">생길 수 있는 피해</h3><p className="text-xs text-work-copy mt-2 leading-relaxed">{harm}</p></div><div><h3 className="text-xs font-bold text-work-success-copy inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />고쳐야 하는 이유 · 막는 방법</h3><p className="text-xs text-work-copy mt-2 leading-relaxed">{fix}</p></div></div><p className="text-[10px] text-work-faint mt-4">{api ? '가상 API 실습 결과를 설명하는 화면이에요.' : '발견한 패턴이 실제로 사용될 때의 위험 설명이에요. 실제 노출·악용 여부는 추가 확인이 필요해요.'}</p></div></section>;
};
