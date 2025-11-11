/**
 * Utility function to handle onboarding overlay interference in E2E tests
 * Detects if onboarding overlay is present and clicks skip button to dismiss it
 * Gracefully handles cases where onboarding is not displayed
 */
export async function skipOnboarding(page) {
  try {
    // Wait briefly for page to fully load
    await page.waitForTimeout(500);
    
    // Check if onboarding overlay is visible
    const onboardingOverlay = await page.locator('.onboarding-overlay').first();
    
    // Only proceed if overlay is visible
    if (await onboardingOverlay.isVisible()) {
      console.log('Onboarding overlay detected, attempting to skip...');
      
      // Look for skip button
      const skipBtn = await page.locator('.onboarding-skip-btn').first();
      
      if (await skipBtn.isVisible()) {
        await skipBtn.click();
        console.log('Successfully clicked skip button');
        
        // Wait for overlay to disappear
        await onboardingOverlay.waitFor({ state: 'hidden', timeout: 3000 });
        console.log('Onboarding overlay dismissed');
      } else {
        console.log('Skip button not visible, trying to dismiss overlay');
        
        // Alternative: try clicking outside overlay or look for close button
        const closeBtn = await page.locator('[aria-label="Skip onboarding"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await onboardingOverlay.waitFor({ state: 'hidden', timeout: 3000 });
        }
      }
    } else {
      console.log('No onboarding overlay detected, continuing with test');
    }
  } catch (error) {
    console.log(`Onboarding skip handling: ${error.message}`);
    // Don't fail the test if onboarding skip fails - it might not be present
  }
}

/**
 * Enhanced version that also handles potential finishOnboarding function call
 * Uses JavaScript evaluation as fallback
 */
export async function skipOnboardingAdvanced(page) {
  try {
    await skipOnboarding(page);
    
    // Additional fallback: try to call finishOnboarding function directly
    await page.evaluate(() => {
      if (typeof window.finishOnboarding === 'function') {
        console.log('Calling finishOnboarding function directly');
        window.finishOnboarding();
      }
    });
    
  } catch (error) {
    console.log(`Advanced onboarding skip: ${error.message}`);
  }
}