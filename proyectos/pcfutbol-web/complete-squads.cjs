const fs = require('fs');
const path = require('path');

// Nombres genéricos por posición
const GENERIC_PLAYERS = {
  GK: ['Iker Sánchez', 'Pablo Ruiz', 'Álex García', 'Daniel López'],
  CB: ['Carlos Martínez', 'Sergio Torres', 'David García', 'Adrián Pérez', 'Hugo Navarro', 'Marcos López'],
  LB: ['Javier Hernández', 'Luis Moreno', 'Óscar Ruiz', 'Pablo Martín'],
  RB: ['Diego Sánchez', 'Álvaro García', 'Rubén Pérez', 'Iván Torres'],
  CDM: ['Juan López', 'Sergio Martín', 'Carlos Díaz', 'Pablo Rodríguez'],
  CM: ['Mario García', 'Hugo Fernández', 'Dani Morales', 'Álex Jiménez', 'Iker Ruiz'],
  CAM: ['Lucas Sánchez', 'Rubén García', 'Pablo Torres', 'Diego Martínez'],
  LW: ['Alejandro Pérez', 'Mario López', 'Carlos Navarro', 'David Ruiz'],
  RW: ['Sergio García', 'Pablo Hernández', 'Hugo Moreno', 'Iker López'],
  ST: ['Javi Torres', 'Diego Martín', 'Marcos García', 'Lucas Pérez', 'Álvaro Sánchez']
};

// Edades típicas por posición
const AGES = { GK: 27, CB: 26, LB: 26, RB: 25, CDM: 27, CM: 26, CAM: 24, LW: 24, RW: 23, ST: 25 };

// Valor base por presupuesto de equipo
function getBaseValue(budget) {
  if (budget >= 50000000) return 3;
  if (budget >= 20000000) return 1.5;
  if (budget >= 10000000) return 0.8;
  if (budget >= 5000000) return 0.5;
  return 0.3;
}

// Posiciones necesarias para una plantilla completa
const SQUAD_TEMPLATE = ['GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'LB', 'RB', 'RB', 
                        'CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'ST'];

function processFile(filePath) {
  console.log(`\nProcesando: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Encontrar todos los equipos con sus jugadores
  const teamRegex = /(\w+):\s*\{[^}]*name:\s*'([^']+)'[^}]*budget:\s*(\d+)[^}]*players:\s*\[([\s\S]*?)\]\s*\}/g;
  
  let match;
  let modifications = 0;
  
  while ((match = teamRegex.exec(content)) !== null) {
    const teamId = match[1];
    const teamName = match[2];
    const budget = parseInt(match[3]);
    const playersSection = match[4];
    
    // Contar jugadores actuales
    const playerCount = (playersSection.match(/createPlayer/g) || []).length;
    
    if (playerCount < 20) {
      console.log(`  ${teamName}: ${playerCount} jugadores -> añadiendo ${22 - playerCount}`);
      
      // Contar posiciones actuales
      const positions = {};
      const posRegex = /createPlayer\('[^']+',\s*'(\w+)'/g;
      let posMatch;
      while ((posMatch = posRegex.exec(playersSection)) !== null) {
        positions[posMatch[1]] = (positions[posMatch[1]] || 0) + 1;
      }
      
      // Determinar qué posiciones faltan
      const neededPlayers = [];
      const baseValue = getBaseValue(budget);
      
      for (const pos of SQUAD_TEMPLATE) {
        const current = positions[pos] || 0;
        const needed = SQUAD_TEMPLATE.filter(p => p === pos).length;
        if (current < needed) {
          const idx = neededPlayers.filter(p => p.pos === pos).length;
          if (idx < GENERIC_PLAYERS[pos].length) {
            neededPlayers.push({
              pos,
              name: GENERIC_PLAYERS[pos][idx],
              age: AGES[pos] + Math.floor(Math.random() * 5) - 2,
              value: (baseValue * (0.5 + Math.random() * 0.5)).toFixed(1)
            });
            positions[pos] = (positions[pos] || 0) + 1;
          }
        }
        if (neededPlayers.length >= 22 - playerCount) break;
      }
      
      // Generar líneas de código para nuevos jugadores
      const newPlayers = neededPlayers.map(p => 
        `      createPlayer('${p.name}', '${p.pos}', ${p.age}, ${p.value})`
      ).join(',\n');
      
      // Insertar antes del cierre del array
      const insertPos = content.indexOf(playersSection) + playersSection.lastIndexOf(')') + 1;
      content = content.slice(0, insertPos) + ',\n' + newPlayers + content.slice(insertPos);
      
      modifications++;
    }
  }
  
  if (modifications > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ ${modifications} equipos actualizados`);
  } else {
    console.log('  ✅ Todas las plantillas completas');
  }
}

// Procesar archivos
const dataDir = path.join(__dirname, 'src', 'data');
const files = [
  'teams.js',
  'teams-segunda.js', 
  'teams-primera-rfef.js',
  'teams-segunda-rfef.js',
  'teams-premier.js',
  'teams-bundesliga.js',
  'teams-seriea.js',
  'teams-ligue1.js'
];

console.log('🔧 Completando plantillas de equipos...\n');

for (const file of files) {
  const filePath = path.join(dataDir, file);
  if (fs.existsSync(filePath)) {
    try {
      processFile(filePath);
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  } else {
    console.log(`  ⚠️ ${file} no encontrado`);
  }
}

console.log('\n✅ Proceso completado');
