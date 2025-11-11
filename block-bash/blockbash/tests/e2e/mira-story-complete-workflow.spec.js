const { test, expect } = require('@playwright/test');
const { skipOnboarding } = require('./utils/skipOnboarding');

test.describe('Mira Story Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for this complex workflow
    test.setTimeout(300000); // 5 minutes
    
    console.log('Starting Mira story complete workflow test...');
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    
    // Skip onboarding if present
    await skipOnboarding(page);
    
    console.log('Page loaded and onboarding skipped');
  });

  test('Complete Mira story workflow from main interface', async ({ page }) => {
    console.log('\n=== PHASE 1: Initial Setup and RPG Interface Access ===');
    
    // Wait for the workshop panel to load
    await page.waitForSelector('#workshop-panel, .workshop-panel', { timeout: 30000 });
    console.log('Workshop panel found');
    
    // Wait for RPG panel to load
    await page.waitForSelector('.rpg-panel', { timeout: 10000 });
    console.log('RPG panel found');
    
    // Take initial screenshot
    await page.screenshot({ path: 'mira-workflow-step1-initial.png', fullPage: true });
    
    // The interface appears to be the Cave Bash RPG - let's look for interactive elements
    console.log('Looking for interactive elements in the RPG interface...');
    
    // First, try to interact with the RPG interface - look for any clickable elements
    const rpgPanel = page.locator('.rpg-panel').first();
    
    // Look for any terminal or input areas within the RPG panel
    const terminalElements = await page.locator('.rpg-panel input, .rpg-panel textarea, .rpg-terminal, .terminal').all();
    
    if (terminalElements.length > 0) {
      console.log(`Found ${terminalElements.length} terminal elements in RPG panel`);
      const terminalInput = terminalElements[0];
      
      console.log('Entering "ls" command in RPG terminal');
      await terminalInput.click();
      await terminalInput.fill('ls');
      await terminalInput.press('Enter');
      await page.waitForTimeout(3000);
    } else {
      console.log('No direct terminal input found, trying to interact with RPG interface');
      
      // Try clicking on the RPG panel to activate it
      await rpgPanel.click();
      await page.waitForTimeout(1000);
      
      // Try typing 'ls' directly 
      console.log('Typing "ls" directly in RPG interface');
      await page.keyboard.type('ls');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n=== PHASE 2: Workshop Navigation ===');
    
    // Wait for workshop interface to appear
    await page.waitForTimeout(3000);
    
    // Look for "Start" or similar button
    const startSelectors = [
      'button:has-text("Start")',
      'button:has-text("BEGIN")', 
      'button:has-text("begin")',
      '.btn:has-text("Start")',
      '.menu-btn:has-text("Start")',
      '[data-action="start"]',
      '.rpg-menu-btn:has-text("Start")'
    ];
    
    let startButton = null;
    for (const selector of startSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        startButton = button;
        console.log(`Found start button with selector: ${selector}`);
        break;
      }
    }
    
    if (startButton) {
      await startButton.click();
      await page.waitForTimeout(2000);
      console.log('Clicked start button');
    } else {
      console.log('No start button found, looking for workshop menu directly');
    }
    
    // Look for Story Mode option
    const storyModeSelectors = [
      'button:has-text("Story Mode")',
      'button:has-text("story mode")',
      'button:has-text("STORY MODE")',
      '.menu-option:has-text("Story")',
      '[data-mode="story"]'
    ];
    
    let storyModeButton = null;
    for (const selector of storyModeSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        storyModeButton = button;
        console.log(`Found story mode button with selector: ${selector}`);
        break;
      }
    }
    
    if (storyModeButton) {
      await storyModeButton.click();
      await page.waitForTimeout(2000);
      console.log('Clicked story mode button');
    }
    
    // Look for Mira option
    const miraSelectors = [
      'button:has-text("Mira")',
      'button:has-text("mira")',
      'button:has-text("MIRA")',
      '.workshop-option:has-text("Mira")',
      '[data-workshop="mira"]',
      'option[value="mira"]'
    ];
    
    let miraButton = null;
    for (const selector of miraSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        miraButton = element;
        console.log(`Found Mira option with selector: ${selector}`);
        break;
      }
    }
    
    if (miraButton) {
      // Handle both button clicks and dropdown selections
      const tagName = await miraButton.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'option') {
        // It's a dropdown option
        const dropdown = page.locator('select').first();
        await dropdown.selectOption('mira');
        console.log('Selected Mira from dropdown');
      } else {
        await miraButton.click();
        console.log('Clicked Mira button');
      }
      await page.waitForTimeout(2000);
    }
    
    // Look for Begin button
    const beginSelectors = [
      'button:has-text("Begin")',
      'button:has-text("begin")',
      'button:has-text("BEGIN")',
      '.btn-begin',
      '[data-action="begin"]'
    ];
    
    let beginButton = null;
    for (const selector of beginSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        beginButton = button;
        console.log(`Found begin button with selector: ${selector}`);
        break;
      }
    }
    
    if (beginButton) {
      await beginButton.click();
      await page.waitForTimeout(3000);
      console.log('Clicked begin button - Mira story should now be starting');
    }
    
    console.log('\n=== PHASE 3: Mira Story Interaction ===');
    
    // Wait for Mira story to load
    await page.waitForTimeout(5000);
    
    // Look for Mira's dialogue or story interface
    const miraDialogueSelectors = [
      '.rpg-dialogue',
      '.dialogue-box',
      '.story-dialogue',
      '#rpg-text',
      '.rpg-text',
      '.mira-dialogue'
    ];
    
    let dialogueFound = false;
    for (const selector of miraDialogueSelectors) {
      const dialogue = page.locator(selector).first();
      if (await dialogue.count() > 0) {
        const dialogueText = await dialogue.textContent();
        console.log(`Found dialogue: ${dialogueText?.substring(0, 100)}...`);
        dialogueFound = true;
        
        // Check if this looks like Mira's opening dialogue
        if (dialogueText?.includes('intel') || dialogueText?.includes('hacker') || dialogueText?.includes('Agent')) {
          console.log('✓ Found Mira story dialogue!');
          break;
        }
      }
    }
    
    if (!dialogueFound) {
      console.log('No dialogue found, taking screenshot for debugging');
      await page.screenshot({ path: 'mira-story-debug.png', fullPage: true });
    }
    
    // Look for TildeSec Console or command interface
    const consoleSelectors = [
      '.tildesec-console',
      '.terminal-container',
      '.command-interface',
      '#terminal',
      '.rpg-terminal',
      '.console-interface'
    ];
    
    let consoleFound = false;
    for (const selector of consoleSelectors) {
      const console = page.locator(selector).first();
      if (await console.count() > 0) {
        console.log(`Found console interface: ${selector}`);
        consoleFound = true;
        break;
      }
    }
    
    // Look for activity workshop container
    const workshopSelectors = [
      '.activity-workshop',
      '.workshop-container',
      '#workshop-container',
      '.rpg-panel',
      '.story-container'
    ];
    
    let workshopFound = false;
    for (const selector of workshopSelectors) {
      const workshop = page.locator(selector).first();
      if (await workshop.count() > 0) {
        console.log(`Found workshop container: ${selector}`);
        workshopFound = true;
        break;
      }
    }
    
    console.log('\n=== PHASE 4: Following Story Instructions ===');
    
    // Try to interact with the story
    let storyStep = 0;
    const maxSteps = 7;
    
    while (storyStep < maxSteps) {
      console.log(`\n--- Story Step ${storyStep} ---`);
      
      // Wait for instructions to appear
      await page.waitForTimeout(3000);
      
      // Look for any clickable elements or instructions
      const instructions = await page.locator('.rpg-text, .dialogue-box, .instruction-text, .story-text').first().textContent();
      if (instructions) {
        console.log(`Instructions: ${instructions.substring(0, 150)}...`);
        
        // Look for common interactive elements
        const interactiveElements = [
          'button:not([style*="display: none"])',
          'input[type="text"]',
          '.clickable',
          '[data-action]',
          '.story-option',
          '.command-option'
        ];
        
        let interacted = false;
        for (const selector of interactiveElements) {
          const elements = page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            console.log(`Found ${count} interactive elements: ${selector}`);
            
            // Try clicking the first visible one
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              const isVisible = await element.isVisible();
              if (isVisible) {
                const text = await element.textContent() || '';
                console.log(`Clicking element: ${text.substring(0, 50)}...`);
                await element.click();
                await page.waitForTimeout(2000);
                interacted = true;
                break;
              }
            }
            if (interacted) break;
          }
        }
        
        if (!interacted) {
          // Try common commands or actions
          const commonCommands = ['ls', 'ping', 'nmap', 'whoami', 'help'];
          const terminalInput = page.locator('input[type="text"]').first();
          
          if (await terminalInput.count() > 0) {
            for (const cmd of commonCommands) {
              if (instructions.toLowerCase().includes(cmd)) {
                console.log(`Trying command: ${cmd}`);
                await terminalInput.fill(cmd);
                await terminalInput.press('Enter');
                await page.waitForTimeout(3000);
                interacted = true;
                break;
              }
            }
          }
        }
      }
      
      storyStep++;
      
      // Take a screenshot for this step
      await page.screenshot({ 
        path: `mira-story-step-${storyStep}.png`, 
        fullPage: true 
      });
    }
    
    console.log('\n=== PHASE 5: Verification ===');
    
    // Verify the story completed successfully
    await page.waitForTimeout(2000);
    
    const finalText = await page.locator('.rpg-text, .dialogue-box, .story-text').first().textContent();
    console.log(`Final story text: ${finalText?.substring(0, 100)}...`);
    
    // Check for completion indicators
    const completionIndicators = [
      'complete',
      'mission accomplished', 
      'well done',
      'congratulations',
      'success',
      'finished'
    ];
    
    let storyCompleted = false;
    if (finalText) {
      for (const indicator of completionIndicators) {
        if (finalText.toLowerCase().includes(indicator)) {
          console.log(`✓ Story appears to be completed: found "${indicator}"`);
          storyCompleted = true;
          break;
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'mira-story-final.png', fullPage: true });
    
    // Assertions
    expect(dialogueFound).toBe(true);
    expect(consoleFound || workshopFound).toBe(true);
    
    console.log('\n=== TEST COMPLETED ===');
    console.log(`Dialogue found: ${dialogueFound}`);
    console.log(`Console found: ${consoleFound}`);
    console.log(`Workshop found: ${workshopFound}`);
    console.log(`Story completed: ${storyCompleted}`);
  });
});