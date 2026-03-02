/**
 * Simulación de 500 temporadas para testear balance del estadio
 * Ejecutar: node test-stadium-simulation.js
 */

// === CONFIGURACIÓN (copiada de stadiumEconomy.js) ===
const PRICE_CONFIG = {
  minPrice: 10,
  maxPrice: 100,
  referencePrice: 30,
  elasticity: 1.0,
  baseDemandRate: 0.55,
};

const HOME_GAMES_PER_SEASON = 19;

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000, prestige: 1 },
  { name: 'Moderno', capacity: 18000, maintenance: 120000, prestige: 2 },
  { name: 'Grande', capacity: 35000, maintenance: 280000, prestige: 3 },
  { name: 'Élite', capacity: 55000, maintenance: 450000, prestige: 4 },
  { name: 'Legendario', capacity: 80000, maintenance: 700000, prestige: 5 }
];

// === FUNCIONES DE SIMULACIÓN ===

function calculateSeasonTickets({ capacity, seasonTicketPrice, teamOverall, leaguePosition, totalTeams, teamReputation }) {
  const maxSeasonTickets = Math.floor(capacity * 0.8);
  
  // Base según overall del equipo
  const overallFactor = 0.25 + (teamOverall / 100) * 0.55;
  
  // Factor precio del abono
  const referenceSeasonPrice = 500;
  const priceFactor = Math.max(0.5, Math.min(1.5, referenceSeasonPrice / seasonTicketPrice));
  
  // Factor posición actual
  const positionRatio = (totalTeams - leaguePosition + 1) / totalTeams;
  const positionFactor = 0.7 + (positionRatio * 0.4);
  
  // Factor reputación
  const reputationFactor = 0.8 + (teamReputation / 100) * 0.4;
  
  const baseTickets = maxSeasonTickets * overallFactor;
  const finalTickets = baseTickets * priceFactor * positionFactor * reputationFactor;
  
  return Math.max(100, Math.min(maxSeasonTickets, Math.round(finalTickets)));
}

function calculatePriceFactor(ticketPrice, rivalFactor = 1.0) {
  const referencePrice = 30;
  const priceRatio = ticketPrice / referencePrice;
  
  let factor;
  if (ticketPrice <= referencePrice) {
    factor = 1 + (1 - priceRatio) * 0.6;
  } else {
    // Penalización exponencial para precios altos
    factor = Math.pow(referencePrice / ticketPrice, 1.8);
  }
  
  if (rivalFactor > 1.5 && ticketPrice > referencePrice) {
    factor = Math.min(factor + (rivalFactor - 1.5) * 0.3, 0.9);
  }
  
  return Math.max(0.02, Math.min(1.4, factor));
}

function calculateMatchAttendance({ capacity, seasonTickets, ticketPrice, rivalFactor, morale }) {
  const availableSeats = capacity - seasonTickets;
  
  // Factor de precio (exponencial para precios altos)
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor);
  
  // Demanda de no-abonados
  let demand = availableSeats * PRICE_CONFIG.baseDemandRate * priceFactor;
  demand *= rivalFactor;
  demand *= (0.8 + (morale / 100) * 0.4);
  
  // Ruido aleatorio
  const noise = 0.9 + Math.random() * 0.2;
  demand *= noise;
  
  const nonSeasonAttendance = Math.min(availableSeats, Math.max(0, Math.round(demand)));
  
  // Abonados: 85-95% asisten (ya pagaron)
  const seasonAttendance = Math.round(seasonTickets * (0.85 + Math.random() * 0.10));
  
  return {
    seasonTicketAttendance: seasonAttendance,
    nonSeasonAttendance,
    total: seasonAttendance + nonSeasonAttendance
  };
}

function calculateMatchIncome({ attendance, ticketPrice, seasonTickets }) {
  // Abonados ya pagaron, solo cuentan las entradas sueltas
  const ticketIncome = (attendance.total - attendance.seasonTicketAttendance) * ticketPrice;
  
  // Ingresos adicionales (comida, merch, parking) - €5-15 por persona
  const extraIncome = attendance.total * (5 + Math.random() * 10);
  
  return Math.round(ticketIncome + extraIncome);
}

