import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { pageSize } from '../discounts/api/reports';
import { ReportList } from '../discounts/components/ReportList';
import { businessName } from './api';
import { operationResult } from './operations';

function Dashboard({ userId }: { userId: string }) {
  const load = useCallback(
    async (page: number) => {
      const data = operationResult(
        await client()
          .from('business_operator_requests')
          .select('id,business_id,status,businesses!inner(name,branch_name)')
          .eq('requested_by', userId)
          .in('status', ['approved', 'pending'])
          .order('created_at', { ascending: false })
          .order('id')
          .range(page * pageSize, (page + 1) * pageSize),
        '내 운영 매장을 불러오지 못했습니다.',
      );
      return {
        items: data.slice(0, pageSize),
        hasNext: data.length > pageSize,
      };
    },
    [userId],
  );
  return (
    <ReportList
      title="운영 매장과 신청 현황"
      empty="운영 중인 매장이나 검수 대기 중인 신청이 없습니다."
      load={load}
    >
      {(item) => (
        <>
          <strong>{businessName(item.businesses)}</strong>
          <p>{item.status === 'approved' ? '운영 승인' : '검수 대기'}</p>
          <Link to={'/discounts/business/' + item.business_id}>
            {item.status === 'approved' ? '지점 관리로 이동' : '신청 상태 보기'}
          </Link>
        </>
      )}
    </ReportList>
  );
}

export function BusinessDashboard() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts/business">← 매장·지점</Link>
      <h1>내 운영 매장</h1>
      {state.status === 'ready' ? (
        <Dashboard key={state.user.id} userId={state.user.id} />
      ) : state.status === 'loading' ? (
        <p role="status">계정을 확인하는 중입니다.</p>
      ) : (
        <p>
          <Link to="/me">로그인</Link>하면 내 지점과 신청 상태를 확인할 수
          있습니다.
        </p>
      )}
    </article>
  );
}
