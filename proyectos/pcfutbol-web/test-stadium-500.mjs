/**
 * Test 500 simulaciones del sistema de Estadio V2
 * Verifica: naming rights, eventos, factor cancha, VIP, etc.
 */

// === CONFIGURACIÓN (copiada de Stadium.jsx) ===
const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000, upgradeCost: null, prestige: 1 },
  { name: 'Moderno', capacity: 18000, maintenance: 120000, upgradeCost: 8000000, prestige: 2 },
  { name: 'Grande', capacity: 35000, maintenance: 280000, upgradeCost: 25000000, prestige: 3 },
  { name: 'Élite', capacity: 55000, maintenance: 450000, upgradeCost: 60000000, prestige: 4 },
  { name: 'Legendario', capacity: 80000, maintenance: 700000, upgradeCost: 120000000, prestige: 5 }
];

const NAMING_SPONSORS = [
  { id: 'local_bank', name: 'Banco Regional', offer: 500000, minPrestige: 1, duration: 3 },
  { id: 'telecom', name: 'TeleCom Plus', offer: 1500000, minPrestige: 2, duration: 3 },
  { id: 'car_brand', name: 'AutoMotor', offer: 3000000, minPrestige: 3, duration: 5 },
  { id: 'airline', name: 'FlyAir', offer: 5000000, minPrestige: 4, duration: 5 },
  { id: 'tech_giant', name: 'TechCorp', offer: 8000000, minPrestige: 5, duration: 5 },
  { id: 'global_brand', name: 'GlobalBrand', offer: 12000000, minPrestige: 5, duration: 7 }
];

// Eventos especiales (BALANCEADOS - daño reducido)
const SPECIAL_EVENTS = [
  { id: 'friendly_local', name: 'Amistoso Regional', income: 150000, fanHappiness: 5, grassDamage: 5, minLevel: 0, cooldown: 1 },
  { id: 'friendly_euro', name: 'Amistoso Internacional', income: 400000, fanHappiness: 10, grassDamage: 8, minLevel: 1, cooldown: 2 },
  { id: 'concert_local', name: 'Concierto Local', income: 300000, fanHappiness: -3, grassDamage: 15, minLevel: 1, cooldown: 2 },
  { id: 'concert_star', name: 'Concierto Estrella', income: 800000, fanHappiness: 0, grassDamage: 25, minLevel: 2, cooldown: 3 },
  { id: 'corporate', name: 'Evento Corporativo', income: 200000, fanHappiness: -5, grassDamage: 3, minLevel: 2, cooldown: 1 },
  { id: 'festival', name: 'Festival de Música', income: 1500000, fanHappiness: -10, grassDamage: 35, minLevel: 3, cooldown: 4 },
  { id: 'legends_match', name: 'Partido de Leyendas', income: 600000, fanHappiness: 25, grassDamage: 8, minLevel: 2, cooldown: 2 }
];

const GRASS_RECOVERY_PER_WEEK = 5;
const EVENT_COOLDOWN_WEEKS = 2;

const VIP_BOXES = [
  { id: 'standard', name: 'Palco Estándar', capacity: 12, basePrice: 50000, minLevel: 1 },
  { id: 'premium', name: 'Palco Premium', capacity: 20, basePrice: 100000, minLevel: 2 },
  { id: 'presidential', name: 'Palco Presidencial', capacity: 30, basePrice: 200000, minLevel: 3 },
  { id: 'corporate', name: 'Suite Corporativa', capacity: 50, basePrice: 350000, minLevel: 4 }
];

const STADIUM_ZONES = {
  fondo: { basePrice: 20, capacityRatio: 0.35 },
  lateral: { basePrice: 35, capacityRatio: 0.35 },
  tribuna: { basePrice: 60, capacityRatio: 0.20 },
  vip: { basePrice: 120, capacityRatio: 0.10 }
};

const HOME_GAMES_PER_SEASON = 19;
const SEASON_TICKET_DISCOUNT = 0.35;

// === FUNCIONES DE SIMULACIÓN ===

