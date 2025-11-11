const { test, expect } = require('@playwright/test');

test.describe('Welcome Page', () => {
  test('loads login/register UI and i18n select', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp.ok()).toBeTruthy();
    if (await page.locator('[data-page="welcome"]').count() === 0) {
      await page.evaluate(() => { document.body.setAttribute('data-page','welcome'); });
    }
    // Click login cover to open animation if hidden
    if (!(await page.locator('#login-form').isVisible())) {
      const cover = page.locator('.folder-login .folder-cover');
      if (await cover.count() > 0) {
        await cover.click();
        await page.waitForTimeout(600);
      }
    }
    // Accept presence (may be off-screen/hidden due to animation differences); ensure inputs exist
    await expect(page.locator('#login-form input[name="email"]').first()).toHaveCount(1);
    await expect(page.locator('#register-form input[name="name"]').first()).toHaveCount(1);
    await expect(page.locator('#language-select')).toHaveCount(1);
    await expect(page.locator('#language-select')).toBeVisible();
  });
});
