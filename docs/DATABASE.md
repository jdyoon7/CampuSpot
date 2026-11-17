# DB 계약 및 적용 순서

현재 실제 테이블/migration/RLS는 생성하지 않았다. supabase/config.toml은 로컬 CLI 설정이다. 아래는 구현 계약이며 완료된 스키마가 아니다.

1. C: universities/campuses/departments/profiles/user_roles/university_verifications. auth.users 연동, 공개/비공개 프로필 분리, 안전한 가입 트리거. 일반 회원이 roles/verification 상태 수정 불가.
2. A: group_categories/groups/group_members/group_applications/group_conditions/matches/match_applications/match_results/group_reviews.
3. B: events/event_categories/event_applications/event_reviews/event_reports/event_questions/event_answers/places/place_categories/place_facilities/place_images/place_reviews/place_reports/clubs/club_members.
4. C: businesses/business_owners/business_verifications/discounts/discount_reports/business_partnerships/coupons/user_coupons/coupon_redemptions.
5. C 공통 후속: 원본 기획의 community/points/chat/payments/notifications/collection 테이블. B는 행사 검수 화면/수집 로직을 소유하지만 공통 검수 테이블 중복 생성 금지.

모든 public 테이블에 RLS, 필요한 FK 인덱스 및 CHECK/UNIQUE. RLS는 anon/authenticated/소유자/타인/허용 역할/관리자별 SELECT/INSERT/UPDATE/DELETE 검증. 공개된 데이터에 한해 anon SELECT. 인증 상태만으로 관리자 권한을 부여하지 않는다.

모집 승인 정원은 행 잠금 및 트랜잭션으로 동시 초과 방지. 재신청/중복 참가의 UNIQUE 설계. 쿠폰 사용은 서버 시각/매장 권한/잔여 수량/기한 검사 후 일회성 코드 검증 및 원자적 사용 처리. 포인트 지급/차감은 원장과 잔액을 동일 트랜잭션으로 갱신하고 idempotency key UNIQUE.

로컬 개발: Docker Desktop 실행 → `npm ci` → `npm run db:start` → `npm run db:reset`. reset은 로컬 데이터 삭제 명령이므로 개발 fixture만 둔다. 운영/공유 원격 reset 금지. `npm run db:types`는 C만 생성/커밋(현재 generated 파일 없음). migration 생성은 `npx supabase migration new groups_create_groups` 등. 병합 전 깨끗한 로컬 DB에 전체 migration 재적용하고 `npm run db:test`로 실제 pgTAP 테스트 실행. 아직 DB 테스트 파일이 없으므로 통과로 보고하지 않는다.

공통 API/컬럼 확정 시 이 문서를 실제 스키마로 갱신하고 마이그레이션/롤백 전략 기록. 파괴적 변경은 expand/migrate/contract 순서로 데이터 보존 계획 필요.
