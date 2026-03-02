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
  
  // Penalty Master perk: 30% chance of winning a penalty per match + always scores
  if (context.penaltyMaster) {
    if (Math.random() < 0.30) {
      if (context.penaltyMaster === 'home') homeScore++;
      else awayScore++;
    }
  }

  // Generar eventos del partido
  const events = generateMatchEvents(
    homeScore,
    awayScore,
    homeTeamData,
    awayTeamData,
    homeStrength,
    awayStrength,
    referee,
    { grassCondition, medicalPrevention, playerIsHome }
  );
  
  // Stats del partido (tácticas afectan posesión, tiros, etc.)
  // Derive card counts from events for consistency
  const eventYellowsHome = events.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const eventYellowsAway = events.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const eventRedsHome = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const eventRedsAway = events.filter(e => e.type === 'red_card' && e.team === 'away').length;
  const stats = generateMatchStats(
    homeStrength,
    awayStrength,
    homeScore,
    awayScore,
    result,
    homeTactic,
    awayTactic,
    { yellowCards: { home: eventYellowsHome, away: eventYellowsAway }, redCards: { home: eventRedsHome, away: eventRedsAway } }
  );
  
  // Knockout mode: if draw, resolve with extra time then penalties
  let extraTime = false;
  let penalties = null;
  let finalHomeScore = homeScore;
  let finalAwayScore = awayScore;

  if (context.knockout && homeScore === awayScore) {
    extraTime = true;
    // Extra time: ~30% chance someone scores, slight home advantage
    const etRand = Math.random();
    if (etRand < 0.18) {
      // Home scores in extra time
      finalHomeScore += 1;
      const scorer = selectScorer(homeTeamData);
      events.push({ type: 'goal', team: 'home', minute: 90 + Math.floor(Math.random() * 30) + 1, player: scorer, isExtraTime: true });
    } else if (etRand < 0.30) {
      // Away scores in extra time
      finalAwayScore += 1;
      const scorer = selectScorer(awayTeamData);
      events.push({ type: 'goal', team: 'away', minute: 90 + Math.floor(Math.random() * 30) + 1, player: scorer, isExtraTime: true });
    }

    // If still draw after extra time → penalties
    if (finalHomeScore === finalAwayScore) {
      const homeRating = homeStrength.rating || 70;
      const awayRating = awayStrength.rating || 70;
      // Better team has slight edge in penalties (55/45 max)
      const homeAdvantage = 0.5 + Math.min(0.05, (homeRating - awayRating) / 200);
      const homeWinsPens = Math.random() < homeAdvantage;
      const winnerGoals = Math.floor(Math.random() * 3) + 4; // 4-6 goals
      const loserGoals = winnerGoals - (Math.floor(Math.random() * 2) + 1); // 1-2 fewer
      penalties = {
        home: homeWinsPens ? winnerGoals : loserGoals,
        away: homeWinsPens ? loserGoals : winnerGoals
      };
    }
  }

  // ── MOTM (Man of the Match) calculation ──
  const motm = calculateMOTM(events, finalHomeScore, finalAwayScore, homeTeamData, awayTeamData);

  return {
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    extraTime,
    penalties,
    events,
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
  awayWinBase = Math.max(0, awayWinBase);
  
  // Derby: más impredecible
  if (isDerby) {
    homeWinBase *= 0.85;
    awayWinBase *= 1.15;
    drawBase *= 1.1;
  }
  
  // Normalizar
  const total = homeWinBase + drawBase + awayWinBase;
  
  // Mínimos más bajos para mismatches grandes (antes 5% min, ahora 2%)
  const minAway = Math.abs(totalDiff) > 25 ? 0.02 : 0.05;
  return {
    homeWinProb: Math.max(0.05, Math.min(0.92, homeWinBase / total)),
    drawProb: Math.max(0.08, Math.min(0.40, drawBase / total)),
    awayWinProb: Math.max(minAway, Math.min(0.70, awayWinBase / total))
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
  
  if (result === 1) {
    // Victoria local
    const margin = weightedRandom([
      { value: 1, weight: 45 },  // 1-0, 2-1, etc
      { value: 2, weight: 30 },  // 2-0, 3-1, etc
      { value: 3, weight: 15 },  // 3-0, 4-1, etc
      { value: 4, weight: 8 },   // Goleada
      { value: 5, weight: 2 }    // Goleada histórica
    ]);
    
    homeScore = Math.round(homeProfile.goalsScored * impMod * goalFrequency + Math.random() * 1.5);
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
    
    awayScore = Math.round(awayProfile.goalsScored * impMod * goalFrequency + Math.random() * 1.2);
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
function generateMatchEvents(homeScore, awayScore, homeTeam, awayTeam, homeStrength, awayStrength, referee, context = {}) {
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
    if (homeGoalsLeft + awayGoalsLeft <= 0) return; // Safety: no goals left to allocate
    // Decidir quién marca
    const homeChance = homeGoalsLeft / (homeGoalsLeft + awayGoalsLeft);
    const isHomeGoal = Math.random() < homeChance;
    
    if (isHomeGoal && homeGoalsLeft > 0) {
      const scorer = selectScorer(homeTeam, homeStrength.strength?.lineup);
      const assister = Math.random() > 0.30 ? selectAssister(homeTeam, homeStrength.strength?.lineup, scorer) : null;
      events.push({
        type: 'goal',
        team: 'home',
        minute,
        player: scorer,
        assist: assister,
        goalType: minute > 85 ? 'late' : 'normal'
      });
      homeGoalsLeft--;
    } else if (awayGoalsLeft > 0) {
      const scorer = selectScorer(awayTeam, awayStrength.strength?.lineup);
      const assister = Math.random() > 0.30 ? selectAssister(awayTeam, awayStrength.strength?.lineup, scorer) : null;
      events.push({
        type: 'goal',
        team: 'away',
        minute,
        player: scorer,
        assist: assister,
        goalType: minute > 85 ? 'late' : 'normal'
      });
      awayGoalsLeft--;
    }
  });
  
  // Añadir tarjetas (2-4 amarillas, 0-1 rojas)
  const yellowCount = 2 + Math.floor(Math.random() * 3);
  const strictness = referee === 'strict' ? 1.5 : referee === 'lenient' ? 0.6 : 1;
  const playersWithYellow = new Set(); // Track players who already have a yellow
  
  for (let i = 0; i < Math.floor(yellowCount * strictness); i++) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const teamLabel = isHome ? 'home' : 'away';
    const player = selectRandomPlayer(team);
    const playerKey = `${teamLabel}-${player}`;
    const minute = Math.floor(Math.random() * 90) + 1;
    
    if (playersWithYellow.has(playerKey)) {
      // Second yellow → red card (double yellow)
      events.push({
        type: 'yellow_card',
        team: teamLabel,
        minute,
        player
      });
      events.push({
        type: 'red_card',
        team: teamLabel,
        minute,
        player,
        isSecondYellow: true,
        reason: 'Segunda amarilla'
      });
    } else {
      playersWithYellow.add(playerKey);
      events.push({
        type: 'yellow_card',
        team: teamLabel,
        minute,
        player
      });
    }
  }
  
  // Rojas directas: cada equipo tiene ~18% de probabilidad por partido (~7/temporada, realista)
  [homeTeam, awayTeam].forEach((team, idx) => {
    const teamLabel = idx === 0 ? 'home' : 'away';
    if (Math.random() < 0.18 * strictness) {
      events.push({
        type: 'red_card',
        team: teamLabel,
        minute: 25 + Math.floor(Math.random() * 60),
        player: selectRandomPlayer(team),
        isSecondYellow: false
      });
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
      const players = team.players?.filter(p => !p.injured && !p.suspended) || [];
      if (players.length > 0) {
        const injuredPlayer = players[Math.floor(Math.random() * players.length)];
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
          minute: 10 + Math.floor(Math.random() * 75),
          player: injuredPlayer.name,
          weeksOut,
          severity
        });
      }
    }
  });

  return events.sort((a, b) => a.minute - b.minute);
}

