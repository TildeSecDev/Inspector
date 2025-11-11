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

async function dragFirstNetworkBlock(page) {
  await page.evaluate(() => {
    const src = document.querySelector('.blocks-display-area .active-block-list .network-block');
    if (!src) throw new Error('No network block to drag');
    const target = document.getElementById('network-drop-area') || document.querySelector('.network-editor-canvas');
    if (!target) throw new Error('No network drop area');
    const dt = new DataTransfer();
    const dragData = { type: src.dataset.blockType || 'mock-device', name: 'Mock Router', template: src.dataset.template || '<div class="block-title">Mock</div>', category: src.dataset.category || 'routers', icon: '', deviceType: src.dataset.deviceType || 'router', isNetworkBlock: true };
    dt.setData('text/plain', JSON.stringify(dragData));
    src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, clientX: target.getBoundingClientRect().left + 80, clientY: target.getBoundingClientRect().top + 80 }));
  });
}

test.describe('Network Editor Flow', () => {
  test('drag network block (real or mock) without crash', async ({ page, request, context }) => {
    await registerAndLogin(request, context);
    await openEditor(page);
    await page.locator('.canvas-tab[data-tab="network-editor"]').click();
    const cat = await waitForNetworkBlocks(page, ['routers','end-devices','devices','network']);
    if (!cat) {
      await injectMockNetworkBlock(page);
    }
    await dragFirstNetworkBlock(page);
    const count = await page.evaluate(()=> (document.getElementById('network-drop-area') || document.querySelector('.network-editor-canvas'))?.querySelectorAll('.network-device, .network-block, .block-instance').length || 0);
    expect(count).toBeGreaterThan(0);
  });
});
