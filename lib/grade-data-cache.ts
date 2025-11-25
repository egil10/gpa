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
 * Load grade data from cache.json (if it exists)
 * Note: Pre-built files (homepage-grade-data.json, homepage-top-courses-data.json) 
 * only contain aggregated stats, not raw GradeData, so they can't be used for cache lookup
 * Suppresses 404 errors - cache.json is optional
 */
async function loadGradeDataFromCacheFile(
  institutionCode: string,
  courseCode: string
): Promise<GradeData[] | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const basePath = window.location.pathname.startsWith('/gpa') ? '/gpa' : '';

  // Try cache.json (if it exists) - suppress 404 errors as file is optional
  // Only attempt if we know the file might exist (optional optimization)
  try {
    // Fetch with error suppression - 404 is expected and fine
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
    
    const response = await fetch(`${basePath}/data/cache.json`, {
      cache: 'force-cache',
      signal: controller.signal,
    }).catch((error) => {
      // Silently ignore fetch errors (404, network errors, etc.)
      // This is expected if cache.json doesn't exist
      return null;
    });
    
    clearTimeout(timeoutId);
    
    // Only process if response exists and is OK (200-299)
    if (!response || !response.ok || response.status === 404) {
      // 404 is expected if cache.json doesn't exist - silently return null
      return null;
    }

    const cacheData = await response.json();
    
    // Try multiple key formats for cache lookup
    const normalizedCode = courseCode.replace(/-[0-9]+$/, '').trim();
    const cacheKeys = [
      `${institutionCode}-${courseCode}`,       // Original format
      `${institutionCode}-${normalizedCode}`,   // Normalized format
    ];

    // Also try with formatted codes (with -0, -1 suffixes)
    if (courseCode.includes('-')) {
      const baseCode = courseCode.split('-')[0];
      cacheKeys.push(`${institutionCode}-${baseCode}-0`);
      cacheKeys.push(`${institutionCode}-${baseCode}-1`);
    }

    for (const cacheKey of cacheKeys) {
      if (cacheData.courses && cacheData.courses[cacheKey]) {
        const cached = cacheData.courses[cacheKey];
        if (cached.data && cached.data.length > 0) {
          return cached.data;
        }
      }
    }
  } catch (error) {
    // Cache file doesn't exist or failed to load - that's ok, we'll fetch from API
    // Silently fail - this is expected if cache.json doesn't exist
    // Don't log 404 errors - they're expected
    if (error instanceof Error && !error.message.includes('404')) {
      // Only log non-404 errors for debugging
      console.debug('[Cache] Error loading cache.json:', error.message);
    }
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
  // Normalize course code - try multiple formats to match cached data
  const normalizedCode = courseCode.replace(/-[0-9]+$/, '').trim().toUpperCase();
  const formattedCode = formatCourseCode(normalizedCode, institution);
  
  // Try multiple cache key formats (with and without formatting)
  const cacheKeys = [
    `${institutionCode}-${formattedCode}`,  // Formatted: "1120-EXPHIL-HFEKS-0"
    `${institutionCode}-${normalizedCode}`,  // Normalized: "1120-EXPHIL-HFEKS"
    `${institutionCode}-${courseCode}`,      // Original: "1120-EXPHIL-HFEKS-0" (if passed as-is)
  ];

  // 1. Check client-side in-memory cache first
  if (typeof window !== 'undefined') {
    for (const cacheKey of cacheKeys) {
      if (clientCache.has(cacheKey)) {
        console.log(`[Cache] ✅ Found in-memory cache: ${cacheKey}`);
        return clientCache.get(cacheKey)!;
      }
    }

    // 2. Try to load from localStorage (check this BEFORE cache.json to avoid 404s)
    for (const cacheKey of cacheKeys) {
      try {
        const stored = localStorage.getItem(`grade-data-${cacheKey}`);
        if (stored) {
          const data = JSON.parse(stored) as GradeData[];
          // Store in all cache key formats for faster lookup next time
          cacheKeys.forEach(key => clientCache.set(key, data));
          console.log(`[Cache] ✅ Found in localStorage: ${cacheKey} (${data.length} entries)`);
          return data;
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    // 3. Try loading from optimized cache (new format, fastest!)
    try {
      const basePath = window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
      
      // Normalize course code for storage (matches fetch-all-grade-data.ts logic)
      // Clean the course code: remove spaces, uppercase, remove all non-alphanumeric characters
      const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
      const normalizedForStorage = cleaned.replace(/[^A-Z0-9]/g, '').toUpperCase();
      
      // Try multiple normalized formats
      const normalizedFormats = [
        normalizedForStorage, // Most common: all non-alphanumeric removed
        cleaned.replace(/[^A-Z0-9-]/g, '').replace(/-/g, '').toUpperCase(), // Remove everything except A-Z, 0-9, then remove dashes
        cleaned.replace(/[^A-Z0-9]/g, '').toUpperCase(), // Remove all non-alphanumeric
      ];
      
      // Remove duplicates
      const uniqueFormats = Array.from(new Set(normalizedFormats));
      
      for (const normalized of uniqueFormats) {
        const cacheFile = `${basePath}/data/grade-cache-optimized/${institution}/${normalized}.json`;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
          
          const response = await fetch(cacheFile, {
            cache: 'force-cache',
            signal: controller.signal,
          }).catch(() => null);
          
          clearTimeout(timeoutId);
          
          if (response && response.ok) {
            const cached: { i: string; c: string; d: Array<{ y: number; g: string; c: number }> } = await response.json();
            
            // Convert optimized format to GradeData
            if (cached.d && Array.isArray(cached.d) && cached.d.length > 0) {
              const gradeData: GradeData[] = cached.d.map(item => ({
                Institusjonskode: cached.i,
                Emnekode: cached.c,
                Karakter: item.g,
                Årstall: String(item.y),
                'Antall kandidater totalt': String(item.c),
              } as GradeData));
              
              // Store in client cache for faster lookup next time
              cacheKeys.forEach(key => {
                clientCache.set(key, gradeData);
                try {
                  localStorage.setItem(`grade-data-${key}`, JSON.stringify(gradeData));
                } catch {
                  // Ignore localStorage errors
                }
              });
              
              console.log(`[Cache] ✅ Found in optimized cache: ${institution}/${normalized}.json (${gradeData.length} entries)`);
              return gradeData;
            }
          }
        } catch (error) {
          // Try next format
          continue;
        }
      }
    } catch (error) {
      // Silently fail - optimized cache is optional
    }

    // 4. Skip cache.json check - it's optional and causes 404 errors
    // If we need cache.json data, it should be pre-loaded into localStorage during build
    // This prevents unnecessary 404 errors in console
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
    // Also store in client cache if on client (store in all key formats for faster lookup)
    if (typeof window !== 'undefined') {
      cacheKeys.forEach(key => {
        clientCache.set(key, cached);
        try {
          localStorage.setItem(`grade-data-${key}`, JSON.stringify(cached));
        } catch {
          // Ignore localStorage errors
        }
      });
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
  if (!data || data.length === 0) {
    return; // Don't cache empty data
  }

  // Normalize course code and create multiple cache keys for better lookup
  const normalizedCode = courseCode.replace(/-[0-9]+$/, '').trim().toUpperCase();
  const formattedCode = formatCourseCode(normalizedCode, institution);
  
  // Store in multiple formats for better cache hit rate
  const cacheKeys = [
    `${institutionCode}-${formattedCode}`,  // Formatted: "1120-EXPHIL-HFEKS-0"
    `${institutionCode}-${normalizedCode}`,  // Normalized: "1120-EXPHIL-HFEKS"
    `${institutionCode}-${courseCode}`,      // Original format
  ];

  // Store in client cache
  if (typeof window !== 'undefined') {
    // Store in all key formats for maximum cache hit rate
    cacheKeys.forEach(cacheKey => {
      clientCache.set(cacheKey, data);
      try {
        localStorage.setItem(`grade-data-${cacheKey}`, JSON.stringify(data));
      } catch (error) {
        // If localStorage is full, try to clear old entries
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          try {
            // Clear oldest entries (simple strategy: clear entries older than 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('grade-data-')) {
                // Try to store new data, clear old if needed
                if (i < localStorage.length - 10) {
                  localStorage.removeItem(key);
                }
              }
            }
            // Try again
            localStorage.setItem(`grade-data-${cacheKey}`, JSON.stringify(data));
          } catch {
            // Still failed - just use in-memory cache
          }
        }
      }
    });
    console.log(`[Cache] 💾 Stored in cache: ${normalizedCode} (${data.length} entries)`);
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
