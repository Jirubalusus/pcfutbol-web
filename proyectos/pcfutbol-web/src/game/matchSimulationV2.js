// ============================================================
// MATCH SIMULATION V2 - Motor de Simulación Realista
// ============================================================
// Prioriza jerarquía real: los grandes ganan, los pequeños luchan
// Permite sorpresas controladas (~15% de upsets)
// Empates más frecuentes entre equipos parejos

import { FORMATIONS, TACTICS, calculateTeamStrength, getTacticalMatchupBonus } from './gameShared';

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
  huge: { diff: 25, upsetChance: 0.02 },      // Dif >25 pts: 2% upset (casi imposible)
  large: { diff: 18, upsetChance: 0.05 },     // Dif 18-25: 5% upset
  medium: { diff: 12, upsetChance: 0.10 },    // Dif 12-18: 10% upset
  small: { diff: 6, upsetChance: 0.18 },      // Dif 6-12: 18% upset
  tiny: { diff: 0, upsetChance: 0.30 }        // Dif <6: 30% upset (casi parejo)
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
 * Obtener perfil de equipo según reputación (escala 0-100)
 */
export function getTeamProfile(reputation) {
  if (reputation >= 90) return TEAM_PROFILES.elite;     // Real Madrid (95), Barcelona (93)
  if (reputation >= 80) return TEAM_PROFILES.top;        // Newcastle (82), Atlético (~85)
  if (reputation >= 72) return TEAM_PROFILES.midHigh;    // Athletic (~78), Betis, Valencia
  if (reputation >= 65) return TEAM_PROFILES.mid;        // Getafe (67), Osasuna, Celta
  if (reputation >= 58) return TEAM_PROFILES.midLow;     // Recreativo (61), equipos modestos
  return TEAM_PROFILES.low;                               // Equipos menores (<58)
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
    seasonMomentum = 0, // -20 a +20 según racha de temporada
    customLineup = null, // Lineup personalizado del jugador
    attendanceFillRate = 0.7, // Ocupación del estadio
    playerForm = {},     // Player form data
    grassCondition = 100, // Estado del césped (0-100)
    benchPlayers = null  // Convocados no titulares (banquillo)
  } = context;
  
  // Base: media del 11 titular + bench contribution (usando lineup custom si disponible)
  const strength = calculateTeamStrength(team, formation, tactic, morale, customLineup, playerForm, benchPlayers);
  const baseRating = strength.effectiveOverall || strength.overall || 70;
  
  // Perfil de equipo: mezcla reputación con calidad real de plantilla
  // Si la plantilla es mucho peor que la reputación, el perfil baja
  const reputation = team.reputation || 70;
  const ovrAsRep = Math.min(99, baseRating * 1.1); // OVR 70 → ~77 rep equiv, OVR 40 → ~44
  // 70% peso al OVR real, 30% reputación histórica
  const effectiveRep = ovrAsRep * 0.7 + reputation * 0.3;
  const profile = getTeamProfile(effectiveRep);
  
  // Factor de plantilla (calidad de suplentes)
  const squadDepth = calculateSquadDepth(team);
  
  // Penalizaciones
  const fatiguePenalty = fatigue * 0.15;  // Máx -15 puntos por fatiga
  const injuryPenalty = injuries * 2;      // -2 por cada lesionado clave
  
  // Bonificaciones
  const moraleBonus = (morale - 50) * 0.12;  // ±6 puntos por moral
  // Factor cancha: base 2 pts + hasta 6 pts extra según ocupación del estadio
  // Estadio lleno (100%) = +8 pts, medio vacío (30%) = +3.8 pts, vacío (10%) = +2.6 pts
  const grassFactor = grassCondition >= 70 ? 1.0 : grassCondition >= 40 ? 0.85 : 0.7;
  const homeBonus = isHome ? (2 + (attendanceFillRate * 6)) * grassFactor : 0;
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
  if (!team.players || team.players.length <= 11) return 0.5;
  
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
    referee = 'neutral',   // neutral, strict, lenient
    homeLineup = null,     // Lineup personalizado del equipo local
    awayLineup = null,     // Lineup personalizado del equipo visitante
    attendanceFillRate = 0.7,  // Ocupación del estadio (afecta factor cancha)
    grassCondition = 100,      // Estado del césped
    homeForm: ctxHomeForm,     // Form data passed from leagueEngine
    awayForm: ctxAwayForm,     // Form data passed from leagueEngine
    playerTeamForm = {},
    playerTeamId = null,
    medicalPrevention = 0,
    playerIsHome = null,
    playerBenchPlayers = null
  } = context;
  
  // Use form data from context (set by leagueEngine), or fallback to playerTeamForm for backward compat
  const homeForm = ctxHomeForm || (homeTeamData.id === playerTeamId ? playerTeamForm : {});
  const awayForm = ctxAwayForm || (awayTeamData.id === playerTeamId ? playerTeamForm : {});
  
  // Calcular fuerzas ajustadas (con lineup del jugador si disponible)
  const homeStrength = calculateMatchStrength(homeTeamData, homeFormation, homeTactic, {
    morale: homeMorale,
    isHome: true,
    seasonMomentum: homeSeasonMomentum,
    customLineup: homeLineup,
    attendanceFillRate,
    grassCondition,
    playerForm: homeForm,
    benchPlayers: playerIsHome === true ? playerBenchPlayers : null
  });
  
  const awayStrength = calculateMatchStrength(awayTeamData, awayFormation, awayTactic, {
    morale: awayMorale,
    isHome: false,
    seasonMomentum: awaySeasonMomentum,
    customLineup: awayLineup,
    playerForm: awayForm,
    benchPlayers: playerIsHome === false ? playerBenchPlayers : null
  });
  
  // Bonus por matchup táctico (piedra-papel-tijera)
  const homeTacticalBonus = getTacticalMatchupBonus(homeTactic, awayTactic);
  const awayTacticalBonus = getTacticalMatchupBonus(awayTactic, homeTactic);
  
  // Diferencia de nivel (incluye bonus táctico)
  const ratingDiff = (homeStrength.rating + homeTacticalBonus) - (awayStrength.rating + awayTacticalBonus);
  // Reputación: pequeño bonus solo con diferencias muy grandes (>20). OVR ya domina vía profile.
  const rawRepDiff = homeStrength.reputation - awayStrength.reputation;
  const reputationDiff = Math.abs(rawRepDiff) > 20 ? Math.sign(rawRepDiff) * (Math.abs(rawRepDiff) - 20) * 0.15 : 0;
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
  
  // Simular goles según resultado (tácticas afectan cantidad de goles)
  let { homeScore, awayScore } = simulateGoals(
    result,
    homeStrength,
    awayStrength,
    importance,
    homeTactic,
    awayTactic
  );
  
  // Penalty Master perk: 30% chance of winning a penalty per match + always scores.
  // Keep the extra goal tied to an actual penalty goal event so scorer tables and
  // match narration stay coherent.
  let forcedPenaltyGoalSide = null;
  if (context.penaltyMaster) {
    if (Math.random() < 0.30) {
      forcedPenaltyGoalSide = context.penaltyMaster;
      if (context.penaltyMaster === 'home') homeScore++;
      else awayScore++;
    }
  }

  // Generar eventos del partido
  const matchEventData = generateMatchEvents(
    homeScore,
    awayScore,
    homeTeamData,
    awayTeamData,
    homeStrength,
    awayStrength,
    referee,
    { grassCondition, medicalPrevention, playerIsHome, forcedPenaltyGoalSide, playerBenchPlayers }
  );
  const events = matchEventData.events;
  const stoppageTime = matchEventData.stoppageTime;
  const finalLineups = matchEventData.finalLineups;
  
  // Knockout mode: if draw, resolve with extra time then penalties
  let extraTime = false;
  let penalties = null;
  let finalHomeScore = homeScore;
  let finalAwayScore = awayScore;

  if (context.knockout && homeScore === awayScore) {
    extraTime = true;
    const homeSentOff = new Set(events.filter(e => e.type === 'red_card' && e.team === 'home').map(e => getPlayerName(e.player)));
    const awaySentOff = new Set(events.filter(e => e.type === 'red_card' && e.team === 'away').map(e => getPlayerName(e.player)));
    const homeTeamOnPitch = { ...homeTeamData, players: (finalLineups?.home || homeStrength.strength?.lineup || homeTeamData.players || []).filter(p => !homeSentOff.has(p.name)) };
    const awayTeamOnPitch = { ...awayTeamData, players: (finalLineups?.away || awayStrength.strength?.lineup || awayTeamData.players || []).filter(p => !awaySentOff.has(p.name)) };
    const extraTimeScorerCounts = buildScorerCounts(events);
    // Extra time: ~30% chance someone scores, slight home advantage
    const etRand = Math.random();
    if (etRand < 0.18) {
      // Home scores in extra time
      finalHomeScore += 1;
      const scorer = selectScorer(homeTeamOnPitch, null, extraTimeScorerCounts.home, {
        goalType: 'normal',
        teamGoals: finalHomeScore,
        teamGoalsSoFar: finalHomeScore - 1
      });
      events.push({ type: 'goal', team: 'home', minute: 90 + Math.floor(Math.random() * 30) + 1, player: scorer, goalType: 'normal', isExtraTime: true });
    } else if (etRand < 0.30) {
      // Away scores in extra time
      finalAwayScore += 1;
      const scorer = selectScorer(awayTeamOnPitch, null, extraTimeScorerCounts.away, {
        goalType: 'normal',
        teamGoals: finalAwayScore,
        teamGoalsSoFar: finalAwayScore - 1
      });
      events.push({ type: 'goal', team: 'away', minute: 90 + Math.floor(Math.random() * 30) + 1, player: scorer, goalType: 'normal', isExtraTime: true });
    }

    // If still draw after extra time → penalties
    if (finalHomeScore === finalAwayScore) {
      penalties = generatePenaltyShootout(homeStrength, awayStrength);
    }
  }

  // ── MOTM (Man of the Match) calculation ──
  const finalEvents = normalizeDisciplinaryTimeline(events);
  const reconciledGoals = countGoalsByTeam(finalEvents);
  finalHomeScore = reconciledGoals.home;
  finalAwayScore = reconciledGoals.away;
  if (context.knockout) {
    if (finalHomeScore === finalAwayScore && !penalties) {
      penalties = generatePenaltyShootout(homeStrength, awayStrength);
    } else if (finalHomeScore !== finalAwayScore) {
      penalties = null;
    }
  }
  const eventYellowsHome = finalEvents.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const eventYellowsAway = finalEvents.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const eventRedsHome = finalEvents.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const eventRedsAway = finalEvents.filter(e => e.type === 'red_card' && e.team === 'away').length;
  const finalResult = finalHomeScore > finalAwayScore ? 1 : finalHomeScore < finalAwayScore ? -1 : 0;
  const stats = generateMatchStats(
    homeStrength,
    awayStrength,
    finalHomeScore,
    finalAwayScore,
    finalResult,
    homeTactic,
    awayTactic,
    { yellowCards: { home: eventYellowsHome, away: eventYellowsAway }, redCards: { home: eventRedsHome, away: eventRedsAway } }
  );
  stats.substitutions = {
    home: finalEvents.filter(e => e.type === 'substitution' && e.team === 'home').length,
    away: finalEvents.filter(e => e.type === 'substitution' && e.team === 'away').length
  };
  stats.tacticalAdjustments = finalEvents
    .filter(e => e.type === 'substitution')
    .map(e => ({ minute: e.minute, team: e.team, intent: e.tacticalIntent, reason: e.reason }));
  const motm = calculateMOTM(finalEvents, finalHomeScore, finalAwayScore, homeTeamData, awayTeamData);

  return {
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    extraTime,
    penalties,
    stoppageTime,
    events: finalEvents,
    finalLineups,
    substitutions: finalEvents.filter(e => e.type === 'substitution'),
    stats,
    motm,
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
 * Calculate Man of the Match from events
 */
function calculateMOTM(events, homeScore, awayScore, homeTeamData, awayTeamData) {
  const scores = {};
  const playerMeta = {}; // track goals, assists per player

  for (const e of events) {
    const pName = typeof e.player === 'object' ? e.player?.name : e.player;
    if (!pName) continue;
    const key = `${e.team}::${pName}`;
    if (!scores[key]) scores[key] = 0;
    if (!playerMeta[key]) playerMeta[key] = { name: pName, team: e.team, goals: 0, assists: 0 };

    if (e.type === 'goal') { scores[key] += 3; playerMeta[key].goals++; }
    if (e.type === 'yellow_card') scores[key] -= 1;
    if (e.type === 'red_card') scores[key] -= 3;

    // Assists
    if (e.type === 'goal' && e.assist) {
      const aName = typeof e.assist === 'object' ? e.assist?.name : e.assist;
      if (aName) {
        const aKey = `${e.team}::${aName}`;
        if (!scores[aKey]) scores[aKey] = 0;
        if (!playerMeta[aKey]) playerMeta[aKey] = { name: aName, team: e.team, goals: 0, assists: 0 };
        scores[aKey] += 2;
        playerMeta[aKey].assists++;
      }
    }
  }

  // Clean sheet bonus for GK (approximate: if team conceded 0)
  const addGKBonus = (teamData, team, conceded) => {
    if (conceded === 0 && teamData?.players?.length) {
      const gk = teamData.players.find(p => p.position === 'GK' || p.position === 'POR');
      if (gk) {
        const key = `${team}::${gk.name}`;
        if (!scores[key]) scores[key] = 0;
        if (!playerMeta[key]) playerMeta[key] = { name: gk.name, team, goals: 0, assists: 0 };
        scores[key] += 2;
      }
    }
  };
  addGKBonus(homeTeamData, 'home', awayScore);
  addGKBonus(awayTeamData, 'away', homeScore);

  // Pick best
  let bestKey = null;
  let bestScore = -Infinity;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestKey = key; }
  }

  if (!bestKey || bestScore <= 0) return null;

  const meta = playerMeta[bestKey];
  // Rating: base 7.0 + 0.3 per point, capped at 10
  const rating = Math.min(10, +(7.0 + bestScore * 0.3).toFixed(1));

  return {
    name: meta.name,
    team: meta.team,
    goals: meta.goals,
    assists: meta.assists,
    rating
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
  let awayWinBase = awayProfile.baseWinRate * 0.75; // Visitante algo más difícil (era 0.6, demasiado punitivo)
  
  // Ajustar según diferencia de rating — cuanto mayor la diff, más dominante el favorito
  const diffFactor = totalDiff / 60; // Normalizar (más impacto que antes)
  homeWinBase += diffFactor * 0.55;
  awayWinBase -= diffFactor * 0.45;
  
  // Evitar negativos
  homeWinBase = Math.max(0.05, homeWinBase);
  awayWinBase = Math.max(0.02, awayWinBase);
  
  // Derby: más impredecible
  if (isDerby) {
    homeWinBase *= 0.85;
    awayWinBase *= 1.15;
    drawBase *= 1.1;
  }
  
  const rawTotal = homeWinBase + drawBase + awayWinBase;
  let homeWinProb = homeWinBase / rawTotal;
  let drawProb = drawBase / rawTotal;
  let awayWinProb = awayWinBase / rawTotal;

  // Mínimos futboleros después de normalizar: un grande domina, pero nunca es invencible.
  // Ejemplo: un Madrid local contra un Alavés aún deja una vía realista a empate/sorpresa.
  const absDiff = Math.abs(totalDiff);
  const minUnderdog = absDiff > 28 ? 0.06 : absDiff > 20 ? 0.08 : absDiff > 12 ? 0.11 : 0.16;
  const minDraw = absDiff > 28 ? 0.12 : absDiff > 18 ? 0.15 : 0.18;
  const maxFavorite = absDiff > 28 ? 0.82 : absDiff > 18 ? 0.76 : 0.70;

  if (totalDiff >= 0) {
    awayWinProb = Math.max(awayWinProb, minUnderdog);
    drawProb = Math.max(drawProb, minDraw);
    homeWinProb = Math.min(homeWinProb, maxFavorite);
  } else {
    homeWinProb = Math.max(homeWinProb, minUnderdog);
    drawProb = Math.max(drawProb, minDraw);
    awayWinProb = Math.min(awayWinProb, maxFavorite);
  }

  const total = homeWinProb + drawProb + awayWinProb;
  return {
    homeWinProb: homeWinProb / total,
    drawProb: drawProb / total,
    awayWinProb: awayWinProb / total
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
  // Separate roll for upset check — reduced from 0.5 to 0.35 to let quality teams dominate more
  if (Math.random() < upsetFactor * 0.35) {
    return Math.random() > 0.55 ? -1 : 0;
  }
  
  // Normal result roll
  const roll = Math.random();
  if (roll < homeWinProb) return 1;
  if (roll < homeWinProb + drawProb) return 0;
  return -1;
}

/**
 * Simular goles según resultado decidido
 */
function simulateGoals(result, homeStrength, awayStrength, importance, homeTactic = 'balanced', awayTactic = 'balanced') {
  const homeProfile = homeStrength.profile;
  const awayProfile = awayStrength.profile;
  
  let homeScore, awayScore;
  
  // Modificador por importancia
  const impMod = importance === 'final' ? 0.85 : importance === 'crucial' ? 0.95 : 1;
  
  // Tácticas defensivas = menos goles totales, ofensivas = más
  const homeTacticData = TACTICS[homeTactic] || TACTICS.balanced;
  const awayTacticData = TACTICS[awayTactic] || TACTICS.balanced;
  // Promedio de lo "abierto" del partido (ambas tácticas influyen)
  const goalFrequency = ((homeTacticData.attack + awayTacticData.attack) / 2);  // >1 = más goles, <1 = menos
  // El motor previo se iba a >3.5 goles/partido en auditorías largas. Este
  // factor baja el ritmo hacia el rango moderno (~2.6-2.9) sin quitar jerarquía.
  const goalPace = 0.78;
  
  if (result === 1) {
    // Victoria local
    const margin = weightedRandom([
      { value: 1, weight: 54 },  // 1-0, 2-1, etc
      { value: 2, weight: 29 },  // 2-0, 3-1, etc
      { value: 3, weight: 12 },  // 3-0, 4-1, etc
      { value: 4, weight: 4 },   // Goleada
      { value: 5, weight: 1 }    // Goleada histórica
    ]);
    
    homeScore = Math.round(homeProfile.goalsScored * impMod * goalFrequency * goalPace + Math.random() * 1.05);
    awayScore = Math.max(0, homeScore - margin);
    
    // Asegurar que local gana
    if (homeScore <= awayScore) {
      homeScore = awayScore + 1;
    }
  } else if (result === -1) {
    // Victoria visitante
    const margin = weightedRandom([
      { value: 1, weight: 63 },  // Más ajustado fuera
      { value: 2, weight: 27 },
      { value: 3, weight: 8 },
      { value: 4, weight: 2 }
    ]);
    
    awayScore = Math.round(awayProfile.goalsScored * impMod * goalFrequency * goalPace + Math.random() * 0.95);
    homeScore = Math.max(0, awayScore - margin);
    
    if (awayScore <= homeScore) {
      awayScore = homeScore + 1;
    }
  } else {
    // Empate
    const goals = weightedRandom([
      { value: 0, weight: 29 },  // 0-0
      { value: 1, weight: 45 },  // 1-1
      { value: 2, weight: 21 },  // 2-2
      { value: 3, weight: 4 },   // 3-3
      { value: 4, weight: 1 }    // 4-4+
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

function generatePenaltyShootout(homeStrength, awayStrength) {
  const homeRating = homeStrength.rating || 70;
  const awayRating = awayStrength.rating || 70;
  const homeAdvantage = 0.5 + Math.min(0.05, (homeRating - awayRating) / 200);
  const homeWinsPens = Math.random() < homeAdvantage;
  const winnerGoals = Math.floor(Math.random() * 3) + 4;
  const loserGoals = winnerGoals - (Math.floor(Math.random() * 2) + 1);
  return {
    home: homeWinsPens ? winnerGoals : loserGoals,
    away: homeWinsPens ? loserGoals : winnerGoals
  };
}

function getPlayerName(player) {
  return typeof player === 'object' ? player?.name : player;
}

function getPrimaryPosition(player) {
  return (player?.playingPosition || player?.position || '').split(',')[0].trim().toUpperCase();
}

function getNaturalPosition(player) {
  return (player?.position || '').split(',')[0].trim().toUpperCase();
}

function getScoringRole(player) {
  const playingPosition = getPrimaryPosition(player);
  const naturalPosition = getNaturalPosition(player);
  const attackingPositions = ['ST', 'CF', 'RW', 'LW', 'CAM'];
  const defensivePositions = ['GK', 'CB', 'RB', 'LB', 'RWB', 'LWB'];

  if (naturalPosition === 'GK' || playingPosition === 'GK') return 'goalkeeper';
  if (defensivePositions.includes(naturalPosition) && ['RW', 'LW', 'RM', 'LM'].includes(playingPosition)) return 'wingback';
  if (['ST', 'CF'].includes(playingPosition) || ['ST', 'CF'].includes(naturalPosition)) return 'striker';
  if (['RW', 'LW'].includes(playingPosition) || ['RW', 'LW'].includes(naturalPosition)) return 'winger';
  if (playingPosition === 'CAM' || naturalPosition === 'CAM') return 'attackingMid';
  if (['RM', 'LM'].includes(playingPosition)) {
    return defensivePositions.includes(naturalPosition) ? 'wingback' : 'wideMid';
  }
  if (['CM', 'CDM'].includes(playingPosition) || ['CM', 'CDM'].includes(naturalPosition)) return 'centralMid';
  if (defensivePositions.includes(playingPosition) || defensivePositions.includes(naturalPosition)) return 'defender';
  return attackingPositions.includes(playingPosition) ? 'attackingMid' : 'centralMid';
}

function isDefensiveScorer(player) {
  return ['defender', 'wingback', 'goalkeeper'].includes(getScoringRole(player));
}

function makeEventPlayer(player) {
  return {
    name: player.name,
    position: player.position,
    playingPosition: player.playingPosition,
    overall: player.overall,
    stamina: player.stamina
  };
}

function getPlayerKey(teamLabel, player) {
  const name = getPlayerName(player);
  return name ? `${teamLabel}:${name}` : null;
}

function getLatestRequiredEventMinute(events, teamLabel, player) {
  const playerName = getPlayerName(player);
  if (!playerName) return 0;

  return events.reduce((latest, event) => {
    if (event.team !== teamLabel) return latest;
    const eventPlayer = getPlayerName(event.player);
    const eventAssist = getPlayerName(event.assist);
    if (eventPlayer === playerName || eventAssist === playerName) {
      return Math.max(latest, event.minute || 0);
    }
    return latest;
  }, 0);
}

function randomMinuteBetween(min, max) {
  const safeMin = Math.max(1, Math.ceil(min));
  const safeMax = Math.min(90, Math.floor(max));
  if (safeMin > safeMax) return null;
  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
}

function generateStoppageTime(totalGoals = 0) {
  const base = weightedRandom([
    { value: 2, weight: 20 },
    { value: 3, weight: 34 },
    { value: 4, weight: 28 },
    { value: 5, weight: 14 },
    { value: 6, weight: 4 }
  ]);
  const goalBonus = totalGoals >= 5 && Math.random() < 0.25 ? 1 : 0;
  return Math.min(7, base + goalBonus);
}

function randomGoalMinute(stoppageTime = 4) {
  // Around 8-10% of goals happen in added time when it exists; enough to make
  // 90+ visible without flooding the event feed.
  if (stoppageTime > 0 && Math.random() < 0.085) {
    return 90 + Math.floor(Math.random() * stoppageTime) + 1;
  }
  // Slight late-match bias like real football scoring curves.
  const roll = Math.random();
  if (roll < 0.18) return 1 + Math.floor(Math.random() * 20);
  if (roll < 0.42) return 21 + Math.floor(Math.random() * 25);
  if (roll < 0.70) return 46 + Math.floor(Math.random() * 25);
  return 71 + Math.floor(Math.random() * 20);
}

function sortEvents(events) {
  const priority = {
    goal: 0,
    injury: 1,
    substitution: 2,
    yellow_card: 3,
    red_card: 4
  };
  return [...events].sort((a, b) =>
    (a.minute || 0) - (b.minute || 0) || (priority[a.type] ?? 9) - (priority[b.type] ?? 9)
  );
}

function countGoalsByTeam(events) {
  return events.reduce((score, event) => {
    if (event.type === 'goal' && event.team === 'home') score.home++;
    if (event.type === 'goal' && event.team === 'away') score.away++;
    return score;
  }, { home: 0, away: 0 });
}

function buildScorerCounts(events) {
  return events.reduce((counts, event) => {
    if (event.type !== 'goal') return counts;
    const name = getPlayerName(event.player);
    if (!name || !counts[event.team]) return counts;
    counts[event.team].set(name, (counts[event.team].get(name) || 0) + 1);
    return counts;
  }, { home: new Map(), away: new Map() });
}

function normalizeDisciplinaryTimeline(events) {
  const yellowed = new Set();
  const sentOff = new Set();
  const normalized = [];

  for (const event of sortEvents(events)) {
    const key = getPlayerKey(event.team, event.player);
    const assistKey = getPlayerKey(event.team, event.assist);

    if ((key && sentOff.has(key)) || (event.type === 'goal' && assistKey && sentOff.has(assistKey))) {
      // After a red card the player is no longer on the pitch.
      if (['goal', 'yellow_card', 'red_card', 'injury'].includes(event.type)) continue;
    }

    if (event.type === 'yellow_card' && key) {
      if (yellowed.has(key)) {
        normalized.push(event);
        normalized.push({
          type: 'red_card',
          team: event.team,
          minute: event.minute,
          player: event.player,
          isSecondYellow: true,
          reason: 'Segunda amarilla'
        });
        sentOff.add(key);
      } else {
        yellowed.add(key);
        normalized.push(event);
      }
      continue;
    }

    if (event.type === 'red_card' && key) {
      if (sentOff.has(key)) continue;
      normalized.push(event);
      sentOff.add(key);
      continue;
    }

    normalized.push(event);
  }

  return sortEvents(normalized);
}

/**
 * Generar eventos del partido
 */

const SUBSTITUTION_MINUTE_BANDS = [
  [52, 64], // primer refresco: rara vez antes del 55, pero puede pasar si el partido lo pide
  [61, 73],
  [70, 81],
  [78, 88],
  [84, 90]
];
const MAX_SUBSTITUTIONS = 5;

function getPlayerRoleGroup(player) {
  const pos = getPrimaryPosition(player);
  const naturalPos = getNaturalPosition(player);
  if (['GK', 'POR'].includes(naturalPos) || ['GK', 'POR'].includes(pos)) return 'goalkeeper';
  const effectivePos = ['SLOT', ''].includes(pos) ? naturalPos : pos;
  if (['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(effectivePos)) return 'attacking';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB', 'CDM'].includes(effectivePos)) return 'defensive';
  return 'balanced';
}

function getSubstitutionIntent(teamLabel, minute, liveScore, ownStrength, opponentStrength) {
  const scoreDiff = teamLabel === 'home'
    ? liveScore.home - liveScore.away
    : liveScore.away - liveScore.home;
  const strengthGap = (ownStrength.rating || 70) - (opponentStrength.rating || 70);

  if (scoreDiff < 0) return minute >= 78 || scoreDiff <= -2 ? 'desperateAttack' : 'attack';
  if (scoreDiff > 0) return minute >= 78 ? 'closeGame' : 'defend';
  if (strengthGap >= 5) return minute >= 78 ? 'attack' : 'controlledAttack';
  if (strengthGap <= -5) return minute >= 78 ? 'defend' : 'protectPoint';
  return 'refresh';
}

function getSubstitutionReason(intent, liveScore) {
  const scoreline = `${liveScore.home}-${liveScore.away}`;
  const reasons = {
    desperateAttack: `Apuesta ofensiva total con ${scoreline}`,
    attack: `Busca más remate y llegada con ${scoreline}`,
    controlledAttack: `Se ve superior y quiere convertir el dominio con ${scoreline}`,
    closeGame: `Quiere cerrar el partido y proteger el ${scoreline}`,
    defend: `Refuerza el bloque defensivo con ${scoreline}`,
    protectPoint: `Protege un empate valioso ante un rival superior (${scoreline})`,
    refresh: `Refresca piernas sin romper el equilibrio (${scoreline})`
  };
  return reasons[intent] || `Ajuste táctico con ${scoreline}`;
}

function cloneLineup(lineup) {
  return (lineup || []).map(player => ({ ...player }));
}

function samePlayer(a, b) {
  const aName = getPlayerName(a);
  const bName = getPlayerName(b);
  return Boolean(aName && bName && aName === bName);
}

function buildBench(team, lineup, explicitBench = null) {
  if (explicitBench?.length) return explicitBench.filter(Boolean).map(p => ({ ...p }));
  const lineupNames = new Set((lineup || []).map(p => p?.name).filter(Boolean));
  return (team.players || []).filter(p => p?.name && !lineupNames.has(p.name) && !p.injured && !p.suspended).map(p => ({ ...p }));
}

function createTeamSimulationState(teamLabel, team, lineup, strength, explicitBench) {
  const initialLineup = cloneLineup(lineup?.length ? lineup : (team.players || []).slice(0, 11));
  const initialBench = buildBench(team, initialLineup, explicitBench);
  return {
    teamLabel,
    team,
    strength,
    initialLineup,
    currentLineup: cloneLineup(initialLineup),
    initialBench: cloneLineup(initialBench),
    bench: cloneLineup(initialBench),
    substitutionsUsed: 0,
    introducedPlayerNames: new Set()
  };
}

function playerChangeScore(player, intent, outgoing = false) {
  const role = getPlayerRoleGroup(player);
  const overall = player?.overall || 65;
  const stamina = player?.stamina ?? 70;
  const fatiguePenalty = outgoing ? (100 - stamina) * 0.08 : 0;
  const roleWeights = {
    desperateAttack: { attacking: 24, balanced: 8, defensive: -18, goalkeeper: -999 },
    attack: { attacking: 20, balanced: 6, defensive: -12, goalkeeper: -999 },
    controlledAttack: { attacking: 16, balanced: 8, defensive: -8, goalkeeper: -999 },
    closeGame: { defensive: 22, balanced: 8, attacking: -14, goalkeeper: -999 },
    defend: { defensive: 18, balanced: 6, attacking: -10, goalkeeper: -999 },
    protectPoint: { defensive: 16, balanced: 8, attacking: -8, goalkeeper: -999 },
    refresh: { attacking: 5, balanced: 8, defensive: 5, goalkeeper: -999 }
  };
  const base = roleWeights[intent]?.[role] ?? 0;
  return outgoing ? (100 - overall) + base + fatiguePenalty : overall + base;
}

function isCompatibleSubstitution(inPlayer, outPlayer, intent) {
  if (!inPlayer || !outPlayer) return false;
  if (getPlayerRoleGroup(inPlayer) === 'goalkeeper') return false;
  if (getPlayerRoleGroup(outPlayer) === 'goalkeeper') return false;
  if (intent === 'refresh') return getPlayerRoleGroup(inPlayer) === getPlayerRoleGroup(outPlayer) || (inPlayer.overall || 0) >= (outPlayer.overall || 0) - 3;
  return true;
}

function chooseSubstitution(teamState, intent) {
  if (teamState.substitutionsUsed >= MAX_SUBSTITUTIONS) return null;
  const availableBench = teamState.bench.filter(p => !p.injured && !p.suspended && getPlayerRoleGroup(p) !== 'goalkeeper');
  if (availableBench.length === 0) return null;

  const incomingCandidates = [...availableBench].sort((a, b) => playerChangeScore(b, intent, false) - playerChangeScore(a, intent, false));
  for (const playerIn of incomingCandidates) {
    const outgoingCandidates = teamState.currentLineup
      // En un partido real no es normal encadenar "entra X" y diez minutos después
      // "sale X" salvo lesión/roja. Protegemos a los recién entrados para evitar
      // carruseles artificiales como 58/68/78/85 con el mismo hilo de jugadores.
      .filter(playerOut => !teamState.introducedPlayerNames.has(getPlayerName(playerOut)))
      .filter(playerOut => isCompatibleSubstitution(playerIn, playerOut, intent))
      .sort((a, b) => playerChangeScore(b, intent, true) - playerChangeScore(a, intent, true));
    const playerOut = outgoingCandidates[0];
    if (!playerOut) continue;
    const inRole = getPlayerRoleGroup(playerIn);
    const outRole = getPlayerRoleGroup(playerOut);
    const tacticalGain = playerChangeScore(playerIn, intent, false) - (playerOut.overall || 65);
    if (intent === 'refresh' && tacticalGain < 1 && inRole !== outRole) continue;
    return { playerIn, playerOut };
  }
  return null;
}

function applySubstitution(teamState, change) {
  teamState.currentLineup = teamState.currentLineup.map(player => samePlayer(player, change.playerOut)
    ? { ...change.playerIn, playingPosition: change.playerOut.playingPosition || change.playerIn.playingPosition || change.playerIn.position }
    : player
  );
  teamState.bench = teamState.bench.filter(player => !samePlayer(player, change.playerIn));
  teamState.substitutionsUsed += 1;
  const playerInName = getPlayerName(change.playerIn);
  if (playerInName) teamState.introducedPlayerNames.add(playerInName);
}

function generateSubstitutionMinutePlan(teamState, teamLabel) {
  const outfieldBenchCount = teamState.bench.filter(p => !p.injured && !p.suspended && getPlayerRoleGroup(p) !== 'goalkeeper').length;
  if (outfieldBenchCount <= 0) return [];

  const plannedChanges = Math.min(MAX_SUBSTITUTIONS, outfieldBenchCount, weightedRandom([
    { value: 2, weight: 14 },
    { value: 3, weight: 36 },
    { value: 4, weight: 34 },
    { value: 5, weight: 16 }
  ]));

  const teamBias = teamLabel === 'home' ? -1 : 1;
  const minutes = [];

  for (let i = 0; i < plannedChanges; i++) {
    const [bandStart, bandEnd] = SUBSTITUTION_MINUTE_BANDS[i];
    const randomSpread = Math.floor(Math.random() * (bandEnd - bandStart + 1));
    let minute = bandStart + randomSpread + teamBias + Math.floor(Math.random() * 3) - 1;

    // Evita tandas robóticas: dentro del mismo equipo los cambios deben respirar.
    // Si dos caen muy pegados, desplazamos el posterior en vez de repetir patrón fijo.
    const previous = minutes[minutes.length - 1];
    if (previous && minute - previous < 4) minute = previous + 4 + Math.floor(Math.random() * 3);

    minutes.push(Math.max(52, Math.min(90, minute)));
  }

  return [...new Set(minutes)].sort((a, b) => a - b);
}

function avoidCrossTeamSubstitutionMinuteCollisions(homeMinutes, awayMinutes) {
  const homeSet = new Set(homeMinutes);
  const usedAway = new Set();
  return awayMinutes.map((minute) => {
    let candidate = minute;
    if (homeSet.has(candidate) || usedAway.has(candidate)) {
      const alternatives = [1, -1, 2, -2, 3, -3, 4]
        .map(delta => minute + delta)
        .filter(value => value >= 52 && value <= 90 && !homeSet.has(value) && !usedAway.has(value));
      candidate = alternatives[0] ?? candidate;
    }
    usedAway.add(candidate);
    return candidate;
  }).sort((a, b) => a - b);
}

function countTeamSubstitutionEvents(substitutionEvents, teamLabel) {
  return substitutionEvents.filter(event => event.type === 'substitution' && event.team === teamLabel).length;
}

function removeLatestFuturePlannedSubstitution(substitutionEvents, teamLabel, afterMinute) {
  const removableIndex = substitutionEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === 'substitution'
      && event.team === teamLabel
      && !event.forcedByInjury
      && (event.minute || 0) > afterMinute)
    .sort((a, b) => (b.event.minute || 0) - (a.event.minute || 0))[0]?.index;

  if (removableIndex === undefined) return false;
  substitutionEvents.splice(removableIndex, 1);
  return true;
}

function chooseInjuryReplacement(teamState, injuredPlayer, substitutionEvents, injuryMinute) {
  const teamLabel = teamState.teamLabel;
  const lineupAtInjury = getLineupAtMinute(teamState.initialLineup, substitutionEvents, teamLabel, injuryMinute);
  if (!lineupAtInjury.some(player => samePlayer(player, injuredPlayer))) return null;

  const injuredRole = getPlayerRoleGroup(injuredPlayer);
  const namesOnPitch = new Set(lineupAtInjury.map(getPlayerName).filter(Boolean));
  const alreadyUsedAsSub = new Set(substitutionEvents
    .filter(event => event.type === 'substitution' && event.team === teamLabel)
    .map(event => getPlayerName(event.playerIn))
    .filter(Boolean));

  const candidates = (teamState.initialBench || [])
    .filter(player => !player.injured && !player.suspended)
    .filter(player => !namesOnPitch.has(getPlayerName(player)))
    .filter(player => !alreadyUsedAsSub.has(getPlayerName(player)))
    .filter(player => injuredRole === 'goalkeeper'
      ? getPlayerRoleGroup(player) === 'goalkeeper'
      : getPlayerRoleGroup(player) !== 'goalkeeper')
    .sort((a, b) => {
      const roleMatchA = getPlayerRoleGroup(a) === injuredRole ? 1 : 0;
      const roleMatchB = getPlayerRoleGroup(b) === injuredRole ? 1 : 0;
      return roleMatchB - roleMatchA || (b.overall || 65) - (a.overall || 65);
    });

  const playerIn = candidates[0];
  if (!playerIn) return null;
  return { playerIn, playerOut: injuredPlayer };
}

function addForcedInjurySubstitution(teamState, injuredPlayer, injuryMinute, substitutionEvents) {
  const teamLabel = teamState.teamLabel;
  if (countTeamSubstitutionEvents(substitutionEvents, teamLabel) >= MAX_SUBSTITUTIONS) {
    removeLatestFuturePlannedSubstitution(substitutionEvents, teamLabel, injuryMinute);
  }

  const usedByInjuryMinute = substitutionEvents.filter(event => event.type === 'substitution'
    && event.team === teamLabel
    && (event.minute || 0) <= injuryMinute).length;
  if (usedByInjuryMinute >= MAX_SUBSTITUTIONS || countTeamSubstitutionEvents(substitutionEvents, teamLabel) >= MAX_SUBSTITUTIONS) return false;

  const change = chooseInjuryReplacement(teamState, injuredPlayer, substitutionEvents, injuryMinute);
  if (!change) return false;

  // Si el lesionado iba a salir más tarde en un cambio planificado, ese cambio ya no puede ocurrir.
  for (let i = substitutionEvents.length - 1; i >= 0; i--) {
    const event = substitutionEvents[i];
    if (event.type !== 'substitution' || event.team !== teamLabel || (event.minute || 0) <= injuryMinute) continue;
    if (samePlayer(event.playerOut, injuredPlayer) || samePlayer(event.playerIn, change.playerIn)) {
      substitutionEvents.splice(i, 1);
    }
  }

  while (countTeamSubstitutionEvents(substitutionEvents, teamLabel) >= MAX_SUBSTITUTIONS) {
    if (!removeLatestFuturePlannedSubstitution(substitutionEvents, teamLabel, injuryMinute)) return false;
  }

  substitutionEvents.push({
    type: 'substitution',
    team: teamLabel,
    minute: injuryMinute,
    playerIn: makeEventPlayer(change.playerIn),
    playerOut: makeEventPlayer(change.playerOut),
    forcedByInjury: true,
    tacticalIntent: 'forcedInjury',
    reason: 'Cambio obligado por lesión',
    substitutionsUsed: usedByInjuryMinute + 1
  });
  return true;
}

function renumberSubstitutionEvents(substitutionEvents) {
  ['home', 'away'].forEach(teamLabel => {
    sortEvents(substitutionEvents)
      .filter(event => event.type === 'substitution' && event.team === teamLabel)
      .forEach((event, index) => {
        event.substitutionsUsed = index + 1;
      });
  });
}

function applyDueSubstitutionWindows({ windows, nextMinute, homeState, awayState, liveScore, events, homeStrength, awayStrength }) {
  const processTeamWindow = (teamLabel, teamState, ownStrength, opponentStrength, minute) => {
    const intent = getSubstitutionIntent(teamLabel, minute, liveScore, ownStrength, opponentStrength);
    const change = chooseSubstitution(teamState, intent);
    if (!change) return;
    applySubstitution(teamState, change);
    events.push({
      type: 'substitution',
      team: teamLabel,
      minute,
      playerIn: makeEventPlayer(change.playerIn),
      playerOut: makeEventPlayer(change.playerOut),
      tacticalIntent: intent,
      reason: getSubstitutionReason(intent, liveScore),
      scoreline: { ...liveScore },
      substitutionsUsed: teamState.substitutionsUsed
    });
  };

  while ((windows.home.length && windows.home[0] <= nextMinute) || (windows.away.length && windows.away[0] <= nextMinute)) {
    const nextHome = windows.home.length ? windows.home[0] : Infinity;
    const nextAway = windows.away.length ? windows.away[0] : Infinity;

    if (nextHome <= nextAway) {
      const minute = windows.home.shift();
      processTeamWindow('home', homeState, homeStrength, awayStrength, minute);
    } else {
      const minute = windows.away.shift();
      processTeamWindow('away', awayState, awayStrength, homeStrength, minute);
    }
  }
}

function getLineupAtMinute(initialLineup, substitutionEvents, teamLabel, minute) {
  let lineup = cloneLineup(initialLineup);
  for (const event of sortEvents(substitutionEvents)) {
    if (event.type !== 'substitution' || event.team !== teamLabel || (event.minute || 0) > minute) continue;
    lineup = lineup.map(player => samePlayer(player, event.playerOut) ? { ...event.playerIn, playingPosition: event.playerOut?.playingPosition || event.playerIn?.playingPosition || event.playerIn?.position } : player);
  }
  return lineup;
}

function getLineupAfterAllSubstitutions(initialLineup, substitutionEvents, teamLabel) {
  return getLineupAtMinute(initialLineup, substitutionEvents, teamLabel, 130);
}

/**
 * Generar eventos del partido
 */
function generateMatchEvents(homeScore, awayScore, homeTeam, awayTeam, homeStrength, awayStrength, referee, context = {}) {
  const events = [];
  const substitutionEvents = [];
  const totalGoals = homeScore + awayScore;
  const stoppageTime = generateStoppageTime(totalGoals);
  const homeLineup = homeStrength.strength?.lineup || (homeTeam.players || []).slice(0, 11);
  const awayLineup = awayStrength.strength?.lineup || (awayTeam.players || []).slice(0, 11);
  const homeExplicitBench = context.playerIsHome === true ? context.playerBenchPlayers : null;
  const awayExplicitBench = context.playerIsHome === false ? context.playerBenchPlayers : null;
  const homeState = createTeamSimulationState('home', homeTeam, homeLineup, homeStrength, homeExplicitBench);
  const awayState = createTeamSimulationState('away', awayTeam, awayLineup, awayStrength, awayExplicitBench);
  const homeSubstitutionPlan = generateSubstitutionMinutePlan(homeState, 'home');
  const awaySubstitutionPlan = avoidCrossTeamSubstitutionMinuteCollisions(
    homeSubstitutionPlan,
    generateSubstitutionMinutePlan(awayState, 'away')
  );
  const substitutionWindows = {
    home: homeSubstitutionPlan,
    away: awaySubstitutionPlan
  };
  const liveScore = { home: 0, away: 0 };
  
  // Distribuir goles en el tiempo. Una pequeña parte cae en 90+ para que el
  // descuento exista de verdad y no solo como animación de interfaz.
  const goalMinutes = [];
  for (let i = 0; i < totalGoals; i++) {
    goalMinutes.push(randomGoalMinute(stoppageTime));
  }
  goalMinutes.sort((a, b) => a - b);
  
  let homeGoalsLeft = homeScore;
  let awayGoalsLeft = awayScore;
  const scorerCounts = {
    home: new Map(),
    away: new Map()
  };
  let forcedPenaltyUsed = false;
  const { forcedPenaltyGoalSide = null } = context;
  
  goalMinutes.forEach(minute => {
    applyDueSubstitutionWindows({ windows: substitutionWindows, nextMinute: minute, homeState, awayState, liveScore, events: substitutionEvents, homeStrength, awayStrength });
    if (homeGoalsLeft + awayGoalsLeft <= 0) return; // Safety: no goals left to allocate
    // Decidir quién marca
    const homeChance = homeGoalsLeft / (homeGoalsLeft + awayGoalsLeft);
    const isHomeGoal = Math.random() < homeChance;
    
    if (isHomeGoal && homeGoalsLeft > 0) {
      const teamGoalsSoFar = homeScore - homeGoalsLeft;
      const forcedPenalty = forcedPenaltyGoalSide === 'home' && !forcedPenaltyUsed;
      const goalType = forcedPenalty ? 'penalty' : selectGoalType(minute, homeScore, teamGoalsSoFar);
      if (forcedPenalty) forcedPenaltyUsed = true;
      const scorer = selectScorer(homeTeam, homeState.currentLineup, scorerCounts.home, { goalType, teamGoals: homeScore, teamGoalsSoFar });
      const assistChance = goalType === 'penalty' ? 0 : goalType === 'set_piece' ? 0.58 : 0.74;
      const assister = Math.random() < assistChance ? selectAssister(homeTeam, homeState.currentLineup, scorer, goalType) : null;
      events.push({
        type: 'goal',
        team: 'home',
        minute,
        player: scorer,
        assist: assister,
        goalType: minute > 85 && goalType === 'normal' ? 'late' : goalType
      });
      scorerCounts.home.set(scorer.name, (scorerCounts.home.get(scorer.name) || 0) + 1);
      homeGoalsLeft--;
      liveScore.home++;
    } else if (awayGoalsLeft > 0) {
      const teamGoalsSoFar = awayScore - awayGoalsLeft;
      const forcedPenalty = forcedPenaltyGoalSide === 'away' && !forcedPenaltyUsed;
      const goalType = forcedPenalty ? 'penalty' : selectGoalType(minute, awayScore, teamGoalsSoFar);
      if (forcedPenalty) forcedPenaltyUsed = true;
      const scorer = selectScorer(awayTeam, awayState.currentLineup, scorerCounts.away, { goalType, teamGoals: awayScore, teamGoalsSoFar });
      const assistChance = goalType === 'penalty' ? 0 : goalType === 'set_piece' ? 0.58 : 0.74;
      const assister = Math.random() < assistChance ? selectAssister(awayTeam, awayState.currentLineup, scorer, goalType) : null;
      events.push({
        type: 'goal',
        team: 'away',
        minute,
        player: scorer,
        assist: assister,
        goalType: minute > 85 && goalType === 'normal' ? 'late' : goalType
      });
      scorerCounts.away.set(scorer.name, (scorerCounts.away.get(scorer.name) || 0) + 1);
      awayGoalsLeft--;
      liveScore.away++;
    } else if (homeGoalsLeft > 0) {
      const teamGoalsSoFar = homeScore - homeGoalsLeft;
      const forcedPenalty = forcedPenaltyGoalSide === 'home' && !forcedPenaltyUsed;
      const goalType = forcedPenalty ? 'penalty' : selectGoalType(minute, homeScore, teamGoalsSoFar);
      if (forcedPenalty) forcedPenaltyUsed = true;
      const scorer = selectScorer(homeTeam, homeState.currentLineup, scorerCounts.home, { goalType, teamGoals: homeScore, teamGoalsSoFar });
      const assistChance = goalType === 'penalty' ? 0 : goalType === 'set_piece' ? 0.58 : 0.74;
      const assister = Math.random() < assistChance ? selectAssister(homeTeam, homeState.currentLineup, scorer, goalType) : null;
      events.push({
        type: 'goal',
        team: 'home',
        minute,
        player: scorer,
        assist: assister,
        goalType: minute > 85 && goalType === 'normal' ? 'late' : goalType
      });
      scorerCounts.home.set(scorer.name, (scorerCounts.home.get(scorer.name) || 0) + 1);
      homeGoalsLeft--;
      liveScore.home++;
    }
  });

  applyDueSubstitutionWindows({ windows: substitutionWindows, nextMinute: 90, homeState, awayState, liveScore, events: substitutionEvents, homeStrength, awayStrength });
  
  // Añadir tarjetas (2-4 amarillas, 0-1 rojas)
  const yellowCount = 2 + Math.floor(Math.random() * 3);
  const strictness = referee === 'strict' ? 1.5 : referee === 'lenient' ? 0.6 : 1;
  const playersWithYellow = new Set(); // Track players who already have a yellow (by team-name key)
  const sentOff = new Set(); // Players sent off can't get more cards
  const yellowMinutes = new Map();
  
  for (let i = 0; i < Math.floor(yellowCount * strictness); i++) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const teamLabel = isHome ? 'home' : 'away';
    const minute = randomMinuteBetween(1, 88);
    if (!minute) continue;
    const lineupAtMinute = getLineupAtMinute(isHome ? homeState.initialLineup : awayState.initialLineup, substitutionEvents, teamLabel, minute);
    const player = selectRandomPlayer(team, teamLabel, { sentOff, lineup: lineupAtMinute });
    const playerKey = getPlayerKey(teamLabel, player);
    const lastRequiredEvent = getLatestRequiredEventMinute(events, teamLabel, player);
    
    // Skip if player was already sent off or a required later event would conflict
    if (!playerKey || sentOff.has(playerKey) || lastRequiredEvent > minute) continue;
    
    if (playersWithYellow.has(playerKey)) {
      if (Math.random() >= 0.35) continue;
      const previousYellow = yellowMinutes.get(playerKey) || 1;
      const secondMinute = randomMinuteBetween(Math.max(previousYellow + 1, lastRequiredEvent + 1), 90);
      if (!secondMinute) continue;
      const secondLineup = getLineupAtMinute(isHome ? homeState.initialLineup : awayState.initialLineup, substitutionEvents, teamLabel, secondMinute);
      if (!secondLineup.some(p => samePlayer(p, player))) continue;
      // Second yellow → red card (double yellow)
      events.push({
        type: 'yellow_card',
        team: teamLabel,
        minute: secondMinute,
        player
      });
      events.push({
        type: 'red_card',
        team: teamLabel,
        minute: secondMinute,
        player,
        isSecondYellow: true,
        reason: 'Segunda amarilla'
      });
      sentOff.add(playerKey);
    } else {
      playersWithYellow.add(playerKey);
      yellowMinutes.set(playerKey, minute);
      events.push({
        type: 'yellow_card',
        team: teamLabel,
        minute,
        player
      });
    }
  }
  
  // Rojas directas: ~8% chance per team (~3/temporada, realista)
  [homeTeam, awayTeam].forEach((team, idx) => {
    const teamLabel = idx === 0 ? 'home' : 'away';
    if (Math.random() < 0.08 * strictness) {
      const minute = randomMinuteBetween(25, 84);
      if (!minute) return;
      const lineupAtMinute = getLineupAtMinute(teamLabel === 'home' ? homeState.initialLineup : awayState.initialLineup, substitutionEvents, teamLabel, minute);
      const player = selectRandomPlayer(team, teamLabel, { sentOff, lineup: lineupAtMinute });
      const playerKey = getPlayerKey(teamLabel, player);
      if (!sentOff.has(playerKey)) {
        const lastRequiredEvent = getLatestRequiredEventMinute(events, teamLabel, player);
        if (lastRequiredEvent > minute) return;
        events.push({
          type: 'red_card',
          team: teamLabel,
          minute,
          player,
          isSecondYellow: false
        });
        sentOff.add(playerKey);
      }
    }
  });
  
  // Generate injuries (~12% chance per team per match, ~4-5 injuries per team per season)
  const { grassCondition = 100, medicalPrevention = 0, playerIsHome = null } = context;
  const baseInjuryChance = 0.12;
  const grassPenalty = grassCondition < 100 ? (100 - grassCondition) / 300 : 0;

  [homeTeam, awayTeam].forEach((team, idx) => {
    const teamLabel = idx === 0 ? 'home' : 'away';
    const isPlayerTeam = (teamLabel === 'home' && playerIsHome === true) || (teamLabel === 'away' && playerIsHome === false);
    const prevention = isPlayerTeam ? medicalPrevention : 0;
    const injuryChance = baseInjuryChance * (1 - prevention) * (teamLabel === 'home' ? (1 + grassPenalty) : 1);

    if (Math.random() < injuryChance) {
      const minute = randomMinuteBetween(10, 84);
      if (!minute) return;
      const players = getLineupAtMinute(teamLabel === 'home' ? homeState.initialLineup : awayState.initialLineup, substitutionEvents, teamLabel, minute)
        .filter(p => !p.injured && !p.suspended);
      if (players.length > 0) {
        const availablePlayers = players.filter(p => !sentOff.has(getPlayerKey(teamLabel, p)));
        if (availablePlayers.length === 0) return;
        const injuredPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
        const lastRequiredEvent = getLatestRequiredEventMinute(events, teamLabel, injuredPlayer);
        if (lastRequiredEvent > minute) return;
        const severityRoll = Math.random();
        let weeksOut, severity;
        if (severityRoll < 0.60) {
          weeksOut = 1 + Math.floor(Math.random() * 2);
          severity = 'minor';
        } else if (severityRoll < 0.90) {
          weeksOut = 2 + Math.floor(Math.random() * 3);
          severity = 'moderate';
        } else {
          weeksOut = 4 + Math.floor(Math.random() * 5);
          severity = 'severe';
        }
        events.push({
          type: 'injury',
          team: teamLabel,
          minute,
          player: injuredPlayer.name,
          weeksOut,
          severity
        });
        addForcedInjurySubstitution(
          teamLabel === 'home' ? homeState : awayState,
          injuredPlayer,
          minute,
          substitutionEvents
        );
      }
    }
  });

  renumberSubstitutionEvents(substitutionEvents);
  events.push(...substitutionEvents);

  return {
    events: normalizeDisciplinaryTimeline(events),
    stoppageTime,
    finalLineups: {
      home: getLineupAfterAllSubstitutions(homeState.initialLineup, substitutionEvents, 'home').map(makeEventPlayer),
      away: getLineupAfterAllSubstitutions(awayState.initialLineup, substitutionEvents, 'away').map(makeEventPlayer)
    }
  };
}

/**
 * Seleccionar goleador
 */
function selectGoalType(minute, teamGoals, teamGoalsSoFar) {
  const roll = Math.random();
  const penaltyChance = teamGoals >= 4 && teamGoalsSoFar >= 2 ? 0.06 : 0.09;
  const setPieceChance = minute > 75 ? 0.18 : 0.15;

  if (roll < penaltyChance) return 'penalty';
  if (roll < penaltyChance + setPieceChance) return 'set_piece';
  return 'normal';
}

function getScorerRoleWeight(role, goalType) {
  const weights = {
    normal: {
      striker: 5.4,
      winger: 2.75,
      attackingMid: 2.1,
      wideMid: 1.25,
      centralMid: 0.55,
      wingback: 0.18,
      defender: 0.04,
      goalkeeper: 0
    },
    penalty: {
      striker: 5.0,
      winger: 2.2,
      attackingMid: 2.1,
      wideMid: 0.85,
      centralMid: 0.55,
      wingback: 0.05,
      defender: 0.01,
      goalkeeper: 0
    },
    set_piece: {
      striker: 3.4,
      winger: 1.15,
      attackingMid: 1.2,
      wideMid: 0.75,
      centralMid: 0.9,
      wingback: 0.35,
      defender: 0.55,
      goalkeeper: 0
    }
  };
  return weights[goalType]?.[role] ?? weights.normal[role] ?? 0.2;
}

function getRepeatPenalty(goalsAlready, role, teamGoals) {
  if (goalsAlready <= 0) return 1;

  const isPrimaryScorer = ['striker', 'winger', 'attackingMid'].includes(role);
  if (goalsAlready === 1) {
    if (role === 'striker') return 0.42;
    if (role === 'winger') return 0.34;
    if (role === 'attackingMid') return 0.30;
    if (role === 'wideMid') return 0.20;
    if (role === 'centralMid') return 0.14;
    return 0.05;
  }

  if (goalsAlready === 2) {
    if (teamGoals < 4) return isPrimaryScorer ? 0.03 : 0.002;
    if (role === 'striker') return 0.075;
    if (role === 'winger') return 0.035;
    if (role === 'attackingMid') return 0.03;
    return 0.004;
  }

  if (goalsAlready === 3) {
    if (teamGoals < 5) return 0.0005;
    return role === 'striker' ? 0.006 : 0.0005;
  }

  return 0.0001;
}

function selectScorer(team, lineup, scorerCounts = new Map(), options = {}) {
  if (!team?.players) return { name: 'Unknown' };
  const { goalType = 'normal', teamGoals = 1 } = options;
  const available = (lineup || team.players).filter(p => !p.injured && !p.suspended);
  const candidates = available.filter(p => getScoringRole(p) !== 'goalkeeper');
  
  if (candidates.length === 0) return available[0] || team.players[0] || { name: 'Unknown' };
  
  const weights = candidates.map(player => {
    const role = getScoringRole(player);
    const roleWeight = getScorerRoleWeight(role, goalType);
    const goalsAlready = scorerCounts.get(player.name) || 0;
    const repeatPenalty = getRepeatPenalty(goalsAlready, role, teamGoals);
    const concentrationPenalty = goalsAlready > 0 && goalsAlready / Math.max(1, teamGoals) >= 0.5 ? 0.55 : 1;
    const defensiveMultiGoalPenalty = goalsAlready > 0 && isDefensiveScorer(player) ? 0.18 : 1;
    const rating = Math.max(45, player.overall || 65);
    return Math.pow(rating, 1.28) * roleWeight * repeatPenalty * concentrationPenalty * defensiveMultiGoalPenalty;
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    const fallback = candidates.find(p => ['striker', 'winger', 'attackingMid'].includes(getScoringRole(p))) || candidates[0];
    return makeEventPlayer(fallback);
  }
  let rand = Math.random() * totalWeight;
  
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return makeEventPlayer(candidates[i]);
  }
  
  return makeEventPlayer(candidates[0]);
}

/**
 * Seleccionar asistente (distinto al goleador)
 */
function selectAssister(team, lineup, scorer, goalType = 'normal') {
  if (!team?.players) return null;
  const scorerName = scorer?.name || scorer;
  const available = (lineup || team.players).filter(p => !p.injured && !p.suspended && p.name !== scorerName);
  const assistPositions = goalType === 'set_piece'
    ? ['CAM', 'CM', 'RW', 'LW', 'RB', 'LB', 'RWB', 'LWB', 'CDM', 'RM', 'LM']
    : ['CAM', 'CM', 'RW', 'LW', 'RB', 'LB', 'RWB', 'LWB', 'CDM', 'RM', 'LM', 'ST', 'CF'];
  const candidates = available.filter(p => assistPositions.includes(getPrimaryPosition(p)));
  
  if (candidates.length === 0) return available.length > 0 ? { name: available[0].name, position: available[0].position } : null;
  
  const weights = candidates.map(p => {
    let weight = p.overall || 70;
    const position = getPrimaryPosition(p);
    if (goalType === 'set_piece' && ['RB', 'LB', 'RWB', 'LWB', 'RM', 'LM', 'CAM'].includes(position)) weight *= 1.55;
    else if (['CAM', 'CM'].includes(position)) weight *= 1.5;
    else if (['RW', 'LW'].includes(position)) weight *= 1.3;
    return weight;
  });
  
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return { name: candidates[i].name, position: candidates[i].position };
  }
  return { name: candidates[0].name, position: candidates[0].position };
}

function selectRandomPlayer(team, teamLabel = 'team', options = {}) {
  const sourcePlayers = options.lineup?.length ? options.lineup : team?.players;
  if (!sourcePlayers || sourcePlayers.length === 0) return { name: 'Unknown' };
  const available = sourcePlayers.filter(p =>
    !p.injured &&
    !p.suspended &&
    !options.sentOff?.has(getPlayerKey(teamLabel, p))
  );
  if (available.length === 0) return { name: 'Unknown' };
  const pool = available;
  // Prefer starters (first 11 or starter flag) — 85% chance starter, 15% sub
  const starters = pool.filter(p => p.starter || p.isStarter);
  const subs = pool.filter(p => !p.starter && !p.isStarter);
  // If we have lineup info, weight towards starters
  if (starters.length >= 7) {
    const pickFromStarters = Math.random() < 0.85 || subs.length === 0;
    const src = pickFromStarters ? starters : subs;
    return { name: src[Math.floor(Math.random() * src.length)].name };
  }
  // Fallback: use first 11 by index as starters
  const first11 = pool.slice(0, Math.min(11, pool.length));
  const bench = pool.slice(11);
  if (bench.length > 0 && Math.random() > 0.85) {
    return { name: bench[Math.floor(Math.random() * bench.length)].name };
  }
  return { name: first11[Math.floor(Math.random() * first11.length)].name };
}

/**
 * Generar estadísticas del partido
 */
function generateMatchStats(homeStrength, awayStrength, homeScore, awayScore, result, homeTactic = 'balanced', awayTactic = 'balanced', eventCards = null) {
  const homeTacticData = TACTICS[homeTactic] || TACTICS.balanced;
  const awayTacticData = TACTICS[awayTactic] || TACTICS.balanced;
  
  // Posesión basada en ratings, resultado Y tácticas
  const midDiff = (homeStrength.strength?.midfield || 70) - (awayStrength.strength?.midfield || 70);
  const possessionTacticDiff = ((homeTacticData.possession || 1) - (awayTacticData.possession || 1)) * 20;
  let homePossession = 50 + midDiff / 4 + possessionTacticDiff + (result === 1 ? 3 : result === -1 ? -3 : 0);
  homePossession = Math.max(25, Math.min(75, homePossession));
  
  // Tiros (tácticas ofensivas = más tiros, defensivas = menos)
  const homeAttackMod = homeTacticData.attack;
  const awayAttackMod = awayTacticData.attack;
  const homeShots = Math.round((8 + Math.floor(homePossession / 10) + homeScore * 2) * homeAttackMod);
  const awayShots = Math.round((8 + Math.floor((100 - homePossession) / 10) + awayScore * 2) * awayAttackMod);
  
  // Faltas (presión alta y defensiva = más faltas)
  const homeFoulMod = homeTactic === 'highPress' ? 1.4 : homeTactic === 'defensive' ? 1.2 : 1;
  const awayFoulMod = awayTactic === 'highPress' ? 1.4 : awayTactic === 'defensive' ? 1.2 : 1;
  const homeFouls = Math.round((10 + Math.floor(Math.random() * 6)) * homeFoulMod);
  const awayFouls = Math.round((10 + Math.floor(Math.random() * 6)) * awayFoulMod);
  // Use event-derived card counts for consistency, or fallback to generated
  const homeYellows = eventCards?.yellowCards?.home ?? Math.floor(homeFouls * (0.15 + Math.random() * 0.15));
  const awayYellows = eventCards?.yellowCards?.away ?? Math.floor(awayFouls * (0.15 + Math.random() * 0.15));
  const homeReds = eventCards?.redCards?.home ?? (Math.random() < 0.18 ? 1 : 0);
  const awayReds = eventCards?.redCards?.away ?? (Math.random() < 0.18 ? 1 : 0);
  
  const homeShotsOnTarget = Math.max(homeScore, Math.floor(homeShots * 0.4));
  const awayShotsOnTarget = Math.max(awayScore, Math.floor(awayShots * 0.4));
  const homeXg = Math.max(homeScore * 0.62, homeShots * 0.045 + homeShotsOnTarget * 0.16 + homeScore * 0.38);
  const awayXg = Math.max(awayScore * 0.62, awayShots * 0.045 + awayShotsOnTarget * 0.16 + awayScore * 0.38);
  const homeSaves = Math.max(0, awayShotsOnTarget - awayScore);
  const awaySaves = Math.max(0, homeShotsOnTarget - homeScore);

  return {
    possession: { home: Math.round(homePossession), away: Math.round(100 - homePossession) },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget },
    xg: { home: Number(homeXg.toFixed(2)), away: Number(awayXg.toFixed(2)) },
    saves: { home: homeSaves, away: awaySaves },
    corners: { home: Math.floor(homePossession / 12), away: Math.floor((100 - homePossession) / 12) },
    fouls: { home: homeFouls, away: awayFouls },
    yellowCards: { home: homeYellows, away: awayYellows },
    redCards: { home: homeReds, away: awayReds }
  };
}

// ============================================================
// EXPORTAR FUNCIÓN PRINCIPAL
// ============================================================

export default simulateMatchV2;


