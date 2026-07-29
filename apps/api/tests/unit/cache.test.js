const cache = require('../../src/utils/cache');

describe('in-memory TTL cache', () => {
  it('returns undefined for a key that was never set', () => {
    expect(cache.get('nonexistent-key')).toBeUndefined();
  });

  it('returns the stored value before expiry', () => {
    cache.set('k1', { hello: 'world' }, 5000);
    expect(cache.get('k1')).toEqual({ hello: 'world' });
  });

  it('returns undefined after the TTL has elapsed', async () => {
    cache.set('k2', 'value', 10); // 10ms TTL
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(cache.get('k2')).toBeUndefined();
  });

  it('del() removes a key immediately regardless of TTL', () => {
    cache.set('k3', 'value', 60000);
    cache.del('k3');
    expect(cache.get('k3')).toBeUndefined();
  });

  it('stores falsy-but-defined values correctly (e.g. null for a negative cache hit)', () => {
    cache.set('k4', null, 5000);
    expect(cache.get('k4')).toBeNull(); // must be null, not undefined — undefined means "not cached"
  });
});
