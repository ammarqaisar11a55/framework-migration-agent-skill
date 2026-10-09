import test from 'node:test';
import assert from 'node:assert/strict';
import bootModule from '../src/boot.cjs';
const { mode, plugins, reloadMode } = bootModule;
import { words } from '../src/words.js';

test('the mode is set before the mode module loads', () => {
  assert.equal(mode, 'test');
});

test('plugins are discovered and loaded from their directory', () => {
  assert.deepEqual(plugins.map((p) => p.name), ['reverse', 'shout']);
  assert.equal(plugins[1].apply('hi'), 'HI');
});

test('reloadMode reads the environment again', () => {
  process.env.APP_MODE = 'staging';
  assert.equal(reloadMode(), 'staging');
});

test('words splits text', () => {
  assert.deepEqual(words(' a b  c '), ['a', 'b', 'c']);
});
