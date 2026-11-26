import { z } from 'zod';
import { AccountError, client } from '../../../shared/auth/account';
import { pageSize } from './reports';
import type { Decision } from './review';

const kind = z.enum(['edit', 'ended', 'incorrect']);
export const correctionLabels: Record<z.infer<typeof kind>, string> = {
  edit: '내용 수정',
  ended: '종료 신고',
  incorrect: '오류 신고',
};
const submission = z.object({
  kind,
  note: z.string().trim().min(1).max(500),
  details: z.string().trim().max(2000).optional(),
});

export async function submitCorrection(offerId: string, form: FormData) {
  const parsed = submission.safeParse(Object.fromEntries(form));
  if (!parsed.success || (parsed.data.kind === 'edit' && !parsed.data.details))
    throw new AccountError(
      'invalid_correction',
      '제보 사유와 수정할 내용을 확인해 주세요.',
    );
  const { data } = parsed;
  const { error } = await client().rpc('submit_discount_correction', {
    p_offer_id: offerId,
    p_kind: data.kind,
    p_note: data.note,
    p_details: data.kind === 'edit' ? data.details : undefined,
  });
  if (!error) return;
  if (error.code === '23505')
    throw new AccountError(
      'duplicate',
      '이 혜택에 대해 이미 검수 대기 중인 제보가 있습니다.',
    );
  if (error.code === 'P0002')
    throw new AccountError(
      'offer_unavailable',
      '공개 중인 혜택만 정정 제보할 수 있습니다. 목록을 새로고침해 주세요.',
    );
  if (error.code === '22023')
    throw new AccountError(
      'invalid_correction',
      '제보 사유와 수정할 내용을 확인해 주세요. 기존 내용과 같은 수정은 접수할 수 없습니다.',
    );
  if (error.code === '42501')
    throw new AccountError('forbidden', '로그인 후 다시 시도해 주세요.');
  throw new AccountError(
    'correction_failed',
    '정정 제보를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}

export async function loadCorrections(
  userId: string,
  page: number,
  review: boolean,
) {
  const rows = client()
    .from('discount_corrections')
    .select(
      'id,kind,store_name,current_details,proposed_details,source_url,report_note,status,rejection_reason',
    );
  const offset = page * pageSize;
  const { data, error } = await (
    review
      ? rows.eq('status', 'pending').neq('reporter_id', userId)
      : rows.eq('reporter_id', userId)
  )
    .order('created_at', { ascending: review })
    .order('id', { ascending: review })
    .range(offset, offset + pageSize);
  if (error)
    throw new AccountError(
      'correction_list_failed',
      '정정 제보 목록을 불러오지 못했습니다.',
      true,
    );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}

export async function reviewCorrection(id: string, decision: Decision) {
  const reason =
    decision.status === 'rejected' ? decision.reason.trim() : undefined;
  if (
    decision.status === 'rejected' &&
    !z.string().min(1).max(500).safeParse(reason).success
  )
    throw new AccountError(
      'invalid_reason',
      '반려 사유를 1~500자로 입력해 주세요.',
    );
  const { error } = await client().rpc('review_discount_correction', {
    p_correction_id: id,
    p_decision: decision.status,
    p_reason: reason,
  });
  if (!error) return;
  if (error.code === '55000')
    throw new AccountError(
      'offer_changed',
      '혜택이 이미 변경되었거나 종료되었습니다. 현재 상태를 확인하고 이 제보를 반려해 주세요.',
    );
  if (error.code === 'P0002')
    throw new AccountError(
      'not_pending',
      '이미 처리되었거나 검수할 수 없는 제보입니다.',
    );
  if (error.code === '42501')
    throw new AccountError('forbidden', '관리자 권한이 필요합니다.');
  throw new AccountError(
    'correction_review_failed',
    '검수 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}
