// Test exhaustivo del sistema de fichajes v2
// Ejecutar: node test-market-v2.mjs

import { LALIGA_TEAMS, SEGUNDA_TEAMS } from './src/data/teams.js';
import { 
  initializeLeague, 
  simulateMatch, 
  updateTable, 
  getWeekFixtures,
  calculateTeamStrength 
} from './src/game/leagueEngine.js';
import { 
  generatePlayerPersonality, 
  evaluateTransferOffer,
  PERSONALITIES,
  SPECIAL_GOALS
} from './src/game/playerPersonality.js';

const ALL_TEAMS = [...LALIGA_TEAMS, ...SEGUNDA_TEAMS];

// === CONSTANTES ===
const TRANSFER_WINDOWS = {
  summer: { start: 1, end: 8, urgent: 7 },
  winter: { start: 20, end: 24, urgent: 23 }
};

const PLAYER_ROLES = {
  star: { minutesPromise: 90, salaryMult: 1.3 },
  starter: { minutesPromise: 75, salaryMult: 1.1 },
  rotation: { minutesPromise: 50, salaryMult: 1.0 },
  backup: { minutesPromise: 25, salaryMult: 0.9 }
};

// === UTILIDADES ===
const formatMoney = (amount) => {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
  return `€${amount}`;
};

const seededRandom = (seed, offset = 0) => {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
};

const isInTransferWindow = (week) => {
  return (week >= TRANSFER_WINDOWS.summer.start && week <= TRANSFER_WINDOWS.summer.end) ||
         (week >= TRANSFER_WINDOWS.winter.start && week <= TRANSFER_WINDOWS.winter.end);
};

const isUrgentWindow = (week) => {
  return week === TRANSFER_WINDOWS.summer.urgent || week === TRANSFER_WINDOWS.winter.urgent;
};

// === GENERACIÓN DE MERCADO REALISTA ===
function generateMarket(teams, week, season, excludeTeamId, scoutingLevel = 0) {
  const players = [];
  const seed = week * 12345 + season * 999;
  
  let idx = 0;
  teams.forEach(team => {
    if (team.id === excludeTeamId || !team.players) return;
    
    team.players.forEach(player => {
      idx++;
      
      const availRoll = seededRandom(seed, idx);
      const isForSale = seededRandom(seed, idx + 500) < 0.12;
      const isUnhappy = seededRandom(seed, idx + 600) < 0.08;
      const contractExpiring = seededRandom(seed, idx + 700) < 0.1;
      
      const availability = 0.25 + (isForSale ? 0.3 : 0) + (isUnhappy ? 0.2 : 0) + (contractExpiring ? 0.15 : 0);
      
      if (availRoll < availability) {
        let priceMultiplier = 0.9 + seededRandom(seed, idx + 1000) * 0.3;
        if (isForSale) priceMultiplier *= 0.8;
        if (isUnhappy) priceMultiplier *= 0.85;
        if (contractExpiring) priceMultiplier *= 0.7;
        
        // Competencia sube precio
        const aiInterestCount = Math.floor(seededRandom(seed, idx + 2000) * 4);
        if (aiInterestCount > 1) priceMultiplier *= 1.1;
        
        const askingPrice = Math.round(player.value * priceMultiplier);
        const releaseClause = Math.round(player.value * 1.5 * (player.overall >= 85 ? 2.5 : 1.5));
        const personality = generatePlayerPersonality(player, seed + idx);
        
        players.push({
          ...player,
          teamId: team.id,
          teamName: team.name,
          teamReputation: team.reputation || 70,
          askingPrice,
          releaseClause,
          isForSale,
          isUnhappy,
          contractExpiring,
          aiInterestCount,
          personality,
          difficulty: aiInterestCount > 1 ? 'hard' : isForSale ? 'easy' : 'normal'
        });
      }
    });
  });
  
  return players;
}

