const request = require('supertest');
const app = require('../../src/app');
const walletsService = require('../../src/modules/wallets/wallets.service');
const { resetDatabase, closeDatabase, isDatabaseReachable, pool } = require('../helpers');

async function setupActiveCampaignWithAdUnit({ targetCountries = [] } = {}) {
  // Advertiser + funded wallet + active campaign
  await request(app)
    .post('/api/v1/auth/register')
    .send({ fullName: 'Adv', email: 'adv@example.com', password: 'password123', role: 'advertiser' });
  const advLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'adv@example.com', password: 'password123' });
  const advToken = advLogin.body.data.accessToken;
  const advId = (await pool.query('SELECT id FROM users WHERE email = $1', ['adv@example.com'])).rows[0].id;
  await walletsService.recordTransaction(advId, { type: 'deposit', amount: 1000000 });

  const campaignRes = await request(app)
    .post('/api/v1/campaigns')
    .set('Authorization', `Bearer ${advToken}`)
    .send({
      name: 'Test Campaign',
      totalBudget: 500000,
      bidAmount: 1000,
      startDate: new Date(Date.now() - 86400000).toISOString(),
      destinationUrl: 'https://example.com',
      targetCountries,
      creatives: [{ type: 'text', headline: 'Ad headline', bodyText: 'Ad body' }],
    });
  const campaignId = campaignRes.body.data.id;

  // Manually activate — approval is an admin action (Phase 10), tested separately.
  await pool.query(`UPDATE campaigns SET status = 'active' WHERE id = $1`, [campaignId]);

  // Publisher + verified website + active ad unit
  await request(app)
    .post('/api/v1/auth/register')
    .send({ fullName: 'Pub', email: 'pub-serve@example.com', password: 'password123', role: 'publisher' });
  const pubLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'pub-serve@example.com', password: 'password123' });
  const pubToken = pubLogin.body.data.accessToken;

  const siteRes = await request(app)
    .post('/api/v1/websites')
    .set('Authorization', `Bearer ${pubToken}`)
    .send({ name: 'Test Site', domain: 'testsite.example' });
  const websiteId = siteRes.body.data.id;

  // Manually mark verified — the real flow needs live domain ownership,
  // which integration tests can't exercise without a real reachable domain.
  await pool.query(`UPDATE websites SET status = 'verified', verified_at = now() WHERE id = $1`, [websiteId]);

  const unitRes = await request(app)
    .post(`/api/v1/websites/${websiteId}/ad-units`)
    .set('Authorization', `Bearer ${pubToken}`)
    .send({ name: 'Native slot', format: 'native' });

  return { embedKey: unitRes.body.data.embedKey, campaignId };
}

describe('ad-serving engine (integration)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('\n[SKIPPED] Ad-serving integration tests: no reachable database. See tests/README.md.\n');
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

  itIfDb('serves a matching ad for an active campaign and verified ad unit', async () => {
    const { embedKey } = await setupActiveCampaignWithAdUnit();

    const res = await request(app).get('/ad/serve').query({ unit: embedKey });

    expect(res.status).toBe(200);
    expect(res.body.data.creative.headline).toBe('Ad headline');
    expect(res.body.data.impressionId).toBeDefined();
  });

  itIfDb('returns 204 for an unknown embed key', async () => {
    const res = await request(app).get('/ad/serve').query({ unit: 'does-not-exist' });
    expect(res.status).toBe(204);
  });

  itIfDb('respects country targeting — does not match outside the target list', async () => {
    const { embedKey } = await setupActiveCampaignWithAdUnit({ targetCountries: ['US'] });

    const res = await request(app).get('/ad/serve').query({ unit: embedKey, country: 'NG' });
    expect(res.status).toBe(204); // no match, wrong country
  });

  itIfDb('matches when the request country is in the target list', async () => {
    const { embedKey } = await setupActiveCampaignWithAdUnit({ targetCountries: ['NG', 'US'] });

    const res = await request(app).get('/ad/serve').query({ unit: embedKey, country: 'NG' });
    expect(res.status).toBe(200);
  });

  itIfDb('debits the campaign spent_amount on each impression', async () => {
    const { embedKey, campaignId } = await setupActiveCampaignWithAdUnit();

    await request(app).get('/ad/serve').query({ unit: embedKey });
    await request(app).get('/ad/serve').query({ unit: embedKey });

    const campaign = await pool.query('SELECT spent_amount FROM campaigns WHERE id = $1', [campaignId]);
    expect(parseInt(campaign.rows[0].spent_amount, 10)).toBe(2000); // 2 impressions x bid_amount 1000
  });

  itIfDb('records a click and redirects to the destination URL', async () => {
    const { embedKey } = await setupActiveCampaignWithAdUnit();

    const serveRes = await request(app).get('/ad/serve').query({ unit: embedKey });
    const impressionId = serveRes.body.data.impressionId;

    const clickRes = await request(app).get('/ad/click').query({ imp: impressionId });

    expect(clickRes.status).toBe(302);
    expect(clickRes.headers.location).toBe('https://example.com');

    const clickCount = await pool.query('SELECT COUNT(*) FROM clicks WHERE impression_id = $1', [impressionId]);
    expect(parseInt(clickCount.rows[0].count, 10)).toBe(1);
  });
});
