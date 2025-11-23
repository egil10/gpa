# Deployment Guide

## GitHub Pages Deployment

### Option 1: Automatic Deployment (Recommended)

This project includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages when you push to the `main` branch.

1. Enable GitHub Pages in your repository settings:
   - Go to Settings → Pages
   - Source: Select "GitHub Actions"

2. Push your code to the `main` branch:
   ```bash
   git push origin main
   ```

3. The workflow will automatically build and deploy your site.

### Option 2: Manual Deployment

1. Build the project:
   ```bash
   npm install
   npm run build
   ```
   This will generate static files in the `out` folder.

2. Deploy the `out` folder to GitHub Pages:
   - Option A: Push to `gh-pages` branch
   - Option B: Use GitHub Actions manually

### Base Path Configuration

If your repository name is not `username.github.io`, you'll need to set a base path:

1. Update `next.config.js`:
   ```js
   const nextConfig = {
     output: 'export',
     basePath: '/your-repo-name',
     images: {
       unoptimized: true,
     },
     trailingSlash: true,
   }
   ```

2. Update `.github/workflows/deploy.yml` if needed.

### Local Testing

Test the production build locally:

```bash
npm run build
npx serve out
```

Visit `http://localhost:3000` to test.

