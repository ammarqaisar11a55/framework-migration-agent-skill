import test from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../src/index.js';
import slugify from '../src/slugify.js';

test('slugify joins words with the configured separator', () => {
  assert.equal(lib.slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify, lib.slugify);
});

test('titleCase and wordCount', () => {
  assert.equal(lib.titleCase('ada lovelace'), 'Ada Lovelace');
  assert.equal(lib.wordCount('  one two  three '), 3);
});

test('render reads a template next to the module', () => {
  assert.equal(lib.render('greeting', { name: 'Grace' }), 'Hello, Grace!\n');
});

test('defaults come from JSON', () => {
  assert.deepEqual(lib.defaults, { separator: '-', locale: 'en' });
});
