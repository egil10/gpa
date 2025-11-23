# Deployment Guide

## GitHub Pages Deployment

### ✅ Automatic Deployment (Recommended)

**Yes, GitHub Actions deploys from the `main` branch!**

The workflow (`.github/workflows/deploy.yml`) is configured to:
- **Trigger**: Automatically on every push to `main` branch
- **Also**: Can be manually triggered from GitHub Actions tab

#### Setup Steps:

1. **Enable GitHub Pages with GitHub Actions**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **"GitHub Actions"** (NOT "Deploy from a branch")
   - If you don't see "GitHub Actions" option, make sure:
     - The workflow file exists (`.github/workflows/deploy.yml`)
     - You've pushed it to the repository
     - You've run the workflow at least once
   - Save

2. **If "GitHub Actions" option is not visible**:
   - First, push your code to trigger the workflow
   - Go to **Actions** tab and run the workflow manually once
   - Then go back to Settings → Pages
   - The "GitHub Actions" option should now appear

3. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

4. **Watch the deployment**:
   - Go to **Actions** tab in your GitHub repo
   - You'll see the workflow running
   - Wait for it to complete (usually 2-3 minutes)
   - Your site will be live at: `https://egil10.github.io/gpa/`

#### How It Works:

1. You push to `main` branch
2. GitHub Actions workflow triggers automatically
3. It builds your Next.js app (`npm run build`)
4. Generates static files in `/out` folder
5. Deploys to GitHub Pages
6. Your site is live! 🎉

#### Manual Trigger:

You can also manually trigger deployment:
- Go to **Actions** tab
- Select **"Deploy to GitHub Pages"** workflow
- Click **"Run workflow"** button

### ⚠️ Important: Base Path Configuration

Since your repository is `egil10/gpa` (not `egil10.github.io`), you **MUST** add a base path!

Your site URL is: `https://egil10.github.io/gpa/` (note the `/gpa/` at the end)

#### To Fix This:

1. Update `next.config.js`:
   ```js
   const nextConfig = {
     output: 'export',
     basePath: '/gpa',  // Your repository name
     images: {
       unoptimized: true,
     },
     trailingSlash: true,
   }
   
   module.exports = nextConfig
   ```

2. Commit and push:
   ```bash
   git add next.config.js
   git commit -m "Add basePath for GitHub Pages"
   git push origin main
   ```

3. The workflow will redeploy with the correct paths.

**Without basePath, your assets (CSS, JS, images) won't load correctly!**

### Option 2: Manual Deployment (If GitHub Actions doesn't work)

If you prefer to use branch deployment:

1. Build locally:
   ```bash
   npm run build
   ```

2. Push the `out` folder to a `gh-pages` branch:
   ```bash
   git subtree push --prefix out origin gh-pages
   ```

3. In Settings → Pages, select `gh-pages` branch as source.

### Local Testing

Test the production build locally:

```bash
npm run build
npx serve out
```

Visit `http://localhost:3000` to test.

**Note**: For local testing with basePath, you might need to serve from a subdirectory or use a different method.
