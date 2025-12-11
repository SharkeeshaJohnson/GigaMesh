import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid issues with thread-stream module
  experimental: {
    // Use webpack instead of turbopack for now
  },
  // Transpile problematic modules
  transpilePackages: ['@privy-io/react-auth', '@reverbia/sdk'],
  // Exclude heavy server-only packages from serverless functions
  serverExternalPackages: [
    'onnxruntime-node',
    'onnxruntime-web',
    'tesseract.js-core',
    'tesseract.js',
    'pdfjs-dist',
    '@huggingface/transformers',
  ],
  // Exclude problematic files from build
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Exclude heavy packages from server bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'onnxruntime-web': 'commonjs onnxruntime-web',
        'tesseract.js': 'commonjs tesseract.js',
        'pdfjs-dist': 'commonjs pdfjs-dist',
      });
    }

    return config;
  },
};

export default nextConfig;