// === SIMULACIÓN DE NEGOCIACIÓN REALISTA ===
function simulateNegotiation(player, buyingTeam, offerAmount, offerSalary, promisedRole) {
  const evaluation = evaluateTransferOffer(
    player,
    { reputation: player.teamReputation },
    { reputation: buyingTeam.reputation || 80 },
    { salary: offerSalary, promisedRole }
  );
  
  // Pagar cláusula = éxito automático
  if (offerAmount >= player.releaseClause) {
    return { success: true, finalAmount: offerAmount, reason: 'Cláusula pagada' };
  }
  
  // Competencia de IA puede arruinar el fichaje
  if (player.aiInterestCount > 1 && Math.random() < player.aiInterestCount * 0.1) {
    return { success: false, reason: 'Otro equipo se adelantó' };
  }
  
  // Probabilidad base según evaluación
  const baseChance = evaluation.probability / 100;
  const priceBonus = offerAmount >= player.askingPrice ? 0.15 : offerAmount >= player.value ? 0.05 : -0.1;
  const finalChance = Math.min(0.95, Math.max(0.05, baseChance + priceBonus));
  
  if (Math.random() < finalChance) {
    return { 
      success: true, 
      finalAmount: offerAmount, 
      finalSalary: offerSalary,
      reason: evaluation.reasons.filter(r => r.positive).map(r => r.text).join(', ') || 'Acuerdo alcanzado'
    };
  }
  
  // Contraoferta?
  if (Math.random() < 0.5 && evaluation.probability > 30) {
    const counterAmount = Math.round(offerAmount * (1.1 + Math.random() * 0.15));
    return { 
      success: false, 
      counter: true,
      counterAmount,
      reason: 'Piden más dinero'
    };
  }
  
  return { 
    success: false, 
    reason: evaluation.reasons.filter(r => !r.positive).map(r => r.text).join(', ') || 'No hay acuerdo'
  };
}

// === GENERAR OFERTA ENTRANTE ===
function generateIncomingOffer(team, allTeams, week, isUrgent) {
  if (!team.players || team.players.length === 0) return null;
  
  const sortedPlayers = [...team.players].sort((a, b) => b.value - a.value);
  const targetPool = sortedPlayers.slice(0, Math.min(10, sortedPlayers.length));
  const target = targetPool[Math.floor(Math.random() * targetPool.length)];
  
  const suitableTeams = allTeams.filter(t => {
    if (t.id === team.id) return false;
    const repDiff = Math.abs((t.reputation || 70) - target.overall);
    return repDiff < 20 && (t.budget || 50000000) > target.value * 0.4;
  });
  
  if (suitableTeams.length === 0) return null;
  
  const buyer = suitableTeams[Math.floor(Math.random() * suitableTeams.length)];
  const basePercent = 0.65 + Math.random() * 0.35;
  const urgentBonus = isUrgent ? 0.1 : 0;
  const percent = Math.min(1.2, basePercent + urgentBonus);
  
  return {
    player: target,
    buyer,
    amount: Math.round(target.value * percent),
    percent: Math.round(percent * 100)
  };
}

