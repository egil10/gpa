/**
 * Comprehensive analytics script for course data
 * Generates markdown reports with extremes, top/bottom lists, and error detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../../lib/all-courses';
import { UNIVERSITIES } from '../../lib/api';

interface CourseData {
  courseCode: string;
  courseName?: string;
  years: number[];
  lastYearStudents?: number;
}

interface InstitutionData {
  institution: string;
  institutionCode: string;
  courses: CourseData[];
}

interface AnalyticsResult {
  institution: string;
  institutionCode: string;
  totalCourses: number;
  coursesWithStudentCount: number;
  coursesWithoutStudentCount: number;
  totalStudents: number;
  averageStudentsPerCourse: number;
  minStudents: number;
  maxStudents: number;
  minYears: number;
  maxYears: number;
  averageYears: number;
  yearRange: { min: number; max: number };
  longestCourseCode: string;
  shortestCourseCode: string;
  coursesWithUnusualPatterns: string[];
}

/**
 * Load course data from JSON file
 */
function loadInstitutionData(filePath: string, institution: string, institutionCode: string): InstitutionData | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle optimized format
    const courses: CourseData[] = [];
    const courseArray = data.courses || [];
    
    for (const course of courseArray) {
      // Handle optimized format (c, y, s, n)
      if ('c' in course && 'y' in course) {
        courses.push({
          courseCode: course.c,
          courseName: course.n,
          years: course.y || [],
          lastYearStudents: course.s,
        });
      } else {
        // Handle legacy format
        courses.push({
          courseCode: course.courseCode || course.code,
          courseName: course.courseName || course.name,
          years: course.years || [],
          lastYearStudents: course.lastYearStudents || course.s,
        });
      }
    }
    
    return {
      institution,
      institutionCode,
      courses,
    };
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return null;
  }
}

/**
 * Analyze institution data
 */
