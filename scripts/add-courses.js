/**
 * Helper script to convert course lists to proper format
 * 
 * Usage:
 * node scripts/add-courses.js
 * 
 * Or provide courses in this format:
 * CODE:NAME:INSTITUTION
 * 
 * Example:
 * IN3000:Avansert algoritmer:UiO
 * TDT4300:Data Science:NTNU
 */

const INSTITUTION_CODES = {
  'UiO': '1110',
  'NTNU': '1150',
  'UiB': '1120',
  'OsloMet': '1175',
  'BI': '8241',
};

function parseCourseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return null;
  }
  
  const parts = trimmed.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid format: ${line}. Expected CODE:NAME:INSTITUTION`);
  }
  
  const [code, name, institution] = parts.map(p => p.trim());
  
  if (!INSTITUTION_CODES[institution]) {
    throw new Error(`Unknown institution: ${institution}. Must be one of: ${Object.keys(INSTITUTION_CODES).join(', ')}`);
  }
  
  return {
    code: code.toUpperCase(),
    name,
    institution,
    institutionCode: INSTITUTION_CODES[institution],
  };
}

function formatAsTypeScript(courses) {
  const grouped = {};
  courses.forEach(course => {
    if (!grouped[course.institution]) {
      grouped[course.institution] = [];
    }
    grouped[course.institution].push(course);
  });
  
  let output = '// New courses\n';
  Object.keys(grouped).sort().forEach(institution => {
    output += `  // ${institution} courses\n`;
    grouped[institution].forEach(course => {
      output += `  { code: '${course.code}', name: '${course.name}', institution: '${course.institution}', institutionCode: '${course.institutionCode}' },\n`;
    });
  });
  
  return output;
}

// Example usage
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const courses = [];
  
  console.log('Enter courses in format: CODE:NAME:INSTITUTION');
  console.log('Press Enter twice when done, or type "done"\n');
  
  rl.on('line', (line) => {
    if (line.trim().toLowerCase() === 'done' || (line.trim() === '' && courses.length > 0)) {
      rl.close();
      return;
    }
    
    if (line.trim() === '') {
      return;
    }
    
    try {
      const course = parseCourseLine(line);
      if (course) {
        courses.push(course);
        console.log(`✓ Added: ${course.code} - ${course.name}`);
      }
    } catch (error) {
      console.error(`✗ Error: ${error.message}`);
    }
  });
  
  rl.on('close', () => {
    if (courses.length === 0) {
      console.log('No courses to add.');
      return;
    }
    
    console.log(`\n\nGenerated TypeScript code for ${courses.length} courses:\n`);
    console.log(formatAsTypeScript(courses));
  });
}

module.exports = { parseCourseLine, formatAsTypeScript, INSTITUTION_CODES };

