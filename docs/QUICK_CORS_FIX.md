# Quick CORS Fix Guide

## The Issue

Your site on GitHub Pages can't directly call NSD API due to CORS restrictions.

## Fastest Solution: Deploy Proxy to Vercel (5 minutes)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub (free)

### Step 2: Deploy Proxy
1. Create a new Vercel project
2. Upload the `api/proxy.js` file
3. Deploy

### Step 3: Get Proxy URL
After deployment, you'll get a URL like: `https://gpa-proxy-xyz.vercel.app`

### Step 4: Update Your Code
In `lib/api.ts`, change:
```typescript
const API_URL = 'https://your-proxy-url.vercel.app/api/proxy';
```

### Step 5: Redeploy
Push to GitHub, and your site will use the proxy!

## Alternative: Use CORS Proxy (Temporary)

For quick testing, you can use a public CORS proxy:

Update `lib/api.ts`:
```typescript
const API_URL = 'https://corsproxy.io/?https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
```

**Warning**: Not reliable for production, but works for testing.

## Why This Happens

- GitHub Pages serves your site from `egil10.github.io`
- NSD API is at `api.nsd.no`
- Browsers block cross-origin requests unless the server allows it
- NSD API doesn't send CORS headers, so browser blocks it
- Proxy server adds CORS headers, so it works!

## Testing Locally

When you run `npm run dev` on `localhost`, CORS is more lenient, so it might work. The issue is specifically with the deployed site.

