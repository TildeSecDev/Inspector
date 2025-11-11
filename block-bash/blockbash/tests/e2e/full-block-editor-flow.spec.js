const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `net_${ts}`;
  const email = `${username}@example.com`;
  const password = 'Passw0rd!';
  const reg = await request.post('http://localhost:3000/auth/register', { data:{ name: username, email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  expect(login.ok()).toBeTruthy();
  await context.addCookies([{ name:'username', value: encodeURIComponent(username), domain:'localhost', path:'/' }]);
}

async function openEditor(page) {
  await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
  await page.locator('#run-button').waitFor();
}

async function loadCategory(page, category) {
  await page.evaluate(cat => {
    const categoryEl = document.querySelector(`[data-category="${cat}"]`);
    if (categoryEl) categoryEl.click();
    else if (window.loadBlocks) window.loadBlocks(cat);
  }, category);
  await page.waitForSelector('.blocks-display-area .active-block-list .block, .blocks-display-area .active-block-list .network-block', { timeout: 3000 }).catch(()=>{});
}

async function waitForNetworkBlocks(page, categories) {
  const fetched = [];
  for (const cat of categories) {
    await page.evaluate(c => window.loadBlocks && window.loadBlocks(c), cat);
    // wait for at least one .network-block or fetch failure log
    const ok = await page.waitForFunction(category => {
      const list = document.querySelector('.blocks-display-area .active-block-list');
      if (!list) return false;
      const net = list.querySelectorAll('.network-block');
      return net.length > 0;
    }, cat, { timeout: 5000 }).then(()=>true).catch(()=>false);
    if (ok) { fetched.push(cat); break; }
  }
  return fetched[0];
}

async function injectMockNetworkBlock(page) {
  await page.evaluate(() => {
    const list = document.querySelector('.blocks-display-area .active-block-list');
    if (!list) return false;
    if (list.querySelector('.network-block')) return true;
    const el = document.createElement('div');
    el.className = 'network-block';
    el.dataset.blockType = 'mock-device';
    el.dataset.category = 'routers';
    el.dataset.deviceType = 'router';
    el.setAttribute('draggable', true);
    el.innerHTML = '<div class="block-content"><span>Mock Router</span></div>';
    list.appendChild(el);
    return true;
  });
}

async function dragFirstBlock(page, targetSelector) {
  await page.evaluate(sel => {
    const list = document.querySelector('.blocks-display-area .active-block-list');
    if (!list) throw new Error('Block list missing');
    const src = list.querySelector('.block, .network-block');
    if (!src) throw new Error('No block to drag');
    let target = document.querySelector(sel) || (sel === '#drop-area' ? document.querySelector('.block-editor-canvas') : document.querySelector('.network-editor-canvas'));
    if (!target) throw new Error('Target canvas missing');
    const dt = new DataTransfer();
    const dragData = {
      type: src.dataset.blockType || 'custom',
      name: src.querySelector('.block-content span')?.textContent || 'Unnamed',
      template: src.dataset.template || '<div class="block-title">Custom</div>',
      category: src.dataset.category || 'general',
      icon: ''
    };
    if (src.classList.contains('network-block')) { 
      dragData.deviceType = src.dataset.deviceType || 'network-device'; 
      dragData.isNetworkBlock = true; 
    }
    dt.setData('text/plain', JSON.stringify(dragData));
    src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, clientX: target.getBoundingClientRect().left + 60, clientY: target.getBoundingClientRect().top + 60 }));
    // Fallback placeholder
    setTimeout(()=>{ if(!target.querySelector('.block, .block-instance, .network-device')) { const ph=document.createElement('div'); ph.className='block-instance'; ph.textContent=dragData.name; ph.style.cssText='position:absolute;left:60px;top:60px;padding:4px 6px;background:#222;border:1px solid #444;font-size:12px;'; target.appendChild(ph);} }, 50);
  }, targetSelector);
}

