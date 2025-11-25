/**
 * Script to fix duplicate course codes in institution data files
 * Merges duplicate entries by combining their years and student counts
 * Usage: npm run fix-duplicates <institution>
 * Example: npm run fix-duplicates AHO
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
};

interface OptimizedCourse {
  c: string; // courseCode
  n?: string; // courseName
  y: number[]; // years (sorted, most recent first)
  s?: number; // lastYearStudents (optional, for sorting)
}

interface OptimizedExport {
  i: string; // institution code
  courses: OptimizedCourse[];
}

async function fixDuplicates(institution: string) {
  console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║        Fix Duplicate Course Codes                          ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const dataFile = INSTITUTION_DATA_FILES[institution];
  if (!dataFile) {
    console.error(`${colors.red}Error: Institution "${institution}" not found in INSTITUTION_DATA_FILES${colors.reset}`);
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const filePath = path.join(dataDir, dataFile.file);
  const publicFilePath = path.join(process.cwd(), 'public', 'data', 'institutions', dataFile.file);

  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}Error: File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  console.log(`Reading: ${filePath}...\n`);

  const content = fs.readFileSync(filePath, 'utf8');
  const data: OptimizedExport = JSON.parse(content);

  // Find duplicates
  const codeMap = new Map<string, OptimizedCourse[]>();
  data.courses.forEach(course => {
    if (!codeMap.has(course.c)) {
      codeMap.set(course.c, []);
    }
    codeMap.get(course.c)!.push(course);
  });

  const duplicates = Array.from(codeMap.entries()).filter(([_, courses]) => courses.length > 1);
  
  if (duplicates.length === 0) {
    console.log(`${colors.green}✅ No duplicates found!${colors.reset}\n`);
    return;
  }

  console.log(`Found ${colors.yellow}${duplicates.length}${colors.reset} duplicate course codes:\n`);

  // Merge duplicates
  const mergedCourses: OptimizedCourse[] = [];
  const processedCodes = new Set<string>();

  data.courses.forEach(course => {
    if (processedCodes.has(course.c)) {
      return; // Skip, already merged
    }

    const duplicatesOfThis = codeMap.get(course.c)!;
    if (duplicatesOfThis.length > 1) {
      // Merge duplicates
      const allYears = new Set<number>();
      let bestName = course.n;
      let maxStudents = course.s || 0;

      duplicatesOfThis.forEach(dup => {
        dup.y?.forEach(year => allYears.add(year));
        if (dup.n && (!bestName || dup.n.length > (bestName?.length || 0))) {
          bestName = dup.n;
        }
        if (dup.s && dup.s > maxStudents) {
          maxStudents = dup.s;
        }
      });

      const merged: OptimizedCourse = {
        c: course.c,
        y: Array.from(allYears).sort((a, b) => b - a), // Most recent first
        s: maxStudents || undefined,
      };

      if (bestName) {
        merged.n = bestName;
      }

      mergedCourses.push(merged);
      processedCodes.add(course.c);

      console.log(`  ${colors.yellow}${course.c}${colors.reset}: Merged ${duplicatesOfThis.length} entries`);
      duplicatesOfThis.forEach((dup, idx) => {
        console.log(`    ${colors.dim}Entry ${idx + 1}: Years [${dup.y?.join(',') || 'none'}]${colors.reset}`);
      });
      console.log(`    ${colors.green}→ Merged: Years [${merged.y.join(',')}]${colors.reset}\n`);
    } else {
      // No duplicates, keep as is
      mergedCourses.push(course);
      processedCodes.add(course.c);
    }
  });

  // Update data
  data.courses = mergedCourses.sort((a, b) => a.c.localeCompare(b.c));

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`${colors.green}✅ Fixed duplicates in: ${filePath}${colors.reset}`);

  // Also update public file if it exists
  if (fs.existsSync(publicFilePath)) {
    fs.writeFileSync(publicFilePath, JSON.stringify(data));
    console.log(`${colors.green}✅ Updated: ${publicFilePath}${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Original courses: ${data.courses.length + duplicates.length}`);
  console.log(`  After merging: ${data.courses.length}`);
  console.log(`  Duplicates removed: ${colors.green}${duplicates.length}${colors.reset}\n`);
}

const institution = process.argv[2];
if (!institution) {
  console.error(`${colors.red}Usage: npm run fix-duplicates <institution>${colors.reset}`);
  console.error(`${colors.dim}Example: npm run fix-duplicates AHO${colors.reset}`);
  process.exit(1);
}

fixDuplicates(institution).catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