function createStadiumState(level = 0) {
  const currentLevel = STADIUM_LEVELS[level];
  const capacity = currentLevel.capacity;
  
  return {
    level,
    seasonTickets: {
      fondo: Math.floor(capacity * 0.35 * (0.3 + Math.random() * 0.4)),
      lateral: Math.floor(capacity * 0.35 * (0.2 + Math.random() * 0.4)),
      tribuna: Math.floor(capacity * 0.20 * (0.2 + Math.random() * 0.3)),
      vip: Math.floor(capacity * 0.10 * (0.1 + Math.random() * 0.3))
    },
    ticketPrices: {
      fondo: 20 + Math.floor(Math.random() * 15),
      lateral: 35 + Math.floor(Math.random() * 20),
      tribuna: 60 + Math.floor(Math.random() * 30),
      vip: 120 + Math.floor(Math.random() * 50)
    },
    naming: null,
    grassCondition: 100,
    fanHappiness: 50 + Math.floor(Math.random() * 30),
    atmosphere: 40 + Math.floor(Math.random() * 40),
    vipBoxes: [],
    records: {
      maxAttendance: 0,
      maxIncome: 0,
      totalEvents: 0,
      totalIncome: 0
    }
  };
}

function calculateHomeAdvantage(stadiumState) {
  const currentLevel = STADIUM_LEVELS[stadiumState.level];
  let factor = 1.00;
  
  // Base por nivel
  factor += currentLevel.prestige * 0.01;
  
  // Ambiente
  factor += (stadiumState.atmosphere / 100) * 0.05;
  
  // Felicidad fans
  factor += ((stadiumState.fanHappiness - 50) / 100) * 0.03;
  
  // Césped malo
  if (stadiumState.grassCondition < 50) {
    factor -= 0.02;
  }
  
  // Ocupación alta
  const capacity = currentLevel.capacity;
  const totalSeasonTickets = Object.values(stadiumState.seasonTickets).reduce((a, b) => a + b, 0);
  if (totalSeasonTickets / capacity > 0.7) {
    factor += 0.02;
  }
  
  return Math.min(1.15, Math.max(1.00, factor));
}

function calculateSeasonTicketIncome(stadiumState) {
  let total = 0;
  Object.entries(stadiumState.seasonTickets).forEach(([zone, count]) => {
    const price = stadiumState.ticketPrices[zone];
    const fullPrice = price * HOME_GAMES_PER_SEASON;
    const discountedPrice = fullPrice * (1 - SEASON_TICKET_DISCOUNT);
    total += count * discountedPrice;
  });
  return total;
}

function simulateNamingRights(stadiumState, teamReputation) {
  const currentLevel = STADIUM_LEVELS[stadiumState.level];
  const availableSponsors = NAMING_SPONSORS.filter(s => s.minPrestige <= currentLevel.prestige);
  
  if (availableSponsors.length === 0) return null;
  
  // Elegir sponsor aleatorio
  const sponsor = availableSponsors[Math.floor(Math.random() * availableSponsors.length)];
  
  // Penalización de fans
  const isHistoric = teamReputation > 80;
  const fanPenalty = isHistoric ? -15 : -5;
  
  return {
    sponsor,
    newFanHappiness: Math.max(0, stadiumState.fanHappiness + fanPenalty),
    yearlyIncome: sponsor.offer,
    totalIncome: sponsor.offer * sponsor.duration,
    isHistoric
  };
}

function simulateEvent(stadiumState, eventId) {
  const event = SPECIAL_EVENTS.find(e => e.id === eventId);
  if (!event) return null;
  
  if (event.minLevel > stadiumState.level) return { error: 'Nivel insuficiente' };
  if (stadiumState.grassCondition < 30) return { error: 'Césped muy dañado' };
  
  const newGrass = Math.max(0, stadiumState.grassCondition - event.grassDamage);
  const newFanHappiness = Math.max(0, Math.min(100, stadiumState.fanHappiness + event.fanHappiness));
  
  return {
    event,
    income: event.income,
    newGrassCondition: newGrass,
    newFanHappiness,
    grassDamage: event.grassDamage
  };
}

