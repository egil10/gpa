- Cloudflare Workers (free)

### Option 2: CORS Proxy Service (Quick Fix)

Use a public CORS proxy service (not recommended for production, but works for testing).

### Option 3: Next.js API Route (If not using static export)

If you switch from static export, you can use Next.js API routes.

## Quick Fix: Update API Call

For now, let's try using a CORS proxy to get it working, then we can set up a proper serverless function.

## App Configuration (works for GitHub Pages)

Regardless of which proxy option you choose:

1. Create an `.env.local` file (or configure the same variables in your CI workflow) **before** running `npm run build && npm run export`.
2. Add  
   ```
   NEXT_PUBLIC_PROXY_URL=https://your-proxy.example.com/api/proxy
   ```
   (You can also use the legacy name `NEXT_PUBLIC_CORS_PROXY_URL`.)
3. Rebuild/redeploy the static site so the proxy URL is baked into the output.

Once this is set, the front-end will always try your custom proxy first, even when it's hosted on GitHub Pages.

