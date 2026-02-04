#!/usr/bin/env node
/**
 * Rename all stadium names in stadiumCapacities.js with fictional names
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'stadiumCapacities.js');
let content = fs.readFileSync(filePath, 'utf-8');

// Known stadium mappings (big/recognizable ones)
const KNOWN = {
  'Santiago Bernabéu': 'Crown Arena',
  'Spotify Camp Nou': 'Grand Coliseum',
  'Cívitas Metropolitano': 'Titan Arena',
  'Ramón Sánchez-Pizjuán': 'Crimson Grounds',
  'Benito Villamarín': 'Estadio Solar',
  'Reale Arena': 'Silver Dome',
  'San Mamés': 'Coliseo del Norte',
  'Estadio de la Cerámica': 'Hawk Stadium',
  'Mestalla': 'Tidal Stadium',
  'Old Trafford': 'Fortress Ground',
  'Anfield': 'Scarlet Field',
  'Emirates Stadium': 'Cannon Park',
  'Etihad Stadium': 'Nova Stadium',
  'Stamford Bridge': 'Bridge Arena',
  'Tottenham Hotspur Stadium': 'Whitecrest Arena',
  "St. James' Park": 'Magpie Park',
  'Villa Park': 'Claret Park',
  'Allianz Arena': "Lion's Den Arena",
  'Signal Iduna Park': 'Signal Wall Stadium',
  'San Siro': 'Twin Towers Stadium',
  'Allianz Stadium': 'Zebra Arena',
  'Diego Armando Maradona': 'Vesuvio Stadium',
  'Stadio Olimpico': 'Gladiator Stadium',
  'Parc des Princes': 'Étoile Park',
  'Vélodrome': 'Phocéen Arena',
  'Maracanã': 'Grande Arena',
  'La Bombonera': 'El Caldero',
  'Estadio Monumental': 'Grand Monumental',
};

// Generate a deterministic fictional stadium name
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

const PREFIXES = ['Estadio', 'Arena', 'Campo', 'Estadio Municipal', 'Stadium', 'Complejo', 'Recinto'];
const ADJECTIVES = ['Norte', 'Sur', 'Central', 'Real', 'Imperial', 'Dorado', 'Nuevo', 'Gran', 'Alto', 'Viejo'];
const NOUNS = ['Valle', 'Monte', 'Río', 'Prado', 'Bosque', 'Olivo', 'Cedro', 'Roble', 'Estrella', 'Luna', 'Sol', 'Viento', 'Piedra', 'Sierra', 'Lago', 'Cruz', 'Torre', 'Arco', 'Puente', 'Colina', 'Cumbre', 'Llano', 'Meseta', 'Costa', 'Bahía', 'Roca', 'Fuente', 'Alameda', 'Pradera'];

function generateStadiumName(originalName) {
  const h = hash(originalName);
  const prefix = PREFIXES[h % PREFIXES.length];
  const adj = ADJECTIVES[(h >> 4) % ADJECTIVES.length];
  const noun = NOUNS[(h >> 8) % NOUNS.length];
  
  const style = h % 4;
  if (style === 0) return `${prefix} ${adj}`;
  if (style === 1) return `${prefix} ${noun}`;
  if (style === 2) return `Arena ${adj} ${noun}`;
  return `${prefix} El ${noun}`;
}

const usedNames = new Set();
let changes = 0;

// Replace all name: 'xxx' patterns in STADIUM_CAPACITIES
content = content.replace(/name:\s*'([^']+)'/g, (match, name) => {
  // Check known mapping first
  if (KNOWN[name]) {
    const newName = KNOWN[name];
    usedNames.add(newName);
    changes++;
    return `name: '${newName}'`;
  }
  
  // Generate fictional name
  let newName = generateStadiumName(name);
  let attempt = 0;
  while (usedNames.has(newName) && attempt < 20) {
    newName = generateStadiumName(name + attempt);
    attempt++;
  }
  usedNames.add(newName);
  changes++;
  return `name: '${newName}'`;
});

// Also rename fallback stadium names
content = content.replace(/name:\s*'Estadio Legendario'/g, "name: 'Estadio Legendario'"); // keep generic ones
content = content.replace(/name:\s*'Estadio Élite'/g, "name: 'Estadio Élite'");
content = content.replace(/name:\s*'Estadio Grande'/g, "name: 'Estadio Grande'");
content = content.replace(/name:\s*'Estadio Moderno'/g, "name: 'Estadio Moderno'");
content = content.replace(/name:\s*'Estadio Municipal'/g, "name: 'Estadio Municipal'");

// Update comment
content = content.replace('// Capacidades reales de estadios', '// Stadium capacities (fictional names)');
content = content.replace('// Fuente: Wikipedia / Transfermarkt 2024', '// PC Gaffer — renamed for release');

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`✅ Renamed ${changes} stadium names in stadiumCapacities.js`);
