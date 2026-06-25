'use strict';

/*
 * Token Saver — config engine
 * Pure logic with no Electron / DOM dependencies so it can be unit-tested
 * in plain Node. fs/path are injected by the caller (main process).
 *
 *   scanProject(projectPath, fs, path) -> info
 *   generatePlan(answers, info)        -> { files, installCommands, recommendations, summary }
 */

/* ------------------------------------------------------------------ */
/* Project scan (read-only)                                            */
/* ------------------------------------------------------------------ */

function safeRead(fs, p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch (_e) { return null; }
}

function scanProject(projectPath, fs, path) {
  const has = (f) => fs.existsSync(path.join(projectPath, f));

  const stacks = [];
  const buildCommands = [];
  const testCommands = [];

  // Node / JS / TS
  if (has('package.json')) {
    stacks.push('node');
    const pkg = JSON.parse(safeRead(fs, path.join(projectPath, 'package.json')) || '{}');
    const scripts = pkg.scripts || {};
    if (scripts.test) testCommands.push('npm test');
    if (scripts.build) buildCommands.push('npm run build');
    if (scripts.lint) buildCommands.push('npm run lint');
    const allDeps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    if (allDeps.typescript || has('tsconfig.json')) stacks.push('typescript');
  }
  // Python
  if (has('requirements.txt') || has('pyproject.toml') || has('setup.py') || has('Pipfile')) {
    stacks.push('python');
    testCommands.push('pytest -q');
  }
  if (has('go.mod')) { stacks.push('go'); testCommands.push('go test ./...'); buildCommands.push('go build ./...'); }
  if (has('Cargo.toml')) { stacks.push('rust'); testCommands.push('cargo test'); buildCommands.push('cargo build'); }
  if (has('pom.xml')) { stacks.push('java'); buildCommands.push('mvn -q package'); }
  if (has('build.gradle') || has('build.gradle.kts')) { stacks.push('java'); buildCommands.push('gradle build'); }
  if (has('composer.json')) stacks.push('php');
  if (has('Gemfile')) stacks.push('ruby');

  // Existing agent configs
  const existingAgentConfigs = [];
  ['CLAUDE.md', '.claude/settings.json', '.cursorrules', '.cursor', 'AGENTS.md', 'GEMINI.md']
    .forEach((f) => { if (has(f)) existingAgentConfigs.push(f); });

  // Monorepo signals
  const isMonorepo =
    has('pnpm-workspace.yaml') || has('lerna.json') || has('turbo.json') ||
    has('nx.json') || has('packages');

  // Rough size estimate via a shallow top-level entry count
  let topLevelEntries = 0;
  try { topLevelEntries = fs.readdirSync(projectPath).length; } catch (_e) {}

  return {
    projectPath,
    name: projectPath.split(/[\\/]/).filter(Boolean).pop() || 'project',
    stacks: stacks.length ? Array.from(new Set(stacks)) : ['unknown'],
    buildCommands: Array.from(new Set(buildCommands)),
    testCommands: Array.from(new Set(testCommands)),
    existingAgentConfigs,
    isMonorepo,
    topLevelEntries
  };
}

/* ------------------------------------------------------------------ */
/* Detect installed AI coding agents (by their config dirs in $HOME)   */
/* ------------------------------------------------------------------ */

function detectAgents(homedir, fs, path) {
  const exists = (...parts) => {
    try { return fs.existsSync(path.join(homedir, ...parts)); } catch (_e) { return false; }
  };
  const found = [];
  if (exists('.claude') || exists('.config', 'claude')) found.push('claude-code');
  if (exists('.cursor')) found.push('cursor');
  if (exists('.codex')) found.push('codex');
  if (exists('.gemini') || exists('.config', 'gemini')) found.push('gemini');
  return found;
}

/* ------------------------------------------------------------------ */
/* Estimate "context noise" tokens in a project (bounded walk)         */
/* ------------------------------------------------------------------ */

function patternToTest(pat) {
  if (pat.endsWith('/')) {
    const name = pat.slice(0, -1);
    return (base) => base === name;
  }
  if (pat.includes('*')) {
    const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return (base) => re.test(base);
  }
  return (base) => base === pat;
}

