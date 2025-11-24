import { GradeData } from '@/types';

export interface DepartmentCourse {
  courseCode: string;
  courseName?: string; // If available in API response
  years: number[];
  totalStudents: number;
}

/**
 * Extract unique courses from department/faculty grade data
 */
export function extractCoursesFromDepartmentData(data: GradeData[]): DepartmentCourse[] {
  // Group by course code
  const courseMap = new Map<string, DepartmentCourse>();

  data.forEach((item) => {
    const courseCode = item.Emnekode;
    const year = parseInt(item.Årstall, 10);
    const studentCount = parseInt(item['Antall kandidater totalt'] || '0', 10);

    if (!courseMap.has(courseCode)) {
      courseMap.set(courseCode, {
        courseCode,
        years: [],
        totalStudents: 0,
      });
    }

    const course = courseMap.get(courseCode)!;
    if (!course.years.includes(year)) {
      course.years.push(year);
    }
    course.totalStudents += studentCount;
  });

  // Sort years for each course
  const courses = Array.from(courseMap.values());
  courses.forEach(course => {
    course.years.sort((a, b) => b - a); // Most recent first
  });

  // Sort courses by code
  courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

  return courses;
}

/**
 * Get course code without suffix (e.g., "IN2010-1" -> "IN2010")
 * Only removes "-1" suffix, preserving dashes and numbers that are part of the actual course code
 */
export function normalizeCourseCode(code: string): string {
  // Only remove "-1" suffix (dash followed by 1 at the end)
  return code.replace(/-[0-9]+$/, '').trim();
}

/**
 * Format course code for display
 */
export function formatCourseCodeForDisplay(code: string): string {
  const normalized = normalizeCourseCode(code);
  return normalized;
}

