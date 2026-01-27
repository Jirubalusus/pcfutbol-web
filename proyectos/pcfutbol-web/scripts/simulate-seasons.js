/**
 * PC FÚTBOL WEB - Simulador de Temporadas
 * Ejecutar con: node scripts/simulate-seasons.js
 * 
 * Simula 200 temporadas con equipos y años aleatorios
 * para detectar bugs y verificar el balance del juego.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBn6BDl0ixiJksOxmS15PDMHv9dHj2MWUQ",
  authDomain: "pcfutbol-web.firebaseapp.com",
  projectId: "pcfutbol-web",
  storageBucket: "pcfutbol-web.firebasestorage.app",
  messagingSenderId: "592178498498",
  appId: "1:592178498498:web:27d2ff5cd5a16bdc091d1c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============== LEAGUE ENGINE (copied) ==============
const FORMATIONS = {
  '4-3-3': { style: { attack: 1.1, defense: 0.95, midfield: 1.0 } },
  '4-4-2': { style: { attack: 1.0, defense: 1.0, midfield: 1.05 } },
  '4-2-3-1': { style: { attack: 1.05, defense: 1.05, midfield: 0.95 } },
};

const TACTICS = {
  balanced: { attack: 1.0, defense: 1.0 },
  attacking: { attack: 1.2, defense: 0.8 },
  defensive: { attack: 0.75, defense: 1.25 },
};

function calculateTeamStrength(team) {
  if (!team.players || team.players.length === 0) {
    return { overall: team.reputation || 50, attack: 50, midfield: 50, defense: 50, goalkeeper: 50 };
  }
  
  const players = team.players;
  const gk = players.filter(p => p.position === 'GK');
  const def = players.filter(p => ['CB', 'RB', 'LB'].includes(p.position));
  const mid = players.filter(p => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position));
  const att = players.filter(p => ['ST', 'RW', 'LW', 'CF'].includes(p.position));
  
  const avg = arr => arr.length > 0 ? arr.reduce((s, p) => s + p.overall, 0) / arr.length : 60;
  
  const goalkeeper = avg(gk);
  const defense = avg(def);
  const midfield = avg(mid);
  const attack = avg(att);
  
  const overall = (goalkeeper * 0.15 + defense * 0.25 + midfield * 0.3 + attack * 0.3);
  
  return { overall, attack, midfield, defense, goalkeeper };
}

function simulateMatch(homeTeam, awayTeam) {
  const homeStrength = calculateTeamStrength(homeTeam);
  const awayStrength = calculateTeamStrength(awayTeam);
  
  const homeAdvantage = 5;
  const homeRating = homeStrength.overall + homeAdvantage + (Math.random() * 10 - 5);
  const awayRating = awayStrength.overall + (Math.random() * 10 - 5);
  
  // Calcular goles basado en diferencia de fuerza
  const diff = (homeRating - awayRating) / 20;
  
  let homeGoals = Math.max(0, Math.round(1.3 + diff + (Math.random() * 2 - 1)));
  let awayGoals = Math.max(0, Math.round(1.3 - diff + (Math.random() * 2 - 1)));
  
  // Limitar goles extremos
  homeGoals = Math.min(7, homeGoals);
  awayGoals = Math.min(7, awayGoals);
  
  return { homeGoals, awayGoals, homeStrength, awayStrength };
}

function generateFixtures(teams) {
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const fixtures = [];
  
  const teamList = [...teamIds];
  if (n % 2 !== 0) teamList.push(null);
  
  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  // Primera vuelta
  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamList[match];
      const away = teamList[numTeams - 1 - match];
      
      if (home && away) {
        fixtures.push({ week: round + 1, homeTeam: home, awayTeam: away });
      }
    }
    
    const last = teamList.pop();
    teamList.splice(1, 0, last);
  }
  
  // Segunda vuelta (invertida)
  const firstHalfLength = fixtures.length;
  for (let i = 0; i < firstHalfLength; i++) {
    const f = fixtures[i];
    fixtures.push({ 
      week: numRounds + f.week, 
      homeTeam: f.awayTeam, 
      awayTeam: f.homeTeam 
    });
  }
  
  return fixtures;
}

function simulateSeason(teams, playerTeamId) {
  // Crear tabla
  const table = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    isPlayer: team.id === playerTeamId
  }));
  
  const fixtures = generateFixtures(teams);
  const teamsMap = new Map(teams.map(t => [t.id, t]));
  
  // Simular cada partido
  for (const fixture of fixtures) {
    const homeTeam = teamsMap.get(fixture.homeTeam);
    const awayTeam = teamsMap.get(fixture.awayTeam);
    
    if (!homeTeam || !awayTeam) continue;
    
    const result = simulateMatch(homeTeam, awayTeam);
    
    // Actualizar tabla
    const homeEntry = table.find(t => t.teamId === fixture.homeTeam);
    const awayEntry = table.find(t => t.teamId === fixture.awayTeam);
    
    if (homeEntry) {
      homeEntry.played++;
      homeEntry.goalsFor += result.homeGoals;
      homeEntry.goalsAgainst += result.awayGoals;
      homeEntry.goalDifference += result.homeGoals - result.awayGoals;
      
      if (result.homeGoals > result.awayGoals) {
        homeEntry.won++;
        homeEntry.points += 3;
      } else if (result.homeGoals === result.awayGoals) {
        homeEntry.drawn++;
        homeEntry.points += 1;
      } else {
        homeEntry.lost++;
      }
    }
    
    if (awayEntry) {
      awayEntry.played++;
      awayEntry.goalsFor += result.awayGoals;
      awayEntry.goalsAgainst += result.homeGoals;
      awayEntry.goalDifference += result.awayGoals - result.homeGoals;
      
      if (result.awayGoals > result.homeGoals) {
        awayEntry.won++;
        awayEntry.points += 3;
      } else if (result.homeGoals === result.awayGoals) {
        awayEntry.drawn++;
        awayEntry.points += 1;
      } else {
        awayEntry.lost++;
      }
    }
  }
  
  // Ordenar tabla
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  return { table, totalMatches: fixtures.length };
}

// ============== MAIN ==============
async function loadTeamsFromFirestore() {
  const allTeams = {};
  
  try {
    // Cargar TODOS los equipos de la colección 'teams'
    const teamsRef = collection(db, 'teams');
    const snapshot = await getDocs(teamsRef);
    
    console.log(`📊 Total documentos en 'teams': ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      const league = data.league || 'unknown';
      
      if (!allTeams[league]) {
        allTeams[league] = [];
      }
      allTeams[league].push(data);
    });
    
    // Mostrar equipos por liga
    for (const [league, teams] of Object.entries(allTeams)) {
      console.log(`✅ ${league}: ${teams.length} equipos`);
    }
    
  } catch (error) {
    console.error(`❌ Error cargando equipos:`, error.message);
  }
  
  return allTeams;
}

async function main() {
  console.log('🎮 PC FÚTBOL WEB - Simulador de Temporadas');
  console.log('==========================================\n');
  
  // Cargar equipos
  console.log('📦 Cargando equipos desde Firebase...\n');
  const allTeams = await loadTeamsFromFirestore();
  
  // Obtener ligas con equipos
  const availableLeagues = Object.entries(allTeams)
    .filter(([, teams]) => teams.length >= 2)
    .map(([league, teams]) => ({ league, teams }));
  
  if (availableLeagues.length === 0) {
    console.error('❌ No hay ligas con equipos disponibles');
    process.exit(1);
  }
  
  console.log(`\n📊 Ligas disponibles: ${availableLeagues.length}`);
  availableLeagues.forEach(l => console.log(`   - ${l.league}: ${l.teams.length} equipos`));
  
  // Estadísticas
  const stats = {
    totalSeasons: 0,
    totalMatches: 0,
    championsCount: {},
    relegatedCount: {},
    errors: [],
    warnings: [],
    leagueStats: {}
  };
  
  const TOTAL_SIMULATIONS = 200;
  console.log(`\n🚀 Simulando ${TOTAL_SIMULATIONS} temporadas...\n`);
  
  for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
    // Elegir liga aleatoria
    const randomLeague = availableLeagues[Math.floor(Math.random() * availableLeagues.length)];
    const teams = randomLeague.teams;
    
    if (teams.length < 2) {
      stats.warnings.push(`Liga ${randomLeague.league} tiene menos de 2 equipos`);
      continue;
    }
    
    // Elegir equipo aleatorio como "jugador"
    const playerTeam = teams[Math.floor(Math.random() * teams.length)];
    
    try {
      const result = simulateSeason(teams, playerTeam.id);
      
      stats.totalSeasons++;
      stats.totalMatches += result.totalMatches;
      
      // Registrar estadísticas de liga
      if (!stats.leagueStats[randomLeague.league]) {
        stats.leagueStats[randomLeague.league] = { seasons: 0, avgGoals: 0 };
      }
      stats.leagueStats[randomLeague.league].seasons++;
      
      // Campeón
      const champion = result.table[0];
      stats.championsCount[champion.teamName] = (stats.championsCount[champion.teamName] || 0) + 1;
      
      // Verificar anomalías
      const totalGoals = result.table.reduce((sum, t) => sum + t.goalsFor, 0);
      const avgGoalsPerMatch = totalGoals / result.totalMatches;
      
      if (avgGoalsPerMatch < 1.5) {
        stats.warnings.push(`Temporada ${i+1}: Pocos goles (${avgGoalsPerMatch.toFixed(2)} por partido)`);
      }
      if (avgGoalsPerMatch > 4.5) {
        stats.warnings.push(`Temporada ${i+1}: Muchos goles (${avgGoalsPerMatch.toFixed(2)} por partido)`);
      }
      
      // Verificar puntos del campeón
      if (champion.points > teams.length * 6 * 0.95) {
        stats.warnings.push(`Temporada ${i+1}: Campeón invencible (${champion.teamName}: ${champion.points} pts)`);
      }
      
      // Progreso
      if ((i + 1) % 20 === 0) {
        console.log(`   Progreso: ${i + 1}/${TOTAL_SIMULATIONS} temporadas simuladas`);
      }
      
    } catch (error) {
      stats.errors.push(`Temporada ${i+1}: ${error.message}`);
    }
  }
  
  // Reporte final
  console.log('\n==========================================');
  console.log('📊 REPORTE FINAL');
  console.log('==========================================\n');
  
  console.log(`✅ Temporadas simuladas: ${stats.totalSeasons}`);
  console.log(`⚽ Partidos totales: ${stats.totalMatches}`);
  console.log(`⚠️ Warnings: ${stats.warnings.length}`);
  console.log(`❌ Errores: ${stats.errors.length}`);
  
  console.log('\n🏆 Top 10 Campeones:');
  const topChampions = Object.entries(stats.championsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  topChampions.forEach(([team, count], idx) => {
    console.log(`   ${idx + 1}. ${team}: ${count} títulos`);
  });
  
  console.log('\n📈 Estadísticas por Liga:');
  Object.entries(stats.leagueStats).forEach(([league, data]) => {
    console.log(`   - ${league}: ${data.seasons} temporadas simuladas`);
  });
  
  if (stats.warnings.length > 0) {
    console.log('\n⚠️ Warnings (primeros 10):');
    stats.warnings.slice(0, 10).forEach(w => console.log(`   - ${w}`));
  }
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errores:');
    stats.errors.forEach(e => console.log(`   - ${e}`));
  }
  
  console.log('\n==========================================');
  console.log('✅ Simulación completada');
  console.log('==========================================');
  
  process.exit(0);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
