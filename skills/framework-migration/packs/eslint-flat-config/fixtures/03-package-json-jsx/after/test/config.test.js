const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ESLint } = require('eslint');

const root = path.join(__dirname, '..');

test('JSX is parsed and the configured rules apply to .jsx files', async () => {
  const eslint = new ESLint({ cwd: root, ignore: false });
  const [result] = await eslint.lintFiles([path.join(root, 'samples/console.jsx')]);
  assert.deepEqual(result.messages.map((m) => m.ruleId), ['no-console']);
});

test('the lint script covers .js and .jsx sources', () => {
  const output = execFileSync('npm', ['run', 'lint', '--silent', '--', '--format', 'json'], { cwd: root, encoding: 'utf8' });
  const files = JSON.parse(output).map((r) => path.relative(root, r.filePath)).sort();
  assert.deepEqual(files, ['src/h.js', 'src/view.jsx']);
});

test('h builds elements', () => {
  const { h } = require('../src/h');
  assert.deepEqual(h('b', null, 'x'), { tag: 'b', props: {}, children: ['x'] });
});
