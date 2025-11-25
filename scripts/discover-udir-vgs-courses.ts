/**
 * Script to fetch all VGS course codes from UDIR (Norwegian Directorate for Education)
 * 
 * This script scrapes course codes from:
 * https://sokeresultat.udir.no/finn-lareplan.html?query=&fltypefiltermulti=Fagkode
 * 
 * The API endpoint is:
 * https://sok.udir.no/_api/search/query
 */

import * as fs from 'fs';
import * as path from 'path';

interface UDIRCourse {
  code: string; // e.g., "IDR2018"
  name: string; // e.g., "Aktivitetslære 1"
  url: string;
  status: string; // "GJELDENDE" or other
  level?: string; // VG1, VG2, VG3, etc.
  educationProgram?: string;
  hours?: number;
}

interface APIResponse {
  d: {
    query: {
      PrimaryQueryResult: {
        RelevantResults: {
          TotalRowsIncludingDuplicates: number;
          RowCount: number;
          Table: {
            Rows: Array<{
              Cells: Array<{
                Key: string;
                Value: string;
                ValueType: string;
              }>;
            }>;
          };
        };
      };
    };
  };
}

const RESULTS_PER_PAGE = 10;
const BASE_API_URL = 'https://sok.udir.no/_api/search/query';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'udir-vgs-courses.json');

/**
 * Build API URL with parameters
 * Note: The API expects single quotes around values in some parameters
 */
function buildApiUrl(startRow: number = 0): string {
  // Build query string manually to match the exact format the browser uses
  const params: string[] = [
    `querytext='*'`,
    `selectproperties='Path,Url,Title,kode,fagnavn,status,nivaa,utdanningsprogram,TitleNormalized'`,
    `trimduplicates=false`,
    `culture=1044`,
    `enablequeryrules=true`,
    `processbestbets=true`,
    `refiners='fltypefiltermulti(sort=name/ascending),spraakmaalform(sort=name/ascending),nivaa(sort=name/ascending),status(sort=name/ascending),utdanningsprogram(sort=name/ascending),laereplanfagtype(sort=name/ascending)'`,
    `refinementFilters='fltypefiltermulti:"Fagkode"'`,
    `properties='SourceName:Lareplanverket,SourceLevel:SPSite'`,
    `hithighlightedproperties='formaal,description,laereplanengtittel,laereplantilhorendefagkode,laereplantilhorendefagkodeutenvurdering'`,
    `clienttype='AllResultsQuery'`,
    `sortlist='fltypesublk:descending,TitleNormalized:ascending'`,
    `startrow=${startRow}`,
    `rowlimit=${RESULTS_PER_PAGE}`,
  ];

  return `${BASE_API_URL}?${params.join('&')}`;
}

/**
 * Parse API response and extract course data
 * The SharePoint Search API returns JSON with OData format
 */
