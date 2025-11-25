/**
 * Script to normalize course codes in existing JSON files
 * Removes spaces from course codes to fix issues with URL encoding, API calls, and matching
 * 
 * This script:
 * 1. Reads all institution course JSON files
 * 2. Normalizes course codes (removes spaces, converts to uppercase)
 * 3. Writes updated files back
 * 
 * Run: npm run normalize-codes
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeCourseCodeForStorage } from './utils/export-format';

interface OptimizedCourse {
  c: string; // courseCode
  n?: string; // courseName
  y: number[]; // years
  s?: number; // lastYearStudents
}

interface OptimizedExport {
  i: string; // institution code
  courses: OptimizedCourse[];
}

function normalizeCourseCodesInFile(filePath: string): { updated: number; total: number } {
  console.log(`  Processing: ${path.basename(filePath)}...`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const data: OptimizedExport = JSON.parse(content);
  
  let updatedCount = 0;
  const totalCount = data.courses.length;
  
  data.courses.forEach(course => {
    const originalCode = course.c;
    const normalizedCode = normalizeCourseCodeForStorage(originalCode);
    
    if (originalCode !== normalizedCode) {
      console.log(`    "${originalCode}" -> "${normalizedCode}"`);
      course.c = normalizedCode;
      updatedCount++;
    }
  });
  
  if (updatedCount > 0) {
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`  ✅ Updated ${updatedCount}/${totalCount} course codes`);
  } else {
    console.log(`  ✓ No changes needed (${totalCount} courses)`);
  }
  
  return { updated: updatedCount, total: totalCount };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        Normalize Course Codes (Remove Spaces)             ║
╚════════════════════════════════════════════════════════════╝
`);

  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const publicDir = path.join(process.cwd(), 'public', 'data', 'institutions');
  
  if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory not found:', dataDir);
    process.exit(1);
  }
  
  const dataFiles = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('-all-courses.json'))
    .map(f => path.join(dataDir, f));
  
  const publicFiles = fs.existsSync(publicDir)
    ? fs.readdirSync(publicDir)
        .filter(f => f.endsWith('-all-courses.json'))
        .map(f => path.join(publicDir, f))
    : [];
  
  console.log(`Found ${dataFiles.length} data files and ${publicFiles.length} public files\n`);
  
  let totalUpdated = 0;
  let totalCourses = 0;
  
  // Process data files
  console.log('📁 Processing data/institutions files:');
  for (const file of dataFiles) {
    const result = normalizeCourseCodesInFile(file);
    totalUpdated += result.updated;
    totalCourses += result.total;
  }
  
  // Process public files
  if (publicFiles.length > 0) {
    console.log('\n📁 Processing public/data/institutions files:');
    for (const file of publicFiles) {
      const result = normalizeCourseCodesInFile(file);
      totalUpdated += result.updated;
      totalCourses += result.total;
    }
  }
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Summary                               ║
╚════════════════════════════════════════════════════════════╝
  Total courses processed: ${totalCourses}
  Course codes normalized: ${totalUpdated}
  
  ${totalUpdated > 0 ? '✅ Normalization complete!' : '✅ All codes already normalized!'}
`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

