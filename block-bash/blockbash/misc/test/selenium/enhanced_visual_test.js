// Enhanced Selenium test with targeted visual assertions for dropdown elements
// Performs automated visual validation with specific focus on UI components
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

// Enhanced visual assertion functions
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
    
    const partiallyVisible = (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewport.height &&
      rect.left < viewport.width
    );
    
    return {
      found: true,
      isInViewport: isInViewport,
      partiallyVisible: partiallyVisible,
      elementBounds: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
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
      ? `✓ PASS: ${description} - Element fully within viewport`
      : `✗ FAIL: ${description} - Element not fully within viewport. Bounds: top:${result.elementBounds.top} left:${result.elementBounds.left} bottom:${result.elementBounds.bottom} right:${result.elementBounds.right}, Viewport: ${result.viewport.width}x${result.viewport.height}`
  };
}

async function assertDropdownFullyVisible(driver, dropdownSelector, description) {
  const result = await driver.executeScript(function(selector) {
    const dropdown = document.querySelector(selector);
    if (!dropdown) return { found: false, error: 'Dropdown not found: ' + selector };
    
    const computedStyle = window.getComputedStyle(dropdown);
    const rect = dropdown.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     computedStyle.opacity !== '0';
    
    const isFullyInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewport.height &&
      rect.right <= viewport.width
    );
    
    const hasContent = dropdown.children.length > 0 || dropdown.textContent.trim().length > 0;
    
    return {
      found: true,
      isVisible: isVisible,
      isFullyInViewport: isFullyInViewport,
      hasContent: hasContent,
      bounds: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      viewport: viewport,
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
  
  const passed = result.isVisible && result.isFullyInViewport && result.hasContent;
  
  return {
    passed: passed,
    description: description,
    details: result,
    message: passed 
      ? `✓ PASS: ${description} - Dropdown fully visible and within viewport`
      : `✗ FAIL: ${description} - Dropdown issue: visible:${result.isVisible}, inViewport:${result.isFullyInViewport}, hasContent:${result.hasContent}, bounds: ${JSON.stringify(result.bounds)}`
  };
}

async function assertNoProblematicOverlaps(driver, description) {
  const result = await driver.executeScript(function() {
    // Only check interactive elements and positioned elements that might overlap inappropriately
    const interactiveElements = Array.from(document.querySelectorAll('button, input, select, a[href], [role="button"], [role="menu"], [role="dialog"], .dropdown, .modal')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
    
    const problematicOverlaps = [];
    for (let i = 0; i < interactiveElements.length; i++) {
      for (let j = i + 1; j < interactiveElements.length; j++) {
        const rect1 = interactiveElements[i].getBoundingClientRect();
        const rect2 = interactiveElements[j].getBoundingClientRect();
        
        if (rect1.left < rect2.right && rect2.left < rect1.right &&
            rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
          // Check if one is contained within the other (normal parent-child relationship)
          const el1Contains = interactiveElements[i].contains(interactiveElements[j]);
          const el2Contains = interactiveElements[j].contains(interactiveElements[i]);
          
          if (!el1Contains && !el2Contains) {
            // Only report if significant overlap (>50% of smaller element)
            const overlapArea = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)) *
                               Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
            const area1 = rect1.width * rect1.height;
            const area2 = rect2.width * rect2.height;
            const smallerArea = Math.min(area1, area2);
            
            if (overlapArea > smallerArea * 0.5) {
              problematicOverlaps.push({
                element1: interactiveElements[i].tagName.toLowerCase() + (interactiveElements[i].id ? '#' + interactiveElements[i].id : '') + (interactiveElements[i].className ? '.' + interactiveElements[i].className.split(' ').slice(0,2).join('.') : ''),
                element2: interactiveElements[j].tagName.toLowerCase() + (interactiveElements[j].id ? '#' + interactiveElements[j].id : '') + (interactiveElements[j].className ? '.' + interactiveElements[j].className.split(' ').slice(0,2).join('.') : ''),
                overlapPercentage: Math.round((overlapArea / smallerArea) * 100)
              });
            }
          }
        }
      }
    }
    
    return {
      hasProblematicOverlaps: problematicOverlaps.length > 0,
      overlaps: problematicOverlaps,
      checkedElements: interactiveElements.length
    };
  });
  
  return {
    passed: !result.hasProblematicOverlaps,
    description: description,
    details: result,
    message: !result.hasProblematicOverlaps
      ? `✓ PASS: ${description} - No problematic overlaps among ${result.checkedElements} interactive elements`
      : `✗ FAIL: ${description} - Found ${result.overlaps.length} problematic overlaps: ${JSON.stringify(result.overlaps)}`
  };
}

async function assertTextReadability(driver, description) {
  const result = await driver.executeScript(function() {
    const textElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a')).filter(el => {
      const text = el.textContent.trim();
      return text.length > 0 && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
    
    const readabilityIssues = [];
    textElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      // Check for very small text
      if (fontSize < 12) {
        readabilityIssues.push({
          element: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
          issue: 'small font',
          fontSize: fontSize
        });
      }
    });
    
    return {
      hasIssues: readabilityIssues.length > 0,
      issues: readabilityIssues,
      checkedElements: textElements.length
    };
  });
  
  return {
    passed: !result.hasIssues,
    description: description,
    details: result,
    message: !result.hasIssues
      ? `✓ PASS: ${description} - Text readability looks good for ${result.checkedElements} elements`
      : `✗ FAIL: ${description} - Found ${result.issues.length} readability issues: ${JSON.stringify(result.issues.slice(0, 3))}`
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
      console.log('[visual-test] Starting enhanced Mira visual assertion test...');
      
      // === Test 1: Main Menu Page ===
      await driver.get('http://localhost:3000/examples/mira/index.html');
      await driver.wait(until.elementLocated(By.id('begin-btn')), 10000);
      
      // Core visual assertions for main menu
      testResults.push(await assertElementInViewport(driver, '#begin-btn', 'Begin button viewport positioning'));
      testResults.push(await assertTextReadability(driver, 'Main menu text readability'));
      testResults.push(await assertNoProblematicOverlaps(driver, 'Main menu interactive elements'));
      
      // Check for any dropdown/menu elements specifically
      const mainMenuDropdowns = await driver.executeScript(function() {
        const dropdownSelectors = ['select', '[role="listbox"]', '[role="menu"]', '.dropdown', '.menu', '[data-dropdown]', 'details'];
        const found = [];
        dropdownSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            found.push({ selector: selector, count: elements.length });
          }
        });
        return found;
      });
      
      for (let dropdown of mainMenuDropdowns) {
        testResults.push(await assertDropdownFullyVisible(driver, dropdown.selector, `Main menu dropdown (${dropdown.selector})`));
      }
      
      // Take screenshot of main menu
      const beforeMenu = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_menu_enhanced.png'), Buffer.from(beforeMenu, 'base64'));
      console.log('[screenshot] wrote mira_menu_enhanced.png');

      // === Test 2: Demo Page (Before Next) ===
      await driver.get('http://localhost:3000/examples/mira/chapters/demo/demo.html');
      await driver.wait(until.elementLocated(By.id('demo-next-btn')), 20000);

      // Core visual assertions for demo page
      testResults.push(await assertElementInViewport(driver, '#demo-next-btn', 'Demo next button positioning'));
      testResults.push(await assertTextReadability(driver, 'Demo page text readability'));
      testResults.push(await assertNoProblematicOverlaps(driver, 'Demo page interactive elements'));
      
      // Check for dropdown/interactive elements on demo page
      const demoDropdowns = await driver.executeScript(function() {
        const dropdownSelectors = ['select', '[role="listbox"]', '[role="menu"]', '.dropdown', '.menu', '[data-dropdown]', 'details'];
        const found = [];
        dropdownSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            found.push({ selector: selector, count: elements.length });
          }
        });
        return found;
      });
      
      for (let dropdown of demoDropdowns) {
        testResults.push(await assertDropdownFullyVisible(driver, dropdown.selector, `Demo page dropdown (${dropdown.selector})`));
      }

      // Take screenshot before next button click
      const beforeNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_before_next_enhanced.png'), Buffer.from(beforeNext, 'base64'));
      console.log('[screenshot] wrote mira_before_next_enhanced.png');

      // === Test 3: After Next Click ===
      let next;
      try { next = await driver.findElement(By.id('next-step-btn')); } catch (e) { next = await driver.findElement(By.id('demo-next-btn')); }
      await next.click();

      // Wait for content to update
      await driver.sleep(1000);
      
      // Visual assertions after next click
      testResults.push(await assertTextReadability(driver, 'Post-click text readability'));
      testResults.push(await assertNoProblematicOverlaps(driver, 'Post-click interactive elements'));
      
      // Check if any new interactive elements appeared and verify they're properly positioned
      const newInteractiveElements = await driver.executeScript(function() {
        const interactiveSelectors = ['button', 'input', 'select', 'a[href]', '[onclick]', '[role="button"]', '[role="menu"]'];
        const elements = [];
        interactiveSelectors.forEach(selector => {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            elements.push({ selector: selector, count: found.length });
          }
        });
        return elements;
      });
      
      for (let element of newInteractiveElements) {
        if (element.count > 0) {
          testResults.push(await assertElementInViewport(driver, element.selector, `Post-click ${element.selector} positioning`));
        }
      }

      // Take screenshot after next button click
      const afterNext = await driver.takeScreenshot();
      fs.writeFileSync(path.join(outDir, 'mira_after_next_enhanced.png'), Buffer.from(afterNext, 'base64'));
      console.log('[screenshot] wrote mira_after_next_enhanced.png');

      // === Generate Enhanced Test Report ===
      const passCount = testResults.filter(r => r.passed).length;
      const failCount = testResults.filter(r => r.passed === false).length;
      
      console.log('\n' + '='.repeat(70));
      console.log('           ENHANCED VISUAL ASSERTION TEST REPORT');
      console.log('='.repeat(70));
      console.log(`Total Tests: ${testResults.length}`);
      console.log(`Passed: ${passCount}`);
      console.log(`Failed: ${failCount}`);
      console.log(`Success Rate: ${((passCount / testResults.length) * 100).toFixed(1)}%`);
      console.log('='.repeat(70));
      
      // Group results by test type
      const grouped = {
        viewport: [],
        dropdowns: [],
        overlaps: [],
        readability: [],
        other: []
      };
      
      testResults.forEach((result, index) => {
        const line = `${index + 1}. ${result.message}`;
        if (result.description.includes('dropdown')) grouped.dropdowns.push(line);
        else if (result.description.includes('positioning') || result.description.includes('viewport')) grouped.viewport.push(line);
        else if (result.description.includes('overlap')) grouped.overlaps.push(line);
        else if (result.description.includes('readability')) grouped.readability.push(line);
        else grouped.other.push(line);
      });
      
      console.log('\n📍 VIEWPORT & POSITIONING TESTS:');
      grouped.viewport.forEach(line => console.log('  ' + line));
      
      console.log('\n📋 DROPDOWN & MENU TESTS:');
      if (grouped.dropdowns.length > 0) {
        grouped.dropdowns.forEach(line => console.log('  ' + line));
      } else {
        console.log('  No dropdown elements found to test');
      }
      
      console.log('\n🔍 OVERLAP DETECTION TESTS:');
      grouped.overlaps.forEach(line => console.log('  ' + line));
      
      console.log('\n📖 TEXT READABILITY TESTS:');
      grouped.readability.forEach(line => console.log('  ' + line));
      
      if (grouped.other.length > 0) {
        console.log('\n🔧 OTHER TESTS:');
        grouped.other.forEach(line => console.log('  ' + line));
      }
      
      console.log('='.repeat(70));
      
      // Save enhanced report
      const reportPath = path.join(outDir, 'enhanced_visual_test_report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testType: 'Enhanced Visual Assertions',
        totalTests: testResults.length,
        passed: passCount,
        failed: failCount,
        successRate: ((passCount / testResults.length) * 100),
        testCategories: {
          viewport: grouped.viewport.length,
          dropdowns: grouped.dropdowns.length,
          overlaps: grouped.overlaps.length,
          readability: grouped.readability.length,
          other: grouped.other.length
        },
        results: testResults
      }, null, 2));
      
      console.log(`[report] Enhanced test report saved to: ${reportPath}`);
      console.log(`[visual-test] Enhanced testing completed. Files saved in ${outDir}`);
      
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
    console.error('[enhanced_visual_test] Error:', e);
    process.exitCode = 1;
  } finally {
    if(started && server) server.kill();
  }
})();
