import { CourseStats } from '@/types';

export interface Hardcoded28Payload {
  generatedAt: string;
  courses: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }>;
}

let cachedData: Hardcoded28Payload | null = null;
let loadingPromise: Promise<Hardcoded28Payload | null> | null = null;

function resolveBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname.startsWith('/gpa') ? '/gpa' : '';
}

export async function loadHardcoded28Data(): Promise<Hardcoded28Payload | null> {
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
  loadingPromise = fetch(`${basePath}/data/homepage-hardcoded-28.json`, {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load homepage-hardcoded-28.json: ${response.status}`);
      }
      const data = (await response.json()) as Hardcoded28Payload;
      cachedData = data;
      return data;
    })
    .catch((error) => {
      console.warn('Unable to load hardcoded 28-course data:', error);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

