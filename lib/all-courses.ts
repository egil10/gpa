/**
 * Unified course data manager
 * Loads and manages course data from all institutions
 */

import { CourseInfo } from './courses';
import { UNIVERSITIES } from './api';
import { loadCourseData, CourseData, searchCourseData } from './course-loader';

// Institution data file mappings - only institutions with actual data files
const INSTITUTION_DATA_FILES: Record<string, { file: string; code: string }> = {
  UiO: { file: 'uio-all-courses.json', code: '1110' },
  NTNU: { file: 'ntnu-all-courses.json', code: '1150' },
  UiB: { file: 'uib-all-courses.json', code: '1120' },
  NHH: { file: 'nhh-all-courses.json', code: '1240' },
  // OsloMet and BI removed - no data files available
};

/**
 * Get list of available institutions (those with data files)
 */
export function getAvailableInstitutions(): string[] {
  return Object.keys(INSTITUTION_DATA_FILES);
}

// Cache for loaded course data
const courseDataCache: Map<string, CourseInfo[]> = new Map();
const loadingPromises: Map<string, Promise<CourseInfo[]>> = new Map();

/**
 * Strip suffix from course code for display (e.g., "IN2010-1" -> "IN2010", "BØK1101" -> "BØK110")
 */
export function stripCourseCodeSuffix(code: string): string {
  // Remove -1 or 1 suffix (handles both BI format and standard format)
  return code.replace(/[-]?1$/, '').trim();
}

/**
 * Check if a course has data available (has years with students)
 */
function courseHasData(courseData: CourseData): boolean {
  // Course has data if:
  // 1. It has years array with at least one year
  // 2. It has lastYearStudents count (indicates data exists)
  // 3. Years array is not empty
  return (
    (courseData.years && courseData.years.length > 0) ||
    (courseData.lastYearStudents !== undefined && courseData.lastYearStudents > 0)
  );
}

/**
 * Convert CourseData to CourseInfo
 */
function courseDataToCourseInfo(courseData: CourseData, institution: string, institutionCode: string): CourseInfo {
  // Strip suffix for display
  const displayCode = stripCourseCodeSuffix(courseData.courseCode);
  return {
    code: displayCode,
    name: courseData.courseName || displayCode,
    institution,
    institutionCode,
  };
}

/**
 * Load all courses for a specific institution
 */
export async function loadInstitutionCourses(institution: string): Promise<CourseInfo[]> {
  // Check cache first
  if (courseDataCache.has(institution)) {
    return courseDataCache.get(institution)!;
  }

  // Check if already loading
  if (loadingPromises.has(institution)) {
    return loadingPromises.get(institution)!;
  }

  const institutionData = INSTITUTION_DATA_FILES[institution];
  if (!institutionData) {
    console.warn(`No data file found for institution: ${institution}`);
    return [];
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      // Load from public folder - files should be copied there during build
      // Try multiple paths to handle different deployment scenarios
      let fileName = `data/institutions/${institutionData.file}`;
      let courseData = await loadCourseData(fileName, institutionData.code);
      
      // If that fails, try public folder directly
      if (courseData.length === 0) {
        fileName = institutionData.file;
        courseData = await loadCourseData(fileName, institutionData.code);
      }
      
      // If still empty, try with /gpa prefix (for production)
      if (courseData.length === 0 && typeof window !== 'undefined') {
        fileName = `/gpa/data/institutions/${institutionData.file}`;
        courseData = await loadCourseData(fileName, institutionData.code);
      }
      
      // Convert to CourseInfo format and filter out courses without data
      const courses = courseData
        .filter(cd => courseHasData(cd)) // Only include courses with data
        .map(cd => 
          courseDataToCourseInfo(cd, institution, institutionData.code)
        );

      // Cache the results
      courseDataCache.set(institution, courses);
      return courses;
    } catch (error) {
      console.error(`Failed to load courses for ${institution}:`, error);
      return [];
    } finally {
      loadingPromises.delete(institution);
    }
  })();

  loadingPromises.set(institution, loadPromise);
  return loadPromise;
}

