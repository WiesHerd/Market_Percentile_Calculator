/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '',
  images: {
    unoptimized: true,
  },
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '',
}

export default nextConfig;
