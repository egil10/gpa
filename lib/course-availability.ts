const STORAGE_KEY = 'unavailable-courses';

const unavailableCourses = new Set<string>();
let initialized = false;

function makeKey(code: string, institution: string): string {
  return `${institution.toUpperCase()}::${code.replace(/\s+/g, '').toUpperCase()}`;
}

function ensureInitialized(): void {
  if (initialized || typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: string[] = JSON.parse(stored);
      parsed.forEach(key => unavailableCourses.add(key));
    }
  } catch {
    // Ignore parsing/localStorage errors
  } finally {
    initialized = true;
  }
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unavailableCourses)));
  } catch {
    // Ignore storage errors (quota, etc.)
  }
}

export function isCourseUnavailable(code: string, institution: string): boolean {
  ensureInitialized();
  return unavailableCourses.has(makeKey(code, institution));
}

export function markCourseAsUnavailable(code: string, institution: string): void {
  ensureInitialized();
  const key = makeKey(code, institution);
  if (!unavailableCourses.has(key)) {
    unavailableCourses.add(key);
    persist();
  }
}

