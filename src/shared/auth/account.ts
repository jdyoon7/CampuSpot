import { z } from 'zod';
import { supabase } from '../lib/supabase';

export function client() {
  if (!supabase)
    throw new AccountError('unconfigured', '계정 서비스 연결이 필요합니다.');
  return supabase;
}
export class AccountError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}
export const errorFor = (error: unknown) =>
  error instanceof AccountError
    ? error
    : new AccountError(
        'unavailable',
        '요청을 처리하지 못했습니다. 잠시 뒤 다시 시도하세요.',
        true,
      );
export const roles = z.enum([
  'member',
  'verified_student',
  'event_organizer',
  'business_owner',
  'admin',
  'super_admin',
]);
const id = z.uuid().nullable();
export const profileInput = z
  .object({
    nickname: z.string().trim().min(2).max(24),
    university_id: id,
    campus_id: id,
    department_id: id,
    student_number: z
      .string()
      .regex(/^[a-zA-Z0-9-]{1,24}$/)
      .nullable(),
  })
  .refine(
    (p) =>
      (!p.campus_id || !!p.university_id) &&
      (!p.department_id || !!p.campus_id),
  );
export type ProfileInput = z.infer<typeof profileInput>;
export async function loadAccount(userId: string) {
  const db = client();
  const [profile, privateProfile, grants, verified] = await Promise.all([
    db.from('profiles').select('nickname').eq('id', userId).single(),
    db
      .from('private_profiles')
      .select('university_id,campus_id,department_id,student_number')
      .eq('id', userId)
      .single(),
    db.from('user_roles').select('role').eq('user_id', userId),
    db.rpc('my_verified_university'),
  ]);
  if (profile.error || privateProfile.error || grants.error || verified.error)
    throw errorFor(null);
  const effectiveRoles = roles
    .array()
    .parse(grants.data.map((row) => row.role));
  const verifiedUniversityId = id.parse(verified.data);
  if (verifiedUniversityId) effectiveRoles.push('verified_student');
  return {
    profile: profileInput.parse({ ...profile.data, ...privateProfile.data }),
    roles: effectiveRoles,
    verifiedUniversityId,
  };
}
export async function saveProfile(input: ProfileInput) {
  const data = profileInput.safeParse(input);
  if (!data.success)
    throw new AccountError(
      'invalid_profile',
      '닉네임(2~24자), 학번과 학교 선택을 확인하세요.',
    );
  const p = data.data;
  const { error } = await client().rpc('save_my_profile', {
    p_nickname: p.nickname,
    p_university: p.university_id ?? undefined,
    p_campus: p.campus_id ?? undefined,
    p_department: p.department_id ?? undefined,
    p_student_number: p.student_number ?? undefined,
  });
  if (error) throw errorFor(null);
}

const messages: Record<string, string> = {
  mail_unconfigured: '학교 인증 메일 발송 설정을 기다리고 있습니다.',
  unknown_domain: '등록된 학생용 학교 이메일 도메인을 사용하세요.',
  rate_limited: '1분 후 다시 요청하세요.',
  password: '현재 비밀번호를 확인하세요.',
  image: '1024×1024 이하, 2MB 이하 PNG 파일을 선택하세요.',
  session: '다시 로그인하세요.',
  mail_failed: '메일을 보내지 못했습니다. 1분 후 다시 시도하세요.',
};
export async function accountAction(
  body:
    | File
    | { action: 'school-email'; email: string }
    | { action: 'delete'; password: string },
) {
  const { error } = await client().functions.invoke('core-account', {
    body,
    headers: body instanceof File ? { 'Content-Type': 'image/png' } : undefined,
  });
  if (!error) return;
  const response = error.context;
  const code =
    response instanceof Response
      ? (await response.json().catch(() => ({}))).code
      : undefined;
  if (typeof code === 'string' && messages[code])
    throw new AccountError(
      code,
      messages[code],
      ['rate_limited', 'mail_failed'].includes(code),
    );
  throw errorFor(error);
}
export async function confirmMailbox(code: string) {
  if (!z.uuid().safeParse(code.trim()).success)
    throw new AccountError('code', '이메일에 적힌 인증코드 전체를 입력하세요.');
  const { data, error } = await client().rpc('confirm_school_email', {
    p_code: code.trim(),
  });
  if (error) throw errorFor(error);
  if (data !== true)
    throw new AccountError(
      'invalid_code',
      '코드를 사용할 수 없습니다. 최신 메일을 확인하거나 다시 요청하세요.',
    );
}
