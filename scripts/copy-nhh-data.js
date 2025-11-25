/**
 * Copy all institution course JSON files to public folder for static export
 * This runs automatically before build
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'institutions');
const publicDir = path.join(__dirname, '..', 'public');
const publicDataDir = path.join(publicDir, 'data', 'institutions');

// Create public directories if they don't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// Copy every JSON data file for institutions dynamically so the website always
// ships with the full dataset. Skip backups/archives to avoid stale data.
const institutionFiles = fs.readdirSync(dataDir)
  .filter(file =>
    file.endsWith('.json') &&
    !file.endsWith('.json.backup') &&
    !file.endsWith('.json.gz')
  );

if (institutionFiles.length === 0) {
  console.warn('⚠️  No institution JSON files found. Run discovery scripts first.');
  process.exit(0);
}

institutionFiles.forEach(file => {
  const sourceFile = path.join(dataDir, file);
  const destFile = path.join(publicDataDir, file);

  fs.copyFileSync(sourceFile, destFile);
  console.log(`✅ Copied ${file} to public folder`);
});

console.log(`\n📦 Copied ${institutionFiles.length} institution datasets to public/data/institutions`);

// Also copy VGS grade statistics file
const vgsSourceFile = path.join(__dirname, '..', 'data', 'vgs-grade-statistics.json');
const vgsDestFile = path.join(publicDir, 'data', 'vgs-grade-statistics.json');

if (fs.existsSync(vgsSourceFile)) {
  // Ensure public/data directory exists
  const publicDataDir = path.join(publicDir, 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  fs.copyFileSync(vgsSourceFile, vgsDestFile);
  console.log(`✅ Copied vgs-grade-statistics.json to public/data`);
} else {
  console.warn('⚠️  vgs-grade-statistics.json not found in data folder');
}

