/**
 * VGS Grade Data Loader
 * Loads VGS grade statistics from the parsed JSON file
 */

import { GradeData } from '@/types';

interface VGSGradeDataEntry {
  courseCode: string;
  courseName: string;
  year: string; // e.g., "2024-25"
  averageGrade: number | null;
  totalStudents: number | null;
  gradeDistribution: {
    '1': number | null;
    '2': number | null;
    '3': number | null;
    '4': number | null;
    '5': number | null;
    '6': number | null;
  };
  level: string;
  assessmentType?: string; // e.g., "Standpunkt", "Muntlig eksamen", "Skriftlig eksamen"
}

interface VGSGradeDataFile {
  metadata: {
    source: string;
    url: string;
    csvFile?: string;
    parsedAt?: string;
    fetchedAt?: string;
    totalRecords: number;
    nationalRecords?: number;
    uniqueCourses: number;
    years: string[];
    assessmentTypes?: string[];
    filterClauses?: Record<string, any>;
    radSti?: string;
  };
  gradeData: VGSGradeDataEntry[];
}

let cachedVGSData: VGSGradeDataFile | null = null;

// Cache keys for localStorage
const VGS_DATA_CACHE_KEY = 'vgs-grade-data';
const VGS_COURSES_CACHE_KEY = 'vgs-courses-list';
const VGS_CACHE_VERSION_KEY = 'vgs-cache-version';
const VGS_CACHE_VERSION = '1.0'; // Increment when data structure changes

/**
 * Load VGS grade data from JSON file (cached)
 * Uses localStorage for client-side caching
 */
async function loadVGSGradeData(): Promise<VGSGradeDataFile> {
  if (cachedVGSData) {
    return cachedVGSData;
  }

  // Try localStorage first (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const cachedVersion = localStorage.getItem(VGS_CACHE_VERSION_KEY);
      const cachedData = localStorage.getItem(VGS_DATA_CACHE_KEY);
      
      // Only use cached data if version matches
      if (cachedVersion === VGS_CACHE_VERSION && cachedData) {
        try {
          cachedVGSData = JSON.parse(cachedData);
          console.log('[VGS Cache] ✅ Loaded from localStorage');
          return cachedVGSData;
        } catch (error) {
          // Invalid cache, clear it
          localStorage.removeItem(VGS_DATA_CACHE_KEY);
          localStorage.removeItem(VGS_COURSES_CACHE_KEY);
        }
      } else if (cachedVersion !== VGS_CACHE_VERSION) {
        // Version mismatch, clear old cache
        localStorage.removeItem(VGS_DATA_CACHE_KEY);
        localStorage.removeItem(VGS_COURSES_CACHE_KEY);
      }
    } catch (error) {
      // localStorage not available or quota exceeded, continue to fetch
      console.warn('[VGS Cache] localStorage not available, fetching from network');
    }
  }

  // Try multiple paths (for different deployment scenarios)
  const possiblePaths = [
    '/data/vgs-grade-statistics.json',
    '/gpa/data/vgs-grade-statistics.json',
  ];

  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        cachedVGSData = await response.json();
        
        // Cache in localStorage (client-side only)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(VGS_DATA_CACHE_KEY, JSON.stringify(cachedVGSData));
            localStorage.setItem(VGS_CACHE_VERSION_KEY, VGS_CACHE_VERSION);
            console.log('[VGS Cache] 💾 Cached to localStorage');
          } catch (error) {
            // localStorage quota exceeded or not available
            console.warn('[VGS Cache] Could not cache to localStorage:', error);
          }
        }
        
        return cachedVGSData;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }

  throw new Error(`Failed to load VGS grade data from any path: ${possiblePaths.join(', ')}`);
}

/**
 * Convert VGS grade data (1-6 scale) to GradeData format (for compatibility)
 */
