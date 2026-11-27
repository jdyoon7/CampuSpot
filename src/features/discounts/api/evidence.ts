import { FunctionsHttpError } from '@supabase/supabase-js';
import { AccountError, client } from '../../../shared/auth/account';
import type { ReportInput } from '../schemas/report';

import { invalidImage, prepareImage } from '../../../shared/lib/uploadImage';

export async function submitReportWithEvidence(input: ReportInput, file: File) {
  const body = new FormData();
  for (const [name, value] of Object.entries(input)) body.set(name, value);
  body.set('image', await prepareImage(file), 'evidence.png');
  const { error } = await client().functions.invoke('discount-evidence', {
    body,
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const { code } = (await error.context.json().catch(() => ({}))) as {
      code?: string;
    };
    if (code === 'image') throw invalidImage();
    if (code === 'duplicate')
      throw new AccountError(
        'duplicate',
        '같은 제보가 이미 검수 대기 중입니다. 내 제보를 확인해 주세요.',
      );
    if (code === 'session')
      throw new AccountError('session', '다시 로그인한 뒤 제보해 주세요.');
    if (code === 'invalid')
      throw new AccountError(
        'invalid',
        '제보 내용과 기간, 공식 출처 링크를 확인해 주세요.',
      );
  }
  throw new AccountError(
    'evidence_unavailable',
    '사진이 포함된 제보를 접수하지 못했습니다. 잠시 후 재시도하거나 사진을 지우고 제보해 주세요.',
    true,
  );
}

export async function withEvidence<T extends { id: string }>(items: T[]) {
  if (!items.length) return [];
  const { data, error } = await client().rpc('list_discount_evidence', {
    p_report_ids: items.map(({ id }) => id),
  });
  if (error && error.code !== 'PGRST202')
    throw new AccountError(
      'evidence_list',
      '첨부 사진 정보를 불러오지 못했습니다.',
      true,
    );
  const photos = new Map(
    data?.map((item) => [item.report_id, item.object_path]),
  );
  return items.map((item) => ({ ...item, photo: photos.get(item.id) }));
}

export async function readEvidence(path: string) {
  const { data, error } = await client()
    .storage.from('discount-evidence')
    .download(path);
  if (error)
    throw new AccountError(
      'evidence_read',
      '첨부 사진을 불러오지 못했습니다.',
      true,
    );
  return data;
}
