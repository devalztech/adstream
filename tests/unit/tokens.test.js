const {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashToken,
} = require('../../src/utils/tokens');

describe('access tokens', () => {
  it('signs a token that verifies back to the same user id and role', () => {
    const token = signAccessToken({ id: 'user-123', role: 'advertiser' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('advertiser');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ id: 'user-123', role: 'advertiser' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('returns a raw value and a hash that are different from each other', () => {
    const { raw, hash } = generateRefreshToken();
    expect(raw).not.toBe(hash);
    expect(raw.length).toBeGreaterThan(0);
    expect(hash.length).toBe(64); // sha256 hex digest length
  });

  it('hashing the same raw value twice produces the same hash (deterministic lookup)', () => {
    const { raw, hash } = generateRefreshToken();
    expect(hashToken(raw)).toBe(hash);
  });

  it('generates unique tokens on each call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.raw).not.toBe(b.raw);
  });
});

describe('verification tokens', () => {
  it('returns a raw/hash pair suitable for email verification or password reset links', () => {
    const { raw, hash } = generateVerificationToken();
    expect(hashToken(raw)).toBe(hash);
  });
});
