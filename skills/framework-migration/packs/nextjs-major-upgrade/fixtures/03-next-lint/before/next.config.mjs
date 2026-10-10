/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'lib'],
  },
  images: {
    domains: ['images.example.com'],
  },
};

export default nextConfig;
