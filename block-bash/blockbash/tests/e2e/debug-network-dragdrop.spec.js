const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `dragtest_${ts}`;
  const email = `${username}@example.com`;
  const password = 'Passw0rd!';
  const reg = await request.post('http://localhost:3000/auth/register', { data:{ name: username, email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  expect(login.ok()).toBeTruthy();
  await context.addCookies([{ name:'username', value: encodeURIComponent(username), domain:'localhost', path:'/' }]);
  return { username };
}

test.describe('Network Editor Drag-Drop Debugging', () => {
  
  test('debug network block drag and drop functionality', async ({ page, request, context }) => {
    const { username } = await registerAndLogin(request, context);
    
    // Navigate to editor
    await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
    await page.locator('#run-button').waitFor();
    
    // Switch to Network Editor
    console.log('[Debug] Switching to Network Editor');
    const networkTab = page.locator('.canvas-tab[data-tab="network-editor"]');
    if (await networkTab.count() > 0) {
      await networkTab.click();
      await page.waitForTimeout(500);
    }
    
    // Debug: Check if network-drop-area exists and is visible
    const networkArea = await page.locator('#network-drop-area');
    const isVisible = await networkArea.isVisible();
    const boundingBox = await networkArea.boundingBox();
    
    console.log('[Debug] Network drop area visible:', isVisible);
    console.log('[Debug] Network drop area bounds:', boundingBox);
    
    // Load a network category (routers)
    console.log('[Debug] Loading routers category');
    await page.evaluate(() => {
      const routersTab = document.querySelector('[data-category="routers"]');
      if (routersTab) {
        routersTab.click();
      } else if (window.loadBlocks) {
        window.loadBlocks('routers');
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Debug: Check what network blocks are available
    const networkBlocks = await page.evaluate(() => {
      const list = document.querySelector('.blocks-display-area .active-block-list');
      if (!list) return { error: 'No block list found' };
      
      const blocks = Array.from(list.querySelectorAll('.network-block, .block'));
      return {
        listExists: !!list,
        blockCount: blocks.length,
        blocks: blocks.map(b => ({
          className: b.className,
          draggable: b.draggable,
          dataCategory: b.dataset.category,
          dataBlockType: b.dataset.blockType,
          dataDeviceType: b.dataset.deviceType,
          textContent: b.textContent.trim(),
          hasEventListeners: b.ondragstart !== null
        }))
      };
    });
    
    console.log('[Debug] Network blocks analysis:', JSON.stringify(networkBlocks, null, 2));
    
    // Try to drag a network block if one exists
    if (networkBlocks.blocks && networkBlocks.blocks.length > 0) {
      console.log('[Debug] Attempting to drag first network block');
      
      // Try manual drag simulation
      const dragResult = await page.evaluate(() => {
        const sourceBlock = document.querySelector('.blocks-display-area .network-block, .blocks-display-area .block');
        const networkDropArea = document.getElementById('network-drop-area');
        
        if (!sourceBlock) return { error: 'No source block found' };
        if (!networkDropArea) return { error: 'No network drop area found' };
        
        console.log('[Debug] Source block:', sourceBlock.className, sourceBlock.textContent);
        console.log('[Debug] Target area:', networkDropArea.id);
        
        // Create drag data
        const dragData = {
          type: sourceBlock.dataset.blockType || 'test-router',
          name: sourceBlock.textContent.trim() || 'Test Router',
          template: sourceBlock.dataset.template || '<div>Router</div>',
          category: 'routers',
          deviceType: 'router',
          isNetworkBlock: true
        };
        
        console.log('[Debug] Drag data:', dragData);
        
        // Simulate drag events
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', JSON.stringify(dragData));
        
        // Fire dragstart
        const dragStartEvent = new DragEvent('dragstart', {
          dataTransfer: dataTransfer,
          bubbles: true,
          cancelable: true
        });
        
        console.log('[Debug] Firing dragstart event');
        const dragStartResult = sourceBlock.dispatchEvent(dragStartEvent);
        console.log('[Debug] Dragstart event result:', dragStartResult);
        
        // Fire dragover and drop on network area
        const rect = networkDropArea.getBoundingClientRect();
        const dropX = rect.left + 100;
        const dropY = rect.top + 100;
        
        const dragOverEvent = new DragEvent('dragover', {
          dataTransfer: dataTransfer,
          bubbles: true,
          cancelable: true,
          clientX: dropX,
          clientY: dropY
        });
        
        console.log('[Debug] Firing dragover event at', dropX, dropY);
        const dragOverResult = networkDropArea.dispatchEvent(dragOverEvent);
        console.log('[Debug] Dragover event result:', dragOverResult);
        
        const dropEvent = new DragEvent('drop', {
          dataTransfer: dataTransfer,
          bubbles: true,
          cancelable: true,
          clientX: dropX,
          clientY: dropY
        });
        
        console.log('[Debug] Firing drop event');
        const dropResult = networkDropArea.dispatchEvent(dropEvent);
        console.log('[Debug] Drop event result:', dropResult);
        
        return {
          success: true,
          dragStartResult,
          dragOverResult,
          dropResult,
          dragData
        };
      });
      
      console.log('[Debug] Drag simulation result:', dragResult);
      
      await page.waitForTimeout(1000);
      
      // Check if a device was added to the network area
      const devicesInNetwork = await page.evaluate(() => {
        const networkArea = document.getElementById('network-drop-area');
        if (!networkArea) return { error: 'Network area not found' };
        
        const devices = Array.from(networkArea.querySelectorAll('.network-device, .network-block, .block'));
        return {
          count: devices.length,
          devices: devices.map(d => ({
            className: d.className,
            id: d.id,
            textContent: d.textContent.trim(),
            position: {
              left: d.style.left,
              top: d.style.top
            },
            dataAttributes: {
              blockType: d.dataset.blockType,
              category: d.dataset.category,
              deviceType: d.dataset.deviceType
            }
          }))
        };
      });
      
      console.log('[Debug] Devices in network after drag:', JSON.stringify(devicesInNetwork, null, 2));
      
      // Basic assertion
      expect(devicesInNetwork.count).toBeGreaterThanOrEqual(0);
      
      if (devicesInNetwork.count === 0) {
        // Check drop handlers
        const dropHandlerInfo = await page.evaluate(() => {
          const networkArea = document.getElementById('network-drop-area');
          if (!networkArea) return { error: 'No network area' };
          
          return {
            hasDragOverHandler: typeof networkArea.ondragover === 'function',
            hasDropHandler: typeof networkArea.ondrop === 'function',
            eventListeners: networkArea.getEventListeners ? networkArea.getEventListeners() : 'getEventListeners not available'
          };
        });
        
        console.log('[Debug] Drop handler info:', dropHandlerInfo);
      }
      
    } else {
      console.log('[Debug] No network blocks found to test');
    }
  });
  
  test('check drop event handlers setup', async ({ page, request, context }) => {
    const { username } = await registerAndLogin(request, context);
    await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
    
    // Check if drop handlers are properly set up
    const handlerInfo = await page.evaluate(() => {
      const networkArea = document.getElementById('network-drop-area');
      const blockArea = document.getElementById('drop-area');
      
      return {
        networkArea: {
          exists: !!networkArea,
          dragover: networkArea ? (networkArea.ondragover !== null || 
                                   networkArea.getAttribute('ondragover') !== null) : false,
          drop: networkArea ? (networkArea.ondrop !== null || 
                               networkArea.getAttribute('ondrop') !== null) : false,
          className: networkArea ? networkArea.className : null
        },
        blockArea: {
          exists: !!blockArea,
          dragover: blockArea ? (blockArea.ondragover !== null || 
                                 blockArea.getAttribute('ondragover') !== null) : false,
          drop: blockArea ? (blockArea.ondrop !== null || 
                             blockArea.getAttribute('ondrop') !== null) : false,
          className: blockArea ? blockArea.className : null
        },
        setupFunctions: {
          hasSetupDropHandlers: typeof window.setupDropHandlers === 'function',
          hasLoadBlocks: typeof window.loadBlocks === 'function'
        }
      };
    });
    
    console.log('[Debug] Handler setup info:', JSON.stringify(handlerInfo, null, 2));
    
    expect(handlerInfo.networkArea.exists).toBeTruthy();
    expect(handlerInfo.blockArea.exists).toBeTruthy();
  });
  
});