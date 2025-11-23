/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const useExport = isProduction && process.env.SKIP_EXPORT !== 'true';

const nextConfig = {
  // Only use static export for production builds (not in dev mode)
  ...(useExport ? {
    output: 'export',
  } : {}),
  // Only use basePath in production (for GitHub Pages deployment)
  // In development, run without basePath for easier local testing
  ...(isProduction ? {
    basePath: '/gpa', // Required for GitHub Pages (repo name)
  } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer, webpack }) => {
    // Mark Node.js modules as external for client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Ignore the cache module on client-side to prevent fs bundling
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/cache$/,
          contextRegExp: /lib$/,
        })
      );
    }
    return config;
  },
}

module.exports = nextConfig


