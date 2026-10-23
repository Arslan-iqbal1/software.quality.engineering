/*
 * BookKart deployment-readiness tests.
 * The .env loader behaves (no overrides, comments ignored, quotes
 * stripped) and every deploy artifact the guide promises exists and
 * is complete: DEPLOY.md, render.yaml, .env.example, systemd unit.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadDotEnv } = require('../server.js');

const ROOT = path.join(__dirname, '..');

test('.env loader sets missing vars, never overrides real env, ignores comments', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookkart-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, [
    '# a comment line',
    '',
    'BK_TEST_ALPHA=from-file',
    'BK_TEST_BETA="quoted value"',
    'BK_TEST_GAMMA = spaced'
  ].join('\n'));
  process.env.BK_TEST_ALPHA = 'from-real-env';
  try {
    loadDotEnv(file);
    assert.equal(process.env.BK_TEST_ALPHA, 'from-real-env'); // real env wins
    assert.equal(process.env.BK_TEST_BETA, 'quoted value');
    assert.equal(process.env.BK_TEST_GAMMA, 'spaced');
  } finally {
    delete process.env.BK_TEST_ALPHA;
    delete process.env.BK_TEST_BETA;
    delete process.env.BK_TEST_GAMMA;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  loadDotEnv(path.join(dir, 'missing.env')); // missing file must not throw
});

test('deploy artifacts exist and are complete', () => {
  const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  for (const v of ['PORT', 'BOOKKART_DB', 'BOOKKART_ADMIN_KEY', 'BOOKKART_NTFY_TOPIC',
                   'BOOKKART_TELEGRAM_TOKEN', 'BOOKKART_TELEGRAM_CHAT_ID', 'BOOKKART_WEBHOOK_URL']) {
    assert.ok(envExample.includes(v), '.env.example documents ' + v);
  }
  const render = fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8');
  assert.match(render, /startCommand: node server\.js/);
  assert.match(render, /healthCheckPath: \/api\/books/);
  const unit = fs.readFileSync(path.join(ROOT, 'deploy', 'bookkart.service'), 'utf8');
  assert.match(unit, /ExecStart=.*node server\.js/);
  assert.match(unit, /Restart=always/);
  const guide = fs.readFileSync(path.join(ROOT, 'DEPLOY.md'), 'utf8');
  assert.match(guide, /Route A/);
  assert.match(guide, /Route B/);
  assert.match(guide, /certbot/);
});
