const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, request } = start();
after(() => server.close());

test('nested query parameters are parsed into objects', async () => {
  const res = await request('GET', '/accounts?filter[role]=admin&filter[name]=Ada');
  assert.deepEqual(JSON.parse(res.body), { filter: { role: 'admin', name: 'Ada' }, matches: [{ name: 'Ada', role: 'admin' }] });
});

test('nested form fields are parsed into objects', async () => {
  const res = await request('POST', '/accounts', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'user[name]=Grace&user[role]=editor',
  });
  assert.equal(res.status, 201);
  assert.deepEqual(JSON.parse(res.body), { name: 'Grace', role: 'editor' });
});

test('async handlers pass errors on to the error handler', async () => {
  assert.deepEqual(JSON.parse((await request('GET', '/accounts/grace')).body), { name: 'Grace', role: 'editor' });
  const res = await request('GET', '/accounts/linus');
  assert.equal(res.status, 404);
  assert.deepEqual(JSON.parse(res.body), { error: 'No account linus' });
});
