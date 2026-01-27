// Test del sistema de estadio - 20 simulaciones con diferentes equipos
import { LALIGA_TEAMS } from './src/data/teams.js';
import { initializeLeague, simulateMatch, updateTable, getWeekFixtures } from './src/game/leagueEngine.js';

// === CONFIGURACIÓN DEL ESTADIO ===
const STADIUM_ZONES = {
  fondo: { basePrice: 20, capacityRatio: 0.35 },
  lateral: { basePrice: 35, capacityRatio: 0.35 },
  tribuna: { basePrice: 60, capacityRatio: 0.20 },
  vip: { basePrice: 120, capacityRatio: 0.10 }
};

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 15000, maintenance: 80000 },
  { name: 'Moderno', capacity: 25000, maintenance: 180000 },
  { name: 'Grande', capacity: 45000, maintenance: 350000 },
  { name: 'Élite', capacity: 65000, maintenance: 550000 },
  { name: 'Legendario', capacity: 90000, maintenance: 800000 }
];

const SERVICES = {
  parking: { price: 8, penetration: 0.20 },
  food: { price: 8, penetration: 0.45 },
  merchandise: { price: 15, penetration: 0.10 },
  tour: { weeklyIncome: 4500 } // 300 visitantes * €15
};

const HOME_GAMES = 19;
const SEASON_TICKET_DISCOUNT = 0.35;

