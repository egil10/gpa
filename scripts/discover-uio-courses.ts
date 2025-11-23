/**
 * Discover and fetch all UiO courses in batches
 * This script will:
 * 1. Fetch courses year by year (2020-2024)
 * 2. Process in batches to avoid overwhelming the API
 * 3. Save progress incrementally
 * 4. Generate a JSON file with all courses
 */

import { getAllCoursesForInstitution, DiscoveredCourse } from '../lib/hierarchy-discovery';
import { createOptimizedExport } from './utils/export-format';
import * as fs from 'fs';
import * as path from 'path';

interface CourseExport {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
  studentCountByYear: Record<number, number>; // Year -> student count
}

async function discoverUiOCourses() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     UiO Courses Discovery & Export (Batched)               ║
╚════════════════════════════════════════════════════════════╝
  `);

  const institutionCode = '1110';
  const institutionName = 'UiO';
  
  // Fetch years from most recent to oldest
  // Going back as far as API allows (typically 2000+)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2000; year--) {
    years.push(year);
  }
  const allCoursesMap = new Map<string, CourseExport>();
  
  console.log(`📡 Fetching all courses from ${institutionName}...`);
  console.log(`   Processing ${years.length} years in batches...\n`);
  
  // Process year by year
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    console.log(`[${i + 1}/${years.length}] 📅 Fetching year ${year}...`);
    
    try {
      const startTime = Date.now();
      const courses = await getAllCoursesForInstitution(institutionCode, year);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Found ${courses.length} courses in ${duration}ms`);
      
      // Merge into master map
      courses.forEach(course => {
        const baseCode = course.courseCode.split('-')[0]; // Remove -1 suffix
        const existing = allCoursesMap.get(baseCode);
        
        if (existing) {
          // Add year if not present
          if (!existing.years.includes(year)) {
            existing.years.push(year);
            existing.years.sort((a, b) => b - a); // Most recent first
          }
          // Update student counts
          if (!existing.studentCountByYear[year]) {
            existing.studentCountByYear[year] = 0;
          }
          existing.studentCountByYear[year] += course.totalStudents;
          existing.totalStudents = Math.max(existing.totalStudents, course.totalStudents);
          existing.lastYear = existing.years[0]; // Most recent year
          existing.lastYearStudents = existing.studentCountByYear[existing.lastYear] || 0;
        } else {
          // Create new entry
          allCoursesMap.set(baseCode, {
            courseCode: baseCode,
            years: [year],
            totalStudents: course.totalStudents,
            lastYear: year,
            lastYearStudents: course.totalStudents,
            studentCountByYear: {
              [year]: course.totalStudents
            },
          });
        }
      });
      
      console.log(`   📊 Total unique courses so far: ${allCoursesMap.size}\n`);
      
      // Small delay between requests to be nice to the API
      if (i < years.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`   ❌ Error fetching ${year}:`, error instanceof Error ? error.message : error);
      console.log(`   ⚠️  Continuing with next year...\n`);
    }
  }
  
  // Convert to array and sort
  const allCourses = Array.from(allCoursesMap.values())
    .filter(course => course.years.length > 0) // Only courses with data
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  
  console.log(`\n✅ Discovery complete!`);
  console.log(`   Total unique courses: ${allCourses.length}\n`);
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save to JSON file
  const outputFile = path.join(dataDir, 'uio-all-courses.json');
  const exportData = createOptimizedExport(institutionCode, allCourses);
  
  // Write compact JSON (no whitespace for smaller size)
  fs.writeFileSync(outputFile, JSON.stringify(exportData));
  
  console.log(`✅ Exported ${allCourses.length} courses to:`);
  console.log(`   ${outputFile}\n`);
  
  // Print summary statistics
  console.log(`📊 Summary:`);
  console.log(`   Total courses: ${allCourses.length}`);
  console.log(`   Courses with 2024 data: ${allCourses.filter(c => c.years.includes(2024)).length}`);
  console.log(`   Total students (2024): ${allCourses
    .filter(c => c.years.includes(2024))
    .reduce((sum, c) => sum + (c.studentCountByYear[2024] || 0), 0)
    .toLocaleString()}`);
  
  // Show courses by year coverage
  const coursesWithAllYears = allCourses.filter(c => c.years.length === years.length).length;
  console.log(`   Courses with all ${years.length} years: ${coursesWithAllYears}`);
  
  // Show sample courses
  console.log(`\n📚 Sample courses:`);
  allCourses.slice(0, 10).forEach(course => {
    const yearsStr = course.years.slice(0, 3).join(', ') + (course.years.length > 3 ? '...' : '');
    console.log(`   ${course.courseCode.padEnd(12)} - ${course.lastYearStudents.toLocaleString().padStart(6)} students (${course.years.length} years: ${yearsStr})`);
  });
  
  if (allCourses.length > 10) {
    console.log(`   ... and ${allCourses.length - 10} more courses`);
  }
  
  // Show courses by first letter
  console.log(`\n📈 Courses by prefix:`);
  const prefixCounts: Record<string, number> = {};
  allCourses.forEach(course => {
    const prefix = course.courseCode.charAt(0);
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  });
  
  Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([prefix, count]) => {
      console.log(`   ${prefix}*: ${count} courses`);
    });
  
  console.log(`\n✅ All done!`);
  
  return allCourses;
}

// Run discovery
discoverUiOCourses().catch(console.error);

