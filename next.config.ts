/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Market_Percentile_Calculator',
  images: {
    unoptimized: true,
  },
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
}

export default nextConfig;
