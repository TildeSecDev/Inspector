// Container Manager: orchestrates per-user sandbox containers
// Initial MVP focuses on Kali (Debian-based) Docker containers.
// Future runners (macOS via SSH, Windows via WinRM) can plug into the same interface.

// Lazy load dockerode only if we actually need it (skip in tests/CI when flagged)
let Docker; // assigned on first init
const { randomUUID } = require('crypto');
const { Client: SSHClient } = (()=>{ try { return require('ssh2'); } catch { return {}; } })();
const fs = require('fs');
let windowsRunner = null;
try { windowsRunner = require('./runners/runner-windows'); } catch { /* optional */ }
const { spawn } = require('child_process');
const path = require('path');

// Attempt multiple Docker connection strategies (local socket preferred)
let docker;
let dockerStatus = { available: false, error: null, lastCheck: null };
// Concurrency guards
let verifyPromise = null; // ensures only one verifyDockerSetup runs
const creationPromises = new Map(); // user/os -> promise

async function runDockerCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`${command} failed: ${stderr.trim()}`));
      }
    });
  });
}

async function verifyDockerSetup() {
  if (process.env.SKIP_DOCKER === '1' || process.env.JEST_WORKER_ID !== undefined) {
    dockerStatus = { available: false, error: 'skipped', lastCheck: new Date().toISOString() };
    return false;
  }
  if (verifyPromise) return verifyPromise; // de-dupe concurrent calls
  verifyPromise = (async () => {
    console.log('🐳 Verifying Docker setup...');
    const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
    if (fs.existsSync(socketPath)) {
      console.log(`✓ Docker socket found: ${socketPath}`);
    } else {
      console.log(`⚠️  Docker socket not found: ${socketPath}`);
    }
    try {
      console.log('Running docker info...');
      const info = await runDockerCommand('docker', ['info', '--format', 'json']);
      const dockerInfo = JSON.parse(info);
      console.log(`✓ Docker Engine: ${dockerInfo.ServerVersion || 'Unknown'}`);
      console.log(`✓ Containers: ${dockerInfo.Containers || 0} (${dockerInfo.ContainersRunning || 0} running)`);
      console.log('Running docker ps...');
      const ps = await runDockerCommand('docker', ['ps', '--format', 'table {{.Names}}\t{{.Status}}\t{{.Image}}']);
      console.log('✓ Current containers:');
      console.log(ps || 'No containers running');
      // Demo container handling (idempotent)
      try {
        const existingNames = await runDockerCommand('docker', ['ps', '-a', '--format', '{{.Names}}']);
        const namesArr = existingNames.split(/\n+/).filter(Boolean);
        if (namesArr.includes('inspector-demo')) {
          // Try to start if not running
            try { await runDockerCommand('docker', ['start', 'inspector-demo']); } catch { /* ignore */ }
          console.log('✓ Demo container present (reused): inspector-demo');
        } else {
          console.log('🚀 Starting test container for inspector demo...');
          const testContainer = await runDockerCommand('docker', ['run', '-d', '--name', 'inspector-demo', '--rm', 'alpine:latest', 'sleep', '300']);
          console.log(`✓ Demo container started: ${testContainer.substring(0, 12)}`);
        }
      } catch (demoErr) {
        if (/Conflict/.test(demoErr.message)) {
          console.log('ℹ️  Demo container name conflict detected – treating as reuse.');
        } else {
          console.log('⚠️  Demo container step issue (continuing):', demoErr.message);
        }
      }
      return true;
    } catch (error) {
      console.log(`❌ Docker command failed: ${error.message}`);
      console.log('Attempting to start Docker...');
      try {
        await runDockerCommand('docker', ['version']);
        console.log('✓ Docker started successfully');
        return true;
      } catch (startError) {
        console.log(`❌ Failed to start Docker: ${startError.message}`);
        return false;
      }
    }
  })();
  try { return await verifyPromise; } finally { verifyPromise = null; }
}

async function initDocker() {
  if (docker) return docker;
  if (process.env.SKIP_DOCKER === '1' || process.env.JEST_WORKER_ID !== undefined) {
    dockerStatus = { available: false, error: 'skipped', lastCheck: new Date().toISOString() };
    return null;
  }
  if (!Docker) {
    try { Docker = require('dockerode'); } catch (e) {
      dockerStatus = { available: false, error: 'dockerode_not_installed', lastCheck: new Date().toISOString() };
      return null;
    }
  }
  const dockerWorking = await verifyDockerSetup();
  if (!dockerWorking) return null;
  const attempts = [
    () => new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' }),
    () => new Docker({ host: '127.0.0.1', port: 2375, protocol: 'http' })
  ];
  for (const factory of attempts) {
    try {
      const client = factory();
      await client.ping();
      docker = client;
      dockerStatus = { available: true, error: null, lastCheck: new Date().toISOString() };
      console.log('✓ Docker client initialized successfully (lazy)');
      return docker;
    } catch { /* try next */ }
  }
  dockerStatus = { available: false, error: 'Docker client connection failed', lastCheck: new Date().toISOString() };
  console.warn('❌ Docker not available – sandbox features disabled');
  docker = null;
  return null;
}

