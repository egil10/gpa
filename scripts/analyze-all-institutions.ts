/**
 * Comprehensive analysis script for ALL institution data files
 * Runs detailed analysis across all institutions and aggregates critical issues
 * Usage: npm run analyze-all-institutions
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';
import { getAllCoursesForInstitution } from '../lib/hierarchy-discovery';
import { normalizeCourseCodeForStorage } from './utils/export-format';

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

interface InstitutionSummary {
  name: string;
  code: string;
  storedCount: number;
  apiCount: number;
  codesWithSpaces: number;
  duplicates: number;
  missingInStored: number;
  missingInAPI: number;
  formatMismatches: number;
  criticalIssues: string[];
}

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
}

interface InstitutionAnalysis {
  institution: string;
  institutionCode: string;
  stored: {
    total: number;
    courses: StoredCourse[];
    codesWithSpaces: string[];
  };
  api: {
    total: number;
    courses: APICourse[];
    codesWithSpaces: string[];
  };
  comparison: {
    inStoredNotInAPI: string[];
    inAPINotInStored: string[];
    formatMismatches: Array<{ stored: string; api: string; reason: string }>;
    duplicates: string[];
  };
}

function normalizeForComparison(code: string): string {
  let normalized = code.replace(/\s/g, '').trim().toUpperCase();
  normalized = normalized.replace(/-[0-9]+$/, '');
  return normalized;
}

function loadStoredCourses(institution: string): StoredCourse[] {
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const fileName = `${institution.toLowerCase()}-all-courses.json`;
  const filePath = path.join(dataDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return (data.courses || []).map((c: any) => ({
      code: c.c || c.courseCode || '',
      name: c.n || c.courseName,
      years: c.y || c.years || [],
      students: c.s || c.students,
    })).filter((c: StoredCourse) => c.code);
  } catch (error) {
    console.error(`Error loading ${fileName}:`, error);
    return [];
  }
}

async function fetchAPICourses(institutionCode: string, year: number = 2024): Promise<APICourse[]> {
  try {
    const courses = await getAllCoursesForInstitution(institutionCode, year);
    return courses.map(course => {
      const normalized = normalizeCourseCodeForStorage(course.courseCode.replace(/-[0-9]+$/, ''));
      return {
        code: course.courseCode,
        normalized,
        hasSpaces: course.courseCode.includes(' '),
      };
    });
  } catch (error) {
    console.error(`Error fetching API courses for ${institutionCode}:`, error);
    return [];
  }
}

function compareStoredAndAPI(stored: StoredCourse[], api: APICourse[]): InstitutionAnalysis['comparison'] {
  const storedNormalized = new Map<string, string>();
  stored.forEach(c => {
    const normalized = normalizeForComparison(c.code);
    if (!storedNormalized.has(normalized)) {
      storedNormalized.set(normalized, c.code);
    }
  });
  
  const apiNormalized = new Map<string, string>();
  api.forEach(c => {
    const normalized = normalizeForComparison(c.code);
    if (!apiNormalized.has(normalized)) {
      apiNormalized.set(normalized, c.code);
    }
  });
  
  const inStoredNotInAPI: string[] = [];
  const inAPINotInStored: string[] = [];
  const formatMismatches: Array<{ stored: string; api: string; reason: string }> = [];
  
  storedNormalized.forEach((original, normalized) => {
    if (!apiNormalized.has(normalized)) {
      inStoredNotInAPI.push(original);
    } else {
      const apiOriginal = apiNormalized.get(normalized)!;
      if (apiOriginal !== original) {
        const reasons: string[] = [];
        if (original.includes(' ') !== apiOriginal.includes(' ')) {
          reasons.push('space difference');
        }
        if (original.includes('-') !== apiOriginal.includes('-')) {
          reasons.push('dash difference');
        }
        if (reasons.length > 0) {
          formatMismatches.push({
            stored: original,
            api: apiOriginal,
            reason: reasons.join(', '),
          });
        }
      }
    }
  });
  
  apiNormalized.forEach((original, normalized) => {
    if (!storedNormalized.has(normalized)) {
      inAPINotInStored.push(original);
    }
  });
  
  // Find true duplicates (same exact code)
  const exactCodes = new Map<string, number>();
  stored.forEach(c => {
    exactCodes.set(c.code, (exactCodes.get(c.code) || 0) + 1);
  });
  const duplicates = Array.from(exactCodes.entries())
    .filter(([_, count]) => count > 1)
    .map(([code]) => code);
  
  return {
    inStoredNotInAPI,
    inAPINotInStored,
    formatMismatches,
    duplicates: Array.from(new Set(duplicates)),
  };
}

async function analyzeInstitution(institution: string, institutionCode: string): Promise<InstitutionAnalysis | null> {
  try {
    const storedCourses = loadStoredCourses(institution);
    const apiCourses = await fetchAPICourses(institutionCode);
    
    const storedCodesWithSpaces = storedCourses.filter(c => c.code.includes(' ')).map(c => c.code);
    const apiCodesWithSpaces = apiCourses.filter(c => c.hasSpaces).map(c => c.code);
    
    const comparison = compareStoredAndAPI(storedCourses, apiCourses);
    
    return {
      institution,
      institutionCode,
      stored: {
        total: storedCourses.length,
        courses: storedCourses,
        codesWithSpaces: storedCodesWithSpaces,
      },
      api: {
        total: apiCourses.length,
        courses: apiCourses,
        codesWithSpaces: apiCodesWithSpaces,
      },
      comparison,
    };
  } catch (error) {
    console.error(`Error analyzing ${institution}:`, error);
    return null;
  }
}

function createSummary(analysis: InstitutionAnalysis): InstitutionSummary {
  const criticalIssues: string[] = [];
  
  if (analysis.stored.codesWithSpaces.length > 0) {
    criticalIssues.push(`${analysis.stored.codesWithSpaces.length} stored codes with spaces`);
  }
  
  if (analysis.comparison.duplicates.length > 0) {
    criticalIssues.push(`${analysis.comparison.duplicates.length} duplicate codes`);
  }
  
  if (analysis.api.codesWithSpaces.length > 0) {
    criticalIssues.push(`${analysis.api.codesWithSpaces.length} API codes with spaces (need normalization)`);
  }
  
  if (analysis.comparison.inAPINotInStored.length > analysis.stored.total * 0.5) {
    criticalIssues.push(`Many missing courses (${analysis.comparison.inAPINotInStored.length} not in stored)`);
  }
  
  return {
    name: analysis.institution,
    code: analysis.institutionCode,
    storedCount: analysis.stored.total,
    apiCount: analysis.api.total,
    codesWithSpaces: analysis.stored.codesWithSpaces.length,
    duplicates: analysis.comparison.duplicates.length,
    missingInStored: analysis.comparison.inAPINotInStored.length,
    missingInAPI: analysis.comparison.inStoredNotInAPI.length,
    formatMismatches: analysis.comparison.formatMismatches.length,
    criticalIssues,
  };
}

function printSummary(summaries: InstitutionSummary[]) {
  console.log(`\n${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                   COMPREHENSIVE INSTITUTION ANALYSIS SUMMARY                      ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Sort by critical issues first
  summaries.sort((a, b) => {
    if (a.criticalIssues.length !== b.criticalIssues.length) {
      return b.criticalIssues.length - a.criticalIssues.length;
    }
    if (a.codesWithSpaces !== b.codesWithSpaces) {
      return b.codesWithSpaces - a.codesWithSpaces;
    }
    if (a.duplicates !== b.duplicates) {
      return b.duplicates - a.duplicates;
    }
    return b.storedCount - a.storedCount;
  });

  // Print table header
  console.log(`\n${colors.bright}Institution Data Overview:${colors.reset}\n`);
  console.log(`${colors.dim}${'Institution'.padEnd(15)} | Stored |  API  | Spaces | Dups | Missing | Issues${colors.reset}`);
  console.log(`${colors.dim}${'-'.repeat(70)}${colors.reset}`);
  
  let totalStored = 0;
  let totalAPI = 0;
  let totalSpaces = 0;
  let totalDuplicates = 0;
  let totalMissing = 0;
  let institutionsWithIssues = 0;

  summaries.forEach(summary => {
    totalStored += summary.storedCount;
    totalAPI += summary.apiCount;
    totalSpaces += summary.codesWithSpaces;
    totalDuplicates += summary.duplicates;
    totalMissing += summary.missingInStored;
    
    if (summary.criticalIssues.length > 0) {
      institutionsWithIssues++;
    }
    
    const spacesColor = summary.codesWithSpaces > 0 ? colors.red : colors.green;
    const dupsColor = summary.duplicates > 0 ? colors.yellow : colors.green;
    const missingColor = summary.missingInStored > summary.storedCount * 0.5 ? colors.yellow : colors.cyan;
    
    const name = summary.name.padEnd(15).substring(0, 15);
    const stored = summary.storedCount.toString().padStart(6);
    const api = summary.apiCount.toString().padStart(5);
    const spaces = `${spacesColor}${summary.codesWithSpaces.toString().padStart(6)}${colors.reset}`;
    const dups = `${dupsColor}${summary.duplicates.toString().padStart(4)}${colors.reset}`;
    const missing = `${missingColor}${summary.missingInStored.toString().padStart(7)}${colors.reset}`;
    const issueCount = summary.criticalIssues.length > 0 ? `${colors.red}${summary.criticalIssues.length}${colors.reset}` : `${colors.green}0${colors.reset}`;
    
    console.log(`${name} | ${stored} | ${api} | ${spaces} | ${dups} | ${missing} | ${issueCount}`);
  });

  console.log(`${colors.dim}${'-'.repeat(70)}${colors.reset}`);
  console.log(`${'TOTAL'.padEnd(15)} | ${totalStored.toString().padStart(6)} | ${totalAPI.toString().padStart(5)} | ${totalSpaces.toString().padStart(6)} | ${totalDuplicates.toString().padStart(4)} | ${totalMissing.toString().padStart(7)} | ${institutionsWithIssues}`);
  
  // Critical issues section
  const institutionsWithCriticalIssues = summaries.filter(s => s.criticalIssues.length > 0);
  if (institutionsWithCriticalIssues.length > 0) {
    console.log(`\n${colors.bright}${colors.red}⚠️  CRITICAL ISSUES FOUND:${colors.reset}\n`);
    institutionsWithCriticalIssues.forEach(summary => {
      console.log(`${colors.red}${summary.name}${colors.reset} (${summary.code}):`);
      summary.criticalIssues.forEach(issue => {
        console.log(`  ${colors.yellow}• ${issue}${colors.reset}`);
      });
      
      if (summary.codesWithSpaces > 0 && summary.codesWithSpaces <= 10) {
        const stored = loadStoredCourses(summary.name);
        const withSpaces = stored.filter(c => c.code.includes(' ')).slice(0, 5);
        console.log(`    ${colors.dim}Examples: ${withSpaces.map(c => `"${c.code}"`).join(', ')}${colors.reset}`);
      }
      
      if (summary.duplicates > 0 && summary.duplicates <= 10) {
        console.log(`    ${colors.dim}Duplicate codes: ${summary.criticalIssues.find(i => i.includes('duplicate'))}${colors.reset}`);
      }
      
      console.log();
    });
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ No critical issues found! All institutions are properly normalized.${colors.reset}\n`);
  }
  
  // Summary statistics
  console.log(`\n${colors.bright}Summary Statistics:${colors.reset}`);
  console.log(`  Total institutions analyzed: ${summaries.length}`);
  console.log(`  Total stored courses: ${totalStored.toLocaleString()}`);
  console.log(`  Total API courses (2024): ${totalAPI.toLocaleString()}`);
  console.log(`  Institutions with issues: ${colors.yellow}${institutionsWithIssues}${colors.reset} / ${summaries.length}`);
  console.log(`  Total codes with spaces: ${totalSpaces > 0 ? colors.red : colors.green}${totalSpaces}${colors.reset}`);
  console.log(`  Total duplicates: ${totalDuplicates > 0 ? colors.yellow : colors.green}${totalDuplicates}${colors.reset}`);
  console.log(`  Total missing from stored: ${colors.cyan}${totalMissing}${colors.reset}\n`);
}

function generateMarkdownReport(summaries: InstitutionSummary[], analyses: InstitutionAnalysis[]): string {
  const timestamp = new Date().toISOString();
  const institutionsWithIssues = summaries.filter(s => s.criticalIssues.length > 0);
  
  let md = `# Comprehensive Institution Analysis Report

**Generated:** ${timestamp}

## Summary

- **Total Institutions:** ${summaries.length}
- **Total Stored Courses:** ${summaries.reduce((sum, s) => sum + s.storedCount, 0).toLocaleString()}
- **Total API Courses (2024):** ${summaries.reduce((sum, s) => sum + s.apiCount, 0).toLocaleString()}
- **Institutions with Issues:** ${institutionsWithIssues.length} / ${summaries.length}
- **Total Codes with Spaces:** ${summaries.reduce((sum, s) => sum + s.codesWithSpaces, 0)}
- **Total Duplicates:** ${summaries.reduce((sum, s) => sum + s.duplicates, 0)}
- **Total Missing from Stored:** ${summaries.reduce((sum, s) => sum + s.missingInStored, 0)}

## Institution Overview

| Institution | Stored | API | Spaces | Dups | Missing | Issues |
|------------|--------|-----|--------|------|---------|--------|
`;

  summaries.forEach(summary => {
    const issues = summary.criticalIssues.length > 0 ? `⚠️ ${summary.criticalIssues.length}` : '✅ 0';
    md += `| ${summary.name} | ${summary.storedCount.toLocaleString()} | ${summary.apiCount.toLocaleString()} | ${summary.codesWithSpaces} | ${summary.duplicates} | ${summary.missingInStored} | ${issues} |\n`;
  });

  if (institutionsWithIssues.length > 0) {
    md += `\n## Critical Issues\n\n`;
    institutionsWithIssues.forEach(summary => {
      md += `### ${summary.name} (${summary.code})\n\n`;
      summary.criticalIssues.forEach(issue => {
        md += `- ⚠️ ${issue}\n`;
      });
      md += '\n';
    });
  } else {
    md += `\n## Status\n\n✅ **All institutions are properly normalized!** No critical issues found.\n\n`;
  }

  md += `\n## Details\n\n`;

  summaries.forEach(summary => {
    md += `### ${summary.name}\n\n`;
    md += `- **Stored Courses:** ${summary.storedCount.toLocaleString()}\n`;
    md += `- **API Courses (2024):** ${summary.apiCount.toLocaleString()}\n`;
    md += `- **Codes with Spaces:** ${summary.codesWithSpaces}\n`;
    md += `- **Duplicates:** ${summary.duplicates}\n`;
    md += `- **Missing in Stored:** ${summary.missingInStored}\n`;
    md += `- **Missing in API:** ${summary.missingInAPI}\n`;
    md += `- **Format Mismatches:** ${summary.formatMismatches}\n\n`;
  });

  return md;
}

async function main() {
  console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                  COMPREHENSIVE INSTITUTION DATA ANALYSIS                          ║
║                     Analyzing all institution data files                          ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  // Use INSTITUTION_DATA_FILES to get all institutions
  const analyses: InstitutionAnalysis[] = [];
  const summaries: InstitutionSummary[] = [];
  
  const institutions = Object.entries(INSTITUTION_DATA_FILES);
  console.log(`Found ${institutions.length} institution data files to analyze...\n`);
  
  for (let i = 0; i < institutions.length; i++) {
    const [name, data] = institutions[i];
    const fileBase = data.file.replace('-all-courses.json', '');
    
    process.stdout.write(`[${i + 1}/${institutions.length}] Analyzing ${name}... `);
    
    try {
      const analysis = await analyzeInstitution(fileBase, data.code);
      if (analysis) {
        analyses.push(analysis);
        const summary = createSummary(analysis);
        summaries.push(summary);
        
        const status = summary.criticalIssues.length > 0 
          ? `${colors.yellow}⚠️  ${summary.criticalIssues.length} issues${colors.reset}`
          : `${colors.green}✓ OK${colors.reset}`;
        console.log(status);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`${colors.red}✗ Failed${colors.reset}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    }
  }
  
  // Print comprehensive summary
  printSummary(summaries);
  
  // Save detailed JSON report to docs
  const jsonReportPath = path.join(process.cwd(), 'docs', 'institution-analysis-report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    institutions: summaries,
    detailedAnalyses: analyses.map(a => ({
      institution: a.institution,
      storedCount: a.stored.total,
      apiCount: a.api.total,
      codesWithSpaces: a.stored.codesWithSpaces,
      duplicates: a.comparison.duplicates,
      missingInStored: a.comparison.inAPINotInStored.slice(0, 20), // Limit for file size
      missingInAPI: a.comparison.inStoredNotInAPI.slice(0, 20),
    })),
  };
  
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
  console.log(`${colors.cyan}JSON report saved to: ${jsonReportPath}${colors.reset}`);

  // Generate and save markdown report to analytics folder
  const analyticsDir = path.join(process.cwd(), 'analytics');
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const markdownReport = generateMarkdownReport(summaries, analyses);
  const mdReportPath = path.join(analyticsDir, 'institution-analysis-report.md');
  fs.writeFileSync(mdReportPath, markdownReport);
  console.log(`${colors.cyan}Markdown report saved to: ${mdReportPath}${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

