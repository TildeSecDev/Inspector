// Minimal Selenium smoke test: verify Run button builds command without 'undefined' prefix or trailing '&&'
// Usage: node test/selenium/run_button_smoke.test.js

const { Builder, By, until } = require('selenium-webdriver');
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
    let up=false; try { await waitForServer('http://localhost:3002/'); up=true; } catch{}
    if(!up){ server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: { ...process.env, PORT: '3002' } }); serverStarted = true; await waitForServer('http://localhost:3002/'); }

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);
    // Helper: wait for loader overlay to hide to avoid element not interactable
    async function waitForLoaderHidden(timeout=15000){
      try {
        await driver.wait(async ()=>{
          return await driver.executeScript("var el=document.querySelector('.loading-screen'); if(!el) return true; return el.classList.contains('hide-loading')||window.getComputedStyle(el).display==='none';");
        }, timeout);
      } catch(_) {}
    }
    // Robust click utility
    async function clickRetry(selector, tries=3){
      let lastErr; for(let i=0;i<tries;i++){
        try {
          const el = await driver.findElement(By.css(selector));
          await driver.wait(until.elementIsVisible(el), 10000);
          await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
          try { await el.click(); return; } catch(e) { lastErr=e; await driver.executeScript('arguments[0].click();', el); return; }
        } catch(e){ lastErr = e; await driver.sleep(250); }
      }
      throw lastErr;
    }

    // Lightweight auth shortcut: set guest cookie and try editor directly
    const uniq = Date.now();
    const email = `smoke_${uniq}@example.com`;
    const password = 'Passw0rd!';
    await driver.get('http://localhost:3002/');
    await waitForLoaderHidden();
    await driver.executeScript("document.cookie='username=guest_'+Date.now()+'; path=/';");
    await driver.get('http://localhost:3002/editor');
    await driver.sleep(500);
    let atEditor = false;
    try { atEditor = (await driver.getCurrentUrl()).includes('/editor'); } catch {}
    if(!atEditor){
      // Fallback: perform registration via JS (no brittle clicks)
      await driver.get('http://localhost:3002/');
      await waitForLoaderHidden();
      // Reveal register form if hidden
      await driver.executeScript(function(){
        const cover=document.querySelector('.folder-register .folder-cover');
        if(cover){ try { cover.click(); } catch { const ev=new MouseEvent('click',{bubbles:true}); cover.dispatchEvent(ev); } }
      });
      await driver.wait(until.elementLocated(By.css('#register-form')), 10000);
      await driver.executeScript(function(name,email,pw){
        const f=document.getElementById('register-form'); if(!f) return;
        f.querySelector('input[name="name"]').value=name;
        f.querySelector('input[name="email"]').value=email;
        f.querySelector('input[name="password"]').value=pw;
        const sel=f.querySelector('select[name="organization"]'); if(sel){ sel.value='school'; sel.dispatchEvent(new Event('change',{bubbles:true})); }
      }, 'Run Button Smoke', email, password);
      await driver.executeScript("const btn=document.querySelector('#register-form .submit-btn'); if(btn){ btn.click(); }");
      try { await driver.wait(async ()=> (await driver.getCurrentUrl()).includes('/editor'), 8000); } catch { await driver.get('http://localhost:3002/editor'); }
    }

    // Ensure terminal ready
    await driver.wait(until.elementLocated(By.css('#output-terminal')), 30000);
    await driver.executeScript("localStorage.setItem('defaultTerminalOS','kali'); if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({type:'set-os', os:'kali'})); }");
    try {
      await driver.wait(async ()=>/(\$\s*$|Ready|shell started)/i.test(await driver.executeScript("return document.getElementById('output-terminal').innerText||'';")), 30000);
    } catch {}

    // Switch to Block Editor and load General
  await driver.executeScript("const el=document.querySelector('.canvas-tab[data-tab=\\'block-editor\\']'); if(el) el.click();");
    await driver.executeScript("if(window.loadBlocks) window.loadBlocks('general');");
    await driver.wait(until.elementLocated(By.css('.blocks-display-area .active-block-list')), 15000);
    const dropId = await driver.executeScript("const d=document.getElementById('drop-area')||document.querySelector('[id^=\\'drop-area-\\']'); return d?d.id:'drop-area';");
  const dropArea = await driver.findElement(By.css('#'+dropId));
  await driver.executeScript(function(id){ var el=document.getElementById(id); if(el) el.scrollIntoView({block:'center'}); }, dropId);
    const customBlock = await driver.findElement(By.xpath("//div[contains(@class,'active-block-list')]//div[contains(@class,'block')][.//*[contains(text(),'Custom')]]"));
    await driver.executeScript(dragAndDropScript, customBlock, dropArea);
    await driver.executeScript(function(id){ const blk=document.querySelector('#'+id+' .block'); if(blk){ blk.querySelectorAll('.block-details, .command-details').forEach(el=> el && (el.style.display='block')); } }, dropId);
    await driver.wait(until.elementLocated(By.css('#'+dropId+' .block input')), 15000);

  // Type a simple command and run
    const cmd = 'echo __RUNBTN_OK__';
    const input = await driver.findElement(By.css('#'+dropId+' .block input'));
    await input.clear().catch(()=>{});
    await input.sendKeys(cmd);
    // Click the Run button if interactable; otherwise dispatch a click event to invoke handler
  // Enhanced click sequence with diagnostics
  await driver.executeScript(function(){
    const b = document.getElementById('run-button');
    if(!b) { console.warn('[run-button-smoke] #run-button not found'); return; }
    // Gather diagnostic info
    const rect = b.getBoundingClientRect();
    console.log('[run-button-smoke] rect', rect);
    // If element has zero area, force style tweak
    if((rect.width === 0 || rect.height === 0) && b.style){
      b.style.minWidth = '40px'; b.style.minHeight='40px'; b.style.display='flex';
    }
    // Ensure it's not covered by loading-screen
    const loader = document.querySelector('.loading-screen');
    if(loader){ loader.style.display='none'; loader.classList.add('hide-loading'); }
    b.scrollIntoView({block:'center', inline:'center'});
    // If CSS pointer-events disabled somewhere, bubble fix
    let el = b; let protectedCount=0; while(el && el !== document.body && protectedCount<10){
      const pe = window.getComputedStyle(el).pointerEvents; if(pe === 'none'){ el.style.pointerEvents='auto'; }
      el = el.parentElement; protectedCount++;
    }
    // Try focus before click
    try { b.focus({preventScroll:true}); } catch{}
    try {
      const ev=new MouseEvent('click',{bubbles:true,cancelable:true});
      if(!b.dispatchEvent(ev)) {
        console.warn('[run-button-smoke] click event default prevented, invoking handler manually');
        if(typeof b.onclick==='function') b.onclick();
      }
    } catch(e){
      console.warn('[run-button-smoke] dispatch failed, trying direct handler', e);
      try { if(typeof b.onclick==='function') b.onclick(); } catch(_){ }
    }
  });
  // Fallback: if still no command echoed after short wait, forcibly call handler again
  await driver.sleep(600);
  await driver.executeScript(function(){
    const termText = document.getElementById('output-terminal')?.innerText || '';
    if(!/__RUNBTN_OK__/.test(termText)){
      const b=document.getElementById('run-button');
      if(b && typeof b.onclick==='function'){ console.log('[run-button-smoke] fallback direct onclick invocation'); b.onclick(); }
    }
  });
  

  // Wait a moment for the typed command to appear
  await driver.sleep(1500);
  const text = await driver.executeScript("return document.getElementById('output-terminal').innerText||'';");
    const lines = String(text).split(/\n/).filter(Boolean);
  const lastCmdLine = lines.reverse().find(l => /\$\s+/.test(l) && !/^\$\s+\[sandbox\]/.test(l)) || '';
    if (/undefined\s+/.test(lastCmdLine)) throw new Error('Found undefined prefix in command line: '+lastCmdLine);
    if (/&&\s*$/.test(lastCmdLine)) throw new Error('Found trailing && in command line: '+lastCmdLine);
  if (!/\$\s+echo\s+__RUNBTN_OK__/.test(lastCmdLine)) throw new Error('Unexpected command line content: '+lastCmdLine);

    console.log('[Smoke] Run button produced clean command and output');
  } catch (e) {
    console.error('[Smoke] run_button_smoke error:', e);
    process.exitCode = 1;
  } finally {
    try { if(driver) await driver.quit(); } catch{}
    if(serverStarted && server) server.kill();
  }
})();
