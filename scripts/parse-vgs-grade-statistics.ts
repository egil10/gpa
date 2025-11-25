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
import * as XLSX from 'xlsx';
import * as os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

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

type YearMetric =
  | 'Snittkarakter'
  | 'Antall elever'
  | 'Karakteren 1'
  | 'Karakteren 2'
  | 'Karakteren 3'
  | 'Karakteren 4'
  | 'Karakteren 5'
  | 'Karakteren 6';

interface YearColumnMeta {
  year: string;
  metric: YearMetric;
  index: number;
}

interface ColumnIndices {
  courseCodeIndex: number;
  courseNameIndex: number;
  levelIndex: number;
  countyIndex: number;
  orgNumberIndex: number;
  schoolNameIndex: number;
}

interface ParserContext {
  header: string[];
  yearColumnsEntries: Array<[string, YearColumnMeta]>;
  years: string[];
  indices: ColumnIndices;
}

interface WorkerPayload {
  lines: string[];
  context: ParserContext;
  workerId: number;
}

interface WorkerResult {
  records: VGSGradeData[];
  skipped: number;
  processedRows: number;
}

const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = resolveDatasetFile();
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vgs-grade-statistics.json');

/**
 * Figure out which dataset file to parse.
 * Prefers an explicit env override, then the most recent Karakterer* Excel/CSV file in repo root.
 */
