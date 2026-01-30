// Stadium Economy Engine
// Sistema de precios dinámicos y asistencia

// === CONFIGURACIÓN ===
export const PRICE_CONFIG = {
  minPrice: 10,
  maxPrice: 100,
  referencePrice: 30, // Precio "normal" de referencia
  elasticity: 0.75,   // Cuánto afecta el precio a la demanda (suavizado)
  baseDemandRate: 0.65, // Demanda base: 65% de asientos disponibles
};

// Equipos "grandes" por liga - atraen más público
export const BIG_TEAMS = {
  laliga: ['real-madrid', 'barcelona', 'atletico-madrid', 'sevilla', 'athletic-club'],
  segunda: ['deportivo', 'racing-santander', 'zaragoza', 'malaga', 'levante', 'sporting-gijon'],
  primeraRFEF: ['recreativo', 'deportivo-b', 'real-sociedad-b'],
  segundaRFEF: [],
  premierLeague: ['manchester-city', 'liverpool', 'arsenal', 'manchester-united', 'chelsea', 'tottenham'],
  bundesliga: ['bayern-munich', 'borussia-dortmund', 'rb-leipzig', 'bayer-leverkusen'],
  serieA: ['juventus', 'inter', 'milan', 'napoli', 'roma'],
  ligue1: ['psg', 'marseille', 'lyon', 'monaco']
};

// === CÁLCULO DE DEMANDA ===

/**
 * Calcula automáticamente los abonados según el proyecto del equipo
 * Los abonados dependen de: precio del abono, nivel del equipo, resultados
 * @param {Object} params
 * @returns {number} Número de abonados
 */
export function calculateSeasonTickets({
  capacity,
  seasonTicketPrice, // Precio total del abono (no por partido)
  teamOverall = 70,
  leaguePosition = 10,
  totalTeams = 20,
  previousSeasonPosition = null,
  teamReputation = 70
}) {
  const maxSeasonTickets = Math.floor(capacity * 0.8); // Máx 80% de capacidad
  
  // 1. Base según overall del equipo (40-80% de max)
  // Overall 60 = 45%, Overall 80 = 70%, Overall 90 = 82%
  const overallFactor = 0.30 + (teamOverall / 100) * 0.52;
  
  // 2. Factor precio del abono (referencia: 500€/temporada)
  // Precio bajo = más demanda, precio alto = menos (suavizado)
  const referenceSeasonPrice = 500;
  const priceFactor = Math.max(0.6, Math.min(1.4, referenceSeasonPrice / seasonTicketPrice));
  
  // 3. Factor posición actual (mejor posición = más abonados) - suavizado
  const positionRatio = (totalTeams - leaguePosition + 1) / totalTeams;
  const positionFactor = 0.80 + (positionRatio * 0.30); // 0.80 a 1.10
  
  // 4. Factor resultados temporada anterior (si existe)
  let historyFactor = 1.0;
  if (previousSeasonPosition !== null) {
    const prevRatio = (totalTeams - previousSeasonPosition + 1) / totalTeams;
    historyFactor = 0.90 + (prevRatio * 0.20); // 0.90 a 1.10
  }
  
  // 5. Factor reputación/historia del club
  const reputationFactor = 0.85 + (teamReputation / 100) * 0.30; // 0.85 a 1.15
  
  // Cálculo final
  const baseTickets = maxSeasonTickets * overallFactor;
  const finalTickets = baseTickets * priceFactor * positionFactor * historyFactor * reputationFactor;
  
  return Math.max(100, Math.min(maxSeasonTickets, Math.round(finalTickets)));
}

/**
 * Calcula el factor de atractivo del rival
 * @returns {number} 1.0 = normal, hasta 2.0 para partidos top
 */
