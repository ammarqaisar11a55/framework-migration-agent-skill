const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');

const root = path.join(__dirname, '..');

// Rule ids reported for one file, linted even if the configuration ignores it.
async function ruleIds(file) {
  const eslint = new ESLint({ cwd: root, ignore: false });
  const [result] = await eslint.lintFiles([path.join(root, file)]);
  return [...new Set(result.messages.map((m) => m.ruleId))].sort();
}

async function ignored(file) {
  return new ESLint({ cwd: root }).isPathIgnored(path.join(root, file));
}

test('the configuration reports eqeqeq and unused variables', async () => {
  assert.deepEqual(await ruleIds('samples/bad.js'), ['eqeqeq', 'no-unused-vars']);
});

test('the override for test files applies to test files only', async () => {
  assert.deepEqual(await ruleIds('test/samples/unused-expression.js'), ['no-unused-expressions']);
  assert.deepEqual(await ruleIds('samples/unused-expression.js'), []);
});

test('samples are ignored, sources are not', async () => {
  assert.equal(await ignored('samples/bad.js'), true);
  assert.equal(await ignored('test/samples/unused-expression.js'), true);
  assert.equal(await ignored('src/index.js'), false);
});

test('total sums numbers', () => {
  const { total } = require('../src');
  assert.equal(total([1, 'a', 2]), 3);
});
