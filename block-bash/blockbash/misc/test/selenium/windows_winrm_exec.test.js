// Selenium test: verify WinRM-backed Windows execution via xterm run workflow.
// Skips if WINRM_HOST not set.

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const SHOULD_RUN = !!process.env.WINRM_HOST;

(SHOULD_RUN ? describe : describe.skip)('Windows WinRM xterm integration', function() {
  this.timeout(60000);
  let driver;
  before(async () => {
    const options = new chrome.Options().headless();
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });
  after(async () => { if (driver) await driver.quit(); });

  it('executes a PowerShell echo and sees output', async () => {
    // Pre-set username cookie to bypass UI friction
    await driver.get('http://localhost:3000/editor');
    await driver.manage().addCookie({ name:'username', value:'winrm_test_user' });
    await driver.get('http://localhost:3000/editor?os=windows');
    // Wait for sandbox ready line
    const termSelector = '#terminal-output, .xterm';
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    // Poll for ready text
    let sawReady = false; let sawEcho = false;
    const start = Date.now();
    while (Date.now() - start < 20000 && (!sawReady || !sawEcho)) {
      const pageText = await driver.findElement(By.css('body')).getText().catch(()=> '');
      if (/\[sandbox\] Ready/i.test(pageText)) sawReady = true;
      if (/BLOCKBASH_WINRM_OK/.test(pageText)) sawEcho = true;
      if (sawReady && sawEcho) break;
      // Attempt to inject command once ready
      if (sawReady && !sawEcho) {
        await driver.executeScript(() => {
          const ws = window.__activeRunSocket || window.runSocket || window.sandboxSocket;
          if (ws && ws.readyState === 1 && !window.__winrmEchoSent) {
            window.__winrmEchoSent = true;
            // Fallback: directly invoke run button logic if present
            if (typeof window.runCommandDirect === 'function') {
              window.runCommandDirect("Write-Output 'BLOCKBASH_WINRM_OK'");
            } else {
              ws.send(JSON.stringify({ type:'exec', command:"Write-Output 'BLOCKBASH_WINRM_OK'" }));
            }
          }
        });
      }
      await new Promise(r=>setTimeout(r,500));
    }
    assert(sawReady, 'did not see sandbox ready');
    assert(sawEcho, 'did not see WinRM echo output');
  });
});

if (!SHOULD_RUN) console.log('[windows-winrm-exec] skipped (WINRM_HOST not set)');
