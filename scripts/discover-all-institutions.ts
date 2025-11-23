/**
 * Master script to discover courses for multiple institutions
 * Processes in batches with delays to be nice to the API
 */

import { discoverUiOCourses } from './discover-uio-courses';

const INSTITUTIONS = [
  { code: '1110', name: 'UiO', script: 'discover-uio' },
  { code: '1240', name: 'NHH', script: 'discover-nhh' },
  // Add more as needed
];

async function discoverAllInstitutions() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Multi-Institution Course Discovery                      ║
╚════════════════════════════════════════════════════════════╝
  `);

  for (const inst of INSTITUTIONS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Discovering courses for: ${inst.name} (${inst.code})`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Run the appropriate discovery script
    // For now, just log what would be done
    console.log(`Run: npm run ${inst.script}`);
    
    // Add delay between institutions
    if (inst !== INSTITUTIONS[INSTITUTIONS.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next institution...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✅ All institutions processed!`);
}

// For now, just run UiO since NHH is already done
discoverUiOCourses().catch(console.error);

