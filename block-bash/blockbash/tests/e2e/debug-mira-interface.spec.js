const { test, expect } = require('@playwright/test');
const { skipOnboarding } = require('./utils/skipOnboarding');

test.describe('Debug Mira Story Interface', () => {
  test('Examine main interface structure', async ({ page }) => {
    console.log('Loading main interface for debugging...');
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    
    // Skip onboarding if present
    await skipOnboarding(page);
    
    console.log('Taking screenshot of initial page...');
    await page.screenshot({ path: 'debug-main-interface.png', fullPage: true });
    
    // Get all clickable elements
    const clickableElements = await page.locator('button, input, .clickable, [data-action], .btn, .menu-btn').all();
    console.log(`Found ${clickableElements.length} clickable elements:`);
    
    for (let i = 0; i < clickableElements.length && i < 10; i++) {
      const element = clickableElements[i];
      const text = await element.textContent() || '';
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class') || '';
      console.log(`${i}: ${tagName} - "${text.trim()}" - class: ${className}`);
    }
    
    // Look for any terminal-related elements
    const allElements = await page.locator('*').all();
    console.log('\nLooking for terminal-related elements...');
    
    for (const element of allElements.slice(0, 100)) { // Check first 100 elements
      try {
        const className = await element.getAttribute('class') || '';
        const id = await element.getAttribute('id') || '';
        const text = await element.textContent() || '';
        
        if (className.includes('terminal') || className.includes('command') || 
            id.includes('terminal') || id.includes('command') ||
            text.toLowerCase().includes('terminal') || text.toLowerCase().includes('command')) {
          console.log(`Terminal-related: ${await element.evaluate(el => el.tagName)} - id: ${id}, class: ${className}, text: "${text.substring(0, 50)}"`);
        }
      } catch (e) {
        // Skip elements that might not be accessible
      }
    }
    
    // Look for workshop-related elements
    console.log('\nLooking for workshop-related elements...');
    const workshopElements = await page.locator('*[class*="workshop"], *[id*="workshop"], *[class*="rpg"], *[id*="rpg"]').all();
    
    for (let i = 0; i < workshopElements.length && i < 10; i++) {
      try {
        const element = workshopElements[i];
        const tagName = await element.evaluate(el => el.tagName);
        const className = await element.getAttribute('class') || '';
        const id = await element.getAttribute('id') || '';
        const text = await element.textContent() || '';
        console.log(`Workshop: ${tagName} - id: ${id}, class: ${className}, text: "${text.substring(0, 50)}"`);
      } catch (e) {
        // Skip inaccessible elements
      }
    }
    
    // Get page HTML for analysis
    const pageHTML = await page.content();
    console.log('\nPage contains terminal:', pageHTML.toLowerCase().includes('terminal'));
    console.log('Page contains command:', pageHTML.toLowerCase().includes('command'));
    console.log('Page contains workshop:', pageHTML.toLowerCase().includes('workshop'));
    console.log('Page contains rpg:', pageHTML.toLowerCase().includes('rpg'));
    console.log('Page contains mira:', pageHTML.toLowerCase().includes('mira'));
    
    // Try clicking somewhere to activate interface
    console.log('\nTrying to activate interface...');
    const bodyElement = await page.locator('body').first();
    await bodyElement.click();
    await page.waitForTimeout(2000);
    
    // Try pressing keys to see if there's a hidden terminal
    console.log('Trying keyboard input...');
    await page.keyboard.type('ls');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    console.log('Taking final screenshot...');
    await page.screenshot({ path: 'debug-after-interaction.png', fullPage: true });
  });
});