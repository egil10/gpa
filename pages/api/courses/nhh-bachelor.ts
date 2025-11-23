// API route to serve NHH Bachelor courses data
import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'institutions', 'nhh-bachelor-courses.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'NHH Bachelor courses data not found. Run npm run discover-nhh first.' });
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error loading NHH Bachelor courses:', error);
    return res.status(500).json({ error: 'Failed to load NHH Bachelor courses data' });
  }
}

