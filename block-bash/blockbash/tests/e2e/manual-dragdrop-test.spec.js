const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `droptest_${ts}`;
  const email = `${username}@example.com`;
  const password = 'Passw0rd!';
  const reg = await request.post('http://localhost:3000/auth/register', { data:{ name: username, email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  expect(login.ok()).toBeTruthy();
  await context.addCookies([{ name:'username', value: encodeURIComponent(username), domain:'localhost', path:'/' }]);
  return { username };
}

test('verify manual drag-drop works for network blocks', async ({ page, request, context }) => {
  const { username } = await registerAndLogin(request, context);
  
  await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
  await page.locator('#run-button').waitFor();
  
  // Switch to Network Editor
  const networkTab = page.locator('.canvas-tab[data-tab="network-editor"]');
  if (await networkTab.count() > 0) {
    await networkTab.click();
    await page.waitForTimeout(500);
  }
  
  // Load routers and check if setupDropHandlers is available
  await page.evaluate(() => {
    if (window.loadBlocks) window.loadBlocks('routers');
  });
  
  await page.waitForTimeout(1000);
  
  // Check if setupDropHandlers is now available and call it manually
  const setupResult = await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    if (!networkArea) return { error: 'No network area' };
    
    console.log('setupDropHandlers available:', typeof window.setupDropHandlers === 'function');
    
    if (typeof window.setupDropHandlers === 'function') {
      // Call setupDropHandlers manually
      window.setupDropHandlers(networkArea);
      return { 
        setup: 'called manually',
        hasHandlers: networkArea.ondragover !== null || networkArea.ondrop !== null
      };
    }
    
    return { setup: 'not available' };
  });
  
  console.log('Setup result:', setupResult);
  
  // Now try the manual drag
  const manualDrag = await page.evaluate(() => {
    const sourceBlock = document.querySelector('.blocks-display-area .network-block');
    const networkDropArea = document.getElementById('network-drop-area');
    
    if (!sourceBlock || !networkDropArea) {
      return { error: 'Missing elements' };
    }
    
    // Create proper drag data
    const dragData = {
      type: 'test-router',
      name: 'Test Router',
      template: '<div>Test Router</div>',
      category: 'routers',
      deviceType: 'router',
      isNetworkBlock: true
    };
    
    // Use a more realistic drag simulation
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify(dragData));
    
    const rect = networkDropArea.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Fire the events in the right sequence
    const dragStartEvent = new DragEvent('dragstart', { 
      dataTransfer: dataTransfer, 
      bubbles: true, 
      cancelable: true 
    });
    sourceBlock.dispatchEvent(dragStartEvent);
    
    const dragEnterEvent = new DragEvent('dragenter', {
      dataTransfer: dataTransfer,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });
    networkDropArea.dispatchEvent(dragEnterEvent);
    
    const dragOverEvent = new DragEvent('dragover', {
      dataTransfer: dataTransfer,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });
    const dragOverResult = networkDropArea.dispatchEvent(dragOverEvent);
    
    const dropEvent = new DragEvent('drop', {
      dataTransfer: dataTransfer,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });
    const dropResult = networkDropArea.dispatchEvent(dropEvent);
    
    return {
      success: true,
      dragOverResult,
      dropResult,
      centerPos: { x, y }
    };
  });
  
  console.log('Manual drag result:', manualDrag);
  
  await page.waitForTimeout(1000);
  
  // Check final state
  const finalState = await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    const devices = Array.from(networkArea.querySelectorAll('.network-device, .block'));
    
    return {
      deviceCount: devices.length,
      devices: devices.map(d => ({
        className: d.className,
        textContent: d.textContent.trim().slice(0, 50),
        id: d.id
      })),
      areaHtml: networkArea.innerHTML.length > 0 ? 'has content' : 'empty'
    };
  });
  
  console.log('Final state:', finalState);
  
  // Verify that dragging actually works
  expect(finalState.deviceCount).toBeGreaterThan(0);
});