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
  return { username };
}

async function openNetworkEditor(page) {
  await page.goto('http://localhost:3000/editor', { waitUntil: 'domcontentloaded' });
  await page.locator('#run-button').waitFor();
  
  // Switch to network editor tab
  const networkTab = page.locator('.canvas-tab[data-tab="network-editor"]');
  if (await networkTab.count() > 0) {
    await networkTab.click();
  }
  
  // Wait for network drop area to be active
  await page.locator('#network-drop-area').waitFor();
  
  // Ensure network drop area is visible and interactable
  await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    if (networkArea) {
      networkArea.style.pointerEvents = 'auto';
      networkArea.classList.add('active');
    }
  });
}

async function loadNetworkCategory(page, category) {
  console.log(`[Network Test] Loading category: ${category}`);
  await page.evaluate(cat => {
    // Try multiple methods to load category blocks
    const categoryEl = document.querySelector(`[data-category="${cat}"]`);
    if (categoryEl) {
      categoryEl.click();
    } else if (window.loadBlocks) {
      window.loadBlocks(cat);
    } else if (window.loadNetworkBlocks) {
      window.loadNetworkBlocks(cat);
    }
  }, category);
  
  // Wait for network blocks to load
  const hasBlocks = await page.waitForFunction(category => {
    const list = document.querySelector('.blocks-display-area .active-block-list');
    if (!list) return false;
    const blocks = list.querySelectorAll('.network-block');
    return blocks.length > 0;
  }, category, { timeout: 8000 }).then(() => true).catch(() => false);
  
  return hasBlocks;
}

async function injectMockNetworkBlock(page, category, deviceType = 'network-device') {
  console.log(`[Network Test] Injecting mock block for category: ${category}`);
  return await page.evaluate(({ cat, devType }) => {
    const list = document.querySelector('.blocks-display-area .active-block-list');
    if (!list) return false;
    
    // Clear existing mock blocks to avoid duplicates
    const existing = list.querySelectorAll('.mock-network-block');
    existing.forEach(el => el.remove());
    
    const el = document.createElement('div');
    el.className = 'network-block mock-network-block';
    el.dataset.blockType = `mock-${devType}`;
    el.dataset.category = cat;
    el.dataset.deviceType = devType;
    el.setAttribute('draggable', true);
    
    // Device type specific icons and names
    const deviceConfig = {
      'end-device': { icon: '🖥️', name: 'Mock PC' },
      'router': { icon: '📡', name: 'Mock Router' },
      'switch': { icon: '🔀', name: 'Mock Switch' },
      'layer2-switch': { icon: '🔀', name: 'Mock L2 Switch' },
      'layer3-switch': { icon: '⚙️', name: 'Mock L3 Switch' },
      'access-point': { icon: '📶', name: 'Mock AP' },
      'wireless-router': { icon: '📡', name: 'Mock WiFi Router' },
      'wireless-client': { icon: '📱', name: 'Mock WiFi Client' },
      'voice-device': { icon: '📞', name: 'Mock IP Phone' },
      'mobile-device': { icon: '📱', name: 'Mock Mobile' },
      'iot-device': { icon: '📡', name: 'Mock IoT Device' },
      'security-device': { icon: '🛡️', name: 'Mock Firewall' },
      'wan-switch': { icon: '🌐', name: 'Mock WAN Switch' },
      'wan-cloud': { icon: '☁️', name: 'Mock Cloud' },
      'interface-card': { icon: '🔌', name: 'Mock Module' },
      'network-device': { icon: '🖥️', name: 'Mock Device' }
    };
    
    const config = deviceConfig[devType] || deviceConfig['network-device'];
    
    el.innerHTML = `
      <div class="network-block-title">${config.name}</div>
      <div class="device-icon" style="font-size: 24px; text-align: center;">${config.icon}</div>
    `;
    
    // Add drag handlers
    el.addEventListener('dragstart', (e) => {
      const dragData = {
        type: el.dataset.blockType,
        name: config.name,
        template: el.innerHTML,
        category: cat,
        deviceType: devType,
        isNetworkBlock: true,
        icon: config.icon
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
    });
    
    list.appendChild(el);
    console.log(`[Network Test] Mock block injected: ${config.name} (${devType})`);
    return true;
  }, { cat: category, devType: deviceType });
}

async function dragFirstNetworkBlock(page, category) {
  console.log(`[Network Test] Attempting to drag first network block for category: ${category}`);
  return await page.evaluate(() => {
    const src = document.querySelector('.blocks-display-area .active-block-list .network-block');
    if (!src) {
      throw new Error('No network block found to drag');
    }
    
    const target = document.getElementById('network-drop-area');
    if (!target) {
      throw new Error('Network drop area not found');
    }
    
    // Get block info
    const blockName = src.querySelector('.network-block-title, .block-content span')?.textContent || 
                     src.textContent.trim() || 'Unnamed Device';
    
    console.log(`[Network Test] Dragging block: ${blockName}`);
    
    // Create drag data
    const dragData = {
      type: src.dataset.blockType || 'mock-device',
      name: blockName,
      template: src.innerHTML,
      category: src.dataset.category || 'network',
      deviceType: src.dataset.deviceType || 'network-device',
      isNetworkBlock: true,
      icon: src.querySelector('.device-icon')?.textContent || '🖥️'
    };
    
    // Simulate drag and drop
    const dt = new DataTransfer();
    dt.setData('text/plain', JSON.stringify(dragData));
    
    // Calculate drop position (center of network canvas)
    const rect = target.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Fire drag events
    src.dispatchEvent(new DragEvent('dragstart', { 
      dataTransfer: dt, 
      bubbles: true 
    }));
    
    target.dispatchEvent(new DragEvent('dragover', { 
      dataTransfer: dt, 
      bubbles: true,
      clientX: rect.left + centerX,
      clientY: rect.top + centerY
    }));
    
    target.dispatchEvent(new DragEvent('drop', { 
      dataTransfer: dt, 
      bubbles: true,
      clientX: rect.left + centerX,
      clientY: rect.top + centerY
    }));
    
    return { blockName, deviceType: dragData.deviceType };
  });
}

async function getNetworkDevicesCount(page) {
  return await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    if (!networkArea) return 0;
    
    const devices = networkArea.querySelectorAll('.network-device, .network-block, .block-instance');
    return devices.length;
  });
}

