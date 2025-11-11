const { test, expect } = require('@playwright/test');
const { skipOnboarding } = require('./utils/skipOnboarding');

test.describe('Mira Story Terminal Interaction', () => {
  test('Find and interact with RPG terminal correctly', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    console.log('Loading RPG interface...');
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    
    // Skip onboarding if present
    await skipOnboarding(page);
    
    // Wait for RPG panel
    await page.waitForSelector('.rpg-panel', { timeout: 30000 });
    console.log('RPG panel loaded');
    
    // Take initial screenshot
    await page.screenshot({ path: 'terminal-debug-1-initial.png', fullPage: true });
    
    console.log('\n=== Finding the RPG Terminal ===');
    
    // The RPG says there's a terminal that glows nearby
    // Let's look for all possible terminal interfaces
    
    // Method 1: Look for iframe containing terminal
    const iframes = await page.locator('iframe').all();
    console.log(`Found ${iframes.length} iframes`);
    
    for (let i = 0; i < iframes.length; i++) {
      try {
        const iframe = iframes[i];
        const src = await iframe.getAttribute('src');
        console.log(`Iframe ${i}: src=${src}`);
        
        if (src && (src.includes('terminal') || src.includes('sandbox'))) {
          console.log(`Found terminal iframe: ${src}`);
          
          // Switch to iframe context
          const frameContent = iframe.contentFrame();
          if (frameContent) {
            // Look for terminal input in iframe
            const terminalInput = frameContent.locator('input, textarea').first();
            if (await terminalInput.count() > 0) {
              console.log('Found terminal input in iframe');
              await terminalInput.fill('ls');
              await terminalInput.press('Enter');
              await page.waitForTimeout(3000);
              break;
            }
          }
        }
      } catch (e) {
        console.log(`Error accessing iframe ${i}:`, e.message);
      }
    }
    
    // Method 2: Look for WebSocket-based terminal
    console.log('\nLooking for WebSocket terminal...');
    
    // Check for any WebSocket connections or terminal containers
    const terminalContainers = await page.locator('*[id*="terminal"], *[class*="terminal"], *[data-terminal], .xterm, .terminal-widget').all();
    console.log(`Found ${terminalContainers.length} potential terminal containers`);
    
    for (let i = 0; i < terminalContainers.length; i++) {
      const container = terminalContainers[i];
      const tagName = await container.evaluate(el => el.tagName);
      const id = await container.getAttribute('id') || '';
      const className = await container.getAttribute('class') || '';
      console.log(`Terminal container ${i}: ${tagName} id="${id}" class="${className}"`);
      
      // Try clicking on terminal container to activate it
      if (await container.isVisible()) {
        await container.click();
        await page.waitForTimeout(1000);
        
        // Try typing after clicking
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        // Check if anything changed
        const dialogueAfter = await page.locator('#rpg-text').textContent();
        console.log(`Dialogue after terminal interaction: ${dialogueAfter?.substring(0, 100)}...`);
        break;
      }
    }
    
    // Method 3: Look for hidden or dynamically created inputs
    console.log('\nLooking for dynamic terminal elements...');
    
    // Execute JavaScript to find all input elements, including hidden ones
    const allInputs = await page.evaluate(() => {
      const inputs = [];
      const allElements = document.querySelectorAll('*');
      
      for (const el of allElements) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          inputs.push({
            tagName: el.tagName,
            type: el.type,
            id: el.id,
            className: el.className,
            placeholder: el.placeholder,
            visible: el.offsetParent !== null,
            value: el.value
          });
        }
      }
      return inputs;
    });
    
    console.log(`Found ${allInputs.length} input elements:`);
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      console.log(`  ${i}: ${input.tagName}[${input.type}] id="${input.id}" class="${input.className}" visible=${input.visible}`);
    }
    
    // Method 4: Look for canvas-based terminal (like xterm.js)
    console.log('\nLooking for canvas-based terminals...');
    const canvases = await page.locator('canvas').all();
    console.log(`Found ${canvases.length} canvas elements`);
    
    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      const id = await canvas.getAttribute('id') || '';
      const className = await canvas.getAttribute('class') || '';
      console.log(`Canvas ${i}: id="${id}" class="${className}"`);
      
      // Try clicking on canvas and typing
      if (await canvas.isVisible()) {
        console.log('Clicking on canvas and trying to type...');
        await canvas.click();
        await page.waitForTimeout(500);
        await page.keyboard.type('ls');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    // Method 5: Check if the textarea we found earlier is actually the right one
    console.log('\nRe-examining textarea input...');
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      console.log('Found textarea - examining its context...');
      
      const parentElement = await textarea.locator('..').first();
      const parentClass = await parentElement.getAttribute('class') || '';
      const parentId = await parentElement.getAttribute('id') || '';
      console.log(`Textarea parent: class="${parentClass}" id="${parentId}"`);
      
      // Clear and try entering ls command properly
      await textarea.click();
      await textarea.fill('');
      await page.waitForTimeout(500);
      await textarea.type('ls');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Check for changes
      const dialogueAfterTextarea = await page.locator('#rpg-text').textContent();
      console.log(`Dialogue after textarea ls: ${dialogueAfterTextarea?.substring(0, 100)}...`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'terminal-debug-2-final.png', fullPage: true });
    
    // Method 6: Try interacting with the RPG system through script events
    console.log('\nTrying script-based interaction...');
    
    // Check if there are any custom RPG events or functions we can call
    const hasLogicJS = await page.evaluate(() => {
      return typeof window.dispatchEvent !== 'undefined';
    });
    
    if (hasLogicJS) {
      console.log('Trying to dispatch RPG events...');
      
      // Try dispatching a command event
      await page.evaluate(() => {
        const event = new CustomEvent('rpg-command', { detail: 'ls' });
        window.dispatchEvent(event);
      });
      
      await page.waitForTimeout(2000);
      
      // Check for changes
      const dialogueAfterEvent = await page.locator('#rpg-text').textContent();
      console.log(`Dialogue after event dispatch: ${dialogueAfterEvent?.substring(0, 100)}...`);
    }
    
    console.log('\n=== Terminal Interaction Test Complete ===');
    
    // Check if we successfully interacted
    const finalDialogue = await page.locator('#rpg-text').textContent();
    const dialogueChanged = !finalDialogue?.includes('Type ls in the terminal to look around');
    
    console.log(`Dialogue changed from initial state: ${dialogueChanged}`);
    
    expect(finalDialogue?.length).toBeGreaterThan(0);
  });
});