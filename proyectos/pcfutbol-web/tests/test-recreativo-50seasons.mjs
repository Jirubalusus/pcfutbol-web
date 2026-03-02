// Test 50 temporadas con el Recreativo de Huelva (Segunda RFEF)
// Análisis de finanzas, fichajes, ascensos y descensos para equipos pequeños

import { initializeLeague, simulateMatch, updateTable, getWeekFixtures, calculateTeamStrength } from './src/game/leagueEngine.js';
import { calculateSeasonOutcome, prepareNewSeason, simulatePlayoff } from './src/game/seasonEngine.js';

const formatMoney = (n) => {
  if (n >= 1e6) return `€${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `€${(n/1e3).toFixed(0)}K`;
  return `€${n}`;
};

console.log('🏟️ RECREATIVO DE HUELVA - SIMULACIÓN 50 TEMPORADAS');
console.log('═'.repeat(70));
console.log('Empezando en Segunda RFEF - ¿Llegará a LaLiga?\n');

// ============== CREAR EQUIPO RECREATIVO ==============
const createRecreativo = () => ({
  id: 'recreativo',
  name: 'Real Club Recreativo de Huelva',
  shortName: 'Recreativo',
  budget: 800000,        // 800K - presupuesto pequeño
  reputation: 55,        // Histórico pero caído
  stadiumCapacity: 21670, // Nuevo Colombino
  fanBase: 45000,
  colors: { primary: '#FFFFFF', secondary: '#0000FF' },
  players: [
    // Porteros
    { name: 'Marc Martínez', position: 'GK', overall: 68, age: 28, value: 200000, salary: 25000 },
    { name: 'Rubén Gálvez', position: 'GK', overall: 64, age: 22, value: 100000, salary: 15000 },
    // Defensas
    { name: 'Manu Galán', position: 'CB', overall: 69, age: 27, value: 250000, salary: 28000 },
    { name: 'Diego Jiménez', position: 'CB', overall: 67, age: 25, value: 200000, salary: 22000 },
    { name: 'Chico Díaz', position: 'CB', overall: 65, age: 30, value: 150000, salary: 20000 },
    { name: 'Cancelo', position: 'RB', overall: 66, age: 26, value: 180000, salary: 22000 },
    { name: 'Antoñito', position: 'LB', overall: 67, age: 24, value: 200000, salary: 23000 },
    // Centrocampistas
    { name: 'Sergio Jiménez', position: 'CDM', overall: 68, age: 29, value: 220000, salary: 26000 },
    { name: 'Alberto Quiles', position: 'CM', overall: 70, age: 27, value: 300000, salary: 32000 },
    { name: 'Nano', position: 'CM', overall: 66, age: 25, value: 180000, salary: 21000 },
    { name: 'Iago Díaz', position: 'CAM', overall: 69, age: 26, value: 250000, salary: 28000 },
    // Extremos
    { name: 'Chuli', position: 'RW', overall: 71, age: 28, value: 350000, salary: 35000 },
    { name: 'Rubén Cruz', position: 'LW', overall: 68, age: 24, value: 220000, salary: 24000 },
    // Delanteros  
    { name: 'Adrián Areces', position: 'ST', overall: 70, age: 26, value: 320000, salary: 33000 },
    { name: 'Paco Peña', position: 'ST', overall: 66, age: 23, value: 180000, salary: 20000 },
    // Suplentes
    { name: 'Carlos García', position: 'CM', overall: 63, age: 21, value: 80000, salary: 12000 },
    { name: 'José Manuel', position: 'CB', overall: 62, age: 20, value: 70000, salary: 10000 },
    { name: 'Miguelito', position: 'RW', overall: 61, age: 19, value: 60000, salary: 8000 }
  ]
});

// ============== CREAR RIVALES DE SEGUNDA RFEF ==============
const createSegundaRFEFTeams = (myTeam) => {
  const teamTemplates = [
    { name: 'Atlético Sanluqueño', rep: 50, budget: 600000, overall: 66 },
    { name: 'Xerez CD', rep: 52, budget: 650000, overall: 67 },
    { name: 'Cádiz B', rep: 48, budget: 500000, overall: 65 },
    { name: 'Sevilla C', rep: 45, budget: 450000, overall: 64 },
    { name: 'Betis Deportivo', rep: 47, budget: 480000, overall: 65 },
    { name: 'Córdoba B', rep: 46, budget: 400000, overall: 63 },
    { name: 'Marbella FC', rep: 51, budget: 550000, overall: 66 },
    { name: 'Balompédica Linense', rep: 49, budget: 500000, overall: 65 },
    { name: 'Antequera CF', rep: 44, budget: 350000, overall: 62 },
    { name: 'Ciudad de Lucena', rep: 43, budget: 320000, overall: 61 },
    { name: 'Juventud Torremolinos', rep: 42, budget: 300000, overall: 60 },
    { name: 'CD El Ejido', rep: 45, budget: 380000, overall: 63 },
    { name: 'Xerez Deportivo', rep: 50, budget: 520000, overall: 65 },
    { name: 'Villanovense', rep: 46, budget: 400000, overall: 63 },
    { name: 'Don Benito', rep: 44, budget: 350000, overall: 62 },
    { name: 'Cacereño', rep: 48, budget: 450000, overall: 64 },
    { name: 'Montijo', rep: 41, budget: 280000, overall: 59 },
    { name: 'La Palma CF', rep: 40, budget: 250000, overall: 58 }
  ];
  
  const teams = [myTeam];
  
  teamTemplates.forEach((t, i) => {
    const players = generateSquad(t.overall);
    teams.push({
      id: `team_${i}`,
      name: t.name,
      shortName: t.name.split(' ').pop(),
      budget: t.budget,
      reputation: t.rep,
      stadiumCapacity: 3000 + Math.floor(Math.random() * 5000),
      fanBase: 5000 + Math.floor(Math.random() * 15000),
      players
    });
  });
  
  return teams;
};

// Generar plantilla genérica
const generateSquad = (avgOverall) => {
  const positions = ['GK', 'GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'ST', 'CM', 'CB'];
  return positions.map((pos, i) => ({
    name: `Jugador ${pos}${i}`,
    position: pos,
    overall: avgOverall + Math.floor(Math.random() * 8) - 4,
    age: 20 + Math.floor(Math.random() * 12),
    value: 50000 + Math.floor(Math.random() * 150000),
    salary: 8000 + Math.floor(Math.random() * 15000)
  }));
};

// ============== CREAR LIGAS SUPERIORES ==============
const createPrimeraRFEFTeams = () => {
  const teams = [];
  for (let i = 0; i < 20; i++) {
    const overall = 68 + Math.floor(Math.random() * 6);
    teams.push({
      id: `prfef_${i}`,
      name: `Equipo 1RFEF ${i+1}`,
      shortName: `1RFEF${i+1}`,
      budget: 1000000 + Math.floor(Math.random() * 1500000),
      reputation: 55 + Math.floor(Math.random() * 10),
      stadiumCapacity: 5000 + Math.floor(Math.random() * 10000),
      fanBase: 15000 + Math.floor(Math.random() * 30000),
      players: generateSquad(overall)
    });
  }
  return teams;
};

const createSegundaTeams = () => {
  const teams = [];
  for (let i = 0; i < 22; i++) {
    const overall = 72 + Math.floor(Math.random() * 6);
    teams.push({
      id: `segunda_${i}`,
      name: `Equipo Segunda ${i+1}`,
      shortName: `SEG${i+1}`,
      budget: 3000000 + Math.floor(Math.random() * 5000000),
      reputation: 62 + Math.floor(Math.random() * 12),
      stadiumCapacity: 10000 + Math.floor(Math.random() * 20000),
      fanBase: 30000 + Math.floor(Math.random() * 50000),
      players: generateSquad(overall)
    });
  }
  return teams;
};

const createLaLigaTeams = () => {
  const teams = [];
  const bigTeams = ['Real Madrid', 'Barcelona', 'Atlético', 'Sevilla', 'Valencia'];
  for (let i = 0; i < 20; i++) {
    const isBig = i < 5;
    const overall = isBig ? 82 + Math.floor(Math.random() * 6) : 74 + Math.floor(Math.random() * 6);
    teams.push({
      id: `laliga_${i}`,
      name: isBig ? bigTeams[i] : `Equipo LaLiga ${i+1}`,
      shortName: isBig ? bigTeams[i].substring(0, 8) : `LAL${i+1}`,
      budget: isBig ? 100000000 + Math.floor(Math.random() * 200000000) : 15000000 + Math.floor(Math.random() * 30000000),
      reputation: isBig ? 90 + Math.floor(Math.random() * 10) : 70 + Math.floor(Math.random() * 10),
      stadiumCapacity: isBig ? 60000 + Math.floor(Math.random() * 30000) : 20000 + Math.floor(Math.random() * 25000),
      fanBase: isBig ? 500000 + Math.floor(Math.random() * 500000) : 50000 + Math.floor(Math.random() * 100000),
      players: generateSquad(overall)
    });
  }
  return teams;
};

// ============== SIMULACIÓN PRINCIPAL ==============
const recreativo = createRecreativo();
let currentLeague = 'segundaRFEF';
let currentTeam = JSON.parse(JSON.stringify(recreativo));

// Estadísticas
const history = {
  seasons: [],
  leagueHistory: [],
  budgetHistory: [currentTeam.budget],
  reputationHistory: [currentTeam.reputation],
  promotions: 0,
  relegations: 0,
  playoffWins: 0,
  playoffLosses: 0,
  titles: 0,
  highestLeague: 'segundaRFEF',
  lowestPosition: 1,
  bestBudget: currentTeam.budget,
  peakOverall: 0
};

const leagueRank = { 'segundaRFEF': 4, 'primeraRFEF': 3, 'segunda': 2, 'laliga': 1 };
const leagueNames = { 'segundaRFEF': '2ª RFEF', 'primeraRFEF': '1ª RFEF', 'segunda': 'Segunda', 'laliga': 'LaLiga' };

// Almacenar ligas (se regeneran cuando el equipo cambia de categoría)
let leagueTeams = {
  segundaRFEF: createSegundaRFEFTeams(currentTeam),
  primeraRFEF: createPrimeraRFEFTeams(),
  segunda: createSegundaTeams(),
  laliga: createLaLigaTeams()
};

console.log(`📊 Estado inicial:`);
console.log(`   Liga: ${leagueNames[currentLeague]}`);
console.log(`   Presupuesto: ${formatMoney(currentTeam.budget)}`);
console.log(`   Reputación: ${currentTeam.reputation}`);
console.log(`   Media plantilla: ${(currentTeam.players.reduce((s,p) => s + p.overall, 0) / currentTeam.players.length).toFixed(1)}`);
console.log('');

const startTime = Date.now();

for (let season = 1; season <= 50; season++) {
  // Obtener equipos de la liga actual
  let teams = leagueTeams[currentLeague];
  
  // Asegurar que nuestro equipo está en la liga
  const myIdx = teams.findIndex(t => t.id === 'recreativo');
  if (myIdx >= 0) {
    teams[myIdx] = currentTeam;
  } else {
    teams[0] = currentTeam;
  }
  
  const totalTeams = teams.length;
  const totalWeeks = (totalTeams - 1) * 2;
  
  // Inicializar liga
  const { table, fixtures } = initializeLeague(teams, null);
  let tbl = table;
  let fix = fixtures;
  
  // Simular todas las jornadas
  for (let week = 1; week <= totalWeeks; week++) {
    for (const f of getWeekFixtures(fix, week)) {
      if (f.played) continue;
      
      const homeTeam = teams.find(t => t.id === f.homeTeam);
      const awayTeam = teams.find(t => t.id === f.awayTeam);
      
      if (!homeTeam || !awayTeam) continue;
      
      const result = simulateMatch(f.homeTeam, f.awayTeam, homeTeam, awayTeam, {
        homeMorale: 70,
        awayMorale: 70
      });
      
      tbl = updateTable(tbl, f.homeTeam, f.awayTeam, result.homeScore, result.awayScore);
      
      const idx = fix.findIndex(x => x.id === f.id);
      if (idx >= 0) fix[idx] = { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
    }
  }
  
  // Encontrar posición del Recreativo
  const myEntry = tbl.find(t => t.teamId === 'recreativo');
  const position = tbl.findIndex(t => t.teamId === 'recreativo') + 1;
  
  // Calcular outcome
  const outcome = calculateSeasonOutcome(position, currentLeague, totalTeams);
  
  // Registrar temporada
  const seasonData = {
    season,
    league: currentLeague,
    position,
    points: myEntry?.points || 0,
    goalsFor: myEntry?.goalsFor || 0,
    goalsAgainst: myEntry?.goalsAgainst || 0,
    budget: currentTeam.budget,
    reputation: currentTeam.reputation,
    avgOverall: (currentTeam.players.reduce((s,p) => s + p.overall, 0) / currentTeam.players.length).toFixed(1),
    outcome: null
  };
  
  // Procesar resultado
  let statusIcon = '➖';
  if (outcome.promotion) {
    history.promotions++;
    statusIcon = '🔼';
    seasonData.outcome = 'ASCENSO';
    currentLeague = outcome.newLeagueId;
    if (leagueRank[currentLeague] < leagueRank[history.highestLeague]) {
      history.highestLeague = currentLeague;
    }
  } else if (outcome.playoff) {
    const playoffResult = simulatePlayoff(position, parseFloat(seasonData.avgOverall), history.playoffLosses);
    if (playoffResult.won) {
      history.playoffWins++;
      history.promotions++;
      statusIcon = '🔼';
      seasonData.outcome = 'PLAYOFF ✓';
      // Ascender
      if (currentLeague === 'segundaRFEF') currentLeague = 'primeraRFEF';
      else if (currentLeague === 'primeraRFEF') currentLeague = 'segunda';
      else if (currentLeague === 'segunda') currentLeague = 'laliga';
      
      if (leagueRank[currentLeague] < leagueRank[history.highestLeague]) {
        history.highestLeague = currentLeague;
      }
    } else {
      history.playoffLosses++;
      statusIcon = '🎯';
      seasonData.outcome = 'PLAYOFF ✗';
    }
  } else if (outcome.relegation) {
    history.relegations++;
    statusIcon = '🔽';
    seasonData.outcome = 'DESCENSO';
    currentLeague = outcome.newLeagueId;
  } else if (position === 1) {
    history.titles++;
    statusIcon = '🏆';
    seasonData.outcome = 'CAMPEÓN';
  }
  
  history.seasons.push(seasonData);
  history.leagueHistory.push(currentLeague);
  
  // Preparar nueva temporada
  currentTeam = prepareNewSeason(currentTeam, outcome);
  currentTeam.id = 'recreativo'; // Mantener ID
  
  // Simular mercado de fichajes MEJORADO
  const budgetForTransfers = currentTeam.budget * 0.4; // 40% del presupuesto para fichajes
  const avgOverall = currentTeam.players.reduce((s,p) => s + p.overall, 0) / currentTeam.players.length;
  
  // Siempre intentar mejorar la plantilla
  const needsReinforcement = currentTeam.players.length < 18 || avgOverall < 72;
  
  // Número de fichajes según presupuesto y necesidad
  const numSignings = needsReinforcement ? 
    Math.min(3, Math.floor(budgetForTransfers / 200000)) : 
    Math.min(2, Math.floor(budgetForTransfers / 300000));
  
  for (let i = 0; i < numSignings && budgetForTransfers > 100000; i++) {
    // Target overall según liga (más ambicioso)
    const targetOverall = currentLeague === 'laliga' ? 76 + Math.floor(Math.random() * 4) : 
                          currentLeague === 'segunda' ? 72 + Math.floor(Math.random() * 4) :
                          currentLeague === 'primeraRFEF' ? 68 + Math.floor(Math.random() * 4) : 
                          65 + Math.floor(Math.random() * 4);
    
    // Posiciones prioritarias
    const positions = ['GK', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'ST'];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    
    const signingCost = 100000 + (targetOverall - 60) * 20000;
    
    if (signingCost <= budgetForTransfers * 0.6) {
      const newPlayer = {
        name: `Fichaje T${season}-${i+1}`,
        position: pos,
        overall: targetOverall,
        age: 20 + Math.floor(Math.random() * 8), // 20-27 años (más jóvenes)
        value: signingCost,
        salary: signingCost * 0.001
      };
      
      currentTeam.players.push(newPlayer);
      currentTeam.budget -= signingCost;
    }
  }
  
  // Vender jugadores mayores o con bajo overall para hacer hueco
  if (currentTeam.players.length > 22) {
    currentTeam.players = currentTeam.players
      .sort((a, b) => {
        // Priorizar jóvenes con buen overall
        const scoreA = a.overall - (a.age > 30 ? (a.age - 30) * 2 : 0);
        const scoreB = b.overall - (b.age > 30 ? (b.age - 30) * 2 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }
  
  // Ingresos por ventas de canteranos/excedentes
  const salesIncome = Math.floor(Math.random() * currentTeam.budget * 0.1);
  currentTeam.budget += salesIncome;
  
  // Ajustar reputación
  if (outcome.promotion || position <= 3) {
    currentTeam.reputation = Math.min(99, currentTeam.reputation + 2);
  } else if (outcome.relegation || position >= totalTeams - 2) {
    currentTeam.reputation = Math.max(30, currentTeam.reputation - 2);
  }
  
  // Ajustar presupuesto base por liga (más realista)
  const leagueBudgetBase = {
    'laliga': 25000000,      // LaLiga pequeño: 25M
    'segunda': 5000000,      // Segunda: 5M
    'primeraRFEF': 1500000,  // 1ª RFEF: 1.5M
    'segundaRFEF': 800000    // 2ª RFEF: 800K
  };
  
  // El presupuesto tiende hacia el de la liga, pero mantiene parte del histórico
  // Esto permite crecer gradualmente sin saltos bruscos
  const targetBudget = leagueBudgetBase[currentLeague];
  const historicWeight = 0.6; // 60% del presupuesto actual, 40% del objetivo
  currentTeam.budget = Math.round(currentTeam.budget * historicWeight + targetBudget * (1 - historicWeight));
  
  // Bonus por buena temporada (top 6)
  if (position <= 6 && !outcome.promotion && !outcome.relegation) {
    currentTeam.budget = Math.round(currentTeam.budget * 1.08); // +8% por buen rendimiento
  }
  
  // Actualizar históricos
  history.budgetHistory.push(currentTeam.budget);
  history.reputationHistory.push(currentTeam.reputation);
  if (currentTeam.budget > history.bestBudget) history.bestBudget = currentTeam.budget;
  
  const avgOvr = currentTeam.players.reduce((s,p) => s + p.overall, 0) / currentTeam.players.length;
  if (avgOvr > history.peakOverall) history.peakOverall = avgOvr;
  
  if (position > history.lowestPosition && currentLeague === 'segundaRFEF') {
    history.lowestPosition = position;
  }
  
  // Regenerar liga si cambió de categoría
  if (seasonData.outcome === 'ASCENSO' || seasonData.outcome === 'DESCENSO' || 
      seasonData.outcome === 'PLAYOFF ✓') {
    // Actualizar equipos de la nueva liga
    if (currentLeague === 'segundaRFEF') leagueTeams.segundaRFEF = createSegundaRFEFTeams(currentTeam);
    else if (currentLeague === 'primeraRFEF') leagueTeams.primeraRFEF = createPrimeraRFEFTeams();
    else if (currentLeague === 'segunda') leagueTeams.segunda = createSegundaTeams();
    else if (currentLeague === 'laliga') leagueTeams.laliga = createLaLigaTeams();
  }
  
  // Log cada 5 temporadas
  if (season % 5 === 0 || seasonData.outcome) {
    const outcomeStr = seasonData.outcome ? ` → ${seasonData.outcome}` : '';
    console.log(`T${String(season).padStart(2)}: ${leagueNames[seasonData.league].padEnd(8)} ${String(position).padStart(2)}º (${seasonData.points}pts) | ${formatMoney(currentTeam.budget).padStart(8)} | Rep ${currentTeam.reputation} ${statusIcon}${outcomeStr}`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

// ============== RESULTADOS FINALES ==============
console.log('\n' + '═'.repeat(70));
console.log('📊 RESUMEN 50 TEMPORADAS - RECREATIVO DE HUELVA');
console.log('═'.repeat(70));

console.log(`\n⏱️ Tiempo de simulación: ${elapsed}s`);

console.log(`\n🏆 LOGROS:`);
console.log(`   Títulos de liga: ${history.titles}`);
console.log(`   Ascensos: ${history.promotions}`);
console.log(`   Descensos: ${history.relegations}`);
console.log(`   Playoffs ganados: ${history.playoffWins}/${history.playoffWins + history.playoffLosses}`);
console.log(`   Liga más alta alcanzada: ${leagueNames[history.highestLeague]}`);

console.log(`\n💰 FINANZAS:`);
console.log(`   Presupuesto inicial: ${formatMoney(recreativo.budget)}`);
console.log(`   Presupuesto final: ${formatMoney(currentTeam.budget)}`);
console.log(`   Presupuesto máximo: ${formatMoney(history.bestBudget)}`);
console.log(`   Crecimiento: ${((currentTeam.budget / recreativo.budget - 1) * 100).toFixed(0)}%`);

console.log(`\n📈 EVOLUCIÓN:`);
console.log(`   Reputación inicial: ${recreativo.reputation}`);
console.log(`   Reputación final: ${currentTeam.reputation}`);
console.log(`   Media plantilla inicial: ${(recreativo.players.reduce((s,p) => s + p.overall, 0) / recreativo.players.length).toFixed(1)}`);
console.log(`   Media plantilla final: ${(currentTeam.players.reduce((s,p) => s + p.overall, 0) / currentTeam.players.length).toFixed(1)}`);
console.log(`   Pico de media: ${history.peakOverall.toFixed(1)}`);

// Temporadas por liga
const seasonsByLeague = {};
history.leagueHistory.forEach(l => {
  seasonsByLeague[l] = (seasonsByLeague[l] || 0) + 1;
});

console.log(`\n📅 TEMPORADAS POR LIGA:`);
Object.entries(seasonsByLeague)
  .sort((a, b) => leagueRank[a[0]] - leagueRank[b[0]])
  .forEach(([league, count]) => {
    const bar = '█'.repeat(Math.ceil(count / 2));
    console.log(`   ${leagueNames[league].padEnd(10)}: ${bar} ${count}`);
  });

// Gráfico ASCII de evolución de liga
console.log(`\n📈 EVOLUCIÓN DE CATEGORÍA (50 temporadas):`);
const leagueToLevel = { 'laliga': 4, 'segunda': 3, 'primeraRFEF': 2, 'segundaRFEF': 1 };
const levelToSymbol = { 4: '█', 3: '▓', 2: '▒', 1: '░' };

let graphLine = '   ';
for (let i = 0; i < 50; i++) {
  const level = leagueToLevel[history.leagueHistory[i]];
  graphLine += levelToSymbol[level];
}
console.log(graphLine);
console.log('   ' + '─'.repeat(50));
console.log('   T1' + ' '.repeat(44) + 'T50');
console.log('   ░=2ªRFEF  ▒=1ªRFEF  ▓=Segunda  █=LaLiga');

// Análisis de patrones
console.log(`\n🔍 ANÁLISIS:`);

const consecutivePromotions = history.seasons.filter((s, i) => 
  s.outcome === 'ASCENSO' || s.outcome === 'PLAYOFF ✓'
).length;

const maxStayInTopFlight = history.leagueHistory.reduce((max, league, i, arr) => {
  if (league !== 'laliga') return max;
  let count = 0;
  while (arr[i + count] === 'laliga') count++;
  return Math.max(max, count);
}, 0);

console.log(`   Racha más larga en LaLiga: ${maxStayInTopFlight} temporadas`);
console.log(`   Estabilidad: ${history.promotions + history.relegations} cambios de categoría en 50 años`);

if (history.highestLeague === 'laliga') {
  console.log(`   ✅ ¡El Recreativo volvió a la élite!`);
} else if (history.highestLeague === 'segunda') {
  console.log(`   ⚠️ Llegó a Segunda pero no pudo dar el salto a Primera`);
} else if (history.highestLeague === 'primeraRFEF') {
  console.log(`   ❌ Se quedó estancado entre 1ª y 2ª RFEF`);
} else {
  console.log(`   💀 Nunca salió de Segunda RFEF`);
}

console.log('\n✅ Simulación completada');
