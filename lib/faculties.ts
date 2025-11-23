// Faculty and Department codes for universities
// These codes come from the DBH API structure

export interface Department {
  code: string;
  name: string;
  facultyCode: string;
  facultyName: string;
}

export interface Faculty {
  code: string;
  name: string;
  departments: Department[];
}

export interface UniversityFaculties {
  [institutionCode: string]: Faculty[];
}

// University Faculty and Department codes
// Based on URL structure from DBH API

// UiO structure:
// - fakultet=260: Det matematisk-naturvitenskapelige fakultet
// - ufakkode=210: Matematisk institutt
// - ufakkode=250: Fysisk institutt

// NHH structure:
// - fakultet=145: (Faculty code - name to be determined)
// - ufakkode=000: Institutt for finans
export const FACULTIES: UniversityFaculties = {
  '1110': [ // UiO
    {
      code: '260',
      name: 'Det matematisk-naturvitenskapelige fakultet',
      departments: [
        {
          code: '210',
          name: 'Matematisk institutt',
          facultyCode: '260',
          facultyName: 'Det matematisk-naturvitenskapelige fakultet',
        },
        {
          code: '250',
          name: 'Fysisk institutt',
          facultyCode: '260',
          facultyName: 'Det matematisk-naturvitenskapelige fakultet',
        },
        // Add more departments as discovered
      ],
    },
    // Add more faculties as discovered
  ],
  '1240': [ // NHH - Norges handelshøyskole
    {
      code: '145',
      name: 'NHH', // Faculty name to be determined from DBH data
      departments: [
        {
          code: '000',
          name: 'Institutt for finans',
          facultyCode: '145',
          facultyName: 'NHH',
        },
        // Add more departments as discovered
      ],
    },
    // Add more faculties as discovered
  ],
  // Add other universities as needed
};

// Helper functions
export function getFacultiesForInstitution(institutionCode: string): Faculty[] {
  return FACULTIES[institutionCode] || [];
}

export function getDepartmentsForFaculty(institutionCode: string, facultyCode: string): Department[] {
  const faculties = FACULTIES[institutionCode] || [];
  const faculty = faculties.find(f => f.code === facultyCode);
  return faculty?.departments || [];
}

export function getDepartmentByCode(institutionCode: string, departmentCode: string): Department | null {
  const faculties = FACULTIES[institutionCode] || [];
  for (const faculty of faculties) {
    const dept = faculty.departments.find(d => d.code === departmentCode);
    if (dept) return dept;
  }
  return null;
}

export function getFacultyByCode(institutionCode: string, facultyCode: string): Faculty | null {
  const faculties = FACULTIES[institutionCode] || [];
  return faculties.find(f => f.code === facultyCode) || null;
}

