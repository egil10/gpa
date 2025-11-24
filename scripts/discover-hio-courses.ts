/**
 * Discover and fetch ALL HiØ courses
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

async function discoverHiØCourses() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     HiØ All Courses Discovery & Export (Batched)           ║
╚════════════════════════════════════════════════════════════╝
  `);

  const institutionCode = '0256';
  const institutionName = 'HiØ';
  
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
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const outputFile = path.join(dataDir, 'hio-all-courses.json');
  const exportData = createOptimizedExport(institutionCode, allCourses);
  fs.writeFileSync(outputFile, JSON.stringify(exportData));
  
  console.log(`✅ Exported ${allCourses.length} courses to:`);
  console.log(`   ${outputFile}\n`);
  
  console.log(`📊 Summary:`);
  console.log(`   Total courses: ${allCourses.length}`);
  console.log(`   Courses with 2024 data: ${allCourses.filter(c => c.years.includes(2024)).length}`);
  if (allCourses.some(c => c.years.includes(2025))) {
    console.log(`   Courses with 2025 data: ${allCourses.filter(c => c.years.includes(2025)).length}`);
  }
  console.log(`   Total students (2024): ${allCourses
    .filter(c => c.years.includes(2024))
    .reduce((sum, c) => sum + (c.studentCountByYear[2024] || 0), 0)
    .toLocaleString()}`);
  
  const maxYears = Math.max(...allCourses.map(c => c.years.length), 0);
  const coursesWithAllYears = allCourses.filter(c => c.years.length === maxYears).length;
  console.log(`   Courses with all ${maxYears} years: ${coursesWithAllYears}`);
  
  console.log(`\n📚 Sample courses:`);
  allCourses.slice(0, 10).forEach(course => {
    const yearsStr = course.years.slice(0, 3).join(', ') + (course.years.length > 3 ? '...' : '');
    console.log(`   ${course.courseCode.padEnd(12)} - ${course.lastYearStudents.toLocaleString().padStart(6)} students (${course.years.length} years: ${yearsStr})`);
  });
  
  if (allCourses.length > 10) {
    console.log(`   ... and ${allCourses.length - 10} more courses`);
  }
  
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

discoverHiØCourses().catch(console.error);


