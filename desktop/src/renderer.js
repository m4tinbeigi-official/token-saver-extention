'use strict';

const api = window.tokensaver;

const state = {
  step: 0,
  projectPath: null,
  scan: null,
  plan: null,
  toolsLoaded: false,
  proxyActive: false,
  stats: { requests: 0, tokens: 0, saved: 0 }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------- Step navigation ---------- */
function setStep(step) {
  state.step = step;
  $$('.screen').forEach((s) => s.classList.toggle('active', Number(s.dataset.screen) === step));
  $$('#steps li').forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle('active', n === step);
    li.classList.toggle('done', n < step);
  });
  $('#back-btn').disabled = step === 0;
  updateNextButton();
}

function updateNextButton() {
  const next = $('#next-btn');
  if (state.step === 0) { next.disabled = !state.projectPath; next.textContent = 'بعدی'; }
  else if (state.step === 1) { next.disabled = false; next.textContent = 'ذخیره و ادامه'; }
  else if (state.step === 2) { next.disabled = false; next.textContent = 'برو به کانفیگ'; }
  else if (state.step === 3) { next.disabled = false; next.textContent = 'برو به مانیتور'; }
  else { next.disabled = true; next.textContent = 'پایان'; }
}

$('#back-btn').addEventListener('click', () => { if (state.step > 0) setStep(state.step - 1); });

$('#next-btn').addEventListener('click', async () => {
  if (state.step === 1) {
    await submitUserInfo();      // best-effort; failure is fine
    if (!state.toolsLoaded) await loadTools();
    setStep(2);
    return;
  }
  if (state.step === 2) {
    await buildPreview();
    setStep(3);
    return;
  }
  if (state.step === 3) {
    setStep(4);
    return;
  }
  if (state.step < 4) setStep(state.step + 1);
});

/* ---------- Step 0: pick + scan ---------- */
$('#pick-btn').addEventListener('click', async () => {
  const dir = await api.pickFolder();
  if (!dir) return;
  state.projectPath = dir;
  const res = await api.scanProject(dir);
  if (!res.ok) { alert(res.error); return; }
  state.scan = res.info;
  renderScan(res.info);
  
  // Auto-detect and display large assets warning
  checkLargeAssets(res.info);

  // Check if team config exists
  if (res.info.tokensaverConfig) {
    applyTeamConfig(res.info.tokensaverConfig);
  }
  
  // Add project to history list
  addOrUpdateProjectInHistory(dir);
  
  // Sync project stats to server
  syncProjectWithServer();
  
  updateNextButton();
});

function renderScan(info) {
  $('#scan-card').classList.remove('hidden');
  $('#scan-path').textContent = info.projectPath;
  $('#scan-stacks').textContent = info.stacks.join('، ');
  $('#scan-tests').textContent = info.testCommands.join('، ') || 'تشخیص داده نشد';
  $('#scan-build').textContent = info.buildCommands.join('، ') || 'تشخیص داده نشد';
  $('#scan-existing').textContent = info.existingAgentConfigs.join('، ') || 'هیچ';
}

/* ---------- Step 1: options + user info ---------- */
$$('.opts').forEach((group) => {
  const multi = group.dataset.multi === '1';
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.opt');
    if (!btn) return;
    if (multi) {
      btn.classList.toggle('selected');
    } else {
      group.querySelectorAll('.opt').forEach((o) => o.classList.remove('selected'));
      btn.classList.add('selected');
    }
  });
});

function collectAnswers() {
  const answers = {};
  $$('.opts').forEach((group) => {
    const name = group.dataset.name;
    const multi = group.dataset.multi === '1';
    const vals = Array.from(group.querySelectorAll('.opt.selected')).map((o) => o.dataset.val);
    answers[name] = multi ? vals : (vals[0] || null);
  });
  return answers;
}

async function submitUserInfo() {
  const note = $('#submit-note');
  const consent = $('#consent') && $('#consent').checked;
  if (!consent) {
    // Privacy: never send anything without explicit opt-in.
    note.textContent = 'اطلاعات ارسال نشد (رضایت داده نشده) — ادامه می‌دهیم.';
    return;
  }
  const data = {
    name: $('#user-name').value.trim(),
    email: $('#user-email').value.trim(),
    project: state.scan ? state.scan.name : null,
    stacks: state.scan ? state.scan.stacks : [],
    answers: collectAnswers(),
    consent: true,
    at: new Date().toISOString()
  };
  note.textContent = 'در حال ذخیره…';
  let res;
  try { res = await api.submitInfo(data); } catch (_e) { res = { ok: false, offline: true }; }
  note.textContent = res && res.ok
    ? 'اطلاعات ذخیره شد ✓'
    : 'ذخیره روی سرور انجام نشد (مهم نیست؛ ادامه می‌دهیم).';
}

// Detect installed agents and pre-select them with a badge
async function applyAgentDetection() {
  let res;
  try { res = await api.detectAgents(); } catch (_e) { return; }
  if (!res || !res.ok || !res.agents.length) return;
  const group = document.querySelector('.opts[data-name="agents"]');
  if (!group) return;
  res.agents.forEach((id) => {
    const btn = group.querySelector('.opt[data-val="' + cssEscape(id) + '"]');
    if (btn) { btn.classList.add('selected', 'detected'); btn.title = 'روی سیستم تشخیص داده شد'; }
  });
}

