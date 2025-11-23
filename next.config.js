/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/gpa', // Required for GitHub Pages (repo name)
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig


