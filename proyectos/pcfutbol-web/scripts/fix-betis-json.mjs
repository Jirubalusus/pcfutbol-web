// Script para corregir la plantilla del Betis en laliga.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../public/data/laliga.json');

// Función para calcular overall basado en valor (millones €)
function calculateOverall(valueMillions, age) {
  let overall;
  if (valueMillions >= 80) overall = 90;
  else if (valueMillions >= 60) overall = 88;
  else if (valueMillions >= 45) overall = 86;
  else if (valueMillions >= 35) overall = 84;
  else if (valueMillions >= 25) overall = 82;
  else if (valueMillions >= 18) overall = 80;
  else if (valueMillions >= 12) overall = 78;
  else if (valueMillions >= 8) overall = 76;
  else if (valueMillions >= 5) overall = 74;
  else if (valueMillions >= 3) overall = 72;
  else if (valueMillions >= 1.5) overall = 70;
  else if (valueMillions >= 0.8) overall = 68;
  else if (valueMillions >= 0.4) overall = 66;
  else overall = 64;
  
  if (age >= 35) overall = Math.min(overall, 75);
  else if (age >= 33) overall = Math.min(overall, 78);
  
  return overall;
}

function calculateSalary(valueMillions) {
  return Math.round(valueMillions * 3000 + 15000);
}

// Plantilla actualizada del Betis 25/26 según Transfermarkt
const betisPlayersRaw = [
  // Porteros
  { name: 'Álvaro Valles', position: 'GK', age: 28, value: 2500000 },
  { name: 'Pau López', position: 'GK', age: 31, value: 2500000 },
  { name: 'Adrián', position: 'GK', age: 39, value: 400000 },
  // Defensas centrales
  { name: 'Natan', position: 'CB', age: 24, value: 20000000 },
  { name: 'Valentín Gómez', position: 'CB', age: 22, value: 12000000 },
  { name: 'Diego Llorente', position: 'CB', age: 32, value: 3000000 },
  { name: 'Marc Bartra', position: 'CB', age: 35, value: 1000000 },
  // Laterales
  { name: 'Junior Firpo', position: 'LB', age: 29, value: 6000000 },
  { name: 'Ricardo Rodríguez', position: 'LB', age: 33, value: 1500000 },
  { name: 'Ángel Ortiz', position: 'RB', age: 21, value: 4000000 },
  { name: 'Héctor Bellerín', position: 'RB', age: 30, value: 2500000 },
  // Centrocampistas
  { name: 'Sofyan Amrabat', position: 'CDM', age: 29, value: 12000000 },
  { name: 'Marc Roca', position: 'CDM', age: 29, value: 4000000 },
  { name: 'Sergi Altimira', position: 'CM', age: 24, value: 20000000 },
  { name: 'Nelson Deossa', position: 'CM', age: 25, value: 9000000 },
  { name: 'Pablo Fornals', position: 'CM', age: 29, value: 8000000 },
  { name: 'Giovani Lo Celso', position: 'CAM', age: 29, value: 15000000 },
  { name: 'Isco', position: 'CAM', age: 33, value: 4000000 },
  // Extremos
  { name: 'Abde Ezzalzouli', position: 'LW', age: 24, value: 20000000 },
  { name: 'Rodrigo Riquelme', position: 'LW', age: 25, value: 8000000 },
  { name: 'Antony', position: 'RW', age: 25, value: 30000000 },
  { name: 'Pablo García', position: 'RW', age: 19, value: 10000000 },
  { name: 'Aitor Ruibal', position: 'RW', age: 29, value: 3500000 },
  // Delanteros
  { name: 'Cucho Hernández', position: 'ST', age: 26, value: 18000000 },
  { name: 'Chimy Ávila', position: 'ST', age: 31, value: 1500000 },
  { name: 'Cédric Bakambu', position: 'ST', age: 34, value: 1400000 }
];

const betisPlayers = betisPlayersRaw.map(p => {
  const valueM = p.value / 1000000;
  return {
    name: p.name,
    position: p.position,
    age: p.age,
    overall: calculateOverall(valueM, p.age),
    value: p.value,
    salary: calculateSalary(valueM),
    contract: 3,
    morale: 75,
    fitness: 100
  };
});

// Leer el archivo JSON
console.log('📖 Leyendo laliga.json...');
const teams = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Encontrar y actualizar el Betis
const betisIndex = teams.findIndex(t => t.id === 'real_betis');
if (betisIndex === -1) {
  console.log('❌ No se encontró el Betis en el archivo');
  process.exit(1);
}

console.log(`\n🔄 Actualizando Real Betis (índice ${betisIndex})...`);
console.log(`   Antes: ${teams[betisIndex].players.length} jugadores`);

// Actualizar jugadores
teams[betisIndex].players = betisPlayers;

console.log(`   Después: ${betisPlayers.length} jugadores`);

// Guardar el archivo
fs.writeFileSync(dataPath, JSON.stringify(teams), 'utf8');
console.log('\n✅ laliga.json actualizado');

// Mostrar resumen
console.log('\n📋 Nueva plantilla del Betis:');
betisPlayers.forEach(p => {
  console.log(`   ${p.position.padEnd(3)} ${p.name.padEnd(20)} OVR:${p.overall} Val:€${(p.value/1000000).toFixed(1)}M`);
});
