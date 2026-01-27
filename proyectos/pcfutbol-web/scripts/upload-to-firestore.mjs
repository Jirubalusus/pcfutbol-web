import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const dataDir = path.join(__dirname, '../public/data');

// Estructura en Firestore:
// /leagues/{leagueId} - metadata de la liga
// /teams/{teamId} - datos del equipo con jugadores embebidos

async function uploadLeague(leagueName, teams, metadata = {}) {
  console.log(`\n📤 Subiendo ${leagueName}...`);
  
  // Documento de la liga
  await setDoc(doc(db, 'leagues', leagueName), {
    name: metadata.name || leagueName,
    country: metadata.country || 'España',
    teamCount: teams.length,
    playerCount: teams.reduce((sum, t) => sum + (t.players?.length || 0), 0),
    updatedAt: new Date().toISOString()
  });
  
  // Subir equipos en batches (max 500 por batch)
  const BATCH_SIZE = 400;
  let uploaded = 0;
  
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = teams.slice(i, i + BATCH_SIZE);
    
    for (const team of chunk) {
      const teamId = team.id || team.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const teamRef = doc(db, 'teams', teamId);
      
      batch.set(teamRef, {
        ...team,
        id: teamId,
        league: leagueName,
        playerCount: team.players?.length || 0,
        avgOverall: team.players?.length 
          ? Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length)
          : 0,
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
    uploaded += chunk.length;
    console.log(`   ${uploaded}/${teams.length} equipos`);
  }
  
  console.log(`✅ ${leagueName}: ${teams.length} equipos subidos`);
}

async function main() {
  console.log('🔥 Subiendo datos a Firestore...');
  
  // LaLiga
  const laliga = JSON.parse(fs.readFileSync(path.join(dataDir, 'laliga.json'), 'utf8'));
  await uploadLeague('laliga', laliga, { name: 'La Liga EA Sports', country: 'España' });
  
  // LaLiga 2
  const laliga2 = JSON.parse(fs.readFileSync(path.join(dataDir, 'laliga2.json'), 'utf8'));
  await uploadLeague('laliga2', laliga2, { name: 'La Liga Hypermotion', country: 'España' });
  
  // Primera RFEF
  const primeraRfef = JSON.parse(fs.readFileSync(path.join(dataDir, 'primera-rfef.json'), 'utf8'));
  await uploadLeague('primera-rfef', primeraRfef.allTeams, { name: 'Primera Federación', country: 'España' });
  
  // Segunda RFEF
  const segundaRfef = JSON.parse(fs.readFileSync(path.join(dataDir, 'segunda-rfef.json'), 'utf8'));
  await uploadLeague('segunda-rfef', segundaRfef.allTeams, { name: 'Segunda Federación', country: 'España' });
  
  // Premier League
  const premier = JSON.parse(fs.readFileSync(path.join(dataDir, 'premier.json'), 'utf8'));
  await uploadLeague('premier', premier, { name: 'Premier League', country: 'Inglaterra' });
  
  // Serie A
  const seriea = JSON.parse(fs.readFileSync(path.join(dataDir, 'seriea.json'), 'utf8'));
  await uploadLeague('seriea', seriea, { name: 'Serie A', country: 'Italia' });
  
  // Bundesliga
  const bundesliga = JSON.parse(fs.readFileSync(path.join(dataDir, 'bundesliga.json'), 'utf8'));
  await uploadLeague('bundesliga', bundesliga, { name: 'Bundesliga', country: 'Alemania' });
  
  // Ligue 1
  const ligue1 = JSON.parse(fs.readFileSync(path.join(dataDir, 'ligue1.json'), 'utf8'));
  await uploadLeague('ligue1', ligue1, { name: 'Ligue 1', country: 'Francia' });
  
  // Metadata global
  await setDoc(doc(db, 'metadata', 'stats'), {
    version: '2025-26',
    source: 'Transfermarkt',
    lastUpdated: new Date().toISOString(),
    leagues: ['laliga', 'laliga2', 'primera-rfef', 'segunda-rfef', 'premier', 'seriea', 'bundesliga', 'ligue1']
  });
  
  console.log('\n✅ Todos los datos subidos a Firestore');
}

main().catch(console.error);
