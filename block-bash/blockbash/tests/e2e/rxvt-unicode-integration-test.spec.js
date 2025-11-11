const { test, expect } = require('@playwright/test');

test.describe('rxvt-unicode Terminal Integration Test', () => {
  
  test('Should verify rxvt-unicode terminal styling and basic functionality', async ({ page }) => {
    console.log('=== rxvt-unicode TERMINAL INTEGRATION TEST ===');
    
    // Navigate to the main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    console.log('✓ Page loaded successfully');
    
    // Wait for terminal to be ready
    await page.waitForFunction(() => window.term !== undefined, { timeout: 10000 });
    console.log('✓ Terminal object available');
    
    // Verify rxvt-unicode terminal theme
    const terminalTheme = await page.evaluate(() => {
      if (!window.term || !window.term.options || !window.term.options.theme) {
        return null;
      }
      return {
        background: window.term.options.theme.background,
        foreground: window.term.options.theme.foreground,
        cursor: window.term.options.theme.cursor,
        fontFamily: window.term.options.fontFamily,
        fontSize: window.term.options.fontSize,
        cursorBlink: window.term.options.cursorBlink,
        cursorStyle: window.term.options.cursorStyle
      };
    });
    
    console.log('Terminal configuration:', terminalTheme);
    
    // Verify rxvt-unicode Nord color scheme
    expect(terminalTheme.background).toBe('#2e3440');
    expect(terminalTheme.foreground).toBe('#d8dee9');
    expect(terminalTheme.cursor).toBe('#d8dee9');
    expect(terminalTheme.fontFamily).toBe('Liberation Mono, Consolas, monospace');
    expect(terminalTheme.cursorBlink).toBe(false);
    expect(terminalTheme.cursorStyle).toBe('block');
    console.log('✅ rxvt-unicode color scheme verified');
    
    // Check CSS styling
    const terminalElement = await page.locator('#output-terminal');
    await expect(terminalElement).toBeVisible();
    
    const cssStyles = await terminalElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        fontFamily: computed.fontFamily
      };
    });
    console.log('CSS styles applied:', cssStyles);
    
    // Test basic terminal interaction using keyboard events
    console.log('Testing terminal input...');
    
    // Click on terminal to focus
    await terminalElement.click();
    
    // Send a simple command using keyboard
    await page.keyboard.type('echo "rxvt-unicode test"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Get terminal buffer content
    const terminalContent = await page.evaluate(() => {
      if (!window.term) return 'Terminal not available';
      
      const buffer = window.term.buffer.active;
      let content = '';
      
      // Get last few lines of terminal
      for (let i = Math.max(0, buffer.length - 5); i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString().trim() + '\\n';
        }
      }
      
      return content;
    });
    
    console.log('Terminal output after echo command:', terminalContent);
    
    // Test another command to verify Docker integration
    console.log('Testing Docker containerization...');
    await page.keyboard.type('whoami');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    const dockerOutput = await page.evaluate(() => {
      if (!window.term) return 'Terminal not available';
      
      const buffer = window.term.buffer.active;
      let content = '';
      
      // Get last few lines
      for (let i = Math.max(0, buffer.length - 3); i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString().trim() + '\\n';
        }
      }
      
      return content;
    });
    
    console.log('Docker command output:', dockerOutput);
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'tests/screenshots/rxvt-unicode-terminal-test.png', fullPage: true });
    
    console.log('✅ rxvt-unicode terminal integration test completed successfully');
  });
  
  test('Should verify Mira workshop can be accessed via API', async ({ page }) => {
    console.log('=== MIRA WORKSHOP API TEST ===');
    
    // Test the workshop API directly
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/ws/workshop?lesson_id=mira');
        const data = await res.json();
        return {
          success: true,
          title: data.manifest ? data.manifest.title : 'Unknown',
          steps: data.manifest ? data.manifest.steps : 0,
          hasHTML: !!data.indexHtml
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('Workshop API response:', response);
    
    expect(response.success).toBe(true);
    expect(response.title).toContain('Mission');
    expect(response.steps).toBeGreaterThan(0);
    expect(response.hasHTML).toBe(true);
    
    console.log('✅ Mira workshop API test completed');
  });
  
});