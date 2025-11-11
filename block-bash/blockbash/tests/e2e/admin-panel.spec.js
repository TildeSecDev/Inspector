const { test, expect } = require('@playwright/test');

async function register(page, name, email, password, base) {
  await page.goto(base + '/');
  // Open register folder (click register cover)
  const registerCover = page.locator('.folder-register .folder-cover');
  if (await registerCover.count() > 0) {
    await registerCover.click();
    await page.waitForTimeout(600);
  }
  await page.fill('form.register-form input[name="name"]', name);
  await page.fill('form.register-form input[name="email"]', email);
  await page.fill('form.register-form input[name="password"]', password);
  // Pick organisation if select exists
  if (await page.locator('form.register-form select[name="organization"]').count() > 0) {
    await page.selectOption('form.register-form select[name="organization"]', { value:'other' });
  }
  await page.click('form.register-form button[type="submit"]');
  await page.waitForTimeout(500); // allow backend to process
}

test.describe('Admin Panel', () => {
  test('register user then attempt admin panel (may 403 if elevation unavailable)', async ({ page }) => {
    const email = `playwright_admin_${Date.now()}@example.com`;
  const base = process.env.BASE_URL || 'http://localhost:3000';
  await register(page, 'Playwright Admin', email, 'Password123!', base);
    // Try to set cookie role=admin if backend expects some pattern (fallback: username cookie)
    await page.context().addCookies([{ name:'username', value:'Playwright Admin', domain:'localhost', path:'/' }]);
  const resp = await page.goto(base + '/admin-panel');
    // Accept either success (200) or forbidden (403) depending on auth middleware; assert not 500
    const status = resp.status();
    expect([200,403,401]).toContain(status);
    if (status === 200) {
      const adminLocator = page.locator('[data-page="admin"], h1:has-text("Admin Panel")');
      await expect(adminLocator.first()).toBeVisible();
    }
  });
});
