import { GradeData, GradeDistribution, CourseStats } from '@/types';

// Standard grade order: A-F always, then Bestått/Ikke bestått if present
export const STANDARD_GRADE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
export const PASS_FAIL_GRADES = ['Bestått', 'Ikke bestått'];

/**
 * Ensures A-F grades are always present (with 0 values if missing)
 * Pass/Fail grades are only included if they exist in the data
 */
export function normalizeGradeDistribution(
  gradeMap: Record<string, { count: number; percentage: number }>,
  totalStudents: number
): GradeDistribution[] {
  const distributions: GradeDistribution[] = [];
  
  // Always include A-F in order, with 0 if missing
  for (const grade of STANDARD_GRADE_ORDER) {
    const data = gradeMap[grade];
    distributions.push({
      grade,
      count: data?.count || 0,
      percentage: data?.percentage || 0,
    });
  }
  
  // Conditionally include Pass/Fail grades if they exist
  for (const grade of PASS_FAIL_GRADES) {
    const data = gradeMap[grade];
    if (data && data.count > 0) {
      distributions.push({
        grade,
        count: data.count,
        percentage: data.percentage,
      });
    }
  }
  
  return distributions;
}

export function processGradeData(data: GradeData[]): CourseStats | null {
  if (!data || data.length === 0) {
    return null;
  }

  const totalStudents = data.reduce((sum, item) => {
    return sum + parseInt(item['Antall kandidater totalt'] || '0', 10);
  }, 0);

  if (totalStudents === 0) {
    return null;
  }

  // Build grade map
  const gradeMap: Record<string, { count: number; percentage: number }> = {};
  
  data.forEach((item) => {
    const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
    let grade = item.Karakter;
    if (grade === 'G') grade = 'Bestått';
    if (grade === 'H') grade = 'Ikke bestått';
    
    if (!gradeMap[grade]) {
      gradeMap[grade] = { count: 0, percentage: 0 };
    }
    gradeMap[grade].count += count;
  });

  // Calculate percentages
  Object.keys(gradeMap).forEach((grade) => {
    gradeMap[grade].percentage = Math.round((gradeMap[grade].count / totalStudents) * 100);
  });

  // Normalize to always include A-F
  const distributions = normalizeGradeDistribution(gradeMap, totalStudents);

  // Calculate average grade (A=5, B=4, C=3, D=2, E=1, F=0)
  const gradeValues: Record<string, number> = {
    'A': 5,
    'B': 4,
    'C': 3,
    'D': 2,
    'E': 1,
    'F': 0,
    'Bestått': 3,
    'Ikke bestått': 0,
  };

  let weightedSum = 0;
  distributions.forEach((dist) => {
    const value = gradeValues[dist.grade] ?? 0;
    weightedSum += value * dist.count;
  });

  const averageGrade = totalStudents > 0 ? weightedSum / totalStudents : 0;

  return {
    courseCode: data[0].Emnekode,
    year: parseInt(data[0].Årstall, 10),
    institution: data[0].Institusjonskode,
    totalStudents,
    distributions,
    averageGrade: Math.round(averageGrade * 100) / 100,
  };
}

// Process data grouped by year
export function processMultiYearData(data: GradeData[]): Record<number, CourseStats> {
  if (!data || data.length === 0) {
    return {};
  }

  // Group by year
  const byYear: Record<number, GradeData[]> = {};
  data.forEach((item) => {
    const year = parseInt(item.Årstall, 10);
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(item);
  });

  // Process each year
  const result: Record<number, CourseStats> = {};
  Object.entries(byYear).forEach(([yearStr, yearData]) => {
    const year = parseInt(yearStr, 10);
    const processed = processGradeData(yearData);
    if (processed) {
      result[year] = processed;
    }
  });

  return result;
}

// Combine all years into one distribution
export function combineAllYears(data: GradeData[]): CourseStats | null {
  if (!data || data.length === 0) {
    return null;
  }

  // Group by grade across all years
  const gradeMap: Record<string, { count: number; percentage: number }> = {};
  let totalStudents = 0;

  data.forEach((item) => {
    let grade = item.Karakter;
    if (grade === 'G') grade = 'Bestått';
    if (grade === 'H') grade = 'Ikke bestått';
    
    const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
    if (!gradeMap[grade]) {
      gradeMap[grade] = { count: 0, percentage: 0 };
    }
    gradeMap[grade].count += count;
    totalStudents += count;
  });

  if (totalStudents === 0) {
    return null;
  }

  // Calculate percentages
  Object.keys(gradeMap).forEach((grade) => {
    gradeMap[grade].percentage = Math.round((gradeMap[grade].count / totalStudents) * 100);
  });

  // Normalize to always include A-F
  const distributions = normalizeGradeDistribution(gradeMap, totalStudents);

  // Calculate average grade
  const gradeValues: Record<string, number> = {
    'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0,
    'Bestått': 3, 'Ikke bestått': 0,
  };

  let weightedSum = 0;
  distributions.forEach((dist) => {
    const value = gradeValues[dist.grade] ?? 0;
    weightedSum += value * dist.count;
  });

  const averageGrade = totalStudents > 0 ? weightedSum / totalStudents : 0;

  return {
    courseCode: data[0].Emnekode,
    year: 0, // Combined years
    institution: data[0].Institusjonskode,
    totalStudents,
    distributions,
    averageGrade: Math.round(averageGrade * 100) / 100,
  };
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getAvailableYears(): number[] {
  const currentYear = getCurrentYear();
  const years: number[] = [];
  for (let i = currentYear; i >= 2010; i--) {
    years.push(i);
  }
  return years;
}


