const { test, expect } = require('@playwright/test');

test('Sandbox Terminal Loads', async ({ page }) => {
  await page.goto('http://localhost:3002/editor');
  await page.fill('#username', 'testuser');
  await page.click('#login');
  await expect(page.locator('#terminal')).toBeVisible();
});

test('Banned Command Blocked', async ({ page }) => {
  await page.goto('http://localhost:3002/editor');
  await page.fill('#username', 'testuser');
  await page.click('#login');
  await page.fill('#terminal-input', 'rm -rf /');
  await page.press('#terminal-input', 'Enter');
  await expect(page.locator('#terminal-output')).toContainText('[denied]');
});
