# CampuSpot

대학생 여가·교류 통합 플랫폼의 3인 협업용 시작 저장소입니다.

## 현재 준비된 것

React + TypeScript + Vite + Tailwind + Lucide, 5개 메뉴, 기능별 라우트 경계, Supabase 연결 진입점, ESLint/Prettier/Vitest/Playwright, GitHub Actions, 에디터 설정과 협업 문서.
마이페이지에서 이메일 가입·로그인·복구, 프로필 관리와 학교 인증을 이용합니다. 개발용 Supabase 연결은 [계정 개발 안내](src/features/auth/README.md)를 따르세요. 실제 행사·할인 데이터, 쿠폰·결제·PWA는 후속 단계입니다.

## 시작

Node.js 24 LTS와 Git을 설치한 후 저장소 최상위 터미널에서 실행하세요.

```sh
npm ci
npm run dev
```

터미널에 표시되는 localhost 주소를 브라우저에서 엽니다. 종료는 Ctrl+C.
환경변수 없이 시작 화면을 볼 수 있습니다. 실제 연동 시 `.env.example`을 `.env.local`로 복사하고 공개 키만 채웁니다.

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm ci`는 전달된 lockfile을 그대로 사용합니다. 기능 개발 중 패키지 업그레이드는 통합 담당자와 조율합니다.

## 전달할 파일 3개

- `docs/prompts/01_GROUPS.md`: 모임 담당자에게 파일 내용 전체 전달
- `docs/prompts/02_EVENTS.md`: 행사·장소 담당자에게 파일 내용 전체 전달
- `docs/prompts/03_BENEFITS_LEAD.md`: 본인(혜택 및 통합 담당) 사용

각 프롬프트는 독립적으로 읽을 수 있습니다. 저장소 URL, 초보자 설치/연결/개발/PR 순서, AI에게 지시할 작업과 완료 기준을 포함합니다.
**팀원 전달 전에 본인이 `docs/OWNER_SETUP.md`의 최초 업로드·초대·develop 구성을 완료해야 합니다.**

## 문서

- 원본 요구사항: docs/PROJECT_SPEC.md
- 최초 GitHub 설정: docs/OWNER_SETUP.md
- 역할/충돌 방지/공통 계약: docs/TEAM_CONTRACT.md
- 작업 방법: CONTRIBUTING.md
- 설계/DB/API/개발 순서/보안: docs/ARCHITECTURE.md, docs/DATABASE.md, docs/API.md, docs/DEVELOPMENT_PLAN.md, docs/SECURITY.md
- 실제 데이터 출처 관리: docs/DATA_SOURCES.md
- 출시 전 체크: docs/RELEASE_CHECKLIST.md

공식 안내: [VS Code GitHub](https://code.visualstudio.com/docs/sourcecontrol/github), [Visual Studio Git](https://learn.microsoft.com/visualstudio/version-control/git-clone-repository), [Supabase 로컬 개발](https://supabase.com/docs/guides/local-development/cli/getting-started).
