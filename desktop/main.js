'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const https = require('https');
const http = require('http');
const { autoUpdater } = require('electron-updater');

const { scanProject, generatePlan, detectAgents, estimateImpact } = require('./config-engine');
const { TOOLS, getTool, platformKey } = require('./tools-registry');

let currentInstall = null; // tracks a running installer child process

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
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
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
  // In-app auto-update from GitHub Releases (packaged builds only).
  // Note: works on Windows; macOS auto-update needs a signed app.
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    try { autoUpdater.checkForUpdatesAndNotify(); } catch (_e) {}
  }
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

/* ---------- IPC: detect installed agents ---------- */
ipcMain.handle('detect-agents', async () => {
  try { return { ok: true, agents: detectAgents(os.homedir(), fs, path) }; }
  catch (err) { return { ok: false, error: String(err && err.message || err), agents: [] }; }
});

/* ---------- IPC: estimate context-noise tokens ---------- */
ipcMain.handle('estimate-impact', async (_e, { projectPath, noisy }) => {
  try {
    const info = scanProject(projectPath, fs, path);
    const est = estimateImpact(projectPath, noisy || [], info.stacks, fs, path);
    return { ok: true, est };
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

/* ---------- merge strategies (avoid clobbering user content) ---------- */
const TS_START = '<!-- TOKENSAVER:START (managed block — ویرایش نکن) -->';
const TS_END = '<!-- TOKENSAVER:END -->';

function mergeMarkdown(existing, incoming) {
  const block = TS_START + '\n' + incoming.trim() + '\n' + TS_END + '\n';
  if (existing.includes(TS_START) && existing.includes(TS_END)) {
    return existing.replace(new RegExp(TS_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + TS_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), block.trim());
  }
  return existing.trimEnd() + '\n\n' + block;
}

function mergeLines(existing, incoming) {
  const seen = new Set(existing.split(/\r?\n/).map((l) => l.trim()));
  const additions = incoming.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#') && !seen.has(l.trim()));
  if (!additions.length) return existing;
  return existing.trimEnd() + '\n' + additions.join('\n') + '\n';
}

/* ---------- IPC: apply the plan (writes files) ---------- */
ipcMain.handle('apply-config', async (_e, { projectPath, files }) => {
  const written = [];
  const merged = [];
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
      const exists = fs.existsSync(target);
      const strategy = file.merge || 'overwrite';

      if (exists && (strategy === 'markdown' || strategy === 'lines')) {
        // Merge into existing content without destroying the user's own text
        const existing = fs.readFileSync(target, 'utf-8');
        const result = strategy === 'markdown'
          ? mergeMarkdown(existing, file.content)
          : mergeLines(existing, file.content);
        if (result !== existing) {
          const backup = target + '.tokensaver.bak';
          if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
          fs.writeFileSync(target, result, 'utf-8');
        }
        merged.push(file.path);
      } else {
        // New file, or overwrite strategy (json/config): back up then write
        if (exists) {
          const backup = target + '.tokensaver.bak';
          if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
        }
        fs.writeFileSync(target, file.content, 'utf-8');
        written.push(file.path);
      }
    }
    return { ok: true, written, merged, skipped };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), written, merged, skipped };
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

/* ---------- IPC: app version ---------- */
ipcMain.handle('app-version', async () => app.getVersion());

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

    currentInstall = child;
    child.stdout.on('data', (d) => send(d.toString()));
    child.stderr.on('data', (d) => send(d.toString()));
    child.on('close', (code) => {
      currentInstall = null;
      send('\n\n' + (code === 0 ? '✓ نصب با موفقیت تمام شد.' : '✗ نصب با کد ' + code + ' پایان یافت.') + '\n');
      resolve({ ok: code === 0, code, afterInstall: tool.afterInstall });
    });
  });
});

