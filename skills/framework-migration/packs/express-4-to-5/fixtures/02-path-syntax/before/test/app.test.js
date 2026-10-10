const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, request } = start();
after(() => server.close());

const json = async (path, method = 'GET') => {
  const res = await request(method, path);
  return { status: res.status, body: JSON.parse(res.body) };
};

test('optional parameter: list and single user', async () => {
  assert.deepEqual(await json('/users'), { status: 200, body: ['Ada', 'Grace'] });
  assert.deepEqual(await json('/users/'), { status: 200, body: ['Ada', 'Grace'] });
  assert.deepEqual(await json('/users/2'), { status: 200, body: { name: 'Grace' } });
});

test('optional format suffix', async () => {
  assert.deepEqual(await json('/reports/q1'), { status: 200, body: { name: 'q1', format: 'html' } });
  assert.deepEqual(await json('/reports/q1.csv'), { status: 200, body: { name: 'q1', format: 'csv' } });
});

test('wildcard below a router mount', async () => {
  assert.deepEqual(await json('/assets'), { status: 200, body: { files: ['logo.svg', 'css/site.css'] } });
  assert.deepEqual(await json('/assets/css/site.css'), { status: 200, body: { asset: 'css/site.css' } });
  assert.deepEqual(await json('/assets/missing.png'), { status: 404, body: { error: 'No asset missing.png' } });
});

test('catch-all route answers 404 for any method and path', async () => {
  assert.deepEqual(await json('/nowhere/at/all'), { status: 404, body: { error: 'No route for GET /nowhere/at/all' } });
  assert.deepEqual(await json('/users/1/extra', 'POST'), { status: 404, body: { error: 'No route for POST /users/1/extra' } });
});
