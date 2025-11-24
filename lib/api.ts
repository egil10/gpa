import { GradeData, SearchPayload, University, DepartmentFilter, StudyProgramFilter } from '@/types';

// Cache helper - only loads on server-side to avoid bundling fs module
function getCachedDataSafe(
  institutionCode: string,
  courseCode: string
): GradeData[] | null {
  // Only try to use cache on server-side
  // Check multiple ways to ensure we're on server
  if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }

  try {
    // Use Function constructor to make require truly dynamic
    // This prevents webpack from analyzing the require call
    const requireFunc = new Function('modulePath', 'return require(modulePath)');
    const cacheModule = requireFunc('./cache');
    if (cacheModule && typeof cacheModule.getCachedData === 'function') {
      return cacheModule.getCachedData(institutionCode, courseCode);
    }
  } catch (e) {
    // Cache not available or error loading - silently fail
    // This is expected on client-side where cache module is ignored by webpack
    return null;
  }
  
  return null;
}

// NSD API URL - CORS issues in production require a proxy
export const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';

// Multiple CORS proxy options as fallback (only used if Vercel proxy unavailable)
// These are unreliable and may fail - that's expected behavior
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  // Additional fallback option
  'https://cors-anywhere.herokuapp.com/',
];

// Optional custom proxy URL (e.g., hosted on Vercel/Cloudflare/Netlify)
// Can be configured via NEXT_PUBLIC_PROXY_URL or legacy NEXT_PUBLIC_CORS_PROXY_URL
const CUSTOM_PROXY_URL = (process.env.NEXT_PUBLIC_PROXY_URL ||
  process.env.NEXT_PUBLIC_CORS_PROXY_URL ||
  '').trim();

// Use proxy in production, direct API in development
const isBrowser = typeof window !== 'undefined';
const isDevelopment =
  !isBrowser ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Check if we're on GitHub Pages (where Vercel proxy doesn't exist)
const isGitHubPages = isBrowser &&
  (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));

// Get the Vercel proxy URL (relative path - works when deployed on Vercel)
const getVercelProxyUrl = () => {
  if (!isBrowser) return null;
  // Skip Vercel proxy on GitHub Pages - it doesn't exist there
  if (isGitHubPages) return null;
  // Use relative path - Vercel will route /api/proxy to the serverless function
  // Works with basePath in next.config.js (e.g., /gpa/api/proxy)
  return '/api/proxy';
};

export const UNIVERSITIES: Record<string, University> = {
  UiO: { code: '1110', name: 'Universitetet i Oslo', shortName: 'UiO' },
  NTNU: { code: '1150', name: 'Norges teknisk-naturvitenskapelige universitet', shortName: 'NTNU' },
  UiB: { code: '1120', name: 'Universitetet i Bergen', shortName: 'UiB' },
  NHH: { code: '1240', name: 'Norges handelshøyskole', shortName: 'NHH' },
  BI: { code: '8241', name: 'Handelshøyskolen BI', shortName: 'BI' },
  OsloMet: { code: '1175', name: 'OsloMet – storbyuniversitetet', shortName: 'OsloMet' },
  Nord: { code: '1174', name: 'Nord universitet', shortName: 'Nord' },
  NMBU: { code: '1173', name: 'Norges miljø- og biovitenskapelige universitet', shortName: 'NMBU' },
  UiA: { code: '1171', name: 'Universitetet i Agder', shortName: 'UiA' },
  INN: { code: '1177', name: 'Universitetet i Innlandet', shortName: 'INN' },
  UiS: { code: '1160', name: 'Universitetet i Stavanger', shortName: 'UiS' },
  USN: { code: '1176', name: 'Universitetet i Sørøst-Norge', shortName: 'USN' },
  UiT: { code: '1130', name: 'Universitetet i Tromsø – Norges arktiske universitet', shortName: 'UiT' },
  NMH: { code: '1210', name: 'Norges musikkhøgskole', shortName: 'NMH' },
  NIH: { code: '1260', name: 'Norges idrettshøgskole', shortName: 'NIH' },
  KHIO: { code: '6220', name: 'Kunsthøgskolen i Oslo', shortName: 'KHIO' },
  HIM: { code: '0232', name: 'Høgskolen i Molde, vitenskapelig høgskole i logistikk', shortName: 'HiM' },
  AHO: { code: '1220', name: 'Arkitektur- og designhøgskolen i Oslo', shortName: 'AHO' },
  SH: { code: '0217', name: 'Samisk høgskole', shortName: 'SH' },
  HiØ: { code: '0256', name: 'Høgskolen i Østfold', shortName: 'HiØ' },
  HVO: { code: '0236', name: 'Høgskulen i Volda', shortName: 'HVO' },
  HVL: { code: '0238', name: 'Høgskulen på Vestlandet', shortName: 'HVL' },
  VID: { code: '8208', name: 'VID vitenskapelige høgskole', shortName: 'VID' },
  MF: { code: '8221', name: 'MF vitenskapelig høyskole', shortName: 'MF' },
  AHS: { code: '8232', name: 'Ansgar høyskole', shortName: 'AHS' },
  BD: { code: '8227', name: 'Barratt Due Musikkinstitutt', shortName: 'BD' },
  BAS: { code: '8243', name: 'Bergen Arkitekthøgskole', shortName: 'BAS' },
  DMMH: { code: '8224', name: 'Dronning Mauds Minne Høgskole', shortName: 'DMMH' },
  FIH: { code: '8234', name: 'Fjellhaug Internasjonale Høgskole', shortName: 'FIH' },
  HGUt: { code: '8247', name: 'Høgskulen for grøn utvikling', shortName: 'HGUt' },
  HFDK: { code: '8254', name: 'Høyskolen for dansekunst', shortName: 'HFDK' },
  HLT: { code: '8248', name: 'Høyskolen for ledelse og teologi', shortName: 'HLT' },
  HK: { code: '8253', name: 'Høyskolen Kristiania', shortName: 'HK' },
  LDH: { code: '8202', name: 'Lovisenberg diakonale høgskole', shortName: 'LDH' },
  NLA: { code: '8223', name: 'NLA Høgskolen', shortName: 'NLA' },
  Steiner: { code: '8225', name: 'Steinerhøyskolen', shortName: 'Steiner' },
};

