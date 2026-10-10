const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');

const root = path.join(__dirname, '..');

async function ruleIds(file) {
  const eslint = new ESLint({ cwd: root, ignore: false });
  const [result] = await eslint.lintFiles([path.join(root, file)]);
  return [...new Set(result.messages.map((m) => m.ruleId))].sort();
}

test('the recommended rules apply', async () => {
  assert.deepEqual(await ruleIds('samples/unused.js'), ['no-unused-vars']);
});

test('the prettier config still turns off formatting-sensitive rules', async () => {
  assert.deepEqual(await ruleIds('samples/multiline.js'), []);
});

test('price formats cents', () => {
  const { price } = require('../src/format');
  assert.equal(price(1999), '$19.99');
});
