import { remote } from 'webdriverio';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const driverHost = process.env.TAURI_DRIVER_HOST || '127.0.0.1';
const driverPort = Number(process.env.TAURI_DRIVER_PORT || 4444);
const useMockScan = process.env.INSPECTOR_SCAN_MOCK || '1';

const processes = [];

const spawnProcess = (command, args, options = {}) => {
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  processes.push(proc);
  return proc;
};

const waitForPort = async (host, port, timeoutMs) => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    };
    tryConnect();
  });
};

const cleanup = async () => {
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill('SIGINT');
    }
  }
};

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(143);
});

const run = async () => {
  const rendererProc = spawnProcess('npm', ['run', 'dev', '-w', '@inspectortwin/renderer'], {
    cwd: rootDir,
  });

  const driverProc = spawnProcess('tauri-driver', ['--port', String(driverPort)], {
    cwd: rootDir,
  });

  const tauriEnv = {
    ...process.env,
    TAURI_DRIVER_HOST: driverHost,
    TAURI_DRIVER_PORT: String(driverPort),
    INSPECTOR_SCAN_MOCK: useMockScan,
  };

  const tauriProc = spawnProcess('cargo', ['tauri', 'dev'], {
    cwd: join(rootDir, 'src-tauri'),
    env: tauriEnv,
  });

  await waitForPort(driverHost, driverPort, 60000);

  const browser = await remote({
    hostname: driverHost,
    port: driverPort,
    path: '/',
    logLevel: 'error',
    capabilities: {
      browserName: 'tauri',
    },
  });

  await browser.$('body').waitForExist({ timeout: 60000 });

  const roeCheckbox = await browser.$('input[type="checkbox"]');
  if (await roeCheckbox.isExisting()) {
    await roeCheckbox.click();
    const roeButton = await browser.$('//button[contains(., "Enable local testing")]');
    if (await roeButton.isExisting()) {
      await roeButton.click();
    }
  }

  const projectsNav = await browser.$('//a[contains(., "Projects")]');
  if (await projectsNav.isExisting()) {
    await projectsNav.click();
  }

  let testProjectCard = null;
  const cards = await browser.$$('div.card');
  for (const card of cards) {
    const text = await card.getText();
    if (text.toLowerCase().includes('test')) {
      testProjectCard = card;
      break;
    }
  }

  if (!testProjectCard) {
    const newProjectButton = await browser.$('//button[contains(., "New Project")]');
    await newProjectButton.click();
    const nameInput = await browser.$('input[placeholder="Project Name"]');
    await nameInput.setValue('test');
    const createButton = await browser.$('//button[contains(., "Create")]');
    await createButton.click();

    const updatedCards = await browser.$$('div.card');
    for (const card of updatedCards) {
      const text = await card.getText();
      if (text.toLowerCase().includes('test')) {
        testProjectCard = card;
        break;
      }
    }
  }

  if (!testProjectCard) {
    throw new Error('Test project not found and could not be created.');
  }

  await testProjectCard.click();

  const designerNav = await browser.$('//a[contains(., "Twin Designer")]');
  await designerNav.click();

  const scanButton = await browser.$('//button[contains(., "SCAN Network")]');
  await scanButton.waitForExist({ timeout: 30000 });
  await scanButton.click();

  const liveDevicesSummary = await browser.$('//summary[contains(., "Live devices")]');
  await liveDevicesSummary.waitForExist({ timeout: 60000 });
  await liveDevicesSummary.click();

  const details = await liveDevicesSummary.parentElement();
  await browser.waitUntil(async () => {
    const text = await details.getText();
    return text.includes('10.0.0.42') && text.includes('AA:BB:CC:DD:EE:FF') && text.includes('completed');
  }, { timeout: 60000, timeoutMsg: 'Live devices did not update with mock scan data.' });

  await browser.deleteSession();

  await cleanup();
  rendererProc.unref();
  driverProc.unref();
  tauriProc.unref();
};

run().catch(async (err) => {
  console.error(err);
  await cleanup();
  process.exit(1);
});
