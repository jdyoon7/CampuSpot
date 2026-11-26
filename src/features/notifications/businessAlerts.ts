import { AccountError, client } from '../../shared/auth/account';
import { pageSize } from '../discounts/api/reports';

export async function listBusinessAlerts(page: number) {
  const { data, error } = await client().rpc('list_my_business_notifications', {
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error)
    throw new AccountError(
      'alerts_failed',
      '혜택 알림을 불러오지 못했습니다.',
      true,
    );
  const items = data.slice(0, pageSize).map((item) => ({
    ...item,
    id: [item.business_id, item.offer_id, item.kind, item.event_at].join(':'),
  }));
  return { items, hasNext: data.length > pageSize };
}

export type BusinessAlert = Awaited<
  ReturnType<typeof listBusinessAlerts>
>['items'][number];

export async function readBusinessAlert(item: BusinessAlert) {
  const { error } = await client().rpc('mark_business_notification_read', {
    p_business_id: item.business_id,
    p_offer_id: item.offer_id,
    p_kind: item.kind,
    p_event_at: item.event_at,
  });
  if (error)
    throw new AccountError(
      'alert_failed',
      '읽음 상태를 저장하지 못했습니다. 다시 시도해 주세요.',
      true,
    );
}
