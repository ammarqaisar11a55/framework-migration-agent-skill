const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { main } = require('../bin/greet');
const { greet, greetLong } = require('../src/greeter');

test('the greeting comes from .env, loaded before the settings module', () => {
  assert.equal(greet('Ada'), 'Hello, Ada!');
});

test('greetLong loads the decorations on demand', () => {
  assert.equal(greetLong('Ada'), '*** Hello, Ada! ***');
});

test('main formats the greeting for the command line', () => {
  assert.equal(main(['node', 'greet', 'Grace']), 'Hello, Grace!');
});

test('the CLI prints when run directly', () => {
  const bin = require('../package.json').bin.greet;
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', bin), 'Linus'], { encoding: 'utf8' });
  assert.equal(out, 'Hello, Linus!\n');
});
