/**
 * Course Code Analysis Script
 * Analyzes course codes in data/institutions/ and public/data/institutions/
 * Generates statistics and identifies potential issues
 */

import * as fs from 'fs';
import * as path from 'path';

interface CourseCodeStats {
  code: string;
  length: number;
  endsWithDigit: boolean;
  endsWithDash: boolean;
  hasDash: boolean;
  hasSpace: boolean;
  spaceCount: number;
  suffix: string;
  institution: string;
}

interface InstitutionAnalysis {
  institution: string;
  file: string;
  totalCourses: number;
  codes: CourseCodeStats[];
  lengthDistribution: Record<number, number>;
  suffixPatterns: Record<string, number>;
  codesEndingWithDigit: number;
  codesEndingWithEachDigit: Record<string, number>; // 0-9 counts
  codesWithDash: number;
  codesWithMultipleDashes: number;
  dashCountDistribution: Record<number, number>; // How many dashes per code
  codesWithSpace: number;
  spaceCountDistribution: Record<number, number>; // How many spaces per code
  averageLength: number;
  minLength: number;
  maxLength: number;
  potentialIssues: string[];
  formatIssues: {
    biNonOneEndings: string[];
    codesEndingWithDash: string[];
    codesWithSpace: string[];
    veryShortCodes: string[];
    veryLongCodes: string[];
    unusualPatterns: string[];
  };
}

interface ComparisonResult {
  institution: string;
  dataDir: InstitutionAnalysis | null;
  publicDir: InstitutionAnalysis | null;
  differences: {
    missingInPublic: string[];
    missingInData: string[];
    countDifference: number;
  };
}

