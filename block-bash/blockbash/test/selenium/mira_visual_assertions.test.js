// Enhanced Selenium test with visual assertions for Mira's story
// Captures screenshots and performs automated visual validation
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

// Visual assertion helper functions
async function assertElementInViewport(driver, elementSelector, description) {
  const result = await driver.executeScript(function(selector) {
    const element = document.querySelector(selector);
    if (!element) return { found: false, error: 'Element not found: ' + selector };
    
    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const isInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewport.height &&
      rect.right <= viewport.width
    );
    
    return {
      found: true,
      isInViewport: isInViewport,
      elementBounds: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
      },
      viewport: viewport,
      element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.className ? '.' + element.className.split(' ').join('.') : '')
    };
  }, elementSelector);
  
  if (!result.found) {
    throw new Error(`Visual assertion failed - ${description}: ${result.error}`);
  }
  
  return {
    passed: result.isInViewport,
    description: description,
    details: result,
    message: result.isInViewport 
      ? `✓ PASS: ${description} - Element is fully within viewport`
      : `✗ FAIL: ${description} - Element extends outside viewport. Bounds: ${JSON.stringify(result.elementBounds)}, Viewport: ${JSON.stringify(result.viewport)}`
  };
}

async function assertDropdownVisibility(driver, dropdownSelector, description) {
  const result = await driver.executeScript(function(selector) {
    const dropdown = document.querySelector(selector);
    if (!dropdown) return { found: false, error: 'Dropdown not found: ' + selector };
    
    const computedStyle = window.getComputedStyle(dropdown);
    const rect = dropdown.getBoundingClientRect();
    
    return {
      found: true,
      isVisible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0',
      hasContent: dropdown.children.length > 0,
      bounds: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
      },
      styles: {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        zIndex: computedStyle.zIndex
      }
    };
  }, dropdownSelector);
  
  if (!result.found) {
    throw new Error(`Visual assertion failed - ${description}: ${result.error}`);
  }
  
  const passed = result.isVisible && result.hasContent;
  
  return {
    passed: passed,
    description: description,
    details: result,
    message: passed 
      ? `✓ PASS: ${description} - Dropdown is visible and has content`
      : `✗ FAIL: ${description} - Dropdown visibility issue. Visible: ${result.isVisible}, Has content: ${result.hasContent}, Styles: ${JSON.stringify(result.styles)}`
  };
}

