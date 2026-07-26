const request = require('supertest');
const app = require('../../src/app');
const { resetDatabase, closeDatabase, isDatabaseReachable } = require('../helpers');

async function registerAndLogin(email) {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ fullName: 'Advertiser', email, password: 'password123', role: 'advertiser' });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data.accessToken;
}

const validCampaign = {
  name: 'Test Campaign',
  totalBudget: 100000,
  bidAmount: 500,
  startDate: '2026-08-01T00:00:00.000Z',
  destinationUrl: 'https://example.com',
  creatives: [{ type: 'text', headline: 'Buy now' }],
};

describe('campaign ownership isolation (integration)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('\n[SKIPPED] Campaign integration tests: no reachable database. See tests/README.md.\n');
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await resetDatabase();
  });

  afterAll(async () => {
    if (dbAvailable) await closeDatabase();
  });

  const itIfDb = (name, fn) => it(name, async () => (dbAvailable ? fn() : undefined));

  itIfDb('lets an advertiser create and read their own campaign', async () => {
    const token = await registerAndLogin('owner@example.com');

    const createRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send(validCampaign);

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('draft');

    const getRes = await request(app)
      .get(`/api/v1/campaigns/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Test Campaign');
  });

  itIfDb("blocks a different advertiser from reading someone else's campaign", async () => {
    const ownerToken = await registerAndLogin('owner2@example.com');
    const strangerToken = await registerAndLogin('stranger@example.com');

    const createRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validCampaign);

    const getRes = await request(app)
      .get(`/api/v1/campaigns/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(getRes.status).toBe(403);
  });

  itIfDb('blocks a publisher from accessing the campaigns module entirely', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Pub', email: 'pub@example.com', password: 'password123', role: 'publisher' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pub@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send(validCampaign);

    expect(res.status).toBe(403);
  });

  itIfDb('prevents editing a campaign once it leaves draft status', async () => {
    const token = await registerAndLogin('owner3@example.com');

    const createRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send(validCampaign);
    const campaignId = createRes.body.data.id;

    await request(app)
      .post(`/api/v1/campaigns/${campaignId}/submit`)
      .set('Authorization', `Bearer ${token}`);

    const editRes = await request(app)
      .patch(`/api/v1/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' });

    expect(editRes.status).toBe(400);
  });

  itIfDb('enforces valid status transitions (cannot pause a draft campaign)', async () => {
    const token = await registerAndLogin('owner4@example.com');

    const createRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send(validCampaign);

    const pauseRes = await request(app)
      .post(`/api/v1/campaigns/${createRes.body.data.id}/pause`)
      .set('Authorization', `Bearer ${token}`);

    expect(pauseRes.status).toBe(400);
  });
});
