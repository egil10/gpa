/**
 * Script to fetch and save pre-rendered grade distribution data for homepage top courses.
 * This allows the homepage to display charts instantly without API calls.
 * 
 * Usage:
 *   npm run build-homepage-grade-data
 * 
 * This fetches grade data for all courses in homepage-top-courses.json using Node.js
 * (no CORS issues) and saves it as a static JSON file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { processGradeData, aggregateDuplicateEntries } from '../lib/utils';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';
import { GradeData, CourseStats } from '../types';
// Note: Can't import from lib/homepage-data.ts because it uses window
// So we'll load the JSON file directly

const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-grade-data.json');
const TOP_COURSES_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-top-courses.json');

interface HomepageGradeDataPayload {
  generatedAt: string;
  courses: Array<CourseStats & { institution: string; courseName: string }>;
}

async function fetchCourseGradeData(
  institutionCode: string,
  courseCode: string,
  institution: string,
  latestYear: number
): Promise<CourseStats | null> {
  // For UiB, try multiple formats since they might use different formats in the API
  // This handles cases where the API might return codes with or without "-1" suffix
  const formatsToTry: string[] = [];

  if (institution === 'UiB') {
    const cleaned = courseCode.toUpperCase().replace(/\s/g, '');

    // 1. Try standard format with -1 (most common)
    formatsToTry.push(`${cleaned}-1`);

    // 2. Try without any suffix
    formatsToTry.push(cleaned);

    // 3. Try formatCourseCode result (which adds -1)
    const formatted = formatCourseCode(courseCode, institution);
    if (!formatsToTry.includes(formatted)) {
      formatsToTry.push(formatted);
    }
  } else {
    formatsToTry.push(formatCourseCode(courseCode, institution));
  }

  // Remove duplicates
  const uniqueFormats = Array.from(new Set(formatsToTry));

  for (const formattedCode of uniqueFormats) {
    try {
      // Try fetching for the latest year first
      const payload = createSearchPayload(institutionCode, formattedCode, latestYear);
      const response = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok && response.status === 200) {
        const data: GradeData[] = await response.json();
        if (data && data.length > 0) {
          // Check if any returned course codes match our original course code (normalized)
          // Use consistent normalization: remove "-1" suffix only
          const normalizedOriginal = normalizeCourseCodeAdvanced(courseCode).normalized;
          const matchingData = data.filter(item => {
            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
            const normalizedItemCode = normalizeCourseCodeAdvanced(itemCode).normalized;
            return normalizedItemCode === normalizedOriginal || itemCode === courseCode.toUpperCase().replace(/\s/g, '');
          });

          if (matchingData.length > 0) {
            const aggregated = aggregateDuplicateEntries(matchingData);
            if (aggregated.length > 0) {
              const stats = processGradeData(aggregated);
              if (stats) return stats;
            }
          }
        }
      }

      // If year-specific fetch failed, try without year filter
      const payloadNoYear = createSearchPayload(institutionCode, formattedCode);
      const responseNoYear = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadNoYear),
      });

      if (responseNoYear.ok && responseNoYear.status === 200) {
        const allData: GradeData[] = await responseNoYear.json();
        if (allData && allData.length > 0) {
          // Filter to only courses that match our course code (normalized)
          // Use consistent normalization: remove numeric suffixes (e.g., "-0", "-1") but preserve meaningful variants
          const normalizedOriginal = normalizeCourseCodeAdvanced(courseCode).normalized;
          const matchingData = allData.filter(item => {
            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
            const normalizedItemCode = normalizeCourseCodeAdvanced(itemCode).normalized;

            // Exact match after normalization
            if (normalizedItemCode === normalizedOriginal || itemCode === courseCode.toUpperCase().replace(/\s/g, '')) {
              return true;
            }

            // Allow prefix matching for numeric suffixes (e.g., "EXPHIL" matches "EXPHIL2000")
            // But NOT for dash-separated variants (e.g., "EXPHIL" does NOT match "EXPHIL-HFSEM")
            if (itemCode.startsWith(normalizedOriginal)) {
              const nextChar = itemCode[normalizedOriginal.length];
              // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
              // Reject if next character is a dash (variant like "EXPHIL-HFSEM")
              if (nextChar === undefined || /[0-9]/.test(nextChar)) {
                return true;
              }
            }

            return false;
          });

          if (matchingData.length > 0) {
            const aggregated = aggregateDuplicateEntries(matchingData);
            if (aggregated.length > 0) {
              // Get latest year from data
              const years = aggregated.map(d => parseInt(d.Årstall, 10));
              const actualLatestYear = Math.max(...years);
              const yearData = aggregated.filter(d => parseInt(d.Årstall, 10) === actualLatestYear);

              if (yearData.length > 0) {
                const stats = processGradeData(yearData);
                if (stats) return stats;
              }
            }
          }
        }
      }
    } catch (error) {
      // Continue to next format
      continue;
    }
  }

  // For UiB, try one more thing: query without course code filter and find the course in results
  if (institution === 'UiB') {
    try {
      // Use consistent normalization: remove numeric suffixes (e.g., "-0", "-1") but preserve meaningful variants
      const normalizedOriginal = normalizeCourseCodeAdvanced(courseCode).normalized;

      // Try querying just by institution and year to see all courses
      const payloadAllCourses = createSearchPayload(institutionCode, undefined, latestYear);
      const responseAll = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadAllCourses),
      });

      if (responseAll.ok && responseAll.status === 200) {
        const allData: GradeData[] = await responseAll.json();
        // Find courses that match (using consistent normalization)
        // For UiB, we need to be careful: "EXPHIL" should NOT match "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
        // But "EXPHIL" SHOULD match "EXPHIL2000" (numeric suffix without dash)
        const matchingData = allData.filter(item => {
          const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
          const normalizedItemCode = normalizeCourseCodeAdvanced(itemCode).normalized;

          // Exact match after normalization
          if (normalizedItemCode === normalizedOriginal || itemCode === courseCode.toUpperCase().replace(/\s/g, '')) {
            return true;
          }

          // For UiB: if the search code contains a dash (e.g., "EXPHIL-HFSEM"), 
          // only match if the item code starts with the exact search code
          // This prevents "EXPHIL" from matching "EXPHIL-HFSEM"
          if (normalizedOriginal.includes('-')) {
            return normalizedItemCode.startsWith(normalizedOriginal + '-') || normalizedItemCode === normalizedOriginal;
          }

          // If search code has no dash, allow prefix matching for numeric suffixes (e.g., "EXPHIL" matches "EXPHIL2000")
          // But NOT for dash-separated variants (e.g., "EXPHIL" does NOT match "EXPHIL-HFSEM")
          if (itemCode.startsWith(normalizedOriginal)) {
            const nextChar = itemCode[normalizedOriginal.length];
            // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
            // Reject if next character is a dash (variant like "EXPHIL-HFSEM")
            if (nextChar === undefined || /[0-9]/.test(nextChar)) {
              return true;
            }
          }

          return false;
        });

        if (matchingData.length > 0) {
          const aggregated = aggregateDuplicateEntries(matchingData);
          if (aggregated.length > 0) {
            const stats = processGradeData(aggregated);
            if (stats) {
              console.log(`  ✅ Found ${courseCode} by querying all courses (actual API code: ${matchingData[0]?.Emnekode})`);
              return stats;
            }
          }
        }
      }
    } catch (error) {
      // Ignore this fallback error
    }

    console.log(`  ⚠️  All format attempts failed for UiB course ${courseCode} (tried: ${uniqueFormats.join(', ')})`);
  }

  return null;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building pre-rendered homepage grade data                ║
╚════════════════════════════════════════════════════════════╝
`);

  // Load top courses list
  if (!fs.existsSync(TOP_COURSES_FILE)) {
    console.error(`❌ Top courses file not found: ${TOP_COURSES_FILE}`);
    console.error(`   Run 'npm run build-home-data' first to generate it.`);
    process.exit(1);
  }

  const topCoursesData = JSON.parse(fs.readFileSync(TOP_COURSES_FILE, 'utf-8')) as {
    generatedAt: string;
    courses: Array<{
      institution: string;
      institutionCode: string;
      courseCode: string;
      courseName: string;
      studentCount: number;
      latestYear: number;
    }>;
    topCourseCodes: string[];
  };
  const courses = topCoursesData.courses.slice(0, 30); // Limit to top 30 courses

  console.log(`📋 Fetching grade data for ${courses.length} top courses...\n`);

  const results: Array<CourseStats & { institution: string; courseName: string }> = [];
  let successCount = 0;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    console.log(`[${i + 1}/${courses.length}] Fetching ${course.courseCode} (${course.institution})...`);

    const stats = await fetchCourseGradeData(
      course.institutionCode,
      course.courseCode,
      course.institution,
      course.latestYear
    );

    if (stats) {
      // Filter out courses that only have pass/fail data or no meaningful grade distributions
      const hasLetterGrades = stats.distributions.some(dist =>
        ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade) && dist.count > 0
      );
      const totalLetterGradeStudents = stats.distributions
        .filter(dist => ['A', 'B', 'C', 'D', 'E', 'F'].includes(dist.grade))
        .reduce((sum, dist) => sum + dist.count, 0);
      const hasPassFailOnly = !hasLetterGrades || totalLetterGradeStudents === 0;
      const hasMeaningfulData = stats.averageGrade !== undefined && stats.averageGrade > 0;
      const hasRecentData = stats.year >= 2020;

      // Skip if: only pass/fail, no letter grades, no average, or very old data
      if (hasPassFailOnly || !hasMeaningfulData || !hasRecentData) {
        console.log(`  ⚠️  Skipping ${course.courseCode} (pass/fail only: ${hasPassFailOnly}, no avg: ${!hasMeaningfulData}, old year: ${stats.year})`);
      } else {
        results.push({
          ...stats,
          institution: course.institution,
          courseName: course.courseName,
          courseCode: normalizeCourseCodeAdvanced(course.courseCode).normalized, // Ensure output uses normalized code
        });
        successCount++;
        console.log(`  ✅ Found data for ${course.courseCode} (avg: ${stats.averageGrade?.toFixed(1)}, year: ${stats.year}, students: ${stats.totalStudents})`);
      }
    } else {
      console.log(`  ⚠️  No data found for ${course.courseCode}`);
    }

    // Small delay to avoid overwhelming the API
    if (i < courses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const payload: HomepageGradeDataPayload = {
    generatedAt: new Date().toISOString(),
    courses: results,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`\n✅ Pre-rendered data saved!`);
  console.log(`   - Courses with data: ${successCount}/${courses.length}`);
  console.log(`   - Saved to: ${OUTPUT_FILE}\n`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