// In-memory registry; replace with Redis/Postgres later.
const containersByUser = new Map(); // user -> { id, createdAt, lastUsed, image, state }

const IMAGE_MAP = {
  kali: process.env.KALI_IMAGE || 'kalilinux/kali-rolling',
  windows: process.env.WIN_IMAGE || 'mcr.microsoft.com/powershell:latest', // placeholder (real Windows container needs Windows host)
  // macOS support: if MACOS_DOCKUR=1 and host is linux with /dev/kvm, prefer dockur/macos, else placeholder
  osx: (() => {
    if (process.env.MAC_IMAGE) return process.env.MAC_IMAGE;
    if (process.env.MACOS_DOCKUR === '1' && process.platform === 'linux' && require('fs').existsSync('/dev/kvm')) {
      return 'dockur/macos:latest';
    }
    return 'alpine:latest'; // placeholder until virtualization integration available
  })()
};
const DEFAULT_IMAGE = IMAGE_MAP.kali || 'alpine:latest';
const CONTAINER_IDLE_TIMEOUT_MS = 1000 * 60 * 20; // 20 min

function normalizeOS(os) {
  os = (os||'').toLowerCase();
  if(!['kali','windows','osx'].includes(os)) return 'kali';
  return os;
}

// Provisioning timeouts / health settings
const PROVISION_TIMEOUT_MS = parseInt(process.env.PROVISION_TIMEOUT_MS || '300000', 10); // 5m
const PROVISION_HEALTH_TIMEOUT_MS = parseInt(process.env.PROVISION_HEALTH_TIMEOUT_MS || '60000', 10); // 60s

