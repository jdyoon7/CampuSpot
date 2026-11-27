import { z } from 'zod';
import { AccountError, client } from '../../../shared/auth/account';
import { pageSize } from './reports';
import { businessCategory } from '../../business/categories';

export const discountSort = z.enum(['recent', 'percent', 'amount', 'popular']);

const searchInput = z.object({
  query: z.string().trim().max(100),
  todayOnly: z.boolean(),
  endingSoon: z.boolean(),
  nowOnly: z.boolean().optional(),
  partnerOnly: z.boolean().optional(),
  sort: discountSort.optional(),
  university: z.uuid().optional(),
  region: z.string().trim().min(1).max(80).optional(),
  category: businessCategory.optional(),
});
export type SearchFilters = z.infer<typeof searchInput>;
export async function searchPublished(filters: SearchFilters, page: number) {
  const parsed = searchInput.safeParse(filters);
  if (!parsed.success)
    throw new AccountError(
      'invalid_search',
      '검색어는 100자 이내로 입력해 주세요.',
    );
  const {
    query,
    todayOnly,
    endingSoon,
    university,
    region,
    category,
    nowOnly,
    partnerOnly,
    sort,
  } = parsed.data;
  const { data, error } = await client().rpc('search_discount_catalog_ranked', {
    p_query: query,
    p_today_only: todayOnly,
    p_ending_soon: endingSoon,
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
    p_university_id: university,
    p_region: region,
    p_category: category,
    p_now_only: nowOnly,
    p_partner_only: partnerOnly,
    p_sort: sort,
  });
  if (error)
    throw new AccountError(
      'search_failed',
      '혜택을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

export async function listCatalogFilters() {
  const db = client();
  const filters = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await db
      .rpc('list_discount_catalog_filters')
      .range(start, start + 99);
    if (error)
      throw new AccountError(
        'filter_failed',
        '학교·지역·업종 선택지를 불러오지 못했습니다.',
        true,
      );
    filters.push(...data);
    if (data.length < 100) return filters;
  }
}