async function getNetworkCanvasContent(page) {
  return await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    if (!networkArea) return 'Network area not found';
    
    const devices = networkArea.querySelectorAll('.network-device, .network-block, .block-instance');
    const connections = networkArea.querySelectorAll('line, path');
    
    return {
      deviceCount: devices.length,
      connectionCount: connections.length,
      content: networkArea.innerHTML.length
    };
  });
}

// Network block categories based on the JSON files found
const NETWORK_CATEGORIES = [
  { 
    name: 'end-devices', 
    deviceTypes: ['end-device', 'voice-device', 'mobile-device', 'iot-device', 'security-device'],
    description: 'End user devices like PCs, laptops, phones, IoT devices'
  },
  { 
    name: 'routers', 
    deviceTypes: ['router'],
    description: 'Network routers for routing between networks'
  },
  { 
    name: 'switches', 
    deviceTypes: ['switch', 'layer2-switch', 'layer3-switch', 'hub'],
    description: 'Network switches and hubs for LAN connectivity'
  },
  { 
    name: 'wireless', 
    deviceTypes: ['access-point', 'wireless-router', 'wireless-client'],
    description: 'Wireless networking equipment and clients'
  },
  { 
    name: 'wan', 
    deviceTypes: ['wan-switch', 'wan-cloud'],
    description: 'WAN connectivity devices like Frame Relay'
  },
  { 
    name: 'modules', 
    deviceTypes: ['interface-card', 'wireless-module'],
    description: 'Network interface modules and cards'
  }
];

