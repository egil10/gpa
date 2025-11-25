/**
 * Copy Optimized Cache to Public Directory
 * 
 * Copies the optimized grade cache from data/grade-cache-optimized/
 * to public/data/grade-cache-optimized/ so it's accessible via HTTP.
 * 
 * Usage:
 *   npx tsx scripts/copy-optimized-cache-to-public.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIR = path.join(process.cwd(), 'data', 'grade-cache-optimized');
const TARGET_DIR = path.join(process.cwd(), 'public', 'data', 'grade-cache-optimized');

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source directory does not exist: ${src}`);
    return;
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let totalFiles = 0;
  let totalSize = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      // Copy JSON files
      fs.copyFileSync(srcPath, destPath);
      const stats = fs.statSync(destPath);
      totalFiles++;
      totalSize += stats.size;
    }
  }

  if (totalFiles > 0) {
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Copied ${totalFiles} files (${sizeMB} MB)`);
  }
}

function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Copy Optimized Cache to Public Directory                 ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log(`📁 Source: ${SOURCE_DIR}`);
  console.log(`📁 Target: ${TARGET_DIR}\n`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`⚠️  Source directory does not exist: ${SOURCE_DIR}`);
    console.log(`   Skipping optimized cache copy (this is optional).`);
    console.log(`   Run fetch-all-grade-data first to generate the cache.`);
    process.exit(0); // Exit with success so build doesn't fail
  }

  // Get list of institutions
  const institutions = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  if (institutions.length === 0) {
    console.log(`⚠️  No institutions found in ${SOURCE_DIR}`);
    process.exit(0);
  }

  console.log(`📊 Found ${institutions.length} institutions\n`);

  // Copy each institution's cache
  let totalFiles = 0;
  let totalSize = 0;

  for (const institution of institutions) {
    const srcPath = path.join(SOURCE_DIR, institution);
    const destPath = path.join(TARGET_DIR, institution);
    
    const fileCount = fs.readdirSync(srcPath).filter(f => f.endsWith('.json')).length;
    const stats = fs.statSync(srcPath);
    
    console.log(`📦 ${institution.padEnd(12)} (${fileCount} files)`);
    copyDirectory(srcPath, destPath);
    
    // Count files and size in destination
    if (fs.existsSync(destPath)) {
      const files = fs.readdirSync(destPath).filter(f => f.endsWith('.json'));
      totalFiles += files.length;
      for (const file of files) {
        const filePath = path.join(destPath, file);
        totalSize += fs.statSync(filePath).size;
      }
    }
  }

  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Summary                                ║
╚════════════════════════════════════════════════════════════╝
  Total institutions: ${institutions.length}
  Total files: ${totalFiles.toLocaleString()}
  Total size: ${totalSizeMB} MB (${totalSizeGB} GB)
  
  ✅ Cache copied to: ${TARGET_DIR}
  ✅ Ready for website access!
  `);
}

main();

