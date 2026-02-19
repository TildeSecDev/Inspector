import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __tauriListeners?: Record<string, (event: any) => void>;
    __resolveScan?: (value: any) => void;
    __TAURI__?: any;
  }
}

test.describe('Network Scan UI - Live Updates', () => {
  test('shows live devices as ARP and Nmap progress', async ({ page }) => {
    await page.addInitScript(() => {
      const listeners: Record<string, (event: any) => void> = {};
      (globalThis as any).__tauriListeners = listeners;
      (globalThis as any).__TAURI__ = {
        core: {
          invoke: async () => {
            return await new Promise((resolve) => {
              (globalThis as any).__resolveScan = resolve;
            });
          },
        },
        event: {
          listen: async (event: string, handler: (event: any) => void) => {
            listeners[event] = handler;
            return () => {
              delete listeners[event];
            };
          },
        },
      };
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const roeCheckbox = page.locator('input[type="checkbox"]');
    const roeButton = page.locator('button:has-text("Enable local testing")');
    if (await roeCheckbox.isVisible().catch(() => false)) {
      await roeCheckbox.check();
      await roeButton.click();
    }

    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="Project Name"]', 'Scan UI Test');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(500);

    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(500);
    await page.click('.card:has-text("Scan UI Test")');
    await page.waitForTimeout(500);

    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("SCAN Network")');
    await expect(page.getByText('Scanning...')).toBeVisible();

    await page.evaluate(() => {
      const handler = (globalThis as any).__tauriListeners['network-scan-log'];
      if (!handler) return;
      handler({ payload: { level: 'info', message: 'Found: 10.0.0.42 (AA:BB:CC:DD:EE:FF)' } });
      handler({ payload: { level: 'info', message: 'Scanning 10.0.0.42' } });
      handler({ payload: { level: 'info', message: 'Completed 10.0.0.42' } });
    });

    const liveDevices = page.locator('details', { hasText: 'Live devices (1)' });
    await expect(liveDevices.getByText('10.0.0.42', { exact: true })).toBeVisible();
    await expect(liveDevices.getByText('AA:BB:CC:DD:EE:FF', { exact: true })).toBeVisible();
    await expect(liveDevices.getByText('completed', { exact: true })).toBeVisible();

    await page.evaluate(() => {
      const resolve = (globalThis as any).__resolveScan;
      if (typeof resolve === 'function') {
        resolve({
          status: 'success',
          message: 'Network scan completed. Found 1 devices.',
          output_file: '/tmp/network-scan.json',
          scan_data: {
            metadata: { network_info: { network_cidr: '10.0.0.0/24', gateway: '10.0.0.1' } },
            devices: {},
          },
          timestamp: new Date().toISOString(),
        });
      }
    });
  });
});
