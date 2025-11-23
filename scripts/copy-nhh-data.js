/**
 * Copy NHH Bachelor courses JSON to public folder for static export
 * This runs automatically before build
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'data', 'institutions', 'nhh-bachelor-courses.json');
const destFile = path.join(__dirname, '..', 'public', 'nhh-bachelor-courses.json');

// Create public directory if it doesn't exist
const publicDir = path.dirname(destFile);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy the file
if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Copied NHH Bachelor courses data to public folder');
} else {
  console.warn('⚠️  NHH Bachelor courses data not found. Run npm run discover-nhh first.');
  // Create empty file to prevent errors
  fs.writeFileSync(destFile, JSON.stringify({ courses: [] }));
}

