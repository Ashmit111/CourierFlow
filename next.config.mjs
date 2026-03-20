/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'ioredis'],
  allowedDevOrigins: ['bdb3-103-186-47-90.ngrok-free.app'],
  experimental: {
    serverActions: {
      allowedOrigins: ['d17b-103-186-47-90.ngrok-free.app', 'localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
