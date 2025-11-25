/**
 * VGS Grade Data Loader
 * Loads VGS grade statistics from the parsed JSON file
 */

import { GradeData } from '@/types';

interface VGSGradeDataEntry {
  courseCode: string;
  courseName: string;
  year: string; // e.g., "2024-25"
  averageGrade: number | null;
  totalStudents: number | null;
  gradeDistribution: {
    '1': number | null;
    '2': number | null;
    '3': number | null;
    '4': number | null;
    '5': number | null;
    '6': number | null;
  };
  level: string;
}

interface VGSGradeDataFile {
  metadata: {
    source: string;
    url: string;
    csvFile: string;
    parsedAt: string;
    totalRecords: number;
    nationalRecords: number;
    uniqueCourses: number;
    years: string[];
  };
  gradeData: VGSGradeDataEntry[];
}

let cachedVGSData: VGSGradeDataFile | null = null;

/**
 * Load VGS grade data from JSON file (cached)
 */
async function loadVGSGradeData(): Promise<VGSGradeDataFile> {
  if (cachedVGSData) {
    return cachedVGSData;
  }

  // Try multiple paths (for different deployment scenarios)
  const possiblePaths = [
    '/data/vgs-grade-statistics.json',
    '/gpa/data/vgs-grade-statistics.json',
  ];

  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        cachedVGSData = await response.json();
        return cachedVGSData;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }

  throw new Error(`Failed to load VGS grade data from any path: ${possiblePaths.join(', ')}`);
}

/**
 * Convert VGS grade data (1-6 scale) to GradeData format (for compatibility)
 */
function convertVGSGradeDataToGradeData(
  vgsData: VGSGradeDataEntry[]
): GradeData[] {
  const gradeData: GradeData[] = [];

  for (const entry of vgsData) {
    // Extract year from "2024-25" format (use start year)
    const year = parseInt(entry.year.split('-')[0], 10);

    // Convert grade distribution (1-6 scale) to GradeData format
    // Each grade becomes a separate entry
    const grades = ['1', '2', '3', '4', '5', '6'] as const;
    
    for (const grade of grades) {
      const percentage = entry.gradeDistribution[grade];
      if (percentage === null || percentage === undefined) continue;

      // Calculate count from percentage and total students
      const totalStudents = entry.totalStudents || 0;
      const count = Math.round((percentage / 100) * totalStudents);
      
      if (count > 0) {
        gradeData.push({
          Institusjonskode: 'VGS',
          Emnekode: entry.courseCode,
          Karakter: grade, // 1-6 scale
          Årstall: String(year),
          'Antall kandidater totalt': String(count),
        });
      }
    }
  }

  return gradeData;
}

/**
 * Fetch VGS grade data for a specific course code
 */
export async function fetchVGSGradeData(
  courseCode: string
): Promise<GradeData[]> {
  try {
    const data = await loadVGSGradeData();
    
    // Normalize course code (uppercase, trim)
    const normalizedCode = courseCode.toUpperCase().trim();
    
    // Find matching entries
    const matchingEntries = data.gradeData.filter(
      entry => entry.courseCode.toUpperCase() === normalizedCode
    );

    if (matchingEntries.length === 0) {
      return [];
    }

    // Convert to GradeData format
    return convertVGSGradeDataToGradeData(matchingEntries);
  } catch (error) {
    console.error(`Error fetching VGS grade data for ${courseCode}:`, error);
    return [];
  }
}

/**
 * Get all VGS courses with grade data
 */
export async function getAllVGSCourses(): Promise<Array<{
  code: string;
  name: string;
  years: string[];
}>> {
  try {
    const data = await loadVGSGradeData();
    const courseMap = new Map<string, { name: string; years: Set<string> }>();

    for (const entry of data.gradeData) {
      if (!courseMap.has(entry.courseCode)) {
        courseMap.set(entry.courseCode, {
          name: entry.courseName,
          years: new Set(),
        });
      }
      courseMap.get(entry.courseCode)!.years.add(entry.year);
    }

    return Array.from(courseMap.entries()).map(([code, info]) => ({
      code,
      name: info.name,
      years: Array.from(info.years).sort(),
    }));
  } catch (error) {
    console.error('Error loading VGS courses:', error);
    return [];
  }
}

