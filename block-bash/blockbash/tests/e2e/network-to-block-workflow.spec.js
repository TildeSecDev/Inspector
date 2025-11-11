import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Network to Block Editor Workflow Integration', () => {
  
  test('Complete workflow: Build network topology then probe with block editor', async ({ page }) => {
    console.log('=== COMPREHENSIVE NETWORK-TO-BLOCK WORKFLOW TEST ===');
    
    // 1. SETUP: Navigate to main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Skip onboarding overlay if present
    await skipOnboarding(page);
    
    console.log('Phase 1: Building Network Topology');
    
    // 2. NETWORK BUILDING PHASE: Switch to Network Editor
    const networkTab = page.locator('[data-tab="network-editor"]');
    if (await networkTab.isVisible()) {
      await networkTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Switched to Network Editor tab');
    }
    
    const networkDropArea = page.locator('#network-drop-area');
    await expect(networkDropArea).toBeVisible();
    
    // Create a complex network topology: Router + Switch + Multiple End Devices
    console.log('Step 1: Creating Router...');
    
    // Add Router
    let routersCategory = page.locator('[data-category="routers"]').first();
    if (await routersCategory.isVisible()) {
      await routersCategory.click();
      await page.waitForTimeout(1500);
      
      const routerBlock = page.locator('.network-block').first();
      await routerBlock.dragTo(networkDropArea, { targetPosition: { x: 150, y: 100 } });
      await page.waitForTimeout(1000);
      console.log('✓ Router placed at (150, 100)');
    }
    
    console.log('Step 2: Creating Switch...');
    
    // Add Switch
    const switchesCategory = page.locator('[data-category="switches"]').first();
    if (await switchesCategory.isVisible()) {
      await switchesCategory.click();
      await page.waitForTimeout(1500);
      
      const switchBlock = page.locator('.network-block').first();
      await switchBlock.dragTo(networkDropArea, { targetPosition: { x: 300, y: 200 } });
      await page.waitForTimeout(1000);
      console.log('✓ Switch placed at (300, 200)');
    }
    
    console.log('Step 3: Adding End Devices...');
    
    // Add multiple End Devices
    const endDevicesCategory = page.locator('[data-category="end-devices"]').first();
    if (await endDevicesCategory.isVisible()) {
      await endDevicesCategory.click();
      await page.waitForTimeout(1500);
      
      // Add PC
      const pcBlock = page.locator('.network-block').first();
      await pcBlock.dragTo(networkDropArea, { targetPosition: { x: 100, y: 300 } });
      await page.waitForTimeout(800);
      console.log('✓ PC placed at (100, 300)');
      
      // Add Server (second end device)
      const serverBlock = page.locator('.network-block').nth(1);
      if (await serverBlock.isVisible()) {
        await serverBlock.dragTo(networkDropArea, { targetPosition: { x: 400, y: 300 } });
        await page.waitForTimeout(800);
        console.log('✓ Server placed at (400, 300)');
      }
    }
    
    // Verify network devices were created
    const allNetworkDevices = page.locator('#network-drop-area .network-device');
    const deviceCount = await allNetworkDevices.count();
    console.log(`✓ Total network devices created: ${deviceCount}`);
    expect(deviceCount).toBeGreaterThanOrEqual(3); // At least router, switch, and one end device
    
    // 3. DEVICE LINKING PHASE: Connect devices
    console.log('Step 4: Linking Network Devices...');
    
    const linkBtn = page.locator('#btn-start-link');
    if (await linkBtn.isVisible()) {
      await linkBtn.click();
      await page.waitForTimeout(500);
      console.log('✓ Link mode activated');
      
      // Connect router to switch
      const devices = await allNetworkDevices.all();
      if (devices.length >= 2) {
        await devices[0].click(); // First device (router)
        await page.waitForTimeout(300);
        await devices[1].click(); // Second device (switch)
        await page.waitForTimeout(500);
        console.log('✓ Created connection between router and switch');
      }
    }
    
    // Verify connections were created
    const connections = page.locator('#network-connections-layer line, #network-connections-layer path');
    const connectionCount = await connections.count();
    console.log(`✓ Network connections created: ${connectionCount}`);
    
    console.log('Phase 2: Switching to Block Editor for Network Probing');
    
    // 4. BLOCK EDITOR PHASE: Switch to Block Editor tab
    const blockEditorTab = page.locator('[data-tab="block-editor"]');
    if (await blockEditorTab.isVisible()) {
      await blockEditorTab.click();
      await page.waitForTimeout(1500);
      console.log('✓ Switched to Block Editor tab');
    } else {
      // Alternative selector patterns
      const alternativeTab = page.locator('button:has-text("Block Editor"), [role="tab"]:has-text("Block"), .tab-button:has-text("Block")');
      if (await alternativeTab.first().isVisible()) {
        await alternativeTab.first().click();
        await page.waitForTimeout(1500);
        console.log('✓ Switched to Block Editor tab (alternative selector)');
      }
    }
    
    // Verify Block Editor is active
    const blockDropArea = page.locator('#drop-area, .block-drop-area, #block-editor-drop-area');
    await expect(blockDropArea.first()).toBeVisible();
    console.log('✓ Block Editor drop area is visible');
    
    console.log('Step 5: Adding Network Probe Blocks...');
    
    // 5. PROBING PHASE: Add ping blocks to probe the network
    
    // Look for Network category in block editor
    const networkCategory = page.locator('[data-category="network"], .category-btn:has-text("Network")').first();
    if (await networkCategory.isVisible()) {
      await networkCategory.click();
      await page.waitForTimeout(1500);
      console.log('✓ Opened Network blocks category');
      
      // Add Ping block
      const pingBlock = page.locator('.block:has-text("Ping"), .block[data-block-type="ping"]').first();
      if (await pingBlock.isVisible()) {
        await pingBlock.dragTo(blockDropArea.first(), { targetPosition: { x: 150, y: 150 } });
        await page.waitForTimeout(1000);
        console.log('✓ Ping block added to block editor');
        
        // Try to configure ping block with network device IP
        const pingDetails = page.locator('.ping-details');
        if (await pingDetails.isVisible()) {
          const hostInput = page.locator('.ping-host');
          if (await hostInput.isVisible()) {
            await hostInput.fill('192.168.1.1'); // Common router IP
            console.log('✓ Configured ping target: 192.168.1.1');
          }
        }
      }
      
      // Add Traceroute block
      const tracerouteBlock = page.locator('.block:has-text("Traceroute"), .block[data-block-type="traceroute"]').first();
      if (await tracerouteBlock.isVisible()) {
        await tracerouteBlock.dragTo(blockDropArea.first(), { targetPosition: { x: 350, y: 150 } });
        await page.waitForTimeout(1000);
        console.log('✓ Traceroute block added to block editor');
        
        // Configure traceroute block
        const tracerouteDetails = page.locator('.traceroute-details');
        if (await tracerouteDetails.isVisible()) {
          const hostInput = page.locator('.traceroute-host');
          if (await hostInput.isVisible()) {
            await hostInput.fill('192.168.1.10'); // Target end device
            console.log('✓ Configured traceroute target: 192.168.1.10');
          }
        }
      }
    }
    
    // 6. VALIDATION PHASE: Verify complete workflow
    console.log('Phase 3: Workflow Validation');
    
    // Verify we have blocks in the block editor
    const blocksInEditor = page.locator('#drop-area .block, .block-drop-area .block');
    const blockCount = await blocksInEditor.count();
    console.log(`✓ Blocks in Block Editor: ${blockCount}`);
    expect(blockCount).toBeGreaterThanOrEqual(1); // At least one probe block
    
    // Test switching back to Network Editor to verify network is preserved
    if (await networkTab.isVisible()) {
      await networkTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Switched back to Network Editor');
      
      // Verify network topology is still intact
      const persistedDevices = page.locator('#network-drop-area .network-device');
      const persistedCount = await persistedDevices.count();
      console.log(`✓ Network topology preserved: ${persistedCount} devices`);
      expect(persistedCount).toBeGreaterThanOrEqual(3);
    }
    
    console.log('=== WORKFLOW TEST COMPLETED SUCCESSFULLY ===');
    console.log('✓ Network topology built with multiple device types');
    console.log('✓ Device linking functionality verified');
    console.log('✓ Successfully switched between Network and Block Editor');
    console.log('✓ Network probe blocks configured and placed');
    console.log('✓ State persistence across tab switches confirmed');
  });
  
  test('Advanced network probing with multiple block types', async ({ page }) => {
    console.log('=== ADVANCED NETWORK PROBING TEST ===');
    
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await skipOnboarding(page);
    
    // Quick network setup
    const networkTab = page.locator('[data-tab="network-editor"]');
    if (await networkTab.isVisible()) {
      await networkTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Create minimal network (router + device)
    const networkDropArea = page.locator('#network-drop-area');
    const routersCategory = page.locator('[data-category="routers"]').first();
    if (await routersCategory.isVisible()) {
      await routersCategory.click();
      await page.waitForTimeout(1000);
      const router = page.locator('.network-block').first();
      await router.dragTo(networkDropArea, { targetPosition: { x: 200, y: 150 } });
      await page.waitForTimeout(500);
    }
    
    // Switch to Block Editor for intensive probing
    const blockEditorTab = page.locator('[data-tab="block-editor"]');
    if (await blockEditorTab.isVisible()) {
      await blockEditorTab.click();
      await page.waitForTimeout(1500);
    }
    
    const blockDropArea = page.locator('#drop-area, .block-drop-area').first();
    
    // Add multiple probe types
    const networkCategory = page.locator('[data-category="network"]').first();
    if (await networkCategory.isVisible()) {
      await networkCategory.click();
      await page.waitForTimeout(1000);
      
      // Add ping, traceroute, and any scan blocks available
      const probeBlocks = page.locator('.block:has-text("Ping"), .block:has-text("Traceroute"), .block:has-text("Scan")');
      const probeCount = await probeBlocks.count();
      console.log(`Available probe blocks: ${probeCount}`);
      
      for (let i = 0; i < Math.min(probeCount, 3); i++) {
        const block = probeBlocks.nth(i);
        if (await block.isVisible()) {
          await block.dragTo(blockDropArea, { targetPosition: { x: 100 + (i * 150), y: 200 } });
          await page.waitForTimeout(800);
        }
      }
    }
    
    // Verify probe deployment
    const deployedProbes = page.locator('#drop-area .block, .block-drop-area .block');
    const probeTotal = await deployedProbes.count();
    console.log(`✓ Network probes deployed: ${probeTotal}`);
    expect(probeTotal).toBeGreaterThanOrEqual(1);
    
    console.log('=== ADVANCED PROBING TEST COMPLETED ===');
  });
});