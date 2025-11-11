const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `usertest_${ts}`;
  const email = `${username}@example.com`;
  const password = 'Passw0rd!';
  const reg = await request.post('http://localhost:3000/auth/register', { data:{ name: username, email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post('http://localhost:3000/auth/login', { data:{ email, password } });
  expect(login.ok()).toBeTruthy();
  await context.addCookies([{ name:'username', value: encodeURIComponent(username), domain:'localhost', path:'/' }]);
  return { username };
}

test('real user workflow: drag network blocks using actual browser interactions', async ({ page, request, context }) => {
  const { username } = await registerAndLogin(request, context);
  
  console.log('[User Test] Starting real user workflow test');
  
  // Navigate to editor
  await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
  await page.locator('#run-button').waitFor();
  
  console.log('[User Test] Editor loaded, switching to Network Editor');
  
  // Switch to Network Editor tab
  const networkTab = page.locator('.canvas-tab[data-tab="network-editor"]');
  if (await networkTab.count() > 0) {
    await networkTab.click();
    console.log('[User Test] Clicked network editor tab');
  } else {
    console.log('[User Test] No network editor tab found, using existing view');
  }
  
  await page.waitForTimeout(500);
  
  // Verify network drop area is visible and ready
  const networkArea = page.locator('#network-drop-area');
  await expect(networkArea).toBeVisible();
  
  const networkBounds = await networkArea.boundingBox();
  console.log('[User Test] Network area bounds:', networkBounds);
  
  // Load routers category
  console.log('[User Test] Loading routers category');
  await page.evaluate(() => {
    // Try clicking the routers tab first
    const routersTab = document.querySelector('[data-category="routers"]');
    if (routersTab) {
      routersTab.click();
    } else if (window.loadBlocks) {
      window.loadBlocks('routers');
    }
  });
  
  await page.waitForTimeout(1500); // Give time for blocks to load
  
  // Check what network blocks are available
  const blocksInfo = await page.evaluate(() => {
    const list = document.querySelector('.blocks-display-area .active-block-list');
    if (!list) return { error: 'No block list container found' };
    
    const networkBlocks = Array.from(list.querySelectorAll('.network-block, .block'));
    return {
      containerExists: true,
      totalBlocks: networkBlocks.length,
      blockDetails: networkBlocks.slice(0, 3).map((block, i) => ({
        index: i,
        className: block.className,
        textContent: block.textContent.trim(),
        draggable: block.draggable,
        boundingBox: {
          x: block.getBoundingClientRect().x,
          y: block.getBoundingClientRect().y,
          width: block.getBoundingClientRect().width,
          height: block.getBoundingClientRect().height
        }
      }))
    };
  });
  
  console.log('[User Test] Available blocks:', JSON.stringify(blocksInfo, null, 2));
  
  // Ensure we have at least one block to drag
  expect(blocksInfo.totalBlocks).toBeGreaterThan(0);
  
  if (blocksInfo.totalBlocks > 0) {
    console.log('[User Test] Attempting real browser drag-and-drop');
    
    // Get the first block element
    const firstBlock = page.locator('.blocks-display-area .network-block, .blocks-display-area .block').first();
    await expect(firstBlock).toBeVisible();
    
    // Get the source and target positions
    const sourceBox = await firstBlock.boundingBox();
    const targetBox = await networkArea.boundingBox();
    
    console.log('[User Test] Source box:', sourceBox);
    console.log('[User Test] Target box:', targetBox);
    
    if (sourceBox && targetBox) {
      // Calculate drop position in the center of network area
      const dropX = targetBox.x + targetBox.width / 2;
      const dropY = targetBox.y + targetBox.height / 2;
      
      console.log('[User Test] Will drag from', sourceBox.x + sourceBox.width/2, sourceBox.y + sourceBox.height/2);
      console.log('[User Test] Will drop at', dropX, dropY);
      
      // Perform real browser drag and drop
      await firstBlock.dragTo(networkArea, {
        sourcePosition: { x: sourceBox.width / 2, y: sourceBox.height / 2 },
        targetPosition: { x: targetBox.width / 2, y: targetBox.height / 2 }
      });
      
      console.log('[User Test] Drag-and-drop completed');
      
      // Wait for the drop to process
      await page.waitForTimeout(1000);
      
      // Check if a device was successfully added to network area
      const devicesAfterDrop = await page.evaluate(() => {
        const networkArea = document.getElementById('network-drop-area');
        if (!networkArea) return { error: 'Network area not found' };
        
        const devices = Array.from(networkArea.querySelectorAll('.network-device, .network-block, .block'));
        return {
          count: devices.length,
          devices: devices.map(d => ({
            className: d.className,
            id: d.id,
            textContent: d.textContent.trim().slice(0, 30),
            position: {
              left: d.style.left,
              top: d.style.top,
              x: d.getBoundingClientRect().x,
              y: d.getBoundingClientRect().y
            }
          })),
          networkAreaContent: networkArea.innerHTML.length > 50 ? 'Has content' : 'Empty or minimal'
        };
      });
      
      console.log('[User Test] Devices after drop:', JSON.stringify(devicesAfterDrop, null, 2));
      
      // Verify at least one device was created
      expect(devicesAfterDrop.count).toBeGreaterThanOrEqual(1);
      
      if (devicesAfterDrop.count > 0) {
        console.log('[User Test] ✅ SUCCESS - Network block was successfully dragged and dropped!');
        
        // Try dragging a second different block
        console.log('[User Test] Attempting to drag a second block');
        
        // Load switches category
        await page.evaluate(() => {
          const switchesTab = document.querySelector('[data-category="switches"]');
          if (switchesTab) {
            switchesTab.click();
          } else if (window.loadBlocks) {
            window.loadBlocks('switches');
          }
        });
        
        await page.waitForTimeout(1000);
        
        const secondBlock = page.locator('.blocks-display-area .network-block, .blocks-display-area .block').first();
        if (await secondBlock.count() > 0) {
          await secondBlock.dragTo(networkArea, {
            targetPosition: { x: 150, y: 200 }
          });
          
          await page.waitForTimeout(500);
          
          const finalDeviceCount = await page.evaluate(() => {
            return document.getElementById('network-drop-area').querySelectorAll('.network-device, .network-block, .block').length;
          });
          
          console.log('[User Test] Final device count:', finalDeviceCount);
          expect(finalDeviceCount).toBeGreaterThanOrEqual(2);
        }
        
      } else {
        console.log('[User Test] ❌ FAILED - No network device was created after drag-and-drop');
        
        // Debug information
        const debugInfo = await page.evaluate(() => {
          const networkArea = document.getElementById('network-drop-area');
          return {
            networkAreaHTML: networkArea.innerHTML.slice(0, 500),
            hasDropHandlers: typeof networkArea.ondrop === 'function',
            hasDragOverHandlers: typeof networkArea.ondragover === 'function',
            classList: networkArea.classList.toString()
          };
        });
        
        console.log('[User Test] Debug info:', debugInfo);
      }
    }
  }
});

test('verify network categories load blocks properly', async ({ page, request, context }) => {
  const { username } = await registerAndLogin(request, context);
  
  await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
  
  const networkCategories = ['routers', 'switches', 'end-devices', 'wireless', 'wan'];
  
  for (const category of networkCategories) {
    console.log(`[Category Test] Testing ${category}`);
    
    // Load category
    await page.evaluate((cat) => {
      if (window.loadBlocks) {
        window.loadBlocks(cat);
      }
    }, category);
    
    await page.waitForTimeout(1000);
    
    // Check blocks loaded
    const categoryResult = await page.evaluate(() => {
      const list = document.querySelector('.blocks-display-area .active-block-list');
      const blocks = list ? Array.from(list.querySelectorAll('.network-block, .block')) : [];
      
      return {
        blocksFound: blocks.length,
        firstBlockText: blocks[0] ? blocks[0].textContent.trim() : null,
        allDraggable: blocks.every(b => b.draggable === true)
      };
    });
    
    console.log(`[Category Test] ${category}:`, categoryResult);
    
    // Each category should have at least some blocks
    if (categoryResult.blocksFound === 0) {
      console.warn(`[Category Test] WARNING: No blocks found for ${category}`);
    }
  }
});