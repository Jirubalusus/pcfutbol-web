// ============================================================
// MATCH SIMULATION V2 - Motor de Simulación Realista
// ============================================================
// Prioriza jerarquía real: los grandes ganan, los pequeños luchan
// Permite sorpresas controladas (~15% de upsets)
// Empates más frecuentes entre equipos parejos

import { FORMATIONS, TACTICS, calculateTeamStrength } from './leagueEngine';

// ============================================================
// CONFIGURACIÓN DE REALISMO
// ============================================================

// Distribución esperada de resultados en una liga típica
const LEAGUE_STATS = {
  homeWinRate: 0.46,    // 46% victorias locales
  drawRate: 0.26,       // 26% empates
  awayWinRate: 0.28,    // 28% victorias visitantes
  avgGoalsPerMatch: 2.7,
  cleanSheetRate: 0.25  // 25% porterías a cero
};

// Factor de "upset" - probabilidad de sorpresa según diferencia de nivel
const UPSET_FACTORS = {
  huge: { diff: 20, upsetChance: 0.05 },      // Dif >20 pts: 5% upset
  large: { diff: 15, upsetChance: 0.10 },     // Dif 15-20: 10% upset  
  medium: { diff: 10, upsetChance: 0.18 },    // Dif 10-15: 18% upset
  small: { diff: 5, upsetChance: 0.30 },      // Dif 5-10: 30% upset
  tiny: { diff: 0, upsetChance: 0.45 }        // Dif <5: 45% upset (casi parejo)
};

// Perfiles de equipos según reputación
const TEAM_PROFILES = {
  elite: {      // Rep 5 - Real Madrid, Barcelona, etc.
    baseWinRate: 0.75,
    drawRate: 0.15,
    lossRate: 0.10,
    goalsScored: 2.4,
    goalsConceded: 0.8,
    tacticalFlexibility: 0.9,
    mentalStrength: 0.95
  },
  top: {        // Rep 4 - Atlético, Sevilla, etc.
    baseWinRate: 0.55,
    drawRate: 0.25,
    lossRate: 0.20,
    goalsScored: 1.8,
    goalsConceded: 1.1,
    tacticalFlexibility: 0.75,
    mentalStrength: 0.80
  },
  midHigh: {    // Rep 3.5 - Real Sociedad, Betis, etc.
    baseWinRate: 0.45,
    drawRate: 0.28,
    lossRate: 0.27,
    goalsScored: 1.5,
    goalsConceded: 1.3,
    tacticalFlexibility: 0.65,
    mentalStrength: 0.70
  },
  mid: {        // Rep 3 - Equipos medios
    baseWinRate: 0.35,
    drawRate: 0.30,
    lossRate: 0.35,
    goalsScored: 1.2,
    goalsConceded: 1.5,
    tacticalFlexibility: 0.55,
    mentalStrength: 0.60
  },
  midLow: {     // Rep 2.5 - Equipos en descenso
    baseWinRate: 0.28,
    drawRate: 0.30,
    lossRate: 0.42,
    goalsScored: 1.0,
    goalsConceded: 1.7,
    tacticalFlexibility: 0.45,
    mentalStrength: 0.50
  },
  low: {        // Rep 2 - Recién ascendidos
    baseWinRate: 0.22,
    drawRate: 0.28,
    lossRate: 0.50,
    goalsScored: 0.9,
    goalsConceded: 1.9,
    tacticalFlexibility: 0.35,
    mentalStrength: 0.40
  }
};

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

/**
 * Obtener perfil de equipo según reputación
 */
export function getTeamProfile(reputation) {
  if (reputation >= 5) return TEAM_PROFILES.elite;
  if (reputation >= 4) return TEAM_PROFILES.top;
  if (reputation >= 3.5) return TEAM_PROFILES.midHigh;
  if (reputation >= 3) return TEAM_PROFILES.mid;
  if (reputation >= 2.5) return TEAM_PROFILES.midLow;
  return TEAM_PROFILES.low;
}

/**
 * Calcular fuerza efectiva del equipo para el partido
 */
