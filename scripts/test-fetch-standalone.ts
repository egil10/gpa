/**
 * Standalone test script to verify API fetching works
 * No external dependencies or imports
 */

// Types
interface GradeData {
    Institusjonskode: string;
    Emnekode: string;
    Karakter: string;
    Årstall: string;
    "Antall kandidater totalt": string;
}

interface SearchPayload {
    tabell_id: number;
    api_versjon: number;
    statuslinje: string;
    begrensning: string;
    kodetekst: string;
    desimal_separator: string;
    groupBy: string[];
    sortBy: string[];
    filter: Array<{
        variabel: string;
        selection: {
            filter: string;
            values: string[];
        };
    }>;
}

// Constants
const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';

const UNIVERSITIES = {
    UiO: { code: '1110', name: 'Universitetet i Oslo', shortName: 'UiO' },
    NTNU: { code: '1150', name: 'Norges teknisk-naturvitenskapelige universitet', shortName: 'NTNU' },
    OsloMet: { code: '1175', name: 'OsloMet – storbyuniversitetet', shortName: 'OsloMet' },
    UiB: { code: '1120', name: 'Universitetet i Bergen', shortName: 'UiB' },
    BI: { code: '8241', name: 'Handelshøyskolen BI', shortName: 'BI' },
};

// Helper functions
function createSearchPayload(
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

function formatCourseCode(courseCode: string, institution: string): string {
    const cleaned = courseCode.replace(/\s/g, '').toUpperCase();
    if (institution === 'BI') {
        return `${cleaned}1`;
    }
    return `${cleaned}-1`;
}

// Main test function
async function testFetch() {
    const courseCode = 'IN2010';
    const institution = 'UiO';
    const institutionCode = UNIVERSITIES[institution].code;
    const formattedCode = formatCourseCode(courseCode, institution);

    console.log(`Testing: ${courseCode} → ${formattedCode} at ${institution} (${institutionCode})`);
    console.log(`Trying year 2022...\n`);

    const formats = [formattedCode, formattedCode.toLowerCase()];

    for (const codeFormat of formats) {
        console.log(`\nTrying format: ${codeFormat}`);
        try {
            const payload = createSearchPayload(institutionCode, codeFormat, 2022);
            console.log('Payload:', JSON.stringify(payload, null, 2));
            console.log('\nFetching...\n');

            const response = await fetch(DIRECT_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                body: JSON.stringify(payload),
            });

            console.log(`Status: ${response.status} ${response.statusText}`);

            if (response.status === 204) {
                console.log('⚠️  No data found (204) - trying next format...\n');
                continue;
            }

            if (!response.ok) {
                console.log(`⚠️  Error ${response.status} - trying next format...\n`);
                continue;
            }

            const data = await response.json() as GradeData[];
            if (data && data.length > 0) {
                console.log(`✅ Success with ${codeFormat}! Found ${data.length} entries:\n`);
                console.log(JSON.stringify(data.slice(0, 3), null, 2));
                return;
            }

            console.log('⚠️  Empty response - trying next format...\n');
        } catch (error) {
            console.error(`⚠️  Error with ${codeFormat}:`, error instanceof Error ? error.message : error);
            console.log('Trying next format...\n');
        }
    }

    console.log('❌ No data found with any format');
}

testFetch();
