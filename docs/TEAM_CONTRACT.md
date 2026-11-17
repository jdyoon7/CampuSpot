# 3인 소유권 및 통합 계약

| 역할   | 소유 영역                                     | 기능 migration 접미사                   | 수집/서버          |
| ------ | --------------------------------------------- | --------------------------------------- | ------------------ |
| A 모임 | src/features/groups, matches                  | _groups_설명.sql                        | groups             |
| B 행사 | src/features/events, places                   | _events_설명.sql                        | events             |
| C 본인 | src/features/discounts, business, 공통 나머지 | _discounts_설명.sql 또는 _core_설명.sql | discounts, _shared |

서버는 supabase/functions/<영역>-<동작>/index.ts처럼 별도 디렉터리를 만든다. 현재 같은 이름의 빈 디렉터리는 자리 표시이며 배포 가능한 함수가 아니다.
수집기는 data-collection/<영역>/ 아래. 각 담당 README 및 tests/fixtures/<영역>/ 사용. 단위 테스트는 소유 폴더 안에 둔다.
C는 공통 인증/학교/권한/홈/커뮤니티/포인트/채팅/알림/결제/관리자/분석/배포의 최종 통합 책임자다. 한 번에 모두 구현하는 의미가 아니며 아래 기반 계약부터 완료한다.

## 고정 경계

- /groups/* → groups/routes.tsx, /events/* → events/routes.tsx, /discounts/* → discounts/routes.tsx. 각 담당은 자기 routes.tsx 내부에 상세/작성 라우트를 추가한다.
- matches는 /groups/matches/_, places는 /events/places/_, business는 /discounts/business/*로 노출한다.
- src/app, src/shared, package*.json, 설정, CI, 공통 migration은 C 소유. 요청은 PR 본문 `공통 변경 요청`으로 기록한다. 공통 변경 없이는 안전하게 구현할 수 없는 쓰기 기능은 닫고 독립 작업을 계속한다.
- 공통 기반 먼저: C가 profiles/auth/universities/user_roles + RLS + 인증 훅/학교 인증 상태를 제공한 PR을 먼저 develop에 병합한다. 이후 A/B가 이에 FK를 연결한다. 같은 테이블을 따로 생성하지 않는다.
- DB는 public 스키마, UUID 기본키(id), user 참조는 profiles(id)=auth.users(id), UTC timestamptz, snake_case. 코드 camelCase로 변환할 경우 API 경계에서 한다.
- 사용자 공개 프로필과 인증 이메일/역할 검증 자료는 분리한다. 공개 프로필에 민감한 데이터를 넣지 않는다. roles는 본인 UPDATE 불가.
- 공통 테이블 이름은 원본 기획을 기준으로 C가 docs/DATABASE.md에 확정한다. 확정 전 이름을 추측해 공통 의존 코드를 만들지 않는다.
- 에러 계약: {code, message, retryable}; UI에 내부 DB 오류/비밀키를 그대로 노출하지 않는다. 목록은 limit 기본20/최대100 및 안정된 정렬+페이지네이션.
- 날짜 ISO UTC 저장/전달, 화면 Asia/Seoul. 금액은 KRW 정수(원), 인원 양의 정수. 사용자 입력은 Zod 및 DB 제약으로 이중 검증.
- 업로드는 비공개 bucket을 기본으로 하고 공개 포스터만 검수 후 공개한다. 개인 자료는 signed URL. Storage RLS/크기/실제 MIME/확장자 제한 필요.
- 포인트/결제 API는 아직 없음. A/B가 잔액 테이블을 직접 갱신하거나 별도 결제를 만들지 않는다. 미연동으로 표시하고 API 요청을 남긴다.

## migration 충돌 방지

`npx supabase migration new groups_create_groups`처럼 CLI로 UTC timestamp 파일 생성. 담당 접미사 필수. 기존 공유 migration 수정 금지. timestamp 중복 시 아직 미적용인 자기 파일만 새 timestamp로 재생성.
원격 DB를 각각 직접 수정하지 않는다. 로컬 DB는 개인별 Docker 스택. C만 staging 적용 담당. 공통 FK가 먼저 실행되는지 깨끗한 로컬 reset으로 검증. 공유 원격에서 db reset 금지.

## 브랜치 및 검토

main 배포, develop 통합. feature/groups-주제, feature/events-주제, feature/discounts-주제, feature/core-주제. PR은 작게, base develop. C가 A/B PR 검토, A 또는 B가 C PR 검토. 자기 PR 단독 승인 금지. 아직 리뷰어를 정하지 못하면 draft PR로 남긴다.
main으로의 배포 PR은 세 영역 회귀 검증 후 C가 작성. 자동 배포 설정 전 팀 승인. 담당자는 매 PR마다 자기 README에 실제 완료/외부 설정/미완료/명령 결과를 갱신한다.
