import { AccountError, client } from '../../../shared/auth/account';
import type { ListPage } from '../components/ReportList';
import { pageSize } from './reports';

export async function withBookmarkStatus<T extends { id: string }>(
  page: ListPage<T>,
  userId: string | undefined,
) {
  if (!userId || !page.items.length)
    return {
      ...page,
      items: page.items.map((offer) => ({ ...offer, saved: false })),
    };
  const { data, error } = await client()
    .from('discount_offer_bookmarks')
    .select('offer_id')
    .eq('user_id', userId)
    .in(
      'offer_id',
      page.items.map((item) => item.id),
    );
  if (error)
    throw new AccountError(
      'bookmark_list_failed',
      '저장 상태를 불러오지 못했습니다.',
      true,
    );
  const saved = new Set(data.map((row) => row.offer_id));
  return {
    ...page,
    items: page.items.map((offer) => ({
      ...offer,
      saved: saved.has(offer.id),
    })),
  };
}

export async function setOfferBookmark(offerId: string, saved: boolean) {
  const { error } = await client().rpc('set_discount_offer_bookmark', {
    p_offer_id: offerId,
    p_saved: saved,
  });
  if (!error) return;
  if (error.code === 'P0002')
    throw new AccountError(
      'offer_unavailable',
      '현재 공개 중인 혜택만 저장할 수 있습니다.',
    );
  if (error.code === '42501')
    throw new AccountError('login_required', '로그인 후 다시 시도해 주세요.');
  throw new AccountError(
    'bookmark_failed',
    '저장 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}

export async function listMyOfferBookmarks(page: number) {
  const { data, error } = await client().rpc(
    'list_my_discount_offer_bookmarks',
    {
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    },
  );
  if (error)
    throw new AccountError(
      'bookmark_list_failed',
      '저장한 혜택을 불러오지 못했습니다.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
