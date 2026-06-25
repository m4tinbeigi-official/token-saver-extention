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

console.log('\nAll ' + passed + ' checks passed ✓');
