const { test, expect, request } = require('@playwright/test');

// Helper to create a user and get tokens (direct HTTP calls)
async function registerAndLogin(page, { name, email, password, isAdmin=false }) {
  // Directly insert isAdmin if schema has column; if not, admin flag comes solely from token creation path (needs manual DB tweak). For now rely on DB absence -> non-admin; then simulate admin by minting token via /auth/refresh after patching cookie payload (simplified by backend issuing admin claim if user.isAdmin truthy).
  await page.goto('http://localhost:3000/pages/welcome.html');
  await page.request.post('http://localhost:3000/auth/register', { data:{ name, email, password } });
  const resp = await page.request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  const body = await resp.json();
  return body;
}

test.describe('Admin auth protection', () => {
  test('admin endpoint rejects unauthenticated and non-admin, accepts admin', async ({ page, context }) => {
    // 1. Unauthenticated request
    const unauth = await page.request.get('http://localhost:3000/admin/active_sessions');
    expect(unauth.status()).toBe(401);

    // 2. Register/login regular user
    const userInfo = await registerAndLogin(page, { name:'normalUser'+Date.now(), email:`norm${Date.now()}@ex.com`, password:'pw123' });
    expect(userInfo.success).toBeTruthy();
    // Attempt with regular user's cookies
    const cookies = await context.cookies();
    // Should still 403 (no admin claim)
    const regular = await page.request.get('http://localhost:3000/admin/active_sessions');
    expect([401,403]).toContain(regular.status());

    // 3. Simulate admin token: call refresh endpoint after manually setting refresh cookie with admin claim (fallback approach)
    // Simpler: directly craft a fetch with Authorization header using existing auth_token cookie (not admin) -> expect 403.
    const r2 = await page.request.get('http://localhost:3000/admin/active_sessions', { headers:{ 'Authorization': `Bearer ${userInfo.token}` }});
    expect([401,403]).toContain(r2.status());

    // NOTE: For full admin positive test we would need a user with isAdmin flag. If schema lacks isAdmin column the following block will be skipped.
    // Try to elevate via direct DB update if column exists.
    try {
      const fs = require('fs');
      if (fs.existsSync('databases/database.sqlite')) {
        // Best-effort: open sqlite and set isAdmin=1 if column present
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('databases/database.sqlite');
        await new Promise(resolve => db.get("PRAGMA table_info(users)", (err, row)=>resolve()));
        db.all("PRAGMA table_info(users)", async (err, rows) => {
          if (!err && rows && rows.find(r=>r.name==='isAdmin')) {
            db.run("UPDATE users SET isAdmin=1 WHERE email=?", [userInfo.username ? userInfo.username : ''], ()=>{});
          }
        });
        db.close();
      }
    } catch {}
    // 4. Seeded admin user (migration seeds admin@example.com / admin123). Log in and expect 200.
  const adminLogin = await page.request.post('http://localhost:3000/auth/login', { data:{ email:'admin@example.com', password:'admin123' } });
  expect(adminLogin.status()).toBe(200);
  const adminJson = await adminLogin.json();
  // token may be paseto or dev.*; fallback to cookie session if bearer path not recognized in middleware
  // Introspect without bearer header first (cookie should carry username + admin userType)
  const me = await page.request.get('http://localhost:3000/auth/me');
  // Allow 200 or 401 (older paths); proceed to admin endpoint which uses cookie-based attachUser
  const adminResp = await page.request.get('http://localhost:3000/admin/active_sessions');
  expect(adminResp.status(), 'admin endpoint expected 200 for seeded admin cookie session').toBe(200);
  });
});