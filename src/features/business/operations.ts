import { AccountError, client } from '../../shared/auth/account';
import { pageSize } from '../discounts/api/reports';

export function operationResult<T>(
  result: { data: T; error: null } | { data: null; error: { code: string } },
  failure: string,
): T {
  if (!result.error) return result.data;
  const code = result.error.code;
  const dictionary: Record<string, string> = {
    '42501': '이 기능에 필요한 계정 권한이나 학교 인증을 확인해 주세요.',
    '23505': '이미 신청했거나 같은 항목이 등록되어 있습니다.',
    '23514': '입력한 기간, 수량 또는 링크를 확인해 주세요.',
    '22023': '입력값을 확인해 주세요.',
    '22P02': '입력한 코드 형식을 확인해 주세요.',
    '55000': '이미 처리됐거나 발급 한도·사용 기간이 지난 항목입니다.',
    P0001: '쿠폰을 받기에 포인트가 부족합니다.',
    P0002: '대상이 없거나 이미 처리됐습니다.',
  };
  throw new AccountError(code, dictionary[code] ?? failure, !dictionary[code]);
}

export function textField(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

export async function listBusinessCoupons(businessId: string, page: number) {
  const data = operationResult(
    await client().rpc('list_business_coupon_offers', {
      p_business: businessId,
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    '쿠폰 목록을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

export async function getOperatorStatus(businessId: string, userId: string) {
  const data = operationResult<{ status: string } | null>(
    await client()
      .from('business_operator_requests')
      .select('status')
      .eq('business_id', businessId)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    '운영 권한을 확인하지 못했습니다.',
  );
  return data?.status ?? null;
}

export async function listOperatorRequests(userId: string, page: number) {
  const data = operationResult(
    await client()
      .from('business_operator_requests')
      .select('id,business_id,note,evidence_url,status')
      .in('status', ['pending', 'approved'])
      .neq('requested_by', userId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize),
    '운영 신청을 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
