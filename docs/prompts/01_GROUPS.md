# CampuSpot 전달용 프롬프트 — A — 모임·대결 담당

이 문서 전체를 보관하고 개발 AI에게 그대로 전달하세요. 다른 사람의 별도 설명 없이 설치부터 PR까지 순서대로 진행하도록 작성했습니다.

## 이 문서를 받은 사람이 처음 할 일

이 문서는 사람용 설치 안내와 개발 AI용 지시를 함께 담은 독립적인 전달문이다. 처음부터 순서대로 따라간다. 이미 완료한 작업은 결과를 확인한 후 건너뛴다. GitHub 저장소는 **https://github.com/jdyoon7/CampuSpot.git** 이다. 별도 저장소를 새로 만들거나 ZIP으로 받아 재업로드하지 않는다.

### 1. 계정과 도구 설치

1. GitHub(https://github.com) 계정 생성 → 이메일 인증 → 전달자가 보낸 저장소 초대를 이메일 또는 GitHub 알림에서 수락. 비공개 저장소가 404면 로그인 계정과 초대 수락 여부를 확인한다. 본인 GitHub ID를 전달자에게 알려야 초대를 받을 수 있다. 이 초대는 저장소 관리자가 해야 하므로 AI가 우회할 수 없다.
2. Git https://git-scm.com/downloads 설치. Windows는 Git for Windows 기본 옵션으로 설치하고 에디터를 재시작. Terminal에서 `git --version` 확인.
3. Node.js https://nodejs.org 의 24 LTS 설치(npm 포함), 에디터 완전히 재시작. Terminal에서 `node --version`, `npm --version` 확인. 이 프로젝트는 Node 22.12 이상이 필요하며 팀 기준은 24이다.
4. 에디터 선택: **Visual Studio Code와 Visual Studio는 다른 앱이다.** VS Code 권장: https://code.visualstudio.com 설치. 이미 Visual Studio 2022를 쓴다면 그대로 가능: Git → Clone Repository, 복제 후 File → Open → Folder로 package.json이 있는 폴더 열기. .sln 프로젝트를 새로 만들거나 ASP.NET 템플릿으로 변환하지 않는다. Visual Studio의 View → Terminal(버전에 따라 Developer PowerShell)을 쓴다. 터미널 명령은 두 에디터에서 동일하다.
5. 선택: DB 작업 때 Docker Desktop https://www.docker.com/products/docker-desktop/ 설치/실행. Windows에서 WSL 2 요구 시 공식 설치 안내대로 활성화하고 재부팅. 회사/학교 장비 이용 조건은 해당 환경에서 확인. 화면 작업만 시작할 때는 Docker 불필요.

### 2. 저장소 복제 및 GitHub 연결

VS Code 기준: Ctrl+Shift+P → `Git: Clone` → 위 저장소 URL 붙이기 → 저장할 상위 폴더 선택 → Open. GitHub 인증 창이 뜨면 본인 계정으로 로그인. `Git: Clone`이 없으면 Git 설치 및 재시작 확인. Visual Studio는 시작 화면의 Clone a repository 또는 Git 메뉴 사용.
메뉴가 어렵다면 두 에디터 모두 아래 방식 가능. 아직 복제하지 않았을 때만 실행한다(이미 열었다면 중복 실행 금지).

```sh
git clone https://github.com/jdyoon7/CampuSpot.git
cd CampuSpot
```

에디터에서 이 폴더를 열고 터미널을 연다. `package.json`이 보이는 위치가 프로젝트 최상위다. 다음 명령의 이름/이메일은 반드시 자신의 값으로 바꾼다.

```sh
git config user.name "내 이름"
git config user.email "내 GitHub 이메일"
git remote -v
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
```

`develop`가 없으면 전달자가 최초 업로드/브랜치 생성을 마치지 않은 것이다. 임의로 다른 기준 브랜치에서 구현하지 말고 원격 상태를 확인한다. 권한 문제면 초대 수락/로그인 계정부터 확인. GitHub는 비밀번호 대신 브라우저 인증/Git Credential Manager를 사용한다. 토큰을 소스/터미널 공유 화면/프롬프트에 붙이지 않는다.

### 3. 처음 실행

```sh
npm ci
npm run dev
```

터미널에 나온 localhost 주소를 브라우저로 열어 홈/모임/행사·장소/혜택/마이페이지 확인. 시작 안내만 보이는 것이 초기 정상 상태다. 서버 종료 Ctrl+C. Windows PowerShell에서 npm.ps1 실행 제한 오류가 나면 에디터 터미널 프로필을 Command Prompt로 바꾸거나 `npm.cmd ci`, `npm.cmd run dev`를 쓴다. 시스템 전체 보안 정책을 낮추지 않는다.
환경변수 없이 시작 화면 가능. 실제 Supabase 사용 시 `.env.example`을 탐색기로 복사해 `.env.local`로 이름 변경(Windows에서 파일 확장명 표시), 공개 URL/publishable key만 넣고 Vite 재시작. 키 값을 이 문서나 GitHub에 넣지 않는다. 팀원이 각자 만든 서로 다른 클라우드 DB를 공용 DB인 것처럼 연결하지 않는다. 로컬 Docker Supabase 또는 전달자가 지정한 개발 프로젝트만 사용.

### 4. 개발 AI에게 지시하는 방법

VS Code의 본인이 이미 사용하는 코딩 AI(또는 Visual Studio에서 쓸 수 있는 AI)에 **이 전달문 전체**를 붙인다. 파일 수정 권한을 주고 프로젝트 폴더를 연다. AI 확장이 없으면 AI 채팅에서 아래 지시를 사용하되 자동 파일 수정이 안 되는 환경에서는 파일별 내용을 직접 반영해야 한다. 유료 확장 가입은 필수가 아니다.
AI는 먼저 현재 파일/AGENTS.md/docs/PROJECT_SPEC.md/docs/TEAM_CONTRACT.md/docs/DATABASE.md/docs/API.md를 읽고 분석해야 한다. 이 문서만 보고 새 앱을 별도로 생성하지 않는다. 원본 요구사항 27절은 저장소에 함께 들어 있다. 아래 담당 범위를 원본 요구사항에 맞춰 끝까지 구현하되 단계별 PR로 나누고 실제 완료/미연동/예정을 구분한다. 계획만 쓰거나 버튼/가짜 목록만 만든 뒤 완료로 보고하지 않는다.

## 세 사람이 함께 지킬 계약 — AI도 반드시 준수

- A 모임: groups/matches. B 행사: events/places/동아리. C 본인: discounts/business 및 공통 기반 통합. 다른 담당자의 기능 파일은 고치지 않는다.
- `src/app`, `src/shared`, package*.json, CI, 공통 설정/인증/포인트/결제/채팅/알림/관리자 기반은 C 소유. 공통 변경이 필요하면 자기 README와 PR 본문에 요청/이유/입출력/권한/실패 동작을 적는다. 공통 기반이 없으면 안전한 읽기/화면/검증/독립 로직부터 진행하고 실제 쓰기를 임의 인증 우회로 열지 않는다.
- 라우트는 이미 연결된 자기 features/<영역>/routes.tsx 안에서 추가한다. App.tsx를 세 명이 동시에 고치지 않는다. groups는 /groups/_, events는 /events/_, discounts는 /discounts/_. matches /groups/matches/_, places /events/places/_, business /discounts/business/_.
- DB public 스키마, UUID id, 사용자 FK profiles(id)=auth.users(id), snake_case, UTC timestamptz, 화면 Asia/Seoul. C의 공통 profiles/학교/권한 migration을 먼저 병합한 후 FK 사용. 공통 테이블을 담당별로 복제하지 않는다.
- migration은 `npx supabase migration new 담당영역_설명`으로 timestamp 이름을 만들고 새 파일만 추가. 공유된 기존 migration 수정 금지. RLS/Storage 접근 정책과 CHECK/UNIQUE/FK 인덱스 포함. DB 생성 타입은 C가 관리한다.
- 사용자 입력은 Zod+DB 제약. 읽기는 RLS+페이지네이션(기본20/최대100). 실패는 `{code,message,retryable}`. 로딩/빈 결과/오류/재시도/로그인 필요/미연결을 따로 표시. 공개 API 응답과 UI에 개인 인증자료/내부 오류/비밀키 금지.
- service role/Gemini/Groble/FCM 비밀은 서버 전용. `VITE_`에는 공개 가능한 키만. 외부 SDK/API는 공식 문서에서 실제 지원을 확인하고 URL/확인일을 PR에 기록. 존재하지 않는 API 금지.
- 실제 정보는 출처 URL/업데이트 시각/검증 상태 포함. 데이터 없는 경우 비었다고 표시. 가짜 축제/할인/가격/혼잡도를 실제 정보처럼 표시 금지. 테스트 fixture는 tests/fixtures/<영역>/에 격리.
- 포인트/결제/쿠폰/모집 정원은 서버 트랜잭션으로 권한·동시성·중복 검증. 클라이언트 잔액 변경/리다이렉트만으로 결제 완료 처리 금지. 공통 API 미제공이면 비활성 안내와 요청을 남긴다.
- 크롤링은 공식 API 우선, 허가된 공개 데이터만. 출처별 속도 제한/재시도/원본/정규화/중복 제거/검수/로그. CAPTCHA/로그인 우회 금지. AI 추출이 원문과 불일치하면 공개하지 않는다.
- 유료 가입/과금/실제 배포/운영 DB 변경은 사전 승인 필요. 로컬 구현·검증·문서·리뷰 가능한 PR까지는 계속 진행한다.

## 담당 브랜치 만들기

처음 설치 후 develop를 최신화한 상태에서 실행한다. 이미 같은 브랜치가 있으면 `git switch feature/groups-foundation`로 이동하고 상태를 먼저 확인한다.

```sh
git switch -c feature/groups-foundation
```

## 당신의 작업 범위와 상세 실행 순서 (개발 AI에게 직접 지시)

소유 폴더 `src/features/groups/**`, `src/features/matches/**`, `data-collection/groups/**`, `supabase/functions/groups-*`, 그룹 접미사 migration/DB 테스트, `tests/e2e/groups-*.spec.ts`, 자기 README. 화면은 groups/routes.tsx에서 연결한다.

**1차 PR — 실제 모임 기본 흐름:**

1. 원본 기획 4절/관련 16~17,22절을 읽고 groups/README.md에 요구사항 추적표 작성. 공통 profiles/학교/권한이 develop에 있는지 확인.
2. group_categories, groups, group_conditions, group_applications, group_members migration/RLS 설계. 공개 모집과 학교/학과/성별 등 제한 모집의 열람 조건을 서버에서 검증. 민감한 참가 자료는 모집 공개 응답에 포함하지 않는다.
3. 목록/검색/복수 필터/페이지네이션, 상세, 인증 사용자 모임 작성·수정·취소. 이름/소개/대표자/인원/일시/장소/비용/온라인 여부/일회·정기/개인·단체 신청 구분. 검색 지역/학교/종목/날짜/실력/비용 구현.
4. 카테고리는 DB 관리형. 스포츠(축구/풋살/농구/배드민턴/테니스/볼링/러닝/헬스/기타), 게임(롤/발로란트/오버워치/배그/FC온라인/기타), 친목·취미(술자리/보드게임/영화/여행/맛집/음악/공연/기타). 관리자 변경 권한만 허용.
5. 참가 신청/신청 취소, 대표자 승인·거절, 참가자·잔여 정원. 승인 함수는 auth.uid/대표자/신청 상태/마감/정원 검증 후 행 잠금+트랜잭션. 중복 승인·동시 마지막 자리·단체 인원 수·취소 후 자리 복구 테스트. 신청자 외 타인에게 신청 상세 비공개.
6. 대표자 관리 페이지: 참가자 목록/퇴장/일정·장소 변경/모집 완료. Realtime 사용 시 구독 접근 정책 및 정원 서버 재조회. 단순 optimistic UI만으로 완료 처리 금지.

**2차 이후 PR — 대결/운영 통합:** 7. matches/match_applications/match_results/group_reviews: 학교/학과/동아리/친구 그룹 간 스포츠·게임 대결, 부족 인원·상대 모집, 대표자 일정 조율, 결과 기록, 활동 종료 후 상호 평가. 참가/대표자 권한과 수정 이력 검증. 8. C의 chat API 제공 후 모임 단체 채팅/대표자 채팅 연결. 외부인이 메시지 읽기/쓰기 못하는지 RLS 테스트. 알림 수신 동의/일정 변경/참가 승인/마감/신규 관심 모임은 공통 notifications 연동 요청부터 작성. 9. 포인트 상단 노출/유료 홍보는 C의 points/payments/promotions 계약으로 연결. 서버 검증 없는 활성화 금지. 미연동이면 클릭 시 구체적 준비 상태 안내 또는 비활성 표시. 10. 작성 성공/실패/세션 만료/타인 수정/마감/경합/오프라인/API 장애, 모바일 주요 경로를 테스트. 본인 권한과 익명·다른 학교·다른 대표자 권한 비교. 기능별 README에 PR별 결과 기록.

## 매일 작업 및 PR 제출 — 마지막까지 실행

첫 작업은 아래 담당 브랜치 생성 명령 사용. 다음 작업부터는 develop 최신화 후 주제별 새 브랜치. 이미 작업 중이면 파일을 먼저 확인하고 덮어쓰지 않는다.

1. `npm run dev`로 담당 기능 개발. TypeScript 오류/브라우저 콘솔 오류 해결. 필요 시 두 번째 터미널에서 검사.
2. DB 작업은 Docker 실행 → `npm run db:start`. 처음 CLI 설정은 저장소에 들어 있다. 로컬 정보는 `npx supabase status`로 확인하되 출력의 키를 공유하지 않는다. 로컬 migration 적용/재현은 `npm run db:reset`(로컬 개발 데이터 삭제임을 확인, 공유/운영 원격에는 금지). DB 테스트는 supabase/tests/database에 담당 pgTAP 테스트 추가 → `npm run db:test`. Docker/키가 없어 실행 못했다면 미실행으로 표시하고 독립 작업 계속.
3. 아래 검사. `npm ci`가 lockfile 오류면 lockfile을 삭제하지 말고 Node 버전/브랜치/최초 업로드 상태를 확인. 새 의존성이 정말 필요하면 C에게 요청.

```sh
npm run typecheck
npm run lint
npm run format
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run format`은 전체 파일을 포맷하므로 다른 담당자 파일까지 바뀌면 그 파일의 변경을 확인하고 PR에 섞지 않는다. 좁은 수정은 `npx prettier --write 자기파일경로` 사용. 실제 로직별 테스트를 추가한다. 기본 smoke/unit 테스트가 통과한 것만으로 RLS/업무 테스트가 완료되었다고 하지 않는다. 4. 모바일 360px/390px/768px에서 목록/상세/작성/오류/로그아웃 권한을 검증. 키가 없어서 못 본 화면을 검증했다고 보고하지 않는다. 5. 자기 README에 원본 요구사항 매핑 표(항목/구현 상태/파일/테스트/외부 설정)와 실제 완료/미완료/다음 단계/공통 API 요청 기록. 실제 실행 명령과 결과, migration 적용 방식, 되돌리기 전략도 남긴다. 6. 커밋 전 `git status` → `git diff`. `.env.local`, 실제 개인정보, node_modules, dist가 포함되지 않는지 확인. 본인 소유 파일만 `git add 구체적경로`로 stage. 새 migration/테스트/담당 문서도 경로 지정해서 추가. 무심코 `git add .`로 다른 변경을 섞지 않는다. 7. `git diff --cached` 검토 → `git commit -m "feat(담당영역): 작업 내용"` → `git push -u origin 현재브랜치명`. 브랜치명은 `git branch --show-current`로 확인. 이 예시의 담당영역/현재브랜치명 문자열을 그대로 쓰지 않는다. 8. GitHub 저장소 → Compare & pull request(없으면 Pull requests → New pull request) → **base: develop, compare: 내 feature 브랜치**. 제목/PR 템플릿을 채우고 본인 제외 리뷰어 지정. CI 실패 시 로그를 열어 원인 수정 후 같은 브랜치로 commit/push. main/develop 직접 push 금지. 검증 미완료는 draft PR로 표시. 9. 코드 리뷰/CI를 통과한 후 승인받아 병합. 다음 작업은 `git fetch origin` → `git switch develop` → `git pull --ff-only origin develop` → 새 feature 브랜치. 미커밋 작업이 있으면 먼저 안전하게 커밋/보관한다. 10. 작업 중 develop 변경 반영: 작업 브랜치에서 `git fetch origin`, `git merge origin/develop`. 충돌 발생 시 Source Control의 충돌 파일을 열어 양쪽 의도를 확인. 이해 안 되면 `git merge --abort`로 돌아오고 관련 담당자에게 PR로 요청. 모든 충돌에 Accept Current/Incoming을 무작정 누르지 않는다. force push/reset --hard 금지.

## 자주 막히는 상황

- npm/git 명령을 못 찾음: 설치 후 터미널·에디터 재시작, PATH 확인. npm ERR ENOENT: package.json 있는 폴더인지 확인.
- localhost 안 열림: dev 서버를 종료하지 않았는지, 터미널 주소와 포트 확인. 5173 사용 중이면 Vite가 안내한 실제 포트 사용. 외부 공개 터널 필요 없음.
- push 403: 본인 계정/초대/Write 권한 확인. 다른 사람 계정을 빌려서 해결하지 않는다. 로그인 토큰 출력 금지.
- `develop` 없음/저장소 빈 상태: 전달자의 docs/OWNER_SETUP.md 완료가 선행 조건이다. 이것은 설치 오류가 아니다.
- Supabase 권한 오류: RLS/인증/정책을 조사한다. RLS 끄기/service role을 브라우저에 넣는 방식 금지.
- PR 충돌: 최신 develop merge 후 자기 변경만 해결하고 재검사. 남의 migration을 지우지 않는다.
- 외부 키/공통 기반 미준비: 필요한 설정명/구체적 단계만 문서화하고 데이터 조회 빈 상태/독립 테스트 등 진행 가능한 작업 계속. 비밀 값 자체를 요청하지 않는다.

## AI 최종 보고 양식

완료된 동작과 변경 파일 / 실제 실행한 검사·결과 / 실행 못한 검사와 이유 / 공통 변경 요청 / 사람이 해야 하는 계정·키 설정(값 제외) / PR URL 또는 아직 업로드하지 못한 이유 / 원본 요구사항 중 남은 항목. 실제 외부 설정/배포를 하지 않았다면 했다고 쓰지 않는다.

공식 참고: VS Code https://code.visualstudio.com/docs/sourcecontrol/github · Visual Studio https://learn.microsoft.com/visualstudio/version-control/git-clone-repository · Supabase https://supabase.com/docs/guides/local-development/cli/getting-started · 외부 기능 구현 전 해당 서비스 공식 문서 재확인.
