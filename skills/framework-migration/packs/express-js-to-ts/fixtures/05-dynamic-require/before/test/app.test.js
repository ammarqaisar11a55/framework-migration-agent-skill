const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, base } = start();
after(() => server.close());

test('GET /health reports ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
});

test('plugins are discovered from the plugins directory', async () => {
  const res = await fetch(`${base}/plugins`);
  assert.deepEqual(await res.json(), ['reverse', 'shout']);
});

test('a plugin loaded by name keeps its CommonJS shape', async () => {
  const res = await fetch(`${base}/apply/shout/hello`);
  assert.deepEqual(await res.json(), { result: 'HELLO' });
});

test('another plugin loaded by name', async () => {
  const res = await fetch(`${base}/apply/reverse/abc`);
  assert.deepEqual(await res.json(), { result: 'cba' });
});

test('an unknown plugin is a 404', async () => {
  const res = await fetch(`${base}/apply/nope/abc`);
  assert.equal(res.status, 404);
});

test('a require() inside a handler still works', async () => {
  const res = await fetch(`${base}/debug`);
  assert.equal(await res.text(), "[ 'reverse', 'shout' ]");
});
