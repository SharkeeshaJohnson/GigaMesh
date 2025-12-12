import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid issues with thread-stream module
  experimental: {
    // Use webpack instead of turbopack for now
  },
  // Transpile problematic modules
  transpilePackages: ['@privy-io/react-auth', '@reverbia/sdk'],
  // Exclude heavy server-only packages from serverless functions
  // These packages are either not used server-side or are too large
  serverExternalPackages: [
    // AI/ML packages (from @reverbia/sdk) - very heavy
    'onnxruntime-node',
    'onnxruntime-web',
    'onnxruntime-common',
    '@huggingface/transformers',
    // Document processing - not needed server-side
    'tesseract.js-core',
    'tesseract.js',
    'pdfjs-dist',
    // Sharp image processing - heavy native bindings
    'sharp',
    '@img/sharp-darwin-arm64',
    '@img/sharp-darwin-x64',
    '@img/sharp-linux-x64',
    // Native modules
    '@napi-rs/wasm-runtime',
    '@emnapi/core',
    '@emnapi/runtime',
    '@emnapi/wasi-threads',
  ],
  // Output file tracing - exclude heavy packages from Vercel deployment
  outputFileTracingExcludes: {
    '*': [
      'node_modules/onnxruntime-node/**',
      'node_modules/onnxruntime-web/**',
      'node_modules/@huggingface/**',
      'node_modules/tesseract.js-core/**',
      'node_modules/tesseract.js/**',
      'node_modules/pdfjs-dist/**',
      'node_modules/sharp/**',
      'node_modules/@img/**',
      'node_modules/@napi-rs/**',
    ],
  },
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
        '@huggingface/transformers': 'commonjs @huggingface/transformers',
        'sharp': 'commonjs sharp',
      });
    }

    return config;
  },
};

export default nextConfig;
