/**
 * Script to fetch and cache grade data for all popular courses
 * 
 * Usage:
 *   npm run fetch-cache
 * 
 * This will fetch data for all courses in lib/courses.ts and store
 * them in data/cache.json for fast local access.
 */

import * as fs from 'fs';
import * as path from 'path';
import { POPULAR_COURSES } from '../lib/courses';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { GradeData } from '../types';

const DIRECT_API = 'https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData';
const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

interface CachedData {
  courses: {
    [key: string]: GradeData[]; // key: `${institutionCode}-${courseCode}`
  };
  metadata: {
    lastUpdated: string;
    totalCourses: number;
    totalEntries: number;
  };
}

async function fetchCourseData(
  institutionCode: string,
  courseCode: string,
  institution: string
): Promise<GradeData[]> {
  // Use the same format as the original KarakterWeb implementation
  // Format: COURSECODE-1 (or COURSECODE1 for BI), uppercase, no spaces
  const formattedCode = formatCourseCode(courseCode, institution);
  
  console.log(`Fetching ${courseCode} → ${formattedCode} (${institutionCode})...`);
  
  try {
    const payload = createSearchPayload(institutionCode, formattedCode);
    const response = await fetch(DIRECT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 204 || !response.ok) {
      console.log(`  ⚠️  No data found for ${courseCode} (tried ${formattedCode})`);
      return [];
    }

    const data: GradeData[] = await response.json();
    if (data && data.length > 0) {
      console.log(`  ✓ Found ${data.length} entries`);
      return data;
    }
    
    console.log(`  ⚠️  No data found for ${courseCode} (empty response)`);
    return [];
  } catch (error) {
    console.error(`  ✗ Error fetching ${courseCode}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchAllCourses(): Promise<CachedData> {
  const cache: CachedData = {
    courses: {},
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCourses: 0,
      totalEntries: 0,
    },
  };

  const totalCourses = POPULAR_COURSES.length;
  let processed = 0;
  let successCount = 0;

  console.log(`\n📦 Fetching data for ${totalCourses} courses...\n`);

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  for (let i = 0; i < POPULAR_COURSES.length; i += BATCH_SIZE) {
    const batch = POPULAR_COURSES.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (course) => {
      const key = `${course.institutionCode}-${course.code}`;
      const data = await fetchCourseData(course.institutionCode, course.code, course.institution);
      
      if (data.length > 0) {
        cache.courses[key] = data;
        successCount++;
        cache.metadata.totalEntries += data.length;
      }
      
      processed++;
      const progress = ((processed / totalCourses) * 100).toFixed(1);
      console.log(`Progress: ${processed}/${totalCourses} (${progress}%)\n`);
    });

    await Promise.all(promises);
    
    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < POPULAR_COURSES.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  cache.metadata.totalCourses = successCount;

  return cache;
}

async function main() {
  console.log('🚀 Starting data cache fetch...\n');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`📁 Created data directory: ${CACHE_DIR}\n`);
  }

  // Check if cache exists
  let existingCache: CachedData | null = null;
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      existingCache = JSON.parse(content);
      const courseCount = existingCache?.courses ? Object.keys(existingCache.courses).length : 0;
      console.log(`📂 Found existing cache with ${courseCount} courses\n`);
    } catch (error) {
      console.log('⚠️  Could not read existing cache, will create new one\n');
    }
  }

  // Fetch all courses
  const cache = await fetchAllCourses();

  // Save to file
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  
  console.log('\n✅ Cache update complete!');
  console.log(`   - Courses with data: ${cache.metadata.totalCourses}`);
  console.log(`   - Total entries: ${cache.metadata.totalEntries}`);
  console.log(`   - Cache saved to: ${CACHE_FILE}\n`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

