# Deployment Guide

## GitHub Pages Deployment

### ✅ Automatic Deployment (Recommended)

**Yes, GitHub Actions deploys from the `main` branch!**

The workflow (`.github/workflows/deploy.yml`) is configured to:
- **Trigger**: Automatically on every push to `main` branch
- **Also**: Can be manually triggered from GitHub Actions tab

#### Setup Steps:

1. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **"GitHub Actions"** (not "Deploy from a branch")
   - Save

2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

3. **Watch the deployment**:
   - Go to **Actions** tab in your GitHub repo
   - You'll see the workflow running
   - Wait for it to complete (usually 2-3 minutes)
   - Your site will be live at: `https://yourusername.github.io/gpa/`

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

**Important**: If your repository is NOT named `username.github.io`, you need to set a base path!

For example, if your repo is `egil10/gpa`, your site will be at:
- `https://egil10.github.io/gpa/` (note the `/gpa/` path)

#### To Fix This:

1. Update `next.config.js`:
   ```js
   const nextConfig = {
     output: 'export',
     basePath: '/gpa',  // Change to your repo name
     images: {
       unoptimized: true,
     },
     trailingSlash: true,
   }
   ```

2. Commit and push:
   ```bash
   git add next.config.js
   git commit -m "Add basePath for GitHub Pages"
   git push origin main
   ```

3. The workflow will redeploy with the correct paths.

### Local Testing

Test the production build locally:

```bash
npm run build
npx serve out
```

Visit `http://localhost:3000` to test.

