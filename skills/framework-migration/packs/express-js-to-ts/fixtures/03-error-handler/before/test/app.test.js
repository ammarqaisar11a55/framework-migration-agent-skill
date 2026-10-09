const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, base } = start();
after(() => server.close());

test('GET /health reports ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
});

test('errors with a status keep their status and message', async () => {
  const res = await fetch(`${base}/teapot`);
  assert.equal(res.status, 418);
  assert.deepEqual(await res.json(), { error: "I'm a teapot" });
});

test('thrown errors become a 500 without leaking details', async () => {
  const res = await fetch(`${base}/boom`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Internal Server Error' });
});

test('errors passed to next() from async handlers become a 500', async () => {
  const res = await fetch(`${base}/async-boom`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Internal Server Error' });
});

test('unknown routes return 404 as JSON', async () => {
  const res = await fetch(`${base}/missing`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'No route for GET /missing' });
});
