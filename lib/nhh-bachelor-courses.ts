// NHH Bachelor courses data
// Auto-generated from discovery script
// To update: run `npm run discover-nhh`

import { CourseInfo } from './courses';

export interface NHHBachelorCourse {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
}

// This will be populated from the JSON file
let nhhBachelorCoursesData: NHHBachelorCourse[] | null = null;

/**
 * Load NHH Bachelor courses from the JSON file
 * This is called automatically on first access
 */
async function loadNHHBachelorCourses(): Promise<NHHBachelorCourse[]> {
  if (nhhBachelorCoursesData) {
    return nhhBachelorCoursesData;
  }

  try {
    // In browser: fetch from public directory
    // In Node.js: read from file system
    if (typeof window === 'undefined') {
      // Server-side: read from file
      const fs = await import('fs');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'data', 'institutions', 'nhh-bachelor-courses.json');
      
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);
        nhhBachelorCoursesData = data.courses || [];
        return nhhBachelorCoursesData;
      }
    } else {
      // Client-side: fetch from public API or static file
      // We'll create an API route for this
      const response = await fetch('/api/courses/nhh-bachelor');
      if (response.ok) {
        const data = await response.json();
        nhhBachelorCoursesData = data.courses || [];
        return nhhBachelorCoursesData;
      }
    }
  } catch (error) {
    console.warn('Failed to load NHH Bachelor courses:', error);
  }

  return [];
}

/**
 * Get all NHH Bachelor courses
 */
export async function getNHHBachelorCourses(): Promise<NHHBachelorCourse[]> {
  return loadNHHBachelorCourses();
}

/**
 * Search NHH Bachelor courses by code or name
 */
export async function searchNHHBachelorCourses(query: string): Promise<NHHBachelorCourse[]> {
  const courses = await loadNHHBachelorCourses();
  const normalizedQuery = query.trim().toUpperCase();
  
  if (!normalizedQuery) {
    return courses.slice(0, 10); // Return first 10 if no query
  }
  
  return courses.filter(course => 
    course.courseCode.toUpperCase().includes(normalizedQuery)
  ).slice(0, 10);
}

/**
 * Get NHH Bachelor course by code
 */
export async function getNHHBachelorCourseByCode(code: string): Promise<NHHBachelorCourse | null> {
  const courses = await loadNHHBachelorCourses();
  const normalizedCode = code.trim().toUpperCase().replace(/-1$/, '');
  
  return courses.find(c => 
    c.courseCode.toUpperCase() === normalizedCode
  ) || null;
}

/**
 * Convert NHH Bachelor course to CourseInfo format for compatibility
 */
export function nhhCourseToCourseInfo(course: NHHBachelorCourse): CourseInfo {
  return {
    code: course.courseCode,
    name: course.courseName || course.courseCode,
    institution: 'NHH',
    institutionCode: '1240',
  };
}

