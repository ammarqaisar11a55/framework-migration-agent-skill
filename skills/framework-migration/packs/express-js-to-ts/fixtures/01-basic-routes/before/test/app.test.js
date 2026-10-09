const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, base } = start();
after(() => server.close());

test('GET /health reports ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /users lists users', async () => {
  const res = await fetch(`${base}/users`);
  assert.deepEqual(await res.json(), [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
  ]);
});

test('GET /users/:id returns one user', async () => {
  const res = await fetch(`${base}/users/2`);
  assert.deepEqual(await res.json(), { id: 2, name: 'Grace' });
});

test('GET /users/:id returns 404 for an unknown user', async () => {
  const res = await fetch(`${base}/users/99`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'User not found' });
});

test('POST /users creates a user', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Linus' }),
  });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { id: 3, name: 'Linus' });
});
