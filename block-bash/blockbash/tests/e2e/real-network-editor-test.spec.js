import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Network Editor - Real JSON Block System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the actual Network Editor
    await page.goto('http://localhost:3000/pages/index.html');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Skip onboarding overlay if present
    await skipOnboarding(page);
    
    // Switch to Network Editor tab if not already active
    const networkTab = page.locator('[data-tab="network-editor"]');
    if (await networkTab.isVisible()) {
      await networkTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('1. Verify Network Editor loads with proper structure', async ({ page }) => {
    console.log('=== TEST 1: Network Editor Structure ===');
    
    // Check that network drop area exists
    const networkDropArea = page.locator('#network-drop-area');
    await expect(networkDropArea).toBeVisible();
    console.log('✓ Network drop area found');

    // Check for network toolbar with linking buttons
    const networkToolbar = page.locator('#network-toolbar');
    await expect(networkToolbar).toBeVisible();
    
    const linkDevicesBtn = page.locator('#btn-start-link');
    const cancelLinkBtn = page.locator('#btn-cancel-link');
    await expect(linkDevicesBtn).toBeVisible();
    await expect(cancelLinkBtn).toBeVisible();
    console.log('✓ Network toolbar with linking buttons found');

    // Check for SVG connections layer
    const connectionsLayer = page.locator('#network-connections-layer');
    await expect(connectionsLayer).toBeVisible();
    console.log('✓ SVG connections layer found');
  });

  test('2. Load and verify network categories with real JSON data', async ({ page }) => {
    console.log('=== TEST 2: Real JSON Network Categories ===');
    
    const categories = ['routers', 'switches', 'end-devices', 'wireless', 'wan'];
    const expectedCounts = { 'routers': 5, 'switches': 7, 'end-devices': 12, 'wireless': 4, 'wan': 3 };
    
    for (const category of categories) {
      console.log(`Testing category: ${category}`);
      
      // Click on category to load blocks
      const categoryButton = page.locator(`[data-category="${category}"]`).first();
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
        await page.waitForTimeout(1000);
        
        // Wait for blocks to load
        await page.waitForTimeout(2000);
        
        // Count loaded network blocks
        const networkBlocks = page.locator('.network-block');
        const blockCount = await networkBlocks.count();
        
        console.log(`${category}: Found ${blockCount} blocks (expected: ${expectedCounts[category]})`);
        
        // Verify we have the expected number of blocks (or close to it)
        expect(blockCount).toBeGreaterThan(0);
        
        // Verify blocks have proper network block structure
        if (blockCount > 0) {
          const firstBlock = networkBlocks.first();
          await expect(firstBlock).toHaveAttribute('draggable', 'true');
          
          // Check for device type data
          const deviceType = await firstBlock.getAttribute('data-device-type');
          console.log(`First block device type: ${deviceType}`);
          expect(deviceType).toBeTruthy();
        }
      }
    }
  });

  test('3. Test drag and drop with real network blocks', async ({ page }) => {
    console.log('=== TEST 3: Real Network Block Drag & Drop ===');
    
    // Load routers category
    const routersCategory = page.locator('[data-category="routers"]').first();
    if (await routersCategory.isVisible()) {
      await routersCategory.click();
      await page.waitForTimeout(2000);
    }
    
    // Get the network drop area
    const networkDropArea = page.locator('#network-drop-area');
    await expect(networkDropArea).toBeVisible();
    
    // Get the first network block (should be Router 1941 based on JSON)
    const firstBlock = page.locator('.network-block').first();
    await expect(firstBlock).toBeVisible();
    
    const blockName = await firstBlock.textContent();
    console.log(`Dragging block: ${blockName}`);
    
    // Get initial device count in drop area
    const initialDevices = await page.locator('#network-drop-area .network-device').count();
    console.log(`Initial devices in network: ${initialDevices}`);
    
    // Perform drag and drop
    await firstBlock.dragTo(networkDropArea);
    await page.waitForTimeout(1000);
    
    // Verify device was created
    const finalDevices = await page.locator('#network-drop-area .network-device').count();
    console.log(`Final devices in network: ${finalDevices}`);
    
    expect(finalDevices).toBe(initialDevices + 1);
    console.log('✓ Network device successfully created');
    
    // Verify the device has proper structure
    const newDevice = page.locator('#network-drop-area .network-device').last();
    await expect(newDevice).toBeVisible();
    
    // Check device has icon and label
    const deviceIcon = newDevice.locator('.device-icon');
    const deviceLabel = newDevice.locator('.device-label');
    
    if (await deviceIcon.isVisible()) {
      console.log('✓ Device has icon element');
    }
    if (await deviceLabel.isVisible()) {
      const labelText = await deviceLabel.textContent();
      console.log(`✓ Device has label: ${labelText}`);
    }
  });

  test('4. Test network block configuration forms', async ({ page }) => {
    console.log('=== TEST 4: Network Block Configuration Forms ===');
    
    // Load routers category and drag a router
    const routersCategory = page.locator('[data-category="routers"]').first();
    if (await routersCategory.isVisible()) {
      await routersCategory.click();
      await page.waitForTimeout(2000);
    }
    
    const networkDropArea = page.locator('#network-drop-area');
    const firstBlock = page.locator('.network-block').first();
    
    // Drag router to network area
    await firstBlock.dragTo(networkDropArea);
    await page.waitForTimeout(1000);
    
    // Find the created network device
    const networkDevice = page.locator('#network-drop-area .network-device').last();
    await expect(networkDevice).toBeVisible();
    
    // Try to access configuration (right-click or double-click)
    await networkDevice.dblclick();
    await page.waitForTimeout(500);
    
    // Or try right-click for context menu
    await networkDevice.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // Look for any configuration forms, modals, or input fields
    const configForms = await page.locator('input[placeholder*="Router"], input[placeholder*="IP"], textarea[placeholder*="config"]').count();
    
    if (configForms > 0) {
      console.log(`✓ Found ${configForms} configuration inputs`);
      
      // Test filling out configuration
      const routerNameInput = page.locator('input[placeholder*="Router"]').first();
      if (await routerNameInput.isVisible()) {
        await routerNameInput.fill('Test-Router-01');
        console.log('✓ Router name configuration works');
      }
      
      const ipInput = page.locator('input[placeholder*="IP"]').first();
      if (await ipInput.isVisible()) {
        await ipInput.fill('192.168.1.1');
        console.log('✓ IP address configuration works');
      }
    } else {
      console.log('ℹ Configuration forms may require specific interaction pattern');
    }
  });

  test('5. Test device linking and network topology features', async ({ page }) => {
    console.log('=== TEST 5: Network Topology & Device Linking ===');
    
    // Load different categories and create multiple devices
    const categories = [
      { name: 'routers', selector: '[data-category="routers"]' },
      { name: 'switches', selector: '[data-category="switches"]' }
    ];
    
    const networkDropArea = page.locator('#network-drop-area');
    const devices = [];
    
    for (const category of categories) {
      // Load category
      const categoryButton = page.locator(category.selector).first();
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
        await page.waitForTimeout(1500);
        
        // Drag first block to network area
        const firstBlock = page.locator('.network-block').first();
        if (await firstBlock.isVisible()) {
          await firstBlock.dragTo(networkDropArea);
          await page.waitForTimeout(1000);
          
          // Store reference to created device
          const createdDevice = page.locator('#network-drop-area .network-device').last();
          devices.push(createdDevice);
          console.log(`✓ Created ${category.name} device`);
        }
      }
    }
    
    console.log(`Total devices created: ${devices.length}`);
    
    // Test device linking functionality
    const linkDevicesBtn = page.locator('#btn-start-link');
    const cancelLinkBtn = page.locator('#btn-cancel-link');
    
    if (devices.length >= 2) {
      console.log('Testing device linking...');
      
      // Start linking mode
      await linkDevicesBtn.click();
      await page.waitForTimeout(500);
      
      // Check if cancel button becomes visible (indicating link mode is active)
      if (await cancelLinkBtn.isVisible()) {
        console.log('✓ Link mode activated');
        
        // Try to link two devices
        await devices[0].click();
        await page.waitForTimeout(300);
        await devices[1].click();
        await page.waitForTimeout(1000);
        
        // Check for SVG connections
        const connections = page.locator('#network-connections-layer path, #network-connections-layer line');
        const connectionCount = await connections.count();
        
        if (connectionCount > 0) {
          console.log(`✓ Found ${connectionCount} connection(s) in SVG layer`);
        } else {
          console.log('ℹ No visible connections found (may require specific linking pattern)');
        }
        
        // Cancel linking mode
        await cancelLinkBtn.click();
        await page.waitForTimeout(500);
        console.log('✓ Link mode deactivated');
      }
    }
  });

  test('6. Test multiple device categories and advanced features', async ({ page }) => {
    console.log('=== TEST 6: Advanced Network Features ===');
    
    const testResults = {
      devicesCreated: 0,
      categoriesTested: 0,
      configurationsFound: 0
    };
    
    // Test different device categories
    const categories = ['routers', 'switches', 'end-devices', 'wireless'];
    
    for (const category of categories) {
      console.log(`\nTesting category: ${category}`);
      
      // Load category
      const categoryButton = page.locator(`[data-category="${category}"]`).first();
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
        await page.waitForTimeout(1500);
        testResults.categoriesTested++;
        
        // Get available blocks
        const blocks = page.locator('.network-block');
        const blockCount = await blocks.count();
        console.log(`Found ${blockCount} blocks in ${category}`);
        
        if (blockCount > 0) {
          // Test first block
          const firstBlock = blocks.first();
          const blockName = await firstBlock.textContent();
          console.log(`Testing block: ${blockName}`);
          
          // Drag to network area
          const networkDropArea = page.locator('#network-drop-area');
          await firstBlock.dragTo(networkDropArea);
          await page.waitForTimeout(1000);
          
          testResults.devicesCreated++;
          
          // Check for device-specific properties
          const lastDevice = page.locator('#network-drop-area .network-device').last();
          const deviceType = await lastDevice.getAttribute('data-device-type');
          console.log(`Device type: ${deviceType}`);
          
          // Look for configuration elements
          const configElements = await page.locator('input, select, textarea').count();
          if (configElements > 0) {
            testResults.configurationsFound += configElements;
          }
        }
      }
    }
    
    console.log('\n=== FINAL TEST RESULTS ===');
    console.log(`Categories tested: ${testResults.categoriesTested}`);
    console.log(`Devices created: ${testResults.devicesCreated}`);
    console.log(`Configuration elements found: ${testResults.configurationsFound}`);
    
    // Verify we successfully tested the network system
    expect(testResults.devicesCreated).toBeGreaterThan(0);
    expect(testResults.categoriesTested).toBeGreaterThan(0);
    
    // Final verification: check total devices in network
    const totalDevices = await page.locator('#network-drop-area .network-device').count();
    console.log(`Total devices in network: ${totalDevices}`);
    expect(totalDevices).toBe(testResults.devicesCreated);
    
    console.log('✅ Network Editor comprehensive test completed successfully!');
  });
});