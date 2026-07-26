const { hashPassword, comparePassword } = require('../../src/utils/password');

describe('password utility', () => {
  it('hashes a password to a bcrypt string, not plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toBe('correct horse battery staple');
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('my-secret-pw');
    await expect(comparePassword('my-secret-pw', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against a hash', async () => {
    const hash = await hashPassword('my-secret-pw');
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});
