import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import greetModule from '../bin/greet.cjs';
const { main } = greetModule;
import { greet, greetLong } from '../src/greeter.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

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
  const out = execFileSync(process.execPath, [path.join(import.meta.dirname, '..', bin), 'Linus'], { encoding: 'utf8' });
  assert.equal(out, 'Hello, Linus!\n');
});
