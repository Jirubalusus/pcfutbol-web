/**
 * Simulación completa de 600 temporadas
 * Testea todo el flujo: abonos, partidos, césped, lesiones, economía
 */

// === CONFIGURACIÓN ===
const SIMULATIONS = 600;
const HOME_GAMES = 19;
const WEEKS_PER_SEASON = 42;

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000 },
  { name: 'Moderno', capacity: 18000, maintenance: 120000 },
  { name: 'Grande', capacity: 35000, maintenance: 280000 },
  { name: 'Élite', capacity: 55000, maintenance: 450000 },
  { name: 'Legendario', capacity: 80000, maintenance: 700000 }
];

// === FUNCIONES ===

function calculateSeasonTickets({ capacity, seasonTicketPrice, teamOverall, leaguePosition, totalTeams, teamReputation }) {
  const maxSeasonTickets = Math.floor(capacity * 0.8);
  const overallFactor = 0.30 + (teamOverall / 100) * 0.52;
  const referenceSeasonPrice = 500;
  const priceFactor = Math.max(0.6, Math.min(1.4, referenceSeasonPrice / seasonTicketPrice));
  const positionRatio = (totalTeams - leaguePosition + 1) / totalTeams;
  const positionFactor = 0.80 + (positionRatio * 0.30);
  const reputationFactor = 0.85 + (teamReputation / 100) * 0.30;
  const baseTickets = maxSeasonTickets * overallFactor;
  const finalTickets = baseTickets * priceFactor * positionFactor * reputationFactor;
  return Math.max(100, Math.min(maxSeasonTickets, Math.round(finalTickets)));
}

function calculatePriceFactor(ticketPrice, rivalFactor = 1.0) {
  const referencePrice = 30;
  const elasticity = 0.75;
  let factor;
  if (ticketPrice <= referencePrice) {
    factor = 1 + (1 - ticketPrice / referencePrice) * elasticity * 0.5;
  } else {
    factor = Math.pow(referencePrice / ticketPrice, 1.4);
  }
  if (rivalFactor > 1.3 && ticketPrice > referencePrice) {
    factor = Math.min(factor + (rivalFactor - 1.3) * 0.25, 0.95);
  }
  return Math.max(0.08, Math.min(1.3, factor));
}

function simulateMatch({ capacity, seasonTickets, ticketPrice, rivalFactor, performanceFactor, grassCondition }) {
  const availableSeats = capacity - seasonTickets;
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor);
  
  let demand = availableSeats * 0.65 * priceFactor * rivalFactor * performanceFactor;
  demand *= (0.9 + Math.random() * 0.2);
  
  const taquilla = Math.min(Math.round(demand), availableSeats);
  const abonados = Math.round(seasonTickets * (0.85 + Math.random() * 0.10));
  const total = abonados + taquilla;
  
  // Ingresos
  const ticketIncome = taquilla * ticketPrice;
  const extraIncome = total * (5 + Math.random() * 10);
  
  // Lesiones - césped malo aumenta riesgo local
  const grassPenalty = grassCondition < 100 ? (100 - grassCondition) / 100 : 0;
  const baseInjuryChance = 0.03; // ~3% por partido base
  const homeInjuryChance = baseInjuryChance * (1 + grassPenalty);
  
  const homeInjuries = Math.random() < homeInjuryChance ? 1 : 0;
  const awayInjuries = Math.random() < baseInjuryChance ? 1 : 0;
  
  // Daño al césped por partido
  const grassDamage = 2 + Math.floor(Math.random() * 3); // 2-4% por partido
  
  return {
    attendance: total,
    taquilla,
    abonados,
    income: Math.round(ticketIncome + extraIncome),
    homeInjuries,
    awayInjuries,
    grassDamage
  };
}

function simulateSeason(config) {
  const { stadiumLevel, teamOverall, teamReputation, seasonTicketPrice, ticketPrice, startPosition } = config;
  
  const stadium = STADIUM_LEVELS[stadiumLevel];
  const capacity = stadium.capacity;
  
  // Estado inicial
  let grassCondition = 100;
  let position = startPosition;
  let totalIncome = 0;
  let totalAttendance = 0;
  let homeInjuries = 0;
  let awayInjuries = 0;
  let events = [];
  let bugs = [];
  
  // Calcular abonados (campaña cerrada al inicio)
  const seasonTickets = calculateSeasonTickets({
    capacity,
    seasonTicketPrice,
    teamOverall,
    leaguePosition: position,
    totalTeams: 20,
    teamReputation
  });
  
  // Validar abonados
  if (seasonTickets < 0 || seasonTickets > capacity) {
    bugs.push(`BUG: Abonados inválidos: ${seasonTickets} (capacidad: ${capacity})`);
  }
  if (isNaN(seasonTickets)) {
    bugs.push(`BUG: Abonados es NaN`);
  }
  
  // Ingresos por abonos
  const seasonTicketIncome = seasonTickets * seasonTicketPrice;
  totalIncome += seasonTicketIncome;
  
  if (isNaN(seasonTicketIncome)) {
    bugs.push(`BUG: Ingreso abonos es NaN`);
  }
  
  // Simular 19 partidos en casa
  for (let match = 0; match < HOME_GAMES; match++) {
    // Rival factor aleatorio
    const isDerby = Math.random() < 0.05;
    const isTopTeam = Math.random() < 0.15;
    let rivalFactor = 1.0;
    if (isDerby) rivalFactor = 1.8;
    else if (isTopTeam) rivalFactor = 1.4;
    else rivalFactor = 0.7 + Math.random() * 0.6;
    
    // Performance factor según posición
    const positionRatio = position / 20;
    let performanceFactor = 1.0;
    if (positionRatio <= 0.15) performanceFactor = 1.2;
    else if (positionRatio >= 0.85) performanceFactor = 0.65;
    else performanceFactor = 1.1 - positionRatio * 0.3;
    
    const result = simulateMatch({
      capacity,
      seasonTickets,
      ticketPrice,
      rivalFactor,
      performanceFactor,
      grassCondition
    });
    
    // Validaciones
    if (result.attendance < 0 || result.attendance > capacity) {
      bugs.push(`BUG: Asistencia inválida: ${result.attendance} (cap: ${capacity})`);
    }
    if (result.taquilla < 0) {
      bugs.push(`BUG: Taquilla negativa: ${result.taquilla}`);
    }
    if (isNaN(result.income)) {
      bugs.push(`BUG: Ingreso partido es NaN`);
    }
    
    totalIncome += result.income;
    totalAttendance += result.attendance;
    homeInjuries += result.homeInjuries;
    awayInjuries += result.awayInjuries;
    
    // Degradar césped
    grassCondition = Math.max(0, grassCondition - result.grassDamage);
    
    // Recuperar césped entre partidos (+5% por semana, ~2 semanas entre partidos)
    grassCondition = Math.min(100, grassCondition + 10);
    
    // Simular posición variable
    if (Math.random() < 0.3) {
      position = Math.max(1, Math.min(20, position + Math.floor(Math.random() * 5) - 2));
    }
  }
  
  // Evento especial (concierto)
  if (Math.random() < 0.3 && grassCondition > 30) {
    const eventIncome = 500000;
    const eventGrassDamage = 20;
    totalIncome += eventIncome;
    grassCondition = Math.max(0, grassCondition - eventGrassDamage);
    events.push('concert');
  }
  
  // Costes
  const maintenanceCost = stadium.maintenance * 52;
  const netBalance = totalIncome - maintenanceCost;
  
  if (isNaN(netBalance)) {
    bugs.push(`BUG: Balance es NaN`);
  }
  
  // Validar césped
  if (grassCondition < 0 || grassCondition > 100) {
    bugs.push(`BUG: Césped fuera de rango: ${grassCondition}`);
  }
  
  return {
    stadiumName: stadium.name,
    capacity,
    seasonTickets,
    seasonTicketIncome,
    totalIncome,
    maintenanceCost,
    netBalance,
    avgAttendance: Math.round(totalAttendance / HOME_GAMES),
    occupancy: (totalAttendance / HOME_GAMES / capacity * 100).toFixed(1),
    homeInjuries,
    awayInjuries,
    finalGrass: grassCondition,
    events,
    bugs,
    profitable: netBalance > 0
  };
}

// === EJECUTAR SIMULACIONES ===
console.log('🎮 SIMULACIÓN COMPLETA - 600 TEMPORADAS');
console.log('='.repeat(60));

const scenarios = [
  { name: '2ªRFEF Bajo', stadiumLevel: 0, teamOverall: 62, teamReputation: 40, seasonTicketPrice: 200, ticketPrice: 15, startPosition: 15 },
  { name: '2ªRFEF Top', stadiumLevel: 0, teamOverall: 68, teamReputation: 55, seasonTicketPrice: 250, ticketPrice: 20, startPosition: 3 },
  { name: '1ªRFEF', stadiumLevel: 1, teamOverall: 70, teamReputation: 60, seasonTicketPrice: 350, ticketPrice: 25, startPosition: 10 },
  { name: 'Segunda Bajo', stadiumLevel: 2, teamOverall: 72, teamReputation: 65, seasonTicketPrice: 400, ticketPrice: 30, startPosition: 18 },
  { name: 'Segunda Top', stadiumLevel: 2, teamOverall: 78, teamReputation: 80, seasonTicketPrice: 500, ticketPrice: 40, startPosition: 2 },
  { name: 'LaLiga Bajo', stadiumLevel: 3, teamOverall: 76, teamReputation: 75, seasonTicketPrice: 600, ticketPrice: 50, startPosition: 17 },
  { name: 'LaLiga Medio', stadiumLevel: 3, teamOverall: 80, teamReputation: 85, seasonTicketPrice: 700, ticketPrice: 60, startPosition: 8 },
  { name: 'LaLiga Top', stadiumLevel: 4, teamOverall: 85, teamReputation: 95, seasonTicketPrice: 900, ticketPrice: 80, startPosition: 2 },
];

const SIMS_PER_SCENARIO = Math.floor(SIMULATIONS / scenarios.length);
let totalBugs = [];
let allResults = [];

scenarios.forEach(scenario => {
  const results = [];
  for (let i = 0; i < SIMS_PER_SCENARIO; i++) {
    const result = simulateSeason(scenario);
    results.push(result);
    if (result.bugs.length > 0) {
      totalBugs.push({ scenario: scenario.name, bugs: result.bugs });
    }
  }
  allResults.push({ scenario, results });
  
  // Stats
  const avgSeasonTickets = Math.round(results.reduce((s, r) => s + r.seasonTickets, 0) / results.length);
  const avgOccupancy = (results.reduce((s, r) => s + parseFloat(r.occupancy), 0) / results.length).toFixed(1);
  const avgBalance = Math.round(results.reduce((s, r) => s + r.netBalance, 0) / results.length);
  const avgHomeInjuries = (results.reduce((s, r) => s + r.homeInjuries, 0) / results.length).toFixed(2);
  const avgAwayInjuries = (results.reduce((s, r) => s + r.awayInjuries, 0) / results.length).toFixed(2);
  const profitRate = (results.filter(r => r.profitable).length / results.length * 100).toFixed(0);
  const minBalance = Math.min(...results.map(r => r.netBalance));
  const maxBalance = Math.max(...results.map(r => r.netBalance));
  
  console.log(`\n📊 ${scenario.name}`);
  console.log(`  Estadio: ${results[0].stadiumName} (${results[0].capacity.toLocaleString()})`);
  console.log(`  Abonados: ${avgSeasonTickets.toLocaleString()} | Ocupación: ${avgOccupancy}%`);
  console.log(`  Balance: €${(avgBalance/1e6).toFixed(2)}M (${(minBalance/1e6).toFixed(2)}M - ${(maxBalance/1e6).toFixed(2)}M)`);
  console.log(`  Lesiones local: ${avgHomeInjuries}/temp | Visitante: ${avgAwayInjuries}/temp`);
  console.log(`  Rentable: ${profitRate}%`);
});

