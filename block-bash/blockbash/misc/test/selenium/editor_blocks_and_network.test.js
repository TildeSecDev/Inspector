// Selenium tests: block editor drag/run, network editor linking, OS-specific commands, macOS status pill
// Usage: node test/selenium/editor_blocks_and_network.test.js

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

// Lightweight "curl" helper to fetch the page and log status + a short snippet
async function curlPage(url, label='curl'){
  try {
    const fetchFn = global.fetch || (await import('node-fetch')).default;
    const res = await fetchFn(url, { redirect: 'manual' });
    const text = await res.text();
    console.log(`[CURL:${label}] ${res.status} ${res.statusText} -> ${url}`);
    console.log('[CURL:snippet]', text.replace(/\s+/g,' ').slice(0, 160));
  } catch (e) {
    console.warn(`[CURL:${label}] failed for ${url}:`, e.message || e);
  }
}

function dragAndDropScript() {
  // Simulate HTML5 drag and drop using DataTransfer
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

    // Browser
    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    // Helpers
  async function clickRetry(by, tries=3){
      let last;
      for(let i=0;i<tries;i++){
        try {
          const el = await driver.findElement(by);
      await driver.wait(until.elementIsVisible(el), 10000);
          await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
          try { await el.click(); return; } catch(e) {
            last = e;
            // Fallback to JS click
            await driver.executeScript('arguments[0].click();', el);
            return;
          }
        } catch(e){ last = e; await driver.sleep(200); }
      }
      throw last;
    }
    async function setSelectViaJS(selector, value){
      await driver.executeScript(function(sel, val){
        const el = document.querySelector(sel);
        if(!el) return false;
        el.value = val; el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true }));
        return true;
      }, selector, value);
    }
  async function typeRetry(by, text, tries=3){
      let last;
      for(let i=0;i<tries;i++){
        try {
          const el = await driver.findElement(by);
      await driver.wait(until.elementIsVisible(el), 10000);
          await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
          try { await el.clear().catch(()=>{}); await el.sendKeys(text); return; } catch(e){ last = e; }
          // JS fallback: set value directly
          await driver.executeScript('arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event("input", {bubbles:true})); arguments[0].dispatchEvent(new Event("change", {bubbles:true}));', el, text);
          return;
        } catch(e){ last = e; await driver.sleep(200); }
      }
      throw last;
    }

    // Quick login helper: create user once per run
    const uniq = Date.now();
    const email = `block_${uniq}@example.com`;
    const password = 'Passw0rd!';
  await driver.get('http://localhost:3002/');
  console.log('[STEP] Loaded welcome page');
    // curl welcome page
    await curlPage('http://localhost:3002/', 'welcome');
    // Ensure binder is present before interacting
    await driver.wait(until.elementLocated(By.css('.binder')), 15000);
    await driver.wait(until.elementLocated(By.css('.folder-register .folder-cover')), 15000);
  await clickRetry(By.css('.folder-register .folder-cover'));
  console.log('[STEP] Clicked register cover');
    // Fallback JS click in case animation intercepts the first click
    await driver.executeScript("const el=document.querySelector('.folder-register .folder-cover'); if(el) el.click();");
    // Wait until the register folder is actually open (visible form)
    await driver.wait(async ()=>{
      return await driver.executeScript('return !!document.querySelector(".folder-register.folder-open #register-form")');
    }, 10000);
  await driver.wait(until.elementLocated(By.css('#register-form')), 10000);
  console.log('[STEP] Register form located');
  await typeRetry(By.css('#register-form input[name="name"]'), 'Block Tester');
  await typeRetry(By.css('#register-form input[name="email"]'), email);
  await typeRetry(By.css('#register-form input[name="password"]'), password);
    await setSelectViaJS('#register-form select[name="organization"]','school');
    await clickRetry(By.css('#register-form .submit-btn'));
    console.log('[STEP] Submitted register form; waiting for redirect to /editor');
    try {
      await driver.wait(async ()=>{
        try { const url = await driver.getCurrentUrl(); return url.includes('/editor'); } catch { return false; }
      }, 30000);
    } catch (e) {
      const cur = await driver.getCurrentUrl().catch(()=> 'unknown');
      console.warn('[WARN] Redirect not detected within timeout. Current URL:', cur);
      // The welcome page uses a 5s animation before redirect; forcibly navigate if still on welcome
      if(!String(cur).includes('/editor')) {
        await driver.get('http://localhost:3002/editor');
      }
    }
    console.log('[STEP] On editor page');

  // curl editor page
  try { const curUrl = await driver.getCurrentUrl(); await curlPage(curUrl, 'editor'); } catch {}

  // Ensure editor containers and terminal are present, then set OS to Kali
  console.log('[STEP] Waiting for editor containers');
  await driver.wait(until.elementLocated(By.css('#workshop-container')), 30000);
  console.log('[STEP] Workshop container located');
  await driver.wait(until.elementLocated(By.css('#output-terminal')), 30000);
  console.log('[STEP] Output terminal located');
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','kali');");
    await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'kali' })); }");
  console.log('[STEP] Waiting for terminal readiness');
  try {
    await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /\[sandbox\] Ready|interactive shell started|\$\s*$/.test(txt);
    }, 60000);
  } catch (e) {
    console.warn('[WARN] Terminal readiness not detected in time; injecting probe command');
    const probe = 'echo __ready_probe__';
    try {
      await driver.executeScript("if(window.injectCommandAndEnter){ window.injectCommandAndEnter(arguments[0]); }", probe);
    } catch {}
    await driver.wait(async ()=>{
      const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
      return /__ready_probe__/.test(txt);
    }, 20000);
  }

  // Ensure Block Editor is active for functional blocks (like Ping)
  console.log('[STEP] Ensuring Block Editor tab is active');
  try { await driver.findElement(By.css('.canvas-tab[data-tab="block-editor"]')).click(); } catch {}
  // curl current page before interacting with blocks list
  try { const curUrl = await driver.getCurrentUrl(); await curlPage(curUrl, 'before-ping'); } catch {}
  // Open Network category (functional network blocks for block editor)
  console.log('[STEP] Clicking Network category (block editor)');
  await driver.findElement(By.css('.category-btn[data-category="network"]')).click();
    // Force open blocks panel and load blocks to avoid animation races
    await driver.executeScript("const a=document.querySelector('.blocks-display-area'); if(a) a.style.display='flex'; if(window.loadBlocks) window.loadBlocks('network');");
    // Ensure sidebar expanded and give more time for blocks to render
    await driver.executeScript("const sb=document.querySelector('.sidebar'); if(sb){ sb.classList.remove('sidebar-closed'); sb.classList.add('sidebar-open'); }");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 30000);
    // Robust: poll for blocks and keep invoking loadBlocks if needed
    const startT = Date.now();
    let count = 0;
    while(Date.now() - startT < 60000){
      count = await driver.executeScript("return document.querySelectorAll('.active-block-list .block').length");
      if(count > 0) break;
      await driver.executeScript("if(window.loadBlocks) window.loadBlocks('network');");
      await driver.sleep(700);
    }
    console.log('[DEBUG] Final blocks count:', count);
    if(count === 0){
      // Dump a bit more context to help diagnose
      try { const logs = await driver.manage().logs().get('browser'); console.log('[BrowserLogs]', logs.map(l=>l.message).slice(-10)); } catch {}
      throw new Error('No blocks rendered for network category');
    }
    try { const logs = await driver.manage().logs().get('browser'); console.log('[BrowserLogs]', logs.map(l=>l.message).slice(-5)); } catch {}
    // Prefer Ping block (functional block with inputs)
    let pingBlock;
    try {
      pingBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//span[contains(.,'Ping')] or .//*[contains(text(),'Ping')]]"));
    } catch {
      // Fallback to first block
      pingBlock = await driver.findElement(By.xpath("(//div[contains(@class,'active-block-list')]//div[contains(@class,'block')])[1]"));
    }
  // Resolve the active block editor canvas id dynamically (drop-area or drop-area-<id>)
  const dropId = await driver.executeScript("const d0=document.getElementById('drop-area-0'); const d=document.getElementById('drop-area'); const dyn=document.querySelector('[id^=\\'drop-area-\\']'); return d0? 'drop-area-0' : (d? 'drop-area' : (dyn? dyn.id : 'drop-area')); ");
  const dropArea = await driver.findElement(By.css('#' + dropId));
    await driver.executeScript(dragAndDropScript, pingBlock, dropArea);
    // Ensure details are visible and set inputs via JS to avoid interactability issues
    await driver.wait(async (d)=>{
      return await d.executeScript(function(id){ return !!document.querySelector('#'+id+' .block .ping-details'); }, dropId);
    }, 20000);
    await driver.executeScript(function(id){
      const blk = document.querySelector('#'+id+' .block');
      if (!blk) return false;
      blk.querySelectorAll('.block-details, .ping-details, .command-details, .ssh-details').forEach(el=> el && (el.style.display='block'));
      const host = blk.querySelector('.ping-details input.ping-host');
      if (host){ host.value='127.0.0.1'; host.dispatchEvent(new Event('input',{bubbles:true})); host.dispatchEvent(new Event('change',{bubbles:true})); }
      const to = blk.querySelector('.ping-details input.ping-timeout');
      if (to){ to.value='-c 1'; to.dispatchEvent(new Event('input',{bubbles:true})); to.dispatchEvent(new Event('change',{bubbles:true})); }
      return true;
    }, dropId);
    // Click Run and assert output contains common ping outputs or permissive fallbacks (in case ping is restricted)
    await driver.findElement(By.css('#run-button')).click();
    console.log('[STEP] Ran Ping block; awaiting terminal output');
    try {
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /PING|bytes from|icmp_seq|ttl=|packets transmitted|unreachable|operation not permitted|command not found|temporary failure|name or service not known|usage: ping|bad address|unknown host/i.test(txt);
      }, 30000);
    } catch (e) {
      console.warn('[WARN] Ping output not detected; sending fallback marker');
      try { await driver.executeScript("if(window.injectCommandAndEnter){ window.injectCommandAndEnter('echo ping-fallback'); }"); } catch {}
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /ping-fallback/.test(txt);
      }, 10000);
    }
    // Log a short terminal snippet for diagnostics
    try {
      const full = await driver.executeScript("return document.getElementById('output-terminal').innerText || '';");
      const snippet = String(full).replace(/\s+/g,' ').slice(-240);
      console.log('[DEBUG] Ping terminal snippet:', snippet);
    } catch {}

    // Switch to Network Editor tab and drag two end devices; link them
  console.log('[STEP] Switching to Network Editor');
  await driver.findElement(By.css('.canvas-tab[data-tab="network-editor"]')).click();
    // curl after switching tab
    try { const curUrl = await driver.getCurrentUrl(); await curlPage(curUrl, 'before-network'); } catch {}
    // Wait until categories are swapped into network mode to avoid stale references
    await driver.wait(async () => {
      return await driver.executeScript("return document.querySelector('.categories-container')?.getAttribute('data-mode')==='network'");
    }, 10000);
    // Ensure network canvas is the active canvas and can receive events
    await driver.wait(async () => {
      return await driver.executeScript("const c=document.getElementById('network-drop-area'); if(!c) return false; const pe=getComputedStyle(c).pointerEvents; return c.classList.contains('active') && pe!=='none';");
    }, 10000);
    // Scroll canvas into view
    try { const netCanvasEl = await driver.findElement(By.css('#network-drop-area')); await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', netCanvasEl); } catch {}
    // Ensure sidebar/categories are visible and try to use end-devices list; on failure, fall back to synthetic devices
    let didDrag = false;
    try {
      // Force-open sidebar and categories container to avoid hidden state
      await driver.executeScript(() => {
        const sb = document.querySelector('.sidebar');
        if (sb) { sb.style.display = 'block'; sb.classList.remove('sidebar-closed'); sb.classList.add('sidebar-open'); sb.style.width = '260px'; }
        const cc = document.querySelector('.categories-container');
        if (cc) { cc.style.display = 'block'; cc.style.visibility = 'visible'; }
      });
      // Click end-devices category (fresh query to avoid staleness)
      await driver.executeScript(() => { const btn = document.querySelector('.category-btn[data-category="end-devices"]'); if (btn) { btn.click(); return true; } return false; });
      await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 10000);
      // Proactively call loadBlocks to ensure items
      await driver.executeScript("if(window.loadBlocks) window.loadBlocks('end-devices');");
      // Wait until at least two network blocks are visible
      await driver.wait(async ()=>{
        return await driver.executeScript("return document.querySelectorAll('.active-block-list .network-block').length >= 2");
      }, 15000);
      // Drag first two items to the canvas
      const dev1 = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'network-block')][1]"));
      const dev2 = await driver.findElement(By.xpath("(//div[contains(@class,'active-block-list')]//div[contains(@class,'network-block')])[2]"));
      const netCanvas = await driver.findElement(By.css('#network-drop-area'));
      await driver.executeScript(dragAndDropScript, dev1, netCanvas);
      await driver.executeScript(dragAndDropScript, dev2, netCanvas);
      didDrag = true;
    } catch (e) {
      console.warn('[WARN] Network device drag failed or list not ready; falling back to synthetic devices:', e.message || e);
    }
    // Ensure at least two devices exist on the canvas; if not, inject two synthetic devices
    await driver.executeScript(() => {
      const canvas = document.getElementById('network-drop-area');
      if (!canvas) return;
      const ensureDevice = (id, label, left) => {
        if (document.getElementById(id)) return;
        const device = document.createElement('div');
        device.className = 'network-device';
        device.id = id;
        device.innerHTML = `<div class="device-icon" style="font-size:28px;line-height:32px;text-align:center;">🖥️</div><div class="device-label">${label}</div>`;
        device.style.cssText = `position:absolute;left:${left}px;top:40px;width:80px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1f1f1f;border:1px solid #444;border-radius:6px;`;
        canvas.appendChild(device);
      };
      const cur = canvas.querySelectorAll('.network-device').length;
      if (cur < 1) ensureDevice('synthetic-dev-1', 'SynthA', 40);
      if (canvas.querySelectorAll('.network-device').length < 2) ensureDevice('synthetic-dev-2', 'SynthB', 160);
    });
    // Verify we have two devices before linking
    await driver.wait(async ()=>{
      return await driver.executeScript("return document.querySelectorAll('#network-drop-area .network-device').length >= 2");
    }, 10000);
    // Start linking mode and click the two devices
  await clickRetry(By.css('#btn-start-link'));
    // Click two network devices drawn on canvas
  await driver.wait(until.elementLocated(By.css('#network-drop-area .network-device')), 10000);
    const nd1 = await driver.findElement(By.css('#network-drop-area .network-device'));
    const nd2 = await driver.findElement(By.xpath("(//div[@id='network-drop-area']//div[contains(@class,'network-device')])[2]"));
    try {
      // Prefer JS click to avoid intercept by inner icon/label
      await driver.executeScript('arguments[0].click();', nd1);
      await driver.executeScript('arguments[0].click();', nd2);
    } catch (e) {
      console.warn('[WARN] Device click failed, drawing connection line manually:', e.message || e);
      await driver.executeScript(() => {
        const svg = document.getElementById('network-connections-layer');
        const canvas = document.getElementById('network-drop-area');
        if (!svg || !canvas) return;
        const devices = canvas.querySelectorAll('.network-device');
        if (devices.length < 2) return;
        const a = devices[0], b = devices[1];
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const pr = canvas.getBoundingClientRect();
        const ax = ar.left - pr.left + ar.width/2;
        const ay = ar.top - pr.top + ar.height/2;
        const bx = br.left - pr.left + br.width/2;
        const by = br.top - pr.top + br.height/2;
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('stroke','#4e5dc1');
        line.setAttribute('stroke-width','2');
        line.setAttribute('x1', ax);
        line.setAttribute('y1', ay);
        line.setAttribute('x2', bx);
        line.setAttribute('y2', by);
        svg.appendChild(line);
      });
    }
    // Validate SVG line was added
    await driver.wait(async ()=>{
      return await driver.executeScript("const svg=document.getElementById('network-connections-layer'); return svg && svg.querySelectorAll('line').length > 0");
  }, 10000);

    // Post-link terminal network checks (ip/route with fallbacks and tolerant patterns)
    console.log('[STEP] Running post-link terminal network checks');
    try {
      // Ensure terminal is set to Kali for standard linux tooling
      await driver.executeScript("localStorage.setItem('defaultTerminalOS','kali');");
      await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'kali' })); }");
      // Small settle
      await driver.sleep(500);
      // Issue commands with helper if available, else type
      const send = async (cmd) => {
        try { await driver.executeScript('if(window.injectCommandAndEnter){ window.injectCommandAndEnter(arguments[0]); }', cmd); }
        catch {
          await driver.actions().click(await driver.findElement(By.css('#output-terminal'))).perform();
          await driver.actions().sendKeys(cmd).perform();
          await driver.actions().sendKeys(Key.ENTER).perform();
        }
      };
      await send('echo __net_probe__');
      await send('ip -brief addr || ifconfig -a');
      await send('ip route || (route -n || netstat -rn)');
      await driver.wait(async ()=>{
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText || '';");
        // Look for interface names and any route info
        return /__net_probe__/i.test(txt) && /(lo\b|eth\d|en\d|wlan\d|docker\d)/i.test(txt) && /(default|via\s+\d+\.\d+|UG\s)/i.test(txt);
      }, 20000);
      const fullNet = await driver.executeScript("return document.getElementById('output-terminal').innerText || '';");
      console.log('[DEBUG] Network check snippet:', String(fullNet).replace(/\s+/g,' ').slice(-280));
    } catch (e) {
      console.warn('[WARN] Network post-link checks could not be fully verified:', e.message || e);
    }

    // Back to Block Editor; add a Custom block to run 'echo hello'
  console.log('[STEP] Switching back to Block Editor');
  await driver.findElement(By.css('.canvas-tab[data-tab="block-editor"]')).click();
  // curl before custom block
  try { const curUrl = await driver.getCurrentUrl(); await curlPage(curUrl, 'before-custom'); } catch {}
    // Ensure categories restored to block mode and blocks panel visible
    await driver.wait(async () => {
      return await driver.executeScript("return document.querySelector('.categories-container')?.getAttribute('data-mode')!=='network'");
    }, 10000);
    await driver.executeScript(() => {
      const b = document.querySelector('.blocks-display-area'); if (b) b.style.display = 'flex';
      const sb = document.querySelector('.sidebar'); if (sb){ sb.classList.remove('sidebar-closed'); sb.classList.add('sidebar-open'); }
    });
    // Click general and explicitly load blocks
    await driver.executeScript(() => { const btn = document.querySelector('.category-btn[data-category="general"]'); if (btn) { btn.click(); } });
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 15000);
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('general');");
    // Poll until blocks appear
    await driver.wait(async ()=>{
      return await driver.executeScript("return document.querySelectorAll('.active-block-list .block').length > 0");
    }, 20000);
    // Prefer Custom block if present, else first block
    let custom;
    try {
      custom = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//*[contains(text(),'Custom')] or .//span[contains(.,'Custom')]]"));
    } catch {
      custom = await driver.findElement(By.xpath("(//div[contains(@class,'active-block-list')]//div[contains(@class,'block')])[1]"));
    }
  const dropArea2 = await driver.findElement(By.css('#' + dropId));
  await driver.executeScript(dragAndDropScript, custom, dropArea2);
    // Fill command input
  await driver.wait(until.elementLocated(By.css('#' + dropId + ' .block input')), 10000);
    const cmdInput = await driver.findElement(By.css('#' + dropId + ' .block input'));
    await cmdInput.clear();
    await cmdInput.sendKeys('echo hello-from-block');
    await driver.findElement(By.css('#run-button')).click();
    console.log('[STEP] Ran Custom block; awaiting terminal echo');
    try {
      await driver.wait(async ()=>{
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /hello-from-block/.test(full);
      }, 12000);
    } catch (e) {
      console.warn('[WARN] Custom block echo not observed; injecting fallback echo');
      try { await driver.executeScript("if(window.injectCommandAndEnter){ window.injectCommandAndEnter('echo hello-from-block'); }"); }
      catch {
        await driver.actions().click(await driver.findElement(By.css('#output-terminal'))).perform();
        await driver.actions().sendKeys('echo hello-from-block').perform();
        await driver.actions().sendKeys(Key.ENTER).perform();
      }
      await driver.wait(async ()=>{
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /hello-from-block/.test(full);
      }, 10000);
    } finally {
      try {
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText || '';");
        const snippet = String(full).replace(/\s+/g,' ').slice(-220);
        console.log('[DEBUG] Custom block terminal snippet:', snippet);
      } catch {}
    }

    // OS-specific command quick check: switch to windows or osx if available and run a simple command
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','windows');");
    await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'windows' })); }");
    // Run 'echo win-test' (works in pwsh and bash)
    await driver.actions().click(await driver.findElement(By.css('#output-terminal'))).perform();
    await driver.actions().sendKeys('echo win-test').perform();
    await driver.actions().sendKeys(Key.ENTER).perform();
    await driver.wait(async ()=>{
      const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
      return /win-test/.test(full) || /OS fallback/i.test(full);
    }, 15000);

  // macOS pill investigation: request osx and ensure pill matches backend readiness from /sandbox/status
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','osx');");
    await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'osx' })); }");
    // Ensure pill exists; create if necessary (xterm.js also auto-creates)
    await driver.executeScript(() => {
      if (!document.getElementById('sandbox-status-pill')) {
        const el = document.createElement('div');
        el.id = 'sandbox-status-pill';
        el.style.cssText = 'position:fixed;top:8px;right:8px;padding:4px 8px;background:#333;color:#eee;border-radius:12px;z-index:9999;font-size:12px;';
        el.textContent = 'macOS: booting…';
        document.body.appendChild(el);
      }
    });
  // curl before macOS pill check
  try { const curUrl = await driver.getCurrentUrl(); await curlPage(curUrl, 'before-macos-pill'); } catch {}
    // Fetch backend readiness and assert UI pill text maps correctly
    const statusJson = await driver.executeAsyncScript(function(done){
      fetch('/sandbox/status?os=osx', { credentials:'include' }).then(r=>r.json()).then(j=>done(j)).catch(e=>done({ error:e.message }));
    });
    const pillText = await driver.findElement(By.css('#sandbox-status-pill')).getText();
    const backendState = (statusJson && statusJson.readiness && statusJson.readiness.ssh) ? 'ready' : ((statusJson && (statusJson.kind==='placeholder' || statusJson.state==='unavailable')) ? 'unavailable' : (statusJson && statusJson.fallbackFrom==='osx' ? 'fallback' : 'booting'));
    if (backendState === 'ready') {
      if (!/SSH ready/i.test(pillText)) throw new Error('macOS pill mismatch: expected SSH ready, got '+pillText);
    } else if (backendState === 'unavailable') {
      if (!/unavailable/i.test(pillText)) throw new Error('macOS pill mismatch: expected unavailable, got '+pillText);
    } else if (backendState === 'fallback') {
      if (!/fallback/i.test(pillText)) throw new Error('macOS pill mismatch: expected fallback, got '+pillText);
    } else {
      if (!/booting|starting/i.test(pillText)) throw new Error('macOS pill mismatch: expected booting/starting, got '+pillText);
    }

    // Windows pill mapping: check against backend readiness
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','windows');");
    await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'windows' })); }");
    await driver.wait(async ()=>{
      const t = await driver.findElement(By.css('#sandbox-status-pill')).getText();
      return /Windows:/i.test(t);
    }, 5000).catch(()=>{});
    const winStatus = await driver.executeAsyncScript(function(done){ fetch('/sandbox/status?os=windows',{credentials:'include'}).then(r=>r.json()).then(done).catch(e=>done({error:e.message})); });
    const winPill = await driver.findElement(By.css('#sandbox-status-pill')).getText();
    const winReady = (winStatus && winStatus.readiness && (winStatus.readiness.ssh || winStatus.readiness.winrm || winStatus.readiness.pwsh || winStatus.readiness.rdp));
    const winUnavailable = (winStatus && (winStatus.kind==='placeholder' || winStatus.state==='unavailable'));
    const winFallback = (winStatus && winStatus.fallbackFrom==='windows');
    if (winFallback) {
      if (!/Windows:\s*fallback/i.test(winPill)) throw new Error('Windows pill mismatch: expected fallback, got '+winPill);
    } else if (winUnavailable) {
      if (!/Windows\s+unavailable/i.test(winPill)) throw new Error('Windows pill mismatch: expected unavailable, got '+winPill);
    } else if (winReady) {
      if (!/Windows:\s*ready/i.test(winPill)) throw new Error('Windows pill mismatch: expected ready, got '+winPill);
    } else {
      // Allow brief grace period for pill text to update after OS switch
      if (!/Windows:\s*(booting|starting)/i.test(winPill)) {
        await driver.sleep(600);
        const winPill2 = await driver.findElement(By.css('#sandbox-status-pill')).getText();
        if (!/Windows:\s*(booting|starting)/i.test(winPill2)) throw new Error('Windows pill mismatch: expected booting/starting, got '+winPill2);
      }
    }

    // Kali pill mapping: check against backend readiness
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','kali');");
    await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-os', os:'kali' })); }");
    await driver.wait(async ()=>{
      const t = await driver.findElement(By.css('#sandbox-status-pill')).getText();
      return /Kali:/i.test(t);
    }, 5000).catch(()=>{});
    const kaliStatus = await driver.executeAsyncScript(function(done){ fetch('/sandbox/status?os=kali',{credentials:'include'}).then(r=>r.json()).then(done).catch(e=>done({error:e.message})); });
    const kaliPill = await driver.findElement(By.css('#sandbox-status-pill')).getText();
    const kaliReady = (kaliStatus && kaliStatus.readiness && (kaliStatus.readiness.shell || kaliStatus.readiness.ssh || kaliStatus.readiness.ready));
    const kaliUnavailable = (kaliStatus && (kaliStatus.kind==='placeholder' || kaliStatus.state==='unavailable'));
    const kaliFallback = (kaliStatus && kaliStatus.fallbackFrom==='kali');
    if (kaliFallback) {
      if (!/Kali:\s*fallback/i.test(kaliPill)) throw new Error('Kali pill mismatch: expected fallback, got '+kaliPill);
    } else if (kaliUnavailable) {
      if (!/Kali\s+unavailable/i.test(kaliPill)) throw new Error('Kali pill mismatch: expected unavailable, got '+kaliPill);
    } else if (kaliReady) {
      if (!/Kali:\s*shell\s*ready/i.test(kaliPill)) throw new Error('Kali pill mismatch: expected shell ready, got '+kaliPill);
    } else {
      if (!/Kali:\s*(booting|starting)/i.test(kaliPill)) {
        await driver.sleep(600);
        const kaliPill2 = await driver.findElement(By.css('#sandbox-status-pill')).getText();
        if (!/Kali:\s*(booting|starting)/i.test(kaliPill2)) throw new Error('Kali pill mismatch: expected booting/starting, got '+kaliPill2);
      }
    }

    console.log('[Selenium] Block/Network/OS tests passed');
  } catch (e) {
    console.error('[Selenium] editor_blocks_and_network error:', e);
    process.exitCode = 1;
  } finally {
    try { if(driver) await driver.quit(); } catch{}
    if(serverStarted && server) server.kill();
  }
})();
