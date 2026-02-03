/**
 * Simple FUTBIN test - get a few players from LaLiga for testing
 */

import { writeFileSync } from 'fs';

// Test data extracted manually from the web_fetch results we got earlier
const testLaLigaPlayers = [
  { id: 917, slug: 'brahim-diaz', name: 'Brahim Diaz', overall: 82, position: 'RM' },
  { id: 906, slug: 'andriy-lunin', name: 'Andriy Lunin', overall: 81, position: 'GK' },
  { id: 17504, slug: 'david-soria-solis', name: 'David Soria', overall: 81, position: 'GK' },
  { id: 17516, slug: 'gerard-moreno-balaguero', name: 'Gerard Moreno', overall: 81, position: 'ST' },
  { id: 17565, slug: 'oscar-mingueza-garcia', name: 'Oscar Mingueza', overall: 80, position: 'RB' },
  { id: 17589, slug: 'inigo-ruiz-de-galarreta', name: 'Inigo Ruiz de Galarreta', overall: 80, position: 'CDM' },
  { id: 17598, slug: 'javier-galan-gil', name: 'Javier Galan', overall: 80, position: 'LB' },
  { id: 17631, slug: 'nicolas-pepe', name: 'Nicolas Pepe', overall: 80, position: 'RM' },
  { id: 17640, slug: 'fermin-lopez-marin', name: 'Fermin Lopez', overall: 80, position: 'CAM' },
  { id: 17659, slug: 'alvaro-garcia-rivera', name: 'Alvaro Garcia', overall: 80, position: 'LM' },
  { id: 17668, slug: 'borja-iglesias-quintas', name: 'Borja Iglesias', overall: 80, position: 'ST' },
  { id: 17673, slug: 'yeremy-jesus-pino-santos', name: 'Yeremy Pino', overall: 80, position: 'RM' },
  { id: 17674, slug: 'diego-javier-llorente-rios', name: 'Diego Llorente', overall: 80, position: 'CB' },
  { id: 17676, slug: 'clement-lenglet', name: 'Clement Lenglet', overall: 80, position: 'CB' },
  { id: 17680, slug: 'andreas-christensen', name: 'Andreas Christensen', overall: 80, position: 'CB' },
  { id: 17709, slug: 'luis-milla-manzanares', name: 'Luis Milla', overall: 79, position: 'CM' },
  { id: 17712, slug: 'pablo-fornals-malla', name: 'Pablo Fornals', overall: 79, position: 'CDM' },
  { id: 17720, slug: 'marcos-alonso-mendoza', name: 'Marcos Alonso', overall: 79, position: 'CB' },
  { id: 17723, slug: 'sergio-gomez-martin', name: 'Sergio Gomez', overall: 79, position: 'LM' },
  { id: 17732, slug: 'pau-lopez-sabata', name: 'Pau Lopez', overall: 79, position: 'GK' },
];

const futbinData = {
  laliga: testLaLigaPlayers
};

writeFileSync('scripts/futbin-data.json', JSON.stringify(futbinData, null, 2));
console.log(`✅ Created test data with ${testLaLigaPlayers.length} LaLiga players`);
console.log('💾 Saved to scripts/futbin-data.json');
console.log('\nNow run: node scripts/update-team-data.mjs');