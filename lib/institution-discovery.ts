import { GradeData } from '@/types';
import { extractCoursesFromDepartmentData } from './department-utils';

/**
 * Discover unique departments/faculties from institution course data
 */
export interface DiscoveredDepartment {
  departmentCode?: string;
  departmentName?: string;
  facultyCode?: string;
  facultyName?: string;
  courseCount: number;
}

/**
 * Extract unique departments and faculties from raw grade data
 * This helps discover the structure of an institution
 */
export function discoverDepartmentsFromData(data: GradeData[]): DiscoveredDepartment[] {
  // Group by department/faculty codes if available in the data
  // Note: The API response might include these fields
  const deptMap = new Map<string, DiscoveredDepartment>();
  
  data.forEach((item) => {
    // Extract department/faculty info if available
    // The API might return these fields in different formats
    const deptKey = `${item.Institusjonskode || ''}`;
    
    if (!deptMap.has(deptKey)) {
      deptMap.set(deptKey, {
        courseCount: 0,
      });
    }
    
    deptMap.get(deptKey)!.courseCount++;
  });
  
  return Array.from(deptMap.values()).sort((a, b) => b.courseCount - a.courseCount);
}

/**
 * Get all unique course codes from institution data
 */
export function getAllCoursesFromInstitution(data: GradeData[]): Array<{
  courseCode: string;
  years: number[];
  totalStudents: number;
  departments?: string[]; // If department info is available
}> {
  return extractCoursesFromDepartmentData(data);
}

