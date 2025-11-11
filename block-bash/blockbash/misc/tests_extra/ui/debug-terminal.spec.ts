import { test, expect, Page } from '@playwright/test';

test.describe('Debug Terminal Prompt', () => {
  let testPage: Page;

  test.beforeEach(async ({ page }) => {
    testPage = page;
    await testPage.goto('http://localhost:3000/editor');
    await testPage.waitForSelector('#output-terminal');
    // Wait longer for terminal to fully initialize
    await testPage.waitForTimeout(5000);
  });

  test.afterEach(async () => {
    // Page will be automatically closed by Playwright
  });

  test('should show current terminal content for debugging', async () => {
    // Get raw content first
    const rawContent = await testPage.locator('#output-terminal').textContent();
    console.log('=== RAW CONTENT ANALYSIS ===');
    console.log('Raw content length:', rawContent?.length);
    
    // Split into lines and analyze patterns
    const lines = rawContent?.split('\n') || [];
    console.log('Total lines:', lines.length);
    
    const contentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.includes('.xterm-') && 
             !trimmed.includes('color:') && 
             !trimmed.includes('@keyframes') &&
             !trimmed.includes('rgba(') &&
             !trimmed.includes('{ ') &&
             !trimmed.includes(' }') &&
             !/^(.)\1{10,}$/.test(trimmed);
    });
    
    console.log('Non-CSS lines:', contentLines.length);
    console.log('Sample non-CSS lines:', contentLines.slice(0, 10));
    
    // Show the lines that contain $ symbols
    const promptLines = lines.filter(line => line.includes('$'));
    console.log('=== LINES WITH $ SYMBOLS ===');
    promptLines.forEach((line, index) => {
      console.log(`${index}: "${line}"`);
    });
    
    // Execute a simple command
    await testPage.locator('#output-terminal').click();
    await testPage.keyboard.type('echo "test"');
    await testPage.keyboard.press('Enter');
    
    // Wait for command execution
    await testPage.waitForTimeout(2000);
    
    // Get final raw content
    const finalRawContent = await testPage.locator('#output-terminal').textContent();
    console.log('=== FINAL RAW CONTENT ANALYSIS ===');
    
    // Find terminal lines after command
    const finalLines = finalRawContent?.split('\n') || [];
    const finalPromptLines = finalLines.filter(line => line.includes('$'));
    console.log('=== FINAL LINES WITH $ SYMBOLS ===');
    finalPromptLines.forEach((line, index) => {
      console.log(`${index}: "${line}"`);
    });
    
    // This test always passes - it's just for debugging
    expect(true).toBe(true);
  });
});
