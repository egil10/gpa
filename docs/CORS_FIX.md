# Fixing CORS Issues

## The Problem

NSD API blocks direct browser requests from GitHub Pages due to CORS policy. You're seeing:
```
Access to fetch at 'https://api.nsd.no/...' from origin 'https://egil10.github.io' 
has been blocked by CORS policy
```

## Solution: Serverless Proxy

We need a proxy server that:
1. Receives requests from your site
2. Forwards them to NSD API
3. Returns the response with proper CORS headers

## Quick Fix Options

### Option 1: Deploy Proxy to Vercel (Recommended - 5 minutes)

1. **Create a Vercel account** (free): https://vercel.com

2. **Deploy the proxy**:
   - Create a new Vercel project
   - Add the `api/proxy.js` file
   - Deploy

3. **Update API URL** in `lib/api.ts`:
   ```typescript
   const PROXY_URL = 'https://your-proxy.vercel.app/api/proxy';
   ```

4. **Redeploy your site**

### Option 2: Use CORS Proxy Service (Quick Test)

Temporarily use a public CORS proxy (not for production):

Update `lib/api.ts`:
```typescript
const API_URL = 'https://cors-anywhere.herokuapp.com/https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData';
```

**Note**: These services are unreliable and may have rate limits.

### Option 3: Cloudflare Workers (Free & Fast)

1. Create Cloudflare account
2. Create a Worker
3. Deploy the proxy code
4. Update API URL

## Recommended: Vercel Proxy

I've created `api/proxy.js` - a serverless function ready to deploy.

### Steps:

1. **Sign up for Vercel**: https://vercel.com (free)

2. **Create new project**:
   - Import your `gpa` repo OR
   - Create a minimal repo with just the proxy

3. **Deploy**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

4. **Get your proxy URL** (e.g., `https://gpa-proxy.vercel.app`)

5. **Update `lib/api.ts`**:
   ```typescript
   const PROXY_URL = 'https://your-proxy-url.vercel.app/api/proxy';
   ```

6. **Commit and push**:
   ```bash
   git add lib/api.ts
   git commit -m "Use proxy for API calls"
   git push origin main
   ```

## Alternative: Keep It Simple

If you want to avoid external services, you could:
- Host on Vercel instead of GitHub Pages (supports API routes)
- Use Netlify (supports functions)
- Accept that it only works locally for now

## Testing Locally

The code is set up to use direct API calls in development (localhost), so it should work when you run `npm run dev`.

The CORS issue only affects the deployed site on GitHub Pages.

