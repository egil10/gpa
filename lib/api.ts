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
// Or loaded at runtime from /proxy-config.json for GitHub Pages deployments
let CUSTOM_PROXY_URL = (process.env.NEXT_PUBLIC_PROXY_URL ||
  process.env.NEXT_PUBLIC_CORS_PROXY_URL ||
  '').trim();

// Note: For GitHub Pages deployments without a proxy, API calls will be blocked.
// To enable API calls on GitHub Pages:
// 1. Set NEXT_PUBLIC_PROXY_URL at build time, OR
// 2. Deploy to Vercel where the proxy works automatically, OR  
// 3. Set up a Cloudflare Worker proxy (see docs/GITHUB_PAGES_PROXY_SETUP.md)

// Use proxy in production, direct API in development
const isBrowser = typeof window !== 'undefined';
const isDevelopment =
  !isBrowser ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Check if we're on GitHub Pages (where Vercel proxy doesn't exist)
const isGitHubPages = isBrowser &&
  (window.location.hostname.includes('github.io') || window.location.hostname.includes('github.com'));

// Check if we're on Vercel (where the API route proxy exists)
// Also check server-side via environment variable
const isVercel = isBrowser
  ? (window.location.hostname.includes('.vercel.app') || window.location.hostname.includes('vercel.com'))
  : !!process.env.VERCEL;

