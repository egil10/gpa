/**
 * Local data cache for grade statistics
 * 
 * This module provides fast access to cached grade data,
 * avoiding API calls for popular courses.
 */

import { GradeData } from '@/types';

export interface CachedData {
  courses: {
    [key: string]: GradeData[]; // key: `${institutionCode}-${courseCode}`
  };
  metadata: {
    lastUpdated: string;
    totalCourses: number;
    totalEntries: number;
  };
}

let cache: CachedData | null = null;

/**
 * Load cache from file (server-side only)
 */
export function loadCache(): CachedData | null {
  // Client-side: cache is loaded via getStaticProps or API route
  if (typeof window !== 'undefined') {
    return null;
  }

  if (cache) {
    return cache;
  }

  try {
    // Only import fs on server-side (Node.js)
    // Webpack will exclude this from client bundles via webpack config
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), 'data', 'cache.json');
    
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, 'utf-8');
      cache = JSON.parse(content);
      return cache;
    }
  } catch (error) {
    // Silently fail - cache is optional
    // This is expected on client-side where fs is not available
  }

  return null;
}

/**
 * Get cached data for a course
 */
export function getCachedData(
  institutionCode: string,
  courseCode: string
): GradeData[] | null {
  const cached = loadCache();
  if (!cached || !cached.courses) {
    return null;
  }

  const key = `${institutionCode}-${courseCode}`;
  return cached.courses[key] || null;
}

/**
 * Check if cache exists and is recent (within 30 days)
 */
export function isCacheValid(): boolean {
  const cached = loadCache();
  if (!cached || !cached.metadata) {
    return false;
  }

  const lastUpdated = new Date(cached.metadata.lastUpdated);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate < 30; // Cache valid for 30 days
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { courses: number; entries: number; lastUpdated: string } | null {
  const cached = loadCache();
  if (!cached || !cached.metadata) {
    return null;
  }

  return {
    courses: cached.metadata.totalCourses,
    entries: cached.metadata.totalEntries,
    lastUpdated: cached.metadata.lastUpdated,
  };
}