/* ---------- Step 2: tools ---------- */
async function loadTools() {
  runDiagnostics(); // Run dependencies checker
  
  // Try loading tools from server first, fallback to local registry
  let tools = [];
  let platform = 'mac';
  try {
    const srv = await api.fetchServerConfig();
    if (srv && srv.ok && srv.tools) {
      tools = srv.tools;
      const local = await api.listTools();
      platform = local.platform;
    } else {
      const local = await api.listTools();
      tools = local.tools;
      platform = local.platform;
    }
  } catch (e) {
    const local = await api.listTools();
    tools = local.tools;
    platform = local.platform;
  }
  
  state.availableTools = tools;
  state.platform = platform;
  const list = $('#tools-list');
  list.innerHTML = '';
  const tpl = $('#tool-card-tpl');

  // Verify license key saved in localStorage
  const savedKey = localStorage.getItem('tokensaver_license');
  if (savedKey && !state.licenseVerified) {
    try {
      const res = await api.verifyLicense(savedKey);
      if (res && res.ok && res.active) {
        state.license = res;
        state.licenseVerified = true;
        
        $('#license-status-msg').style.color = '#10b981';
        $('#license-status-msg').textContent = `نسخه پرو فعال است (مالک: ${res.owner})`;
        $('#license-key-input').value = savedKey;
        $('#license-key-input').disabled = true;
        $('#license-verify-btn').disabled = true;
        $('#license-buy-btn').style.display = 'none';
      }
    } catch(e) {}
  }

  // Set up category filters click handlers
  const filterBtns = document.querySelectorAll('.category-filters .filter-btn');
  filterBtns.forEach(btn => {
    if (!btn.dataset.listenerSet) {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'none';
          b.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          b.style.color = '#94a3b8';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(59,130,246,0.1)';
        btn.style.borderColor = '#3b82f6';
        btn.style.color = '#3b82f6';
        
        renderTools(btn.dataset.category);
      });
      btn.dataset.listenerSet = 'true';
    }
  });

  // Render function helper
  function renderTools(categoryFilter = 'all') {
    list.innerHTML = '';
    
    // Filter tools based on selected category
    const filteredTools = categoryFilter === 'all'
      ? tools
      : tools.filter(t => t.category === categoryFilter);
      
    if (filteredTools.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--muted); grid-column: 1 / -1; font-size: 0.9rem;">هیچ ابزاری در این دسته‌بندی یافت نشد.</div>';
      return;
    }

    filteredTools.forEach((tool) => {
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector('.tool-card');
      card.dataset.id = tool.id;
      node.querySelector('.tool-name').textContent = tool.name;
      node.querySelector('.tool-tagline').textContent = tool.tagline;
      if (tool.recommended) node.querySelector('.tool-badge').classList.remove('hidden');
      node.querySelector('.tool-desc').textContent = tool.description;
      node.querySelector('.tool-how').innerHTML = '<b>چطور کار می‌کند:</b> ' + escapeHtml(tool.howItWorks);
      node.querySelector('.tool-claims').innerHTML = tool.claims.map((c) => '<li>' + escapeHtml(c) + '</li>').join('');
      node.querySelector('.tool-notes').innerHTML = tool.notes.map((c) => '<li>' + escapeHtml(c) + '</li>').join('');
      node.querySelector('.tool-after').innerHTML = '<b>بعد از نصب:</b> ' + escapeHtml(tool.afterInstall);

      const uiUrlDiv = node.querySelector('.tool-ui-url');
      if (uiUrlDiv) {
        if (tool.uiUrl) {
          uiUrlDiv.innerHTML = `رابط کاربری ابزار: <a href="#" class="tool-ui-link" style="color: #60a5fa; text-decoration: underline; font-weight: bold;">${escapeHtml(tool.uiUrl)}</a>`;
          uiUrlDiv.querySelector('.tool-ui-link').addEventListener('click', (e) => {
            e.preventDefault();
            api.openExternal(tool.uiUrl);
          });
          uiUrlDiv.classList.remove('hidden');
        } else {
          uiUrlDiv.classList.add('hidden');
        }
      }

      const spec = tool.install[platform];
      const cmd = spec ? spec.cmd : '';
      const log = node.querySelector('.tool-log');

      node.querySelector('.tool-repo').addEventListener('click', () => api.openExternal(tool.repo));
      
      const installBtn = node.querySelector('.tool-install');
      const copyBtn = node.querySelector('.tool-copy');
      const cancelBtn = node.querySelector('.tool-cancel');
      const secnote = node.querySelector('.tool-secnote');

      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(cmd);
        note(card, 'دستور کپی شد.');
      });

      const hasPurchasedTool = state.user && state.user.purchasedTools && state.user.purchasedTools.includes(tool.id);
      const isLocked = tool.locked && !(state.license && state.license.active) && !hasPurchasedTool;

      if (isLocked) {
        card.classList.add('locked');
        const badge = node.querySelector('.tool-badge');
        badge.textContent = 'پرو (قفل شده)';
        badge.style.borderColor = '#f59e0b';
        badge.style.color = '#f59e0b';
        badge.style.background = 'rgba(245, 158, 11, 0.1)';
        badge.classList.remove('hidden');

        const priceText = (tool.price || 50000).toLocaleString('fa-IR');
        installBtn.textContent = `خرید ابزار (${priceText} تومان)`;
        installBtn.classList.remove('btn-primary');
        installBtn.classList.add('btn-pro');
        
        installBtn.addEventListener('click', async () => {
          const token = localStorage.getItem('tokensaver_user_token');
          if (!token) {
            alert('ابتدا باید وارد حساب خود شوید.');
            return;
          }
          
          installBtn.disabled = true;
          installBtn.textContent = 'اتصال به درگاه…';
          const res = await api.requestPaymentTool(token, tool.id);
          installBtn.disabled = false;
          installBtn.textContent = `خرید ابزار (${priceText} تومان)`;
          
          if (res && res.ok && res.paymentUrl) {
            api.openExternal(res.paymentUrl);
            const msg = $('#license-status-msg');
            msg.style.color = '#c084fc';
            msg.textContent = `درگاه پرداخت برای ابزار ${tool.name} باز شد. پس از پرداخت موفق، قفل ابزار باز خواهد شد.`;
          } else {
            alert('خطا در اتصال به درگاه پرداخت ابزار: ' + ((res && res.error) || 'نامشخص'));
          }
        });

        copyBtn.disabled = true;
        if (secnote) secnote.classList.add('hidden');
      } else {
        const proj = getProjectFromHistory(state.projectPath);
        const isInstalled = proj && proj.tools && proj.tools.includes(tool.id);
        if (isInstalled) {
          installBtn.textContent = 'نصب شد ✓';
        }

        cancelBtn.addEventListener('click', async () => {
          await api.cancelInstall();
          log.textContent += '\n[لغو شد توسط کاربر]\n';
        });

        installBtn.addEventListener('click', async () => {
          if (!state.projectPath) { note(card, 'اول پروژه را انتخاب کن.'); return; }
          log.classList.remove('hidden');
          log.textContent = '';
          installBtn.disabled = true;
          installBtn.textContent = 'در حال نصب…';
          cancelBtn.classList.remove('hidden');

          const token = localStorage.getItem('tokensaver_user_token');
          if (!token) {
            alert('برای نصب ابزارها ابتدا باید وارد حساب کاربری خود شوید.');
            installBtn.disabled = false;
            installBtn.textContent = 'نصب خودکار';
            cancelBtn.classList.add('hidden');
            return;
          }

          const useRes = await api.useTool(token, tool.id, state.projectPath);
          if (!useRes || !useRes.ok) {
            alert('خطا در تخصیص ابزار: ' + ((useRes && useRes.error) || 'عدم دسترسی یا رسیدن به سقف مجاز استفاده روی پروژه‌ها.'));
            installBtn.disabled = false;
            installBtn.textContent = 'نصب خودکار';
            cancelBtn.classList.add('hidden');
            return;
          }

          const res = await api.installTool(tool.id, state.projectPath);
          installBtn.disabled = false;
          cancelBtn.classList.add('hidden');
          if (res && res.manual) {
            log.textContent += '\nاین ابزار روی سیستم تو نیاز به اجرای دستی دارد:\n' + res.cmd + '\n' + (res.note || '');
            installBtn.textContent = 'نصب دستی لازم است';
          } else if (res && res.ok) {
            installBtn.textContent = 'نصب شد ✓';
            
            const projCurrent = getProjectFromHistory(state.projectPath);
            const toolsList = projCurrent ? (projCurrent.tools || []) : [];
            if (!toolsList.includes(tool.id)) {
              toolsList.push(tool.id);
            }
            addOrUpdateProjectInHistory(state.projectPath, { tools: toolsList });
          } else {
            installBtn.textContent = 'نصب ناموفق — تلاش دوباره';
            if (res && res.needsShell) {
              log.textContent += '\nراهنما: روی ویندوز WSL یا Git Bash نصب کن، یا دستور را آنجا اجرا کن.';
            }
          }
        });
      }

      list.appendChild(node);
    });
  }

  // Render initial all category
  renderTools('all');

  // Stream installer output into the matching tool's log box
  api.onInstallOutput((toolId, chunk) => {
    const card = document.querySelector('.tool-card[data-id="' + cssEscape(toolId) + '"]');
    if (!card) return;
    const log = card.querySelector('.tool-log');
    log.classList.remove('hidden');
    log.textContent += chunk;
    log.scrollTop = log.scrollHeight;
  });

  state.toolsLoaded = true;
}

