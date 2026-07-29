/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal, self-contained server bundle —
  // the right choice for a Docker deploy on Render/Koyeb (matches the
  // backend's own Dockerfile-first deployment approach).
  output: 'standalone',
  images: {
    // Campaign creatives are hosted wherever the advertiser's assetUrl
    // points (no fixed upload provider yet — see INTEGRATION_MAP.md),
    // so remotePatterns can't be a fixed known list. Using unoptimized
    // for user-supplied creative images avoids Next Image trying (and
    // failing) to fetch-and-optimize arbitrary external hosts at build
    // or request time.
    unoptimized: true,
  },
};

module.exports = nextConfig;
