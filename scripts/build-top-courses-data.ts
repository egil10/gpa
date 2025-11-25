/**
 * Script to dynamically fetch and save grade distribution data for the top 1 course per institution.
 * This replaces the old hardcoded list with a data-driven approach.
 * 
 * Usage:
 *   npx tsx scripts/build-top-courses-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { processGradeData, aggregateDuplicateEntries } from '../lib/utils';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';
import { GradeData, CourseStats } from '../types';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data', 'institutions');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-top-courses-data.json');
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const FETCH_TIMEOUT = 30000; // 30 seconds timeout for fetch calls
const MAX_CANDIDATES_TO_CHECK = 10; // Check top 10 courses per institution to find one with A-F data
const MIN_YEAR = 2020; // Exclude courses with data older than this year

interface OptimizedCourse {
    c: string;
    n?: string;
    y?: number[];
    s?: number;
}

interface OptimizedPayload {
    courses?: OptimizedCourse[];
}

export interface TopCoursesPayload {
    generatedAt: string;
    courses: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }>;
}

// Helper function to add timeout to fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = FETCH_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const { signal: existingSignal, ...restOptions } = options;

    if (existingSignal) {
        existingSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const response = await fetch(url, {
            ...restOptions,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            if (controller.signal.aborted && (!existingSignal || !existingSignal.aborted)) {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
        }
        throw error;
    }
}

function loadOptimizedCourses(filePath: string): OptimizedCourse[] {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Missing data file: ${filePath}`);
        return [];
    }

    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OptimizedPayload;
        if (!raw || !Array.isArray(raw.courses)) {
            return [];
        }
        return raw.courses.filter((course): course is OptimizedCourse => Boolean(course?.c));
    } catch (error: any) {
        console.error(`❌ Error loading ${filePath}:`, error.message);
        return [];
    }
}

async function fetchCourseGradeData(
    institutionCode: string,
    courseCode: string,
    institution: string,
    latestYearHint?: number
): Promise<CourseStats | null> {
    try {
        // Try multiple formats for course codes
        const codeFormats: string[] = [];

        // For UiB, prioritize -0 suffix over -1, and try more variations
        if (institution === 'UiB') {
            const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
            codeFormats.push(
                `${cleaned}-0`,           // UiB often uses -0 (try first!)
                cleaned,                   // Try without suffix
                `${cleaned}-1`,           // Also try -1
                `${cleaned}-HFEKS-0`,     // Common UiB variant
                `${cleaned}-MNEKS-0`,     // Common UiB variant
                `${cleaned}-HFSEM-0`,     // Common UiB variant
                `${cleaned}-MOSEM-0`,     // Common UiB variant
            );
        } else {
            // Standard format for other universities
            codeFormats.push(
                courseCode,                // Original format
                `${courseCode}-1`,        // Standard format (most universities)
                courseCode.replace(/-B$/, ''), // Remove -B suffix
            );

            // For BI, try with '1' suffix if not present
            if (institution === 'BI' && !courseCode.endsWith('1')) {
                codeFormats.push(`${courseCode}1`);
            }
        }

        // Try each format
        for (const codeFormat of codeFormats) {
            const formattedCode = formatCourseCode(codeFormat, institution);
            const payload = createSearchPayload(institutionCode, formattedCode);

            try {
                const response = await fetchWithTimeout(DIRECT_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (response.status === 204 || !response.ok) {
                    continue; // Try next format
                }

                const data: GradeData[] = await response.json();

                if (!data || data.length === 0) {
                    continue; // Try next format
                }

                // Get latest year
                const years = [...new Set(data.map(d => parseInt(d.Årstall, 10)))].sort((a, b) => b - a);
                const latestYear = years[0];

                // Filter to latest year
                const yearData = data.filter(d => parseInt(d.Årstall, 10) === latestYear);

                if (yearData.length === 0) {
                    continue; // Try next format
                }

                // Aggregate duplicate entries
                const aggregated = aggregateDuplicateEntries(yearData);

                // Process into stats
                const stats = processGradeData(aggregated);
                if (!stats) {
                    continue; // Try next format
                }

                // Check if it has A-F grades
                const hasLetterGrades = stats.distributions.some(d =>
                    ['A', 'B', 'C', 'D', 'E', 'F'].includes(d.grade) && d.count > 0
                );

                if (!hasLetterGrades) {
                    // Skip courses with only Pass/Fail if possible
                    continue;
                }

                return {
                    ...stats,
                    year: latestYear,
                };
            } catch (error) {
                continue;
            }
        }

        // FALLBACK for UiB: Query all courses for the institution and filter
        // This helps when the exact format is unclear
        if (institution === 'UiB') {
            try {
                const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
                const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix

                console.log(`\n      🔍 [UiB Fallback] Querying all courses for ${courseCode}...`);

                const allCoursesPayload = {
                    tabell_id: 308,
                    api_versjon: 1,
                    statuslinje: 'N',
                    begrensning: '5000',
                    kodetekst: 'N',
                    desimal_separator: '.',
                    groupBy: ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
                    sortBy: ['Emnekode', 'Karakter'],
                    filter: [
                        {
                            variabel: 'Institusjonskode',
                            selection: { filter: 'item', values: [institutionCode] },
                        },
                    ],
                };

                const response = await fetchWithTimeout(DIRECT_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(allCoursesPayload),
                });

                if (response.ok && response.status === 200) {
                    const allData: GradeData[] = await response.json();

                    // Find matching courses
                    const matchingData = allData.filter(item => {
                        const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                        const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');

                        // Exact match after normalization
                        if (normalizedItemCode === normalizedBase || itemCode === cleaned) {
                            return true;
                        }

                        // Prefix match for numeric suffixes
                        if (itemCode.startsWith(normalizedBase)) {
                            const nextChar = itemCode[normalizedBase.length];
                            if (nextChar === undefined || /[0-9]/.test(nextChar) || nextChar === '-') {
                                return true;
                            }
                        }

                        return false;
                    });

                    if (matchingData.length > 0) {
                        console.log(`      ✅ [UiB Fallback] Found ${matchingData.length} matching entries`);

                        // Get latest year from matched data
                        const years = [...new Set(matchingData.map(d => parseInt(d.Årstall, 10)))].sort((a, b) => b - a);
                        const latestYear = years[0];
                        const yearData = matchingData.filter(d => parseInt(d.Årstall, 10) === latestYear);

                        const aggregated = aggregateDuplicateEntries(yearData);
                        const stats = processGradeData(aggregated);

                        if (stats) {
                            const hasLetterGrades = stats.distributions.some(d =>
                                ['A', 'B', 'C', 'D', 'E', 'F'].includes(d.grade) && d.count > 0
                            );

                            if (hasLetterGrades) {
                                return {
                                    ...stats,
                                    year: latestYear,
                                };
                            }
                        }
                    } else {
                        console.log(`      ❌ [UiB Fallback] No matches found for ${courseCode}`);
                    }
                }
            } catch (error) {
                console.log(`      ❌ [UiB Fallback] Error:`, error instanceof Error ? error.message : error);
            }
        }

        return null;
    } catch (error) {
        console.error(`  ❌ Error fetching ${courseCode}:`, error);
        return null;
    }
}

async function main() {
    try {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building Top Courses Data (1 per institution)            ║
╚════════════════════════════════════════════════════════════╝
`);

        const results: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }> = [];
        let processedInstitutions = 0;

        for (const [institution, mapping] of Object.entries(INSTITUTION_DATA_FILES)) {
            processedInstitutions++;
            const uni = UNIVERSITIES[institution];
            if (!uni) continue;

            const dataPath = path.join(DATA_DIR, mapping.file);
            const allCourses = loadOptimizedCourses(dataPath)
                .map((course) => ({
                    courseCode: course.c,
                    courseName: course.n || course.c,
                    studentCount: typeof course.s === 'number' ? course.s : 0,
                    latestYear: Array.isArray(course.y) && course.y.length > 0
                        ? Number([...course.y].sort((a, b) => Number(b) - Number(a))[0])
                        : 0,
                }))
                .filter((course) => course.latestYear >= MIN_YEAR)
                .sort((a, b) => b.studentCount - a.studentCount);

            if (allCourses.length === 0) {
                console.warn(`⚠️  No courses for ${institution}`);
                continue;
            }

            console.log(`\n📊 Processing ${institution} (${uni.name})...`);

            // Check top N courses to find one with good data
            const coursesToCheck = allCourses.slice(0, MAX_CANDIDATES_TO_CHECK);
            let foundForInstitution = false;

            for (let i = 0; i < coursesToCheck.length; i++) {
                const course = coursesToCheck[i];

                // Skip common generic courses that might not be interesting
                if (course.courseName.toLowerCase().includes('exphil') && i > 0) {
                    // If it's not the absolute #1, maybe skip exphil to show something more specific?
                    // Actually, let's keep it simple: just show the most popular one.
                }

                process.stdout.write(`   [${i + 1}/${coursesToCheck.length}] Checking ${course.courseCode}... `);

                const stats = await fetchCourseGradeData(
                    uni.code,
                    course.courseCode,
                    institution,
                    course.latestYear
                );

                if (stats) {
                    // Normalize course code for key matching
                    let normalizedCode = normalizeCourseCodeAdvanced(course.courseCode).normalized;
                    if (institution !== 'UiB') {
                        normalizedCode = normalizeCourseCodeAdvanced(course.courseCode).normalized;
                        if (institution === 'BI' && normalizedCode.endsWith('1') && normalizedCode.length > 4) {
                            normalizedCode = normalizedCode.slice(0, -1);
                        }
                    }

                    results.push({
                        ...stats,
                        institution: institution,
                        courseName: course.courseName,
                        normalizedCode: normalizedCode,
                        courseCode: normalizedCode, // Use normalized code
                    });

                    console.log(`✅ Found! (Students: ${stats.totalStudents}, Avg: ${stats.averageGrade?.toFixed(1)})`);
                    foundForInstitution = true;
                    break; // Found one, move to next institution
                } else {
                    console.log(`❌ No valid A-F data`);
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (!foundForInstitution) {
                console.warn(`   ⚠️  Could not find any course with A-F data for ${institution} (checked top ${coursesToCheck.length})`);
            }
        }

        const payload: TopCoursesPayload = {
            generatedAt: new Date().toISOString(),
            courses: results,
        };

        // Ensure directory exists
        try {
            fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        } catch (error) {
            throw error;
        }

        try {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
        } catch (error) {
            throw error;
        }

        console.log(`\n✅ Top courses data saved!`);
        console.log(`   - Courses found: ${results.length}/${processedInstitutions}`);
        console.log(`   - Saved to: ${OUTPUT_FILE}\n`);

    } catch (error) {
        console.error('❌ Fatal error:', error instanceof Error ? error.stack : String(error));
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('❌ Unhandled error:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
});