export function calculateMatchStrength(team, formation, tactic, context = {}) {
  const {
    morale = 70,
    fatigue = 0,        // 0-100, fatiga acumulada
    injuries = 0,       // Número de lesionados clave
    isHome = false,
    seasonMomentum = 0  // -20 a +20 según racha de temporada
  } = context;
  
  // Base: media del 11 titular
  const strength = calculateTeamStrength(team, formation, tactic, morale);
  const baseRating = strength.effectiveOverall || strength.overall || 70;
  
  // Reputación del equipo (muy importante)
  const reputation = team.reputation || 3;
  const profile = getTeamProfile(reputation);
  
  // Factor de plantilla (calidad de suplentes)
  const squadDepth = calculateSquadDepth(team);
  
  // Penalizaciones
  const fatiguePenalty = fatigue * 0.15;  // Máx -15 puntos por fatiga
  const injuryPenalty = injuries * 2;      // -2 por cada lesionado clave
  
  // Bonificaciones
  const moraleBonus = (morale - 50) * 0.12;  // ±6 puntos por moral
  const homeBonus = isHome ? 4 + (team.stadiumCapacity || 20000) / 15000 : 0;  // 4-8 pts local
  const momentumBonus = seasonMomentum * 0.3;  // ±6 puntos por racha
  
  // Rating final
  const finalRating = baseRating 
    - fatiguePenalty 
    - injuryPenalty 
    + moraleBonus 
    + homeBonus 
    + momentumBonus;
  
  return {
    rating: Math.max(40, Math.min(99, finalRating)),
    baseRating,
    reputation,
    profile,
    squadDepth,
    strength,
    modifiers: {
      fatigue: -fatiguePenalty,
      injuries: -injuryPenalty,
      morale: moraleBonus,
      home: homeBonus,
      momentum: momentumBonus
    }
  };
}

/**
 * Calcular profundidad de plantilla
 */
function calculateSquadDepth(team) {
  if (!team.players || team.players.length < 15) return 0.5;
  
  const starters = team.players.slice(0, 11).reduce((sum, p) => sum + (p.overall || 70), 0) / 11;
  const bench = team.players.slice(11, 18).reduce((sum, p) => sum + (p.overall || 65), 0) / Math.min(7, team.players.length - 11);
  
  // Si el banquillo está cerca del titular, buena profundidad
  const depthRatio = bench / starters;
  return Math.min(1, Math.max(0, depthRatio));
}

/**
 * SIMULACIÓN DE PARTIDO V2 - Más realista
 */
export function simulateMatchV2(homeTeamId, awayTeamId, homeTeamData, awayTeamData, context = {}) {
  const {
    homeFormation = '4-3-3',
    awayFormation = '4-3-3',
    homeTactic = 'balanced',
    awayTactic = 'balanced',
    homeMorale = 70,
    awayMorale = 70,
    homeSeasonMomentum = 0,
    awaySeasonMomentum = 0,
    isDerby = false,
    importance = 'normal', // normal, crucial, final
    weather = 'normal',    // normal, rain, extreme
    referee = 'neutral'    // neutral, strict, lenient
  } = context;
  
  // Calcular fuerzas ajustadas
  const homeStrength = calculateMatchStrength(homeTeamData, homeFormation, homeTactic, {
    morale: homeMorale,
    isHome: true,
    seasonMomentum: homeSeasonMomentum
  });
  
  const awayStrength = calculateMatchStrength(awayTeamData, awayFormation, awayTactic, {
    morale: awayMorale,
    isHome: false,
    seasonMomentum: awaySeasonMomentum
  });
  
  // Diferencia de nivel
  const ratingDiff = homeStrength.rating - awayStrength.rating;
  const reputationDiff = (homeStrength.reputation - awayStrength.reputation) * 5; // Amplificar diferencia de rep
  const totalDiff = ratingDiff + reputationDiff;
  
  // Determinar probabilidades base
  const { homeWinProb, drawProb, awayWinProb } = calculateResultProbabilities(
    homeStrength,
    awayStrength,
    totalDiff,
    isDerby
  );
  
  // Factor sorpresa (upsets)
  const upsetFactor = calculateUpsetFactor(totalDiff);
  
  // Decidir resultado
  const result = decideResult(homeWinProb, drawProb, awayWinProb, upsetFactor, isDerby);
  
  // Simular goles según resultado
  const { homeScore, awayScore } = simulateGoals(
    result,
    homeStrength,
    awayStrength,
    importance
  );
  
  // Generar eventos del partido
  const events = generateMatchEvents(
    homeScore,
    awayScore,
    homeTeamData,
    awayTeamData,
    homeStrength,
    awayStrength,
    referee
  );
  
  // Stats del partido
  const stats = generateMatchStats(
    homeStrength,
    awayStrength,
    homeScore,
    awayScore,
    result
  );
  
  return {
    homeScore,
    awayScore,
    events,
    stats,
    debug: {
      homeRating: homeStrength.rating,
      awayRating: awayStrength.rating,
      ratingDiff,
      reputationDiff,
      probabilities: { homeWinProb, drawProb, awayWinProb },
      result: result === 1 ? 'homeWin' : result === 0 ? 'draw' : 'awayWin'
    }
  };
}

