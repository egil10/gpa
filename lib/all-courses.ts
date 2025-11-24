/**
 * Unified course data manager
 * Loads and manages course data from all institutions
 */

import { CourseInfo } from './courses';
import { UNIVERSITIES } from './api';
import { loadCourseData, CourseData, searchCourseData } from './course-loader';

// Institution data file mappings - only institutions with actual data files
export const INSTITUTION_DATA_FILES: Record<string, { file: string; code: string }> = {
  UiO: { file: 'uio-all-courses.json', code: '1110' },
  NTNU: { file: 'ntnu-all-courses.json', code: '1150' },
  UiB: { file: 'uib-all-courses.json', code: '1120' },
  NHH: { file: 'nhh-all-courses.json', code: '1240' },
  BI: { file: 'bi-all-courses.json', code: '8241' },
  OsloMet: { file: 'oslomet-all-courses.json', code: '1175' },
  Nord: { file: 'nord-all-courses.json', code: '1174' },
  NMBU: { file: 'nmbu-all-courses.json', code: '1173' },
  UiA: { file: 'uia-all-courses.json', code: '1171' },
  INN: { file: 'inn-all-courses.json', code: '1177' },
  UiS: { file: 'uis-all-courses.json', code: '1160' },
  USN: { file: 'usn-all-courses.json', code: '1176' },
  UiT: { file: 'uit-all-courses.json', code: '1130' },
  NMH: { file: 'nmh-all-courses.json', code: '1210' },
  NIH: { file: 'nih-all-courses.json', code: '1260' },
  KHIO: { file: 'khio-all-courses.json', code: '6220' },
  HIM: { file: 'him-all-courses.json', code: '0232' },
  AHO: { file: 'aho-all-courses.json', code: '1220' },
  SH: { file: 'sh-all-courses.json', code: '0217' },
  HiØ: { file: 'hio-all-courses.json', code: '0256' },
  HVO: { file: 'hvo-all-courses.json', code: '0236' },
  HVL: { file: 'hvl-all-courses.json', code: '0238' },
  VID: { file: 'vid-all-courses.json', code: '8208' },
  MF: { file: 'mf-all-courses.json', code: '8221' },
  AHS: { file: 'ahs-all-courses.json', code: '8232' },
  BD: { file: 'bd-all-courses.json', code: '8227' },
  BAS: { file: 'bas-all-courses.json', code: '8243' },
  DMMH: { file: 'dmmh-all-courses.json', code: '8224' },
  FIH: { file: 'fih-all-courses.json', code: '8234' },
  HGUt: { file: 'hgut-all-courses.json', code: '8247' },
  HFDK: { file: 'hfdk-all-courses.json', code: '8254' },
  HLT: { file: 'hlt-all-courses.json', code: '8248' },
  HK: { file: 'hk-all-courses.json', code: '8253' },
  LDH: { file: 'ldh-all-courses.json', code: '8202' },
  NLA: { file: 'nla-all-courses.json', code: '8223' },
  Steiner: { file: 'steiner-all-courses.json', code: '8225' },
};

/**
 * Get list of available institutions (those with data files)
 */
export function getAvailableInstitutions(): string[] {
  return Object.keys(INSTITUTION_DATA_FILES);
}

// Cache for loaded course data
const courseDataCache: Map<string, CourseInfo[]> = new Map();
const loadingPromises: Map<string, Promise<CourseInfo[]>> = new Map();

/**
 * Strip numeric suffix from course code (e.g., "IN2010-1" -> "IN2010", "INF100-0" -> "INF100")
 * Removes API artifacts like "-0", "-1", "-2" but preserves meaningful variants like "-HFSEM", "-MNEKS"
 * 
 * Handles different formats consistently across institutions:
 * - Standard format: "IN2010-1" -> "IN2010" (removes numeric suffix)
 * - UiB variants: "INF100-0" -> "INF100" (removes numeric suffix)
 * - Meaningful variants: "EXPHIL-HFSEM" -> "EXPHIL-HFSEM" (preserves non-numeric suffix)
 * - Courses with dashes: "STK-MAT2011" -> "STK-MAT2011" (preserves dashes that aren't numeric suffixes)
 * 
 * Examples:
 *   "IN2010-1" -> "IN2010" (removes numeric API suffix)
 *   "INF100-0" -> "INF100" (removes numeric API suffix)
 *   "EXPHIL-HFSEM" -> "EXPHIL-HFSEM" (preserves meaningful variant)
 *   "EXPHIL-HFEKS-0" -> "EXPHIL-HFEKS" (removes numeric suffix, preserves meaningful part)
 *   "STK-MAT2011" -> "STK-MAT2011" (preserves - dash and trailing 1)
 *   "FYS-STK3155" -> "FYS-STK3155" (preserves - dash)
 * 
 * Note: This matches how the discovery scripts should store course codes
 */
