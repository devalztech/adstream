/**
 * Fixed option lists for campaign targeting UI. These are just form
 * choices (what the advertiser can pick from), not data fetched from
 * the backend — the backend accepts any 2-letter country code and any
 * free-text category string (see campaigns.schema.js), so this list is
 * a sensible default set, not an authoritative source of truth.
 */
export const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'IN', label: 'India' },
];

export const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
];

export const CATEGORY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'news', label: 'News' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
];

export const OS_OPTIONS = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
];

export const AD_FORMAT_OPTIONS = [
  { value: 'banner', label: 'Banner' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'native', label: 'Native' },
  { value: 'responsive', label: 'Responsive' },
  { value: 'square', label: 'Square' },
  { value: 'sticky', label: 'Sticky' },
];
