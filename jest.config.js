module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  // Integration tests hit a real Postgres instance (see tests/README.md) —
  // runInBand in package.json's test script keeps them from racing each
  // other over shared tables.
  testTimeout: 15000,
  verbose: true,
};
