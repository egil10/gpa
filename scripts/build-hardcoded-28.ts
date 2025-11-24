/**
 * Script to fetch and save hardcoded grade distribution data for the exact 28 top courses.
 * These courses are hardcoded for instant homepage loading without API calls.
 * 
 * Usage:
 *   npm run build-hardcoded-28
 *   (or: npx tsx scripts/build-hardcoded-28.ts)
 */

import * as fs from 'fs';
import * as path from 'path';
import { UNIVERSITIES, createSearchPayload, formatCourseCode } from '../lib/api';
import { processGradeData, aggregateDuplicateEntries } from '../lib/utils';
import { GradeData, CourseStats } from '../types';

const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'homepage-hardcoded-28.json');

interface Hardcoded28Payload {
  generatedAt: string;
  courses: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }>;
}

// The exact 28 courses the user specified, in order
const HARDCODED_28_COURSES = [
  { code: 'TDT4110', institution: 'NTNU', institutionCode: '1150', name: 'TDT4110' },
  { code: 'INTER1100', institution: 'OsloMet', institutionCode: '1175', name: 'INTER1100' },
  { code: 'EXPHIL03', institution: 'UiO', institutionCode: '1110', name: 'EXPHIL03' },
  { code: 'EXPHIL', institution: 'UiB', institutionCode: '1120', name: 'EXPHIL' },
  { code: 'INF100', institution: 'UiB', institutionCode: '1120', name: 'INF100' },
  { code: 'AOS100-B', institution: 'NMBU', institutionCode: '1173', name: 'AOS100-B' },
  { code: 'PGR112', institution: 'HK', institutionCode: '8253', name: 'PGR112' },
  { code: 'SAM2000', institution: 'USN', institutionCode: '1176', name: 'SAM2000' },
  { code: 'BED-2043NETT', institution: 'UiT', institutionCode: '1130', name: 'BED-2043NETT' },
  { code: 'FIN16', institution: 'NHH', institutionCode: '1240', name: 'FIN16' },
  { code: 'FELLES-2', institution: 'HVL', institutionCode: '0238', name: 'FELLES-2' },
  { code: 'SYK1005', institution: 'Nord', institutionCode: '1174', name: 'SYK1005' },
  { code: 'TN110', institution: 'UiS', institutionCode: '1160', name: 'TN110' },
  { code: 'HSM124', institution: 'NLA', institutionCode: '8223', name: 'HSM124' },
  { code: 'LOG505', institution: 'HIM', institutionCode: '0232', name: 'LOG505' },
  { code: 'BSY-221', institution: 'LDH', institutionCode: '8202', name: 'BSY-221' },
  { code: 'BASP1035L-O', institution: 'VID', institutionCode: '8208', name: 'BASP1035L-O' },
  { code: 'SYK1002', institution: 'INN', institutionCode: '1177', name: 'SYK1002' },
  { code: 'ITVKI10124', institution: 'HiØ', institutionCode: '0256', name: 'ITVKI10124' },
  { code: 'THP111', institution: 'NIH', institutionCode: '1260', name: 'THP111' },
  { code: 'REL152N', institution: 'HVO', institutionCode: '0236', name: 'REL152N' },
  { code: 'BHPRA210', institution: 'DMMH', institutionCode: '8224', name: 'BHPRA210' },
  { code: 'NORDTRAD20', institution: 'NMH', institutionCode: '1210', name: 'NORDTRAD20' },
  { code: 'EXFAC', institution: 'AHO', institutionCode: '1220', name: 'EXFAC' },
  { code: 'K1010', institution: 'MF', institutionCode: '8221', name: 'K1010' },
  { code: 'EXP101', institution: 'AHS', institutionCode: '8232', name: 'EXP101' },
  { code: 'DE104', institution: 'KHIO', institutionCode: '6220', name: 'DE104' },
  { code: 'RLE1003', institution: 'FIH', institutionCode: '8234', name: 'RLE1003' },
  { code: 'SAAL1GDG', institution: 'SH', institutionCode: '0217', name: 'SAAL1GDG' },
];

