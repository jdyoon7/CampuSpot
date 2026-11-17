# 협업 순서

최초 설치/에디터별 설명은 docs/prompts의 역할별 파일에 모두 포함되어 있습니다.

```sh
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/groups-list
npm ci
npm run dev
```

작업 후 `npm run check`, 필요한 `npm run test:e2e`, DB 변경 시 로컬 migration/RLS 테스트. .env/키/개인정보는 stage하지 않는다.

```sh
git add src/features/groups
git diff --cached
git commit -m "feat(groups): add searchable listing"
git push -u origin feature/groups-list
```

GitHub Compare & pull request → base develop → 팀원 리뷰 요청 → CI 통과 → 승인 후 병합. PR 템플릿을 모두 작성한다. 공통 코드는 C에게 변경 요청한다.
작업 브랜치에서 최신 통합 반영은 `git fetch origin` 후 `git merge origin/develop`. 충돌 파일은 소유자와 확인하고 양쪽 변경을 보존한다. 모르면 `git merge --abort`로 돌아오고 오류와 파일을 PR에 기록한다. reset --hard / force push / 전체 폴더 덮어쓰기 금지.
