/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;
const isGitHubPages = !isVercel && isProduction && process.env.SKIP_EXPORT !== 'true';

// Explicitly ensure basePath is NEVER set on Vercel
// This prevents static asset paths from being prefixed with /gpa on Vercel
console.log('[next.config.js] Build config:', {
  isProduction,
  isVercel,
  isGitHubPages,
  VERCEL: process.env.VERCEL,
  NODE_ENV: process.env.NODE_ENV,
});

const nextConfig = {
  // Only use static export for GitHub Pages (not for Vercel, which supports SSR/API routes)
  ...(isGitHubPages ? {
    output: 'export',
  } : {}),
  // CRITICAL: Explicitly set basePath to empty string on Vercel to prevent /gpa prefix
  // Only use basePath for GitHub Pages deployment
  basePath: isVercel ? '' : (isGitHubPages ? '/gpa' : ''),
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


