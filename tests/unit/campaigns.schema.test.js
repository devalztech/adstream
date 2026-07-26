const { createCampaignSchema } = require('../../src/modules/campaigns/campaigns.schema');

function validBase(overrides = {}) {
  return {
    name: 'Summer Sale',
    totalBudget: 100000,
    bidAmount: 500,
    startDate: '2026-08-01T00:00:00.000Z',
    destinationUrl: 'https://example.com/landing',
    creatives: [{ type: 'text', headline: 'Big Summer Sale' }],
    ...overrides,
  };
}

describe('createCampaignSchema', () => {
  it('accepts a minimal valid campaign', () => {
    expect(() => createCampaignSchema.parse(validBase())).not.toThrow();
  });

  it('rejects a daily budget that exceeds the total budget', () => {
    expect(() =>
      createCampaignSchema.parse(validBase({ totalBudget: 1000, dailyBudget: 5000 }))
    ).toThrow();
  });

  it('accepts a daily budget equal to the total budget', () => {
    expect(() =>
      createCampaignSchema.parse(validBase({ totalBudget: 1000, dailyBudget: 1000 }))
    ).not.toThrow();
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      createCampaignSchema.parse(
        validBase({ startDate: '2026-08-10T00:00:00.000Z', endDate: '2026-08-01T00:00:00.000Z' })
      )
    ).toThrow();
  });

  it('rejects a negative or zero budget', () => {
    expect(() => createCampaignSchema.parse(validBase({ totalBudget: 0 }))).toThrow();
    expect(() => createCampaignSchema.parse(validBase({ totalBudget: -500 }))).toThrow();
  });

  it('requires at least one creative', () => {
    expect(() => createCampaignSchema.parse(validBase({ creatives: [] }))).toThrow();
  });

  it('rejects a text creative with no headline', () => {
    expect(() =>
      createCampaignSchema.parse(validBase({ creatives: [{ type: 'text' }] }))
    ).toThrow();
  });

  it('rejects a banner creative with no assetUrl', () => {
    expect(() =>
      createCampaignSchema.parse(validBase({ creatives: [{ type: 'banner' }] }))
    ).toThrow();
  });

  it('allows a native creative with neither headline nor assetUrl', () => {
    expect(() =>
      createCampaignSchema.parse(validBase({ creatives: [{ type: 'native' }] }))
    ).not.toThrow();
  });

  it('defaults currency to NGN', () => {
    const result = createCampaignSchema.parse(validBase());
    expect(result.currency).toBe('NGN');
  });
});
