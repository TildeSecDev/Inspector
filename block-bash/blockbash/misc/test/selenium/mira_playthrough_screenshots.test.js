// Selenium playthrough that captures screenshots for Mira's story.
// Saves screenshots to test-results/screenshots/mira_before_next.png and mira_after_next.png
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 20000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e){}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

(async ()=>{
  let server; let started = false;
  try {
    try { await waitForServer('http://localhost:3000/examples/mira/index.html'); } catch(_) {
      server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: {...process.env, PORT: '3000'} });
      started = true;
      await waitForServer('http://localhost:3000/examples/mira/index.html');
    }

    // Prepare screenshot directory
    const outDir = path.resolve(process.cwd(), 'test-results', 'screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    try {
      await driver.get('http://localhost:3000/examples/mira/index.html');
      await driver.wait(until.elementLocated(By.id('begin-btn')), 10000);
      // Take screenshot before clicking Begin to capture main menu
      const beforeMenu = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_menu.png'), Buffer.from(beforeMenu, 'base64'));
      console.log('[screenshot] wrote mira_menu.png');

  const begin = await driver.findElement(By.id('begin-btn'));
  // Instead of relying on the page to fetch/demo via document.write (which can be flaky in headless),
  // navigate directly to the demo HTML which is served statically under /examples/mira/chapters/demo/demo.html
  await driver.get('http://localhost:3000/examples/mira/chapters/demo/demo.html');

  // Wait for the demo next button
  await driver.wait(until.elementLocated(By.id('demo-next-btn')), 20000);

      // Take screenshot after Begin / before Next
      const beforeNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_before_next.png'), Buffer.from(beforeNext, 'base64'));
      console.log('[screenshot] wrote mira_before_next.png');

  // Prefer whichever next button exists on the rendered page
  let next;
  try { next = await driver.findElement(By.id('next-step-btn')); } catch (e) { next = await driver.findElement(By.id('demo-next-btn')); }
      await next.click();

      // Wait a short moment for content to update then capture after-next screenshot
      await driver.sleep(700);
      const afterNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_after_next.png'), Buffer.from(afterNext, 'base64'));
      console.log('[screenshot] wrote mira_after_next.png');

      console.log('[mira_screenshots] Completed successfully. Files saved in', outDir);
    } finally {
      await driver.quit();
    }
  } catch (e) {
    console.error('[mira_screenshots] Error:', e);
    process.exitCode = 1;
  } finally {
    if(started && server) server.kill();
  }
})();