// === BUGS ===
console.log('\n' + '='.repeat(60));
console.log('🐛 BUGS ENCONTRADOS');
console.log('='.repeat(60));

if (totalBugs.length === 0) {
  console.log('✅ No se encontraron bugs en 600 simulaciones');
} else {
  console.log(`❌ ${totalBugs.length} simulaciones con bugs:`);
  const bugTypes = {};
  totalBugs.forEach(b => {
    b.bugs.forEach(bug => {
      bugTypes[bug] = (bugTypes[bug] || 0) + 1;
    });
  });
  Object.entries(bugTypes).forEach(([bug, count]) => {
    console.log(`  - ${bug}: ${count}x`);
  });
}

// === TEST CASOS EXTREMOS ===
console.log('\n' + '='.repeat(60));
console.log('🧪 TEST CASOS EXTREMOS');
console.log('='.repeat(60));

const extremeCases = [
  { name: 'Abono €100 (muy barato)', ...scenarios[3], seasonTicketPrice: 100 },
  { name: 'Abono €1500 (muy caro)', ...scenarios[3], seasonTicketPrice: 1500 },
  { name: 'Entrada €5', ...scenarios[3], ticketPrice: 5 },
  { name: 'Entrada €200', ...scenarios[3], ticketPrice: 200 },
  { name: 'Equipo pésimo (overall 50)', ...scenarios[0], teamOverall: 50, teamReputation: 20 },
  { name: 'Equipo top (overall 92)', ...scenarios[7], teamOverall: 92, teamReputation: 99 },
];

extremeCases.forEach(test => {
  const results = [];
  for (let i = 0; i < 50; i++) {
    results.push(simulateSeason(test));
  }
  
  const avgSeasonTickets = Math.round(results.reduce((s, r) => s + r.seasonTickets, 0) / results.length);
  const avgOccupancy = (results.reduce((s, r) => s + parseFloat(r.occupancy), 0) / results.length).toFixed(1);
  const avgBalance = Math.round(results.reduce((s, r) => s + r.netBalance, 0) / results.length);
  const hasBugs = results.some(r => r.bugs.length > 0);
  
  console.log(`\n${test.name}:`);
  console.log(`  Abonados: ${avgSeasonTickets.toLocaleString()} | Ocupación: ${avgOccupancy}%`);
  console.log(`  Balance: €${(avgBalance/1e6).toFixed(2)}M`);
  console.log(`  Bugs: ${hasBugs ? '❌ SÍ' : '✅ No'}`);
  
  if (hasBugs) {
    results.filter(r => r.bugs.length > 0).slice(0, 3).forEach(r => {
      console.log(`    - ${r.bugs.join(', ')}`);
    });
  }
});

// === TEST CÉSPED ===
console.log('\n' + '='.repeat(60));
console.log('🌱 TEST EFECTO CÉSPED EN LESIONES');
console.log('='.repeat(60));

function testGrassEffect(grassCondition) {
  const results = { homeInjuries: 0, awayInjuries: 0, matches: 0 };
  for (let i = 0; i < 1000; i++) {
    const grassPenalty = grassCondition < 100 ? (100 - grassCondition) / 100 : 0;
    const baseChance = 0.03;
    const homeChance = baseChance * (1 + grassPenalty);
    
    if (Math.random() < homeChance) results.homeInjuries++;
    if (Math.random() < baseChance) results.awayInjuries++;
    results.matches++;
  }
  return results;
}

[100, 70, 50, 30, 0].forEach(grass => {
  const r = testGrassEffect(grass);
  const homeRate = (r.homeInjuries / r.matches * 100).toFixed(1);
  const awayRate = (r.awayInjuries / r.matches * 100).toFixed(1);
  const diff = ((r.homeInjuries / r.awayInjuries - 1) * 100).toFixed(0);
  console.log(`  Césped ${grass}%: Local ${homeRate}% vs Visitante ${awayRate}% (local +${diff}%)`);
});

console.log('\n✅ Simulación completada\n');
