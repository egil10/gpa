// Hierarchy configuration for different institutions
// Maps institutions to their preferred hierarchy structure

export type HierarchyType =
  | 'Institusjon-fakultet-institutt-studieprogram-emne' // UiO/NTNU style
  | 'Studium-institusjon-studieprogram-emne' // NHH style
  | 'Institusjonstype-institusjon-fakultet-institutt-studieprogram-emne' // Most complete
  | 'Institusjon-fakultet-emne-studieprogram' // Alternative
  | 'Institusjon-fakultet-studieprogram-emne' // Alternative
  | 'Institusjon-studium-studieprogram-emne' // Alternative
  | 'Fagfelt-institusjon-studieprogram-emne' // Field-based
  | 'Institusjon-fagfelt-studieprogram-emne' // Alternative field-based
  | 'Institusjonstype-institusjon-studieprogram-emne' // Simple
  | 'Hovednivå-undernivå-institusjon-fakultet-studieprogram' // Level-based
  | 'Institusjonstype-institusjon-emne'; // Simplest

export interface HierarchyConfig {
  hierarchyType: HierarchyType;
  variableNames: {
    institutionType?: string; // 'Insttypekode'
    institution: string; // 'Instkode' or 'Institusjonskode'
    faculty?: string; // 'Fakkode'
    department?: string; // 'Ufakkode'
    studium?: string; // 'Studkode'
    field?: string; // 'Fagfeltkode'
    studyProgram?: string; // 'Progkode'
    course: string; // 'Emnekode'
    mainLevel?: string; // 'Hovednivåkode'
    subLevel?: string; // 'Undernivåkode'
  };
  drillingPath: string[]; // Order to drill down: ['institution', 'faculty', 'department', 'course']
}

// Default hierarchy configurations
export const HIERARCHY_CONFIGS: Record<string, HierarchyConfig> = {
  // UiO - Uses faculty/department structure
  '1110': {
    hierarchyType: 'Institusjon-fakultet-institutt-studieprogram-emne',
    variableNames: {
      institution: 'Institusjonskode',
      faculty: 'Fakkode',
      department: 'Ufakkode',
      studyProgram: 'Progkode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'faculty', 'department', 'course'],
  },

  // NTNU - Similar to UiO
  '1150': {
    hierarchyType: 'Institusjon-fakultet-institutt-studieprogram-emne',
    variableNames: {
      institution: 'Institusjonskode',
      faculty: 'Fakkode',
      department: 'Ufakkode',
      studyProgram: 'Progkode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'faculty', 'department', 'course'],
  },

  // UiB - Uses simple structure (no hierarchy drilling needed)
  '1120': {
    hierarchyType: 'Institusjonstype-institusjon-emne',
    variableNames: {
      institution: 'Institusjonskode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'course'],
  },

  // NHH - Uses studium/study program structure
  '1240': {
    hierarchyType: 'Studium-institusjon-studieprogram-emne',
    variableNames: {
      institution: 'Institusjonskode',
      studium: 'Studkode',
      studyProgram: 'Progkode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'studium', 'studyProgram', 'course'],
  },

  // Default fallback - simplest structure
  default: {
    hierarchyType: 'Institusjonstype-institusjon-emne',
    variableNames: {
      institution: 'Institusjonskode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'course'],
  },
};

/**
 * Get hierarchy configuration for an institution
 */
export function getHierarchyConfig(institutionCode: string): HierarchyConfig {
  return HIERARCHY_CONFIGS[institutionCode] || HIERARCHY_CONFIGS.default;
}

/**
 * Check if an institution uses a specific hierarchy component
 */
export function hasHierarchyLevel(
  institutionCode: string,
  level: 'faculty' | 'department' | 'studium' | 'studyProgram' | 'field'
): boolean {
  const config = getHierarchyConfig(institutionCode);
  return config.variableNames[level] !== undefined;
}

