'use strict';

const api = window.tokensaver;

const state = {
  step: 0,
  projectPath: null,
  scan: null,
  plan: null
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
  else if (state.step === 1) { next.disabled = false; next.textContent = 'ساخت پیش‌نمایش'; }
  else if (state.step === 2) { next.disabled = !state.plan; next.textContent = 'برو به اعمال'; }
  else { next.disabled = true; next.textContent = 'پایان'; }
}

$('#back-btn').addEventListener('click', () => { if (state.step > 0) setStep(state.step - 1); });
$('#next-btn').addEventListener('click', async () => {
  if (state.step === 1) { await buildPreview(); setStep(2); return; }
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

/* ---------- Step 1: option pickers ---------- */
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

/* ---------- Step 2: preview ---------- */
async function buildPreview() {
  const answers = collectAnswers();
  const res = await api.previewConfig(state.projectPath, answers);
  if (!res.ok) { alert(res.error); return; }
  state.plan = res.plan;
  renderPreview(res.plan);
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

  // recommendations
  const reco = $('#reco');
  if (plan.recommendations.length) {
    reco.innerHTML = '<b>پیشنهادها:</b><ul>' +
      plan.recommendations.map((r) => '<li>' + escapeHtml(r) + '</li>').join('') + '</ul>';
  } else { reco.innerHTML = ''; }

  // install commands
  const inst = $('#install');
  inst.innerHTML = '';
  if (plan.installCommands.length) {
    const head = document.createElement('div');
    head.innerHTML = '<b style="display:block;margin-bottom:.5rem">دستورهای نصب ابزارها (دستی، با تأیید خودت):</b>';
    inst.appendChild(head);
  }
  plan.installCommands.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'ic';
    el.innerHTML = '<b>' + escapeHtml(c.title) + '</b>' +
      '<div>🍎 mac: <code>' + escapeHtml(c.mac) + '</code></div>' +
      '<div>🪟 win: <code>' + escapeHtml(c.win) + '</code></div>' +
      (c.after ? '<div>سپس: <code>' + escapeHtml(c.after) + '</code></div>' : '');
    inst.appendChild(el);
  });
}

/* ---------- Step 3: apply ---------- */
$('#apply-btn').addEventListener('click', async () => {
  if (!state.plan) return;
  const res = await api.applyConfig(state.projectPath, state.plan.files);
  const box = $('#result');
  box.classList.remove('hidden');
  if (res.ok) {
    box.classList.add('ok');
    $('#done-title').textContent = 'انجام شد ✓';
    box.innerHTML = '<h3>' + res.written.length + ' فایل نوشته شد</h3>' +
      res.written.map((f) => '<div class="f">+ ' + escapeHtml(f) + '</div>').join('') +
      '<p class="muted" style="margin-top:1rem;margin-bottom:0">حالا دستورهای نصب ابزارها را (از مرحله پیش‌نمایش) در ترمینال پروژه اجرا کن.</p>';
  } else {
    box.innerHTML = '<h3>خطا</h3><p class="muted">' + escapeHtml(res.error || 'نامشخص') + '</p>';
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

setStep(0);