function note(card, msg) {
  let n = card.querySelector('.card-note');
  if (!n) { n = document.createElement('div'); n.className = 'card-note'; card.querySelector('.tool-actions').after(n); }
  n.textContent = msg;
  setTimeout(() => { if (n) n.textContent = ''; }, 2500);
}

/* ---------- Step 3: config preview + apply ---------- */
async function buildPreview() {
  const answers = collectAnswers();
  const res = await api.previewConfig(state.projectPath, answers);
  if (!res.ok) { alert(res.error); return; }
  state.plan = res.plan;
  renderPreview(res.plan);
  renderImpact(answers.noisy || []);
}

async function renderImpact(noisy) {
  const panel = $('#impact-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = 'در حال برآورد نویز context…';
  let res;
  try { res = await api.estimateImpact(state.projectPath, noisy); } catch (_e) { res = null; }
  if (!res || !res.ok) { panel.classList.add('hidden'); return; }
  const e = res.est;
  state.lastEstimate = e; // Save estimate to state
  const fmt = (n) => n.toLocaleString('en-US');
  panel.innerHTML =
    '<div class="impact-big">~' + fmt(e.noiseTokens) + (e.truncated ? '+' : '') + ' توکن نویز</div>' +
    '<div class="impact-sub">از حدود ' + fmt(e.totalTokens) + ' توکن کل پروژه (' + e.pct + '٪) که با این کانفیگ از context کنار گذاشته می‌شود. ' +
    'برآورد تقریبی روی ' + fmt(e.files) + ' فایل' + (e.truncated ? ' (نمونه‌برداری‌شده)' : '') + '.</div>';
}

function renderPreview(plan) {
  const list = $('#file-list');
  list.innerHTML = '';
  plan.files.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = 'file-item' + (i === 0 ? ' active' : '');
    el.textContent = f.path;
    el.addEventListener('click', () => {
      $$('.file-item').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      $('#file-view').textContent = f.content;
    });
    list.appendChild(el);
  });
  $('#file-view').textContent = plan.files.length ? plan.files[0].content : 'فایلی تولید نشد.';

  const reco = $('#reco');
  reco.innerHTML = plan.recommendations.length
    ? '<b>پیشنهادها:</b><ul>' + plan.recommendations.map((r) => '<li>' + escapeHtml(r) + '</li>').join('') + '</ul>'
    : '';
}

