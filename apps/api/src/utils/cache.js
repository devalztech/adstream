/**
 * Minimal in-process TTL cache — no Redis dependency, deliberately, since
 * this is a single-instance-friendly optimization for data that changes
 * rarely (ad unit config) and where a few seconds of staleness is
 * harmless (an ad unit paused mid-second still serves a handful of extra
 * requests, which is an acceptable trade for skipping a DB round-trip on
 * every single ad request).
 *
 * If AdStream scales to multiple server instances behind a load balancer,
 * swap this for a real Redis cache with the same get/set(ttl) shape —
 * every caller in ad-serving.service.js goes through this module, so
 * that's a one-file change, not a rewrite.
 */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

// Periodic sweep so paused/never-read entries don't accumulate forever
// in long-running processes. Unref'd so it never keeps the process alive.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000).unref();

module.exports = { get, set, del };
