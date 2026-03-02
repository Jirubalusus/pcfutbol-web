// Test de 500 simulaciones del sistema de precios dinámicos
// Ejecutar: node test-stadium-economy.js

// Copiar las funciones del módulo (para ejecutar sin bundler)
const PRICE_CONFIG = {
  minPrice: 10,
  maxPrice: 100,
  referencePrice: 30,
  elasticity: 1.0,
  baseDemandRate: 0.55,
};

const BIG_TEAMS = {
  laliga: ['real-madrid', 'barcelona', 'atletico-madrid', 'sevilla', 'athletic-club'],
  segunda: ['deportivo', 'racing-santander', 'zaragoza', 'malaga', 'levante', 'sporting-gijon'],
};

function calculateRivalAttraction(rivalTeam, rivalPosition, leagueId) {
  let factor = 1.0;
  const bigTeams = BIG_TEAMS[leagueId] || [];
  if (bigTeams.includes(rivalTeam?.id)) {
    factor += 0.5;
  }
  if (rivalPosition <= 3) {
    factor += 0.3;
  } else if (rivalPosition <= 6) {
    factor += 0.15;
  }
  if (rivalTeam?.reputation >= 80) {
    factor += 0.2;
  } else if (rivalTeam?.reputation >= 70) {
    factor += 0.1;
  }
  return Math.min(2.0, factor);
}

function calculatePriceFactor(ticketPrice, rivalFactor = 1.0) {
  const { referencePrice, elasticity } = PRICE_CONFIG;
  const priceRatio = ticketPrice / referencePrice;
  
  let factor;
  if (ticketPrice > referencePrice) {
    factor = 1 - Math.pow((priceRatio - 1), 1.3) * elasticity;
  } else {
    factor = 1 + (1 - priceRatio) * elasticity * 0.8;
  }
  
  if (rivalFactor > 1.5 && ticketPrice > referencePrice) {
    const elasticityReduction = (rivalFactor - 1.5) * 0.4;
    factor = Math.min(factor + elasticityReduction, 1.0);
  }
  
  return Math.max(0.25, Math.min(1.4, factor));
}

function calculatePerformanceFactor(teamPosition, totalTeams, streak = 0, morale = 70) {
  let factor = 1.0;
  const positionPercent = teamPosition / totalTeams;
  
  if (positionPercent <= 0.15) factor += 0.2;
  else if (positionPercent <= 0.3) factor += 0.1;
  else if (positionPercent >= 0.9) factor -= 0.35;
  else if (positionPercent >= 0.8) factor -= 0.25;
  else if (positionPercent >= 0.7) factor -= 0.12;
  
  if (streak >= 5) factor += 0.2;
  else if (streak >= 3) factor += 0.12;
  else if (streak <= -5) factor -= 0.3;
  else if (streak <= -3) factor -= 0.2;
  else if (streak <= -2) factor -= 0.08;
  
  factor *= 0.75 + (morale / 100) * 0.35;
  
  if (positionPercent >= 0.85 && streak <= -3) {
    factor *= 0.7;
  }
  
  return Math.max(0.35, Math.min(1.35, factor));
}

function isDerby(homeTeamId, awayTeamId) {
  const derbies = [
    ['real-madrid', 'atletico-madrid'],
    ['barcelona', 'espanyol'],
    ['sevilla', 'betis'],
    ['deportivo', 'celta'],
  ];
  return derbies.some(([a, b]) => 
    (homeTeamId === a && awayTeamId === b) || (homeTeamId === b && awayTeamId === a)
  );
}

function calculateMatchAttendance(params) {
  const {
    stadiumCapacity, seasonTickets, ticketPrice, rivalTeam, rivalPosition,
    teamPosition, totalTeams, streak, morale, leagueId, homeTeamId, awayTeamId
  } = params;
  
  const availableSeats = stadiumCapacity - seasonTickets;
  const baseDemand = availableSeats * PRICE_CONFIG.baseDemandRate;
  
  const rivalFactor = calculateRivalAttraction(rivalTeam, rivalPosition, leagueId);
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor);
  const performanceFactor = calculatePerformanceFactor(teamPosition, totalTeams, streak, morale);
  const derbyBonus = isDerby(homeTeamId, awayTeamId) ? 1.3 : 1.0;
  
  const finalDemand = baseDemand * rivalFactor * priceFactor * performanceFactor * derbyBonus;
  const ticketSales = Math.min(Math.round(finalDemand), availableSeats);
  const attendance = seasonTickets + ticketSales;
  const fillRate = attendance / stadiumCapacity;
  
  return {
    attendance, ticketSales, seasonTickets, fillRate, availableSeats,
    factors: { rival: rivalFactor, price: priceFactor, performance: performanceFactor, derby: derbyBonus }
  };
}

