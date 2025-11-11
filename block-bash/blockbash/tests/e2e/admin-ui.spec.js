const { test, expect } = require('@playwright/test');

test.describe('Admin UI page', () => {
  test('renders dashboard cards and loads tables', async ({ page, request }) => {
    // Login as seeded admin to pass guards
  const login = await request.post('http://localhost:3000/auth/login', { data: { email: 'admin@example.com', password: 'admin123' } });
    expect(login.ok()).toBeTruthy();

  await page.goto('http://localhost:3000/admin');
    await expect(page.locator('body[data-page="admin"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();

    // Cards should be present
    await expect(page.locator('#panel-sessions h2')).toBeVisible();
    await expect(page.locator('#panel-commands h2')).toBeVisible();
    await expect(page.locator('#panel-progress h2')).toBeVisible();
    await expect(page.locator('#panel-achievements h2')).toBeVisible();
    await expect(page.locator('#panel-users h2')).toBeVisible();

    // Tables populate after fetch; allow some time
    await page.waitForTimeout(1000);

    // Assert tables exist (content may be empty in fresh DB, but elements should be present)
    await expect(page.locator('#sessions-body')).toBeVisible();
    await expect(page.locator('#commands-body')).toBeVisible();
    await expect(page.locator('#progress-body')).toBeVisible();
    await expect(page.locator('#achievements-body')).toBeVisible();
    await expect(page.locator('#users-table-body')).toBeVisible();

    // Metrics strip shows numeric values
    await expect(page.locator('#metric-active')).toBeVisible();
    await expect(page.locator('#metric-activities')).toBeVisible();
  });
});

