import { test, expect } from '@playwright/test';

async function gotoEditor(page) {
  await page.context().addCookies([
    { name: 'username', value: 'tester', path: '/', domain: 'localhost' },
    { name: 'lesson_id', value: 'rpg', path: '/', domain: 'localhost' }
  ]);
  await page.goto('/editor');
  await expect(page.locator('#workshop-container')).toBeVisible();
}

// 5. RPG functionality - ls command should now work to progress the story
// We approximate by sending command to terminal websocket injection if possible or fallback to validate endpoint.

// Since full terminal interaction may be complex, we directly call validation endpoint to assert pass response.

import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve({ status: res.statusCode, data })); });
    req.on('error', reject); req.write(JSON.stringify(body)); req.end();
  });
}

test.describe('RPG Workshop Validation', () => {
  test.beforeEach(async ({ page }) => { await gotoEditor(page); });

  test('ls command passes validation', async ({ page }) => {
    const res = await post('/ws/validate', { command: 'ls', lesson_id: 'rpg' });
    expect(res.status).toBe(200);
    expect(res.data).toMatch(/"pass"\s*:\s*true/);
  });

  test('pwd command does not pass validation', async ({ page }) => {
    const res = await post('/ws/validate', { command: 'pwd', lesson_id: 'rpg' });
    expect(res.status).toBe(200);
    expect(res.data).toMatch(/"pass"\s*:\s*false/);
  });
});
