// Script para completar plantillas de LaLiga
// Añade jugadores realistas a equipos con menos de 18 jugadores

import { LALIGA_TEAMS } from '../src/data/teams.js';
import * as fs from 'fs';
import * as path from 'path';

// Nombres españoles realistas
const FIRST_NAMES = [
  'Pablo', 'Alejandro', 'David', 'Carlos', 'Javier', 'Miguel', 'Antonio', 'Fernando', 
  'Luis', 'Sergio', 'Alberto', 'Rubén', 'Adrián', 'Óscar', 'Raúl', 'Diego', 'Álvaro', 
  'Iván', 'Héctor', 'Marcos', 'Jesús', 'Víctor', 'Daniel', 'Álex', 'Jorge', 'Mario', 
  'Samuel', 'Iker', 'Unai', 'Gorka', 'Aitor', 'Xabi', 'Asier', 'Jon', 'Andoni', 'Oier',
  'Pau', 'Marc', 'Oriol', 'Arnau', 'Pol', 'Gerard', 'Eric', 'Riqui', 'Pedri', 'Gavi',
  'Hugo', 'Gonzalo', 'Julen', 'Mikel', 'Ander', 'Beñat', 'Joselu', 'Nacho', 'Dani'
];

const LAST_NAMES = [
  'García', 'Martínez', 'López', 'Sánchez', 'González', 'Rodríguez', 'Fernández', 'Pérez',
  'Gómez', 'Díaz', 'Ruiz', 'Hernández', 'Jiménez', 'Moreno', 'Muñoz', 'Álvarez', 'Romero',
  'Navarro', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Molina',
  'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez',
  'Iglesias', 'Medina', 'Garrido', 'Cortés', 'Castillo', 'Santos', 'Guerrero', 'Lozano',
  'Cano', 'Prieto', 'Méndez', 'Cruz', 'Calvo', 'Gallego', 'Vidal', 'León', 'Herrera',
  'Peña', 'Flores', 'Cabrera', 'Campos', 'Vega', 'Fuentes', 'Carrasco', 'Reyes', 'Aguilar'
];

// Posiciones ideales para una plantilla de 22-23 jugadores
const IDEAL_POSITIONS = {
  GK: 3,   // 1 titular + 2 suplentes
  CB: 4,   // 2 titulares + 2 suplentes
  RB: 2,   // 1 titular + 1 suplente
  LB: 2,   // 1 titular + 1 suplente
  CDM: 2,  // 1-2 titulares
  CM: 3,   // 2 titulares + 1 suplente
  CAM: 2,  // 1 titular + 1 suplente (o puede jugar de CM)
  RW: 2,   // 1 titular + 1 suplente
  LW: 2,   // 1 titular + 1 suplente
  ST: 3    // 1-2 titulares + suplentes
};

// Generar seed basada en el equipo para reproducibilidad
function createSeededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generar nombre único evitando duplicados
function generateUniqueName(existingNames, random) {
  let name;
  let attempts = 0;
  do {
    const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    name = `${firstName} ${lastName}`;
    attempts++;
  } while (existingNames.has(name) && attempts < 100);
  
  // Si no encontramos nombre único, añadir sufijo
  if (existingNames.has(name)) {
    name = `${name} II`;
  }
  
  existingNames.add(name);
  return name;
}

// Generar jugador basado en la reputación del equipo
function generatePlayer(position, teamReputation, existingNames, random) {
  // Calcular overall basado en reputación (equipos top = mejores canteranos)
  const baseOverall = Math.max(60, Math.min(78, teamReputation - 10 + Math.floor(random() * 8) - 4));
  
  // Ajustar por posición (porteros suplentes pueden ser más flojos)
  let overall = baseOverall;
  if (position === 'GK' && random() > 0.5) overall -= 2;
  
  // Edad típica de canteranos/suplentes (19-26)
  const age = 19 + Math.floor(random() * 8);
  
  // Valor basado en overall y edad
  const baseValue = (overall - 60) * 300000;
  const ageMultiplier = age <= 23 ? 1.3 : (age <= 26 ? 1.0 : 0.7);
  const value = Math.round(baseValue * ageMultiplier + random() * 1000000);
  
  // Salario proporcional
  const salary = Math.round(value * 0.002 + 20000 + random() * 20000);
  
  return {
    name: generateUniqueName(existingNames, random),
    position,
    overall,
    age,
    value,
    salary
  };
}

// Analizar qué posiciones faltan
function analyzeSquadNeeds(players) {
  const current = {};
  for (const pos of Object.keys(IDEAL_POSITIONS)) {
    current[pos] = 0;
  }
  
  players.forEach(p => {
    if (current[p.position] !== undefined) {
      current[p.position]++;
    }
  });
  
  const needs = {};
  for (const [pos, ideal] of Object.entries(IDEAL_POSITIONS)) {
    const diff = ideal - (current[pos] || 0);
    if (diff > 0) {
      needs[pos] = diff;
    }
  }
  
  return needs;
}

// Generar nuevos jugadores para un equipo
function completeSquad(team) {
  const needs = analyzeSquadNeeds(team.players);
  const existingNames = new Set(team.players.map(p => p.name));
  const seed = team.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = createSeededRandom(seed);
  
  const newPlayers = [];
  
  for (const [position, count] of Object.entries(needs)) {
    for (let i = 0; i < count; i++) {
      newPlayers.push(generatePlayer(position, team.reputation, existingNames, random));
    }
  }
  
  return newPlayers;
}

// Main
console.log('🔧 COMPLETANDO PLANTILLAS DE LALIGA');
console.log('═'.repeat(60));

const updates = [];

LALIGA_TEAMS.forEach(team => {
  const currentSize = team.players.length;
  
  if (currentSize < 18) {
    const newPlayers = completeSquad(team);
    const newSize = currentSize + newPlayers.length;
    
    console.log(`\n${team.shortName} (${team.name}):`);
    console.log(`  Antes: ${currentSize} jugadores`);
    console.log(`  Añadidos: ${newPlayers.length} jugadores`);
    console.log(`  Después: ${newSize} jugadores`);
    
    // Mostrar jugadores añadidos
    newPlayers.forEach(p => {
      console.log(`    + ${p.name} (${p.position}, OVR ${p.overall}, ${p.age} años)`);
    });
    
    updates.push({
      teamId: team.id,
      teamName: team.name,
      newPlayers
    });
  } else {
    console.log(`\n${team.shortName}: ✅ Plantilla completa (${currentSize} jugadores)`);
  }
});

// Generar código para añadir al archivo teams.js
console.log('\n' + '═'.repeat(60));
console.log('📋 JUGADORES A AÑADIR (copia al final de cada plantilla en teams.js):');
console.log('═'.repeat(60));

updates.forEach(({ teamId, teamName, newPlayers }) => {
  console.log(`\n// === ${teamName} (${teamId}) - Añadir estos jugadores ===`);
  newPlayers.forEach(p => {
    console.log(`      { name: '${p.name}', position: '${p.position}', overall: ${p.overall}, age: ${p.age}, value: ${p.value}, salary: ${p.salary} },`);
  });
});

console.log('\n✅ Script completado');
console.log('   Copia los jugadores generados a src/data/teams.js');