export function calculateRivalAttraction(rivalTeam, rivalPosition, leagueId) {
  let factor = 1.0;
  
  // ¿Es un equipo grande?
  const bigTeams = BIG_TEAMS[leagueId] || [];
  if (bigTeams.includes(rivalTeam?.id)) {
    factor += 0.5; // +50% si es un grande
  }
  
  // ¿Está en puestos altos?
  if (rivalPosition <= 3) {
    factor += 0.3; // Líder o top 3
  } else if (rivalPosition <= 6) {
    factor += 0.15; // Top 6
  }
  
  // ¿Tiene buena reputación?
  if (rivalTeam?.reputation >= 80) {
    factor += 0.2;
  } else if (rivalTeam?.reputation >= 70) {
    factor += 0.1;
  }
  
  return Math.min(2.0, factor); // Cap en 2x
}

/**
 * Calcula el "precio justo" de entrada según el contexto del equipo
 * Un equipo top en primera puede cobrar €80-120, uno de segunda €20-40
 * @param {Object} params
 * @returns {number} Precio justo de referencia
 */
export function calculateFairPrice({
  teamOverall = 70,
  teamReputation = 70,
  leaguePosition = 10,
  totalTeams = 20,
  division = 1  // 1 = primera, 2 = segunda, etc.
} = {}) {
  // Base por división: primera ~€50, segunda ~€25, tercera ~€15
  const divisionBase = division === 1 ? 50 : division === 2 ? 25 : 15;
  
  // Factor overall: equipo de 60 OVR → ×0.7, 75 → ×1.0, 90 → ×1.5
  const overallFactor = 0.4 + (teamOverall / 100) * 1.1;
  
  // Factor reputación: club histórico puede cobrar más
  const reputationFactor = 0.7 + (teamReputation / 100) * 0.6;
  
  // Factor posición: primero → ×1.3, mitad → ×1.0, último → ×0.7
  const positionRatio = (totalTeams - leaguePosition + 1) / totalTeams;
  const positionFactor = 0.7 + (positionRatio * 0.6);
  
  const fairPrice = divisionBase * overallFactor * reputationFactor * positionFactor;
  
  // Clamp entre €10 y €150
  return Math.round(Math.max(10, Math.min(150, fairPrice)));
}

/**
 * Calcula el factor de precio (elasticidad de demanda)
 * El precio se evalúa RELATIVO al precio justo del equipo
 * Real Madrid 1º puede cobrar €120 sin problema, equipo de segunda no
 */
export function calculatePriceFactor(ticketPrice, rivalFactor = 1.0, fairPrice = null) {
  const { elasticity } = PRICE_CONFIG;
  
  // Si no se pasa fairPrice, usar el referencePrice fijo como fallback
  const refPrice = fairPrice || PRICE_CONFIG.referencePrice;
  
  const priceRatio = ticketPrice / refPrice;
  
  let factor;
  if (ticketPrice <= refPrice) {
    // Precios por debajo del justo: bonificación moderada
    factor = 1 + (1 - priceRatio) * elasticity * 0.5;
  } else {
    // Precios por encima del justo: penalización exponencial
    factor = Math.pow(refPrice / ticketPrice, 1.4);
  }
  
  // Los partidos atractivos aguantan mejor precios altos
  if (rivalFactor > 1.3 && ticketPrice > refPrice) {
    const elasticityReduction = (rivalFactor - 1.3) * 0.25;
    factor = Math.min(factor + elasticityReduction, 0.95);
  }
  
  return Math.max(0.08, Math.min(1.3, factor)); // Mínimo 8%, máximo 1.3
}

/**
 * Calcula el factor de rendimiento del equipo
 * Rachas y posición afectan la demanda MUCHO
 */
