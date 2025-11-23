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
    const normalizedCode = courseCode.replace(/[-]?1$/, '').trim().toUpperCase();
    return courses.some(c => c.code.toUpperCase() === normalizedCode);
  } catch {
    return false;
  }
}

/**
 * Get grade data from cache (works on both client and server)
 */
export async function getGradeDataFromCache(
  institutionCode: string,
  courseCode: string,
  institution: string
): Promise<GradeData[] | null> {
  const formattedCode = formatCourseCode(courseCode, institution);
  const cacheKey = `${institutionCode}-${formattedCode}`;
  
  // Check client-side cache first
  if (typeof window !== 'undefined') {
    if (clientCache.has(cacheKey)) {
      return clientCache.get(cacheKey)!;
    }
    
    // Try to load from localStorage as fallback
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
  }
  
  // Check server-side cache (wrapped in try-catch for safety)
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

