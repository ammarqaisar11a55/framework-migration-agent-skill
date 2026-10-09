const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, request } = start();
after(() => server.close());

test('static files are served', async () => {
  const res = await request('GET', '/hello.txt');
  assert.equal(res.status, 200);
  assert.equal(res.body, 'hello from static\n');
});

test('health route from configuration', async () => {
  assert.deepEqual(JSON.parse((await request('GET', '/healthz')).body), { ok: true });
});

test('echo routes registered by method name', async () => {
  assert.deepEqual(JSON.parse((await request('GET', '/echo')).body), { method: 'GET' });
  assert.deepEqual(JSON.parse((await request('POST', '/echo')).body), { method: 'POST' });
});

test('logout clears the session cookie', async () => {
  const res = await request('POST', '/logout');
  assert.equal(res.status, 200);
  const cookie = res.headers['set-cookie'][0];
  assert.match(cookie, /^session=;/);
  const expires = Date.parse(/Expires=([^;]+)/.exec(cookie)[1]);
  assert.ok(expires <= Date.now(), `cookie expires in the past: ${cookie}`);
});
