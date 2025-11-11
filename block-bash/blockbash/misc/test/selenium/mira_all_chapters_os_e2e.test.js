// E2E: Progress through all Mira chapters while exercising xterm across OSes (Kali/Windows/macOS)
// Usage: node test/selenium/mira_all_chapters_os_e2e.test.js

const { By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
async function waitForServer(url, timeoutMs = 45000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, { redirect:'manual' }); if(r.status >=200 && r.status < 500) return; } catch(e){}
    await wait(300);
  }
  throw new Error('Server did not become ready: '+url);
}

(async () => {
  let serverProc; let started = false; let driver;
  try {
    // Ensure server on 3000
    let up=false; try { await waitForServer('http://localhost:3000/'); up=true; } catch {}
    if(!up){
      console.log('[MIRA-ALL] Starting server with `npm start`...');
      serverProc = cp.spawn(/^win/.test(process.platform)? 'npm.cmd' : 'npm', ['start'], {
        cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, PORT: '3000' }
      });
      started = true;
      await waitForServer('http://localhost:3000/');
      console.log('[MIRA-ALL] Server is up on http://localhost:3000');
    } else {
      console.log('[MIRA-ALL] Server already running on http://localhost:3000');
    }

    // Chrome driver
    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage','--window-size=1400,900');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    // Nav to /editor (port 3000 as requested)
    await driver.get('http://localhost:3000/editor');
    await driver.wait(until.elementLocated(By.css('#workshop-container')), 45000);
    await driver.wait(until.elementLocated(By.css('#output-terminal')), 45000);

    // Hook validation event capture and ensure activity = 'mira'
    await driver.executeScript(`
      window.__miraEvents = [];
      window.addEventListener('rpg-validated', e => { try { window.__miraEvents.push(e.detail); } catch{} });
      window.currentWorkshopActivity = 'mira';
      try { if (window.socket && window.socket.readyState===1) { window.socket.send(JSON.stringify({ type:'set-activity', activity:'mira' })); } } catch {}
    `);

    // Prepare helpers
    async function focusTerminal(){ const term = await driver.findElement(By.css('#output-terminal')); try { await driver.actions().click(term).perform(); } catch {} }
    async function termType(cmd){ await focusTerminal(); try { await driver.actions().sendKeys(cmd).perform(); await driver.actions().sendKeys(Key.ENTER).perform(); } catch {} }
    async function socketSend(cmd){
      try {
        await driver.executeScript("if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'command', command: arguments[0] })); }", cmd);
      } catch {}
    }
    async function setOs(os){
      const normalized = (os||'').toLowerCase();
      await driver.executeScript(`localStorage.setItem('defaultTerminalOS', arguments[0]);`, normalized);
      await driver.executeScript(`try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({type:'set-os', os: arguments[0]})); } } catch {}` , normalized);
      // Give time for sandbox notices / fallback
      await wait(1500);
    }
    async function waitTerminalReady(timeoutMs=45000){
      const start = Date.now();
      while(Date.now()-start < timeoutMs){
        const text = await driver.executeScript("return (document.getElementById('output-terminal')||{}).innerText||'';");
        if (/\$\s*$|Ready|shell started|NOTICE|rpg-validated/i.test(text)) return true;
        await wait(400);
      }
      return false;
    }

    // Inject Mira workshop UI into the editor's workshop-container via /ws/workshop
    await driver.executeScript(`return (async ()=>{
      try {
        const res = await fetch('/ws/workshop?lesson_id=mira');
        if(!res.ok) return 'fail:workshop';
        const data = await res.json();
        const container = document.getElementById('workshop-container');
        if(!container) return 'fail:container';
        container.innerHTML = '';
        const temp = document.createElement('div');
        temp.innerHTML = data.indexHtml || '';
        // Strip top-level script/style to avoid duplicates; logic/style added manually
        temp.querySelectorAll('script,style').forEach(n=>n.remove());
        container.innerHTML = temp.innerHTML || '<div>Loaded Mira.</div>';
        if (data.hasStyle) {
          const style = document.createElement('link'); style.rel='stylesheet'; style.href='/ws/workshop_asset?lesson_id=mira&file=style.css'; style.setAttribute('data-mira-style','1'); document.head.appendChild(style);
        }
        if (data.hasLogic) {
          const s = document.createElement('script'); s.src='/ws/workshop_asset?lesson_id=mira&file=logic.js'; s.setAttribute('data-mira-logic','1'); document.body.appendChild(s);
        }
        return 'ok';
      } catch(e){ return 'fail:'+ (e && e.message || 'err'); }
    })();`);

    // Quick UI sanity: click Begin if present (starts demo inside editor), but not required for chapter iteration
    try { await driver.wait(until.elementLocated(By.id('begin-btn')), 15000); const btn = await driver.findElement(By.id('begin-btn')); await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', btn); await wait(100); await btn.click(); } catch {}

  // OS matrix to exercise terminal differences and chapter iteration
    const OS_LIST = ['kali','windows','osx'];
    const results = [];

    // Fetch Mira manifest (steps) from backend (tlds)
    const fetchFn = global.fetch || (await import('node-fetch')).default;
  const manifestRes = await fetchFn('http://localhost:3000/ws/workshop_asset?lesson_id=mira&file=manifest.json');
  if(!manifestRes.ok) throw new Error('Failed to fetch Mira manifest.json');
  const manifest = await manifestRes.json();
  const steps = Array.isArray(manifest?.steps) ? manifest.steps : [];

  // Helper: load step file content (JSON/HTML) to derive validation intent
    async function fetchStepFile(file){
      const url = 'http://localhost:3000/ws/workshop_asset?lesson_id=mira&file=' + encodeURIComponent(file);
      const r = await fetchFn(url);
      return { ok: r.ok, text: r.ok ? await r.text() : '', url };
    }

    // Map for steps 1-5 where validate.js checks specific commands/flags
    const stepCmdOverrides = {
      1: 'airodump-ng',
      2: 'iw dev wlan0 set type managed',
      3: 'aircrack-ng',
      4: 'airodump-ng --manufacturer',
      5: 'macchanger --help'
    };
    // Helper: best-effort correct flag for early steps
    function flagForStep(n){
      switch(n){
        case 1: return 'SSID_FLAG{coffeeshop_spoofed}';
        case 2: return 'DEAUTH_FLAG{deauth_blocked}';
        case 3: return 'HANDSHAKE_FLAG{psk_verified}';
        case 4: return 'BEACON_FLAG{abnormal_beacon}';
        case 5: return 'MAC_FLAG{whitelist_restored}';
        default: return null;
      }
    }

    for (const os of OS_LIST){
      console.log(`[MIRA-ALL] Switching OS to ${os}...`);
      // Reload editor with explicit OS param so socket connects with desired OS
      await driver.get(`http://localhost:3000/editor?os=${os}`);
      await driver.wait(until.elementLocated(By.css('#workshop-container')), 45000);
      await driver.wait(until.elementLocated(By.css('#output-terminal')), 45000);
      // Re-hook events and activity
      await driver.executeScript(`
        window.__miraEvents = [];
        window.addEventListener('rpg-validated', e => { try { window.__miraEvents.push(e.detail); } catch{} });
        window.currentWorkshopActivity = 'mira';
        try { if (window.socket && window.socket.readyState===1) { window.socket.send(JSON.stringify({ type:'set-activity', activity:'mira' })); } } catch {}
      `);
      await waitTerminalReady();

      // Run a quick OS-appropriate sanity command
      if (os === 'windows') {
        await termType('dir');
      } else {
        await termType('ls -la');
      }
      await wait(500);

  // Ensure Mira UI present after reload
      await driver.executeScript(`return (async ()=>{
        try {
          const res = await fetch('/ws/workshop?lesson_id=mira');
          if(!res.ok) return 'fail:workshop';
          const data = await res.json();
          const container = document.getElementById('workshop-container');
          if(!container) return 'fail:container';
          container.innerHTML = '';
          const temp = document.createElement('div');
          temp.innerHTML = data.indexHtml || '';
          temp.querySelectorAll('script,style').forEach(n=>n.remove());
          container.innerHTML = temp.innerHTML || '<div>Loaded Mira.</div>';
          if (data.hasStyle) { const style = document.createElement('link'); style.rel='stylesheet'; style.href='/ws/workshop_asset?lesson_id=mira&file=style.css'; style.setAttribute('data-mira-style','1'); document.head.appendChild(style); }
          if (data.hasLogic) { const s = document.createElement('script'); s.src='/ws/workshop_asset?lesson_id=mira&file=logic.js'; s.setAttribute('data-mira-logic','1'); document.body.appendChild(s); }
          return 'ok';
        } catch(e){ return 'fail:'+ (e && e.message || 'err'); }
      })();`);

      let progressed = 0; let attempted = 0; let recognized = 0; let httpValidated = 0; const stepLogs = [];
      for (let i=0;i<steps.length;i++){
        const file = steps[i];
        attempted++;
        const { ok, text, url } = await fetchStepFile(file);
        if (!ok) { stepLogs.push({ step:i, file, ok:false, reason:'asset_not_found' }); continue; }
        // Derive chapter and step from path and click UI to load it
        const chapMatch = file.match(/chapters\/(chapter[^/]+)\/step(\d+)\.json$/i);
        let chapterName = chapMatch ? chapMatch[1] : null;
        let stepNumber = chapMatch ? parseInt(chapMatch[2], 10) : null;
        if (chapterName && stepNumber) {
          // Open dropdown, click the target chapter button if present
          try {
            const label = await driver.findElement(By.id('dropdown-label'));
            await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', label);
            await label.click();
            await wait(100);
            const btns = await driver.findElements(By.css(`#chapter-list .chapter-btn`));
            for (const btn of btns) {
              const txt = (await btn.getText()).toLowerCase();
              if (txt.includes(chapterName.toLowerCase()) && txt.includes(`step ${stepNumber}`)) { await btn.click(); break; }
            }
          } catch {}
          // Send set-chapter over socket so backend uses chapter-scoped validator
          await driver.executeScript("try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-chapter', chapter: arguments[0] })); } } catch {}", chapterName);
          await driver.executeScript("try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-step', step: arguments[0] })); } } catch {}", stepNumber);
          await wait(120);
        }
        // Derive a command to run in terminal for this step (JSON-defined validation or override for early steps)
        let cmdToRun = '';
        if (!stepNumber) { const mnum = file.match(/step(\d+)\.json$/i); if (mnum) stepNumber = parseInt(mnum[1],10); }
        if (/\.json$/i.test(file)){
          try { const j = JSON.parse(text); if (j && j.validation && j.validation.command) cmdToRun = String(j.validation.command); if (!cmdToRun && j.stepNumber) stepNumber = j.stepNumber; } catch {}
          if (!cmdToRun && stepNumber && stepCmdOverrides[stepNumber]) cmdToRun = stepCmdOverrides[stepNumber];
        } else if (/\.html$/i.test(file)){
          // No explicit validation in HTML; fall back to early-step overrides if detectable by filename
          const m = file.match(/step(\d+)\.html$/i); const sn = m ? parseInt(m[1],10) : NaN;
          if (!Number.isNaN(sn)) stepNumber = sn;
          if (!Number.isNaN(sn) && stepCmdOverrides[sn]) cmdToRun = stepCmdOverrides[sn];
        }
        if (!cmdToRun) {
          // Fallback: harmless echo mentioning step index
          cmdToRun = `echo mira-step-${stepNumber || (i+1)}`;
        }

        // Send step context, then command via terminal to ensure xterm is exercised per step and wait for validation event
  const beforeCount = await driver.executeScript('return (window.__miraEvents||[]).length||0;');
        if (stepNumber) {
          await driver.executeScript("try { if(window.socket && window.socket.readyState===1){ window.socket.send(JSON.stringify({ type:'set-step', step: arguments[0] })); } } catch {}", stepNumber);
          await wait(50);
        }
  await termType(cmdToRun);
        // wait up to 2s for a validation event
        const startTs = Date.now();
        let gotValidation = false; let detail = null;
        while(Date.now()-startTs < 2200){
          const cnt = await driver.executeScript('return (window.__miraEvents||[]).length||0;');
          if (cnt > beforeCount) {
            gotValidation = true;
            detail = await driver.executeScript('return (window.__miraEvents||[]).slice(-1)[0] || null;');
            break;
          }
          await wait(120);
        }
        if (gotValidation) recognized++;
        // Also call HTTP validator to ensure step command is acceptable regardless of socket activity
        let httpPass = false; let httpResp = null;
    try {
          const r = await fetchFn('http://localhost:3000/ws/validate', {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ lesson_id:'mira', command: cmdToRun, chapter: chapterName || null, step: stepNumber || null })
          });
          if (r.ok) { httpResp = await r.json(); if (httpResp && httpResp.pass) { httpPass = true; httpValidated++; } }
        } catch {}
        // If the validator requires a flag for steps 1-5, simulate flag submission via both terminal and HTTP
        if (!httpPass && stepNumber && stepNumber <= 5 && httpResp && httpResp.flagRequired) {
          const f = flagForStep(stepNumber);
          if (f) {
            // Try terminal submit-flag
            await termType(`submit-flag ${f}`);
            // And HTTP with explicit flag
            try {
              const r2 = await fetchFn('http://localhost:3000/ws/validate', {
                method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ lesson_id:'mira', command: cmdToRun, flag: f, chapter: chapterName || null, step: stepNumber || null })
              });
              if (r2.ok) { const j2 = await r2.json(); if (j2 && j2.pass) { httpPass = true; httpValidated++; httpResp = j2; } }
            } catch {}
          }
        }
        progressed++;
        stepLogs.push({ step:i+1, file, ok:true, url, cmd:cmdToRun, validated: gotValidation, detail, http: httpResp });
      }

      results.push({ os, attempted, progressed, recognized, httpValidated, stepLogs });
    }

    // Persist a minimal report and screenshot for traceability
    try {
      const outDir = path.resolve(process.cwd(), 'test-results', 'screenshots');
      fs.mkdirSync(outDir, { recursive: true });
      const png = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_all_chapters_os_e2e.png'), Buffer.from(png, 'base64'));
      fs.writeFileSync(path.join(outDir, 'mira_all_chapters_os_e2e.report.json'), JSON.stringify({
        summary: 'Mira all chapters xterm exercise across OSes',
        timestamp: new Date().toISOString(),
        results
      }, null, 2));
      console.log('[MIRA-ALL] Wrote artifacts in test-results/screenshots/');
    } catch {}

  // Basic assertions
    for (const r of results){
      if (r.attempted === 0 || r.progressed === 0) throw new Error(`No steps exercised for OS ${r.os}`);
    }
  // Stronger assertion for Kali: first 5 steps should validate via HTTP validator
    const kali = results.find(r => r.os === 'kali');
    if (!kali) throw new Error('Kali OS results missing');
  const firstFive = kali.stepLogs.slice(0,5);
  const fivePass = firstFive.filter(s => s.http && s.http.pass).length;
    if (fivePass < 3) throw new Error(`Expected at least 3 of first 5 steps to validate on Kali, got ${fivePass}`);
  // Add similar early-step assertions for Windows and macOS
  const win = results.find(r => r.os === 'windows');
  if (!win) throw new Error('Windows OS results missing');
  const winFirst = win.stepLogs.slice(0,5);
  const winPass = winFirst.filter(s => s.http && s.http.pass).length;
  if (winPass < 3) throw new Error(`Expected at least 3 of first 5 steps to validate on Windows, got ${winPass}`);

  const osx = results.find(r => r.os === 'osx');
  if (!osx) throw new Error('macOS (osx) results missing');
  const osxFirst = osx.stepLogs.slice(0,5);
  const osxPass = osxFirst.filter(s => s.http && s.http.pass).length;
  if (osxPass < 3) throw new Error(`Expected at least 3 of first 5 steps to validate on macOS, got ${osxPass}`);
    console.log('[MIRA-ALL] Completed exercising all manifest steps across OSes via xterm');
  } catch (e) {
    console.error('[MIRA-ALL] Error:', e);
    process.exitCode = 1;
  } finally {
    try { if(driver) await driver.quit(); } catch {}
    try { if(started && serverProc) serverProc.kill(); } catch {}
  }
})();