function simulateVIPSale(stadiumState, boxType) {
  const box = VIP_BOXES.find(b => b.id === boxType);
  if (!box) return null;
  
  if (box.minLevel > stadiumState.level) return { error: 'Nivel insuficiente' };
  
  // Check if already sold
  if (stadiumState.vipBoxes.some(b => b.boxType === boxType)) {
    return { error: 'Ya vendido' };
  }
  
  const currentLevel = STADIUM_LEVELS[stadiumState.level];
  const price = box.basePrice * (1 + currentLevel.prestige * 0.2);
  const years = 3 + Math.floor(Math.random() * 3);
  
  return {
    box,
    yearlyIncome: price,
    totalIncome: price * years,
    years
  };
}

function simulateMatchday(stadiumState, rivalReputation) {
  const currentLevel = STADIUM_LEVELS[stadiumState.level];
  const capacity = currentLevel.capacity;
  
  // Factores
  const rivalAttraction = Math.min(1, rivalReputation / 85);
  const priceFactor = 1.0; // Simplificado
  const baseAttendance = 0.65;
  
  let totalAttendance = 0;
  let ticketIncome = 0;
  
  Object.entries(STADIUM_ZONES).forEach(([zone, config]) => {
    const zoneCapacity = Math.floor(capacity * config.capacityRatio);
    const seasonTickets = stadiumState.seasonTickets[zone] || 0;
    const availableSeats = zoneCapacity - seasonTickets;
    
    const occupancyRate = Math.min(1, baseAttendance * rivalAttraction * priceFactor);
    const soldTickets = Math.floor(availableSeats * occupancyRate);
    
    totalAttendance += seasonTickets + soldTickets;
    ticketIncome += soldTickets * stadiumState.ticketPrices[zone];
  });
  
  return {
    attendance: totalAttendance,
    ticketIncome,
    occupancyPercent: Math.round((totalAttendance / capacity) * 100)
  };
}

// === SIMULACIÓN PRINCIPAL ===

