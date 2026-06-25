'use strict';

const api = window.tokensaver;

const state = {
  step: 0,
  projectPath: null,
  scan: null,
  plan: null,
  toolsLoaded: false
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
  if (state.step < 3) setStep(state.step + 1);
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
  const { tools, platform } = await api.listTools();
  state.platform = platform;
  const list = $('#tools-list');
  list.innerHTML = '';
  const tpl = $('#tool-card-tpl');

  tools.forEach((tool) => {
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

    const spec = tool.install[platform];
    const cmd = spec ? spec.cmd : '';
    const log = node.querySelector('.tool-log');

    node.querySelector('.tool-repo').addEventListener('click', () => api.openExternal(tool.repo));
    node.querySelector('.tool-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(cmd);
      note(card, 'دستور کپی شد.');
    });

    const installBtn = node.querySelector('.tool-install');
    const cancelBtn = node.querySelector('.tool-cancel');
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
      const res = await api.installTool(tool.id, state.projectPath);
      installBtn.disabled = false;
      cancelBtn.classList.add('hidden');
      if (res && res.manual) {
        log.textContent += '\nاین ابزار روی سیستم تو نیاز به اجرای دستی دارد:\n' + res.cmd + '\n' + (res.note || '');
        installBtn.textContent = 'نصب دستی لازم است';
      } else if (res && res.ok) {
        installBtn.textContent = 'نصب شد ✓';
      } else {
        installBtn.textContent = 'نصب ناموفق — تلاش دوباره';
        if (res && res.needsShell) {
          log.textContent += '\nراهنما: روی ویندوز WSL یا Git Bash نصب کن، یا دستور را آنجا اجرا کن.';
        }
      }
    });

    list.appendChild(node);
  });

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

applyAgentDetection();

setStep(0);
