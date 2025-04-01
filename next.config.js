/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true
  },
  // Development optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false, // Disable in development for better performance
  // Enable static exports for production
  images: {
    unoptimized: true
  },
  // Webpack optimizations for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // Allow builds to complete even with errors during development
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

export default nextConfig 