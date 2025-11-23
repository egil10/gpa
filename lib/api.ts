import { GradeData, SearchPayload, University, DepartmentFilter, StudyProgramFilter } from '@/types';
import { getCachedData } from './cache';

// NSD API URL - CORS issues in production require a proxy
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';

// Multiple CORS proxy options as fallback (only used if Vercel proxy unavailable)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

// Use proxy in production, direct API in development
const isDevelopment = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Get the Vercel proxy URL (relative path - works when deployed on Vercel)
const getVercelProxyUrl = () => {
  if (typeof window === 'undefined') return null;
  // Use relative path - Vercel will route /api/proxy to the serverless function
  // Works with basePath in next.config.js (e.g., /gpa/api/proxy)
  return '/api/proxy';
};

export const UNIVERSITIES: Record<string, University> = {
  UiO: { code: '1110', name: 'Universitetet i Oslo', shortName: 'UiO' },
  NTNU: { code: '1150', name: 'Norges teknisk-naturvitenskapelige universitet', shortName: 'NTNU' },
  OsloMet: { code: '1175', name: 'OsloMet – storbyuniversitetet', shortName: 'OsloMet' },
  UiB: { code: '1120', name: 'Universitetet i Bergen', shortName: 'UiB' },
  BI: { code: '8241', name: 'Handelshøyskolen BI', shortName: 'BI' },
  NHH: { code: '1240', name: 'Norges handelshøyskole', shortName: 'NHH' },
};

export function createSearchPayload(
  institutionCode: string,
  courseCode?: string,
  year?: number,
  departmentFilter?: DepartmentFilter,
  studyProgramFilter?: StudyProgramFilter
): SearchPayload {
  const filters: SearchPayload['filter'] = [
    {
      variabel: 'Institusjonskode',
      selection: { filter: 'item', values: [institutionCode] },
    },
  ];

  // Add course code filter if provided
  if (courseCode) {
    filters.push({
      variabel: 'Emnekode',
      selection: {
        filter: 'item',
        values: [courseCode], // Course code (formatted with -1 suffix)
      },
    });
  }

  // Add study program filters (for NHH-style hierarchy: Studium → Studieprogram)
  if (studyProgramFilter?.programCode) {
    filters.push({
      variabel: 'Progkode', // Studieprogram code (e.g., "BACHELOR15")
      selection: {
        filter: 'item',
        values: [studyProgramFilter.programCode],
      },
    });
  }
  if (studyProgramFilter?.studiumCode) {
    filters.push({
      variabel: 'Studkode', // Studium code (e.g., "ØA" for "Økonomisk-administrativ utdanning")
      selection: {
        filter: 'item',
        values: [studyProgramFilter.studiumCode],
      },
    });
  }

  // Add department/faculty filters (for UiO/NTNU-style hierarchy: Fakultet → Institutt)
  if (departmentFilter?.departmentCode) {
    filters.push({
      variabel: 'Ufakkode', // Department code (underfakultet/institutt)
      selection: {
        filter: 'item',
        values: [departmentFilter.departmentCode],
      },
    });
  } else if (departmentFilter?.facultyCode) {
    filters.push({
      variabel: 'Fakkode', // Faculty code
      selection: {
        filter: 'item',
        values: [departmentFilter.facultyCode],
      },
    });
  }

  // Add year filter if provided
  if (year) {
    filters.push({
      variabel: 'Årstall',
      selection: {
        filter: 'item',
        values: [String(year)], // Year as string
      },
    });
  }

  return {
    tabell_id: 308,
    api_versjon: 1,
    statuslinje: 'N',
    begrensning: '1000',
    kodetekst: 'N',
    desimal_separator: '.',
    groupBy: courseCode 
      ? ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall']
      : ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
    sortBy: ['Emnekode', 'Karakter'],
    filter: filters,
  };
}