function estimateImpact(root, noisy, stacks, fs, path, opts) {
  opts = opts || {};
  const cap = opts.maxEntries || 20000;
  const tests = ignorePatterns(noisy, stacks || []).map(patternToTest);
  const matches = (base) => tests.some((t) => t(base));

  let totalBytes = 0, noiseBytes = 0, files = 0, count = 0, truncated = false;
  const stack = [{ p: root, inNoise: false }];
  while (stack.length) {
    if (count++ > cap) { truncated = true; break; }
    const { p, inNoise } = stack.pop();
    let st;
    try { st = fs.lstatSync(p); } catch (_e) { continue; }
    if (st.isSymbolicLink()) continue;
    const base = p.split(/[\\/]/).pop();
    const isNoise = inNoise || matches(base);
    if (st.isDirectory()) {
      let entries;
      try { entries = fs.readdirSync(p); } catch (_e) { continue; }
      for (const e of entries) stack.push({ p: path.join(p, e), inNoise: isNoise });
    } else if (st.isFile()) {
      files++; totalBytes += st.size; if (isNoise) noiseBytes += st.size;
    }
  }
  const toTokens = (b) => Math.round(b / 4); // rough: ~4 bytes/token
  return {
    files,
    totalTokens: toTokens(totalBytes),
    noiseTokens: toTokens(noiseBytes),
    pct: totalBytes ? Math.round((noiseBytes / totalBytes) * 100) : 0,
    truncated
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function ignorePatterns(noisy, stacks) {
  const base = ['node_modules/', 'dist/', 'build/', 'out/', '.next/', 'coverage/', '.cache/', 'vendor/'];
  if (noisy.includes('logs')) base.push('*.log', 'logs/');
  if (noisy.includes('lockfiles')) base.push('package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'poetry.lock', 'Cargo.lock');
  if (noisy.includes('generated')) base.push('*.min.js', '*.map', 'generated/', '__generated__/');
  if (stacks.includes('python')) base.push('.venv/', '__pycache__/', '*.pyc', '.pytest_cache/');
  if (stacks.includes('rust')) base.push('target/');
  if (stacks.includes('java')) base.push('target/', '.gradle/');
  return Array.from(new Set(base));
}

function decideFeatures(answers, info) {
  // Respect explicit user choices, otherwise recommend based on context.
  if (answers.features && answers.features.length) return answers.features.slice();
  const feats = new Set();
  if (answers.priority === 'cost' || answers.priority === 'both') { feats.add('compression'); feats.add('caching'); }
  if (answers.priority === 'quality' || answers.priority === 'both') { feats.add('codegraph'); }
  if (info.isMonorepo || answers.repoSize === 'large') feats.add('codegraph');
  if (answers.repoSize === 'large') feats.add('memory');
  if (!feats.size) { feats.add('compression'); feats.add('caching'); }
  return Array.from(feats);
}

/* ------------------------------------------------------------------ */
/* File-content templates                                              */
/* ------------------------------------------------------------------ */

function claudeMd(info, noisy) {
  const tests = info.testCommands[0] || '(دستور تست پروژه را اینجا بنویسید)';
  const build = info.buildCommands[0] || '(دستور build پروژه را اینجا بنویسید)';
  return `# ${info.name} — راهنمای Claude Code

> این فایل توسط Token Saver تولید شده تا context تمیزتر و مصرف توکن کمتر شود.

## Stack
${info.stacks.map((s) => '- ' + s).join('\n')}

## دستورهای مهم
- اجرای تست‌ها: \`${tests}\`
- ساخت پروژه: \`${build}\`

## قواعد کاهش توکن
- خروجی دستورها را **خلاصه** نگه دار؛ از چاپ کامل لاگ‌های طولانی و موفق خودداری کن.
- قبل از خواندن کل فایل‌ها، با جستجوی هدفمند (grep/symbol) سراغ بخش مرتبط برو.
- فایل‌های پرنویز را نخوان مگر لازم باشد: ${ignorePatterns(noisy, info.stacks).slice(0, 8).join('، ')} و موارد مشابه.
- وقتی تست/بیلد موفق بود، فقط نتیجه نهایی را گزارش کن نه کل خروجی.

## ساختار پاسخ
- پاسخ‌ها کوتاه و عملی باشند؛ از تکرار context پرهیز کن.
`;
}

function claudeSettings(noisy) {
  // Valid Claude Code settings.json with a PostToolUse hook that trims
  // verbose Bash output via `snip` when it is installed (graceful no-op otherwise).
  const settings = {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    _tokensaver: 'تنظیمات تولیدشده توسط Token Saver برای کاهش مصرف توکن',
    permissions: {
      // Read-friendly defaults; adjust to taste.
      allow: ['Bash(npm test:*)', 'Bash(npm run build:*)', 'Read', 'Grep', 'Glob']
    },
    hooks: {
      PostToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'command -v snip >/dev/null 2>&1 && snip filter || cat'
            }
          ]
        }
      ]
    }
  };
  return JSON.stringify(settings, null, 2) + '\n';
}

