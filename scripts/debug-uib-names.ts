
import { fetchWithFilters } from '../lib/hierarchy-discovery';

async function debugUiBNames() {
    console.log('Testing name retrieval for UiB...');

    const payload = {
        tabell_id: 308,
        api_versjon: 1,
        statuslinje: 'N',
        begrensning: '10',
        kodetekst: 'J', // Try 'J' instead of 'Y'
        desimal_separator: '.',
        groupBy: ['Institusjonskode', 'Emnekode', 'Årstall'], // Remove Karakter
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

    console.log('Sending payload with kodetekst: "J" and no Karakter group...');

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
            console.log('No data returned.');
        }
    } else {
        console.log('Error:', response.status, response.statusText);
    }
}

debugUiBNames().catch(console.error);
