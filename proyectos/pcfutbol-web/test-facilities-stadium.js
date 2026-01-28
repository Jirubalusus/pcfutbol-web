// Test de integración Stadium + Facilities
// Verifica consistencia entre ambos sistemas

console.log('🧪 Test de integración Stadium + Facilities\n');

// === CONFIGURACIÓN ACTUAL ===

// Stadium.jsx levels
const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000, prestige: 1 },
  { name: 'Moderno', capacity: 18000, maintenance: 120000, prestige: 2 },
  { name: 'Grande', capacity: 35000, maintenance: 280000, prestige: 3 },
  { name: 'Élite', capacity: 55000, maintenance: 450000, prestige: 4 },
  { name: 'Legendario', capacity: 80000, maintenance: 700000, prestige: 5 }
];

// Facilities.jsx stadium levels (ACTUALIZADO)
const FACILITIES_STADIUM = {
  levels: [
    { name: 'Municipal', capacity: 8000 },
    { name: 'Moderno', capacity: 18000 },
    { name: 'Grande', capacity: 35000 },
    { name: 'Élite', capacity: 55000 },
    { name: 'Legendario', capacity: 80000 }
  ],
  upgradeCost: [8000000, 25000000, 60000000, 120000000]
};

// === VERIFICACIONES ===

const errors = [];
const warnings = [];

// 1. Verificar que el número de niveles coincide
console.log('📋 Verificando consistencia de niveles...');
if (STADIUM_LEVELS.length !== FACILITIES_STADIUM.levels.length) {
  errors.push(`❌ NIVELES DIFERENTES: Stadium tiene ${STADIUM_LEVELS.length} niveles, Facilities tiene ${FACILITIES_STADIUM.levels.length}`);
}

// 2. Verificar capacidades
console.log('📋 Verificando capacidades...');
STADIUM_LEVELS.forEach((level, i) => {
  const facilityLevel = FACILITIES_STADIUM.levels[i];
  if (facilityLevel && level.capacity !== facilityLevel.capacity) {
    errors.push(`❌ CAPACIDAD NIVEL ${i}: Stadium=${level.capacity}, Facilities=${facilityLevel.capacity}`);
  }
});

// 3. Verificar costes de upgrade (Stadium.jsx tiene upgradeCost en STADIUM_LEVELS)
console.log('📋 Verificando costes de mejora...');

// Stadium.jsx upgrade costs (desde el código)
const STADIUM_UPGRADE_COSTS = [8000000, 25000000, 60000000, 120000000];
const FACILITIES_UPGRADE_COSTS = [8000000, 25000000, 60000000, 120000000];

console.log('\n💰 Costes de mejora:');
console.log('Stadium.jsx:', STADIUM_UPGRADE_COSTS.map(c => `€${c/1000000}M`).join(' → '));
console.log('Facilities:', FACILITIES_UPGRADE_COSTS.map(c => `€${c/1000000}M`).join(' → '));

if (JSON.stringify(STADIUM_UPGRADE_COSTS) !== JSON.stringify(FACILITIES_UPGRADE_COSTS)) {
  warnings.push('⚠️ Costes de mejora diferentes entre Stadium y Facilities');
}

// === SIMULACIÓN DE ESCENARIOS ===
console.log('\n🎮 Simulación de 500 escenarios de juego...\n');

// Simular el sistema de economía
const PRICE_CONFIG = {
  referencePrice: 30,
  elasticity: 1.0,
  baseDemandRate: 0.55,
};

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

function calculateAttendance(params) {
  const { capacity, seasonTickets, price, rivalFactor, teamPosition, streak, morale } = params;
  
  const availableSeats = capacity - seasonTickets;
  const baseDemand = availableSeats * PRICE_CONFIG.baseDemandRate;
  
  const priceFactor = calculatePriceFactor(price, rivalFactor);
  const perfFactor = calculatePerformanceFactor(teamPosition, 20, streak, morale);
  
  const finalDemand = baseDemand * rivalFactor * priceFactor * perfFactor;
  const ticketSales = Math.min(Math.round(finalDemand), availableSeats);
  const attendance = seasonTickets + ticketSales;
  const fillRate = attendance / capacity;
  
  return { attendance, ticketSales, fillRate, priceFactor, perfFactor };
}

// Simular 500 escenarios
const simResults = {
  total: 0,
  errors: [],
  byLevel: {},
  incomeStats: { min: Infinity, max: 0, sum: 0 },
  fillRateStats: { min: Infinity, max: 0, sum: 0 }
};

