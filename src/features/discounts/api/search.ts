import { z } from 'zod';
import { AccountError, client } from '../../../shared/auth/account';
import { pageSize } from './reports';

const searchInput = z.object({
  query: z.string().trim().max(100),
  todayOnly: z.boolean(),
  endingSoon: z.boolean(),
});
export type SearchFilters = z.infer<typeof searchInput>;
export async function searchPublished(filters: SearchFilters, page: number) {
  const parsed = searchInput.safeParse(filters);
  if (!parsed.success)
    throw new AccountError(
      'invalid_search',
      '검색어는 100자 이내로 입력해 주세요.',
    );
  const { query, todayOnly, endingSoon } = parsed.data;
  const { data, error } = await client().rpc('search_published_discounts', {
    p_query: query,
    p_today_only: todayOnly,
    p_ending_soon: endingSoon,
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error)
    throw new AccountError(
      'search_failed',
      '혜택을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
