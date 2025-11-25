/**
 * Script to parse VGS grade statistics CSV from UDIR
 * 
 * The CSV contains grade statistics for all VGS courses with:
 * - Course codes (Vurderingsfagkode)
 * - Course names (Vurderingsfagnavn)
 * - Multiple years (2007-08 through 2024-25)
 * - Grade distributions (1-6 scale)
 * - Average grades
 * - Number of students
 */

import * as fs from 'fs';
import * as path from 'path';

interface VGSGradeData {
  courseCode: string;
  courseName: string;
  year: string; // e.g., "2024-25"
  averageGrade: number | null;
  totalStudents: number;
  gradeDistribution: {
    '1': number; // percentage
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    '6': number;
  };
  level?: 'Nasjonalt' | 'Fylke' | 'Enhet'; // Data level
  county?: string; // Fylke code/name
  schoolOrgNumber?: string; // Organisasjonsnummer
  schoolName?: string; // EnhetNavn
}

interface ParsedRow {
  courseCode: string;
  courseName: string;
  level: string;
  county?: string;
  schoolOrgNumber?: string;
  schoolName?: string;
  yearData: Record<string, {
    averageGrade: number | null;
    totalStudents: number;
    grade1: number | null;
    grade2: number | null;
    grade3: number | null;
    grade4: number | null;
    grade5: number | null;
    grade6: number | null;
  }>;
}

const CSV_FILE = path.join(__dirname, '..', '20251125-1728_Karakterer_i_videregaaende_skole.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vgs-grade-statistics.json');

/**
 * Parse a year string like "2024-25" and return the academic year start (2024)
 */