async function ensureUserContainer(username, opts = {}) {
  docker = await initDocker();
  if (!docker) throw new Error('Docker client not available');
  let os = normalizeOS(opts.os || 'kali');
  const key = `${username}::${os}`;
  const preferredImage = opts.image || IMAGE_MAP[os] || DEFAULT_IMAGE;
  let fallbackFrom = null;
  let provisionedMeta = null; // { id, ports, os }
  // Attempt native SSH runner for windows/osx if env configured
  if ((os === 'windows' || os === 'osx') && !preferredImage.startsWith('kalilinux') ) {
    const prefix = os === 'windows' ? 'WIN' : 'MAC';
    const host = process.env[`${prefix}_SSH_HOST`];
    const user = process.env[`${prefix}_SSH_USER`];
    const keyPath = process.env[`${prefix}_SSH_KEY`];
    const password = process.env[`${prefix}_SSH_PASS`];
    // Prefer specialized windows runner abstraction if available & os === windows
    if (os === 'windows' && windowsRunner && host && user) {
      try {
        const winSession = await windowsRunner.ensureWindowsContainer(username);
        const record = {
          id: winSession.id,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          image: 'ssh:windows',
          state: 'running',
          adopted: false,
          kind: 'ssh-windows',
          runner: {
            exec: (command, onData, onExit) => windowsRunner.execInWindows(username, command, onData, onExit),
            dispose: () => {/* no-op for now */}
          },
          session: winSession
        };
        containersByUser.set(key, record);
        return record;
      } catch (e) {
        console.warn('[windows-runner] failed to initialize specialized runner, falling back to generic SSH:', e.message);
      }
    }
    if (host && user && SSHClient) {
      // Build SSH runner record directly (no Docker)
      const runnerId = randomUUID().slice(0,12);
      const conn = new SSHClient();
      const connectConfig = { host, username: user };
      if (keyPath && require('fs').existsSync(keyPath)) connectConfig.privateKey = require('fs').readFileSync(keyPath);
      if (password) connectConfig.password = password;
      // Lazy connect on first exec to avoid blocking init path
      const runner = {
        kind: 'ssh',
        os,
        id: runnerId,
        connect: () => new Promise((resolve,reject)=>{
          if (runner._ready) return resolve();
          conn.on('ready', ()=>{ runner._ready = true; resolve(); })
              .on('error', err=>{ reject(err); });
          try { conn.connect(connectConfig); } catch(e){ reject(e); }
        }),
        exec: async (command, onData, onExit) => {
          try {
            await runner.connect();
            conn.exec(command, (err, stream) => {
              if (err) { onData && onData('[ssh-error] '+err.message+'\n'); onExit && onExit(1); return; }
              stream.on('data', d => onData && onData(d.toString()))
                    .stderr.on('data', d => onData && onData(d.toString()));
              stream.on('close', (code)=>{ onExit && onExit(code); });
            });
          } catch(e) {
            onData && onData('[ssh-error] '+e.message+'\n');
            onExit && onExit(1);
          }
        },
        dispose: () => { try { conn.end(); } catch{} }
      };
      const record = {
        id: runnerId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        image: 'ssh:'+os,
        state: 'running',
        adopted: false,
        kind: 'ssh',
        runner
      };
      containersByUser.set(key, record);
      return record;
    }
  }
  // Refined fallback logic:
  // Previously any windows/osx request using the powershell image triggered a fallback to kali,
  // which caused Windows sessions to incorrectly run in a Kali container. The PowerShell image
  // (mcr.microsoft.com/powershell) is Linux-compatible, so we should NOT fallback for it.
  // We now only fallback when a truly Windows-only image (servercore/nanoserver) is requested
  // on a non-Windows host. macOS (osx) remains a placeholder image unless MAC_IMAGE is provided.
  const WINDOWS_ONLY_MARKERS = ['windows/servercore', 'windows/nanoserver', 'mcr.microsoft.com/windows'];
  if (os === 'windows' && WINDOWS_ONLY_MARKERS.some(m => preferredImage.includes(m)) && process.platform !== 'win32') {
    console.warn('[containers] Windows-only image requested on non-Windows host – falling back to kali');
    fallbackFrom = 'windows';
    os = 'kali';
  }

  // Experimental macOS via dockur/macos (QEMU-in-container) provisioning path
  if (os === 'osx' && preferredImage.startsWith('dockur/macos')) {
    if (process.platform !== 'linux') {
      console.warn('[containers] dockur/macos requires a Linux host with KVM – current host is', process.platform, 'falling back to placeholder alpine');
    } else if (!require('fs').existsSync('/dev/kvm')) {
      console.warn('[containers] /dev/kvm not present – cannot launch macOS VM container, falling back to placeholder alpine');
    } else {
      const existing = containersByUser.get(key);
      if (existing) { existing.lastUsed = Date.now(); return existing; }
      if (creationPromises.has(key)) { return await creationPromises.get(key); }
      const creationPromise = (async () => {
        try {
          try { await docker.pull(preferredImage, {}); } catch (e) { console.warn('[macos] image pull issue (continuing):', e.message); }
          const friendlyName = `${username}-MacOS`; const sanitizedName = friendlyName.replace(/[^a-zA-Z0-9_.-]/g,'_');
          // Build env vars for dockur/macos VM
          const envVars = [
            `RAM=${opts.ram || process.env.MACOS_RAM || '4'}`,
            `CORES=${opts.cores || process.env.MACOS_CORES || '4'}`,
            `DISK=${opts.disk || process.env.MACOS_DISK || '64G'}`,
            `WIDTH=${opts.width || process.env.MACOS_WIDTH || '1280'}`,
            `HEIGHT=${opts.height || process.env.MACOS_HEIGHT || '800'}`,
            `SERIAL=${process.env.MACOS_SERIAL || randomUUID().slice(0,12)}`,
            `VERSION=${opts.version || process.env.MACOS_VERSION || ''}`
          ];
          // Optional SSH provisioning for non-interactive auth
          try {
            const sshUser = process.env.MACOS_SSH_USER || 'user';
            const sshPass = process.env.MACOS_SSH_PASS || '';
            let sshPubKey = process.env.MACOS_SSH_PUBLIC_KEY || '';
            const idPath = process.env.MACOS_SSH_IDENTITY;
            if (!sshPubKey && idPath) {
              const fs = require('fs');
              if (fs.existsSync(idPath + '.pub')) {
                sshPubKey = fs.readFileSync(idPath + '.pub', 'utf8').trim();
              } else if (fs.existsSync(idPath)) {
                // Try derive public key using ssh-keygen -y
                try {
                  const { spawnSync } = require('child_process');
                  const out = spawnSync('ssh-keygen', ['-y', '-f', idPath], { encoding: 'utf8' });
                  if (out && out.status === 0) sshPubKey = out.stdout.trim();
                } catch {}
              }
            }
            if (sshUser) envVars.push(`USER=${sshUser}`);
            if (sshPass) envVars.push(`PASSWORD=${sshPass}`);
            if (sshPubKey) envVars.push(`SSH_PUBLIC_KEY=${sshPubKey}`);
          } catch {}
          const hostConfig = {
            AutoRemove: false,
            Privileged: true, // dockur/macos typically needs additional privileges
            NetworkMode: process.env.SANDBOX_NETWORK || 'bridge',
            Devices: ['/dev/kvm'].map(p => ({ PathOnHost: p, PathInContainer: p, CgroupPermissions: 'rwm' })),
            CapAdd: ['NET_ADMIN']
          };
          let container;
          try {
            container = await docker.createContainer({
              Image: preferredImage,
              name: sanitizedName,
              Tty: true,
              Env: envVars,
              HostConfig: hostConfig,
              ExposedPorts: { '10022/tcp': {}, '3389/tcp': {}, '5900/tcp': {} },
              PortBindings: {
                '10022/tcp': [{ HostPort: opts.sshPort || process.env.MACOS_SSH_PORT || '' }],
                '3389/tcp': [{ HostPort: opts.rdpPort || process.env.MACOS_RDP_PORT || '' }],
                '5900/tcp': [{ HostPort: opts.vncPort || process.env.MACOS_VNC_PORT || '' }]
              }
            });
            await container.start();
            console.log('🖥️  Started macOS VM container for', username, 'name=', sanitizedName);
          } catch (createErr) {
            console.warn('[macos] failed to create VM container:', createErr.message);
            throw createErr;
          }
          const record = {
            id: container.id,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            image: preferredImage,
            state: 'starting',
            kind: 'docker-macos-vm',
            note: 'macOS guest booting',
            readiness: { ssh: false },
            ports: {},
            ssh: { user: process.env.MACOS_SSH_USER || 'user', pass: process.env.MACOS_SSH_PASS || null, host: '127.0.0.1', port: null }
          };
          containersByUser.set(key, record);
          // Background watcher: discover mapped ports, poll SSH banner to mark readiness
          (async () => {
            try {
              const start = Date.now();
              while (Date.now() - start < 180000) { // up to 3 minutes boot window
                try {
                  const inspect = await container.inspect();
                  if (inspect?.State?.Running) {
                    record.state = 'running';
                    const ports = (inspect.NetworkSettings && inspect.NetworkSettings.Ports) || {};
                    record.ports = Object.fromEntries(Object.entries(ports).map(([k,v])=>[k,(v && v[0] && v[0].HostPort) || null]));
                    if (!record.ssh.port && ports['10022/tcp'] && ports['10022/tcp'][0] && ports['10022/tcp'][0].HostPort) {
                      record.ssh.port = ports['10022/tcp'][0].HostPort;
                    }
                    if (record.ssh.port) {
                      // Attempt one-time banner read
                      await new Promise((resolve)=>{
                        const net = require('net');
                        let done=false;
                        const sock = net.createConnection({ host: record.ssh.host, port: record.ssh.port }, () => {
                          let banner='';
                          const to = setTimeout(()=>{ if(done) return; done=true; try { sock.destroy(); } catch{}; resolve(); }, 4000);
                          sock.on('data', d => { banner += d.toString(); if(/SSH-/.test(banner)){ if(done) return; done=true; clearTimeout(to); record.readiness.ssh = true; record.readiness.banner = banner.split(/\r?\n/)[0]; try { sock.destroy(); } catch{}; resolve(); } });
                        });
                        sock.on('error', ()=>{ if(done) return; done=true; resolve(); });
                      });
                    }
                    if (record.readiness.ssh) break; // ready
                  }
                } catch {}
                await new Promise(r=>setTimeout(r, 2500));
              }
              if (!record.readiness.ssh) record.note = (record.note||'') + ' (SSH not ready after timeout)';
            } catch(e) {
              record.note = 'macOS readiness probe failed: '+ e.message;
            }
          })();
          return record;
        } catch (e) {
          console.warn('[macos] provisioning fallback to alpine placeholder:', e.message);
          // mutate IMAGE_MAP? we just fall through by creating an alpine container below by forcing os=kali path
          const placeholder = { id: 'macos-unavailable', createdAt: Date.now(), lastUsed: Date.now(), image: 'alpine:latest', state: 'unavailable', kind: 'placeholder', note: 'macOS virtualization unsupported on this host' };
          containersByUser.set(key, placeholder);
          return placeholder;
        }
      })();
      creationPromises.set(key, creationPromise);
      try { return await creationPromise; } finally { creationPromises.delete(key); }
    }
  }
  // Attempt auto-provision if windows/macos requested and provisioning enabled (and we didn't fallback)
  const WANT_PROVISION = process.env.PROVISION_ALT_OS === '1';
  if ((opts.os === 'windows' || opts.os === 'osx') && !fallbackFrom && WANT_PROVISION) {
    try {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'provision_os_container.sh');
      const fs = require('fs');
      // Real path validation to keep inside scripts directory
      const scriptsDir = path.join(__dirname, '..', '..', 'scripts');
      const realScript = fs.existsSync(scriptPath) ? fs.realpathSync(scriptPath) : null;
      if (realScript && realScript.startsWith(fs.realpathSync(scriptsDir)+path.sep) && (fs.statSync(realScript).mode & 0o111)) {
        const targetOs = opts.os === 'osx' ? 'macos' : 'windows';
        console.log(`[provision] Starting provisioning for ${username} (${targetOs}) via script`);
        provisionedMeta = await new Promise((resolve, reject) => {
          const args = ['--os', targetOs, '--user', username, '--memory', opts.memory || '4G', '--cpus', String(opts.cpus || 4)];
          const proc = spawn(scriptPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
          let out=''; let err='';
          let finished = false;
          const to = setTimeout(()=>{
            if (finished) return; finished = true;
            try { proc.kill('SIGKILL'); } catch {}
            reject(new Error(`provision timeout after ${PROVISION_TIMEOUT_MS}ms`));
          }, PROVISION_TIMEOUT_MS);
          proc.stdout.on('data', d=> out += d.toString());
          proc.stderr.on('data', d=> err += d.toString());
          proc.on('close', code => {
            if (finished) return; finished = true; clearTimeout(to);
            if (code !== 0) return reject(new Error(`provision script exited ${code}: ${err.trim()}`));
            const lines = out.trim().split(/\n/).filter(Boolean);
            let metaLine = lines[lines.length-1];
            try { const meta = JSON.parse(metaLine); resolve(meta); } catch(e){ reject(new Error('Failed to parse provision output JSON: '+ metaLine)); }
          });
        });
        // Basic health check: wait until docker shows container running (if present) or timeout
        if (provisionedMeta && provisionedMeta.container) {
          const start = Date.now();
          while (Date.now() - start < PROVISION_HEALTH_TIMEOUT_MS) {
            try {
              const healthDocker = await initDocker();
              if (healthDocker) {
                const c = healthDocker.getContainer(provisionedMeta.container);
                const insp = await c.inspect();
                if (insp?.State?.Running) { provisionedMeta.health = 'running'; break; }
              }
            } catch {}
            await new Promise(r=>setTimeout(r, 1500));
          }
          if (!provisionedMeta.health) provisionedMeta.health = 'unknown';
        }
        // Record placeholder so subsequent ensure fetch returns this meta (no docker exec support yet)
        const record = {
          id: provisionedMeta.id, // short id from script; not docker container id necessarily
          createdAt: Date.now(),
          lastUsed: Date.now(),
          image: `provisioned:${provisionedMeta.os}`,
          state: 'running',
          adopted: false,
          kind: 'provisioned-vm',
          provision: provisionedMeta // { container, os, id, ports }
        };
        containersByUser.set(key, record);
        return record;
      } else {
        console.warn('[provision] Script not executable or missing at', scriptPath);
      }
    } catch (provisionErr) {
      console.warn('[provision] Failed:', provisionErr.message);
    }
  }
  const existing = containersByUser.get(key);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing;
  }
  // De-duplicate concurrent creation attempts
  if (creationPromises.has(key)) {
    const rec = await creationPromises.get(key);
    return rec;
  }
  const creationPromise = (async () => {
  // Pull image lazily (best-effort)
  try {
    await docker.pull(preferredImage, {});
  } catch (e) {
    console.warn('Image pull failed (continuing if already present):', preferredImage, e.message);
  }

  const friendlyName = `${username}-${os.charAt(0).toUpperCase()+os.slice(1)}`;
  const sanitizedName = friendlyName.replace(/[^a-zA-Z0-9_.-]/g,'_');
  let adopted = false;
  let container;
  // Attempt to adopt an existing container with the intended name (handles previous run leftovers)
  try {
    const list = await docker.listContainers({ all: true, filters: { name: [sanitizedName] } });
    if (Array.isArray(list) && list.length > 0) {
      const existingInfo = list[0];
      container = docker.getContainer(existingInfo.Id);
      const inspect = await container.inspect();
      if (inspect.State && !inspect.State.Running) {
        try { await container.start(); } catch (startErr) {
          console.warn('Could not start existing container, will attempt recreate:', startErr.message);
          container = null; // force recreation
        }
      }
      if (container) {
        adopted = true;
        console.log(`↺ Reusing existing container for ${username}: ${sanitizedName}`);
      }
    }
  } catch (adoptErr) {
    // Non-fatal; proceed to create
  }

  if (!container) {
    container = await docker.createContainer({
      Image: preferredImage,
      name: sanitizedName,
      Tty: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: false,
      HostConfig: {
        AutoRemove: false,
        Memory: parseInt(process.env.SANDBOX_MEMORY || '536870912', 10), // 512MiB default
        NanoCPUs: parseInt(process.env.SANDBOX_NANO_CPUS || '500000000', 10), // 0.5 CPU
        NetworkMode: process.env.SANDBOX_NETWORK || 'bridge',
        CapDrop: ['ALL'], // Drop all capabilities
        Privileged: false,
        NoNewPrivileges: true, // Prevent privilege escalation
        User: '1000:1000', // Run as non-root user (assuming kali user)
        Ulimits: [
          { Name: 'nofile', Soft: 1024, Hard: 2048 },
          { Name: 'nproc', Soft: 1024, Hard: 2048 }
        ],
        SecurityOpt: ['seccomp=unconfined'] // Use default seccomp profile; customize if needed
      },
      Env: [
        `USER_NAME=${username}`
      ]
    });
    await container.start();
    console.log(`🐣 Created new container for ${username}: ${sanitizedName}`);
  }

  const record = {
    id: container.id,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    image: preferredImage,
    state: 'running',
    adopted,
  fallbackFrom,
  kind: 'docker'
  };
  containersByUser.set(key, record);
  // Fire-and-forget background provisioning of common tools in Kali-based containers
  try {
    if ((preferredImage || '').includes('kali') || os === 'kali') {
      // Install tshark (Wireshark CLI), apache2, and common networking tools if not already provisioned
      (async () => {
        try {
          const d = await initDocker();
          if (!d) return;
          const c = d.getContainer(record.id);
          const script = `set -e
export DEBIAN_FRONTEND=noninteractive
if [ ! -f /.blockbash_provisioned ]; then
  (apt-get update -y || apt-get update) >/dev/null 2>&1 || true
  apt-get install -y --no-install-recommends tshark apache2 iproute2 iputils-ping net-tools curl >/dev/null 2>&1 || true
  touch /.blockbash_provisioned
fi`;
          const execObj = await c.exec({
            Cmd: ['bash', '-lc', script],
            AttachStdout: true,
            AttachStderr: true,
            AttachStdin: false,
            Tty: false,
            User: '0:0'
          });
          const stream = await execObj.start({ hijack: true, stdin: false });
          // Drain output to avoid backpressure and keep logs concise
          stream.on('data', () => {});
          stream.on('end', async () => { try { await execObj.inspect(); } catch {} });
        } catch (provErr) {
          console.warn('[provision] Background tool install failed:', provErr.message);
        }
      })();
    }
  } catch (e) {
    console.warn('[provision] Skipping background install:', e.message);
  }
  return record;
  })();
  creationPromises.set(key, creationPromise);
  try {
    return await creationPromise;
  } finally {
    creationPromises.delete(key);
  }
}

