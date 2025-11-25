/**
 * Build Institution Statistics
 * 
 * Aggregates grade data across all courses per institution to generate
 * institution-wide statistics and trends over time.
 * 
 * Uses multiple data sources:
 * 1. Grade cache files (public/data/grade-cache/{institution}/)
 * 2. Homepage grade data (public/data/homepage-grade-data.json)
 * 3. Homepage top courses data (public/data/homepage-top-courses-data.json)
 * 
 * Usage:
 *   npx tsx scripts/build-institution-statistics.ts
 *   npx tsx scripts/build-institution-statistics.ts --institution UiB  # Only one institution
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES } from '../lib/api';
import { processGradeData, processMultiYearData, normalizeGradeDistribution, normalizeVGSGradeDistribution, VGS_GRADE_ORDER } from '../lib/utils';
import { GradeData, CourseStats, GradeDistribution } from '../types';

// Configuration
const CACHE_DIR = path.join(process.cwd(), 'public', 'data', 'grade-cache');
const OPTIMIZED_CACHE_DIR = path.join(process.cwd(), 'data', 'grade-cache-optimized');
const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'institution-statistics.json');
const CACHE_FILE = path.join(DATA_DIR, 'cache.json');
const HOMEPAGE_GRADE_DATA = path.join(PUBLIC_DATA_DIR, 'homepage-grade-data.json');
const HOMEPAGE_TOP_COURSES_DATA = path.join(PUBLIC_DATA_DIR, 'homepage-top-courses-data.json');
const INSTITUTIONS_DIR = path.join(DATA_DIR, 'institutions');
const PUBLIC_INSTITUTIONS_DIR = path.join(PUBLIC_DATA_DIR, 'institutions');
const VGS_GRADE_STATISTICS = path.join(PUBLIC_DATA_DIR, 'vgs-grade-statistics.json');

// Parse command line arguments
const args = process.argv.slice(2);
const targetInstitution = args.find(arg => arg.startsWith('--institution='))?.split('=')[1];

interface InstitutionStatistics {
  institution: string;
  institutionCode: string;
  institutionName: string;
  totalCourses: number;
  totalStudents: number;
  coursesWithData: number;
  yearRange: {
    min: number;
    max: number;
  };
  overallDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  averageGrade: number;
  yearlyStats: Record<number, {
    year: number;
    totalStudents: number;
    totalCourses: number;
    distribution: {
      grade: string;
      count: number;
      percentage: number;
    }[];
    averageGrade: number;
  }>;
  generatedAt: string;
}

interface CachedGradeData {
  institution: string;
  courseCode: string;
  normalizedCode: string;
  fetchedAt: string;
  data: GradeData[];
}

interface OptimizedGradeData {
  i: string; // institution code
  c: string; // course code
  n?: string; // normalized code
  y: number[]; // years with data
  d: Array<{ // grade data (optimized)
    y: number; // year
    g: string; // grade
    c: number; // count
  }>;
  f: string; // fetchedAt timestamp
}

interface CacheData {
  courses: Record<string, { data: GradeData[]; fetchedAt?: string }>;
  metadata?: {
    totalCourses?: number;
    totalEntries?: number;
  };
}

interface OptimizedCourse {
  c: string;  // code
  n?: string; // name
  y?: number[]; // years
  s?: number; // student count
}

interface InstitutionCourseData {
  courses: OptimizedCourse[];
}

/**
 * Load cache.json file (main cache with all grade data)
 */