function runSimulation(simNumber) {
  const errors = [];
  const warnings = [];
  const stats = {
    level: 0,
    homeAdvantage: 0,
    seasonTicketIncome: 0,
    namingIncome: 0,
    eventsHosted: 0,
    eventIncome: 0,
    vipBoxesSold: 0,
    vipIncome: 0,
    avgAttendance: 0,
    avgMatchIncome: 0,
    finalGrass: 100,
    finalFanHappiness: 70
  };
  
  try {
    // Nivel aleatorio
    const level = Math.floor(Math.random() * 5);
    stats.level = level;
    
    // Crear estado inicial
    const stadiumState = createStadiumState(level);
    const teamReputation = 50 + Math.floor(Math.random() * 50);
    
    // 1. Calcular factor cancha
    const homeAdv = calculateHomeAdvantage(stadiumState);
    stats.homeAdvantage = homeAdv;
    
    // Validar rango
    if (homeAdv < 1.00 || homeAdv > 1.15) {
      errors.push(`Factor cancha fuera de rango: ${homeAdv}`);
    }
    
    // 2. Calcular ingresos por abonos
    const seasonIncome = calculateSeasonTicketIncome(stadiumState);
    stats.seasonTicketIncome = seasonIncome;
    
    if (seasonIncome < 0) {
      errors.push(`Ingresos abonos negativos: ${seasonIncome}`);
    }
    
    // 3. Simular naming rights (50% de las veces)
    if (Math.random() > 0.5) {
      const namingResult = simulateNamingRights(stadiumState, teamReputation);
      if (namingResult && !namingResult.error) {
        stats.namingIncome = namingResult.yearlyIncome;
        stadiumState.fanHappiness = namingResult.newFanHappiness;
        
        // Validar
        if (namingResult.newFanHappiness < 0) {
          errors.push(`Fan happiness negativo después de naming: ${namingResult.newFanHappiness}`);
        }
        
        if (namingResult.isHistoric && namingResult.newFanHappiness > stadiumState.fanHappiness) {
          warnings.push(`Club histórico pero fans no se enfadaron`);
        }
      }
    }
    
    // 4. Simular temporada completa (38 semanas) con eventos y recuperación
    const availableEvents = SPECIAL_EVENTS.filter(e => e.minLevel <= level);
    let lastEventWeek = 0;
    
    for (let week = 1; week <= 38; week++) {
      // Recuperación semanal del césped
      stadiumState.grassCondition = Math.min(100, stadiumState.grassCondition + GRASS_RECOVERY_PER_WEEK);
      
      // Recuperación lenta de fanHappiness si está por debajo de 70
      if (stadiumState.fanHappiness < 70) {
        stadiumState.fanHappiness = Math.min(70, stadiumState.fanHappiness + 1);
      }
      
      // Intentar organizar evento si ha pasado el cooldown (15% chance por semana)
      const weeksSinceLastEvent = week - lastEventWeek;
      if (weeksSinceLastEvent >= EVENT_COOLDOWN_WEEKS && Math.random() < 0.15 && availableEvents.length > 0) {
        const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        const result = simulateEvent(stadiumState, event.id);
        
        if (result && !result.error) {
          stats.eventsHosted++;
          stats.eventIncome += result.income;
          stadiumState.grassCondition = result.newGrassCondition;
          stadiumState.fanHappiness = result.newFanHappiness;
          lastEventWeek = week;
          
          // Validar
          if (result.newGrassCondition < 0) {
            errors.push(`Césped negativo: ${result.newGrassCondition}`);
          }
          if (result.newFanHappiness < 0 || result.newFanHappiness > 100) {
            errors.push(`Fan happiness fuera de rango: ${result.newFanHappiness}`);
          }
        }
      }
    }
    
    // 5. Simular venta de palcos VIP
    const availableBoxes = VIP_BOXES.filter(b => b.minLevel <= level);
    for (const box of availableBoxes) {
      if (Math.random() > 0.6) { // 40% chance de vender cada palco
        const result = simulateVIPSale(stadiumState, box.id);
        if (result && !result.error) {
          stats.vipBoxesSold++;
          stats.vipIncome += result.yearlyIncome;
          stadiumState.vipBoxes.push({ boxType: box.id, yearlyIncome: result.yearlyIncome });
        }
      }
    }
    
    // 6. Simular 19 partidos en casa
    let totalAttendance = 0;
    let totalMatchIncome = 0;
    
    for (let match = 0; match < HOME_GAMES_PER_SEASON; match++) {
      const rivalRep = 40 + Math.floor(Math.random() * 50);
      const result = simulateMatchday(stadiumState, rivalRep);
      
      totalAttendance += result.attendance;
      totalMatchIncome += result.ticketIncome;
      
      // Validar
      const capacity = STADIUM_LEVELS[level].capacity;
      if (result.attendance > capacity) {
        errors.push(`Asistencia > capacidad: ${result.attendance} > ${capacity}`);
      }
      if (result.attendance < 0) {
        errors.push(`Asistencia negativa: ${result.attendance}`);
      }
    }
    
    stats.avgAttendance = Math.round(totalAttendance / HOME_GAMES_PER_SEASON);
    stats.avgMatchIncome = Math.round(totalMatchIncome / HOME_GAMES_PER_SEASON);
    stats.finalGrass = stadiumState.grassCondition;
    stats.finalFanHappiness = stadiumState.fanHappiness;
    
    // Warnings adicionales
    if (stadiumState.grassCondition < 30 && stats.eventsHosted > 3) {
      warnings.push(`Césped muy dañado (${stadiumState.grassCondition}%) después de ${stats.eventsHosted} eventos`);
    }
    
    if (stadiumState.fanHappiness < 30) {
      warnings.push(`Fan happiness muy bajo: ${stadiumState.fanHappiness}%`);
    }
    
  } catch (e) {
    errors.push(`Exception: ${e.message}`);
  }
  
  return { simNumber, errors, warnings, stats };
}