/* ---------- IPC: cancel a running installation ---------- */
ipcMain.handle('cancel-install', async () => {
  if (currentInstall) {
    try { currentInstall.kill('SIGTERM'); } catch (_e) {}
    currentInstall = null;
    return { ok: true };
  }
  return { ok: false, error: 'نصبی در حال اجرا نیست.' };
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

/* ---------- HTTP Local Proxy Server for Token Monitoring ---------- */
let proxyServer = null;
let currentSavedPercent = 80;

function stopLocalProxy() {
  if (proxyServer) {
    try { proxyServer.close(); } catch(_e) {}
    proxyServer = null;
  }
}

ipcMain.handle('start-proxy', async (event, savedPercent) => {
  if (proxyServer) stopLocalProxy();
  
  currentSavedPercent = Number(savedPercent) || 80;
  const port = 9999;
  const wc = event.sender;
  
  try {
    proxyServer = http.createServer((req, reqRes) => {
      // Determine target API
      let targetHost = 'api.openai.com';
      let targetPath = req.url;
      
      const isAnthropic = req.headers['x-api-key'] || 
                          req.url.includes('anthropic') || 
                          req.url.startsWith('/v1/messages') || 
                          req.url.startsWith('/v1/complete');
                          
      if (isAnthropic) {
        targetHost = 'api.anthropic.com';
      }
      
      let reqBody = [];
      req.on('data', chunk => { reqBody.push(chunk); });
      req.on('end', () => {
        const bodyBuffer = Buffer.concat(reqBody);
        let modelName = 'Unknown Model';
        try {
          const bodyJson = JSON.parse(bodyBuffer.toString());
          modelName = bodyJson.model || modelName;
        } catch(e) {}
        
        // Copy headers and update host
        const headers = { ...req.headers };
        headers['host'] = targetHost;
        delete headers['connection'];
        delete headers['keep-alive'];
        
        const options = {
          hostname: targetHost,
          port: 443,
          path: targetPath,
          method: req.method,
          headers: headers,
          rejectUnauthorized: false
        };
        
        const proxyReq = https.request(options, (targetRes) => {
          reqRes.writeHead(targetRes.statusCode, targetRes.headers);
          
          let resBody = [];
          targetRes.on('data', chunk => {
            reqRes.write(chunk);
            resBody.push(chunk);
          });
          
          targetRes.on('end', () => {
            reqRes.end();
            
            const resBuffer = Buffer.concat(resBody);
            let inputTokens = 0;
            let outputTokens = 0;
            
            try {
              const resJson = JSON.parse(resBuffer.toString());
              if (resJson.usage) {
                inputTokens = resJson.usage.prompt_tokens || resJson.usage.input_tokens || 0;
                outputTokens = resJson.usage.completion_tokens || resJson.usage.output_tokens || 0;
              }
            } catch(e) {}
            
            // Heuristic fallback
            if (inputTokens === 0) {
              inputTokens = Math.round(bodyBuffer.length / 4);
              outputTokens = Math.round(resBuffer.length / 4);
            }
            
            // Calculate saved tokens
            const factor = currentSavedPercent / (100 - currentSavedPercent);
            const savedTokens = Math.round(inputTokens * (isFinite(factor) ? factor : 4));
            
            try {
              wc.send('proxy-output', {
                time: new Date().toLocaleTimeString('fa-IR'),
                model: modelName,
                endpoint: req.url,
                inputTokens,
                outputTokens,
                savedTokens
              });
            } catch(_e) {}
          });
        });
        
        proxyReq.on('error', (err) => {
          try {
            reqRes.writeHead(500);
            reqRes.end('Proxy Error: ' + err.message);
          } catch(_e) {}
        });
        
        proxyReq.write(bodyBuffer);
        proxyReq.end();
      });
    });
    
    proxyServer.listen(port, '127.0.0.1');
    return { ok: true, port };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('stop-proxy', async () => {
  stopLocalProxy();
  return { ok: true };
});

app.on('will-quit', () => {
  stopLocalProxy();
});

/* ---------- IPC: System Dependencies Diagnostics ---------- */
ipcMain.handle('check-dependencies', async () => {
  const results = {};
  
  const check = (cmd) => new Promise((resolve) => {
    exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ installed: false, version: null });
      } else {
        const out = (stdout.trim() || stderr.trim()).split('\n')[0];
        // Clean version string
        const clean = out.replace(/[^\d.]/g, '') || out;
        resolve({ installed: true, version: out });
      }
    });
  });
  
  results.git = await check('git --version');
  results.node = await check('node --version');
  
  // Try python3 first, then python
  results.python = await check('python3 --version');
  if (!results.python.installed) {
    results.python = await check('python --version');
  }
  
  // Bash check
  results.bash = await check('bash -c "echo ok"');
  if (results.bash.installed) {
    results.bash.version = 'OK';
  }
  
  return { ok: true, results };
});

/* ---------- IPC: Export Team Configuration ---------- */
ipcMain.handle('export-config', async (_e, { projectPath, config }) => {
  try {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return { ok: false, error: 'مسیر پروژه معتبر نیست.' };
    }
    
    const configPath = path.join(projectPath, '.tokensaver.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    const readmePath = path.join(projectPath, 'README-tokensaver.md');
    const readmeContent = `# بهینه‌سازی توکن با Token Saver 🚀\n\nاین پروژه مجهز به پیکربندی بهینه‌سازی مصرف توکن است.\n\n## نحوه استفاده:\n۱. نرم‌افزار **Token Saver** را باز کنید.\n۲. این پوشه را به عنوان پوشه پروژه انتخاب کنید.\n۳. نرم‌افزار به صورت خودکار فایل \`.tokensaver.json\` را شناسایی کرده و تنظیمات مربوطه را اعمال خواهد کرد.\n`;
    fs.writeFileSync(readmePath, readmeContent, 'utf-8');
    
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
