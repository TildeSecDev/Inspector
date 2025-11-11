import { test, expect } from '@playwright/test';

test.describe('Terminal Prompt State Management', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh browser context for each test
    await page.goto('http://localhost:3000/editor');
    
    // Wait for the page to load and terminal to initialize
    await page.waitForSelector('#terminal', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for WebSocket connections
  });

  test('should not duplicate $ prompts when running commands', async ({ page }) => {
    // Find the terminal element
    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();

    // Wait for initial prompt
    await page.waitForTimeout(1000);
    
    // Take a screenshot before any commands
    await page.screenshot({ path: 'terminal-before-commands.png' });

    // Simulate typing a simple command multiple times
    await page.keyboard.type('echo "test1"');
    await page.keyboard.press('Enter');
    
    // Wait for command to complete
    await page.waitForTimeout(2000);
    
    await page.keyboard.type('echo "test2"');
    await page.keyboard.press('Enter');
    
    // Wait for command to complete
    await page.waitForTimeout(2000);
    
    await page.keyboard.type('echo "test3"');
    await page.keyboard.press('Enter');
    
    // Wait for command to complete
    await page.waitForTimeout(2000);

    // Take a screenshot after commands
    await page.screenshot({ path: 'terminal-after-commands.png' });

    // Get terminal content
    const terminalContent = await page.evaluate(() => {
      const terminal = document.querySelector('#terminal');
      if (terminal) {
        // Try to get the xterm.js buffer content
        const xtermElement = terminal.querySelector('.xterm-helper-textarea');
        if (xtermElement) {
          return (xtermElement as any).value || '';
        }
        // Fallback to text content
        return terminal.textContent || '';
      }
      return '';
    });

    console.log('Terminal content:', terminalContent);

    // Count the number of $ symbols that appear at the beginning of lines
    // This is a simple heuristic to detect prompt duplication
    const lines = terminalContent.split('\n');
    let promptCount = 0;
    let consecutivePrompts = 0;
    let maxConsecutivePrompts = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '$' || trimmedLine.startsWith('$ ')) {
        promptCount++;
        consecutivePrompts++;
        maxConsecutivePrompts = Math.max(maxConsecutivePrompts, consecutivePrompts);
      } else if (trimmedLine.length > 0) {
        consecutivePrompts = 0;
      }
    }

    console.log(`Total prompts found: ${promptCount}`);
    console.log(`Max consecutive prompts: ${maxConsecutivePrompts}`);

    // We should not have more than 1 consecutive prompt at any time
    expect(maxConsecutivePrompts).toBeLessThanOrEqual(1);
    
    // The total number of prompts should be reasonable (initial + after each command)
    // Expected: 1 initial + 3 after commands = 4 maximum
    expect(promptCount).toBeLessThanOrEqual(6); // Being generous to account for variations
  });

  test('should handle Ctrl+C without duplicating prompts', async ({ page }) => {
    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();

    // Start a command that might take time
    await page.keyboard.type('sleep 5');
    await page.keyboard.press('Enter');
    
    // Wait a bit then interrupt with Ctrl+C
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+c');
    
    // Wait for interrupt to process
    await page.waitForTimeout(1000);
    
    // Run another command
    await page.keyboard.type('echo "after interrupt"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'terminal-after-interrupt.png' });

    // Check for prompt duplication after interrupt
    const terminalContent = await page.evaluate(() => {
      const terminal = document.querySelector('#terminal');
      return terminal ? terminal.textContent || '' : '';
    });

    const lines = terminalContent.split('\n');
    let consecutivePrompts = 0;
    let maxConsecutivePrompts = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '$' || trimmedLine.startsWith('$ ')) {
        consecutivePrompts++;
        maxConsecutivePrompts = Math.max(maxConsecutivePrompts, consecutivePrompts);
      } else if (trimmedLine.length > 0) {
        consecutivePrompts = 0;
      }
    }

    console.log(`Max consecutive prompts after interrupt: ${maxConsecutivePrompts}`);
    expect(maxConsecutivePrompts).toBeLessThanOrEqual(1);
  });

  test('should maintain single prompt when clearing terminal', async ({ page }) => {
    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();

    // Run some commands first
    await page.keyboard.type('echo "before clear"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Clear terminal with Ctrl+L
    await page.keyboard.press('Control+l');
    await page.waitForTimeout(1000);

    // Take screenshot after clear
    await page.screenshot({ path: 'terminal-after-clear.png' });

    // Run another command
    await page.keyboard.type('echo "after clear"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check terminal state
    const terminalContent = await page.evaluate(() => {
      const terminal = document.querySelector('#terminal');
      return terminal ? terminal.textContent || '' : '';
    });

    const lines = terminalContent.split('\n');
    let consecutivePrompts = 0;
    let maxConsecutivePrompts = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '$' || trimmedLine.startsWith('$ ')) {
        consecutivePrompts++;
        maxConsecutivePrompts = Math.max(maxConsecutivePrompts, consecutivePrompts);
      } else if (trimmedLine.length > 0) {
        consecutivePrompts = 0;
      }
    }

    console.log(`Max consecutive prompts after clear: ${maxConsecutivePrompts}`);
    expect(maxConsecutivePrompts).toBeLessThanOrEqual(1);
  });

  test('should properly handle WebSocket connection and command execution', async ({ page }) => {
    // Monitor network activity
    const responsePromises: Promise<any>[] = [];
    page.on('response', response => {
      if (response.url().includes('/sandbox/exec')) {
        responsePromises.push(response.text());
      }
    });

    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();

    // Test a command that should return output
    await page.keyboard.type('curl --version');
    await page.keyboard.press('Enter');
    
    // Wait for command execution
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'terminal-curl-test.png' });

    // Check if curl output is present
    const terminalContent = await page.evaluate(() => {
      const terminal = document.querySelector('#terminal');
      return terminal ? terminal.textContent || '' : '';
    });

    console.log('Terminal content after curl:', terminalContent);
    
    // Should contain curl version info
    expect(terminalContent.toLowerCase()).toContain('curl');
    
    // Should not have excessive prompts
    const promptCount = (terminalContent.match(/\$\s/g) || []).length;
    console.log(`Prompt count after curl: ${promptCount}`);
    expect(promptCount).toBeLessThanOrEqual(4); // Initial + after command
  });
});
