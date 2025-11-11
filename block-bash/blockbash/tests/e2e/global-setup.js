// Playwright global setup for new e2e config
// Starts (or reuses) the main server on port 3000 via bin/www.
// If already listening (EADDRINUSE) we assume an existing dev server and continue.
// Converted to CommonJS to avoid Node "Cannot use import statement" errors.

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function waitFor(path = '/editor', port = 3000, attempts = 40, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise(resolve => {
      const req = http.request({ host: 'localhost', port, path, method: 'GET' }, res => {
        // Accept any 2xx/3xx as 'up' since /editor may redirect
        resolve(res.statusCode && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.end();
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

module.exports = async function globalSetup() {
  // Ensure frontend assets are available under /public for the server
  try {
    const syncScript = path.join(__dirname, '..', '..', 'scripts', 'sync-frontend-public.js');
    if (fs.existsSync(syncScript)) {
      require(syncScript);
    }
  } catch (_) {}
  const alreadyUp = await waitFor();
  if (alreadyUp) {
    console.log('[pw global-setup] Reusing existing server at :3000');
    return;
  }
  console.log('[pw global-setup] Starting server via bin/www ...');
  const proc = spawn('node', ['bin/www'], { stdio: 'inherit', env: { ...process.env, PORT: '3000', NODE_ENV: 'test', PLAYWRIGHT: '1' } });
  process.env.BLOCKBASH_PLAYWRIGHT_PID = String(proc.pid);
  const up = await waitFor();
  if (!up) throw new Error('Server failed to become ready on port 3000');
  console.log('[pw global-setup] Server ready.');
};
