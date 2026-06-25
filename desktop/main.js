'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { scanProject, generatePlan } = require('./config-engine');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: '#050508',
    title: 'Token Saver',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ---------- IPC: choose a project folder ---------- */
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'پوشه پروژه خود را انتخاب کنید',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

/* ---------- IPC: scan a project folder (read-only) ---------- */
ipcMain.handle('scan-project', async (_e, projectPath) => {
  try {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return { ok: false, error: 'مسیر پروژه معتبر نیست.' };
    }
    const info = scanProject(projectPath, fs, path);
    return { ok: true, info };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

/* ---------- IPC: preview the plan (NO writes) ---------- */
ipcMain.handle('preview-config', async (_e, { projectPath, answers }) => {
  try {
    const info = scanProject(projectPath, fs, path);
    const plan = generatePlan(answers, info);
    return { ok: true, plan };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

/* ---------- IPC: apply the plan (writes files) ---------- */
ipcMain.handle('apply-config', async (_e, { projectPath, files }) => {
  const written = [];
  const skipped = [];
  try {
    for (const file of files) {
      const target = path.join(projectPath, file.path);
      // Safety: never escape the project directory
      const rel = path.relative(projectPath, target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        skipped.push({ path: file.path, reason: 'مسیر خارج از پروژه' });
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      // Do not overwrite existing files unless explicitly allowed
      if (fs.existsSync(target) && !file.overwrite) {
        const backup = target + '.tokensaver.bak';
        if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
      }
      fs.writeFileSync(target, file.content, 'utf-8');
      written.push(file.path);
    }
    return { ok: true, written, skipped };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), written, skipped };
  }
});

/* ---------- IPC: open a path / url externally ---------- */
ipcMain.handle('open-external', async (_e, target) => {
  if (/^https?:\/\//i.test(target)) {
    await shell.openExternal(target);
  } else {
    shell.showItemInFolder(target);
  }
  return true;
});