// === SIMULACIÓN DE UNA TEMPORADA ===
function simulateSeason(seasonNum, team, money, config = {}) {
  const { verbose = false, teamId = 'real_betis' } = config;
  
  let currentTeam = JSON.parse(JSON.stringify(team));
  let currentMoney = money;
  
  const log = {
    season: seasonNum,
    signings: [],
    sales: [],
    failedSignings: [],
    incomingOffers: [],
    finalPosition: 0,
    finalPoints: 0,
    moneyStart: money,
    moneyEnd: 0
  };
  
  // Inicializar liga
  const { table, fixtures } = initializeLeague(LALIGA_TEAMS, teamId);
  let currentTable = table;
  let currentFixtures = fixtures;
  
  // Simular 38 jornadas
  for (let week = 1; week <= 38; week++) {
    const inWindow = isInTransferWindow(week);
    const urgent = isUrgentWindow(week);
    
    // Simular partidos
    const weekFixtures = getWeekFixtures(currentFixtures, week);
    for (const fixture of weekFixtures) {
      if (fixture.played) continue;
      
      const homeTeam = fixture.homeTeam === teamId ? currentTeam : LALIGA_TEAMS.find(t => t.id === fixture.homeTeam);
      const awayTeam = fixture.awayTeam === teamId ? currentTeam : LALIGA_TEAMS.find(t => t.id === fixture.awayTeam);
      
      if (!homeTeam || !awayTeam) continue;
      
      const homeEntry = currentTable.find(t => t.teamId === fixture.homeTeam);
      const awayEntry = currentTable.find(t => t.teamId === fixture.awayTeam);
      
      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70
      });
      
      currentTable = updateTable(currentTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      
      const idx = currentFixtures.findIndex(f => f.id === fixture.id);
      if (idx >= 0) {
        currentFixtures[idx] = { ...fixture, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
      }
    }
    
    // === OPERACIONES DE MERCADO ===
    if (inWindow) {
      // Intentar FICHAR
      if (Math.random() < (urgent ? 0.6 : 0.35) && currentTeam.players.length < 25 && currentMoney > 5000000) {
        const market = generateMarket(ALL_TEAMS, week, seasonNum, teamId, 1);
        
        // Detectar necesidades
        const posCount = {};
        const needs = { GK: 2, CB: 4, RB: 2, LB: 2, CDM: 2, CM: 3, CAM: 2, RW: 2, LW: 2, ST: 3 };
        currentTeam.players.forEach(p => posCount[p.position] = (posCount[p.position] || 0) + 1);
        const neededPos = Object.entries(needs).filter(([pos, n]) => (posCount[pos] || 0) < n).map(([pos]) => pos);
        
        // Filtrar candidatos
        const existingNames = new Set(currentTeam.players.map(p => p.name));
        const candidates = market.filter(p => 
          currentMoney > 0 &&
          p.askingPrice <= currentMoney * 0.5 &&
          p.overall >= 75 &&
          p.age <= 30 &&
          !existingNames.has(p.name) &&
          (neededPos.length === 0 || neededPos.includes(p.position))
        );
        
        if (candidates.length > 0) {
          // Ordenar por valor (overall vs precio)
          candidates.sort((a, b) => {
            const aScore = a.overall + (neededPos.includes(a.position) ? 5 : 0) - (a.difficulty === 'hard' ? 3 : 0);
            const bScore = b.overall + (neededPos.includes(b.position) ? 5 : 0) - (b.difficulty === 'hard' ? 3 : 0);
            return bScore - aScore;
          });
          
          const target = candidates[0];
          const offerAmount = target.isForSale ? target.askingPrice : Math.round(target.askingPrice * 1.05);
          const offerSalary = Math.round(target.salary * 1.15);
          const role = target.overall >= 82 ? 'starter' : 'rotation';
          
          const result = simulateNegotiation(target, currentTeam, offerAmount, offerSalary, role);
          
          if (result.success) {
            currentTeam.players.push({
              name: target.name,
              position: target.position,
              overall: target.overall,
              age: target.age,
              value: target.value,
              salary: result.finalSalary || offerSalary
            });
            currentMoney -= result.finalAmount;
            
            log.signings.push({
              week,
              player: target.name,
              position: target.position,
              overall: target.overall,
              age: target.age,
              from: target.teamName,
              fee: result.finalAmount,
              difficulty: target.difficulty,
              reason: result.reason
            });
            
            if (verbose) console.log(`  ✅ Fichado: ${target.name} (${target.overall}) por ${formatMoney(result.finalAmount)}`);
          } else {
            log.failedSignings.push({
              week,
              player: target.name,
              overall: target.overall,
              reason: result.reason
            });
            
            if (verbose) console.log(`  ❌ Fallido: ${target.name} - ${result.reason}`);
          }
        }
      }
      
      // Recibir OFERTAS
      if (Math.random() < (urgent ? 0.5 : 0.25) && currentTeam.players.length > 15) {
        const offer = generateIncomingOffer(currentTeam, ALL_TEAMS, week, urgent);
        
        if (offer) {
          log.incomingOffers.push({
            week,
            player: offer.player.name,
            from: offer.buyer.name,
            amount: offer.amount,
            percent: offer.percent
          });
          
          // Aceptar si es >90% del valor y no es titular clave
          const top5 = [...currentTeam.players].sort((a, b) => b.overall - a.overall).slice(0, 5).map(p => p.name);
          
          if (offer.percent >= 90 && !top5.includes(offer.player.name)) {
            currentTeam.players = currentTeam.players.filter(p => p.name !== offer.player.name);
            currentMoney += offer.amount;
            
            log.sales.push({
              week,
              player: offer.player.name,
              position: offer.player.position,
              overall: offer.player.overall,
              to: offer.buyer.name,
              fee: offer.amount
            });
            
            if (verbose) console.log(`  💰 Vendido: ${offer.player.name} a ${offer.buyer.name} por ${formatMoney(offer.amount)}`);
          }
        }
      }
    }
    
    // Ingresos/gastos semanales
    currentMoney += 500000;
    currentMoney -= currentTeam.players.reduce((sum, p) => sum + (p.salary || 50000), 0);
  }
  
  // Resultados finales
  const teamEntry = currentTable.find(t => t.teamId === teamId);
  const position = currentTable.findIndex(t => t.teamId === teamId) + 1;
  
  log.finalPosition = position;
  log.finalPoints = teamEntry?.points || 0;
  log.goalsFor = teamEntry?.goalsFor || 0;
  log.goalsAgainst = teamEntry?.goalsAgainst || 0;
  log.moneyEnd = currentMoney;
  log.squadSize = currentTeam.players.length;
  
  return { log, team: currentTeam, money: currentMoney };
}

