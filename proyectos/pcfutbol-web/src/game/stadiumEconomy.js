// Stadium Economy Engine
// Sistema de precios dinámicos y asistencia

// === CONFIGURACIÓN ===
export const PRICE_CONFIG = {
  minPrice: 10,
  maxPrice: 100,
  referencePrice: 30, // Precio "normal" de referencia (bajado de 35)
  elasticity: 1.0,    // Cuánto afecta el precio a la demanda (subido de 0.8)
  baseDemandRate: 0.55, // Demanda base: 55% de asientos disponibles (bajado de 70%)
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
  // Overall 60 = 40%, Overall 80 = 65%, Overall 90 = 80%
  const overallFactor = 0.25 + (teamOverall / 100) * 0.55;
  
  // 2. Factor precio del abono (referencia: 500€/temporada)
  // Precio bajo = más demanda, precio alto = menos
  const referenceSeasonPrice = 500;
  const priceFactor = Math.max(0.5, Math.min(1.5, referenceSeasonPrice / seasonTicketPrice));
  
  // 3. Factor posición actual (mejor posición = más abonados)
  const positionRatio = (totalTeams - leaguePosition + 1) / totalTeams;
  const positionFactor = 0.7 + (positionRatio * 0.4); // 0.7 a 1.1
  
  // 4. Factor resultados temporada anterior (si existe)
  let historyFactor = 1.0;
  if (previousSeasonPosition !== null) {
    const prevRatio = (totalTeams - previousSeasonPosition + 1) / totalTeams;
    historyFactor = 0.85 + (prevRatio * 0.3); // 0.85 a 1.15
  }
  
  // 5. Factor reputación/historia del club
  const reputationFactor = 0.8 + (teamReputation / 100) * 0.4; // 0.8 a 1.2
  
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
 * Calcula el factor de precio (elasticidad de demanda)
 * Precio bajo = más demanda, precio alto = menos demanda
 */
export function calculatePriceFactor(ticketPrice, rivalFactor = 1.0) {
  const { referencePrice, elasticity } = PRICE_CONFIG;
  
  // Factor base: precio/referencia invertido
  // €15 → factor ~1.5 (más gente)
  // €30 → factor 1.0 (normal)
  // €50 → factor ~0.35 (mucho menos gente)
  const priceRatio = ticketPrice / referencePrice;
  
  // Penalización extra para precios muy altos (curva exponencial suave)
  let factor;
  if (ticketPrice > referencePrice) {
    // Precios altos: penalización más agresiva
    factor = 1 - Math.pow((priceRatio - 1), 1.3) * elasticity;
  } else {
    // Precios bajos: bonificación lineal
    factor = 1 + (1 - priceRatio) * elasticity * 0.8;
  }
  
  // Los partidos atractivos aguantan mejor precios altos
  // Si rivalFactor > 1.5, la gente paga más
  if (rivalFactor > 1.5 && ticketPrice > referencePrice) {
    const elasticityReduction = (rivalFactor - 1.5) * 0.4;
    factor = Math.min(factor + elasticityReduction, 1.0);
  }
  
  return Math.max(0.25, Math.min(1.4, factor)); // Clamp 0.25-1.4
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
  awayTeamId
}) {
  // Capacidad disponible para entradas sueltas
  const availableSeats = stadiumCapacity - seasonTickets;
  
  // Demanda base: 55% de asientos disponibles (configurable)
  const baseDemand = availableSeats * PRICE_CONFIG.baseDemandRate;
  
  // Calcular factores
  const rivalFactor = calculateRivalAttraction(rivalTeam, rivalPosition, leagueId);
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor);
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
  awayTeamId
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
    awayTeamId
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