// === UTILIDADES ===
const formatMoney = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`;

// Determinar nivel de estadio según capacidad real del equipo
function getStadiumLevel(teamCapacity) {
  if (teamCapacity >= 70000) return 4;
  if (teamCapacity >= 50000) return 3;
  if (teamCapacity >= 35000) return 2;
  if (teamCapacity >= 20000) return 1;
  return 0;
}

// Calcular asistencia para un partido
function calculateMatchAttendance(homeTeam, awayTeam, stadiumLevel, ticketPrices, seasonTickets, leaguePosition) {
  const stadium = STADIUM_LEVELS[stadiumLevel];
  const capacity = stadium.capacity;
  
  // Capacidad por zona
  const zoneCapacity = {
    fondo: Math.floor(capacity * STADIUM_ZONES.fondo.capacityRatio),
    lateral: Math.floor(capacity * STADIUM_ZONES.lateral.capacityRatio),
    tribuna: Math.floor(capacity * STADIUM_ZONES.tribuna.capacityRatio),
    vip: Math.floor(capacity * STADIUM_ZONES.vip.capacityRatio)
  };
  
  // Factor de atracción del rival
  const rivalRep = awayTeam.reputation || 70;
  const rivalAttraction = Math.min(1.2, 0.6 + rivalRep / 100);
  
  // Top rivals (Madrid, Barça, Atleti) llenan más
  const isTopRival = ['real_madrid', 'barcelona', 'atletico_madrid'].includes(awayTeam.id);
  const topRivalBonus = isTopRival ? 1.25 : 1;
  
  // Factor de posición en liga
  const positionFactor = leaguePosition <= 4 ? 1.15 : leaguePosition <= 8 ? 1.05 : leaguePosition >= 17 ? 0.85 : 1;
  
  // Factor de precio
  const avgPriceRatio = (
    (ticketPrices.fondo / STADIUM_ZONES.fondo.basePrice) * 0.35 +
    (ticketPrices.lateral / STADIUM_ZONES.lateral.basePrice) * 0.35 +
    (ticketPrices.tribuna / STADIUM_ZONES.tribuna.basePrice) * 0.20 +
    (ticketPrices.vip / STADIUM_ZONES.vip.basePrice) * 0.10
  );
  const priceFactor = Math.max(0.5, 1.3 - avgPriceRatio * 0.35);
  
  // Reputación del equipo local
  const homeRepFactor = Math.min(1.2, 0.7 + (homeTeam.reputation || 70) / 120);
  
  // Calcular asistencia por zona
  const baseOccupancy = 0.60;
  const attendance = {};
  let totalAttendance = 0;
  let ticketIncome = 0;
  
  Object.entries(STADIUM_ZONES).forEach(([zone, config]) => {
    const zoneCap = zoneCapacity[zone];
    const abonados = seasonTickets[zone] || 0;
    const availableSeats = zoneCap - abonados;
    
    // Ocupación variable por zona (VIP menos sensible al rival)
    const zoneMultiplier = zone === 'vip' ? 0.9 : zone === 'tribuna' ? 0.95 : 1;
    const occupancy = Math.min(1, baseOccupancy * rivalAttraction * topRivalBonus * positionFactor * priceFactor * homeRepFactor * zoneMultiplier);
    
    const sold = Math.floor(availableSeats * occupancy);
    const zoneTotal = abonados + sold;
    
    attendance[zone] = {
      abonados,
      sold,
      total: zoneTotal,
      capacity: zoneCap,
      occupancy: Math.round((zoneTotal / zoneCap) * 100)
    };
    
    totalAttendance += zoneTotal;
    ticketIncome += sold * ticketPrices[zone]; // Solo entradas vendidas (abonados ya pagaron)
  });
  
  // Ingresos por servicios
  let serviceIncome = 0;
  serviceIncome += Math.floor(totalAttendance * SERVICES.parking.penetration * SERVICES.parking.price);
  serviceIncome += Math.floor(totalAttendance * SERVICES.food.penetration * SERVICES.food.price);
  serviceIncome += Math.floor(totalAttendance * SERVICES.merchandise.penetration * SERVICES.merchandise.price);
  
  return {
    attendance,
    totalAttendance,
    capacity,
    occupancyPercent: Math.round((totalAttendance / capacity) * 100),
    ticketIncome,
    serviceIncome,
    totalIncome: ticketIncome + serviceIncome,
    factors: { rivalAttraction, topRivalBonus, positionFactor, priceFactor, homeRepFactor }
  };
}

// Calcular ingresos por abonos
function calculateSeasonTicketIncome(seasonTickets, ticketPrices) {
  let total = 0;
  Object.entries(seasonTickets).forEach(([zone, count]) => {
    const fullPrice = ticketPrices[zone] * HOME_GAMES;
    const discounted = fullPrice * (1 - SEASON_TICKET_DISCOUNT);
    total += count * discounted;
  });
  return total;
}

// === SIMULACIÓN DE UNA TEMPORADA ===
function simulateSeason(teamId, verbose = false) {
  const team = LALIGA_TEAMS.find(t => t.id === teamId);
  if (!team) return null;
  
  // Configurar estadio según el equipo
  const stadiumLevel = getStadiumLevel(team.stadiumCapacity || 25000);
  const stadium = STADIUM_LEVELS[stadiumLevel];
  
  // Precios (equipos grandes pueden cobrar más)
  const priceMultiplier = team.reputation >= 85 ? 1.4 : team.reputation >= 75 ? 1.15 : 1;
  const ticketPrices = {
    fondo: Math.round(STADIUM_ZONES.fondo.basePrice * priceMultiplier),
    lateral: Math.round(STADIUM_ZONES.lateral.basePrice * priceMultiplier),
    tribuna: Math.round(STADIUM_ZONES.tribuna.basePrice * priceMultiplier),
    vip: Math.round(STADIUM_ZONES.vip.basePrice * priceMultiplier)
  };
  
  // Abonados (equipos con más afición tienen más abonados)
  const abonadosRatio = team.reputation >= 85 ? 0.6 : team.reputation >= 75 ? 0.45 : 0.35;
  const seasonTickets = {
    fondo: Math.floor(stadium.capacity * STADIUM_ZONES.fondo.capacityRatio * abonadosRatio),
    lateral: Math.floor(stadium.capacity * STADIUM_ZONES.lateral.capacityRatio * abonadosRatio),
    tribuna: Math.floor(stadium.capacity * STADIUM_ZONES.tribuna.capacityRatio * abonadosRatio * 0.8),
    vip: Math.floor(stadium.capacity * STADIUM_ZONES.vip.capacityRatio * abonadosRatio * 0.5)
  };
  
  const totalAbonados = Object.values(seasonTickets).reduce((a, b) => a + b, 0);
  const seasonTicketIncome = calculateSeasonTicketIncome(seasonTickets, ticketPrices);
  
  // Inicializar liga
  const { table, fixtures } = initializeLeague(LALIGA_TEAMS, teamId);
  let currentTable = table;
  let currentFixtures = fixtures;
  
  // Estadísticas de la temporada
  const seasonStats = {
    team: team.name,
    stadiumName: team.stadium || stadium.name,
    stadiumLevel,
    capacity: stadium.capacity,
    abonados: totalAbonados,
    seasonTicketIncome,
    matchIncomes: [],
    totalTicketIncome: seasonTicketIncome,
    totalServiceIncome: 0,
    tourIncome: SERVICES.tour.weeklyIncome * 38,
    maintenanceCost: stadium.maintenance * 38,
    homeMatches: 0,
    avgAttendance: 0,
    avgOccupancy: 0
  };
  
  // Simular 38 jornadas
  for (let week = 1; week <= 38; week++) {
    const weekFixtures = getWeekFixtures(currentFixtures, week);
    
    for (const fixture of weekFixtures) {
      if (fixture.played) continue;
      
      const homeTeam = LALIGA_TEAMS.find(t => t.id === fixture.homeTeam);
      const awayTeam = LALIGA_TEAMS.find(t => t.id === fixture.awayTeam);
      if (!homeTeam || !awayTeam) continue;
      
      // Simular partido
      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {});
      currentTable = updateTable(currentTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      
      const idx = currentFixtures.findIndex(f => f.id === fixture.id);
      if (idx >= 0) currentFixtures[idx] = { ...fixture, played: true };
      
      // Si es partido en casa del equipo testeado
      if (fixture.homeTeam === teamId) {
        const leaguePosition = currentTable.findIndex(t => t.teamId === teamId) + 1;
        const matchResult = calculateMatchAttendance(
          team, awayTeam, stadiumLevel, ticketPrices, seasonTickets, leaguePosition
        );
        
        seasonStats.matchIncomes.push({
          week,
          rival: awayTeam.shortName,
          attendance: matchResult.totalAttendance,
          occupancy: matchResult.occupancyPercent,
          ticketIncome: matchResult.ticketIncome,
          serviceIncome: matchResult.serviceIncome,
          total: matchResult.totalIncome
        });
        
        seasonStats.totalTicketIncome += matchResult.ticketIncome;
        seasonStats.totalServiceIncome += matchResult.serviceIncome;
        seasonStats.homeMatches++;
        
        if (verbose && matchResult.totalIncome > 2000000) {
          console.log(`  J${week} vs ${awayTeam.shortName}: ${matchResult.totalAttendance.toLocaleString()} (${matchResult.occupancyPercent}%) = ${formatMoney(matchResult.totalIncome)}`);
        }
      }
    }
  }
  
  // Calcular promedios
  if (seasonStats.matchIncomes.length > 0) {
    seasonStats.avgAttendance = Math.round(
      seasonStats.matchIncomes.reduce((sum, m) => sum + m.attendance, 0) / seasonStats.matchIncomes.length
    );
    seasonStats.avgOccupancy = Math.round(
      seasonStats.matchIncomes.reduce((sum, m) => sum + m.occupancy, 0) / seasonStats.matchIncomes.length
    );
  }
  
  // Totales
  seasonStats.grossIncome = seasonStats.totalTicketIncome + seasonStats.totalServiceIncome + seasonStats.tourIncome;
  seasonStats.netIncome = seasonStats.grossIncome - seasonStats.maintenanceCost;
  seasonStats.finalPosition = currentTable.findIndex(t => t.teamId === teamId) + 1;
  
  return seasonStats;
}

// === EJECUTAR SIMULACIONES ===
console.log('🏟️ TEST DEL SISTEMA DE ESTADIO - 20 SIMULACIONES');
console.log('═'.repeat(70));

const teamsToTest = [
  'real_madrid', 'barcelona', 'atletico_madrid',  // Grandes
  'sevilla', 'real_betis', 'villarreal', 'real_sociedad', 'athletic_club', // Medios-altos
  'valencia', 'celta', 'osasuna', 'rayo_vallecano', 'mallorca', // Medios
  'getafe', 'alaves', 'espanyol', 'las_palmas', 'leganes', 'valladolid', 'girona' // Pequeños
];

const results = [];

for (const teamId of teamsToTest) {
  const stats = simulateSeason(teamId, false);
  if (stats) {
    results.push(stats);
    
    console.log(`\n${stats.team}`);
    console.log(`  🏟️ ${stats.stadiumName} (${stats.capacity.toLocaleString()} asientos, Nv.${stats.stadiumLevel})`);
    console.log(`  📋 Abonados: ${stats.abonados.toLocaleString()} → ${formatMoney(stats.seasonTicketIncome)}`);
    console.log(`  🎫 Taquilla temporada: ${formatMoney(stats.totalTicketIncome)}`);
    console.log(`  🏪 Servicios: ${formatMoney(stats.totalServiceIncome)} | Tours: ${formatMoney(stats.tourIncome)}`);
    console.log(`  🔧 Mantenimiento: -${formatMoney(stats.maintenanceCost)}`);
    console.log(`  💰 NETO TEMPORADA: ${formatMoney(stats.netIncome)}`);
    console.log(`  📊 Media: ${stats.avgAttendance.toLocaleString()} (${stats.avgOccupancy}% ocupación) | Pos: ${stats.finalPosition}º`);
  }
}

// === RESUMEN ===
console.log('\n' + '═'.repeat(70));
console.log('📊 RESUMEN DE INGRESOS POR ESTADIO');
console.log('═'.repeat(70));

results.sort((a, b) => b.netIncome - a.netIncome);

console.log('\n🏆 RANKING POR INGRESOS NETOS:\n');
console.log('Equipo'.padEnd(22) + 'Capacidad'.padStart(10) + 'Abonados'.padStart(10) + 'Ingreso Neto'.padStart(14) + '  Pos');
console.log('-'.repeat(70));

results.forEach((r, i) => {
  console.log(
    `${(i + 1).toString().padStart(2)}. ${r.team.padEnd(18)} ${r.capacity.toLocaleString().padStart(10)} ${r.abonados.toLocaleString().padStart(10)} ${formatMoney(r.netIncome).padStart(14)}  ${r.finalPosition}º`
  );
});

// Estadísticas agregadas
const avgIncome = results.reduce((s, r) => s + r.netIncome, 0) / results.length;
const maxIncome = Math.max(...results.map(r => r.netIncome));
const minIncome = Math.min(...results.map(r => r.netIncome));
const avgOccupancy = Math.round(results.reduce((s, r) => s + r.avgOccupancy, 0) / results.length);

console.log('\n📈 ESTADÍSTICAS:');
console.log(`  Ingreso neto promedio: ${formatMoney(avgIncome)}`);
console.log(`  Máximo (${results[0].team}): ${formatMoney(maxIncome)}`);
console.log(`  Mínimo (${results[results.length - 1].team}): ${formatMoney(minIncome)}`);
console.log(`  Ocupación media: ${avgOccupancy}%`);
console.log(`  Ratio max/min: ${(maxIncome / minIncome).toFixed(1)}x`);

// Comparar con presupuestos
console.log('\n💰 COMPARACIÓN CON PRESUPUESTOS:');
results.slice(0, 5).forEach(r => {
  const team = LALIGA_TEAMS.find(t => t.name === r.team);
  const budget = team?.budget || 50000000;
  const ratio = ((r.netIncome / budget) * 100).toFixed(1);
  console.log(`  ${r.team}: ${formatMoney(r.netIncome)} = ${ratio}% del presupuesto (${formatMoney(budget)})`);
});

console.log('\n🎯 BALANCE:');
const balanced = results.filter(r => {
  const team = LALIGA_TEAMS.find(t => t.name === r.team);
  const budget = team?.budget || 50000000;
  const ratio = r.netIncome / budget;
  return ratio >= 0.15 && ratio <= 0.5; // Entre 15% y 50% del presupuesto
}).length;
console.log(`  Equipos con ingresos balanceados: ${balanced}/${results.length} (${Math.round(balanced/results.length*100)}%)`);

console.log('\n✅ Test completado');