// === EJECUTAR TESTS ===
console.log('🦦 TEST EXHAUSTIVO DEL SISTEMA DE FICHAJES v2');
console.log('═'.repeat(70));

const TEAMS_TO_TEST = [
  { id: 'real_betis', name: 'Real Betis', seasons: 20 },
  { id: 'sevilla', name: 'Sevilla FC', seasons: 10 },
  { id: 'valencia', name: 'Valencia CF', seasons: 10 },
  { id: 'real_sociedad', name: 'Real Sociedad', seasons: 10 }
];

const globalStats = {
  totalSeasons: 0,
  totalSignings: 0,
  totalSales: 0,
  totalFailedSignings: 0,
  totalSpent: 0,
  totalEarned: 0,
  positions: {},
  signingsByDifficulty: { easy: 0, normal: 0, hard: 0 }
};

for (const testTeam of TEAMS_TO_TEST) {
  console.log(`\n${'━'.repeat(70)}`);
  console.log(`🏟️  SIMULANDO ${testTeam.name.toUpperCase()} (${testTeam.seasons} temporadas)`);
  console.log(`${'━'.repeat(70)}`);
  
  const teamData = LALIGA_TEAMS.find(t => t.id === testTeam.id);
  if (!teamData) {
    console.log(`  ⚠️ Equipo no encontrado: ${testTeam.id}`);
    continue;
  }
  
  let currentTeam = JSON.parse(JSON.stringify(teamData));
  let currentMoney = teamData.budget;
  
  const teamResults = [];
  
  for (let season = 1; season <= testTeam.seasons; season++) {
    const { log, team, money } = simulateSeason(season, currentTeam, currentMoney, { 
      teamId: testTeam.id,
      verbose: season <= 3 // Solo verbose las primeras 3 temporadas
    });
    
    teamResults.push(log);
    
    // Preparar siguiente temporada
    currentTeam = team;
    currentMoney = Math.max(money, 10000000) + 40000000; // Mínimo 10M + inyección anual
    
    // Envejecer jugadores
    currentTeam.players = currentTeam.players.map(p => ({
      ...p,
      age: p.age + 1,
      value: p.age >= 30 ? Math.round(p.value * 0.9) : Math.round(p.value * 1.05),
      overall: p.age >= 32 ? Math.max(60, p.overall - 1) : p.overall
    })).filter(p => p.age <= 38);
    
    // Stats globales
    globalStats.totalSeasons++;
    globalStats.totalSignings += log.signings.length;
    globalStats.totalSales += log.sales.length;
    globalStats.totalFailedSignings += log.failedSignings.length;
    globalStats.totalSpent += log.signings.reduce((s, x) => s + x.fee, 0);
    globalStats.totalEarned += log.sales.reduce((s, x) => s + x.fee, 0);
    globalStats.positions[log.finalPosition] = (globalStats.positions[log.finalPosition] || 0) + 1;
    
    log.signings.forEach(s => {
      if (s.difficulty) globalStats.signingsByDifficulty[s.difficulty] = (globalStats.signingsByDifficulty[s.difficulty] || 0) + 1;
    });
    
    // Mostrar resumen de temporada
    const signingsStr = log.signings.length > 0 ? `+${log.signings.length}` : '';
    const salesStr = log.sales.length > 0 ? `-${log.sales.length}` : '';
    const failedStr = log.failedSignings.length > 0 ? `(${log.failedSignings.length} fallidos)` : '';
    
    console.log(`  T${String(season).padStart(2, '0')}: ${String(log.finalPosition).padStart(2)}º (${log.finalPoints}pts) | ${formatMoney(log.moneyEnd).padStart(8)} | Fichajes: ${signingsStr.padStart(3)} ${salesStr.padStart(3)} ${failedStr}`);
  }
  
  // Resumen del equipo
  const avgPos = teamResults.reduce((s, r) => s + r.finalPosition, 0) / teamResults.length;
  const avgPts = teamResults.reduce((s, r) => s + r.finalPoints, 0) / teamResults.length;
  const bestPos = Math.min(...teamResults.map(r => r.finalPosition));
  const worstPos = Math.max(...teamResults.map(r => r.finalPosition));
  
  console.log(`\n  📊 Media: ${avgPos.toFixed(1)}º | ${avgPts.toFixed(0)}pts | Mejor: ${bestPos}º | Peor: ${worstPos}º`);
}

