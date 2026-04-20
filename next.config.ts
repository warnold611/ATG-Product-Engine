import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow large API responses for chapter generation
  api: {
    responseLimit: '8mb',
  },
}

export default nextConfig
