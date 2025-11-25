/**
 * Build Grade Data Cache
 * 
 * Pre-fetches grade data for ALL courses and saves as static JSON files.
 * This eliminates runtime API calls and ensures instant loading.
 * 
 * Usage:
 *   npx tsx scripts/build-grade-cache.ts
 *   npx tsx scripts/build-grade-cache.ts --force  # Rebuild existing cache
 *   npx tsx scripts/build-grade-cache.ts --institution UiB  # Only one institution
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { aggregateDuplicateEntries } from '../lib/utils';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';
import { GradeData } from '../types';

// Configuration
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const CACHE_DIR = path.join(process.cwd(), 'public', 'data', 'grade-cache');
const INSTITUTIONS_DIR = path.join(process.cwd(), 'public', 'data', 'institutions');
const FETCH_TIMEOUT = 30000;
const DELAY_BETWEEN_REQUESTS = 300; // ms between API calls

// Parse command line arguments
const args = process.argv.slice(2);
const forceRebuild = args.includes('--force');
const targetInstitution = args.find(arg => arg.startsWith('--institution='))?.split('=')[1];

interface CachedGradeData {
    institution: string;
    courseCode: string;
    normalizedCode: string;
    fetchedAt: string;
    data: GradeData[];
}

interface OptimizedCourse {
    c: string;  // code
    n?: string; // name
    y?: number[]; // years
    s?: number; // student count
}

// Helper: Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = FETCH_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Helper: Fetch grade data for a course
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
            `${cleaned}-0`,           // UiB standard
            cleaned,                   // Without suffix
            `${cleaned}-1`,           // Fallback
            `${cleaned}-HFEKS-0`,     // Common variants
            `${cleaned}-MNEKS-0`,
            `${cleaned}-HFSEM-0`,
            `${cleaned}-MOSEM-0`,
        );
    } else if (institution === 'BI') {
        const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
        if (/\d$/.test(cleaned)) {
            codeFormats.push(cleaned); // Already ends with digit
        } else {
            codeFormats.push(`${cleaned}1`);
        }
    } else {
        // Standard format
        codeFormats.push(formatCourseCode(courseCode, institution));
    }

    // Try each format
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
                    const aggregated = aggregateDuplicateEntries(data);
                    return aggregated;
                }
            }
        } catch (error) {
            continue; // Try next format
        }
    }

    return null;
}

// Main function
async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building Grade Data Cache (ALL Courses)                  ║
╚════════════════════════════════════════════════════════════╝
`);

    // Ensure cache directory exists
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    let totalCourses = 0;
    let cachedCourses = 0;
    let skippedCourses = 0;
    let failedCourses = 0;

    // Get list of institutions to process
    const institutionsToProcess = targetInstitution
        ? [targetInstitution]
        : Object.keys(UNIVERSITIES);

    for (const institution of institutionsToProcess) {
        const uni = UNIVERSITIES[institution];
        if (!uni) {
            console.warn(`⚠️  Unknown institution: ${institution}`);
            continue;
        }

        console.log(`\n📊 Processing ${institution} (${uni.name})...`);

        // Create institution cache directory
        const instCacheDir = path.join(CACHE_DIR, institution);
        fs.mkdirSync(instCacheDir, { recursive: true });

        // Load courses from institution file
        const instFile = path.join(INSTITUTIONS_DIR, `${institution.toLowerCase()}-all-courses.json`);
        if (!fs.existsSync(instFile)) {
            console.warn(`   ⚠️  No course file found: ${instFile}`);
            continue;
        }

        const instData = JSON.parse(fs.readFileSync(instFile, 'utf-8'));
        const courses: OptimizedCourse[] = instData.courses || [];

        console.log(`   Found ${courses.length} courses`);
        totalCourses += courses.length;

        // Process each course
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const courseCode = course.c;
            const normalized = normalizeCourseCodeAdvanced(courseCode).normalized;

            // Check if cache file exists
            const cacheFile = path.join(instCacheDir, `${normalized}.json`);
            if (fs.existsSync(cacheFile) && !forceRebuild) {
                skippedCourses++;
                if (i % 100 === 0) {
                    console.log(`   [${i + 1}/${courses.length}] Skipping ${courseCode} (cached)`);
                }
                continue;
            }

            // Fetch grade data
            process.stdout.write(`   [${i + 1}/${courses.length}] Fetching ${courseCode}... `);

            const gradeData = await fetchCourseGradeData(uni.code, courseCode, institution);

            if (gradeData && gradeData.length > 0) {
                // Save to cache
                const cacheData: CachedGradeData = {
                    institution,
                    courseCode,
                    normalizedCode: normalized,
                    fetchedAt: new Date().toISOString(),
                    data: gradeData,
                };

                fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
                cachedCourses++;
                console.log(`✅ (${gradeData.length} entries)`);
            } else {
                failedCourses++;
                console.log(`❌ No data`);
            }

            // Delay between requests
            if (i < courses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
            }
        }
    }

    console.log(`
✅ Grade cache build complete!
   Total courses processed: ${totalCourses}
   Successfully cached: ${cachedCourses}
   Skipped (already cached): ${skippedCourses}
   Failed (no data): ${failedCourses}
   Cache directory: ${CACHE_DIR}
`);
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
