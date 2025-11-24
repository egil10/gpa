/**
 * Utility to optimize course JSON files
 * Removes redundant metadata and compresses field names
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

interface CourseExport {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
  studentCountByYear?: Record<number, number>;
}

interface OptimizedCourse {
  c: string; // courseCode (required)
  n?: string; // courseName (optional)
  y: number[]; // years (required)
  s?: number; // lastYearStudents (optional - for sorting)
}

interface FullCourseData {
  institution: string;
  institutionCode: string;
  lastUpdated: string;
  totalCourses: number;
  yearsCovered: number[];
  courses: CourseExport[];
  metadata?: any;
}

/**
 * Optimize a single course object
 */
function optimizeCourse(course: CourseExport): OptimizedCourse {
  // Ensure years is an array before sorting
  const years = Array.isArray(course.years) ? course.years : [];
  const sortedYears = years.sort((a, b) => b - a); // Most recent first
  
  const optimized: OptimizedCourse = {
    c: course.courseCode,
    y: sortedYears,
  };
  
  // Only include name if it exists and is different from code
  if (course.courseName && course.courseName !== course.courseCode) {
    optimized.n = course.courseName;
  }
  
  // Include student count for last year (useful for sorting/popular courses)
  if (course.lastYearStudents && course.lastYearStudents > 0) {
    optimized.s = course.lastYearStudents;
  } else if (course.totalStudents && course.totalStudents > 0 && sortedYears.length > 0) {
    // Fall back to totalStudents if lastYearStudents is not available
    optimized.s = course.totalStudents;
  }
  
  return optimized;
}

/**
 * Check if a file is already in optimized format
 */
function isAlreadyOptimized(data: any): boolean {
  // Optimized format has structure: { i: string, courses: OptimizedCourse[] }
  // Legacy format has structure: { institution: string, courses: CourseExport[] }
  return data && typeof data.i === 'string' && Array.isArray(data.courses) && 
    (data.courses.length === 0 || (data.courses[0] && typeof data.courses[0].c === 'string'));
}

/**
 * Convert optimized format back to legacy format (for re-optimization if needed)
 */
function convertOptimizedToLegacy(optimizedData: any): FullCourseData {
  const courses: CourseExport[] = optimizedData.courses.map((course: any) => ({
    courseCode: course.c,
    courseName: course.n || course.c,
    years: Array.isArray(course.y) ? course.y : [],
    totalStudents: course.s || 0,
    lastYear: Array.isArray(course.y) && course.y.length > 0 ? Math.max(...course.y) : 0,
    lastYearStudents: course.s || 0,
  }));

  return {
    institution: '',
    institutionCode: optimizedData.i,
    lastUpdated: new Date().toISOString(),
    totalCourses: courses.length,
    yearsCovered: [],
    courses,
  };
}

/**
 * Optimize a full course JSON file
 */
