/**
 * Cloudflare Worker CORS Proxy
 * 
 * Deploy this to Cloudflare Workers (free tier available) to enable
 * API calls from GitHub Pages.
 * 
 * Setup:
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Paste this code
 * 4. Deploy
 * 5. Set NEXT_PUBLIC_PROXY_URL environment variable to your worker URL
 * 
 * Example worker URL: https://your-worker-name.your-subdomain.workers.dev
 */

export default {
  async fetch(request) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get the target URL from query params or request body
    const targetUrl = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';

    try {
      // Forward the request to the NSD API
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: await request.text(),
      });

      // Create a new response with CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      };

      // Handle OPTIONS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Return the API response with CORS headers
      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

