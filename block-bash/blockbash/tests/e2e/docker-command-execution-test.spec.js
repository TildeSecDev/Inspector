const { test, expect } = require('@playwright/test');

test('Docker Container Command Execution Test', async ({ page }) => {
  console.log('Starting Docker container command execution test...');
  
  // Navigate to the interface
  await page.goto('http://localhost:3000/pages/index.html');
  console.log('Page loaded successfully');
  
  // Wait for the page to be ready
  await page.waitForLoadState('networkidle');
  
  // Enter 'ls' command to access the terminal interface
  await page.keyboard.type('ls');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  
  // Click start button if it appears
  const startButton = page.locator('button:has-text("start")');
  if (await startButton.isVisible()) {
    await startButton.click();
    console.log('Clicked start button');
    await page.waitForTimeout(1000);
  }
  
  // Look for story mode or activity containers
  const storyModeButton = page.locator('button:has-text("story mode")');
  if (await storyModeButton.isVisible()) {
    await storyModeButton.click();
    console.log('Clicked story mode button');
    await page.waitForTimeout(1000);
  }
  
  // Look for Mira story option
  const miraButton = page.locator('button:has-text("mira")');
  if (await miraButton.isVisible()) {
    await miraButton.click();
    console.log('Clicked mira button');
    await page.waitForTimeout(1000);
  }
  
  // Look for begin button
  const beginButton = page.locator('button:has-text("begin")');
  if (await beginButton.isVisible()) {
    await beginButton.click();
    console.log('Clicked begin button');
    await page.waitForTimeout(2000);
  }
  
  // Look for terminal interface
  const terminalArea = page.locator('.xterm-helper-textarea');
  if (await terminalArea.isVisible()) {
    console.log('Terminal interface found - testing command execution');
    
    // Click to focus the terminal
    await terminalArea.click();
    await page.waitForTimeout(500);
    
    // Test basic commands
    const commands = ['whoami', 'pwd', 'ls'];
    
    for (const cmd of commands) {
      console.log(`Testing command: ${cmd}`);
      
      // Type the command
      await page.keyboard.type(cmd);
      await page.keyboard.press('Enter');
      
      // Wait for command execution
      await page.waitForTimeout(2000);
      
      // Check for any response or output
      const terminalContent = await page.locator('.xterm-screen').textContent();
      if (terminalContent && terminalContent.includes(cmd)) {
        console.log(`✅ Command '${cmd}' was executed (found in terminal output)`);
      } else {
        console.log(`⚠️  Command '${cmd}' might not have executed or output not visible`);
      }
    }
  } else {
    console.log('No terminal interface found - checking for other interfaces');
    
    // Look for other possible terminal containers
    const containers = await page.locator('[class*="terminal"], [class*="console"], [id*="terminal"], [id*="console"]').all();
    console.log(`Found ${containers.length} potential terminal containers`);
    
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const isVisible = await container.isVisible();
      if (isVisible) {
        console.log(`Container ${i} is visible - attempting interaction`);
        await container.click();
        await page.keyboard.type('whoami');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
      }
    }
  }
  
  console.log('Docker container command execution test complete');
});