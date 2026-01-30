/**
 * Fix ALL leagues - ensure every player has: overall, value, salary, contract, age, morale, fitness
 * Position in English (GK, CB, etc.)
 * Re-upload ALL to Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dataDir = join(projectRoot, 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const POS_ES_TO_EN = {
  'POR': 'GK', 'DFC': 'CB', 'LI': 'LB', 'LD': 'RB',
  'MCD': 'CDM', 'MC': 'CM', 'MCO': 'CAM',
  'EI': 'LW', 'ED': 'RW', 'MP': 'CF', 'DC': 'ST',
  'MI': 'LM', 'MD': 'RM'
};
const VALID_EN = new Set(['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','CF','ST','LM','RM']);

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
function estimateAge(overall) {
  if (overall >= 85) return 25 + Math.floor(Math.random() * 6);
  if (overall >= 80) return 24 + Math.floor(Math.random() * 7);
  if (overall >= 75) return 22 + Math.floor(Math.random() * 8);
  return 20 + Math.floor(Math.random() * 10);
}
function estimateValue(overall) {
  if (overall >= 90) return 80000000 + Math.floor(Math.random() * 70000000);
  if (overall >= 85) return 40000000 + Math.floor(Math.random() * 40000000);
  if (overall >= 80) return 15000000 + Math.floor(Math.random() * 25000000);
  if (overall >= 75) return 5000000 + Math.floor(Math.random() * 15000000);
  if (overall >= 70) return 2000000 + Math.floor(Math.random() * 8000000);
  return 500000 + Math.floor(Math.random() * 3000000);
}

// ALL leagues
const ALL_LEAGUES = [
  { file: 'laliga.json', id: 'laliga', name: 'La Liga EA Sports', country: 'España', isRfef: false },
  { file: 'laliga2.json', id: 'laliga2', name: 'La Liga Hypermotion', country: 'España', isRfef: false },
  { file: 'primera-rfef.json', id: 'primera-rfef', name: 'Primera Federación', country: 'España', isRfef: true },
  { file: 'segunda-rfef.json', id: 'segunda-rfef', name: 'Segunda Federación', country: 'España', isRfef: true },
  { file: 'premier.json', id: 'premier', name: 'Premier League', country: 'Inglaterra' },
  { file: 'seriea.json', id: 'seriea', name: 'Serie A', country: 'Italia' },
  { file: 'bundesliga.json', id: 'bundesliga', name: 'Bundesliga', country: 'Alemania' },
  { file: 'ligue1.json', id: 'ligue1', name: 'Ligue 1', country: 'Francia' },
  { file: 'eredivisie.json', id: 'eredivisie', name: 'Eredivisie', country: 'Países Bajos' },
  { file: 'primeiraLiga.json', id: 'primeiraLiga', name: 'Primeira Liga', country: 'Portugal' },
  { file: 'championship.json', id: 'championship', name: 'Championship', country: 'Inglaterra' },
  { file: 'belgianPro.json', id: 'belgianPro', name: 'Jupiler Pro League', country: 'Bélgica' },
  { file: 'superLig.json', id: 'superLig', name: 'Süper Lig', country: 'Turquía' },
  { file: 'scottishPrem.json', id: 'scottishPrem', name: 'Scottish Premiership', country: 'Escocia' },
  { file: 'serieB.json', id: 'serieB', name: 'Serie B', country: 'Italia' },
  { file: 'bundesliga2.json', id: 'bundesliga2', name: '2. Bundesliga', country: 'Alemania' },
  { file: 'ligue2.json', id: 'ligue2', name: 'Ligue 2', country: 'Francia' },
  { file: 'swissSuperLeague.json', id: 'swissSuperLeague', name: 'Super League', country: 'Suiza' },
  { file: 'austrianBundesliga.json', id: 'austrianBundesliga', name: 'Bundesliga', country: 'Austria' },
  { file: 'greekSuperLeague.json', id: 'greekSuperLeague', name: 'Super League', country: 'Grecia' },
  { file: 'danishSuperliga.json', id: 'danishSuperliga', name: 'Superligaen', country: 'Dinamarca' },
  { file: 'croatianLeague.json', id: 'croatianLeague', name: 'HNL', country: 'Croacia' },
  { file: 'czechLeague.json', id: 'czechLeague', name: 'Chance Liga', country: 'Chequia' },
];

function fixPlayer(p) {
  // overall: prefer overall, fallback to rating
  if (p.overall === undefined) {
    p.overall = p.rating || 70;
  }
  if (p.rating !== undefined) delete p.rating;
  
  // Position: convert Spanish to English
  if (POS_ES_TO_EN[p.position]) {
    p.position = POS_ES_TO_EN[p.position];
  }
  if (!VALID_EN.has(p.position)) p.position = 'CM';
  
  // Missing fields
  if (p.age === undefined || p.age === null) p.age = estimateAge(p.overall);
  if (p.value === undefined || p.value === null) p.value = estimateValue(p.overall);
  if (p.salary === undefined || p.salary === null) p.salary = generateSalary(p.value, p.overall);
  if (p.contract === undefined || p.contract === null) p.contract = generateContract(p.age);
  if (p.morale === undefined || p.morale === null) p.morale = 75;
  if (p.fitness === undefined || p.fitness === null) p.fitness = 100;
  
  // marketValue → value
  if (p.marketValue !== undefined && (p.value === undefined || p.value === 0)) {
    p.value = p.marketValue;
  }
  if (p.marketValue !== undefined) delete p.marketValue;
  if (p.nationality !== undefined) delete p.nationality;
  
  return p;
}

async function uploadLeague(leagueId, teams, metadata) {
  await setDoc(doc(db, 'leagues', leagueId), {
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount: teams.reduce((sum, t) => sum + (t.players?.length || 0), 0),
    updatedAt: new Date().toISOString()
  });
  
  const BATCH_SIZE = 400;
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = teams.slice(i, i + BATCH_SIZE);
    for (const team of chunk) {
      batch.set(doc(db, 'teams', team.id), {
        ...team,
        league: leagueId,
        playerCount: team.players?.length || 0,
        avgOverall: team.players?.length 
          ? Math.round(team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length) : 0,
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
}

async function main() {
  console.log('🔧 Fixing ALL leagues...\n');
  let totalFixed = 0;
  
  for (const league of ALL_LEAGUES) {
    const filePath = join(dataDir, league.file);
    let raw;
    try { raw = JSON.parse(readFileSync(filePath, 'utf-8')); } catch(e) { console.log(`  ❌ ${league.file}: ${e.message}`); continue; }
    
    // RFEF files have { allTeams: [...] } structure
    let teams = league.isRfef ? (raw.allTeams || raw) : raw;
    if (!Array.isArray(teams)) { console.log(`  ❌ ${league.file}: not an array`); continue; }
    
    let fixes = 0;
    for (const team of teams) {
      for (const p of (team.players || [])) {
        const hadOverall = p.overall !== undefined;
        fixPlayer(p);
        if (!hadOverall) fixes++;
      }
    }
    
    // Save fixed JSON (same structure as original)
    if (league.isRfef) {
      raw.allTeams = teams;
      writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');
    } else {
      writeFileSync(filePath, JSON.stringify(teams, null, 2), 'utf-8');
    }
    
    // Upload to Firestore
    await uploadLeague(league.id, teams, league);
    
    const tp = teams.reduce((s, t) => s + (t.players?.length || 0), 0);
    const status = fixes > 0 ? `🔧 ${fixes} players fixed` : '✅ already OK';
    console.log(`  ${league.name} (${league.id}): ${teams.length} teams, ${tp} players — ${status}`);
    totalFixed += fixes;
  }
  
  console.log(`\n✅ Done! ${totalFixed} players needed fixing across all leagues.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