export function calculatePerformanceFactor(teamPosition, totalTeams, streak = 0, morale = 70) {
  let factor = 1.0;
  
  // Posición en liga - más impacto
  const positionPercent = teamPosition / totalTeams;
  if (positionPercent <= 0.15) {
    factor += 0.2; // Top 15% de la liga (luchando por título/ascenso)
  } else if (positionPercent <= 0.3) {
    factor += 0.1;
  } else if (positionPercent >= 0.9) {
    factor -= 0.35; // Último o penúltimo - la gente deserta
  } else if (positionPercent >= 0.8) {
    factor -= 0.25; // Zona de descenso
  } else if (positionPercent >= 0.7) {
    factor -= 0.12;
  }
  
  // Racha - MÁS impacto
  if (streak >= 5) {
    factor += 0.2; // 5+ victorias seguidas - euforia
  } else if (streak >= 3) {
    factor += 0.12;
  } else if (streak <= -5) {
    factor -= 0.3; // 5+ derrotas - la gente abandona
  } else if (streak <= -3) {
    factor -= 0.2;
  } else if (streak <= -2) {
    factor -= 0.08;
  }
  
  // Moral general - más impacto
  factor *= 0.75 + (morale / 100) * 0.35;
  
  // Combinación tóxica: último + racha perdedora = desastre
  if (positionPercent >= 0.85 && streak <= -3) {
    factor *= 0.7; // Penalización extra del 30%
  }
  
  return Math.max(0.35, Math.min(1.35, factor)); // Mínimo 35% para casos extremos
}

/**
 * Determina si es un derby local
 */
export function isDerby(homeTeamId, awayTeamId) {
  const derbies = [
    ['real-madrid', 'atletico-madrid'],
    ['barcelona', 'espanyol'],
    ['sevilla', 'betis'],
    ['athletic-club', 'real-sociedad'],
    ['valencia', 'villarreal'],
    ['deportivo', 'celta'],
    ['sporting-gijon', 'oviedo'],
    ['manchester-city', 'manchester-united'],
    ['liverpool', 'everton'],
    ['arsenal', 'tottenham'],
    ['inter', 'milan'],
    ['roma', 'lazio'],
    ['bayern-munich', 'borussia-dortmund'],
    ['psg', 'marseille'],
  ];
  
  return derbies.some(([a, b]) => 
    (homeTeamId === a && awayTeamId === b) || 
    (homeTeamId === b && awayTeamId === a)
  );
}

/**
 * Calcula la asistencia esperada para un partido
 * @returns {object} { attendance, fillRate, factors }
 */
export function calculateMatchAttendance({
  stadiumCapacity,
  seasonTickets,
  ticketPrice,
  rivalTeam,
  rivalPosition,
  teamPosition,
  totalTeams,
  streak,
  morale,
  leagueId,
  homeTeamId,
  awayTeamId,
  teamOverall = 70,
  teamReputation = 70,
  division = 1
}) {
  // Capacidad disponible para entradas sueltas
  const availableSeats = stadiumCapacity - seasonTickets;
  
  // Demanda base: 55% de asientos disponibles (configurable)
  const baseDemand = availableSeats * PRICE_CONFIG.baseDemandRate;
  
  // Precio justo dinámico según contexto del equipo
  const fairPrice = calculateFairPrice({ teamOverall, teamReputation, leaguePosition: teamPosition, totalTeams, division });
  
  // Calcular factores
  const rivalFactor = calculateRivalAttraction(rivalTeam, rivalPosition, leagueId);
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor, fairPrice);
  const performanceFactor = calculatePerformanceFactor(teamPosition, totalTeams, streak, morale);
  const derbyBonus = isDerby(homeTeamId, awayTeamId) ? 1.3 : 1.0;
  
  // Demanda final
  const finalDemand = baseDemand * rivalFactor * priceFactor * performanceFactor * derbyBonus;
  
  // La asistencia es abonados + min(demanda, disponibles)
  const ticketSales = Math.min(Math.round(finalDemand), availableSeats);
  const attendance = seasonTickets + ticketSales;
  const fillRate = attendance / stadiumCapacity;
  
  return {
    attendance,
    ticketSales,
    seasonTickets,
    fillRate,
    availableSeats,
    factors: {
      rival: rivalFactor,
      price: priceFactor,
      performance: performanceFactor,
      derby: derbyBonus
    }
  };
}

/**
 * Calcula los ingresos de un partido
 */
