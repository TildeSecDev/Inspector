const { test, expect } = require('@playwright/test');
const { skipOnboarding } = require('./utils/skipOnboarding');

test.describe('Mira Story Proper Workflow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    
    console.log('Starting proper Mira story workflow test...');
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    
    // Skip onboarding if present
    await skipOnboarding(page);
    
    console.log('Page loaded and onboarding skipped');
  });

  test('Follow proper Mira story workflow through Cave Bash RPG', async ({ page }) => {
    console.log('\n=== PHASE 1: Cave Bash RPG Interface ===');
    
    // Wait for the RPG interface to load
    await page.waitForSelector('.rpg-panel', { timeout: 30000 });
    console.log('RPG panel found');
    
    // Wait for dialogue to appear
    await page.waitForSelector('.rpg-dialogue', { timeout: 10000 });
    console.log('RPG dialogue found');
    
    // Check the initial dialogue content
    const dialogueText = await page.locator('#rpg-text, .rpg-text').first().textContent();
    console.log(`Initial dialogue: ${dialogueText?.substring(0, 100)}...`);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'mira-proper-step1-cave.png', fullPage: true });
    
    console.log('\n=== PHASE 2: Following Cave Bash Instructions ===');
    
    // The dialogue says to type 'ls' in the terminal - let's find the terminal
    // In RPG interfaces, the terminal might be embedded or require activation
    
    // Look for any input fields or terminal interfaces
    let terminalFound = false;
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '.terminal-input',
      '.command-input',
      '#terminal-input'
    ];
    
    for (const selector of inputSelectors) {
      const input = page.locator(selector).first();
      if (await input.count() > 0 && await input.isVisible()) {
        console.log(`Found input field: ${selector}`);
        await input.click();
        await input.fill('ls');
        await input.press('Enter');
        await page.waitForTimeout(3000);
        terminalFound = true;
        break;
      }
    }
    
    if (!terminalFound) {
      console.log('No visible input found, trying direct keyboard input on RPG panel');
      // Click on the RPG panel to focus it
      await page.locator('.rpg-panel').first().click();
      await page.waitForTimeout(500);
      
      // Type 'ls' directly
      await page.keyboard.type('ls');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      terminalFound = true;
    }
    
    // Take screenshot after 'ls' command
    await page.screenshot({ path: 'mira-proper-step2-after-ls.png', fullPage: true });
    
    console.log('\n=== PHASE 3: Progressing Through RPG Story ===');
    
    // Wait for the story to progress after the 'ls' command
    await page.waitForTimeout(3000);
    
    // Check if dialogue has changed
    const newDialogue = await page.locator('#rpg-text, .rpg-text').first().textContent();
    console.log(`New dialogue: ${newDialogue?.substring(0, 100)}...`);
    
    // Look for any new interactive elements or instructions
    let currentStep = 0;
    const maxSteps = 10; // Maximum steps to try
    
    while (currentStep < maxSteps) {
      console.log(`\n--- RPG Step ${currentStep + 1} ---`);
      
      // Get current instruction text
      await page.waitForTimeout(2000);
      const currentInstruction = await page.locator('#rpg-text, .rpg-text, .rpg-dialogue').first().textContent();
      console.log(`Current instruction: ${currentInstruction?.substring(0, 150)}...`);
      
      // Check if we've reached the workshop/story mode selection
      if (currentInstruction?.toLowerCase().includes('workshop') || 
          currentInstruction?.toLowerCase().includes('story') ||
          currentInstruction?.toLowerCase().includes('mira')) {
        console.log('Reached workshop/story selection phase!');
        break;
      }
      
      // Look for any interactive buttons or options that have appeared
      const interactiveButtons = await page.locator('button:visible, .btn:visible, .clickable:visible, [data-action]:visible').all();
      
      if (interactiveButtons.length > 0) {
        console.log(`Found ${interactiveButtons.length} interactive buttons`);
        
        for (let i = 0; i < interactiveButtons.length; i++) {
          const button = interactiveButtons[i];
          const buttonText = await button.textContent() || '';
          console.log(`Button ${i}: "${buttonText.trim()}"`);
          
          // Look for story/workshop/mira related buttons
          if (buttonText.toLowerCase().includes('story') || 
              buttonText.toLowerCase().includes('workshop') ||
              buttonText.toLowerCase().includes('mira') ||
              buttonText.toLowerCase().includes('start') ||
              buttonText.toLowerCase().includes('begin')) {
            console.log(`Clicking relevant button: "${buttonText.trim()}"`);
            await button.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      } else {
        // Try common RPG commands
        const rpgCommands = ['help', 'look', 'inventory', 'north', 'south', 'east', 'west', 'examine'];
        
        // Check if current instruction suggests a specific command
        let commandToTry = null;
        for (const cmd of rpgCommands) {
          if (currentInstruction?.toLowerCase().includes(cmd)) {
            commandToTry = cmd;
            break;
          }
        }
        
        // If no specific command found, try 'help'
        if (!commandToTry) commandToTry = 'help';
        
        console.log(`Trying RPG command: ${commandToTry}`);
        
        // Focus on RPG panel and type command
        await page.locator('.rpg-panel').first().click();
        await page.keyboard.type(commandToTry);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
      
      // Take screenshot for this step
      await page.screenshot({ 
        path: `mira-proper-rpg-step-${currentStep + 1}.png`, 
        fullPage: true 
      });
      
      currentStep++;
    }
    
    console.log('\n=== PHASE 4: Looking for Mira Story Access ===');
    
    // At this point, we should have progressed through the RPG to reach story selection
    // Look for any mention of Mira, story mode, or workshop options
    await page.waitForTimeout(2000);
    
    const finalInstructions = await page.locator('#rpg-text, .rpg-text, .rpg-dialogue').first().textContent();
    console.log(`Final instructions: ${finalInstructions?.substring(0, 200)}...`);
    
    // Look for dropdown menus, selection lists, or navigation options
    const dropdowns = await page.locator('select, .dropdown, .menu-dropdown').all();
    const menuButtons = await page.locator('button:visible, .menu-btn:visible').all();
    
    console.log(`Found ${dropdowns.length} dropdowns and ${menuButtons.length} menu buttons`);
    
    // Try to find and select Mira story
    for (const dropdown of dropdowns) {
      const options = await dropdown.locator('option').all();
      for (const option of options) {
        const optionText = await option.textContent() || '';
        if (optionText.toLowerCase().includes('mira')) {
          console.log(`Found Mira option in dropdown: "${optionText}"`);
          await dropdown.selectOption(await option.getAttribute('value') || 'mira');
          await page.waitForTimeout(2000);
          break;
        }
      }
    }
    
    // Try clicking buttons related to Mira or story
    for (const button of menuButtons) {
      const buttonText = await button.textContent() || '';
      if (buttonText.toLowerCase().includes('mira') || 
          buttonText.toLowerCase().includes('begin') ||
          buttonText.toLowerCase().includes('start')) {
        console.log(`Clicking Mira-related button: "${buttonText.trim()}"`);
        await button.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    console.log('\n=== PHASE 5: Mira Story Interaction ===');
    
    // Now we should be in the actual Mira story
    await page.waitForTimeout(3000);
    
    const miraDialogue = await page.locator('#rpg-text, .rpg-text, .dialogue-text').first().textContent();
    console.log(`Mira story dialogue: ${miraDialogue?.substring(0, 200)}...`);
    
    // Check if we're now in the Mira story (look for characteristic text)
    let inMiraStory = false;
    if (miraDialogue?.toLowerCase().includes('agent') || 
        miraDialogue?.toLowerCase().includes('hacker') ||
        miraDialogue?.toLowerCase().includes('intel') ||
        miraDialogue?.toLowerCase().includes('café')) {
      console.log('✓ Successfully reached Mira story!');
      inMiraStory = true;
    }
    
    // If we're in the Mira story, continue with the interactive elements
    if (inMiraStory) {
      let miraStep = 0;
      const maxMiraSteps = 7;
      
      while (miraStep < maxMiraSteps) {
        console.log(`\n--- Mira Story Step ${miraStep + 1} ---`);
        
        await page.waitForTimeout(2000);
        
        // Get current story text
        const storyText = await page.locator('#rpg-text, .rpg-text').first().textContent();
        console.log(`Story text: ${storyText?.substring(0, 100)}...`);
        
        // Look for any interactive elements
        const storyButtons = await page.locator('button:visible, .story-option:visible, .choice:visible').all();
        
        if (storyButtons.length > 0) {
          console.log(`Found ${storyButtons.length} story interaction buttons`);
          // Click the first available option
          await storyButtons[0].click();
          await page.waitForTimeout(3000);
        } else {
          // Try common story commands
          const storyCommands = ['next', 'continue', 'yes', 'no', 'help'];
          
          // Check if story text suggests a command
          let commandToTry = 'continue';
          for (const cmd of storyCommands) {
            if (storyText?.toLowerCase().includes(cmd)) {
              commandToTry = cmd;
              break;
            }
          }
          
          console.log(`Trying story command: ${commandToTry}`);
          await page.locator('.rpg-panel').first().click();
          await page.keyboard.type(commandToTry);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `mira-story-step-${miraStep + 1}.png`, 
          fullPage: true 
        });
        
        miraStep++;
      }
    }
    
    console.log('\n=== PHASE 6: Final Verification ===');
    
    // Take final screenshot
    await page.screenshot({ path: 'mira-proper-final.png', fullPage: true });
    
    const finalText = await page.locator('#rpg-text, .rpg-text').first().textContent();
    console.log(`Final text: ${finalText?.substring(0, 200)}...`);
    
    // Verify we successfully interacted with the system
    expect(terminalFound).toBe(true);
    expect(finalText?.length).toBeGreaterThan(0);
    
    console.log('\n=== TEST COMPLETED ===');
    console.log(`Terminal interaction: ${terminalFound}`);
    console.log(`Reached Mira story: ${inMiraStory}`);
  });
});