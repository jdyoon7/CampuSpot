import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { client } from '../../shared/auth/account';
import { canReview } from '../discounts/api/review';
import { ReportList } from '../discounts/components/ReportList';
import { ActionForm } from '../auth/ActionForm';
import { listOperatorRequests, operationResult } from './operations';

function Requests({ userId }: { userId: string }) {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const load = useCallback(
    (page: number) => listOperatorRequests(userId, page),
    [userId],
  );
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={revision}
        title="운영자 신청"
        empty="대기·승인된 운영자 신청이 없습니다."
        load={load}
      >
        {(request) => (
          <>
            <Link to={'/discounts/business/' + request.business_id}>
              신청한 매장 보기
            </Link>
            <p>{request.note}</p>
            <a href={request.evidence_url} target="_blank" rel="noreferrer">
              운영자 확인 자료
            </a>
            {(request.status === 'pending'
              ? [
                  ['approved', '운영 승인'],
                  ['rejected', '신청 반려'],
                ]
              : [['revoked', '운영 권한 해제']]
            ).map(([decision, label]) => (
              <ActionForm
                key={decision}
                label={label}
                submit={async () => {
                  operationResult(
                    await client().rpc('review_business_operator', {
                      p_request: request.id,
                      p_decision: decision,
                    }),
                    '운영자 신청을 처리하지 못했습니다.',
                  );
                  setNotice(label + ' 처리가 완료됐습니다.');
                  setRevision((n) => n + 1);
                }}
              />
            ))}
          </>
        )}
      </ReportList>
    </>
  );
}

export function OperatorReview() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts/review">← 혜택 검수</Link>
      <h1>매장 운영자 검수</h1>
      {state.status === 'ready' && canReview(state.account.roles) ? (
        <Requests userId={state.user.id} />
      ) : (
        <p>
          {state.status === 'loading'
            ? '관리자 권한을 확인하는 중입니다.'
            : '관리자 계정으로 로그인해 주세요.'}
        </p>
      )}
    </article>
  );
}
