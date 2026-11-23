import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('비회원이 공개 혜택을 검색하고 기간 필터와 페이지를 초기화한다', async ({
  page,
}) => {
  const server = createClient(
    'http://127.0.0.1:54321',
    process.env.TEST_LOCAL_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await server.auth.admin.createUser({
    email: randomUUID() + '@example.test',
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const seoulDate = (offset: number) =>
    new Date(Date.now() + 9 * 3600000 + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  const base = {
    reporter_id: id,
    source_url: 'https://example.test/notice',
    status: 'approved',
    details: '학생 할인',
  };
  try {
    await server
      .from('discount_reports')
      .insert([
        ...Array.from({ length: 20 }, (_, i) => ({
          ...base,
          store_name: '상시 매장 ' + i,
        })),
        {
          ...base,
          store_name: '음료 매장',
          details: '아메리카노 10% 할인',
          starts_on: seoulDate(-2),
          ends_on: seoulDate(3),
        },
        {
          ...base,
          store_name: '다음 주 매장',
          details: '아메리카노 10% 할인',
          starts_on: seoulDate(2),
          ends_on: seoulDate(4),
        },
      ])
      .throwOnError();
    await page.goto('/discounts');
    const form = page.getByRole('search', { name: '공개 혜택 검색' });
    const feed = page.getByRole('region', { name: '공개 혜택' });
    await feed.getByRole('button', { name: '다음' }).click();
    await expect(feed.getByText('2페이지')).toBeVisible();
    await form.getByLabel('매장명 또는 할인 내용').fill('아메리카노 10%');
    await form.getByLabel('오늘 이용 가능').check();
    await form.getByLabel('마감 임박', { exact: false }).check();
    await form.getByRole('button', { name: '검색', exact: true }).click();
    await expect(feed.getByText('음료 매장', { exact: true })).toBeVisible();
    await expect(feed.getByRole('listitem')).toHaveCount(1);
    await form.getByLabel('매장명 또는 할인 내용').fill('없는혜택');
    await form.getByRole('button', { name: '검색', exact: true }).click();
    await expect(feed.getByText('조건에 맞는 혜택이 없습니다.')).toBeVisible();
    await form.getByRole('button', { name: '초기화' }).click();
    await expect(feed.getByText('1페이지')).toBeVisible();
    await expect(feed.getByRole('listitem')).toHaveCount(20);
    await expect(form.getByLabel('오늘 이용 가능')).not.toBeChecked();
    await expect(form.getByLabel('매장명 또는 할인 내용')).toHaveValue('');
  } finally {
    await server.auth.admin.deleteUser(id);
  }
});
