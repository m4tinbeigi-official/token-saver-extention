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
  appVersion: () => ipcRenderer.invoke('app-version'),

  // Proxy monitoring, system diagnostics, and config sharing
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  startProxy: (options) => ipcRenderer.invoke('start-proxy', options),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
  onProxyOutput: (cb) => ipcRenderer.on('proxy-output', (_e, data) => cb(data)),
  exportConfig: (projectPath, config) => ipcRenderer.invoke('export-config', { projectPath, config }),

  // Budget warning confirmation channels
  respondBudgetWarning: (id, approved) => ipcRenderer.invoke('respond-budget-warning', { id, approved }),
  onBudgetWarning: (cb) => ipcRenderer.on('budget-warning', (_e, data) => cb(data)),
  updateBudgetConfig: (config) => ipcRenderer.invoke('update-budget-config', config),

  // Zarinpal payment & server-side license verification
  requestPayment: (token) => ipcRenderer.invoke('request-payment', { token }),
  verifyLicense: (licenseKey) => ipcRenderer.invoke('verify-license', licenseKey),
  fetchServerConfig: () => ipcRenderer.invoke('fetch-server-config'),

  // SMS OTP Auth & sync
  sendOtp: (phoneNumber) => ipcRenderer.invoke('send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber, code, name, email) => ipcRenderer.invoke('verify-otp', { phoneNumber, code, name, email }),
  checkAuthStatus: (token) => ipcRenderer.invoke('check-auth-status', token),
  syncProject: (token, projectPath, name, savedTokens, savedPercent) =>
    ipcRenderer.invoke('sync-project', { token, projectPath, name, savedTokens, savedPercent })
});
