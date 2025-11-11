// Basic Selenium test for i18n language switching and RTL direction.
// Usage: npm run test:selenium (ensure Chrome is installed)
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 15000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e) {}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

(async () => {
  // Try to reuse existing server on 3002; only spawn if unreachable.
  let server; let serverStarted = false;
  async function probe(){
    try {
      const fetchFn = global.fetch || (await import('node-fetch')).default;
      const r = await fetchFn('http://localhost:3002/editor', {redirect:'manual'});
      return r.status >=200 && r.status < 500;
    } catch { return false; }
  }
  if(!(await probe())) {
    server = cp.spawn(process.execPath, ['bin/www'], {stdio:'inherit', env: { ...process.env, PORT: '3002' }});
    serverStarted = true;
  }
  try {
    await waitForServer('http://localhost:3002/editor');
  const options = new chrome.Options();
  if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
  options.addArguments('--no-sandbox','--disable-dev-shm-usage');
  const chromedriver = require('chromedriver');
  const service = new chrome.ServiceBuilder(chromedriver.path).build();
  const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);
    try {
      await driver.get('http://localhost:3002/editor');
      const select = await driver.wait(until.elementLocated(By.css('#language-select')), 10000);
      // Switch to Arabic
      await select.findElement(By.css('option[value="arabic"]')).click();
      await driver.wait(until.elementLocated(By.css('#language-select')), 10000);
      const dirRtl = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dirRtl !== 'rtl') throw new Error('Expected dir rtl, got '+dirRtl);
      // Switch back to English
      const select2 = await driver.findElement(By.css('#language-select'));
      await select2.findElement(By.css('option[value="english"]')).click();
      await driver.wait(until.elementLocated(By.css('#language-select')), 10000);
      const dirLtr = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dirLtr !== 'ltr') throw new Error('Expected dir ltr, got '+dirLtr);
      console.log('[Selenium] i18n RTL direction test passed');
    } finally {
      await driver.quit();
    }
  } catch(e){
    console.error('[Selenium Test Error]', e);
    process.exitCode = 1;
  } finally {
    if(serverStarted && server) server.kill();
  }
})();
