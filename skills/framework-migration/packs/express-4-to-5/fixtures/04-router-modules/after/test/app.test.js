const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, request } = start();
after(() => server.close());

test('GET /api/v1/items lists items; /items/:id returns one', async () => {
  assert.deepEqual(JSON.parse((await request('GET', '/api/v1/items')).body).map((i) => i.name), ['kettle', 'teapot']);
  const res = await request('GET', '/api/v1/items/2');
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { id: '2', name: 'teapot' });
  assert.equal((await request('GET', '/api/v1/items/9')).status, 404);
});

test('POST and DELETE /api/v1/items', async () => {
  const created = await request('POST', '/api/v1/items', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'mug' }) });
  assert.equal(created.status, 201);
  assert.deepEqual(JSON.parse(created.body), { id: '3', name: 'mug' });
  assert.equal((await request('DELETE', '/api/v1/items/3')).status, 204);
  assert.equal((await request('DELETE', '/api/v1/items/3')).status, 404);
});

test('legacy URLs redirect', async () => {
  const moved = await request('GET', '/legacy/items/1');
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.location, '/api/v1/items/1');
  assert.equal((await request('GET', '/legacy/home', { headers: { referer: '/api/v1/items' } })).headers.location, '/api/v1/items');
});
