import { AccountError, client } from '../../../shared/auth/account';
import { pageSize } from './reports';

export async function listCalendarOffers(day: string, page: number) {
  const { data, error } = await client().rpc('list_discount_calendar', {
    p_day: day,
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error)
    throw new AccountError(
      'calendar_failed',
      '혜택 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
