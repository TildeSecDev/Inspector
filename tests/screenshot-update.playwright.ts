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

  test('4. Scenarios Tab in Twin Designer', async ({ page }) => {
    // First create a project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="Project Name"]', 'Test Scenarios Project');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1000);
    
    // Navigate back to Projects and select the project
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(500);
    await page.click('.card:has-text("Test Scenarios Project")');
    await page.waitForTimeout(1000);
    
    // Navigate to Twin Designer
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(500);
    
    // Click Scenarios tab
    await page.click('button:has-text("Scenarios")');
    await page.waitForTimeout(500);
    
    // Take screenshot of scenarios tab
    await page.screenshot({ 
      path: '.playwright-mcp/5_scenarios_page.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 5_scenarios_page.png');
  });

  test('5. Simulation Runner Panel in Twin Designer', async ({ page }) => {
    // First create a project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="Project Name"]', 'Test Runner Project');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1000);
    
    // Navigate back to Projects and select the project
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(500);
    await page.click('.card:has-text("Test Runner Project")');
    await page.waitForTimeout(1000);
    
    // Navigate to Twin Designer (Simulation Runner is in the right panel of the Designer tab)
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(500);
    
    // Simulation Runner is embedded in the Designer tab right panel - wait for it to appear
    await page.waitForSelector('h3:has-text("Simulation Runner")');
    
    // Take screenshot
    await page.screenshot({ 
      path: '.playwright-mcp/6_simulation_runner.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 6_simulation_runner.png');
  });

  test('6. Findings Tab in Twin Designer', async ({ page }) => {
    // First create a project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="Project Name"]', 'Test Findings Project');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1000);
    
    // Navigate back to Projects and select the project
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(500);
    await page.click('.card:has-text("Test Findings Project")');
    await page.waitForTimeout(1000);
    
    // Navigate to Twin Designer
    await page.click('a:has-text("Twin Designer")');
    await page.waitForTimeout(500);
    
    // Click Findings tab
    await page.click('button:has-text("Findings")');
    await page.waitForTimeout(500);
    
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
      
      // Click Scenarios tab in Twin Designer
      await page.click('button:has-text("Scenarios")');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: '.playwright-mcp/12_scenarios_with_data.png',
        fullPage: true 
      });
    }
    
    console.log('✓ Screenshots saved: Workflow screenshots');
  });

  test('10. Inspector Twins Button - Modal', async ({ page }) => {
    // Click the Inspector Twins button in the sidebar
    await page.click('button:has-text("Inspector Twins")');
    await page.waitForTimeout(500);
    
    // Wait for modal to appear
    await page.waitForSelector('h2:has-text("Inspector Twins")');
    
    // Take screenshot of modal
    await page.screenshot({ 
      path: '.playwright-mcp/10_inspector_twins_modal.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot saved: 10_inspector_twins_modal.png');
  });
});
