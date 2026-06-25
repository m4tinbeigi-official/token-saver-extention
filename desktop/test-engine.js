'use strict';

/* Pure-Node test for config-engine (no Electron needed): node test-engine.js */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { scanProject, generatePlan } = require('./config-engine');

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  console.log('  ✓ ' + name);
  passed++;
}

// Build a fake Node + TS project in a temp dir
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-test-'));
fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
  name: 'demo-app',
  scripts: { test: 'jest', build: 'tsc', lint: 'eslint .' },
  devDependencies: { typescript: '^5.0.0' }
}, null, 2));
fs.writeFileSync(path.join(tmp, 'tsconfig.json'), '{}');

console.log('scanProject:');
const info = scanProject(tmp, fs, path);
ok('detects node stack', info.stacks.includes('node'));
ok('detects typescript', info.stacks.includes('typescript'));
ok('detects npm test', info.testCommands.includes('npm test'));
ok('detects npm run build', info.buildCommands.includes('npm run build'));

console.log('generatePlan (claude + cursor, cost priority):');
const plan = generatePlan({
  agents: ['claude-code', 'cursor'],
  noisy: ['tests', 'build', 'logs', 'lockfiles'],
  repoSize: 'medium',
  priority: 'cost',
  provider: 'anthropic'
}, info);

const paths = plan.files.map((f) => f.path);
ok('creates CLAUDE.md', paths.includes('CLAUDE.md'));
ok('creates .claude/settings.json', paths.includes('.claude/settings.json'));
ok('creates .cursorrules', paths.includes('.cursorrules'));
ok('creates .cursorignore', paths.includes('.cursorignore'));
ok('creates .aiignore', paths.includes('.aiignore'));
ok('records plan config', paths.includes('.tokensaver/tokensaver.config.json'));

// settings.json must be valid JSON
const settings = plan.files.find((f) => f.path === '.claude/settings.json');
ok('settings.json is valid JSON', (() => { JSON.parse(settings.content); return true; })());

// cost priority => compression + caching install commands present
const titles = plan.installCommands.map((c) => c.title).join(' | ');
ok('cost priority suggests compression (snip)', /snip/.test(titles));
ok('cost priority suggests caching', /Caching/.test(titles));

console.log('generatePlan (large monorepo, quality):');
const plan2 = generatePlan({
  agents: ['claude-code'], noisy: ['tests'], repoSize: 'large', priority: 'quality', provider: 'mixed'
}, info);
ok('large/quality recommends codegraph', plan2.summary.features.includes('codegraph'));

// no answers => sane defaults
const plan3 = generatePlan({}, info);
ok('empty answers still produces files', plan3.files.length > 0);

// cleanup
fs.rmSync(tmp, { recursive: true, force: true });

console.log('tools-registry:');
const { TOOLS, getTool, platformKey } = require('./tools-registry');
ok('registry has at least one tool', TOOLS.length >= 1);
ok('codebase-memory-mcp exists', !!getTool('codebase-memory-mcp'));
const cmm = getTool('codebase-memory-mcp');
ok('has mac/win/linux install specs', cmm.install.mac && cmm.install.win && cmm.install.linux);
ok('install cmd uses the official installer', /DeusData\/codebase-memory-mcp\/main\/install\.sh/.test(cmm.install.mac.cmd));
ok('install cmd passes --ui', /--ui/.test(cmm.install.mac.cmd));
ok('platformKey maps darwin->mac', platformKey('darwin') === 'mac');
ok('platformKey maps win32->win', platformKey('win32') === 'win');
ok('every tool has required fields', TOOLS.every((t) =>
  t.id && t.name && t.description && t.howItWorks && Array.isArray(t.claims) && t.afterInstall && t.install));

console.log('detectAgents:');
const { detectAgents, estimateImpact } = require('./config-engine');
const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
fs.mkdirSync(path.join(fakeHome, '.claude'));
fs.mkdirSync(path.join(fakeHome, '.cursor'));
const detected = detectAgents(fakeHome, fs, path);
ok('detects claude-code from ~/.claude', detected.includes('claude-code'));
ok('detects cursor from ~/.cursor', detected.includes('cursor'));
ok('does not detect codex when absent', !detected.includes('codex'));
fs.rmSync(fakeHome, { recursive: true, force: true });

console.log('estimateImpact:');
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
fs.mkdirSync(path.join(proj, 'node_modules'));
fs.writeFileSync(path.join(proj, 'node_modules', 'big.js'), 'x'.repeat(40000)); // noise
fs.mkdirSync(path.join(proj, 'src'));
fs.writeFileSync(path.join(proj, 'src', 'app.js'), 'y'.repeat(4000)); // signal
const est = estimateImpact(proj, ['tests'], ['node'], fs, path);
ok('counts files', est.files >= 2);
ok('noise tokens > 0 (node_modules)', est.noiseTokens > 0);
ok('noise is the majority here', est.pct >= 80);
fs.rmSync(proj, { recursive: true, force: true });

console.log('merge tags:');
ok('CLAUDE.md tagged markdown', plan.files.find((f) => f.path === 'CLAUDE.md').merge === 'markdown');
ok('.aiignore tagged lines', plan.files.find((f) => f.path === '.aiignore').merge === 'lines');

console.log('\nAll ' + passed + ' checks passed ✓');
