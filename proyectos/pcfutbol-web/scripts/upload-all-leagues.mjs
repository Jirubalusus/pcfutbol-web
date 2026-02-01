/**
 * Convert ALL scraped leagues to app format JSON + upload to Firestore
 * Reads from scraped-data/2025-26/ and uploads to Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const dataDir = join(projectRoot, 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Valid positions (keep English like existing data)
const VALID_POSITIONS = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','CF','ST','LM','RM'];

// Leagues to process (only the ones not already uploaded)
const LEAGUES_TO_UPLOAD = [
  { src: 'eredivisie.json',         firestoreId: 'eredivisie',         name: 'Eredivisie',           country: 'Países Bajos' },
  { src: 'primeiraLiga.json',       firestoreId: 'primeiraLiga',       name: 'Primeira Liga',        country: 'Portugal' },
  { src: 'championship.json',       firestoreId: 'championship',       name: 'Championship',         country: 'Inglaterra' },
  { src: 'belgianPro.json',         firestoreId: 'belgianPro',         name: 'Jupiler Pro League',   country: 'Bélgica' },
  { src: 'superLig.json',           firestoreId: 'superLig',           name: 'Süper Lig',            country: 'Turquía' },
  { src: 'scottishPrem.json',       firestoreId: 'scottishPrem',       name: 'Scottish Premiership', country: 'Escocia' },
  { src: 'serieB.json',             firestoreId: 'serieB',             name: 'Serie B',              country: 'Italia' },
  { src: 'bundesliga2.json',        firestoreId: 'bundesliga2',        name: '2. Bundesliga',        country: 'Alemania' },
  { src: 'ligue2.json',             firestoreId: 'ligue2',             name: 'Ligue 2',              country: 'Francia' },
  { src: 'swissSuperLeague.json',   firestoreId: 'swissSuperLeague',   name: 'Super League',         country: 'Suiza' },
  { src: 'austrianBundesliga.json', firestoreId: 'austrianBundesliga', name: 'Bundesliga',           country: 'Austria' },
  { src: 'greekSuperLeague.json',   firestoreId: 'greekSuperLeague',   name: 'Super League',         country: 'Grecia' },
  { src: 'danishSuperliga.json',    firestoreId: 'danishSuperliga',    name: 'Superligaen',          country: 'Dinamarca' },
  { src: 'croatianLeague.json',     firestoreId: 'croatianLeague',     name: 'HNL',                  country: 'Croacia' },
  { src: 'czechLeague.json',        firestoreId: 'czechLeague',        name: 'Chance Liga',          country: 'Chequia' },
  // South American leagues
  { src: 'argentinaPrimera.json',  firestoreId: 'argentinaPrimera',   name: 'Liga Profesional',     country: 'Argentina' },
  { src: 'brasileiraoA.json',     firestoreId: 'brasileiraoA',       name: 'Série A',              country: 'Brasil' },
  { src: 'colombiaPrimera.json',  firestoreId: 'colombiaPrimera',    name: 'Liga BetPlay',         country: 'Colombia' },
  { src: 'chilePrimera.json',     firestoreId: 'chilePrimera',       name: 'Primera División',     country: 'Chile' },
  { src: 'uruguayPrimera.json',   firestoreId: 'uruguayPrimera',     name: 'Primera División',     country: 'Uruguay' },
  { src: 'ecuadorLigaPro.json',   firestoreId: 'ecuadorLigaPro',     name: 'LigaPro',              country: 'Ecuador' },
  { src: 'paraguayPrimera.json',  firestoreId: 'paraguayPrimera',    name: 'División de Honor',    country: 'Paraguay' },
  { src: 'peruLiga1.json',        firestoreId: 'peruLiga1',          name: 'Liga 1',               country: 'Perú' },
  { src: 'boliviaPrimera.json',   firestoreId: 'boliviaPrimera',     name: 'División Profesional', country: 'Bolivia' },
  { src: 'venezuelaPrimera.json', firestoreId: 'venezuelaPrimera',   name: 'Liga FUTVE',           country: 'Venezuela' },
];

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate salary from market value (same formula as existing data)
 * ~0.3% of market value per week, with min/max bounds
 */
