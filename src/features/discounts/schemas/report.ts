import { z } from 'zod';

const webUrl = z
  .string()
  .trim()
  .max(2048, '출처 링크는 2048자 이내로 입력해 주세요.')
  .transform((raw, ctx) => {
    try {
      if (!/^https?:\/\//i.test(raw) || /[\s\\]/u.test(raw)) throw Error();
      const url = new URL(raw);
      if (
        url.username ||
        url.password ||
        !/^[a-z0-9.-]+$/i.test(url.hostname) ||
        url.href.length > 2048
      )
        throw Error();
      return url.href;
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: '공식 공지의 http 또는 https 링크를 입력해 주세요.',
      });
      return z.NEVER;
    }
  });
const date = z.iso
  .date({ error: '시작일과 종료일을 모두 입력해 주세요.' })
  .refine((d) => d >= '0001-01-01', '기간을 확인해 주세요.');
export const reportSchema = z
  .object({
    store_name: z
      .string()
      .trim()
      .min(1, '매장명을 입력해 주세요.')
      .max(100, '매장명은 100자 이내로 입력해 주세요.'),
    details: z
      .string()
      .trim()
      .min(1, '할인 내용과 이용 조건을 입력해 주세요.')
      .max(2000, '할인 내용은 2000자 이내로 입력해 주세요.'),
    source_url: webUrl,
  })
  .and(
    z.discriminatedUnion('period', [
      z.object({ period: z.literal('ongoing') }),
      z.object({ period: z.literal('fixed'), starts_on: date, ends_on: date }),
    ]),
  )
  .refine((d) => d.period === 'ongoing' || d.starts_on <= d.ends_on, {
    message: '종료일은 시작일과 같거나 이후여야 합니다.',
    path: ['ends_on'],
  });
export type ReportInput = z.infer<typeof reportSchema>;
