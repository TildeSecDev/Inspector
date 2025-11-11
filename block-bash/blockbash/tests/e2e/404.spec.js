const { test, expect } = require('@playwright/test');

test.describe('404 Page', () => {
  test('shows 404 (custom page or plain text)', async ({ page }) => {
    const resp = await page.goto('/this-path-should-not-exist-zzz');
    expect(resp.status()).toBe(404);
    if (await page.locator('[data-page="404"]').count() > 0) {
      await expect(page.getByText(/404 Not Found/i)).toBeVisible();
    } else {
      // Plain fallback text check
      await expect(page.locator('body')).toContainText(/Not Found|404/i);
    }
  });
});
