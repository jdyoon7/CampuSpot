import { FunctionsHttpError } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AccountError, client } from '../../shared/auth/account';
import { ActionForm } from '../auth/ActionForm';
import { operationResult } from '../business/operations';
import { pageSize } from '../discounts/api/reports';
import { ReportList } from '../discounts/components/ReportList';

type Catalog =
  { configured: false } | { configured: true; price: number; duration: number };
const money = (amount: number) => amount.toLocaleString('ko-KR') + '원';
const formatDate = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const date = (value: string) => formatDate.format(new Date(value));

async function startCheckout(businessId: string) {
  const { data, error } = await client().functions.invoke<{
    configured: boolean;
    checkoutUrl?: string;
  }>('groble-checkout', {
    body: { action: 'checkout', businessId },
  });
  if (error instanceof FunctionsHttpError) {
    if (error.context.status === 403)
      throw new AccountError(
        'groble_forbidden',
        '승인된 매장 운영자만 광고를 주문할 수 있습니다.',
      );
    if (error.context.status === 409)
      throw new AccountError(
        'groble_active',
        '이 매장의 광고가 이미 노출 중입니다.',
      );
  }
  if (data?.configured === false)
    throw new AccountError(
      'groble_unconfigured',
      'Groble 결제 설정이 아직 연결되지 않았습니다.',
    );
  if (error || !data?.checkoutUrl)
    throw new AccountError(
      'groble_unavailable',
      '주문을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      true,
    );
  const next = new URL(data.checkoutUrl);
  if (
    next.protocol !== 'https:' ||
    next.username ||
    next.password ||
    next.port ||
    !['groble.im', 'www.groble.im'].includes(next.hostname)
  )
    throw new AccountError(
      'groble_unavailable',
      '결제창 주소를 확인할 수 없습니다.',
      true,
    );
  window.location.assign(next.href);
}

function CheckoutPanel({ businessId }: { businessId: string }) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void client()
      .functions.invoke<Catalog>('groble-checkout', {
        body: { action: 'catalog' },
      })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setCatalog(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const load = useCallback(
    async (page: number) => {
      const data = operationResult(
        await client().rpc('list_my_groble_ad_orders', {
          p_business: businessId,
          p_limit: pageSize + 1,
          p_offset: page * pageSize,
        }),
        '광고 결제 내역을 불러오지 못했습니다.',
      );
      return {
        items: data.slice(0, pageSize),
        hasNext: data.length > pageSize,
      };
    },
    [businessId],
  );

  return (
    <>
      {failed ? (
        <p role="alert">
          결제창 설정을 확인하지 못했습니다.{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            다시 확인
          </button>
        </p>
      ) : !catalog ? (
        <p role="status">Groble 연결 상태를 확인하는 중입니다.</p>
      ) : !catalog.configured ? (
        <p role="status">
          Groble 결제 설정이 연결되면 매장 광고를 주문할 수 있습니다.
        </p>
      ) : (
        <>
          <p>
            할인·혜택 화면에 {catalog.duration}시간 동안 매장을 광고로
            표시합니다.
          </p>
          <ActionForm
            label={`Groble에서 ${money(catalog.price)} 결제`}
            submit={() => startCheckout(businessId)}
          />
        </>
      )}
      <button type="button" onClick={() => setRevision((n) => n + 1)}>
        광고 결제 상태 새로고침
      </button>
      <ReportList
        key={revision}
        title="내 광고 결제"
        empty="아직 광고 주문 내역이 없습니다."
        load={load}
      >
        {(item) => {
          const status =
            item.refunded_krw > 0
              ? '환불 완료 · 광고 중단'
              : item.cancel_requested_at
                ? '환불 요청 접수'
                : !item.paid_at
                  ? '결제 확인 대기'
                  : item.active_until &&
                      new Date(item.active_until).getTime() > Date.now()
                    ? '광고 노출 중'
                    : '광고 종료';
          return (
            <>
              <strong>{status}</strong>
              <p>
                결제 예정 금액 {money(item.price_krw)} · {item.duration_hours}
                시간
              </p>
              {item.paid_at && <p>{date(item.paid_at)} 결제 확인</p>}
              {item.refunded_krw > 0 ? (
                <p>환불 금액 {money(item.refunded_krw)}</p>
              ) : (
                item.active_until && <p>노출 종료 {date(item.active_until)}</p>
              )}
              <small>주문 번호 {item.id}</small>
            </>
          );
        }}
      </ReportList>
    </>
  );
}

export function StoreAdCheckout({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="discount-correction"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Groble 매장 광고</summary>
      {open && <CheckoutPanel businessId={businessId} />}
    </details>
  );
}
