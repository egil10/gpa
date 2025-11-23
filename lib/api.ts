import { GradeData, SearchPayload, University } from '@/types';

// NSD API URL - CORS issues in production require a proxy
// Temporary fix: Using CORS proxy (replace with your own proxy later)
const CORS_PROXY = 'https://corsproxy.io/?';
const DIRECT_API = 'https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData';

// Use proxy in production, direct API in development
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_URL = isDevelopment ? DIRECT_API : `${CORS_PROXY}${encodeURIComponent(DIRECT_API)}`;

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
  year: number
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
      {
        variabel: 'Årstall',
        selection: {
          filter: 'item',
          values: [String(year)],
        },
      },
    ],
  };
}

export async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year: number
): Promise<GradeData[]> {
  const payload = createSearchPayload(institutionCode, courseCode, year);
  
  const response = await fetch(API_URL, {
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
}

export function formatCourseCode(courseCode: string, institution: string): string {
  const cleaned = courseCode.replace(/\s/g, '').toUpperCase();
  if (institution === 'BI') {
    return `${cleaned}1`;
  }
  return `${cleaned}-1`;
}


