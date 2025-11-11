const { test, expect } = require('@playwright/test');

test('Sandbox Terminal Loads', async ({ page }) => {
  await page.context().addCookies([{ name: 'username', value: 'testuser', domain: 'localhost', path: '/' }]);
  await page.goto('http://localhost:3002/editor');
  await expect(page.locator('#output-terminal')).toBeVisible();
});

test('Banned Command Blocked', async ({ page }) => {
  await page.context().addCookies([{ name: 'username', value: 'testuser', domain: 'localhost', path: '/' }]);
  await page.goto('http://localhost:3002/editor');
  // Wait for terminal to load
  await page.waitForSelector('#output-terminal');
  // Focus terminal explicitly to ensure keystrokes land
  await page.click('#output-terminal');
  // Wait for readiness banner or self-test denial line (either indicates WS active)
  await page.waitForFunction(() => {
    const el = document.getElementById('output-terminal');
    if(!el) return false;
    const txt = el.textContent || '';
    return txt.includes('[self-test] denial check complete') || txt.includes('[sandbox] interactive shell') || txt.includes('[sandbox] interactive shell failed');
  }, { timeout: 10000 });
  // Type banned command
  await page.keyboard.type('rm -rf /');
  await page.keyboard.press('Enter');
  // Check for denied message
  await expect(page.locator('#output-terminal')).toContainText('[denied]', { timeout: 10000 });
});
