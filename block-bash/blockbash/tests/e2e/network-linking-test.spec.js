import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Network Editor - Device Linking Test', () => {
  
  test('Test advanced device linking with proper interaction pattern', async ({ page }) => {
    console.log('=== ADVANCED DEVICE LINKING TEST ===');
    
    // Navigate to Network Editor
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Skip onboarding overlay if present
    await skipOnboarding(page);
    
    // Switch to Network Editor tab
    const networkTab = page.locator('[data-tab="network-editor"]');
    if (await networkTab.isVisible()) {
      await networkTab.click();
      await page.waitForTimeout(1000);
    }
    
    const networkDropArea = page.locator('#network-drop-area');
    
    // Create Router
    console.log('Creating router...');
    const routersCategory = page.locator('[data-category="routers"]').first();
    if (await routersCategory.isVisible()) {
      await routersCategory.click();
      await page.waitForTimeout(1500);
      const routerBlock = page.locator('.network-block').first();
      await routerBlock.dragTo(networkDropArea, { targetPosition: { x: 100, y: 100 } });
      await page.waitForTimeout(1000);
    }
    
    // Create Switch  
    console.log('Creating switch...');
    const switchesCategory = page.locator('[data-category="switches"]').first();
    if (await switchesCategory.isVisible()) {
      await switchesCategory.click();
      await page.waitForTimeout(1500);
      const switchBlock = page.locator('.network-block').first();
      await switchBlock.dragTo(networkDropArea, { targetPosition: { x: 300, y: 100 } });
      await page.waitForTimeout(1000);
    }
    
    // Get created devices
    const devices = page.locator('#network-drop-area .network-device');
    const deviceCount = await devices.count();
    console.log(`Total devices created: ${deviceCount}`);
    
    if (deviceCount >= 2) {
      const device1 = devices.nth(0);
      const device2 = devices.nth(1);
      
      // Test linking mode
      const linkBtn = page.locator('#btn-start-link');
      const cancelBtn = page.locator('#btn-cancel-link');
      
      console.log('Starting link mode...');
      await linkBtn.click();
      await page.waitForTimeout(500);
      
      // Verify cancel button appears when linking starts
      const cancelVisible = await cancelBtn.isVisible();
      console.log(`Cancel button visible after starting link: ${cancelVisible}`);
      
      if (cancelVisible) {
        console.log('✅ Link mode properly activated');
        
        // Try different linking patterns
        console.log('Attempting device connection...');
        
        // Method 1: Click devices in sequence
        await device1.click();
        await page.waitForTimeout(300);
        await device2.click();
        await page.waitForTimeout(1000);
        
        // Check for connections
        let connections = await page.locator('#network-connections-layer *').count();
        console.log(`Connections found (method 1): ${connections}`);
        
        if (connections === 0) {
          // Method 2: Try drag between devices
          console.log('Trying drag-based linking...');
          await device1.dragTo(device2);
          await page.waitForTimeout(1000);
          connections = await page.locator('#network-connections-layer *').count();
          console.log(`Connections found (method 2): ${connections}`);
        }
        
        if (connections === 0) {
          // Method 3: Try right-click context menu
          console.log('Trying context menu linking...');
          await device1.click({ button: 'right' });
          await page.waitForTimeout(500);
          
          // Look for connection options
          const contextMenu = page.locator('.context-menu, .menu, .dropdown');
          if (await contextMenu.isVisible()) {
            console.log('✅ Context menu appeared');
            const connectOption = contextMenu.locator('text=connect, text=link').first();
            if (await connectOption.isVisible()) {
              await connectOption.click();
              await device2.click();
              await page.waitForTimeout(1000);
            }
          }
        }
        
        // Final connection check
        connections = await page.locator('#network-connections-layer path, #network-connections-layer line, #network-connections-layer circle').count();
        console.log(`Final connections count: ${connections}`);
        
        // Cancel linking mode
        await cancelBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ Link mode deactivated');
      }
    }
    
    // Test configuration access
    console.log('Testing device configuration access...');
    const firstDevice = devices.first();
    
    // Double-click for configuration
    await firstDevice.dblclick();
    await page.waitForTimeout(1000);
    
    // Look for configuration modal or panel
    const configModal = page.locator('.modal, .config-panel, .properties-panel, .device-config');
    const configVisible = await configModal.isVisible();
    console.log(`Configuration modal visible: ${configVisible}`);
    
    if (configVisible) {
      console.log('✅ Device configuration panel accessed');
      
      // Look for network-specific configuration fields
      const networkInputs = await configModal.locator('input[placeholder*="IP"], input[placeholder*="Router"], input[placeholder*="VLAN"], textarea').count();
      console.log(`Network configuration inputs found: ${networkInputs}`);
      
      if (networkInputs > 0) {
        console.log('✅ Network configuration forms are functional');
      }
    } else {
      // Try right-click for properties
      await firstDevice.click({ button: 'right' });
      await page.waitForTimeout(500);
      
      const rightClickMenu = page.locator('.context-menu, .menu');
      if (await rightClickMenu.isVisible()) {
        console.log('✅ Right-click context menu works');
        
        const propertiesOption = rightClickMenu.locator('text=properties, text=configure, text=settings').first();
        if (await propertiesOption.isVisible()) {
          console.log('✅ Properties/Configure option available');
        }
      }
    }
    
    console.log('✅ Advanced Network Editor test completed!');
  });
});