# 공통 인증 API

화면에서는 `src/shared/auth/useAuth.ts`의 `useAuth()`를 사용합니다. `state.status`는 unconfigured, loading, signed-out, error, ready 중 하나입니다. ready에만 `state.user.id`, `state.account.profile`, `roles`, `verifiedUniversityId`가 있습니다(마지막 두 필드도 account 아래). error에는 `{code,message,retryable}` 형태의 error와 재로그인에 쓸 user가 있습니다. `refresh()`로 DB 상태를 다시 읽습니다.

```tsx
const { state } = useAuth();
if (state.status === 'ready') {
  const canShowOrganizerTools = state.account.roles.includes('event_organizer');
  // 행사 쓰기 RLS에서도 public.has_my_role('event_organizer')를 확인합니다.
}
```

| 호출                        | 입력 → 성공                                                               | 권한 / 실패                                                                          |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| save_my_profile             | p_nickname, p_university, p_campus, p_department, p_student_number → void | 로그인 본인. 선택 필드를 생략하면 비웁니다. 조합이 맞지 않으면 프로필 변경 전체 취소 |
| my_verified_university      | 인수 없음 → UUID 또는 null                                                | 로그인 본인. 미인증·만료는 null                                                      |
| has_my_role                 | p_role → boolean                                                          | 로그인 본인. verified_student는 유효한 학교 인증에서 계산                            |
| core-account POST JSON      | action=school-email, email → sent                                         | 확인된 가입 계정. unknown_domain, rate_limited, mail_unconfigured, mail_failed       |
| confirm_school_email        | p_code(UUID) → boolean                                                    | 요청한 본인. 만료·오입력·이미 사용·다른 계정에 연결된 주소는 false                   |
| core-account POST image/png | PNG 본문 → saved                                                          | 현재 사용자, 최대 2MB·1024×1024. 서버가 PNG를 디코딩하고 다시 인코딩                 |
| core-account POST JSON      | action=delete, password → deleted                                         | 로그인 사용자와 비밀번호가 확인된 계정만 탈퇴. 사진 및 계정 연관 기록 정리           |

클라이언트 계정 작업은 `src/shared/auth/account.ts`에 있습니다. Edge 응답은 `{code}`이고 클라이언트가 사용자 메시지와 재시도 여부로 변환합니다. service_role 전용 issue_school_challenge는 브라우저에서 호출하지 않습니다. 프로필 사진은 비공개 core-avatars 버킷의 본인 UID/avatar.png에 저장하며 사용자 직접 쓰기는 허용하지 않습니다. 행사 포스터나 할인 증빙은 각각 별도 권한 정책을 가진 버킷이 필요합니다.

현재 지원하는 역할 이름은 member, verified_student, event_organizer, business_owner, admin, super_admin입니다. 북마크, 포인트, 결제, 채팅, 알림 API는 후속 PR에서 추가합니다.