export async function fetchWithProxy(payload: SearchPayload, proxyIndex = 0, useVercelProxy = true): Promise<GradeData[]> {
  if (isDevelopment) {
    // Direct API call in development
    try {
      const response = await fetch(DIRECT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 204 || !response.ok) {
        throw new Error('No data found');
      }

      const data: GradeData[] = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // In production, try Vercel proxy first (if available)
  if (useVercelProxy) {
    const vercelProxyUrl = getVercelProxyUrl();
    if (vercelProxyUrl) {
      try {
        const response = await fetch(vercelProxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 204) {
          throw new Error('No data found');
        }

        if (!response.ok) {
          throw new Error(`Vercel proxy returned ${response.status}`);
        }

        const data: GradeData[] = await response.json();
        return data;
      } catch (error) {
        // If Vercel proxy fails, fall back to public proxies
        console.warn('Vercel proxy failed, falling back to public proxies:', error);
        return fetchWithProxy(payload, 0, false);
      }
    }
  }

  // Fall back to public CORS proxies
  const proxy = CORS_PROXIES[proxyIndex];
  let url: string;
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (proxy.includes('allorigins.win')) {
    url = `${proxy}${encodeURIComponent(DIRECT_API)}`;
  } else {
    url = `${proxy}${encodeURIComponent(DIRECT_API)}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.status === 204 || !response.ok) {
      throw new Error(`Proxy ${proxyIndex} returned ${response.status}`);
    }

    let data: GradeData[];
    if (proxy.includes('allorigins.win')) {
      const text = await response.text();
      data = JSON.parse(text);
    } else {
      data = await response.json();
    }

    return data;
  } catch (error) {
    // Try next proxy if available
    if (proxyIndex < CORS_PROXIES.length - 1) {
      console.warn(`Proxy ${proxyIndex} failed, trying next...`);
      return fetchWithProxy(payload, proxyIndex + 1, false);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Kunne ikke hente data fra NSD API. ` +
      `Dette skyldes CORS-restriksjoner. ` +
      `Original feil: ${errorMessage}`
    );
  }
}

export async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year?: number,
  departmentFilter?: DepartmentFilter
): Promise<GradeData[]> {
  // Try cache first (server-side only)
  if (typeof window === 'undefined') {
    const cached = getCachedData(institutionCode, courseCode);
    if (cached && cached.length > 0) {
      // Filter by year if specified
      if (year) {
        return cached.filter(item => parseInt(item.Årstall, 10) === year);
      }
      return cached;
    }
  }

  // Fall back to API if cache miss or client-side
  const payload = createSearchPayload(institutionCode, courseCode, year, departmentFilter);
  return fetchWithProxy(payload);
}

// Fetch data for all available years
export async function fetchAllYearsData(
  institutionCode: string,
  courseCode: string,
  departmentFilter?: DepartmentFilter
): Promise<GradeData[]> {
  // Fetch without year filter to get all years
  const payload = createSearchPayload(institutionCode, courseCode, undefined, departmentFilter);
  return fetchWithProxy(payload);
}

// Fetch all courses from a department (for browsing)
export async function fetchDepartmentCourses(
  institutionCode: string,
  departmentCode: string,
  year?: number
): Promise<GradeData[]> {
  const payload = createSearchPayload(
    institutionCode,
    undefined, // No specific course
    year,
    { departmentCode }
  );
  return fetchWithProxy(payload);
}

// Fetch all courses from a faculty (for browsing)
export async function fetchFacultyCourses(
  institutionCode: string,
  facultyCode: string,
  year?: number
): Promise<GradeData[]> {
  const payload = createSearchPayload(
    institutionCode,
    undefined, // No specific course
    year,
    { facultyCode }
  );
  return fetchWithProxy(payload);
}

// Fetch ALL courses from an entire institution (no department/faculty filter)
export async function fetchAllInstitutionCourses(
  institutionCode: string,
  year?: number
): Promise<GradeData[]> {
  // Create payload with higher limit for institution-wide queries
  const filters: SearchPayload['filter'] = [
    {
      variabel: 'Institusjonskode',
      selection: { filter: 'item', values: [institutionCode] },
    },
  ];

  if (year) {
    filters.push({
      variabel: 'Årstall',
      selection: {
        filter: 'item',
        values: [String(year)],
      },
    });
  }

  const payload: SearchPayload = {
    tabell_id: 308,
    api_versjon: 1,
    statuslinje: 'N',
    begrensning: '5000', // Higher limit for institution-wide queries
    kodetekst: 'N',
    desimal_separator: '.',
    groupBy: ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
    sortBy: ['Emnekode', 'Karakter'],
    filter: filters,
  };

  return fetchWithProxy(payload);
}

// Fetch courses by study program (for NHH-style hierarchy)
export async function fetchStudyProgramCourses(
  institutionCode: string,
  programCode: string,
  studiumCode?: string,
  year?: number
): Promise<GradeData[]> {
  const payload = createSearchPayload(
    institutionCode,
    undefined, // No specific course
    year,
    undefined, // No department filter
    { programCode, studiumCode }
  );
  return fetchWithProxy(payload);
}

export function formatCourseCode(courseCode: string, institution: string): string {
  // Remove spaces and convert to uppercase (matching inspo implementation)
  const cleaned = courseCode.replace(/\s/g, '').toUpperCase();

  // BI uses format: COURSECODE1 (no dash)
  // Others use format: COURSECODE-1 (with dash)
  if (institution === 'BI') {
    return `${cleaned}1`;
  }
  return `${cleaned}-1`;
}


