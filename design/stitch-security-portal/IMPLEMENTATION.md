# Stitch 입구 화면 적용

- 원본: 사용자가 제공한 stitch_security_portal_redesign.zip의 code.html, screen.png, DESIGN.md.
- 실제 화면: src/components/ScreenPortal.tsx / ScreenPortal.css.
- 코드와 디자인 문서가 상충하는 경우 첨부 스크린샷과 code.html의 둥근 문 프레임·금빛 테두리·배치를 기준으로 적용.
- 문 이미지: code.html에 연결된 Googleusercontent 원본을 public/assets/portal/door-original.jpg로 보관. 새 그림이나 CSS 도형으로 대체하지 않음.
- Noto Serif KR(입구 문구에 필요한 글자, 300/400), Space Mono(400)를 Google Fonts에서 받아 로컬 제공. Google Fonts의 SIL Open Font License 적용.
- 실행 시 Tailwind CDN, Font Awesome CDN, 외부 이미지·글꼴 요청을 사용하지 않음. 기존 프로젝트의 Tailwind와 Lucide 아이콘 사용.
- 최초 접속과 새로고침은 입구 화면. 문 클릭·Enter·Space로 500ms 확대·페이드 후 기존 실제 점검 홈으로 이동. 동작 줄이기 설정에서는 즉시 이동.
- 브라우저 뒤로 가기 또는 점검 홈의 ‘문이 있는 입구로’로 입구 재방문 가능. 같은 페이지에서 기존 검사 결과는 유지.
- ZIP의 결과 시뮬레이션·가짜 검사 시간·alert 영상 안내는 적용하지 않음. 기존 실제 검사·영상·보고서 기능을 유지.
- 원본의 ‘무설치’와 ‘ENCRYPTED PROTOCOL’은 기능 범위와 일치하도록 파일 로컬 검사 안내와 LOCAL CODE INSPECTION으로 변경.

Font sources:
- https://fonts.google.com/noto/specimen/Noto+Serif+KR
- https://fonts.google.com/specimen/Space+Mono
