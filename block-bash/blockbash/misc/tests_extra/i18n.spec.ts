import { test, expect } from '@playwright/test';

const languages = ['english','spanish','german','french','arabic'];

async function selectLang(page, lang){
  await page.selectOption('#language-select', lang);
  // reload happens automatically; wait for load
  await page.waitForLoadState('domcontentloaded');
}

test.describe('i18n smoke', () => {
  for (const lang of languages){
    test(`switch to ${lang} on welcome page`, async ({ page }) => {
      await page.goto('/public/pages/welcome.html');
      await selectLang(page, lang);
      // basic assertion: brand text present and not empty
      const brand = await page.textContent('[data-i18n="bg.brand"]');
      expect(brand).toBeTruthy();
    });
  }

  for (const lang of languages){
    test(`switch to ${lang} on editor page`, async ({ page }) => {
      await page.goto('/public/pages/index.html');
      await selectLang(page, lang);
      // Check a few keys
      await expect(page.locator('[data-i18n="workspace.blockEditor"]')).toHaveText(/.+/);
      await expect(page.locator('#btn-export-setup')).toHaveAttribute('title', /.+/);
      await expect(page.locator('#workspace-collapse-btn')).toHaveAttribute('title', /.+/);
    });
  }
});