// === EJECUTAR SIMULACIONES ===

console.log('🏟️ Iniciando 500 simulaciones del Stadium V2...\n');

const results = [];
const allErrors = [];
const allWarnings = [];
const aggregateStats = {
  byLevel: { 0: [], 1: [], 2: [], 3: [], 4: [] },
  homeAdvantages: [],
  seasonIncomes: [],
  namingIncomes: [],
  eventIncomes: [],
  vipIncomes: [],
  avgAttendances: [],
  grassConditions: [],
  fanHappiness: []
};

for (let i = 0; i < 500; i++) {
  const result = runSimulation(i + 1);
  results.push(result);
  
  if (result.errors.length > 0) {
    allErrors.push(...result.errors.map(e => `Sim ${i + 1}: ${e}`));
  }
  if (result.warnings.length > 0) {
    allWarnings.push(...result.warnings.map(w => `Sim ${i + 1}: ${w}`));
  }
  
  // Agregar stats
  aggregateStats.byLevel[result.stats.level].push(result.stats);
  aggregateStats.homeAdvantages.push(result.stats.homeAdvantage);
  aggregateStats.seasonIncomes.push(result.stats.seasonTicketIncome);
  if (result.stats.namingIncome > 0) aggregateStats.namingIncomes.push(result.stats.namingIncome);
  if (result.stats.eventIncome > 0) aggregateStats.eventIncomes.push(result.stats.eventIncome);
  if (result.stats.vipIncome > 0) aggregateStats.vipIncomes.push(result.stats.vipIncome);
  aggregateStats.avgAttendances.push(result.stats.avgAttendance);
  aggregateStats.grassConditions.push(result.stats.finalGrass);
  aggregateStats.fanHappiness.push(result.stats.finalFanHappiness);
}

// === REPORTES ===

console.log('=' .repeat(60));
console.log('📊 RESULTADOS DE 500 SIMULACIONES');
console.log('=' .repeat(60));

// Errores
console.log(`\n❌ ERRORES: ${allErrors.length}`);
if (allErrors.length > 0) {
  const uniqueErrors = [...new Set(allErrors)];
  uniqueErrors.slice(0, 20).forEach(e => console.log(`   ${e}`));
  if (uniqueErrors.length > 20) {
    console.log(`   ... y ${uniqueErrors.length - 20} más`);
  }
} else {
  console.log('   ✅ Sin errores!');
}

// Warnings
console.log(`\n⚠️ WARNINGS: ${allWarnings.length}`);
if (allWarnings.length > 0) {
  const uniqueWarnings = [...new Set(allWarnings)];
  uniqueWarnings.slice(0, 10).forEach(w => console.log(`   ${w}`));
  if (uniqueWarnings.length > 10) {
    console.log(`   ... y ${uniqueWarnings.length - 10} más`);
  }
}

// Stats por nivel
console.log('\n📈 ESTADÍSTICAS POR NIVEL DE ESTADIO:');
console.log('-'.repeat(60));
for (let level = 0; level < 5; level++) {
  const levelStats = aggregateStats.byLevel[level];
  if (levelStats.length === 0) continue;
  
  const avgHomeAdv = levelStats.reduce((s, x) => s + x.homeAdvantage, 0) / levelStats.length;
  const avgSeasonIncome = levelStats.reduce((s, x) => s + x.seasonTicketIncome, 0) / levelStats.length;
  const avgAttendance = levelStats.reduce((s, x) => s + x.avgAttendance, 0) / levelStats.length;
  
  console.log(`\nNivel ${level + 1} (${STADIUM_LEVELS[level].name}) - ${levelStats.length} simulaciones:`);
  console.log(`   Factor cancha promedio: +${((avgHomeAdv - 1) * 100).toFixed(2)}%`);
  console.log(`   Ingresos abonos promedio: €${(avgSeasonIncome / 1000000).toFixed(2)}M`);
  console.log(`   Asistencia promedio: ${Math.round(avgAttendance).toLocaleString()}`);
}

