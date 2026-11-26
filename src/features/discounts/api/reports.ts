import { AccountError, client } from '../../../shared/auth/account';
import type { Database } from '../../../shared/types/database.generated';
import type { ReportInput } from '../schemas/report';

type Row = Database['public']['Tables']['discount_reports']['Row'];
export type Report = Pick<
  Row,
  | 'id'
  | 'store_name'
  | 'details'
  | 'source_url'
  | 'starts_on'
  | 'ends_on'
  | 'status'
  | 'created_at'
>;
export const statusLabels: Record<Row['status'], string> = {
  pending: '검수 대기',
  approved: '승인',
  rejected: '반려',
};
function reportError(code: string) {
  if (code === '23505')
    return new AccountError(
      'duplicate',
      '같은 내용의 제보가 이미 검수 대기 중입니다. 내 제보를 확인해 주세요.',
    );
  if (code === '42501' || code === 'PGRST301')
    return new AccountError(
      'session',
      '로그인 상태를 확인한 뒤 다시 시도해 주세요.',
    );
  if (code === '23514' || code === '22007')
    return new AccountError(
      'invalid',
      '입력한 기간과 공식 출처 링크를 다시 확인해 주세요.',
    );
  return new AccountError(
    'unavailable',
    '제보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}
export async function submitReport(userId: string, input: ReportInput) {
  const { error } = await client()
    .from('discount_reports')
    .insert({
      reporter_id: userId,
      store_name: input.store_name,
      details: input.details,
      source_url: input.source_url,
      starts_on: input.period === 'fixed' ? input.starts_on : null,
      ends_on: input.period === 'fixed' ? input.ends_on : null,
    });
  if (error) throw reportError(error.code);
}
export const pageSize = 20;
export async function listReports(userId: string, page: number) {
  const start = page * pageSize;
  const { data, error } = await client()
    .from('discount_reports')
    .select(
      'id,store_name,details,source_url,starts_on,ends_on,status,created_at,rejection_reason,withdrawn_at',
    )
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(start, start + pageSize);
  if (error) throw reportError(error.code);
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