$('#apply-btn').addEventListener('click', async () => {
  if (!state.plan) { alert('اول پیش‌نمایش را بساز.'); return; }
  const res = await api.applyConfig(state.projectPath, state.plan.files);
  const box = $('#result');
  box.classList.remove('hidden');
  if (res.ok) {
    box.classList.add('ok');
    const merged = res.merged || [];
    box.innerHTML = '<h3>انجام شد ✓ (' + res.written.length + ' فایل جدید، ' + merged.length + ' ادغام)</h3>' +
      res.written.map((f) => '<div class="f">+ ' + escapeHtml(f) + '</div>').join('') +
      merged.map((f) => '<div class="f" style="color:#c084fc">~ ' + escapeHtml(f) + ' (ادغام شد)</div>').join('');

    // Enable team config export
    $('#export-team-btn').disabled = false;

    // Update project history with config savings
    let savedTokens = 0;
    let savedPercent = 0;
    if (state.lastEstimate) {
      savedTokens = state.lastEstimate.noiseTokens;
      savedPercent = state.lastEstimate.pct;
    }
    addOrUpdateProjectInHistory(state.projectPath, {
      configApplied: true,
      savedTokens,
      savedPercent
    });
    
    // Sync project stats to server
    syncProjectWithServer();
  } else {
    box.innerHTML = '<h3>خطا</h3><p class="muted">' + escapeHtml(res.error || 'نامشخص') + '</p>';
  }
});

/* ---------- utils ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cssEscape(s) { return String(s).replace(/"/g, '\\"'); }

// Show the real app version in the sidebar
api.appVersion().then((v) => {
  const el = $('#app-version');
  if (el && v) el.textContent = 'نسخه ' + v + ' • برای ویندوز و مک';
}).catch(() => {});

/* ---------- Project History Logic ---------- */
function addOrUpdateProjectInHistory(projectPath, updateData = {}) {
  let projects = [];
  try {
    projects = JSON.parse(localStorage.getItem('tokensaver_projects') || '[]');
  } catch (e) {
    projects = [];
  }
  
  let p = projects.find(item => item.path === projectPath);
  if (!p) {
    const folderName = projectPath.split(/[/\\]/).pop() || projectPath;
    p = {
      path: projectPath,
      name: folderName,
      tools: [],
      configApplied: false,
      savedTokens: 0,
      savedPercent: 0,
      addedAt: new Date().toISOString()
    };
    projects.push(p);
  }
  
  Object.assign(p, updateData);
  localStorage.setItem('tokensaver_projects', JSON.stringify(projects));
  renderProjectHistory();
}

function getProjectFromHistory(projectPath) {
  if (!projectPath) return null;
  try {
    const projects = JSON.parse(localStorage.getItem('tokensaver_projects') || '[]');
    return projects.find(p => p.path === projectPath) || null;
  } catch (e) {
    return null;
  }
}

function renderProjectHistory() {
  const list = $('#history-list');
  const section = $('#history-section');
  if (!list || !section) return;

  let projects = [];
  try {
    projects = JSON.parse(localStorage.getItem('tokensaver_projects') || '[]');
  } catch (e) {
    projects = [];
  }

  if (projects.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  projects.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    let methodsHtml = '';
    if (p.configApplied) {
      methodsHtml += `<span class="badge badge-config">کانفیگ پروژه</span>`;
    }
    if (p.tools && p.tools.length > 0) {
      p.tools.forEach((tId) => {
        const t = (state.availableTools || []).find(x => x.id === tId);
        const name = t ? t.name.split(' — ')[0] : tId;
        methodsHtml += `<span class="badge badge-tool">${escapeHtml(name)}</span>`;
      });
    }
    if (!methodsHtml) {
      methodsHtml = `<span class="badge badge-none">بدون تغییر</span>`;
    }

    let savingsHtml = '—';
    if (p.savedTokens > 0) {
      const fmt = (n) => n.toLocaleString('en-US');
      savingsHtml = `<div class="saving-value">${p.savedPercent}٪ کاهش نویز</div><div class="saving-detail">~${fmt(p.savedTokens)} توکن</div>`;
    } else if (p.tools && p.tools.length > 0) {
      savingsHtml = `<div class="saving-value active-tools">ابزار فعال</div><div class="saving-detail">${p.tools.length} ابزار کاهش مصرف</div>`;
    }

    item.innerHTML = `
      <div class="history-info">
        <div class="history-name-row">
          <span class="history-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          <button class="btn btn-ghost btn-sm history-select-btn" data-path="${escapeHtml(p.path)}">انتخاب پروژه</button>
        </div>
        <div class="history-path" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>
      </div>
      <div class="history-methods">
        <div class="label-small">روش‌های اعمال‌شده:</div>
        <div class="badges-wrap">${methodsHtml}</div>
      </div>
      <div class="history-savings">
        <div class="label-small">میزان صرفه‌جویی:</div>
        <div class="savings-wrap">${savingsHtml}</div>
      </div>
    `;

    item.querySelector('.history-select-btn').addEventListener('click', async (e) => {
      const path = e.target.dataset.path;
      state.projectPath = path;
      const res = await api.scanProject(path);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      state.scan = res.info;
      renderScan(res.info);
      
      // Auto-detect and display large assets warning
      checkLargeAssets(res.info);

      // Auto-load team config if present in scanned project
      if (res.info.tokensaverConfig) {
        applyTeamConfig(res.info.tokensaverConfig);
      }
      
      updateNextButton();
    });

    list.appendChild(item);
  });
}

