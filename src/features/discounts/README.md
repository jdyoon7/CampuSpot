# 할인·혜택 제보

할인·혜택 메뉴(`/discounts`)에서 로그인한 사용자가 매장명, 할인 내용·조건, 날짜 범위 또는 상시 여부, 공식 공지 링크를 제출합니다. 제출 직후와 새로고침 후 모두 **내 제보**에서 검수 상태를 확인할 수 있습니다. 접수한 자료의 공식 출처 여부는 검수자가 판단합니다.

| 원본 요구                                           | 구현                                                               | 확인 방법                                              |
| --------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| 6-5 신규 제보, 공식 SNS·공지 링크                   | `DiscountsPage.tsx`, `components/ReportForm.tsx`, `api/reports.ts` | `npm run test:account` 안의 discounts-reports 시나리오 |
| 6-2 기간·검수 상태와 본인 조회                      | `components/MyReports.tsx`, discount_reports migration             | 제출 직후 pending. 내역은 최신순 20건씩 조회           |
| 6-5 중복 및 권한                                    | DB 제약, RLS, 컬럼별 INSERT 권한                                   | `npm run db:test` 안의 discounts_reports.test.sql      |
| 포스터 첨부, 관리자 검수·공개, 수정·종료 신고, 보상 | 후속 작업                                                          | 이 단계에서 제보는 공개 혜택 목록에 게시되지 않습니다. |

공통 인증 migration 다음에 `supabase/migrations/20261123073314_discounts_create_reports.sql`을 적용합니다. 테이블은 사용자 FK로 `profiles(id)`를 참조합니다. 접수 상태와 시각은 DB가 지정하고, 회원은 본인 명의 등록·본인 조회가 가능합니다. 동일 작성자의 매장명·할인 내용·출처·기간이 같은 검수 대기 제보는 중복 저장되지 않습니다. 가입 계정 삭제 시 해당 제보도 삭제됩니다.

로컬 Supabase와 공개 키를 준비하는 순서는 [계정 개발 안내](../auth/README.md)에 있습니다. 기존 개발 DB에서는 `npx supabase migration up --local` 후 앱을 시작하세요. 혜택 제보는 추가 API 키가 필요하지 않습니다. `npm run check`, `npm run db:test`, `npm run test:account`가 각각 입력 검증, DB 권한, 실제 등록 화면을 검사합니다. 기능을 되돌릴 경우 UI 커밋을 revert하고 공유 DB에 접수된 제보는 보존합니다.