async function optimizeCourseFile(filePath: string): Promise<void> {
  console.log(`\n📦 Optimizing: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found, skipping`);
    return;
  }
  
  // Read original file
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const parsedData = JSON.parse(originalContent);
  const originalSize = Buffer.byteLength(originalContent, 'utf8');
  
  // Check if already optimized
  if (isAlreadyOptimized(parsedData)) {
    console.log(`   ℹ️  File is already in optimized format, skipping`);
    return;
  }
  
  // Parse as legacy format
  const originalData: FullCourseData = parsedData;
  
  // Validate that we have courses array
  if (!originalData.courses || !Array.isArray(originalData.courses)) {
    console.log(`   ⚠️  Invalid file format (missing courses array), skipping`);
    return;
  }
  
  // Optimize courses - handle missing years property
  const optimizedCourses = originalData.courses
    .filter(course => course && course.courseCode) // Filter out invalid courses
    .map(course => {
      // Ensure years is an array
      if (!course.years || !Array.isArray(course.years)) {
        return {
          c: course.courseCode,
          n: course.courseName && course.courseName !== course.courseCode ? course.courseName : undefined,
          y: [],
          s: course.lastYearStudents || course.totalStudents || undefined,
        };
      }
      return optimizeCourse(course);
    })
    .filter(course => course.y && course.y.length > 0); // Filter out courses with no years
  
  // Create minimal export structure
  const optimizedData = {
    i: originalData.institutionCode, // institution code (only essential metadata)
    courses: optimizedCourses,
  };
  
  // Write optimized JSON (compact, no whitespace)
  const optimizedJson = JSON.stringify(optimizedData);
  const optimizedSize = Buffer.byteLength(optimizedJson, 'utf8');
  
  // Create gzipped version
  const gzipped = await gzip(Buffer.from(optimizedJson, 'utf8'));
  const gzippedSize = gzipped.length;
  
  // Calculate savings
  const jsonSavings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
  const totalSavings = ((originalSize - gzippedSize) / originalSize * 100).toFixed(1);
  
  console.log(`   Original:    ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`   Optimized:   ${(optimizedSize / 1024).toFixed(2)} KB (${jsonSavings}% smaller)`);
  console.log(`   Gzipped:     ${(gzippedSize / 1024).toFixed(2)} KB (${totalSavings}% smaller)`);
  console.log(`   Courses:     ${optimizedCourses.length}`);
  
  // Save optimized version (keep original as .backup)
  const backupPath = filePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`   💾 Backed up original to: ${path.basename(backupPath)}`);
  }
  
  // Write optimized JSON
  fs.writeFileSync(filePath, optimizedJson);
  
  // Write gzipped version (for serving with gzip)
  const gzipPath = filePath + '.gz';
  fs.writeFileSync(gzipPath, gzipped);
  console.log(`   ✅ Saved optimized JSON + gzip versions`);
}

/**
 * Main function
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Course JSON Optimization Tool                           ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    console.log(`   Run discovery scripts first to generate course data`);
    process.exit(1);
  }
  
  // Find all course JSON files
  const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json') && !file.endsWith('.backup'))
    .map(file => path.join(dataDir, file));
  
  if (files.length === 0) {
    console.log(`⚠️  No course JSON files found in ${dataDir}`);
    console.log(`   Run discovery scripts first:`);
    console.log(`   - npm run discover-nhh`);
    console.log(`   - npm run discover-uio`);
    console.log(`   - npm run discover-uib`);
    console.log(`   - npm run discover-ntnu`);
    process.exit(1);
  }
  
  console.log(`📁 Found ${files.length} course JSON file(s) to optimize\n`);
  
  // Optimize each file
  for (const file of files) {
    await optimizeCourseFile(file);
  }
  
  // Calculate total savings
  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalGzipped = 0;
  
  files.forEach(file => {
    const backupFile = file + '.backup';
    if (fs.existsSync(backupFile)) {
      totalOriginal += fs.statSync(backupFile).size;
    } else {
      totalOriginal += fs.statSync(file).size; // Use current if no backup
    }
    
    const gzipFile = file + '.gz';
    if (fs.existsSync(gzipFile)) {
      totalGzipped += fs.statSync(gzipFile).size;
      totalOptimized += fs.statSync(file).size;
    }
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Total Savings:`);
  console.log(`   Original:    ${(totalOriginal / 1024).toFixed(2)} KB`);
  console.log(`   Optimized:   ${(totalOptimized / 1024).toFixed(2)} KB`);
  console.log(`   Gzipped:     ${(totalGzipped / 1024).toFixed(2)} KB`);
  console.log(`   Reduction:   ${((totalOriginal - totalGzipped) / totalOriginal * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log(`✅ Optimization complete!`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Update loaders to handle optimized format`);
  console.log(`   2. Configure server to serve .gz files with correct headers`);
  console.log(`   3. Test autocomplete with optimized data\n`);
}

main().catch(console.error);

