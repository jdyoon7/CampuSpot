# 로컬에서 마이페이지 사용하기

1. Docker Desktop을 실행하고 저장소 루트에서 `npm ci`, `npm run db:start`를 실행합니다. 기존 로컬 프로젝트에 새 migration만 적용하려면 `npx supabase migration up --local`을 사용하세요.
2. `npx supabase status`에서 로컬 API URL과 공개용 Publishable Key(또는 anon key)를 확인하고 `.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`에 입력합니다. secret/service_role은 브라우저에 넣지 마세요.
3. `npm run dev` 후 5173 포트의 마이페이지에서 회원가입을 선택합니다. CLI status에 나오는 로컬 메일함에서 링크를 열어 일반 이메일을 확인한 뒤 로그인하세요. 복구 메일도 같은 메일함에서 확인합니다.
4. 닉네임을 바꾸고 새로고침하여 세션과 변경 내용을 확인하세요. 학교 목록은 검증된 학교 자료를 등록한 뒤 사용할 수 있습니다. 계정 탈퇴는 현재 비밀번호와 확인 체크가 필요합니다.
5. 학교 인증 메일을 사용하려면 승인된 학생 전용 도메인을 DB에 등록하고, 서버 전용 `supabase/functions/.env`에 Resend의 `RESEND_API_KEY`, 검증된 발신 주소 `SCHOOL_MAIL_FROM`을 설정합니다. `npx supabase functions serve core-account --env-file supabase/functions/.env`를 실행하세요. 학교 메일에 도착한 코드를 마이페이지에 입력합니다. 발신 계정 설정 전에도 일반 로그인·프로필은 사용할 수 있습니다.

개발/스테이징 프로젝트를 연결할 때는 Email Auth의 이메일 확인을 켜고 Site URL 및 Redirect URLs에 해당 환경의 /me, /me/reset을 등록합니다. 로컬 설정은 localhost와 127.0.0.1의 5173 포트 기준입니다.

| 범위                                                      | 상태                                            |
| --------------------------------------------------------- | ----------------------------------------------- |
| 이메일 가입·세션·복구·탈퇴 / 프로필·권한 / 학교 인증 코드 | 구현. 실제 서비스 사용은 Supabase 설정 필요     |
| 개발 DB의 학교·캠퍼스·학과·학생 도메인                    | 테이블 준비. 공식 자료 등록 필요                |
| 학교 메일 발송                                            | Resend 서버 연동 구현. 실제 발신 도메인·키 필요 |
| 소셜 로그인                                               | Google·Kakao·Apple 콘솔 설정 대기               |
| 관심사, 차단·신고, 권한 심사 운영 화면                    | 후속 개발                                       |

검증은 `npm run check`, `npm run test:e2e`로 시작합니다. 폐기 가능한 로컬 Docker DB에서만 `npm run db:reset`, `npm run db:test`를 실행하세요. `npm run test:account`는 5173 포트를 비운 상태에서 로컬 Supabase에 일회용 계정을 만들어 가입, 로그인, 프로필, 복구 링크와 탈퇴를 검사합니다. 실제 메일 소유자 확인은 테스트 관리자가 대신합니다. 원격 DB 적용·배포는 별도 단계입니다.

공식 연동 문서 (2026-11-23 확인) — [Supabase Auth 세션](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [비밀번호 복구](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [계정 삭제](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [Storage 권한](https://supabase.com/docs/guides/storage/security/access-control), [Resend 메일 발송](https://resend.com/docs/api-reference/emails/send-email).
