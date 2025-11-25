/**
 * Grade data cache system
 * 
 * Primary cache source: Optimized cache (public/data/grade-cache-optimized/)
 * This cache contains ALL fetched course data from fetch-all-grade-data.ts
 * 
 * Cache Priority:
 * 1. Client in-memory cache (fastest)
 * 2. localStorage (persistent across page loads)
 * 3. Optimized cache files (public/data/grade-cache-optimized/)
 * 
 * If cache miss, data should be fetched via api.ts which will cache it for next time.
 */

import { GradeData } from '@/types';
import { formatCourseCode } from './api';
import { loadInstitutionCourses } from './all-courses';

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
 * Get grade data from cache
 * 
 * Priority order:
 * 1. Client in-memory cache (fastest, per-session)
 * 2. localStorage (persistent across page loads)
 * 3. Optimized cache files (public/data/grade-cache-optimized/)
 * 
 * Returns null if no cache hit - caller should then fetch from API via api.ts
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
      // The fetch script uses normalizeCourseCodeAdvanced which:
      // - Removes spaces, uppercases
      // - Normalizes separators (keeps dashes, replaces _ and . with -)
      // - Removes trailing "000" if separated by space/dash
      // - Removes suffixes like -1, -12, -L1, -G, -MB (but keeps meaningful dashes like STK-MAT2011)
      
      // Replicate the normalization logic (can't import from scripts/ in browser)
      // This matches normalizeCourseCodeAdvanced() from lib/course-code-normalizer.ts
      const cleaned = courseCode.toUpperCase().trim().replace(/\s+/g, '');
      
      // Step 1: Normalize separators (keep dashes, replace _ and . with -)
      let normalized = cleaned.replace(/[_.]+/g, '-').replace(/-+/g, '-');
      
      // Step 2: Remove trailing "000" if present in original (only if it was separated by space or dash)
      if (/(?:\s|-)0{3}$/i.test(courseCode)) {
        normalized = normalized.replace(/0{3}$/, '');
      }
      
      // Step 3: Remove suffixes like -1, -12, -L1, -G, -MB, etc. (but keep meaningful dashes like STK-MAT2011)
      // Only remove simple suffix patterns at the end, not complex course code parts
      let keepRemoving = true;
      while (keepRemoving && normalized.length > 4) {
        keepRemoving = false;
        const match = normalized.match(/-([A-Z0-9]{1,3})$/);
        if (match) {
          const token = match[1];
          // Only remove if it's a simple suffix: 1-2 digits, single letter+digit, or 1-2 letters
          if (/^\d{1,2}$/.test(token) || /^[A-Z]\d{1}$/i.test(token) || /^[A-Z]{1,2}$/i.test(token)) {
            normalized = normalized.slice(0, -(token.length + 1));
            keepRemoving = true;
          }
        }
      }
      
      // Try multiple normalized formats (in order of likelihood)
      const normalizedFormats = [
        normalized, // Primary: normalized with dashes kept (e.g., "STK-MAT2011")
        cleaned.replace(/[^A-Z0-9]/g, '').toUpperCase(), // Fallback: all non-alphanumeric removed (e.g., "STKMAT2011")
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

  }

  // No cache hit - return null so caller can fetch from API
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
