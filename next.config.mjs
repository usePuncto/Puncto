import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Suprime o warning do webpack ao analisar import() dinâmicos no next-intl
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        message: /Parsing of .* for build dependencies failed at 'import\(t\)'/,
      },
    ];
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'storage.googleapis.com' }
    ]
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default withNextIntl(nextConfig);