// Stats globales
const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const min = arr => arr.length > 0 ? Math.min(...arr) : 0;
const max = arr => arr.length > 0 ? Math.max(...arr) : 0;

console.log('\n📊 ESTADÍSTICAS GLOBALES:');
console.log('-'.repeat(60));
console.log(`Factor cancha: min +${((min(aggregateStats.homeAdvantages) - 1) * 100).toFixed(2)}%, max +${((max(aggregateStats.homeAdvantages) - 1) * 100).toFixed(2)}%, avg +${((avg(aggregateStats.homeAdvantages) - 1) * 100).toFixed(2)}%`);
console.log(`Ingresos abonos: min €${(min(aggregateStats.seasonIncomes) / 1000000).toFixed(2)}M, max €${(max(aggregateStats.seasonIncomes) / 1000000).toFixed(2)}M`);
console.log(`Naming rights (${aggregateStats.namingIncomes.length} casos): avg €${(avg(aggregateStats.namingIncomes) / 1000000).toFixed(2)}M/año`);
console.log(`Eventos (${aggregateStats.eventIncomes.length} casos): avg €${(avg(aggregateStats.eventIncomes) / 1000000).toFixed(2)}M total`);
console.log(`VIP (${aggregateStats.vipIncomes.length} casos): avg €${(avg(aggregateStats.vipIncomes) / 1000).toFixed(0)}K/año`);
console.log(`Césped final: min ${min(aggregateStats.grassConditions)}%, max ${max(aggregateStats.grassConditions)}%, avg ${avg(aggregateStats.grassConditions).toFixed(0)}%`);
console.log(`Fan happiness final: min ${min(aggregateStats.fanHappiness)}%, max ${max(aggregateStats.fanHappiness)}%, avg ${avg(aggregateStats.fanHappiness).toFixed(0)}%`);

// Sugerencias de mejora
console.log('\n💡 ANÁLISIS Y SUGERENCIAS:');
console.log('-'.repeat(60));

const issues = [];
const suggestions = [];

// Análisis del factor cancha
const homeAdvRange = max(aggregateStats.homeAdvantages) - min(aggregateStats.homeAdvantages);
if (homeAdvRange < 0.05) {
  issues.push('El factor cancha tiene poco rango de variación');
  suggestions.push('Aumentar el impacto de los factores en el factor cancha');
}

// Análisis del césped
const lowGrassCount = aggregateStats.grassConditions.filter(g => g < 30).length;
if (lowGrassCount > 100) {
  issues.push(`${lowGrassCount} simulaciones terminaron con césped < 30%`);
  suggestions.push('Reducir el daño de eventos o añadir recuperación automática del césped');
}

// Análisis de fans
const lowFanCount = aggregateStats.fanHappiness.filter(f => f < 30).length;
if (lowFanCount > 50) {
  issues.push(`${lowFanCount} simulaciones con fans muy descontentos`);
  suggestions.push('Balancear mejor el impacto negativo de eventos y naming rights');
}

// Análisis de ingresos
const avgTotalIncome = avg(aggregateStats.seasonIncomes) + avg(aggregateStats.namingIncomes) + avg(aggregateStats.eventIncomes) + avg(aggregateStats.vipIncomes);
console.log(`Ingresos totales promedio por temporada: €${(avgTotalIncome / 1000000).toFixed(2)}M`);

if (issues.length > 0) {
  console.log('\n⚠️ Problemas detectados:');
  issues.forEach(i => console.log(`   - ${i}`));
}

if (suggestions.length > 0) {
  console.log('\n✨ Sugerencias de mejora:');
  suggestions.forEach(s => console.log(`   - ${s}`));
}

if (issues.length === 0 && allErrors.length === 0) {
  console.log('\n✅ El sistema del estadio parece estar bien balanceado!');
}

console.log('\n' + '='.repeat(60));
console.log('🏁 Simulación completada');
console.log('='.repeat(60));
