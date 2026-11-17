# 아키텍처

단일 React SPA + Supabase Auth/PostgreSQL/RLS/Storage/Realtime/Edge Functions. 기능별 vertical slice로 화면/api/hooks/schema/types와 테스트를 함께 둔다. 의존성 방향은 app → features → shared. 다른 기능 내부 import 금지; 필요한 공통 계약은 shared로 승격을 요청한다.

src/features/{groups,events,discounts}/routes.tsx가 사전 연결되어 세 사람이 App.tsx를 동시에 수정할 필요가 없다. 독립 feature branch에서 작업하고 develop로 통합한다.

서버 비밀키/결제 검증/포인트 거래는 Edge Functions 또는 PostgreSQL 트랜잭션. 장시간 Python/Playwright 수집은 별도 worker로 두고 정규화/검수 후 DB에 저장. 미확인 AI 추출 데이터를 자동 공개하지 않는다.

공통 auth/context 및 DB 스키마는 후속 core PR에서 구현한다. 이 scaffold에 인증 보호가 이미 있다고 가정하지 않는다. 실제 비공개 데이터 UI는 RLS 검증이 통과되기 전 활성화 금지.
