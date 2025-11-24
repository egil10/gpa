/**
 * Master script to run all discovery scripts in sequence
 * Provides nice terminal output with progress indicators and timers
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DiscoveryScript {
  name: string;
  displayName: string;
  script: string;
  npmCommand?: string;
}

// All discovery scripts in order (larger institutions first, then smaller ones)
const discoveryScripts: DiscoveryScript[] = [
  { name: 'NTNU', displayName: 'NTNU', script: 'discover-ntnu-courses.ts', npmCommand: 'discover-ntnu' },
  { name: 'UiO', displayName: 'Universitetet i Oslo', script: 'discover-uio-courses.ts', npmCommand: 'discover-uio' },
  { name: 'UiB', displayName: 'Universitetet i Bergen', script: 'discover-uib-courses.ts', npmCommand: 'discover-uib' },
  { name: 'BI', displayName: 'BI Norwegian Business School', script: 'discover-bi-courses.ts', npmCommand: 'discover-bi' },
  { name: 'OsloMet', displayName: 'OsloMet', script: 'discover-oslomet-courses.ts', npmCommand: 'discover-oslomet' },
  { name: 'Nord', displayName: 'Nord universitet', script: 'discover-nord-courses.ts', npmCommand: 'discover-nord' },
  { name: 'NMBU', displayName: 'NMBU', script: 'discover-nmbu-courses.ts', npmCommand: 'discover-nmbu' },
  { name: 'UiA', displayName: 'Universitetet i Agder', script: 'discover-uia-courses.ts', npmCommand: 'discover-uia' },
  { name: 'INN', displayName: 'Innlandet', script: 'discover-inn-courses.ts', npmCommand: 'discover-inn' },
  { name: 'UiS', displayName: 'Universitetet i Stavanger', script: 'discover-uis-courses.ts', npmCommand: 'discover-uis' },
  { name: 'USN', displayName: 'Universitetet i Sørøst-Norge', script: 'discover-usn-courses.ts', npmCommand: 'discover-usn' },
  { name: 'UiT', displayName: 'Universitetet i Tromsø', script: 'discover-uit-courses.ts', npmCommand: 'discover-uit' },
  { name: 'NHH', displayName: 'NHH', script: 'discover-nhh-all-courses.ts', npmCommand: 'discover-nhh-all' },
  { name: 'NMH', displayName: 'Norges musikkhøgskole', script: 'discover-nmh-courses.ts', npmCommand: 'discover-nmh' },
  { name: 'NIH', displayName: 'NIH', script: 'discover-nih-courses.ts', npmCommand: 'discover-nih' },
  { name: 'KHIO', displayName: 'KHIO', script: 'discover-khio-courses.ts', npmCommand: 'discover-khio' },
  { name: 'HiM', displayName: 'HiM', script: 'discover-him-courses.ts', npmCommand: 'discover-him' },
  { name: 'AHO', displayName: 'AHO', script: 'discover-aho-courses.ts', npmCommand: 'discover-aho' },
  { name: 'SH', displayName: 'SH', script: 'discover-sh-courses.ts', npmCommand: 'discover-sh' },
  { name: 'HiØ', displayName: 'HiØ', script: 'discover-hio-courses.ts', npmCommand: 'discover-hio' },
  { name: 'HVO', displayName: 'HVO', script: 'discover-hvo-courses.ts', npmCommand: 'discover-hvo' },
  { name: 'HVL', displayName: 'HVL', script: 'discover-hvl-courses.ts', npmCommand: 'discover-hvl' },
  { name: 'VID', displayName: 'VID', script: 'discover-vid-courses.ts', npmCommand: 'discover-vid' },
  { name: 'MF', displayName: 'MF', script: 'discover-mf-courses.ts', npmCommand: 'discover-mf' },
  { name: 'AHS', displayName: 'AHS', script: 'discover-ahs-courses.ts', npmCommand: 'discover-ahs' },
  { name: 'BD', displayName: 'BD', script: 'discover-bd-courses.ts', npmCommand: 'discover-bd' },
  { name: 'BAS', displayName: 'BAS', script: 'discover-bas-courses.ts', npmCommand: 'discover-bas' },
  { name: 'DMMH', displayName: 'DMMH', script: 'discover-dmmh-courses.ts', npmCommand: 'discover-dmmh' },
  { name: 'FIH', displayName: 'FIH', script: 'discover-fih-courses.ts', npmCommand: 'discover-fih' },
  { name: 'HGUt', displayName: 'HGUt', script: 'discover-hgut-courses.ts', npmCommand: 'discover-hgut' },
  { name: 'HFDK', displayName: 'HFDK', script: 'discover-hfdk-courses.ts', npmCommand: 'discover-hfdk' },
  { name: 'HLT', displayName: 'HLT', script: 'discover-hlt-courses.ts', npmCommand: 'discover-hlt' },
  { name: 'HK', displayName: 'HK', script: 'discover-hk-courses.ts', npmCommand: 'discover-hk' },
  { name: 'LDH', displayName: 'LDH', script: 'discover-ldh-courses.ts', npmCommand: 'discover-ldh' },
  { name: 'NLA', displayName: 'NLA', script: 'discover-nla-courses.ts', npmCommand: 'discover-nla' },
  { name: 'Steiner', displayName: 'Steiner', script: 'discover-steiner-courses.ts', npmCommand: 'discover-steiner' },
];

// Terminal colors and formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

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

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
}

function printHeader() {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🎓  COURSE DISCOVERY MASTER SCRIPT  🎓                   ║
║                                                                              ║
║                    Running all discovery scripts...                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);
}

function printProgress(current: number, total: number, script: DiscoveryScript, elapsed: number, status: string) {
  const percentage = Math.round((current / total) * 100);
  const barWidth = 40;
  const filled = Math.round((percentage / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  
  const timeStr = formatTime(elapsed);
  const timeDisplay = getCurrentTime();
  
  // Clear line and print progress
  process.stdout.write(`\r${colors.cyan}${bar}${colors.reset} ${percentage.toString().padStart(3)}% | ${current}/${total} | ${colors.bright}${script.displayName.padEnd(25)}${colors.reset} | ${colors.yellow}${timeStr.padStart(8)}${colors.reset} | ${colors.dim}${timeDisplay}${colors.reset} | ${status}`);
}

function printSummary(results: Array<{ script: DiscoveryScript; success: boolean; duration: number; error?: string }>) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n\n${colors.cyan}${colors.bright}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║                          📊  DISCOVERY SUMMARY  📊                          ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.bright}Total Scripts:${colors.reset} ${total}`);
  console.log(`${colors.green}${colors.bright}✅ Successful:${colors.reset} ${colors.green}${successful}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}❌ Failed:${colors.reset} ${colors.red}${failed}${colors.reset}`);
  }
  console.log(`${colors.cyan}${colors.bright}⏱️  Total Time:${colors.reset} ${colors.cyan}${formatTime(totalTime)}${colors.reset}\n`);
  
  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Scripts:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ${colors.red}❌${colors.reset} ${r.script.displayName} (${formatTime(r.duration)})`);
      if (r.error) {
        console.log(`     ${colors.dim}${r.error.substring(0, 100)}${r.error.length > 100 ? '...' : ''}${colors.reset}`);
      }
    });
    console.log();
  }
  
  console.log(`${colors.bright}All Scripts:${colors.reset}`);
  results.forEach((r, i) => {
    const icon = r.success ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    const time = formatTime(r.duration);
    const status = r.success ? `${colors.green}${time}${colors.reset}` : `${colors.red}${time}${colors.reset}`;
    console.log(`  ${icon} [${String(i + 1).padStart(2, '0')}/${total}] ${r.script.displayName.padEnd(30)} ${colors.dim}(${status}${colors.dim})${colors.reset}`);
  });
  
  console.log(`\n${colors.green}${colors.bright}✨ All done! You can now watch your movie! 🎬${colors.reset}\n`);
}

async function runDiscoveryScript(script: DiscoveryScript): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Use npm command if available, otherwise use tsx directly
    const command = script.npmCommand 
      ? `npm run ${script.npmCommand}`
      : `npx tsx scripts/${script.script}`;
    
    // Suppress npm output to keep our display clean, but capture errors
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      // On Windows, use cmd.exe
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    });
    
    const duration = Date.now() - startTime;
    
    // Check if there were any critical errors in stderr
    // Warnings are usually fine, but actual errors should be reported
    if (stderr && stderr.length > 0) {
      const errorLines = stderr.split('\n').filter(line => 
        line.trim().length > 0 && 
        !line.includes('warning') && 
        !line.includes('WARN') &&
        !line.includes('npm') // Ignore npm info messages
      );
      
      if (errorLines.length > 0) {
        return { success: false, duration, error: errorLines.join('; ') };
      }
    }
    
    return { success: true, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    
    // Extract meaningful error message
    let cleanError = errorMessage;
    if (errorMessage.includes('Error:')) {
      cleanError = errorMessage.split('Error:')[1]?.trim() || errorMessage;
    }
    
    return { 
      success: false, 
      duration, 
      error: cleanError.substring(0, 150) // Limit error length
    };
  }
}

async function main() {
  printHeader();
  
  const results: Array<{ script: DiscoveryScript; success: boolean; duration: number; error?: string }> = [];
  const totalStartTime = Date.now();
  
  for (let i = 0; i < discoveryScripts.length; i++) {
    const script = discoveryScripts[i];
    const scriptStartTime = Date.now();
    
    // Print initial status
    printProgress(i + 1, discoveryScripts.length, script, Date.now() - totalStartTime, `${colors.blue}Starting...${colors.reset}`);
    
    const result = await runDiscoveryScript(script);
    const scriptDuration = Date.now() - scriptStartTime;
    
    results.push({
      script,
      success: result.success,
      duration: scriptDuration,
      error: result.error,
    });
    
    // Print completion status
    const status = result.success 
      ? `${colors.green}✅ Done${colors.reset}`
      : `${colors.red}❌ Failed${colors.reset}`;
    
    printProgress(i + 1, discoveryScripts.length, script, Date.now() - totalStartTime, status);
    console.log(); // New line after each script
    
    // Small delay between scripts to be nice to the API
    if (i < discoveryScripts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const totalDuration = Date.now() - totalStartTime;
  printSummary(results);
  
  // Exit with error code if any script failed
  const hasFailures = results.some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}⚠️  Discovery interrupted by user${colors.reset}\n`);
  process.exit(130);
});

main().catch(error => {
  console.error(`${colors.red}${colors.bright}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});

