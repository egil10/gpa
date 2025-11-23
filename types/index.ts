export interface GradeData {
  Institusjonskode: string;
  Emnekode: string;
  Karakter: string;
  Årstall: string;
  "Antall kandidater totalt": string;
  "Antall kandidater kvinner"?: string;
  "Antall kandidater menn"?: string;
}

export interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

export interface CourseStats {
  courseCode: string;
  year: number;
  institution: string;
  totalStudents: number;
  distributions: GradeDistribution[];
  averageGrade?: number;
}

export interface University {
  code: string;
  name: string;
  shortName: string;
}

export interface SearchPayload {
  tabell_id: number;
  api_versjon: number;
  statuslinje: string;
  begrensning: string;
  kodetekst: string;
  desimal_separator: string;
  groupBy: string[];
  sortBy: string[];
  filter: Array<{
    variabel: string;
    selection: {
      filter: string;
      values: string[];
    };
  }>;
}

export interface DepartmentFilter {
  facultyCode?: string;
  departmentCode?: string;
}

export interface StudyProgramFilter {
  studiumCode?: string; // Studium code (e.g., "ØA" for NHH)
  programCode?: string; // Studieprogram code (e.g., "BACHELOR15")
}


