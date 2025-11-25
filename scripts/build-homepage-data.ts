/**
 * Build static homepage data showing the top 3 largest courses (by candidates)
 * per institution that have A-F grade data (not just pass/fail).
 * The script fetches grade data from the API to verify courses have letter grades.
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { processGradeData, aggregateDuplicateEntries } from '../lib/utils';
import { GradeData } from '../types';

interface OptimizedCourse {
  c: string;
  n?: string;
  y?: number[];
  s?: number;
}

interface OptimizedPayload {
  courses?: OptimizedCourse[];
}

interface TopCourseEntry {
  institution: string;
  institutionCode: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  letterGradeCount: number; // Number of students with A-F grades
  latestYear: number;
}

interface HomepageTopPayload {
  generatedAt: string;
  courses: TopCourseEntry[];
  topCourseCodes: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data', 'institutions');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-top-courses.json');
const MAX_PER_INSTITUTION = 3; // Top 3 courses per institution
const MIN_YEAR = 2020; // Exclude courses with data older than this year
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const MAX_CANDIDATES_TO_CHECK = 3; // Check top 3 courses per institution to find ones with A-F data
const EARLY_STOP_THRESHOLD = 3; // Stop early once we have this many courses with A-F grades

function loadOptimizedCourses(filePath: string): OptimizedCourse[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Missing data file: ${filePath}`);
    return [];
  }

  try {
    // For large files, read in chunks if needed (but JSON.parse should handle it)
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    if (fileSizeMB > 10) {
      console.log(`   ⚠️  Large file detected: ${filePath} (${fileSizeMB.toFixed(2)} MB)`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OptimizedPayload;
  if (!raw || !Array.isArray(raw.courses)) {
    console.warn(`⚠️  Invalid course payload in ${filePath}`);
    return [];
  }

    const courses = raw.courses.filter((course): course is OptimizedCourse => Boolean(course?.c));
    
    if (fileSizeMB > 10) {
      console.log(`   ✅ Loaded ${courses.length} courses from ${filePath}`);
    }
    
    return courses;
  } catch (error: any) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return [];
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/**
 * Fetch grade data for a course and check if it has A-F letter grades
 */