function cursorRules(info, noisy) {
  return `# Token Saver — قواعد Cursor

- context را تمیز نگه دار: فایل‌های زیر را برای درک پروژه نخوان مگر صریحاً لازم باشد:
  ${ignorePatterns(noisy, info.stacks).join('، ')}
- به‌جای خواندن فایل‌به‌فایل، از جستجوی نمادمحور و semantic استفاده کن.
- خروجی تست/بیلد موفق را خلاصه کن؛ لاگ کامل را در context نگذار.
- Stack پروژه: ${info.stacks.join('، ')}.
- دستور تست: ${info.testCommands[0] || 'نامشخص'} | دستور build: ${info.buildCommands[0] || 'نامشخص'}.
`;
}

function ignoreFile(info, noisy) {
  return `# Token Saver ignore — الگوهایی که نباید وارد context ابزار AI شوند\n` +
    ignorePatterns(noisy, info.stacks).join('\n') + '\n';
}

function agentsMd(info, noisy) {
  return `# AGENTS.md — ${info.name}

تولیدشده توسط Token Saver برای Codex CLI و سایر agentهای سازگار.

## Stack
${info.stacks.join('، ')}

## دستورها
- تست: \`${info.testCommands[0] || 'نامشخص'}\`
- build: \`${info.buildCommands[0] || 'نامشخص'}\`

## قواعد توکن
- خروجی طولانی را خلاصه کن.
- فایل‌های پرنویز را نادیده بگیر: ${ignorePatterns(noisy, info.stacks).slice(0, 8).join('، ')}.
- جستجوی هدفمند به‌جای خواندن کل ریپو.
`;
}

function geminiMd(info, noisy) {
  return `# GEMINI.md — ${info.name}

تولیدشده توسط Token Saver.

- Stack: ${info.stacks.join('، ')}
- تست: ${info.testCommands[0] || 'نامشخص'} | build: ${info.buildCommands[0] || 'نامشخص'}
- context را تمیز نگه دار و خروجی پرنویز را خلاصه کن.
- این مسیرها را نادیده بگیر: ${ignorePatterns(noisy, info.stacks).slice(0, 8).join('، ')}.
`;
}

/* ------------------------------------------------------------------ */
/* Install commands per feature (cross-platform)                       */
/* ------------------------------------------------------------------ */

function installCommandsFor(features, provider) {
  const cmds = [];
  if (features.includes('compression')) {
    cmds.push({
      title: 'snip — فشرده‌سازی خروجی shell (۶۰–۹۰٪ کمتر)',
      mac: 'brew install snip   # یا: go install',
      win: 'scoop install snip   # یا دانلود باینری از repo',
      after: 'snip init'
    });
    cmds.push({
      title: 'RTK — جایگزین/مکمل برای فشرده‌سازی خروجی',
      mac: 'brew install rtk',
      win: 'cargo install rtk   # یا باینری ویندوز',
      after: ''
    });
  }
  if (features.includes('codegraph')) {
    cmds.push({
      title: 'codebase-memory-mcp — گراف کد برای حذف file-crawl (۱۰× توکن کمتر)',
      mac: 'npx codebase-memory-mcp@latest init',
      win: 'npx codebase-memory-mcp@latest init',
      after: ''
    });
  }
  if (features.includes('memory')) {
    cmds.push({
      title: 'agentmemory — حافظه بلندمدت بین سشن‌ها',
      mac: 'npx @agentmemory/agentmemory',
      win: 'npx @agentmemory/agentmemory',
      after: ''
    });
  }
  if (features.includes('caching')) {
    const url = provider === 'openai'
      ? 'https://platform.openai.com/docs/guides/prompt-caching'
      : 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching';
    cmds.push({
      title: 'Prompt Caching — بدون نصب؛ فقط فعال‌سازی در کد/کلاینت',
      mac: 'راهنما: ' + url,
      win: 'راهنما: ' + url,
      after: ''
    });
  }
  return cmds;
}

