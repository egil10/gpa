
import { fetchWithFilters } from '../lib/hierarchy-discovery';

async function debugUiBRaw() {
    console.log('Fetching raw UiB data for 2023...');
    // Fetch a small subset to inspect fields
    const data = await fetchWithFilters('1120', {}, 2023);

    if (data.length > 0) {
        console.log('--- Raw Item Sample ---');
        console.log(JSON.stringify(data[0], null, 2));

        // Check if any item has a name-like field
        const itemWithName = data.find(d => Object.keys(d).some(k => k.toLowerCase().includes('navn') || k.toLowerCase().includes('tekst')));
        if (itemWithName) {
            console.log('\n--- Item with Name-like field ---');
            console.log(JSON.stringify(itemWithName, null, 2));
        }
    } else {
        console.log('No data found.');
    }
}

debugUiBRaw().catch(console.error);
