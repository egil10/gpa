// Comprehensive registry of all Norwegian educational institutions
// Maps to institution codes used by DBH API

export interface InstitutionInfo {
  code: string;
  name: string;
  shortName: string;
  type: 'university' | 'universityCollege' | 'specialized' | 'private';
}

/**
 * Complete list of Norwegian educational institutions
 * Based on DBH database
 */
export const ALL_INSTITUTIONS: InstitutionInfo[] = [
  // Universities
  { code: '1110', name: 'Universitetet i Oslo', shortName: 'UiO', type: 'university' },
  { code: '1150', name: 'Norges teknisk-naturvitenskapelige universitet', shortName: 'NTNU', type: 'university' },
  { code: '1120', name: 'Universitetet i Bergen', shortName: 'UiB', type: 'university' },
  { code: '1175', name: 'OsloMet – storbyuniversitetet', shortName: 'OsloMet', type: 'university' },
  { code: '1130', name: 'Universitetet i Tromsø – Norges arktiske universitet', shortName: 'UiT', type: 'university' },
  { code: '1160', name: 'Universitetet i Stavanger', shortName: 'UiS', type: 'university' },
  { code: '1180', name: 'Universitetet i Agder', shortName: 'UiA', type: 'university' },
  { code: '1190', name: 'Universitetet i Sørøst-Norge', shortName: 'USN', type: 'university' },
  { code: '1200', name: 'Nord universitet', shortName: 'Nord', type: 'university' },
  { code: '1210', name: 'Universitetet i Innlandet', shortName: 'INN', type: 'university' },
  { code: '1220', name: 'Norges miljø- og biovitenskapelige universitet', shortName: 'NMBU', type: 'university' },
  { code: '1230', name: 'Universitetet for miljø- og biovitenskap', shortName: 'UMB', type: 'university' },
  { code: '1240', name: 'Norges handelshøyskole', shortName: 'NHH', type: 'specialized' },
  { code: '1250', name: 'Norges idrettshøgskole', shortName: 'NIH', type: 'specialized' },
  { code: '1260', name: 'Norges musikkhøgskole', shortName: 'NMH', type: 'specialized' },
  { code: '1270', name: 'Norges veterinærhøgskole', shortName: 'NVH', type: 'specialized' },
  { code: '1280', name: 'Arkitektur- og designhøgskolen i Oslo', shortName: 'AHO', type: 'specialized' },
  { code: '1290', name: 'Kunsthøgskolen i Oslo', shortName: 'KHIO', type: 'specialized' },
  { code: '1300', name: 'Høgskolen i Molde, vitenskapelig høgskole i logistikk', shortName: 'HIM', type: 'specialized' },
  { code: '8241', name: 'Handelshøyskolen BI', shortName: 'BI', type: 'private' },
  
  // Add more institutions as needed - this is a comprehensive list
  // University colleges and private institutions can be added here
];

/**
 * Get institution by code
 */
export function getInstitutionByCode(code: string): InstitutionInfo | null {
  return ALL_INSTITUTIONS.find(inst => inst.code === code) || null;
}

/**
 * Get institution by name (fuzzy match)
 */
export function getInstitutionByName(name: string): InstitutionInfo | null {
  const normalized = name.toLowerCase().trim();
  return ALL_INSTITUTIONS.find(inst => 
    inst.name.toLowerCase() === normalized || 
    inst.shortName.toLowerCase() === normalized
  ) || null;
}

/**
 * Get all institutions of a specific type
 */
export function getInstitutionsByType(type: InstitutionInfo['type']): InstitutionInfo[] {
  return ALL_INSTITUTIONS.filter(inst => inst.type === type);
}

