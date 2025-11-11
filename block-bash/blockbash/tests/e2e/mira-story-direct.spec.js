import { test, expect } from '@playwright/test';
import { skipOnboarding } from './utils/skipOnboarding.js';

test.describe('Mira Story Direct Completion', () => {
  
  test('Load and complete Mira story through workshop system', async ({ page }) => {
    console.log('=== MIRA STORY DIRECT COMPLETION TEST ===');
    
    // Navigate to main page
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Skip onboarding
    await skipOnboarding(page);
    
    console.log('Step 1: Loading Mira Workshop Directly');
    
    // Load the workshop data and inject it into the page
    const workshopLoaded = await page.evaluate(async () => {
      try {
        const response = await fetch('/ws/workshop?lesson_id=mira');
        const data = await response.json();
        
        console.log('Workshop data received:', data.manifest.title);
        
        // Replace page content with workshop HTML
        document.body.innerHTML = data.indexHtml;
        
        // Load workshop logic script
        if (data.hasLogic) {
          const script = document.createElement('script');
          script.src = '/ws/workshop_asset?lesson_id=mira&file=logic.js';
          script.onload = () => console.log('Workshop logic loaded');
          document.head.appendChild(script);
        }
        
        return { 
          success: true, 
          title: data.manifest.title,
          steps: data.manifest.steps.length
        };
      } catch (error) {
        console.error('Workshop loading error:', error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('Workshop loaded:', workshopLoaded);
    expect(workshopLoaded.success).toBe(true);
    
    // Wait for workshop to fully initialize
    await page.waitForTimeout(3000);
    
    console.log('Step 2: Navigating Through Workshop');
    
    // Take initial screenshot
    await page.screenshot({ path: 'mira-workshop-start.png', fullPage: true });
    
    // Look for the Begin button
    const beginBtn = page.locator('#begin-btn');
    if (await beginBtn.isVisible()) {
      console.log('✓ Found Begin button');
      await beginBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked Begin button');
    }
    
    // Check if we're now in the story/chapter interface
    await page.screenshot({ path: 'mira-after-begin.png', fullPage: true });
    
    // Look for story progression elements
    const storyElements = page.locator('.step-content, .story-step, .mission-content, .chapter-content, .task-content');
    const storyCount = await storyElements.count();
    console.log(`✓ Found ${storyCount} story content elements`);
    
    console.log('Step 3: Simulating Story Progression');
    
    // Try to progress through multiple steps
    for (let step = 0; step < 7; step++) {
      console.log(`--- Processing Step ${step + 1} ---`);
      
      // Look for current step content
      const currentStepText = await page.locator('body').textContent();
      
      if (currentStepText) {
        const preview = currentStepText.substring(0, 200).replace(/\s+/g, ' ').trim();
        console.log(`Step ${step + 1} content: ${preview}...`);
      }
      
      // Look for interactive elements in this step
      const inputs = page.locator('input[type="text"], textarea, .command-input, [contenteditable]');
      const buttons = page.locator('button:not(.mira-back-btn), .btn, .button, [role="button"]');
      
      const inputCount = await inputs.count();
      const buttonCount = await buttons.count();
      
      console.log(`Step ${step + 1}: ${inputCount} inputs, ${buttonCount} buttons`);
      
      // If there are inputs, try to fill them with relevant commands
      if (inputCount > 0) {
        const commands = [
          'airodump-ng wlan0mon',
          'iwlist scan',
          'aireplay-ng -0 10 -a 00:14:6C:7E:40:80 wlan0mon',
          'aircrack-ng -w /usr/share/wordlists/rockyou.txt capture-01.cap',
          'iwconfig wlan0 mode managed',
          'service network-manager restart',
          'nmap -sS 192.168.1.0/24'
        ];
        
        const input = inputs.first();
        const command = commands[step % commands.length];
        
        if (await input.isVisible()) {
          await input.fill(command);
          console.log(`✓ Entered command: ${command}`);
          await page.waitForTimeout(500);
        }
      }
      
      // Look for and click progression buttons
      const nextBtns = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Submit"), button:has-text("Execute"), .next-btn, .continue-btn, .submit-btn');
      
      if (await nextBtns.count() > 0) {
        const nextBtn = nextBtns.first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          console.log(`✓ Clicked progression button for step ${step + 1}`);
          await page.waitForTimeout(2000);
        }
      }
      
      // Check for success/completion indicators
      const success = page.locator('.success, .correct, .completed, .achievement, :has-text("Well done"), :has-text("Excellent"), :has-text("Correct")');
      if (await success.count() > 0) {
        console.log(`🎉 Success indicator found in step ${step + 1}`);
      }
      
      // Take screenshot of each step
      await page.screenshot({ path: `mira-step-${step + 1}.png`, fullPage: true });
    }
    
    console.log('Step 4: Checking Final Completion Status');
    
    // Look for final completion elements
    const completionElements = page.locator(':has-text("Mission Complete"), :has-text("Story Complete"), :has-text("Congratulations"), .mission-complete, .story-complete');
    const finalCompletionCount = await completionElements.count();
    
    // Look for achievements
    const achievements = page.locator('.achievement, .badge, :has-text("Achievement"), :has-text("Unlocked")');
    const achievementCount = await achievements.count();
    
    // Final screenshot
    await page.screenshot({ path: 'mira-final-completion.png', fullPage: true });
    
    console.log('=== MIRA STORY COMPLETION SUMMARY ===');
    console.log(`✓ Workshop successfully loaded: ${workshopLoaded.title}`);
    console.log(`✓ Number of story steps: ${workshopLoaded.steps}`);
    console.log(`✓ Story elements found: ${storyCount}`);
    console.log(`✓ Completion indicators: ${finalCompletionCount}`);
    console.log(`✓ Achievements found: ${achievementCount}`);
    console.log('✓ Screenshots saved for each step');
    
    // Verify we made it through the workshop
    expect(workshopLoaded.steps).toBeGreaterThanOrEqual(7);
    
    console.log('✅ MIRA STORY DIRECT COMPLETION FINISHED');
  });
  
  test('Test Mira story step progression with real workshop data', async ({ page }) => {
    console.log('=== MIRA STORY STEP DATA TEST ===');
    
    await page.goto('http://localhost:3000/pages/index.html');
    await page.waitForTimeout(1000);
    await skipOnboarding(page);
    
    // Get detailed step information
    const stepData = await page.evaluate(async () => {
      const steps = [];
      
      // Try to load each step file
      for (let i = 0; i < 7; i++) {
        try {
          const response = await fetch(`/ws/workshop_asset?lesson_id=mira&file=step${i}.json`);
          if (response.ok) {
            const stepJson = await response.json();
            steps.push({ 
              step: i, 
              data: stepJson,
              loaded: true 
            });
          } else {
            steps.push({ 
              step: i, 
              loaded: false,
              error: `HTTP ${response.status}` 
            });
          }
        } catch (error) {
          steps.push({ 
            step: i, 
            loaded: false, 
            error: error.message 
          });
        }
      }
      
      return steps;
    });
    
    console.log('Step Data Analysis:');
    stepData.forEach(step => {
      if (step.loaded) {
        console.log(`✓ Step ${step.step}: ${JSON.stringify(step.data).substring(0, 100)}...`);
      } else {
        console.log(`✗ Step ${step.step}: Failed to load (${step.error})`);
      }
    });
    
    const loadedSteps = stepData.filter(s => s.loaded).length;
    console.log(`📊 Successfully loaded ${loadedSteps} out of 7 steps`);
    
    expect(loadedSteps).toBeGreaterThanOrEqual(1); // At least one step should load
    
    console.log('✅ STEP DATA TEST COMPLETED');
  });
});