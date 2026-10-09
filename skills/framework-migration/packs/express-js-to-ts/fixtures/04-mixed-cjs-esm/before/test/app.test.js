const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

const { server, base } = start();
after(() => server.close());

test('GET /health reports ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
});

test('CommonJS config is readable from CommonJS', async () => {
  const res = await fetch(`${base}/greeting`);
  assert.deepEqual(await res.json(), { greeting: 'Hello' });
});

test('the ES module is loaded with import() and sees the CommonJS config', async () => {
  const res = await fetch(`${base}/greet/Ada`);
  assert.deepEqual(await res.json(), { message: 'Hello, Ada!', version: '1.2.3' });
});

test('the ES module uses the default from the CommonJS config', async () => {
  const res = await fetch(`${base}/greet`);
  assert.deepEqual(await res.json(), { message: 'Hello, world!' });
});
