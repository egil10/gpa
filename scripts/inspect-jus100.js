
const fs = require('fs');
const path = require('path');

const filePath = path.join('data', 'institutions', 'uib-all-courses.json');
try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    // data is { institution: '1120', courses: [...] }
    // keys are minified: c=courseCode, n=courseName, y=years, s=totalStudents, l=lastYear, ls=lastYearStudents

    const course = data.courses.find(c => c.c === 'JUS100');
    if (course) {
        console.log('Found JUS100:', JSON.stringify(course, null, 2));
    } else {
        console.log('JUS100 not found.');
        // Check for any JUS course
        const jus = data.courses.find(c => c.c.startsWith('JUS'));
        if (jus) {
            console.log('Found other JUS course:', JSON.stringify(jus, null, 2));
        } else {
            console.log('No JUS courses found.');
        }
    }
} catch (e) {
    console.error('Error:', e.message);
}
