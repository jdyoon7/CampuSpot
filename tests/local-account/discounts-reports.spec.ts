import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

test('로그인 → 제보 접수 → 새로고침 후 검수 대기 확인', async ({ page }) => {
  const admin = createClient(
    'http://127.0.0.1:54321',
    process.env.TEST_LOCAL_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = 'discounts-' + randomUUID() + '@example.test',
    password = 'Test-' + randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  try {
    await page.goto('/discounts');
    await expect(
      page.getByRole('button', { name: '제보 등록' }),
    ).toBeDisabled();
    await page.getByRole('link', { name: '로그인하기' }).click();
    await page.getByLabel('이메일', { exact: true }).fill(email);
    await page.getByLabel('비밀번호', { exact: true }).fill(password);
    await page.locator('button[type=submit]').click();
    await expect(page.getByLabel('닉네임')).toBeVisible();
    await page.getByRole('link', { name: '할인·혜택' }).click();
    await expect(page.getByText('등록한 제보가 없습니다.')).toBeVisible();
    async function fillReport() {
      await page.getByLabel('매장명', { exact: true }).fill('로컬 테스트 매장');
      await page
        .getByLabel('할인 내용 및 이용 조건')
        .fill('학생증 제시 시 음료 10% 할인');
      await page.getByLabel('시작일').fill('2027-01-10');
      await page.getByLabel('종료일').fill('2027-01-11');
      await page
        .getByLabel('공식 출처 링크')
        .fill('https://example.test/notice');
    }
    await fillReport();
    await page.getByRole('button', { name: '제보 등록' }).click();
    await expect(page.locator('form').getByRole('status')).toContainText(
      '제보를 접수했습니다.',
    );
    await page.reload();
    const list = page.getByRole('region', { name: '내 제보' });
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(list).toContainText('로컬 테스트 매장');
    await expect(list).toContainText('검수 대기');
    await expect(list).toContainText('2027-01-10 ~ 2027-01-11');
    await expect(
      list.getByRole('link', { name: '공식 공지 보기' }),
    ).toHaveAttribute('href', 'https://example.test/notice');
    await fillReport();
    await page.getByRole('button', { name: '제보 등록' }).click();
    await expect(page.getByRole('alert')).toContainText('이미 검수 대기');
    await expect(list.getByRole('listitem')).toHaveCount(1);
  } finally {
    await admin.auth.admin.deleteUser(data.user.id);
  }
});