function parseYear(yearStr: string): number {
  const match = yearStr.match(/^(\d{4})-\d{2}$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse a numeric value, handling commas as decimal separators and asterisks for masked values
 */
function parseNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value.trim() === '*' || value.trim() === '-' || value.includes('Brudd')) {
    return null;
  }
  // Replace comma with dot for decimal separator
  const cleaned = value.replace(',', '.').replace(/\s/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse the CSV file and extract grade statistics
 */
async function parseVGSGradesCSV(): Promise<VGSGradeData[]> {
  console.log('📖 Reading CSV file...');
  
  // Try UTF-16LE first (common for Excel exports), fallback to UTF-8
  let csvContent: string;
  try {
    const buffer = fs.readFileSync(CSV_FILE);
    // Check if it's UTF-16LE by looking at BOM or byte pattern
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16LE BOM present
      csvContent = buffer.toString('utf16le');
    } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16BE BOM present
      csvContent = buffer.swap16().toString('utf16le');
    } else {
      // Try UTF-16LE anyway (might not have BOM)
      // Check if second byte is null (UTF-16LE indicator)
      if (buffer[1] === 0x00 || (buffer.length > 4 && buffer[3] === 0x00)) {
        csvContent = buffer.toString('utf16le');
      } else {
        csvContent = buffer.toString('utf-8');
      }
    }
  } catch (e) {
    // Fallback to UTF-8
    csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  }
  
  // Handle both \n and \r\n line endings
  const allLines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (allLines.length < 3) {
    throw new Error('CSV file appears to be empty or invalid');
  }

  console.log(`Total lines: ${allLines.length}`);
  console.log(`Line 0 preview: "${allLines[0].substring(0, 10)}"`);
  console.log(`Line 1 preview: "${allLines[1].substring(0, 50)}"`);

  // Skip "sep=" line (first line)
  let headerIndex = 1; // Always skip first line (sep=)
  console.log('Skipping sep= line (line 0)');

  // Parse header - it's tab-separated (line 1 after sep=)
  const headerLine = allLines[headerIndex];
  if (!headerLine) {
    throw new Error('Header line not found');
  }
  
  const header = headerLine.split('\t');
  console.log(`\n✅ Found ${header.length} columns in header`);
  
  if (header.length < 10) {
    console.log(`⚠️  WARNING: Only ${header.length} columns found. First column: "${header[0]}"`);
    console.log(`Full header (first 200 chars): ${headerLine.substring(0, 200)}`);
    throw new Error('Header parsing failed - expected at least 10 columns');
  }
  
  console.log(`First 5 columns: ${header.slice(0, 5).join(', ')}`);
  
  // Get data lines (skip header and sep line)
  const lines = allLines.slice(headerIndex + 1);
  console.log(`Data lines to process: ${lines.length}`);

  // Extract year columns - they follow the pattern: "{year}.Standpunkt.Alle eierformer.Alle kjønn.{metric}"
  const yearColumns: Map<string, {
    year: string;
    metric: 'Snittkarakter' | 'Antall elever' | 'Karakteren 1' | 'Karakteren 2' | 'Karakteren 3' | 'Karakteren 4' | 'Karakteren 5' | 'Karakteren 6';
    index: number;
  }> = new Map();

  header.forEach((col, index) => {
    // Skip first 10 columns (non-year columns)
    if (index < 10) return;
    
    // Check if column starts with year pattern (YYYY-YY)
    const yearMatch = col.match(/^(\d{4}-\d{2})/);
    if (!yearMatch) return; // Not a year column
    
    const year = yearMatch[1];
    
    // Remove .Brudd suffix if present
    let cleanCol = col.replace(/\.Brudd$/, '').trim();
    
    // Extract metric by checking what string appears in the column
    // Handle encoding issues by checking for substrings
    let metric: string | null = null;
    
    // Check in reverse order (most specific first)
    if (cleanCol.includes('Karakteren 6')) {
      metric = 'Karakteren 6';
    } else if (cleanCol.includes('Karakteren 5')) {
      metric = 'Karakteren 5';
    } else if (cleanCol.includes('Karakteren 4')) {
      metric = 'Karakteren 4';
    } else if (cleanCol.includes('Karakteren 3')) {
      metric = 'Karakteren 3';
    } else if (cleanCol.includes('Karakteren 2')) {
      metric = 'Karakteren 2';
    } else if (cleanCol.includes('Karakteren 1')) {
      metric = 'Karakteren 1';
    } else if (cleanCol.includes('Snittkarakter')) {
      metric = 'Snittkarakter';
    } else if (cleanCol.includes('Antall elever')) {
      metric = 'Antall elever';
    }
    
    if (metric) {
      yearColumns.set(`${year}_${metric}`, {
        year,
        metric: metric as any,
        index,
      });
    }
  });
  
  console.log(`Found ${yearColumns.size} year/metric columns`);

  console.log(`Found ${yearColumns.size} year/metric columns`);

  // Group by year to see what years we have
  const years = new Set<string>();
  yearColumns.forEach(col => years.add(col.year));
  console.log(`Years found: ${Array.from(years).sort().join(', ')}`);

  // Find column indices
  const courseCodeIndex = header.indexOf('Vurderingsfagkode');
  const courseNameIndex = header.indexOf('Vurderingsfagnavn');
  const levelIndex = header.indexOf('EnhetNivaa'); // 0 = Nasjonalt, 1 = Fylke, 2 = Enhet, 3 = school
  const countyIndex = header.indexOf('Fylkekode');
  const orgNumberIndex = header.indexOf('Organisasjonsnummer');
  const schoolNameIndex = header.indexOf('EnhetNavn');

  if (courseCodeIndex === -1 || courseNameIndex === -1) {
    throw new Error('Required columns not found in CSV header');
  }

  console.log(`\n📊 Parsing ${lines.length} data rows...\n`);

  const allGradeData: VGSGradeData[] = [];
  let rowCount = 0;
  let skippedCount = 0;

  // Process data rows (lines array already has header removed)
  for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split('\t');

    if (cells.length < header.length) {
      // Skip incomplete rows
      skippedCount++;
      continue;
    }

    const courseCode = cells[courseCodeIndex]?.trim() || '';
    const courseName = cells[courseNameIndex]?.trim() || '';

    // Only process rows with course codes and names
    if (!courseCode || !courseName || courseCode === 'Alle') {
      skippedCount++;
      continue;
    }

    const levelValue = cells[levelIndex]?.trim() || '0';
    const levelMap: Record<string, 'Nasjonalt' | 'Fylke' | 'Enhet'> = {
      '0': 'Nasjonalt',
      '1': 'Nasjonalt', // Also national level
      '2': 'Fylke',
      '3': 'Enhet',
    };
    const level = levelMap[levelValue] || 'Nasjonalt';

    const county = level === 'Fylke' || level === 'Enhet' ? cells[countyIndex]?.trim() : undefined;
    const schoolOrgNumber = level === 'Enhet' ? cells[orgNumberIndex]?.trim() : undefined;
    const schoolName = level === 'Enhet' ? cells[schoolNameIndex]?.trim() : undefined;

    // Process each year
    years.forEach(year => {
      // Get indices for this year's metrics
      const avgGradeKey = `${year}_Snittkarakter`;
      const studentCountKey = `${year}_Antall elever`;
      const grade1Key = `${year}_Karakteren 1`;
      const grade2Key = `${year}_Karakteren 2`;
      const grade3Key = `${year}_Karakteren 3`;
      const grade4Key = `${year}_Karakteren 4`;
      const grade5Key = `${year}_Karakteren 5`;
      const grade6Key = `${year}_Karakteren 6`;

      const avgGradeCol = yearColumns.get(avgGradeKey);
      const studentCountCol = yearColumns.get(studentCountKey);
      const grade1Col = yearColumns.get(grade1Key);
      const grade2Col = yearColumns.get(grade2Key);
      const grade3Col = yearColumns.get(grade3Key);
      const grade4Col = yearColumns.get(grade4Key);
      const grade5Col = yearColumns.get(grade5Key);
      const grade6Col = yearColumns.get(grade6Key);

      if (!avgGradeCol || !studentCountCol) {
        return; // Skip years without required data
      }

      const averageGrade = parseNumeric(cells[avgGradeCol.index]);
      const totalStudents = parseNumeric(cells[studentCountCol.index]);

      // Skip rows without student count or average grade
      if (totalStudents === null || totalStudents === 0 || averageGrade === null) {
        return;
      }

      const grade1 = grade1Col ? parseNumeric(cells[grade1Col.index]) : null;
      const grade2 = grade2Col ? parseNumeric(cells[grade2Col.index]) : null;
      const grade3 = grade3Col ? parseNumeric(cells[grade3Col.index]) : null;
      const grade4 = grade4Col ? parseNumeric(cells[grade4Col.index]) : null;
      const grade5 = grade5Col ? parseNumeric(cells[grade5Col.index]) : null;
      const grade6 = grade6Col ? parseNumeric(cells[grade6Col.index]) : null;

      // Only include if we have at least some grade distribution data
      if (grade1 === null && grade2 === null && grade3 === null && grade4 === null && grade5 === null && grade6 === null) {
        return;
      }

      allGradeData.push({
        courseCode: courseCode.toUpperCase(),
        courseName,
        year,
        averageGrade,
        totalStudents: Math.round(totalStudents),
        gradeDistribution: {
          '1': grade1 || 0,
          '2': grade2 || 0,
          '3': grade3 || 0,
          '4': grade4 || 0,
          '5': grade5 || 0,
          '6': grade6 || 0,
        },
        level,
        county,
        schoolOrgNumber,
        schoolName,
      });

      rowCount++;
    });

    if (i % 1000 === 0) {
      console.log(`  Processed ${i} rows, extracted ${rowCount} grade records so far...`);
    }
  }

  console.log(`\n✅ Parsing complete!`);
  console.log(`   Rows processed: ${lines.length - 1}`);
  console.log(`   Rows skipped: ${skippedCount}`);
  console.log(`   Grade records extracted: ${rowCount}`);
  console.log(`   Unique courses: ${new Set(allGradeData.map(d => d.courseCode)).size}`);

  return allGradeData;
}

