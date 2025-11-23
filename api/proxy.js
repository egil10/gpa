// Serverless function to proxy NSD API requests
// Deploy this to Vercel, Netlify, or Cloudflare Workers
// 
// Vercel: Just deploy this file, it will work automatically
// Netlify: Put in netlify/functions/proxy.js
// Cloudflare: Use Workers

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward request to NSD API
    const response = await fetch('https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return res.status(204).end();
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'API request failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch data from NSD API' });
  }
}
