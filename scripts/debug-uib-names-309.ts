
import { fetchWithProxy } from '../lib/api';

async function debugUiBNamesTable309() {
    console.log('Testing name retrieval for UiB using Tabell 309 (Bestått/Ikke bestått)...');

    const payload = {
        tabell_id: 309,
        api_versjon: 1,
        statuslinje: 'N',
        begrensning: '10',
        kodetekst: 'J',
        desimal_separator: '.',
        groupBy: ['Institusjonskode', 'Emnekode', 'Årstall'],
        sortBy: ['Emnekode'],
        filter: [
            {
                variabel: 'Institusjonskode',
                selection: { filter: 'item', values: ['1120'] },
            },
            {
                variabel: 'Årstall',
                selection: { filter: 'item', values: ['2023'] },
            }
        ],
    };

    console.log('Sending payload to Tabell 309...');

    const DIRECT_API = 'https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData';
    const response = await fetch(DIRECT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
            console.log('Sample item:', JSON.stringify(data[0], null, 2));
            // Check for name
            const hasName = Object.keys(data[0]).some(k => k.includes('navn') || k.includes('tekst'));
            console.log('Has name field:', hasName);
        } else {
            console.log('No data returned from Tabell 309.');
        }
    } else {
        console.log('Error:', response.status, response.statusText);
    }
}

debugUiBNamesTable309().catch(console.error);