function loadCacheFile(): CacheData | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(content) as CacheData;
  } catch (error) {
    console.warn(`   ⚠️  Failed to load cache.json:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Load all courses for an institution from institution files
 */
function loadInstitutionCourses(institution: string): string[] {
  const courses: string[] = [];
  const institutionLower = institution.toLowerCase();
  
  // Try data/institutions first, then public/data/institutions
  const possibleFiles = [
    path.join(INSTITUTIONS_DIR, `${institutionLower}-all-courses.json`),
    path.join(PUBLIC_INSTITUTIONS_DIR, `${institutionLower}-all-courses.json`),
  ];

  for (const filePath of possibleFiles) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: InstitutionCourseData = JSON.parse(content);
        
        if (data.courses && Array.isArray(data.courses)) {
          for (const course of data.courses) {
            if (course.c) {
              courses.push(course.c);
            }
          }
        }
        break; // Found file, no need to check others
      } catch (error) {
        console.warn(`   ⚠️  Failed to load ${filePath}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  return courses;
}

/**
 * Get grade data for a course from cache.json
 */
function getGradeDataFromCache(
  cache: CacheData,
  institutionCode: string,
  courseCode: string
): GradeData[] | null {
  // Try multiple key formats
  const normalizedCode = courseCode.replace(/-[0-9]+$/, '').trim().toUpperCase();
  const cacheKeys = [
    `${institutionCode}-${courseCode}`,
    `${institutionCode}-${normalizedCode}`,
    // Try with common suffixes
    `${institutionCode}-${normalizedCode}-0`,
    `${institutionCode}-${normalizedCode}-1`,
  ];

  for (const key of cacheKeys) {
    if (cache.courses[key] && cache.courses[key].data && Array.isArray(cache.courses[key].data)) {
      return cache.courses[key].data;
    }
  }

  return null;
}

/**
 * Load all grade cache files for an institution (from grade-cache directory)
 */
function loadInstitutionGradeCache(institution: string): GradeData[] {
  const allData: GradeData[] = [];
  
  // Try optimized cache first (new format)
  const optimizedCacheDir = path.join(OPTIMIZED_CACHE_DIR, institution);
  if (fs.existsSync(optimizedCacheDir)) {
    const files = fs.readdirSync(optimizedCacheDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const filePath = path.join(optimizedCacheDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const cached: OptimizedGradeData = JSON.parse(content);
        
        // Convert optimized format to GradeData
        if (cached.d && Array.isArray(cached.d) && cached.d.length > 0) {
          const gradeData: GradeData[] = cached.d.map(item => ({
            Institusjonskode: cached.i,
            Emnekode: cached.c,
            Karakter: item.g,
            Årstall: String(item.y),
            'Antall kandidater totalt': String(item.c),
          } as GradeData));
          // Use concat instead of spread to avoid stack overflow (though each file is small)
          allData.push(...gradeData);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to load ${file}:`, error instanceof Error ? error.message : error);
      }
    }
  }
  
  // Fall back to old cache format
  const instCacheDir = path.join(CACHE_DIR, institution);
  if (fs.existsSync(instCacheDir)) {
    const files = fs.readdirSync(instCacheDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const filePath = path.join(instCacheDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const cached: CachedGradeData = JSON.parse(content);
        
        if (cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
          // Use concat instead of spread to avoid stack overflow (though each file is small)
          allData.push(...cached.data);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to load ${file}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  return allData;
}

/**
 * Load CourseStats from homepage data files
 */
function loadHomepageCourseStats(institution: string): Array<CourseStats & { institution: string }> {
  const courses: Array<CourseStats & { institution: string }> = [];

  // Try homepage-grade-data.json
  if (fs.existsSync(HOMEPAGE_GRADE_DATA)) {
    try {
      const content = fs.readFileSync(HOMEPAGE_GRADE_DATA, 'utf-8');
      const data = JSON.parse(content);
      if (data.courses && Array.isArray(data.courses)) {
        for (const course of data.courses) {
          if (course.institution === institution && course.distributions) {
            courses.push({
              courseCode: course.courseCode,
              year: course.year,
              institution: course.institution,
              totalStudents: course.totalStudents,
              distributions: course.distributions,
              averageGrade: course.averageGrade,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to load homepage-grade-data.json:`, error instanceof Error ? error.message : error);
    }
  }

  // Try homepage-top-courses-data.json
  if (fs.existsSync(HOMEPAGE_TOP_COURSES_DATA)) {
    try {
      const content = fs.readFileSync(HOMEPAGE_TOP_COURSES_DATA, 'utf-8');
      const data = JSON.parse(content);
      if (data.courses && Array.isArray(data.courses)) {
        for (const course of data.courses) {
          if (course.institution === institution && course.distributions) {
            // Avoid duplicates (check if already added from homepage-grade-data)
            const exists = courses.some(c => 
              c.courseCode === course.courseCode && 
              c.year === course.year &&
              c.institution === course.institution
            );
            if (!exists) {
              courses.push({
                courseCode: course.courseCode,
                year: course.year,
                institution: course.institution,
                totalStudents: course.totalStudents,
                distributions: course.distributions,
                averageGrade: course.averageGrade,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to load homepage-top-courses-data.json:`, error instanceof Error ? error.message : error);
    }
  }

  return courses;
}

/**
 * Convert CourseStats to GradeData format for aggregation
 * This allows us to aggregate from CourseStats when raw GradeData isn't available
 */
function convertCourseStatsToGradeData(courseStats: Array<CourseStats & { institution: string }>): GradeData[] {
  const gradeData: GradeData[] = [];

  for (const course of courseStats) {
    const institutionCode = UNIVERSITIES[course.institution]?.code || '';
    
    for (const dist of course.distributions) {
      // Create GradeData entry for each grade distribution
      gradeData.push({
        Institusjonskode: institutionCode,
        Emnekode: course.courseCode,
        Karakter: dist.grade,
        'Antall kandidater totalt': String(dist.count),
        Årstall: String(course.year),
      } as GradeData);
    }
  }

  return gradeData;
}

/**
 * Load VGS grade data from vgs-grade-statistics.json
 */
function loadVGSGradeData(): GradeData[] {
  if (!fs.existsSync(VGS_GRADE_STATISTICS)) {
    return [];
  }

  try {
    const content = fs.readFileSync(VGS_GRADE_STATISTICS, 'utf-8');
    const vgsData = JSON.parse(content);
    
    if (!vgsData.gradeData || !Array.isArray(vgsData.gradeData)) {
      return [];
    }

    const gradeData: GradeData[] = [];

    for (const entry of vgsData.gradeData) {
      // Convert VGS year format "2024-25" to numeric year (use start year)
      const yearMatch = entry.year?.match(/^(\d{4})/);
      const year = yearMatch ? yearMatch[1] : '2024';

      // Convert grade distribution (1-6 scale) to GradeData format
      if (entry.gradeDistribution && entry.totalStudents) {
        for (const [grade, count] of Object.entries(entry.gradeDistribution)) {      
          const countValue = typeof count === 'number' ? count : 0;
          if (countValue > 0) {
            // Count is percentage, convert to actual count
            const actualCount = Math.round((countValue / 100) * entry.totalStudents);
            
            gradeData.push({
              Institusjonskode: 'VGS',
              Emnekode: entry.courseCode || '',
              Karakter: grade,
              'Antall kandidater totalt': String(actualCount),
              Årstall: year,
            } as GradeData);
          }
        }
      }
    }

    return gradeData;
  } catch (error) {
    console.warn(`   ⚠️  Failed to load VGS grade statistics:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Calculate institution statistics from grade data
 */
function calculateInstitutionStatistics(
  institution: string,
  institutionCode: string,
  institutionName: string,
  allGradeData: GradeData[]
): InstitutionStatistics {
  if (allGradeData.length === 0) {
    return {
      institution,
      institutionCode,
      institutionName,
      totalCourses: 0,
      totalStudents: 0,
      coursesWithData: 0,
      yearRange: { min: 0, max: 0 },
      overallDistribution: [],
      averageGrade: 0,
      yearlyStats: {},
      generatedAt: new Date().toISOString(),
    };
  }

  // Get unique courses
  const uniqueCourses = new Set<string>();
  const years = new Set<number>();
  
  allGradeData.forEach(item => {
    uniqueCourses.add(item.Emnekode);
    const year = parseInt(item.Årstall, 10);
    if (!isNaN(year)) {
      years.add(year);
    }
  });

  // Process data by year
  const yearlyData: Record<number, GradeData[]> = {};
  allGradeData.forEach(item => {
    const year = parseInt(item.Årstall, 10);
    if (!isNaN(year)) {
      if (!yearlyData[year]) {
        yearlyData[year] = [];
      }
      yearlyData[year].push(item);
    }
  });

  // Calculate overall distribution
  const overallGradeMap: Record<string, { count: number; percentage: number }> = {};
  let totalStudents = 0;

  allGradeData.forEach(item => {
    let grade = item.Karakter;
    if (grade === 'G') grade = 'Bestått';
    if (grade === 'H') grade = 'Ikke bestått';
    
    const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
    if (!overallGradeMap[grade]) {
      overallGradeMap[grade] = { count: 0, percentage: 0 };
    }
    overallGradeMap[grade].count += count;
    totalStudents += count;
  });

  // Calculate percentages
  Object.keys(overallGradeMap).forEach(grade => {
    overallGradeMap[grade].percentage = totalStudents > 0
      ? Math.round((overallGradeMap[grade].count / totalStudents) * 100)
      : 0;
  });

  // Check if this is VGS data
  const isVGS = Object.keys(overallGradeMap).some(grade => VGS_GRADE_ORDER.includes(grade));
  
  // Normalize distribution
  const overallDistribution = isVGS
    ? normalizeVGSGradeDistribution(overallGradeMap, totalStudents)
    : normalizeGradeDistribution(overallGradeMap, totalStudents);

  // Calculate average grade
  let averageGrade: number;
  if (isVGS) {
    // VGS: 1-6 scale
    let weightedSum = 0;
    overallDistribution.forEach(dist => {
      const value = VGS_GRADE_ORDER.includes(dist.grade) ? parseInt(dist.grade, 10) : 0;
      weightedSum += value * dist.count;
    });
    averageGrade = totalStudents > 0 ? weightedSum / totalStudents : 0;
  } else {
    // University: A-F scale
    const gradeValues: Record<string, number> = {
      'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0,
      'Bestått': 3, 'Ikke bestått': 0,
    };
    let weightedSum = 0;
    overallDistribution.forEach(dist => {
      const value = gradeValues[dist.grade] ?? 0;
      weightedSum += value * dist.count;
    });
    averageGrade = totalStudents > 0 ? weightedSum / totalStudents : 0;
  }

  // Calculate yearly statistics
  const yearlyStats: Record<number, InstitutionStatistics['yearlyStats'][number]> = {};
  
  Object.entries(yearlyData).forEach(([yearStr, yearData]) => {
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return;

    const yearGradeMap: Record<string, { count: number; percentage: number }> = {};
    let yearTotalStudents = 0;
    const yearCourses = new Set<string>();

    yearData.forEach(item => {
      yearCourses.add(item.Emnekode);
      let grade = item.Karakter;
      if (grade === 'G') grade = 'Bestått';
      if (grade === 'H') grade = 'Ikke bestått';
      
      const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
      if (!yearGradeMap[grade]) {
        yearGradeMap[grade] = { count: 0, percentage: 0 };
      }
      yearGradeMap[grade].count += count;
      yearTotalStudents += count;
    });

    // Calculate percentages
    Object.keys(yearGradeMap).forEach(grade => {
      yearGradeMap[grade].percentage = yearTotalStudents > 0
        ? Math.round((yearGradeMap[grade].count / yearTotalStudents) * 100)
        : 0;
    });

    // Normalize distribution
    const yearDistribution = isVGS
      ? normalizeVGSGradeDistribution(yearGradeMap, yearTotalStudents)
      : normalizeGradeDistribution(yearGradeMap, yearTotalStudents);

    // Calculate year average grade
    let yearAverageGrade: number;
    if (isVGS) {
      let weightedSum = 0;
      yearDistribution.forEach(dist => {
        const value = VGS_GRADE_ORDER.includes(dist.grade) ? parseInt(dist.grade, 10) : 0;
        weightedSum += value * dist.count;
      });
      yearAverageGrade = yearTotalStudents > 0 ? weightedSum / yearTotalStudents : 0;
    } else {
      const gradeValues: Record<string, number> = {
        'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0,
        'Bestått': 3, 'Ikke bestått': 0,
      };
      let weightedSum = 0;
      yearDistribution.forEach(dist => {
        const value = gradeValues[dist.grade] ?? 0;
        weightedSum += value * dist.count;
      });
      yearAverageGrade = yearTotalStudents > 0 ? weightedSum / yearTotalStudents : 0;
    }

    yearlyStats[year] = {
      year,
      totalStudents: yearTotalStudents,
      totalCourses: yearCourses.size,
      distribution: yearDistribution,
      averageGrade: Math.round(yearAverageGrade * 100) / 100,
    };
  });

  const yearArray = Array.from(years).sort((a, b) => a - b);

  return {
    institution,
    institutionCode,
    institutionName,
    totalCourses: uniqueCourses.size,
    totalStudents,
    coursesWithData: uniqueCourses.size,
    yearRange: {
      min: yearArray.length > 0 ? yearArray[0] : 0,
      max: yearArray.length > 0 ? yearArray[yearArray.length - 1] : 0,
    },
    overallDistribution,
    averageGrade: Math.round(averageGrade * 100) / 100,
    yearlyStats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Main function
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building Institution Statistics                          ║
╚════════════════════════════════════════════════════════════╝
`);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get list of institutions to process
  const institutionsToProcess = targetInstitution
    ? [targetInstitution]
    : Object.keys(UNIVERSITIES);

  const allStatistics: Record<string, InstitutionStatistics> = {};

  for (const institution of institutionsToProcess) {
    const uni = UNIVERSITIES[institution];
    if (!uni) {
      console.warn(`⚠️  Unknown institution: ${institution}`);
      continue;
    }

    console.log(`\n📊 Processing ${institution} (${uni.name})...`);

    // Special handling for VGS
    if (institution === 'VGS') {
      const vgsData = loadVGSGradeData();
      if (vgsData.length === 0) {
        console.log(`   ⚠️  No VGS grade data found`);
        continue;
      }
      
      console.log(`   Loaded ${vgsData.length} VGS grade data entries`);
      
      // Calculate statistics for VGS
      const stats = calculateInstitutionStatistics(
        institution,
        'VGS',
        'Videregående Skole',
        vgsData
      );
      
      allStatistics[institution] = stats;
      
      console.log(`   ✅ Generated statistics:`);
      console.log(`      - Courses: ${stats.totalCourses}`);
      console.log(`      - Total students: ${stats.totalStudents.toLocaleString()}`);
      console.log(`      - Year range: ${stats.yearRange.min}-${stats.yearRange.max}`);
      console.log(`      - Average grade: ${stats.averageGrade.toFixed(2)}`);
      console.log(`      - Years with data: ${Object.keys(stats.yearlyStats).length}`);
      continue;
    }

    // Load cache.json (main data source)
    const cache = loadCacheFile();
    
    // Load all courses for this institution (for coverage calculation)
    const courses = loadInstitutionCourses(institution);
    console.log(`   Found ${courses.length} total courses in institution files`);

    // Collect grade data from all sources
    let allGradeData: GradeData[] = [];
    const processedCourses = new Set<string>();

    // 1. Load from cache.json (main source) - iterate through ALL cache keys for this institution
    if (cache) {
      const institutionPrefix = `${uni.code}-`;
      let cacheHits = 0;
      let cacheEntries = 0;
      
      // Iterate through all cache keys to find this institution's data
      for (const cacheKey of Object.keys(cache.courses)) {
        if (cacheKey.startsWith(institutionPrefix)) {
          const entry = cache.courses[cacheKey];
          if (entry && entry.data && Array.isArray(entry.data) && entry.data.length > 0) {
            // Use concat for safety (though each entry should be small)
            allGradeData = allGradeData.concat(entry.data);
            // Extract course code from cache key (e.g., "1110-EXPHIL03" -> "EXPHIL03")
            const courseCode = cacheKey.substring(institutionPrefix.length);
            processedCourses.add(courseCode);
            cacheHits++;
            cacheEntries += entry.data.length;
          }
        }
      }
      
      if (cacheHits > 0) {
        console.log(`   Loaded ${cacheHits} courses from cache.json (${cacheEntries} entries)`);
      }
    }

    // 2. Try grade cache files (public/data/grade-cache/{institution}/)
    const gradeCacheData = loadInstitutionGradeCache(institution);
    if (gradeCacheData.length > 0) {
      // Use concat instead of spread to avoid stack overflow with large arrays
      allGradeData = allGradeData.concat(gradeCacheData);
      console.log(`   Added ${gradeCacheData.length} entries from grade-cache directory`);
    }

    // 3. Add homepage data files (CourseStats format)
    const courseStats = loadHomepageCourseStats(institution);
    if (courseStats.length > 0) {
      const convertedData = convertCourseStatsToGradeData(courseStats);
      // Use concat instead of spread to avoid stack overflow with large arrays
      allGradeData = allGradeData.concat(convertedData);
      console.log(`   Added ${courseStats.length} courses from homepage data`);
    }
    
    if (allGradeData.length === 0) {
      console.log(`   ⚠️  No grade data found for ${institution}`);
      continue;
    }

    const coursesWithData = processedCourses.size;
    const coveragePercent = courses.length > 0 
      ? ((coursesWithData / courses.length) * 100).toFixed(1)
      : '0.0';
    
    console.log(`   Total: ${allGradeData.length} grade data entries from all sources`);
    console.log(`   Coverage: ${coursesWithData}/${courses.length} courses (${coveragePercent}%)`);

    // Calculate statistics
    const stats = calculateInstitutionStatistics(
      institution,
      uni.code,
      uni.name,
      allGradeData
    );

    allStatistics[institution] = stats;

    console.log(`   ✅ Generated statistics:`);
    console.log(`      - Courses: ${stats.totalCourses}`);
    console.log(`      - Total students: ${stats.totalStudents.toLocaleString()}`);
    console.log(`      - Year range: ${stats.yearRange.min}-${stats.yearRange.max}`);
    console.log(`      - Average grade: ${stats.averageGrade.toFixed(2)}`);
    console.log(`      - Years with data: ${Object.keys(stats.yearlyStats).length}`);
  }

  // Save to file
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalInstitutions: Object.keys(allStatistics).length,
    },
    institutions: allStatistics,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`
✅ Institution statistics build complete!
   Total institutions: ${Object.keys(allStatistics).length}
   Output file: ${OUTPUT_FILE}
`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