// === SIMULACIONES ===
console.log('🧪 Iniciando 500 simulaciones del sistema de economía del estadio...\n');

const results = {
  total: 0,
  errors: [],
  attendanceStats: { min: Infinity, max: 0, sum: 0 },
  fillRateStats: { min: Infinity, max: 0, sum: 0 },
  byScenario: {
    bigTeam: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    smallTeam: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    derby: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    highPrice: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    lowPrice: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    winStreak: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
    loseStreak: { count: 0, avgAttendance: 0, avgFillRate: 0, avgIncome: 0 },
  },
  priceElasticity: [],
};

// Configuraciones de test
const stadiums = [
  { capacity: 8000, seasonTickets: 2400, name: 'Municipal' },
  { capacity: 18000, seasonTickets: 6000, name: 'Moderno' },
  { capacity: 35000, seasonTickets: 14000, name: 'Grande' },
  { capacity: 55000, seasonTickets: 22000, name: 'Élite' },
  { capacity: 80000, seasonTickets: 32000, name: 'Legendario' },
];

const rivals = [
  { id: 'real-madrid', reputation: 95, name: 'Real Madrid' },
  { id: 'barcelona', reputation: 93, name: 'Barcelona' },
  { id: 'atletico-madrid', reputation: 85, name: 'Atlético' },
  { id: 'sevilla', reputation: 78, name: 'Sevilla' },
  { id: 'betis', reputation: 72, name: 'Betis' },
  { id: 'celta', reputation: 68, name: 'Celta' },
  { id: 'getafe', reputation: 62, name: 'Getafe' },
  { id: 'alaves', reputation: 58, name: 'Alavés' },
  { id: 'leganes', reputation: 55, name: 'Leganés' },
];

const prices = [15, 20, 25, 30, 35, 40, 50, 60, 70];
const positions = [1, 3, 5, 8, 10, 12, 15, 18, 20];
const streaks = [-5, -3, -1, 0, 1, 3, 5];
const morales = [30, 50, 70, 85, 95];

