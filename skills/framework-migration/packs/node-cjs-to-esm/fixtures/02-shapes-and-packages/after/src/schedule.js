import ms from 'ms';
import semverModule from 'semver';
const { satisfies } = semverModule;
import { promisify } from 'util';
import configModule from './config.js';
const { timeout, retries, minNode } = configModule;
import Cache from './cache.js';

const sleep = promisify(setTimeout);
const cache = new Cache(ms('1m'));

function plan(job) {
  return { job, timeoutMs: ms(timeout), retries };
}

function supported(version) {
  return satisfies(version, minNode);
}

async function run(job, task) {
  const cached = cache.get(job);
  if (cached !== undefined) return cached;
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await task(attempt);
      cache.set(job, result);
      return result;
    } catch (error) {
      lastError = error;
      await sleep(1);
    }
  }
  throw lastError;
}

export { plan, supported, run };