function simulateSeason(config) {
  const { stadiumLevel, teamOverall, teamReputation, seasonTicketPrice, ticketPrice, leaguePosition } = config;
  
  const stadium = STADIUM_LEVELS[stadiumLevel];
  const capacity = stadium.capacity;
  const totalTeams = 20;
  
  // Calcular abonados al inicio de temporada
  const seasonTickets = calculateSeasonTickets({
    capacity,
    seasonTicketPrice,
    teamOverall,
    leaguePosition,
    totalTeams,
    teamReputation
  });
  
  // Ingresos por abonos (pago único al inicio)
  const seasonTicketIncome = seasonTickets * seasonTicketPrice;
  
  // Simular 19 partidos en casa
  let totalMatchIncome = 0;
  let totalAttendance = 0;
  const matchResults = [];
  
  for (let match = 0; match < HOME_GAMES_PER_SEASON; match++) {
    // Rival factor: algunos partidos son más atractivos
    const isTopMatch = Math.random() < 0.2; // 20% partidos grandes
    const rivalFactor = isTopMatch ? (1.3 + Math.random() * 0.4) : (0.8 + Math.random() * 0.4);
    
    // Moral varía durante la temporada
    const morale = 50 + Math.random() * 50;
    
    const attendance = calculateMatchAttendance({
      capacity,
      seasonTickets,
      ticketPrice,
      rivalFactor,
      morale
    });
    
    const matchIncome = calculateMatchIncome({
      attendance,
      ticketPrice,
      seasonTickets
    });
    
    totalMatchIncome += matchIncome;
    totalAttendance += attendance.total;
    matchResults.push({ attendance: attendance.total, income: matchIncome });
  }
  
  // Costes anuales
  const maintenanceCost = stadium.maintenance * 52; // Semanal * 52
  
  // Balance final
  const totalIncome = seasonTicketIncome + totalMatchIncome;
  const netBalance = totalIncome - maintenanceCost;
  
  return {
    stadiumName: stadium.name,
    capacity,
    seasonTickets,
    seasonTicketIncome,
    totalMatchIncome,
    avgAttendance: Math.round(totalAttendance / HOME_GAMES_PER_SEASON),
    avgOccupancy: ((totalAttendance / HOME_GAMES_PER_SEASON) / capacity * 100).toFixed(1),
    maintenanceCost,
    totalIncome,
    netBalance,
    profitable: netBalance > 0
  };
}

// === EJECUTAR SIMULACIONES ===
console.log('🏟️ Simulación de Estadio - 500 temporadas\n');
console.log('='.repeat(60));

const scenarios = [
  { name: '2ªRFEF - Equipo bajo', stadiumLevel: 0, teamOverall: 62, teamReputation: 40, seasonTicketPrice: 200, ticketPrice: 15, leaguePosition: 12 },
  { name: '2ªRFEF - Equipo top', stadiumLevel: 0, teamOverall: 68, teamReputation: 55, seasonTicketPrice: 250, ticketPrice: 20, leaguePosition: 3 },
  { name: '1ªRFEF - Medio', stadiumLevel: 1, teamOverall: 70, teamReputation: 60, seasonTicketPrice: 350, ticketPrice: 25, leaguePosition: 10 },
  { name: 'Segunda - Medio', stadiumLevel: 2, teamOverall: 74, teamReputation: 70, seasonTicketPrice: 400, ticketPrice: 30, leaguePosition: 10 },
  { name: 'Segunda - Top', stadiumLevel: 2, teamOverall: 78, teamReputation: 80, seasonTicketPrice: 500, ticketPrice: 40, leaguePosition: 2 },
  { name: 'LaLiga - Bajo', stadiumLevel: 3, teamOverall: 76, teamReputation: 75, seasonTicketPrice: 600, ticketPrice: 50, leaguePosition: 15 },
  { name: 'LaLiga - Medio', stadiumLevel: 3, teamOverall: 80, teamReputation: 85, seasonTicketPrice: 700, ticketPrice: 60, leaguePosition: 8 },
  { name: 'LaLiga - Top', stadiumLevel: 4, teamOverall: 85, teamReputation: 95, seasonTicketPrice: 900, ticketPrice: 80, leaguePosition: 2 },
];

const SIMULATIONS_PER_SCENARIO = Math.floor(500 / scenarios.length);

