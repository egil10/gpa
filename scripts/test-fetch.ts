/**
 * Quick test script to verify API fetching works
 * Tests with a known course (IN2010 at UiO)
 */

import { createSearchPayload, formatCourseCode, UNIVERSITIES } from '../lib/api';
import { GradeData } from '../types';

const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';

async function testFetch() {
  const courseCode = 'IN2010';
  const institution = 'UiO';
  const institutionCode = UNIVERSITIES[institution].code;
  const formattedCode = formatCourseCode(courseCode, institution);

  console.log(`Testing: ${courseCode} → ${formattedCode} at ${institution} (${institutionCode})`);
  console.log(`Trying year 2022...\n`);

  // Try both uppercase and lowercase (example shows lowercase)
  const formats = [formattedCode, formattedCode.toLowerCase()];

  for (const codeFormat of formats) {
    console.log(`\nTrying format: ${codeFormat}`);
    try {
      const payload = createSearchPayload(institutionCode, codeFormat, 2022);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('\nFetching...\n');

      const response = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload),
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.status === 204) {
        console.log('⚠️  No data found (204) - trying next format...\n');
        continue;
      }

      if (!response.ok) {
        console.log(`⚠️  Error ${response.status} - trying next format...\n`);
        continue;
      }

      const data: GradeData[] = await response.json();
      if (data && data.length > 0) {
        console.log(`✅ Success with ${codeFormat}! Found ${data.length} entries:\n`);
        console.log(JSON.stringify(data.slice(0, 3), null, 2));
        if (data.length > 3) {
          console.log(`\n... and ${data.length - 3} more entries`);
        }
        return;
      }

      console.log('⚠️  Empty response - trying next format...\n');
    } catch (error) {
      console.error(`⚠️  Error with ${codeFormat}:`, error instanceof Error ? error.message : error);
      console.log('Trying next format...\n');
    }
  }

  console.log('❌ No data found with any format');
}

testFetch();

