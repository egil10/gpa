
import { fetchWithProxy } from '../lib/api';

async function debugUiBNamesExplicit() {
    console.log('Testing name retrieval for UiB with explicit grouping...');

    const payload = {
        tabell_id: 308,
        api_versjon: 1,
        statuslinje: 'N',
        begrensning: '10',
        kodetekst: 'J',
        desimal_separator: '.',
        groupBy: ['Institusjonskode', 'Emnekode', 'Emnekode_tekst', 'Årstall'],
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

    console.log('Sending payload...');

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
        const text = await response.text();
        console.log('Error text:', text);
    }
}

debugUiBNamesExplicit().catch(console.error);
