/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    domains: [],
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/assets/hyacinth-:variant.bin.gz',
        headers: [
          { key: 'Content-Type', value: 'application/octet-stream' },
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
