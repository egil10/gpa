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
  const formattedCode = formatCourseCode(courseCode, institution);
  
  try {
    // Fetch data for the latest year
    const payload = createSearchPayload(institutionCode, formattedCode, latestYear);
    const response = await fetch(DIRECT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 204 || !response.ok) {
      // Try fetching without year filter
      const payloadNoYear = createSearchPayload(institutionCode, formattedCode);
      const responseNoYear = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadNoYear),
      });

      if (responseNoYear.status === 204 || !responseNoYear.ok) {
        // Try without the -1 suffix for UiB courses (they might use different format)
        if (institution === 'UiB' && formattedCode.endsWith('-1')) {
          const codeWithoutSuffix = formattedCode.replace(/-1$/, '');
          const payloadAlt = createSearchPayload(institutionCode, codeWithoutSuffix);
          const responseAlt = await fetch(DIRECT_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadAlt),
          });
          
          if (responseAlt.status === 200 && responseAlt.ok) {
            const altData: GradeData[] = await responseAlt.json();
            if (altData && altData.length > 0) {
              const aggregated = aggregateDuplicateEntries(altData);
              const years = aggregated.map(d => parseInt(d.Årstall, 10));
              const actualLatestYear = Math.max(...years);
              const yearData = aggregated.filter(d => parseInt(d.Årstall, 10) === actualLatestYear);
              const stats = processGradeData(yearData);
              return stats;
            }
          }
        }
        return null;
      }

      const allData: GradeData[] = await responseNoYear.json();
      if (!allData || allData.length === 0) {
        return null;
      }

      // Aggregate duplicates first
      const aggregated = aggregateDuplicateEntries(allData);
      
      // Get latest year from data
      const years = aggregated.map(d => parseInt(d.Årstall, 10));
      const actualLatestYear = Math.max(...years);
      const yearData = aggregated.filter(d => parseInt(d.Årstall, 10) === actualLatestYear);
      
      const stats = processGradeData(yearData);
      return stats;
    }

    const data: GradeData[] = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    // Aggregate duplicates before processing
    const aggregated = aggregateDuplicateEntries(data);
    if (aggregated.length === 0) {
      return null;
    }

    const stats = processGradeData(aggregated);
    return stats;
  } catch (error) {
    console.error(`  ❌ Error fetching ${courseCode}:`, error);
    return null;
  }
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
      results.push({
        ...stats,
        institution: course.institution,
        courseName: course.courseName,
      });
      successCount++;
      console.log(`  ✅ Found data for ${course.courseCode}`);
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