async function fetchAndValidateCourse(
  institutionCode: string,
  courseCode: string,
  institution: string,
  latestYear: number
): Promise<{ hasLetterGrades: boolean; studentCount: number; letterGradeCount: number } | null> {
  // Skip DIGI courses from UiB (they're slow and often don't have A-F grades)
  if (institution === 'UiB' && courseCode.toUpperCase().startsWith('DIGI')) {
    return null;
  }
  // MIDDLE GROUND: Try a few formats and years, but not too many
  const currentYear = new Date().getFullYear();
  const isJUSCourse = institution === 'UiB' && courseCode.startsWith('JUS');
  
  // Get formats to try - for courses with dashes (like EXPHIL-SVSEM) or JUS courses, try without -1 first
  const formatsToTry: string[] = [];
  const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
  
  if (institution === 'UiB') {
    const hasDash = cleaned.includes('-');
    
    if (isJUSCourse || hasDash) {
      // JUS courses or courses with dashes (like EXPHIL-SVSEM): try multiple variants
      formatsToTry.push(cleaned); // Base code (e.g., JUS242)
      formatsToTry.push(`${cleaned}-0`); // Try -0 suffix (found in fallback for JUS242)
      formatsToTry.push(`${cleaned}-1`); // Try -1 suffix
      if (!isJUSCourse) {
        formatsToTry.push(formatCourseCode(cleaned, institution)); // Also try formatCourseCode result
      }
    } else {
      // Other courses without dashes: try with -1 first, then -0, then without
      formatsToTry.push(`${cleaned}-1`);
      formatsToTry.push(`${cleaned}-0`); // Also try -0 suffix
      formatsToTry.push(cleaned); // Then try without
      formatsToTry.push(formatCourseCode(cleaned, institution)); // Also try formatCourseCode result
    }
  } else if (institution === 'BI') {
    // BI uses format COURSECODE1 (no dash), but API might accept both with and without the "1"
    // Try with "1" suffix first (most common), then without
    formatsToTry.push(`${cleaned}1`); // With "1" suffix (e.g., BIK10301)
    formatsToTry.push(cleaned); // Without suffix (e.g., BIK1030)
    // Also try formatCourseCode result (which adds "1")
    const formatted = formatCourseCode(cleaned, institution);
    if (!formatsToTry.includes(formatted)) {
      formatsToTry.push(formatted);
    }
  } else {
    formatsToTry.push(formatCourseCode(courseCode, institution));
  }
  
  const uniqueFormats = Array.from(new Set(formatsToTry));
  
  // Try past 10 years (from current year backwards) to find data
  // Ensure years are numbers, not strings
  const yearsToTry: number[] = [];
  for (let i = 0; i < 10; i++) {
    const year = Number(currentYear) - i;
    if (year >= 2015) { // Don't go too far back
      yearsToTry.push(year);
    }
  }
  
  // Also include latestYear if it's not already in the list
  const latestYearNum = Number(latestYear);
  if (!yearsToTry.includes(latestYearNum) && latestYearNum >= 2015) {
    yearsToTry.push(latestYearNum);
  }
  
  // Sort descending (most recent first)
  yearsToTry.sort((a, b) => b - a);
  
  // Debug: log the actual year values for EXPHIL-SVSEM
  if (courseCode === 'EXPHIL-SVSEM') {
    console.log(`      🔍 [DEBUG] currentYear: ${currentYear} (type: ${typeof currentYear})`);
    console.log(`      🔍 [DEBUG] latestYear: ${latestYear} (type: ${typeof latestYear})`);
    console.log(`      🔍 [DEBUG] yearsToTry: ${yearsToTry.slice(0, 5).join(', ')}... (${yearsToTry.length} years total)`);
  }
  
  const normalizedOriginal = courseCode.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
  
  // Helper function to quickly check if data has A-F grades
  const quickCheck = (data: GradeData[], yearQueried: number, formatTried?: string, yearTried?: number): { hasLetterGrades: true; studentCount: number; letterGradeCount: number } | { foundData: true } | null => {
    if (!data || data.length === 0) return null;
    
    // More flexible match check - match if normalized codes match OR if item code starts with our code
    const matchingData = data.filter(item => {
      const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
      const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
      const originalCleaned = courseCode.toUpperCase().replace(/\s/g, '');
      
      // Exact match after normalization
      if (normalizedItemCode === normalizedOriginal || itemCode === originalCleaned) {
        return true;
      }
      
      // For JUS courses, also match if item code starts with our code (handles JUS346 vs JUS346-1)
      if (isJUSCourse && itemCode.startsWith(originalCleaned)) {
        return true;
      }
      
      return false;
    });
    
    // Debug logging: show what we found or what we didn't find
    if (matchingData.length > 0) {
      const sampleCodes = matchingData.slice(0, 5).map(item => ({
        code: item.Emnekode,
        year: item.Årstall,
        grade: item.Karakter,
      }));
      console.log(`      ✅ [MATCH] Found ${matchingData.length} matching items for ${courseCode} (tried format: ${formatTried}, year: ${yearTried})`);
      console.log(`      ✅ [MATCH] Sample matches:`, sampleCodes.map(s => `${s.code} (${s.year}, ${s.grade})`).join(', '));
    } else if (data.length > 0) {
      // Show what the API returned even if it didn't match - this is valuable learning data!
      const uniqueCodes = Array.from(new Set(data.map(item => item.Emnekode?.toUpperCase().replace(/\s/g, '') || ''))).slice(0, 15);
      const uniqueCodesNormalized = Array.from(new Set(data.map(item => {
        const code = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
        return code.replace(/-[0-9]+$/, '');
      }))).slice(0, 15);
      const sampleCodes = data.slice(0, 8).map(item => ({
        code: item.Emnekode,
        year: item.Årstall,
        grade: item.Karakter,
      }));
      const yearsInResponse = Array.from(new Set(data.map(item => item.Årstall))).sort().reverse().slice(0, 5);
      
      console.log(`      ❌ [NO MATCH] No match for ${courseCode} (tried format: ${formatTried}, year: ${yearTried})`);
      console.log(`      ❌ [NO MATCH] API returned ${data.length} items, but none matched our search`);
      console.log(`      ❌ [NO MATCH] Looking for: "${normalizedOriginal}" (normalized from "${courseCode}")`);
      console.log(`      ❌ [NO MATCH] Sample items from API:`, sampleCodes.map(s => `${s.code} (${s.year}, ${s.grade})`).join(', '));
      console.log(`      ❌ [NO MATCH] Unique course codes in response (raw):`, uniqueCodes.join(', '));
      console.log(`      ❌ [NO MATCH] Unique course codes in response (normalized):`, uniqueCodesNormalized.join(', '));
      console.log(`      ❌ [NO MATCH] Years in response:`, yearsInResponse.join(', '));
      
      // Show why each item didn't match
      if (data.length <= 10) {
        console.log(`      ❌ [NO MATCH] Why items didn't match:`);
        data.slice(0, 5).forEach(item => {
          const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
          const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
          const originalCleaned = courseCode.toUpperCase().replace(/\s/g, '');
          const reasons: string[] = [];
          
          if (normalizedItemCode !== normalizedOriginal) {
            reasons.push(`normalized "${normalizedItemCode}" != "${normalizedOriginal}"`);
          }
          if (itemCode !== originalCleaned) {
            reasons.push(`raw "${itemCode}" != "${originalCleaned}"`);
          }
          if (!isJUSCourse || !itemCode.startsWith(originalCleaned)) {
            if (isJUSCourse) {
              reasons.push(`JUS prefix check failed: "${itemCode}" doesn't start with "${originalCleaned}"`);
            }
          }
          
          console.log(`      ❌ [NO MATCH]   - ${item.Emnekode}: ${reasons.join('; ')}`);
        });
      }
    }
    
    if (matchingData.length === 0) return null;
    
    // Get data for the year we queried, or use all data if no data for that year
    let yearData = matchingData.filter(d => parseInt(d.Årstall, 10) === yearQueried);
    if (yearData.length === 0 && matchingData.length > 0) {
      // No data for queried year, try to find the most recent year
      const years = matchingData.map(d => parseInt(d.Årstall, 10)).filter(y => !isNaN(y));
      if (years.length > 0) {
        const actualLatestYear = Math.max(...years);
        yearData = matchingData.filter(d => parseInt(d.Årstall, 10) === actualLatestYear);
      }
    }
    const dataToUse = yearData.length > 0 ? yearData : matchingData;
    
    if (dataToUse.length === 0) return null;
    
    const aggregated = aggregateDuplicateEntries(dataToUse);
    const stats = processGradeData(aggregated);
    if (!stats) return null;
    
    // Quick check for A-F grades
    const hasLetterGrades = stats.distributions.some(dist => 
      ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade) && dist.count > 0
    );
    const totalLetterGradeStudents = stats.distributions
      .filter(dist => ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade))
      .reduce((sum, dist) => sum + dist.count, 0);
    
    if (hasLetterGrades && totalLetterGradeStudents > 0) {
      return { hasLetterGrades: true, studentCount: stats.totalStudents, letterGradeCount: totalLetterGradeStudents };
    }
    
    return { foundData: true }; // Found data but no A-F
    
    return { foundData: true }; // Found data but no A-F
  };
  
  // Track if we got all 204 responses (course doesn't exist) - if so, skip expensive fallback
  let allResponsesWere204 = true;
  let gotAny200Response = false;
  let studyProgramFilterCausing400 = false; // Track if study program filter causes 400 errors
  
  // Try formats and years in combination (middle ground - not too many, not too few)
  for (const formatToTry of uniqueFormats) {
    for (const yearToTry of yearsToTry) {
      // Ensure yearToTry is a number
      const yearAsNumber = Number(yearToTry);
      if (isNaN(yearAsNumber)) {
        console.log(`      ⚠️  [ERROR] Invalid year: ${yearToTry} for ${courseCode}`);
        continue;
      }
      // For JUS courses, try with study program filter first (but skip if it keeps causing 400 errors)
      if (isJUSCourse && !studyProgramFilterCausing400) {
        try {
          const payload = createSearchPayload(
            institutionCode, 
            formatToTry, 
            yearAsNumber,
            undefined,
            { studiumCode: 'jus' }
          );
          
          const response = await fetch(DIRECT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response && response.ok && response.status === 200) {
            gotAny200Response = true;
            allResponsesWere204 = false;
            const data: GradeData[] = await response.json();
            const result = quickCheck(data, yearAsNumber, formatToTry, yearAsNumber);
            if (result && 'hasLetterGrades' in result) return result;
            if (result && 'foundData' in result) return null; // No A-F, skip immediately
          } else if (response) {
            if (response.status === 400) {
              // Study program filter causes 400 error - skip it for remaining attempts
              studyProgramFilterCausing400 = true;
              console.log(`      ⚠️  [API ERROR] Response status 400 for ${courseCode} (format: ${formatToTry}, year: ${yearAsNumber}, with study program filter) - skipping study program filter for remaining attempts`);
            } else if (response.status !== 204) {
              allResponsesWere204 = false; // Got a non-204 error, might be worth trying fallback
            }
            if (response.status !== 400) {
              console.log(`      ⚠️  [API ERROR] Response status ${response.status} for ${courseCode} (format: ${formatToTry}, year: ${yearAsNumber}, with study program filter)`);
            }
          }
        } catch (error: any) {
          console.log(`      ⚠️  [API ERROR] Exception for ${courseCode} (format: ${formatToTry}, year: ${yearAsNumber}, with study program filter): ${error.message || error}`);
          // Continue to next year/format
        }
      }
      
      // Try without study program filter
      try {
        const payload = createSearchPayload(institutionCode, formatToTry, yearAsNumber);
        
        const response = await fetch(DIRECT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response && response.ok && response.status === 200) {
          gotAny200Response = true;
          allResponsesWere204 = false;
          const data: GradeData[] = await response.json();
          const result = quickCheck(data, yearAsNumber, formatToTry, yearAsNumber);
          if (result && 'hasLetterGrades' in result) return result;
          if (result && 'foundData' in result) return null; // No A-F, skip immediately
        } else if (response) {
          if (response.status !== 204) {
            allResponsesWere204 = false; // Got a non-204 error, might be worth trying fallback
          }
          console.log(`      ⚠️  [API ERROR] Response status ${response.status} for ${courseCode} (format: ${formatToTry}, year: ${yearAsNumber})`);
        }
      } catch (error: any) {
        console.log(`      ⚠️  [API ERROR] Exception for ${courseCode} (format: ${formatToTry}, year: ${yearAsNumber}): ${error.message || error}`);
        // Continue to next year/format
        continue;
      }
    }
  }
  
  // For UiB, if all direct queries failed, try querying all courses for the institution (all years)
  // BUT skip this expensive fallback if we got all 204 responses (course doesn't exist in API)
  // EXCEPT for JUS courses - always try fallback for them since they often need it
  if (institution === 'UiB' && uniqueFormats.length < 10 && (!allResponsesWere204 || isJUSCourse)) {
    if (allResponsesWere204 && isJUSCourse) {
      console.log(`      🔍 [FALLBACK] All direct queries returned 204, but trying fallback for JUS course ${courseCode}...`);
    } else {
      console.log(`      🔍 [FALLBACK] Trying expensive "all courses" query for ${courseCode}...`);
    }
    try {
      const normalizedOriginal = courseCode.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
      
      // Try to get course name from the optimized data if available
      // This helps us search by name in the fallback
      let courseNameToSearch: string | undefined = undefined;
      try {
        const dataPath = path.join(DATA_DIR, INSTITUTION_DATA_FILES[institution]?.file || '');
        if (fs.existsSync(dataPath)) {
          const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as OptimizedPayload;
          const foundCourse = raw.courses?.find(c => {
            const normalizedCode = c.c?.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
            return normalizedCode === normalizedOriginal || c.c?.toUpperCase().replace(/\s/g, '') === courseCode.toUpperCase().replace(/\s/g, '');
          });
          if (foundCourse?.n) {
            courseNameToSearch = foundCourse.n;
            console.log(`      🔍 [FALLBACK] Found course name in data: "${courseNameToSearch}"`);
          }
        }
      } catch (e) {
        // Ignore errors when trying to read course name
      }
      
      console.log(`      🔍 [FALLBACK] Querying all courses for institution ${institutionCode} (looking for: "${normalizedOriginal}"${courseNameToSearch ? `, name: "${courseNameToSearch}"` : ''})...`);
      
      // Query all years (no year filter) to match the correct "all years" URL format
      // Use kodetekst: 'Y' to get course names in the response (helps with name-based matching)
      const payloadAllCourses = createSearchPayload(institutionCode, undefined, undefined);
      // Override kodetekst to get course names
      (payloadAllCourses as any).kodetekst = 'Y';
      
      const responseAll = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadAllCourses),
      });
      
      if (responseAll.ok && responseAll.status === 200) {
        const allData: GradeData[] = await responseAll.json();
        console.log(`      🔍 [FALLBACK] Received ${allData?.length || 0} total items from "all courses" query`);
        
        if (allData && allData.length > 0) {
          // Show sample of what we got (first 10 unique course codes)
          const sampleCodes = Array.from(new Set(allData.slice(0, 100).map(item => item.Emnekode?.toUpperCase().replace(/\s/g, '') || ''))).slice(0, 10);
          console.log(`      🔍 [FALLBACK] Sample course codes in response: ${sampleCodes.join(', ')}`);
          
          const matchingData = allData.filter(item => {
            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
            const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
            
            // Try to get course name from API response (if kodetekst: 'Y' was used)
            const itemName = (item as any).Emnenavn || 
                            (item as any).Emnekode_tekst || 
                            (item as any).Emnekode_navn ||
                            (item as any).Emne_navn ||
                            undefined;
            const itemNameUpper = itemName?.toUpperCase() || '';
            
            // Exact match after normalization
            if (normalizedItemCode === normalizedOriginal || itemCode === courseCode.toUpperCase().replace(/\s/g, '')) {
              return true;
            }
            
            // For UiB: if the search code contains a dash, only match if the item code starts with the exact search code
            if (normalizedOriginal.includes('-')) {
              if (normalizedItemCode.startsWith(normalizedOriginal + '-') || normalizedItemCode === normalizedOriginal) {
                return true;
              }
            }
            
            // If search code has no dash, allow prefix matching for numeric suffixes
            if (itemCode.startsWith(normalizedOriginal)) {
              const nextChar = itemCode[normalizedOriginal.length];
              if (nextChar === undefined || /[0-9]/.test(nextChar)) {
                return true;
              }
            }
            
            // If we have a course name to search for, try matching by name
            if (courseNameToSearch && itemNameUpper) {
              const searchNameUpper = courseNameToSearch.toUpperCase();
              // Check if the course name contains our search term or vice versa
              if (itemNameUpper.includes(searchNameUpper) || searchNameUpper.includes(itemNameUpper)) {
                // Also check if the course code is similar (to avoid false matches)
                // For example, if searching for "EXPHIL-SVSEM", match courses with "EXPHIL" and "SV" in name
                const codeParts = normalizedOriginal.split('-');
                if (codeParts.length > 0) {
                  const baseCode = codeParts[0];
                  if (itemCode.startsWith(baseCode) || normalizedItemCode.startsWith(baseCode)) {
                    return true;
                  }
                }
              }
            }
            
            return false;
          });
          
          console.log(`      🔍 [FALLBACK] Found ${matchingData.length} matching items for "${normalizedOriginal}"`);
          
          if (matchingData.length > 0) {
            // Show sample of matched items
            const sampleMatches = matchingData.slice(0, 10).map(item => ({
              code: item.Emnekode,
              year: item.Årstall,
              grade: item.Karakter,
            }));
            const uniqueMatchedCodes = Array.from(new Set(matchingData.map(item => item.Emnekode?.toUpperCase().replace(/\s/g, '') || ''))).slice(0, 10);
            const yearsInMatches = Array.from(new Set(matchingData.map(item => item.Årstall))).sort().reverse().slice(0, 5);
            
            console.log(`      ✅ [FALLBACK] Sample matched items: ${sampleMatches.map(s => `${s.code} (${s.year}, ${s.grade})`).join(', ')}`);
            console.log(`      ✅ [FALLBACK] Unique matched course codes: ${uniqueMatchedCodes.join(', ')}`);
            console.log(`      ✅ [FALLBACK] Years in matched data: ${yearsInMatches.join(', ')}`);
            
            const aggregated = aggregateDuplicateEntries(matchingData);
            
            // Use the most recent year from the data (since we queried all years)
            const years = aggregated.map(d => parseInt(d.Årstall, 10)).filter(y => !isNaN(y));
            if (years.length > 0) {
              const actualLatestYear = Math.max(...years);
              const yearData = aggregated.filter(d => parseInt(d.Årstall, 10) === actualLatestYear);
              
              console.log(`      ✅ [FALLBACK] Using year ${actualLatestYear} (${yearData.length} items for that year)`);
              
              if (yearData.length > 0) {
                const stats = processGradeData(yearData);
                if (stats) {
                  // Show grade distribution
                  const gradeCounts = stats.distributions.map(d => `${d.grade}:${d.count}`).join(', ');
                  console.log(`      ✅ [FALLBACK] Grade distribution: ${gradeCounts}`);
                  
                  const hasLetterGrades = stats.distributions.some(dist => 
                    ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade) && dist.count > 0
                  );
                  const totalLetterGradeStudents = stats.distributions
                    .filter(dist => ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade))
                    .reduce((sum, dist) => sum + dist.count, 0);
                  
                  if (hasLetterGrades && totalLetterGradeStudents > 0) {
                    console.log(`      ✅ [FALLBACK] SUCCESS! Found ${courseCode} with A-F grades (${totalLetterGradeStudents} students with letter grades, ${stats.totalStudents} total)`);
                    return {
                      hasLetterGrades: true,
                      studentCount: stats.totalStudents,
                      letterGradeCount: totalLetterGradeStudents,
                    };
                  } else {
                    console.log(`      ⚠️  [FALLBACK] Found ${courseCode} but NO A-F grades (only pass/fail or other grades)`);
                  }
                } else {
                  console.log(`      ⚠️  [FALLBACK] Found ${courseCode} but failed to process grade data`);
                }
              } else {
                console.log(`      ⚠️  [FALLBACK] Found ${courseCode} but no data for year ${actualLatestYear}`);
              }
            } else {
              console.log(`      ⚠️  [FALLBACK] Found ${courseCode} but no valid years in data`);
            }
          } else {
            // No matches found - show what we got instead
            const uniqueCodes = Array.from(new Set(allData.slice(0, 200).map(item => item.Emnekode?.toUpperCase().replace(/\s/g, '') || ''))).slice(0, 20);
            const uniqueCodesNormalized = Array.from(new Set(allData.slice(0, 200).map(item => {
              const code = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
              return code.replace(/-[0-9]+$/, '');
            }))).slice(0, 20);
            
            console.log(`      ❌ [FALLBACK] NO MATCHES found for "${normalizedOriginal}" in ${allData.length} items`);
            console.log(`      ❌ [FALLBACK] Looking for: "${normalizedOriginal}" (normalized from "${courseCode}")`);
            console.log(`      ❌ [FALLBACK] Sample course codes in response (raw): ${uniqueCodes.join(', ')}`);
            console.log(`      ❌ [FALLBACK] Sample course codes in response (normalized): ${uniqueCodesNormalized.join(', ')}`);
            
            // Show why some items didn't match (for first 20 items)
            if (allData.length <= 50) {
              console.log(`      ❌ [FALLBACK] Why items didn't match (showing first 10):`);
              allData.slice(0, 10).forEach(item => {
                const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
                const reasons: string[] = [];
                
                if (normalizedItemCode !== normalizedOriginal) {
                  reasons.push(`normalized "${normalizedItemCode}" != "${normalizedOriginal}"`);
                }
                if (itemCode !== courseCode.toUpperCase().replace(/\s/g, '')) {
                  reasons.push(`raw "${itemCode}" != "${courseCode.toUpperCase().replace(/\s/g, '')}"`);
                }
                if (normalizedOriginal.includes('-') && !normalizedItemCode.startsWith(normalizedOriginal + '-') && normalizedItemCode !== normalizedOriginal) {
                  reasons.push(`dash prefix check failed`);
                }
                if (!normalizedOriginal.includes('-') && itemCode.startsWith(normalizedOriginal)) {
                  const nextChar = itemCode[normalizedOriginal.length];
                  if (nextChar && !/[0-9]/.test(nextChar)) {
                    reasons.push(`numeric suffix check failed (next char: "${nextChar}")`);
                  }
                }
                
                console.log(`      ❌ [FALLBACK]   - ${item.Emnekode} (${item.Årstall}, ${item.Karakter}): ${reasons.join('; ') || 'Unknown reason'}`);
              });
            }
          }
        } else {
          console.log(`      ⚠️  [FALLBACK] "All courses" query returned empty or no data`);
        }
      } else {
        console.log(`      ⚠️  [FALLBACK] "All courses" query failed with status ${responseAll?.status || 'unknown'}`);
      }
    } catch (error: any) {
      console.log(`      ❌ [FALLBACK] Exception during fallback query: ${error.message || error}`);
    }
  }
  
  return null;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building static homepage dataset                         ║