function loadInstitutionFile(filePath: string): { institutionCode: string; courses: Array<{ c: string; n?: string; y?: number[]; s?: number }> } | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Handle both optimized and legacy formats
    if (data.courses && Array.isArray(data.courses)) {
      return {
        institutionCode: data.i || data.institutionCode || '',
        courses: data.courses,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

function analyzeCourseCode(code: string, institution: string): CourseCodeStats {
  const length = code.length;
  const endsWithDigit = /\d$/.test(code);
  const endsWithDash = code.endsWith('-');
  const hasDash = code.includes('-');
  const hasSpace = code.includes(' ');
  const spaceCount = (code.match(/ /g) || []).length;
  
  // Extract suffix (last part after dash, or last character if no dash)
  let suffix = '';
  if (hasDash) {
    const parts = code.split('-');
    suffix = parts[parts.length - 1] || '';
  } else {
    // Check if ends with digit(s) - might be a suffix
    const match = code.match(/(\d+)$/);
    if (match) {
      suffix = match[1];
    }
  }
  
  return {
    code,
    length,
    endsWithDigit,
    endsWithDash,
    hasDash,
    hasSpace,
    spaceCount,
    suffix,
    institution,
  };
}

function analyzeInstitution(filePath: string, institution: string): InstitutionAnalysis | null {
  const data = loadInstitutionFile(filePath);
  if (!data || !data.courses) {
    return null;
  }
  
  const codes = data.courses
    .map(course => course.c)
    .filter(code => code && typeof code === 'string')
    .map(code => analyzeCourseCode(code, institution));
  
  if (codes.length === 0) {
    return null;
  }
  
  // Calculate statistics
  const lengthDistribution: Record<number, number> = {};
  const suffixPatterns: Record<string, number> = {};
  const codesEndingWithEachDigit: Record<string, number> = {};
  const dashCountDistribution: Record<number, number> = {};
  const spaceCountDistribution: Record<number, number> = {};
  let codesEndingWithDigit = 0;
  let codesWithDash = 0;
  let codesWithMultipleDashes = 0;
  let codesWithSpace = 0;
  let totalLength = 0;
  let minLength = Infinity;
  let maxLength = 0;
  const potentialIssues: string[] = [];
  
  // Format-specific issue tracking
  const formatIssues = {
    biNonOneEndings: [] as string[],
    codesEndingWithDash: [] as string[],
    codesWithSpace: [] as string[],
    veryShortCodes: [] as string[],
    veryLongCodes: [] as string[],
    unusualPatterns: [] as string[],
  };
  
  codes.forEach(stat => {
    // Length distribution
    lengthDistribution[stat.length] = (lengthDistribution[stat.length] || 0) + 1;
    totalLength += stat.length;
    minLength = Math.min(minLength, stat.length);
    maxLength = Math.max(maxLength, stat.length);
    
    // Suffix patterns
    if (stat.suffix) {
      suffixPatterns[stat.suffix] = (suffixPatterns[stat.suffix] || 0) + 1;
    }
    
    // Count patterns
    if (stat.endsWithDigit) {
      codesEndingWithDigit++;
      // Track which digit it ends with
      const lastChar = stat.code[stat.code.length - 1];
      if (/\d/.test(lastChar)) {
        codesEndingWithEachDigit[lastChar] = (codesEndingWithEachDigit[lastChar] || 0) + 1;
      }
    }
    
    // Dash analysis
    if (stat.hasDash) {
      codesWithDash++;
      const dashCount = (stat.code.match(/-/g) || []).length;
      dashCountDistribution[dashCount] = (dashCountDistribution[dashCount] || 0) + 1;
      if (dashCount > 1) {
        codesWithMultipleDashes++;
      }
    } else {
      dashCountDistribution[0] = (dashCountDistribution[0] || 0) + 1;
    }
    
    // Space analysis
    if (stat.hasSpace) {
      codesWithSpace++;
      spaceCountDistribution[stat.spaceCount] = (spaceCountDistribution[stat.spaceCount] || 0) + 1;
      potentialIssues.push(`Code contains space: "${stat.code}" (${stat.spaceCount} space(s))`);
      formatIssues.codesWithSpace.push(stat.code);
    } else {
      spaceCountDistribution[0] = (spaceCountDistribution[0] || 0) + 1;
    }
    
    // Potential issues - detailed tracking
    if (stat.endsWithDash) {
      potentialIssues.push(`Code ends with dash: ${stat.code}`);
      formatIssues.codesEndingWithDash.push(stat.code);
    }
    if (stat.length < 3) {
      potentialIssues.push(`Very short code: ${stat.code} (${stat.length} chars)`);
      formatIssues.veryShortCodes.push(stat.code);
    }
    if (stat.length > 20) {
      potentialIssues.push(`Very long code: ${stat.code} (${stat.length} chars)`);
      formatIssues.veryLongCodes.push(stat.code);
    }
    
    // Unusual patterns
    if (stat.code.match(/^\d/)) {
      formatIssues.unusualPatterns.push(`Starts with digit: ${stat.code}`);
    }
    if (stat.code.match(/[^A-Z0-9- ]/)) {
      formatIssues.unusualPatterns.push(`Contains special chars: ${stat.code}`);
    }
    if (stat.code.includes('--')) {
      formatIssues.unusualPatterns.push(`Double dash: ${stat.code}`);
    }
  });
  
  const averageLength = totalLength / codes.length;
  
  // Check for BI-specific issues (codes ending with digits that might cause formatCourseCode issues)
  if (institution === 'BI') {
    const codesEndingWithNonOne = codes.filter(c => c.endsWithDigit && !c.code.endsWith('1'));
    if (codesEndingWithNonOne.length > 0) {
      potentialIssues.push(
        `BI codes ending with digits other than 1: ${codesEndingWithNonOne.length} courses (e.g., ${codesEndingWithNonOne.slice(0, 5).map(c => c.code).join(', ')})`
      );
      formatIssues.biNonOneEndings = codesEndingWithNonOne.slice(0, 20).map(c => c.code);
    }
  }
  
  // Check for other format-specific issues
  // UiB courses with dashes that might need special handling
  if (institution === 'UiB') {
    const codesWithDashButNoDigit = codes.filter(c => c.hasDash && !c.endsWithDigit);
    if (codesWithDashButNoDigit.length > 0) {
      formatIssues.unusualPatterns.push(
        `UiB codes with dash but no trailing digit: ${codesWithDashButNoDigit.length} (e.g., ${codesWithDashButNoDigit.slice(0, 5).map(c => c.code).join(', ')})`
      );
    }
  }
  
  return {
    institution,
    file: path.basename(filePath),
    totalCourses: codes.length,
    codes,
    lengthDistribution,
    suffixPatterns,
    codesEndingWithDigit,
    codesEndingWithEachDigit,
    codesWithDash,
    codesWithMultipleDashes,
    dashCountDistribution,
    codesWithSpace,
    spaceCountDistribution,
    averageLength: Math.round(averageLength * 100) / 100,
    minLength,
    maxLength,
    potentialIssues,
    formatIssues,
  };
}

function compareInstitutions(
  dataAnalysis: InstitutionAnalysis | null,
  publicAnalysis: InstitutionAnalysis | null,
  institution: string
): ComparisonResult {
  const differences = {
    missingInPublic: [] as string[],
    missingInData: [] as string[],
    countDifference: 0,
  };
  
  if (dataAnalysis && publicAnalysis) {
    const dataCodes = new Set(dataAnalysis.codes.map(c => c.code));
    const publicCodes = new Set(publicAnalysis.codes.map(c => c.code));
    
    dataCodes.forEach(code => {
      if (!publicCodes.has(code)) {
        differences.missingInPublic.push(code);
      }
    });
    
    publicCodes.forEach(code => {
      if (!dataCodes.has(code)) {
        differences.missingInData.push(code);
      }
    });
    
    differences.countDifference = dataAnalysis.totalCourses - publicAnalysis.totalCourses;
  } else if (dataAnalysis) {
    differences.countDifference = dataAnalysis.totalCourses;
  } else if (publicAnalysis) {
    differences.countDifference = -publicAnalysis.totalCourses;
  }
  
  return {
    institution,
    dataDir: dataAnalysis,
    publicDir: publicAnalysis,
    differences,
  };
}

function generateMarkdownReport(results: ComparisonResult[]): string {
  let md = '# Course Code Analysis Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  
  const totalDataCourses = results.reduce((sum, r) => sum + (r.dataDir?.totalCourses || 0), 0);
  const totalPublicCourses = results.reduce((sum, r) => sum + (r.publicDir?.totalCourses || 0), 0);
  const institutionsWithData = results.filter(r => r.dataDir).length;
  const institutionsWithPublic = results.filter(r => r.publicDir).length;
  const institutionsWithDifferences = results.filter(r => 
    r.differences.countDifference !== 0 || 
    r.differences.missingInPublic.length > 0 || 
    r.differences.missingInData.length > 0
  ).length;
  
  md += `- **Total courses in data/**: ${totalDataCourses.toLocaleString()}\n`;
  md += `- **Total courses in public/**: ${totalPublicCourses.toLocaleString()}\n`;
  md += `- **Institutions with data/**: ${institutionsWithData}\n`;
  md += `- **Institutions with public/**: ${institutionsWithPublic}\n`;
  md += `- **Institutions with differences**: ${institutionsWithDifferences}\n\n`;
  
  md += '## Institution Details\n\n';
  
  results.forEach(result => {
    md += `### ${result.institution}\n\n`;
    
    if (result.dataDir) {
      md += `**Data Directory** (${result.dataDir.file}):\n`;
      md += `- Total courses: ${result.dataDir.totalCourses.toLocaleString()}\n`;
      md += `- Average length: ${result.dataDir.averageLength} chars\n`;
      md += `- Length range: ${result.dataDir.minLength}-${result.dataDir.maxLength} chars\n`;
      md += `- Codes ending with digit: ${result.dataDir.codesEndingWithDigit} (${((result.dataDir.codesEndingWithDigit / result.dataDir.totalCourses) * 100).toFixed(1)}%)\n`;
      
      // Digit ending breakdown
      if (Object.keys(result.dataDir.codesEndingWithEachDigit).length > 0) {
        md += `- **Codes ending with each digit:**\n`;
        const digitEntries = Object.entries(result.dataDir.codesEndingWithEachDigit)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        digitEntries.forEach(([digit, count]) => {
          const pct = ((count / result.dataDir.totalCourses) * 100).toFixed(1);
          md += `  - Ends with "${digit}": ${count.toLocaleString()} (${pct}%)\n`;
        });
      }
      
      md += `- Codes with dash: ${result.dataDir.codesWithDash} (${((result.dataDir.codesWithDash / result.dataDir.totalCourses) * 100).toFixed(1)}%)\n`;
      if (result.dataDir.codesWithMultipleDashes > 0) {
        md += `- Codes with multiple dashes: ${result.dataDir.codesWithMultipleDashes} (${((result.dataDir.codesWithMultipleDashes / result.dataDir.totalCourses) * 100).toFixed(1)}%)\n`;
      }
      
      // Dash count distribution
      if (Object.keys(result.dataDir.dashCountDistribution).length > 0) {
        md += `- **Dash count distribution:**\n`;
        const dashEntries = Object.entries(result.dataDir.dashCountDistribution)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        dashEntries.forEach(([dashCount, count]) => {
          const pct = ((count / result.dataDir.totalCourses) * 100).toFixed(1);
          md += `  - ${dashCount} dash(es): ${count.toLocaleString()} (${pct}%)\n`;
        });
      }
      
      // Space analysis
      if (result.dataDir.codesWithSpace > 0) {
        md += `- ⚠️ **Codes with space: ${result.dataDir.codesWithSpace} (${((result.dataDir.codesWithSpace / result.dataDir.totalCourses) * 100).toFixed(1)}%)**\n`;
        if (Object.keys(result.dataDir.spaceCountDistribution).length > 0) {
          md += `- **Space count distribution:**\n`;
          const spaceEntries = Object.entries(result.dataDir.spaceCountDistribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
          spaceEntries.forEach(([spaceCount, count]) => {
            const pct = ((count / result.dataDir.totalCourses) * 100).toFixed(1);
            md += `  - ${spaceCount} space(s): ${count.toLocaleString()} (${pct}%)\n`;
          });
        }
      }
      
      // Top length distribution
      const topLengths = Object.entries(result.dataDir.lengthDistribution)
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .slice(0, 5);
      md += `- Most common lengths: ${topLengths.map(([len, count]) => `${len} chars (${count})`).join(', ')}\n`;
      
      // Top suffix patterns
      const topSuffixes = Object.entries(result.dataDir.suffixPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topSuffixes.length > 0) {
        md += `- Top suffixes: ${topSuffixes.map(([suffix, count]) => `"${suffix}" (${count})`).join(', ')}\n`;
      }
      
      // Format-specific issues
      if (result.dataDir.formatIssues.biNonOneEndings.length > 0) {
        md += `\n⚠️ **BI Format Issues (codes ending with digits other than 1):**\n`;
        md += `   Total: ${result.dataDir.formatIssues.biNonOneEndings.length} courses\n`;
        md += `   Examples: ${result.dataDir.formatIssues.biNonOneEndings.slice(0, 10).join(', ')}\n`;
        if (result.dataDir.formatIssues.biNonOneEndings.length > 10) {
          md += `   ... and ${result.dataDir.formatIssues.biNonOneEndings.length - 10} more\n`;
        }
      }
      
      if (result.dataDir.formatIssues.codesEndingWithDash.length > 0) {
        md += `\n⚠️ **Codes Ending With Dash:**\n`;
        result.dataDir.formatIssues.codesEndingWithDash.slice(0, 10).forEach(code => {
          md += `   - ${code}\n`;
        });
        if (result.dataDir.formatIssues.codesEndingWithDash.length > 10) {
          md += `   ... and ${result.dataDir.formatIssues.codesEndingWithDash.length - 10} more\n`;
        }
      }
      
      if (result.dataDir.formatIssues.codesWithSpace.length > 0) {
        md += `\n🔴 **Codes With Spaces (CRITICAL - Can Cause Errors):**\n`;
        md += `   Total: ${result.dataDir.formatIssues.codesWithSpace.length} courses\n`;
        result.dataDir.formatIssues.codesWithSpace.slice(0, 20).forEach(code => {
          const spaceCount = (code.match(/ /g) || []).length;
          md += `   - "${code}" (${spaceCount} space(s))\n`;
        });
        if (result.dataDir.formatIssues.codesWithSpace.length > 20) {
          md += `   ... and ${result.dataDir.formatIssues.codesWithSpace.length - 20} more\n`;
        }
      }
      
      if (result.dataDir.formatIssues.veryShortCodes.length > 0) {
        md += `\n⚠️ **Very Short Codes (< 3 chars):**\n`;
        result.dataDir.formatIssues.veryShortCodes.slice(0, 10).forEach(code => {
          md += `   - ${code}\n`;
        });
        if (result.dataDir.formatIssues.veryShortCodes.length > 10) {
          md += `   ... and ${result.dataDir.formatIssues.veryShortCodes.length - 10} more\n`;
        }
      }
      
      if (result.dataDir.formatIssues.veryLongCodes.length > 0) {
        md += `\n⚠️ **Very Long Codes (> 20 chars):**\n`;
        result.dataDir.formatIssues.veryLongCodes.slice(0, 10).forEach(code => {
          md += `   - ${code}\n`;
        });
        if (result.dataDir.formatIssues.veryLongCodes.length > 10) {
          md += `   ... and ${result.dataDir.formatIssues.veryLongCodes.length - 10} more\n`;
        }
      }
      
      if (result.dataDir.formatIssues.unusualPatterns.length > 0) {
        md += `\n⚠️ **Unusual Patterns:**\n`;
        result.dataDir.formatIssues.unusualPatterns.slice(0, 10).forEach(pattern => {
          md += `   - ${pattern}\n`;
        });
        if (result.dataDir.formatIssues.unusualPatterns.length > 10) {
          md += `   ... and ${result.dataDir.formatIssues.unusualPatterns.length - 10} more\n`;
        }
      }
      
      if (result.dataDir.potentialIssues.length > 0) {
        md += `\n⚠️ **All Potential Issues:**\n`;
        result.dataDir.potentialIssues.slice(0, 10).forEach(issue => {
          md += `  - ${issue}\n`;
        });
        if (result.dataDir.potentialIssues.length > 10) {
          md += `  - ... and ${result.dataDir.potentialIssues.length - 10} more\n`;
        }
      }
      md += '\n';
    } else {
      md += `**Data Directory**: ❌ File not found\n\n`;
    }
    
    if (result.publicDir) {
      md += `**Public Directory** (${result.publicDir.file}):\n`;
      md += `- Total courses: ${result.publicDir.totalCourses.toLocaleString()}\n`;
      md += `- Average length: ${result.publicDir.averageLength} chars\n`;
      md += `- Length range: ${result.publicDir.minLength}-${result.publicDir.maxLength} chars\n`;
      md += `- Codes ending with digit: ${result.publicDir.codesEndingWithDigit} (${((result.publicDir.codesEndingWithDigit / result.publicDir.totalCourses) * 100).toFixed(1)}%)\n`;
      md += `- Codes with dash: ${result.publicDir.codesWithDash} (${((result.publicDir.codesWithDash / result.publicDir.totalCourses) * 100).toFixed(1)}%)\n\n`;
    } else {
      md += `**Public Directory**: ❌ File not found\n\n`;
    }
    
    // Differences
    if (result.differences.countDifference !== 0 || 
        result.differences.missingInPublic.length > 0 || 
        result.differences.missingInData.length > 0) {
      md += `**⚠️ Differences:**\n`;
      if (result.differences.countDifference !== 0) {
        md += `- Count difference: ${result.differences.countDifference > 0 ? '+' : ''}${result.differences.countDifference}\n`;
      }
      if (result.differences.missingInPublic.length > 0) {
        md += `- Missing in public/: ${result.differences.missingInPublic.length} courses\n`;
        if (result.differences.missingInPublic.length <= 10) {
          md += `  - ${result.differences.missingInPublic.join(', ')}\n`;
        } else {
          md += `  - ${result.differences.missingInPublic.slice(0, 10).join(', ')}, ... and ${result.differences.missingInPublic.length - 10} more\n`;
        }
      }
      if (result.differences.missingInData.length > 0) {
        md += `- Missing in data/: ${result.differences.missingInData.length} courses\n`;
        if (result.differences.missingInData.length <= 10) {
          md += `  - ${result.differences.missingInData.join(', ')}\n`;
        } else {
          md += `  - ${result.differences.missingInData.slice(0, 10).join(', ')}, ... and ${result.differences.missingInData.length - 10} more\n`;
        }
      }
      md += '\n';
    }
    
    md += '---\n\n';
  });
  
  return md;
}

function printTerminalReport(results: ComparisonResult[]) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Course Code Analysis Report                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const totalDataCourses = results.reduce((sum, r) => sum + (r.dataDir?.totalCourses || 0), 0);
  const totalPublicCourses = results.reduce((sum, r) => sum + (r.publicDir?.totalCourses || 0), 0);
  
  console.log('📊 SUMMARY');
  console.log(`   Total courses in data/:     ${totalDataCourses.toLocaleString().padStart(8)}`);
  console.log(`   Total courses in public/:   ${totalPublicCourses.toLocaleString().padStart(8)}`);
  console.log(`   Institutions analyzed:      ${results.length.toString().padStart(8)}\n`);
  
  console.log('📋 INSTITUTION DETAILS\n');
  
  results.forEach(result => {
    const dataCount = result.dataDir?.totalCourses || 0;
    const publicCount = result.publicDir?.totalCourses || 0;
    const diff = dataCount - publicCount;
    const diffStr = diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
    const status = result.dataDir && result.publicDir ? '✅' : result.dataDir ? '⚠️' : '❌';
    
    console.log(`${status} ${result.institution.padEnd(12)} data/: ${dataCount.toString().padStart(6)} | public/: ${publicCount.toString().padStart(6)}${diffStr}`);
    
    if (result.dataDir) {
      const pctEndingDigit = ((result.dataDir.codesEndingWithDigit / result.dataDir.totalCourses) * 100).toFixed(1);
      const pctWithDash = ((result.dataDir.codesWithDash / result.dataDir.totalCourses) * 100).toFixed(1);
      const pctWithSpace = result.dataDir.codesWithSpace > 0 
        ? ` | Has space: ${((result.dataDir.codesWithSpace / result.dataDir.totalCourses) * 100).toFixed(1)}%` 
        : '';
      console.log(`   └─ Avg length: ${result.dataDir.averageLength} | Ends w/ digit: ${pctEndingDigit}% | Has dash: ${pctWithDash}%${pctWithSpace}`);
      
      if (result.dataDir.potentialIssues.length > 0) {
        console.log(`   └─ ⚠️  ${result.dataDir.potentialIssues.length} potential issue(s)`);
      }
      if (result.dataDir.codesWithSpace > 0) {
        console.log(`   └─ 🔴 ${result.dataDir.codesWithSpace} codes with SPACES (CRITICAL!)`);
      }
    }
    
    if (result.differences.missingInPublic.length > 0 || result.differences.missingInData.length > 0) {
      if (result.differences.missingInPublic.length > 0) {
        console.log(`   └─ ⚠️  ${result.differences.missingInPublic.length} courses missing in public/`);
      }
      if (result.differences.missingInData.length > 0) {
        console.log(`   └─ ⚠️  ${result.differences.missingInData.length} courses missing in data/`);
      }
    }
    
    console.log('');
  });
  
  // Highlight potential issues - detailed breakdown
  const issues = results.filter(r => 
    r.dataDir?.potentialIssues && r.dataDir.potentialIssues.length > 0
  );
  
  if (issues.length > 0) {
    console.log('⚠️  DETAILED ISSUE ANALYSIS\n');
    issues.forEach(result => {
      if (result.dataDir) {
        console.log(`   ${result.institution}:`);
        
        // BI format issues - only for BI institution
        if (result.institution === 'BI') {
          const allBiNonOne = result.dataDir.codes.filter(c => c.endsWithDigit && !c.code.endsWith('1'));
          if (allBiNonOne.length > 0) {
            console.log(`      🔴 BI Format Issue: ${allBiNonOne.length} codes ending with digits other than 1`);
            console.log(`         Examples: ${allBiNonOne.slice(0, 8).map(c => c.code).join(', ')}`);
            console.log(`         This can cause formatCourseCode() to add extra "1" suffix incorrectly!`);
            
            // Show breakdown by ending digit
            const digitBreakdown = allBiNonOne.reduce((acc, c) => {
              const digit = c.code[c.code.length - 1];
              acc[digit] = (acc[digit] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const breakdownStr = Object.entries(digitBreakdown)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([digit, count]) => `ends with ${digit}: ${count}`)
              .join(', ');
            console.log(`         Breakdown: ${breakdownStr}`);
          }
        }
        
        // Codes with spaces (CRITICAL)
        if (result.dataDir.formatIssues.codesWithSpace.length > 0) {
          console.log(`      🔴 CRITICAL: Codes with spaces: ${result.dataDir.formatIssues.codesWithSpace.length}`);
          console.log(`         These can cause errors in URL encoding, API calls, and course matching!`);
          result.dataDir.formatIssues.codesWithSpace.slice(0, 10).forEach(code => {
            const spaceCount = (code.match(/ /g) || []).length;
            console.log(`         - "${code}" (${spaceCount} space(s))`);
          });
          if (result.dataDir.formatIssues.codesWithSpace.length > 10) {
            console.log(`         ... and ${result.dataDir.formatIssues.codesWithSpace.length - 10} more`);
          }
        }
        
        // Codes ending with dash
        if (result.dataDir.formatIssues.codesEndingWithDash.length > 0) {
          console.log(`      ⚠️  Codes ending with dash: ${result.dataDir.formatIssues.codesEndingWithDash.length}`);
          console.log(`         Examples: ${result.dataDir.formatIssues.codesEndingWithDash.slice(0, 5).join(', ')}`);
        }
        
        // Very short codes
        if (result.dataDir.formatIssues.veryShortCodes.length > 0) {
          console.log(`      ⚠️  Very short codes (< 3 chars): ${result.dataDir.formatIssues.veryShortCodes.length}`);
          console.log(`         Examples: ${result.dataDir.formatIssues.veryShortCodes.slice(0, 5).join(', ')}`);
        }
        
        // Very long codes
        if (result.dataDir.formatIssues.veryLongCodes.length > 0) {
          console.log(`      ⚠️  Very long codes (> 20 chars): ${result.dataDir.formatIssues.veryLongCodes.length}`);
          console.log(`         Examples: ${result.dataDir.formatIssues.veryLongCodes.slice(0, 5).join(', ')}`);
        }
        
        // Unusual patterns
        if (result.dataDir.formatIssues.unusualPatterns.length > 0) {
          console.log(`      ⚠️  Unusual patterns: ${result.dataDir.formatIssues.unusualPatterns.length}`);
          result.dataDir.formatIssues.unusualPatterns.slice(0, 3).forEach(pattern => {
            console.log(`         - ${pattern}`);
          });
        }
        
        // Other issues
        const otherIssues = result.dataDir.potentialIssues.filter(issue => 
          !issue.includes('Very short') && 
          !issue.includes('Very long') && 
          !issue.includes('ends with dash') &&
          !issue.includes('BI codes ending')
        );
        if (otherIssues.length > 0) {
          console.log(`      ⚠️  Other issues: ${otherIssues.length}`);
          otherIssues.slice(0, 3).forEach(issue => {
            console.log(`         - ${issue}`);
          });
        }
        
        console.log('');
      }
    });
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const publicDir = path.join(process.cwd(), 'public', 'data', 'institutions');
  const docsDir = path.join(process.cwd(), 'docs');
  
  // Institution mappings (from lib/all-courses.ts)
  const institutions = [
    'UiO', 'NTNU', 'UiB', 'NHH', 'BI', 'OsloMet', 'Nord', 'NMBU', 'UiA', 'INN',
    'UiS', 'USN', 'UiT', 'NMH', 'NIH', 'KHIO', 'HIM', 'AHO', 'SH', 'HiØ',
    'HVO', 'HVL', 'VID', 'MF', 'AHS', 'BD', 'BAS', 'DMMH', 'FIH', 'HGUt',
    'HFDK', 'HLT', 'HK', 'LDH', 'NLA', 'Steiner',
  ];
  
  const results: ComparisonResult[] = [];
  
  console.log('🔍 Analyzing course codes...\n');
  
  for (const institution of institutions) {
    const fileName = `${institution.toLowerCase()}-all-courses.json`;
    const dataPath = path.join(dataDir, fileName);
    const publicPath = path.join(publicDir, fileName);
    
    const dataAnalysis = analyzeInstitution(dataPath, institution);
    const publicAnalysis = analyzeInstitution(publicPath, institution);
    
    const comparison = compareInstitutions(dataAnalysis, publicAnalysis, institution);
    results.push(comparison);
  }
  
  // Generate reports
  printTerminalReport(results);
  
  const markdownReport = generateMarkdownReport(results);
  const reportPath = path.join(docsDir, 'COURSE_CODE_ANALYSIS.md');
  fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  
  console.log(`\n✅ Analysis complete!`);
  console.log(`   Report saved to: ${reportPath}\n`);
}

main().catch(console.error);