async function execInUserContainer(username, command, onData, onExit, os='kali') {
  docker = await initDocker();
  if (!docker) throw new Error('Docker client not available');
  const reg = containersByUser.get(`${username}::${normalizeOS(os)}`);
  if (!reg) throw new Error('Container not initialized for user');
  // SSH-based runner
  if ((reg.kind === 'ssh' || reg.kind === 'ssh-windows') && reg.runner) {
    return reg.runner.exec(command, onData, onExit);
  }
  // Provisioned VM adapter: attempt docker exec into underlying provisioning container environment
  // macOS VM (dockur) SSH bridge: prefer SSH when banner seen; fallback to docker exec
  if (reg.kind === 'docker-macos-vm') {
    if (reg.readiness?.ssh && reg.ssh?.port) {
      const sshUser = reg.ssh.user || 'user';
      const sshHost = reg.ssh.host || '127.0.0.1';
      const sshPort = reg.ssh.port;
      const identity = process.env.MACOS_SSH_IDENTITY;
      const args = ['-o','StrictHostKeyChecking=no','-p', String(sshPort)];
      if (identity && require('fs').existsSync(identity)) {
        args.push('-i', identity);
      } else if (reg.ssh.pass) {
        // Attempt sshpass path (common location) else proceed without (may prompt & fail silently)
        const sshpassPath = ['/usr/bin/sshpass','/bin/sshpass','/usr/local/bin/sshpass'].find(p=>{ try { return require('fs').existsSync(p); } catch { return false; } });
        if (sshpassPath) {
          const passArgs = ['-p', reg.ssh.pass, 'ssh'].concat(args, [`${sshUser}@${sshHost}`, 'bash','-lc', command]);
          const child = spawn(sshpassPath, passArgs, { stdio:['ignore','pipe','pipe'] });
          child.stdout.on('data', d => onData && onData(d.toString()));
          child.stderr.on('data', d => onData && onData(d.toString()));
          child.on('close', code => { onExit && onExit(code); });
          return;
        }
      }
      args.push(`${sshUser}@${sshHost}`, 'bash','-lc', command);
      const child = spawn('ssh', args, { stdio:['ignore','pipe','pipe'] });
      child.stdout.on('data', d => onData && onData(d.toString()));
      child.stderr.on('data', d => onData && onData(d.toString()));
      child.on('close', code => { onExit && onExit(code); });
      return;
    }
    // Fallback to docker exec inside macOS VM container while waiting for SSH
    try {
      const docker = await initDocker();
      const container = docker.getContainer(reg.id);
      const exec = await container.exec({ Cmd: ['bash','-lc', command], AttachStdout:true, AttachStderr:true, AttachStdin:false, Tty:false });
      const stream = await exec.start({ hijack:true, stdin:false });
      stream.on('data', c=> onData && onData(c.toString('utf8')));
      stream.on('end', async ()=>{ try { const insp = await exec.inspect(); onExit && onExit(insp.ExitCode); } catch(e){ onExit && onExit(null,e);} });
      return;
    } catch(e) {
      onData && onData('[macos-exec-error] '+ e.message + '\n');
      onExit && onExit(1);
      return;
    }
  }
  if (reg.kind === 'provisioned-vm' && reg.provision) {
    const containerName = reg.provision.container || reg.provision.id;
    // Try bash first, then PowerShell (windows), then fall back with message
    async function attemptExec(cmdArray, tag) {
      const container = docker.getContainer(containerName);
      const execObj = await container.exec({
        Cmd: cmdArray,
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: false,
        Tty: false
      });
      const stream = await execObj.start({ hijack: true, stdin: false });
      stream.on('data', c => onData && onData(c.toString('utf8')));
      stream.on('end', async () => {
        try {
          const inspect = await execObj.inspect();
          onExit && onExit(inspect.ExitCode);
        } catch (e) { onExit && onExit(null, e); }
      });
    }
    try {
      try {
        await attemptExec(['/bin/bash', '-lc', command], 'bash');
        reg.lastUsed = Date.now();
        return;
      } catch (bashErr) {
        if (reg.provision.os === 'windows') {
          try {
            await attemptExec(['pwsh', '-NoLogo', '-NoProfile', '-Command', command], 'pwsh');
            reg.lastUsed = Date.now();
            return;
          } catch (pwshErr) {
            // As last resort try Windows classic powershell if available
            try {
              await attemptExec(['powershell', '-NoLogo', '-NoProfile', '-Command', command], 'powershell');
              reg.lastUsed = Date.now();
              return;
            } catch (psErr) {
              // WinRM fallback attempt if environment variables present
              const host = process.env.WINRM_HOST || process.env.WINRM_IP;
              const user = process.env.WINRM_USER || process.env.WINRM_USERNAME;
              const pass = process.env.WINRM_PASS || process.env.WINRM_PASSWORD;
              const port = process.env.WINRM_PORT || '5985';
              if (host && user && pass) {
                // TCP connectivity pre-check
                try {
                  await new Promise((resolve, reject) => {
                    const net = require('net');
                    const sock = net.createConnection({ host, port }, () => { sock.destroy(); resolve(); });
                    sock.on('error', err => { sock.destroy(); reject(err); });
                    setTimeout(()=>{ try { sock.destroy(); } catch{}; reject(new Error('winrm connect timeout')); }, 4000);
                  });
                } catch (preErr) {
                  onData && onData('[winrm-precheck-failed] '+ preErr.message + '\n');
                  onExit && onExit(1);
                  return;
                }
                try {
                  // Spawn local pwsh to invoke remote command
                  const args = ['-NoLogo','-NoProfile','-Command', `Invoke-Command -ComputerName ${host} -Port ${port} -Authentication Basic -Credential (New-Object System.Management.Automation.PSCredential('${user}', (ConvertTo-SecureString '${pass}' -AsPlainText -Force))) -ScriptBlock { ${command.replace(/'/g,"''")} }`];
                  const usePwsh = process.env.WINRM_PWSH_PATH || 'pwsh';
                  const child = spawn(usePwsh, args, { stdio: ['ignore','pipe','pipe'] });
                  child.stdout.on('data', d => onData && onData(d.toString()));
                  child.stderr.on('data', d => onData && onData(d.toString()));
                  child.on('close', code => { onExit && onExit(code); });
                  onData && onData('[winrm] remote execution path engaged\n');
                  reg.lastUsed = Date.now();
                  return;
                } catch(winrmErr) {
                  onData && onData('[winrm-error] '+ winrmErr.message + '\n');
                  onExit && onExit(1);
                  return;
                }
              }
              onData && onData('[winrm-fallback-unavailable] Unable to exec via bash/pwsh/powershell. Consider enabling WinRM.\n');
              onExit && onExit(1);
              return;
            }
          }
        } else {
          onData && onData('[provisioned-exec-error] '+ bashErr.message + '\n');
          onExit && onExit(1);
          return;
        }
      }
    } catch (outerErr) {
      onData && onData('[provisioned-exec-error] '+ outerErr.message + '\n');
      onExit && onExit(1);
      return;
    }
  }
  // Default docker path
  const container = docker.getContainer(reg.id);
  const exec = await container.exec({
    Cmd: ['bash', '-lc', command],
    AttachStdout: true,
    AttachStderr: true,
    AttachStdin: false,
    Tty: false
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  stream.on('data', chunk => onData && onData(chunk.toString('utf8')));
  stream.on('end', async () => {
    try {
      const inspect = await exec.inspect();
      onExit && onExit(inspect.ExitCode);
    } catch (e) { onExit && onExit(null, e); }
  });
  reg.lastUsed = Date.now();
}

async function destroyIdleContainers() {
  if (!docker) return;
  const now = Date.now();
  for (const [user, info] of containersByUser.entries()) {
    if (now - info.lastUsed > CONTAINER_IDLE_TIMEOUT_MS) {
      try {
        if (info.kind === 'provisioned-vm' && info.provision?.container) {
          // Graceful stop of provisioned container
            try {
              const c = docker.getContainer(info.provision.container);
              await c.stop({ t: 10 }).catch(()=>{});
              await c.remove({ force: true }).catch(()=>{});
            } catch {}
        } else {
          const c = docker.getContainer(info.id);
          await c.stop({ t: 5 }).catch(()=>{});
          await c.remove({ force: true }).catch(()=>{});
        }
      } catch (e) {
        console.warn('Error destroying container', info.id, e.message);
      } finally {
        containersByUser.delete(user);
      }
    }
  }
}

setInterval(destroyIdleContainers, 60_000).unref();

function listContainers() {
  return Array.from(containersByUser.entries()).map(([user, v]) => ({ user, ...v }));
}

function getDocker() { return docker; }

function getDockerStatus() { return dockerStatus; }

function getContainerRecord(username, os) {
  const key = `${username}::${normalizeOS(os||'kali')}`;
  return containersByUser.get(key) || null;
}

async function disposeAll(reason='shutdown') {
  for (const [user, info] of containersByUser.entries()) {
    try {
      if (info.kind === 'provisioned-vm' && info.provision?.container) {
        const d = await initDocker(); if (d) {
          const c = d.getContainer(info.provision.container);
          await c.stop({ t: 5 }).catch(()=>{});
          await c.remove({ force: true }).catch(()=>{});
        }
      } else if (info.kind === 'docker') {
        const d = await initDocker(); if (d) {
          const c = d.getContainer(info.id);
          await c.stop({ t: 3 }).catch(()=>{});
          await c.remove({ force: true }).catch(()=>{});
        }
      } else if (info.kind === 'ssh' && info.runner) {
        try { info.runner.dispose(); } catch {}
      }
    } catch (e) {
      console.warn('[disposeAll] error', info.id, e.message);
    } finally {
      containersByUser.delete(user);
    }
  }
  console.log(`[containers] disposeAll complete (${reason})`);
}

['exit','SIGINT','SIGTERM'].forEach(sig => {
  process.on(sig, ()=>{ disposeAll(sig).then(()=>{ if (sig !== 'exit') process.exit(0); }); });
});

module.exports = {
  ensureUserContainer,
  execInUserContainer,
  listContainers,
  getDocker,
  getDockerStatus,
  getContainerRecord,
  disposeAll
};
