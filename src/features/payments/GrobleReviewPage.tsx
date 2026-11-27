import { Link } from 'react-router-dom';
import { client } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { formatKoreanDate } from '../../shared/lib/date';
import { operationResult } from '../business/operations';
import { pageSize } from '../discounts/api/reports';
import { canReview } from '../discounts/api/review';
import { ReportList } from '../discounts/components/ReportList';

const events: Record<string, string> = {
  'payment.completed': '결제 완료',
  'payment.cancel_requested': '환불 요청',
  'payment.refunded': '환불 완료',
};
const states: Record<string, string> = {
  matched: '주문과 일치',
  unmatched: '주문을 찾지 못함',
  mismatch: '상품·금액·시각 불일치',
  additional_payment: '추가 결제 확인 필요',
  awaiting_completion: '원 결제 확인 대기',
  duplicate: '중복 이벤트',
};
async function receipts(page: number) {
  const data = operationResult(
    await client().rpc('list_groble_ad_payment_review', {
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    '결제 수신 내역을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
export function GrobleReviewPage() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts/review">← 혜택 제보 검수</Link>
      <h1>매장 광고 결제 검토</h1>
      {state.status === 'ready' && canReview(state.account.roles) ? (
        <ReportList
          key={state.user.id}
          title="Groble 결제 수신 내역"
          empty="수신한 결제 내역이 없습니다."
          load={receipts}
        >
          {(event) => (
            <>
              <strong>
                {events[event.kind]} · {states[event.outcome] ?? '확인 필요'}
              </strong>
              <p>
                결제 {event.amount_krw.toLocaleString('ko-KR')}원
                {event.refunded_krw
                  ? ' · 환불 ' +
                    event.refunded_krw.toLocaleString('ko-KR') +
                    '원'
                  : ''}
              </p>
              <p>
                Groble 거래 번호{' '}
                <code className="discount-coupon-code">
                  {event.merchant_id}
                </code>
              </p>
              <small>{formatKoreanDate(event.event_at)}</small>
            </>
          )}
        </ReportList>
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
