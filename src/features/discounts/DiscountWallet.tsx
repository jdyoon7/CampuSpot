import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client, errorFor } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { operationResult } from '../business/operations';
import { pageSize } from './api/reports';
import { ReportList } from './components/ReportList';

async function loadCoupons(page: number) {
  const data = operationResult(
    await client().rpc('list_my_discount_coupons', {
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    '내 쿠폰을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

async function loadPoints(page: number) {
  const data = operationResult(
    await client()
      .from('point_ledger')
      .select('id,source,amount,memo,created_at')
      .order('created_at', { ascending: false })
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize),
    '포인트 내역을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

const formatTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
});

function WalletContents() {
  const [balance, setBalance] = useState<number>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function loadBalance() {
      try {
        const value = operationResult(
          await client().rpc('my_discount_point_balance'),
          '포인트 잔액을 불러오지 못했습니다.',
        );
        if (active) setBalance(value);
      } catch (err) {
        if (active) setError(errorFor(err).message);
      }
    }
    void loadBalance();
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p role="status">
          {balance === undefined
            ? '포인트 조회 중'
            : `보유 포인트 ${balance.toLocaleString('ko-KR')}P`}
        </p>
      )}
      {balance !== undefined && balance < 0 && (
        <p>회수된 포인트는 이후 적립분에서 차감됩니다.</p>
      )}
      <button
        type="button"
        onClick={() => {
          setError('');
          setRevision((n) => n + 1);
        }}
      >
        쿠폰·포인트 새로고침
      </button>
      <ReportList
        key={'wallet-coupons-' + revision}
        title="내 쿠폰"
        empty="발급받은 쿠폰이 없습니다."
        load={loadCoupons}
      >
        {(coupon) => (
          <>
            <strong>{coupon.title}</strong>
            <p>
              {coupon.business} · {coupon.terms}
            </p>
            <p>
              {coupon.ends_on}까지 ·{' '}
              {coupon.redeemed_at
                ? '사용 완료'
                : coupon.usable
                  ? '사용 가능'
                  : '사용 불가'}
            </p>
            {coupon.code && (
              <p>
                직원에게 보여줄 코드{' '}
                <code className="discount-coupon-code">{coupon.code}</code>
              </p>
            )}
          </>
        )}
      </ReportList>
      <ReportList
        key={'wallet-points-' + revision}
        title="포인트 내역"
        empty="적립 내역이 없습니다."
        load={loadPoints}
      >
        {(entry) => (
          <p>
            {entry.source === 'coupon_spend'
              ? '쿠폰 발급'
              : entry.source === 'reward_revoke'
                ? '제보 보상 회수'
                : '혜택 제보 승인'}{' '}
            · {entry.amount > 0 ? '+' : ''}
            {entry.amount.toLocaleString('ko-KR')}P ·{' '}
            {formatTime.format(new Date(entry.created_at))}
            {entry.memo && <span> · {entry.memo}</span>}
          </p>
        )}
      </ReportList>
    </>
  );
}

export function DiscountWallet() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts">← 할인·혜택</Link>
      <h1>내 쿠폰·포인트</h1>
      {state.status === 'ready' ? (
        <WalletContents key={state.user.id} />
      ) : state.status === 'loading' ? (
        <p role="status">로그인 상태를 확인하는 중입니다.</p>
      ) : (
        <p>
          <Link to="/me">로그인</Link>하면 쿠폰과 포인트를 볼 수 있습니다.
        </p>
      )}
    </article>
  );
}
