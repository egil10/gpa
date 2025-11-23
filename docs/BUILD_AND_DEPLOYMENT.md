# Build and Deployment Guide

Complete guide to building and deploying the GPA Calculator website.

## 🏗️ Build Process

### Overview

The build process:
1. **Prebuild**: Copies course JSON files to `public/` folder
2. **Build**: Compiles Next.js application to static HTML
3. **Export**: Generates static files in `out/` directory
4. **Optimization**: Minifies and optimizes assets

### Build Command

```bash
npm run build
```

### What Happens During Build

#### Step 1: Prebuild Script

```bash
# Runs automatically: scripts/copy-nhh-data.js
# Copies course JSON files from data/institutions/ to public/
```

**Files copied:**
- `nhh-bachelor-courses.json` → `public/nhh-bachelor-courses.json`
- `nhh-all-courses.json` → `public/nhh-all-courses.json`
- (Future: other institution files)

#### Step 2: Type Checking

```bash
# Next.js runs TypeScript type checking
# Verifies all code compiles correctly
```

#### Step 3: Compilation

```bash
# Next.js compiles React components
# Bundles JavaScript and CSS
# Optimizes images
```

#### Step 4: Static Page Generation

```bash
# Generates static HTML for all pages:
# - / (homepage)
# - /kalkulator (GPA calculator)
# - /sok (search page)
# - /om (about page)
# - /404 (error page)
```

#### Step 5: Asset Optimization

```bash
# Minifies JavaScript and CSS
# Optimizes bundle sizes
# Creates source maps
```

### Build Output

Build creates `out/` directory with:
```
out/
├── _next/              # Optimized JavaScript bundles
├── index.html          # Homepage
├── kalkulator.html     # Calculator page
├── sok.html            # Search page
├── om.html             # About page
├── 404.html            # Error page
├── *.json              # Course data files (from public/)
└── *.css               # Stylesheets
```

### Build Time

- **First build**: ~30-60 seconds
- **Subsequent builds**: ~10-30 seconds
- **With data updates**: ~30-60 seconds

## ⚠️ Build Warnings

### Expected Warnings

1. **`fs` module warning**:
   ```
   Module not found: Can't resolve 'fs' in 'lib/cache.ts'
   ```
   **Status**: ✅ Harmless - cache.ts only runs server-side

2. **Static export warning**:
   ```
   Statically exporting a Next.js application via 'next export' disables API routes
   ```
   **Status**: ✅ Expected - we're using static export intentionally

### Actual Errors

If build fails:
1. Check TypeScript errors: `npm run type-check`
2. Verify data files exist in `data/institutions/`
3. Check console output for specific error messages
4. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 🚀 Deployment

### Deployment Options

#### Option 1: GitHub Pages (Recommended for Static Sites)

**Prerequisites:**
- GitHub repository
- GitHub Actions enabled

**Setup:**

1. **Configure GitHub Actions**:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

2. **Configure Repository Settings**:

   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - Save

3. **Deploy**:

   ```bash
   # Commit and push
   git add .
   git commit -m "Deploy: Update course data"
   git push origin main
   
   # GitHub Actions will automatically build and deploy
   ```

**Result**: Site available at `https://[username].github.io/gpa/`

#### Option 2: Vercel (Easiest)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Or connect via GitHub**:
   - Go to https://vercel.com
   - Import repository
   - Vercel auto-detects Next.js and deploys

**Result**: Site available at `https://gpa.vercel.app`

#### Option 3: Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod --dir=out
   ```

4. **Or connect via GitHub**:
   - Go to https://netlify.com
   - Import repository
   - Build command: `npm run build`
   - Publish directory: `out`

**Result**: Site available at `https://gpa.netlify.app`

#### Option 4: Static Hosting (Any Provider)

Upload `out/` directory contents to any static host:

```bash
# Build first
npm run build

# Upload out/ directory to your hosting provider
# via FTP, SCP, or provider's upload interface
```