/**
 * Calcular probabilidades de cada resultado
 */
function calculateResultProbabilities(homeStrength, awayStrength, totalDiff, isDerby) {
  const homeProfile = homeStrength.profile;
  const awayProfile = awayStrength.profile;
  
  // Base: usar perfiles de equipo
  let homeWinBase = homeProfile.baseWinRate;
  let drawBase = (homeProfile.drawRate + awayProfile.drawRate) / 2;
  let awayWinBase = awayProfile.baseWinRate * 0.65; // Visitante siempre más difícil
  
  // Ajustar según diferencia de rating
  const diffFactor = totalDiff / 100; // Normalizar
  homeWinBase += diffFactor * 0.35;
  awayWinBase -= diffFactor * 0.25;
  
  // Derby: más impredecible
  if (isDerby) {
    homeWinBase *= 0.85;
    awayWinBase *= 1.15;
    drawBase *= 1.1;
  }
  
  // Normalizar
  const total = homeWinBase + drawBase + awayWinBase;
  return {
    homeWinProb: Math.max(0.05, Math.min(0.90, homeWinBase / total)),
    drawProb: Math.max(0.10, Math.min(0.40, drawBase / total)),
    awayWinProb: Math.max(0.05, Math.min(0.70, awayWinBase / total))
  };
}

/**
 * Calcular factor de upset según diferencia
 */
function calculateUpsetFactor(totalDiff) {
  const absDiff = Math.abs(totalDiff);
  
  if (absDiff > 20) return UPSET_FACTORS.huge.upsetChance;
  if (absDiff > 15) return UPSET_FACTORS.large.upsetChance;
  if (absDiff > 10) return UPSET_FACTORS.medium.upsetChance;
  if (absDiff > 5) return UPSET_FACTORS.small.upsetChance;
  return UPSET_FACTORS.tiny.upsetChance;
}

/**
 * Decidir resultado del partido
 */
function decideResult(homeWinProb, drawProb, awayWinProb, upsetFactor, isDerby) {
  const roll = Math.random();
  
  // Check de upset primero
  if (roll < upsetFactor * 0.5) {
    // Posible upset - dar ventaja al más débil
    return Math.random() > 0.6 ? -1 : 0; // Más probable empate que victoria visitante
  }
  
  // Resultado normal
  if (roll < homeWinProb) return 1;       // Victoria local
  if (roll < homeWinProb + drawProb) return 0;  // Empate
  return -1;  // Victoria visitante
}

/**
 * Simular goles según resultado decidido
 */
function simulateGoals(result, homeStrength, awayStrength, importance) {
  const homeProfile = homeStrength.profile;
  const awayProfile = awayStrength.profile;
  
  let homeScore, awayScore;
  
  // Modificador por importancia
  const impMod = importance === 'final' ? 0.85 : importance === 'crucial' ? 0.95 : 1;
  
  if (result === 1) {
    // Victoria local
    const margin = weightedRandom([
      { value: 1, weight: 45 },  // 1-0, 2-1, etc
      { value: 2, weight: 30 },  // 2-0, 3-1, etc
      { value: 3, weight: 15 },  // 3-0, 4-1, etc
      { value: 4, weight: 8 },   // Goleada
      { value: 5, weight: 2 }    // Goleada histórica
    ]);
    
    homeScore = Math.round(homeProfile.goalsScored * impMod + Math.random() * 1.5);
    awayScore = Math.max(0, homeScore - margin);
    
    // Asegurar que local gana
    if (homeScore <= awayScore) {
      homeScore = awayScore + 1;
    }
  } else if (result === -1) {
    // Victoria visitante
    const margin = weightedRandom([
      { value: 1, weight: 55 },  // Más ajustado fuera
      { value: 2, weight: 30 },
      { value: 3, weight: 12 },
      { value: 4, weight: 3 }
    ]);
    
    awayScore = Math.round(awayProfile.goalsScored * impMod + Math.random() * 1.2);
    homeScore = Math.max(0, awayScore - margin);
    
    if (awayScore <= homeScore) {
      awayScore = homeScore + 1;
    }
  } else {
    // Empate
    const goals = weightedRandom([
      { value: 0, weight: 25 },  // 0-0
      { value: 1, weight: 40 },  // 1-1
      { value: 2, weight: 25 },  // 2-2
      { value: 3, weight: 8 },   // 3-3
      { value: 4, weight: 2 }    // 4-4+
    ]);
    
    homeScore = goals;
    awayScore = goals;
  }
  
  return { homeScore, awayScore };
}

/**
 * Random ponderado
 */
function weightedRandom(options) {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const option of options) {
    random -= option.weight;
    if (random <= 0) return option.value;
  }
  
  return options[0].value;
}

