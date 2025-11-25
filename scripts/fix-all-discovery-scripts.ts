/**
 * Script to update all discovery scripts to use normalizeCourseCodeForStorage
 * Ensures all scripts properly normalize spaces in course codes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
};

async function fixDiscoveryScripts() {
  console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║     Fix Discovery Scripts - Space Normalization            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const scriptsDir = path.join(process.cwd(), 'scripts');
  const discoveryScripts = glob.sync('discover-*-courses.ts', { cwd: scriptsDir });

  let updated = 0;
  let alreadyFixed = 0;
  let errors = 0;

  for (const script of discoveryScripts) {
    const scriptPath = path.join(scriptsDir, script);
    let content = fs.readFileSync(scriptPath, 'utf8');

    // Check if already uses normalizeCourseCodeForStorage
    if (content.includes('normalizeCourseCodeForStorage')) {
      console.log(`${colors.dim}✓ ${script} already uses normalizeCourseCodeForStorage${colors.reset}`);
      alreadyFixed++;
      continue;
    }

    // Check if it has the old pattern that needs fixing
    if (!content.includes('baseCode') || !content.includes('.replace')) {
      console.log(`${colors.dim}⊘ ${script} doesn't match pattern (maybe already fixed or different structure)${colors.reset}`);
      continue;
    }

    try {
      let modified = false;

      // Add import if not present
      if (!content.includes('normalizeCourseCodeForStorage')) {
        const importLine = content.match(/from ['"]\.\.\/lib\/hierarchy-discovery['"];?/);
        if (importLine) {
          content = content.replace(
            /from ['"]\.\.\/lib\/hierarchy-discovery['"];?/,
            `from '../lib/hierarchy-discovery';\nimport { normalizeCourseCodeForStorage } from './utils/export-format';`
          );
        } else {
          // Try to find export-format import and add it there
          const exportFormatMatch = content.match(/from ['"]\.\.\/utils\/export-format['"]/);
          if (exportFormatMatch && !content.includes('normalizeCourseCodeForStorage')) {
            content = content.replace(
              /from ['"]\.\.\/utils\/export-format['"]/,
              `from './utils/export-format'`
            );
            const utilsImport = content.match(/import.*from ['"]\.\.\/utils\/export-format['"]/);
            if (utilsImport && !utilsImport[0].includes('normalizeCourseCodeForStorage')) {
              content = content.replace(
                /(import\s+\{[^}]+)\}\s+from\s+['"]\.\/utils\/export-format['"]/,
                `$1, normalizeCourseCodeForStorage } from './utils/export-format'`
              );
            }
          } else if (!exportFormatMatch) {
            // Add new import line after hierarchy-discovery
            content = content.replace(
              /(import\s+.*hierarchy-discovery.*\n)/,
              `$1import { normalizeCourseCodeForStorage } from './utils/export-format';\n`
            );
          }
        }
        modified = true;
      }

      // Replace old patterns with normalizeCourseCodeForStorage
      // Pattern 1: course.courseCode.replace(/-1$/, '')
      if (content.includes("replace(/-1$/, '')")) {
        content = content.replace(
          /const\s+baseCode\s*=\s*course\.courseCode\.replace\(\/-1\$\/, ''\);/g,
          `const baseCode = normalizeCourseCodeForStorage(course.courseCode.replace(/-[0-9]+$/, ''));`
        );
        modified = true;
      }

      // Pattern 2: course.courseCode.replace(/-[0-9]+$/, '') without normalization
      if (content.includes("courseCode.replace(/-[0-9]+$/, '')") && !content.includes("normalizeCourseCodeForStorage(course.courseCode")) {
        content = content.replace(
          /const\s+baseCode\s*=\s*course\.courseCode\.replace\(\/-\[0-9\]\+\$\/, ''\);/g,
          `const baseCode = normalizeCourseCodeForStorage(course.courseCode.replace(/-[0-9]+$/, ''));`
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(scriptPath, content, 'utf8');
        console.log(`${colors.green}✓ Updated: ${script}${colors.reset}`);
        updated++;
      } else {
        console.log(`${colors.dim}⊘ ${script} - No changes needed${colors.reset}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}✗ Error updating ${script}: ${error.message}${colors.reset}`);
      errors++;
    }
  }

  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Updated: ${colors.green}${updated}${colors.reset}`);
  console.log(`  Already fixed: ${colors.dim}${alreadyFixed}${colors.reset}`);
  console.log(`  Errors: ${errors > 0 ? colors.red : colors.green}${errors}${colors.reset}\n`);
}

fixDiscoveryScripts().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

