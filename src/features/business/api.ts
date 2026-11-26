import { z } from 'zod';
import { AccountError, client } from '../../shared/auth/account';
import type { ListPage } from '../discounts/components/ReportList';
import { pageSize } from '../discounts/api/reports';

const businessFields = 'id,name,branch_name,address,source_url';
const editInput = z.object({
  name: z.string().trim().min(1).max(100),
  branch_name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(250),
  source_url: z
    .url({ protocol: /^https?$/, hostname: /^[a-z0-9.-]+$/i })
    .max(2048),
});

export async function getBusiness(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await client()
    .from('businesses')
    .select(businessFields)
    .eq('id', id)
    .maybeSingle();
  if (error)
    throw new AccountError(
      'business_failed',
      '매장 정보를 불러오지 못했습니다.',
      true,
    );
  return data;
}

export const businessName = (business: { name: string; branch_name: string }) =>
  business.name + ' · ' + business.branch_name;

export async function listBusinesses(page: number) {
  const offset = page * pageSize;
  const { data, error } = await client()
    .from('businesses')
    .select(businessFields)
    .order('name')
    .order('branch_name')
    .order('id')
    .range(offset, offset + pageSize);
  if (error)
    throw new AccountError(
      'businesses_failed',
      '매장 목록을 불러오지 못했습니다.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

export async function registerBusiness(form: FormData) {
  const parsed = editInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    throw new AccountError(
      'invalid_business',
      '매장명, 지점명, 주소와 공식 출처를 확인해 주세요.',
    );
  const { data, error } = await client()
    .from('businesses')
    .insert(parsed.data)
    .select('id')
    .single();
  if (!error) return data.id;
  if (error.code === '23505')
    throw new AccountError(
      'duplicate',
      '같은 이름과 주소의 지점이 이미 등록되어 있습니다.',
    );
  if (error.code === '42501')
    throw new AccountError(
      'forbidden',
      '관리자 계정에서만 매장을 등록할 수 있습니다.',
    );
  if (error.code === '23514')
    throw new AccountError(
      'invalid_business',
      '입력한 주소와 공식 출처 링크를 확인해 주세요.',
    );
  throw new AccountError(
    'register_failed',
    '매장을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}

export async function listBusinessOffers(businessId: string, page: number) {
  const { data, error } = await client().rpc('list_business_discounts', {
    p_business_id: businessId,
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error)
    throw new AccountError(
      'business_offers_failed',
      '이 매장의 혜택을 불러오지 못했습니다.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

export async function withBusinessLinks<T extends { id: string }>(
  page: ListPage<T>,
) {
  const offerIds = page.items.map((offer) => offer.id);
  const { data } = offerIds.length
    ? await client().rpc('list_public_discount_business_links', {
        p_offer_ids: offerIds,
      })
    : { data: [] };
  const links = new Map(data?.map((entry) => [entry.offer_id, entry]));
  return {
    ...page,
    items: page.items.map((offer) => ({
      ...offer,
      business: links.get(offer.id),
    })),
  };
}

export async function setBusinessOffer(
  businessId: string,
  offerId: string,
  linked: boolean,
) {
  const { error } = await client().rpc('set_discount_business_link', {
    p_business_id: businessId,
    p_offer_id: offerId,
    p_linked: linked,
  });
  if (!error) return;
  if (error.code === '55000')
    throw new AccountError(
      'already_linked',
      '다른 지점에 연결된 혜택입니다. 그 지점에서 먼저 연결을 해제해 주세요.',
    );
  if (error.code === 'P0002')
    throw new AccountError(
      'offer_unavailable',
      '등록된 매장과 현재 공개 중인 혜택을 확인해 주세요.',
    );
  if (error.code === '42501')
    throw new AccountError(
      'forbidden',
      '관리자 계정에서만 혜택을 연결할 수 있습니다.',
    );
  throw new AccountError(
    'link_failed',
    '혜택 연결을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}
