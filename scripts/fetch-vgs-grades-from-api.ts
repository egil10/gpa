/**
 * Fetch VGS grade statistics directly from UDIR's statistikkportalen API.
 *
 * The script reproduces the dataset that previously had to be exported from Excel.
 * It requests the public REST endpoints that power the web UI and converts the
 * response into the same JSON format consumed by the app.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColumnLevelEntry {
  name: string;
  columnCount: number;
}

interface ColumnDescriptor {
  year: string;
  examType: string;
  ownerType: string;
  gender: string;
  metric: string;
}

interface ApiRow {
  navn: string;
  id: string;
  data: string[];
}

interface ApiResponse {
  metadata: {
    rowHierarchy: string[];
    columns: ColumnLevelEntry[][];
  };
  rows: ApiRow[];
}

interface FilterValue {
  id: number;
  kode?: string;
  navn: string;
}

interface FilterValuesResponse {
  FagID: FilterValue[];
}

interface VGSGradeData {
  courseCode: string;
  courseName: string;
  year: string;
  averageGrade: number;
  totalStudents: number;
  gradeDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    '6': number;
  };
  level?: 'Nasjonalt';
  assessmentType?: string;
}

const API_BASE = 'https://statistikkportalen.udir.no/api/rapportering/rest/v1';
const STAT_PATH = 'Statistikk/VGO/ResultatFagV/2/5';
const RAD_STI = 'F'; // Row hierarchy = Fag
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vgs-grade-statistics.json');

// Filters replicate the query used on the public website (2015/16 - 2024/25, all exam types, all owner types, etc.)
const FILTER_CLAUSES: Record<string, string[]> = {
  TidID: ['201606', '201706', '201806', '201906', '202006', '202106', '202206', '202306', '202406', '202506'],
  FagID: ['-34', '-33', '-32', '-31', '-29', '-28', '-27', '-25', '-22', '-21', '-20', '-19', '-16', '-14', '-13', '-12', '-10'],
  KaraktertypeID: process.env.VGS_KARAKTERTYPE_IDS?.split('_') ?? ['1', '2', '3'], // 1=Standpunkt, 2=Muntlig, 3=Skriftlig
  KjoennID: ['-10'], // Alle kjønn
  UtdanningsprogramvariantID: ['-10'], // Alle utdanningsprogram
  EierformID: ['-10', '2', '8'], // Alle, offentlig, privat
  VisAntallPersoner: ['1'],
  VisKarakterfordeling: ['1'],
};

const TARGET_OWNER = 'Alle eierformer';
const TARGET_GENDER = 'Alle kjønn';
const DEFAULT_ASSESSMENTS = process.env.VGS_ASSESSMENTS
  ? process.env.VGS_ASSESSMENTS.split(',').map((value) => value.trim()).filter(Boolean)
  : ['Standpunkt']; // Use standpunkt by default to match previous data

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${url} ${body ? `- ${body.slice(0, 200)}` : ''}`);
  }
  return (await response.json()) as T;
}

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '' || value === '*' || value === '-') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = parseFloat(value.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function buildFilterString(): string {
  return Object.entries(FILTER_CLAUSES)
    .map(([key, values]) => `${key}(${values.join('_')})`)
    .join('_');
}

function buildColumnDescriptors(levels: ColumnLevelEntry[][]): ColumnDescriptor[] {
  if (levels.length < 5) {
    throw new Error(`Unexpected column hierarchy: ${levels.length} levels`);
  }
  const totalColumns = levels[0].reduce((sum, entry) => sum + entry.columnCount, 0);
  const descriptors: ColumnDescriptor[] = [];

  for (let columnIndex = 0; columnIndex < totalColumns; columnIndex++) {
    descriptors.push({
      year: getLevelName(levels[0], columnIndex),
      examType: getLevelName(levels[1], columnIndex),
      ownerType: getLevelName(levels[2], columnIndex),
      gender: getLevelName(levels[3], columnIndex),
      metric: getLevelName(levels[4], columnIndex),
    });
  }

  return descriptors;
}

function getLevelName(entries: ColumnLevelEntry[], columnIndex: number): string {
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.columnCount;
    if (columnIndex < cumulative) {
      return entry.name;
    }
  }
  throw new Error(`Column index ${columnIndex} is out of range for level with ${entries.length} entries`);
}

function normalizeYear(yearString: string): string {
  if (/^\d{4}-\d{2}$/.test(yearString)) {
    return yearString;
  }
  const match = yearString.match(/^(\d{4})(\d{2})$/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const endYear = (startYear + 1) % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
  }
  return yearString;
}

async function main() {
  console.log('🚀 Fetching VGS grade data from statistikkportalen.udir.no');
  const filterString = buildFilterString();

  const dataUrl = new URL(`${API_BASE}/${STAT_PATH}/data`);
  dataUrl.searchParams.set('radSti', RAD_STI);
  dataUrl.searchParams.set('filter', filterString);

  const filterValuesUrl = `${API_BASE}/${STAT_PATH}/filterVerdier`;

  console.log('📡 Requesting dataset...');
  const [apiResponse, filterValues] = await Promise.all([
    fetchJson<ApiResponse>(dataUrl.toString()),
    fetchJson<FilterValuesResponse>(filterValuesUrl),
  ]);

  console.log(`   Rows received: ${apiResponse.rows.length}`);
  console.log('📋 Building metadata...');

  const descriptors = buildColumnDescriptors(apiResponse.metadata.columns);

  const fagMap = new Map<number, FilterValue>();
  filterValues.FagID.forEach((fag) => {
    fagMap.set(fag.id, fag);
  });

  const assessmentWhitelist = DEFAULT_ASSESSMENTS;
  const gradeData: VGSGradeData[] = [];

  console.log('🧮 Parsing rows...');
  apiResponse.rows.forEach((row, rowIndex) => {
    const fagId = Number(row.id);
    const fagInfo = Number.isNaN(fagId) ? undefined : fagMap.get(fagId);
    if (!fagInfo?.kode) {
      return;
    }

    const combos = new Map<
      string,
      {
        averageGrade: number | null;
        totalStudents: number | null;
        gradeDistribution: VGSGradeData['gradeDistribution'];
      }
    >();

    descriptors.forEach((descriptor, columnIndex) => {
      if (descriptor.ownerType !== TARGET_OWNER || descriptor.gender !== TARGET_GENDER) {
        return;
      }
      if (assessmentWhitelist.length && !assessmentWhitelist.includes(descriptor.examType)) {
        return;
      }
      const rawValue = row.data[columnIndex];
      const numericValue = parseNumeric(rawValue);
      if (numericValue === null) {
        return;
      }

      const comboKey = `${descriptor.year}|${descriptor.examType}`;
      if (!combos.has(comboKey)) {
        combos.set(comboKey, {
          averageGrade: null,
          totalStudents: null,
          gradeDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
        });
      }

      const combo = combos.get(comboKey)!;
      switch (descriptor.metric) {
        case 'Snittkarakter':
          combo.averageGrade = numericValue;
          break;
        case 'Antall elever':
          combo.totalStudents = numericValue;
          break;
        case 'Karakteren 1':
        case 'Karakteren 2':
        case 'Karakteren 3':
        case 'Karakteren 4':
        case 'Karakteren 5':
        case 'Karakteren 6':
          combo.gradeDistribution[descriptor.metric.split(' ')[1] as keyof VGSGradeData['gradeDistribution']] =
            Number(numericValue.toFixed(2));
          break;
        default:
          break;
      }
    });

    combos.forEach((combo, key) => {
      if (combo.averageGrade === null || combo.totalStudents === null || combo.totalStudents === 0) {
        return;
      }
      const [yearRaw, examType] = key.split('|');
      gradeData.push({
        courseCode: fagInfo.kode!,
        courseName: fagInfo.navn,
        year: normalizeYear(yearRaw),
        averageGrade: Number(combo.averageGrade.toFixed(2)),
        totalStudents: Math.round(combo.totalStudents),
        gradeDistribution: combo.gradeDistribution,
        level: 'Nasjonalt',
        assessmentType: examType,
      });
    });

    if ((rowIndex + 1) % 200 === 0) {
      console.log(`   Processed ${rowIndex + 1}/${apiResponse.rows.length} rows...`);
    }
  });

  const filteredData = gradeData;
  console.log(`✅ Finished parsing. Records kept: ${filteredData.length}`);

  const uniqueYears = Array.from(new Set(filteredData.map((entry) => entry.year))).sort();
  const uniqueCourses = new Set(filteredData.map((entry) => entry.courseCode));
  const assessmentTypes = Array.from(new Set(filteredData.map((entry) => entry.assessmentType))).sort();

  const output = {
    metadata: {
      source: 'UDIR (Utdanningsdirektoratet) – Statistikkportalen',
      url: 'https://www.udir.no/tall-og-forskning/statistikk/statistikk-videregaende-skole/karakterer-vgs/',
      licenseUrl: 'https://statistikkportalen.udir.no/api/rapportering/rest/v1/Tekst/visTekst/3?dataChanged=2025-11-25_163500',
      fetchedAt: new Date().toISOString(),
      totalRecords: filteredData.length,
      uniqueCourses: uniqueCourses.size,
      years: uniqueYears,
      assessmentTypes,
      filterClauses: FILTER_CLAUSES,
      radSti: RAD_STI,
    },
    gradeData: filteredData,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`💾 Saved dataset to ${OUTPUT_FILE}`);
  console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((error) => {
  console.error('❌ Failed to fetch VGS grade data:', error);
  process.exit(1);
});

