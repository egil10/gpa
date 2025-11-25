/**
 * Fetch All Grade Data for One Institution
 * 
 * Fetches grade data for ALL courses from a single institution with:
 * - Parallel processing (configurable via FETCH_CONCURRENCY env var)
 * - Rate limiting (respectful to API)
 * - Incremental updates (only fetch missing years)
 * - Optimized JSON storage (compact format)
 * - Excellent terminal feedback (progress, errors, ETA)
 * 
 * 🛡️ SAFETY FEATURES:
 * - Writes to SEPARATE location: data/grade-cache-optimized/ (NOT public/data/grade-cache/)
 * - Does NOT overwrite existing cache files (unless --force is used)
 * - Does NOT modify any existing data/configs
 * - Can run safely alongside existing pipeline
 * - build-institution-statistics.ts reads from BOTH locations (new + old)
 * 
 * 🔧 COMPREHENSIVE FIXES INCORPORATED:
 * - ✅ UiB JUS courses: Tries without suffix first (JUS346, not JUS346-1)
 * - ✅ UiB variant handling: Handles EXPHIL-HFSEM, EXPHIL-MNEKS, etc.
 * - ✅ BI course filtering: Validates returned data matches exact course code
 * - ✅ Data validation: Filters API responses to ensure correct course matches
 * - ✅ Normalization matching: Validates course codes after normalization
 * - ✅ Duplicate aggregation: Uses aggregateDuplicateEntries() for all data
 * - ✅ Course code normalization: Uses normalizeCourseCodeForStorage() for file naming
 * - ✅ Format code handling: Uses formatCourseCode() for API calls (all institution-specific logic)
 * 
 * Pipeline Integration:
 * - Uses normalizeCourseCodeForStorage() for consistent file naming (same as discovery scripts)
 * - Uses formatCourseCode() for API calls (handles BI/UiB special cases)
 * - Stores data in optimized format (i, c, n, y, d, f) matching build-institution-statistics.ts
 * - Course codes are normalized (spaces removed, uppercase) for consistent storage
 * - Works seamlessly with post-discovery pipeline (normalize-codes, fix-duplicates, etc.)
 * 
 * This script incorporates ALL fixes and patterns learned from:
 * - lib/api.ts (fetchGradeData, fetchAllYearsData)
 * - scripts/build-grade-cache.ts
 * - scripts/populate-cache.ts
 * - scripts/build-homepage-grade-data.ts
 * - scripts/build-homepage-data.ts
 * 
 * Usage:
 *   $env:FETCH_CONCURRENCY=5; npm run fetch-all-grade-data -- --institution=UiO
 *   FETCH_CONCURRENCY=10 npm run fetch-all-grade-data -- --institution=NTNU
 *   npm run fetch-all-grade-data -- --institution=UiO --incremental  # Only fetch missing years
 *   npm run fetch-all-grade-data -- --institution=UiO --force  # Rebuild existing cache
 * 
 * After fetching, run:
 *   npm run build-institution-statistics  # To generate statistics from fetched data
 * 
 * Note: This script is safe to run - it won't affect existing cache or configs!
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { aggregateDuplicateEntries } from '../lib/utils';
import { normalizeCourseCodeAdvanced } from '../lib/course-code-normalizer';
import { normalizeCourseCodeForStorage } from './utils/export-format';
import { GradeData } from '../types';

// Terminal colors (simple, no dependencies)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const CACHE_DIR = path.join(process.cwd(), 'data', 'grade-cache-optimized');
const INSTITUTIONS_DIR = path.join(process.cwd(), 'data', 'institutions');
const PUBLIC_INSTITUTIONS_DIR = path.join(process.cwd(), 'public', 'data', 'institutions');
const FETCH_TIMEOUT = 30000;
const DELAY_BETWEEN_BATCHES = 500; // ms between batches (rate limiting)

// Parse command line arguments
const args = process.argv.slice(2);
const targetInstitutionArg = args.find(arg => arg.startsWith('--institution='))?.split('=')[1];
const concurrency = parseInt(process.env.FETCH_CONCURRENCY || '5', 10);
const incremental = args.includes('--incremental');
const forceRebuild = args.includes('--force');

if (!targetInstitutionArg) {
  console.error(`${colors.red}❌ Error: --institution argument required${colors.reset}`);
  console.error(`\nUsage:`);
  console.error(`  $env:FETCH_CONCURRENCY=5; npm run fetch-all-grade-data -- --institution=UiO`);
  console.error(`  FETCH_CONCURRENCY=10 npm run fetch-all-grade-data -- --institution=NTNU`);
  console.error(`  npm run fetch-all-grade-data -- --institution=UiO --incremental`);
  process.exit(1);
}

// TypeScript now knows targetInstitution is defined
const targetInstitution: string = targetInstitutionArg;

interface OptimizedCourse {
    c: string;  // code
    n?: string; // name
    y?: number[]; // years
    s?: number; // student count
}

interface InstitutionCourseData {
    courses: OptimizedCourse[];
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

// Helper: Format time
function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Helper: Get current time
function getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
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

// Helper: Fetch grade data for a course (uses same logic as lib/api.ts with ALL fixes and patterns)
async function fetchCourseGradeData(
    institutionCode: string,
    courseCode: string,
    institution: string
): Promise<GradeData[] | null> {
    // Skip DIGI courses from UiB (they're slow and often don't have A-F grades)
    if (institution === 'UiB' && courseCode.toUpperCase().startsWith('DIGI')) {
        return null;
    }

    // Normalize course code first (remove spaces, uppercase)
    const cleaned = courseCode.replace(/\s/g, '').toUpperCase();
    const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix for matching
    const codeFormats: string[] = [];

    // Use same format logic as lib/api.ts fetchGradeData (with all learned fixes)
    if (institution === 'UiB') {
        const isJUSCourse = cleaned.startsWith('JUS');
        const hasDash = cleaned.includes('-');
        
        // For JUS courses or courses with dashes (like EXPHIL-SVSEM), try without -1 first
        // For other courses, try with -0 first (most common)
        const formatsToTry = (isJUSCourse || hasDash)
            ? [
                cleaned,                  // JUS or dash courses: without suffix first
                `${cleaned}-0`,           // Then with -0
                `${cleaned}-1`,           // Then with -1
                formatCourseCode(cleaned, institution),
            ]
            : [
                `${cleaned}-0`,           // UiB standard: -0 suffix first (most common)
                cleaned,                  // Then without any suffix
                `${cleaned}-1`,           // Then with -1 as fallback
                formatCourseCode(cleaned, institution), // formatCourseCode result
            ];
        
        codeFormats.push(...formatsToTry);
        
        // If the code has no dash, also try common variant patterns (e.g., "EXPHIL" -> "EXPHIL-HFSEM", "EXPHIL-MNEKS")
        // This avoids the expensive "query all courses" fallback
        if (!normalizedBase.includes('-')) {
            // Common UiB variant suffixes based on actual data
            const commonVariants = ['HFSEM', 'MNEKS', 'MOSEM', 'HFEKS', 'MNEKS-0', 'HFSEM-0', 'MOSEM-0', 'HFEKS-0'];
            for (const variant of commonVariants) {
                codeFormats.push(`${normalizedBase}-${variant}`);
                codeFormats.push(`${normalizedBase}-${variant}-1`);
            }
        }
    } else if (institution === 'BI') {
        // BI: Some courses like "MET29107" already end with digits and should be used as-is
        // Others might need a "1" suffix appended
        codeFormats.push(
            cleaned, // Try as-is first (for codes like "MET29107" that already end with digits)
            `${cleaned}1`, // Try with "1" suffix (standard BI format)
            formatCourseCode(cleaned, institution), // Use formatCourseCode result
        );
    } else if (institution === 'AHO') {
        // AHO: Course codes are purely numeric (e.g., "12400", "12701")
        // Try as-is first (most likely), then with -1 suffix
        codeFormats.push(
            cleaned, // Try numeric code as-is first (e.g., "12400")
            formatCourseCode(cleaned, institution), // Then with -1 suffix (e.g., "12400-1")
            `${cleaned}-1`, // Also try explicit -1
        );
    } else if (institution === 'SH') {
        // SH (Samisk høgskole): Course codes have various formats
        // Examples: "ALDU-FA2PRO", "ARB180", "FIL100-1", "SAM103.1RUO", "V5DUO-1140"
        // Try as-is first (most likely to work)
        codeFormats.push(cleaned);
        
        // If code already has a dash (like "FIL100-1", "ALDU-FA2PRO"), try variations
        if (cleaned.includes('-')) {
            const parts = cleaned.split('-');
            // Try with -1 suffix (e.g., "ALDU-FA2PRO-1")
            codeFormats.push(`${cleaned}-1`);
            // Try just first part (e.g., "ALDU-FA2PRO" -> "ALDU")
            if (parts.length > 1) {
                codeFormats.push(parts[0]);
                codeFormats.push(`${parts[0]}-1`);
            }
        } else {
            // No dash: try with -1 suffix
            codeFormats.push(`${cleaned}-1`);
        }
        
        // Always try formatCourseCode result
        codeFormats.push(formatCourseCode(cleaned, institution));
        
        // If code has a period (like "SAM103.1RUO"), try without period
        if (cleaned.includes('.')) {
            const withoutPeriod = cleaned.replace(/\./g, '');
            codeFormats.push(withoutPeriod);
            codeFormats.push(`${withoutPeriod}-1`);
        }
    } else {
        // Standard format: Use formatCourseCode (adds -1 suffix for most)
        codeFormats.push(formatCourseCode(courseCode, institution));
        // Also try without suffix
        if (!cleaned.includes('-')) {
            codeFormats.push(cleaned);
            codeFormats.push(`${cleaned}-1`);
        }
    }

    // Remove duplicates
    const uniqueFormats = Array.from(new Set(codeFormats));

    // Try each format
    for (const formattedCode of uniqueFormats) {
        try {
            // For UiB JUS courses, try with study program filter first
            if (institution === 'UiB' && cleaned.startsWith('JUS')) {
                try {
                    const payload = createSearchPayload(
                        institutionCode,
                        formattedCode,
                        undefined, // year
                        undefined, // departmentFilter
                        { studiumCode: 'jus' } // studyProgramFilter
                    );
                    const response = await fetchWithTimeout(DIRECT_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (response.ok && response.status === 200) {
                        const data: GradeData[] = await response.json();
                        if (data && data.length > 0) {
                            // Check if we got matching data
                            const matching = data.filter(item => {
                                const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                                const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
                                return normalizedItemCode === normalizedBase ||
                                    itemCode === cleaned ||
                                    (cleaned.startsWith('JUS') && itemCode.startsWith(cleaned));
                            });

                            if (matching.length > 0) {
                                return aggregateDuplicateEntries(matching);
                            }
                        }
                    }
                } catch (error) {
                    // Continue to try without study program filter
                }
            }

            // Try without study program filter (or if not JUS course)
            const payload = createSearchPayload(institutionCode, formattedCode);
            const response = await fetchWithTimeout(DIRECT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Check for 204 (no content) - skip this format
            if (response.status === 204) {
                continue;
            }

            if (response.ok && response.status === 200) {
                const data: GradeData[] = await response.json();
                if (data && data.length > 0) {
                    // IMPORTANT: Filter data to ensure we only return data for the specific course
                    // The API can return data for multiple courses, especially for BI
                    let matchingData = data;
                    
                    if (institution === 'BI') {
                        // BI: Filter to ensure we only return data for the specific course
                        matchingData = data.filter(item => {
                            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                            // Match if codes match exactly, or if normalized codes match
                            return itemCode === cleaned ||
                                itemCode === formattedCode.toUpperCase() ||
                                itemCode.replace(/1$/, '') === cleaned.replace(/1$/, ''); // Remove trailing "1" for comparison
                        });
                    } else {
                        // For other institutions, validate that returned codes match (after normalization)
                        // This prevents returning data for similar but different courses
                        const normalizedOriginal = normalizeCourseCodeAdvanced(courseCode).normalized;
                        matchingData = data.filter(item => {
                            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                            const normalizedItemCode = normalizeCourseCodeAdvanced(itemCode).normalized;
                            
                            // Exact match after normalization
                            if (normalizedItemCode === normalizedOriginal || itemCode === cleaned) {
                                return true;
                            }
                            
                            // For JUS courses, also match if item code starts with our code
                            if (cleaned.startsWith('JUS') && itemCode.startsWith(cleaned)) {
                                return true;
                            }
                            
                            // For codes with dashes, allow prefix matching (e.g., "EXPHIL-HFSEM" matches "EXPHIL-HFSEM-0")
                            if (normalizedOriginal.includes('-')) {
                                if (normalizedItemCode.startsWith(normalizedOriginal + '-') || 
                                    normalizedItemCode === normalizedOriginal) {
                                    return true;
                                }
                            }
                            
                            // For codes without dashes, allow numeric suffix matching (e.g., "EXPHIL" matches "EXPHIL2000")
                            // But reject variant suffixes (e.g., "EXPHIL" should NOT match "EXPHIL-HFSEM")
                            if (itemCode.startsWith(normalizedOriginal)) {
                                const nextChar = itemCode[normalizedOriginal.length];
                                // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
                                // Reject if next character is a dash (variant like "EXPHIL-HFSEM")
                                if (nextChar === undefined || /[0-9]/.test(nextChar)) {
                                    return true;
                                }
                                // Allow if next characters form a numeric suffix after dash (e.g., "-1", "-0", "-2")
                                if (nextChar === '-' && /^-[0-9]+/.test(itemCode.substring(normalizedOriginal.length))) {
                                    return true;
                                }
                            }
                            
                            return false;
                        });
                    }
                    
                    if (matchingData.length > 0) {
                        return aggregateDuplicateEntries(matchingData);
                    }
                }
            }
        } catch (error) {
            continue; // Try next format
        }
    }

    // LAST RESORT: For UiB, if all direct queries failed, try querying all courses and filtering
    // WARNING: This is VERY SLOW for UiB (7255 courses) - only use as last resort
    if (institution === 'UiB' && uniqueFormats.length < 10) {
        try {
            const payloadAllCourses = createSearchPayload(institutionCode, undefined);
            const allData = await fetchWithTimeout(DIRECT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadAllCourses),
            });

            if (allData.ok && allData.status === 200) {
                const data: GradeData[] = await allData.json();
                if (data && data.length > 0) {
                    // Find courses that match the normalized code (consistent with how we store codes)
                    const matchingData = data.filter(item => {
                        const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
                        const normalizedItemCode = itemCode.replace(/-[0-9]+$/, ''); // Consistent normalization

                        // Exact match after normalization
                        if (normalizedItemCode === normalizedBase || itemCode === cleaned) {
                            return true;
                        }

                        // For UiB: if the search code contains a dash (e.g., "EXPHIL-HFSEM"), 
                        // only match if the item code starts with the exact search code
                        if (normalizedBase.includes('-')) {
                            return normalizedItemCode.startsWith(normalizedBase + '-') || normalizedItemCode === normalizedBase;
                        }

                        // If search code has no dash, allow prefix matching for numeric suffixes
                        // But NOT for dash-separated variants (e.g., "EXPHIL" does NOT match "EXPHIL-HFSEM")
                        if (itemCode.startsWith(normalizedBase)) {
                            const nextChar = itemCode[normalizedBase.length];
                            // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
                            if (nextChar === undefined || /[0-9]/.test(nextChar)) {
                                return true;
                            }
                            // Allow if next characters form a numeric suffix after dash (e.g., "-1", "-0")
                            if (nextChar === '-' && /^-[0-9]+/.test(itemCode.substring(normalizedBase.length))) {
                                return true;
                            }
                        }

                        return false;
                    });

                    if (matchingData.length > 0) {
                        return aggregateDuplicateEntries(matchingData);
                    }

                    // If no exact match found and search code has no dash, try to find variants
                    // For example, if searching for "EXPHIL" (no data), find "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
                    if (!normalizedBase.includes('-')) {
                        const variantMatches = data.filter(item => {
                            const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
                            const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
                            // Match variants like "EXPHIL-HFSEM" when searching for "EXPHIL"
                            return normalizedItemCode.startsWith(normalizedBase + '-');
                        });

                        if (variantMatches.length > 0) {
                            return aggregateDuplicateEntries(variantMatches);
                        }
                    }
                }
            }
        } catch (error) {
            // If this fallback also fails, return null below
        }
    }

    return null;
}

// Load courses for an institution
function loadInstitutionCourses(institution: string): OptimizedCourse[] {
    // Normalize institution name for file lookup
    // Handle special characters: "HiØ" -> "hio", "HGUt" -> "hgut", etc.
    const institutionLower = institution.toLowerCase();
    // Replace special Norwegian characters with ASCII equivalents for filename matching
    const normalized = institutionLower
        .replace(/ø/g, 'o')
        .replace(/å/g, 'a')
        .replace(/æ/g, 'ae')
        .replace(/Ø/g, 'o')
        .replace(/Å/g, 'a')
        .replace(/Æ/g, 'ae');
    
    // Try both normalized and original lowercase (in case file uses special chars)
    const possibleFiles = [
        path.join(INSTITUTIONS_DIR, `${normalized}-all-courses.json`),
        path.join(INSTITUTIONS_DIR, `${institutionLower}-all-courses.json`),
        path.join(PUBLIC_INSTITUTIONS_DIR, `${normalized}-all-courses.json`),
        path.join(PUBLIC_INSTITUTIONS_DIR, `${institutionLower}-all-courses.json`),
    ];

    for (const filePath of possibleFiles) {
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const data: InstitutionCourseData = JSON.parse(content);
                return data.courses || [];
            } catch (error) {
                console.error(`${colors.red}   ⚠️  Failed to load ${filePath}:${colors.reset}`, error instanceof Error ? error.message : error);
            }
        }
    }

    return [];
}

// Optimize grade data for storage
function optimizeGradeData(
    institutionCode: string,
    courseCode: string,
    normalizedCode: string,
    gradeData: GradeData[]
): OptimizedGradeData {
    // Extract unique years (most recent first)
    const years = [...new Set(gradeData.map(d => parseInt(d.Årstall, 10)).filter(y => !isNaN(y)))].sort((a, b) => b - a);
    
    // Group by year and grade (aggregate duplicates)
    const dataMap = new Map<string, { year: number; grade: string; count: number }>();
    
    gradeData.forEach(item => {
        const year = parseInt(item.Årstall, 10);
        if (isNaN(year)) return;
        
        const grade = item.Karakter;
        const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
        
        const key = `${year}-${grade}`;
        if (dataMap.has(key)) {
            dataMap.get(key)!.count += count;
        } else {
            dataMap.set(key, { year, grade, count });
        }
    });
    
    // Convert to optimized format (sorted by year descending, then grade)
    const optimizedData = Array.from(dataMap.values())
        .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year; // Most recent first
            return a.grade.localeCompare(b.grade); // Then by grade
        })
        .map(({ year, grade, count }) => ({
            y: year,
            g: grade,
            c: count,
        }));
    
    return {
        i: institutionCode,
        c: courseCode,
        n: normalizedCode,
        y: years,
        d: optimizedData,
        f: new Date().toISOString(),
    };
}

// Check if we need to fetch (incremental mode)
function needsFetch(
    cacheFile: string,
    courseYears: number[],
    incremental: boolean
): { needsFetch: boolean; existingYears: number[] } {
    // If force rebuild, always fetch
    if (forceRebuild) {
        return { needsFetch: true, existingYears: [] };
    }
    
    // If file doesn't exist, we need to fetch
    if (!fs.existsSync(cacheFile)) {
        return { needsFetch: true, existingYears: [] };
    }

    // If not incremental mode, skip if file exists (already cached)
    if (!incremental) {
        return { needsFetch: false, existingYears: [] }; // Already cached, skip
    }

    // Incremental mode: Check if we have all years
    try {
        const cached: OptimizedGradeData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        const cachedYears = new Set(cached.y || []);
        const courseYearsSet = new Set(courseYears || []);
        
        // Check if there are new years we don't have
        for (const year of courseYearsSet) {
            if (!cachedYears.has(year)) {
                return { needsFetch: true, existingYears: Array.from(cachedYears) };
            }
        }
        
        // All years already cached
        return { needsFetch: false, existingYears: Array.from(cachedYears) };
    } catch {
        // Error reading cache, refetch
        return { needsFetch: true, existingYears: [] };
    }
}

// Process a single course
async function processCourse(
    institution: string,
    institutionCode: string,
    course: OptimizedCourse,
    instCacheDir: string,
    index: number,
    total: number
): Promise<{ cached: boolean; failed: boolean; skipped: boolean; error?: string }> {
    // Use normalizeCourseCodeForStorage (same as discovery scripts) for consistent file naming
    const courseCode = course.c;
    const normalized = normalizeCourseCodeForStorage(courseCode);
    const cacheFile = path.join(instCacheDir, `${normalized}.json`);

    // Check if we need to fetch
    const { needsFetch: shouldFetch, existingYears } = needsFetch(cacheFile, course.y || [], incremental);
    if (!shouldFetch) {
        return { cached: false, failed: false, skipped: true };
    }

    // Fetch grade data
    let gradeData: GradeData[] | null = null;
    try {
        gradeData = await fetchCourseGradeData(institutionCode, courseCode, institution);
    } catch (error) {
        return {
            cached: false,
            failed: true,
            skipped: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }

    if (gradeData && gradeData.length > 0) {
        // If incremental, merge with existing data
        let existingData: GradeData[] = [];
        if (incremental && existingYears.length > 0 && fs.existsSync(cacheFile)) {
            try {
                const existing: OptimizedGradeData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
                // Convert optimized format back to GradeData for merging
                existing.d.forEach(item => {
                    existingData.push({
                        Institusjonskode: existing.i,
                        Emnekode: courseCode,
                        Karakter: item.g,
                        Årstall: String(item.y),
                        'Antall kandidater totalt': String(item.c),
                    } as GradeData);
                });
            } catch {
                // Ignore errors, start fresh
            }
        }

        // Merge data (avoid duplicates)
        const dataMap = new Map<string, GradeData>();
        [...existingData, ...gradeData].forEach(item => {
            const key = `${item.Årstall}-${item.Karakter}`;
            if (!dataMap.has(key)) {
                dataMap.set(key, item);
            }
        });

        const mergedData = Array.from(dataMap.values());

        // Optimize and save
        const optimized = optimizeGradeData(institutionCode, courseCode, normalized, mergedData);
        fs.writeFileSync(cacheFile, JSON.stringify(optimized)); // Compact JSON
        return { cached: true, failed: false, skipped: false };
    }

    return { cached: false, failed: true, skipped: false, error: 'No data returned' };
}

// Print progress bar
function printProgress(current: number, total: number, cached: number, failed: number, skipped: number, elapsed: number, eta?: number): void {
    const percentage = ((current / total) * 100).toFixed(1);
    const barWidth = 40;
    const filled = Math.round((current / total) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    
    const etaStr = eta ? ` ETA: ${formatTime(eta)}` : '';
    const stats = `${colors.green}${cached}✓${colors.reset} ${colors.red}${failed}✗${colors.reset} ${colors.dim}${skipped}⊘${colors.reset}`;
    
    process.stdout.write(`\r${colors.cyan}[${percentage}%]${colors.reset} ${bar} ${current}/${total} ${stats} ${formatTime(elapsed)}${etaStr}     `);
}

// Main function
async function main() {
    const startTime = Date.now();
    
    console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║   Fetch All Grade Data (Single Institution)                ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

    // Validate institution
    const uni = UNIVERSITIES[targetInstitution];
    if (!uni) {
        console.error(`${colors.red}❌ Error: Unknown institution "${targetInstitution}"${colors.reset}`);
        console.error(`\nAvailable institutions: ${Object.keys(UNIVERSITIES).join(', ')}`);
        process.exit(1);
    }

    // Create cache directory
    const instCacheDir = path.join(CACHE_DIR, targetInstitution);
    
    // Safety check: Warn if cache directory already exists and has files (unless --force)
    if (!forceRebuild && fs.existsSync(instCacheDir)) {
        const existingFiles = fs.readdirSync(instCacheDir).filter(f => f.endsWith('.json'));
        if (existingFiles.length > 0) {
            console.log(`${colors.yellow}⚠️  Warning: Cache directory already contains ${existingFiles.length} files${colors.reset}`);
            console.log(`   Location: ${instCacheDir}`);
            console.log(`   ${colors.dim}This script writes to a SEPARATE location (data/grade-cache-optimized/)${colors.reset}`);
            console.log(`   ${colors.dim}It will NOT overwrite existing cache in public/data/grade-cache/${colors.reset}`);
            if (!incremental) {
                console.log(`   ${colors.yellow}Use --incremental to only fetch missing years, or --force to rebuild${colors.reset}\n`);
            } else {
                console.log(`   ${colors.green}Incremental mode: Will only fetch missing years${colors.reset}\n`);
            }
        }
    }

    console.log(`${colors.bright}Configuration:${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Institution: ${colors.yellow}${targetInstitution}${colors.reset} (${uni.name})`);
    console.log(`  ${colors.cyan}•${colors.reset} Cache location: ${colors.dim}${instCacheDir}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} ${colors.green}✓ Safe: Writes to separate location, won't affect existing cache${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Concurrency: ${colors.yellow}${concurrency}${colors.reset} (set FETCH_CONCURRENCY env var to change)`);
    console.log(`  ${colors.cyan}•${colors.reset} Incremental: ${colors.yellow}${incremental ? 'ON' : 'OFF'}${colors.reset} (only fetch new years)`);
    console.log(`  ${colors.cyan}•${colors.reset} Force rebuild: ${colors.yellow}${forceRebuild ? 'YES' : 'NO'}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Start time: ${colors.dim}${getCurrentTime()}${colors.reset}\n`);

    // Create cache directory
    fs.mkdirSync(instCacheDir, { recursive: true });

    // Load courses
    console.log(`${colors.blue}📚 Loading courses...${colors.reset}`);
    const courses = loadInstitutionCourses(targetInstitution);
    if (courses.length === 0) {
        console.error(`${colors.red}❌ No courses found for ${targetInstitution}${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ Found ${courses.length} courses${colors.reset}\n`);

    // Statistics
    let cached = 0;
    let failed = 0;
    let skipped = 0;
    let processed = 0;
    const errors: Array<{ course: string; error: string }> = [];

    // Process in batches with concurrency control
    const queue: Array<{ course: OptimizedCourse; index: number }> = courses.map((c, i) => ({ course: c, index: i }));
    let active = 0;
    const startProcessingTime = Date.now();

    async function processNext(): Promise<void> {
        if (queue.length === 0) return;

        const { course, index } = queue.shift()!;
        active++;

        try {
            const result = await processCourse(
                targetInstitution,
                uni.code,
                course,
                instCacheDir,
                index,
                courses.length
            );

            processed++;
            if (result.cached) cached++;
            if (result.failed) {
                failed++;
                if (result.error) {
                    errors.push({ course: course.c, error: result.error });
                }
            }
            if (result.skipped) skipped++;

            // Update progress
            const elapsed = Date.now() - startProcessingTime;
            const avgTime = processed > 0 ? elapsed / processed : 0;
            const remaining = courses.length - processed;
            const eta = remaining > 0 ? avgTime * remaining : undefined;
            
            printProgress(processed, courses.length, cached, failed, skipped, elapsed, eta);
        } catch (error) {
            processed++;
            failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push({ course: course.c, error: errorMsg });
        } finally {
            active--;
            await processNext();
        }
    }

    // Start processing with concurrency limit
    console.log(`${colors.blue}🚀 Starting fetch...${colors.reset}\n`);
    const promises: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
        promises.push(processNext());
        
        // Delay between starting batches (rate limiting)
        if (i < concurrency - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }

    await Promise.all(promises);
    
    // Final progress update
    const totalTime = Date.now() - startTime;
    printProgress(courses.length, courses.length, cached, failed, skipped, totalTime);
    console.log(); // New line

    // Summary
    console.log(`\n${colors.bright}${colors.green}✅ Fetch complete!${colors.reset}\n`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} Successfully cached: ${colors.green}${cached}${colors.reset}`);
    console.log(`  ${colors.red}✗${colors.reset} Failed: ${colors.red}${failed}${colors.reset}`);
    console.log(`  ${colors.dim}⊘${colors.reset} Skipped: ${colors.dim}${skipped}${colors.reset}`);
    console.log(`  ${colors.cyan}⏱${colors.reset} Total time: ${colors.yellow}${formatTime(totalTime)}${colors.reset}`);
    console.log(`  ${colors.cyan}📁${colors.reset} Cache directory: ${colors.dim}${instCacheDir}${colors.reset}`);

    // Show errors if any
    if (errors.length > 0) {
        console.log(`\n${colors.red}${colors.bright}Errors (showing first 10):${colors.reset}`);
        errors.slice(0, 10).forEach(({ course, error }) => {
            console.log(`  ${colors.red}✗${colors.reset} ${course}: ${colors.dim}${error}${colors.reset}`);
        });
        if (errors.length > 10) {
            console.log(`  ${colors.dim}... and ${errors.length - 10} more${colors.reset}`);
        }
    }

    console.log();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}⚠️  Fetch interrupted by user${colors.reset}\n`);
    process.exit(130);
});

main().catch((error) => {
    console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, error);
    process.exit(1);
});