function analyzeInstitution(data: InstitutionData): AnalyticsResult {
  const courses = data.courses;
  const coursesWithCount = courses.filter(c => c.lastYearStudents !== undefined && c.lastYearStudents > 0);
  const coursesWithoutCount = courses.filter(c => !c.lastYearStudents || c.lastYearStudents === 0);
  
  const studentCounts = coursesWithCount.map(c => c.lastYearStudents!);
  const yearCounts = courses.map(c => c.years.length);
  const allYears = courses.flatMap(c => c.years);
  
  const courseCodes = courses.map(c => c.courseCode);
  const longestCode = courseCodes.reduce((a, b) => a.length > b.length ? a : b, '');
  const shortestCode = courseCodes.reduce((a, b) => a.length < b.length ? a : b, courseCodes[0] || '');
  
  // Detect unusual patterns
  const unusualPatterns: string[] = [];
  for (const course of courses) {
    // Courses with no years
    if (course.years.length === 0) {
      unusualPatterns.push(`${course.courseCode}: No years data`);
    }
    // Courses with very long course codes (>20 chars)
    if (course.courseCode.length > 20) {
      unusualPatterns.push(`${course.courseCode}: Very long code (${course.courseCode.length} chars)`);
    }
    // Courses with very short course codes (<3 chars)
    if (course.courseCode.length < 3) {
      unusualPatterns.push(`${course.courseCode}: Very short code (${course.courseCode.length} chars)`);
    }
    // Courses with gaps in years (e.g., 2020, 2022 but no 2021)
    if (course.years.length > 2) {
      const sortedYears = [...course.years].sort((a, b) => a - b);
      for (let i = 1; i < sortedYears.length; i++) {
        if (sortedYears[i] - sortedYears[i - 1] > 2) {
          unusualPatterns.push(`${course.courseCode}: Large gap in years (${sortedYears[i - 1]} to ${sortedYears[i]})`);
          break;
        }
      }
    }
    // Courses with student count but no years
    if (course.lastYearStudents && course.lastYearStudents > 0 && course.years.length === 0) {
      unusualPatterns.push(`${course.courseCode}: Has students (${course.lastYearStudents}) but no years`);
    }
  }
  
  return {
    institution: data.institution,
    institutionCode: data.institutionCode,
    totalCourses: courses.length,
    coursesWithStudentCount: coursesWithCount.length,
    coursesWithoutStudentCount: coursesWithoutCount.length,
    totalStudents: studentCounts.reduce((a, b) => a + b, 0),
    averageStudentsPerCourse: coursesWithCount.length > 0 
      ? studentCounts.reduce((a, b) => a + b, 0) / coursesWithCount.length 
      : 0,
    minStudents: studentCounts.length > 0 ? Math.min(...studentCounts) : 0,
    maxStudents: studentCounts.length > 0 ? Math.max(...studentCounts) : 0,
    minYears: yearCounts.length > 0 ? Math.min(...yearCounts) : 0,
    maxYears: yearCounts.length > 0 ? Math.max(...yearCounts) : 0,
    averageYears: yearCounts.length > 0 
      ? yearCounts.reduce((a, b) => a + b, 0) / yearCounts.length 
      : 0,
    yearRange: allYears.length > 0 
      ? { min: Math.min(...allYears), max: Math.max(...allYears) }
      : { min: 0, max: 0 },
    longestCourseCode: longestCode,
    shortestCourseCode: shortestCode,
    coursesWithUnusualPatterns: unusualPatterns,
  };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
  allResults: AnalyticsResult[],
  globalStats: {
    totalCourses: number;
    totalInstitutions: number;
    totalStudents: number;
    yearRange: { min: number; max: number };
  }
): string {
  const timestamp = new Date().toISOString();
  
  let md = `# Course Data Analytics Report\n\n`;
  md += `Generated: ${timestamp}\n\n`;
  md += `---\n\n`;
  
  // Global Overview
  md += `## Global Overview\n\n`;
  md += `- **Total Institutions**: ${globalStats.totalInstitutions}\n`;
  md += `- **Total Courses**: ${globalStats.totalCourses.toLocaleString()}\n`;
  md += `- **Total Students (Last Year)**: ${globalStats.totalStudents.toLocaleString()}\n`;
  md += `- **Year Range**: ${globalStats.yearRange.min} - ${globalStats.yearRange.max}\n\n`;
  
  // Top/Bottom Institutions by Course Count
  md += `## Institutions by Course Count\n\n`;
  const byCourseCount = [...allResults].sort((a, b) => b.totalCourses - a.totalCourses);
  md += `### Top 10 Institutions (Most Courses)\n\n`;
  md += `| Rank | Institution | Courses | With Student Count | Without Student Count |\n`;
  md += `|------|-------------|---------|-------------------|---------------------|\n`;
  byCourseCount.slice(0, 10).forEach((r, i) => {
    md += `| ${i + 1} | ${r.institution} | ${r.totalCourses.toLocaleString()} | ${r.coursesWithStudentCount.toLocaleString()} | ${r.coursesWithoutStudentCount.toLocaleString()} |\n`;
  });
  
  md += `\n### Bottom 10 Institutions (Fewest Courses)\n\n`;
  md += `| Rank | Institution | Courses | With Student Count | Without Student Count |\n`;
  md += `|------|-------------|---------|-------------------|---------------------|\n`;
  byCourseCount.slice(-10).reverse().forEach((r, i) => {
    md += `| ${i + 1} | ${r.institution} | ${r.totalCourses.toLocaleString()} | ${r.coursesWithStudentCount.toLocaleString()} | ${r.coursesWithoutStudentCount.toLocaleString()} |\n`;
  });
  
  // Top/Bottom Institutions by Student Count
  md += `\n## Institutions by Student Count\n\n`;
  const byStudentCount = [...allResults].sort((a, b) => b.totalStudents - a.totalStudents);
  md += `### Top 10 Institutions (Most Students)\n\n`;
  md += `| Rank | Institution | Total Students | Avg per Course | Max Course | Min Course |\n`;
  md += `|------|-------------|----------------|----------------|------------|------------|\n`;
  byStudentCount.slice(0, 10).forEach((r, i) => {
    md += `| ${i + 1} | ${r.institution} | ${r.totalStudents.toLocaleString()} | ${Math.round(r.averageStudentsPerCourse).toLocaleString()} | ${r.maxStudents.toLocaleString()} | ${r.minStudents.toLocaleString()} |\n`;
  });
  
  md += `\n### Bottom 10 Institutions (Fewest Students)\n\n`;
  md += `| Rank | Institution | Total Students | Avg per Course | Max Course | Min Course |\n`;
  md += `|------|-------------|----------------|----------------|------------|------------|\n`;
  byStudentCount.filter(r => r.totalStudents > 0).slice(-10).reverse().forEach((r, i) => {
    md += `| ${i + 1} | ${r.institution} | ${r.totalStudents.toLocaleString()} | ${Math.round(r.averageStudentsPerCourse).toLocaleString()} | ${r.maxStudents.toLocaleString()} | ${r.minStudents.toLocaleString()} |\n`;
  });
  
  // Year Coverage
  md += `\n## Year Coverage Analysis\n\n`;
  const byYearRange = [...allResults].sort((a, b) => (b.yearRange.max - b.yearRange.min) - (a.yearRange.max - a.yearRange.min));
  md += `### Institutions with Longest Year Coverage\n\n`;
  md += `| Rank | Institution | Year Range | Span | Avg Years per Course |\n`;
  md += `|------|-------------|------------|------|---------------------|\n`;
  byYearRange.slice(0, 10).forEach((r, i) => {
    const span = r.yearRange.max - r.yearRange.min + 1;
    md += `| ${i + 1} | ${r.institution} | ${r.yearRange.min}-${r.yearRange.max} | ${span} years | ${Math.round(r.averageYears)} |\n`;
  });
  
  // Course Code Extremes
  md += `\n## Course Code Extremes\n\n`;
  const allCourseCodes = allResults
    .filter(r => r.longestCourseCode && r.longestCourseCode.length > 0)
    .map(r => ({ institution: r.institution, code: r.longestCourseCode }));
  const longestCodes = [...allCourseCodes].sort((a, b) => b.code.length - a.code.length).slice(0, 20);
  md += `### Longest Course Codes\n\n`;
  md += `| Rank | Institution | Course Code | Length |\n`;
  md += `|------|-------------|-------------|--------|\n`;
  longestCodes.forEach((item, i) => {
    md += `| ${i + 1} | ${item.institution} | \`${item.code}\` | ${item.code.length} |\n`;
  });
  
  const shortestCodes = [...allResults]
    .filter(r => r.shortestCourseCode.length > 0)
    .map(r => ({ institution: r.institution, code: r.shortestCourseCode }))
    .sort((a, b) => a.code.length - b.code.length)
    .slice(0, 20);
  md += `\n### Shortest Course Codes\n\n`;
  md += `| Rank | Institution | Course Code | Length |\n`;
  md += `|------|-------------|-------------|--------|\n`;
  shortestCodes.forEach((item, i) => {
    md += `| ${i + 1} | ${item.institution} | \`${item.code}\` | ${item.code.length} |\n`;
  });
  
  // Data Quality Issues
  md += `\n## Data Quality Issues\n\n`;
  const institutionsWithIssues = allResults.filter(r => r.coursesWithUnusualPatterns.length > 0);
  md += `### Institutions with Unusual Patterns\n\n`;
  md += `| Institution | Issues Count |\n`;
  md += `|-------------|-------------|\n`;
  institutionsWithIssues.sort((a, b) => b.coursesWithUnusualPatterns.length - a.coursesWithUnusualPatterns.length).forEach(r => {
    md += `| ${r.institution} | ${r.coursesWithUnusualPatterns.length} |\n`;
  });
  
  // Missing Student Counts
  md += `\n### Missing Student Counts\n\n`;
  const byMissingCount = [...allResults].sort((a, b) => b.coursesWithoutStudentCount - a.coursesWithoutStudentCount);
  md += `| Rank | Institution | Courses Without Student Count | Percentage |\n`;
  md += `|------|-------------|------------------------------|------------|\n`;
  byMissingCount.slice(0, 15).forEach((r, i) => {
    const percentage = r.totalCourses > 0 ? ((r.coursesWithoutStudentCount / r.totalCourses) * 100).toFixed(1) : '0.0';
    md += `| ${i + 1} | ${r.institution} | ${r.coursesWithoutStudentCount.toLocaleString()} | ${percentage}% |\n`;
  });
  
  // Per-Institution Details
  md += `\n---\n\n`;
  md += `## Per-Institution Details\n\n`;
  for (const result of allResults.sort((a, b) => a.institution.localeCompare(b.institution))) {
    md += `### ${result.institution}\n\n`;
    md += `- **Institution Code**: ${result.institutionCode}\n`;
    md += `- **Total Courses**: ${result.totalCourses.toLocaleString()}\n`;
    md += `- **Courses with Student Count**: ${result.coursesWithStudentCount.toLocaleString()}\n`;
    md += `- **Courses without Student Count**: ${result.coursesWithoutStudentCount.toLocaleString()}\n`;
    md += `- **Total Students (Last Year)**: ${result.totalStudents.toLocaleString()}\n`;
    md += `- **Average Students per Course**: ${Math.round(result.averageStudentsPerCourse).toLocaleString()}\n`;
    md += `- **Min Students**: ${result.minStudents.toLocaleString()}\n`;
    md += `- **Max Students**: ${result.maxStudents.toLocaleString()}\n`;
    md += `- **Year Range**: ${result.yearRange.min} - ${result.yearRange.max}\n`;
    md += `- **Average Years per Course**: ${Math.round(result.averageYears)}\n`;
    md += `- **Min Years**: ${result.minYears}\n`;
    md += `- **Max Years**: ${result.maxYears}\n`;
    md += `- **Longest Course Code**: \`${result.longestCourseCode}\` (${result.longestCourseCode.length} chars)\n`;
    md += `- **Shortest Course Code**: \`${result.shortestCourseCode}\` (${result.shortestCourseCode.length} chars)\n`;
    
    if (result.coursesWithUnusualPatterns.length > 0) {
      md += `\n**Unusual Patterns (${result.coursesWithUnusualPatterns.length}):**\n\n`;
      result.coursesWithUnusualPatterns.slice(0, 20).forEach(pattern => {
        md += `- ${pattern}\n`;
      });
      if (result.coursesWithUnusualPatterns.length > 20) {
        md += `- ... and ${result.coursesWithUnusualPatterns.length - 20} more\n`;
      }
    }
    
    md += `\n`;
  }
  
  return md;
}

