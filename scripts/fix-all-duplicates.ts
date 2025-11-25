/**
 * Fix duplicate course codes across ALL institutions
 * Usage: npm run fix-all-duplicates (or via post-discovery pipeline)
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
  s?: number; // lastYearStudents
}

interface OptimizedExport {
  i: string; // institution code
  courses: OptimizedCourse[];
}

function fixDuplicatesForInstitution(institution: string, dataFile: { file: string; code: string }): { fixed: number; total: number } {
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const filePath = path.join(dataDir, dataFile.file);
  const publicFilePath = path.join(process.cwd(), 'public', 'data', 'institutions', dataFile.file);

  if (!fs.existsSync(filePath)) {
    return { fixed: 0, total: 0 };
  }

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
    return { fixed: 0, total: data.courses.length };
  }

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
        y: Array.from(allYears).sort((a, b) => b - a),
        s: maxStudents || undefined,
      };

      if (bestName) {
        merged.n = bestName;
      }

      mergedCourses.push(merged);
      processedCodes.add(course.c);
    } else {
      mergedCourses.push(course);
      processedCodes.add(course.c);
    }
  });

  // Update data
  data.courses = mergedCourses.sort((a, b) => a.c.localeCompare(b.c));

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data));
  
  // Also update public file if it exists
  if (fs.existsSync(publicFilePath)) {
    fs.writeFileSync(publicFilePath, JSON.stringify(data));
  }

  return { fixed: duplicates.length, total: data.courses.length };
}

async function main() {
  console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║        Fix Duplicate Course Codes (All Institutions)       ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let totalFixed = 0;
  let totalCourses = 0;
  const results: Array<{ institution: string; fixed: number; total: number }> = [];

  for (const [institution, dataFile] of Object.entries(INSTITUTION_DATA_FILES)) {
    const result = fixDuplicatesForInstitution(institution, dataFile);
    results.push({ institution, ...result });
    totalFixed += result.fixed;
    totalCourses += result.total;
    
    if (result.fixed > 0) {
      console.log(`${colors.yellow}  ${institution}:${colors.reset} Fixed ${colors.green}${result.fixed}${colors.reset} duplicates`);
    }
  }

  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total duplicates fixed: ${colors.green}${totalFixed}${colors.reset}`);
  console.log(`  Total courses processed: ${totalCourses.toLocaleString()}`);
  
  const institutionsWithDuplicates = results.filter(r => r.fixed > 0).length;
  if (institutionsWithDuplicates > 0) {
    console.log(`  Institutions with duplicates: ${colors.yellow}${institutionsWithDuplicates}${colors.reset}`);
  } else {
    console.log(`  ${colors.green}✅ No duplicates found in any institution${colors.reset}`);
  }
  console.log();
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

