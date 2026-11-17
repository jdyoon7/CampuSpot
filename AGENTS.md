# CampuSpot 개발 지침

- 먼저 docs/PROJECT_SPEC.md, docs/TEAM_CONTRACT.md, docs/API.md, docs/DATABASE.md와 담당 기능의 README를 읽는다.
- 소유권: A 모임(groups/matches), B 행사(events/places), C 혜택(discounts/business) 및 공통 기반 통합. 다른 담당자 파일은 임의 수정하지 않는다.
- src/app/App.tsx와 패키지, 공통 타입은 C가 관리한다. 기능 라우트는 각 기능 routes.tsx 안에서 확장한다.
- 기능별 브랜치 → develop PR → 통합 검증 → main. 직접 main/develop push, 강제 push, 다른 사람 변경 삭제 금지.
- 모든 테이블 RLS, 서버 권한 검증, SQL migration, 실제 Supabase 조회. service role/개인정보/결제 secret 브라우저 노출 금지.
- 원본 기획은 장기 목표다. 미구현 기능을 완료라고 보고하지 않는다. 데이터/키가 없으면 명확한 미연결 상태를 제공한다.
- 결제/포인트/쿠폰/승인/학교 인증은 클라이언트 값으로 권한이나 상태를 확정하지 않는다.
- 변경 후 npm run check 및 관련 E2E/DB 테스트 실행. 실패와 미실행을 구분해 기록한다.
- 외부 서비스는 공식 문서를 확인한다. 실제 배포/운영 DB 변경/과금은 별도 승인 전 실행하지 않는다.
