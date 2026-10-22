import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, FileDown, Play } from 'lucide-react';
import { InspectionIcon } from './InspectionIcon';
import { WorkGuideVideo } from './WorkGuideVideo';
interface Props {
  onStart: (mode: 'url' | 'upload') => void; onReturnToPortal: () => void;
  onOpenHowToUse: () => void; onOpenWhatWeCheck: () => void;
  onViewResult: () => void; onSaveResult: () => void;
  lastScan?: { name: string; count: number; date: string };
}
export const ScreenDesk: React.FC<Props> = ({onStart,onReturnToPortal,onOpenHowToUse,onOpenWhatWeCheck,onViewResult,onSaveResult,lastScan}) => {
  const [videoOpen,setVideoOpen]=useState(false);
  return <div className="desk-home">
    <header className="desk-introduction"><p className="desk-label">ai-work-security의 점검실</p><h1>무엇을 점검할까요?</h1><p>파일이나 웹사이트 주소를 선택하세요.<br />확인한 내용과 다음 할 일을 쉽게 안내해 드려요.</p><span className="desk-handwritten">잘 만든 마음, 오래 쓰도록.</span></header>
    <div className="desk-layout"><section aria-labelledby="desk-start-title"><div className="desk-section-title"><h2 id="desk-start-title">점검할 자료를 골라주세요</h2><button onClick={onOpenHowToUse}>처음이라면, 이용 방법<ArrowUpRight size={13}/></button></div>
      <div className="desk-methods"><button className="desk-method" onClick={()=>onStart('upload')}><span className="desk-method-number"><InspectionIcon kind="file" size={36}/></span><div><h3>코드 파일 검사</h3><p>만들고 있는 파일이나 프로젝트 폴더를 선택해요.</p><small>접속 키 노출 · 위험한 SQL · 자료 접근 설정</small></div><ArrowUpRight className="desk-method-arrow" size={23}/></button>
      <button className="desk-method" onClick={()=>onStart('url')}><span className="desk-method-number"><InspectionIcon kind="web" size={36}/></span><div><h3>웹사이트 주소 검사</h3><p>이미 운영 중인 사이트의 공개된 부분을 확인해요.</p><small>보안 연결 · 보호 설정 · 공개된 코드</small></div><ArrowUpRight className="desk-method-arrow" size={23}/></button>
      </div><p className="desk-local-note">파일 용량·개수의 고정 제한 없이, 내 브라우저에서 검사해요.<br />처리 가능한 양은 기기 메모리에 따라 달라집니다.</p>
      {lastScan&&<section className="desk-recent"><span className="desk-label">방금 살펴본 것</span><h2>{lastScan.name}</h2><p>{new Date(lastScan.date).toLocaleDateString('ko-KR')} · 발견한 내용과 바꿀 방법을 정리했어요</p><div><button onClick={onViewResult}>결과 이어서 보기<ArrowRight size={14}/></button><button onClick={onSaveResult}><FileDown size={14}/>상세 결과 저장</button></div></section>}
    </section></div>
    <section className="desk-help"><button onClick={onOpenWhatWeCheck}><span className="desk-label">확인할 수 있는 범위</span><h2>어디까지 살펴보나요?<ArrowUpRight size={16}/></h2><p>자동 검사로 알 수 있는 것과<br />직접 확인해야 할 부분을 알려드려요.</p></button><button onClick={()=>setVideoOpen(true)}><span className="desk-label">20초 자막 안내</span><h2>처음이라면, 영상으로<Play size={15}/></h2><p>업무용 예시로 살펴보는<br />검사 → 수정 → 다시 확인.</p></button><div><span className="desk-label">내 자료에 대한 약속</span><h2>원문은 내 곁에.</h2><p>소스코드 원문을 외부 AI로 보내지 않아요.<br />시스템에 연결한 관리 요약만 이 브라우저에 남겨요.</p></div></section>
    {videoOpen&&<WorkGuideVideo onClose={()=>setVideoOpen(false)}/>}
  </div>;
};
