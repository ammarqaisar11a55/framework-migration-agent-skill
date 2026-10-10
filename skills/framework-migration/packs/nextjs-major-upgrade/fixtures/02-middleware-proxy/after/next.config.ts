import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  skipProxyUrlNormalize: true,
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']
  },
};

export default nextConfig;