/**
 * Find top/bottom courses across all institutions
 */
function generateTopBottomCoursesReport(allData: InstitutionData[]): string {
  let md = `# Top and Bottom Courses Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  
  // Collect all courses with student counts
  const allCourses: Array<CourseData & { institution: string; institutionCode: string }> = [];
  for (const inst of allData) {
    for (const course of inst.courses) {
      if (course.lastYearStudents && course.lastYearStudents > 0) {
        allCourses.push({
          ...course,
          institution: inst.institution,
          institutionCode: inst.institutionCode,
        });
      }
    }
  }
  
  // Top courses by student count
  md += `## Top 50 Courses by Student Count (All Institutions)\n\n`;
  md += `| Rank | Institution | Course Code | Course Name | Students | Years |\n`;
  md += `|------|-------------|-------------|-------------|----------|------|\n`;
  const topByStudents = [...allCourses].sort((a, b) => (b.lastYearStudents || 0) - (a.lastYearStudents || 0));
  topByStudents.slice(0, 50).forEach((course, i) => {
    const name = course.courseName || 'N/A';
    md += `| ${i + 1} | ${course.institution} | \`${course.courseCode}\` | ${name} | ${course.lastYearStudents!.toLocaleString()} | ${course.years.length} |\n`;
  });
  
  // Bottom courses by student count (but still > 0)
  md += `\n## Bottom 50 Courses by Student Count (All Institutions)\n\n`;
  md += `| Rank | Institution | Course Code | Course Name | Students | Years |\n`;
  md += `|------|-------------|-------------|-------------|----------|------|\n`;
  const bottomByStudents = [...allCourses].sort((a, b) => (a.lastYearStudents || 0) - (b.lastYearStudents || 0));
  bottomByStudents.slice(0, 50).forEach((course, i) => {
    const name = course.courseName || 'N/A';
    md += `| ${i + 1} | ${course.institution} | \`${course.courseCode}\` | ${name} | ${course.lastYearStudents!.toLocaleString()} | ${course.years.length} |\n`;
  });
  
  // Top courses by years of data
  md += `\n## Top 50 Courses by Years of Data (All Institutions)\n\n`;
  md += `| Rank | Institution | Course Code | Course Name | Years | Students |\n`;
  md += `|------|-------------|-------------|-------------|-------|----------|\n`;
  const topByYears = [...allCourses].sort((a, b) => b.years.length - a.years.length);
  topByYears.slice(0, 50).forEach((course, i) => {
    const name = course.courseName || 'N/A';
    const yearRange = course.years.length > 0 
      ? `${Math.min(...course.years)}-${Math.max(...course.years)}`
      : 'N/A';
    md += `| ${i + 1} | ${course.institution} | \`${course.courseCode}\` | ${name} | ${course.years.length} (${yearRange}) | ${course.lastYearStudents!.toLocaleString()} |\n`;
  });
  
  // Per-institution top courses
  md += `\n---\n\n`;
  md += `## Top Courses by Institution\n\n`;
  for (const inst of allData.sort((a, b) => a.institution.localeCompare(b.institution))) {
    const instCourses = inst.courses
      .filter(c => c.lastYearStudents && c.lastYearStudents > 0)
      .sort((a, b) => (b.lastYearStudents || 0) - (a.lastYearStudents || 0))
      .slice(0, 10);
    
    if (instCourses.length > 0) {
      md += `### ${inst.institution}\n\n`;
      md += `| Rank | Course Code | Course Name | Students | Years |\n`;
      md += `|------|-------------|-------------|----------|------|\n`;
      instCourses.forEach((course, i) => {
        const name = course.courseName || 'N/A';
        md += `| ${i + 1} | \`${course.courseCode}\` | ${name} | ${course.lastYearStudents!.toLocaleString()} | ${course.years.length} |\n`;
      });
      md += `\n`;
    }
  }
  
  return md;
}

