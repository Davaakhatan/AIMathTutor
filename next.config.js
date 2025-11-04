/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // Enable standalone output for Docker deployments (only in production)
  // output: 'standalone', // Commented out - causes issues in dev mode
  // Allow build to continue with warnings (for production)
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