function generateSalary(marketValue, overall) {
  if (!marketValue || marketValue < 1000) {
    // Low value players: base on overall
    return Math.round(10000 + (overall - 60) * 1000);
  }
  // ~0.3% of market value per week, capped
  const base = Math.round(marketValue * 0.003);
  return Math.max(15000, Math.min(base, 200000));
}

/**
 * Generate contract years (1-5 based on age)
 */
function generateContract(age) {
  if (age >= 34) return 1;
  if (age >= 30) return Math.random() < 0.5 ? 1 : 2;
  if (age >= 27) return Math.floor(Math.random() * 3) + 1; // 1-3
  return Math.floor(Math.random() * 3) + 2; // 2-4
}

function convertTeam(rawTeam) {
  const id = rawTeam.slug || toSlug(rawTeam.name);
  const players = (rawTeam.players || []).map(p => {
    const overall = p.overall || 70;
    const age = p.age || 25;
    const marketValue = p.marketValue || 0;
    const position = VALID_POSITIONS.includes(p.position) ? p.position : 'CM';
    
    return {
      name: p.name,
      position,
      age,
      overall,
      value: marketValue,
      salary: generateSalary(marketValue, overall),
      contract: generateContract(age),
      morale: 75,
      fitness: 100
    };
  });
  
  return {
    id,
    name: rawTeam.name,
    players
  };
}

async function uploadLeague(leagueId, teams, metadata) {
  // Upload league doc
  await setDoc(doc(db, 'leagues', leagueId), {
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount: teams.reduce((sum, t) => sum + (t.players?.length || 0), 0),
    updatedAt: new Date().toISOString()
  });
  
  // Upload teams in batches
  const BATCH_SIZE = 400;
  let uploaded = 0;
  
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = teams.slice(i, i + BATCH_SIZE);
    
    for (const team of chunk) {
      const teamRef = doc(db, 'teams', team.id);
      batch.set(teamRef, {
        ...team,
        league: leagueId,
        playerCount: team.players?.length || 0,
        avgOverall: team.players?.length 
          ? Math.round(team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length)
          : 0,
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
    uploaded += chunk.length;
  }
  
  return uploaded;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🔥 Converting & uploading all remaining leagues to Firestore...\n');
  
  let totalTeams = 0;
  let totalPlayers = 0;
  let successCount = 0;
  
  for (const league of LEAGUES_TO_UPLOAD) {
    process.stdout.write(`  📋 ${league.name} (${league.src})...`);
    
    try {
      const rawData = JSON.parse(readFileSync(join(scrapedDir, league.src), 'utf-8'));
      
      if (!Array.isArray(rawData) || rawData.length === 0) {
        console.log(' ❌ Empty or invalid data');
        continue;
      }
      
      // Convert to app format
      const teams = rawData.map(convertTeam);
      const playerCount = teams.reduce((s, t) => s + t.players.length, 0);
      
      // Also save as JSON in public/data for local fallback
      const jsonPath = join(dataDir, league.src);
      writeFileSync(jsonPath, JSON.stringify(teams, null, 2), 'utf-8');
      
      // Upload to Firestore
      await uploadLeague(league.firestoreId, teams, league);
      
      console.log(` ✅ ${teams.length} teams, ${playerCount} players`);
      totalTeams += teams.length;
      totalPlayers += playerCount;
      successCount++;
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }
  
  // Update metadata
  await setDoc(doc(db, 'metadata', 'stats'), {
    version: '2025-26',
    source: 'Transfermarkt',
    lastUpdated: new Date().toISOString(),
    leagues: [
      'laliga', 'laliga2', 'primera-rfef', 'segunda-rfef',
      'premier', 'seriea', 'bundesliga', 'ligue1',
      ...LEAGUES_TO_UPLOAD.map(l => l.firestoreId)
    ]
  });
  
  console.log(`\n✅ Done! ${successCount} leagues, ${totalTeams} teams, ${totalPlayers} players uploaded.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