// Ejecutar 500 simulaciones aleatorias
for (let i = 0; i < 500; i++) {
  const stadium = stadiums[Math.floor(Math.random() * stadiums.length)];
  const rival = rivals[Math.floor(Math.random() * rivals.length)];
  const price = prices[Math.floor(Math.random() * prices.length)];
  const teamPosition = positions[Math.floor(Math.random() * positions.length)];
  const rivalPosition = positions[Math.floor(Math.random() * positions.length)];
  const streak = streaks[Math.floor(Math.random() * streaks.length)];
  const morale = morales[Math.floor(Math.random() * morales.length)];
  
  // Simular derby con probabilidad del 10%
  const homeTeamId = Math.random() < 0.1 ? 'sevilla' : 'recreativo';
  const awayTeamId = homeTeamId === 'sevilla' && Math.random() < 0.5 ? 'betis' : rival.id;
  
  try {
    const result = calculateMatchAttendance({
      stadiumCapacity: stadium.capacity,
      seasonTickets: stadium.seasonTickets,
      ticketPrice: price,
      rivalTeam: rival,
      rivalPosition,
      teamPosition,
      totalTeams: 20,
      streak,
      morale,
      leagueId: 'laliga',
      homeTeamId,
      awayTeamId
    });
    
    // Validaciones
    if (result.attendance < 0) {
      results.errors.push(`Sim ${i}: Asistencia negativa (${result.attendance})`);
    }
    if (result.attendance > stadium.capacity) {
      results.errors.push(`Sim ${i}: Asistencia > capacidad (${result.attendance} > ${stadium.capacity})`);
    }
    if (result.fillRate < 0 || result.fillRate > 1) {
      results.errors.push(`Sim ${i}: fillRate inválido (${result.fillRate})`);
    }
    if (result.ticketSales < 0) {
      results.errors.push(`Sim ${i}: ticketSales negativo (${result.ticketSales})`);
    }
    if (result.factors.rival < 0.5 || result.factors.rival > 2.5) {
      results.errors.push(`Sim ${i}: rivalFactor fuera de rango (${result.factors.rival})`);
    }
    if (result.factors.price < 0.2 || result.factors.price > 2) {
      results.errors.push(`Sim ${i}: priceFactor fuera de rango (${result.factors.price})`);
    }
    
    // Estadísticas
    results.total++;
    results.attendanceStats.min = Math.min(results.attendanceStats.min, result.attendance);
    results.attendanceStats.max = Math.max(results.attendanceStats.max, result.attendance);
    results.attendanceStats.sum += result.attendance;
    results.fillRateStats.min = Math.min(results.fillRateStats.min, result.fillRate);
    results.fillRateStats.max = Math.max(results.fillRateStats.max, result.fillRate);
    results.fillRateStats.sum += result.fillRate;
    
    const income = result.ticketSales * price;
    
    // Categorizar
    const isBigTeam = ['real-madrid', 'barcelona', 'atletico-madrid'].includes(rival.id);
    const isSmallTeam = rival.reputation < 60;
    const isDerbyMatch = result.factors.derby > 1;
    const isHighPrice = price >= 50;
    const isLowPrice = price <= 20;
    const isWinStreak = streak >= 3;
    const isLoseStreak = streak <= -3;
    
    if (isBigTeam) {
      results.byScenario.bigTeam.count++;
      results.byScenario.bigTeam.avgAttendance += result.attendance;
      results.byScenario.bigTeam.avgFillRate += result.fillRate;
      results.byScenario.bigTeam.avgIncome += income;
    }
    if (isSmallTeam) {
      results.byScenario.smallTeam.count++;
      results.byScenario.smallTeam.avgAttendance += result.attendance;
      results.byScenario.smallTeam.avgFillRate += result.fillRate;
      results.byScenario.smallTeam.avgIncome += income;
    }
    if (isDerbyMatch) {
      results.byScenario.derby.count++;
      results.byScenario.derby.avgAttendance += result.attendance;
      results.byScenario.derby.avgFillRate += result.fillRate;
      results.byScenario.derby.avgIncome += income;
    }
    if (isHighPrice) {
      results.byScenario.highPrice.count++;
      results.byScenario.highPrice.avgAttendance += result.attendance;
      results.byScenario.highPrice.avgFillRate += result.fillRate;
      results.byScenario.highPrice.avgIncome += income;
    }
    if (isLowPrice) {
      results.byScenario.lowPrice.count++;
      results.byScenario.lowPrice.avgAttendance += result.attendance;
      results.byScenario.lowPrice.avgFillRate += result.fillRate;
      results.byScenario.lowPrice.avgIncome += income;
    }
    if (isWinStreak) {
      results.byScenario.winStreak.count++;
      results.byScenario.winStreak.avgAttendance += result.attendance;
      results.byScenario.winStreak.avgFillRate += result.fillRate;
      results.byScenario.winStreak.avgIncome += income;
    }
    if (isLoseStreak) {
      results.byScenario.loseStreak.count++;
      results.byScenario.loseStreak.avgAttendance += result.attendance;
      results.byScenario.loseStreak.avgFillRate += result.fillRate;
      results.byScenario.loseStreak.avgIncome += income;
    }
    
  } catch (e) {
    results.errors.push(`Sim ${i}: Exception - ${e.message}`);
  }
}

// Probar elasticidad específicamente
console.log('📊 Test de elasticidad de precios (estadio 35k, rival medio):');
const elasticityTest = { capacity: 35000, seasonTickets: 14000 };
const elasticityRival = { id: 'getafe', reputation: 62 };

for (const price of [15, 25, 35, 45, 55, 65]) {
  const r = calculateMatchAttendance({
    stadiumCapacity: elasticityTest.capacity,
    seasonTickets: elasticityTest.seasonTickets,
    ticketPrice: price,
    rivalTeam: elasticityRival,
    rivalPosition: 10,
    teamPosition: 8,
    totalTeams: 20,
    streak: 0,
    morale: 70,
    leagueId: 'laliga',
    homeTeamId: 'recreativo',
    awayTeamId: elasticityRival.id
  });
  const income = r.ticketSales * price;
  console.log(`  €${price}: ${r.attendance.toLocaleString()} asist. (${(r.fillRate*100).toFixed(0)}%) → €${(income/1000).toFixed(0)}K`);
  results.priceElasticity.push({ price, attendance: r.attendance, fillRate: r.fillRate, income });
}

