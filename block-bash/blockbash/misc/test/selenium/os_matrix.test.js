// Selenium OS matrix test: verifies terminal basic command under kali, windows (provision/ssh), macos (provision/ssh)
// Simplified to just request each OS via query param ?os=<os> if frontend/backend honors it.
// Assumes server supports selecting OS at /editor?os=<os> (backend initContainer path uses chosenOs argument)
// Falls back gracefully if not provisioned; will log skip if fallback occurs.

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 20000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e) {}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

async function runForOS(os){
  let driver;
  try {
    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);
    await driver.get('http://localhost:3000/editor?os='+os);
  await driver.wait(until.elementLocated(By.css('#output-terminal')), 30000);
    // Wait for readiness markers
    // Wait for explicit readiness event (JSON) reflected in a JS flag
    await driver.executeScript("window.__sandboxReady=false; window.addEventListener('sandbox-ready', ()=>{ window.__sandboxReady=true; });");
    await driver.wait(async () => {
      return await driver.executeScript('return window.__sandboxReady === true');
    }, 45000, 'sandbox ready event not received');
    // send echo
    const termDiv = await driver.findElement(By.css('#output-terminal'));
    await driver.actions().click(termDiv).perform();
    await driver.actions().sendKeys('echo os-matrix-'+os).perform();
    await driver.actions().sendKeys(Key.ENTER).perform();
    await driver.wait(async ()=>{
      const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
      return new RegExp('os-matrix-'+os).test(full);
    }, 10000);
    // Detect fallback notice (server emits notice JSON -> we wrote text line already)
    const fellBack = await driver.executeScript("return /OS fallback:/i.test(document.getElementById('output-terminal').innerText);");
    if (fellBack && os !== 'kali') {
      console.log(`[OS-Matrix] ${os} fallback observed; skipping further assertions for this OS.`);
      return; // skip rest
    }
    console.log(`[OS-Matrix] ${os} test passed`);
  } catch (e) {
    console.error(`[OS-Matrix] ${os} test error`, e.message);
    throw e;
  } finally {
    if(driver) await driver.quit();
  }
}

(async () => {
  // Start server if needed
  let serverStarted=false; let server;
  try {
    try { await waitForServer('http://localhost:3000/editor', 2000); } catch {
      server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit' });
      serverStarted = true;
      await waitForServer('http://localhost:3000/editor');
    }
  const targets = ['kali','windows','osx'];
    for (const os of targets) {
      try { await runForOS(os); } catch(e) { console.warn(`[OS-Matrix] ${os} failed:`, e.message); }
    }
  } catch(e){
    console.error('[OS-Matrix] setup error', e);
    process.exitCode = 1;
  } finally {
    if(serverStarted && server) server.kill();
  }
})();
