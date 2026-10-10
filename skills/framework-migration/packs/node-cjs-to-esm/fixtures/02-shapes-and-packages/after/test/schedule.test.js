import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, supported, run } from '../src/schedule.js';
import Cache from '../src/cache.js';

test('plan uses the configured timeout and retries', () => {
  assert.deepEqual(plan('backup'), { job: 'backup', timeoutMs: 2000, retries: 3 });
});

test('supported checks a version against the configured range', () => {
  assert.equal(supported('20.19.0'), true);
  assert.equal(supported('16.20.0'), false);
});

test('run retries until the task succeeds, then caches the result', async () => {
  let calls = 0;
  const result = await run('flaky', async (attempt) => {
    calls += 1;
    if (attempt < 2) throw new Error('not yet');
    return 'done';
  });
  assert.equal(result, 'done');
  assert.equal(calls, 3);
  assert.equal(await run('flaky', async () => 'other'), 'done');
});

test('Cache expires entries', () => {
  const cache = new Cache(10);
  cache.set('a', 1, 0);
  assert.equal(cache.get('a', 5), 1);
  assert.equal(cache.get('a', 11), undefined);
});
