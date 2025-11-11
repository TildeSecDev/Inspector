// Selenium test: Verify Wireshark/Apache blocks exist and required tools are available in container
// Usage: node test/selenium/apps_and_server_tools.test.js

const { Builder, By, until, Key } = require('selenium-webdriver');
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
  const evDragStart = new DragEvent('dragstart', { dataTransfer: dt, bubbles:true });
  src.dispatchEvent(evDragStart);
  const evDragOver = new DragEvent('dragover', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 });
  dst.dispatchEvent(evDragOver);
  const evDrop = new DragEvent('drop', { dataTransfer: dt, bubbles:true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 });
  dst.dispatchEvent(evDrop);
}

(async () => {
  let server; let serverStarted = false; let driver;
  try {
    // Start server on 3002 if not running
    let up=false; try { await waitForServer('http://localhost:3002/'); up=true; } catch{}
    if(!up){ server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: { ...process.env, PORT: '3002' } }); serverStarted = true; await waitForServer('http://localhost:3002/'); }

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    // Helpers
    async function clickRetry(by, tries=3){
      let last; for(let i=0;i<tries;i++){ try{ const el=await driver.findElement(by); await driver.wait(until.elementIsVisible(el),10000); await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el); try{ await el.click(); return; }catch(e){ last=e; await driver.executeScript('arguments[0].click();', el); return; } }catch(e){ last=e; await driver.sleep(200);} } throw last;
    }
    async function typeRetry(by, text, tries=3){
      let last; for(let i=0;i<tries;i++){ try{ const el=await driver.findElement(by); await driver.wait(until.elementIsVisible(el),10000); await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el); try{ await el.clear().catch(()=>{}); await el.sendKeys(text); return; }catch(e){ last=e; } await driver.executeScript('arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event("input", {bubbles:true})); arguments[0].dispatchEvent(new Event("change", {bubbles:true}));', el, text); return; }catch(e){ last=e; await driver.sleep(200);} } throw last;
    }

    // Register and navigate to /editor
    const uniq = Date.now();
    const email = `apps_${uniq}@example.com`;
    const password = 'Passw0rd!';
    console.log('[STEP] Open welcome page');
    await driver.get('http://localhost:3002/');
    await driver.wait(until.elementLocated(By.css('.folder-register .folder-cover')), 15000);
    await clickRetry(By.css('.folder-register .folder-cover'));
    await driver.wait(until.elementLocated(By.css('#register-form')), 10000);
    console.log('[STEP] Fill and submit register form');
    await typeRetry(By.css('#register-form input[name="name"]'), 'Apps Tools Tester');
    await typeRetry(By.css('#register-form input[name="email"]'), email);
    await typeRetry(By.css('#register-form input[name="password"]'), password);
    await driver.executeScript("const s=document.querySelector('#register-form select[name=\\'organization\\']'); if(s){ s.value='school'; s.dispatchEvent(new Event('input',{bubbles:true})); s.dispatchEvent(new Event('change',{bubbles:true})); }");
    await clickRetry(By.css('#register-form .submit-btn'));
    try { await driver.wait(async ()=> (await driver.getCurrentUrl()).includes('/editor'), 8000); } catch { await driver.get('http://localhost:3002/editor'); }
    console.log('[STEP] On editor page');

    // Terminal readiness and set OS to Kali
    await driver.wait(until.elementLocated(By.css('#output-terminal')), 30000);
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','kali'); if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({type:'set-os', os:'kali'})); }");
    try {
      await driver.wait(async ()=>{
        const status = await driver.executeAsyncScript(function(done){ fetch('/sandbox/status?os=kali',{credentials:'include'}).then(r=>r.json()).then(done).catch(()=>done(null)); });
        if(!status) return false; if(status.readiness && (status.readiness.shell || status.readiness.ssh || status.readiness.ready)) return true; if(status.kind==='placeholder' || status.state==='unavailable') return true; return false;
      }, 90000);
    } catch {}
    try {
      await driver.wait(async ()=>/(Ready|shell started|\$\s*$)/i.test(await driver.executeScript("return document.getElementById('output-terminal').innerText||'';")), 60000);
    } catch {
      try { await driver.actions().click(await driver.findElement(By.css('#output-terminal'))).perform(); await driver.actions().sendKeys('echo __ready__').perform(); await driver.actions().sendKeys(Key.ENTER).perform(); } catch {}
      await driver.wait(async ()=>/__ready__/.test(await driver.executeScript("return document.getElementById('output-terminal').innerText||'';")), 30000);
    }

    // Ensure Block Editor and blocks panel visible
    await driver.executeScript("const el=document.querySelector('.canvas-tab[data-tab=\\'block-editor\\']'); if(el) el.click();");
    await driver.executeScript(() => { const b = document.querySelector('.blocks-display-area'); if (b) b.style.display='flex'; const sb = document.querySelector('.sidebar'); if (sb){ sb.classList.remove('sidebar-closed'); sb.classList.add('sidebar-open'); } });
    const dropId = await driver.executeScript("const d0=document.getElementById('drop-area-0'); const d=document.getElementById('drop-area'); const dyn=document.querySelector('[id^=\\'drop-area-\\']'); return d0? 'drop-area-0' : (d? 'drop-area' : (dyn? dyn.id : 'drop-area')); ");
    const dropArea = await driver.findElement(By.css('#'+dropId));

  // Load Apps category and drag Wireshark block
    console.log('[STEP] Load Apps and drag Wireshark block');
    await driver.executeScript("const btn=document.querySelector('.category-btn[data-category=\\'apps\\']'); if(btn) btn.click();");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 20000);
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('apps');");
    await driver.wait(async ()=> await driver.executeScript("return Array.from(document.querySelectorAll('.active-block-list .block, .active-block-list .network-block')).some(b=>/wireshark/i.test(b.textContent||''));"), 20000);
    const wireBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//*[contains(translate(text(),'WIRE','wire'),'wireshark')]/ancestor::div[contains(@class,'block') or contains(@class,'network-block')]"));
    await driver.executeScript(dragAndDropScript, wireBlock, dropArea);

  // Load Server category and drag Apache block
    console.log('[STEP] Load Server and drag Apache block');
    await driver.executeScript("const btn=document.querySelector('.category-btn[data-category=\\'server\\']'); if(btn) btn.click();");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 20000);
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('server');");
    await driver.wait(async ()=> await driver.executeScript("return Array.from(document.querySelectorAll('.active-block-list .block, .active-block-list .network-block')).some(b=>/apache/i.test(b.textContent||''));"), 20000);
    const apacheBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//*[contains(translate(text(),'APACH','apach'),'apache')]/ancestor::div[contains(@class,'block') or contains(@class,'network-block')]"));
    await driver.executeScript(dragAndDropScript, apacheBlock, dropArea);

    // Also drag a General/Custom block to run shell commands via Run button
    console.log('[STEP] Load General and drag a Custom block');
    await driver.executeScript("const btn=document.querySelector('.category-btn[data-category=\\'general\\']'); if(btn) btn.click();");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 20000);
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('general');");
    // Find a block that contains 'Custom' or 'Script', else first available
    let customBlock;
    try {
      customBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//*[contains(text(),'Custom')] or .//*[contains(text(),'Script')]]"));
    } catch {
      customBlock = await driver.findElement(By.xpath("(//div[contains(@class,'active-block-list')]//div[contains(@class,'block')])[1]"));
    }
    await driver.executeScript(dragAndDropScript, customBlock, dropArea);
    // Ensure block details/inputs visible
    await driver.executeScript(function(id){ const blk=document.querySelector('#'+id+' .block'); if(blk){ blk.querySelectorAll('.block-details, .command-details').forEach(el=> el && (el.style.display='block')); } }, dropId);
    await driver.wait(until.elementLocated(By.css('#'+dropId+' .block input')), 15000);

    // Helper to run a command via the block input and Run button
    async function runViaBlock(cmd, expectRegex, timeout=60000){
      const input = await driver.findElement(By.css('#'+dropId+' .block input'));
      await input.clear().catch(()=>{});
      await input.sendKeys(cmd);
      // Click Run
      const runBtn = await driver.findElement(By.css('#run-button'));
      await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', runBtn);
      try { await runBtn.click(); } catch { await driver.executeScript('arguments[0].click();', runBtn); }
      // Wait for expected output in terminal
      await driver.wait(async ()=>{
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
        return expectRegex.test(full);
      }, timeout);
      const snap = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
      console.log('[DEBUG] Terminal tail:', String(snap).replace(/\s+/g,' ').slice(-320));
    }

    // Retry wrapper to accommodate background apt installs
    async function runCheckWithRetries(cmd, expectRegex, attempts=4){
      for(let i=0;i<attempts;i++){
        try { await runViaBlock(cmd, expectRegex, 90000); return true; } catch(e){
          const last = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
          if(/__NO_TSHARK__|__NO_APACHE__/.test(last) && i < attempts-1){
            console.log('[INFO] Tool not ready yet, retrying after wait...');
            await driver.sleep(30000);
            continue;
          }
          if(i === attempts-1) throw e;
          await driver.sleep(10000);
        }
      }
    }

    console.log('[STEP] Check tshark availability via block run');
    await runCheckWithRetries('tshark -v || which tshark || echo __NO_TSHARK__', /(TShark\s+\d+|\/tshark)/i, 5);

    console.log('[STEP] Check apache availability via block run');
    await runCheckWithRetries('apache2 -v || apachectl -v || httpd -v || echo __NO_APACHE__', /(Apache\/?\d|Server version: Apache)/i, 5);

    console.log('[Selenium] Apps/Server blocks present and tools available check passed');
  } catch (e) {
    console.error('[Selenium] apps_and_server_tools error:', e);
    process.exitCode = 1;
  } finally {
    try { if(driver) await driver.quit(); } catch{}
    if(serverStarted && server) server.kill();
  }
})();
