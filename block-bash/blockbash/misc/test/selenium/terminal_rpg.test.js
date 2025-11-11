// Selenium test: verifies xterm terminal command execution in sandbox and RPG workshop progression.
// Usage: npm run test:selenium:terminal (ensure Chrome + server running or let this start one).

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');
const assert = require('assert');

async function waitForServer(url, timeoutMs = 20000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e) {}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

(async () => {
  // Start server if not already (PORT 3000)
  let serverStarted = false;
  let server;  
  try {
    let reachable = false;
    try { await waitForServer('http://localhost:3000/editor', 2000); reachable = true; } catch(_) {}
    if(!reachable){
      server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit' });
      serverStarted = true;
    }
    await waitForServer('http://localhost:3000/editor');

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);
    // Helpers
    async function waitForLoaderHidden(timeout=15000){
      try {
        await driver.wait(async ()=>{
          return await driver.executeScript("var el=document.querySelector('.loading-screen'); if(!el) return true; return el.classList.contains('hide-loading')||window.getComputedStyle(el).display==='none';");
        }, timeout);
      } catch(_) {}
    }
    async function clickRetry(byOrSelector, tries=3){
      let last; for(let i=0;i<tries;i++){
        try{
          const el = typeof byOrSelector === 'string' ? await driver.findElement(By.css(byOrSelector)) : await driver.findElement(byOrSelector);
          await driver.wait(until.elementIsVisible(el),10000);
          await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
          try { await el.click(); return; } catch(e){ last=e; await driver.executeScript('arguments[0].click();', el); return; }
        } catch(e){ last=e; await driver.sleep(250);} }
      throw last;
    }
    try {
      await driver.get('http://localhost:3000/editor');
      await waitForLoaderHidden();
      await driver.wait(until.elementLocated(By.css('#workshop-container')), 15000);
      // Terminal present
      await driver.wait(until.elementLocated(By.css('#output-terminal')), 20000);
      // Make sure Block Editor visible and a block exists
      await driver.executeScript("const el=document.querySelector('.canvas-tab[data-tab=\\'block-editor\\']'); if(el) el.click();");
      await driver.executeScript("if(window.loadBlocks) window.loadBlocks('general');");
      await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 15000);
      const dropId = await driver.executeScript("const d=document.getElementById('drop-area')||document.querySelector('[id^=\\'drop-area-\\']'); return d?d.id:'drop-area';");
      const dropArea = await driver.findElement(By.css('#'+dropId));
      // Drag a Custom block and type a command
      const customBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//*[contains(text(),'Custom')] or .//*[contains(text(),'Script')]]"));
      await driver.executeScript(function(){ const el=document.getElementById(arguments[1]); el && el.scrollIntoView({block:'center'}); }, null, dropId);
      await driver.executeScript(function(src,dst){
        const rect = dst.getBoundingClientRect();
        const dt = new DataTransfer();
        src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles:true }));
        dst.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
        dst.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
      }, customBlock, dropArea);
      await driver.executeScript(function(id){ const blk=document.querySelector('#'+id+' .block'); if(blk){ blk.querySelectorAll('.block-details, .command-details').forEach(el=> el && (el.style.display='block')); } }, dropId);
      await driver.wait(until.elementLocated(By.css('#'+dropId+' .block input')), 15000);
      const input = await driver.findElement(By.css('#'+dropId+' .block input'));
      await input.clear().catch(()=>{});
      await input.sendKeys('pwd');
      // Click Run button to send via /run path (pty)
      await clickRetry('#run-button');

      // Wait for output with prompt or path and validation fallback
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
        return /(\/|\$\s*$)/.test(txt);
      }, 20000, 'No terminal output after running pwd');

      // Now run ls via the block and expect validation (MENU or Hint)
      await input.clear().catch(()=>{});
      await input.sendKeys('ls');
      await clickRetry('#run-button');
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
        return /--- MENU ---|Hint:/i.test(txt);
      }, 15000, 'RPG validation output not detected');

      // Denied command check
      await input.clear().catch(()=>{});
      await input.sendKeys('rm -rf /');
      await clickRetry('#run-button');
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
        return /\[denied\]\s+rm -rf \/?/i.test(txt);
      }, 10000, 'Denied marker not found');

      console.log('[Selenium] Terminal /run path + RPG validation test passed');
    } catch(e){
      console.error('[Selenium Terminal Test Error]', e);
      process.exitCode = 1;
    } finally {
      await driver.quit();
      if(serverStarted && server) server.kill();
    }
  } catch(e){
    console.error('[Selenium Setup Error]', e);
    process.exitCode = 1;
    if(serverStarted && server) server.kill();
  }
})();
