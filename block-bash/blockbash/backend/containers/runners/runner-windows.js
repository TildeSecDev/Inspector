// Windows Runner supporting two modes:
// 1. WinRM HTTP(S) (preferred when WINRM_HOST present)
// 2. SSH PowerShell fallback (when WIN_SSH_HOST present)
// Environment variables (WinRM):
//   WINRM_HOST, WINRM_USER, WINRM_PASS, WINRM_PORT (default 5985), WINRM_SSL=1 for https (default http), WINRM_ALLOW_INSECURE=1
// Environment variables (SSH):
//   WIN_SSH_HOST, WIN_SSH_USER, WIN_SSH_PASS or WIN_SSH_KEY, WIN_SSH_PORT (default 22)
// Exec contract: execInWindows(username, command, onData, onExit)

const { Client: SSHClient } = (() => { try { return require('ssh2'); } catch { return {}; } })();
let WinRM; try { WinRM = require('node-winrm'); } catch {}
const fs = require('fs');

// Simple in-memory cached connection (single host). For multi-user isolation you could
// extend this to map username->connection if per-user accounts differ.
let cachedConn = null; // SSH
let cachedReady = false;
let cachedConfigSig = null;
let winrmClient = null; // WinRM client (stateless wrapper)

function buildConfig() {
  const host = process.env.WIN_SSH_HOST;
  const username = process.env.WIN_SSH_USER;
  const password = process.env.WIN_SSH_PASS;
  const keyPath = process.env.WIN_SSH_KEY;
  const port = parseInt(process.env.WIN_SSH_PORT || '22', 10);
  if (!host || !username || (!password && !keyPath)) {
    throw new Error('Windows SSH configuration incomplete (require WIN_SSH_HOST, WIN_SSH_USER and WIN_SSH_PASS or WIN_SSH_KEY)');
  }
  const cfg = { host, username, port }; // auth below
  if (password) cfg.password = password;
  if (keyPath) {
    if (!fs.existsSync(keyPath)) throw new Error('WIN_SSH_KEY path not found: ' + keyPath);
    cfg.privateKey = fs.readFileSync(keyPath);
  }
  return cfg;
}

function calcConfigSig(cfg){
  return [cfg.host, cfg.port, cfg.username, !!cfg.password, cfg.privateKey ? (cfg.privateKey.length||0) : 0].join('|');
}

async function getConnection() {
  if (!SSHClient) throw new Error('ssh2 module not available');
  const cfg = buildConfig();
  const sig = calcConfigSig(cfg);
  if (cachedConn && cachedReady && sig === cachedConfigSig) {
    return cachedConn;
  }
  // Dispose previous if config changed
  if (cachedConn) {
    try { cachedConn.end(); } catch {}
    cachedConn = null; cachedReady = false; cachedConfigSig = null;
  }
  cachedConn = new SSHClient();
  await new Promise((resolve, reject) => {
    let done = false;
    cachedConn.on('ready', () => { if(done) return; done = true; cachedReady = true; resolve(); })
      .on('error', (err) => { if(done) return; done = true; reject(err); });
    try { cachedConn.connect(cfg); } catch(e){ done = true; reject(e); }
  });
  cachedConfigSig = sig;
  return cachedConn;
}

async function ensureWindowsContainer(username) {
  // Decide mode
  if (process.env.WINRM_HOST && WinRM) {
    // Lazy init; node-winrm client created per exec (library stateless). We keep meta only.
    return {
      id: 'winrm-' + (username || 'user'),
      createdAt: Date.now(),
      lastUsed: Date.now(),
      image: 'windows-winrm',
      state: 'running',
      kind: 'winrm-windows'
    };
  }
  // SSH fallback
  const conn = await getConnection();
  return {
    id: 'win-ssh-' + (username || 'user'),
    createdAt: Date.now(),
    lastUsed: Date.now(),
    image: 'windows-ssh',
    state: conn && cachedReady ? 'running' : 'connecting',
    kind: 'ssh-windows'
  };
}

async function execInWindows(username, command, onData, onExit) {
  try {
    if (!command || !command.trim()) {
      onData && onData('[windows] empty command\n');
      onExit && onExit(0);
      return;
    }
    if (process.env.WINRM_HOST && WinRM) {
      const host = process.env.WINRM_HOST;
      const user = process.env.WINRM_USER;
      const pass = process.env.WINRM_PASS;
      const port = process.env.WINRM_PORT || (process.env.WINRM_SSL==='1' ? '5986':'5985');
      if (!host || !user || !pass) {
        onData && onData('[windows-winrm-error] Missing WINRM_HOST/USER/PASS env vars\n');
        onExit && onExit(1);
        return;
      }
      const protocol = process.env.WINRM_SSL==='1' ? 'https' : 'http';
      const allowInsecure = process.env.WINRM_ALLOW_INSECURE==='1';
      const endpoint = `${protocol}://${host}:${port}/wsman`;
      try {
        const client = new WinRM.Client(endpoint, { username: user, password: pass, strictSSL: !allowInsecure });
        const ps = new WinRM.PowerShell(`$ErrorActionPreference='Stop'; ${command}`);
        client.execute(ps, (err, result) => {
          if (err) {
            onData && onData('[windows-winrm-error] '+ err.message + '\n');
            onExit && onExit(1);
            return;
          }
          if (result && Array.isArray(result.history)) {
            for (const h of result.history) {
              if (h.command === 'stdout' && h.data) onData && onData(h.data);
              if (h.command === 'stderr' && h.data) onData && onData(h.data);
            }
          } else if (result && result.output) {
            onData && onData(result.output);
          }
          onExit && onExit(result && typeof result.code === 'number' ? result.code : 0);
        });
      } catch (e) {
        onData && onData('[windows-winrm-error] '+ e.message + '\n');
        onExit && onExit(1);
      }
      return;
    }
    // SSH path
    const conn = await getConnection();
    const psCommand = `powershell -NoLogo -NoProfile -Command \"$ErrorActionPreference='Stop'; ${command.replace(/"/g,'`"')}\"`;
    conn.exec(psCommand, { pty: { term: 'xterm-color' } }, (err, stream) => {
      if (err) { onData && onData('[windows-error] ' + err.message + '\n'); onExit && onExit(1); return; }
      stream.on('data', d => { onData && onData(d.toString()); })
        .stderr.on('data', d => { onData && onData(d.toString()); });
      stream.on('close', (code) => { onExit && onExit(typeof code === 'number' ? code : 0); });
    });
  } catch (e) {
    onData && onData('[windows-error] ' + e.message + '\n');
    onExit && onExit(1);
  }
}

module.exports = { ensureWindowsContainer, execInWindows };
