/**
 * Populate Cache with Top Courses
 * 
 * Fetches grade data for the most popular courses and saves to data/cache.json
 * This provides instant loading for ~80% of searches while keeping repo size reasonable.
 * 
 * Usage:
 *   npx tsx scripts/populate-cache.ts
 *   npx tsx scripts/populate-cache.ts --limit 50  # Top 50 per institution
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { aggregateDuplicateEntries } from '../lib/utils';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';
import { GradeData } from '../types';

// Configuration
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const CACHE_FILE = path.join(process.cwd(), 'data', 'cache.json');
const INSTITUTIONS_DIR = path.join(process.cwd(), 'data', 'institutions');
const FETCH_TIMEOUT = 30000;
const DELAY_BETWEEN_REQUESTS = 300;

// Parse command line arguments
const args = process.argv.slice(2);
const limitPerInstitution = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '100');

interface CacheEntry {
    data: GradeData[];
    fetchedAt: string;
}

interface CacheData {
    courses: Record<string, CacheEntry>;
    metadata: {
        lastUpdated: string;
        totalCourses: number;
        totalEntries: number;
    };
}

interface OptimizedCourse {
    c: string;
    n?: string;
    y?: number[];
    s?: number;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = FETCH_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Fetch grade data for a course
async function fetchCourseGradeData(
    institutionCode: string,
    courseCode: string,
    institution: string
): Promise<GradeData[] | null> {
    const codeFormats: string[] = [];

    // UiB: Prioritize -0 suffix
    if (institution === 'UiB') {
        const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
        codeFormats.push(
            `${cleaned}-0`,
            cleaned,
            `${cleaned}-1`,
            `${cleaned}-HFEKS-0`,
            `${cleaned}-MNEKS-0`,
            `${cleaned}-HFSEM-0`,
            `${cleaned}-MOSEM-0`,
        );
    } else if (institution === 'BI') {
        const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
        codeFormats.push(/\d$/.test(cleaned) ? cleaned : `${cleaned}1`);
    } else {
        codeFormats.push(formatCourseCode(courseCode, institution));
    }

    for (const formattedCode of codeFormats) {
        try {
            const payload = createSearchPayload(institutionCode, formattedCode);
            const response = await fetchWithTimeout(DIRECT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok && response.status === 200) {
                const data: GradeData[] = await response.json();
                if (data && data.length > 0) {
                    return aggregateDuplicateEntries(data);
                }
            }
        } catch (error) {
            continue;
        }
    }

    return null;
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Populating Cache with Top ${limitPerInstitution} Courses per Institution     ║
╚════════════════════════════════════════════════════════════╝
`);

    // Load existing cache or create new
    let cacheData: CacheData = {
        courses: {},
        metadata: {
            lastUpdated: new Date().toISOString(),
            totalCourses: 0,
            totalEntries: 0,
        },
    };

    if (fs.existsSync(CACHE_FILE)) {
        try {
            cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            console.log(`📦 Loaded existing cache with ${Object.keys(cacheData.courses).length} courses\n`);
        } catch (error) {
            console.log(`⚠️  Could not load existing cache, starting fresh\n`);
        }
    }

    let totalFetched = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const institution of Object.keys(UNIVERSITIES)) {
        const uni = UNIVERSITIES[institution];
        console.log(`\n📊 Processing ${institution} (${uni.name})...`);

        // Load courses
        const instFile = path.join(INSTITUTIONS_DIR, `${institution.toLowerCase()}-all-courses.json`);
        if (!fs.existsSync(instFile)) {
            console.log(`   ⚠️  No course file found`);
            continue;
        }

        const instData = JSON.parse(fs.readFileSync(instFile, 'utf-8'));
        const allCourses: OptimizedCourse[] = instData.courses || [];

        // Filter to courses with recent data (2020+) and sort by student count
        const MIN_YEAR = 2020;
        const topCourses = allCourses
            .filter(c => {
                // Must have student count
                if (!c.s || c.s <= 0) return false;

                // Must have data from 2020 or later
                if (!c.y || c.y.length === 0) return false;
                const hasRecentData = c.y.some(year => year >= MIN_YEAR);
                return hasRecentData;
            })
            .sort((a, b) => (b.s || 0) - (a.s || 0))
            .slice(0, limitPerInstitution);

        console.log(`   Found ${allCourses.length} courses, ${topCourses.length} with data since ${MIN_YEAR}, processing top ${Math.min(topCourses.length, limitPerInstitution)}`);

        for (let i = 0; i < topCourses.length; i++) {
            const course = topCourses[i];
            const courseCode = course.c;
            const cacheKey = `${uni.code}-${courseCode}`;

            // Skip if already cached
            if (cacheData.courses[cacheKey]) {
                totalSkipped++;
                if (i % 20 === 0) {
                    console.log(`   [${i + 1}/${topCourses.length}] Skipping ${courseCode} (cached)`);
                }
                continue;
            }

            process.stdout.write(`   [${i + 1}/${topCourses.length}] Fetching ${courseCode}... `);

            const gradeData = await fetchCourseGradeData(uni.code, courseCode, institution);

            if (gradeData && gradeData.length > 0) {
                cacheData.courses[cacheKey] = {
                    data: gradeData,
                    fetchedAt: new Date().toISOString(),
                };
                totalFetched++;
                console.log(`✅ (${gradeData.length} entries)`);
            } else {
                totalFailed++;
                console.log(`❌ No data`);
            }

            // Delay between requests
            if (i < topCourses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
            }
        }
    }

    // Update metadata
    cacheData.metadata = {
        lastUpdated: new Date().toISOString(),
        totalCourses: Object.keys(cacheData.courses).length,
        totalEntries: Object.values(cacheData.courses).reduce((sum, entry) => sum + entry.data.length, 0),
    };

    // Save cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

    console.log(`
✅ Cache population complete!
   Total courses in cache: ${cacheData.metadata.totalCourses}
   Newly fetched: ${totalFetched}
   Skipped (already cached): ${totalSkipped}
   Failed (no data): ${totalFailed}
   Cache file: ${CACHE_FILE}
   File size: ${(fs.statSync(CACHE_FILE).size / 1024 / 1024).toFixed(2)} MB
`);
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