export type InstitutionLabelFormat = 'short' | 'full' | 'full-short' | 'short-full';

export function formatInstitutionLabel(
  code: string,
  format: InstitutionLabelFormat = 'short'
): string {
  const uni = UNIVERSITIES[code];
  if (!uni) return code;

  const hasShort = Boolean(uni.shortName && uni.shortName !== uni.name);

  switch (format) {
    case 'full':
      return uni.name;
    case 'full-short':
      return hasShort ? `${uni.name} (${uni.shortName})` : uni.name;
    case 'short-full':
      return hasShort ? `${uni.shortName} – ${uni.name}` : uni.name;
    case 'short':
    default:
      return hasShort ? uni.shortName : uni.name;
  }
}

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

  const tryProxyUrl = async (url: string, label: string) => {
    const response = await fetch(url, {
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
      throw new Error(`${label} returned ${response.status}`);
    }

    const data: GradeData[] = await response.json();
    return data;
  };

  // Try custom proxy first if defined (works on GitHub Pages and other static hosts)
  if (CUSTOM_PROXY_URL) {
    try {
      return await tryProxyUrl(CUSTOM_PROXY_URL, 'Custom proxy');
    } catch (error) {
      // Fall through to Vercel/public proxies
    }
  }

  // In production, try Vercel proxy next (if available and not on GitHub Pages)
  if (useVercelProxy && !isGitHubPages) {
    const vercelProxyUrl = getVercelProxyUrl();
    if (vercelProxyUrl) {
      try {
        return await tryProxyUrl(vercelProxyUrl, 'Vercel proxy');
      } catch (error) {
        // If Vercel proxy fails, silently fall back to public proxies
        // No logging needed - expected when proxy doesn't exist or fails
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

  // Build URL based on proxy type
  if (proxy.includes('allorigins.win')) {
    url = `${proxy}${encodeURIComponent(DIRECT_API)}`;
  } else if (proxy.includes('cors-anywhere.herokuapp.com')) {
    // cors-anywhere format: https://cors-anywhere.herokuapp.com/https://example.com
    url = `${proxy}${DIRECT_API}`;
  } else {
    // Default format (corsproxy.io, etc.)
    url = `${proxy}${encodeURIComponent(DIRECT_API)}`;
  }

  try {
    // Note: Browser CORS errors in console cannot be suppressed - they're browser security features.
    // These errors are expected when public proxies fail and will appear in the console.
    // The only way to eliminate them is to deploy your own proxy (see docs/CORS_SOLUTION.md).
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Handle rate limiting (429) - don't retry immediately
    if (response.status === 429) {
      throw new Error(`Rate limited by proxy ${proxyIndex}. Please try again later.`);
    }

    if (response.status === 204 || !response.ok) {
      throw new Error(`Proxy ${proxyIndex} returned ${response.status}`);
    }

    let data: GradeData[];
    if (proxy.includes('allorigins.win')) {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse response from proxy ${proxyIndex}`);
      }
    } else {
      data = await response.json();
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't retry on rate limit errors - throw immediately
    if (errorMessage.includes('Rate limited') || errorMessage.includes('429')) {
      throw new Error(
        `Kunne ikke hente data: Rate limit nådd. ` +
        `Vennligst prøv igjen om noen minutter.`
      );
    }

    // Suppress noisy proxy failure logs - they're expected when public proxies are down
    // Only log when all proxies have failed
    if (proxyIndex < CORS_PROXIES.length - 1) {
      // Silently try next proxy - don't spam console
      return fetchWithProxy(payload, proxyIndex + 1, false);
    }
    
    // All proxies failed - provide helpful error message
    const helpfulError = isGitHubPages
      ? `Kunne ikke hente data fra NSD API på grunn av CORS-restriksjoner. ` +
        `Offentlige CORS-proxies er ustabile. ` +
        `For å løse dette permanent, deploy api/proxy.js til Vercel (gratis). ` +
        `Se dokumentasjonen: https://github.com/egil10/gpa/blob/main/docs/CORS_SOLUTION.md`
      : `Kunne ikke hente data fra NSD API. ` +
        `Dette skyldes CORS-restriksjoner. ` +
        `Alle proxy-tjenester mislyktes. ` +
        `Original feil: ${errorMessage}`;
    
    throw new Error(helpfulError);
  }
}

export async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year?: number,
  departmentFilter?: DepartmentFilter,
  institution?: string
): Promise<GradeData[]> {
  // Try to get institution name from code if not provided
  if (!institution) {
    const uniEntry = Object.entries(UNIVERSITIES).find(([_, uni]) => uni.code === institutionCode);
    institution = uniEntry ? uniEntry[0] : '';
  }
  
  // Try cache first (works on both client and server)
  if (institution) {
    const { getGradeDataFromCache } = await import('./grade-data-cache');
    const cached = await getGradeDataFromCache(institutionCode, courseCode, institution);
    if (cached && cached.length > 0) {
      // Filter by year if specified
      if (year) {
        return cached.filter(item => parseInt(item.Årstall, 10) === year);
      }
      return cached;
    }
  }
  
  // Fall back to server-side cache (wrapped in try-catch for safety)
  let cached: GradeData[] | null = null;
  try {
    cached = getCachedDataSafe(institutionCode, courseCode);
  } catch (e) {
    // Silently fail if cache access fails (expected on client-side)
    cached = null;
  }
  
  if (cached && cached.length > 0) {
    // Filter by year if specified
    if (year) {
      return cached.filter(item => parseInt(item.Årstall, 10) === year);
    }
    return cached;
  }

  // Fall back to API if cache miss
  const payload = createSearchPayload(institutionCode, courseCode, year, departmentFilter);
  const data = await fetchWithProxy(payload);
  
  // Cache the fetched data
  if (institution && data.length > 0) {
    const { storeGradeDataInCache } = await import('./grade-data-cache');
    storeGradeDataInCache(institutionCode, courseCode, institution, data);
  }
  
  return data;
}

// Fetch data for all available years
export async function fetchAllYearsData(
  institutionCode: string,
  courseCode: string,
  departmentFilter?: DepartmentFilter,
  institution?: string
): Promise<GradeData[]> {
  // Try to get institution name from code if not provided
  if (!institution) {
    const uniEntry = Object.entries(UNIVERSITIES).find(([_, uni]) => uni.code === institutionCode);
    institution = uniEntry ? uniEntry[0] : '';
  }
  
  // Try cache first (works on both client and server)
  if (institution) {
    const { getGradeDataFromCache } = await import('./grade-data-cache');
    const cached = await getGradeDataFromCache(institutionCode, courseCode, institution);
    if (cached && cached.length > 0) {
      return cached;
    }
  }
  
  // Fall back to server-side cache (wrapped in try-catch for safety)
  let cached: GradeData[] | null = null;
  try {
    cached = getCachedDataSafe(institutionCode, courseCode);
  } catch (e) {
    // Silently fail if cache access fails (expected on client-side)
    cached = null;
  }
  
  if (cached && cached.length > 0) {
    return cached;
  }
  
  // Fetch without year filter to get all years
  const payload = createSearchPayload(institutionCode, courseCode, undefined, departmentFilter);
  const data = await fetchWithProxy(payload);
  
  // Cache the fetched data
  if (institution && data.length > 0) {
    const { storeGradeDataInCache } = await import('./grade-data-cache');
    storeGradeDataInCache(institutionCode, courseCode, institution, data);
  }
  
  return data;
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


