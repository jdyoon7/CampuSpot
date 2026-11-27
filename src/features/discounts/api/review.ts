import { z } from 'zod';
import { withEvidence } from './evidence';
import { AccountError, client } from '../../../shared/auth/account';
import type { Database } from '../../../shared/types/database.generated';
import { pageSize } from './reports';

type Role = Database['public']['Enums']['app_role'];
export function canReview(roles: Role[]) {
  return roles.includes('admin') || roles.includes('super_admin');
}

export async function loadQueue(userId: string, page: number) {
  const offset = page * pageSize;
  const { data, error } = await client()
    .from('discount_reports')
    .select('id,store_name,details,source_url,starts_on,ends_on,created_at')
    .eq('status', 'pending')
    .neq('reporter_id', userId)
    .order('created_at')
    .order('id')
    .range(offset, offset + pageSize);
  if (error)
    throw new AccountError(
      'queue_failed',
      '검수 목록을 불러오지 못했습니다.',
      true,
    );
  return {
    items: await withEvidence(data.slice(0, pageSize)),
    hasNext: data.length > pageSize,
  };
}
export type PendingReport = Awaited<
  ReturnType<typeof loadQueue>
>['items'][number];
export type Decision =
  { status: 'approved' } | { status: 'rejected'; reason: string };

export async function reviewReport(id: string, decision: Decision) {
  const reason =
    decision.status === 'rejected' ? decision.reason.trim() : undefined;
  if (
    decision.status === 'rejected' &&
    !z.string().min(1).max(500).safeParse(reason).success
  ) {
    throw new AccountError(
      'invalid_reason',
      '반려 사유를 1~500자로 입력해 주세요.',
    );
  }
  const { error } = await client().rpc('review_discount_report', {
    p_report_id: id,
    p_decision: decision.status,
    p_reason: reason,
  });
  if (!error) return;
  if (error.code === 'P0002')
    throw new AccountError(
      'not_pending',
      '이 제보는 검수 대기 목록에서 처리할 수 없습니다. 최신 목록을 확인해 주세요.',
    );
  if (error.code === '42501')
    throw new AccountError('forbidden', '관리자 권한이 필요합니다.');
  throw new AccountError(
    'review_failed',
    '검수 결과를 확인하지 못했습니다. 목록을 새로고침해 주세요.',
    true,
  );
}
