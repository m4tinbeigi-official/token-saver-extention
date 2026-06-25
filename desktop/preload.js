'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Secure, minimal API surface exposed to the renderer.
contextBridge.exposeInMainWorld('tokensaver', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  scanProject: (projectPath) => ipcRenderer.invoke('scan-project', projectPath),
  previewConfig: (projectPath, answers) =>
    ipcRenderer.invoke('preview-config', { projectPath, answers }),
  applyConfig: (projectPath, files) =>
    ipcRenderer.invoke('apply-config', { projectPath, files }),
  openExternal: (target) => ipcRenderer.invoke('open-external', target)
});
