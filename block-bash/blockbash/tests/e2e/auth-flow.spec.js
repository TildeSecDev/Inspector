const { test, expect } = require('@playwright/test');

test.describe('Auth → Editor flow', () => {
  test('register, login, open editor', async ({ page, request, context }) => {
    const ts = Date.now();
    const username = `pw_user_${ts}`;
    const email = `${username}@example.com`;
    const password = 'Passw0rd!';

    // Register via API
  const reg = await request.post('http://localhost:3000/auth/register', {
      data: { name: username, email, password, organisation: 'school' }
    });
    expect(reg.ok()).toBeTruthy();
    const regBody = await reg.json();
    expect(regBody.success).toBeTruthy();

    // Login via API (ensures userprogress gets initialized too)
  const login = await request.post('http://localhost:3000/auth/login', { data: { email, password } });
    expect(login.ok()).toBeTruthy();
    const loginBody = await login.json();
    expect(loginBody.success).toBeTruthy();

    // Set username cookie in browser context so UI shows identity
    await context.addCookies([{ name: 'username', value: encodeURIComponent(username), domain: 'localhost', path: '/' }]);

    // Navigate to editor and assert core UI
  await page.goto('http://localhost:3000/editor');
    await expect(page.locator('#workshop-container')).toBeVisible();
    // Header shows username in .client-id span per UI template
    await expect(page.locator('span.client-id')).toContainText(username);
  });
});

