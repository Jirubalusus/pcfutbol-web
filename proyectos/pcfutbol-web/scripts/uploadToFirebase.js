// Script para subir datos a Firebase
// Ejecutar con: node scripts/uploadToFirebase.js

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";

import {
  LEAGUES,
  LALIGA_TEAMS,
  SEGUNDA_TEAMS,
  PRIMERA_RFEF_TEAMS,
  SEGUNDA_RFEF_TEAMS,
  PREMIER_LEAGUE_TEAMS,
  LIGUE1_TEAMS,
  BUNDESLIGA_TEAMS,
  SERIE_A_TEAMS,
  EREDIVISIE_TEAMS,
  PRIMEIRA_LIGA_TEAMS
} from "../src/data/teams.js";

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

// Mapeo de ligas a sus equipos
const leagueTeamsMap = {
  laliga: LALIGA_TEAMS,
  segunda: SEGUNDA_TEAMS,
  primeraRFEF: PRIMERA_RFEF_TEAMS,
  segundaRFEF: SEGUNDA_RFEF_TEAMS,
  premierLeague: PREMIER_LEAGUE_TEAMS,
  ligue1: LIGUE1_TEAMS,
  bundesliga: BUNDESLIGA_TEAMS,
  serieA: SERIE_A_TEAMS,
  eredivisie: EREDIVISIE_TEAMS,
  primeiraLiga: PRIMEIRA_LIGA_TEAMS
};

async function uploadLeagues() {
  console.log("📋 Subiendo ligas...");
  
  for (const [leagueId, leagueData] of Object.entries(LEAGUES)) {
    await setDoc(doc(db, "leagues", leagueId), leagueData);
    console.log(`  ✓ Liga: ${leagueData.name}`);
  }
  
  console.log("✅ Ligas subidas!\n");
}

async function uploadTeams() {
  console.log("⚽ Subiendo equipos...");
  
  let totalTeams = 0;
  
  for (const [leagueId, teams] of Object.entries(leagueTeamsMap)) {
    if (!teams || teams.length === 0) continue;
    
    console.log(`\n  📁 ${LEAGUES[leagueId]?.name || leagueId} (${teams.length} equipos)`);
    
    // Usar batches para subir más rápido (máximo 500 operaciones por batch)
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const team of teams) {
      const teamData = {
        ...team,
        leagueId: leagueId,
        createdAt: new Date().toISOString()
      };
      
      const teamRef = doc(db, "teams", team.id);
      batch.set(teamRef, teamData);
      operationCount++;
      totalTeams++;
      
      // Firestore tiene límite de 500 operaciones por batch
      if (operationCount >= 450) {
        await batch.commit();
        console.log(`    → Batch de ${operationCount} equipos subido`);
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
    
    // Subir el último batch si tiene operaciones pendientes
    if (operationCount > 0) {
      await batch.commit();
      console.log(`    → ${operationCount} equipos subidos`);
    }
  }
  
  console.log(`\n✅ Total: ${totalTeams} equipos subidos!\n`);
}

async function uploadPlayers() {
  console.log("👤 Subiendo jugadores...");
  
  let totalPlayers = 0;
  
  for (const [leagueId, teams] of Object.entries(leagueTeamsMap)) {
    if (!teams || teams.length === 0) continue;
    
    console.log(`\n  📁 ${LEAGUES[leagueId]?.name || leagueId}`);
    
    for (const team of teams) {
      if (!team.players || team.players.length === 0) continue;
      
      let batch = writeBatch(db);
      let operationCount = 0;
      
      for (let i = 0; i < team.players.length; i++) {
        const player = team.players[i];
        const playerId = `${team.id}_${i}`;
        
        const playerData = {
          ...player,
          id: playerId,
          teamId: team.id,
          leagueId: leagueId,
          createdAt: new Date().toISOString()
        };
        
        const playerRef = doc(db, "players", playerId);
        batch.set(playerRef, playerData);
        operationCount++;
        totalPlayers++;
        
        if (operationCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
      
      if (operationCount > 0) {
        await batch.commit();
      }
    }
    
    console.log(`    ✓ Jugadores de ${LEAGUES[leagueId]?.name || leagueId} subidos`);
  }
  
  console.log(`\n✅ Total: ${totalPlayers} jugadores subidos!\n`);
}

async function main() {
  console.log("🚀 Iniciando subida a Firebase...\n");
  console.log("━".repeat(50));
  
  try {
    await uploadLeagues();
    await uploadTeams();
    await uploadPlayers();
    
    console.log("━".repeat(50));
    console.log("🎉 ¡Todo subido correctamente a Firebase!");
    console.log("━".repeat(50));
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
