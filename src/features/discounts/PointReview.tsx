import { useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { ActionForm } from '../auth/ActionForm';
import { operationResult, textField } from '../business/operations';
import { canReview } from './api/review';
import { pageSize } from './api/reports';
import { ReportList } from './components/ReportList';

async function listRewards(page: number) {
  const data = operationResult(
    await client().rpc('list_discount_reward_grants', {
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    '제보 적립 내역을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
function ReviewRewards() {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={revision}
        title="제보 적립 내역"
        empty="확인할 보상이 없습니다."
        load={listRewards}
      >
        {(reward) => (
          <>
            <strong>{reward.label}</strong>
            <p>{reward.amount.toLocaleString('ko-KR')}P</p>
            {reward.revoked_at ? (
              <p>회수 완료 · {reward.reason}</p>
            ) : (
              <details className="discount-correction">
                <summary>제보 포인트 회수</summary>
                <ActionForm
                  label="회수 확정"
                  submit={async (form) => {
                    operationResult(
                      await client().rpc('revoke_discount_reward', {
                        p_entry: reward.id,
                        p_reason: textField(form, 'reason'),
                      }),
                      '포인트를 회수하지 못했습니다.',
                    );
                    setNotice('제보 보상을 회수했습니다.');
                    setRevision((n) => n + 1);
                  }}
                >
                  <label>
                    회수 사유
                    <textarea name="reason" required maxLength={500} />
                  </label>
                </ActionForm>
              </details>
            )}
          </>
        )}
      </ReportList>
    </>
  );
}
export function PointReview() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts/review">← 혜택 제보 검수</Link>
      <h1>제보 포인트 검수</h1>
      {state.status === 'ready' && canReview(state.account.roles) ? (
        <ReviewRewards key={state.user.id} />
      ) : (
        <p>관리자 계정으로 로그인해 주세요.</p>
      )}
    </article>
  );
}
