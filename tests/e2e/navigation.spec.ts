import { test, expect } from '@playwright/test';
test('모바일에서 세 기능의 진입 경로를 사용할 수 있다', async ({ page }) => {
  await page.goto('/');
  for (const [label, title] of [
    ['모임', '모임·대결'],
    ['행사·장소', '행사·장소'],
    ['할인·혜택', '할인·혜택'],
  ]) {
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
});