export function stripCourseCodeSuffix(code: string, institution?: string): string {
  // Remove numeric suffixes (dash followed by one or more digits at the end)
  // This removes API artifacts like "-0", "-1", "-2", etc.
  // But preserves meaningful suffixes like "-HFSEM", "-MNEKS", "-MOSEM"
  return code.replace(/-[0-9]+$/, '').trim();
}

/**
 * Check if a course has data available (has years with students)
 */
function courseHasData(courseData: CourseData): boolean {
  // Course has data if:
  // 1. It has years array with at least one year
  // 2. It has lastYearStudents count (indicates data exists)
  // 3. Years array is not empty
  // Be more lenient - if years array exists (even if empty), or if lastYearStudents is defined, include it
  // This ensures courses like JUS2311 with y:[2024] and s:58 are included
  const hasYears = Array.isArray(courseData.years) && courseData.years.length > 0;
  const hasStudentCount = courseData.lastYearStudents !== undefined && courseData.lastYearStudents !== null;
  
  // Include if either condition is true
  return hasYears || hasStudentCount;
}

/**
 * Convert CourseData to CourseInfo
 */
function courseDataToCourseInfo(courseData: CourseData, institution: string, institutionCode: string): CourseInfo {
  // Strip suffix for display
  const displayCode = stripCourseCodeSuffix(courseData.courseCode, institution);
  // Create unique key combining institution and code
  const uniqueKey = `${institution}-${displayCode}`;
  return {
    code: displayCode,
    name: courseData.courseName || displayCode,
    institution,
    institutionCode,
    key: uniqueKey,
  };
}

/**
 * Load all courses for a specific institution
 */
export async function loadInstitutionCourses(institution: string): Promise<CourseInfo[]> {
  // Check cache first
  if (courseDataCache.has(institution)) {
    return courseDataCache.get(institution)!;
  }

  // Check if already loading
  if (loadingPromises.has(institution)) {
    return loadingPromises.get(institution)!;
  }

  const institutionData = INSTITUTION_DATA_FILES[institution];
  if (!institutionData) {
    console.warn(`No data file found for institution: ${institution}`);
    return [];
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      // Load from public folder - files should be copied there during build
      // The loadCourseData function will try multiple paths automatically
      const fileName = `data/institutions/${institutionData.file}`;
      const courseData = await loadCourseData(fileName, institutionData.code);
      
      // Convert to CourseInfo format and filter out courses without data
      const courses = courseData
        .filter(cd => courseHasData(cd)) // Only include courses with data
        .map(cd => 
          courseDataToCourseInfo(cd, institution, institutionData.code)
        );

      // Cache the results
      courseDataCache.set(institution, courses);
      return courses;
    } catch (error) {
      console.error(`Failed to load courses for ${institution}:`, error);
      return [];
    } finally {
      loadingPromises.delete(institution);
    }
  })();

  loadingPromises.set(institution, loadPromise);
  return loadPromise;
}

/**
 * Load all courses from all institutions
 */
export async function loadAllCourses(): Promise<CourseInfo[]> {
  const institutions = Object.keys(INSTITUTION_DATA_FILES);
  const allPromises = institutions.map(inst => loadInstitutionCourses(inst));
  const allResults = await Promise.all(allPromises);
  return allResults.flat();
}

/**
 * Search courses across all institutions or a specific one
 */
