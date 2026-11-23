import { test, expect } from '@playwright/test';
for (const width of [360, 390, 768]) {
  test('마이페이지 연결 대기 화면 ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/me');
    await expect(
      page.getByRole('heading', { name: '마이페이지' }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText('계정 서비스 연결');
    await expect(
      page.getByRole('button', { name: '계정 영구 삭제' }),
    ).toHaveCount(0);
  });
}
