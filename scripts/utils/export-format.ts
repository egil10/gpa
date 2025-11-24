/**
 * Shared utilities for exporting course data in optimized format
 */

export interface OptimizedCourse {
  c: string; // courseCode
  n?: string; // courseName (optional)
  y: number[]; // years (sorted, most recent first)
  s?: number; // lastYearStudents (optional, for sorting)
}

export interface OptimizedExport {
  i: string; // institution code
  courses: OptimizedCourse[];
}

export interface FullCourseExport {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
  studentCountByYear?: Record<number, number>;
}

/**
 * Convert full course data to optimized format
 */
export function optimizeCourse(course: FullCourseExport): OptimizedCourse {
  const optimized: OptimizedCourse = {
    c: course.courseCode,
    y: [...course.years].sort((a, b) => b - a), // Most recent first
  };
  
  // Only include name if it exists and is different from code
  if (course.courseName && course.courseName !== course.courseCode) {
    optimized.n = course.courseName;
  }
  
  // Include student count for last year (useful for sorting/popular courses)
  if (course.lastYearStudents && course.lastYearStudents > 0) {
    optimized.s = course.lastYearStudents;
  }
  
  return optimized;
}

/**
 * Check if a course has data available (matches the logic in lib/all-courses.ts)
 * Only includes courses that have actual student data to prevent empty course pages
 */
export function courseHasData(course: FullCourseExport): boolean {
  // Course has data if it has lastYearStudents > 0 (most reliable indicator of actual data)
  // This ensures we only include courses with actual retrievable data from the API
  // Courses with lastYearStudents = 0 or undefined likely have no grade data available
  const hasStudentCount = course.lastYearStudents !== undefined && 
                          course.lastYearStudents !== null && 
                          course.lastYearStudents > 0;
  
  if (hasStudentCount) {
    return true; // Has actual student data
  }
  
  // If no lastYearStudents but has years array with data, include it (legacy format)
  // This handles edge cases where data format might be different
  const hasYears = Array.isArray(course.years) && course.years.length > 0;
  if (hasYears) {
    // Only include if lastYearStudents is not explicitly 0 (might be missing/undefined)
    // If it's explicitly 0, that means no students, so exclude it
    return course.lastYearStudents !== 0;
  }
  
  return false; // No data available
}

/**
 * Create optimized export structure
 */
export function createOptimizedExport(
  institutionCode: string,
  courses: FullCourseExport[]
): OptimizedExport {
  return {
    i: institutionCode,
    courses: courses.map(optimizeCourse),
  };
}

