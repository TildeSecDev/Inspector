import { test, expect } from '@playwright/test';

const DOCKUR = process.env.MACOS_DOCKUR === '1';
const IS_LINUX = process.platform === 'linux';
test.skip(!DOCKUR || !IS_LINUX, 'macOS VM test skipped (requires MACOS_DOCKUR=1 on Linux host with KVM)');

async function waitForMacReady(page, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await page.request.get('/sandbox/status?os=osx');
    if (res.ok()) {
      const j = await res.json();
      if (j && j.readiness && j.readiness.ssh) return j;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error('macOS sandbox not ready in time');
}

test.describe('macOS sandbox readiness and command exec', () => {
  test('waits for /sandbox/status then runs uname', async ({ page }) => {
    // Force osx in URL so xterm connects with ?os=osx
    await page.goto('/public/pages/index.html?os=osx');
    // Wait for readiness via API (independent of terminal messaging)
    const status = await waitForMacReady(page);
    expect(status.state === 'running' || status.state === 'starting').toBeTruthy();

    // Focus terminal and send a simple command
    const term = page.locator('#output-terminal');
    await term.click();
    // Type a command safe in both Linux guest and macOS VM
    await page.keyboard.type('uname -a');
    await page.keyboard.press('Enter');
    // Expect to see uname output
    await expect(term).toContainText(/Darwin|Linux/i, { timeout: 30000 });
  });
});
