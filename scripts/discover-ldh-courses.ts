/**
 * Discover and fetch ALL LDH courses
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
  studentCountByYear: Record<number, number>;
}

async function discoverLDHCourses() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     LDH All Courses Discovery & Export (Batched)           ║
╚════════════════════════════════════════════════════════════╝
  `);

  const institutionCode = '8202';
  const institutionName = 'LDH';
  
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 2000; year--) {
    years.push(year);
  }
  const allCoursesMap = new Map<string, CourseExport>();
  
  console.log(`📡 Fetching all courses from ${institutionName}...`);
  console.log(`   Processing ${years.length} years in batches...\n`);
  
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    console.log(`[${i + 1}/${years.length}] 📅 Fetching year ${year}...`);
    
    try {
      const startTime = Date.now();
      const courses = await getAllCoursesForInstitution(institutionCode, year);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Found ${courses.length} courses in ${duration}ms`);
      
      courses.forEach((course: DiscoveredCourse) => {
        const baseCode = course.courseCode.replace(/-1$/, '');
        const existing = allCoursesMap.get(baseCode);
        
        if (existing) {
          if (!existing.years.includes(year)) {
            existing.years.push(year);
            existing.years.sort((a, b) => b - a);
          }
          if (!existing.studentCountByYear[year]) {
            existing.studentCountByYear[year] = 0;
          }
          existing.studentCountByYear[year] += course.totalStudents;
          existing.totalStudents = Math.max(existing.totalStudents, course.totalStudents);
          existing.lastYear = existing.years[0];
          existing.lastYearStudents = existing.studentCountByYear[existing.lastYear] || 0;
          if (course.courseName && (!existing.courseName || course.courseName.length > existing.courseName.length)) {
            existing.courseName = course.courseName;
          }
        } else {
          allCoursesMap.set(baseCode, {
            courseCode: baseCode,
            courseName: course.courseName,
            years: [year],
            totalStudents: course.totalStudents,
            lastYear: year,
            lastYearStudents: course.totalStudents,
            studentCountByYear: { [year]: course.totalStudents },
          });
        }
      });
      
      console.log(`   📊 Total unique courses so far: ${allCoursesMap.size}\n`);
      
      if (i < years.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`   ❌ Error fetching ${year}:`, error instanceof Error ? error.message : error);
      console.log(`   ⚠️  Continuing with next year...\n`);
    }
  }
  
  const allCourses = Array.from(allCoursesMap.values())
    .filter(course => course.years.length > 0)
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  
  console.log(`\n✅ Discovery complete!`);
  console.log(`   Total unique courses: ${allCourses.length}\n`);
  
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  if (!fs.exists*** End Patch to=functions.apply_patch code_execution_status="success" code_output_signed=Falseinted JSON response```json

