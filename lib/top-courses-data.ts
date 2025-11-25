import { CourseStats } from '@/types';

export interface TopCoursesPayload {
  generatedAt: string;
  courses: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }>;
}

let cachedData: TopCoursesPayload | null = null;
let loadingPromise: Promise<TopCoursesPayload | null> | null = null;

function resolveBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
}

export async function loadTopCoursesData(): Promise<TopCoursesPayload | null> {
  if (cachedData) {
    return cachedData;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const basePath = resolveBasePath();
  loadingPromise = fetch(`${basePath}/data/homepage-top-courses-data.json`, {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load homepage-top-courses-data.json: ${response.status}`);
      }
      const data = (await response.json()) as TopCoursesPayload;
      cachedData = data;
      return data;
    })
    .catch((error) => {
      console.warn('Unable to load top courses data:', error);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}