// === RESUMEN GLOBAL ===
console.log(`\n${'═'.repeat(70)}`);
console.log('📊 RESUMEN GLOBAL DE TODAS LAS SIMULACIONES');
console.log(`${'═'.repeat(70)}`);

console.log(`\n📅 Temporadas simuladas: ${globalStats.totalSeasons}`);
console.log(`\n💰 MERCADO:`);
console.log(`  Fichajes exitosos: ${globalStats.totalSignings}`);
console.log(`  Fichajes fallidos: ${globalStats.totalFailedSignings}`);
console.log(`  Tasa de éxito: ${((globalStats.totalSignings / (globalStats.totalSignings + globalStats.totalFailedSignings)) * 100).toFixed(1)}%`);
console.log(`  Ventas: ${globalStats.totalSales}`);
console.log(`  Total gastado: ${formatMoney(globalStats.totalSpent)}`);
console.log(`  Total ingresado: ${formatMoney(globalStats.totalEarned)}`);
console.log(`  Balance neto: ${formatMoney(globalStats.totalEarned - globalStats.totalSpent)}`);

console.log(`\n📈 FICHAJES POR DIFICULTAD:`);
console.log(`  Fáciles (jugador en venta): ${globalStats.signingsByDifficulty.easy || 0}`);
console.log(`  Normales: ${globalStats.signingsByDifficulty.normal || 0}`);
console.log(`  Difíciles (competencia): ${globalStats.signingsByDifficulty.hard || 0}`);

console.log(`\n🏆 DISTRIBUCIÓN DE POSICIONES:`);
const sortedPositions = Object.entries(globalStats.positions).sort((a, b) => Number(a[0]) - Number(b[0]));
sortedPositions.forEach(([pos, count]) => {
  const bar = '█'.repeat(Math.min(count, 30));
  console.log(`  ${pos.padStart(2)}º: ${bar} (${count})`);
});

console.log(`\n✅ Test completado`);
