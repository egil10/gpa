/**
 * Detailed analytics script for analyzing course codes throughout the entire pipeline
 * Usage: npm run analyze-detailed <institution>
 * Example: npm run analyze-detailed UiB
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { UNIVERSITIES } from '../lib/api';
import { getAllCoursesForInstitution } from '../lib/hierarchy-discovery';
import { normalizeCourseCodeForStorage } from './utils/export-format';
import { GradeData } from '../types';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

interface StoredCourse {
  code: string;
  name?: string;
  years?: number[];
  students?: number;
}

interface APICourse {
  code: string;
  normalized: string;
  hasSpaces: boolean;
  hasDashes: boolean;
  numericSuffix: string | null;
  variantSuffix: string | null;
}

interface Analysis {
  institution: string;
  institutionCode: string;
  stored: {
    total: number;
    courses: StoredCourse[];
    codesWithSpaces: string[];
    codesWithDashes: string[];
    codesWithMultipleDashes: string[];
    codesEndingWithDigit: string[];
    lengthDistribution: Record<number, number>;
    prefixDistribution: Record<string, number>;
    suffixPatterns: Record<string, number>;
  };
  api: {
    total: number;
    courses: APICourse[];
    uniqueCodes: Set<string>;
    codesWithSpaces: string[];
    codesWithDashes: string[];
    codesWithMultipleDashes: string[];
    codesEndingWithDigit: string[];
    numericSuffixDistribution: Record<string, number>;
    variantSuffixDistribution: Record<string, number>;
    lengthDistribution: Record<number, number>;
    prefixDistribution: Record<string, number>;
  };
  comparison: {
    inStoredNotInAPI: string[];
    inAPINotInStored: string[];
    formatMismatches: Array<{ stored: string; api: string; reason: string }>;
    duplicates: string[];
  };
}

function normalizeCode(code: string): string {
  return code.replace(/\s/g, '').trim().toUpperCase();
}

function extractSuffixes(code: string): { numeric: string | null; variant: string | null } {
  const normalized = normalizeCode(code);
  const numericMatch = normalized.match(/-([0-9]+)$/);
  const numeric = numericMatch ? numericMatch[1] : null;
  
  // Extract variant suffix (non-numeric after dash)
  const variantMatch = normalized.match(/-([A-Z]+(?:-[0-9]+)?)$/);
  const variant = variantMatch && !numericMatch ? variantMatch[1] : null;
  
  return { numeric, variant };
}

function loadStoredCourses(institution: string): StoredCourse[] {
  const dataFile = INSTITUTION_DATA_FILES[institution];
  if (!dataFile) {
    throw new Error(`No data file found for institution: ${institution}`);
  }

  const filePath = path.join(process.cwd(), 'data', 'institutions', dataFile.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  return (data.courses || []).map((c: any) => ({
    code: c.c || '',
    name: c.n,
    years: c.y || [],
    students: c.s,
  }));
}

async function fetchAPICourses(institutionCode: string, year: number = 2024): Promise<APICourse[]> {
  console.log(`${colors.dim}   Fetching API data for year ${year}...${colors.reset}`);
  const courses = await getAllCoursesForInstitution(institutionCode, year);
  
  return courses.map(course => {
    const original = course.courseCode;
    const normalized = normalizeCode(original);
    const { numeric, variant } = extractSuffixes(original);
    
    return {
      code: original,
      normalized,
      hasSpaces: original.includes(' '),
      hasDashes: original.includes('-'),
      numericSuffix: numeric,
      variantSuffix: variant,
    };
  });
}

function analyzeStoredCourses(courses: StoredCourse[]): Analysis['stored'] {
  const codesWithSpaces: string[] = [];
  const codesWithDashes: string[] = [];
  const codesWithMultipleDashes: string[] = [];
  const codesEndingWithDigit: string[] = [];
  const lengthDistribution: Record<number, number> = {};
  const prefixDistribution: Record<string, number> = {};
  const suffixPatterns: Record<string, number> = {};

  courses.forEach(c => {
    const code = c.code;
    
    if (code.includes(' ')) codesWithSpaces.push(code);
    if (code.includes('-')) codesWithDashes.push(code);
    const dashCount = (code.match(/-/g) || []).length;
    if (dashCount > 1) codesWithMultipleDashes.push(code);
    if (/\d$/.test(code)) codesEndingWithDigit.push(code);
    
    lengthDistribution[code.length] = (lengthDistribution[code.length] || 0) + 1;
    const prefix = code.charAt(0) || 'EMPTY';
    prefixDistribution[prefix] = (prefixDistribution[prefix] || 0) + 1;
    
    const suffixMatch = code.match(/-([^-]+)$/);
    if (suffixMatch) {
      const suffix = suffixMatch[1];
      suffixPatterns[suffix] = (suffixPatterns[suffix] || 0) + 1;
    }
  });

  return {
    total: courses.length,
    courses,
    codesWithSpaces,
    codesWithDashes,
    codesWithMultipleDashes,
    codesEndingWithDigit,
    lengthDistribution,
    prefixDistribution,
    suffixPatterns,
  };
}

function analyzeAPICourses(courses: APICourse[]): Analysis['api'] {
  const codesWithSpaces: string[] = [];
  const codesWithDashes: string[] = [];
  const codesWithMultipleDashes: string[] = [];
  const codesEndingWithDigit: string[] = [];
  const numericSuffixDistribution: Record<string, number> = {};
  const variantSuffixDistribution: Record<string, number> = {};
  const lengthDistribution: Record<number, number> = {};
  const prefixDistribution: Record<string, number> = {};
  const uniqueCodes = new Set<string>();

  courses.forEach(c => {
    uniqueCodes.add(c.normalized);
    
    if (c.hasSpaces) codesWithSpaces.push(c.code);
    if (c.hasDashes) codesWithDashes.push(c.code);
    const dashCount = (c.code.match(/-/g) || []).length;
    if (dashCount > 1) codesWithMultipleDashes.push(c.code);
    if (/\d$/.test(c.normalized)) codesEndingWithDigit.push(c.normalized);
    
    if (c.numericSuffix) {
      numericSuffixDistribution[c.numericSuffix] = (numericSuffixDistribution[c.numericSuffix] || 0) + 1;
    }
    if (c.variantSuffix) {
      variantSuffixDistribution[c.variantSuffix] = (variantSuffixDistribution[c.variantSuffix] || 0) + 1;
    }
    
    lengthDistribution[c.normalized.length] = (lengthDistribution[c.normalized.length] || 0) + 1;
    const prefix = c.normalized.charAt(0) || 'EMPTY';
    prefixDistribution[prefix] = (prefixDistribution[prefix] || 0) + 1;
  });

  return {
    total: courses.length,
    courses,
    uniqueCodes,
    codesWithSpaces,
    codesWithDashes,
    codesWithMultipleDashes,
    codesEndingWithDigit,
    numericSuffixDistribution,
    variantSuffixDistribution,
    lengthDistribution,
    prefixDistribution,
  };
}

function normalizeForComparison(code: string): string {
  // Normalize: remove spaces, remove numeric suffixes like -0, -1, -2
  // But be careful: courses like "EMQAL-1" and "EMQAL-10" are different courses
  // Only remove trailing numeric suffixes after a dash (not numeric suffixes that are part of the course code)
  // Pattern: "EMQAL-1-0" -> "EMQAL-1" (remove only the API suffix -0, not the course number -1)
  // Pattern: "KURATOR 2-1" -> "KURATOR2" (remove space and API suffix -1, but keep the "2")
  
  // First normalize spaces
  let normalized = code.replace(/\s/g, '').trim().toUpperCase();
  
  // Remove only trailing numeric API suffixes (like -0, -1, -2 at the very end)
  // This handles "KURATOR2-1" -> "KURATOR2" and "CAREIN-A-0" -> "CAREIN-A"
  normalized = normalized.replace(/-[0-9]+$/, '');
  
  return normalized;
}

function compareStoredAndAPI(stored: Analysis['stored'], api: Analysis['api']): Analysis['comparison'] {
  // Normalize codes for comparison (remove numeric suffixes)
  const storedNormalized = new Map<string, string>(); // normalized -> original
  stored.courses.forEach(c => {
    const normalized = normalizeForComparison(c.code);
    if (!storedNormalized.has(normalized)) {
      storedNormalized.set(normalized, c.code);
    }
  });
  
  const apiNormalized = new Map<string, string>(); // normalized -> original
  api.courses.forEach(c => {
    const normalized = normalizeForComparison(c.code);
    if (!apiNormalized.has(normalized)) {
      apiNormalized.set(normalized, c.code);
    }
  });
  
  const inStoredNotInAPI: string[] = [];
  const inAPINotInStored: string[] = [];
  const formatMismatches: Array<{ stored: string; api: string; reason: string }> = [];
  const duplicates: string[] = [];

  // Find courses in stored but not in API
  storedNormalized.forEach((original, normalized) => {
    if (!apiNormalized.has(normalized)) {
      inStoredNotInAPI.push(original);
    }
  });

  // Find courses in API but not in stored
  apiNormalized.forEach((original, normalized) => {
    if (!storedNormalized.has(normalized)) {
      inAPINotInStored.push(original);
    } else {
      // Found in both - check for format differences
      const storedOriginal = storedNormalized.get(normalized)!;
      if (storedOriginal !== original) {
        const reasons: string[] = [];
        if (storedOriginal.includes(' ') !== original.includes(' ')) {
          reasons.push('space difference');
        }
        const storedHasDash = storedOriginal.includes('-');
        const apiHasDash = original.includes('-');
        if (storedHasDash !== apiHasDash) {
          reasons.push('dash difference');
        } else if (storedHasDash && apiHasDash) {
          // Both have dashes - check if different suffixes
          const storedSuffix = storedOriginal.match(/-([^-]+)$/)?.[1] || '';
          const apiSuffix = original.match(/-([^-]+)$/)?.[1] || '';
          if (storedSuffix !== apiSuffix) {
            reasons.push(`suffix difference (${storedSuffix} vs ${apiSuffix})`);
          }
        }
        if (reasons.length > 0) {
          formatMismatches.push({
            stored: storedOriginal,
            api: original,
            reason: reasons.join(', ') || 'format difference',
          });
        }
      }
    }
  });

  // Find TRUE duplicates in stored (same exact code appearing multiple times)
  // Note: "EMQAL-1" and "EMQAL-10" are NOT duplicates - they're different courses
  const storedExactCodes = new Map<string, number>();
  stored.courses.forEach(c => {
    const exactCode = c.code; // Use exact code, not normalized
    storedExactCodes.set(exactCode, (storedExactCodes.get(exactCode) || 0) + 1);
  });
  storedExactCodes.forEach((count, exactCode) => {
    if (count > 1) {
      duplicates.push(exactCode); // This is a true duplicate
    }
  });
  
  // Also find codes that would normalize to the same thing (potential issues)
  // But don't flag courses like "EMQAL-1" and "EMQAL-10" as duplicates - they're different
  const normalizedToOriginals = new Map<string, string[]>();
  stored.courses.forEach(c => {
    const normalized = normalizeForComparison(c.code);
    if (!normalizedToOriginals.has(normalized)) {
      normalizedToOriginals.set(normalized, []);
    }
    if (!normalizedToOriginals.get(normalized)!.includes(c.code)) {
      normalizedToOriginals.get(normalized)!.push(c.code);
    }
  });
  
  // Find potential issues: codes that normalize to the same but might be the same course
  // Only flag if they have very similar names or same years
  normalizedToOriginals.forEach((originals, normalized) => {
    if (originals.length > 1) {
      // Check if these might be duplicates by comparing names/years
      const courses = originals.map(orig => stored.courses.find(c => c.code === orig)).filter(Boolean) as StoredCourse[];
      // If they have overlapping years or very similar names, they might be duplicates
      // For now, we'll just note them but not flag as critical duplicates
    }
  });

  return {
    inStoredNotInAPI,
    inAPINotInStored,
    formatMismatches,
    duplicates: Array.from(new Set(duplicates)),
  };
}

function printAnalysis(analysis: Analysis) {
  const { institution, institutionCode, stored, api, comparison } = analysis;

  console.log(`\n${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║           DETAILED ANALYTICS: ${institution.padEnd(40)} ║
╚══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // STORED DATA ANALYSIS
  console.log(`\n${colors.bright}📦 STORED DATA ANALYSIS${colors.reset}`);
  console.log(`${colors.dim}──────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`  Total courses: ${colors.green}${stored.total.toLocaleString()}${colors.reset}`);
  console.log(`  Codes with spaces: ${stored.codesWithSpaces.length > 0 ? colors.red : colors.green}${stored.codesWithSpaces.length}${colors.reset}${stored.codesWithSpaces.length > 0 ? ` ${colors.red}⚠️ CRITICAL${colors.reset}` : ' ✅'}`);
  if (stored.codesWithSpaces.length > 0 && stored.codesWithSpaces.length <= 20) {
    console.log(`    ${colors.yellow}Examples: ${stored.codesWithSpaces.slice(0, 10).join(', ')}${colors.reset}`);
  }
  console.log(`  Codes with dashes: ${colors.cyan}${stored.codesWithDashes.length}${colors.reset} (${((stored.codesWithDashes.length / stored.total) * 100).toFixed(1)}%)`);
  console.log(`  Codes with multiple dashes: ${colors.cyan}${stored.codesWithMultipleDashes.length}${colors.reset}`);
  console.log(`  Codes ending with digit: ${colors.cyan}${stored.codesEndingWithDigit.length}${colors.reset} (${((stored.codesEndingWithDigit.length / stored.total) * 100).toFixed(1)}%)`);

  // Length distribution
  const sortedLengths = Object.entries(stored.lengthDistribution)
    .map(([len, count]) => [parseInt(len), count] as [number, number])
    .sort((a, b) => b[1] - a[1]);
  const avgLength = stored.courses.reduce((sum, c) => sum + c.code.length, 0) / stored.total;
  console.log(`  Average length: ${colors.cyan}${avgLength.toFixed(2)}${colors.reset} chars`);
  console.log(`  Length range: ${colors.cyan}${sortedLengths[sortedLengths.length - 1][0]}-${sortedLengths[0][0]}${colors.reset} chars`);
  console.log(`  Top 5 lengths:`);
  sortedLengths.slice(0, 5).forEach(([len, count]) => {
    const pct = ((count as number / stored.total) * 100).toFixed(1);
    console.log(`    ${len} chars: ${count.toLocaleString()} (${pct}%)`);
  });

  // Prefix distribution
  const sortedPrefixes = Object.entries(stored.prefixDistribution)
    .map(([prefix, count]) => [prefix, count] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  console.log(`  Top 10 prefixes:`);
  sortedPrefixes.slice(0, 10).forEach(([prefix, count]) => {
    const pct = ((count as number / stored.total) * 100).toFixed(1);
    console.log(`    ${prefix}*: ${count.toLocaleString()} (${pct}%)`);
  });

  // Suffix patterns
  const sortedSuffixes = Object.entries(stored.suffixPatterns)
    .map(([suffix, count]) => [suffix, count] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  if (sortedSuffixes.length > 0) {
    console.log(`  Top 10 suffix patterns:`);
    sortedSuffixes.slice(0, 10).forEach(([suffix, count]) => {
      const pct = ((count as number / stored.total) * 100).toFixed(1);
      console.log(`    -${suffix}: ${count.toLocaleString()} (${pct}%)`);
    });
  }

  // API DATA ANALYSIS
  console.log(`\n${colors.bright}🌐 API DATA ANALYSIS (2024)${colors.reset}`);
  console.log(`${colors.dim}──────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`  Total courses returned: ${colors.green}${api.total.toLocaleString()}${colors.reset}`);
  console.log(`  Unique course codes: ${colors.green}${api.uniqueCodes.size.toLocaleString()}${colors.reset}`);
  console.log(`  Codes with spaces: ${api.codesWithSpaces.length > 0 ? colors.red : colors.green}${api.codesWithSpaces.length}${colors.reset}${api.codesWithSpaces.length > 0 ? ` ${colors.red}⚠️ CRITICAL${colors.reset}` : ' ✅'}`);
  if (api.codesWithSpaces.length > 0 && api.codesWithSpaces.length <= 20) {
    console.log(`    ${colors.yellow}Examples: ${api.codesWithSpaces.slice(0, 10).join(', ')}${colors.reset}`);
  }
  console.log(`  Codes with dashes: ${colors.cyan}${api.codesWithDashes.length}${colors.reset} (${((api.codesWithDashes.length / api.total) * 100).toFixed(1)}%)`);
  console.log(`  Codes with multiple dashes: ${colors.cyan}${api.codesWithMultipleDashes.length}${colors.reset}`);

  // Numeric suffix distribution
  const sortedNumericSuffixes = Object.entries(api.numericSuffixDistribution)
    .map(([suffix, count]) => [suffix, count] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  if (sortedNumericSuffixes.length > 0) {
    console.log(`  Numeric suffix distribution:`);
    sortedNumericSuffixes.slice(0, 10).forEach(([suffix, count]) => {
      const pct = ((count as number / api.total) * 100).toFixed(1);
      console.log(`    -${suffix}: ${count.toLocaleString()} (${pct}%)`);
    });
  }

  // Variant suffix distribution
  const sortedVariantSuffixes = Object.entries(api.variantSuffixDistribution)
    .map(([suffix, count]) => [suffix, count] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  if (sortedVariantSuffixes.length > 0) {
    console.log(`  Variant suffix distribution:`);
    sortedVariantSuffixes.slice(0, 10).forEach(([suffix, count]) => {
      const pct = ((count as number / api.total) * 100).toFixed(1);
      console.log(`    -${suffix}: ${count.toLocaleString()} (${pct}%)`);
    });
  }

  // COMPARISON
  console.log(`\n${colors.bright}🔍 COMPARISON: STORED vs API${colors.reset}`);
  console.log(`${colors.dim}──────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`  Courses in stored but NOT in API: ${colors.yellow}${comparison.inStoredNotInAPI.length}${colors.reset}`);
  if (comparison.inStoredNotInAPI.length > 0 && comparison.inStoredNotInAPI.length <= 20) {
    console.log(`    ${colors.yellow}Examples: ${comparison.inStoredNotInAPI.slice(0, 10).join(', ')}${colors.reset}`);
  }
  console.log(`  Courses in API but NOT in stored: ${colors.yellow}${comparison.inAPINotInStored.length}${colors.reset}`);
  if (comparison.inAPINotInStored.length > 0 && comparison.inAPINotInStored.length <= 20) {
    console.log(`    ${colors.yellow}Examples: ${comparison.inAPINotInStored.slice(0, 10).join(', ')}${colors.reset}`);
  }
  console.log(`  Format mismatches: ${colors.yellow}${comparison.formatMismatches.length}${colors.reset}`);
  if (comparison.formatMismatches.length > 0) {
    console.log(`    ${colors.yellow}Sample mismatches:${colors.reset}`);
    const samples = comparison.formatMismatches.slice(0, 10);
    samples.forEach(m => {
      console.log(`      Stored: "${m.stored}" → API: "${m.api}" (${m.reason})`);
    });
    if (comparison.formatMismatches.length > 10) {
      console.log(`      ... and ${comparison.formatMismatches.length - 10} more`);
    }
    // Group by reason
    const byReason = new Map<string, number>();
    comparison.formatMismatches.forEach(m => {
      const reason = m.reason.split(',')[0]; // First reason
      byReason.set(reason, (byReason.get(reason) || 0) + 1);
    });
    if (byReason.size > 0) {
      console.log(`    ${colors.yellow}Mismatch breakdown:${colors.reset}`);
      Array.from(byReason.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([reason, count]) => {
          console.log(`      ${reason}: ${count.toLocaleString()}`);
        });
    }
  }
  console.log(`  Duplicate codes: ${colors.yellow}${comparison.duplicates.length}${colors.reset}`);
  if (comparison.duplicates.length > 0) {
    console.log(`    ${colors.yellow}Duplicate examples:${colors.reset}`);
    comparison.duplicates.slice(0, 10).forEach(dup => {
      const matching = stored.courses.filter(c => normalizeForComparison(c.code) === normalizeForComparison(dup));
      console.log(`      "${dup}": ${matching.length} occurrences`);
      matching.slice(0, 3).forEach(c => {
        console.log(`        - ${c.code}${c.name ? ` (${c.name})` : ''} [years: ${c.years?.join(',') || 'none'}]`);
      });
    });
    if (comparison.duplicates.length > 10) {
      console.log(`      ... and ${comparison.duplicates.length - 10} more`);
    }
  }
  
  // Show specific suffix mismatch examples
  if (comparison.formatMismatches.length > 0) {
    const suffixMismatches = comparison.formatMismatches.filter(m => m.reason.includes('suffix difference'));
    if (suffixMismatches.length > 0) {
      console.log(`\n  ${colors.bright}⚠️  SUFFIX MISMATCH ANALYSIS${colors.reset}`);
      console.log(`    ${colors.yellow}Courses stored with variant suffixes but API shows numeric suffix:${colors.reset}`);
      const grouped = new Map<string, Array<{ stored: string; api: string }>>();
      suffixMismatches.forEach(m => {
        const storedSuffix = m.stored.match(/-([^-]+)$/)?.[1] || '';
        if (!grouped.has(storedSuffix)) {
          grouped.set(storedSuffix, []);
        }
        grouped.get(storedSuffix)!.push({ stored: m.stored, api: m.api });
      });
      
      Array.from(grouped.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .forEach(([suffix, examples]) => {
          console.log(`    ${colors.cyan}Suffix "-${suffix}":${colors.reset} ${examples.length} courses`);
          examples.slice(0, 3).forEach(ex => {
            console.log(`      Stored: "${ex.stored}" → API: "${ex.api}"`);
          });
          if (examples.length > 3) {
            console.log(`      ... and ${examples.length - 3} more`);
          }
        });
    }
  }
  
  // Check for missing courses from API
  if (comparison.inAPINotInStored.length > 0) {
    console.log(`\n  ${colors.bright}🔍 MISSING COURSES ANALYSIS${colors.reset}`);
    console.log(`    ${colors.yellow}Sample of courses in API but not in stored data:${colors.reset}`);
    const sample = comparison.inAPINotInStored.slice(0, 20);
    const withSpaces = sample.filter(c => c.includes(' '));
    if (withSpaces.length > 0) {
      console.log(`    ${colors.red}⚠️  Courses with spaces in API:${colors.reset}`);
      withSpaces.forEach(c => console.log(`      "${c}"`));
    }
    const sampleWithoutSpaces = sample.filter(c => !c.includes(' ')).slice(0, 10);
    if (sampleWithoutSpaces.length > 0) {
      console.log(`    ${colors.yellow}Other examples:${colors.reset}`);
      sampleWithoutSpaces.forEach(c => console.log(`      "${c}"`));
    }
  }

  // Pipeline analysis
  console.log(`\n${colors.bright}⚙️  PIPELINE ANALYSIS${colors.reset}`);
  console.log(`${colors.dim}──────────────────────────────────────────────────────────────────────${colors.reset}`);
  const normalizedStored = new Set(stored.courses.map(c => normalizeForComparison(c.code)));
  const normalizedAPI = new Set(api.courses.map(c => normalizeForComparison(c.code)));
  const overlap = Array.from(normalizedAPI).filter(code => normalizedStored.has(code)).length;
  const coverage = ((overlap / normalizedAPI.size) * 100).toFixed(1);
  const storedOnly = normalizedStored.size - overlap;
  const apiOnly = normalizedAPI.size - overlap;
  console.log(`  API coverage: ${colors.green}${coverage}%${colors.reset} (${overlap.toLocaleString()} / ${normalizedAPI.size.toLocaleString()} unique API codes)`);
  console.log(`  Stored codes only: ${colors.yellow}${storedOnly.toLocaleString()}${colors.reset}`);
  console.log(`  API codes only: ${colors.yellow}${apiOnly.toLocaleString()}${colors.reset}`);
  console.log(`  Normalization check: ${stored.codesWithSpaces.length === 0 ? colors.green + '✅ All codes normalized' : colors.red + '⚠️ Found spaces' + colors.reset}`);
  
  console.log(`\n${colors.green}${colors.bright}✅ Analysis complete!${colors.reset}\n`);
}

async function main() {
  const institution = process.argv[2];
  
  if (!institution) {
    console.error(`${colors.red}Error: Please provide an institution abbreviation${colors.reset}`);
    console.log(`${colors.dim}Usage: npm run analyze-detailed <institution>${colors.reset}`);
    console.log(`${colors.dim}Example: npm run analyze-detailed UiB${colors.reset}`);
    console.log(`\n${colors.dim}Available institutions: ${Object.keys(INSTITUTION_DATA_FILES).join(', ')}${colors.reset}`);
    process.exit(1);
  }

  const dataFile = INSTITUTION_DATA_FILES[institution];
  if (!dataFile) {
    console.error(`${colors.red}Error: Unknown institution: ${institution}${colors.reset}`);
    console.log(`${colors.dim}Available institutions: ${Object.keys(INSTITUTION_DATA_FILES).join(', ')}${colors.reset}`);
    process.exit(1);
  }

  const uni = UNIVERSITIES[institution];
  if (!uni) {
    console.error(`${colors.red}Error: No university mapping found for: ${institution}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.cyan}${colors.bright}Analyzing ${institution} (${uni.name})...${colors.reset}`);
  console.log(`${colors.dim}Institution code: ${dataFile.code}${colors.reset}\n`);

  try {
    // Load stored courses
    console.log(`${colors.dim}Loading stored courses...${colors.reset}`);
    const storedCourses = loadStoredCourses(institution);
    
    // Fetch API courses
    const apiCourses = await fetchAPICourses(dataFile.code, 2024);
    
    // Analyze
    const storedAnalysis = analyzeStoredCourses(storedCourses);
    const apiAnalysis = analyzeAPICourses(apiCourses);
    const comparison = compareStoredAndAPI(storedAnalysis, apiAnalysis);
    
    const analysis: Analysis = {
      institution,
      institutionCode: dataFile.code,
      stored: storedAnalysis,
      api: apiAnalysis,
      comparison,
    };
    
    // Print results
    printAnalysis(analysis);
    
  } catch (error: any) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    if (error.stack) {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
    process.exit(1);
  }
}

main();

