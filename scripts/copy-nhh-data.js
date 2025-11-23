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
  { source: 'bi-all-courses.json', dest: 'bi-all-courses.json', optional: true },
  { source: 'oslomet-all-courses.json', dest: 'oslomet-all-courses.json', optional: true },
  { source: 'nord-all-courses.json', dest: 'nord-all-courses.json', optional: true },
  { source: 'nmbu-all-courses.json', dest: 'nmbu-all-courses.json', optional: true },
  { source: 'uia-all-courses.json', dest: 'uia-all-courses.json', optional: true },
  { source: 'inn-all-courses.json', dest: 'inn-all-courses.json', optional: true },
  { source: 'uis-all-courses.json', dest: 'uis-all-courses.json', optional: true },
  { source: 'usn-all-courses.json', dest: 'usn-all-courses.json', optional: true },
  { source: 'uit-all-courses.json', dest: 'uit-all-courses.json', optional: true },
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
                           source.includes('nhh') ? '1240' :
                           source.includes('bi') ? '8241' :
                           source.includes('oslomet') ? '1175' :
                           source.includes('nord') ? '1174' :
                           source.includes('nmbu') ? '1173' :
                           source.includes('uia') ? '1171' :
                           source.includes('inn') ? '1177' :
                           source.includes('uis') ? '1160' :
                           source.includes('usn') ? '1176' :
                           source.includes('uit') ? '1130' : '0000';
    fs.writeFileSync(destFile, JSON.stringify({ i: institutionCode, courses: [] }));
  }
});

