// Videregående skole (High School) courses database
// Based on Studiespesialisering program structure

export interface VGSCourse {
  name: string;
  category: 'fellesfag' | 'realfag' | 'språk-samfunnsfag-økonomi' | 'andre-programfag';
  level?: 'VG1' | 'VG2' | 'VG3';
  hours?: number; // Teaching hours
  credits?: number; // Typical credit value (1 credit = 1 year subject)
}

export const VGS_COURSES: VGSCourse[] = [
  // VG1 Fellesfag (Common subjects)
  { name: 'Engelsk', category: 'fellesfag', level: 'VG1', hours: 140 },
  { name: 'Fremmedspråk nivå I', category: 'fellesfag', level: 'VG1', hours: 113 },
  { name: 'Fremmedspråk nivå II', category: 'fellesfag', level: 'VG1', hours: 113 },
  { name: 'Geografi', category: 'fellesfag', level: 'VG1', hours: 56 },
  { name: 'Kroppsøving', category: 'fellesfag', level: 'VG1', hours: 56 },
  { name: 'Matematikk 1P (praktisk)', category: 'fellesfag', level: 'VG1', hours: 140 },
  { name: 'Matematikk 1T (teoretisk)', category: 'fellesfag', level: 'VG1', hours: 140 },
  { name: 'Naturfag', category: 'fellesfag', level: 'VG1', hours: 140 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG1', hours: 113 },
  { name: 'Samfunnskunnskap', category: 'fellesfag', level: 'VG1', hours: 84 },
  
  // VG2/VG3 Fellesfag
  { name: 'Historie', category: 'fellesfag', level: 'VG2', hours: 56 },
  { name: 'Historie', category: 'fellesfag', level: 'VG3', hours: 113 },
  { name: 'Kroppsøving', category: 'fellesfag', level: 'VG2', hours: 56 },
  { name: 'Kroppsøving', category: 'fellesfag', level: 'VG3', hours: 56 },
  { name: 'Matematikk 2P (praktisk)', category: 'fellesfag', level: 'VG2', hours: 84 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG2', hours: 112 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG3', hours: 168 },
  { name: 'Religion og etikk', category: 'fellesfag', level: 'VG3', hours: 84 },
  
  // Realfag program subjects
  { name: 'Biologi', category: 'realfag' },
  { name: 'Fysikk', category: 'realfag' },
  { name: 'Geofag', category: 'realfag' },
  { name: 'Informasjonsteknologi', category: 'realfag' },
  { name: 'Kjemi', category: 'realfag' },
  { name: 'Matematikk for realfag', category: 'realfag' },
  { name: 'Matematikk for samfunnsfag', category: 'realfag' },
  { name: 'Matematikk R1', category: 'realfag' },
  { name: 'Matematikk R2', category: 'realfag' },
  { name: 'Matematikk S1', category: 'realfag' },
  { name: 'Matematikk S2', category: 'realfag' },
  { name: 'Programmering og modellering', category: 'realfag' },
  { name: 'Teknologi og forskningslære', category: 'realfag' },
  
  // Språk, samfunnsfag og økonomi program subjects
  { name: 'Antikkens kultur', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Engelsk (programfag)', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Entreprenørskap og bedriftsutvikling', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Fremmedspråk (programfag)', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Fremmedspråk nivå III', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Historie og filosofi', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Kommunikasjon og kultur', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Latin eller gresk', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Markedsføring og ledelse', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Matematikk for realfag', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Matematikk for samfunnsfag', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Matematikk S1', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Matematikk S2', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Medie- og informasjonskunnskap', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Næringslivsøkonomi', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Politikk og menneskerettigheter', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Psykologi', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Reiseliv og språk', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Rettslære', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Samfunnsgeografi', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Samfunnsøkonomi', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Samisk historie og samfunn', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Sosialkunnskap', category: 'språk-samfunnsfag-økonomi' },
  { name: 'Sosiologi og sosialantropologi', category: 'språk-samfunnsfag-økonomi' },
  
  // Andre programfag (Other program subjects)
  { name: 'Dans', category: 'andre-programfag' },
  { name: 'Drama', category: 'andre-programfag' },
  { name: 'Idrettsfag', category: 'andre-programfag' },
  { name: 'Kunst, design og arkitektur', category: 'andre-programfag' },
  { name: 'Medier og kommunikasjon', category: 'andre-programfag' },
  { name: 'Musikk', category: 'andre-programfag' },
  { name: 'Musikk, dans og drama', category: 'andre-programfag' },
];

/**
 * Search VGS courses by name
 */
export function searchVGSCourses(query: string, category?: VGSCourse['category']): VGSCourse[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return VGS_COURSES.slice(0, 20); // Return popular courses when empty

  return VGS_COURSES.filter((course) => {
    const matchesQuery = course.name.toLowerCase().includes(normalizedQuery);
    const matchesCategory = !category || course.category === category;
    return matchesQuery && matchesCategory;
  }).slice(0, 20); // Limit to 20 results
}

/**
 * Get VGS course by name (exact match)
 */
export function getVGSCourseByName(name: string): VGSCourse | null {
  return VGS_COURSES.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Get all courses in a category
 */
export function getVGSCoursesByCategory(category: VGSCourse['category']): VGSCourse[] {
  return VGS_COURSES.filter((c) => c.category === category);
}

/**
 * Get all courses for a specific level
 */
export function getVGSCoursesByLevel(level: VGSCourse['level']): VGSCourse[] {
  return VGS_COURSES.filter((c) => c.level === level);
}

