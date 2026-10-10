// A tiny cache with a Redis-like API. Its del() is not Express's and must not be renamed.
const entries = new Map();

function get(key) {
  return entries.get(key);
}

function set(key, value) {
  entries.set(key, value);
}

function del(key) {
  entries.delete(key);
}

module.exports = { get, set, del };
