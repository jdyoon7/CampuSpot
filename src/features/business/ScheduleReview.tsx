import { useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { ActionForm } from '../auth/ActionForm';
import { pageSize } from '../discounts/api/reports';
import { canReview } from '../discounts/api/review';
import { ReportList } from '../discounts/components/ReportList';
import { formatSchedule } from './schedules';
import { operationResult } from './operations';

async function listRequests(page: number) {
  const data = operationResult(
    await client()
      .from('discount_business_schedule_requests')
      .select(
        'id,business_id,offer_name,starts_on,ends_on,weekdays,available_from,available_until,base_starts_on,base_ends_on,base_weekdays,base_available_from,base_available_until,note',
      )
      .eq('decision', 'pending')
      .order('created_at')
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize),
    '일정 변경 요청을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

function Queue() {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={revision}
        title="일정 변경 검수 대기"
        empty="검수할 일정이 없습니다."
        load={listRequests}
      >
        {(request) => (
          <>
            <strong>{request.offer_name}</strong>
            <Link to={'/discounts/business/' + request.business_id}>
              공개 매장 보기
            </Link>
            <p>
              기존 일정{' '}
              {formatSchedule({
                starts_on: request.base_starts_on,
                ends_on: request.base_ends_on,
                weekdays: request.base_weekdays,
                available_from: request.base_available_from,
                available_until: request.base_available_until,
              })}
            </p>
            <p>요청 일정 {formatSchedule(request)}</p>
            <p>변경 근거 {request.note}</p>
            <div className="discount-actions">
              {[true, false].map((approve) => (
                <ActionForm
                  key={String(approve)}
                  label={approve ? '일정 변경 승인' : '일정 변경 반려'}
                  submit={async () => {
                    operationResult(
                      await client().rpc('review_discount_schedule', {
                        p_request: request.id,
                        p_approve: approve,
                      }),
                      '일정 변경을 처리하지 못했습니다.',
                    );
                    setNotice(
                      approve
                        ? '공개 일정을 변경했습니다.'
                        : '일정 요청을 반려했습니다.',
                    );
                    setRevision((n) => n + 1);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </ReportList>
    </>
  );
}

export function ScheduleReview() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts/review">← 혜택 제보 검수</Link>
      <h1>매장 할인 일정 검수</h1>
      {state.status === 'ready' && canReview(state.account.roles) ? (
        <Queue key={state.user.id} />
      ) : (
        <p>
          {state.status === 'loading'
            ? '권한을 확인하는 중입니다.'
            : '관리자 계정으로 로그인해 주세요.'}
        </p>
      )}
    </article>
  );
}
