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

// Copy all institution course files
const filesToCopy = [
  { source: 'uio-all-courses.json', dest: 'uio-all-courses.json', optional: true },
  { source: 'ntnu-all-courses.json', dest: 'ntnu-all-courses.json', optional: true },
  { source: 'uib-all-courses.json', dest: 'uib-all-courses.json', optional: true },
  { source: 'nhh-all-courses.json', dest: 'nhh-all-courses.json', optional: false },
  { source: 'nhh-bachelor-courses.json', dest: 'nhh-bachelor-courses.json', optional: true },
];

filesToCopy.forEach(({ source, dest, optional }) => {
  const sourceFile = path.join(dataDir, source);
  const destFile = path.join(publicDataDir, dest);
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, destFile);
    console.log(`✅ Copied ${dest} to public folder`);
  } else if (!optional) {
    console.warn(`⚠️  ${dest} not found. Run discovery script first.`);
    // Create empty file to prevent errors
    const institutionCode = source.includes('uio') ? '1110' :
                           source.includes('ntnu') ? '1150' :
                           source.includes('uib') ? '1120' :
                           source.includes('nhh') ? '1240' : '0000';
    fs.writeFileSync(destFile, JSON.stringify({ i: institutionCode, courses: [] }));
  }
});

