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
  const optimized: OptimizedCourse = {
    c: course.courseCode,
    y: course.years.sort((a, b) => b - a), // Most recent first
  };
  
  // Only include name if it exists and is different from code
  if (course.courseName && course.courseName !== course.courseCode) {
    optimized.n = course.courseName;
  }
  
  // Include student count for last year (useful for sorting/popular courses)
  if (course.lastYearStudents && course.lastYearStudents > 0) {
    optimized.s = course.lastYearStudents;
  }
  
  return optimized;
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
  const originalData: FullCourseData = JSON.parse(originalContent);
  const originalSize = Buffer.byteLength(originalContent, 'utf8');
  
  // Optimize courses
  const optimizedCourses = originalData.courses.map(optimizeCourse);
  
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

