// Simple Playwright smoke test for editor page
const { test, expect } = require('@playwright/test');

test.describe('Editor Page', () => {
  test('loads and shows workshop container', async ({ page }) => {
    await page.context().addCookies([{ name: 'username', value: 'tester', domain: 'localhost', path: '/' }]);
    await page.goto('/editor');
    await expect(page.locator('#workshop-container')).toBeVisible();
  });
});