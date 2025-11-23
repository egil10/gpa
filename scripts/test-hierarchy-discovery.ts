/**
 * Test script for the hierarchy discovery system
 * Tests automatic course discovery across different institutions
 */

import { getAllCoursesForInstitution, discoverCoursesAtPath } from '../lib/hierarchy-discovery';
import { getHierarchyConfig } from '../lib/hierarchy-config';
import { UNIVERSITIES } from '../lib/api';

// Test institutions - NHH first since we've been working with it
const TEST_INSTITUTIONS = [
  { code: '1240', name: 'NHH (Norges handelshøyskole)', key: 'NHH' },
  { code: '1110', name: 'UiO (Universitetet i Oslo)', key: 'UiO' },
];

async function testGetAllCourses(institutionCode: string, institutionName: string, year?: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${institutionName} (${institutionCode})`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    console.log(`\n📡 Fetching all courses${year ? ` for year ${year}` : ''}...`);
    const startTime = Date.now();
    
    const courses = await getAllCoursesForInstitution(institutionCode, year);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success! Found ${courses.length} courses in ${duration}ms\n`);
    
    if (courses.length === 0) {
      console.log('⚠️  No courses found - institution might not have data for this year');
      return;
    }
    
    // Show summary
    console.log('📊 Summary:');
    console.log(`   Total courses: ${courses.length}`);
    
    const totalStudents = courses.reduce((sum, c) => sum + c.totalStudents, 0);
    console.log(`   Total students: ${totalStudents.toLocaleString()}`);
    
    // Show unique years
    const allYears = new Set<number>();
    courses.forEach(c => c.years.forEach(y => allYears.add(y)));
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);
    console.log(`   Years covered: ${sortedYears.join(', ')}`);
    
    // Show sample courses (first 10)
    console.log(`\n📚 Sample courses (first 10):`);
    courses.slice(0, 10).forEach((course, idx) => {
      const yearsStr = course.years.slice(0, 3).join(', ') + (course.years.length > 3 ? '...' : '');
      console.log(`   ${idx + 1}. ${course.courseCode.padEnd(12)} - ${course.totalStudents.toLocaleString().padStart(6)} students (${yearsStr})`);
    });
    
    if (courses.length > 10) {
      console.log(`   ... and ${courses.length - 10} more courses`);
    }
    
    // Show hierarchy config
    const config = getHierarchyConfig(institutionCode);
    console.log(`\n🔧 Hierarchy config:`);
    console.log(`   Type: ${config.hierarchyType}`);
    console.log(`   Drilling path: ${config.drillingPath.join(' → ')}`);
    
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

async function testFilteredDiscovery() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: Filtered Discovery (NHH Bachelor Program)`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    console.log(`\n📡 Fetching courses for NHH Bachelor program...`);
    console.log(`   Filters: Progkode=BACHELOR15, Studkode=ØA`);
    
    const courses = await discoverCoursesAtPath('1240', {
      'Progkode': ['BACHELOR15'],
      'Studkode': ['ØA']
    }, 2024);
    
    console.log(`✅ Found ${courses.length} courses in Bachelor program for 2024\n`);
    
    if (courses.length > 0) {
      console.log('📚 Courses:');
      courses.slice(0, 15).forEach((course, idx) => {
        console.log(`   ${idx + 1}. ${course.courseCode.padEnd(12)} - ${course.totalStudents.toLocaleString().padStart(6)} students`);
      });
      
      if (courses.length > 15) {
        console.log(`   ... and ${courses.length - 15} more courses`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : error);
  }
}

async function testHierarchyConfig() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: Hierarchy Configurations`);
  console.log(`${'='.repeat(60)}`);
  
  TEST_INSTITUTIONS.forEach(({ code, name }) => {
    const config = getHierarchyConfig(code);
    console.log(`\n${name} (${code}):`);
    console.log(`   Hierarchy: ${config.hierarchyType}`);
    console.log(`   Path: ${config.drillingPath.join(' → ')}`);
    console.log(`   Variables:`, Object.keys(config.variableNames).join(', '));
  });
}

// Main test function
async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Hierarchy Discovery System - Test Suite                ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // Test 1: Hierarchy configurations
  await testHierarchyConfig();
  
  // Test 2: Get all courses for NHH (2024)
  await testGetAllCourses('1240', 'NHH (Norges handelshøyskole)', 2024);
  
  // Test 3: Get all courses for UiO (2024) - smaller test
  await testGetAllCourses('1110', 'UiO (Universitetet i Oslo)', 2024);
  
  // Test 4: Filtered discovery for NHH Bachelor
  await testFilteredDiscovery();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ All tests completed!`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
runTests().catch(console.error);

