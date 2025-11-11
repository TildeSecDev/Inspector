// Global setup: start the BlockBash server if not already running
import { spawn } from 'child_process';
import http from 'http';

async function waitForServer(port = 3000, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise(resolve => {
      const req = http.request({ host: 'localhost', port, path: '/editor', method: 'GET' }, res => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.end();
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

export default async function globalSetup(config) {
  const ready = await waitForServer();
  if (ready) {
    console.log('[global-setup] Reusing existing server at :3000');
    return;
  }
  console.log('[global-setup] Starting server...');
  const proc = spawn('node', ['app.js'], { stdio: 'inherit', env: { ...process.env, PORT: '3000' } });
  // Store PID for teardown if needed
  process.env.BLOCKBASH_TEST_SERVER_PID = String(proc.pid);
  const up = await waitForServer();
  if (!up) throw new Error('Server failed to start on port 3000');
  console.log('[global-setup] Server started.');
}
