import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

async function login(page: Page, email: string, password: string) {
  await page.goto('/me');
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.locator('button[type=submit]').click();
  await expect(page.getByLabel('닉네임')).toBeVisible();
}
test('관리자 승인·반려 후 비회원과 작성자에게 각각 맞는 결과를 표시한다', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const server = createClient(
    'http://127.0.0.1:54321',
    process.env.TEST_LOCAL_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const run = randomUUID(),
    password = 'Test-' + run,
    submitterEmail = 'reporter-' + run + '@example.test',
    adminEmail = 'reviewer-' + run + '@example.test';
  const accounts: string[] = [];
  const reporter = await browser.newPage({ baseURL: 'http://127.0.0.1:5173' });
  const guest = await browser.newPage({ baseURL: 'http://127.0.0.1:5173' });
  const approvedStore = '승인 매장 ' + run,
    rejectedStore = '반려 매장 ' + run,
    reason = '공식 공지에서 종료일을 확인할 수 없습니다.';
  try {
    for (const email of [submitterEmail, adminEmail]) {
      const { data, error } = await server.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      accounts.push(data.user.id);
    }
    await server
      .from('user_roles')
      .insert({ user_id: accounts[1], role: 'admin' })
      .throwOnError();
    await server
      .from('discount_reports')
      .insert(
        [approvedStore, rejectedStore].map((store_name) => ({
          reporter_id: accounts[0],
          store_name,
          details: '학생증 제시 시 할인',
          source_url: 'https://example.test/official',
        })),
      )
      .throwOnError();

    await login(reporter, submitterEmail, password);
    await reporter.goto('/discounts/review');
    await expect(reporter.getByText('관리자 권한이 필요합니다.')).toBeVisible();
    await expect(
      reporter.getByRole('button', { name: '승인', exact: true }),
    ).toHaveCount(0);

    await login(page, adminEmail, password);
    await page.getByRole('link', { name: '할인·혜택', exact: true }).click();
    await page.getByRole('link', { name: '제보 검수하기' }).click();
    const queue = page.getByRole('region', { name: '검수 대기' });
    const approval = queue
      .getByRole('listitem')
      .filter({ hasText: approvedStore });
    await expect(
      approval.getByRole('link', { name: '공식 공지 보기' }),
    ).toHaveAttribute('href', 'https://example.test/official');
    await approval.getByRole('button', { name: '승인', exact: true }).click();
    await expect(
      page.getByText(approvedStore + ' 제보를 승인했습니다.'),
    ).toBeVisible();

    const rejection = queue
      .getByRole('listitem')
      .filter({ hasText: rejectedStore });
    await rejection.getByRole('button', { name: '반려', exact: true }).click();
    await expect(
      rejection.getByRole('button', { name: '반려 확정' }),
    ).toBeDisabled();
    await rejection.getByLabel('반려 사유').fill(reason);
    await rejection.getByRole('button', { name: '반려 확정' }).click();
    await expect(
      page.getByText(rejectedStore + ' 제보를 반려했습니다.'),
    ).toBeVisible();
    await expect(queue.getByText(rejectedStore)).toHaveCount(0);

    await guest.goto('/discounts');
    const feed = guest.getByRole('region', { name: '공개 혜택' });
    await expect(feed.getByText(approvedStore, { exact: true })).toBeVisible();
    await expect(guest.getByText(rejectedStore, { exact: true })).toHaveCount(
      0,
    );
    await expect(guest.getByText(reason)).toHaveCount(0);
    await reporter.goto('/discounts');
    const mine = reporter.getByRole('region', { name: '내 제보' });
    await expect(
      mine.getByRole('listitem').filter({ hasText: rejectedStore }),
    ).toContainText(reason);
    await expect(
      mine.getByRole('listitem').filter({ hasText: approvedStore }),
    ).toContainText('승인');
  } finally {
    await reporter.close();
    await guest.close();
    for (const id of accounts) await server.auth.admin.deleteUser(id);
  }
});
