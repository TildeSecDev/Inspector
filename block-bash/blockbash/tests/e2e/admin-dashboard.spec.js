const { test, expect } = require('@playwright/test');

test.describe('Admin dashboards', () => {
  test('seeded admin can access telemetry endpoints', async ({ request }) => {
    // Login as seeded admin (seeded by migration in app.js)
  const login = await request.post('http://localhost:3000/auth/login', { data: { email: 'admin@example.com', password: 'admin123' } });
    expect(login.ok()).toBeTruthy();

    const endpoints = [
      '/admin/active_sessions',
      '/admin/recent_commands',
      '/admin/user_progress',
      '/admin/achievements',
      '/admin/active_containers'
    ];

    for (const ep of endpoints) {
  const res = await request.get('http://localhost:3000'+ep);
      expect(res.status(), `Expected 200 for ${ep}`).toBe(200);
      // Basic structure smoke assertions
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

