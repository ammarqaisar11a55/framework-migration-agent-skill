import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { start } from './helpers';

const { server, base } = start();
after(() => server.close());

test('logger counts every request', async () => {
  const first = await fetch(`${base}/health`);
  const second = await fetch(`${base}/health`);
  assert.equal(first.status, 200);
  assert.equal(Number(second.headers.get('x-request-count')), Number(first.headers.get('x-request-count')) + 1);
});

test('GET /profile rejects a missing API key', async () => {
  const res = await fetch(`${base}/profile`);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'Invalid API key' });
});

test('GET /profile rejects an unknown API key', async () => {
  const res = await fetch(`${base}/profile`, { headers: { 'x-api-key': 'nope' } });
  assert.equal(res.status, 401);
});

test('GET /profile runs the whole chain for a valid key', async () => {
  const res = await fetch(`${base}/profile`, { headers: { 'x-api-key': 'key-grace' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { user: { name: 'Grace' } });
});
