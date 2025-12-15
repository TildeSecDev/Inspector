import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Store from 'electron-store';
import { ProjectStore } from '@inspectortwin/project-store';
import { SimulationEngine } from '@inspectortwin/core-sim';
import { ReportGenerator } from '@inspectortwin/report-kit';
import { LabRuntime } from '@inspectortwin/lab-runtime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize electron-store for app settings
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let projectStore: ProjectStore | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Security: Set CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;",
        ],
      },
    });
  });

  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, '../renderer/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize project store
  const dbPath = join(app.getPath('userData'), 'inspectortwin.db');
  projectStore = new ProjectStore(dbPath);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (projectStore) {
    projectStore.close();
  }
});

// IPC Handlers

// Project operations
ipcMain.handle('project:create', async (_, data) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.projects.create(data);
});

ipcMain.handle('project:getAll', async () => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.projects.findAll();
});

ipcMain.handle('project:getById', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.projects.findById(id);
});

ipcMain.handle('project:update', async (_, id, data) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.projects.update(id, data);
});

ipcMain.handle('project:delete', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  projectStore.projects.delete(id);
});

// Topology operations
ipcMain.handle('topology:create', async (_, data) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.topologies.create(data);
});

ipcMain.handle('topology:getByProjectId', async (_, projectId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.topologies.findByProjectId(projectId);
});

ipcMain.handle('topology:getById', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.topologies.findById(id);
});

ipcMain.handle('topology:update', async (_, id, data) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.topologies.update(id, data);
});

ipcMain.handle('topology:delete', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  projectStore.topologies.delete(id);
});

// Scenario operations
ipcMain.handle('scenario:create', async (_, data) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.scenarios.create(data);
});

ipcMain.handle('scenario:getByProjectId', async (_, projectId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.scenarios.findByProjectId(projectId);
});

ipcMain.handle('scenario:getById', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.scenarios.findById(id);
});

ipcMain.handle('scenario:delete', async (_, id) => {
  if (!projectStore) throw new Error('Project store not initialized');
  projectStore.scenarios.delete(id);
});

// Simulation operations
ipcMain.handle('simulation:run', async (_, graph, scenario, options) => {
  const engine = new SimulationEngine();
  const result = await engine.simulate(graph, scenario, options);
  
  // Save run result
  if (!projectStore) throw new Error('Project store not initialized');
  const savedRun = projectStore.runs.create(result);

  // Save findings
  for (const finding of result.findings) {
    projectStore.findings.create({ ...finding, runId: savedRun.id });
  }

  return savedRun;
});

ipcMain.handle('simulation:getRuns', async (_, scenarioId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.runs.findByScenarioId(scenarioId);
});

ipcMain.handle('simulation:getRunById', async (_, runId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.runs.findById(runId);
});

// Findings operations
ipcMain.handle('findings:getByRunId', async (_, runId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.findings.findByRunId(runId);
});

// Report operations
ipcMain.handle('report:generate', async (_, reportData, options) => {
  const generator = new ReportGenerator();
  const outputPath = join(app.getPath('documents'), 'InspectorTwin', options.outputPath);
  
  const path = await generator.generateReport(reportData, {
    ...options,
    outputPath,
  });

  // Save report metadata
  if (!projectStore) throw new Error('Project store not initialized');
  projectStore.reports.create({
    runId: reportData.runResult.id,
    format: options.format,
    path,
  });

  return path;
});

ipcMain.handle('report:getByRunId', async (_, runId) => {
  if (!projectStore) throw new Error('Project store not initialized');
  return projectStore.reports.findByRunId(runId);
});

// Lab runtime operations (optional)
let labRuntime: LabRuntime | null = null;

ipcMain.handle('lab:start', async (_, config) => {
  // Validate config for safety
  const validation = LabRuntime.validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Lab config validation failed: ${validation.errors.join(', ')}`);
  }

  if (!labRuntime) {
    labRuntime = new LabRuntime();
  }

  await labRuntime.startLab(config);
  return { success: true };
});

ipcMain.handle('lab:stop', async () => {
  if (labRuntime) {
    await labRuntime.stopLab();
    labRuntime = null;
  }
  return { success: true };
});

ipcMain.handle('lab:getStatus', async () => {
  if (!labRuntime) {
    return { running: false, services: [] };
  }
  return labRuntime.getStatus();
});

// Settings operations
ipcMain.handle('settings:get', async (_, key) => {
  return store.get(key);
});

ipcMain.handle('settings:set', async (_, key, value) => {
  store.set(key, value);
});

console.log('Inspector Twin desktop app initialized');
