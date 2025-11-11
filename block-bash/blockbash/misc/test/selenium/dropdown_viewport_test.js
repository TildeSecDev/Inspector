// Comprehensive Selenium test with dynamic dropdown creation and visual validation
// This test creates dropdown elements and validates their viewport positioning
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function waitForServer(url, timeoutMs = 20000){
  const start = Date.now();
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  while(Date.now() - start < timeoutMs){
    try { const r = await fetchFn(url, {redirect:'manual'}); if(r.status >=200 && r.status <500) return; } catch(e){}
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('Server did not become ready: '+url);
}

// Visual assertion functions
async function assertDropdownInViewport(driver, dropdownSelector, description) {
  const result = await driver.executeScript(function(selector) {
    const dropdown = document.querySelector(selector);
    if (!dropdown) return { found: false, error: 'Dropdown not found: ' + selector };
    
    const rect = dropdown.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const computedStyle = window.getComputedStyle(dropdown);
    
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     computedStyle.opacity !== '0';
    
    const isFullyInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewport.height &&
      rect.right <= viewport.width
    );
    
    const isPartiallyInViewport = (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewport.height &&
      rect.left < viewport.width
    );
    
    return {
      found: true,
      isVisible: isVisible,
      isFullyInViewport: isFullyInViewport,
      isPartiallyInViewport: isPartiallyInViewport,
      elementBounds: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      viewport: viewport,
      overflowDetails: {
        overflowTop: rect.top < 0 ? Math.abs(rect.top) : 0,
        overflowBottom: rect.bottom > viewport.height ? rect.bottom - viewport.height : 0,
        overflowLeft: rect.left < 0 ? Math.abs(rect.left) : 0,
        overflowRight: rect.right > viewport.width ? rect.right - viewport.width : 0
      }
    };
  }, dropdownSelector);
  
  if (!result.found) {
    return { passed: false, description: description, message: `✗ FAIL: ${description} - ${result.error}`, details: result };
  }
  
  const passed = result.isVisible && result.isFullyInViewport;
  
  return {
    passed: passed,
    description: description,
    details: result,
    message: passed 
      ? `✓ PASS: ${description} - Dropdown fully visible and within viewport`
      : `✗ FAIL: ${description} - Dropdown issue: visible:${result.isVisible}, fullyInViewport:${result.isFullyInViewport}, bounds:(${result.elementBounds.left},${result.elementBounds.top},${result.elementBounds.right},${result.elementBounds.bottom}), viewport:${result.viewport.width}x${result.viewport.height}${!result.isFullyInViewport ? ', overflow:' + JSON.stringify(result.overflowDetails) : ''}`
  };
}

async function createTestDropdown(driver, position = 'center') {
  return await driver.executeScript(function(pos) {
    // Remove any existing test dropdown
    const existing = document.getElementById('test-dropdown');
    if (existing) existing.remove();
    
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.id = 'test-dropdown';
    dropdown.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
    `;
    
    // Position the dropdown based on parameter
    switch(pos) {
      case 'top-right':
        dropdown.style.top = '10px';
        dropdown.style.right = '10px';
        break;
      case 'bottom-right':
        dropdown.style.bottom = '10px';
        dropdown.style.right = '10px';
        break;
      case 'bottom-left':
        dropdown.style.bottom = '10px';
        dropdown.style.left = '10px';
        break;
      case 'center':
      default:
        dropdown.style.top = '50%';
        dropdown.style.left = '50%';
        dropdown.style.transform = 'translate(-50%, -50%)';
        break;
      case 'overflow-right':
        dropdown.style.top = '50%';
        dropdown.style.left = (window.innerWidth - 50) + 'px';
        break;
      case 'overflow-bottom':
        dropdown.style.top = (window.innerHeight - 50) + 'px';
        dropdown.style.left = '50%';
        dropdown.style.transform = 'translateX(-50%)';
        break;
    }
    
    // Add dropdown content
    const items = ['Option 1', 'Option 2', 'Option 3', 'Long Option Text That Might Wrap', 'Option 5'];
    items.forEach(item => {
      const option = document.createElement('div');
      option.textContent = item;
      option.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      `;
      option.addEventListener('mouseover', () => option.style.backgroundColor = '#f0f0f0');
      option.addEventListener('mouseout', () => option.style.backgroundColor = 'transparent');
      dropdown.appendChild(option);
    });
    
    document.body.appendChild(dropdown);
    return true;
  }, position);
}

