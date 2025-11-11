const { test, expect } = require('@playwright/test');

test.describe('Docker Terminal Connection Debug', () => {
  test('Debug Docker container connection for terminal commands', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    console.log('Starting Docker terminal connection debug...');
    
    // Navigate to the main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded, setting up WebSocket monitoring...');
    
    // Monitor WebSocket connections
    const wsMessages = [];
    page.on('websocket', ws => {
      console.log(`WebSocket created: ${ws.url()}`);
      
      ws.on('framesent', event => {
        const data = event.payload;
        console.log(`>> WebSocket sent: ${data}`);
        wsMessages.push({ type: 'sent', data });
      });
      
      ws.on('framereceived', event => {
        const data = event.payload;
        console.log(`<< WebSocket received: ${data}`);
        wsMessages.push({ type: 'received', data });
      });
      
      ws.on('close', () => {
        console.log('WebSocket closed');
      });
    });
    
    console.log('Looking for terminal interface...');
    
    // Wait for any terminal interface to load
    await page.waitForTimeout(3000);
    
    // Try to find and interact with terminal
    const xtermTextarea = page.locator('.xterm-helper-textarea').first();
    
    if (await xtermTextarea.count() > 0) {
      console.log('Found xterm textarea - clicking to focus...');
      await xtermTextarea.click();
      await page.waitForTimeout(1000);
      
      console.log('Typing "ls" command...');
      await page.keyboard.type('ls');
      await page.keyboard.press('Enter');
      
      // Wait for WebSocket responses
      await page.waitForTimeout(5000);
      
      console.log('Typing "whoami" command...');
      await page.keyboard.type('whoami');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(5000);
      
      console.log('Typing "pwd" command...');
      await page.keyboard.type('pwd');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(5000);
    } else {
      console.log('No xterm textarea found, trying alternative approaches...');
      
      // Try direct WebSocket connection
      await page.evaluate(async () => {
        console.log('Attempting direct WebSocket connection...');
        
        const ws = new WebSocket('ws://localhost:3000/sandbox/exec');
        
        ws.onopen = () => {
          console.log('WebSocket connected directly');
          
          // Send a test command
          ws.send(JSON.stringify({
            type: 'command',
            command: 'ls'
          }));
        };
        
        ws.onmessage = (event) => {
          console.log('Direct WS message:', event.data);
        };
        
        ws.onerror = (error) => {
          console.error('Direct WS error:', error);
        };
        
        // Keep connection open briefly
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        ws.close();
      });
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'docker-debug.png', fullPage: true });
    
    console.log('\n=== WebSocket Message Summary ===');
    for (let i = 0; i < wsMessages.length; i++) {
      const msg = wsMessages[i];
      console.log(`${i + 1}. [${msg.type.toUpperCase()}] ${msg.data}`);
    }
    
    console.log('\n=== Docker Debug Test Complete ===');
    expect(true).toBe(true); // Test always passes, we're just debugging
  });
});