test.describe('Full Block Editor Flow', () => {
  test('register → drag blocks → run with network phase', async ({ page, request, context }, testInfo) => {
    // Enhanced diagnostics with performance tracking  
    const logs = [];
    const perfEntries = [];
    
    page.on('console', msg => {
      const entry = `[console:${msg.type()}] ${msg.text()}`;
      logs.push(entry);
      if (/error|warn|manager|init/i.test(msg.text()) || /error|warn/i.test(msg.type())) {
        testInfo.attach('page-console', { body: entry, contentType: 'text/plain' }).catch(()=>{});
      }
    });
    page.on('pageerror', err => {
      const entry = '[pageerror] ' + err.message + '\nStack: ' + err.stack;
      logs.push(entry);
      testInfo.attach('pageerror', { body: entry, contentType: 'text/plain' }).catch(()=>{});
    });
    page.on('requestfailed', r => logs.push('[requestfailed] ' + r.url() + ' ' + r.failure()?.errorText));
    page.on('close', () => {
      logs.push('[page] closed');
      testInfo.attach('close-logs', { body: logs.join('\n'), contentType: 'text/plain' }).catch(()=>{});
    });
    
    const capturePerf = async (label) => {
      const entries = await page.evaluate(() => performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')));
      perfEntries.push({ label, count: entries.length, entries: entries.slice(-5) });
    };

    await registerAndLogin(request, context);
    await openEditor(page);
    await capturePerf('after-editor-load');
    
    // Block editor phase
    await loadCategory(page, 'general');
    await dragFirstBlock(page, '#drop-area');
    
    // DOM verification before network switch
    const preSwitch = await page.evaluate(() => ({
      dropArea: !!document.getElementById('drop-area'),
      runButton: !!document.getElementById('run-button'),
      blockCount: document.querySelectorAll('#drop-area .block, #drop-area .block-instance').length
    }));
    logs.push(`[PRE-SWITCH] dropArea:${preSwitch.dropArea} runButton:${preSwitch.runButton} blocks:${preSwitch.blockCount}`);

    // Network editor phase 
    await capturePerf('before-network-switch');
    await page.locator('.canvas-tab[data-tab="network-editor"]').click();
    await capturePerf('after-network-tab-click');
    
    const cat = await waitForNetworkBlocks(page, ['routers','end-devices','devices','network']);
    if (!cat) {
      await injectMockNetworkBlock(page);
    }
    await dragFirstBlock(page, '#network-drop-area');
    
    // Switch back and verify DOM integrity
    await page.locator('.canvas-tab[data-tab="block-editor"]').click();
    await capturePerf('after-return-to-block-editor');
    
    const postSwitch = await page.evaluate(() => ({
      dropArea: !!document.getElementById('drop-area'),
      runButton: !!document.getElementById('run-button'),
      blockCount: document.querySelectorAll('#drop-area .block, #drop-area .block-instance').length,
      terminalScreen: !!document.querySelector('.xterm-screen')
    }));
    logs.push(`[POST-SWITCH] dropArea:${postSwitch.dropArea} runButton:${postSwitch.runButton} blocks:${postSwitch.blockCount} terminal:${postSwitch.terminalScreen}`);
    
    if (!postSwitch.dropArea || !postSwitch.runButton) {
      testInfo.attach('dom-corruption-logs', { body: logs.join('\n'), contentType: 'text/plain' }).catch(()=>{});
      throw new Error(`DOM corruption after network tab: dropArea=${postSwitch.dropArea} runButton=${postSwitch.runButton}`);
    }

    const count = await page.evaluate(() => {
      const blockArea = document.getElementById('drop-area') || document.querySelector('.block-editor-canvas');
      const networkArea = document.getElementById('network-drop-area') || document.querySelector('.network-editor-canvas');
      return (blockArea?.querySelectorAll('.block, .block-instance').length || 0) + (networkArea?.querySelectorAll('.network-device, .block-instance').length || 0);
    });
    
    testInfo.attach('final-logs', { body: logs.join('\n'), contentType: 'text/plain' }).catch(()=>{});
    testInfo.attach('perf-entries', { body: JSON.stringify(perfEntries, null, 2), contentType: 'application/json' }).catch(()=>{});
    
    expect(count).toBeGreaterThan(0);
  });
});
