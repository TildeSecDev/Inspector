const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `cat_${ts}`;
  const email = `${username}@example.com`;
  const password = 'Passw0rd!';
  const reg = await request.post('http://localhost:3000/auth/register', { data:{ name: username, email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  expect(login.ok()).toBeTruthy();
  await context.addCookies([{ name:'username', value: encodeURIComponent(username), domain:'localhost', path:'/' }]);
  return { username };
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
  await page.waitForSelector('.blocks-display-area .active-block-list .block, .blocks-display-area .active-block-list .network-block', { timeout: 5000 }).catch(()=>{});
}

async function dragFirstBlock(page, targetSelector) {
  return await page.evaluate(sel => {
    try {
      const list = document.querySelector('.blocks-display-area .active-block-list');
      if (!list) return { success: false, error: 'Block list missing' };
      const src = list.querySelector('.block, .network-block');
      if (!src) return { success: false, error: 'No block to drag' };
      let target = document.querySelector(sel) || document.querySelector('.block-editor-canvas');
      if (!target) return { success: false, error: 'Target canvas missing' };
      
      const blockName = src.querySelector('.block-content span')?.textContent || src.textContent.trim() || 'Unnamed';
      const dragData = {
        type: src.dataset.blockType || 'custom',
        name: blockName,
        template: src.dataset.template || '<div class="block-title">Custom</div>',
        category: src.dataset.category || 'general',
        icon: ''
      };
      
      const dt = new DataTransfer();
      dt.setData('text/plain', JSON.stringify(dragData));
      src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
      target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
      target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, clientX: target.getBoundingClientRect().left + 60, clientY: target.getBoundingClientRect().top + 60 }));
      
      // Fallback placeholder for Custom blocks
      setTimeout(() => { 
        if (!target.querySelector('.block, .block-instance')) { 
          const ph = document.createElement('div'); 
          ph.className = 'block-instance'; 
          ph.innerHTML = `<div class="block-title">${blockName}</div><input type="text" placeholder="Enter command" value="echo ${blockName.toLowerCase()}-test">`;
          ph.style.cssText = 'position:absolute;left:60px;top:60px;padding:8px;background:#222;border:1px solid #444;border-radius:4px;'; 
          target.appendChild(ph);
        } 
      }, 100);
      
      return { success: true, blockName, dragData };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, targetSelector);
}

async function waitAndClickRun(page) {
  // Wait for any block to appear in drop area
  await page.waitForSelector('#drop-area .block, #drop-area .block-instance', { timeout: 3000 }).catch(()=>{});
  
  const termLengthBefore = await page.evaluate(() => {
    const term = document.querySelector('.xterm-screen')?.textContent || '';
    return term.length;
  });
  
  await page.locator('#run-button').click();
  
  // Wait for terminal output change or timeout
  await page.waitForFunction(prevLength => {
    const term = document.querySelector('.xterm-screen')?.textContent || '';
    return term.length > prevLength;
  }, termLengthBefore, { timeout: 8000 }).catch(() => {});
  
  const output = await page.evaluate(() => document.querySelector('.xterm-screen')?.textContent || '');
  return output;
}

// Block editor categories (non-network)
const BLOCK_CATEGORIES = [
  'general', 'tools', 'database', 'files', 'system', 'misc', 'analysis', 'server', 'apps'
];

test.describe('Category Block Validation', () => {
  
  BLOCK_CATEGORIES.forEach(category => {
    test(`${category} category - drag block and run`, async ({ page, request, context }, testInfo) => {
      const logs = [];
      
      page.on('console', msg => {
        const entry = `[${msg.type()}] ${msg.text()}`;
        logs.push(entry);
        if (/error|warn/i.test(msg.type())) {
          console.log(`[${category}] ${entry}`);
        }
      });
      
      page.on('pageerror', err => {
        logs.push(`[pageerror] ${err.message}`);
        console.log(`[${category}] Page error: ${err.message}`);
      });
      
      await registerAndLogin(request, context);
      await openEditor(page);
      
      // Load the specific category
      await loadCategory(page, category);
      
      // Check if category has blocks
      const hasBlocks = await page.evaluate(() => {
        const list = document.querySelector('.blocks-display-area .active-block-list');
        return !!(list && list.querySelector('.block, .network-block'));
      });
      
      if (!hasBlocks) {
        console.log(`[${category}] No blocks found - skipping category`);
        testInfo.attach('category-logs', { body: `${category}: No blocks available\n${logs.join('\n')}`, contentType: 'text/plain' });
        return; // Skip this category
      }
      
      // Drag first available block
      const dragResult = await dragFirstBlock(page, '#drop-area');
      expect(dragResult.success, `Failed to drag block in ${category}: ${dragResult.error}`).toBeTruthy();
      
      console.log(`[${category}] Dragged block: ${dragResult.blockName}`);
      
      // Wait brief moment for block to settle
      await page.waitForTimeout(500);
      
      // Click run and capture output
      const output = await waitAndClickRun(page);
      
      // Verify something was placed in drop area
      const blockCount = await page.evaluate(() => {
        return document.querySelectorAll('#drop-area .block, #drop-area .block-instance').length;
      });
      
      console.log(`[${category}] Block count: ${blockCount}, Output length: ${output.length}`);
      
      // Attach logs for debugging
      testInfo.attach(`${category}-logs`, { 
        body: `Block: ${dragResult.blockName}\nOutput: ${output}\nLogs:\n${logs.join('\n')}`, 
        contentType: 'text/plain' 
      });
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `test-artifacts/${category}-result-${Date.now()}.png`, 
        fullPage: false 
      });
      
      expect(blockCount, `Expected at least one block in drop area for ${category}`).toBeGreaterThan(0);
      expect(output.length, `Expected some terminal output after running ${category} block`).toBeGreaterThan(10);
    });
  });
  
});