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

