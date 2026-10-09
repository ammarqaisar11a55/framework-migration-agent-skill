const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ESLint } = require('eslint');

const root = path.join(__dirname, '..');

// Rule ids reported for one file, linted even if the configuration ignores it.
async function ruleIds(file) {
  const eslint = new ESLint({ cwd: root, ignore: false });
  const [result] = await eslint.lintFiles([path.join(root, file)]);
  return [...new Set(result.messages.map((m) => m.ruleId))].sort();
}


test('the configuration reports var and let that could be const', async () => {
  assert.deepEqual(await ruleIds('samples/bad.js'), ['no-var', 'prefer-const']);
});

test('browser globals are known only where the file asks for them', async () => {
  assert.deepEqual(await ruleIds('src/client.js'), []);
  assert.deepEqual(await ruleIds('samples/browser.js'), ['no-undef']);
});

test('the lint script skips what .gitignore lists (samples/ has errors)', () => {
  execFileSync('npm', ['run', 'lint', '--silent'], { cwd: root, stdio: 'pipe' });
});

test('mount counts clicks', () => {
  const listeners = {};
  const el = { textContent: '0', addEventListener: (type, fn) => (listeners[type] = fn) };
  global.document = { getElementById: () => el };
  const { mount } = require('../src/client');
  mount('counter');
  listeners.click();
  listeners.click();
  assert.equal(el.textContent, '2');
});