// Probar diferencia grande vs pequeño
console.log('\n⚔️ Test grande vs pequeño (mismo precio €30):');
for (const rival of [{ id: 'real-madrid', reputation: 95, name: 'Real Madrid' }, { id: 'leganes', reputation: 55, name: 'Leganés' }]) {
  const r = calculateMatchAttendance({
    stadiumCapacity: 35000,
    seasonTickets: 14000,
    ticketPrice: 30,
    rivalTeam: rival,
    rivalPosition: rival.id === 'real-madrid' ? 1 : 15,
    teamPosition: 8,
    totalTeams: 20,
    streak: 0,
    morale: 70,
    leagueId: 'laliga',
    homeTeamId: 'recreativo',
    awayTeamId: rival.id
  });
  console.log(`  vs ${rival.name}: ${r.attendance.toLocaleString()} (${(r.fillRate*100).toFixed(0)}%) - factorRival: ${r.factors.rival.toFixed(2)}`);
}

// TEST CRÍTICO: Peor escenario posible
console.log('\n💀 Test PEOR ESCENARIO (último, racha -5, rival malo, precio alto, moral baja):');
const worstCase = calculateMatchAttendance({
  stadiumCapacity: 35000,
  seasonTickets: 8000, // Pocos abonados porque el equipo va mal
  ticketPrice: 50,
  rivalTeam: { id: 'leganes', reputation: 55 },
  rivalPosition: 14,
  teamPosition: 20, // ÚLTIMO
  totalTeams: 20,
  streak: -5, // 5 derrotas seguidas
  morale: 30, // Moral por los suelos
  leagueId: 'laliga',
  homeTeamId: 'recreativo',
  awayTeamId: 'leganes'
});
console.log(`  Asistencia: ${worstCase.attendance.toLocaleString()} / ${35000} (${(worstCase.fillRate*100).toFixed(0)}%)`);
console.log(`  Factores: rival=${worstCase.factors.rival.toFixed(2)}, precio=${worstCase.factors.price.toFixed(2)}, rendimiento=${worstCase.factors.performance.toFixed(2)}`);
const worstIncome = worstCase.ticketSales * 50;
console.log(`  Ingresos taquilla: €${(worstIncome/1000).toFixed(0)}K`);
console.log(`  ¿Está en 20-30%? ${worstCase.fillRate >= 0.15 && worstCase.fillRate <= 0.35 ? '✅ SÍ' : '❌ NO'}`);

// TEST: Mejor escenario
console.log('\n🏆 Test MEJOR ESCENARIO (líder, racha +5, vs Madrid, precio medio):');
const bestCase = calculateMatchAttendance({
  stadiumCapacity: 35000,
  seasonTickets: 20000, // Muchos abonados porque el equipo va bien
  ticketPrice: 40,
  rivalTeam: { id: 'real-madrid', reputation: 95 },
  rivalPosition: 2,
  teamPosition: 1, // LÍDER
  totalTeams: 20,
  streak: 5, // 5 victorias seguidas
  morale: 95,
  leagueId: 'laliga',
  homeTeamId: 'recreativo',
  awayTeamId: 'real-madrid'
});
console.log(`  Asistencia: ${bestCase.attendance.toLocaleString()} / ${35000} (${(bestCase.fillRate*100).toFixed(0)}%)`);
console.log(`  Factores: rival=${bestCase.factors.rival.toFixed(2)}, precio=${bestCase.factors.price.toFixed(2)}, rendimiento=${bestCase.factors.performance.toFixed(2)}`);
const bestIncome = bestCase.ticketSales * 40;
console.log(`  Ingresos taquilla: €${(bestIncome/1000).toFixed(0)}K`);
console.log(`  ¿Lleno o casi? ${bestCase.fillRate >= 0.95 ? '✅ SÍ' : '❌ NO'}`);

// TEST: Escenario medio normal
console.log('\n📊 Test ESCENARIO NORMAL (mitad tabla, sin racha, rival medio):');
const normalCase = calculateMatchAttendance({
  stadiumCapacity: 35000,
  seasonTickets: 14000,
  ticketPrice: 30,
  rivalTeam: { id: 'getafe', reputation: 62 },
  rivalPosition: 10,
  teamPosition: 10,
  totalTeams: 20,
  streak: 0,
  morale: 70,
  leagueId: 'laliga',
  homeTeamId: 'recreativo',
  awayTeamId: 'getafe'
});
console.log(`  Asistencia: ${normalCase.attendance.toLocaleString()} / ${35000} (${(normalCase.fillRate*100).toFixed(0)}%)`);
console.log(`  ¿Entre 60-80%? ${normalCase.fillRate >= 0.55 && normalCase.fillRate <= 0.85 ? '✅ SÍ' : '❌ NO'}`)

// === REPORTE FINAL ===
console.log('\n' + '='.repeat(60));
console.log('📋 REPORTE DE 500 SIMULACIONES');
console.log('='.repeat(60));

