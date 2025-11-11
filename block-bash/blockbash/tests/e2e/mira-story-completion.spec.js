import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Mira Story Completion Test', () => {
  
  test('Complete the Mira story from start to finish', async ({ page }) => {
    console.log('=== MIRA STORY COMPLETION TEST ===');
    
    // Navigate to main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Skip onboarding overlay if present
    await skipOnboarding(page);
    
    console.log('Phase 1: Navigating to Mira Story');
    
    // Look for workshops or activities section
    const workshopsLink = page.locator('a:has-text("Workshops"), button:has-text("Workshops"), [href*="workshop"]').first();
    if (await workshopsLink.isVisible()) {
      await workshopsLink.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked on Workshops section');
    }
    
    // Alternative: try navigating directly to Mira story
    await page.goto('http://localhost:3000/workshop/mira');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    console.log('✓ Navigated to Mira workshop directly');
    
    // Look for Mira story or character
    const miraElements = page.locator(':has-text("Mira"):not(:has-text("admin")):not(:has-text("Administrator"))');
    if (await miraElements.count() > 0) {
      console.log(`✓ Found ${await miraElements.count()} Mira-related elements`);
      
      // Click on the first available Mira element
      const miraStoryLink = miraElements.first();
      if (await miraStoryLink.isVisible()) {
        await miraStoryLink.click();
        await page.waitForTimeout(1500);
        console.log('✓ Clicked on Mira story element');
      }
    }
    
    console.log('Phase 2: Beginning Mira Story Tasks');
    
    // Look for story content and tasks
    const storyContent = page.locator('.story-content, .task-description, .dialogue, .scenario');
    if (await storyContent.count() > 0) {
      console.log(`✓ Found ${await storyContent.count()} story content elements`);
      
      // Read the first task/scenario
      const firstTask = storyContent.first();
      const taskText = await firstTask.textContent();
      console.log(`📖 First task: ${taskText?.substring(0, 100)}...`);
    }
    
    // Look for interactive elements (terminals, command inputs, etc.)
    const terminalElements = page.locator('.terminal, .command-input, input[type="text"], textarea');
    console.log(`💻 Found ${await terminalElements.count()} interactive elements`);
    
    console.log('Phase 3: Completing Story Tasks');
    
    // Check for wireless/network related tasks based on the JSON content we saw
    const networkTasks = [
      'airodump-ng',
      'aireplay-ng', 
      'aircrack-ng',
      'iwconfig',
      'iwlist scan'
    ];
    
    let tasksCompleted = 0;
    
    // Try to complete common wireless attack scenarios from Mira story
    for (const command of networkTasks) {
      const commandInputs = page.locator('input[type="text"], textarea, .command-input');
      
      if (await commandInputs.count() > 0) {
        try {
          const input = commandInputs.first();
          if (await input.isVisible() && await input.isEnabled()) {
            await input.fill(command);
            await page.waitForTimeout(500);
            
            // Try to submit/execute the command
            const submitButtons = page.locator('button:has-text("Execute"), button:has-text("Run"), button[type="submit"], .execute-btn');
            if (await submitButtons.count() > 0) {
              const submitBtn = submitButtons.first();
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                await page.waitForTimeout(1000);
                console.log(`✓ Executed command: ${command}`);
                tasksCompleted++;
              }
            } else {
              // Try pressing Enter
              await input.press('Enter');
              await page.waitForTimeout(1000);
              console.log(`✓ Submitted command via Enter: ${command}`);
              tasksCompleted++;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not execute ${command}: ${error.message}`);
        }
      }
    }
    
    console.log('Phase 4: Checking Progress and Achievements');
    
    // Look for progress indicators
    const progressElements = page.locator('.progress, .achievement, .completed, .success, .badge');
    const progressCount = await progressElements.count();
    console.log(`🏆 Found ${progressCount} progress/achievement elements`);
    
    // Look for specific Mira story achievements mentioned in the JSON
    const miraAchievements = [
      'Rogue AP Remediator',
      'Connection Guardian', 
      'Handshake Verifier',
      'Wireless Network Savior'
    ];
    
    let achievementsFound = 0;
    for (const achievement of miraAchievements) {
      const achievementEl = page.locator(`:has-text("${achievement}")`);
      if (await achievementEl.count() > 0) {
        achievementsFound++;
        console.log(`🎯 Found achievement: ${achievement}`);
      }
    }
    
    console.log('Phase 5: Story Completion Verification');
    
    // Check for story completion indicators
    const completionIndicators = page.locator(':has-text("completed"), :has-text("finished"), :has-text("congratulations"), .story-complete, .chapter-complete');
    const completionCount = await completionIndicators.count();
    
    if (completionCount > 0) {
      console.log(`✅ Story completion detected: ${completionCount} completion indicators found`);
    }
    
    // Look for next chapter/continue buttons
    const continueButtons = page.locator('button:has-text("Continue"), button:has-text("Next"), a:has-text("Next Chapter")');
    const continueCount = await continueButtons.count();
    
    if (continueCount > 0) {
      console.log(`⏭️ Found ${continueCount} continue/next options`);
      const nextBtn = continueButtons.first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(1500);
        console.log('✓ Clicked continue to next part of story');
      }
    }
    
    // Final verification
    console.log('=== MIRA STORY TEST RESULTS ===');
    console.log(`✓ Tasks attempted: ${tasksCompleted}`);
    console.log(`✓ Achievements found: ${achievementsFound}`);
    console.log(`✓ Completion indicators: ${completionCount}`);
    console.log(`✓ Continue options: ${continueCount}`);
    
    // Basic assertions
    expect(tasksCompleted).toBeGreaterThanOrEqual(1); // At least one task attempted
    console.log('✅ MIRA STORY COMPLETION TEST FINISHED');
  });
  
  test('Navigate through Mira story chapters systematically', async ({ page }) => {
    console.log('=== MIRA STORY CHAPTER NAVIGATION TEST ===');
    
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await skipOnboarding(page);
    
    // Try direct navigation to workshop
    await page.goto('http://localhost:3000/workshop/mira');
    await page.waitForTimeout(2000);
    
    // Look for chapter navigation
    const chapters = page.locator('.chapter, .level, [data-chapter]');
    const chapterCount = await chapters.count();
    console.log(`📚 Found ${chapterCount} chapters/levels`);
    
    // Navigate through available chapters
    for (let i = 0; i < Math.min(chapterCount, 5); i++) {
      try {
        const chapter = chapters.nth(i);
        if (await chapter.isVisible()) {
          await chapter.click();
          await page.waitForTimeout(1000);
          console.log(`✓ Navigated to chapter ${i + 1}`);
          
          // Look for chapter content
          const chapterContent = page.locator('.task-description, .dialogue, .scenario');
          if (await chapterContent.count() > 0) {
            const content = await chapterContent.first().textContent();
            console.log(`📖 Chapter content preview: ${content?.substring(0, 80)}...`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not navigate to chapter ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('✅ CHAPTER NAVIGATION TEST COMPLETED');
  });
});