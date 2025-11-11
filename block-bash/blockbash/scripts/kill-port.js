#!/usr/bin/env node
// Kill processes bound to specified TCP ports (macOS/Linux) before starting server.
// Ports may be supplied via arguments or KILL_PORTS env (comma-separated). Defaults: 3000,3002.
const { execSync } = require('child_process');

function parsePorts() {
  const argPorts = process.argv.slice(2).filter(p => /\d+/.test(p));
  const envPorts = (process.env.KILL_PORTS || '3000,3002').split(',');
  const merged = [...envPorts, ...argPorts].map(p => parseInt(p,10)).filter(n => !isNaN(n));
  return [...new Set(merged)];
}

function killPort(port) {
  try {
    const out = execSync(`lsof -nP -i TCP:${port} | grep LISTEN || true`, { encoding: 'utf8' });
    if (!out.trim()) return false;
    const pids = [...new Set(out.split(/\n+/).filter(Boolean).map(l => l.trim().split(/\s+/)[1]).filter(Boolean))];
    let any = false;
    for (const pid of pids) {
      if (Number(pid) === process.pid) continue;
      try {
        process.kill(parseInt(pid, 10), 'SIGTERM');
        console.log(`[kill-port] SIGTERM pid ${pid} (port ${port})`);
        any = true;
      } catch (e) {
        console.warn(`[kill-port] Failed SIGTERM pid ${pid}: ${e.message}`);
      }
    }
    // follow-up hard kill if still present
    setTimeout(() => {
      try {
        const still = execSync(`lsof -nP -i TCP:${port} | grep LISTEN || true`, { encoding: 'utf8' });
        if (still.trim()) {
          const pids2 = [...new Set(still.split(/\n+/).filter(Boolean).map(l => l.trim().split(/\s+/)[1]).filter(Boolean))];
          for (const pid2 of pids2) {
            try { process.kill(parseInt(pid2,10), 'SIGKILL'); console.log(`[kill-port] SIGKILL pid ${pid2} (port ${port})`); } catch {}
          }
        }
      } catch {}
    }, 400);
    return any;
  } catch { return false; }
}

const ports = parsePorts();
let total = 0;
ports.forEach(p => { if (killPort(p)) total++; });
if (total === 0) console.log('[kill-port] No ports required cleanup.');