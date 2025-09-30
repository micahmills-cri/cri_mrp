/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "@google-cloud/storage"]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@google-cloud/storage': 'commonjs @google-cloud/storage'
      });
    }
    return config;
  },
  async rewrites() {
    return []
  }
}

module.exports = nextConfig