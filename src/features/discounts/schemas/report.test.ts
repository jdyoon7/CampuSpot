import { describe, expect, it } from 'vitest';
import { reportSchema } from './report';

const fixed = {
  store_name: '  테스트 매장  ',
  details: '학생증 할인',
  source_url: ' https://example.test/notice ',
  period: 'fixed',
  starts_on: '2028-02-29',
  ends_on: '2028-02-29',
};
describe('할인 제보 입력', () => {
  it('같은 날 혜택과 상시 혜택을 구분한다', () => {
    expect(reportSchema.parse(fixed)).toMatchObject({
      store_name: '테스트 매장',
      starts_on: '2028-02-29',
      source_url: 'https://example.test/notice',
    });
    expect(
      reportSchema.parse({ ...fixed, period: 'ongoing' }),
    ).not.toHaveProperty('starts_on');
  });
  it.each([
    { starts_on: '2027-02-29' },
    { ends_on: '2028-02-28' },
    { starts_on: '' },
    { store_name: '  ' },
    { details: '\n' },
    { source_url: 'javascript:alert(1)' },
    { source_url: 'https://user:secret@example.test' },
  ])('잘못된 입력을 거절한다 %o', (patch) => {
    expect(reportSchema.safeParse({ ...fixed, ...patch }).success).toBe(false);
  });
});
