const request = require('supertest');
const app = require('../../src/app');
const { resetDatabase, closeDatabase, isDatabaseReachable } = require('../helpers');

describe('POST /api/v1/auth (integration)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn(
        '\n[SKIPPED] Auth integration tests: no reachable database at DATABASE_URL. ' +
          'See tests/README.md to set one up.\n'
      );
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await resetDatabase();
  });

  afterAll(async () => {
    if (dbAvailable) await closeDatabase();
  });

  // Skips an individual test (rather than failing it) when no DB is
  // reachable — checked at run time since dbAvailable is only known
  // after beforeAll, unlike describe.skip which needs to know upfront.
  const itIfDb = (name, fn) => it(name, async () => (dbAvailable ? fn() : undefined));

  const validRegistration = {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'correct-horse-battery',
    role: 'advertiser',
  };

  itIfDb('registers a new advertiser and creates a wallet for them', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(validRegistration.email);
    expect(res.body.data.role).toBe('advertiser');
  });

  itIfDb('rejects registering the same email twice', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(409);
  });

  itIfDb('rejects registration with an invalid role (admin cannot self-register)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'other@example.com', role: 'admin' });

    expect(res.status).toBe(400);
  });

  itIfDb('logs in with correct credentials and returns an access token', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: validRegistration.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined(); // refresh token cookie
  });

  itIfDb('rejects login with the wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: 'totally-wrong' });

    expect(res.status).toBe(401);
  });

  itIfDb('locks the account after 5 failed login attempts', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validRegistration.email, password: 'wrong-password' });
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: validRegistration.password }); // even correct password now

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/locked/i);
  });

  itIfDb('protects /users/me and rejects requests with no token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  itIfDb('allows access to /users/me with a valid access token', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: validRegistration.password });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(validRegistration.email);
  });
});