/**
 * Generar eventos del partido
 */
function generateMatchEvents(homeScore, awayScore, homeTeam, awayTeam, homeStrength, awayStrength, referee) {
  const events = [];
  const totalGoals = homeScore + awayScore;
  
  // Distribuir goles en el tiempo
  const goalMinutes = [];
  for (let i = 0; i < totalGoals; i++) {
    goalMinutes.push(Math.floor(Math.random() * 90) + 1);
  }
  goalMinutes.sort((a, b) => a - b);
  
  let homeGoalsLeft = homeScore;
  let awayGoalsLeft = awayScore;
  
  goalMinutes.forEach(minute => {
    // Decidir quién marca
    const homeChance = homeGoalsLeft / (homeGoalsLeft + awayGoalsLeft);
    const isHomeGoal = Math.random() < homeChance;
    
    if (isHomeGoal && homeGoalsLeft > 0) {
      events.push({
        type: 'goal',
        team: 'home',
        minute,
        player: selectScorer(homeTeam, homeStrength.strength?.lineup),
        goalType: minute > 85 ? 'late' : 'normal'
      });
      homeGoalsLeft--;
    } else if (awayGoalsLeft > 0) {
      events.push({
        type: 'goal',
        team: 'away',
        minute,
        player: selectScorer(awayTeam, awayStrength.strength?.lineup),
        goalType: minute > 85 ? 'late' : 'normal'
      });
      awayGoalsLeft--;
    }
  });
  
  // Añadir tarjetas (2-4 amarillas, 0-1 rojas)
  const yellowCount = 2 + Math.floor(Math.random() * 3);
  const strictness = referee === 'strict' ? 1.5 : referee === 'lenient' ? 0.6 : 1;
  
  for (let i = 0; i < Math.floor(yellowCount * strictness); i++) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? homeTeam : awayTeam;
    events.push({
      type: 'yellow_card',
      team: isHome ? 'home' : 'away',
      minute: Math.floor(Math.random() * 90) + 1,
      player: selectRandomPlayer(team)
    });
  }
  
  // Roja (5% chance base)
  if (Math.random() < 0.05 * strictness) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? homeTeam : awayTeam;
    events.push({
      type: 'red_card',
      team: isHome ? 'home' : 'away',
      minute: 30 + Math.floor(Math.random() * 55),
      player: selectRandomPlayer(team)
    });
  }
  
  return events.sort((a, b) => a.minute - b.minute);
}

/**
 * Seleccionar goleador
 */
function selectScorer(team, lineup) {
  if (!team?.players) return { name: 'Desconocido' };
  
  const attackers = (lineup || team.players).filter(p => 
    ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(p.position)
  );
  
  if (attackers.length === 0) return team.players[0] || { name: 'Desconocido' };
  
  // Ponderar por overall
  const totalOvr = attackers.reduce((sum, p) => sum + p.overall, 0);
  let rand = Math.random() * totalOvr;
  
  for (const player of attackers) {
    rand -= player.overall;
    if (rand <= 0) return { name: player.name, position: player.position };
  }
  
  return { name: attackers[0].name, position: attackers[0].position };
}

function selectRandomPlayer(team) {
  if (!team?.players || team.players.length === 0) return { name: 'Desconocido' };
  return { name: team.players[Math.floor(Math.random() * team.players.length)].name };
}

/**
 * Generar estadísticas del partido
 */
function generateMatchStats(homeStrength, awayStrength, homeScore, awayScore, result) {
  // Posesión basada en ratings y resultado
  const midDiff = (homeStrength.strength?.midfield || 70) - (awayStrength.strength?.midfield || 70);
  let homePossession = 50 + midDiff / 4 + (result === 1 ? 5 : result === -1 ? -5 : 0);
  homePossession = Math.max(30, Math.min(70, homePossession));
  
  // Tiros
  const homeShots = 8 + Math.floor(homePossession / 10) + homeScore * 2;
  const awayShots = 8 + Math.floor((100 - homePossession) / 10) + awayScore * 2;
  
  return {
    possession: { home: Math.round(homePossession), away: Math.round(100 - homePossession) },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: Math.floor(homeShots * 0.4), away: Math.floor(awayShots * 0.4) },
    corners: { home: Math.floor(homePossession / 12), away: Math.floor((100 - homePossession) / 12) },
    fouls: { home: 10 + Math.floor(Math.random() * 6), away: 10 + Math.floor(Math.random() * 6) }
  };
}

// ============================================================
// EXPORTAR FUNCIÓN PRINCIPAL
// ============================================================

export default simulateMatchV2;
