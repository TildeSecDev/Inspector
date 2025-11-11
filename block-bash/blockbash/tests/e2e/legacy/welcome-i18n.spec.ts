import { test, expect } from '@playwright/test';

async function switchLang(page, value){
  await page.selectOption('#language-select', value);
  // allow i18n reload
  await page.waitForTimeout(300);
}

test.describe('welcome page i18n', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('english default shows Login', async ({ page }) => {
    await expect(page.locator('[data-i18n="login.title"]')).toHaveText(/Login/i);
  });

  test('spanish switch updates login title', async ({ page }) => {
    await switchLang(page, 'spanish');
    await expect(page.locator('[data-i18n="login.title"]')).toHaveText('Iniciar sesión');
  });

  test('german switch updates register button', async ({ page }) => {
    await switchLang(page, 'german');
    await expect(page.locator('[data-i18n="register.submit"]')).toHaveText('Registrieren');
  });

  test('arabic switch sets rtl and updates submit', async ({ page }) => {
    await switchLang(page, 'arabic');
    await expect(page.locator('html')).toHaveAttribute('dir','rtl');
    await expect(page.locator('[data-i18n="login.submit"]')).toHaveText('دخول');
  });
});
