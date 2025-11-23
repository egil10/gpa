import { GradeData, SearchPayload, University } from '@/types';

// NSD API URL - CORS issues in production require a proxy
const DIRECT_API = 'https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData';

// Multiple CORS proxy options as fallback
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
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
  const proxy = CORS_PROXIES[proxyIndex];
  const url = isDevelopment 
    ? DIRECT_API 
    : `${proxy}${encodeURIComponent(DIRECT_API)}`;

  try {
    const response = await fetch(url, {
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
    // Try next proxy if available
    if (proxyIndex < CORS_PROXIES.length - 1) {
      console.warn(`Proxy ${proxyIndex} failed, trying next...`);
      return fetchWithProxy(payload, proxyIndex + 1);
    }
    throw error;
  }
}

export async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year?: number
): Promise<GradeData[]> {
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


