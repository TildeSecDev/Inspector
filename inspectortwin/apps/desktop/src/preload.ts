import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project operations
  project: {
    create: (data: any) => ipcRenderer.invoke('project:create', data),
    getAll: () => ipcRenderer.invoke('project:getAll'),
    getById: (id: string) => ipcRenderer.invoke('project:getById', id),
    update: (id: string, data: any) => ipcRenderer.invoke('project:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
  },

  // Topology operations
  topology: {
    create: (data: any) => ipcRenderer.invoke('topology:create', data),
    getByProjectId: (projectId: string) => ipcRenderer.invoke('topology:getByProjectId', projectId),
    getById: (id: string) => ipcRenderer.invoke('topology:getById', id),
    update: (id: string, data: any) => ipcRenderer.invoke('topology:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('topology:delete', id),
  },

  // Scenario operations
  scenario: {
    create: (data: any) => ipcRenderer.invoke('scenario:create', data),
    getByProjectId: (projectId: string) => ipcRenderer.invoke('scenario:getByProjectId', projectId),
    getById: (id: string) => ipcRenderer.invoke('scenario:getById', id),
    delete: (id: string) => ipcRenderer.invoke('scenario:delete', id),
  },

  // Simulation operations
  simulation: {
    run: (graph: any, scenario: any, options: any) => 
      ipcRenderer.invoke('simulation:run', graph, scenario, options),
    getRuns: (scenarioId: string) => ipcRenderer.invoke('simulation:getRuns', scenarioId),
    getRunById: (runId: string) => ipcRenderer.invoke('simulation:getRunById', runId),
  },

  // Findings operations
  findings: {
    getByRunId: (runId: string) => ipcRenderer.invoke('findings:getByRunId', runId),
  },

  // Report operations
  report: {
    generate: (reportData: any, options: any) => 
      ipcRenderer.invoke('report:generate', reportData, options),
    getByRunId: (runId: string) => ipcRenderer.invoke('report:getByRunId', runId),
  },

  // Lab runtime operations
  lab: {
    start: (config: any) => ipcRenderer.invoke('lab:start', config),
    stop: () => ipcRenderer.invoke('lab:stop'),
    getStatus: () => ipcRenderer.invoke('lab:getStatus'),
  },

  // Settings operations
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  },
});

console.log('Preload script loaded with context isolation');
