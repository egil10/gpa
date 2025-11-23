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

// Import the course data directly (works for static export)
// This will be populated at build time
let nhhBachelorCoursesData: NHHBachelorCourse[] | null = null;

/**
 * Load NHH Bachelor courses from the JSON file
 * This is called automatically on first access
 * For static export, we import the JSON at build time
 */
async function loadNHHBachelorCourses(): Promise<NHHBachelorCourse[]> {
  if (nhhBachelorCoursesData) {
    return nhhBachelorCoursesData;
  }

  try {
    // Try to load from public folder (works for static export)
    // The JSON file will be copied to public during build
    if (typeof window !== 'undefined') {
      // Client-side: fetch from public folder
      // Handle basePath (e.g., /gpa) if configured
      const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
      const response = await fetch(`${basePath}/nhh-bachelor-courses.json`);
      if (response.ok) {
        const data = await response.json();
        const courses = (data.courses || []) as NHHBachelorCourse[];
        nhhBachelorCoursesData = courses;
        return courses;
      }
    } else {
      // Server-side: read from file system
      const fs = require('fs');
      const path = require('path');
      const dataPath = path.join(process.cwd(), 'data', 'institutions', 'nhh-bachelor-courses.json');
      
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);
        const courses = (data.courses || []) as NHHBachelorCourse[];
        nhhBachelorCoursesData = courses;
        return courses;
      }
    }
  } catch (error) {
    console.warn('Failed to load NHH Bachelor courses:', error);
  }

  // Return empty array if loading fails
  const empty: NHHBachelorCourse[] = [];
  nhhBachelorCoursesData = empty;
  return empty;
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

