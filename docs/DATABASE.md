# 공통 회원·학교 스키마

기준 파일은 `supabase/migrations/20261122161428_core_identity.sql`입니다. A/B는 이 migration 다음에 자기 테이블을 추가하고 사용자 FK에 `public.profiles(id)`, 학교 FK에 `public.universities(id)`를 사용하세요. 사용자 삭제 시 참가·행사 자료를 어떻게 보존할지는 각 기능 migration에서 결정합니다.

| 테이블                       | 주요 열과 관계                                                | 클라이언트 권한                                      |
| ---------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| universities                 | id, name                                                      | 누구나 조회                                          |
| campuses                     | id, university_id, name                                       | 누구나 조회                                          |
| departments                  | id, campus_id, name                                           | 누구나 조회                                          |
| university_email_domains     | domain → university_id                                        | 누구나 조회, 운영자가 확인한 학생 전용 도메인만 등록 |
| profiles                     | id = auth.users.id, nickname                                  | 로그인 회원이 닉네임 조회                            |
| private_profiles             | id, university_id, campus_id, department_id, student_number   | 본인만 조회, 본인 RPC로 수정                         |
| user_roles                   | (user_id, role)                                               | 본인만 조회, 서버에서만 부여                         |
| university_verifications     | user_id, university_id, school_email, verified_at, expires_at | 본인만 조회, 인증 RPC에서 기록                       |
| core_private.mail_challenges | user_id, school_email, university_id, digest, issued_at       | 비공개                                               |

공개 스키마 테이블은 RLS를 적용하며 created_at/updated_at을 기록합니다. 가입 트리거와 기존 계정 보충 작업이 프로필 두 행과 member 역할을 생성합니다. 가입 메타데이터에서 권한을 복사하지 않습니다. 학교·캠퍼스·학과의 조합은 FK로 검증합니다. 기초 목록에는 테스트 학교를 넣지 않았습니다.

본인이 입력한 학교는 추천에 사용할 수 있습니다. **학교 한정 데이터 접근**은 RLS에서 `university_id = (select public.my_verified_university())`로 검사하세요. 인증된 학교는 인증 메일을 받은 학교 도메인으로 결정합니다. 별도 권한이 필요한 경우 `(select public.has_my_role('event_organizer'))`와 행 소유자 조건을 함께 사용합니다. 관리자 포함 모든 추가 역할은 명시적으로 부여합니다.

학교 인증은 10분짜리 일회성 코드와 1분 재발송 제한을 두며 DB는 코드의 SHA-256만 보관합니다. 인증 유효기간은 초기값 180일입니다. 메일함 소유만으로 재학생 자격을 확인할 수 없는 도메인은 등록 대상에서 제외하고 별도 심사 정책을 먼저 정하세요. 인증 철회는 운영자가 해당 verification을 제거합니다.

로컬 적용·검증 절차는 [계정 개발 안내](../src/features/auth/README.md)에 있습니다. 공유 DB 적용 전 백업 및 신규 가입 트리거 동작을 검증하세요. 되돌릴 때는 앱 변경을 revert하고 데이터는 보존합니다. 기능 철회가 필요하면 새 migration으로 실행 권한·트리거부터 조정하고 기존 프로필 테이블 삭제는 별도 데이터 보존 계획을 세운 뒤 진행하세요.
