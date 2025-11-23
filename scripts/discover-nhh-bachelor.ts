/**
 * Discover and fetch all NHH Bachelor courses
 * This script will:
 * 1. Fetch all courses from NHH
 * 2. Filter and organize Bachelor courses
 * 3. Save to a JSON file for use in the website
 */

import { getAllCoursesForInstitution, discoverCoursesAtPath, DiscoveredCourse } from '../lib/hierarchy-discovery';
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
}

async function discoverNHHBachelorCourses() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     NHH Bachelor Courses Discovery & Export                ║
╚════════════════════════════════════════════════════════════╝
  `);

  const institutionCode = '1240';
  const institutionName = 'NHH';
  
  console.log(`📡 Fetching all courses from ${institutionName}...`);
  
  // Fetch all courses for multiple years to get complete data
  const years = [2024, 2023, 2022, 2021, 2020];
  const allCoursesByYear = new Map<string, DiscoveredCourse>();
  
  for (const year of years) {
    console.log(`   Fetching year ${year}...`);
    try {
      const courses = await getAllCoursesForInstitution(institutionCode, year);
      
      courses.forEach(course => {
        const existing = allCoursesByYear.get(course.courseCode);
        if (existing) {
          // Merge years
          course.years.forEach(y => {
            if (!existing.years.includes(y)) {
              existing.years.push(y);
            }
          });
          existing.years.sort((a, b) => b - a);
          existing.totalStudents = Math.max(existing.totalStudents, course.totalStudents);
        } else {
          allCoursesByYear.set(course.courseCode, { ...course });
        }
      });
      
      console.log(`   ✅ Found ${courses.length} courses for ${year}`);
    } catch (error) {
      console.warn(`   ⚠️  Error fetching ${year}:`, error instanceof Error ? error.message : error);
    }
  }
  
  const allCourses = Array.from(allCoursesByYear.values());
  console.log(`\n✅ Total unique courses found: ${allCourses.length}`);
  
  // Filter Bachelor courses based on NHH course structure
  // Bachelor courses typically start with: BED, MET, SAM, SOL, RET, IKE, KOM
  const bachelorPrefixes = ['BED', 'MET', 'SAM', 'SOL', 'RET', 'IKE', 'KOM'];
  
  const bachelorCourses = allCourses.filter(course => {
    const code = course.courseCode.split('-')[0]; // Get base code (e.g., "BED1-1" -> "BED1")
    
    // Check if it matches any Bachelor prefix
    return bachelorPrefixes.some(prefix => code.startsWith(prefix)) &&
           // Exclude master-level courses (typically 400+ codes)
           !code.match(/[4-9]\d{2}/);
  });
  
  console.log(`\n📚 Filtered Bachelor courses: ${bachelorCourses.length}`);
  
  // Fetch current year data for statistics
  console.log(`\n📡 Fetching 2024 data for final statistics...`);
  const currentYearCourses = await getAllCoursesForInstitution(institutionCode, 2024);
  const currentYearMap = new Map(currentYearCourses.map(c => [c.courseCode, c]));
  
  // Build export structure
  const exportData: CourseExport[] = bachelorCourses
    .map(course => {
      const currentYearData = currentYearMap.get(course.courseCode);
      const lastYear = course.years[0] || 2024;
      const lastYearStudents = currentYearData?.totalStudents || 0;
      
      return {
        courseCode: course.courseCode.split('-')[0], // Remove -1 suffix for cleaner codes
        years: course.years,
        totalStudents: course.totalStudents,
        lastYear,
        lastYearStudents,
      };
    })
    .filter(course => course.years.length > 0) // Only include courses with data
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save to JSON file (optimized format)
  const outputFile = path.join(dataDir, 'nhh-bachelor-courses.json');
  const optimizedExport = createOptimizedExport(institutionCode, exportData);
  
  // Write compact JSON (no whitespace for smaller size)
  fs.writeFileSync(outputFile, JSON.stringify(optimizedExport));
  
  console.log(`\n✅ Exported ${exportData.length} Bachelor courses to:`);
  console.log(`   ${outputFile}`);
  
  // Print summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Bachelor courses: ${exportData.length}`);
  console.log(`   Courses with 2024 data: ${exportData.filter(c => c.lastYear === 2024).length}`);
  console.log(`   Total students (2024): ${exportData.reduce((sum, c) => sum + c.lastYearStudents, 0).toLocaleString()}`);
  
  // Show sample courses
  console.log(`\n📚 Sample courses:`);
  exportData.slice(0, 10).forEach(course => {
    console.log(`   ${course.courseCode.padEnd(10)} - ${course.lastYearStudents.toLocaleString().padStart(6)} students (${course.years.length} years)`);
  });
  
  console.log(`\n✅ Discovery complete!`);
  
  return exportData;
}

// Run discovery
discoverNHHBachelorCourses().catch(console.error);