╚════════════════════════════════════════════════════════════╝
`);

  const topCourses: TopCourseEntry[] = [];
  let processedInstitutions = 0;

  for (const [institution, mapping] of Object.entries(INSTITUTION_DATA_FILES)) {
    processedInstitutions += 1;
    const uni = UNIVERSITIES[institution];
    if (!uni) {
      console.warn(`⚠️  No university mapping for ${institution}, skipping`);
      continue;
    }

    const dataPath = path.join(DATA_DIR, mapping.file);
    const allCourses = loadOptimizedCourses(dataPath)
      .map((course) => ({
        courseCode: course.c,
        courseName: course.n || course.c,
        studentCount: typeof course.s === 'number' ? course.s : 0,
        latestYear: Array.isArray(course.y) && course.y.length > 0
          ? Number([...course.y].sort((a, b) => Number(b) - Number(a))[0]) // Ensure it's a number
          : 0,
      }))
      // Filter out courses with old data
      .filter((course) => course.latestYear >= MIN_YEAR)
      .sort((a, b) => b.studentCount - a.studentCount);

    if (allCourses.length === 0) {
      console.warn(`⚠️  No optimized courses for ${institution} (after filtering for year >= ${MIN_YEAR})`);
      continue;
    }

    console.log(`\n📊 Processing ${institution} (${uni.name})...`);
    // Check a reasonable batch of courses to find the best ones by A-F grade count
    const checkLimit = MAX_CANDIDATES_TO_CHECK;
    const coursesToCheck = allCourses.slice(0, Math.min(checkLimit, allCourses.length));
    console.log(`   Checking up to ${coursesToCheck.length} courses for A-F grade data (will sort by A-F grade count)...`);
    console.log(`   Early stopping: will stop after finding ${EARLY_STOP_THRESHOLD} courses with A-F grades`);

    // Check courses and collect those with A-F grades, with early stopping
    const coursesWithData: TopCourseEntry[] = [];
    
    for (let i = 0; i < coursesToCheck.length; i++) {
      const course = coursesToCheck[i];
      console.log(`   [${i + 1}/${coursesToCheck.length}] Checking ${course.courseCode}...`);
      
      // Ensure latestYear is a number
      const latestYearNum = Number(course.latestYear);
      if (isNaN(latestYearNum)) {
        console.log(`      ⚠️  Invalid latestYear for ${course.courseCode}: ${course.latestYear}`);
        continue;
      }
      
      const validation = await fetchAndValidateCourse(
        uni.code,
        course.courseCode,
        institution,
        latestYearNum
      );
      
      if (validation && validation.hasLetterGrades) {
        coursesWithData.push({
          institution,
          institutionCode: uni.code,
          courseCode: course.courseCode,
          courseName: course.courseName,
          studentCount: validation.studentCount || course.studentCount,
          letterGradeCount: validation.letterGradeCount || 0,
          latestYear: course.latestYear,
        });
        console.log(`      ✅ ${course.courseCode} has A-F grade data (${validation.letterGradeCount} students with A-F grades, ${validation.studentCount} total)`);
        
        // Early stopping: if we have enough candidates (3), we can stop
        if (coursesWithData.length >= EARLY_STOP_THRESHOLD) {
          console.log(`   ⏩ Early stopping: Found ${coursesWithData.length} courses with A-F grades (only need top ${MAX_PER_INSTITUTION})`);
          break;
        }
      } else {
        console.log(`      ⚠️  ${course.courseCode} skipped (no A-F grades or no data)`);
      }
      
      // Small delay to avoid overwhelming the API
      if (i < coursesToCheck.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    // Sort by A-F grade count (letterGradeCount) descending, then take top N
    coursesWithData.sort((a, b) => b.letterGradeCount - a.letterGradeCount);
    const topCoursesForInstitution = coursesWithData.slice(0, MAX_PER_INSTITUTION);
    
    topCourses.push(...topCoursesForInstitution);
    
    if (coursesWithData.length === 0) {
      console.warn(`   ⚠️  No courses with A-F grade data found for ${institution}`);
    } else {
      console.log(`   ✅ Found ${coursesWithData.length} courses with A-F grade data`);
      console.log(`   📊 Top ${topCoursesForInstitution.length} by A-F grade count:`);
      topCoursesForInstitution.forEach((course, idx) => {
        console.log(`      ${idx + 1}. ${course.courseCode}: ${course.letterGradeCount} students with A-F grades`);
      });
    }
  }

  // Sort by A-F grade count (most meaningful metric)
  topCourses.sort((a, b) => b.letterGradeCount - a.letterGradeCount);
  const topCourseCodes = unique(topCourses.map((course) => course.courseCode));

  const payload: HomepageTopPayload = {
    generatedAt: new Date().toISOString(),
    courses: topCourses,
    topCourseCodes,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`\n✅ Completed!`);
  console.log(`   - Captured ${topCourses.length} courses with A-F grade data`);
  console.log(`   - From ${processedInstitutions} institutions`);
  console.log(`   - Up to ${MAX_PER_INSTITUTION} courses per institution`);
  console.log(`   - ${topCourseCodes.length} unique course codes for suggestions`);
  console.log(`📄 Saved to ${OUTPUT_FILE}`);
}

main();
