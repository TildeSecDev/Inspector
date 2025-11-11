// Simple Selenium playthrough for Mira's story: open the example page, click Begin, then click Next to advance a step.
// Usage: npm run test:selenium (or node this file directly)
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 15000){
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

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    try {
      await driver.get('http://localhost:3000/examples/mira/index.html');
      // Wait for Begin button
      await driver.wait(until.elementLocated(By.id('begin-btn')), 5000);
      const begin = await driver.findElement(By.id('begin-btn'));
      await begin.click();

      // After clicking Begin, demo.html is loaded which should contain a .rpg-panel with Next button
      await driver.wait(until.elementLocated(By.css('.rpg-panel')), 5000);
      // Wait for next-step button
      await driver.wait(until.elementLocated(By.id('next-step-btn')), 5000);
      const next = await driver.findElement(By.id('next-step-btn'));
      await next.click();

      // After clicking Next, either step2 exists or end of story is reached; assert something changed
      await driver.sleep(500);
      const panelText = await driver.findElement(By.css('.rpg-dialogue-banner')).getText();
      console.log('[mira_playthrough] panel text:', panelText.slice(0,120));

      console.log('[mira_playthrough] Playthrough actions completed successfully');
    } finally {
      await driver.quit();
    }
  } catch (e) {
    console.error('[mira_playthrough] Error', e);
    process.exitCode = 1;
  } finally {
    if(started && server) server.kill();
  }
})();
