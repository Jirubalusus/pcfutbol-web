/**
 * Convert scraped Spanish league data to public/data/ format
 * 
 * Reads from scraped-data/2025-26/ and writes to public/data/
 * Preserves existing team metadata (city, stadium, colors) where possible
 * 
 * Usage: node scripts/convert-spain-to-public.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const scrapedDir = path.join(projectRoot, 'scraped-data', '2025-26');
const dataDir = path.join(projectRoot, 'public', 'data');

function generateTeamId(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
}

function generateShortName(name) {
  const parts = name.split(/\s+/).filter(p => !['de', 'del', 'la', 'las', 'los', 'el'].includes(p.toLowerCase()));
  const prefixes = new Set(['FC', 'CF', 'SC', 'RC', 'CD', 'UD', 'SD', 'AD', 'CA', 'RCD', 'CE']);
  const mainParts = parts.filter(p => !prefixes.has(p.toUpperCase()));
  if (mainParts.length > 0) {
    const first = mainParts[0];
    if (first.length <= 4) return first.toUpperCase();
    return first.substring(0, 3).toUpperCase();
  }
  return parts[0].substring(0, 3).toUpperCase();
}

function generateSalary(value, overall) {
  if (!value || value < 1000) return Math.round(10000 + ((overall || 70) - 60) * 1000);
  return Math.max(15000, Math.min(Math.round(value * 0.003), 200000));
}

function generateContract(age) {
  if (age >= 34) return 1;
  if (age >= 30) return Math.random() < 0.5 ? 1 : 2;
  if (age >= 27) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 3) + 2;
}

function convertPlayer(p) {
  return {
    name: p.name,
    position: p.position || 'CM',
    age: p.age || 25,
    overall: Math.max(45, Math.min(99, p.overall || 65)),
    value: p.marketValue || 500000,
    salary: generateSalary(p.marketValue, p.overall),
    contract: generateContract(p.age || 25),
    morale: 75,
    fitness: 100
  };
}

function convertTeam(scrapedTeam, existingTeam) {
  const id = existingTeam?.id || generateTeamId(scrapedTeam.name);
  const players = (scrapedTeam.players || []).map(convertPlayer);
  const avgOverall = players.length > 0
    ? Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length)
    : 65;

  return {
    id,
    name: scrapedTeam.name,
    shortName: existingTeam?.shortName || generateShortName(scrapedTeam.name),
    city: existingTeam?.city || scrapedTeam.name,
    stadium: existingTeam?.stadium || 'Estadio Municipal',
    stadiumCapacity: existingTeam?.stadiumCapacity || 15000,
    budget: existingTeam?.budget || Math.round((scrapedTeam.marketValue || 5000000) * 0.3),
    reputation: existingTeam?.reputation || avgOverall,
    colors: existingTeam?.colors || { primary: '#1a1a2e', secondary: '#FFFFFF' },
    players
  };
}

// Build a lookup of existing teams by normalized name
function buildExistingLookup(existingTeams) {
  const lookup = {};
  for (const team of existingTeams) {
    const key = team.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    lookup[key] = team;
    if (team.id) lookup[team.id] = team;
  }
  return lookup;
}

function findExistingTeam(lookup, scrapedTeam) {
  const key = scrapedTeam.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (lookup[key]) return lookup[key];
  // Try partial match
  for (const [k, v] of Object.entries(lookup)) {
    if (key.includes(k.substring(0, 10)) || k.includes(key.substring(0, 10))) return v;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================

console.log('🔄 Converting Spanish league data to public/data/ format...\n');

// 1. LaLiga
try {
  const scraped = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'laliga.json'), 'utf8'));
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'laliga.json'), 'utf8')); } catch(e) {}
  const lookup = buildExistingLookup(existing);
  
  const teams = scraped.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  fs.writeFileSync(path.join(dataDir, 'laliga.json'), JSON.stringify(teams, null, 2), 'utf8');
  const tp = teams.reduce((s, t) => s + t.players.length, 0);
  console.log(`✅ LaLiga: ${teams.length} equipos, ${tp} jugadores`);
} catch(e) {
  console.log(`❌ LaLiga: ${e.message}`);
}

// 2. LaLiga 2
try {
  const scraped = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'laliga2.json'), 'utf8'));
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'laliga2.json'), 'utf8')); } catch(e) {}
  const lookup = buildExistingLookup(existing);
  
  const teams = scraped.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  fs.writeFileSync(path.join(dataDir, 'laliga2.json'), JSON.stringify(teams, null, 2), 'utf8');
  const tp = teams.reduce((s, t) => s + t.players.length, 0);
  console.log(`✅ LaLiga 2: ${teams.length} equipos, ${tp} jugadores`);
} catch(e) {
  console.log(`❌ LaLiga 2: ${e.message}`);
}

// 3. Primera RFEF (2 groups)
try {
  const g1 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'primeraRfefG1.json'), 'utf8'));
  const g2 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'primeraRfefG2.json'), 'utf8'));
  
  let existing = { grupo1: [], grupo2: [], allTeams: [] };
  try { existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'primera-rfef.json'), 'utf8')); } catch(e) {}
  const lookup = buildExistingLookup(existing.allTeams || []);
  
  const grupo1 = g1.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const grupo2 = g2.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const allTeams = [...grupo1, ...grupo2];
  
  const result = { grupo1, grupo2, allTeams };
  fs.writeFileSync(path.join(dataDir, 'primera-rfef.json'), JSON.stringify(result, null, 2), 'utf8');
  const tp = allTeams.reduce((s, t) => s + t.players.length, 0);
  console.log(`✅ Primera RFEF: G1=${grupo1.length}, G2=${grupo2.length}, Total=${allTeams.length} equipos, ${tp} jugadores`);
} catch(e) {
  console.log(`❌ Primera RFEF: ${e.message}`);
}

// 4. Segunda RFEF (5 groups)
try {
  const g1 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'segundaRfefG1.json'), 'utf8'));
  const g2 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'segundaRfefG2.json'), 'utf8'));
  const g3 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'segundaRfefG3.json'), 'utf8'));
  const g4 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'segundaRfefG4.json'), 'utf8'));
  const g5 = JSON.parse(fs.readFileSync(path.join(scrapedDir, 'segundaRfefG5.json'), 'utf8'));
  
  let existing = { grupo1: [], grupo2: [], grupo3: [], grupo4: [], grupo5: [], allTeams: [] };
  try { existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'segunda-rfef.json'), 'utf8')); } catch(e) {}
  const lookup = buildExistingLookup(existing.allTeams || []);
  
  const grupo1 = g1.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const grupo2 = g2.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const grupo3 = g3.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const grupo4 = g4.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const grupo5 = g5.map(t => convertTeam(t, findExistingTeam(lookup, t)));
  const allTeams = [...grupo1, ...grupo2, ...grupo3, ...grupo4, ...grupo5];
  
  const result = { grupo1, grupo2, grupo3, grupo4, grupo5, allTeams };
  fs.writeFileSync(path.join(dataDir, 'segunda-rfef.json'), JSON.stringify(result, null, 2), 'utf8');
  const tp = allTeams.reduce((s, t) => s + t.players.length, 0);
  console.log(`✅ Segunda RFEF: G1=${grupo1.length}, G2=${grupo2.length}, G3=${grupo3.length}, G4=${grupo4.length}, G5=${grupo5.length}, Total=${allTeams.length} equipos, ${tp} jugadores`);
} catch(e) {
  console.log(`❌ Segunda RFEF: ${e.message}`);
}

console.log('\n✅ Conversión completada!');
