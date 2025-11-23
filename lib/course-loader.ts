/**
 * Generic course loader for optimized JSON format
 * Handles both optimized (minimal) and legacy (full) formats
 */

export interface CourseData {
  courseCode: string;
  courseName?: string;
  years: number[];
  lastYearStudents?: number;
}

interface OptimizedCourse {
  c: string; // courseCode
  n?: string; // courseName
  y: number[]; // years
  s?: number; // lastYearStudents
}

interface OptimizedFormat {
  i: string; // institution code
  courses: OptimizedCourse[];
}

interface LegacyFormat {
  institution?: string;
  institutionCode?: string;
  courses: Array<{
    courseCode: string;
    courseName?: string;
    years: number[];
    lastYear?: number;
    lastYearStudents?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Convert optimized course to standard format
 */
function normalizeCourse(course: OptimizedCourse | any, institutionCode: string): CourseData {
  // Handle optimized format
  if ('c' in course && 'y' in course) {
    return {
      courseCode: course.c,
      courseName: course.n,
      years: course.y,
      lastYearStudents: course.s,
    };
  }
  
  // Handle legacy format
  return {
    courseCode: course.courseCode || course.code,
    courseName: course.courseName || course.name,
    years: course.years || [],
    lastYearStudents: course.lastYearStudents || course.s,
  };
}

/**
 * Load and parse course data from JSON
 * Supports both optimized and legacy formats
 */
export async function loadCourseData(
  fileName: string,
  institutionCode: string
): Promise<CourseData[]> {
  try {
    // Try to load from public folder (works for static export)
    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
    
    // Try regular JSON first (gzip handled by server)
    const response = await fetch(`${basePath}/${fileName}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    let data: OptimizedFormat | LegacyFormat;
    
    if (contentType.includes('gzip') || fileName.endsWith('.gz')) {
      // Decompress gzip (browser handles this automatically if server sends correct headers)
      const arrayBuffer = await response.arrayBuffer();
      // Note: Browser may auto-decompress, so try JSON.parse first
      try {
        const text = new TextDecoder().decode(arrayBuffer);
        data = JSON.parse(text);
      } catch {
        // If that fails, we'd need to decompress manually (requires pako or similar)
        // For now, fall back to uncompressed
        const jsonResponse = await fetch(`${basePath}/${fileName}`);
        data = await jsonResponse.json();
      }
    } else {
      data = await response.json();
    }
    
    // Extract courses array
    const courses = (data as any).courses || [];
    const instCode = (data as OptimizedFormat).i || (data as LegacyFormat).institutionCode || institutionCode;
    
    // Normalize courses to standard format
    return courses.map((course: any) => normalizeCourse(course, instCode));
    
  } catch (error) {
    console.warn(`Failed to load course data from ${fileName}:`, error);
    return [];
  }
}

/**
 * Search courses by code or name
 */
export function searchCourseData(
  courses: CourseData[],
  query: string,
  limit: number = 10
): CourseData[] {
  const normalizedQuery = query.trim().toUpperCase();
  
  if (!normalizedQuery) {
    // Return most popular courses (by student count) if no query
    return courses
      .filter(c => c.lastYearStudents && c.lastYearStudents > 0)
      .sort((a, b) => (b.lastYearStudents || 0) - (a.lastYearStudents || 0))
      .slice(0, limit);
  }
  
  // Search by code first, then by name
  const codeMatches: CourseData[] = [];
  const nameMatches: CourseData[] = [];
  
  for (const course of courses) {
    const codeMatch = course.courseCode.toUpperCase().includes(normalizedQuery);
    const nameMatch = course.courseName?.toUpperCase().includes(normalizedQuery);
    
    if (codeMatch) {
      codeMatches.push(course);
    } else if (nameMatch) {
      nameMatches.push(course);
    }
  }
  
  // Prioritize code matches
  return [...codeMatches, ...nameMatches].slice(0, limit);
}