function convertVGSGradeDataToGradeData(
  vgsData: VGSGradeDataEntry[]
): GradeData[] {
  const gradeData: GradeData[] = [];

  for (const entry of vgsData) {
    // Extract year from "2024-25" format (use start year)
    const year = parseInt(entry.year.split('-')[0], 10);

    // Convert grade distribution (1-6 scale) to GradeData format
    // Each grade becomes a separate entry
    const grades = ['1', '2', '3', '4', '5', '6'] as const;
    
    for (const grade of grades) {
      const percentage = entry.gradeDistribution[grade];
      if (percentage === null || percentage === undefined) continue;

      // Calculate count from percentage and total students
      const totalStudents = entry.totalStudents || 0;
      const count = Math.round((percentage / 100) * totalStudents);
      
      if (count > 0) {
        gradeData.push({
          Institusjonskode: 'VGS',
          Emnekode: entry.courseCode,
          Karakter: grade, // 1-6 scale
          Årstall: String(year),
          'Antall kandidater totalt': String(count),
        });
      }
    }
  }

  return gradeData;
}

/**
 * Fetch VGS grade data for a specific course code
 */
export async function fetchVGSGradeData(
  courseCode: string
): Promise<GradeData[]> {
  try {
    const data = await loadVGSGradeData();
    
    // Normalize course code (uppercase, trim)
    const normalizedCode = courseCode.toUpperCase().trim();
    
    // Find matching entries
    const matchingEntries = data.gradeData.filter(
      entry => entry.courseCode.toUpperCase() === normalizedCode
    );

    if (matchingEntries.length === 0) {
      return [];
    }

    // Convert to GradeData format
    return convertVGSGradeDataToGradeData(matchingEntries);
  } catch (error) {
    console.error(`Error fetching VGS grade data for ${courseCode}:`, error);
    return [];
  }
}

// Cache for processed course list
let cachedCourseList: Array<{ code: string; name: string; years: string[] }> | null = null;

/**
 * Get all VGS courses with grade data
 * Uses localStorage cache for faster subsequent loads
 */
export async function getAllVGSCourses(): Promise<Array<{
  code: string;
  name: string;
  years: string[];
}>> {
  // Return cached in-memory list if available
  if (cachedCourseList) {
    return cachedCourseList;
  }

  // Try localStorage cache first (client-side only, much faster than parsing full data)
  if (typeof window !== 'undefined') {
    try {
      const cachedVersion = localStorage.getItem(VGS_CACHE_VERSION_KEY);
      const cachedCourses = localStorage.getItem(VGS_COURSES_CACHE_KEY);
      
      if (cachedVersion === VGS_CACHE_VERSION && cachedCourses) {
        try {
          cachedCourseList = JSON.parse(cachedCourses);
          console.log('[VGS Cache] ✅ Loaded course list from localStorage');
          return cachedCourseList;
        } catch (error) {
          // Invalid cache, clear it
          localStorage.removeItem(VGS_COURSES_CACHE_KEY);
        }
      }
    } catch (error) {
      // localStorage not available, continue to process
    }
  }

  try {
    const data = await loadVGSGradeData();
    const courseMap = new Map<string, { name: string; years: Set<string> }>();

    for (const entry of data.gradeData) {
      if (!courseMap.has(entry.courseCode)) {
        courseMap.set(entry.courseCode, {
          name: entry.courseName,
          years: new Set(),
        });
      }
      courseMap.get(entry.courseCode)!.years.add(entry.year);
    }

    const courseList = Array.from(courseMap.entries()).map(([code, info]) => ({
      code,
      name: info.name,
      years: Array.from(info.years).sort(),
    }));

    // Cache the processed list
    cachedCourseList = courseList;

    // Cache in localStorage (client-side only, much smaller than full data)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(VGS_COURSES_CACHE_KEY, JSON.stringify(courseList));
        localStorage.setItem(VGS_CACHE_VERSION_KEY, VGS_CACHE_VERSION);
        console.log('[VGS Cache] 💾 Cached course list to localStorage');
      } catch (error) {
        // localStorage quota exceeded or not available
        console.warn('[VGS Cache] Could not cache course list to localStorage:', error);
      }
    }

    return courseList;
  } catch (error) {
    console.error('Error loading VGS courses:', error);
    return [];
  }
}

/**
 * Clear VGS cache (useful for testing or manual refresh)
 */
export function clearVGSCache(): void {
  cachedVGSData = null;
  cachedCourseList = null;
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(VGS_DATA_CACHE_KEY);
      localStorage.removeItem(VGS_COURSES_CACHE_KEY);
      localStorage.removeItem(VGS_CACHE_VERSION_KEY);
      console.log('[VGS Cache] 🗑️ Cleared all VGS caches');
    } catch (error) {
      // Ignore errors
    }
  }
}

