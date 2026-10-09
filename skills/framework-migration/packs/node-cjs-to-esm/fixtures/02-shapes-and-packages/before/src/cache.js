// Remembers results for a fixed number of milliseconds.
module.exports = class Cache {
  constructor(ttl) {
    this.ttl = ttl;
    this.entries = new Map();
  }

  get(key, now = Date.now()) {
    const entry = this.entries.get(key);
    return entry && entry.expires > now ? entry.value : undefined;
  }

  set(key, value, now = Date.now()) {
    this.entries.set(key, { value, expires: now + this.ttl });
  }
};