/* ---------- Team Configuration Loader ---------- */
function applyTeamConfig(config) {
  if (!config) return;
  
  const applyOpts = (groupName, list) => {
    const group = document.querySelector(`.opts[data-name="${groupName}"]`);
    if (!group) return;
    const multi = group.dataset.multi === '1';
    
    group.querySelectorAll('.opt').forEach((o) => {
      const val = o.dataset.val;
      if (multi) {
        o.classList.toggle('selected', list.includes(val));
      } else {
        o.classList.toggle('selected', val === list);
      }
    });
  };
  
  if (config.agents) applyOpts('agents', config.agents);
  if (config.noisy) applyOpts('noisy', config.noisy);
  if (config.repoSize) applyOpts('repoSize', config.repoSize);
  if (config.priority) applyOpts('priority', config.priority);
  if (config.provider) applyOpts('provider', config.provider);
  
  // Show temporary info notice
  const noteEl = document.createElement('div');
  noteEl.className = 'card-note';
  noteEl.style.color = '#c084fc';
  noteEl.style.fontWeight = 'bold';
  noteEl.style.marginTop = '1rem';
  noteEl.textContent = 'تنظیمات تیمی (.tokensaver.json) با موفقیت اعمال شد! ✓';
  $('#scan-card').after(noteEl);
  setTimeout(() => noteEl.remove(), 4000);
}

/* ---------- Dependencies Diagnostics (Checker) ---------- */
async function runDiagnostics() {
  const panel = $('#diag-card');
  if (!panel) return;
  
  panel.querySelectorAll('.status').forEach((el) => {
    el.textContent = '…';
    el.className = 'status';
  });
  
  const res = await api.checkDependencies();
  if (!res || !res.ok) return;
  
  const r = res.results;
  const update = (dep, obj) => {
    const el = panel.querySelector(`.diag-item[data-dep="${dep}"] .status`);
    if (!el) return;
    if (obj.installed) {
      el.textContent = obj.version.split(' ')[1] || obj.version || 'OK';
      el.className = 'status ok';
    } else {
      el.textContent = 'نصب نیست';
      el.className = 'status missing';
    }
  };
  
  update('git', r.git);
  update('node', r.node);
  update('python', r.python);
  update('bash', r.bash);
}

$('#diag-refresh-btn').addEventListener('click', runDiagnostics);

/* ---------- Team Config Export Event ---------- */
$('#export-team-btn').addEventListener('click', async () => {
  if (!state.projectPath) return;
  const config = collectAnswers();
  const res = await api.exportConfig(state.projectPath, config);
  if (res && res.ok) {
    alert('فایل .tokensaver.json و راهنمای README-tokensaver.md با موفقیت در پوشه ریشه پروژه ذخیره شدند! ✓');
  } else {
    alert('خطا در اکسپورت تنظیمات تیمی: ' + (res.error || 'نامشخص'));
  }
});

/* ---------- Live Token Proxy Monitor Controller ---------- */
$('#proxy-toggle-btn').addEventListener('click', async () => {
  const btn = $('#proxy-toggle-btn');
  const badge = $('#proxy-status-badge');
  const info = $('#proxy-address-info');
  
  if (state.proxyActive) {
    await api.stopProxy();
    state.proxyActive = false;
    btn.textContent = 'شروع پروکسی مانیتورینگ';
    btn.className = 'btn btn-primary';
    badge.textContent = 'پروکسی خاموش است';
    badge.className = 'proxy-badge off';
    info.classList.add('hidden');
  } else {
    // Get saved tokens percentage
    const proj = getProjectFromHistory(state.projectPath);
    const pct = proj ? (proj.savedPercent || 80) : 80;
    
    const budgetGuard = $('#budget-guard-active').checked;
    const limitTokens = $('#budget-tokens-limit').value || 100000;
    const limitCost = $('#budget-cost-limit').value || 1.0;
    
    const res = await api.startProxy({
      savedPercent: pct,
      budgetGuard,
      limitTokens,
      limitCost
    });
    if (res && res.ok) {
      state.proxyActive = true;
      btn.textContent = 'توقف پروکسی';
      btn.className = 'btn btn-ghost';
      badge.textContent = 'پروکسی فعال است';
      badge.className = 'proxy-badge on';
      info.classList.remove('hidden');
    } else {
      alert('خطا در راه‌اندازی پروکسی: ' + (res.error || 'پورت ۹۹۹۹ ممکن است اشغال باشد.'));
    }
  }
});

