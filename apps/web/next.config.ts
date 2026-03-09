import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@letpay/core', '@letpay/db'],
};

export default nextConfig;
