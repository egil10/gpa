const fs = require('fs');
const path = require('path');

const jsonData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/data/homepage-hardcoded-28.json'), 'utf8')
);

const websiteData = [
  { code: 'TDT4110', year: 2024, a: 8, avg: 2.6, students: 2977 },
  { code: 'INTER1100', year: 2025, a: 0, avg: 0.0, students: 1902 },
  { code: 'EXPHIL03', year: 2025, a: 16, avg: 3.3, students: 1434 },
  { code: 'EXPHIL', year: 2025, a: 14, avg: 3.3, students: 983 },
  { code: 'FIN16', year: 2024, a: 0, avg: 0.0, students: 547 },
  { code: 'AOS100-B', year: 2025, a: 0, avg: 2.6, students: 898 },
  { code: 'PGR112', year: 2025, a: 0, avg: 2.1, students: 877 },
  { code: 'SAM2000', year: 2024, a: 5, avg: 1.9, students: 808 },
  { code: 'BED-2043NETT', year: 2025, a: 10, avg: 3.1, students: 600 },
  { code: 'K1010', year: 2020, a: 8, avg: 2.7, students: 90 },
];

console.log('Comparing JSON data with website data:\n');

websiteData.forEach((web) => {
  const found = jsonData.courses.find((x) => x.courseCode === web.code);
  if (found) {
    const aPct = found.distributions.find((d) => d.grade === 'A')?.percentage || 0;
    const yearMatch = found.year === web.year ? '✓' : '✗';
    const aMatch = Math.abs(aPct - web.a) <= 1 ? '✓' : '✗';
    const avgMatch = Math.abs(found.averageGrade - web.avg) <= 0.2 ? '✓' : '✗';
    const studentsMatch = found.totalStudents === web.students ? '✓' : '✗';
    
    console.log(`${web.code}:`);
    console.log(`  Year: ${found.year} ${yearMatch} (website: ${web.year})`);
    console.log(`  A%: ${aPct}% ${aMatch} (website: ${web.a}%)`);
    console.log(`  Avg: ${found.averageGrade} ${avgMatch} (website: ${web.avg})`);
    console.log(`  Students: ${found.totalStudents} ${studentsMatch} (website: ${web.students})`);
    console.log('');
  } else {
    console.log(`${web.code}: NOT FOUND in JSON\n`);
  }
});

