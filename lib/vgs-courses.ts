// Videregående skole (High School) courses database
// Now loads real course data from the VGS grade statistics API

export interface VGSCourse {
  code: string; // Course code (e.g., "ENG1007")
  name: string; // Course name
  category?: 'fellesfag' | 'realfag' | 'språk-samfunnsfag-økonomi' | 'andre-programfag' | 'idrettsfag' | 'kunst-design-arkitektur' | 'medier-kommunikasjon' | 'musikk-dans-drama' | 'dans' | 'drama' | 'musikk';
  level?: 'VG1' | 'VG2' | 'VG3';
  hours?: number; // Teaching hours
  credits?: number; // Typical credit value (1 credit = 1 year subject)
  years?: string[]; // Available years for this course
}

// Cache for VGS courses loaded from API
let cachedVGSCourses: VGSCourse[] | null = null;
let coursesLoadingPromise: Promise<VGSCourse[]> | null = null;

/**
 * Clear VGS courses cache (useful for testing or manual refresh)
 */
export async function clearVGSCoursesCache(): Promise<void> {
  cachedVGSCourses = null;
  coursesLoadingPromise = null;
  
  // Also clear the underlying grade data cache
  try {
    const { clearVGSCache } = await import('./vgs-grade-data');
    clearVGSCache();
  } catch {
    // Ignore if module not available
  }
}

/**
 * Load all VGS courses from the grade statistics API
 */
async function loadVGSCoursesFromAPI(): Promise<VGSCourse[]> {
  if (cachedVGSCourses) {
    return cachedVGSCourses;
  }

  if (coursesLoadingPromise) {
    return coursesLoadingPromise;
  }

  coursesLoadingPromise = (async () => {
    try {
      const { getAllVGSCourses } = await import('./vgs-grade-data');
      const apiCourses = await getAllVGSCourses();
      
      // Convert API format to VGSCourse format
      const courses: VGSCourse[] = apiCourses.map(apiCourse => ({
        code: apiCourse.code,
        name: apiCourse.name,
        years: apiCourse.years,
        credits: 1, // Default 1 credit for VGS courses
      }));

      cachedVGSCourses = courses;
      return courses;
    } catch (error) {
      console.error('Error loading VGS courses from API:', error);
      // Fallback to empty array if API fails
      return [];
    } finally {
      coursesLoadingPromise = null;
    }
  })();

  return coursesLoadingPromise;
}

/**
 * Get all VGS courses (loads from API if not cached)
 */
export async function getAllVGSCoursesList(): Promise<VGSCourse[]> {
  return loadVGSCoursesFromAPI();
}

/**
 * Get VGS courses synchronously (returns cached data or empty array)
 */
export function getVGSCoursesSync(): VGSCourse[] {
  return cachedVGSCourses || [];
}

/**
 * Search VGS courses by code or name
 */
export async function searchVGSCourses(query: string, category?: VGSCourse['category']): Promise<VGSCourse[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const courses = await loadVGSCoursesFromAPI();
  
  if (!normalizedQuery) {
    // Return popular courses when empty
    return getPopularVGSCourses(courses);
  }

  return courses.filter((course) => {
    const matchesCode = course.code.toLowerCase().includes(normalizedQuery);
    const matchesName = course.name.toLowerCase().includes(normalizedQuery);
    const matchesQuery = matchesCode || matchesName;
    const matchesCategory = !category || course.category === category;
    return matchesQuery && matchesCategory;
  }).slice(0, 20); // Limit to 20 results
}

/**
 * Get popular VGS courses (courses with most data/years)
 */
function getPopularVGSCourses(courses: VGSCourse[]): VGSCourse[] {
  // Sort by number of years (more years = more popular/important)
  const sorted = [...courses].sort((a, b) => {
    const aYears = a.years?.length || 0;
    const bYears = b.years?.length || 0;
    if (bYears !== aYears) return bYears - aYears;
    return a.name.localeCompare(b.name, 'no');
  });
  
  // Return top courses
  return sorted.slice(0, 20);
}

/**
 * Get VGS course by code (exact match)
 */
export async function getVGSCourseByCode(code: string): Promise<VGSCourse | null> {
  const courses = await loadVGSCoursesFromAPI();
  return courses.find((c) => c.code.toUpperCase() === code.toUpperCase()) || null;
}

/**
 * Get VGS course by name (exact match)
 */
export async function getVGSCourseByName(name: string): Promise<VGSCourse | null> {
  const courses = await loadVGSCoursesFromAPI();
  return courses.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Get all courses in a category
 */
export async function getVGSCoursesByCategory(category: VGSCourse['category']): Promise<VGSCourse[]> {
  const courses = await loadVGSCoursesFromAPI();
  return courses.filter((c) => c.category === category);
}

/**
 * Get all courses for a specific level
 */
export async function getVGSCoursesByLevel(level: VGSCourse['level']): Promise<VGSCourse[]> {
  const courses = await loadVGSCoursesFromAPI();
  return courses.filter((c) => c.level === level);
}

