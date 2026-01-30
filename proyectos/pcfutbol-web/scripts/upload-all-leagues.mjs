/**
 * Convert ALL scraped leagues to app format JSON + upload to Firestore
 * Reads from scraped-data/2025-26/ and uploads to Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const dataDir = join(projectRoot, 'public', 'data');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw",
  authDomain: "pcfutbol-web.firebaseapp.com",
  projectId: "pcfutbol-web",
  storageBucket: "pcfutbol-web.firebasestorage.app",
  messagingSenderId: "664376263748",
  appId: "1:664376263748:web:3ba1fd5d119d021cb5e811"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Position mapping: English -> Spanish
const POSITION_MAP = {
  'GK': 'POR',
  'CB': 'DFC',
  'LB': 'LI',
  'RB': 'LD',
  'CDM': 'MCD',
  'CM': 'MC',
  'CAM': 'MCO',
  'LW': 'EI',
  'RW': 'ED',
  'CF': 'MP',
  'ST': 'DC',
  'LM': 'MI',
  'RM': 'MD'
};

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

function convertTeam(rawTeam) {
  const id = rawTeam.slug || toSlug(rawTeam.name);
  const players = (rawTeam.players || []).map(p => ({
    name: p.name,
    position: POSITION_MAP[p.position] || 'MC',
    rating: p.overall || 70,
    age: p.age || 25,
    nationality: p.nationality || '',
    marketValue: p.marketValue || 0
  }));
  
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
          ? Math.round(team.players.reduce((s, p) => s + (p.rating || 0), 0) / team.players.length)
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
