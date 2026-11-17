# API 계약

현재 실제 업무용 RPC/Edge Function은 없다. Supabase 클라이언트 진입점만 있다. 아래는 후속 구현의 기준이다.

- src/shared/lib/supabase.ts는 미설정 시 null. 담당 api 계층에서 연결 여부 확인하고 UI에 미연결 표시.
- 읽기는 Supabase + RLS + pagination. 입력/필터 Zod 검증. 서버 권한 검증을 UI 숨김으로 대체 금지.
- 사용자 공개 프로필/인증 정보는 공통 auth 계약 확정 후 사용. 역할을 localStorage로 부여 금지.
- 실패 반환은 `{ code: string, message: string, retryable: boolean }`, 사용자 표시 메시지에 내부 오류/비밀/SQL 금지.
- 모집 승인, 쿠폰 사용, 검수 승인/포인트 보상, 광고 활성화는 원자적인 RPC/서버 함수. 타임아웃 재시도에도 중복 효과 방지.
- 공통 points/payments/chat/notifications 인터페이스는 C가 후속 PR로 문서와 함께 확정. URL/RPC/SDK를 임의로 가정하지 않는다. A/B는 필요한 entity_type/id, 동작, 요청/성공/권한/실패를 자기 README에 요청으로 기록한다.
- 외부 연동 구현 PR에 공식 문서 URL, 확인 날짜, 지원 여부, 인증 방식, 테스트/실환경 구분을 남긴다. Groble 검증 방식 미확정 상태에서는 실제 결제 버튼 비활성화.