/* ------------------------------------------------------------------ */
/* Plan generation                                                     */
/* ------------------------------------------------------------------ */

function generatePlan(answers, info) {
  answers = answers || {};
  const agents = answers.agents && answers.agents.length ? answers.agents : ['claude-code'];
  const noisy = answers.noisy && answers.noisy.length ? answers.noisy : ['tests', 'build', 'logs'];
  const features = decideFeatures(answers, info);

  const files = [];

  // Universal ignore + plan record
  files.push({ path: '.aiignore', content: ignoreFile(info, noisy), merge: 'lines' });
  files.push({
    path: '.tokensaver/tokensaver.config.json',
    merge: 'overwrite',
    content: JSON.stringify({
      generatedBy: 'Token Saver Desktop v1.0.0',
      generatedAt: new Date().toISOString(),
      project: info.name,
      stacks: info.stacks,
      agents, noisy, features,
      repoSize: answers.repoSize || 'unknown',
      priority: answers.priority || 'both',
      provider: answers.provider || 'mixed'
    }, null, 2) + '\n',
    overwrite: true
  });

  // Per-agent files
  if (agents.includes('claude-code')) {
    files.push({ path: 'CLAUDE.md', content: claudeMd(info, noisy), merge: 'markdown' });
    files.push({ path: '.claude/settings.json', content: claudeSettings(noisy), merge: 'overwrite' });
  }
  if (agents.includes('cursor')) {
    files.push({ path: '.cursorrules', content: cursorRules(info, noisy), merge: 'markdown' });
    files.push({ path: '.cursorignore', content: ignoreFile(info, noisy), merge: 'lines' });
  }
  if (agents.includes('codex')) {
    files.push({ path: 'AGENTS.md', content: agentsMd(info, noisy), merge: 'markdown' });
  }
  if (agents.includes('gemini')) {
    files.push({ path: 'GEMINI.md', content: geminiMd(info, noisy), merge: 'markdown' });
  }

  const installCommands = installCommandsFor(features, answers.provider);

  // Recommendations (human guidance)
  const recommendations = [];
  if (features.includes('compression')) recommendations.push('برای workflowهای CLI-heavy، snip/RTK سریع‌ترین برگشت سرمایه را دارند.');
  if (features.includes('codegraph')) recommendations.push('ریپوی بزرگ/مونوریپو: گراف کد (codebase-memory-mcp) جلوی file-crawl پرهزینه را می‌گیرد.');
  if (features.includes('memory')) recommendations.push('برای agentهای طولانی‌عمر، لایه memory از توضیح مجدد context بین سشن‌ها جلوگیری می‌کند.');
  if (features.includes('caching')) recommendations.push('Prompt Caching را برای system prompt و tool definitions ثابت فعال کن (تا ۹۰٪ کاهش هزینه ورودی تکراری).');
  if (info.existingAgentConfigs.length) {
    recommendations.push('کانفیگ‌های موجود شناسایی شد (' + info.existingAgentConfigs.join('، ') + ')؛ از فایل‌های قبلی نسخه پشتیبان .tokensaver.bak ساخته می‌شود.');
  }

  const summary = {
    project: info.name,
    stacks: info.stacks,
    agents,
    features,
    fileCount: files.length
  };

  return { files, installCommands, recommendations, summary };
}

/* ------------------------------------------------------------------ */
/* Project history (pure upsert — main process persists to disk)       */
/* ------------------------------------------------------------------ */

function upsertProject(projects, record) {
  const list = Array.isArray(projects) ? projects.slice() : [];
  const i = list.findIndex((p) => p.path === record.path);
  if (i >= 0) {
    const prev = list[i];
    const merged = Object.assign({}, prev, record);
    merged.tools = Array.from(new Set([...(prev.tools || []), ...(record.tools || [])]));
    merged.firstAt = prev.firstAt || prev.at || record.at;
    list[i] = merged;
  } else {
    list.push(Object.assign({ tools: [], firstAt: record.at }, record));
  }
  return list;
}

module.exports = {
  scanProject, generatePlan, ignorePatterns, decideFeatures,
  detectAgents, estimateImpact, upsertProject
};