**Providers:**
- AWS S3 + CloudFront
- Cloudflare Pages
- Any web hosting with FTP

## 📋 Deployment Checklist

Before deploying:

- [ ] All course data is up to date
- [ ] `npm run build` succeeds without errors
- [ ] Test locally with `npm start` (optional)
- [ ] Check `out/` directory contains all files
- [ ] Verify course JSON files are in `out/`
- [ ] Test site functionality locally
- [ ] Review changes in git
- [ ] Commit all changes

## 🧪 Testing After Deployment

### Verify Deployment

1. **Check Site Loads**:
   - Visit deployed URL
   - Homepage should load

2. **Test Course Search**:
   - Go to search page
   - Select an institution (e.g., NHH)
   - Type a course code
   - Autocomplete should work

3. **Test Grade Display**:
   - Search for a course (e.g., "TDT4110")
   - Grade distribution should display
   - Charts should render

4. **Test Calculator**:
   - Go to calculator page
   - Add courses
   - Calculate GPA
   - Verify results

5. **Check Console**:
   - Open browser DevTools
   - Check for JavaScript errors
   - Verify no 404s for course JSON files

### Common Issues After Deployment

#### Issue: 404 on Course JSON Files

**Symptoms**: Autocomplete doesn't work, console shows 404 errors

**Solution**:
- Verify files exist in `public/` before build
- Check files are in `out/` after build
- Verify basePath configuration in `next.config.js`

#### Issue: Charts Don't Display

**Symptoms**: Grade distribution charts are blank

**Solution**:
- Check browser console for errors
- Verify API proxy is working (for grade data)
- Check network tab for API requests

#### Issue: Build Succeeds but Site Doesn't Work

**Symptoms**: Site loads but features don't work

**Solution**:
- Check JavaScript console for errors
- Verify all dependencies are in package.json
- Check basePath matches deployment URL structure

## 🔄 Continuous Deployment

### Automatic Deployment Setup

#### GitHub Actions (Recommended)

See "Option 1: GitHub Pages" above for full setup.

**Benefits**:
- Automatic on every push
- Free for public repos
- Easy rollback (git revert)

#### Vercel/Netlify Auto-Deploy

Both services offer automatic deployment:
- Connect GitHub repository
- Deploy on every push to main
- Preview deployments for PRs

## 📊 Deployment Monitoring

### After Deployment

1. **Check Analytics** (if configured):
   - Page views
   - Error rates
   - User behavior

2. **Monitor Errors**:
   - Browser console errors
   - Server logs (if applicable)
   - User reports

3. **Performance**:
   - Page load times
   - API response times
   - Bundle sizes

## 🔙 Rollback

If deployment has issues:

### GitHub Pages

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout previous version
git checkout [previous-commit-hash]
git push origin main --force  # ⚠️ Use with caution
```

### Vercel/Netlify

- Use dashboard to rollback to previous deployment
- Or redeploy previous version manually

## 📝 Deployment Best Practices

1. **Test Locally First**:
   ```bash
   npm run build
   npm start  # Test production build locally
   ```

2. **Incremental Deployments**:
   - Deploy small changes frequently
   - Test each deployment
   - Rollback quickly if issues

3. **Version Control**:
   - Always commit before deploying
   - Use meaningful commit messages
   - Tag releases: `git tag v1.0.0`

4. **Monitoring**:
   - Check site after deployment
   - Monitor error rates
   - Get user feedback

## 🔐 Security Considerations

### Static Site Security

- ✅ No server-side code execution
- ✅ No database connections
- ✅ All data is public (course info)
- ✅ API calls are client-side only

### API Security

- API calls go through proxy (if configured)
- No sensitive data transmitted
- CORS handled properly

## 🆘 Deployment Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for deployment-specific issues.

## 📚 Related Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup
- [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Updating data before deployment
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

