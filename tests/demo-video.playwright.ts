import { test, expect } from '@playwright/test';

/**
 * Demo video recording - showcases happy flow through Inspector Twin
 * Creates a comprehensive video showing all major features
 */

test.describe('Inspector Twin - Demo Video', () => {
  
  test('Complete Happy Flow Demo', async ({ page }) => {
    // Start at the home page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Accept ROE modal if present
    const roeCheckbox = page.locator('input[type="checkbox"]');
    const roeButton = page.locator('button:has-text("Enable local testing")');
    
    try {
      if (await roeCheckbox.isVisible({ timeout: 2000 })) {
        await page.waitForTimeout(1000);
        await roeCheckbox.check();
        await page.waitForTimeout(500);
        await roeButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // ROE already accepted, continue
    }

    // Show the Projects page (empty state)
    await page.waitForSelector('h1:has-text("Projects")');
    await page.waitForTimeout(2000);
    
    // Create a new project
    await page.click('button:has-text("New Project")');
    await page.waitForTimeout(1000);
    
    // Fill in project details with realistic data
    await page.fill('input[placeholder="Project Name"]', 'Enterprise Network Security Assessment');
    await page.waitForTimeout(500);
    await page.fill('textarea[placeholder="Description (optional)"]', 'Comprehensive security assessment for enterprise office network with cloud integration');
    await page.waitForTimeout(1000);
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(2000);
    
    // Navigate back to Projects to see the created project
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(1500);
    
    // Click on the project to select it
    await page.click('.card:has-text("Enterprise Network Security Assessment")');
    await page.waitForTimeout(2000);
    
    // Navigate to Twin Designer
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(2000);
    
    // Show the Designer tab with empty canvas
    await page.waitForTimeout(1500);
    
    // Scroll down to show the full interface
    await page.evaluate(() => {
      const scroll = (globalThis as any).scrollBy;
      if (typeof scroll === 'function') scroll(0, 100);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const scroll = (globalThis as any).scrollBy;
      if (typeof scroll === 'function') scroll(0, -100);
    });
    await page.waitForTimeout(500);
    
    // Click to add a node (open node selector modal)
    const addNodeButton = page.locator('button:has-text("Add Node")');
    if (await addNodeButton.isVisible({ timeout: 2000 })) {
      await addNodeButton.click();
      await page.waitForTimeout(1500);
      
      // Show the node type categories (scroll through them)
      await page.waitForTimeout(1000);
      
      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
    
    // Navigate to Scenarios tab
    await page.click('button:has-text("Scenarios")');
    await page.waitForTimeout(2000);
    
    // Show scenarios (if any exist from sample data)
    // Scroll to show all scenarios
    await page.evaluate(() => {
      const scroll = (globalThis as any).scrollBy;
      if (typeof scroll === 'function') scroll(0, 100);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const scroll = (globalThis as any).scrollBy;
      if (typeof scroll === 'function') scroll(0, -100);
    });
    await page.waitForTimeout(1000);
    
    // Navigate to Simulation Runner tab
    await page.click('button:has-text("Simulation Runner")');
    await page.waitForTimeout(2000);
    
    // Navigate to Findings tab
    await page.click('button:has-text("Findings")');
    await page.waitForTimeout(2000);
    
    // Go back to Designer tab
    await page.click('button:has-text("Designer")');
    await page.waitForTimeout(1500);
    
    // Navigate to Reports page via sidebar
    await page.click('a:has-text("Reports")');
    await page.waitForTimeout(2000);
    
    // Navigate to Settings page
    await page.click('a:has-text("Settings")');
    await page.waitForTimeout(2000);
    
    // Finally, go back to Projects
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(2000);
    
    // Show the project we created
    await page.waitForSelector('.card:has-text("Enterprise Network Security Assessment")');
    await page.waitForTimeout(2000);
    
    console.log('✓ Demo video recording complete!');
  });

  test('Demo with Sample Data Project', async ({ page }) => {
    // Start at the home page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Accept ROE if shown
    try {
      const roeCheckbox = page.locator('input[type="checkbox"]');
      if (await roeCheckbox.isVisible({ timeout: 2000 })) {
        await roeCheckbox.check();
        await page.waitForTimeout(300);
        await page.click('button:has-text("Enable local testing")');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Continue
    }
    
    // Look for the sample project "SME Office + Cloud App"
    const sampleProject = page.locator('.card:has-text("SME Office + Cloud App")');
    
    if (await sampleProject.isVisible({ timeout: 2000 })) {
      await page.waitForTimeout(1000);
      
      // Click on the sample project
      await sampleProject.click();
      await page.waitForTimeout(2000);
      
      // Navigate to Twin Designer
      await page.click('a:has-text("Twin Designer")');
      await page.waitForTimeout(2000);
      
      // Designer tab should show the topology with nodes
      await page.waitForTimeout(2000);
      
      // Pan around the canvas to show the topology
      await page.mouse.move(400, 400);
      await page.waitForTimeout(500);
      await page.mouse.move(600, 400);
      await page.waitForTimeout(500);
      await page.mouse.move(400, 400);
      await page.waitForTimeout(1000);
      
      // Click on a node to show properties panel
      const nodes = page.locator('[data-id]').first();
      if (await nodes.isVisible({ timeout: 1000 })) {
        await nodes.click();
        await page.waitForTimeout(2000);
      }
      
      // Navigate to Scenarios tab to show pre-configured scenarios
      await page.click('button:has-text("Scenarios")');
      await page.waitForTimeout(2500);
      
      // Scroll to show all scenario cards
      await page.evaluate(() => {
        const scroll = (globalThis as any).scrollBy;
        if (typeof scroll === 'function') scroll(0, 100);
      });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const scroll = (globalThis as any).scrollBy;
        if (typeof scroll === 'function') scroll(0, -100);
      });
      await page.waitForTimeout(1500);
      
      // Show Simulation Runner
      await page.click('button:has-text("Simulation Runner")');
      await page.waitForTimeout(2000);
      
      // Show Findings
      await page.click('button:has-text("Findings")');
      await page.waitForTimeout(2000);
      
      // Back to Designer to show the topology again
      await page.click('button:has-text("Designer")');
      await page.waitForTimeout(2000);
      
      // Navigate to Reports
      await page.click('a:has-text("Reports")');
      await page.waitForTimeout(2000);
      
      // Navigate to Settings
      await page.click('a:has-text("Settings")');
      await page.waitForTimeout(2000);
      
      // Back to Projects to end
      await page.click('a:has-text("Projects")');
      await page.waitForTimeout(1500);
      
      console.log('✓ Sample data demo video recording complete!');
    } else {
      console.log('⚠ Sample project not found, skipping sample data demo');
    }
  });

  test('Comprehensive Feature Showcase', async ({ page }) => {
    // ===== INTRO: Landing Page =====
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    
    // Accept ROE
    try {
      const roeCheckbox = page.locator('input[type="checkbox"]');
      if (await roeCheckbox.isVisible({ timeout: 2000 })) {
        await page.waitForTimeout(800);
        await roeCheckbox.check();
        await page.waitForTimeout(400);
        await page.click('button:has-text("Enable local testing")');
        await page.waitForTimeout(1200);
      }
    } catch (e) { }
    
    // ===== SECTION 1: Explore Existing Project =====
    // Check if sample project exists
    const sampleProject = page.locator('.card:has-text("SME Office + Cloud App")');
    if (await sampleProject.isVisible({ timeout: 1000 })) {
      await page.waitForTimeout(1500);
      await sampleProject.click();
      await page.waitForTimeout(1800);
      
      // View Twin Designer with topology
      await page.click('a:has-text("Twin Designer")');
      await page.waitForTimeout(2500);
      
      // Show the topology - zoom and pan
      await page.waitForTimeout(1500);
      
      // View Scenarios
      await page.click('button:has-text("Scenarios")');
      await page.waitForTimeout(2500);
      
      // Back to projects
      await page.click('a:has-text("Projects")');
      await page.waitForTimeout(1500);
    }
    
    // ===== SECTION 2: Create New Project =====
    await page.click('button:has-text("New Project")');
    await page.waitForTimeout(1200);
    
    await page.fill('input[placeholder="Project Name"]', 'Cloud Infrastructure Security Review');
    await page.waitForTimeout(600);
    await page.fill('textarea[placeholder="Description (optional)"]', 'Security assessment for hybrid cloud infrastructure with multi-region deployment');
    await page.waitForTimeout(1200);
    
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(2000);
    
    // ===== SECTION 3: Navigate Through Interface =====
    // Go back to Projects
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(1500);
    
    // Select the new project
    await page.click('.card:has-text("Cloud Infrastructure Security Review")');
    await page.waitForTimeout(2000);
    
    // Twin Designer - show empty canvas
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(2500);
    
    // Show all tabs
    await page.click('button:has-text("Scenarios")');
    await page.waitForTimeout(1800);
    
    await page.click('button:has-text("Simulation Runner")');
    await page.waitForTimeout(1800);
    
    await page.click('button:has-text("Findings")');
    await page.waitForTimeout(1800);
    
    await page.click('button:has-text("Designer")');
    await page.waitForTimeout(1500);
    
    // ===== SECTION 4: Show Reports and Settings =====
    await page.click('a:has-text("Reports")');
    await page.waitForTimeout(2000);
    
    await page.click('a:has-text("Settings")');
    await page.waitForTimeout(2000);
    
    // ===== OUTRO: Back to Projects =====
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(2000);
    
    console.log('✓ Comprehensive feature showcase video recording complete!');
  });
});
