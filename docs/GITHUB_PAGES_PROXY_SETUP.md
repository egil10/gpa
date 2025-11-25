# GitHub Pages CORS Proxy Setup

On GitHub Pages, API calls will fail due to CORS restrictions. This guide explains how to set up a free Cloudflare Worker proxy.

## Quick Fix: Deploy to Vercel Instead

The easiest solution is to deploy your site to Vercel instead of GitHub Pages:
1. Connect your GitHub repo to Vercel
2. The proxy at `api/proxy.js` will work automatically
3. No additional configuration needed

## Alternative: Cloudflare Worker Proxy

If you want to keep using GitHub Pages, set up a Cloudflare Worker:

### Step 1: Create Cloudflare Worker

1. Go to https://workers.cloudflare.com/
2. Sign up/login (free)
3. Click "Create a Worker"
4. Name it something like `gpa-cors-proxy`
5. Replace the default code with the contents of `scripts/workers/cloudflare-worker-proxy.js`
6. Click "Deploy"

### Step 2: Get Your Worker URL

After deploying, you'll get a URL like:
```
https://gpa-cors-proxy.your-username.workers.dev
```

### Step 3: Configure the App

You need to make the proxy URL available at runtime. Since GitHub Pages is static, you have two options:

**Option A: Hardcode in `lib/api.ts`** (Quick but not ideal)
```typescript
const CUSTOM_PROXY_URL = 'https://your-worker-url.workers.dev';
```

**Option B: Use a config file** (Recommended)
1. Create `public/proxy-config.json`:
```json
{
  "proxyUrl": "https://your-worker-url.workers.dev"
}
```
2. Load it at runtime in `lib/api.ts`

### Step 4: Rebuild and Deploy

After setting up the proxy URL, rebuild and redeploy:
```bash
npm run build
git add .
git commit -m "Configure Cloudflare Worker proxy"
git push
```

## Testing

After setup, search functionality should work on GitHub Pages without CORS errors.

## Troubleshooting

- **403 Forbidden**: Your Cloudflare Worker might have rate limits. Check Cloudflare dashboard.
- **Still getting CORS errors**: Make sure the proxy URL is correctly configured and accessible.
- **Worker not responding**: Check Cloudflare dashboard for errors or deployment issues.

