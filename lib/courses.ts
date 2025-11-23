import { UNIVERSITIES } from './api';

export interface CourseInfo {
  code: string;
  name: string;
  institution: string;
  institutionCode: string;
}

// Popular courses database - can be expanded
export const POPULAR_COURSES: CourseInfo[] = [
  // UiO courses
  { code: 'IN2010', name: 'Algoritmer og datastrukturer', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1010', name: 'Programmering', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2000', name: 'Objektorientert programmering', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2090', name: 'Databaser', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2020', name: 'Systemutvikling', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2140', name: 'Operativsystemer', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK1100', name: 'Sannsynlighetsregning og statistikk', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT1100', name: 'Kalkulus', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT1110', name: 'Kalkulus og lineær algebra', institution: 'UiO', institutionCode: '1110' },
  { code: 'ECON1100', name: 'Grunnkurs i samfunnsøkonomi', institution: 'UiO', institutionCode: '1110' },
  { code: 'PSYK1001', name: 'Innføring i psykologi', institution: 'UiO', institutionCode: '1110' },
  { code: 'JUS1100', name: 'Rettslære', institution: 'UiO', institutionCode: '1110' },
  
  // NTNU courses
  { code: 'TDT4100', name: 'Objektorientert programmering', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4110', name: 'Datastrukturer og algoritmer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4120', name: 'Algoritmer og datastrukturer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4135', name: 'Kunstig intelligens', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4140', name: 'Programvareutvikling', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4145', name: 'Datamodellering og databasesystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4173', name: 'Informasjonssystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4100', name: 'Matematikk 1', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4115', name: 'Kalkulus 3', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4140', name: 'Diskret matematikk', institution: 'NTNU', institutionCode: '1150' },
  
  // UiB courses
  { code: 'INF100', name: 'Grunnkurs i programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'INF101', name: 'Objektorientert programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'INF102', name: 'Algoritmer, datastrukturer og programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'MAT111', name: 'Kalkulus', institution: 'UiB', institutionCode: '1120' },
  
  // OsloMet courses
  { code: 'DAT1000', name: 'Grunnleggende programmering', institution: 'OsloMet', institutionCode: '1175' },
  { code: 'DAT1100', name: 'Objektorientert programmering', institution: 'OsloMet', institutionCode: '1175' },
  
  // BI courses
  { code: 'BØK110', name: 'Grunnleggende bedriftsøkonomi', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK120', name: 'Finansregnskap', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK130', name: 'Bedriftsøkonomi', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK140', name: 'Markedsføring', institution: 'BI', institutionCode: '8241' },
  
  // More UiO courses
  { code: 'IN1000', name: 'Introduksjon til datamaskiner og datamaskinarkitektur', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1050', name: 'Brukerorientert design', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1150', name: 'Webteknologi', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK2100', name: 'Modellering og simulering', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2400', name: 'Lineær algebra', institution: 'UiO', institutionCode: '1110' },
  
  // More NTNU courses
  { code: 'TDT4180', name: 'Menneske-maskin interaksjon', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4186', name: 'Operativsystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4200', name: 'Algoritmer og datastrukturer', institution: 'NTNU', institutionCode: '1150' },
];

export function searchCourses(query: string, institutionFilter?: string): CourseInfo[] {
  const normalizedQuery = query.trim().toUpperCase();
  if (!normalizedQuery) return [];

  return POPULAR_COURSES.filter((course) => {
    const matchesQuery = 
      course.code.toUpperCase().includes(normalizedQuery) ||
      course.name.toUpperCase().includes(normalizedQuery);
    
    const matchesInstitution = !institutionFilter || course.institution === institutionFilter;
    
    return matchesQuery && matchesInstitution;
  }).slice(0, 10); // Limit to 10 results
}

export function getCourseByCode(code: string, institution?: string): CourseInfo | null {
  const normalizedCode = code.trim().toUpperCase();
  const course = POPULAR_COURSES.find((c) => {
    const matchesCode = c.code.toUpperCase() === normalizedCode;
    const matchesInstitution = !institution || c.institution === institution;
    return matchesCode && matchesInstitution;
  });
  
  return course || null;
}

export function getInstitutionForCourse(courseCode: string): string | null {
  const course = getCourseByCode(courseCode);
  return course ? course.institution : null;
}

export function getCoursesForInstitution(institution: string): CourseInfo[] {
  return POPULAR_COURSES.filter((c) => c.institution === institution);
}

