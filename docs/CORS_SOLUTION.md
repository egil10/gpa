# CORS Issue Solution

## Problem

The NSD API doesn't allow direct requests from browsers due to CORS (Cross-Origin Resource Sharing) restrictions. When your site is hosted on `egil10.github.io`, the browser blocks requests to `api.nsd.no`.

## Solutions

### Option 1: Serverless Proxy Function (Recommended)

Create a simple serverless function that proxies requests to NSD API. This can be deployed on:
- Vercel (free)
- Netlify Functions (free)
- Cloudflare Workers (free)

### Option 2: CORS Proxy Service (Quick Fix)

Use a public CORS proxy service (not recommended for production, but works for testing).

### Option 3: Next.js API Route (If not using static export)

If you switch from static export, you can use Next.js API routes.

## Quick Fix: Update API Call

For now, let's try using a CORS proxy to get it working, then we can set up a proper serverless function.

