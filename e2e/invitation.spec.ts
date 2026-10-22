import { expect, test } from '@playwright/test';
import { LIVE_EXAMPLE_PATH } from '@/lib/site';

// Each test starts as a guest who has never opened this invitation.
test.beforeEach(async ({ page }) => {
  await page.goto(LIVE_EXAMPLE_PATH);
  await page.evaluate(() => window.localStorage.clear());
});

test('a guest opens the envelope and sees the invitation', async ({ page }) => {
  await page.goto(LIVE_EXAMPLE_PATH);

  const seal = page.getByRole('button', { name: /open your invitation/i });
  await expect(seal).toBeVisible();

  await seal.click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Malik');
  await expect(seal).toBeHidden();
});

test('a returning guest skips the envelope', async ({ page }) => {
  await page.goto(LIVE_EXAMPLE_PATH);
  await page.getByRole('button', { name: /open your invitation/i }).click();
  await expect(
    page.getByRole('button', { name: /open your invitation/i }),
  ).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Malik');
  await expect(
    page.getByRole('button', { name: /open your invitation/i }),
  ).toHaveCount(0);
});

test('the invitation renders its content', async ({ page }) => {
  await page.goto(LIVE_EXAMPLE_PATH);

  await expect(page.getByRole('heading', { name: /Villa Rosa/ })).toBeVisible();
  await expect(page.getByText('12 Rue des Fleurs, Algiers')).toBeVisible();
  await expect(page.getByText('Ceremony')).toBeVisible();
});

test('the manage token never reaches the browser', async ({ page }) => {
  await page.goto(LIVE_EXAMPLE_PATH);

  const html = await page.content();
  expect(html).not.toContain('sentinel');
  expect(html).not.toContain('manage_token');
});

test('an unknown slug renders the not-found page', async ({ page }) => {
  const response = await page.goto('/i/definitely-not-a-real-invitation');

  expect(response?.status()).toBe(404);
  await expect(page.getByText(/not available/i)).toBeVisible();
});
