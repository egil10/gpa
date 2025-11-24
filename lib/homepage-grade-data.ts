import { CourseStats } from '@/types';

export interface HomepageGradeDataPayload {
  generatedAt: string;
  courses: Array<CourseStats & { institution: string; courseName: string }>;
}

let cachedData: HomepageGradeDataPayload | null = null;
let loadingPromise: Promise<HomepageGradeDataPayload | null> | null = null;

function resolveBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
}

export async function loadHomepageGradeData(): Promise<HomepageGradeDataPayload | null> {
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
  loadingPromise = fetch(`${basePath}/data/homepage-grade-data.json`, {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load homepage-grade-data.json: ${response.status}`);
      }
      const data = (await response.json()) as HomepageGradeDataPayload;
      cachedData = data;
      return data;
    })
    .catch((error) => {
      console.warn('Unable to load pre-rendered homepage grade data:', error);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

