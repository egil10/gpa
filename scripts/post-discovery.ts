/**
 * Post-discovery workflow script
 * Runs after discover-all to:
 * 1. Copy all discovered files to public folder
 * 2. Build homepage data
 * 3. Build homepage grade data
 * 4. Build hardcoded 28 courses
 * 
 * This ensures everything is ready after discovery
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

interface BuildStep {
  name: string;
  command: string;
  description: string;
}

const buildSteps: BuildStep[] = [
  {
    name: 'Copy Data',
    command: 'node scripts/copy-nhh-data.js',
    description: 'Copy all institution data files to public folder',
  },
  {
    name: 'Homepage Data',
    command: 'npm run build-home-data',
    description: 'Build homepage top courses data',
  },
  {
    name: 'Homepage Grades',
    command: 'npm run build-homepage-grade-data',
    description: 'Build homepage grade distribution data',
  },
  {
    name: 'Hardcoded 28',
    command: 'npm run build-hardcoded-28',
    description: 'Build hardcoded 28 courses data',
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

async function runStepWithSpawn(step: BuildStep): Promise<{ success: boolean; duration: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    
    // For Windows, use cmd.exe /c to run the full command
    // For Unix, split the command properly
    const command = isWindows ? 'cmd.exe' : '/bin/sh';
    const args = isWindows ? ['/c', step.command] : ['-c', step.command];
    
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false, // We're handling shell ourselves
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        duration,
        error: error.message || String(error),
      });
    });
    
    child.on('exit', (code) => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        resolve({ success: true, duration });
      } else {
        resolve({
          success: false,
          duration,
          error: `Process exited with code ${code}`,
        });
      }
    });
  });
}

async function runStep(step: BuildStep, index: number, total: number): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();
  
  console.log(`\n${colors.cyan}${colors.bright}[${index + 1}/${total}]${colors.reset} ${colors.bright}${step.name}${colors.reset}`);
  console.log(`${colors.dim}   ${step.description}${colors.reset}`);
  
  // For verbose steps, use spawn to show output in real-time
  const isVerboseStep = step.name === 'Homepage Data' || step.name === 'Homepage Grades';
  
  if (isVerboseStep) {
    // Use spawn for real-time output
    try {
      const result = await runStepWithSpawn(step);
      const duration = Date.now() - startTime;
      if (result.success) {
        console.log(`\n${colors.green}   ✅ Completed in ${formatTime(duration)}${colors.reset}`);
      } else {
        console.log(`\n${colors.yellow}   ❌ Failed: ${result.error || 'Unknown error'}${colors.reset}`);
      }
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || String(error);
      console.log(`${colors.yellow}   ❌ Failed: ${errorMessage.substring(0, 100)}${colors.reset}`);
      return { 
        success: false, 
        duration, 
        error: errorMessage.substring(0, 150)
      };
    }
  }
  
  // For non-verbose steps, use exec (captures output)
  try {
    const { stdout, stderr } = await execAsync(step.command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    });
    
    const duration = Date.now() - startTime;
    
    // Check for errors in stderr
    if (stderr && stderr.length > 0) {
      const errorLines = stderr.split('\n').filter(line => 
        line.trim().length > 0 && 
        !line.includes('warning') && 
        !line.includes('WARN')
      );
      
      if (errorLines.length > 0) {
        return { success: false, duration, error: errorLines.join('; ') };
      }
    }
    
    console.log(`${colors.green}   ✅ Completed in ${formatTime(duration)}${colors.reset}`);
    return { success: true, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    console.log(`${colors.yellow}   ❌ Failed: ${errorMessage.substring(0, 100)}${colors.reset}`);
    return { 
      success: false, 
      duration, 
      error: errorMessage.substring(0, 150)
    };
  }
}

async function main() {
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                  🔧  POST-DISCOVERY BUILD WORKFLOW  🔧                     ║
║                                                                              ║
║         Preparing data for the application after discovery...               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check if discovery has been run
  const dataDir = path.join(process.cwd(), 'data', 'institutions');
  if (!fs.existsSync(dataDir)) {
    console.log(`${colors.yellow}⚠️  Data directory not found. Run 'npm run discover-all' first.${colors.reset}`);
    process.exit(1);
  }

  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.endsWith('.backup'));
  if (dataFiles.length === 0) {
    console.log(`${colors.yellow}⚠️  No data files found. Run 'npm run discover-all' first.${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.bright}Found ${dataFiles.length} institution data files${colors.reset}\n`);

  const results: Array<{ step: BuildStep; success: boolean; duration: number; error?: string }> = [];
  const totalStartTime = Date.now();

  for (let i = 0; i < buildSteps.length; i++) {
    const step = buildSteps[i];
    const result = await runStep(step, i, buildSteps.length);
    results.push({ step, ...result });
  }

  const totalDuration = Date.now() - totalStartTime;

  // Print summary
  console.log(`\n${colors.cyan}${colors.bright}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║                          📊  BUILD SUMMARY  📊                                 ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  console.log(`${colors.bright}Total Steps:${colors.reset} ${buildSteps.length}`);
  console.log(`${colors.green}${colors.bright}✅ Successful:${colors.reset} ${colors.green}${successful}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.yellow}${colors.bright}❌ Failed:${colors.reset} ${colors.yellow}${failed}${colors.reset}`);
  }
  console.log(`${colors.cyan}${colors.bright}⏱️  Total Time:${colors.reset} ${colors.cyan}${formatTime(totalDuration)}${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.yellow}${colors.bright}Failed Steps:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ${colors.yellow}❌${colors.reset} ${r.step.name}`);
      if (r.error) {
        console.log(`     ${r.error}`);
      }
    });
    console.log();
  }

  console.log(`${colors.green}${colors.bright}✨ Post-discovery workflow complete!${colors.reset}\n`);
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log(`  • Course names are now available for search`);
  console.log(`  • Homepage data has been generated`);
  console.log(`  • All data files are in public/data/institutions/`);
  console.log(`  • You can now run 'npm run dev' or 'npm run build'\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(`${colors.yellow}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

