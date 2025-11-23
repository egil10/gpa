import { GradeData, GradeDistribution, CourseStats } from '@/types';

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

  const distributions: GradeDistribution[] = data.map((item) => {
    const count = parseInt(item['Antall kandidater totalt'] || '0', 10);
    const percentage = Math.round((count / totalStudents) * 100);
    
    let grade = item.Karakter;
    if (grade === 'G') grade = 'Bestått';
    if (grade === 'H') grade = 'Ikke bestått';
    
    return {
      grade,
      count,
      percentage,
    };
  });

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


