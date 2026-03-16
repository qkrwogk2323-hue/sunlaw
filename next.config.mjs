/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb'
    }
  }
};

export default nextConfig;
