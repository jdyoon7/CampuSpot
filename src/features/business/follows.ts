import { AccountError, client } from '../../shared/auth/account';
import { pageSize } from '../discounts/api/reports';

export async function isFollowingBusiness(userId: string, businessId: string) {
  const { data, error } = await client()
    .from('business_follows')
    .select('business_id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error)
    throw new AccountError(
      'follow_status_failed',
      '팔로우 상태를 확인하지 못했습니다.',
      true,
    );
  return data !== null;
}

export async function setBusinessFollow(businessId: string, followed: boolean) {
  const { error } = await client().rpc('set_business_follow', {
    p_business_id: businessId,
    p_followed: followed,
  });
  if (!error) return;
  if (error.code === '23503')
    throw new AccountError(
      'business_unavailable',
      '이 매장의 정보를 확인할 수 없습니다.',
    );
  throw new AccountError(
    'follow_failed',
    '팔로우 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}

export async function listFollowedBusinesses(page: number) {
  const { data, error } = await client().rpc('list_my_followed_businesses', {
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error)
    throw new AccountError(
      'follows_failed',
      '관심 매장 목록을 불러오지 못했습니다.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