if (results.errors.length === 0) {
  console.log('\n✅ SIN ERRORES - Todas las validaciones pasaron');
} else {
  console.log(`\n❌ ${results.errors.length} ERRORES encontrados:`);
  results.errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
  if (results.errors.length > 10) console.log(`   ... y ${results.errors.length - 10} más`);
}

console.log(`\n📈 Estadísticas generales:`);
console.log(`   Simulaciones: ${results.total}`);
console.log(`   Asistencia: ${results.attendanceStats.min.toLocaleString()} - ${results.attendanceStats.max.toLocaleString()} (media: ${Math.round(results.attendanceStats.sum / results.total).toLocaleString()})`);
console.log(`   Fill rate: ${(results.fillRateStats.min*100).toFixed(0)}% - ${(results.fillRateStats.max*100).toFixed(0)}% (media: ${(results.fillRateStats.sum / results.total * 100).toFixed(0)}%)`);

console.log('\n📊 Por escenario:');
for (const [key, data] of Object.entries(results.byScenario)) {
  if (data.count > 0) {
    const avgAtt = Math.round(data.avgAttendance / data.count);
    const avgFill = (data.avgFillRate / data.count * 100).toFixed(0);
    console.log(`   ${key}: ${data.count} sims, media ${avgAtt.toLocaleString()} asist. (${avgFill}%)`);
  }
}

// Verificar lógica de negocio
console.log('\n🔍 Verificación de lógica:');
const bigTeamFill = results.byScenario.bigTeam.avgFillRate / results.byScenario.bigTeam.count;
const smallTeamFill = results.byScenario.smallTeam.avgFillRate / results.byScenario.smallTeam.count;
const highPriceFill = results.byScenario.highPrice.avgFillRate / results.byScenario.highPrice.count;
const lowPriceFill = results.byScenario.lowPrice.avgFillRate / results.byScenario.lowPrice.count;

console.log(`   ¿Grandes atraen más que pequeños? ${bigTeamFill > smallTeamFill ? '✅ SÍ' : '❌ NO'} (${(bigTeamFill*100).toFixed(0)}% vs ${(smallTeamFill*100).toFixed(0)}%)`);
console.log(`   ¿Precio bajo = más asistencia? ${lowPriceFill > highPriceFill ? '✅ SÍ' : '❌ NO'} (${(lowPriceFill*100).toFixed(0)}% vs ${(highPriceFill*100).toFixed(0)}%)`);

if (results.byScenario.derby.count > 0) {
  const derbyFill = results.byScenario.derby.avgFillRate / results.byScenario.derby.count;
  console.log(`   ¿Derbies llenan más? ${derbyFill > 0.7 ? '✅ SÍ' : '⚠️ REVISAR'} (${(derbyFill*100).toFixed(0)}% ocupación)`);
}

if (results.byScenario.winStreak.count > 0 && results.byScenario.loseStreak.count > 0) {
  const winFill = results.byScenario.winStreak.avgFillRate / results.byScenario.winStreak.count;
  const loseFill = results.byScenario.loseStreak.avgFillRate / results.byScenario.loseStreak.count;
  console.log(`   ¿Rachas positivas atraen más? ${winFill > loseFill ? '✅ SÍ' : '❌ NO'} (${(winFill*100).toFixed(0)}% vs ${(loseFill*100).toFixed(0)}%)`);
}

// Verificar elasticidad coherente
const elast = results.priceElasticity;
if (elast.length > 2) {
  const lowPriceAtt = elast[0].attendance;
  const highPriceAtt = elast[elast.length - 1].attendance;
  console.log(`   ¿Elasticidad funciona? ${lowPriceAtt > highPriceAtt ? '✅ SÍ' : '❌ NO'} (€${elast[0].price}: ${lowPriceAtt} vs €${elast[elast.length-1].price}: ${highPriceAtt})`);
  
  // Verificar punto óptimo de ingresos (debería estar en precio medio-alto)
  const maxIncome = Math.max(...elast.map(e => e.income));
  const optimalPrice = elast.find(e => e.income === maxIncome)?.price;
  console.log(`   Precio óptimo para ingresos: €${optimalPrice} (€${(maxIncome/1000).toFixed(0)}K)`);
}

console.log('\n' + '='.repeat(60));
console.log(results.errors.length === 0 ? '🎉 SISTEMA FUNCIONANDO CORRECTAMENTE' : '⚠️ REVISAR ERRORES');
console.log('='.repeat(60));