/**
 * Load all courses from all institutions
 */
export async function loadAllCourses(): Promise<CourseInfo[]> {
  const institutions = Object.keys(INSTITUTION_DATA_FILES);
  const allPromises = institutions.map(inst => loadInstitutionCourses(inst));
  const allResults = await Promise.all(allPromises);
  return allResults.flat();
}

/**
 * Search courses across all institutions or a specific one
 */
export async function searchAllCourses(
  query: string,
  institution?: string,
  limit: number = 20
): Promise<CourseInfo[]> {
  if (institution) {
    // Search specific institution
    const courses = await loadInstitutionCourses(institution);
    return searchCoursesFromList(courses, query, limit);
  } else {
    // Search all institutions
    const allCourses = await loadAllCourses();
    return searchCoursesFromList(allCourses, query, limit);
  }
}

/**
 * Search courses from a list
 */
function searchCoursesFromList(
  courses: CourseInfo[],
  query: string,
  limit: number
): CourseInfo[] {
  // Strip suffix from query for searching (user might type "IN2010-1" but we want to match "IN2010")
  const normalizedQuery = stripCourseCodeSuffix(query.trim().toUpperCase());
  
  if (!normalizedQuery) {
    // Return popular courses (by code length - shorter codes are usually more popular)
    return courses
      .filter(c => c.code.length <= 8) // Filter out very long codes
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  }

  // Search by code first, then by name
  const codeMatches: CourseInfo[] = [];
  const nameMatches: CourseInfo[] = [];
  const codeStartsWith: CourseInfo[] = [];
  const nameStartsWith: CourseInfo[] = [];

  for (const course of courses) {
    const codeUpper = course.code.toUpperCase();
    const nameUpper = course.name.toUpperCase();

    if (codeUpper === normalizedQuery) {
      // Exact code match - highest priority
      codeStartsWith.unshift(course);
    } else if (codeUpper.startsWith(normalizedQuery)) {
      codeStartsWith.push(course);
    } else if (codeUpper.includes(normalizedQuery)) {
      codeMatches.push(course);
    } else if (nameUpper.startsWith(normalizedQuery)) {
      nameStartsWith.push(course);
    } else if (nameUpper.includes(normalizedQuery)) {
      nameMatches.push(course);
    }
  }

  // Prioritize: exact code > code starts with > code contains > name starts with > name contains
  return [
    ...codeStartsWith,
    ...codeMatches,
    ...nameStartsWith,
    ...nameMatches,
  ].slice(0, limit);
}

/**
 * Get course by code
 */
export async function getCourseByCode(
  code: string,
  institution?: string
): Promise<CourseInfo | null> {
  // Strip suffix from code for matching (user might type "IN2010-1" but we store "IN2010")
  const normalizedCode = stripCourseCodeSuffix(code.trim().toUpperCase());
  
  if (institution) {
    const courses = await loadInstitutionCourses(institution);
    return courses.find(c => c.code.toUpperCase() === normalizedCode) || null;
  } else {
    const allCourses = await loadAllCourses();
    return allCourses.find(c => c.code.toUpperCase() === normalizedCode) || null;
  }
}

/**
 * Get popular courses for an institution
 */
export async function getPopularCourses(
  institution?: string,
  limit: number = 10
): Promise<CourseInfo[]> {
  if (institution) {
    const courses = await loadInstitutionCourses(institution);
    // Return shorter course codes (usually more popular)
    return courses
      .filter(c => c.code.length <= 8)
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  } else {
    const allCourses = await loadAllCourses();
    return allCourses
      .filter(c => c.code.length <= 8)
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  }
}

/**
 * Preload courses for an institution (useful for autocomplete)
 */
export function preloadInstitutionCourses(institution: string): void {
  if (!courseDataCache.has(institution) && !loadingPromises.has(institution)) {
    loadInstitutionCourses(institution).catch(console.error);
  }
}