/**
 * Seleccionar goleador
 */
function selectScorer(team, lineup) {
  if (!team?.players) return { name: 'Unknown' };
  
  const available = (lineup || team.players).filter(p => !p.injured && !p.suspended);
  const attackers = available.filter(p => 
    ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(p.position)
  );
  
  if (attackers.length === 0) return available[0] || team.players[0] || { name: 'Unknown' };
  
  // Ponderar por overall
  const totalOvr = attackers.reduce((sum, p) => sum + p.overall, 0);
  let rand = Math.random() * totalOvr;
  
  for (const player of attackers) {
    rand -= player.overall;
    if (rand <= 0) return { name: player.name, position: player.position };
  }
  
  return { name: attackers[0].name, position: attackers[0].position };
}

/**
 * Seleccionar asistente (distinto al goleador)
 */
function selectAssister(team, lineup, scorer) {
  if (!team?.players) return null;
  const scorerName = scorer?.name || scorer;
  const available = (lineup || team.players).filter(p => !p.injured && !p.suspended && p.name !== scorerName);
  const assistPositions = ['CAM', 'CM', 'RW', 'LW', 'RB', 'LB', 'CDM', 'RM', 'LM', 'ST', 'CF'];
  const candidates = available.filter(p => assistPositions.includes(p.position));
  
  if (candidates.length === 0) return available.length > 0 ? { name: available[0].name, position: available[0].position } : null;
  
  const weights = candidates.map(p => {
    let weight = p.overall || 70;
    if (['CAM', 'CM'].includes(p.position)) weight *= 1.5;
    else if (['RW', 'LW'].includes(p.position)) weight *= 1.3;
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

function selectRandomPlayer(team) {
  if (!team?.players || team.players.length === 0) return { name: 'Unknown' };
  const available = team.players.filter(p => !p.injured && !p.suspended);
  const pool = available.length > 0 ? available : team.players;
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
  
  return {
    possession: { home: Math.round(homePossession), away: Math.round(100 - homePossession) },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: Math.floor(homeShots * 0.4), away: Math.floor(awayShots * 0.4) },
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
