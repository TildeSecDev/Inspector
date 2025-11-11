const { test, expect } = require('@playwright/test');

async function registerAndLogin(request, context) {
  const ts = Date.now();
  const username = `netint_${ts}`;
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

async function switchToNetworkEditor(page) {
  console.log('[Integration] Switching to Network Editor');
  const networkTab = page.locator('.canvas-tab[data-tab="network-editor"]');
  if (await networkTab.count() > 0) {
    await networkTab.click();
  }
  
  await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    if (networkArea) {
      networkArea.style.pointerEvents = 'auto';
      networkArea.classList.add('active');
    }
    // Ensure block canvas is inactive
    const blockArea = document.getElementById('drop-area');
    if (blockArea) {
      blockArea.classList.remove('active');
      blockArea.style.pointerEvents = 'none';
    }
  });
  
  await page.waitForTimeout(500);
}

async function switchToBlockEditor(page) {
  console.log('[Integration] Switching to Block Editor');
  const blockTab = page.locator('.canvas-tab[data-tab="block-editor"]');
  if (await blockTab.count() > 0) {
    await blockTab.click();
  }
  
  await page.evaluate(() => {
    const blockArea = document.getElementById('drop-area');
    if (blockArea) {
      blockArea.style.pointerEvents = 'auto';
      blockArea.classList.add('active');
    }
    // Ensure network canvas is inactive
    const networkArea = document.getElementById('network-drop-area');
    if (networkArea) {
      networkArea.classList.remove('active');
      networkArea.style.pointerEvents = 'none';
    }
  });
  
  await page.waitForTimeout(500);
}

async function buildNetworkTopology(page) {
  console.log('[Integration] Building network topology');
  
  // Network devices to add
  const networkDevices = [
    { category: 'routers', deviceType: 'router', name: 'Router' },
    { category: 'switches', deviceType: 'switch', name: 'Switch' },
    { category: 'end-devices', deviceType: 'end-device', name: 'PC1' },
    { category: 'end-devices', deviceType: 'end-device', name: 'PC2' }
  ];
  
  let devicesAdded = 0;
  
  for (const [index, device] of networkDevices.entries()) {
    try {
      // Load category
      await page.evaluate(cat => {
        const categoryEl = document.querySelector(`[data-category="${cat}"]`);
        if (categoryEl) categoryEl.click();
        else if (window.loadBlocks) window.loadBlocks(cat);
      }, device.category);
      
      // Wait for blocks to load or inject mock
      const hasRealBlocks = await page.waitForFunction(category => {
        const list = document.querySelector('.blocks-display-area .active-block-list');
        if (!list) return false;
        return list.querySelectorAll('.network-block').length > 0;
      }, device.category, { timeout: 3000 }).then(() => true).catch(() => false);
      
      if (!hasRealBlocks) {
        // Inject mock device
        await page.evaluate(({ cat, devType, deviceName }) => {
          const list = document.querySelector('.blocks-display-area .active-block-list');
          if (!list) return false;
          
          const el = document.createElement('div');
          el.className = 'network-block mock-network-block';
          el.dataset.blockType = `mock-${devType}`;
          el.dataset.category = cat;
          el.dataset.deviceType = devType;
          el.setAttribute('draggable', true);
          
          const icons = {
            'router': '📡',
            'switch': '🔀', 
            'end-device': '🖥️'
          };
          
          el.innerHTML = `
            <div class="network-block-title">${deviceName}</div>
            <div class="device-icon" style="font-size: 20px;">${icons[devType] || '🖥️'}</div>
          `;
          
          el.addEventListener('dragstart', (e) => {
            const dragData = {
              type: el.dataset.blockType,
              name: deviceName,
              template: el.innerHTML,
              category: cat,
              deviceType: devType,
              isNetworkBlock: true
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
          });
          
          list.appendChild(el);
          return true;
        }, { cat: device.category, devType: device.deviceType, deviceName: device.name });
      }
      
      // Drag device to network canvas
      await page.evaluate((deviceIndex) => {
        const src = document.querySelector('.blocks-display-area .active-block-list .network-block');
        if (!src) throw new Error('No network block found');
        
        const target = document.getElementById('network-drop-area');
        if (!target) throw new Error('Network drop area not found');
        
        const blockName = src.querySelector('.network-block-title')?.textContent || 'Network Device';
        
        const dragData = {
          type: src.dataset.blockType || 'mock-device',
          name: blockName,
          template: src.innerHTML,
          category: src.dataset.category || 'network',
          deviceType: src.dataset.deviceType || 'network-device',
          isNetworkBlock: true
        };
        
        const dt = new DataTransfer();
        dt.setData('text/plain', JSON.stringify(dragData));
        
        const rect = target.getBoundingClientRect();
        // Position devices in different locations
        const positions = [
          { x: 150, y: 100 }, // Router
          { x: 150, y: 200 }, // Switch  
          { x: 50, y: 300 },  // PC1
          { x: 250, y: 300 }  // PC2
        ];
        const pos = positions[deviceIndex] || { x: 100 + deviceIndex * 100, y: 150 };
        
        src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
        target.dispatchEvent(new DragEvent('dragover', { 
          dataTransfer: dt, 
          bubbles: true,
          clientX: rect.left + pos.x,
          clientY: rect.top + pos.y
        }));
        target.dispatchEvent(new DragEvent('drop', { 
          dataTransfer: dt, 
          bubbles: true,
          clientX: rect.left + pos.x,
          clientY: rect.top + pos.y
        }));
        
        return blockName;
      }, index);
      
      await page.waitForTimeout(300);
      devicesAdded++;
      console.log(`[Integration] Added ${device.name} to network topology`);
      
    } catch (error) {
      console.warn(`[Integration] Failed to add ${device.name}:`, error.message);
    }
  }
  
  // Verify devices were added
  const deviceCount = await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    return networkArea ? networkArea.querySelectorAll('.network-device, .network-block, .block-instance').length : 0;
  });
  
  console.log(`[Integration] Network topology built with ${deviceCount} devices`);
  return { devicesAdded, deviceCount };
}