export function calculateMatchIncome({
  ticketSales,
  seasonTickets,
  ticketPrice,
  stadiumLevel = 0,
  naming = null
}) {
  // Ingresos por entradas vendidas
  const ticketIncome = ticketSales * ticketPrice;
  
  // Los abonados ya pagaron al inicio de temporada, no generan ingreso por partido
  // Pero generan ingresos de consumo (bar, tienda, etc.)
  const seasonTicketConsumption = seasonTickets * 5; // €5 de media por abonado
  
  // Ingresos de bar/tienda por asistente
  const concessionRate = 8 + (stadiumLevel * 2); // €8-18 según nivel
  const concessionIncome = (ticketSales + seasonTickets) * concessionRate;
  
  // VIP/Palcos (si aplica)
  const vipIncome = stadiumLevel >= 2 ? Math.round(ticketPrice * 3 * stadiumLevel * 10) : 0;
  
  return {
    ticketIncome,
    concessionIncome,
    seasonTicketConsumption,
    vipIncome,
    total: ticketIncome + concessionIncome + seasonTicketConsumption + vipIncome
  };
}

/**
 * Estima los ingresos de temporada por abonos
 */
export function calculateSeasonTicketIncome(seasonTickets, ticketPrice, gamesPerSeason = 19) {
  const discount = 0.35; // 35% descuento para abonados
  const seasonTicketPrice = ticketPrice * gamesPerSeason * (1 - discount);
  return {
    pricePerSeason: Math.round(seasonTicketPrice),
    totalIncome: Math.round(seasonTickets * seasonTicketPrice),
    perMatch: Math.round(seasonTickets * ticketPrice * (1 - discount))
  };
}

/**
 * Calcula cuántos abonados podrías tener según el precio
 * Precio bajo = más abonados potenciales
 */
export function estimateSeasonTicketDemand(currentSeasonTickets, maxSeasonTickets, currentPrice, newPrice, teamReputation = 70) {
  const priceChange = (newPrice - currentPrice) / currentPrice;
  
  // Elasticidad de abonos (menos elástica que entradas sueltas)
  const elasticity = 0.4;
  
  // Factor de reputación (equipos con más historia retienen más)
  const loyaltyFactor = 0.7 + (teamReputation / 100) * 0.3;
  
  // Cambio en demanda
  let demandChange = -priceChange * elasticity * loyaltyFactor;
  
  // Si subes mucho el precio, más gente abandona
  if (priceChange > 0.2) {
    demandChange *= 1.5; // Penalización extra por subida grande
  }
  
  const newDemand = currentSeasonTickets * (1 + demandChange);
  
  return Math.max(0, Math.min(maxSeasonTickets, Math.round(newDemand)));
}

/**
 * Genera predicción de asistencia para el próximo partido
 * (para mostrar en UI)
 */
export function predictAttendance({
  stadiumCapacity,
  seasonTickets,
  ticketPrice,
  rivalTeam,
  rivalPosition,
  teamPosition,
  totalTeams,
  streak,
  morale,
  leagueId,
  homeTeamId,
  awayTeamId,
  teamOverall = 70,
  teamReputation = 70,
  division = 1
}) {
  const result = calculateMatchAttendance({
    stadiumCapacity,
    seasonTickets,
    ticketPrice,
    rivalTeam,
    rivalPosition,
    teamPosition,
    totalTeams,
    streak,
    morale,
    leagueId,
    homeTeamId,
    awayTeamId,
    teamOverall,
    teamReputation,
    division
  });
  
  // Añadir rangos de predicción (±10%)
  const variance = 0.1;
  const low = Math.round(result.attendance * (1 - variance));
  const high = Math.min(stadiumCapacity, Math.round(result.attendance * (1 + variance)));
  
  // Descripción del atractivo
  let attractionLevel = 'Normal';
  const totalFactor = result.factors.rival * result.factors.derby;
  if (totalFactor >= 1.8) attractionLevel = '🔥 Partidazo';
  else if (totalFactor >= 1.4) attractionLevel = '⭐ Muy atractivo';
  else if (totalFactor >= 1.2) attractionLevel = '👍 Buen cartel';
  else if (totalFactor <= 0.8) attractionLevel = '😴 Poco atractivo';
  
  return {
    ...result,
    prediction: {
      low,
      expected: result.attendance,
      high,
      attractionLevel
    }
  };
}
