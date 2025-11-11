const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Standalone Electron app folder (bundled UI resources). This app does not use any
// resources from the original block-bash folder — it loads files from `electron-app`.
const APP_DIR = path.join(__dirname, 'electron-app');
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_PATH
    }
  });

  const indexPath = path.join(APP_DIR, 'index.html');
  win.loadFile(indexPath).catch(err => {
    console.error('[electron] failed to load index file:', err);
    win.loadURL('about:blank');
  });

  // Optional: open devtools in development
  if (process.env.NODE_ENV === 'development') win.webContents.openDevTools();
}

app.on('ready', () => {
  console.log('[electron] App ready. Loading standalone UI from electron-app/');
  // Install a simple app menu with common actions
  try {
    const isMac = process.platform === 'darwin';
    const template = [
      // { role: 'appMenu' }
      ...(isMac ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      // File menu
      {
        label: 'File',
        submenu: [
          {
            label: 'Open File...',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const win = BrowserWindow.getFocusedWindow();
              if (!win) return;
              const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'All', extensions: ['*'] }] });
              if (res.canceled || !res.filePaths || res.filePaths.length === 0) return;
              try {
                const content = fs.readFileSync(res.filePaths[0], 'utf8');
                win.webContents.send('file-opened', { path: res.filePaths[0], content });
              } catch (e) {
                dialog.showErrorBox('File open error', String(e));
              }
            }
          },
          { type: 'separator' },
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      // Help menu
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: async () => { require('electron').shell.openExternal('https://github.com/TildeSecDev/Inspector'); }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (e) { console.warn('[electron] menu build failed', e); }

  // Tray
  try {
    const tray = new (require('electron').Tray)(path.join(__dirname, 'electron-app', 'tray-template.png'));
    const trayMenu = Menu.buildFromTemplate([
      { label: 'Open Network Editor', click: ()=>{ const w = BrowserWindow.getAllWindows()[0]; if (w) w.webContents.send('navigate','network'); else createWindow(); } },
      { label: 'Simulate', click: ()=>{ const w = BrowserWindow.getAllWindows()[0]; if (w) w.webContents.send('simulate'); } },
      { type: 'separator' },
      { role: 'quit' }
    ]);
    tray.setContextMenu(trayMenu);
  } catch (e) { /* if tray icon missing, ignore */ }

  // IPC handlers
  ipcMain.handle('dialog:openFile', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'All', extensions: ['*'] }] });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    try {
      const content = fs.readFileSync(res.filePaths[0], 'utf8');
      return { path: res.filePaths[0], content };
    } catch (e) {
      return { error: String(e) };
    }
  });

  ipcMain.handle('file:save', async (evt, { path: savePath, content }) => {
    try {
      fs.writeFileSync(savePath, content, 'utf8');
      return { ok: true };
    } catch (e) {
      return { error: String(e) };
    }
  });

  // Save / load network (JSON) handlers
  ipcMain.handle('network:save', async (evt, { defaultPath, data }) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const res = await dialog.showSaveDialog(win, { defaultPath: defaultPath || 'network.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (res.canceled || !res.filePath) return { canceled: true };
    try {
      fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2), 'utf8');
      return { ok: true, path: res.filePath };
    } catch (e) { return { error: String(e) }; }
  });

  ipcMain.handle('network:load', async (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return { canceled: true };
    try {
      const content = fs.readFileSync(res.filePaths[0], 'utf8');
      return { ok: true, path: res.filePaths[0], data: JSON.parse(content) };
    } catch (e) { return { error: String(e) }; }
  });

  // Examples: list and load from block-bash/examples if available
  ipcMain.handle('examples:list', async () => {
    try {
      const examplesDir = path.join(__dirname, 'block-bash', 'blockbash', 'examples');
      const files = fs.readdirSync(examplesDir);
      // return only json files for now
      return files.filter(f=>f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.tlds'));
    } catch (e) { return { error: String(e) }; }
  });

  ipcMain.handle('examples:load', async (evt, name) => {
    try {
      const examplesDir = path.join(__dirname, 'block-bash', 'blockbash', 'examples');
      const filePath = path.join(examplesDir, name);
      if (!fs.existsSync(filePath)) return { error: 'Not found' };
      const data = fs.readFileSync(filePath);
      if (name.toLowerCase().endsWith('.json')) {
        return { ok: true, data: JSON.parse(data.toString()), path: filePath };
      }
      // For .tlds (zip) return raw buffer as not supported for direct import
      return { error: 'Unsupported example format for direct import: ' + name };
    } catch (e) { return { error: String(e) }; }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