export async function searchAllCourses(
  query: string,
  institution?: string,
  limit: number = 20
): Promise<CourseInfo[]> {
  if (institution) {
    // Search specific institution
    const courses = await loadInstitutionCourses(institution);
    return searchCoursesFromList(courses, query, limit);
  } else {
    // Search all institutions
    const allCourses = await loadAllCourses();
    return searchCoursesFromList(allCourses, query, limit);
  }
}

/**
 * Search courses from a list
 */
function searchCoursesFromList(
  courses: CourseInfo[],
  query: string,
  limit: number
): CourseInfo[] {
  // Strip suffix from query for searching (user might type "IN2010-1" but we want to match "IN2010")
  // Only strip -1 suffix, don't strip standalone 1 as it might be part of the code (e.g., STK-MAT2011)
  const normalizedQuery = stripCourseCodeSuffix(query.trim().toUpperCase());
  
  if (!normalizedQuery) {
    // Return popular courses (by code length - shorter codes are usually more popular)
    return courses
      .filter(c => c.code.length <= 8 && c.code.length >= 4) // Filter out very long codes and very short codes (likely prefixes)
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  }

  // Filter out courses with very short codes (1-3 characters) unless query is also very short
  // This prevents showing "IN", "IND", "INF" as valid courses when user types "INF"
  const minCodeLength = normalizedQuery.length <= 3 ? normalizedQuery.length : 4;
  
  // Search by code first, then by name
  const exactCodeMatches: CourseInfo[] = [];
  const codeStartsWith: CourseInfo[] = [];
  const nameStartsWith: CourseInfo[] = [];
  const nameContains: CourseInfo[] = [];
  const institutionStartsWith: CourseInfo[] = [];
  const institutionMatches: CourseInfo[] = [];

  for (const course of courses) {
    const codeUpper = course.code.toUpperCase();
    const nameUpper = course.name.toUpperCase();
    const institution = UNIVERSITIES[course.institution];
    const institutionShortUpper = (institution?.shortName || '').toUpperCase();
    const institutionFullUpper = (institution?.name || '').toUpperCase();
    const institutionStarts =
      (institutionShortUpper && institutionShortUpper.startsWith(normalizedQuery)) ||
      (institutionFullUpper && institutionFullUpper.startsWith(normalizedQuery));
    const institutionContains =
      (institutionShortUpper && institutionShortUpper.includes(normalizedQuery)) ||
      (institutionFullUpper && institutionFullUpper.includes(normalizedQuery));

    // Skip courses with codes that are too short (likely prefixes, not real courses)
    // Only allow short codes if they're exact matches and the query is also short
    if (codeUpper.length < minCodeLength && codeUpper !== normalizedQuery) {
      continue;
    }

    if (codeUpper === normalizedQuery) {
      // Exact code match - highest priority
      exactCodeMatches.push(course);
    } else if (codeUpper.startsWith(normalizedQuery)) {
      // Code starts with query - but only if it's a valid prefix (not a substring match)
      // This prevents "INF100" from matching "INF1000" or "FINF1001"
      // Only match if the query is a complete prefix (e.g., "INF1" matches "INF100" but "INF100" doesn't match "INF1000")
      codeStartsWith.push(course);
    } else if (nameUpper.startsWith(normalizedQuery)) {
      nameStartsWith.push(course);
    } else if (nameUpper.includes(normalizedQuery)) {
      nameContains.push(course);
    } else if (institutionStarts) {
      institutionStartsWith.push(course);
    } else if (institutionContains) {
      institutionMatches.push(course);
    }
  }

  // Prioritize: exact code > code starts with > name starts with > name contains > institution
  // Removed "code contains" to prevent false matches like "INF100" matching "INF1000"
  const exactMatches = exactCodeMatches;
  
  // If we have exact matches, prioritize them heavily - only show prefix matches if we have few exact matches
  // Sort prefix matches by code length (shorter = usually more popular)
  const sortedPrefixMatches = codeStartsWith.sort((a, b) => a.code.length - b.code.length);
  
  // If we have many exact matches, only show those. Otherwise, mix in some prefix matches
  const remainingSlots = Math.max(0, limit - exactMatches.length);
  const prefixMatches = remainingSlots > 0 && exactMatches.length < limit / 2 
    ? sortedPrefixMatches.slice(0, remainingSlots)
    : [];
  
  // Combine all results and remove duplicates (by unique key)
  const allResults: CourseInfo[] = [];
  const seenKeys = new Set<string>();
  
  for (const course of [
    ...exactMatches,
    ...prefixMatches,
    ...nameStartsWith,
    ...nameContains,
    ...institutionStartsWith,
    ...institutionMatches,
  ]) {
    // Use key if available, otherwise create a composite key from institution and code
    const courseKey = course.key || `${course.institution}-${course.code}`;
    
    // Skip if we've already seen this course (by unique key)
    if (!seenKeys.has(courseKey)) {
      seenKeys.add(courseKey);
      allResults.push(course);
      
      // Stop once we have enough results
      if (allResults.length >= limit) {
        break;
      }
    }
  }
  
  return allResults;
}