async function fetchCoursesPage(startRow: number): Promise<{
  courses: UDIRCourse[];
  totalResults: number;
  hasMore: boolean;
}> {
  const url = buildApiUrl(startRow);
  console.log(`Fetching page starting at row ${startRow}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP error! status: ${response.status}`);
      console.error(`Response: ${text.substring(0, 500)}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    // Check if it's XML or JSON
    let data: any;
    if (text.trim().startsWith('<?xml')) {
      console.warn('⚠️  Received XML response. The API might require different parameters.');
      // For now, skip this page
      return { courses: [], totalResults: 0, hasMore: false };
    }
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(`Failed to parse JSON response:`, text.substring(0, 500));
      return { courses: [], totalResults: 0, hasMore: false };
    }

    // Extract data from SharePoint search API response
    // Try different possible response structures
    let primaryResult: any;
    
    if (data.d?.query?.PrimaryQueryResult?.RelevantResults) {
      primaryResult = data.d.query.PrimaryQueryResult.RelevantResults;
    } else if (data.PrimaryQueryResult?.RelevantResults) {
      primaryResult = data.PrimaryQueryResult.RelevantResults;
    } else if (data.query?.PrimaryQueryResult?.RelevantResults) {
      primaryResult = data.query.PrimaryQueryResult.RelevantResults;
    }
    
    if (!primaryResult) {
      console.warn('⚠️  Unexpected API response structure. Keys:', Object.keys(data));
      // Log first 1000 chars of response for debugging
      console.log('Response sample:', JSON.stringify(data).substring(0, 1000));
      return { courses: [], totalResults: 0, hasMore: false };
    }

    const totalResults = primaryResult.TotalRowsIncludingDuplicates || primaryResult.TotalRows || 0;
    const rows = primaryResult.Table?.Rows || primaryResult.Rows || [];

    const courses: UDIRCourse[] = rows.map((row: any) => {
      const cells = row.Cells || row.cells || [];
      const cellMap: Record<string, string> = {};
      
      cells.forEach((cell: any) => {
        const key = cell.Key || cell.key || cell.Key || '';
        const value = cell.Value || cell.value || cell.Value || '';
        cellMap[key] = value;
      });

      // Extract course code and name from Title (format: "CODE - Name" or just "Name")
      const title = cellMap.Title || cellMap.title || '';
      const match = title.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
      const code = match ? match[1] : (cellMap.kode || cellMap.Kode || '');
      const name = match ? match[2].trim() : (cellMap.fagnavn || cellMap.Fagnavn || title.trim());

      // Try to extract level from nivaa or from title/education program
      let level = cellMap.nivaa || cellMap.Nivaa;
      if (!level) {
        // Try to infer from title (VG1, VG2, VG3)
        const levelMatch = title.match(/VG[123]/i) || name.match(/VG[123]/i);
        if (levelMatch) {
          level = levelMatch[0].toUpperCase();
        }
      }

      return {
        code: code.toUpperCase(),
        name: name || 'Untitled',
        url: cellMap.Path || cellMap.Url || cellMap.path || cellMap.url || '',
        status: cellMap.status || cellMap.Status || 'UNKNOWN',
        level: level ? level.toUpperCase() : undefined,
        educationProgram: cellMap.utdanningsprogram || cellMap.Utdanningsprogram || undefined,
      };
    }).filter((course: UDIRCourse) => course.code && course.name); // Filter out invalid entries

    const hasMore = startRow + RESULTS_PER_PAGE < totalResults;

    return {
      courses,
      totalResults,
      hasMore,
    };
  } catch (error: any) {
    console.error(`❌ Error fetching page at row ${startRow}:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return { courses: [], totalResults: 0, hasMore: false };
  }
}

/**
 * Fetch all courses by paginating through results
 */
async function fetchAllCourses(): Promise<UDIRCourse[]> {
  const allCourses: UDIRCourse[] = [];
  let startRow = 0;
  let totalResults = 0;
  let pageCount = 0;

  console.log('Starting to fetch all UDIR VGS courses...\n');

  while (true) {
    const result = await fetchCoursesPage(startRow);
    
    if (result.totalResults > 0 && totalResults === 0) {
      totalResults = result.totalResults;
      console.log(`Total results found: ${totalResults}\n`);
    }

    allCourses.push(...result.courses);
    pageCount++;
    
    console.log(`Page ${pageCount}: Fetched ${result.courses.length} courses (Total so far: ${allCourses.length}/${totalResults})`);

    if (!result.hasMore || result.courses.length === 0) {
      break;
    }

    startRow += RESULTS_PER_PAGE;
    
    // Be nice to the server - add a small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Finished fetching all courses!`);
  console.log(`Total courses collected: ${allCourses.length}`);

  return allCourses;
}

/**
 * Main execution
 */
async function main() {
  try {
    const courses = await fetchAllCourses();

    // Remove duplicates based on course code
    const uniqueCourses = Array.from(
      new Map(courses.map(c => [c.code, c])).values()
    );

    console.log(`\nUnique courses: ${uniqueCourses.length}`);
    console.log(`Duplicates removed: ${courses.length - uniqueCourses.length}`);

    // Sort by course code
    uniqueCourses.sort((a, b) => a.code.localeCompare(b.code));

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save to JSON
    const output = {
      metadata: {
        source: 'UDIR (Utdanningsdirektoratet)',
        url: 'https://sokeresultat.udir.no/finn-lareplan.html',
        fetchedAt: new Date().toISOString(),
        totalCourses: uniqueCourses.length,
      },
      courses: uniqueCourses,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✅ Saved to: ${OUTPUT_FILE}`);

    // Print some sample courses
    console.log('\n📚 Sample courses:');
    uniqueCourses.slice(0, 10).forEach(course => {
      console.log(`  ${course.code} - ${course.name}`);
    });

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

