import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

test('일반 이메일 가입, 세션 복원, 프로필, 복구, 비밀번호 재확인 탈퇴', async ({
  page,
}) => {
  const admin = createClient(
    'http://127.0.0.1:54321',
    process.env.TEST_LOCAL_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = 'core-' + randomUUID() + '@example.test',
    password = 'Test-' + randomUUID(),
    next = 'Next-' + randomUUID();
  let id: string | undefined;
  try {
    await page.goto('/me');
    await page.getByRole('button', { name: '회원가입', exact: true }).click();
    await page.getByLabel('이메일', { exact: true }).fill(email);
    await page.getByLabel('비밀번호', { exact: true }).fill(password);
    await page.locator('button[type=submit]').click();
    await expect(page.getByRole('status')).toContainText('가입 확인');
    const list = await admin.auth.admin.listUsers({ perPage: 1000 });
    id = list.data.users.find((u) => u.email === email)?.id;
    expect(id).toBeTruthy();
    // Confirm this disposable mailbox without depending on a hosted email provider.
    expect(
      (await admin.auth.admin.updateUserById(id!, { email_confirm: true }))
        .error,
    ).toBeNull();
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByLabel('이메일', { exact: true }).fill(email);
    await page.getByLabel('비밀번호', { exact: true }).fill(password);
    await page.locator('button[type=submit]').click();
    await page.getByLabel('닉네임').fill('테스트 회원');
    await page.getByRole('button', { name: '프로필 저장' }).click();
    await expect(
      page.getByRole('heading', { name: '테스트 회원' }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '테스트 회원' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    const recovery = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'http://127.0.0.1:5173/me/reset' },
    });
    expect(recovery.error).toBeNull();
    await page.goto(recovery.data.properties!.action_link);
    await page.getByLabel('새 비밀번호').fill(next);
    await page.getByRole('button', { name: '비밀번호 변경' }).click();
    await page.getByText('회원 탈퇴', { exact: true }).click();
    await page.getByLabel('현재 비밀번호').fill(password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: '계정 영구 삭제' }).click();
    await expect(page.getByRole('alert')).toContainText('현재 비밀번호');
    await page.getByLabel('현재 비밀번호').fill(next);
    await page.getByRole('button', { name: '계정 영구 삭제' }).click();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    expect((await admin.auth.admin.getUserById(id!)).data.user).toBeNull();
  } finally {
    if (id) await admin.auth.admin.deleteUser(id);
  }
});
