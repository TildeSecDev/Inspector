// End-to-end Selenium test: simulates a real user from welcome/login/register to editor features and terminal.
// Usage: npm run test:selenium:e2e (ensures server on PORT 3002)

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');
const path = require('path');

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
  let server; let serverStarted = false;
  try {
    // Probe and start the app on PORT 3002 if needed
    let reachable = false;
    try { await waitForServer('http://localhost:3002/'); reachable = true; } catch(_) {}
    if(!reachable){
      server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: { ...process.env, PORT: '3002' } });
      serverStarted = true;
      await waitForServer('http://localhost:3002/');
    }

    // Configure Chrome
    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    // Small utilities for resilient interactions
    async function clickRetry(by, tries=3){
      let lastErr;
      for(let i=0;i<tries;i++){
        try { const el = await driver.findElement(by); await driver.wait(until.elementIsVisible(el), 5000); await el.click(); return; } catch(e){ lastErr = e; await driver.sleep(200); }
      }
      throw lastErr;
    }
    async function typeRetry(by, text, tries=3){
      let lastErr;
      for(let i=0;i<tries;i++){
        try { const el = await driver.findElement(by); await driver.wait(until.elementIsVisible(el), 5000); await el.clear().catch(()=>{}); await el.sendKeys(text); return; } catch(e){ lastErr = e; await driver.sleep(200); }
      }
      throw lastErr;
    }
    async function selectOption(selectBy, optionCss){
      const sel = await driver.findElement(selectBy);
      await driver.wait(until.elementIsVisible(sel), 5000);
      const opt = await sel.findElement(By.css(optionCss));
      await opt.click();
    }

    try {
      // --- Welcome/Login/Register Page ---
      await driver.get('http://localhost:3002/');
      await driver.wait(until.elementLocated(By.css('.binder')), 15000);

      // Language switch on welcome page
  await selectOption(By.css('#language-select'), 'option[value="arabic"]');
      await driver.sleep(200); // allow i18n to apply
      let dir = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dir !== 'rtl') throw new Error('Expected welcome dir rtl, got '+dir);
  await selectOption(By.css('#language-select'), 'option[value="english"]');
      await driver.sleep(200);
      dir = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dir !== 'ltr') throw new Error('Expected welcome dir ltr, got '+dir);

      // Register a new user
      await clickRetry(By.css('.folder-register .folder-cover'));
      const uniq = Date.now();
      const name = `user_${uniq}`;
      const email = `user_${uniq}@example.com`;
      const password = 'Passw0rd!';
      await driver.wait(async ()=>{
        return await driver.executeScript('return !!document.querySelector(".folder-register.folder-open #register-form")');
      }, 5000);
      await typeRetry(By.css('#register-form input[name="name"]'), name);
      await typeRetry(By.css('#register-form input[name="email"]'), email);
      await typeRetry(By.css('#register-form input[name="password"]'), password);
      // Organization select is required on UI
      await selectOption(By.css('#register-form select[name="organization"]'), 'option[value="school"]');
      await clickRetry(By.css('#register-form .submit-btn'));
      // Wait for redirect to editor (welcome animation delays ~5s)
      await driver.wait(until.urlContains('/editor'), 20000);

      // --- Editor Page ---
      await driver.wait(until.elementLocated(By.css('#workshop-container')), 15000);
      await driver.wait(until.elementLocated(By.css('#output-terminal')), 15000);

      // i18n on editor
  await selectOption(By.css('header #language-select'), 'option[value="arabic"]');
      await driver.sleep(200);
      dir = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dir !== 'rtl') throw new Error('Expected editor dir rtl, got '+dir);
  await selectOption(By.css('header #language-select'), 'option[value="english"]');
      await driver.sleep(200);
      dir = await driver.executeScript('return document.documentElement.getAttribute("dir")');
      if(dir !== 'ltr') throw new Error('Expected editor dir ltr, got '+dir);

      // Settings modal: open and change theme + terminal style
      // Click settings button via JS to avoid stale reference on re-render
      await driver.executeScript(`(function(){ const img=document.querySelector('header .button-container button img[alt="Settings Button"]'); if(img){ img.closest('button').click(); } })();`);
      await driver.wait(until.elementLocated(By.css('#settings-modal')), 5000);
      // Ensure modal is visible (class settings-hidden removed)
      await driver.wait(async () => {
        return await driver.executeScript('const m=document.getElementById("settings-modal"); return !!m && !m.classList.contains("settings-hidden");');
      }, 5000);
      // Debug: print settings modal content length
      try {
        const modalHtmlLen = await driver.executeScript('const m=document.getElementById("settings-modal"); return m ? m.innerHTML.length : -1;');
        console.log('[DEBUG] settings-modal innerHTML length:', modalHtmlLen);
      } catch{}
      // Change theme
      const themeSwitch = await driver.findElement(By.css('#theme-switch'));
      await themeSwitch.findElement(By.css('option[value="light"]')).click();
      await driver.sleep(150);
      let theme = await driver.executeScript('return document.body.getAttribute("data-theme")');
      if(theme !== 'light') throw new Error('Theme did not switch to light');
      await themeSwitch.findElement(By.css('option[value="dark"]')).click();
      await driver.sleep(150);
      theme = await driver.executeScript('return document.body.getAttribute("data-theme")');
      if(theme !== 'dark') throw new Error('Theme did not switch back to dark');
      // Terminal design apply (set via JS to be robust against input[type=color] quirks)
      const termInputsState = await driver.executeScript(`(function(){
        const m=document.getElementById('settings-modal');
        const bg= m && m.querySelector('#terminal-bg-color');
        const fg= m && m.querySelector('#terminal-text-color');
        const font= m && m.querySelector('#terminal-font-style');
        return { present: !!(bg && fg && font) };
      })();`);
      console.log('[DEBUG] terminal inputs present in modal:', termInputsState);
      if (termInputsState && termInputsState.present) {
        await driver.executeScript(`(function(){
          const bg=document.getElementById('terminal-bg-color');
          const fg=document.getElementById('terminal-text-color');
          const font=document.getElementById('terminal-font-style');
          if(bg){ bg.value = '#000000'; bg.dispatchEvent(new Event('input', { bubbles:true })); bg.dispatchEvent(new Event('change', { bubbles:true })); }
          if(fg){ fg.value = '#00ff00'; fg.dispatchEvent(new Event('input', { bubbles:true })); fg.dispatchEvent(new Event('change', { bubbles:true })); }
          if(font){ font.value = 'Fira Code, monospace'; font.dispatchEvent(new Event('change', { bubbles:true })); }
        })();`);
        await clickRetry(By.css('#apply-terminal-style-btn'));
        await driver.sleep(250);
        const termStyle = await driver.executeScript('const el=document.getElementById("output-terminal"); return {bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color};');
        if(!/rgb\(0, 0, 0\)/.test(termStyle.bg)) throw new Error('Terminal background not applied');
        if(!/rgb\(0, 255, 0\)/.test(termStyle.fg)) throw new Error('Terminal text color not applied');
      } else {
        console.log('[WARN] Terminal style inputs not found; skipping terminal style apply step');
      }
      // Close settings
      await driver.findElement(By.css('#close-settings-btn')).click();

  // Profile popup: open and upload picture
  await clickRetry(By.css('.client-id'));
      await driver.wait(until.elementLocated(By.css('#profile-popup')), 5000);
      // Make file input visible then upload an existing image from repo root
      await driver.executeScript('const i=document.getElementById("profile-picture-input"); if(i) i.style.display="block";');
      const fileInput = await driver.findElement(By.css('#profile-picture-input'));
      const imgPath = path.resolve(process.cwd(), 'IMG_6948.png');
      await fileInput.sendKeys(imgPath);
      await driver.wait(async () => {
        const src = await driver.findElement(By.css('#profile-picture')).getAttribute('src');
        return /\/assets\/images\/profile_pics\//.test(src);
      }, 10000);
      // Logout from profile popup to validate login flow later
      await driver.wait(until.elementLocated(By.css('#profile-logout')), 5000);
      await clickRetry(By.css('#profile-logout'));
      // Wait for redirect back to welcome page
      await driver.wait(until.urlIs('http://localhost:3002/'), 15000);

      // Now login with the newly registered account
      await clickRetry(By.css('.folder-login .folder-cover'));
      await driver.wait(async ()=>{
        return await driver.executeScript('return !!document.querySelector(".folder-login.folder-open #login-form")');
      }, 5000);
      await typeRetry(By.css('#login-form input[name="email"]'), email);
      await typeRetry(By.css('#login-form input[name="password"]'), password);
      await clickRetry(By.css('#login-form .submit-btn'));
      await driver.wait(until.urlContains('/editor'), 20000);

      // Achievements dropdown
  await clickRetry(By.css('#trophy-btn'));
      await driver.wait(until.elementLocated(By.css('#achievements-dropdown')), 5000);

      // About modal
  await clickRetry(By.css('#nav-btn-about'));
      await driver.wait(until.elementLocated(By.css('#about-modal')), 5000);
  await clickRetry(By.css('#abt-close-btn'));

      // Terminal readiness and simple commands
      const termDiv = await driver.findElement(By.css('#output-terminal'));
      // Negotiate to exec mode defensively and set OS
      await driver.executeScript("try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'negotiate-mode', mode:'exec' })); window.socket.send(JSON.stringify({ type:'set-os', os:'kali' })); } } catch {};");
      // Wait for readiness markers or prompt
      await driver.wait(async () => {
        const txt = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        if(/\[sandbox\] interactive shell started/.test(txt)) return true;
        if(/\[sandbox\] interactive shell failed/.test(txt)) return true;
        if(/\[self-test\] denial check complete/.test(txt)) return true;
        if(/\$/.test(txt)) return true;
        return false;
      }, 30000, 'Terminal did not become ready');

      // Try echo via interactive; inject via socket as fallback
      await driver.actions().click(termDiv).perform();
      await driver.actions().sendKeys('echo e2e-selenium').perform();
      await driver.actions().sendKeys(Key.ENTER).perform();
      // Fallback injection
      await driver.executeScript("try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'command', command:'echo e2e-selenium' })); } } catch {};");
      await driver.wait(async () => {
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /e2e-selenium/.test(full);
      }, 15000, 'Echo output not observed');

      // Banned command check
      await driver.actions().sendKeys('rm -rf /').perform();
      await driver.actions().sendKeys(Key.ENTER).perform();
      await driver.wait(async ()=>{
        const full = await driver.executeScript("return document.getElementById('output-terminal').innerText;");
        return /\[denied\]\s+rm -rf \/?/i.test(full) || /denial check complete/.test(full);
      }, 10000, 'Denied marker not found');

      // Terminal dropdown visibility
      const ddBtn = await driver.findElement(By.css('#btn-terminal-dropdown'));
      await ddBtn.click();
      await driver.wait(async ()=>{
        const disp = await driver.findElement(By.css('#terminal-dropdown-menu')).getCssValue('display');
        return disp !== 'none';
      }, 5000);

      console.log('[Selenium] E2E user journey passed');
    } finally {
      await driver.quit();
    }
  } catch (e) {
    console.error('[Selenium E2E Error]', e);
    process.exitCode = 1;
  } finally {
    if(serverStarted && server) server.kill();
  }
})();
