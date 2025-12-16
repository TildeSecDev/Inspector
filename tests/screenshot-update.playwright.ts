import { test, expect } from '@playwright/test';

/**
 * Comprehensive screenshot test for Inspector Twin
 * Captures screenshots of all pages and updates the .playwright-mcp folder
 */

test.describe('Inspector Twin - Full Application Screenshots', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Accept ROE modal if present
    const roeCheckbox = page.locator('input[type="checkbox"]');
    const roeButton = page.locator('button:has-text("Enable local testing")');
    
    try {
      if (await roeCheckbox.isVisible({ timeout: 2000 })) {
        await roeCheckbox.check();
        await roeButton.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // ROE already accepted, continue
    }
  });

  test('1. Home/Projects Page - Empty State', async ({ page }) => {
    // Should land on Projects page by default
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/1_projects_page_empty.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 1_projects_page_empty.png');
  });

  test('2. Projects Page - Create Project', async ({ page }) => {
    // Navigate to Projects
    await page.click('a:has-text("Projects")');
    await page.waitForSelector('h1:has-text("Projects")');
    
    // Click New Project button
    await page.click('button:has-text("New Project")');
    await page.waitForTimeout(500);
    
    // Fill in project details
    await page.fill('input[placeholder="Project Name"]', 'Test Project Alpha');
    await page.fill('textarea[placeholder="Description (optional)"]', 'Comprehensive test of Inspector Twin functionality');
    
    // Take screenshot of form
    await page.screenshot({ 
      path: '.playwright-mcp/2_project_create_form.png',
      fullPage: true 
    });
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1000);
    
    // Take screenshot of created project
    await page.screenshot({ 
      path: '.playwright-mcp/3_project_created.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshots saved: 2_project_create_form.png, 3_project_created.png');
  });

  test('3. Twin Designer Page - Canvas', async ({ page }) => {
    // Navigate directly to Twin Designer
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(500);
    
    // Should navigate to Twin Designer
    await expect(page.locator('h1')).toContainText('Twin Designer');
    
    // Take screenshot of the initial state (no project selected)
    await page.screenshot({ 
      path: '.playwright-mcp/4_twin_designer_no_project.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 4_twin_designer_no_project.png');
  });

  test('4. Scenarios Page', async ({ page }) => {
    // Navigate to Scenarios
    await page.click('a:has-text("Scenarios")');
    await page.waitForSelector('h1:has-text("Scenarios")');
    
    // Take screenshot of empty state
    await page.screenshot({ 
      path: '.playwright-mcp/5_scenarios_page.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 5_scenarios_page.png');
  });

  test('5. Simulation Runner Page', async ({ page }) => {
    // Navigate to Simulation Runner
    await page.click('a:has-text("Simulation")');
    await page.waitForSelector('h1:has-text("Simulation Runner")');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/6_simulation_runner.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 6_simulation_runner.png');
  });

  test('6. Findings Page', async ({ page }) => {
    // Navigate to Findings
    await page.click('a:has-text("Findings")');
    await page.waitForSelector('h1:has-text("Findings")');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/7_findings_page.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 7_findings_page.png');
  });

  test('7. Reports Page', async ({ page }) => {
    // Navigate to Reports
    await page.click('a:has-text("Reports")');
    await page.waitForSelector('h1:has-text("Reports")');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/8_reports_page.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 8_reports_page.png');
  });

  test('8. Settings Page', async ({ page }) => {
    // Navigate to Settings
    await page.click('a:has-text("Settings")');
    await page.waitForSelector('h1:has-text("Settings")');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/9_settings_page.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 9_settings_page.png');
  });

  test('9. Complete Workflow - With Sample Data', async ({ page }) => {
    // This test assumes we have seeded data
    await page.goto('http://localhost:5173');
    
    // Accept ROE
    const roeModal = page.locator('text=Rules of Engagement');
    if (await roeModal.isVisible()) {
      await page.click('button:has-text("I Understand and Accept")');
      await page.waitForTimeout(500);
    }
    
    // Projects page with sample data
    await page.screenshot({ 
      path: '.playwright-mcp/10_projects_with_data.png',
      fullPage: true 
    });
    
    // Click on first project (if exists)
    const firstProject = page.locator('.card').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(1000);
      
      // Twin Designer with topology
      await page.screenshot({ 
        path: '.playwright-mcp/11_designer_with_topology.png',
        fullPage: true 
      });
      
      // Navigate to scenarios
      await page.click('a:has-text("Scenarios")');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: '.playwright-mcp/12_scenarios_with_data.png',
        fullPage: true 
      });
    }
    
    console.log('✓ Screenshots saved: Workflow screenshots');
  });
});
