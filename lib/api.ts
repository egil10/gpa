import { GradeData, SearchPayload, University } from '@/types';
import { getCachedData } from './cache';

// NSD API URL - CORS issues in production require a proxy
const DIRECT_API = 'https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData';

// Multiple CORS proxy options as fallback
// ⚠️ WARNING: Public CORS proxies are unreliable and often fail.
// For production use, deploy api/proxy.js to Vercel (free) for reliable CORS handling.
// See docs/CORS_SOLUTION.md for instructions.
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

// Use proxy in production, direct API in development
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Try direct API first, then fallback to proxies
const getAPIUrl = () => {
  if (isDevelopment) {
    return DIRECT_API;
  }
  // Use first proxy (allorigins.win is most reliable)
  return `${CORS_PROXIES[0]}${encodeURIComponent(DIRECT_API)}`;
};

const API_URL = getAPIUrl();

// TODO: Replace with your own proxy server (see docs/CORS_FIX.md)
// Recommended: Deploy api/proxy.js to Vercel

export const UNIVERSITIES: Record<string, University> = {
  UiO: { code: '1110', name: 'Universitetet i Oslo', shortName: 'UiO' },
  NTNU: { code: '1150', name: 'Norges teknisk-naturvitenskapelige universitet', shortName: 'NTNU' },
  OsloMet: { code: '1175', name: 'OsloMet – storbyuniversitetet', shortName: 'OsloMet' },
  UiB: { code: '1120', name: 'Universitetet i Bergen', shortName: 'UiB' },
  BI: { code: '8241', name: 'Handelshøyskolen BI', shortName: 'BI' },
};

export function createSearchPayload(
  institutionCode: string,
  courseCode: string,
  year?: number
): SearchPayload {
  return {
    tabell_id: 308,
    api_versjon: 1,
    statuslinje: 'N',
    begrensning: '1000',
    kodetekst: 'N',
    desimal_separator: '.',
    groupBy: ['Institusjonskode', 'Emnekode', 'Karakter', 'Årstall'],
    sortBy: ['Karakter'],
    filter: [
      {
        variabel: 'Institusjonskode',
        selection: { filter: 'item', values: [institutionCode] },
      },
      {
        variabel: 'Emnekode',
        selection: {
          filter: 'item',
          values: [courseCode],
        },
      },
    ...(year ? [{
      variabel: 'Årstall',
      selection: {
        filter: 'item',
        values: [String(year)],
      },
    }] : []),
    ],
  };
}

async function fetchWithProxy(payload: SearchPayload, proxyIndex = 0): Promise<GradeData[]> {
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

  // In production, try proxies
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
      return fetchWithProxy(payload, proxyIndex + 1);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Kunne ikke hente data fra NSD API. ` +
      `Dette skyldes CORS-restriksjoner (alle offentlige proxy-tjenester feiler). ` +
      `For å løse dette, deploy api/proxy.js til Vercel (gratis). ` +
      `Se docs/CORS_SOLUTION.md for instruksjoner. ` +
      `Original feil: ${errorMessage}`
    );
  }
}

export async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year?: number
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
  const payload = createSearchPayload(institutionCode, courseCode, year);
  return fetchWithProxy(payload);
}

// Fetch data for all available years
export async function fetchAllYearsData(
  institutionCode: string,
  courseCode: string
): Promise<GradeData[]> {
  // Fetch without year filter to get all years
  const payload = createSearchPayload(institutionCode, courseCode);
  return fetchWithProxy(payload);
}

export function formatCourseCode(courseCode: string, institution: string): string {
  const cleaned = courseCode.replace(/\s/g, '').toUpperCase();
  if (institution === 'BI') {
    return `${cleaned}1`;
  }
  return `${cleaned}-1`;
}