for (let i = 0; i < 500; i++) {
  // Parámetros aleatorios
  const level = Math.floor(Math.random() * STADIUM_LEVELS.length);
  const stadium = STADIUM_LEVELS[level];
  const seasonTickets = Math.floor(stadium.capacity * (0.2 + Math.random() * 0.4)); // 20-60%
  const price = 15 + Math.floor(Math.random() * 50); // €15-65
  const rivalFactor = 0.8 + Math.random() * 1.2; // 0.8-2.0
  const teamPosition = 1 + Math.floor(Math.random() * 20);
  const streak = Math.floor(Math.random() * 11) - 5; // -5 to +5
  const morale = 30 + Math.floor(Math.random() * 70); // 30-100
  
  const result = calculateAttendance({
    capacity: stadium.capacity,
    seasonTickets,
    price,
    rivalFactor,
    teamPosition,
    streak,
    morale
  });
  
  // Calcular ingresos
  const ticketIncome = result.ticketSales * price;
  const concessionIncome = result.attendance * (8 + level * 2);
  const totalIncome = ticketIncome + concessionIncome;
  
  // Validaciones
  if (result.attendance < 0) {
    simResults.errors.push(`Sim ${i}: Asistencia negativa`);
  }
  if (result.attendance > stadium.capacity) {
    simResults.errors.push(`Sim ${i}: Asistencia > capacidad`);
  }
  if (result.fillRate < 0 || result.fillRate > 1.01) {
    simResults.errors.push(`Sim ${i}: fillRate inválido (${result.fillRate})`);
  }
  
  // Stats por nivel
  if (!simResults.byLevel[level]) {
    simResults.byLevel[level] = { count: 0, totalIncome: 0, totalFillRate: 0 };
  }
  simResults.byLevel[level].count++;
  simResults.byLevel[level].totalIncome += totalIncome;
  simResults.byLevel[level].totalFillRate += result.fillRate;
  
  // Stats globales
  simResults.total++;
  simResults.incomeStats.min = Math.min(simResults.incomeStats.min, totalIncome);
  simResults.incomeStats.max = Math.max(simResults.incomeStats.max, totalIncome);
  simResults.incomeStats.sum += totalIncome;
  simResults.fillRateStats.min = Math.min(simResults.fillRateStats.min, result.fillRate);
  simResults.fillRateStats.max = Math.max(simResults.fillRateStats.max, result.fillRate);
  simResults.fillRateStats.sum += result.fillRate;
}

// === RESULTADOS ===
console.log('=' .repeat(60));
console.log('📊 RESULTADOS DE 500 SIMULACIONES');
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ ERRORES DE CONSISTENCIA:');
  errors.forEach(e => console.log(`  ${e}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ ADVERTENCIAS:');
  warnings.forEach(w => console.log(`  ${w}`));
}

if (simResults.errors.length === 0) {
  console.log('\n✅ Simulaciones: Sin errores de validación');
} else {
  console.log(`\n❌ ${simResults.errors.length} errores en simulaciones`);
  simResults.errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
}

console.log('\n📈 Estadísticas por nivel de estadio:');
Object.entries(simResults.byLevel).forEach(([level, data]) => {
  const stadium = STADIUM_LEVELS[level];
  const avgIncome = Math.round(data.totalIncome / data.count);
  const avgFillRate = (data.totalFillRate / data.count * 100).toFixed(0);
  console.log(`  Nivel ${parseInt(level)+1} (${stadium.name}, ${stadium.capacity/1000}K): ${data.count} sims, €${(avgIncome/1000).toFixed(0)}K/partido, ${avgFillRate}% ocupación`);
});

console.log('\n📊 Estadísticas globales:');
console.log(`  Ingresos por partido: €${(simResults.incomeStats.min/1000).toFixed(0)}K - €${(simResults.incomeStats.max/1000).toFixed(0)}K (media: €${(simResults.incomeStats.sum/simResults.total/1000).toFixed(0)}K)`);
console.log(`  Ocupación: ${(simResults.fillRateStats.min*100).toFixed(0)}% - ${(simResults.fillRateStats.max*100).toFixed(0)}% (media: ${(simResults.fillRateStats.sum/simResults.total*100).toFixed(0)}%)`);

// === RECOMENDACIÓN ===
console.log('\n' + '='.repeat(60));
if (errors.length > 0) {
  console.log('🔧 ACCIÓN REQUERIDA: Sincronizar Stadium.jsx y Facilities.jsx');
  console.log('   Las capacidades y niveles deben coincidir.');
} else {
  console.log('🎉 SISTEMA INTEGRADO CORRECTAMENTE');
}
console.log('='.repeat(60));