api.onProxyOutput((data) => {
  state.stats.requests += 1;
  state.stats.tokens += (data.inputTokens + data.outputTokens);
  state.stats.saved += data.savedTokens;
  
  $('#stat-requests').textContent = state.stats.requests.toLocaleString('en-US');
  $('#stat-tokens').textContent = state.stats.tokens.toLocaleString('en-US');
  $('#stat-saved').textContent = state.stats.saved.toLocaleString('en-US');
  
  const tbody = $('#proxy-log-body');
  const empty = tbody.querySelector('.empty-row');
  if (empty) empty.remove();
  
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${escapeHtml(data.time)}</td>
    <td style="font-weight: 700; color: #60a5fa;">${escapeHtml(data.model)}</td>
    <td style="direction: ltr; font-family: monospace; font-size: 0.8rem; text-align: left;">${escapeHtml(data.endpoint)}</td>
    <td>${data.inputTokens.toLocaleString('en-US')}</td>
    <td>${data.outputTokens.toLocaleString('en-US')}</td>
    <td class="proxy-table-saved">~${data.savedTokens.toLocaleString('en-US')}</td>
  `;
  tbody.prepend(row);
  
  if (tbody.children.length > 30) {
    tbody.lastElementChild.remove();
  }
  
  // Sync project stats to server
  syncProjectWithServer();
});

/* ---------- Smart Asset Scanner Warning ---------- */
function checkLargeAssets(info) {
  const prev = document.querySelector('.large-assets-warning');
  if (prev) prev.remove();

  if (!info.largeAssets || info.largeAssets.length === 0) return;
  
  // Group assets by folder (or root file) and accumulate sizes
  const groups = {};
  info.largeAssets.forEach(a => {
    let rel = a.path;
    if (rel.startsWith(info.projectPath)) {
      rel = rel.substring(info.projectPath.length);
    }
    rel = rel.replace(/^[/\\]/, '');
    
    const parts = rel.split(/[/\\]/).filter(Boolean);
    if (parts.length === 0) return;
    
    let groupKey = '';
    if (parts.length === 1) {
      groupKey = `فایل ${parts[0]}`;
    } else {
      groupKey = `پوشه /${parts[0]}`;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = 0;
    }
    groups[groupKey] += a.size || 0;
  });
  
  const items = Object.entries(groups).map(([name, sizeBytes]) => {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return `${name} (${sizeMb} مگابایت)`;
  });
  
  if (items.length === 0) return;
  
  const foldersList = items.map(item => `<code>${item}</code>`).join('، ');
  
  const noteEl = document.createElement('div');
  noteEl.className = 'reco large-assets-warning';
  noteEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  noteEl.style.background = 'rgba(245, 158, 11, 0.05)';
  noteEl.style.color = '#f59e0b';
  noteEl.style.marginTop = '1rem';
  noteEl.innerHTML = `⚠️ <b>فایل‌های غیرکد حجیم پیدا شدند!</b><br>پوشه‌ها یا فایل‌های حجیم زیر شناسایی شدند: ${foldersList}<br>توصیه می‌کنیم برای کاهش هزینه هوش مصنوعی، این مسیرها را در مرحله بعدی به لیست فیلتر نویز اضافه کنید.`;
  $('#scan-card').after(noteEl);
}

/* ---------- License Manager Controller ---------- */
$('#license-verify-btn').addEventListener('click', async () => {
  const input = $('#license-key-input');
  const msg = $('#license-status-msg');
  const key = input.value.trim();
  
  if (!key) {
    msg.style.color = '#ef4444';
    msg.textContent = 'کد لایسنس نمی‌تواند خالی باشد.';
    return;
  }
  
  msg.style.color = '#f59e0b';
  msg.textContent = 'در حال تأیید لایسنس…';
  
  const res = await api.verifyLicense(key);
  if (res && res.ok && res.active) {
    state.license = res;
    state.licenseVerified = true;
    localStorage.setItem('tokensaver_license', key);
    
    msg.style.color = '#10b981';
    msg.textContent = `لایسنس نسخه پرو با موفقیت فعال شد ✓ (مالک: ${res.owner})`;
    input.disabled = true;
    $('#license-verify-btn').disabled = true;
    $('#license-buy-btn').style.display = 'none';
    
    // Reload tools to unlock
    await loadTools();
  } else {
    msg.style.color = '#ef4444';
    msg.textContent = 'خطا در تایید لایسنس: ' + ((res && res.error) || 'سرور لایسنس پاسخگو نیست.');
  }
});

$('#license-buy-btn').addEventListener('click', async () => {
  const token = localStorage.getItem('tokensaver_user_token');
  if (!token) {
    alert('ابتدا باید وارد حساب خود شوید.');
    return;
  }
  
  const res = await api.requestPayment(token);
  if (res && res.ok && res.paymentUrl) {
    api.openExternal(res.paymentUrl);
    const msg = $('#license-status-msg');
    msg.style.color = '#c084fc';
    msg.textContent = 'درگاه پرداخت زرین‌پال در مرورگر باز شد. پس از پرداخت موفق، حساب شما به صورت خودکار ارتقا خواهد یافت.';
  } else {
    alert('خطا در اتصال به درگاه پرداخت: ' + ((res && res.error) || 'نامشخص. لطفاً از روشن بودن سرور لایسنس مطمئن شوید.'));
  }
});

/* ---------- Budget Guard Confirmation Modal ---------- */
let activeBudgetId = null;

api.onBudgetWarning((data) => {
  activeBudgetId = data.id;
  
  const modal = $('#budget-modal');
  const text = $('#budget-modal-text');
  
  const fmt = (n) => n.toLocaleString('en-US');
  text.innerHTML = `یک درخواست ارسالی برای مدل <code>${escapeHtml(data.model)}</code> دارای تخمین <b>${fmt(data.tokens)}</b> توکن (~<b>${data.cost.toFixed(2)}$</b> هزینه) است که از حد مجاز بودجه فراتر رفته است. آیا اجازه می‌دهید؟`;
  
  modal.classList.remove('hidden');
});

$('#budget-block-btn').addEventListener('click', async () => {
  if (activeBudgetId) {
    await api.respondBudgetWarning(activeBudgetId, false);
    activeBudgetId = null;
  }
  $('#budget-modal').classList.add('hidden');
});

$('#budget-allow-btn').addEventListener('click', async () => {
  if (activeBudgetId) {
    await api.respondBudgetWarning(activeBudgetId, true);
    activeBudgetId = null;
  }
  $('#budget-modal').classList.add('hidden');
});

/* ---------- SMS OTP Authentication Controller ---------- */
const loginOverlay = $('#login-overlay');
const authStatusMsg = $('#auth-status-msg');
const authPhoneInput = $('#auth-phone');
const authNameInput = $('#auth-name');
const authEmailInput = $('#auth-email');
const authSendBtn = $('#auth-send-btn');
const authVerifyBtn = $('#auth-verify-btn');
const authCodeInput = $('#auth-code');
const authChangePhoneBtn = $('#auth-change-phone-btn');
const authStepPhone = $('#auth-step-phone');
const authStepCode = $('#auth-step-code');
const authTargetPhone = $('#auth-target-phone');

const userProfileCard = $('#user-sidebar-profile');
const userProfileName = $('#user-profile-name');
const userProfilePhone = $('#user-profile-phone');
const sidebarLogoutBtn = $('#sidebar-logout-btn');

let currentAuthPhone = '';
let currentLang = 'en';
let isIranIp = false;

// Translate UI elements
function applyLanguage() {
  const dict = window.i18n ? window.i18n[currentLang] : null;
  if (!dict) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = dict[el.getAttribute('data-i18n')];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = dict[el.getAttribute('data-i18n-ph')];
  });
  
  const googleStep = $('#auth-step-google');
  const phoneStep = $('#auth-step-phone');
  const descText = $('#auth-desc-text');
  
  if (googleStep && phoneStep && descText) {
    if (currentLang === 'fa' || isIranIp) {
      googleStep.classList.add('hidden');
      phoneStep.classList.remove('hidden');
      descText.textContent = dict.auth_desc_otp;
    } else {
      googleStep.classList.remove('hidden');
      phoneStep.classList.add('hidden');
      descText.textContent = dict.auth_desc_google;
    }
  }
}

// IP Geolocation Check
async function checkIpGeolocation() {
  try {
    const res = await fetch('http://ip-api.com/json');
    const data = await res.json();
    if (data && data.countryCode === 'IR') {
      isIranIp = true;
      currentLang = 'fa';
      applyLanguage();
    }
  } catch (e) {
    console.warn("Could not check geolocation", e);
  }
}

// Setup Language Switchers & Check IP
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
  checkIpGeolocation();
  
  const btnEn = $('#lang-en');
  const btnFa = $('#lang-fa');
  if (btnEn) btnEn.addEventListener('click', () => { currentLang = 'en'; applyLanguage(); });
  if (btnFa) btnFa.addEventListener('click', () => { currentLang = 'fa'; applyLanguage(); });
  
  const guestBtn = $('#auth-guest-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      loginOverlay.classList.add('hidden');
      userProfileName.textContent = currentLang === 'fa' ? 'کاربر مهمان' : 'Guest User';
      userProfilePhone.textContent = 'Offline Mode';
      userProfileCard.classList.remove('hidden');
      state.user = { isGuest: true, name: 'Guest' };
      loadTools();
    });
  }

  const googleBtn = $('#auth-google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      authStatusMsg.style.color = '#f59e0b';
      authStatusMsg.textContent = 'در حال هدایت به مروگر جهت ورود با گوگل...';
      try {
        const res = await api.openGoogleAuth();
        if (res && res.token) {
          localStorage.setItem('tokensaver_user_token', res.token);
          checkStartupAuth();
        } else {
          authStatusMsg.style.color = '#ef4444';
          authStatusMsg.textContent = 'فرآیند ورود لغو شد یا با خطا مواجه شد.';
        }
      } catch (err) {
        authStatusMsg.style.color = '#ef4444';
        authStatusMsg.textContent = 'خطا در ارتباط با سرور.';
      }
    });
  }
});

// Check Auth Status on Launch
async function checkStartupAuth() {
  const token = localStorage.getItem('tokensaver_user_token');
  if (!token) {
    loginOverlay.classList.remove('hidden');
    return;
  }
  
  authStatusMsg.style.color = '#f59e0b';
  authStatusMsg.textContent = 'در حال بررسی احراز هویت…';
  
  const res = await api.checkAuthStatus(token);
  if (res && res.ok && res.user) {
    state.user = res.user;
    loginOverlay.classList.add('hidden');
    
    // Fill sidebar profile
    userProfileName.textContent = res.user.name || 'کاربر TokenSaver';
    userProfilePhone.textContent = res.user.phoneNumber;
    userProfileCard.classList.remove('hidden');
    
    // Set user email and name fields to remember them
    $('#user-name').value = res.user.name || '';
    $('#user-email').value = res.user.email || '';
    
    // If user is Pro, save status
    if (res.user.isPro) {
      state.license = { active: true, owner: res.user.name };
      state.licenseVerified = true;
    }
    
    // Reload tools to unlock Pro tools
    await loadTools();
    await fetchAndShowNotifications();
  } else {
    localStorage.removeItem('tokensaver_user_token');
    loginOverlay.classList.remove('hidden');
    authStatusMsg.style.color = '#ef4444';
    authStatusMsg.textContent = 'نشست شما منقضی شده است. لطفا دوباره وارد شوید.';
  }
}

// Fetch and render latest notifications from server
async function fetchAndShowNotifications() {
  const token = localStorage.getItem('tokensaver_user_token');
  if (!token) return;

  try {
    const res = await api.fetchNotifications(token);
    if (res && res.ok && res.notifications && res.notifications.length > 0) {
      const dismissed = JSON.parse(localStorage.getItem('tokensaver_dismissed_notifs') || '[]');
      const activeNotifs = res.notifications.filter(n => !dismissed.includes(n.id));
      
      if (activeNotifs.length > 0) {
        const latest = activeNotifs[activeNotifs.length - 1];
        const banner = $('#notifications-banner');
        const content = $('#notification-content');
        const closeBtn = $('#notif-close-btn');

        content.textContent = latest.message;
        banner.classList.remove('hidden');

        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.replaceWith(newCloseBtn);

        newCloseBtn.addEventListener('click', () => {
          banner.classList.add('hidden');
          dismissed.push(latest.id);
          localStorage.setItem('tokensaver_dismissed_notifs', JSON.stringify(dismissed));
        });
      } else {
        $('#notifications-banner').classList.add('hidden');
      }
    } else {
      $('#notifications-banner').classList.add('hidden');
    }
  } catch (e) {
    console.error('Error fetching notifications:', e);
  }
}

// Send OTP Clicked
authSendBtn.addEventListener('click', async () => {
  const phone = authPhoneInput.value.trim();
  if (!phone || !/^09\d{9}$/.test(phone)) {
    authStatusMsg.style.color = '#ef4444';
    authStatusMsg.textContent = 'لطفاً شماره موبایل معتبری وارد کنید (مثال: 09123456789)';
    return;
  }
  
  authStatusMsg.style.color = '#f59e0b';
  authStatusMsg.textContent = 'در حال ارسال کد تایید…';
  authSendBtn.disabled = true;
  
  const res = await api.sendOtp(phone);
  authSendBtn.disabled = false;
  
  if (res && res.ok) {
    currentAuthPhone = phone;
    authTargetPhone.textContent = phone;
    authStepPhone.classList.add('hidden');
    authStepCode.classList.remove('hidden');
    authStatusMsg.style.color = '#10b981';
    authStatusMsg.textContent = res.sandbox 
      ? 'کد تایید شبیه‌ساز در کنسول سرور چاپ شد.' 
      : 'کد تایید ارسال شد.';
  } else {
    authStatusMsg.style.color = '#ef4444';
    authStatusMsg.textContent = 'خطا در ارسال کد: ' + (res.error || 'نامشخص');
  }
});

// Verify OTP Clicked
authVerifyBtn.addEventListener('click', async () => {
  const code = authCodeInput.value.trim();
  if (!code || code.length !== 6) {
    authStatusMsg.style.color = '#ef4444';
    authStatusMsg.textContent = 'کد تایید باید ۶ رقمی باشد.';
    return;
  }
  
  const name = authNameInput.value.trim();
  const email = authEmailInput.value.trim();
  
  authStatusMsg.style.color = '#f59e0b';
  authStatusMsg.textContent = 'در حال تایید کد…';
  authVerifyBtn.disabled = true;
  
  const res = await api.verifyOtp(currentAuthPhone, code, name, email);
  authVerifyBtn.disabled = false;
  
  if (res && res.ok && res.token) {
    localStorage.setItem('tokensaver_user_token', res.token);
    state.user = res.user;
    loginOverlay.classList.add('hidden');
    
    // Fill profile
    userProfileName.textContent = res.user.name || 'کاربر TokenSaver';
    userProfilePhone.textContent = res.user.phoneNumber;
    userProfileCard.classList.remove('hidden');
    
    authStatusMsg.textContent = '';
    authCodeInput.value = '';
    
    // Reload tools to check Pro status
    if (res.user.isPro) {
      state.license = { active: true, owner: res.user.name };
      state.licenseVerified = true;
    }
    await loadTools();
    await fetchAndShowNotifications();
  } else {
    authStatusMsg.style.color = '#ef4444';
    authStatusMsg.textContent = 'خطا در تایید کد: ' + (res.error || 'کد وارد شده نامعتبر است.');
  }
});

// Change phone click
authChangePhoneBtn.addEventListener('click', () => {
  authStepCode.classList.add('hidden');
  authStepPhone.classList.remove('hidden');
  authStatusMsg.textContent = '';
});

// Logout click
sidebarLogoutBtn.addEventListener('click', () => {
  localStorage.removeItem('tokensaver_user_token');
  state.user = null;
  state.license = null;
  state.licenseVerified = false;
  
  userProfileCard.classList.add('hidden');
  loginOverlay.classList.remove('hidden');
  
  authStepCode.classList.add('hidden');
  authStepPhone.classList.remove('hidden');
  
  authPhoneInput.value = '';
  authCodeInput.value = '';
  authStatusMsg.textContent = 'با موفقیت خارج شدید.';
  authStatusMsg.style.color = '#10b981';
});

// Sync project savings metadata with server (No source code files are ever sent!)
async function syncProjectWithServer() {
  if (!state.projectPath) return;
  const token = localStorage.getItem('tokensaver_user_token');
  if (!token) return;
  
  const folderName = state.projectPath.split(/[/\\]/).pop() || state.projectPath;
  
  let savedTokens = 0;
  let savedPercent = 80;
  
  const proj = getProjectFromHistory(state.projectPath);
  if (proj) {
    savedTokens = proj.savedTokens || 0;
    savedPercent = proj.savedPercent || 80;
  } else if (state.lastEstimate) {
    savedTokens = state.lastEstimate.noiseTokens || 0;
    savedPercent = state.lastEstimate.pct || 80;
  }
  
  if (state.stats && state.stats.saved > 0) {
    savedTokens = state.stats.saved;
  }
  
  try {
    await api.syncProject(token, state.projectPath, folderName, savedTokens, savedPercent);
  } catch (e) {
    console.error('Failed to sync project stats to server:', e);
  }
}

// Load budget settings from localStorage
function loadBudgetSettings() {
  const active = localStorage.getItem('tokensaver_budget_active');
  const tokens = localStorage.getItem('tokensaver_budget_tokens');
  const cost = localStorage.getItem('tokensaver_budget_cost');
  
  if (active !== null) {
    $('#budget-guard-active').checked = active === 'true';
  }
  if (tokens !== null) {
    $('#budget-tokens-limit').value = tokens;
  }
  if (cost !== null) {
    $('#budget-cost-limit').value = cost;
  }
}

// Sync budget inputs to running backend proxy
function updateRunningBudgetConfig() {
  const active = $('#budget-guard-active').checked;
  const tokens = $('#budget-tokens-limit').value || 100000;
  const cost = $('#budget-cost-limit').value || 1.0;
  
  localStorage.setItem('tokensaver_budget_active', active);
  localStorage.setItem('tokensaver_budget_tokens', tokens);
  localStorage.setItem('tokensaver_budget_cost', cost);
  
  api.updateBudgetConfig({
    budgetGuard: active,
    limitTokens: tokens,
    limitCost: cost
  }).catch(() => {});
}

// Add change listeners to budget inputs
$('#budget-guard-active').addEventListener('change', updateRunningBudgetConfig);
$('#budget-tokens-limit').addEventListener('input', updateRunningBudgetConfig);
$('#budget-cost-limit').addEventListener('input', updateRunningBudgetConfig);

// Startup Init
loadBudgetSettings();
updateRunningBudgetConfig();
checkStartupAuth();

// Fetch available tools and render project history on startup
api.listTools().then(({ tools }) => {
  state.availableTools = tools;
  renderProjectHistory();
}).catch(() => {
  renderProjectHistory();
});

applyAgentDetection();

setStep(0);
