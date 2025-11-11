import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Mira Story Interactive Completion', () => {
  
  test('Complete Mira story by navigating workshop interface', async ({ page }) => {
    console.log('=== MIRA STORY WORKSHOP COMPLETION ===');
    
    // Navigate to main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Skip onboarding overlay if present
    await skipOnboarding(page);
    
    console.log('Phase 1: Accessing Mira Workshop');
    
    // Look for workshop/activities section
    const workshopElements = page.locator('a:has-text("Workshop"), button:has-text("Workshop"), [data-activity="mira"], .workshop-card, .activity-card');
    let foundWorkshop = false;
    
    if (await workshopElements.count() > 0) {
      console.log(`✓ Found ${await workshopElements.count()} workshop elements`);
      const workshopBtn = workshopElements.first();
      if (await workshopBtn.isVisible()) {
        await workshopBtn.click();
        await page.waitForTimeout(1500);
        foundWorkshop = true;
        console.log('✓ Clicked workshop button');
      }
    }
    
    // If not found, try looking for Mira directly
    if (!foundWorkshop) {
      const miraElements = page.locator(':has-text("Mira"):not(:has-text("admin")):not(:has-text("Administrator"))');
      if (await miraElements.count() > 0) {
        const miraBtn = miraElements.first();
        if (await miraBtn.isVisible()) {
          await miraBtn.click();
          await page.waitForTimeout(1500);
          console.log('✓ Clicked Mira element directly');
        }
      }
    }
    
    // Alternative: Navigate directly to workshop endpoint
    console.log('Phase 2: Direct Workshop Navigation');
    
    await page.evaluate(() => {
      // Try to find and execute workshop loading function
      if (typeof loadWorkshop === 'function') {
        loadWorkshop('mira');
      } else if (typeof window.loadWorkshopByName === 'function') {
        window.loadWorkshopByName('mira');
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Look for Mira-specific elements from the HTML we saw
    const miraWorkshopElements = page.locator('.mira-title, #begin-btn, .mira-menu-container, :has-text("Welcome to Mira")');
    if (await miraWorkshopElements.count() === 0) {
      console.log('🔄 Workshop not loaded in current context, trying direct API call...');
      
      // Execute workshop loading via JavaScript
      await page.evaluate(async () => {
        try {
          const response = await fetch('/ws/workshop?lesson_id=mira');
          const data = await response.json();
          console.log('Workshop data loaded:', data);
          
          // Insert the workshop HTML
          if (data.indexHtml) {
            document.body.innerHTML = data.indexHtml;
            
            // Load the logic script
            if (data.hasLogic) {
              const script = document.createElement('script');
              script.src = '/ws/workshop_asset?lesson_id=mira&file=logic.js';
              document.head.appendChild(script);
            }
          }
        } catch (error) {
          console.error('Failed to load workshop:', error);
        }
      });
      
      await page.waitForTimeout(3000);
    }
    
    console.log('Phase 3: Interacting with Mira Workshop');
    
    // Now look for Mira workshop elements
    const beginBtn = page.locator('#begin-btn, button:has-text("Begin"), .mira-menu-btn');
    if (await beginBtn.count() > 0) {
      console.log('✓ Found Begin button');
      const btn = beginBtn.first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(2000);
        console.log('✓ Clicked Begin button');
      }
    }
    
    // Look for chapter navigation
    const chapterDropdown = page.locator('#chapter-dropdown, .chapter-dropdown, .dropdown-label');
    if (await chapterDropdown.count() > 0) {
      console.log('✓ Found chapter dropdown');
      const dropdown = chapterDropdown.first();
      if (await dropdown.isVisible()) {
        await dropdown.click();
        await page.waitForTimeout(1000);
        console.log('✓ Opened chapter dropdown');
        
        // Look for first chapter
        const chapterItems = page.locator('.chapter-btn, [data-chapter], .dropdown-list li');
        if (await chapterItems.count() > 0) {
          const firstChapter = chapterItems.first();
          if (await firstChapter.isVisible()) {
            await firstChapter.click();
            await page.waitForTimeout(2000);
            console.log('✓ Selected first chapter');
          }
        }
      }
    }
    
    console.log('Phase 4: Completing Story Tasks');
    
    // Look for story/task content
    const storyElements = page.locator('.story-content, .task-description, .dialogue, .scenario, .mission-text');
    if (await storyElements.count() > 0) {
      console.log(`✓ Found ${await storyElements.count()} story elements`);
      
      for (let i = 0; i < Math.min(await storyElements.count(), 3); i++) {
        const element = storyElements.nth(i);
        const text = await element.textContent();
        console.log(`📖 Story element ${i + 1}: ${text?.substring(0, 100)}...`);
      }
    }
    
    // Look for command inputs and interactive elements
    const interactiveElements = page.locator('input[type="text"], textarea, .command-input, .terminal-input');
    console.log(`💻 Found ${await interactiveElements.count()} interactive elements`);
    
    // Try common network commands from Mira story
    const miraCommands = [
      'airodump-ng wlan0mon',
      'iwlist scan',
      'aireplay-ng -0 5 -a 00:11:22:33:44:55 wlan0mon',
      'aircrack-ng -w wordlist.txt capture.cap'
    ];
    
    let commandsExecuted = 0;
    
    for (const command of miraCommands) {
      if (await interactiveElements.count() > 0) {
        try {
          const input = interactiveElements.first();
          if (await input.isVisible() && await input.isEnabled()) {
            await input.fill(command);
            await page.waitForTimeout(500);
            
            // Try to submit the command
            const submitBtns = page.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit"), [type="submit"], .execute-btn, .submit-btn');
            if (await submitBtns.count() > 0) {
              const submitBtn = submitBtns.first();
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                await page.waitForTimeout(1500);
                console.log(`✅ Executed: ${command}`);
                commandsExecuted++;
              }
            } else {
              // Try Enter key
              await input.press('Enter');
              await page.waitForTimeout(1000);
              console.log(`⌨️ Submitted via Enter: ${command}`);
              commandsExecuted++;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not execute ${command}: ${error.message}`);
        }
      }
      
      // Check for progress/feedback after each command
      const feedback = page.locator('.success, .correct, .completed, .achievement, .progress');
      if (await feedback.count() > 0) {
        console.log(`🎯 Found feedback after command: ${command}`);
      }
    }
    
    console.log('Phase 5: Progress and Completion Check');
    
    // Look for completion indicators
    const completionElements = page.locator(':has-text("completed"), :has-text("success"), :has-text("congratulations"), .chapter-complete, .mission-complete, .achievement-unlocked');
    const completionCount = await completionElements.count();
    
    // Look for next/continue buttons
    const nextButtons = page.locator('button:has-text("Next"), button:has-text("Continue"), .next-btn, .continue-btn');
    const nextCount = await nextButtons.count();
    
    if (nextCount > 0) {
      console.log(`⏭️ Found ${nextCount} next/continue buttons`);
      const nextBtn = nextButtons.first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(2000);
        console.log('✓ Clicked next/continue button');
      }
    }
    
    // Check for achievements
    const achievementElements = page.locator('.achievement, .badge, :has-text("Rogue AP"), :has-text("Connection Guardian"), :has-text("Handshake Verifier")');
    const achievementCount = await achievementElements.count();
    
    console.log('=== MIRA STORY COMPLETION RESULTS ===');
    console.log(`✓ Commands executed: ${commandsExecuted}`);
    console.log(`✓ Completion indicators: ${completionCount}`);
    console.log(`✓ Next/continue options: ${nextCount}`);
    console.log(`✓ Achievements found: ${achievementCount}`);
    
    // Final screenshot for verification
    await page.screenshot({ path: 'mira-story-completion.png', fullPage: true });
    console.log('📸 Screenshot saved: mira-story-completion.png');
    
    // Basic assertion - we should have attempted at least one command
    expect(commandsExecuted).toBeGreaterThanOrEqual(1);
    
    console.log('✅ MIRA STORY COMPLETION TEST FINISHED');
  });
  
  test('Verify Mira story JSON data and structure', async ({ page }) => {
    console.log('=== MIRA STORY DATA VERIFICATION ===');
    
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForTimeout(1000);
    await skipOnboarding(page);
    
    // Test the workshop API directly
    const workshopData = await page.evaluate(async () => {
      try {
        const response = await fetch('/ws/workshop?lesson_id=mira');
        const data = await response.json();
        return data;
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Workshop API Response:', JSON.stringify(workshopData, null, 2));
    
    // Verify expected structure
    expect(workshopData).toHaveProperty('manifest');
    expect(workshopData).toHaveProperty('indexHtml');
    expect(workshopData.manifest).toHaveProperty('title');
    expect(workshopData.manifest).toHaveProperty('steps');
    
    console.log(`✓ Workshop title: ${workshopData.manifest.title}`);
    console.log(`✓ Number of steps: ${workshopData.manifest.steps?.length || 0}`);
    console.log(`✓ Has logic script: ${workshopData.hasLogic}`);
    console.log(`✓ Has style sheet: ${workshopData.hasStyle}`);
    
    console.log('✅ MIRA STORY DATA VERIFICATION COMPLETED');
  });
});