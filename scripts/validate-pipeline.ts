/**
 * Final validation script for the pipeline
 * Validates all data files, checks for issues, and generates a final status report
 */

import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
};

interface ValidationResult {
  institution: string;
  dataFile: boolean;
  publicFile: boolean;
  courses: number;
  hasSpaces: boolean;
  hasDuplicates: boolean;
  issues: string[];
}

function validateInstitution(institution: string, dataFile: { file: string; code: string }): ValidationResult {
  const result: ValidationResult = {
    institution,
    dataFile: false,
    publicFile: false,
    courses: 0,
    hasSpaces: false,
    hasDuplicates: false,
    issues: [],
  };

  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const publicDir = path.join(process.cwd(), 'public', 'data', 'institutions');
  const dataPath = path.join(dataDir, dataFile.file);
  const publicPath = path.join(publicDir, dataFile.file);

  // Check if files exist
  result.dataFile = fs.existsSync(dataPath);
  result.publicFile = fs.existsSync(publicPath);

  if (!result.dataFile) {
    result.issues.push('Data file missing');
    return result;
  }

  try {
    const content = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(content);
    result.courses = data.courses?.length || 0;

    // Check for spaces in course codes
    const codesWithSpaces = data.courses?.filter((c: any) => c.c && c.c.includes(' ')) || [];
    if (codesWithSpaces.length > 0) {
      result.hasSpaces = true;
      result.issues.push(`${codesWithSpaces.length} course codes with spaces`);
    }

    // Check for duplicates
    const codeMap = new Map<string, number>();
    data.courses?.forEach((c: any) => {
      if (c.c) {
        codeMap.set(c.c, (codeMap.get(c.c) || 0) + 1);
      }
    });
    const duplicates = Array.from(codeMap.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      result.hasDuplicates = true;
      result.issues.push(`${duplicates.length} duplicate course codes`);
    }

    // Check if public file matches
    if (result.publicFile) {
      try {
        const publicContent = fs.readFileSync(publicPath, 'utf8');
        const publicData = JSON.parse(publicContent);
        if (publicData.courses?.length !== result.courses) {
          result.issues.push(`Public file course count mismatch (${publicData.courses?.length || 0} vs ${result.courses})`);
        }
      } catch (e) {
        result.issues.push('Public file is invalid JSON');
      }
    } else {
      result.issues.push('Public file missing');
    }

  } catch (e) {
    result.issues.push(`Error reading file: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}

async function main() {
  console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║              Pipeline Validation & Status Check            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results: ValidationResult[] = [];
  let totalIssues = 0;

  for (const [institution, dataFile] of Object.entries(INSTITUTION_DATA_FILES)) {
    const result = validateInstitution(institution, dataFile);
    results.push(result);
    if (result.issues.length > 0) {
      totalIssues += result.issues.length;
    }
  }

  // Print results
  const institutionsWithIssues = results.filter(r => r.issues.length > 0);
  const institutionsOK = results.filter(r => r.issues.length === 0 && r.dataFile && r.publicFile);

  console.log(`\n${colors.bright}Validation Results:${colors.reset}\n`);
  
  if (institutionsOK.length > 0) {
    console.log(`${colors.green}✅ Validated successfully (${institutionsOK.length}):${colors.reset}`);
    institutionsOK.forEach(r => {
      console.log(`   ${colors.green}✓${colors.reset} ${r.institution.padEnd(10)} - ${r.courses.toLocaleString().padStart(5)} courses`);
    });
    console.log();
  }

  if (institutionsWithIssues.length > 0) {
    console.log(`${colors.yellow}⚠️  Issues found (${institutionsWithIssues.length}):${colors.reset}`);
    institutionsWithIssues.forEach(r => {
      console.log(`   ${colors.yellow}⚠${colors.reset} ${r.institution.padEnd(10)} - ${r.issues.join(', ')}`);
    });
    console.log();
  }

  const totalCourses = results.reduce((sum, r) => sum + r.courses, 0);
  const dataFiles = results.filter(r => r.dataFile).length;
  const publicFiles = results.filter(r => r.publicFile).length;

  console.log(`${colors.cyan}${colors.bright}Summary:${colors.reset}`);
  console.log(`  Total institutions: ${results.length}`);
  console.log(`  Data files present: ${colors.green}${dataFiles}${colors.reset}/${results.length}`);
  console.log(`  Public files present: ${colors.green}${publicFiles}${colors.reset}/${results.length}`);
  console.log(`  Total courses: ${colors.cyan}${totalCourses.toLocaleString()}${colors.reset}`);
  console.log(`  Total issues: ${totalIssues > 0 ? colors.red : colors.green}${totalIssues}${colors.reset}`);

  if (totalIssues === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ All validations passed! Pipeline is ready for deployment.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  Some issues found. Please review before deploying.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