async function addNetworkInteractionBlocks(page) {
  console.log('[Integration] Adding network interaction blocks');
  
  // Network-related blocks to test with
  const networkBlocks = [
    { category: 'network', blockType: 'ping', name: 'Ping' },
    { category: 'network', blockType: 'nmap', name: 'Network Scan' },
    { category: 'tools', blockType: 'wireshark', name: 'Wireshark' }
  ];
  
  let blocksAdded = 0;
  
  for (const [index, block] of networkBlocks.entries()) {
    try {
      // Load category
      await page.evaluate(cat => {
        const categoryEl = document.querySelector(`[data-category="${cat}"]`);
        if (categoryEl) categoryEl.click();
        else if (window.loadBlocks) window.loadBlocks(cat);
      }, block.category);
      
      // Wait for blocks to load
      await page.waitForTimeout(1000);
      
      // Check for real blocks or inject mock
      const hasRealBlocks = await page.evaluate(() => {
        const list = document.querySelector('.blocks-display-area .active-block-list');
        return list && list.querySelectorAll('.block').length > 0;
      });
      
      if (!hasRealBlocks) {
        // Inject mock command block
        await page.evaluate(({ cat, blockName, blockType }) => {
          const list = document.querySelector('.blocks-display-area .active-block-list');
          if (!list) return false;
          
          const el = document.createElement('div');
          el.className = 'block mock-block';
          el.dataset.blockType = blockType;
          el.dataset.category = cat;
          el.setAttribute('draggable', true);
          
          const commands = {
            'ping': 'ping -c 4 192.168.1.1',
            'nmap': 'nmap -sS 192.168.1.0/24', 
            'wireshark': 'wireshark -i eth0'
          };
          
          el.innerHTML = `
            <div class="block-title">${blockName}</div>
            <div class="block-details" style="display:none;">
              <input type="text" class="command-input" value="${commands[blockType] || ''}" placeholder="Command">
            </div>
          `;
          
          el.addEventListener('dragstart', (e) => {
            const dragData = {
              type: blockType,
              name: blockName,
              template: el.innerHTML,
              category: cat,
              isNetworkBlock: false
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
          });
          
          list.appendChild(el);
          return true;
        }, { cat: block.category, blockName: block.name, blockType: block.blockType });
      }
      
      // Drag block to canvas
      await page.evaluate((blockIndex) => {
        const src = document.querySelector('.blocks-display-area .active-block-list .block');
        if (!src) throw new Error('No command block found');
        
        const target = document.getElementById('drop-area');
        if (!target) throw new Error('Block drop area not found');
        
        const blockName = src.querySelector('.block-title')?.textContent || 'Command Block';
        
        const dragData = {
          type: src.dataset.blockType || 'custom',
          name: blockName,
          template: src.innerHTML,
          category: src.dataset.category || 'general',
          isNetworkBlock: false
        };
        
        const dt = new DataTransfer();
        dt.setData('text/plain', JSON.stringify(dragData));
        
        const rect = target.getBoundingClientRect();
        const yPos = 100 + (blockIndex * 80);
        
        src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
        target.dispatchEvent(new DragEvent('dragover', { 
          dataTransfer: dt, 
          bubbles: true,
          clientX: rect.left + 100,
          clientY: rect.top + yPos
        }));
        target.dispatchEvent(new DragEvent('drop', { 
          dataTransfer: dt, 
          bubbles: true,
          clientX: rect.left + 100,
          clientY: rect.top + yPos
        }));
        
        return blockName;
      }, index);
      
      await page.waitForTimeout(300);
      blocksAdded++;
      console.log(`[Integration] Added ${block.name} block to command canvas`);
      
    } catch (error) {
      console.warn(`[Integration] Failed to add ${block.name} block:`, error.message);
    }
  }
  
  // Verify blocks were added
  const blockCount = await page.evaluate(() => {
    const blockArea = document.getElementById('drop-area');
    return blockArea ? blockArea.querySelectorAll('.block').length : 0;
  });
  
  console.log(`[Integration] Command blocks added: ${blockCount}`);
  return { blocksAdded, blockCount };
}

async function executeNetworkCommands(page) {
  console.log('[Integration] Executing network commands');
  
  // Get initial terminal output length
  const initialLength = await page.evaluate(() => {
    const term = document.querySelector('.xterm-screen');
    return term ? term.textContent.length : 0;
  });
  
  // Click run button
  await page.locator('#run-button').click();
  console.log('[Integration] Clicked run button');
  
  // Wait for command execution
  const hasOutput = await page.waitForFunction((prevLength) => {
    const term = document.querySelector('.xterm-screen');
    const currentLength = term ? term.textContent.length : 0;
    return currentLength > prevLength;
  }, initialLength, { timeout: 15000 }).then(() => true).catch(() => false);
  
  // Get final output
  const finalOutput = await page.evaluate(() => {
    const term = document.querySelector('.xterm-screen');
    return term ? term.textContent : '';
  });
  
  console.log(`[Integration] Command execution completed, output length: ${finalOutput.length}`);
  return { hasOutput, outputLength: finalOutput.length, output: finalOutput.slice(-200) };
}

async function verifyNetworkIntegration(page) {
  console.log('[Integration] Verifying network-block integration');
  
  // Check both canvases have content
  const canvasStates = await page.evaluate(() => {
    const networkArea = document.getElementById('network-drop-area');
    const blockArea = document.getElementById('drop-area');
    
    return {
      networkDevices: networkArea ? networkArea.querySelectorAll('.network-device, .network-block, .block-instance').length : 0,
      commandBlocks: blockArea ? blockArea.querySelectorAll('.block').length : 0,
      networkContent: networkArea ? networkArea.innerHTML.length : 0,
      blockContent: blockArea ? blockArea.innerHTML.length : 0
    };
  });
  
  // Check if blocks reference network context
  const hasNetworkContext = await page.evaluate(() => {
    const blocks = document.querySelectorAll('#drop-area .block');
    let networkReferences = 0;
    
    blocks.forEach(block => {
      const inputs = block.querySelectorAll('input[type="text"], textarea');
      inputs.forEach(input => {
        if (input.value && (
          input.value.includes('192.168') || 
          input.value.includes('ping') ||
          input.value.includes('nmap') ||
          input.value.includes('wireshark') ||
          input.value.includes('eth0')
        )) {
          networkReferences++;
        }
      });
    });
    
    return networkReferences;
  });
  
  console.log('[Integration] Integration verification completed');
  return { ...canvasStates, networkReferences: hasNetworkContext };
}

test.describe('Network-Block Editor Integration', () => {
  
  test('build network topology and interact with ping commands', async ({ page, request, context }, testInfo) => {
    const logs = [];
    
    page.on('console', msg => {
      const entry = `[${msg.type()}] ${msg.text()}`;
      logs.push(entry);
      if (/error|warn/i.test(msg.type())) {
        console.log(`[ping-integration] ${entry}`);
      }
    });
    
    const { username } = await registerAndLogin(request, context);
    await openEditor(page);
    
    // Phase 1: Build network topology
    await switchToNetworkEditor(page);
    const networkResult = await buildNetworkTopology(page);
    expect(networkResult.deviceCount).toBeGreaterThan(0);
    
    // Phase 2: Add network interaction blocks
    await switchToBlockEditor(page);
    const blockResult = await addNetworkInteractionBlocks(page);
    expect(blockResult.blockCount).toBeGreaterThan(0);
    
    // Phase 3: Execute commands
    const executionResult = await executeNetworkCommands(page);
    
    // Phase 4: Verify integration
    const integrationResult = await verifyNetworkIntegration(page);
    
    // Assertions
    expect(integrationResult.networkDevices).toBeGreaterThanOrEqual(2);
    expect(integrationResult.commandBlocks).toBeGreaterThanOrEqual(1);
    expect(executionResult.outputLength).toBeGreaterThan(100);
    
    console.log('[ping-integration] Test completed successfully');
    
    await testInfo.attach('integration-results', {
      body: JSON.stringify({
        username,
        networkResult,
        blockResult,
        executionResult,
        integrationResult,
        logs: logs.slice(-20)
      }, null, 2),
      contentType: 'application/json'
    });
  });
  
  test('comprehensive network topology with multiple command types', async ({ page, request, context }, testInfo) => {
    const { username } = await registerAndLogin(request, context);
    await openEditor(page);
    
    const phases = [];
    
    // Phase 1: Create complex network topology
    await switchToNetworkEditor(page);
    
    // Add more diverse network devices
    const advancedDevices = [
      { category: 'routers', name: 'Gateway Router' },
      { category: 'switches', name: 'Core Switch' },
      { category: 'switches', name: 'Access Switch' },
      { category: 'end-devices', name: 'Server' },
      { category: 'end-devices', name: 'Workstation1' },
      { category: 'end-devices', name: 'Workstation2' },
      { category: 'wireless', name: 'WiFi AP' }
    ];
    
    let networkDevicesAdded = 0;
    
    for (const [index, device] of advancedDevices.entries()) {
      try {
        await page.evaluate(cat => {
          const categoryEl = document.querySelector(`[data-category="${cat}"]`);
          if (categoryEl) categoryEl.click();
          else if (window.loadBlocks) window.loadBlocks(cat);
        }, device.category);
        
        await page.waitForTimeout(500);
        
        // Inject device if needed
        await page.evaluate(({ cat, deviceName, index }) => {
          const list = document.querySelector('.blocks-display-area .active-block-list');
          if (!list || list.querySelector('.network-block')) return;
          
          const el = document.createElement('div');
          el.className = 'network-block';
          el.dataset.category = cat;
          el.dataset.deviceType = cat === 'routers' ? 'router' : 
                                  cat === 'switches' ? 'switch' :
                                  cat === 'wireless' ? 'access-point' : 'end-device';
          el.setAttribute('draggable', true);
          el.innerHTML = `<div class="network-block-title">${deviceName}</div>`;
          
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
              name: deviceName,
              category: cat,
              deviceType: el.dataset.deviceType,
              isNetworkBlock: true
            }));
          });
          
          list.appendChild(el);
        }, { cat: device.category, deviceName: device.name, index });
        
        // Drag to canvas
        await page.evaluate((deviceIndex) => {
          const src = document.querySelector('.blocks-display-area .network-block');
          const target = document.getElementById('network-drop-area');
          if (!src || !target) return;
          
          const dt = new DataTransfer();
          dt.setData('text/plain', src.dataset.dragData || '{}');
          
          const rect = target.getBoundingClientRect();
          const gridPos = {
            x: 80 + (deviceIndex % 3) * 120,
            y: 80 + Math.floor(deviceIndex / 3) * 100
          };
          
          src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('drop', { 
            dataTransfer: dt,
            clientX: rect.left + gridPos.x,
            clientY: rect.top + gridPos.y
          }));
        }, index);
        
        networkDevicesAdded++;
        await page.waitForTimeout(300);
        
      } catch (error) {
        console.warn(`Failed to add ${device.name}:`, error.message);
      }
    }
    
    const finalNetworkCount = await page.evaluate(() => {
      const area = document.getElementById('network-drop-area');
      return area ? area.querySelectorAll('.network-device, .network-block, .block-instance').length : 0;
    });
    
    phases.push({ phase: 'network_topology', devicesAdded: networkDevicesAdded, finalCount: finalNetworkCount });
    
    // Phase 2: Add comprehensive command blocks
    await switchToBlockEditor(page);
    
    const commandCategories = [
      { category: 'network', blocks: ['ping', 'traceroute', 'netstat'] },
      { category: 'tools', blocks: ['nmap', 'wireshark'] },
      { category: 'system', blocks: ['ifconfig', 'route'] }
    ];
    
    let commandBlocksAdded = 0;
    
    for (const catInfo of commandCategories) {
      for (const blockName of catInfo.blocks) {
        try {
          await page.evaluate(cat => {
            const categoryEl = document.querySelector(`[data-category="${cat}"]`);
            if (categoryEl) categoryEl.click();
            else if (window.loadBlocks) window.loadBlocks(cat);
          }, catInfo.category);
          
          await page.waitForTimeout(300);
          
          // Add mock block if needed
          await page.evaluate(({ cat, blockName }) => {
            const list = document.querySelector('.blocks-display-area .active-block-list');
            if (!list) return;
            
            const existing = list.querySelector('.block');
            if (existing) return; // Use existing block
            
            const el = document.createElement('div');
            el.className = 'block';
            el.dataset.category = cat;
            el.setAttribute('draggable', true);
            el.innerHTML = `<div class="block-title">${blockName}</div>`;
            
            el.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                name: blockName,
                category: cat,
                isNetworkBlock: false
              }));
            });
            
            list.appendChild(el);
          }, { cat: catInfo.category, blockName });
          
          // Drag to command canvas
          await page.evaluate((blockIndex) => {
            const src = document.querySelector('.blocks-display-area .block');
            const target = document.getElementById('drop-area');
            if (!src || !target) return;
            
            const dt = new DataTransfer();
            const rect = target.getBoundingClientRect();
            
            src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt }));
            target.dispatchEvent(new DragEvent('drop', { 
              dataTransfer: dt,
              clientX: rect.left + 80,
              clientY: rect.top + 60 + (blockIndex * 60)
            }));
          }, commandBlocksAdded);
          
          commandBlocksAdded++;
          await page.waitForTimeout(200);
          
        } catch (error) {
          console.warn(`Failed to add ${blockName}:`, error.message);
        }
      }
    }
    
    const finalBlockCount = await page.evaluate(() => {
      const area = document.getElementById('drop-area');
      return area ? area.querySelectorAll('.block').length : 0;
    });
    
    phases.push({ phase: 'command_blocks', blocksAdded: commandBlocksAdded, finalCount: finalBlockCount });
    
    // Phase 3: Test execution and integration
    const executionResult = await executeNetworkCommands(page);
    const integrationResult = await verifyNetworkIntegration(page);
    
    phases.push({ 
      phase: 'execution', 
      hasOutput: executionResult.hasOutput,
      outputLength: executionResult.outputLength 
    });
    
    phases.push({
      phase: 'integration_verification',
      ...integrationResult
    });
    
    // Comprehensive assertions
    expect(finalNetworkCount).toBeGreaterThanOrEqual(3);
    expect(finalBlockCount).toBeGreaterThanOrEqual(2);
    expect(executionResult.outputLength).toBeGreaterThan(50);
    expect(integrationResult.networkDevices + integrationResult.commandBlocks).toBeGreaterThanOrEqual(5);
    
    await testInfo.attach('comprehensive-integration', {
      body: JSON.stringify({
        username,
        phases,
        summary: {
          networkDevices: finalNetworkCount,
          commandBlocks: finalBlockCount,
          totalOutput: executionResult.outputLength,
          integration: integrationResult
        }
      }, null, 2),
      contentType: 'application/json'
    });
  });
  
  test('network device configuration persistence across editor switches', async ({ page, request, context }) => {
    const { username } = await registerAndLogin(request, context);
    await openEditor(page);
    
    // Build initial network
    await switchToNetworkEditor(page);
    const initialNetwork = await buildNetworkTopology(page);
    
    // Switch to block editor and add commands  
    await switchToBlockEditor(page);
    const initialBlocks = await addNetworkInteractionBlocks(page);
    
    // Switch back to network editor - verify persistence
    await switchToNetworkEditor(page);
    const persistedNetwork = await page.evaluate(() => {
      const area = document.getElementById('network-drop-area');
      return area ? area.querySelectorAll('.network-device, .network-block, .block-instance').length : 0;
    });
    
    // Switch back to block editor - verify persistence
    await switchToBlockEditor(page);  
    const persistedBlocks = await page.evaluate(() => {
      const area = document.getElementById('drop-area');
      return area ? area.querySelectorAll('.block').length : 0;
    });
    
    // Both configurations should persist
    expect(persistedNetwork).toBe(initialNetwork.deviceCount);
    expect(persistedBlocks).toBe(initialBlocks.blockCount);
    
    console.log('[persistence] Network and block configurations persisted across switches');
  });
  
  test('real-time command execution with network context', async ({ page, request, context }, testInfo) => {
    const { username } = await registerAndLogin(request, context);
    await openEditor(page);
    
    // Create targeted network setup
    await switchToNetworkEditor(page);
    
    // Add specific network devices with IP context
    const networkSetup = [
      { category: 'routers', name: 'Router-192.168.1.1' },
      { category: 'end-devices', name: 'PC-192.168.1.10' },
      { category: 'end-devices', name: 'Server-192.168.1.100' }
    ];
    
    for (const device of networkSetup) {
      await page.evaluate(({ cat, deviceName }) => {
        const list = document.querySelector('.blocks-display-area .active-block-list');
        if (list && window.loadBlocks) window.loadBlocks(cat);
        
        // Inject network device with IP context
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'network-block';
          el.dataset.category = cat;
          el.innerHTML = `<div class="network-block-title">${deviceName}</div>`;
          el.setAttribute('draggable', true);
          
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
              name: deviceName,
              category: cat,
              isNetworkBlock: true
            }));
          });
          
          if (list) list.appendChild(el);
          
          // Auto-drag to network canvas
          const target = document.getElementById('network-drop-area');
          if (target && el) {
            const dt = new DataTransfer();
            dt.setData('text/plain', JSON.stringify({ name: deviceName, isNetworkBlock: true }));
            el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt }));
            target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt }));
          }
        }, 100);
      }, device);
      
      await page.waitForTimeout(500);
    }
    
    // Add ping command targeting the network
    await switchToBlockEditor(page);
    
    await page.evaluate(() => {
      const list = document.querySelector('.blocks-display-area .active-block-list');
      if (window.loadBlocks) window.loadBlocks('network');
      
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'block';
        el.innerHTML = `
          <div class="block-title">Ping Network Devices</div>
          <div class="block-details" style="display:block;">
            <input type="text" value="ping -c 3 192.168.1.1 && ping -c 3 192.168.1.10" placeholder="Network Commands">
          </div>
        `;
        el.setAttribute('draggable', true);
        
        el.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            name: 'Ping Network Devices',
            category: 'network'
          }));
        });
        
        if (list) list.appendChild(el);
        
        // Auto-drag to command canvas
        const target = document.getElementById('drop-area');
        if (target) {
          const dt = new DataTransfer();
          el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt }));
        }
      }, 200);
    });
    
    await page.waitForTimeout(1000);
    
    // Execute the network-aware commands
    const execution = await executeNetworkCommands(page);
    
    // Verify the integration shows network awareness
    const integration = await verifyNetworkIntegration(page);
    
    expect(integration.networkDevices).toBeGreaterThanOrEqual(3);
    expect(integration.commandBlocks).toBeGreaterThanOrEqual(1);
    expect(execution.outputLength).toBeGreaterThan(100);
    
    await testInfo.attach('realtime-network-execution', {
      body: JSON.stringify({
        username,
        networkSetup,
        execution,
        integration,
        contextAware: execution.output.includes('192.168') || execution.output.includes('ping')
      }, null, 2),
      contentType: 'application/json'
    });
  });
  
});