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
  openExternal: (target) => ipcRenderer.invoke('open-external', target),

  // Detection + impact
  detectAgents: () => ipcRenderer.invoke('detect-agents'),
  estimateImpact: (projectPath, noisy) =>
    ipcRenderer.invoke('estimate-impact', { projectPath, noisy }),

  // Tools registry + installer
  listTools: () => ipcRenderer.invoke('list-tools'),
  installTool: (toolId, projectPath) =>
    ipcRenderer.invoke('install-tool', { toolId, projectPath }),
  cancelInstall: () => ipcRenderer.invoke('cancel-install'),
  onInstallOutput: (cb) =>
    ipcRenderer.on('install-output', (_e, data) => cb(data.toolId, data.chunk)),

  // Best-effort lead submission
  submitInfo: (data) => ipcRenderer.invoke('submit-info', data),

  // App version
  appVersion: () => ipcRenderer.invoke('app-version')
});
