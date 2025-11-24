// Functions to automatically discover institution hierarchies by drilling down
// This allows us to automatically map out all courses without manual configuration

import { GradeData } from '@/types';
import { fetchWithProxy } from './api';
import type { SearchPayload } from '@/types';
import { getHierarchyConfig, HierarchyConfig } from './hierarchy-config';

export interface HierarchyNode {
  code: string;
  name: string;
  level: string;
  children?: HierarchyNode[];
  courseCount?: number;
  hasData?: boolean; // Whether this level has grade data
}

export interface DiscoveredCourse {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  path: string[]; // Full path: ['institution', 'faculty', 'department', 'course']
  pathNames: string[]; // Human-readable path names
}

/**
 * Generic function to fetch data with any combination of filters
 * Exported for testing and advanced usage
 */
export async function fetchWithFilters(
  institutionCode: string,
  filters: Record<string, string[]>,
  year?: number
): Promise<GradeData[]> {
  const filterArray: SearchPayload['filter'] = [
    {
      variabel: 'Institusjonskode',
      selection: { filter: 'item', values: [institutionCode] },
    },
  ];

  // Add all provided filters
  Object.entries(filters).forEach(([variabel, values]) => {
    if (values && values.length > 0) {
      filterArray.push({
        variabel,
        selection: { filter: 'item', values },
      });
    }
  });

  // Add year filter if provided
  if (year) {
    filterArray.push({
      variabel: 'Årstall',
      selection: {
        filter: 'item',
        values: [String(year)],
      },
    });
  }

  const payload: SearchPayload = {
    tabell_id: 308,
    api_versjon: 1,
    statuslinje: 'N',
    begrensning: '10000', // High limit for discovery
    kodetekst: 'Y', // Return codes AND text (names) - changed from 'N' to 'Y'
    desimal_separator: '.',
    groupBy: ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
    sortBy: ['Emnekode', 'Karakter'],
    filter: filterArray,
  };

  // In Node.js environment (like test scripts), call API directly (no CORS)
  const isNode = typeof window === 'undefined';
  if (isNode) {
    const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
    const response = await fetch(DIRECT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (response.status === 204) {
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  // In browser, use proxy system
  return fetchWithProxy(payload);
}

/**
 * Extract unique values for a specific level from grade data
 * This helps us discover what options exist at each hierarchy level
 */
export function extractLevelValues(
  data: GradeData[],
  levelKey: string
): Array<{ code: string; name?: string; count: number }> {
  const valueMap = new Map<string, { name?: string; count: number }>();

  data.forEach((item) => {
    // Access the field dynamically (API might return different field names)
    const code = (item as any)[levelKey];
    if (!code) return;

    const name = (item as any)[`${levelKey}_tekst`] || (item as any)[levelKey + '_navn'];
    
    if (!valueMap.has(code)) {
      valueMap.set(code, { name, count: 0 });
    }
    valueMap.get(code)!.count++;
  });

  return Array.from(valueMap.entries())
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Discover all courses at a specific hierarchy path
 * Works recursively by drilling down level by level
 */
export async function discoverCoursesAtPath(
  institutionCode: string,
  pathFilters: Record<string, string[]> = {},
  year?: number
): Promise<DiscoveredCourse[]> {
  const data = await fetchWithFilters(institutionCode, pathFilters, year);
  
  // Extract unique courses from the data
  const courseMap = new Map<string, DiscoveredCourse>();

  data.forEach((item) => {
    const courseCode = item.Emnekode;
    const yearValue = parseInt(item.Årstall, 10);
    const studentCount = parseInt(item['Antall kandidater totalt'] || '0', 10);
    
    // Try to extract course name from various possible fields
    // The API might return names in different fields depending on kodetekst setting
    const courseName = (item as any).Emnenavn || 
                      (item as any).Emnekode_tekst || 
                      (item as any).Emnekode_navn ||
                      (item as any).Emne_navn ||
                      undefined;

    if (!courseMap.has(courseCode)) {
      courseMap.set(courseCode, {
        courseCode,
        courseName: courseName || undefined, // Extract from API if available
        years: [],
        totalStudents: 0,
        path: [institutionCode, ...Object.values(pathFilters).flat()],
        pathNames: [], // Would need name lookup
      });
    } else {
      // Update course name if we found one and it wasn't set before
      const existing = courseMap.get(courseCode)!;
      if (!existing.courseName && courseName) {
        existing.courseName = courseName;
      }
    }

    const course = courseMap.get(courseCode)!;
    if (!course.years.includes(yearValue)) {
      course.years.push(yearValue);
    }
    course.totalStudents += studentCount;
  });

  // Sort years descending
  courseMap.forEach((course) => {
    course.years.sort((a, b) => b - a);
  });

  return Array.from(courseMap.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );
}

/**
 * Discover the entire hierarchy tree for an institution
 * This recursively drills down from institution → ... → courses
 */
export async function discoverInstitutionHierarchy(
  institutionCode: string,
  year?: number,
  maxDepth: number = 4
): Promise<HierarchyNode> {
  const config = getHierarchyConfig(institutionCode);
  
  // Start by fetching all courses at institution level
  const allData = await discoverCoursesAtPath(institutionCode, {}, year);

  return {
    code: institutionCode,
    name: institutionCode, // Would need lookup
    level: 'institution',
    courseCount: allData.length,
    hasData: allData.length > 0,
    children: [], // Would drill down here if needed
  };
}

/**
 * Simple function to get all courses for an institution
 * This is what we'll use most commonly - no hierarchy drilling needed
 */
export async function getAllCoursesForInstitution(
  institutionCode: string,
  year?: number
): Promise<DiscoveredCourse[]> {
  return discoverCoursesAtPath(institutionCode, {}, year);
}