function resolveDatasetFile(): string {
  const overridePath = process.env.VGS_GRADES_SOURCE;
  if (overridePath) {
    const candidate = path.isAbsolute(overridePath)
      ? overridePath
      : path.join(ROOT_DIR, overridePath);
    if (!fs.existsSync(candidate)) {
      throw new Error(`VGS_GRADES_SOURCE file not found: ${candidate}`);
    }
    return candidate;
  }

  const datasetCandidates = fs
    .readdirSync(ROOT_DIR)
    .filter(file =>
      file.toLowerCase().includes('karakterer_i_videregaaende_skole') &&
      /\.(csv|tsv|xlsx?)$/i.test(file)
    )
    .map(file => path.join(ROOT_DIR, file))
    .filter(fullPath => fs.statSync(fullPath).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (datasetCandidates.length === 0) {
    throw new Error('No Karakterer_i_videregaaende_skole dataset file found in repo root');
  }

  return datasetCandidates[0];
}

/**
 * Load dataset content as TSV text, supporting both CSV/TSV and Excel files.
 */
function loadDatasetContent(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    console.log(`📗 Reading Excel file: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      throw new Error('Excel file contains no sheets');
    }
    const worksheet = workbook.Sheets[firstSheet];
    // Convert to TSV so the rest of the parser can stay the same
    const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
    return `sep=\t\n${tsv}`;
  }

  console.log(`📄 Reading delimited text file: ${path.basename(filePath)}`);

  // Try UTF-16LE first (common for Excel exports), fallback to UTF-8
  let csvContent: string;
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length >= 2) {
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        csvContent = buffer.toString('utf16le');
      } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        csvContent = buffer.swap16().toString('utf16le');
      } else if (buffer[1] === 0x00 || (buffer.length > 4 && buffer[3] === 0x00)) {
        csvContent = buffer.toString('utf16le');
      } else {
        csvContent = buffer.toString('utf-8');
      }
    } else {
      csvContent = buffer.toString('utf-8');
    }
  } catch {
    csvContent = fs.readFileSync(filePath, 'utf-8');
  }

  return csvContent;
}

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
  console.log(`📖 Loading dataset from ${DATA_FILE}`);
  const csvContent = loadDatasetContent(DATA_FILE);
  
  // Handle both \n and \r\n line endings
  const allLines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (allLines.length < 3) {
    throw new Error('CSV file appears to be empty or invalid');
  }

  console.log(`Total lines: ${allLines.length}`);
  console.log(`Line 0 preview: "${allLines[0].substring(0, 10)}"`);
  console.log(`Line 1 preview: "${allLines[1].substring(0, 50)}"`);

  // Skip optional "sep=" line (first line)
  let headerIndex = 0;
  if (allLines[0].startsWith('sep=')) {
    headerIndex = 1;
    console.log('Skipping sep= line (line 0)');
  }

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
  const yearColumns: Map<string, YearColumnMeta> = new Map();

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
  const indices: ColumnIndices = {
    courseCodeIndex: header.indexOf('Vurderingsfagkode'),
    courseNameIndex: header.indexOf('Vurderingsfagnavn'),
    levelIndex: header.indexOf('EnhetNivaa'), // 0 = Nasjonalt, 1 = Fylke, 2 = Enhet, 3 = school
    countyIndex: header.indexOf('Fylkekode'),
    orgNumberIndex: header.indexOf('Organisasjonsnummer'),
    schoolNameIndex: header.indexOf('EnhetNavn'),
  };

  if (indices.courseCodeIndex === -1 || indices.courseNameIndex === -1) {
    throw new Error('Required columns not found in CSV header');
  }

  console.log(`\n📊 Parsing ${lines.length} data rows...\n`);

  const context: ParserContext = {
    header,
    yearColumnsEntries: Array.from(yearColumns.entries()),
    years: Array.from(years),
    indices,
  };

  const workerCount = determineWorkerCount(lines.length);
  console.log(`🧵 Using ${workerCount} worker${workerCount === 1 ? '' : 's'} for parsing`);

  const { records, skipped, processedRows } = await processLinesConcurrently(lines, context, workerCount);

  console.log(`\n✅ Parsing complete!`);
  console.log(`   Rows processed: ${processedRows}`);
  console.log(`   Rows skipped: ${skipped}`);
  console.log(`   Grade records extracted: ${records.length}`);
  console.log(`   Unique courses: ${new Set(records.map(d => d.courseCode)).size}`);

  return records;
}

function determineWorkerCount(totalLines: number): number {
  const requested = process.env.VGS_GRADES_WORKERS
    ? Math.max(1, parseInt(process.env.VGS_GRADES_WORKERS, 10))
    : Math.max(1, Math.min(os.cpus().length, 4));

  return totalLines < 2000 ? 1 : requested;
}

async function processLinesConcurrently(
  lines: string[],
  context: ParserContext,
  workerCount: number
): Promise<WorkerResult> {
  if (workerCount <= 1) {
    return processLinesChunk(lines, context, 0);
  }

  const chunkSize = Math.ceil(lines.length / workerCount);
  const tasks: Promise<WorkerResult>[] = [];

  for (let i = 0; i < workerCount; i++) {
    const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    tasks.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: {
            lines: chunk,
            context,
            workerId: i + 1,
          } satisfies WorkerPayload,
        });

        worker.on('message', (result: WorkerResult) => resolve(result));
        worker.on('error', reject);
        worker.on('exit', code => {
          if (code !== 0) {
            reject(new Error(`Worker exited with code ${code}`));
          }
        });
      })
    );
  }

  const results = await Promise.all(tasks);
  return results.reduce<WorkerResult>(
    (acc, result) => ({
      records: acc.records.concat(result.records),
      skipped: acc.skipped + result.skipped,
      processedRows: acc.processedRows + result.processedRows,
    }),
    { records: [], skipped: 0, processedRows: 0 }
  );
}

function processLinesChunk(
  lines: string[],
  context: ParserContext,
  workerId: number
): WorkerResult {
  const yearColumns = new Map(context.yearColumnsEntries);
  const years = context.years;
  const { indices } = context;

  const levelMap: Record<string, 'Nasjonalt' | 'Fylke' | 'Enhet'> = {
    '0': 'Nasjonalt',
    '1': 'Nasjonalt',
    '2': 'Fylke',
    '3': 'Enhet',
  };

  const allGradeData: VGSGradeData[] = [];
  let rowCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split('\t');

    if (cells.length < context.header.length) {
      skippedCount++;
      continue;
    }

    const courseCode = cells[indices.courseCodeIndex]?.trim() || '';
    const courseName = cells[indices.courseNameIndex]?.trim() || '';

    if (!courseCode || !courseName || courseCode === 'Alle') {
      skippedCount++;
      continue;
    }

    const levelValue = cells[indices.levelIndex]?.trim() || '0';
    const level = levelMap[levelValue] || 'Nasjonalt';

    const county =
      level === 'Fylke' || level === 'Enhet'
        ? cells[indices.countyIndex]?.trim()
        : undefined;
    const schoolOrgNumber =
      level === 'Enhet' ? cells[indices.orgNumberIndex]?.trim() : undefined;
    const schoolName =
      level === 'Enhet' ? cells[indices.schoolNameIndex]?.trim() : undefined;

    years.forEach(year => {
      const avgGradeCol = yearColumns.get(`${year}_Snittkarakter`);
      const studentCountCol = yearColumns.get(`${year}_Antall elever`);

      if (!avgGradeCol || !studentCountCol) {
        return;
      }

      const averageGrade = parseNumeric(cells[avgGradeCol.index]);
      const totalStudents = parseNumeric(cells[studentCountCol.index]);

      if (totalStudents === null || totalStudents === 0 || averageGrade === null) {
        return;
      }

      const gradeDistribution = buildGradeDistribution(year, yearColumns, cells);
      if (!gradeDistribution) {
        return;
      }

      allGradeData.push({
        courseCode: courseCode.toUpperCase(),
        courseName,
        year,
        averageGrade,
        totalStudents: Math.round(totalStudents),
        gradeDistribution,
        level,
        county,
        schoolOrgNumber,
        schoolName,
      });

      rowCount++;
    });

    if (workerId === 0 && i % 500 === 0) {
      console.log(
        `  [main] Processed ${i} rows in current chunk, extracted ${rowCount} grade records...`
      );
    } else if (workerId > 0 && i % 1000 === 0) {
      console.log(
        `  [worker ${workerId}] Processed ${i} rows, accumulated ${rowCount} records`
      );
    }
  }

  return { records: allGradeData, skipped: skippedCount, processedRows: lines.length };
}

function buildGradeDistribution(
  year: string,
  yearColumns: Map<string, YearColumnMeta>,
  cells: string[]
): VGSGradeData['gradeDistribution'] | null {
  const grades = ['1', '2', '3', '4', '5', '6'] as const;
  const distribution: Record<typeof grades[number], number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
  };

  let hasValue = false;

  grades.forEach(grade => {
    const col = yearColumns.get(`${year}_Karakteren ${grade}`);
    if (!col) return;
    const value = parseNumeric(cells[col.index]);
    if (value !== null) {
      distribution[grade] = value;
      hasValue = true;
    }
  });

  return hasValue ? distribution : null;
}

/**
 * Main execution
 */
async function main() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Dataset file not found: ${DATA_FILE}`);
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
        csvFile: path.basename(DATA_FILE),
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
if (require.main === module && isMainThread) {
  main();
}

if (!isMainThread && parentPort) {
  const payload = workerData as WorkerPayload;
  const result = processLinesChunk(payload.lines, payload.context, payload.workerId);
  parentPort.postMessage(result);
}

