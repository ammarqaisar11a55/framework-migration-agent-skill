const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, request } = start();
after(() => server.close());

test('GET /notes/:id returns a note', async () => {
  const res = await request('GET', '/notes/1');
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { id: '1', text: 'first note' });
});

test('GET /notes/:id answers 404 with the status text', async () => {
  const res = await request('GET', '/notes/99');
  assert.equal(res.status, 404);
  assert.equal(res.body, 'Not Found');
});

test('POST /notes creates a note with status 201 and clears the cached count', async () => {
  assert.deepEqual(JSON.parse((await request('GET', '/note-count')).body), { count: 1 });
  const res = await request('POST', '/notes', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'second' }) });
  assert.equal(res.status, 201);
  assert.deepEqual(JSON.parse(res.body), { id: '2' });
  assert.deepEqual(JSON.parse((await request('GET', '/note-count')).body), { count: 2 });
});

test('DELETE /notes/:id answers 204', async () => {
  const res = await request('DELETE', '/notes/2');
  assert.equal(res.status, 204);
  assert.equal((await request('GET', '/notes/2')).status, 404);
});

test('GET /old-notes redirects permanently', async () => {
  const res = await request('GET', '/old-notes');
  assert.equal(res.status, 301);
  assert.equal(res.headers.location, '/notes/1');
});

test('GET /go-back redirects to the referrer, or to / without one', async () => {
  assert.equal((await request('GET', '/go-back', { headers: { referer: '/notes/1' } })).headers.location, '/notes/1');
  assert.equal((await request('GET', '/go-back')).headers.location, '/');
});

test('GET /readme sends the file', async () => {
  const res = await request('GET', '/readme');
  assert.equal(res.status, 200);
  assert.equal(res.body, 'Read me first.\n');
});

test('GET /language negotiates the language', async () => {
  assert.equal((await request('GET', '/language', { headers: { 'accept-language': 'fr' } })).body, 'fr');
  assert.equal((await request('GET', '/language', { headers: { 'accept-language': 'de' } })).body, 'none');
});
