export type GradeSystem = 'university' | 'highschool';

export interface Course {
  id: string;
  name: string;
  grade: string;
  credits: number;
  system: GradeSystem;
}

export interface GPACalculation {
  totalCredits: number;
  weightedSum: number;
  gpa: number;
  courses: Course[];
  bonusPoints?: number; // For high school: tilleggspoeng (0-4)
  gpaWithBonus?: number; // GPA including bonus points
}

export const UNIVERSITY_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const HIGHSCHOOL_GRADES = ['6', '5', '4', '3', '2', '1'] as const;

export const GRADE_VALUES: Record<string, number> = {
  // University grades
  'A': 5,
  'B': 4,
  'C': 3,
  'D': 2,
  'E': 1,
  'F': 0,
  // High school grades
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
  '1': 1,
};

export function calculateGPA(courses: Course[], bonusPoints: number = 0): GPACalculation {
  if (courses.length === 0) {
    return {
      totalCredits: 0,
      weightedSum: 0,
      gpa: 0,
      courses: [],
      bonusPoints: bonusPoints > 0 ? bonusPoints : undefined,
      gpaWithBonus: bonusPoints > 0 ? Math.round((0 + bonusPoints * 0.1) * 100) / 100 : undefined,
    };
  }

  let totalCredits = 0;
  let weightedSum = 0;

  courses.forEach((course) => {
    const gradeValue = GRADE_VALUES[course.grade] || 0;
    const credits = course.credits || 0;
    totalCredits += credits;
    weightedSum += gradeValue * credits;
  });

  const gpa = totalCredits > 0 ? weightedSum / totalCredits : 0;
  
  // For high school: bonus points add 0.1 per point to GPA
  const gpaWithBonus = bonusPoints > 0 
    ? Math.round((gpa + bonusPoints * 0.1) * 100) / 100 
    : undefined;

  return {
    totalCredits,
    weightedSum,
    gpa: Math.round(gpa * 100) / 100,
    courses,
    bonusPoints: bonusPoints > 0 ? bonusPoints : undefined,
    gpaWithBonus,
  };
}

