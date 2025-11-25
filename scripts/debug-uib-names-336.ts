
import { fetchWithProxy } from '../lib/api';

async function debugUiBNamesTable336() {
    console.log('Testing name retrieval for UiB using Tabell 336 (Undervisningsenhet)...');

    // Tabell 336 might be "Undervisningsenhet" or similar
    // We need to guess the structure or find documentation
    // Let's try a generic payload

    const payload = {
        tabell_id: 336,
        api_versjon: 1,
        statuslinje: 'N',
        begrensning: '10',
        kodetekst: 'J',
        desimal_separator: '.',
        groupBy: ['Institusjonskode', 'Emnekode'],
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

    console.log('Sending payload to Tabell 336...');

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
        } else {
            console.log('No data returned from Tabell 336.');
        }
    } else {
        console.log('Error:', response.status, response.statusText);
        // Try to parse error text
        const text = await response.text();
        console.log('Error text:', text);
    }
}

debugUiBNamesTable336().catch(console.error);