/**
 * Main function
 */
function main() {
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const outputDir = path.join(process.cwd(), 'analytics');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Loading course data...');
  const allData: InstitutionData[] = [];
  const allResults: AnalyticsResult[] = [];
  
  // Load data for each institution
  for (const [institution, { file, code }] of Object.entries(INSTITUTION_DATA_FILES)) {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      const data = loadInstitutionData(filePath, institution, code);
      if (data) {
        allData.push(data);
        const result = analyzeInstitution(data);
        allResults.push(result);
        console.log(`✓ Loaded ${institution}: ${data.courses.length} courses`);
      }
    } else {
      console.warn(`⚠ File not found: ${filePath}`);
    }
  }
  
  // Calculate global stats
  const globalStats = {
    totalCourses: allResults.reduce((sum, r) => sum + r.totalCourses, 0),
    totalInstitutions: allResults.length,
    totalStudents: allResults.reduce((sum, r) => sum + r.totalStudents, 0),
    yearRange: {
      min: allResults.length > 0 
        ? Math.min(...allResults.map(r => r.yearRange.min).filter(v => v > 0))
        : 0,
      max: allResults.length > 0 
        ? Math.max(...allResults.map(r => r.yearRange.max))
        : 0,
    },
  };
  
  console.log('\nGenerating reports...');
  
  // Generate main analytics report
  const mainReport = generateMarkdownReport(allResults, globalStats);
  fs.writeFileSync(path.join(outputDir, 'analytics-report.md'), mainReport);
  console.log('✓ Generated analytics-report.md');
  
  // Generate top/bottom courses report
  const coursesReport = generateTopBottomCoursesReport(allData);
  fs.writeFileSync(path.join(outputDir, 'top-bottom-courses.md'), coursesReport);
  console.log('✓ Generated top-bottom-courses.md');
  
  console.log(`\n✅ Analytics complete! Reports saved to: ${outputDir}`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };

