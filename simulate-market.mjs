// Simulación de 20 temporadas con el Betis - Test del mercado de fichajes
// Ejecutar: node simulate-market.mjs

import { LALIGA_TEAMS, SEGUNDA_TEAMS } from './src/data/teams.js';
import { 
  initializeLeague, 
  simulateMatch, 
  updateTable, 
  getWeekFixtures,
  calculateTeamStrength 
} from './src/game/leagueEngine.js';
import { generatePlayerPersonality, evaluateTransferOffer } from './src/game/playerPersonality.js';

const ALL_TEAMS = [...LALIGA_TEAMS, ...SEGUNDA_TEAMS];
const BETIS_ID = 'real_betis';

// Formatear dinero
const formatMoney = (amount) => {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
  return `€${amount}`;
};

// Generar mercado de jugadores disponibles
function generateMarket(teams, currentWeek, excludeTeamId) {
  const players = [];
  const seed = currentWeek * 12345;
  const seededRandom = (i) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };
  
  let playerIndex = 0;
  teams.forEach(team => {
    if (team.id === excludeTeamId || !team.players) return;
    
    team.players.forEach(player => {
      playerIndex++;
      const isAvailable = seededRandom(playerIndex) < 0.30;
      const isForSale = seededRandom(playerIndex + 500) < 0.15;
      
      if (isAvailable || isForSale) {
        const askingPrice = isForSale 
          ? Math.round(player.value * (0.7 + seededRandom(playerIndex + 1000) * 0.3))
          : Math.round(player.value * (0.9 + seededRandom(playerIndex + 1000) * 0.3));
        
        players.push({
          ...player,
          teamId: team.id,
          teamName: team.name,
          teamReputation: team.reputation || 70,
          askingPrice,
          isForSale,
          personality: generatePlayerPersonality(player, currentWeek)
        });
      }
    });
  });
  
  return players;
}

// Generar oferta entrante
function generateIncomingOffer(team, allTeams) {
  const players = team.players || [];
  if (players.length === 0) return null;
  
  const sortedByValue = [...players].sort((a, b) => b.value - a.value);
  const topPlayers = sortedByValue.slice(0, Math.min(10, players.length));
  const targetPlayer = topPlayers[Math.floor(Math.random() * topPlayers.length)];
  
  const otherTeams = allTeams.filter(t => t.id !== team.id);
  const offeringTeam = otherTeams[Math.floor(Math.random() * otherTeams.length)];
  
  const offerPercent = 0.6 + Math.random() * 0.35;
  const offerAmount = Math.round(targetPlayer.value * offerPercent);
  
  return {
    player: targetPlayer,
    team: offeringTeam,
    amount: offerAmount,
    percent: offerPercent
  };
}

// Simular una temporada completa
function simulateSeason(seasonNum, initialTeam, initialMoney) {
  let team = JSON.parse(JSON.stringify(initialTeam));
  let money = initialMoney;
  
  const log = {
    season: seasonNum,
    signings: [],
    sales: [],
    finalPosition: 0,
    finalPoints: 0,
    moneyStart: money,
    moneyEnd: 0,
    squadSizeStart: team.players.length,
    squadSizeEnd: 0
  };
  
  // Inicializar liga
  const { table, fixtures } = initializeLeague(LALIGA_TEAMS, BETIS_ID);
  let currentTable = table;
  let currentFixtures = fixtures;
  
  // Simular las 38 jornadas
  for (let week = 1; week <= 38; week++) {
    // Simular todos los partidos de la jornada
    const weekFixtures = getWeekFixtures(currentFixtures, week);
    
    for (const fixture of weekFixtures) {
      if (fixture.played) continue;
      
      const homeTeam = fixture.homeTeam === BETIS_ID ? team : LALIGA_TEAMS.find(t => t.id === fixture.homeTeam);
      const awayTeam = fixture.awayTeam === BETIS_ID ? team : LALIGA_TEAMS.find(t => t.id === fixture.awayTeam);
      
      if (!homeTeam || !awayTeam) continue;
      
      const homeEntry = currentTable.find(t => t.teamId === fixture.homeTeam);
      const awayEntry = currentTable.find(t => t.teamId === fixture.awayTeam);
      
      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70
      });
      
      currentTable = updateTable(currentTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      
      // Marcar como jugado
      const fixtureIndex = currentFixtures.findIndex(f => f.id === fixture.id);
      if (fixtureIndex >= 0) {
        currentFixtures[fixtureIndex] = { ...fixture, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
      }
    }
    
    // === OPERACIONES DE MERCADO (cada ~5 semanas) ===
    if (week % 5 === 0 || week === 1 || week === 2) {
      
      // 1. Intentar FICHAR (40% probabilidad)
      if (Math.random() < 0.4 && team.players.length < 25) {
        const market = generateMarket(ALL_TEAMS, week + seasonNum * 100, BETIS_ID);
        
        // Detectar posiciones donde necesitamos refuerzos
        const positionCount = {};
        const positionNeeds = { GK: 2, CB: 4, RB: 2, LB: 2, CDM: 2, CM: 3, CAM: 2, RW: 2, LW: 2, ST: 3 };
        team.players.forEach(p => {
          positionCount[p.position] = (positionCount[p.position] || 0) + 1;
        });
        const neededPositions = Object.entries(positionNeeds)
          .filter(([pos, need]) => (positionCount[pos] || 0) < need)
          .map(([pos]) => pos);
        
        // Buscar jugadores asequibles, mejores y QUE NO ESTÉN YA EN PLANTILLA
        const existingNames = new Set(team.players.map(p => p.name));
        const affordablePlayers = market.filter(p => 
          money > 0 && // Debe haber dinero
          p.askingPrice <= Math.max(0, money * 0.4) && // No gastar más del 40% del presupuesto
          p.overall >= 75 && // Mínimo nivel
          p.age <= 30 && // No muy mayores
          !existingNames.has(p.name) && // NO DUPLICADOS
          (neededPositions.length === 0 || neededPositions.includes(p.position)) // Priorizar posiciones necesarias
        );
        
        if (affordablePlayers.length > 0) {
          // Ordenar por overall/precio, priorizando posiciones necesarias
          affordablePlayers.sort((a, b) => {
            const aNeeded = neededPositions.includes(a.position) ? 10 : 0;
            const bNeeded = neededPositions.includes(b.position) ? 10 : 0;
            return (b.overall + bNeeded) - (a.overall + aNeeded);
          });
          const target = affordablePlayers[0];
          
          // Evaluar si aceptaría
          const evaluation = evaluateTransferOffer(
            target,
            { reputation: target.teamReputation },
            { reputation: team.reputation || 80 },
            { salary: target.salary * 1.1, promisedRole: 'rotation' }
          );
          
          // Si hay buena probabilidad, intentar fichar
          if (evaluation.probability > 40 || Math.random() < 0.3) {
            // Fichaje exitoso
            const signingFee = target.askingPrice;
            const newPlayer = {
              name: target.name,
              position: target.position,
              overall: target.overall,
              age: target.age,
              value: target.value,
              salary: Math.round(target.salary * 1.1)
            };
            
            team.players.push(newPlayer);
            money -= signingFee;
            
            log.signings.push({
              week,
              player: target.name,
              position: target.position,
              overall: target.overall,
              from: target.teamName,
              fee: signingFee
            });
          }
        }
      }
      
      // 2. Recibir OFERTAS y posiblemente vender (30% probabilidad)
      if (Math.random() < 0.3 && team.players.length > 15) {
        const offer = generateIncomingOffer(team, ALL_TEAMS);
        
        if (offer && offer.percent >= 0.85) {
          // NO vender si es de los 5 mejores jugadores del equipo
          const sortedByOverall = [...team.players].sort((a, b) => b.overall - a.overall);
          const top5 = sortedByOverall.slice(0, 5).map(p => p.name);
          
          if (!top5.includes(offer.player.name)) {
            // Vender jugador
            const playerIndex = team.players.findIndex(p => p.name === offer.player.name);
            if (playerIndex >= 0) {
              team.players.splice(playerIndex, 1);
              money += offer.amount;
              
              log.sales.push({
                week,
                player: offer.player.name,
                position: offer.player.position,
                overall: offer.player.overall,
                to: offer.team.name,
                fee: offer.amount
              });
            }
          }
        }
      }
    }
    
    // Ingresos semanales (simplificado)
    money += 500000; // Ingresos base
    money -= team.players.reduce((sum, p) => sum + (p.salary || 50000), 0); // Salarios
  }
  
  // Resultado final
  const betisEntry = currentTable.find(t => t.teamId === BETIS_ID);
  const position = currentTable.findIndex(t => t.teamId === BETIS_ID) + 1;
  
  log.finalPosition = position;
  log.finalPoints = betisEntry?.points || 0;
  log.goalsFor = betisEntry?.goalsFor || 0;
  log.goalsAgainst = betisEntry?.goalsAgainst || 0;
  log.moneyEnd = money;
  log.squadSizeEnd = team.players.length;
  
  return { log, team, money };
}

// === EJECUTAR SIMULACIÓN ===
console.log('🦦 SIMULACIÓN DE 20 TEMPORADAS CON EL BETIS');
console.log('═'.repeat(60));

const betisOriginal = LALIGA_TEAMS.find(t => t.id === BETIS_ID);
let currentTeam = JSON.parse(JSON.stringify(betisOriginal));
let currentMoney = betisOriginal.budget;

const allResults = [];
const positionsCount = {};
let totalSignings = 0;
let totalSales = 0;
let totalSpent = 0;
let totalEarned = 0;

for (let season = 1; season <= 20; season++) {
  console.log(`\n📅 TEMPORADA ${season}`);
  console.log('-'.repeat(40));
  
  const { log, team, money } = simulateSeason(season, currentTeam, currentMoney);
  allResults.push(log);
  
  // Actualizar para siguiente temporada
  currentTeam = team;
  currentMoney = money + 50000000; // Inyección de presupuesto anual
  
  // Envejecer jugadores y actualizar valores
  currentTeam.players = currentTeam.players.map(p => ({
    ...p,
    age: p.age + 1,
    value: p.age >= 30 ? Math.round(p.value * 0.9) : Math.round(p.value * 1.05),
    overall: p.age >= 32 ? Math.max(60, p.overall - 1) : p.overall
  })).filter(p => p.age <= 38); // Retirar mayores de 38
  
  // Stats
  positionsCount[log.finalPosition] = (positionsCount[log.finalPosition] || 0) + 1;
  totalSignings += log.signings.length;
  totalSales += log.sales.length;
  totalSpent += log.signings.reduce((sum, s) => sum + s.fee, 0);
  totalEarned += log.sales.reduce((sum, s) => sum + s.fee, 0);
  
  // Mostrar resumen
  console.log(`  📊 Posición: ${log.finalPosition}º (${log.finalPoints} pts)`);
  console.log(`  ⚽ Goles: ${log.goalsFor} a favor, ${log.goalsAgainst} en contra`);
  console.log(`  💰 Presupuesto: ${formatMoney(log.moneyStart)} → ${formatMoney(log.moneyEnd)}`);
  console.log(`  👥 Plantilla: ${log.squadSizeStart} → ${log.squadSizeEnd} jugadores`);
  
  if (log.signings.length > 0) {
    console.log(`  ✅ Fichajes (${log.signings.length}):`);
    log.signings.forEach(s => {
      console.log(`     + ${s.player} (${s.position}, ${s.overall}) de ${s.from} - ${formatMoney(s.fee)}`);
    });
  }
  
  if (log.sales.length > 0) {
    console.log(`  💸 Ventas (${log.sales.length}):`);
    log.sales.forEach(s => {
      console.log(`     - ${s.player} (${s.position}, ${s.overall}) a ${s.to} - ${formatMoney(s.fee)}`);
    });
  }
}

// === RESUMEN FINAL ===
console.log('\n');
console.log('═'.repeat(60));
console.log('📊 RESUMEN DE 20 TEMPORADAS');
console.log('═'.repeat(60));

console.log('\n🏆 POSICIONES EN LIGA:');
const sortedPositions = Object.entries(positionsCount).sort((a, b) => Number(a[0]) - Number(b[0]));
sortedPositions.forEach(([pos, count]) => {
  const bar = '█'.repeat(count);
  console.log(`  ${pos.padStart(2)}º: ${bar} (${count})`);
});

const avgPosition = allResults.reduce((sum, r) => sum + r.finalPosition, 0) / 20;
const avgPoints = allResults.reduce((sum, r) => sum + r.finalPoints, 0) / 20;
const bestPosition = Math.min(...allResults.map(r => r.finalPosition));
const worstPosition = Math.max(...allResults.map(r => r.finalPosition));

console.log(`\n📈 ESTADÍSTICAS:`);
console.log(`  Media de posición: ${avgPosition.toFixed(1)}º`);
console.log(`  Media de puntos: ${avgPoints.toFixed(1)}`);
console.log(`  Mejor temporada: ${bestPosition}º`);
console.log(`  Peor temporada: ${worstPosition}º`);

console.log(`\n💰 MERCADO:`);
console.log(`  Fichajes totales: ${totalSignings}`);
console.log(`  Ventas totales: ${totalSales}`);
console.log(`  Total gastado: ${formatMoney(totalSpent)}`);
console.log(`  Total ingresado: ${formatMoney(totalEarned)}`);
console.log(`  Balance neto: ${formatMoney(totalEarned - totalSpent)}`);

console.log(`\n👥 PLANTILLA FINAL:`);
currentTeam.players.sort((a, b) => b.overall - a.overall);
currentTeam.players.forEach(p => {
  console.log(`  ${p.position.padEnd(3)} ${p.name.padEnd(25)} ${p.overall} (${p.age} años)`);
});

console.log('\n✅ Simulación completada');