/**
 * Get course by code
 */
export async function getCourseByCode(
  code: string,
  institution?: string
): Promise<CourseInfo | null> {
  // Strip suffix from code for matching (user might type "IN2010-1" but we store "IN2010")
  const normalizedCode = stripCourseCodeSuffix(code.trim().toUpperCase(), institution);
  console.log(`[getCourseByCode] Searching for code: "${code}" -> normalized: "${normalizedCode}" (institution: ${institution})`);
  
  if (institution) {
    const courses = await loadInstitutionCourses(institution);
    console.log(`[getCourseByCode] Loaded ${courses.length} courses for ${institution}`);
    
    // When institution is specified, use unique key for exact matching to avoid conflicts
    const uniqueKey = `${institution}-${normalizedCode}`;
    
    // Try multiple matching strategies for robustness
    let found = courses.find(c => {
      // Prioritize unique key match if available
      if (c.key && c.key === uniqueKey) {
        return true;
      }
      // Fallback to code match if key is not available
      return c.code.toUpperCase() === normalizedCode;
    });
    
    // If not found, try case-insensitive match and also check if code matches after normalization
    if (!found) {
      found = courses.find(c => {
        const courseCodeUpper = c.code.toUpperCase().trim();
        const normalizedCourseCode = stripCourseCodeSuffix(courseCodeUpper, institution);
        return normalizedCourseCode === normalizedCode || courseCodeUpper === normalizedCode;
      });
    }
    
    // If still not found, try partial match (for cases where there might be slight variations)
    if (!found && normalizedCode.length >= 4) {
      found = courses.find(c => {
        const courseCodeUpper = c.code.toUpperCase().trim();
        const normalizedCourseCode = stripCourseCodeSuffix(courseCodeUpper, institution);
        // Try exact match first, then check if the normalized code is contained
        return normalizedCourseCode === normalizedCode || 
               (normalizedCourseCode.startsWith(normalizedCode) && normalizedCourseCode.length <= normalizedCode.length + 2);
      });
    }
    
    if (found) {
      console.log(`[getCourseByCode] Found course: ${found.code} (${found.institution}) using ${found.key ? 'unique key' : 'code match'}`);
    } else {
      // Log more debugging info
      const sampleCodes = courses.slice(0, 10).map(c => `${c.code}${c.key ? ` (key: ${c.key})` : ''}`);
      const jusCourses = courses.filter(c => c.code.toUpperCase().startsWith('JUS')).slice(0, 5).map(c => c.code);
      console.log(`[getCourseByCode] Course not found. Looking for key: "${uniqueKey}" or code: "${normalizedCode}"`);
      console.log(`[getCourseByCode] Sample course codes: ${sampleCodes.join(', ')}`);
      if (jusCourses.length > 0) {
        console.log(`[getCourseByCode] Sample JUS courses: ${jusCourses.join(', ')}`);
      }
    }
    return found || null;
  } else {
    const allCourses = await loadAllCourses();
    // When searching all institutions, we can't use unique key directly
    // Return first match (could be ambiguous if code is not unique)
    const matches = allCourses.filter(c => {
      const courseCodeUpper = c.code.toUpperCase().trim();
      const normalizedCourseCode = stripCourseCodeSuffix(courseCodeUpper);
      return normalizedCourseCode === normalizedCode || courseCodeUpper === normalizedCode;
    });
    if (matches.length > 1) {
      console.warn(`[getCourseByCode] Multiple courses found for code "${normalizedCode}" across institutions: ${matches.map(c => `${c.code} (${c.institution})`).join(', ')}. Returning first match.`);
    }
    return matches[0] || null;
  }
}