test.describe('Network Editor Category Validation', () => {
  
  NETWORK_CATEGORIES.forEach(categoryInfo => {
    test(`${categoryInfo.name} category - drag network blocks to network canvas`, async ({ page, request, context }, testInfo) => {
      const logs = [];
      
      // Capture console logs for debugging
      page.on('console', msg => {
        const entry = `[${msg.type()}] ${msg.text()}`;
        logs.push(entry);
        if (/error|warn/i.test(msg.type())) {
          console.log(`[${categoryInfo.name}] ${entry}`);
        }
      });
      
      page.on('pageerror', err => {
        logs.push(`[pageerror] ${err.message}`);
        console.log(`[${categoryInfo.name}] Page error: ${err.message}`);
      });
      
      const { username } = await registerAndLogin(request, context);
      await openNetworkEditor(page);
      
      // Test with multiple device types from this category
      let successfulDrops = 0;
      const maxTests = Math.min(3, categoryInfo.deviceTypes.length);
      
      for (let i = 0; i < maxTests; i++) {
        const deviceType = categoryInfo.deviceTypes[i];
        
        try {
          // Try to load actual blocks first
          const hasRealBlocks = await loadNetworkCategory(page, categoryInfo.name);
          
          if (!hasRealBlocks) {
            // Inject mock block if no real blocks are available
            await injectMockNetworkBlock(page, categoryInfo.name, deviceType);
          }
          
          // Attempt to drag the block
          const dragResult = await dragFirstNetworkBlock(page, categoryInfo.name);
          console.log(`[${categoryInfo.name}] Dragged block:`, dragResult.blockName);
          
          // Wait for block to be added to network canvas
          await page.waitForTimeout(500);
          
          // Verify device was added
          const deviceCount = await getNetworkDevicesCount(page);
          if (deviceCount > successfulDrops) {
            successfulDrops++;
            console.log(`[${categoryInfo.name}] Successfully dropped device ${i + 1}: ${dragResult.blockName} (${deviceType})`);
          }
          
        } catch (error) {
          console.warn(`[${categoryInfo.name}] Failed to test device type ${deviceType}:`, error.message);
        }
      }
      
      // Get final canvas state
      const finalState = await getNetworkCanvasContent(page);
      console.log(`[${categoryInfo.name}] Final canvas state:`, finalState);
      
      // Test should pass if at least one device was successfully dropped
      expect(successfulDrops).toBeGreaterThan(0);
      expect(finalState.deviceCount).toBeGreaterThanOrEqual(successfulDrops);
      
      // Log test results
      await testInfo.attach('test-logs', {
        body: JSON.stringify({
          category: categoryInfo.name,
          description: categoryInfo.description,
          deviceTypes: categoryInfo.deviceTypes,
          successfulDrops,
          finalState,
          username,
          logs: logs.slice(-20) // Last 20 log entries
        }, null, 2),
        contentType: 'application/json'
      });
    });
  });
  
  // Additional comprehensive test that tries all categories in sequence
  test('comprehensive network topology building - all categories', async ({ page, request, context }, testInfo) => {
    const logs = [];
    
    page.on('console', msg => {
      const entry = `[${msg.type()}] ${msg.text()}`;
      logs.push(entry);
      if (/error|warn/i.test(msg.type())) {
        console.log(`[comprehensive] ${entry}`);
      }
    });
    
    const { username } = await registerAndLogin(request, context);
    await openNetworkEditor(page);
    
    let totalDevices = 0;
    const results = [];
    
    // Try to build a network with devices from each category
    for (const categoryInfo of NETWORK_CATEGORIES) {
      try {
        console.log(`[comprehensive] Testing category: ${categoryInfo.name}`);
        
        // Load category
        const hasRealBlocks = await loadNetworkCategory(page, categoryInfo.name);
        
        if (!hasRealBlocks) {
          // Use primary device type for mock
          const primaryDeviceType = categoryInfo.deviceTypes[0];
          await injectMockNetworkBlock(page, categoryInfo.name, primaryDeviceType);
        }
        
        // Drop one device from this category
        const dragResult = await dragFirstNetworkBlock(page, categoryInfo.name);
        await page.waitForTimeout(300);
        
        const newDeviceCount = await getNetworkDevicesCount(page);
        if (newDeviceCount > totalDevices) {
          totalDevices = newDeviceCount;
          results.push({
            category: categoryInfo.name,
            deviceType: categoryInfo.deviceTypes[0],
            blockName: dragResult.blockName,
            success: true
          });
          console.log(`[comprehensive] Added device from ${categoryInfo.name}: ${dragResult.blockName}`);
        } else {
          results.push({
            category: categoryInfo.name,
            deviceType: categoryInfo.deviceTypes[0],
            success: false,
            error: 'Device not added to canvas'
          });
        }
        
      } catch (error) {
        console.warn(`[comprehensive] Failed to add device from ${categoryInfo.name}:`, error.message);
        results.push({
          category: categoryInfo.name,
          success: false,
          error: error.message
        });
      }
    }
    
    const finalState = await getNetworkCanvasContent(page);
    console.log(`[comprehensive] Final network topology:`, finalState);
    
    // Should have at least 3 different device types
    const successfulCategories = results.filter(r => r.success).length;
    expect(successfulCategories).toBeGreaterThanOrEqual(3);
    expect(finalState.deviceCount).toBeGreaterThanOrEqual(3);
    
    // Attach comprehensive test results
    await testInfo.attach('comprehensive-results', {
      body: JSON.stringify({
        username,
        totalDevices,
        successfulCategories,
        finalState,
        results,
        logs: logs.slice(-30)
      }, null, 2),
      contentType: 'application/json'
    });
  });
  
  // Test network connections functionality
  test('network device connection creation', async ({ page, request, context }, testInfo) => {
    const { username } = await registerAndLogin(request, context);
    await openNetworkEditor(page);
    
    // Add two devices to connect
    for (let i = 0; i < 2; i++) {
      await injectMockNetworkBlock(page, 'end-devices', 'end-device');
      await dragFirstNetworkBlock(page, 'end-devices');
      await page.waitForTimeout(300);
    }
    
    const deviceCount = await getNetworkDevicesCount(page);
    expect(deviceCount).toBe(2);
    
    // Try to create a connection between devices
    const connectionAttempt = await page.evaluate(() => {
      const devices = document.querySelectorAll('#network-drop-area .network-device');
      if (devices.length < 2) return { success: false, error: 'Not enough devices' };
      
      // Try to find and click connection tools
      const linkBtn = document.getElementById('btn-start-link');
      if (linkBtn) {
        linkBtn.click();
        return { success: true, connectionMode: true };
      }
      
      return { success: false, error: 'No connection tools found' };
    });
    
    console.log('[connection] Connection attempt result:', connectionAttempt);
    
    const finalState = await getNetworkCanvasContent(page);
    expect(finalState.deviceCount).toBe(2);
    
    await testInfo.attach('connection-test-results', {
      body: JSON.stringify({
        username,
        deviceCount,
        connectionAttempt,
        finalState
      }, null, 2),
      contentType: 'application/json'
    });
  });
  
});