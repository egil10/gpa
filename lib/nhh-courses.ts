// NHH All courses data
// Auto-generated from discovery script
// To update: run `npm run discover-nhh-all`

import { CourseInfo } from './courses';
import { loadCourseData, searchCourseData, CourseData } from './course-loader';

export interface NHHCourse {
  courseCode: string;
  courseName?: string;
  years: number[];
  lastYearStudents?: number;
}

// Cache for loaded courses
let nhhCoursesData: NHHCourse[] | null = null;

/**
 * Load NHH courses from the optimized JSON file
 */
async function loadNHHCourses(): Promise<NHHCourse[]> {
  if (nhhCoursesData) {
    return nhhCoursesData;
  }

  try {
    const courses = await loadCourseData('nhh-all-courses.json', '1240');
    nhhCoursesData = courses.map(c => ({
      courseCode: c.courseCode,
      courseName: c.courseName,
      years: c.years,
      lastYearStudents: c.lastYearStudents,
    }));
    return nhhCoursesData;
  } catch (error) {
    console.warn('Failed to load NHH courses:', error);
    nhhCoursesData = [];
    return [];
  }
}

/**
 * Get all NHH courses
 */
export async function getNHHCourses(): Promise<NHHCourse[]> {
  return loadNHHCourses();
}

/**
 * Search NHH courses by code or name
 */
export async function searchNHHCourses(query: string): Promise<NHHCourse[]> {
  const courses = await loadNHHCourses();
  const normalizedQuery = query.trim().toUpperCase();
  
  if (!normalizedQuery) {
    // Return most popular courses (by student count) if no query
    return courses
      .filter(c => c.lastYearStudents && c.lastYearStudents > 0)
      .sort((a, b) => (b.lastYearStudents || 0) - (a.lastYearStudents || 0))
      .slice(0, 10);
  }
  
  // Search by code first, then by name
  const results = searchCourseData(courses.map(c => ({
    courseCode: c.courseCode,
    courseName: c.courseName,
    years: c.years,
    lastYearStudents: c.lastYearStudents,
  })), query, 10);
  
  return results.map(c => ({
    courseCode: c.courseCode,
    courseName: c.courseName,
    years: c.years,
    lastYearStudents: c.lastYearStudents,
  }));
}

/**
 * Get NHH course by code
 */
export async function getNHHCourseByCode(code: string): Promise<NHHCourse | null> {
  const courses = await loadNHHCourses();
  const normalizedCode = code.trim().toUpperCase().replace(/-1$/, '');
  
  return courses.find(c => 
    c.courseCode.toUpperCase() === normalizedCode
  ) || null;
}

/**
 * Convert NHH course to CourseInfo format for compatibility
 */
export function nhhCourseToCourseInfo(course: NHHCourse): CourseInfo {
  const uniqueKey = `NHH-${course.courseCode}`;
  return {
    code: course.courseCode,
    name: course.courseName || course.courseCode,
    institution: 'NHH',
    institutionCode: '1240',
    key: uniqueKey,
  };
}

