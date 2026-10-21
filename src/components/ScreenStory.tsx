import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import './ScreenStory.css';
import { InspectionIcon } from './InspectionIcon';

const sources = {
  finance: 'https://www.fsc.go.kr/no010107/87898',
};
export const ScreenStory: React.FC<{ onEnter: () => void; onStartScan: (mode?: 'upload' | 'url') => void }> = ({ onEnter, onStartScan }) => {
  const root = useRef<HTMLDivElement>(null);
  const scroll = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  useEffect(() => {
    const elements = root.current?.querySelectorAll('[data-story-reveal]');
    if (!elements || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.1 });
    elements.forEach(element => { element.classList.add('story-reveal-ready'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);
  return <div className="story-site" ref={root}>
    <a href="#story-main" className="story-skip" onClick={e=>scroll(e,'story-main')}>본문으로 바로가기</a>
    <header className="story-nav">
      <a href="#story-main" onClick={e=>scroll(e,'story-main')} className="story-brand" aria-label="AI 업무도구 보안점검 이야기 처음으로"><InspectionIcon /><span>AI 업무도구 보안점검<small>만든 것을, 오래.</small></span></a>
      <nav aria-label="AI 업무도구 보안점검 이야기"><a href="#now" onClick={e=>scroll(e,'now')}>왜 지금인가요</a><a href="#preview" onClick={e=>scroll(e,'preview')}>무엇을 확인하나요</a><a href="#why" onClick={e=>scroll(e,'why')}>시작한 마음</a></nav>
      <button className="story-nav-enter" aria-label="AI 업무도구 보안점검실 열기" onClick={onEnter}>점검실로<ArrowUpRight size={17} /></button>
    </header>
    <main id="story-main">
      <section className="story-hero" aria-labelledby="story-title">
        <img className="story-hero-photo" src="/assets/story/writing.jpg" alt="한 줄씩 생각을 적어 내려가는 손과 오래 펼쳐 둔 노트" fetchPriority="high" width={2200} height={1467} />
        <div className="story-hero-shade" aria-hidden="true" />
        <div className="story-hero-content">
          <div className="story-hero-intro">
          <p className="story-kicker">AI로 만든 웹·업무도구, 공개하기 전 작은 확인</p>
          <h1 id="story-title">AI로 만든 우리 팀의 도구, <br /><span>회사 자료까지</span><br />열어두진 않았나요?</h1>
          <p className="story-hero-description">잘 작동하는 화면 뒤에도 노출된 비밀키와 위험한 설정이 남을 수 있어요. <br className="story-desktop-break" />AI 업무도구 보안점검으로 코드·공개 웹 응답의 위험 단서를 찾고, 고친 뒤 다시 확인하세요.</p>
          <p className="story-handwritten story-hero-note">애써 만든 것을, 오래 쓰기 위해.</p>
          </div>
          <div className="story-start-panel" aria-labelledby="story-start-title">
            <p className="story-start-eyebrow"><InspectionIcon />AI 업무도구 보안점검 시작하기</p>
            <h2 id="story-start-title">무엇을 점검할까요?</h2>
            <p>가지고 있는 자료에 맞춰 하나만 선택하세요.</p>
            <button className="story-start-choice story-start-file" onClick={() => onStartScan('upload')}><InspectionIcon kind="file" className="story-choice-icon" size={34} /><span><strong>코드 파일 검사</strong><small>파일·폴더 속 비밀키와 위험한 설정</small></span><ArrowUpRight className="story-choice-arrow" size={22} /></button>
            <button className="story-start-choice" onClick={() => onStartScan('url')}><InspectionIcon kind="web" className="story-choice-icon" size={34} /><span><strong>웹사이트 주소 검사</strong><small>공개 주소의 보안 헤더·쿠키·일부 코드</small></span><ArrowUpRight className="story-choice-arrow" size={22} /></button>
            <p className="story-start-steps">살펴보고 <span>—</span> 고치고 <span>—</span> 다시 확인해요</p>
            <p className="story-hero-trust">가입·AI 키 없이 시작<br />코드 파일은 브라우저 안에서 검사해요.</p>
            <a href="#preview" onClick={e=>scroll(e,'preview')}>자료가 없다면, 결과 예시 먼저 보기<ArrowDown size={16} /></a>
          </div>
        </div>
        <div className="story-hero-margin" aria-hidden="true"><span>A LITTLE CARE,<br />FOR WHAT WE MAKE.</span><span>만드는 마음 곁에, AI 업무도구 보안점검.</span></div>
      </section>
      <section id="now" className="story-now story-container" aria-labelledby="story-now-title">
        <div className="story-section-index"><span>01 / 왜 지금인가요</span><span>금융위원회 공개 자료 · 2026. 10. 07.</span></div>
        <div className="story-now-layout">
          <div><p className="story-small-label">최근 금융권 사고가 남긴 질문</p><h2 id="story-now-title">우리의 업무도구는<br /><em>점검 안에 있나요?</em></h2></div>
          <div className="story-now-body"><p>금융위원회가 소개한 10월 7일 보도는 최근 금융권 해킹이 <strong>업무 지원 시스템 등 외부 접점</strong>에서 발생했다는 점을 짚었습니다.</p><p>우리 팀의 고객 관리 화면, 자료 공유 도구, AI 업무 서비스도 무엇이 공개되고 누가 접근할 수 있는지 살펴볼 이유입니다.</p><a href={sources.finance} target="_blank" rel="noreferrer">금융위원회 · 금융권 해킹, 보안 취약점 관리 강화<ArrowUpRight size={14} /></a><small>자료 확인 2026. 10. 21. · 이 사례를 AI가 만든 코드의 사고로 단정하지 않습니다.</small></div>
        </div>
        <div className="story-scope-bridge"><strong>AI 업무도구 보안점검에서는 코드와 공개 웹 응답의 위험 단서부터.</strong><p>실제 계정별 접근 권한과 운영 DB 정책은 별도로 확인해야 해요. 이 사고를 재현하거나 예방을 보증하는 검사는 아닙니다.</p></div>
      </section>
      <section id="preview" className="story-preview story-container" aria-labelledby="story-preview-title">
        <div className="story-section-index"><span>02 / 점검하면 무엇이 남나요</span><span>발견에서 수정 후 확인까지</span></div>
        <div className="story-preview-layout">
          <div className="story-preview-copy"><h2 id="story-preview-title">어디를 고칠지 알면,<br />다음이 쉬워집니다.</h2><p>코드 파일이나 공개 주소로 시작하세요.<br />발견한 위치와 이유를 읽고, 수정 요청문을 AI에 전달한 뒤 같은 자료로 다시 확인할 수 있어요.</p><ol><li><span>01</span>발견 위치와 마스킹된 증거 확인</li><li><span>02</span>수정 가이드·AI 수정 요청문 복사</li><li><span>03</span>수정한 자료로 재검사·변화 비교</li></ol><button className="story-primary" onClick={() => onStartScan('upload')}>내 업무도구 점검하기<ArrowUpRight size={18} /></button></div>
          <figure className="story-result-example"><figcaption>결과 읽는 법 <span>설명용 예시 · 실제 검사 결과 아님</span></figcaption><div className="story-example-finding"><span className="story-example-label">먼저 확인</span><h3>공개 코드의 비밀키 노출 의심</h3><p>브라우저에 전달되는 코드에 서버용 비밀키가 있으면 다른 사람이 가져갈 수 있어요.</p><code>src/client.ts · 12행<br />API_KEY = [마스킹됨]</code></div><div className="story-example-advice"><strong>이렇게 수정하도록 요청하세요</strong><p>서버용 키를 브라우저 코드에서 제거하고 서버에서만 사용하도록 바꿔주세요. 이미 노출된 키는 폐기·교체 여부도 확인해 주세요.</p></div><div className="story-example-recheck"><span>수정 후 재검사</span><strong>같은 패턴 미검출</strong><p>다시 검사한 범위에서 찾지 못했다는 뜻이에요. 키 교체와 기능 정상 동작은 별도로 확인해 주세요.</p></div></figure>
        </div>
      </section>
      <section id="why" className="story-letter story-container">
        <div className="story-section-index" data-story-reveal><span>03 / 시작한 마음</span><span>편리함 뒤에 남겨진 질문</span></div>
        <div className="story-letter-layout">
          <div className="story-letter-title" data-story-reveal><h2>좋아서 만든 일이<br />걱정으로<br />남지 않기를.</h2><span className="story-handwritten">그래서, 한 번 더 확인.</span><svg className="story-scribble" viewBox="0 0 140 80" fill="none" aria-hidden="true"><path d="M5 8C48 12 21 64 114 56M100 41l17 16-25 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
          <div className="story-letter-body" data-story-reveal><p>반복하던 업무를 조금 줄이고 싶어서.<br />동료가 자료를 더 쉽게 찾았으면 해서.<br />떠오른 생각을 직접 만들어 보고 싶어서.</p><p>AI 덕분에, 그 마음을 서비스로 옮기는 일이<br className="story-desktop-break" /> 훨씬 가까워졌습니다.</p><p>그런데 잘 돌아가는 화면 너머로,<br />접속 키가 보이고 회사 자료가 열려 있다면요.<br />만드는 법을 배운 우리에게<br className="story-desktop-break" /> 지키는 법도 쉬워야 한다고 생각했습니다.</p><p className="story-letter-signoff">이 프로젝트는 그 작은 확인을 돕기 위해 시작했습니다.<br /><strong>애써 만든 것을, 오래 쓰고 싶은 마음으로.</strong></p></div>
        </div>
      </section>
      <section id="promise" className="story-promise story-container">
        <div className="story-section-index"><span>04 / 우리의 약속</span><span>보안이 조금 더 가까워지도록</span></div>
        <div className="story-promise-heading" data-story-reveal><h2>귀찮게 하려는 게 아니라,<br /><span className="story-handwritten">계속 만들 수 있게.</span></h2><p>좋은 생각이 멈추지 않도록.<br />확인하는 일도 이해하기 쉽게 만들겠습니다.</p></div>
        <div className="story-posters">
          <article className="story-poster story-poster-photo" data-story-reveal><img src="/assets/story/writing.jpg" alt="" loading="lazy" width={2200} height={1467} /><span className="story-poster-no">약속 하나</span><h3>쉽게<br />이해하고.</h3><p>무엇이 문제인지,<br />왜 고쳐야 하는지.<br />내 업무의 말로 설명할게요.</p><span className="story-poster-sign">AI 업무도구 보안점검</span></article>
          <article className="story-poster story-poster-paper" data-story-reveal><span className="story-poster-no">약속 둘</span><h3>내 자료는<br />내 곁에.</h3><p>코드 파일은 브라우저에서 검사해요.<br />소스 원문을 외부 AI로 보내거나<br />관리 이력에 보관하지 않아요.</p><span className="story-poster-sign">AI 업무도구 보안점검</span></article>
          <article className="story-poster story-poster-door" data-story-reveal><img src="/assets/story/door.jpg" alt="" loading="lazy" width={933} height={1400} /><span className="story-poster-no">약속 셋</span><h3>고친 뒤에도<br />한 번 더.</h3><p>담당자와 조치 기한을 남기고,<br />수정한 자료를 다시 확인해요.<br />변화까지 함께 살펴볼게요.</p><span className="story-poster-sign">AI 업무도구 보안점검</span></article>
        </div>
        <p className="story-promise-fineprint">주소 검사는 이 컴퓨터의 검사 서버가 공개된 사이트에 접속해요. 자동 검사로 확인한 범위와 직접 확인해야 할 부분을 결과에서 구분해 드립니다.</p>
      </section>
      <section className="story-invitation" aria-labelledby="story-invitation-title"><div className="story-invitation-photo"><img src="/assets/story/door.jpg" alt="조용한 복도 끝, 열린 문 사이로 들어오는 오후의 빛" loading="lazy" width={933} height={1400} /></div><div className="story-invitation-copy" data-story-reveal><span className="story-small-label">이제, 당신이 만든 것의 차례.</span><h2 id="story-invitation-title">오늘 만든 것을<br />내일도<br /><i>안심하고 쓰도록.</i></h2><p>문을 나서기 전 한 번 돌아보듯,<br />공개하기 전 잠깐 살펴보세요.</p><button className="story-primary" onClick={() => onStartScan('upload')}>문 열고 점검하기<ArrowUpRight size={18} /></button><button className="story-text-button" onClick={onEnter}>먼저 점검실 둘러보기<ArrowRight size={15} /></button><small>파일·주소 검사 · 가입 없이 사용 · 별도 AI 키 불필요</small></div></section>
    </main>
    <footer className="story-footer story-container"><div className="story-footer-brand"><InspectionIcon /><span>AI 업무도구 보안점검<small>만든 것을, 오래.</small></span></div><p>만드는 사람의 마음을 생각하는<br />웹·AI 업무시스템 보안 자가 점검</p><div><span>© 2026 AI 업무도구 보안점검</span><details><summary>사진과 글꼴에 관하여</summary><p>사진은 연출 분위기를 위한 이미지이며 실제 사고·사용자와 무관합니다.</p><a href="https://unsplash.com/photos/vq8vdVxFrtc" target="_blank" rel="noreferrer">작업 사진: Terrillo Walls / Unsplash</a><a href="https://unsplash.com/photos/VxCDgMuXo2w" target="_blank" rel="noreferrer">문 사진: Aleksandr Zaitsev / Unsplash</a><a href="https://hangeul.naver.com/font" target="_blank" rel="noreferrer">본문·제목: 네이버 마루부리 · SIL Open Font License</a><span>손글씨: 네이버 클로바 나눔손글씨 암스테르담 · SIL Open Font License</span></details></div></footer>
  </div>;
};
