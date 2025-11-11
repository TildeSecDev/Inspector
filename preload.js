const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: async () => {
    return await ipcRenderer.invoke('dialog:openFile');
  },
  saveFile: async (opts) => {
    return await ipcRenderer.invoke('file:save', opts);
  },
  onFileOpened: (cb) => {
    ipcRenderer.on('file-opened', (evt, data) => cb(data));
  },
  platform: process.platform,
  saveNetwork: async (payload) => await ipcRenderer.invoke('network:save', payload),
  loadNetwork: async () => await ipcRenderer.invoke('network:load'),
  onNetworkLoaded: (cb) => { ipcRenderer.on('network-loaded', (evt, data) => cb(data)); }
});

contextBridge.exposeInMainWorld('examplesAPI', {
  list: async () => await ipcRenderer.invoke('examples:list'),
  load: async (name) => await ipcRenderer.invoke('examples:load', name)
});

// listen for simple navigation / simulate commands from tray/menu
ipcRenderer.on('navigate', (evt, where) => {
  window.postMessage({ type:'navigate', where }, '*');
});
ipcRenderer.on('simulate', () => { window.postMessage({ type:'simulate' }, '*'); });
