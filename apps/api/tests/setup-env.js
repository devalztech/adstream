// Loaded by Jest (see jest.config.js: setupFiles) before any test file
// runs. Provides safe defaults so unit tests that don't touch the real
// DB can still import config/env.js without crashing on missing vars.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/adstream_test';
process.env.DATABASE_SSL = 'false';
process.env.LOG_LEVEL = 'error'; // keep test output focused on failures, not request logs
