import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  skipMiddlewareUrlNormalize: true,
  experimental: {
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    },
  },
};

export default nextConfig;