// Get the Vercel proxy URL (relative path - works when deployed on Vercel)
const getVercelProxyUrl = () => {
  if (!isBrowser) return null;
  // Skip Vercel proxy on GitHub Pages - it doesn't exist there
  if (isGitHubPages) return null;
  // On Vercel, use relative path - Vercel will route /api/proxy to the serverless function
  // On other platforms, also try it (it might work if they support Next.js API routes)
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
  // Block all API calls on GitHub Pages if no custom proxy is configured
  // This prevents CORS errors and retry loops
  if (isBrowser && isGitHubPages && !CUSTOM_PROXY_URL) {
    throw new Error(
      'API calls are not available on GitHub Pages due to CORS restrictions. ' +
      'Please deploy to Vercel or configure a Cloudflare Worker proxy. ' +
      'See docs/GITHUB_PAGES_PROXY_SETUP.md for instructions.'
    );
  }

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

      if (response.status === 204) {
        return []; // Return empty array instead of throwing
      }
      
      if (!response.ok) {
        throw new Error('No data found');
      }

      const data: GradeData[] = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  const tryProxyUrl = async (url: string, label: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 204) {
        return []; // Return empty array instead of throwing
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`${label} returned ${response.status}: ${errorText}`);
      }

      const data: GradeData[] = await response.json();
      return data;
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`${label} error: ${error.message}`);
      }
      throw error;
    }
  };

  // Try custom proxy first if defined (works on GitHub Pages and other static hosts)
  if (CUSTOM_PROXY_URL) {
    try {
      return await tryProxyUrl(CUSTOM_PROXY_URL, 'Custom proxy');
    } catch (error) {
      // Fall through to Vercel/public proxies
    }
  }

  // In production, try Vercel/Next.js API proxy first (if available and not on GitHub Pages)
  // This works on Vercel, Netlify, and other Next.js deployments with API routes
  // Always try it on non-GitHub Pages deployments - if it doesn't exist, it will fail gracefully
  // Priority: Vercel proxy > Custom proxy > Public proxies
  if (useVercelProxy && !isGitHubPages) {
    const vercelProxyUrl = getVercelProxyUrl();
    if (vercelProxyUrl) {
      try {
        console.log('[Proxy] Attempting Vercel/Next.js API proxy at:', vercelProxyUrl);
        console.log('[Proxy] Hostname:', isBrowser ? window.location.hostname : 'server-side');
        console.log('[Proxy] Is GitHub Pages:', isGitHubPages);
        console.log('[Proxy] Is Vercel:', isVercel);
        console.log('[Proxy] Full URL will be:', isBrowser ? `${window.location.origin}${vercelProxyUrl}` : vercelProxyUrl);
        const result = await tryProxyUrl(vercelProxyUrl, 'Vercel proxy');
        console.log('[Proxy] ✅ Vercel proxy succeeded!');
        return result;
      } catch (error) {
        // Log the error for debugging, then fall back to public proxies
        console.error('[Proxy] ❌ Vercel proxy failed:', error);
        console.log('[Proxy] Falling back to public proxies...');
        // If Vercel proxy fails, fall back to public proxies (don't retry Vercel proxy)
        return fetchWithProxy(payload, 0, false);
      }
    } else {
      console.warn('[Proxy] Vercel proxy URL is null - isBrowser:', isBrowser, 'isGitHubPages:', isGitHubPages, 'isVercel:', isVercel);
    }
  } else {
    console.warn('[Proxy] Skipping Vercel proxy - useVercelProxy:', useVercelProxy, 'isGitHubPages:', isGitHubPages);
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

    if (response.status === 204) {
      return []; // Return empty array instead of throwing
    }
    
    if (!response.ok) {
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
      // Aggregate duplicates from cache
      const { aggregateDuplicateEntries } = await import('./utils');
      let aggregated = aggregateDuplicateEntries(cached);
      // Filter by year if specified
      if (year) {
        aggregated = aggregated.filter(item => parseInt(item.Årstall, 10) === year);
      }
      return aggregated;
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
    // Aggregate duplicates from cache
    const { aggregateDuplicateEntries } = await import('./utils');
    let aggregated = aggregateDuplicateEntries(cached);
    // Filter by year if specified
    if (year) {
      aggregated = aggregated.filter(item => parseInt(item.Årstall, 10) === year);
    }
    return aggregated;
  }

  // Fall back to API if cache miss
  // For UiB, try multiple formats since course codes can have different formats in the API
  // This handles cases where the API might return codes with or without "-1" suffix
  if (institution === 'UiB') {
    const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
    const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix
    const isJUSCourse = courseCode.toUpperCase().startsWith('JUS');
    
    // For JUS courses, try without -1 first (they're stored as JUS346, not JUS346-1)
    // But also try -0 suffix (found in fallback for JUS242-0)
    // For other courses, try with -1 first, then -0
    const formatsToTry = isJUSCourse
      ? [
          cleaned,                  // JUS: without suffix first
          `${cleaned}-0`,           // Then with -0 (found in fallback)
          `${cleaned}-1`,           // Then with -1
          formatCourseCode(cleaned, institution),
        ]
      : [
          `${cleaned}-1`,           // Other courses: with -1 first
          `${cleaned}-0`,           // Then with -0
          cleaned,                  // Without any suffix
          formatCourseCode(cleaned, institution), // formatCourseCode result
        ];
    
    // If the code has no dash, also try common variant patterns (e.g., "EXPHIL" -> "EXPHIL-HFSEM", "EXPHIL-MNEKS")
    // This avoids the expensive "query all courses" fallback
    if (!normalizedBase.includes('-')) {
      // Common UiB variant suffixes based on actual data
      const commonVariants = ['HFSEM', 'MNEKS', 'MOSEM', 'HFEKS', 'MNEKS-0', 'HFSEM-0', 'MOSEM-0'];
      for (const variant of commonVariants) {
        formatsToTry.push(`${normalizedBase}-${variant}`);
        formatsToTry.push(`${normalizedBase}-${variant}-1`);
      }
    }
    
    // Remove duplicates
    const uniqueFormats = Array.from(new Set(formatsToTry));
    
    // Try each format
    for (const formattedCode of uniqueFormats) {
      // For JUS courses, try with study program filter first
      if (isJUSCourse) {
        try {
          const payload = createSearchPayload(
            institutionCode, 
            formattedCode, 
            year, 
            departmentFilter,
            { studiumCode: 'jus' }
          );
          const data = await fetchWithProxy(payload);
          
          if (data && data.length > 0) {
            // Check if we got matching data
            const normalizedBase = courseCode.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
            const matching = data.filter(item => {
              const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
              const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
              return normalizedItemCode === normalizedBase || 
                     itemCode === courseCode.toUpperCase().replace(/\s/g, '') ||
                     (isJUSCourse && itemCode.startsWith(courseCode.toUpperCase().replace(/\s/g, '')));
            });
            
            if (matching.length > 0) {
              return matching;
            }
          }
        } catch (error) {
          // Continue to try without study program filter
        }
      }
      
      // Try without study program filter (or if JUS course with filter didn't work)
      try {
        const payload = createSearchPayload(institutionCode, formattedCode, year, departmentFilter);
        const data = await fetchWithProxy(payload);
        
        if (data && data.length > 0) {
          // Found data with this format - aggregate and return
          const { aggregateDuplicateEntries } = await import('./utils');
          let aggregated = aggregateDuplicateEntries(data);
          
          // Cache the fetched data (after aggregation)
          if (institution && aggregated.length > 0) {
            const { storeGradeDataInCache } = await import('./grade-data-cache');
            storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
          }
          
          return aggregated;
        }
      } catch (error) {
        // Continue to next format
        continue;
      }
    }
    
    // LAST RESORT: If all direct queries failed, try querying all courses for the institution and filtering
    // WARNING: This is VERY SLOW for UiB (7255 courses) - only use as last resort
    // Skip this expensive fallback if we've already tried many formats
    if (uniqueFormats.length < 10) {
      try {
        const payloadAllCourses = createSearchPayload(institutionCode, undefined, year, departmentFilter);
        const allData = await fetchWithProxy(payloadAllCourses);
        
        if (allData && allData.length > 0) {
        // Find courses that match the normalized code (consistent with how we store codes)
        // For UiB, we need to be careful: "EXPHIL" should NOT match "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
        // But "EXPHIL" SHOULD match "EXPHIL2000" (numeric suffix without dash)
        // Only match if the codes are exactly equal after normalization
        // Remove numeric suffixes (e.g., "-0", "-1", "-2") but preserve meaningful variants (e.g., "-HFSEM")
        const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix for matching
        const matchingData = allData.filter(item => {
          const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
          const normalizedItemCode = itemCode.replace(/-[0-9]+$/, ''); // Consistent normalization
          
          // Exact match after normalization
          if (normalizedItemCode === normalizedBase || itemCode === cleaned) {
            return true;
          }
          
          // For UiB: if the search code contains a dash (e.g., "EXPHIL-HFSEM"), 
          // only match if the item code starts with the exact search code
          // This prevents "EXPHIL" from matching "EXPHIL-HFSEM"
          if (normalizedBase.includes('-')) {
            return normalizedItemCode.startsWith(normalizedBase + '-') || normalizedItemCode === normalizedBase;
          }
          
          // If search code has no dash, allow prefix matching for numeric suffixes (e.g., "EXPHIL" matches "EXPHIL2000")
          // But NOT for dash-separated variants (e.g., "EXPHIL" does NOT match "EXPHIL-HFSEM")
          if (itemCode.startsWith(normalizedBase)) {
            const nextChar = itemCode[normalizedBase.length];
            // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
            // Reject if next character is a dash (variant like "EXPHIL-HFSEM")
            if (nextChar === undefined || /[0-9]/.test(nextChar)) {
              return true;
            }
          }
          
          return false;
        });
        
        if (matchingData.length > 0) {
          // Aggregate and return matching data
          const { aggregateDuplicateEntries } = await import('./utils');
          let aggregated = aggregateDuplicateEntries(matchingData);
          
          // Cache the fetched data (after aggregation)
          if (institution && aggregated.length > 0) {
            const { storeGradeDataInCache } = await import('./grade-data-cache');
            storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
          }
          
          return aggregated;
        }
        
        // If no exact match found and search code has no dash, try to find variants
        // For example, if searching for "EXPHIL" (no data), find "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
        // This handles cases where the base course code exists but has no data, only variants do
        if (!normalizedBase.includes('-')) {
          const variantMatches = allData.filter(item => {
            const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
            const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
            // Match variants like "EXPHIL-HFSEM" when searching for "EXPHIL"
            return normalizedItemCode.startsWith(normalizedBase + '-');
          });
          
          if (variantMatches.length > 0) {
            // Found variants - aggregate their data
            const { aggregateDuplicateEntries } = await import('./utils');
            let aggregated = aggregateDuplicateEntries(variantMatches);
            
            // Cache the fetched data (after aggregation)
            if (institution && aggregated.length > 0) {
              const { storeGradeDataInCache } = await import('./grade-data-cache');
              storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
            }
            
            return aggregated;
          }
        }
      }
      } catch (error) {
        // If this fallback also fails, continue to return empty array below
      }
    }
    
    // All attempts failed - return empty array
    return [];
  }
  
  // For non-UiB institutions, use standard format
  const payload = createSearchPayload(institutionCode, courseCode, year, departmentFilter);
  let data = await fetchWithProxy(payload);
  
  // Aggregate duplicate entries (e.g., UiB courses with multiple instances)
  if (data.length > 0) {
    const { aggregateDuplicateEntries } = await import('./utils');
    data = aggregateDuplicateEntries(data);
  }
  
  // Cache the fetched data (after aggregation)
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
      // Aggregate duplicates from cache
      const { aggregateDuplicateEntries } = await import('./utils');
      return aggregateDuplicateEntries(cached);
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
    // Aggregate duplicates from cache
    const { aggregateDuplicateEntries } = await import('./utils');
    return aggregateDuplicateEntries(cached);
  }
  
  // For BI, try multiple formats since course codes might already end with digits
  // Some courses like "MET29107" already end with digits and should be used as-is
  // Others might need a "1" suffix appended
  if (institution === 'BI') {
    const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
    const formatsToTry = [
      cleaned, // Try as-is first (for codes like "MET29107" that already end with digits)
      `${cleaned}1`, // Try with "1" suffix (standard BI format)
      formatCourseCode(cleaned, institution), // Use formatCourseCode result
    ];
    
    // Remove duplicates
    const uniqueFormats = Array.from(new Set(formatsToTry));
    
    // Try each format
    for (const formattedCode of uniqueFormats) {
      try {
        const payload = createSearchPayload(institutionCode, formattedCode, undefined, departmentFilter);
        const data = await fetchWithProxy(payload);
        
        if (data && data.length > 0) {
          // Filter to ensure we only return data for the specific course we're looking for
          const matching = data.filter(item => {
            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
            // Match if codes match exactly, or if normalized codes match
            return itemCode === cleaned || 
                   itemCode === formattedCode.toUpperCase() ||
                   itemCode.replace(/1$/, '') === cleaned.replace(/1$/, ''); // Remove trailing "1" for comparison
          });
          
          if (matching.length > 0) {
            console.log(`[fetchAllYearsData] Found BI course data: ${formattedCode} (${matching.length} entries, filtered from ${data.length})`);
            const { aggregateDuplicateEntries } = await import('./utils');
            let aggregated = aggregateDuplicateEntries(matching);
            
            // Cache the fetched data (after aggregation)
            if (institution && aggregated.length > 0) {
              const { storeGradeDataInCache } = await import('./grade-data-cache');
              storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
            }
            
            return aggregated;
          }
        }
      } catch (error) {
        // Continue to next format
        console.debug(`[fetchAllYearsData] Error fetching BI course ${formattedCode}:`, error);
        continue;
      }
    }
    
    // If all formats failed, return empty array
    return [];
  }
  
  // For UiB, try multiple formats since course codes can have different formats
  // Some courses use "INF100" (no suffix), others use "EXPHIL-HFEKS-0" (with suffix)
  if (institution === 'UiB') {
    const cleaned = courseCode.toUpperCase().replace(/\s/g, '');
    const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix
    const isJUSCourse = courseCode.toUpperCase().startsWith('JUS');
    
    // For JUS courses, try multiple formats more aggressively
    // JUS courses can appear in various formats in the API
    // They're stored in our data as "JUS2311" but might need different formats for API
    const formatsToTry = isJUSCourse
      ? [
          cleaned,                  // JUS: without suffix first (e.g., "JUS2311")
          `${cleaned}-0`,           // Then with -0 (e.g., "JUS2311-0")
          `${cleaned}-1`,           // Then with -1 (e.g., "JUS2311-1")
          formatCourseCode(cleaned, institution), // formatCourseCode result
          // Also try with spaces (some APIs use "JUS 2311")
          cleaned.replace(/([A-Z]+)(\d+)/, '$1 $2'), // "JUS2311" -> "JUS 2311"
          cleaned.replace(/([A-Z]+)(\d+)/, '$1-$2'),  // "JUS2311" -> "JUS-2311"
        ]
      : [
          `${cleaned}-1`,           // Other courses: with -1 first
          `${cleaned}-0`,           // Then with -0
          cleaned,                  // Without any suffix
          formatCourseCode(cleaned, institution), // formatCourseCode result
        ];
    
    // If the code has no dash, also try common variant patterns (e.g., "EXPHIL" -> "EXPHIL-HFSEM", "EXPHIL-MNEKS")
    // This avoids the expensive "query all courses" fallback
    if (!normalizedBase.includes('-')) {
      // Common UiB variant suffixes based on actual data
      const commonVariants = ['HFSEM', 'MNEKS', 'MOSEM', 'HFEKS', 'MNEKS-0', 'HFSEM-0', 'MOSEM-0'];
      for (const variant of commonVariants) {
        formatsToTry.push(`${normalizedBase}-${variant}`);
        formatsToTry.push(`${normalizedBase}-${variant}-1`);
      }
    }
    
    // Remove duplicates
    const uniqueFormats = Array.from(new Set(formatsToTry));
    
    // Try each format
    for (const formattedCode of uniqueFormats) {
      // For JUS courses, try with study program filter first (try multiple variations)
      if (isJUSCourse) {
        const studyProgramCodes = ['jus', 'JUS', 'Jus']; // Try different case variations
        let foundWithFilter = false;
        
        for (const studiumCode of studyProgramCodes) {
          try {
            const payload = createSearchPayload(
              institutionCode, 
              formattedCode, 
              undefined, 
              departmentFilter,
              { studiumCode }
            );
            const data = await fetchWithProxy(payload);
            
            if (data && data.length > 0) {
              // Check if we got matching data - be more lenient with matching for JUS courses
              const normalizedBase = courseCode.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
              const matching = data.filter(item => {
                const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
                const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
                // More lenient matching for JUS courses - match if normalized codes match or if item code starts with our base
                return normalizedItemCode === normalizedBase || 
                       itemCode === courseCode.toUpperCase().replace(/\s/g, '') ||
                       itemCode === formattedCode.toUpperCase() ||
                       (normalizedItemCode.startsWith(normalizedBase) && normalizedItemCode.length <= normalizedBase.length + 3);
              });
              
              if (matching.length > 0) {
                console.log(`[fetchAllYearsData] Found JUS course data with study program filter (${studiumCode}): ${formattedCode} (${matching.length} entries, filtered from ${data.length})`);
                const { aggregateDuplicateEntries } = await import('./utils');
                const aggregated = aggregateDuplicateEntries(matching);
                
                // Cache the fetched data
                if (institution && aggregated.length > 0) {
                  const { storeGradeDataInCache } = await import('./grade-data-cache');
                  storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
                }
                
                return aggregated;
              } else {
                console.debug(`[fetchAllYearsData] Study program filter (${studiumCode}) returned ${data.length} entries for ${formattedCode}, but none matched course code ${courseCode}`);
              }
            }
          } catch (error) {
            // Continue to try next study program code or without filter
            console.debug(`[fetchAllYearsData] JUS course with study program filter (${studiumCode}) failed for ${formattedCode}:`, error);
            continue;
          }
        }
      }
      
      // Try without study program filter (or if JUS course with filter didn't work)
      try {
        const payload = createSearchPayload(institutionCode, formattedCode, undefined, departmentFilter);
        const data = await fetchWithProxy(payload);
        
        if (data && data.length > 0) {
          // Filter to ensure we only return data for the specific course we're looking for
          // This is important because the API might return data for multiple courses if the format doesn't match exactly
          const normalizedBase = courseCode.toUpperCase().replace(/\s/g, '').replace(/-[0-9]+$/, '');
          const matching = data.filter(item => {
            const itemCode = item.Emnekode?.toUpperCase().replace(/\s/g, '') || '';
            const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
            // Match if normalized codes match, or if item code matches the formatted code we searched for
            // For JUS courses, be more lenient - match if the base code matches (e.g., "JUS233" matches "JUS233-1", "JUS233-0", etc.)
            if (isJUSCourse) {
              return normalizedItemCode === normalizedBase || 
                     itemCode === courseCode.toUpperCase().replace(/\s/g, '') ||
                     itemCode === formattedCode.toUpperCase() ||
                     (normalizedItemCode.startsWith(normalizedBase) && normalizedItemCode.length <= normalizedBase.length + 3);
            } else {
              return normalizedItemCode === normalizedBase || 
                     itemCode === courseCode.toUpperCase().replace(/\s/g, '') ||
                     itemCode === formattedCode.toUpperCase();
            }
          });
          
          if (matching.length > 0) {
            console.log(`[fetchAllYearsData] Found course data without study program filter: ${formattedCode} (${matching.length} entries, filtered from ${data.length})`);
            const { aggregateDuplicateEntries } = await import('./utils');
            let aggregated = aggregateDuplicateEntries(matching);
            
            // Cache the fetched data (after aggregation)
            if (institution && aggregated.length > 0) {
              const { storeGradeDataInCache } = await import('./grade-data-cache');
              storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
            }
            
            return aggregated;
          } else {
            console.debug(`[fetchAllYearsData] API returned ${data.length} entries for ${formattedCode}, but none matched course code ${courseCode}`);
          }
        }
      } catch (error) {
        // Continue to next format
        console.debug(`[fetchAllYearsData] Error fetching ${formattedCode}:`, error);
        continue;
      }
    }
    
    // LAST RESORT: If all direct queries failed, try querying all courses for the institution and filtering
    // WARNING: This is VERY SLOW for UiB (7255 courses) - only use as last resort
    // Skip this expensive fallback if we've already tried many formats
    if (uniqueFormats.length < 10) {
      try {
        const payloadAllCourses = createSearchPayload(institutionCode, undefined, undefined, departmentFilter);
        const allData = await fetchWithProxy(payloadAllCourses);
      
      if (allData && allData.length > 0) {
        // Find courses that match the normalized code (consistent with how we store codes)
        // For UiB, we need to be careful: "EXPHIL" should NOT match "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
        // But "EXPHIL" SHOULD match "EXPHIL2000" (numeric suffix without dash)
        // Only match if the codes are exactly equal after normalization, or if the search code
        // is a prefix of the item code (e.g., "EXPHIL-HFSEM" matches "EXPHIL-HFSEM")
        // Remove numeric suffixes (e.g., "-0", "-1", "-2") but preserve meaningful variants (e.g., "-HFSEM")
        const normalizedBase = cleaned.replace(/-[0-9]+$/, ''); // Remove numeric suffix for matching
        const matchingData = allData.filter(item => {
          const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
          const normalizedItemCode = itemCode.replace(/-[0-9]+$/, ''); // Consistent normalization
          
          // Exact match after normalization
          if (normalizedItemCode === normalizedBase || itemCode === cleaned) {
            return true;
          }
          
          // For UiB: if the search code contains a dash (e.g., "EXPHIL-HFSEM"), 
          // only match if the item code starts with the exact search code
          // This prevents "EXPHIL" from matching "EXPHIL-HFSEM"
          if (normalizedBase.includes('-')) {
            return normalizedItemCode.startsWith(normalizedBase + '-') || normalizedItemCode === normalizedBase;
          }
          
          // If search code has no dash, allow prefix matching for numeric suffixes (e.g., "EXPHIL" matches "EXPHIL2000")
          // But NOT for dash-separated variants (e.g., "EXPHIL" does NOT match "EXPHIL-HFSEM")
          if (itemCode.startsWith(normalizedBase)) {
            const nextChar = itemCode[normalizedBase.length];
            // Allow if next character is a digit (numeric suffix) or doesn't exist (exact match)
            // Reject if next character is a dash (variant like "EXPHIL-HFSEM")
            if (nextChar === undefined || /[0-9]/.test(nextChar)) {
              return true;
            }
          }
          
          return false;
        });
        
        if (matchingData.length > 0) {
          // Aggregate and return matching data
          const { aggregateDuplicateEntries } = await import('./utils');
          let aggregated = aggregateDuplicateEntries(matchingData);
          
          // Cache the fetched data (after aggregation)
          if (institution && aggregated.length > 0) {
            const { storeGradeDataInCache } = await import('./grade-data-cache');
            storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
          }
          
          return aggregated;
        }
        
        // If no exact match found and search code has no dash, try to find variants
        // For example, if searching for "EXPHIL" (no data), find "EXPHIL-HFSEM", "EXPHIL-MNEKS", etc.
        // This handles cases where the base course code exists but has no data, only variants do
        if (!normalizedBase.includes('-')) {
          const variantMatches = allData.filter(item => {
            const itemCode = (item.Emnekode || '').toUpperCase().replace(/\s/g, '');
            const normalizedItemCode = itemCode.replace(/-[0-9]+$/, '');
            // Match variants like "EXPHIL-HFSEM" when searching for "EXPHIL"
            return normalizedItemCode.startsWith(normalizedBase + '-');
          });
          
          if (variantMatches.length > 0) {
            // Found variants - aggregate their data
            const { aggregateDuplicateEntries } = await import('./utils');
            let aggregated = aggregateDuplicateEntries(variantMatches);
            
            // Cache the fetched data (after aggregation)
            if (institution && aggregated.length > 0) {
              const { storeGradeDataInCache } = await import('./grade-data-cache');
              storeGradeDataInCache(institutionCode, courseCode, institution, aggregated);
            }
            
            return aggregated;
          }
        }
      }
      } catch (error) {
        // If this fallback also fails, continue to return empty array below
      }
    }
    
    // All attempts failed - return empty array
    return [];
  }
  
  // For non-UiB institutions, use standard format
  const payload = createSearchPayload(institutionCode, courseCode, undefined, departmentFilter);
  let data = await fetchWithProxy(payload);
  
  // Aggregate duplicate entries (e.g., UiB courses with multiple instances)
  if (data.length > 0) {
    const { aggregateDuplicateEntries } = await import('./utils');
    data = aggregateDuplicateEntries(data);
  }
  
  // Cache the fetched data (after aggregation)
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
    // For BI, if the code already ends with a digit, use it as-is
    // The discovery script stores codes like "MET29107" which already end with digits
    // Only add "1" if the code doesn't already end with a digit
    if (/\d$/.test(cleaned)) {
      return cleaned; // Already ends with digit, use as-is
    }
    return `${cleaned}1`;
  }
  return `${cleaned}-1`;
}

