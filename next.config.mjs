/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.deriv.com",
      },
    ],
  },

  // Allow WebSocket connections to Deriv servers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' wss://ws.derivws.com wss://blue.derivws.com wss://green.derivws.com wss://api.derivws.com https://oauth.deriv.com https://api.deriv.com https://api.derivws.com https://auth.deriv.com",
              "frame-src 'self' https://app.deriv.com https://smarttrader.deriv.com",
            ].join("; "),
          },
        ],
      },
    ]
  },

  // Empty turbopack key tells Next.js 16 we are intentionally using Turbopack
  // and that the webpack block below is only for production/CI builds.
  turbopack: {},

  // Keep webpack config for production builds / CI that explicitly use --webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      }
    }
    return config
  },
}

export default nextConfig