scenarios.forEach(scenario => {
  console.log(`\n📊 ${scenario.name}`);
  console.log('-'.repeat(40));
  
  const results = [];
  for (let i = 0; i < SIMULATIONS_PER_SCENARIO; i++) {
    results.push(simulateSeason(scenario));
  }
  
  // Estadísticas
  const avgSeasonTickets = Math.round(results.reduce((s, r) => s + r.seasonTickets, 0) / results.length);
  const avgAttendance = Math.round(results.reduce((s, r) => s + r.avgAttendance, 0) / results.length);
  const avgOccupancy = (results.reduce((s, r) => s + parseFloat(r.avgOccupancy), 0) / results.length).toFixed(1);
  const avgIncome = Math.round(results.reduce((s, r) => s + r.totalIncome, 0) / results.length);
  const avgBalance = Math.round(results.reduce((s, r) => s + r.netBalance, 0) / results.length);
  const profitableRate = (results.filter(r => r.profitable).length / results.length * 100).toFixed(0);
  
  const minBalance = Math.min(...results.map(r => r.netBalance));
  const maxBalance = Math.max(...results.map(r => r.netBalance));
  
  console.log(`  Estadio: ${results[0].stadiumName} (${results[0].capacity.toLocaleString()} plazas)`);
  console.log(`  Abonados: ${avgSeasonTickets.toLocaleString()} (${(avgSeasonTickets/results[0].capacity*100).toFixed(0)}% capacidad)`);
  console.log(`  Asistencia media: ${avgAttendance.toLocaleString()} (${avgOccupancy}% ocupación)`);
  console.log(`  Ingresos anuales: €${(avgIncome/1000000).toFixed(2)}M`);
  console.log(`  Mantenimiento: €${(results[0].maintenanceCost/1000000).toFixed(2)}M`);
  console.log(`  Balance neto: €${(avgBalance/1000000).toFixed(2)}M`);
  console.log(`  Rango balance: €${(minBalance/1000000).toFixed(2)}M a €${(maxBalance/1000000).toFixed(2)}M`);
  console.log(`  Rentable: ${profitableRate}% de temporadas`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Simulación completada');

// Test de precios extremos
console.log('\n\n🧪 TEST DE PRECIOS EXTREMOS');
console.log('='.repeat(60));

const extremeTests = [
  { name: 'Abono muy barato (€150)', seasonTicketPrice: 150, ticketPrice: 30 },
  { name: 'Abono muy caro (€800)', seasonTicketPrice: 800, ticketPrice: 30 },
  { name: 'Entrada muy barata (€10)', seasonTicketPrice: 400, ticketPrice: 10 },
  { name: 'Entrada cara (€60)', seasonTicketPrice: 400, ticketPrice: 60 },
  { name: 'Entrada muy cara (€100)', seasonTicketPrice: 400, ticketPrice: 100 },
  { name: 'Entrada absurda (€200)', seasonTicketPrice: 400, ticketPrice: 200 },
];

const baseConfig = { stadiumLevel: 2, teamOverall: 74, teamReputation: 70, leaguePosition: 10 };

extremeTests.forEach(test => {
  const config = { ...baseConfig, ...test };
  
  // Una simulación detallada
  const stadium = STADIUM_LEVELS[config.stadiumLevel];
  const seasonTickets = calculateSeasonTickets({
    capacity: stadium.capacity,
    seasonTicketPrice: config.seasonTicketPrice,
    teamOverall: config.teamOverall,
    leaguePosition: config.leaguePosition,
    totalTeams: 20,
    teamReputation: config.teamReputation
  });
  
  // Simular un partido
  const attendance = calculateMatchAttendance({
    capacity: stadium.capacity,
    seasonTickets,
    ticketPrice: config.ticketPrice,
    rivalFactor: 1.0,
    morale: 70
  });
  
  const priceFactor = calculatePriceFactor(config.ticketPrice, 1.0);
  
  console.log(`\n${test.name}:`);
  console.log(`  Abonados: ${seasonTickets.toLocaleString()} (asisten: ${attendance.seasonTicketAttendance.toLocaleString()})`);
  console.log(`  Taquilla: ${attendance.nonSeasonAttendance.toLocaleString()} (factor precio: ${(priceFactor*100).toFixed(0)}%)`);
  console.log(`  Total: ${attendance.total.toLocaleString()} / ${stadium.capacity.toLocaleString()} (${(attendance.total/stadium.capacity*100).toFixed(0)}%)`);
});

console.log('\n');
