# 제출본 보존

2026-10-21 제출 시점의 소스와 발표자료를 보존한 저장소입니다.

- 루트: 로컬 실행용 앱 및 URL 검사 서버
- `outputs/`: 발표 PPT 및 인포그래픽
- `시연자료/`: 유형별 수정 전·후 더미 데이터
- `sites/submission-source-2026-10-21.zip`: 실제 Sites 배포 커밋의 파일 검사 전용 소스
- `sites/DEPLOYMENT.md`: 배포 주소와 배포 기록

제출 태그: `submission-2026-10-21-verified`. 새 개발은 별도 폴더와 브랜치에서 진행하고 기존 제출 사이트에 재배포하지 않습니다.

## 실행

Node.js와 pnpm을 설치한 뒤 `pnpm install --frozen-lockfile`, `pnpm dev`를 실행합니다. 빌드는 `pnpm build`, 타입 검사는 `pnpm lint`, 테스트는 `pnpm test`입니다. URL 검사 서버 실행 방식은 루트 README를 참고하세요.

Sites 소스 ZIP은 압축을 풀고 의존성을 설치한 다음 빌드할 수 있습니다. 원본 배포 커밋은 `dac0325848977a5b9a53d026cfe0f34a2607fea2`입니다. 저장소 업로드만으로 Sites가 재배포되지는 않습니다.

비밀 환경설정, 설치된 의존성, 임시 빌드 도구는 백업에서 제외합니다. 시연자료는 가상의 값이며 실제 현업 성과나 보안 인증을 의미하지 않습니다.
