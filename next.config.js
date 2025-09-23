/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"]
  },
  async rewrites() {
    return []
  }
}

module.exports = nextConfig