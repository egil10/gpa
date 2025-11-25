/**
 * Grade data cache system
 * Loads grade data from local cache or fetches and caches it
 */

import { GradeData } from '@/types';
import { formatCourseCode } from './api';
import { loadInstitutionCourses } from './all-courses';

// Cache helper - only loads on server-side to avoid bundling fs module
function getCachedDataSafe(
  institutionCode: string,
  courseCode: string
): GradeData[] | null {
  // Only try to use cache on server-side
  // Check multiple ways to ensure we're on server
  if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }

  try {
    // Use Function constructor to make require truly dynamic
    // This prevents webpack from analyzing the require call
    const requireFunc = new Function('modulePath', 'return require(modulePath)');
    const cacheModule = requireFunc('./cache');
    if (cacheModule && typeof cacheModule.getCachedData === 'function') {
      return cacheModule.getCachedData(institutionCode, courseCode);
    }
  } catch (e) {
    // Cache not available or error loading - silently fail
    // This is expected on client-side where cache module is ignored by webpack
    return null;
  }

  return null;
}

// Client-side cache (in-memory)
const clientCache: Map<string, GradeData[]> = new Map();

/**
 * Check if a course exists in institution data files
 */
export async function courseExistsInData(
  institution: string,
  courseCode: string
): Promise<boolean> {
  try {
    const courses = await loadInstitutionCourses(institution);
    // Only remove "-1" suffix, not standalone "1" (e.g., "STK-MAT2011" should not become "STK-MAT201")
    const normalizedCode = courseCode.replace(/-[0-9]+$/, '').trim().toUpperCase();
    return courses.some(c => c.code.toUpperCase() === normalizedCode);
  } catch {
    return false;
  }
}

/**
 * Load grade data from data/cache.json (pre-populated with top courses)
 */
async function loadGradeDataFromCache(
  institutionCode: string,
  courseCode: string
): Promise<GradeData[] | null> {
  try {
    const response = await fetch('/data/cache.json');
    if (response.ok) {
      const cacheData = await response.json();
      const cacheKey = `${institutionCode}-${courseCode}`;

      if (cacheData.courses && cacheData.courses[cacheKey]) {
        return cacheData.courses[cacheKey].data || null;
      }
    }
  } catch (error) {
    // Cache file doesn't exist or failed to load
    return null;
  }

  return null;
}

/**
 * Get grade data from cache (works on both client and server)
 * Priority: 1. Client cache, 2. localStorage, 3. data/cache.json, 4. Server cache
 */
export async function getGradeDataFromCache(
  institutionCode: string,
  courseCode: string,
  institution: string
): Promise<GradeData[] | null> {
  const formattedCode = formatCourseCode(courseCode, institution);
  const cacheKey = `${institutionCode}-${formattedCode}`;

  // 1. Check client-side in-memory cache first
  if (typeof window !== 'undefined') {
    if (clientCache.has(cacheKey)) {
      return clientCache.get(cacheKey)!;
    }

    // 2. Try to load from localStorage as fallback
    try {
      const stored = localStorage.getItem(`grade-data-${cacheKey}`);
      if (stored) {
        const data = JSON.parse(stored) as GradeData[];
        clientCache.set(cacheKey, data);
        return data;
      }
    } catch {
      // Ignore localStorage errors
    }

    // 3. Try to load from data/cache.json (pre-populated with top courses)
    const cachedData = await loadGradeDataFromCache(institutionCode, courseCode);
    if (cachedData && cachedData.length > 0) {
      // Cache in memory and localStorage for faster subsequent access
      clientCache.set(cacheKey, cachedData);
      try {
        localStorage.setItem(`grade-data-${cacheKey}`, JSON.stringify(cachedData));
      } catch {
        // Ignore localStorage errors
      }
      return cachedData;
    }
  }

  // 4. Check server-side cache (wrapped in try-catch for safety)
  let cached: GradeData[] | null = null;
  try {
    cached = getCachedDataSafe(institutionCode, formattedCode);
  } catch (e) {
    // Silently fail if cache access fails (expected on client-side)
    cached = null;
  }

  if (cached && cached.length > 0) {
    // Also store in client cache if on client
    if (typeof window !== 'undefined') {
      clientCache.set(cacheKey, cached);
      try {
        localStorage.setItem(`grade-data-${cacheKey}`, JSON.stringify(cached));
      } catch {
        // Ignore localStorage errors
      }
    }
    return cached;
  }

  return null;
}

/**
 * Store grade data in cache
 */
export function storeGradeDataInCache(
  institutionCode: string,
  courseCode: string,
  institution: string,
  data: GradeData[]
): void {
  const formattedCode = formatCourseCode(courseCode, institution);
  const cacheKey = `${institutionCode}-${formattedCode}`;

  // Store in client cache
  if (typeof window !== 'undefined') {
    clientCache.set(cacheKey, data);
    try {
      localStorage.setItem(`grade-data-${cacheKey}`, JSON.stringify(data));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }
}

/**
 * Clear cache for a specific course
 */
export function clearCourseCache(
  institutionCode: string,
  courseCode: string,
  institution: string
): void {
  const formattedCode = formatCourseCode(courseCode, institution);
  const cacheKey = `${institutionCode}-${formattedCode}`;

  clientCache.delete(cacheKey);

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`grade-data-${cacheKey}`);
    } catch {
      // Ignore errors
    }
  }
}
