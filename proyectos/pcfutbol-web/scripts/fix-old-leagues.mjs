/**
 * Fix Serie A, Bundesliga, Ligue 1 - convert old format (rating) to new format (overall + salary etc)
 * Also re-upload to Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dataDir = join(projectRoot, 'public', 'data');

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

// Position mapping: Spanish → English (for consistency with other leagues)
const POS_TO_EN = {
  'POR': 'GK', 'DFC': 'CB', 'LI': 'LB', 'LD': 'RB',
  'MCD': 'CDM', 'MC': 'CM', 'MCO': 'CAM',
  'EI': 'LW', 'ED': 'RW', 'MP': 'CF', 'DC': 'ST',
  'MI': 'LM', 'MD': 'RM'
};

function generateSalary(marketValue, overall) {
  if (!marketValue || marketValue < 1000) {
    return Math.round(10000 + (overall - 60) * 1000);
  }
  return Math.max(15000, Math.min(Math.round(marketValue * 0.003), 200000));
}

function generateContract(age) {
  if (age >= 34) return 1;
  if (age >= 30) return Math.random() < 0.5 ? 1 : 2;
  if (age >= 27) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 3) + 2;
}

function estimateAge(overall) {
  // Higher overall → likely prime age (25-30)
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

const LEAGUES_TO_FIX = [
  { file: 'seriea.json', firestoreId: 'seriea', name: 'Serie A', country: 'Italia' },
  { file: 'bundesliga.json', firestoreId: 'bundesliga', name: 'Bundesliga', country: 'Alemania' },
  { file: 'ligue1.json', firestoreId: 'ligue1', name: 'Ligue 1', country: 'Francia' },
];

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
  }
}

async function main() {
  console.log('🔧 Fixing old league formats (rating → overall + salary/value)...\n');
  
  for (const league of LEAGUES_TO_FIX) {
    const filePath = join(dataDir, league.file);
    const teams = JSON.parse(readFileSync(filePath, 'utf-8'));
    
    let fixed = 0;
    for (const team of teams) {
      for (const p of team.players) {
        // Convert rating → overall if needed
        if (p.rating !== undefined && p.overall === undefined) {
          p.overall = p.rating;
          delete p.rating;
        }
        
        // Convert Spanish position to English if needed
        if (POS_TO_EN[p.position]) {
          p.position = POS_TO_EN[p.position];
        }
        
        // Add missing fields
        if (p.age === undefined) p.age = estimateAge(p.overall || 70);
        if (p.value === undefined) p.value = estimateValue(p.overall || 70);
        if (p.salary === undefined) p.salary = generateSalary(p.value, p.overall || 70);
        if (p.contract === undefined) p.contract = generateContract(p.age);
        if (p.morale === undefined) p.morale = 75;
        if (p.fitness === undefined) p.fitness = 100;
        
        fixed++;
      }
    }
    
    // Save fixed JSON
    writeFileSync(filePath, JSON.stringify(teams, null, 2), 'utf-8');
    
    // Upload to Firestore
    await uploadLeague(league.firestoreId, teams, league);
    
    const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
    console.log(`  ✅ ${league.name}: ${teams.length} teams, ${totalPlayers} players fixed`);
  }
  
  console.log('\n✅ All leagues fixed and uploaded!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
