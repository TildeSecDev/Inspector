const { test, expect } = require('@playwright/test');

test('Sandbox Terminal Loads', async ({ page }) => {
  await page.context().addCookies([{ name: 'username', value: 'testuser', domain: 'localhost', path: '/' }]);
  await page.goto('http://localhost:3000/editor');
  await expect(page.locator('#output-terminal')).toBeVisible();
});

test('Banned Command Blocked', async ({ page }) => {
  await page.context().addCookies([{ name: 'username', value: 'testuser', domain: 'localhost', path: '/' }]);
  await page.goto('http://localhost:3000/editor');
  const result = await page.evaluate(async () => {
    return await new Promise(resolve => {
      const url = (location.origin.replace(/^http/, 'ws')) + '/sandbox/exec';
      const s = new WebSocket(url);
      let sawBanner = false;
      let timer = null;
      let attemptedFallback = false;
      const logs = [];
      function finish(ok){ try { clearTimeout(timer); } catch {}; resolve({ denied: ok, logs }); try { s.close(); } catch {} }
      timer = setTimeout(()=>finish(false), 15000);
      s.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          logs.push(msg);
          if (msg.type === 'denial' && msg.command === 'rm -rf /') return finish(true);
          if (typeof msg.data === 'string') {
            if (msg.data.includes('[sandbox] ws connected')) { sawBanner = true; }
            if (msg.data.includes('[denied] rm -rf /')) return finish(true);
            if (sawBanner && !attemptedFallback) {
              attemptedFallback = true;
              setTimeout(()=>{ try { s.send(JSON.stringify({ type:'command', command:'rm -rf /' })); } catch {}; }, 1200);
            }
          }
        } catch(e){ logs.push({ parseError: true, raw: ev.data }); }
      };
  s.onopen = () => { logs.push({ event:'open' }); setTimeout(()=>{ s.send(JSON.stringify({ type:'probe-banned' })); }, 150); };
  s.onerror = (e) => { logs.push({ event:'error', message: e.message || 'ws error' }); };
  s.onclose = (e) => { logs.push({ event:'close', code: e.code, reason: e.reason }); };
    });
  });
  if(!result.denied){ console.log('Sandbox debug logs ->', JSON.stringify(result.logs, null, 2)); }
  expect(result.denied).toBeTruthy();
});
