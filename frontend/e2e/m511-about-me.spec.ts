import { test, expect } from '@playwright/test';

test.describe('M5.11 About Me integration', () => {
  test('opens the integrated About Me experience and returns to SleepScreen', async ({ page }) => {
    await page.goto('/');

    const sleepScreen = page.getByTestId('sleep-screen');
    await expect(sleepScreen).toBeVisible();
    await expect(page.getByTestId('about-me-entry')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'View All', exact: true })).toHaveCount(0);
    await expect(page.getByText('Campus News.', { exact: true })).toHaveCount(0);

    await page.getByTestId('about-me-entry').click();

    await expect(page.getByRole('heading', { name: /M\s*E\s*E\s*T\s+C\s*L\s*A\s*R\s*A/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Capabilities', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Creators', exact: true })).toBeVisible();
    await expect(page.getByTestId('about-me-back')).toBeVisible();

    await expect(page.locator('#enter')).toHaveCount(1);
    await expect(page.locator('#creators-card')).toHaveCount(1);
    await expect(page.locator('#guide-card')).toHaveCount(1);

    await page.getByRole('button', { name: 'Capabilities', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'WHAT CLARA CAN DO', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Creators', exact: true }).click();
    await expect(page.getByRole('heading', { name: /THE PEOPLE BEHIND/i })).toBeVisible();
    await page.getByRole('button', { name: 'Our Guide', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'OUR GUIDE', exact: true })).toBeVisible();

    await page.getByTestId('about-me-back').click();
    await expect(page.getByTestId('sleep-screen')).toBeVisible();
  });
});
