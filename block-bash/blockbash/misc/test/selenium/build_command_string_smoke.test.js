const { By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 25000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e) {}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

function dragAndDropScript() {
  const src = arguments[0];
  const dst = arguments[1];
  const rect = dst.getBoundingClientRect();
  const dt = new DataTransfer();
  src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles:true }));
  dst.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
  dst.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
}

(async () => {
  let server; let serverStarted=false; let driver;
  try {
    let up=false; try { await waitForServer('http://localhost:3002/'); up=true; } catch{}
    if(!up){ server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: { ...process.env, PORT: '3002' } }); serverStarted = true; await waitForServer('http://localhost:3002/'); }

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    // Go to editor via register shortcut
    await driver.get('http://localhost:3002/editor');
    await driver.wait(until.elementLocated(By.css('.workspace')), 15000);

    // Load General and drag Custom
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('general');");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 15000);
    const dropId = await driver.executeScript("const d=document.getElementById('drop-area')||document.querySelector('[id^=\\'drop-area-\\']'); return d?d.id:'drop-area';");
    const dropArea = await driver.findElement(By.css('#'+dropId));
    const customBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//*[contains(text(),'Custom')]]"));
    await driver.executeScript(dragAndDropScript, customBlock, dropArea);
    await driver.executeScript(function(id){ const blk=document.querySelector('#'+id+' .block'); if(blk){ blk.querySelectorAll('.block-details, .command-details').forEach(el=> el && (el.style.display='block')); } }, dropId);
    await driver.wait(until.elementLocated(By.css('#'+dropId+' .block input')), 15000);

    // Type command string
    await driver.findElement(By.css('#'+dropId+' .block input')).sendKeys('echo hi');

    // Evaluate builder result in page
    const cmd = await driver.executeScript(function(id){
      return window.buildCommandStringFromBlocks(id);
    }, dropId);
    if (!cmd || cmd.trim() !== 'echo hi') throw new Error('Unexpected build result: '+cmd);
    console.log('[BuildSmoke] OK:', cmd);
  } catch (e) {
    console.error('[BuildSmoke] error:', e);
    process.exitCode = 1;
  } finally {
    try { if(driver) await driver.quit(); } catch{}
    if(serverStarted && server) server.kill();
  }
})();
