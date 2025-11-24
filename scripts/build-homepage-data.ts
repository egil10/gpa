/**
 * Build static data for homepage hero cards and search suggestions.
 * Run this once per year (or when new data arrives) to refresh the
 * most popular course snapshots per institution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { UNIVERSITIES, formatCourseCode, createSearchPayload, DIRECT_API } from '../lib/api';
import { processGradeData } from '../lib/utils';
import type { CourseStats, GradeData } from '../types';

interface CourseRecord {
  code: string;
  name?: string;
  years: number[];
  lastYearStudents: number;
}

interface StaticCourseEntry extends CourseStats {
  institution: string;
  courseName: string;
  displayCode: string;
  studentCount: number;
}

interface SuggestionEntry {
  institution: string;
  courseCode: string;
  courseName?: string;
}

interface InitialHomePayload {
  generatedAt: string;
  courses: StaticCourseEntry[];
  suggestions: SuggestionEntry[];
}

const DATA_DIR = path.join(process.cwd(), 'data', 'institutions');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-top-courses.json');
const REQUEST_DELAY_MS = 150;

function loadInstitutionCourses(filePath: string): CourseRecord[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Missing data file: ${filePath}`);
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const courses: CourseRecord[] = [];
  const sourceCourses: any[] = Array.isArray(raw?.courses) ? raw.courses : [];

  sourceCourses.forEach((course) => {
    if (!course) return;
    if (typeof course.c === 'string') {
      // Optimized format
      const years = Array.isArray(course.y) ? course.y : [];
      courses.push({
        code: course.c,
        name: course.n,
        years,
        lastYearStudents: typeof course.s === 'number' ? course.s : 0,
      });
    } else if (typeof course.courseCode === 'string') {
      // Legacy format
      const years = Array.isArray(course.years) ? course.years : [];
      courses.push({
        code: course.courseCode,
        name: course.courseName,
        years,
        lastYearStudents: typeof course.lastYearStudents === 'number'
          ? course.lastYearStudents
          : 0,
      });
    }
  });

  return courses;
}

async function fetchLatestStats(
  institution: string,
  course: CourseRecord
): Promise<StaticCourseEntry | null> {
  const uni = UNIVERSITIES[institution];
  if (!uni) {
    console.warn(`⚠️  Unknown institution mapping for ${institution}`);
    return null;
  }

  const years = [...course.years].sort((a, b) => b - a);
  const latestYear = years[0];
  if (!latestYear) {
    console.warn(`⚠️  No year data for ${institution} ${course.code}`);
    return null;
  }

  const formattedCode = formatCourseCode(course.code, institution);
  const payload = createSearchPayload(uni.code, formattedCode, latestYear);

  const response = await fetch(DIRECT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.warn(`⚠️  Grade fetch failed for ${institution} ${course.code}: ${response.status}`);
    return null;
  }

  const rawBody = await response.text();
  if (!rawBody) {
    console.warn(`⚠️  Empty response for ${institution} ${course.code}`);
    return null;
  }

  let gradeData: GradeData[];
  try {
    gradeData = JSON.parse(rawBody) as GradeData[];
  } catch (error) {
    console.warn(`⚠️  Failed to parse grade data for ${institution} ${course.code}:`, error);
    return null;
  }
  if (!Array.isArray(gradeData) || gradeData.length === 0) {
    console.warn(`⚠️  No grade data returned for ${institution} ${course.code}`);
    return null;
  }

  const latestData = gradeData.filter(
    (item) => parseInt(item.Årstall, 10) === latestYear
  );
  const stats = processGradeData(latestData);
  if (!stats) {
    console.warn(`⚠️  Unable to process grade data for ${institution} ${course.code}`);
    return null;
  }

  const normalizedStats: CourseStats = {
    ...stats,
    year: latestYear,
    institution,
  };

  return {
    ...normalizedStats,
    courseName: course.name || course.code,
    displayCode: course.code,
    studentCount: course.lastYearStudents || normalizedStats.totalStudents,
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building static homepage dataset                         ║
╚════════════════════════════════════════════════════════════╝
`);

  const staticCourses: StaticCourseEntry[] = [];
  const suggestions: SuggestionEntry[] = [];
  let processedInstitutions = 0;

  for (const [institution, mapping] of Object.entries(INSTITUTION_DATA_FILES)) {
    processedInstitutions += 1;
    const dataPath = path.join(DATA_DIR, mapping.file);
    const courses = loadInstitutionCourses(dataPath);
    if (courses.length === 0) {
      console.warn(`⚠️  No courses found for ${institution}`);
      continue;
    }

    courses.sort((a, b) => (b.lastYearStudents || 0) - (a.lastYearStudents || 0));

    const suggestionEntries = courses.slice(0, 3).map((course) => ({
      institution,
      courseCode: course.code,
      courseName: course.name,
    }));
    suggestions.push(...suggestionEntries);

    const institutionTopCourses: StaticCourseEntry[] = [];
    for (const candidate of courses) {
      if (institutionTopCourses.length >= 3) break;
      const entry = await fetchLatestStats(institution, candidate);
      if (entry) {
        institutionTopCourses.push(entry);
        await delay(REQUEST_DELAY_MS);
        continue;
      }
      await delay(REQUEST_DELAY_MS);
    }

    if (institutionTopCourses.length > 0) {
      staticCourses.push(...institutionTopCourses);
    }
  }

  staticCourses.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));

  const payload: InitialHomePayload = {
    generatedAt: new Date().toISOString(),
    courses: staticCourses,
    suggestions,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`✅ Generated ${staticCourses.length} homepage courses from ${processedInstitutions} institutions.`);
  console.log(`✅ Collected ${suggestions.length} search suggestions.`);
  console.log(`📄 Saved to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('❌ Failed to build homepage data:', error);
  process.exitCode = 1;
});