async function assertNoOverlappingElements(driver, description) {
  const result = await driver.executeScript(function() {
    const allElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
    
    const overlaps = [];
    for (let i = 0; i < allElements.length; i++) {
      for (let j = i + 1; j < allElements.length; j++) {
        const rect1 = allElements[i].getBoundingClientRect();
        const rect2 = allElements[j].getBoundingClientRect();
        
        if (rect1.left < rect2.right && rect2.left < rect1.right &&
            rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
          // Check if one is contained within the other (normal parent-child relationship)
          const el1Contains = allElements[i].contains(allElements[j]);
          const el2Contains = allElements[j].contains(allElements[i]);
          
          if (!el1Contains && !el2Contains) {
            overlaps.push({
              element1: allElements[i].tagName.toLowerCase() + (allElements[i].id ? '#' + allElements[i].id : ''),
              element2: allElements[j].tagName.toLowerCase() + (allElements[j].id ? '#' + allElements[j].id : ''),
              rect1: rect1,
              rect2: rect2
            });
          }
        }
      }
    }
    
    return {
      hasOverlaps: overlaps.length > 0,
      overlaps: overlaps,
      totalElements: allElements.length
    };
  });
  
  return {
    passed: !result.hasOverlaps,
    description: description,
    details: result,
    message: !result.hasOverlaps
      ? `✓ PASS: ${description} - No problematic element overlaps detected`
      : `✗ FAIL: ${description} - Found ${result.overlaps.length} overlapping elements: ${JSON.stringify(result.overlaps.slice(0, 3))}`
  };
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
    // Set consistent viewport size for reliable visual testing
    options.addArguments('--window-size=1280,720');
    const service = new chrome.ServiceBuilder(chromedriver.path).build();
    const driver = chrome.Driver.createSession(new chrome.Options().addArguments(options.args_ || []), service);

    try {
      console.log('[visual-test] Starting Mira visual assertion test...');
      
      // === Test 1: Main Menu Page ===
      await driver.get('http://localhost:3000/examples/mira/index.html');
      await driver.wait(until.elementLocated(By.id('begin-btn')), 10000);
      
      // Visual assertions for main menu
      testResults.push(await assertElementInViewport(driver, '#begin-btn', 'Begin button viewport visibility'));
      testResults.push(await assertNoOverlappingElements(driver, 'Main menu layout check'));
      
      // Take screenshot of main menu
      const beforeMenu = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_menu_with_assertions.png'), Buffer.from(beforeMenu, 'base64'));
      console.log('[screenshot] wrote mira_menu_with_assertions.png');

      // === Test 2: Demo Page (Before Next) ===
      await driver.get('http://localhost:3000/examples/mira/chapters/demo/demo.html');
      await driver.wait(until.elementLocated(By.id('demo-next-btn')), 20000);

      // Visual assertions for demo page
      testResults.push(await assertElementInViewport(driver, '#demo-next-btn', 'Demo next button viewport visibility'));
      
      // Check for any dropdown-like elements or interactive components
      const hasDropdowns = await driver.executeScript(function() {
        const dropdownSelectors = ['select', '[role="listbox"]', '.dropdown', '.menu', '[data-dropdown]'];
        for (let selector of dropdownSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return { found: true, selector: selector, count: elements.length };
          }
        }
        return { found: false };
      });
      
      if (hasDropdowns.found) {
        testResults.push(await assertDropdownVisibility(driver, hasDropdowns.selector, `Dropdown elements (${hasDropdowns.selector})`));
      }
      
      testResults.push(await assertNoOverlappingElements(driver, 'Demo page layout check'));

      // Take screenshot before next button click
      const beforeNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_before_next_with_assertions.png'), Buffer.from(beforeNext, 'base64'));
      console.log('[screenshot] wrote mira_before_next_with_assertions.png');

      // === Test 3: After Next Click ===
      let next;
      try { next = await driver.findElement(By.id('next-step-btn')); } catch (e) { next = await driver.findElement(By.id('demo-next-btn')); }
      await next.click();

      // Wait for content to update
      await driver.sleep(700);
      
      // Visual assertions after next click
      testResults.push(await assertNoOverlappingElements(driver, 'Post-click layout check'));
      
      // Check if any new interactive elements appeared
      const newElements = await driver.executeScript(function() {
        const interactiveSelectors = ['button', 'input', 'select', 'a[href]', '[onclick]', '[role="button"]'];
        const elements = [];
        for (let selector of interactiveSelectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            elements.push({ selector: selector, count: found.length });
          }
        }
        return elements;
      });
      
      for (let element of newElements) {
        if (element.count > 0) {
          testResults.push(await assertElementInViewport(driver, element.selector, `Interactive element ${element.selector} viewport check`));
        }
      }

      // Take screenshot after next button click
      const afterNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_after_next_with_assertions.png'), Buffer.from(afterNext, 'base64'));
      console.log('[screenshot] wrote mira_after_next_with_assertions.png');

      // === Generate Test Report ===
      const passCount = testResults.filter(r => r.passed).length;
      const failCount = testResults.filter(r => r.passed === false).length;
      
      console.log('\n' + '='.repeat(60));
      console.log('         VISUAL ASSERTION TEST REPORT');
      console.log('='.repeat(60));
      console.log(`Total Tests: ${testResults.length}`);
      console.log(`Passed: ${passCount}`);
      console.log(`Failed: ${failCount}`);
      console.log(`Success Rate: ${((passCount / testResults.length) * 100).toFixed(1)}%`);
      console.log('='.repeat(60));
      
      testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.message}`);
      });
      
      console.log('='.repeat(60));
      
      // Save detailed report to file
      const reportPath = path.join(outDir, 'visual_test_report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTests: testResults.length,
        passed: passCount,
        failed: failCount,
        successRate: ((passCount / testResults.length) * 100),
        results: testResults
      }, null, 2));
      
      console.log(`[report] Detailed test report saved to: ${reportPath}`);
      console.log(`[mira_visual_test] Completed successfully. Files saved in ${outDir}`);
      
      // Exit with error code if any tests failed
      if (failCount > 0) {
        console.error(`\n❌ ${failCount} visual assertion(s) failed!`);
        process.exitCode = 1;
      } else {
        console.log(`\n✅ All ${passCount} visual assertions passed!`);
      }
      
    } finally {
      await driver.quit();
    }
  } catch (e) {
    console.error('[mira_visual_test] Error:', e);
    process.exitCode = 1;
  } finally {
    if(started && server) server.kill();
  }
})();