async function fetchCourseGradeData(
  institutionCode: string,
  courseCode: string,
  institution: string
): Promise<CourseStats | null> {
  try {
    // Try multiple formats for course codes
    const codeFormats = [
      courseCode, // Original format
      `${courseCode}-1`, // Standard format (most universities)
      courseCode.replace(/-B$/, ''), // Remove -B suffix
    ];

    // For UiB, also try with suffixes
    if (institution === 'UiB') {
      codeFormats.push(...[
        `${courseCode}-HFEKS-0`,
        `${courseCode}-HFEKS-1`,
      ]);
    }

    // Try each format
    for (const codeFormat of codeFormats) {
      const formattedCode = formatCourseCode(codeFormat, institution);
      const payload = createSearchPayload(institutionCode, formattedCode);

      try {
        const response = await fetch(DIRECT_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 204) {
          continue; // Try next format
        }

        if (!response.ok) {
          continue; // Try next format
        }

        const data: GradeData[] = await response.json();

        if (!data || data.length === 0) {
          continue; // Try next format
        }

        // Get latest year
        const years = [...new Set(data.map(d => parseInt(d.Årstall, 10)))].sort((a, b) => b - a);
        const latestYear = years[0];

        // Filter to latest year
        const yearData = data.filter(d => parseInt(d.Årstall, 10) === latestYear);

        if (yearData.length === 0) {
          continue; // Try next format
        }

        // Aggregate duplicate entries
        const aggregated = aggregateDuplicateEntries(yearData);

        // Process into stats
        const stats = processGradeData(aggregated);
        if (!stats) {
          continue; // Try next format
        }

        return {
          ...stats,
          year: latestYear,
        };
      } catch (error) {
        // Try next format
        continue;
      }
    }

    // If direct query failed, try querying all courses for the institution
    // This helps with UiB and other institutions that might have different formatting
    console.log(`  ⚠️  Direct query failed, trying institution-wide query for ${courseCode}...`);
    
    const allCoursesPayload = {
      tabell_id: 308,
      api_versjon: 1,
      statuslinje: 'N',
      begrensning: '5000',
      kodetekst: 'N',
      desimal_separator: '.',
      groupBy: ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
      sortBy: ['Emnekode', 'Karakter'],
      filter: [
        {
          variabel: 'Institusjonskode',
          selection: { filter: 'item', values: [institutionCode] },
        },
      ],
    };

    const response = await fetch(DIRECT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(allCoursesPayload),
    });

    if (response.ok && response.status !== 204) {
      const allData: GradeData[] = await response.json();
      // Find matching course
      const matching = allData.filter(d => {
        const code = d.Emnekode?.toUpperCase() || '';
        return code.includes(courseCode.toUpperCase()) || 
               courseCode.toUpperCase().includes(code.split('-')[0]);
      });

      if (matching.length > 0) {
        const years = [...new Set(matching.map(d => parseInt(d.Årstall, 10)))].sort((a, b) => b - a);
        const latestYear = years[0];
        const yearData = matching.filter(d => parseInt(d.Årstall, 10) === latestYear);
        const aggregated = aggregateDuplicateEntries(yearData);
        const stats = processGradeData(aggregated);
        if (stats) {
          return {
            ...stats,
            year: latestYear,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching ${courseCode}:`, error);
    return null;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Building hardcoded 28-course dataset                      ║
╚════════════════════════════════════════════════════════════╝
`);

  console.log(`📋 Fetching grade data for ${HARDCODED_28_COURSES.length} hardcoded courses...\n`);

  const results: Array<CourseStats & { institution: string; courseName: string; normalizedCode: string }> = [];

  for (let i = 0; i < HARDCODED_28_COURSES.length; i++) {
    const course = HARDCODED_28_COURSES[i];
    console.log(`[${i + 1}/${HARDCODED_28_COURSES.length}] Fetching ${course.code} (${course.institution})...`);

    const stats = await fetchCourseGradeData(
      course.institutionCode,
      course.code,
      course.institution
    );

    if (stats) {
      // Normalize course code for key matching (same logic as homepage)
      // For all institutions, consistently remove "-1" suffix only
      let normalizedCode = course.code.replace(/-1$/, '').trim();
      if (course.institution !== 'UiB') {
        normalizedCode = normalizedCode.replace(/-1$/, '').trim();
        if (course.institution === 'BI' && normalizedCode.endsWith('1') && normalizedCode.length > 4) {
          normalizedCode = normalizedCode.slice(0, -1);
        }
      }

      results.push({
        ...stats,
        institution: course.institution,
        courseName: course.name,
        normalizedCode: normalizedCode,
        courseCode: normalizedCode, // Use normalized code
      });
      console.log(`  ✅ Found data for ${course.code} (avg: ${stats.averageGrade?.toFixed(1)}, year: ${stats.year}, students: ${stats.totalStudents})`);
    } else {
      console.log(`  ⚠️  No data found for ${course.code}`);
    }

    // Small delay to avoid overwhelming the API
    if (i < HARDCODED_28_COURSES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  const payload: Hardcoded28Payload = {
    generatedAt: new Date().toISOString(),
    courses: results,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`\n✅ Hardcoded 28-course data saved!`);
  console.log(`   - Courses with data: ${results.length}/${HARDCODED_28_COURSES.length}`);
  console.log(`   - Saved to: ${OUTPUT_FILE}\n`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

