/**
 * Copy NHH course JSON files to public folder for static export
 * This runs automatically before build
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'institutions');
const publicDir = path.join(__dirname, '..', 'public');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy both NHH Bachelor (legacy/optional) and NHH All courses (required)
const filesToCopy = [
  { source: 'nhh-bachelor-courses.json', dest: 'nhh-bachelor-courses.json', optional: true },
  { source: 'nhh-all-courses.json', dest: 'nhh-all-courses.json', optional: false },
];

filesToCopy.forEach(({ source, dest, optional }) => {
  const sourceFile = path.join(dataDir, source);
  const destFile = path.join(publicDir, dest);
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, destFile);
    console.log(`✅ Copied ${dest} to public folder`);
  } else if (!optional) {
    console.warn(`⚠️  ${dest} not found. Run 'npm run discover-nhh-all' first.`);
    // Create empty file to prevent errors
    fs.writeFileSync(destFile, JSON.stringify({ i: '1240', courses: [] }));
  }
});

