import { test, expect } from './fixtures';

async function switchLang(page, value){
  await page.selectOption('#language-select', value);
  await page.waitForLoadState('domcontentloaded');
}

const tooltipSelectors = [
  { id: '#btn-export-setup', key: 'exportSetup', en: 'Export current setup', es: 'Exportar configuración actual', de: 'Aktuelle Konfiguration exportieren', fr: 'Exporter la configuration actuelle', ar: 'تصدير الإعداد الحالي' },
  { id: '#btn-import-setup', key: 'importSetup', en: 'Import a saved setup', es: 'Importar una configuración guardada', de: 'Gespeicherte Konfiguration importieren', fr: 'Importer une configuration enregistrée', ar: 'استيراد إعداد محفوظ' },
  { id: '#workspace-collapse-btn', key: 'collapseWorkspace', en: 'Collapse Workspace', es: 'Colapsar Área de Trabajo', de: 'Arbeitsbereich einklappen', fr: "Réduire l'espace de travail", ar: 'طي مساحة العمل' },
  { id: '#console-collapse-btn', key: 'collapseConsole', en: 'Collapse Console', es: 'Colapsar Consola', de: 'Konsole einklappen', fr: 'Réduire la console', ar: 'طي وحدة التحكم' },
  { id: '#sidebar-toggle-btn', key: 'toggleSidebar', en: 'Toggle Sidebar', es: 'Alternar barra lateral', de: 'Seitenleiste umschalten', fr: 'Basculer la barre latérale', ar: 'تبديل الشريط الجانبي' }
];

test.describe('i18n translations', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/editor');
  });

  test('english default has expected keys', async ({ page }) => {
    await expect(page.locator('[data-i18n="workspace.blockEditor"]')).toHaveText(/Block Editor/i);
  });

  test('spanish translation appears', async ({ page }) => {
    await switchLang(page, 'spanish');
    await expect(page.locator('[data-i18n="workspace.blockEditor"]')).toHaveText('Editor de Bloques');
  });

  test('german translation appears', async ({ page }) => {
    await switchLang(page, 'german');
    await expect(page.locator('[data-i18n="workspace.networkEditor"]')).toHaveText('Netzwerk-Editor');
  });

  test('arabic sets rtl direction', async ({ page }) => {
    await switchLang(page, 'arabic');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('notifications namespace loads (loading text)', async ({ page }) => {
    await page.click('#notification-btn');
    const dropdown = page.locator('#notification-dropdown');
    await expect(dropdown).toBeVisible();
    // Accept either transient loading text or final empty state text across languages
    await expect(dropdown).toContainText(/Loading|Cargando|Lädt|جارٍ التحميل|No notifications|No hay notificaciones|Keine Benachrichtigungen|Aucune notification|لا توجد إشعارات/);
  });

  for (const t of tooltipSelectors) {
    test(`tooltip ${t.key} translates across languages`, async ({ page }) => {
      // English baseline
      await expect(page.locator(t.id)).toHaveAttribute('title', t.en);
      // Spanish
      await switchLang(page, 'spanish');
      await expect(page.locator(t.id)).toHaveAttribute('title', t.es);
      // German
      await switchLang(page, 'german');
      await expect(page.locator(t.id)).toHaveAttribute('title', t.de);
      // French
      await switchLang(page, 'french');
      await expect(page.locator(t.id)).toHaveAttribute('title', t.fr);
      // Arabic (RTL)
      await switchLang(page, 'arabic');
      await expect(page.locator(t.id)).toHaveAttribute('title', t.ar);
    });
  }

  test('friend request popup localized buttons (english -> spanish)', async ({ page, mockFriendRequest }) => {
    await mockFriendRequest();
    await page.click('#notification-btn');
    await page.click('#notification-dropdown .notification-row span');
    await expect(page.locator('#accept-friend-btn')).toHaveText('Accept');
    await expect(page.locator('#deny-friend-btn')).toHaveText('Deny');
    await switchLang(page, 'spanish');
    await mockFriendRequest();
    await page.click('#notification-btn');
    await page.click('#notification-dropdown .notification-row span');
    await expect(page.locator('#accept-friend-btn')).toHaveText('Aceptar');
    await expect(page.locator('#deny-friend-btn')).toHaveText('Rechazar');
  });
});