/**
 * Get popular courses for an institution
 */
export async function getPopularCourses(
  institution?: string,
  limit: number = 10
): Promise<CourseInfo[]> {
  if (institution) {
    const courses = await loadInstitutionCourses(institution);
    // Return shorter course codes (usually more popular)
    return courses
      .filter(c => c.code.length <= 8)
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  } else {
    const allCourses = await loadAllCourses();
    return allCourses
      .filter(c => c.code.length <= 8)
      .sort((a, b) => a.code.length - b.code.length)
      .slice(0, limit);
  }
}

/**
 * Get most popular courses across all institutions in round-robin fashion
 * Picks courses with highest student counts, distributing evenly across institutions
 */
export async function getMostPopularCoursesRoundRobin(limit: number = 12): Promise<CourseInfo[]> {
  const institutions = Object.keys(INSTITUTION_DATA_FILES);
  const coursesByInstitution: Map<string, Array<CourseInfo & { studentCount: number }>> = new Map();
  
  // Load course data for each institution (with student counts)
  await Promise.all(institutions.map(async (institution) => {
    try {
      const institutionData = INSTITUTION_DATA_FILES[institution];
      if (!institutionData) return;
      
      // Load course data (which has student counts)
      let fileName = `data/institutions/${institutionData.file}`;
      let courseData = await loadCourseData(fileName, institutionData.code);
      
      if (courseData.length === 0) {
        fileName = institutionData.file;
        courseData = await loadCourseData(fileName, institutionData.code);
      }
      
      if (courseData.length === 0 && typeof window !== 'undefined') {
        fileName = `/gpa/data/institutions/${institutionData.file}`;
        courseData = await loadCourseData(fileName, institutionData.code);
      }
      
      // Convert to CourseInfo with student counts, sort by student count
      const coursesWithCounts = courseData
        .filter(cd => courseHasData(cd) && cd.lastYearStudents && cd.lastYearStudents > 0)
        .map(cd => ({
          ...courseDataToCourseInfo(cd, institution, institutionData.code),
          studentCount: cd.lastYearStudents || 0,
        }))
        .sort((a, b) => b.studentCount - a.studentCount); // Highest first
      
      coursesByInstitution.set(institution, coursesWithCounts);
    } catch (error) {
      console.warn(`Failed to load popular courses for ${institution}:`, error);
    }
  }));
  
  // Round-robin selection: pick 1 from each institution, then loop
  const selected: CourseInfo[] = [];
  const institutionIndices = new Map<string, number>(); // Track current index per institution
  
  // Initialize indices
  institutions.forEach(inst => institutionIndices.set(inst, 0));
  
  // Keep selecting until we have enough or run out of courses
  while (selected.length < limit) {
    let foundAny = false;
    
    // One round: pick one from each institution
    for (const institution of institutions) {
      if (selected.length >= limit) break;
      
      const courses = coursesByInstitution.get(institution) || [];
      const currentIndex = institutionIndices.get(institution) || 0;
      
      if (currentIndex < courses.length) {
        const course = courses[currentIndex];
        // Avoid duplicates
        if (!selected.find(c => c.code === course.code && c.institution === course.institution)) {
          selected.push({
            code: course.code,
            name: course.name,
            institution: course.institution,
            institutionCode: course.institutionCode,
          });
          institutionIndices.set(institution, currentIndex + 1);
          foundAny = true;
        } else {
          // Skip this one, move to next
          institutionIndices.set(institution, currentIndex + 1);
        }
      }
    }
    
    // If we didn't find any new courses, we're done
    if (!foundAny) break;
  }
  
  return selected.slice(0, limit);
}

/**
 * Preload courses for an institution (useful for autocomplete)
 */
export function preloadInstitutionCourses(institution: string): void {
  if (!courseDataCache.has(institution) && !loadingPromises.has(institution)) {
    loadInstitutionCourses(institution).catch(console.error);
  }
}

