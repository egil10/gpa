/**
 * Build static homepage data showing the three largest courses (by candidates)
 * per institution. The script only touches the optimized JSON exports under
 * data/institutions, so it can run offline and be re-used once per year.
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { UNIVERSITIES } from '../lib/api';

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
  latestYear: number;
}

interface HomepageTopPayload {
  generatedAt: string;
  courses: TopCourseEntry[];
  topCourseCodes: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data', 'institutions');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-top-courses.json');
const MAX_PER_INSTITUTION = 1; // Only one course per institution
const MIN_YEAR = 2020; // Exclude courses with data older than this year

function loadOptimizedCourses(filePath: string): OptimizedCourse[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Missing data file: ${filePath}`);
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OptimizedPayload;
  if (!raw || !Array.isArray(raw.courses)) {
    console.warn(`⚠️  Invalid course payload in ${filePath}`);
    return [];
  }

  return raw.courses.filter((course): course is OptimizedCourse => Boolean(course?.c));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function main() {
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
    const courses = loadOptimizedCourses(dataPath)
      .map((course) => ({
        courseCode: course.c,
        courseName: course.n || course.c,
        studentCount: typeof course.s === 'number' ? course.s : 0,
        latestYear: Array.isArray(course.y) && course.y.length > 0
          ? [...course.y].sort((a, b) => b - a)[0]
          : 0,
      }))
      // Filter out courses with old data
      .filter((course) => course.latestYear >= MIN_YEAR)
      .sort((a, b) => b.studentCount - a.studentCount);

    if (courses.length === 0) {
      console.warn(`⚠️  No optimized courses for ${institution} (after filtering for year >= ${MIN_YEAR})`);
      continue;
    }

    courses.slice(0, MAX_PER_INSTITUTION).forEach((course) => {
      topCourses.push({
        institution,
        institutionCode: uni.code,
        courseCode: course.courseCode,
        courseName: course.courseName,
        studentCount: course.studentCount,
        latestYear: course.latestYear,
      });
    });
  }

  topCourses.sort((a, b) => b.studentCount - a.studentCount);
  const topCourseCodes = unique(topCourses.map((course) => course.courseCode));

  const payload: HomepageTopPayload = {
    generatedAt: new Date().toISOString(),
    courses: topCourses,
    topCourseCodes,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`✅ Captured ${topCourses.length} top courses from ${processedInstitutions} institutions.`);
  console.log(`✅ Saved ${topCourseCodes.length} unique course codes for suggestions.`);
  console.log(`📄 Saved to ${OUTPUT_FILE}`);
}

main();
