// Test 100 temporadas con MÚLTIPLES equipos de Segunda RFEF
// Análisis comparativo de progresión de equipos pequeños

import { initializeLeague, simulateMatch, updateTable, getWeekFixtures, calculateTeamStrength } from './src/game/leagueEngine.js';
import { calculateSeasonOutcome, prepareNewSeason, simulatePlayoff } from './src/game/seasonEngine.js';

const formatMoney = (n) => {
  if (n >= 1e6) return `€${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `€${(n/1e3).toFixed(0)}K`;
  return `€${n}`;
};

console.log('⚽ TEST MASIVO - 100 TEMPORADAS x 5 EQUIPOS DE 2ª RFEF');
console.log('═'.repeat(70));

// ============== CREAR EQUIPOS HISTÓRICOS DE 2ª RFEF ==============
const createTestTeams = () => [
  {
    id: 'recreativo',
    name: 'Recreativo de Huelva',
    shortName: 'Recreativo',
    budget: 800000,
    reputation: 55,
    history: 'Decano del fútbol español, caído en desgracia'
  },
  {
    id: 'xerez',
    name: 'Xerez CD',
    shortName: 'Xerez',
    budget: 600000,
    reputation: 50,
    history: 'Ex-Primera División, ahora en el pozo'
  },
  {
    id: 'cordoba',
    name: 'Córdoba CF',
    shortName: 'Córdoba',
    budget: 900000,
    reputation: 58,
    history: 'Histórico andaluz buscando resurgir'
  },
  {
    id: 'hercules',
    name: 'Hércules CF',
    shortName: 'Hércules',
    budget: 750000,
    reputation: 52,
    history: 'Mítico club alicantino en horas bajas'
  },
  {
    id: 'merida',
    name: 'AD Mérida',
    shortName: 'Mérida',
    budget: 500000,
    reputation: 45,
    history: 'Club modesto con ambición'
  }
];

// Generar plantilla para un equipo
const generateSquad = (avgOverall, budget) => {
  const positions = ['GK', 'GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'ST', 'CM', 'CB', 'ST'];
  return positions.map((pos, i) => ({
    name: `Jugador ${i+1}`,
    position: pos,
    overall: avgOverall + Math.floor(Math.random() * 8) - 4,
    age: 19 + Math.floor(Math.random() * 14),
    value: 50000 + Math.floor(Math.random() * (budget * 0.1)),
    salary: 8000 + Math.floor(Math.random() * 20000)
  }));
};

// Crear rivales genéricos para cada liga
const createLeagueRivals = (numTeams, avgOverall, avgBudget) => {
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    const overall = avgOverall + Math.floor(Math.random() * 6) - 3;
    const budget = avgBudget + Math.floor(Math.random() * avgBudget * 0.4) - avgBudget * 0.2;
    teams.push({
      id: `rival_${i}`,
      name: `Rival ${i+1}`,
      shortName: `RIV${i+1}`,
      budget,
      reputation: 40 + Math.floor(Math.random() * 20),
      players: generateSquad(overall, budget)
    });
  }
  return teams;
};

const leagueConfig = {
  segundaRFEF: { teams: 18, avgOverall: 64, avgBudget: 500000 },
  primeraRFEF: { teams: 20, avgOverall: 69, avgBudget: 1200000 },
  segunda: { teams: 22, avgOverall: 73, avgBudget: 4000000 },
  laliga: { teams: 20, avgOverall: 78, avgBudget: 30000000 }
};

const leagueNames = { 'segundaRFEF': '2ª RFEF', 'primeraRFEF': '1ª RFEF', 'segunda': 'Segunda', 'laliga': 'LaLiga' };
const leagueRank = { 'segundaRFEF': 4, 'primeraRFEF': 3, 'segunda': 2, 'laliga': 1 };

// ============== SIMULACIÓN ==============
const testTeams = createTestTeams();
const results = {};

// Inicializar cada equipo
testTeams.forEach(team => {
  const avgOverall = 64 + (team.reputation - 45) * 0.3;
  team.players = generateSquad(avgOverall, team.budget);
  team.currentLeague = 'segundaRFEF';
  team.playoffExperience = 0;
  team.seasonsInCurrentLeague = 1;
  
  results[team.id] = {
    name: team.shortName,
    initialBudget: team.budget,
    initialRep: team.reputation,
    seasons: [],
    leagueHistory: [],
    budgetHistory: [team.budget],
    overallHistory: [],
    promotions: 0,
    relegations: 0,
    playoffWins: 0,
    playoffLosses: 0,
    titles: { segundaRFEF: 0, primeraRFEF: 0, segunda: 0, laliga: 0 },
    highestLeague: 'segundaRFEF',
    laligaSeasons: 0,
    segundaSeasons: 0
  };
});

console.log('\n📊 Equipos iniciales:');
testTeams.forEach(t => {
  const avg = (t.players.reduce((s,p) => s + p.overall, 0) / t.players.length).toFixed(1);
  console.log(`   ${t.shortName.padEnd(12)} | ${formatMoney(t.budget).padStart(7)} | Rep ${t.reputation} | Media ${avg}`);
});

console.log('\n⏳ Simulando 100 temporadas...\n');
const startTime = Date.now();

for (let season = 1; season <= 100; season++) {
  // Agrupar equipos por liga
  const teamsByLeague = {};
  testTeams.forEach(team => {
    if (!teamsByLeague[team.currentLeague]) teamsByLeague[team.currentLeague] = [];
    teamsByLeague[team.currentLeague].push(team);
  });
  
  // Simular cada liga donde hay equipos de prueba
  for (const [leagueId, myTeams] of Object.entries(teamsByLeague)) {
    const config = leagueConfig[leagueId];
    
    // Crear rivales para completar la liga
    const rivals = createLeagueRivals(config.teams - myTeams.length, config.avgOverall, config.avgBudget);
    const allTeams = [...myTeams, ...rivals];
    
    const totalWeeks = (allTeams.length - 1) * 2;
    const { table, fixtures } = initializeLeague(allTeams, null);
    let tbl = table;
    let fix = fixtures;
    
    // Simular temporada
    for (let week = 1; week <= totalWeeks; week++) {
      for (const f of getWeekFixtures(fix, week)) {
        if (f.played) continue;
        
        const homeTeam = allTeams.find(t => t.id === f.homeTeam);
        const awayTeam = allTeams.find(t => t.id === f.awayTeam);
        if (!homeTeam || !awayTeam) continue;
        
        const result = simulateMatch(f.homeTeam, f.awayTeam, homeTeam, awayTeam, {
          homeMorale: 70, awayMorale: 70
        });
        
        tbl = updateTable(tbl, f.homeTeam, f.awayTeam, result.homeScore, result.awayScore);
        const idx = fix.findIndex(x => x.id === f.id);
        if (idx >= 0) fix[idx] = { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
      }
    }
    
    // Procesar resultados de cada equipo de prueba
    for (const team of myTeams) {
      const position = tbl.findIndex(t => t.teamId === team.id) + 1;
      const entry = tbl.find(t => t.teamId === team.id);
      const outcome = calculateSeasonOutcome(position, leagueId, allTeams.length);
      const avgOverall = team.players.reduce((s,p) => s + p.overall, 0) / team.players.length;
      
      const r = results[team.id];
      r.seasons.push({ season, league: leagueId, position, points: entry?.points || 0 });
      r.leagueHistory.push(leagueId);
      r.overallHistory.push(avgOverall);
      
      // Tracking por liga
      if (leagueId === 'laliga') r.laligaSeasons++;
      if (leagueId === 'segunda') r.segundaSeasons++;
      
      // Procesar outcome
      let newLeague = leagueId;
      
      if (outcome.promotion) {
        r.promotions++;
        newLeague = outcome.newLeagueId;
        if (leagueRank[newLeague] < leagueRank[r.highestLeague]) {
          r.highestLeague = newLeague;
        }
      } else if (outcome.playoff) {
        const playoffResult = simulatePlayoff(position, avgOverall, team.playoffExperience);
        if (playoffResult.won) {
          r.playoffWins++;
          r.promotions++;
          team.playoffExperience = 0;
          if (leagueId === 'segundaRFEF') newLeague = 'primeraRFEF';
          else if (leagueId === 'primeraRFEF') newLeague = 'segunda';
          else if (leagueId === 'segunda') newLeague = 'laliga';
          if (leagueRank[newLeague] < leagueRank[r.highestLeague]) {
            r.highestLeague = newLeague;
          }
        } else {
          r.playoffLosses++;
          team.playoffExperience++;
        }
      } else if (outcome.relegation) {
        r.relegations++;
        newLeague = outcome.newLeagueId;
      }
      
      if (position === 1) {
        r.titles[leagueId]++;
      }
      
      // Preparar nueva temporada
      team.seasonsInCurrentLeague = newLeague === leagueId ? (team.seasonsInCurrentLeague || 1) + 1 : 1;
      const prepared = prepareNewSeason(team, outcome);
      Object.assign(team, prepared);
      team.id = team.id; // Mantener ID
      team.currentLeague = newLeague;
      
      // Mercado de fichajes mejorado
      const budgetForTransfers = team.budget * 0.4;
      const targetOverall = newLeague === 'laliga' ? 76 : 
                            newLeague === 'segunda' ? 72 :
                            newLeague === 'primeraRFEF' ? 68 : 65;
      
      const numSignings = Math.min(3, Math.floor(budgetForTransfers / 200000));
      
      for (let i = 0; i < numSignings; i++) {
        const ovr = targetOverall + Math.floor(Math.random() * 5);
        const cost = 100000 + (ovr - 60) * 20000;
        if (cost <= budgetForTransfers * 0.5) {
          const positions = ['CB', 'CM', 'ST', 'RW', 'LW', 'CDM'];
          team.players.push({
            name: `Fichaje S${season}`,
            position: positions[Math.floor(Math.random() * positions.length)],
            overall: ovr,
            age: 20 + Math.floor(Math.random() * 8),
            value: cost,
            salary: cost * 0.001
          });
          team.budget -= cost;
        }
      }
      
      // Limpiar plantilla
      if (team.players.length > 22) {
        team.players = team.players
          .sort((a, b) => (b.overall - (b.age > 30 ? (b.age - 30) * 2 : 0)) - (a.overall - (a.age > 30 ? (a.age - 30) * 2 : 0)))
          .slice(0, 20);
      }
      
      // Ajustar presupuesto
      const leagueBudgetBase = { laliga: 25000000, segunda: 5000000, primeraRFEF: 1500000, segundaRFEF: 800000 };
      const targetBudget = leagueBudgetBase[newLeague];
      team.budget = Math.round(team.budget * 0.6 + targetBudget * 0.4);
      if (position <= 6 && !outcome.promotion && !outcome.relegation) {
        team.budget = Math.round(team.budget * 1.08);
      }
      
      r.budgetHistory.push(team.budget);
      
      // Ajustar reputación
      if (outcome.promotion || position <= 3) {
        team.reputation = Math.min(99, team.reputation + 2);
      } else if (outcome.relegation || position >= allTeams.length - 2) {
        team.reputation = Math.max(30, team.reputation - 2);
      }
    }
  }
  
  // Progress cada 25 temporadas
  if (season % 25 === 0) {
    console.log(`   T${season}: ` + testTeams.map(t => `${t.shortName.substring(0,4)}=${leagueNames[t.currentLeague]}`).join(' | '));
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

// ============== RESULTADOS ==============
console.log('\n' + '═'.repeat(70));
console.log('📊 RESULTADOS - 100 TEMPORADAS');
console.log('═'.repeat(70));
console.log(`⏱️ Tiempo: ${elapsed}s`);

// Tabla resumen
console.log('\n📋 RESUMEN POR EQUIPO:');
console.log('─'.repeat(90));
console.log('Equipo       | Liga Max  | LaLiga | Segunda | Asc | Desc | PO W/L | Budget Final | Δ Budget');
console.log('─'.repeat(90));

const sortedResults = Object.values(results).sort((a, b) => 
  leagueRank[a.highestLeague] - leagueRank[b.highestLeague] || b.laligaSeasons - a.laligaSeasons
);

sortedResults.forEach(r => {
  const budgetChange = ((r.budgetHistory[r.budgetHistory.length - 1] / r.initialBudget - 1) * 100).toFixed(0);
  const budgetSign = budgetChange >= 0 ? '+' : '';
  console.log(
    `${r.name.padEnd(12)} | ${leagueNames[r.highestLeague].padEnd(9)} | ${String(r.laligaSeasons).padStart(6)} | ${String(r.segundaSeasons).padStart(7)} | ` +
    `${String(r.promotions).padStart(3)} | ${String(r.relegations).padStart(4)} | ${r.playoffWins}/${r.playoffWins + r.playoffLosses}`.padEnd(7) + ` | ` +
    `${formatMoney(r.budgetHistory[r.budgetHistory.length - 1]).padStart(12)} | ${budgetSign}${budgetChange}%`
  );
});

// Títulos
console.log('\n🏆 TÍTULOS POR LIGA:');
sortedResults.forEach(r => {
  const titles = Object.entries(r.titles).filter(([k, v]) => v > 0).map(([k, v]) => `${leagueNames[k]}: ${v}`);
  if (titles.length > 0) {
    console.log(`   ${r.name}: ${titles.join(', ')}`);
  }
});

// Gráfico de evolución
console.log('\n📈 EVOLUCIÓN DE CATEGORÍA (cada █ = 5 temporadas):');
const leagueToSymbol = { laliga: '█', segunda: '▓', primeraRFEF: '▒', segundaRFEF: '░' };

sortedResults.forEach(r => {
  let line = `${r.name.substring(0, 8).padEnd(8)}: `;
  for (let i = 0; i < 100; i += 5) {
    // Tomar la liga más alta en ese rango de 5 temporadas
    const chunk = r.leagueHistory.slice(i, i + 5);
    const best = chunk.reduce((best, l) => leagueRank[l] < leagueRank[best] ? l : best, 'segundaRFEF');
    line += leagueToSymbol[best];
  }
  console.log(line);
});
console.log('          ░=2ªRFEF ▒=1ªRFEF ▓=Segunda █=LaLiga');

// Análisis
console.log('\n🔍 ANÁLISIS:');

const reachedLaLiga = sortedResults.filter(r => r.highestLeague === 'laliga');
const reachedSegunda = sortedResults.filter(r => r.highestLeague === 'segunda' || r.highestLeague === 'laliga');
const stuckIn2RFEF = sortedResults.filter(r => r.highestLeague === 'segundaRFEF');

console.log(`   Llegaron a LaLiga: ${reachedLaLiga.length}/5 (${reachedLaLiga.map(r => r.name).join(', ') || 'ninguno'})`);
console.log(`   Llegaron a Segunda: ${reachedSegunda.length}/5`);
console.log(`   Atrapados en 2ªRFEF: ${stuckIn2RFEF.length}/5`);

const avgPromotions = sortedResults.reduce((s, r) => s + r.promotions, 0) / 5;
const avgRelegations = sortedResults.reduce((s, r) => s + r.relegations, 0) / 5;
const avgPlayoffWinRate = sortedResults.reduce((s, r) => s + (r.playoffWins / Math.max(1, r.playoffWins + r.playoffLosses)), 0) / 5;

console.log(`   Media ascensos: ${avgPromotions.toFixed(1)}`);
console.log(`   Media descensos: ${avgRelegations.toFixed(1)}`);
console.log(`   Win rate playoffs: ${(avgPlayoffWinRate * 100).toFixed(0)}%`);

const avgBudgetGrowth = sortedResults.reduce((s, r) => s + (r.budgetHistory[99] / r.initialBudget - 1), 0) / 5 * 100;
console.log(`   Crecimiento presupuesto medio: ${avgBudgetGrowth >= 0 ? '+' : ''}${avgBudgetGrowth.toFixed(0)}%`);

// Recomendaciones
console.log('\n💡 CONCLUSIONES:');
if (reachedLaLiga.length === 0) {
  console.log('   ⚠️ Ningún equipo llegó a LaLiga en 100 años - sistema muy duro');
} else if (reachedLaLiga.length >= 3) {
  console.log('   ✅ Sistema permite movilidad - varios equipos alcanzaron la élite');
}

if (avgBudgetGrowth < 50) {
  console.log('   ⚠️ Crecimiento económico bajo - dificulta inversión en plantilla');
} else {
  console.log('   ✅ Crecimiento económico saludable');
}

if (avgPlayoffWinRate < 0.35) {
  console.log('   ⚠️ Playoffs muy difíciles - considerar aumentar probabilidades');
} else if (avgPlayoffWinRate > 0.55) {
  console.log('   ⚠️ Playoffs muy fáciles - considerar reducir probabilidades');
} else {
  console.log('   ✅ Balance de playoffs correcto');
}

const yoyoTeams = sortedResults.filter(r => r.promotions >= 8 && r.relegations >= 8);
if (yoyoTeams.length >= 3) {
  console.log('   ⚠️ Efecto yo-yo excesivo - equipos suben y bajan constantemente');
}

console.log('\n✅ Simulación completada');
