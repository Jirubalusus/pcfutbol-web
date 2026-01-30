import { primeraRFEFGrupo1, primeraRFEFGrupo2, primeraRFEFGroups } from '../src/data/teams-primera-rfef.js';
import { segundaRFEFGrupo1, segundaRFEFGrupo2, segundaRFEFGrupo3, segundaRFEFGrupo4, segundaRFEFGrupo5, segundaRFEFGroups } from '../src/data/teams-segunda-rfef.js';

console.log('=== PRIMERA RFEF ===');
console.log('Grupo 1:', primeraRFEFGrupo1.length, 'teams');
console.log('Grupo 2:', primeraRFEFGrupo2.length, 'teams');
console.log('Groups:', Object.keys(primeraRFEFGroups));
console.log('Sample team:', JSON.stringify(primeraRFEFGrupo1[0]?.id));

console.log('\n=== SEGUNDA RFEF ===');
console.log('Grupo 1:', segundaRFEFGrupo1.length, 'teams');
console.log('Grupo 2:', segundaRFEFGrupo2.length, 'teams');
console.log('Grupo 3:', segundaRFEFGrupo3.length, 'teams');
console.log('Grupo 4:', segundaRFEFGrupo4.length, 'teams');
console.log('Grupo 5:', segundaRFEFGrupo5.length, 'teams');
console.log('Groups:', Object.keys(segundaRFEFGroups));
console.log('Total Segunda RFEF:', segundaRFEFGrupo1.length + segundaRFEFGrupo2.length + segundaRFEFGrupo3.length + segundaRFEFGrupo4.length + segundaRFEFGrupo5.length);