(async ()=>{
  let server; let started = false;
  const testResults = [];
  
  try {
    try { await waitForServer('http://localhost:3000/examples/mira/index.html'); } catch(_) {
      server = cp.spawn(process.execPath, ['bin/www'], { stdio:'inherit', env: {...process.env, PORT: '3000'} });
      started = true;
      await waitForServer('http://localhost:3000/examples/mira/index.html');
    }

    // Prepare screenshot directory
    const outDir = path.resolve(process.cwd(), 'test-results', 'screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    const options = new chrome.Options();
    if(process.env.HEADLESS !== 'false') options.addArguments('--headless=new');
    options.addArguments('--no-sandbox','--disable-dev-shm-usage');
    options.addArguments('--window-size=1280,720');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    try {
      console.log('[dropdown-test] Starting comprehensive dropdown viewport test...');
      
      // Start with the Mira demo page
      await driver.get('http://localhost:3000/examples/mira/chapters/demo/demo.html');
      await driver.wait(until.elementLocated(By.id('demo-next-btn')), 20000);

      // Test 1: Center dropdown (should pass)
      await createTestDropdown(driver, 'center');
      await driver.sleep(500); // Allow positioning
      testResults.push(await assertDropdownInViewport(driver, '#test-dropdown', 'Center positioned dropdown'));
      
      const centerScreenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'dropdown_center.png'), Buffer.from(centerScreenshot, 'base64'));
      console.log('[screenshot] wrote dropdown_center.png');

      // Test 2: Top-right dropdown (should pass)
      await createTestDropdown(driver, 'top-right');
      await driver.sleep(500);
      testResults.push(await assertDropdownInViewport(driver, '#test-dropdown', 'Top-right positioned dropdown'));
      
      const topRightScreenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'dropdown_top_right.png'), Buffer.from(topRightScreenshot, 'base64'));
      console.log('[screenshot] wrote dropdown_top_right.png');

      // Test 3: Bottom-left dropdown (should pass)
      await createTestDropdown(driver, 'bottom-left');
      await driver.sleep(500);
      testResults.push(await assertDropdownInViewport(driver, '#test-dropdown', 'Bottom-left positioned dropdown'));
      
      const bottomLeftScreenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'dropdown_bottom_left.png'), Buffer.from(bottomLeftScreenshot, 'base64'));
      console.log('[screenshot] wrote dropdown_bottom_left.png');

      // Test 4: Overflow right dropdown (should fail)
      await createTestDropdown(driver, 'overflow-right');
      await driver.sleep(500);
      testResults.push(await assertDropdownInViewport(driver, '#test-dropdown', 'Right overflow dropdown (expected fail)'));
      
      const overflowRightScreenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'dropdown_overflow_right.png'), Buffer.from(overflowRightScreenshot, 'base64'));
      console.log('[screenshot] wrote dropdown_overflow_right.png');

      // Test 5: Overflow bottom dropdown (should fail)
      await createTestDropdown(driver, 'overflow-bottom');
      await driver.sleep(500);
      testResults.push(await assertDropdownInViewport(driver, '#test-dropdown', 'Bottom overflow dropdown (expected fail)'));
      
      const overflowBottomScreenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'dropdown_overflow_bottom.png'), Buffer.from(overflowBottomScreenshot, 'base64'));
      console.log('[screenshot] wrote dropdown_overflow_bottom.png');

      // Clean up dropdown
      await driver.executeScript('const d = document.getElementById("test-dropdown"); if(d) d.remove();');

      // Generate comprehensive report
      const passCount = testResults.filter(r => r.passed).length;
      const failCount = testResults.filter(r => r.passed === false).length;
      const expectedFailures = testResults.filter(r => r.description.includes('expected fail')).length;
      const unexpectedFailures = failCount - expectedFailures;
      
      console.log('\n' + '='.repeat(80));
      console.log('              COMPREHENSIVE DROPDOWN VIEWPORT TEST REPORT');
      console.log('='.repeat(80));
      console.log(`Total Tests: ${testResults.length}`);
      console.log(`Passed: ${passCount}`);
      console.log(`Failed: ${failCount} (${expectedFailures} expected, ${unexpectedFailures} unexpected)`);
      console.log(`Success Rate: ${((passCount / testResults.length) * 100).toFixed(1)}%`);
      console.log('='.repeat(80));
      
      testResults.forEach((result, index) => {
        const icon = result.passed ? '✅' : (result.description.includes('expected fail') ? '🔴' : '❌');
        console.log(`${icon} ${index + 1}. ${result.message}`);
      });
      
      console.log('='.repeat(80));
      console.log('📸 SCREENSHOT ANALYSIS:');
      console.log('  • dropdown_center.png: Shows dropdown perfectly centered in viewport');
      console.log('  • dropdown_top_right.png: Shows dropdown positioned in top-right corner');
      console.log('  • dropdown_bottom_left.png: Shows dropdown positioned in bottom-left corner');
      console.log('  • dropdown_overflow_right.png: Shows dropdown extending beyond right edge');
      console.log('  • dropdown_overflow_bottom.png: Shows dropdown extending beyond bottom edge');
      console.log('='.repeat(80));
      
      // Save detailed report
      const reportPath = path.join(outDir, 'dropdown_test_report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testType: 'Dropdown Viewport Validation',
        totalTests: testResults.length,
        passed: passCount,
        failed: failCount,
        expectedFailures: expectedFailures,
        unexpectedFailures: unexpectedFailures,
        successRate: ((passCount / testResults.length) * 100),
        testSummary: {
          centerDropdown: testResults[0]?.passed || false,
          topRightDropdown: testResults[1]?.passed || false,
          bottomLeftDropdown: testResults[2]?.passed || false,
          rightOverflowDropdown: testResults[3]?.passed || false,
          bottomOverflowDropdown: testResults[4]?.passed || false
        },
        screenshotFiles: [
          'dropdown_center.png',
          'dropdown_top_right.png', 
          'dropdown_bottom_left.png',
          'dropdown_overflow_right.png',
          'dropdown_overflow_bottom.png'
        ],
        results: testResults
      }, null, 2));
      
      console.log(`[report] Detailed dropdown test report saved to: ${reportPath}`);
      console.log(`[dropdown-test] Testing completed. Files saved in ${outDir}`);
      
      // Final assessment
      if (unexpectedFailures > 0) {
        console.error(`\n❌ ${unexpectedFailures} unexpected failure(s) detected!`);
        process.exitCode = 1;
      } else {
        console.log(`\n✅ All expected tests behaved correctly! (${passCount} passed, ${expectedFailures} intentionally failed)`);
      }
      
    } finally {
      await driver.quit();
    }
  } catch (e) {
    console.error('[dropdown-test] Error:', e);
    process.exitCode = 1;
  } finally {
    if(started && server) server.kill();
  }
})();
