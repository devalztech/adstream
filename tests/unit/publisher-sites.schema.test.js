const { createWebsiteSchema, createAdUnitSchema } = require('../../src/modules/publisher-sites/publisher-sites.schema');

describe('createWebsiteSchema domain normalization', () => {
  it.each([
    ['https://example.com', 'example.com'],
    ['http://www.example.com', 'example.com'],
    ['www.example.com', 'example.com'],
    ['example.com/some/path', 'example.com'],
    ['EXAMPLE.COM', 'example.com'],
    ['  example.com  ', 'example.com'],
  ])('normalizes %s to %s', (input, expected) => {
    const result = createWebsiteSchema.parse({ name: 'Test Site', domain: input });
    expect(result.domain).toBe(expected);
  });

  it('rejects an invalid domain', () => {
    expect(() => createWebsiteSchema.parse({ name: 'Test', domain: 'not a domain' })).toThrow();
  });

  it('rejects a domain with no TLD', () => {
    expect(() => createWebsiteSchema.parse({ name: 'Test', domain: 'localhost' })).toThrow();
  });

  it('defaults language to en and verificationMethod to meta_tag', () => {
    const result = createWebsiteSchema.parse({ name: 'Test', domain: 'example.com' });
    expect(result.language).toBe('en');
    expect(result.verificationMethod).toBe('meta_tag');
  });
});

describe('createAdUnitSchema', () => {
  it('accepts a valid banner ad unit', () => {
    const result = createAdUnitSchema.parse({ name: 'Sidebar', format: 'banner', width: 300, height: 250 });
    expect(result.format).toBe('banner');
  });

  it('rejects an unknown format', () => {
    expect(() => createAdUnitSchema.parse({ name: 'Bad', format: 'popup' })).toThrow();
  });

  it('allows omitting width/height (e.g. for native/responsive formats)', () => {
    expect(() => createAdUnitSchema.parse({ name: 'Native slot', format: 'native' })).not.toThrow();
  });
});