/**
 * Main execution
 */
async function main() {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`CSV file not found: ${CSV_FILE}`);
    }

    const gradeData = await parseVGSGradesCSV();

    // Group by course code and year (national level only for now)
    const nationalData = gradeData.filter(d => d.level === 'Nasjonalt');

    console.log(`\n📦 Organizing data...`);
    console.log(`   National level records: ${nationalData.length}`);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save organized data
    const output = {
      metadata: {
        source: 'UDIR (Utdanningsdirektoratet)',
        url: 'https://www.udir.no/tall-og-forskning/statistikk/statistikk-videregaende-skole/karakterer-vgs/',
        licenseUrl: 'https://statistikkportalen.udir.no/api/rapportering/rest/v1/Tekst/visTekst/3?dataChanged=2025-11-25_163500',
        csvFile: path.basename(CSV_FILE),
        parsedAt: new Date().toISOString(),
        totalRecords: gradeData.length,
        nationalRecords: nationalData.length,
        uniqueCourses: new Set(gradeData.map(d => d.courseCode)).size,
        years: Array.from(new Set(gradeData.map(d => d.year))).sort(),
      },
      gradeData: nationalData, // For now, only save national level data
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✅ Saved to: ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);

    // Show sample data
    console.log('\n📚 Sample grade data:');
    const sampleCourse = nationalData.find(d => d.courseCode === 'ENG1007');
    if (sampleCourse) {
      console.log(`   Course: ${sampleCourse.courseCode} - ${sampleCourse.courseName}`);
      console.log(`   Year: ${sampleCourse.year}`);
      console.log(`   Average: ${sampleCourse.averageGrade}`);
      console.log(`   Students: ${sampleCourse.totalStudents}`);
      console.log(`   Distribution:`, sampleCourse.gradeDistribution);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

