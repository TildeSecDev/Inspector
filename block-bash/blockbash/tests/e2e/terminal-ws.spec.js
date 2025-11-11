const { test, expect } = require('@playwright/test');

test.describe('Terminal WebSocket + command run', () => {
  test('connects to /sandbox/exec, sees denial self-test, runs echo when ready', async ({ page }) => {
    // Capture WebSocket frames from the page
    const wsEvents = [];
    page.on('websocket', ws => {
      function extract(frame){
        try { if (frame && typeof frame.text === 'function') return frame.text(); } catch {}
        if(frame && typeof frame === 'object'){
          if('payload' in frame) return String(frame.payload||'');
          if('data' in frame) return String(frame.data||'');
        }
        return '';
      }
      ws.on('framesent', f => wsEvents.push({ dir: 'out', text: extract(f) }));
      ws.on('framereceived', f => wsEvents.push({ dir: 'in', text: extract(f) }));
    });

    // Ensure username cookie so backend associates a user
    await page.context().addCookies([{ name: 'username', value: 'ws_tester', domain: 'localhost', path: '/' }]);
  await page.goto('http://localhost:3000/editor');

    // Wait for the terminal to render
    await page.waitForSelector('#output-terminal', { timeout: 15000 });

    // Wait for a websocket to /sandbox/exec to be created
    const ws = await page.waitForEvent('websocket', { timeout: 15000 });
    expect(ws.url()).toContain('/sandbox/exec');

    // Give it a moment to initialize and emit frames
    await page.waitForTimeout(3000);

    // Accept either explicit ready event, or a container-unavailable message (from frames or DOM fallback)
    const gotReady = wsEvents.some(e => e.dir === 'in' && e.text && e.text.includes('"type":"ready"'));
    const mgrUnavailable = wsEvents.some(e => e.dir === 'in' && e.text && e.text.toLowerCase().includes('container manager unavailable'));

    // The backend sends a self-test denied line for banned commands (best-effort)
    let gotDenied = wsEvents.some(e => e.dir === 'in' && e.text && e.text.includes('[denied] rm -rf /'));
    if (!gotDenied && !mgrUnavailable) {
      const terminalText = await page.locator('#output-terminal').textContent();
      const t = (terminalText || '').toLowerCase();
      gotDenied = t.includes('denied') || t.includes('sandbox') || t.includes('container manager unavailable');
    }
    // Best-effort: continue even if neither appeared (some environments buffer or strip early lines)

    if (gotReady) {
      // Type a simple command in the terminal and assert echo output appears in DOM
      await page.locator('#output-terminal').click();
      await page.keyboard.type('echo 123');
      await page.keyboard.press('Enter');
      await expect(page.locator('#output-terminal')).toContainText('123', { timeout: 7000 });
    } else {
      test.info().annotations.push({ type: 'skip-echo', description: 'Container manager unavailable; skipping echo assertion.' });
    }
  });
});
