// Videregående skole (High School) courses database
// Based on Studiespesialisering program structure

export interface VGSCourse {
  name: string;
  category: 'fellesfag' | 'realfag' | 'språk-samfunnsfag-økonomi' | 'andre-programfag' | 'idrettsfag' | 'kunst-design-arkitektur' | 'medier-kommunikasjon' | 'musikk-dans-drama' | 'dans' | 'drama' | 'musikk';
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
  { name: 'Matematikk 1P-Y (praktisk) for bygg- og anleggsteknikk', category: 'fellesfag', level: 'VG1', hours: 84 },
  { name: 'Matematikk 1T-Y (teoretisk) for bygg- og anleggsteknikk', category: 'fellesfag', level: 'VG1', hours: 84 },
  { name: 'Naturfag', category: 'fellesfag', level: 'VG1', hours: 140 },
  { name: 'Naturfag for bygg- og anleggsteknikk', category: 'fellesfag', level: 'VG1', hours: 56 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG1', hours: 113 },
  { name: 'Samfunnskunnskap', category: 'fellesfag', level: 'VG1', hours: 84 },
  
  // VG2/VG3 Fellesfag
  { name: 'Fremmedspråk nivå I', category: 'fellesfag', level: 'VG2', hours: 112 },
  { name: 'Fremmedspråk nivå II', category: 'fellesfag', level: 'VG2', hours: 112 },
  { name: 'Geografi', category: 'fellesfag', level: 'VG2', hours: 56 },
  { name: 'Historie', category: 'fellesfag', level: 'VG2', hours: 56 },
  { name: 'Historie', category: 'fellesfag', level: 'VG3', hours: 113 },
  { name: 'Kroppsøving', category: 'fellesfag', level: 'VG2', hours: 56 },
  { name: 'Kroppsøving', category: 'fellesfag', level: 'VG3', hours: 56 },
  { name: 'Matematikk 2P (praktisk)', category: 'fellesfag', level: 'VG2', hours: 84 },
  { name: 'Matematikk 2P-Y (praktisk)', category: 'fellesfag', level: 'VG3', hours: 140 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG2', hours: 112 },
  { name: 'Norsk', category: 'fellesfag', level: 'VG3', hours: 168 },
  { name: 'Religion og etikk', category: 'fellesfag', level: 'VG3', hours: 84 },
  { name: 'Samfunnskunnskap', category: 'fellesfag', level: 'VG2', hours: 84 },
  
  // Realfag program subjects (typically VG2/VG3, 140 hours each)
  // Students typically choose two subjects for "fordypning" (specialization) over two years
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
  
  // Idrettsfag program subjects
  { name: 'Aktivitetslære 1', category: 'idrettsfag', level: 'VG1', hours: 140 },
  { name: 'Aktivitetslære 2', category: 'idrettsfag', level: 'VG2', hours: 140 },
  { name: 'Aktivitetslære 3', category: 'idrettsfag', level: 'VG3', hours: 140 },
  { name: 'Treningslære 1', category: 'idrettsfag', level: 'VG1', hours: 56 },
  { name: 'Treningslære 1', category: 'idrettsfag', level: 'VG2', hours: 84 },
  { name: 'Treningslære 2', category: 'idrettsfag', level: 'VG3', hours: 140 },
  { name: 'Idrett og samfunn', category: 'idrettsfag', level: 'VG2', hours: 56 },
  { name: 'Idrett og samfunn', category: 'idrettsfag', level: 'VG3', hours: 84 },
  { name: 'Treningsledelse 1', category: 'idrettsfag', level: 'VG2', hours: 56 },
  { name: 'Treningsledelse 2', category: 'idrettsfag', level: 'VG3', hours: 112 },
  { name: 'Breddeidrett', category: 'idrettsfag' },
  { name: 'Friluftsliv', category: 'idrettsfag' },
  { name: 'Lederutvikling', category: 'idrettsfag' },
  { name: 'Toppidrett', category: 'idrettsfag' },
  
  // Kunst, design og arkitektur program subjects
  { name: 'Design og arkitektur 1', category: 'kunst-design-arkitektur', level: 'VG1', hours: 140 },
  { name: 'Design og arkitektur 2', category: 'kunst-design-arkitektur', level: 'VG2', hours: 140 },
  { name: 'Design og arkitektur 3', category: 'kunst-design-arkitektur', level: 'VG3', hours: 140 },
  { name: 'Kunst og visuelle virkemidler 1', category: 'kunst-design-arkitektur', level: 'VG1', hours: 140 },
  { name: 'Kunst og visuelle virkemidler 2', category: 'kunst-design-arkitektur', level: 'VG2', hours: 140 },
  { name: 'Kunst og visuelle virkemidler 3', category: 'kunst-design-arkitektur', level: 'VG3', hours: 140 },
  { name: 'Arkitektur og samfunn', category: 'kunst-design-arkitektur' },
  { name: 'Design og bærekraft', category: 'kunst-design-arkitektur' },
  { name: 'Foto og grafikk', category: 'kunst-design-arkitektur' },
  { name: 'Kunst og skapende arbeid', category: 'kunst-design-arkitektur' },
  { name: 'Samisk visuell kultur', category: 'kunst-design-arkitektur' },
  
  // Medier og kommunikasjon program subjects
  { name: 'Mediesamfunnet 1', category: 'medier-kommunikasjon', level: 'VG1', hours: 140 },
  { name: 'Mediesamfunnet 2', category: 'medier-kommunikasjon', level: 'VG2', hours: 140 },
  { name: 'Mediesamfunnet 3', category: 'medier-kommunikasjon', level: 'VG3', hours: 140 },
  { name: 'Medieuttrykk 1', category: 'medier-kommunikasjon', level: 'VG1', hours: 140 },
  { name: 'Medieuttrykk 2', category: 'medier-kommunikasjon', level: 'VG2', hours: 140 },
  { name: 'Medieuttrykk 3', category: 'medier-kommunikasjon', level: 'VG3', hours: 140 },
  { name: 'Bilde', category: 'medier-kommunikasjon' },
  { name: 'Grafisk design', category: 'medier-kommunikasjon' },
  { name: 'Lyddesign', category: 'medier-kommunikasjon' },
  { name: 'Mediespesialisering', category: 'medier-kommunikasjon' },
  { name: 'Medieutvikling', category: 'medier-kommunikasjon' },
  { name: 'Tekst', category: 'medier-kommunikasjon' },
  
  // Musikk, dans og drama program subjects (VG1)
  { name: 'Musikk, dans og drama', category: 'musikk-dans-drama', level: 'VG1', hours: 140 },
  { name: 'Bevegelse', category: 'musikk-dans-drama', level: 'VG1', hours: 56 },
  { name: 'Danseteknikker', category: 'musikk-dans-drama', level: 'VG1', hours: 140 },
  { name: 'Lytting', category: 'musikk-dans-drama', level: 'VG1', hours: 56 },
  { name: 'Musikk', category: 'musikk-dans-drama', level: 'VG1', hours: 140 },
  { name: 'Teaterensemble', category: 'musikk-dans-drama', level: 'VG1', hours: 140 },
  
  // Dans program subjects (VG2/VG3)
  { name: 'Dans i perspektiv', category: 'dans' },
  { name: 'Grunntrening i dans', category: 'dans' },
  { name: 'Scenisk dans', category: 'dans' },
  { name: 'Danseteknikker', category: 'dans' },
  { name: 'Scenisk dans fordypning', category: 'dans' },
  
  // Drama program subjects (VG2/VG3)
  { name: 'Drama og samfunn', category: 'drama' },
  { name: 'Teater i perspektiv', category: 'drama' },
  { name: 'Teater og bevegelse', category: 'drama' },
  { name: 'Teaterproduksjon', category: 'drama' },
  { name: 'Samisk musikk og scene', category: 'drama' },
  { name: 'Teaterensemble', category: 'drama' },
  { name: 'Teaterproduksjon fordypning', category: 'drama' },
  
  // Musikk program subjects (VG2/VG3)
  { name: 'Ergonomi og bevegelse', category: 'musikk' },
  { name: 'Instruksjon og ledelse', category: 'musikk' },
  { name: 'Instrument, kor, samspill', category: 'musikk' },
  { name: 'Musikk i perspektiv', category: 'musikk' },
  { name: 'Musikk', category: 'musikk' },
  { name: 'Musikk fordypning', category: 'musikk' },
  { name: 'Samisk musikk og scene', category: 'musikk' },
  
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

