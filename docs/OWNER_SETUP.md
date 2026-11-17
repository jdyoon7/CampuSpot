# 본인 최초 설정 — 팀원 전달 전에 한 번

현재 로컬 저장소 origin은 https://github.com/jdyoon7/CampuSpot.git 이며 초기 점검 시 커밋이 없는 main이었다. 이 문서와 코드 생성만으로 GitHub 업로드, 팀원 초대, 브랜치 보호 설정이 적용되지는 않는다.

1. GitHub에 jdyoon7 계정으로 로그인하고 해당 저장소가 본인 것인지 확인한다. 없다면 `CampuSpot` 이름으로 빈 저장소를 만든다(초기 README 추가하지 않기). 공개/비공개는 팀 정책으로 정한다. Organization이 있으면 그곳으로 이전하고 URL을 세 프롬프트에도 함께 수정한다. 개인 저장소 collaborator 방식으로도 3인 협업 가능하다.
2. VS Code에서 이 폴더를 열고 Terminal → New Terminal. `git remote -v`, `git status`, `git ls-remote --heads origin`으로 원격 확인. 원격에 이미 커밋이 있다면 아래 최초 업로드를 중단하고 fetch 후 이력을 검토한다. 강제 push 금지.
3. 본인 이름/실제 이메일로 아래 설정(예시 문자열 그대로 사용하지 않기):

```sh
git config user.name "본인 이름"
git config user.email "본인 GitHub 이메일"
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
git add .
git diff --cached --stat
git commit -m "chore: bootstrap CampuSpot collaboration workspace"
git push -u origin main
git switch -c develop
git push -u origin develop
git switch -c feature/discounts-foundation
```

4. GitHub Repository → Settings → Collaborators(Organization이면 Collaborators and teams)에서 두 사람의 GitHub ID를 초대하고 수락 확인. Organization 팀이면 Write 권한. 관리자 권한을 불필요하게 주지 않는다.
5. Settings → Branches 또는 Rules → Rulesets에서 main/develop 직접 push 제한, force push/삭제 제한, PR 및 다른 사람 1명 승인, 대화 해결, CI `quality` 성공을 요구한다. CI가 한 번 실행된 후 상태 검사를 선택한다. 사용 플랜/저장소 공개 범위에서 지원되지 않으면 제한을 기록하고 수동 PR 검토 규칙으로 운영한다. 보호 적용은 GitHub 화면에서 직접 확인한다.
6. develop를 기본 브랜치로 설정하면 새 PR base 실수를 줄일 수 있다. Vercel production branch는 나중에 main으로 따로 지정한다. 비밀키는 GitHub Secrets/Supabase secrets에만 넣고 채팅/프롬프트에 보내지 않는다.
7. 첫 공통 기반 PR(auth/profile/학교/권한)을 우선 완료하고 develop에 병합. 팀원은 설치와 읽기/화면 작업을 동시에 진행할 수 있지만 FK 및 인증 의존 쓰기 기능은 공통 기반 병합 후 검증한다.
8. 이제 각 사람에게 docs/prompts 해당 파일의 **내용 전체**를 한 번 전달한다. 문서 링크만 보내는 대신 전체 텍스트 복사. 초대가 수락되었고 develop가 원격에 있는지 먼저 확인한다.

본인이 아직 체크하지 않은 GitHub/외부 설정을 완료했다고 보고하지 않는다. 실제 배포·과금·운영 DB 변경은 이 초기 설정과 별도다.
