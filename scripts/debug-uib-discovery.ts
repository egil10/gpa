
import { getAllCoursesForInstitution } from '../lib/hierarchy-discovery';

async function debugUiB() {
    console.log('Fetching UiB courses for 2023...');
    const courses = await getAllCoursesForInstitution('1120', 2023);

    console.log(`Found ${courses.length} courses.`);

    const jusCourses = courses.filter(c => c.courseCode.startsWith('JUS'));

    console.log('\n--- JUS Courses (First 10) ---');
    jusCourses.slice(0, 10).forEach(c => {
        console.log(`Code: "${c.courseCode}", Name: "${c.courseName}", Students: ${c.totalStudents}`);
    });
}

debugUiB().catch(console.error);
