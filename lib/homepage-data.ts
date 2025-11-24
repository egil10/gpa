import { CourseInfo } from './courses';

export interface HomepageTopCourse {
  institution: string;
  institutionCode: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  latestYear: number;
}

export interface HomepageTopDataset {
  generatedAt: string;
  courses: HomepageTopCourse[];
  topCourseCodes: string[];
}

let cachedDataset: HomepageTopDataset | null = null;
let loadingPromise: Promise<HomepageTopDataset | null> | null = null;

function resolveBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
}

export async function loadHomepageTopCourses(): Promise<HomepageTopDataset | null> {
  if (cachedDataset) {
    return cachedDataset;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const basePath = resolveBasePath();
  loadingPromise = fetch(`${basePath}/data/homepage-top-courses.json`, {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load homepage-top-courses.json: ${response.status}`);
      }
      const data = (await response.json()) as HomepageTopDataset;
      cachedDataset = data;
      return data;
    })
    .catch((error) => {
      console.warn('Unable to load homepage top courses:', error);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function mapTopCourseToCourseInfo(course: HomepageTopCourse): CourseInfo {
  const uniqueKey = `${course.institution}-${course.courseCode}`;
  return {
    code: course.courseCode,
    name: course.courseName,
    institution: course.institution,
    institutionCode: course.institutionCode,
    key: uniqueKey,
  };
}

