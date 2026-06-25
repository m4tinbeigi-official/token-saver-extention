'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const https = require('https');

const { scanProject, generatePlan } = require('./config-engine');
const { TOOLS, getTool, platformKey } = require('./tools-registry');

// Where user info is (best-effort) submitted. Failure is non-fatal by design.
const SERVER_ENDPOINT = 'https://tokensaver.ir/api/leads';

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

/* ---------- IPC: list available tools ---------- */
ipcMain.handle('list-tools', async () => {
  return { tools: TOOLS, platform: platformKey(process.platform) };
});

/* ---------- IPC: install a tool (runs its installer, streams output) ---------- */
ipcMain.handle('install-tool', async (event, { toolId, projectPath }) => {
  const tool = getTool(toolId);
  if (!tool) return { ok: false, error: 'ابزار یافت نشد.' };

  const spec = tool.install[platformKey(process.platform)];
  if (!spec) return { ok: false, error: 'این ابزار برای سیستم‌عامل شما تعریف نشده.' };
  if (spec.type === 'manual') {
    return { ok: false, manual: true, cmd: spec.cmd, note: spec.note || '' };
  }

  const wc = event.sender;
  const send = (chunk) => { try { wc.send('install-output', { toolId, chunk }); } catch (_e) {} };

  send('$ ' + spec.cmd + '\n\n');

  return await new Promise((resolve) => {
    let child;
    try {
      // bash -lc runs the curl|bash pipeline. On Windows this needs WSL/Git Bash on PATH.
      child = spawn('bash', ['-lc', spec.cmd], {
        cwd: projectPath && fs.existsSync(projectPath) ? projectPath : process.cwd()
      });
    } catch (err) {
      send('\n[خطا در اجرای shell] ' + String(err.message || err));
      resolve({ ok: false, error: String(err.message || err), needsShell: true });
      return;
    }

    child.on('error', (err) => {
      const msg = err && err.code === 'ENOENT'
        ? 'bash پیدا نشد. روی ویندوز WSL یا Git Bash نصب کن و دوباره امتحان کن.'
        : String(err.message || err);
      send('\n[خطا] ' + msg + '\n');
      resolve({ ok: false, error: msg, needsShell: err && err.code === 'ENOENT', cmd: spec.cmd });
    });

    child.stdout.on('data', (d) => send(d.toString()));
    child.stderr.on('data', (d) => send(d.toString()));
    child.on('close', (code) => {
      send('\n\n' + (code === 0 ? '✓ نصب با موفقیت تمام شد.' : '✗ نصب با کد ' + code + ' پایان یافت.') + '\n');
      resolve({ ok: code === 0, code, afterInstall: tool.afterInstall });
    });
  });
});

/* ---------- IPC: submit user info to server (best-effort, never throws) ---------- */
ipcMain.handle('submit-info', async (_e, data) => {
  return await new Promise((resolve) => {
    let finished = false;
    const done = (result) => { if (!finished) { finished = true; resolve(result); } };
    try {
      const payload = JSON.stringify(data || {});
      const url = new URL(SERVER_ENDPOINT);
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 5000
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => done({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
        }
      );
      req.on('error', () => done({ ok: false, offline: true }));
      req.on('timeout', () => { req.destroy(); done({ ok: false, offline: true }); });
      req.write(payload);
      req.end();
    } catch (_err) {
      done({ ok: false, offline: true });
    }
  });
});
