import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid issues with thread-stream module
  experimental: {
    // Use webpack instead of turbopack for now
  },
  // Transpile problematic modules
  transpilePackages: ['@privy-io/react-auth', '@reverbia/sdk'],
  // Exclude problematic files from build
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
