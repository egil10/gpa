/**
 * Enhanced post-discovery workflow script
 * Comprehensive pipeline that:
 * 1. Normalizes all course codes
 * 2. Fixes duplicates across all institutions
 * 3. Runs comprehensive analysis
 * 4. Generates detailed reports
 * 5. Copies files to public folder
 * 6. Validates everything is ready
 * 7. Outputs comprehensive summaries
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { INSTITUTION_DATA_FILES } from '../lib/all-courses';

const execAsync = promisify(exec);

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

interface BuildStep {
  name: string;
  command: string;
  description: string;
  critical?: boolean;
}

interface StepResult {
  step: BuildStep;
  success: boolean;
  duration: number;
  error?: string;
  output?: string;
}

const buildSteps: BuildStep[] = [
  {
    name: 'Normalize Codes',
    command: 'npm run normalize-codes',
    description: 'Normalize all course codes (remove spaces)',
    critical: true,
  },
  {
    name: 'Fix Duplicates',
    command: 'tsx scripts/fix-all-duplicates.ts',
    description: 'Fix duplicate course codes across all institutions',
    critical: true,
  },
  {
    name: 'Copy Data',
    command: 'node scripts/copy-nhh-data.js',
    description: 'Copy all institution data files to public folder',
    critical: true,
  },
  {
    name: 'Comprehensive Analysis',
    command: 'npm run analyze-all-institutions',
    description: 'Run detailed analysis across all institutions',
    critical: false,
  },
  {
    name: 'Generate Analytics',
    command: 'npm run analytics',
    description: 'Generate analytics reports (markdown)',
    critical: false,
  },
  {
    name: 'Homepage Data',
    command: 'npm run build-home-data',
    description: 'Build homepage top courses data',
    critical: true,
  },
  {
    name: 'Homepage Grades',
    command: 'npm run build-homepage-grade-data',
    description: 'Build homepage grade distribution data',
    critical: true,
  },
  {
    name: 'Hardcoded 28',
    command: 'npm run build-hardcoded-28',
    description: 'Build hardcoded 28 courses data',
    critical: false,
  },
  {
    name: 'Final Validation',
    command: 'tsx scripts/validate-pipeline.ts',
    description: 'Validate all data and generate final report',
    critical: true,
  },
];

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

async function runStepWithSpawn(step: BuildStep): Promise<{ success: boolean; duration: number; error?: string; output?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    
    const command = isWindows ? 'cmd.exe' : '/bin/sh';
    const args = isWindows ? ['/c', step.command] : ['-c', step.command];
    
    let stdout = '';
    let stderr = '';
    
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });
    
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        duration,
        error: error.message || String(error),
        output: stdout + stderr,
      });
    });
    
    child.on('exit', (code) => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        resolve({ success: true, duration, output: stdout });
      } else {
        resolve({
          success: false,
          duration,
          error: `Process exited with code ${code}`,
          output: stdout + stderr,
        });
      }
    });
  });
}

async function runStep(step: BuildStep, index: number, total: number): Promise<StepResult> {
  const startTime = Date.now();
  
  console.log(`\n${colors.cyan}${colors.bright}[${index + 1}/${total}]${colors.reset} ${colors.bright}${step.name}${colors.reset}`);
  console.log(`${colors.dim}   ${step.description}${colors.reset}`);
  
  try {
    const result = await runStepWithSpawn(step);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`\n${colors.green}   ✅ Completed in ${formatTime(duration)}${colors.reset}`);
      return { step, success: true, duration, output: result.output };
    } else {
      console.log(`\n${colors.red}   ❌ Failed: ${result.error || 'Unknown error'}${colors.reset}`);
      if (step.critical) {
        console.log(`${colors.red}   ⚠️  CRITICAL STEP FAILED - Pipeline will continue but may be incomplete${colors.reset}`);
      }
      return { step, success: false, duration, error: result.error, output: result.output };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    console.log(`\n${colors.red}   ❌ Failed: ${errorMessage.substring(0, 100)}${colors.reset}`);
    if (step.critical) {
      console.log(`${colors.red}   ⚠️  CRITICAL STEP FAILED${colors.reset}`);
    }
    return { step, success: false, duration, error: errorMessage };
  }
}

async function generateFinalReport(results: StepResult[], totalDuration: number): Promise<string> {
  const timestamp = new Date().toISOString();
  const analyticsDir = path.join(process.cwd(), 'analytics');
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const criticalFailed = results.filter(r => !r.success && r.step.critical).length;

  let report = `# Post-Discovery Pipeline Report

**Generated:** ${timestamp}
**Duration:** ${formatTime(totalDuration)}

## Summary

- **Total Steps:** ${results.length}
- **Successful:** ${successful} ✅
- **Failed:** ${failed} ${failed > 0 ? '❌' : ''}
- **Critical Failures:** ${criticalFailed} ${criticalFailed > 0 ? '⚠️' : ''}

${criticalFailed > 0 ? '\n⚠️ **WARNING:** Critical steps failed. Pipeline may be incomplete.\n' : ''}

## Step Details

`;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const critical = result.step.critical ? ' **[CRITICAL]**' : '';
    report += `### ${index + 1}. ${result.step.name}${critical} ${status}\n\n`;
    report += `- **Description:** ${result.step.description}\n`;
    report += `- **Duration:** ${formatTime(result.duration)}\n`;
    report += `- **Status:** ${result.success ? 'Success' : 'Failed'}\n`;
    if (result.error) {
      report += `- **Error:** ${result.error}\n`;
    }
    report += '\n';
  });

  // Add validation summary
  report += `## Data Validation

`;

  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  const publicDir = path.join(process.cwd(), 'public', 'data', 'institutions');
  
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('.backup'));
    report += `- **Data Files:** ${dataFiles.length} institution files in \`data/institutions/\`\n`;
  }
  
  if (fs.existsSync(publicDir)) {
    const publicFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.json') && !f.includes('.backup'));
    report += `- **Public Files:** ${publicFiles.length} institution files in \`public/data/institutions/\`\n`;
  }

  report += `
## Next Steps

1. Review the analytics reports in the \`analytics/\` folder
2. Check the detailed analysis report: \`docs/institution-analysis-report.json\`
3. Verify data files in \`public/data/institutions/\`
4. Run \`npm run build\` to build the application
5. Test locally with \`npm run dev\` before pushing to Vercel

## Files Generated

- Analytics reports: \`analytics/\`
- Analysis report: \`docs/institution-analysis-report.json\`
- Course code analysis: \`docs/COURSE_CODE_ANALYSIS.md\`
`;

  const reportPath = path.join(analyticsDir, `pipeline-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  
  return reportPath;
}

async function main() {
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║            🚀  ENHANCED POST-DISCOVERY BUILD PIPELINE  🚀                  ║
║                                                                              ║
║         Comprehensive data processing, validation & reporting               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check if discovery has been run
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  if (!fs.existsSync(dataDir)) {
    console.log(`${colors.red}❌ Data directory not found. Run discovery first.${colors.reset}`);
    process.exit(1);
  }

  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.endsWith('.gz'));
  if (dataFiles.length === 0) {
    console.log(`${colors.red}❌ No data files found. Run 'npm run discover-all' first.${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.bright}Found ${dataFiles.length} institution data files${colors.reset}\n`);

  const results: StepResult[] = [];
  const totalStartTime = Date.now();

  // Run all steps
  for (let i = 0; i < buildSteps.length; i++) {
    const step = buildSteps[i];
    const result = await runStep(step, i, buildSteps.length);
    results.push(result);
    
    // If critical step fails, warn but continue
    if (!result.success && step.critical) {
      console.log(`${colors.yellow}⚠️  Warning: Critical step failed, but continuing...${colors.reset}`);
    }
  }

  const totalDuration = Date.now() - totalStartTime;

  // Generate final report
  console.log(`\n${colors.cyan}${colors.bright}📊 Generating final report...${colors.reset}`);
  const reportPath = await generateFinalReport(results, totalDuration);
  console.log(`${colors.green}✅ Report saved to: ${reportPath}${colors.reset}`);

  // Print summary
  console.log(`\n${colors.cyan}${colors.bright}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║                       📊  PIPELINE SUMMARY  📊                                ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const criticalFailed = results.filter(r => !r.success && r.step.critical).length;

  console.log(`${colors.bright}Total Steps:${colors.reset} ${results.length}`);
  console.log(`${colors.green}${colors.bright}✅ Successful:${colors.reset} ${colors.green}${successful}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}❌ Failed:${colors.reset} ${colors.red}${failed}${colors.reset}`);
  }
  if (criticalFailed > 0) {
    console.log(`${colors.red}${colors.bright}⚠️  Critical Failures:${colors.reset} ${colors.red}${criticalFailed}${colors.reset}`);
  }
  console.log(`${colors.cyan}${colors.bright}⏱️  Total Time:${colors.reset} ${colors.cyan}${formatTime(totalDuration)}${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.yellow}${colors.bright}Failed Steps:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      const critical = r.step.critical ? ' [CRITICAL]' : '';
      console.log(`  ${colors.red}❌${colors.reset} ${r.step.name}${critical}`);
      if (r.error) {
        console.log(`     ${colors.dim}${r.error.substring(0, 100)}${colors.reset}`);
      }
    });
    console.log();
  }

  // Final status check
  const publicDir = path.join(process.cwd(), 'public', 'data', 'institutions');
  const publicFiles = fs.existsSync(publicDir) 
    ? fs.readdirSync(publicDir).filter(f => f.endsWith('.json') && !f.includes('.backup'))
    : [];
  
  console.log(`${colors.cyan}${colors.bright}📁 Data Status:${colors.reset}`);
  console.log(`  Data files: ${colors.green}${dataFiles.length}${colors.reset}`);
  console.log(`  Public files: ${colors.green}${publicFiles.length}${colors.reset}`);
  
  if (publicFiles.length !== dataFiles.length) {
    console.log(`${colors.yellow}  ⚠️  Warning: File count mismatch${colors.reset}`);
  }

  console.log(`\n${colors.green}${colors.bright}✨ Enhanced pipeline complete!${colors.reset}\n`);
  
  if (criticalFailed > 0) {
    console.log(`${colors.red}${colors.bright}❌ Pipeline completed with critical errors. Please review and fix before deploying.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}✅ All critical steps completed successfully!${colors.reset}\n`);
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`  • Review analytics reports in \`analytics/\` folder`);
    console.log(`  • Check analysis report: \`docs/institution-analysis-report.json\``);
    console.log(`  • Run \`npm run build\` to build the application`);
    console.log(`  • Test locally with \`npm run dev\` before deploying`);
    console.log(`  • Ready for git push and Vercel deployment\n`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

