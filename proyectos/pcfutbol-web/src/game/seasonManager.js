// ============================================================
// SEASON MANAGER - Gestión de temporadas, pretemporada y transiciones
// ============================================================

import { evolvePlayer } from './seasonEngine.js';
import { LEAGUE_SLOTS, getEuropeanPositionsForLeague } from './europeanCompetitions.js';

// Leagues that are the lowest tier in their pyramid — no relegation destination exists in-game
const BOTTOM_TIER_LEAGUES = new Set([
  'serieB', 'bundesliga2', 'ligue2', 'championship', 'segundaRFEF',
  'swissSuperLeague', 'austrianBundesliga', 'greekSuperLeague',
  'danishSuperliga', 'croatianLeague', 'czechLeague',
  'mls', 'saudiPro', 'ligaMX', 'jLeague',
  'argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
  'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
  'boliviaPrimera', 'venezuelaPrimera',
  'belgianPro', 'superLig', 'scottishPrem', 'eredivisie', 'primeiraLiga'
]);

// ============================================================
// European league qualification positions are derived from
// europeanCompetitions.LEAGUE_SLOTS to keep UI, season outcome and
// actual competition draw aligned. Only non-European fields
// (relegation / promotion / playoff / playoffRelegation) are
// declared per-league here.
// ============================================================
const NON_EURO_SPOTS = {
  // Spanish pyramid
  segunda:      { promotion: [1, 2], playoff: [3, 4, 5, 6], relegation: [19, 20, 21, 22] },
  primeraRFEF:  { promotion: [1], playoff: [2, 3, 4, 5], relegationCount: 5 },
  segundaRFEF:  { promotion: [1], playoff: [2, 3, 4, 5], relegation: [] },
  // English pyramid
  championship: { promotion: [1, 2], playoff: [3, 4, 5, 6], relegation: [22, 23, 24] },
  // Italian pyramid
  serieB:       { promotion: [1, 2], playoff: [3, 4, 5, 6, 7, 8], relegation: [19, 20] },
  // German pyramid
  bundesliga2:  { promotion: [1, 2], playoff: [3], relegation: [16, 17, 18] },
  // French pyramid
  ligue2:       { promotion: [1, 2], playoff: [3], relegation: [16, 17, 18] },
  // MLS / others: configured below
};

// League-specific relegation/playoff data for European top-flight leagues,
// merged with the champions/europaLeague/conference positions derived from
// LEAGUE_SLOTS.
const EURO_LEAGUE_EXTRA = {
  laliga:             { relegation: [18, 19, 20] },
  premierLeague:      { relegation: [18, 19, 20] },
  serieA:             { relegation: [18, 19, 20] },
  bundesliga:         { relegation: [16, 17, 18], playoffRelegation: [16] },
  ligue1:             { relegation: [16, 17, 18] },
  eredivisie:         { relegation: [16, 17, 18] },
  primeiraLiga:       { relegation: [16, 17, 18] },
  belgianPro:         { relegation: [15, 16] },
  superLig:           { relegation: [17, 18, 19] },
  austrianBundesliga: { relegation: [11, 12] },
  greekSuperLeague:   { relegation: [13, 14] },
  scottishPrem:       { relegation: [11, 12] },
  ukrainePremier:     { relegation: [15, 16] },
  czechLeague:        { relegation: [15, 16] },
  ekstraklasa:        { relegation: [17, 18] },
  eliteserien:        { relegation: [15, 16] },
  danishSuperliga:    { relegation: [11, 12] },
  swissSuperLeague:   { relegation: [11, 12] },
  croatianLeague:     { relegation: [9, 10] },
  romaniaSuperliga:   { relegation: [15, 16] },
  allsvenskan:        { relegation: [15, 16] },
  hungaryNBI:         { relegation: [11, 12] },
  russiaPremier:      { relegation: [15, 16] }
};

function buildEuropeanSpots() {
  const out = { ...NON_EURO_SPOTS };
  for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
    const positions = getEuropeanPositionsForLeague(leagueId);
    const extra = EURO_LEAGUE_EXTRA[leagueId] || {};
    out[leagueId] = {
      champions: positions.champions,
      europaLeague: positions.europaLeague,
      conference: positions.conference,
      ...extra
    };
  }
  return out;
}

// Configuración de competiciones europeas por liga
export const EUROPEAN_SPOTS = {
  ...buildEuropeanSpots(),
  mls: {
    relegation: []
  },
  saudiPro: {
    championsLeague: [1, 2, 3],
    relegation: [16, 17, 18]
  },
  ligaMX: {
    relegation: [17, 18]
  },
  jLeague: {
    championsLeague: [1, 2, 3],
    relegation: [18, 19, 20]
  },
  // South American leagues (use libertadores/sudamericana instead of champions/europaLeague)
  argentinaPrimera: { libertadores: [1, 2, 3, 4], sudamericana: [5, 6], relegation: [27, 28, 29, 30] },
  brasileiraoA: { libertadores: [1, 2, 3, 4], sudamericana: [5, 6, 7, 8], relegation: [17, 18, 19, 20] },
  colombiaPrimera: { libertadores: [1, 2, 3], sudamericana: [4, 5, 6], relegation: [18, 19, 20] },
  chilePrimera: { libertadores: [1, 2], sudamericana: [3, 4], relegation: [14, 15, 16] },
  uruguayPrimera: { libertadores: [1, 2], sudamericana: [3, 4], relegation: [14, 15, 16] },
  ecuadorLigaPro: { libertadores: [1, 2], sudamericana: [3, 4], relegation: [14, 15, 16] },
  paraguayPrimera: { libertadores: [1], sudamericana: [2, 3], relegation: [11, 12] },
  peruLiga1: { libertadores: [1, 2], sudamericana: [3, 4], relegation: [16, 17, 18] },
  boliviaPrimera: { libertadores: [1], sudamericana: [2, 3], relegation: [14, 15, 16] },
  venezuelaPrimera: { libertadores: [1, 2], sudamericana: [3, 4], relegation: [12, 13, 14] }
};

// Número de jornadas por liga
export function getEuropeanSpotsForLeague(leagueId) {
  return EUROPEAN_SPOTS[leagueId] || null;
}

export function getSeasonOutcomeFromSpots(position, leagueId) {
  const spots = getEuropeanSpotsForLeague(leagueId);
  if (!spots) return null;

  return {
    champions: !!spots.champions?.includes(position),
    europaLeague: !!spots.europaLeague?.includes(position),
    conferenceLeague: !!spots.conference?.includes(position),
    libertadores: !!spots.libertadores?.includes(position),
    sudamericana: !!spots.sudamericana?.includes(position)
  };
}

export const LEAGUE_MATCHDAYS = {
  laliga: 38,
  segunda: 42,
  premierLeague: 38,
  serieA: 38,
  bundesliga: 34,
  ligue1: 34,
  primeraRFEF: 38,
  segundaRFEF: 34,
  ligaMX: 34,
  championship: 46,
  belgianPro: 30,
  eredivisie: 34,
  primeiraLiga: 34,
  scottishPrem: 22, // 12 teams = 22 matchdays (generateFixtures produces 11*2)
  serieB: 38,
  bundesliga2: 34,
  ligue2: 34, // 18 teams = 34 matchdays
  // South American leagues
  argentinaPrimera: 58, // 30 teams = 58 matchdays (29*2)
  brasileiraoA: 38,     // 20 teams
  colombiaPrimera: 38,  // 20 teams
  chilePrimera: 30,     // 16 teams = 30 matchdays (15*2)
  uruguayPrimera: 30,   // 16 teams
  ecuadorLigaPro: 30,   // 16 teams
  paraguayPrimera: 22,  // 12 teams
  peruLiga1: 34,        // 18 teams
  boliviaPrimera: 30,   // 16 teams
  venezuelaPrimera: 26, // 14 teams = 26 matchdays (13*2)
  // Draft league (20 teams = 38 matchdays)
  draft: 38,
  // Other leagues
  superLig: 38,             // 19 teams = 38 fixture weeks (20 after padding, 19 rounds × 2)
  swissSuperLeague: 22,     // 12 teams
  austrianBundesliga: 22,   // 12 teams
  greekSuperLeague: 26,     // 14 teams
  danishSuperliga: 22,      // 12 teams
  croatianLeague: 18,       // 10 teams
  czechLeague: 30,          // 16 teams
  mls: 38,                  // 20 teams
  saudiPro: 34,             // 18 teams
  jLeague: 38,              // 20 teams
  // Eastern & northern European top-flights
  eliteserien: 30,          // 16 teams
  allsvenskan: 30,          // 16 teams
  ekstraklasa: 34,          // 18 teams
  russiaPremier: 30,        // 16 teams
  ukrainePremier: 30,       // 16 teams
  romaniaSuperliga: 30,     // 16 teams
  hungaryNBI: 22,           // 12 teams
};

/**
 * Determina si la temporada ha terminado
 */
export function isSeasonOver(fixtures, leagueId = 'laliga') {
  if (!fixtures || fixtures.length === 0) return false;
  
  // Derive maxWeek from actual fixtures instead of lookup table
  // This handles all leagues correctly regardless of team count
  const maxWeek = Math.max(...fixtures.map(f => f.week));
  
  const allPlayed = fixtures.every(f => f.played);
  const lastWeekFixtures = fixtures.filter(f => f.week === maxWeek);
  const lastWeekPlayed = lastWeekFixtures.length > 0 && lastWeekFixtures.every(f => f.played);
  
  return allPlayed || lastWeekPlayed;
}

/**
 * Obtiene el resultado final de temporada para un equipo
 */
export function getSeasonResult(table, teamId, leagueId = 'laliga') {
  const position = table.findIndex(t => t.teamId === teamId) + 1;
  const teamData = table.find(t => t.teamId === teamId);
  const spots = getEuropeanSpotsForLeague(leagueId) || {};
  
  let qualification = null;
  let relegation = false;
  let promotion = false;
  let playoff = false;
  
  // Determinar clasificación (European or South American)
  if (spots.champions?.includes(position)) {
    qualification = 'champions';
  } else if (spots.libertadores?.includes(position)) {
    qualification = 'libertadores';
  } else if (spots.europaLeague?.includes(position)) {
    qualification = 'europaLeague';
  } else if (spots.sudamericana?.includes(position)) {
    qualification = 'sudamericana';
  } else if (spots.conference?.includes(position)) {
    qualification = 'conference';
  }
  
  // Determinar descenso (only if there's an actual lower league in the game)
  if (!BOTTOM_TIER_LEAGUES.has(leagueId)) {
    if (spots.relegation?.includes(position)) {
      relegation = true;
    } else if (spots.relegationCount && table.length > 0) {
      // Dynamic relegation for group leagues (last N positions)
      const totalTeams = table.length;
      if (position > totalTeams - spots.relegationCount) {
        relegation = true;
      }
    }
  }
  
  // Determinar ascenso (para ligas inferiores)
  if (spots.promotion?.includes(position)) {
    promotion = true;
  }
  
  // Determinar playoff
  if (spots.playoff?.includes(position)) {
    playoff = true;
  }
  
  return {
    position,
    points: teamData?.points || 0,
    goalsFor: teamData?.goalsFor || 0,
    goalsAgainst: teamData?.goalsAgainst || 0,
    goalDifference: (teamData?.goalsFor || 0) - (teamData?.goalsAgainst || 0),
    wins: teamData?.won || 0,
    draws: teamData?.drawn || 0,
    losses: teamData?.lost || 0,
    qualification,
    relegation,
    promotion,
    playoff
  };
}

/**
 * Genera opciones de pretemporada (3 paquetes de 5 amistosos)
 */
function getTeamLevel(team) {
  const players = Array.isArray(team?.players) ? team.players : [];
  if (players.length > 0) {
    const starters = [...players]
      .sort((a, b) => (b.overall || 0) - (a.overall || 0))
      .slice(0, Math.min(16, players.length));
    const average = starters.reduce((sum, p) => sum + (p.overall || team.reputation || 60), 0) / starters.length;
    return Math.round(average);
  }
  return Math.round(team?.reputation || 60);
}

function getMediaTier(level) {
  if (level >= 84) return 'elite mundial';
  if (level >= 78) return 'continental';
  if (level >= 72) return 'primera linea';
  if (level >= 66) return 'competitivo';
  if (level >= 60) return 'regional fuerte';
  return 'desarrollo';
}

function pickClosestOpponent(pool, targetLevel, usedIds) {
  return pool
    .filter(team => !usedIds.has(team.id))
    .map(team => ({
      team,
      level: team.preseasonLevel || getTeamLevel(team),
      score: Math.abs((team.preseasonLevel || getTeamLevel(team)) - targetLevel) + (Math.random() * 0.25)
    }))
    .sort((a, b) => a.score - b.score)[0] || null;
}

const PRESEASON_TOURS = [
  {
    id: 'regional',
    name: 'Tour de Rodaje',
    description: 'Rivales cercanos al nivel del club, con una progresion suave antes del partido de presentacion.',
    identity: 'Base competitiva',
    difficulty: 'low',
    offsets: [-5, -3, -1, 1, 3]
  },
  {
    id: 'balanced',
    name: 'Circuito Continental',
    description: 'Un calendario equilibrado para medir automatismos contra equipos de media y exigencia similar.',
    identity: 'Preparacion premium',
    difficulty: 'medium',
    offsets: [-2, 0, 1, 3, 5]
  },
  {
    id: 'prestige',
    name: 'Gira de Prestigio',
    description: 'Cinco citas de alto impacto mediatico, cerrando en casa contra el rival mas atractivo.',
    identity: 'Maxima taquilla',
    difficulty: 'high',
    offsets: [0, 2, 3, 5, 7]
  }
];

export function generatePreseasonOptions(allTeams, playerTeam, currentLeague) {
  const playerLevel = getTeamLevel(playerTeam);
  const tieredTeams = allTeams
    .filter(t => t.id !== playerTeam.id && (t.players?.length > 0 || t.reputation))
    .map(team => ({ ...team, preseasonLevel: getTeamLevel(team) }));

  return PRESEASON_TOURS.map((tour) => {
    const usedIds = new Set();
    const rivals = [];

    tour.offsets.forEach(offset => {
      const picked = pickClosestOpponent(tieredTeams, playerLevel + offset, usedIds);
      if (picked) {
        usedIds.add(picked.team.id);
        rivals.push({ ...picked.team, preseasonLevel: picked.level });
      }
    });

    while (rivals.length < 5 && tieredTeams.length > 0) {
      const fallback = pickClosestOpponent(tieredTeams, playerLevel, usedIds);
      if (!fallback) break;
      usedIds.add(fallback.team.id);
      rivals.push({ ...fallback.team, preseasonLevel: fallback.level });
    }

    const orderedRivals = rivals
      .slice(0, 5)
      .sort((a, b) => (a.preseasonLevel || getTeamLevel(a)) - (b.preseasonLevel || getTeamLevel(b)));
    const levels = orderedRivals.map(team => team.preseasonLevel || getTeamLevel(team));
    const minLevel = levels.length ? Math.min(...levels) : playerLevel;
    const maxLevel = levels.length ? Math.max(...levels) : playerLevel;

    return {
      ...tour,
      teamLevel: playerLevel,
      mediaTier: getMediaTier(playerLevel),
      expectedOvrRange: `${minLevel}-${maxLevel}`,
      potentialEarnings: tour.id === 'prestige' ? 'Alta' : tour.id === 'balanced' ? 'Media-alta' : 'Media',
      matches: generateMatches(orderedRivals, playerTeam, tour)
    };
  });

  // Filtrar equipos disponibles (no el propio equipo)
  const availableTeams = allTeams.filter(t => t.id !== playerTeam.id && t.players?.length > 0);
  
  // Shuffle completo
  const shuffled = [...availableTeams].sort(() => Math.random() - 0.5);
  
  // Option IDs (display names handled by i18n in components)
  const optionNames = ['Option A', 'Option B', 'Option C'];
  
  // Generar 3 opciones completamente aleatorias, sin repetir rivales entre opciones
  const used = new Set();
  const options = optionNames.map((name, idx) => {
    // Elegir 5 rivales únicos (no usados en otras opciones)
    const rivals = [];
    for (const team of shuffled) {
      if (rivals.length >= 5) break;
      if (!used.has(team.id)) {
        rivals.push(team);
        used.add(team.id);
      }
    }
    // Fallback: si no hay suficientes, reusar del pool
    while (rivals.length < 5) {
      const fallback = shuffled[Math.floor(Math.random() * shuffled.length)];
      if (fallback && !rivals.find(r => r.id === fallback.id)) {
        rivals.push(fallback);
      }
    }
    
    return {
      id: `option_${idx}`,
      name,
      matches: generateMatches(rivals, playerTeam)
    };
  });
  
  return options;
}

/**
 * Genera los 5 partidos de pretemporada
 * Partidos 1-4: fuera de casa
 * Partido 5: en casa (presentación del equipo)
 */
function generateMatches(opponents, playerTeam, tour = {}) {
  const matches = [];
  
  // Partidos 1-4: siempre fuera
  for (let i = 0; i < 4; i++) {
    const opponent = opponents[i];
    matches.push({
      id: `preseason_${i + 1}`,
      week: i + 1,
      homeTeam: opponent.id,
      awayTeam: playerTeam.id,
      homeTeamName: opponent.name,
      awayTeamName: playerTeam.name,
      isHome: false,
      opponent,
      played: false,
      isPreseason: true,
      tourId: tour.id,
      tourName: tour.name,
      tourIdentity: tour.identity,
      difficulty: tour.difficulty,
      opponentLevel: opponent?.preseasonLevel || getTeamLevel(opponent)
    });
  }
  
  // Partido 5: siempre en casa (presentación)
  const finalOpponent = opponents[4];
  matches.push({
    id: 'preseason_5',
    week: 5,
    homeTeam: playerTeam.id,
    awayTeam: finalOpponent.id,
    homeTeamName: playerTeam.name,
    awayTeamName: finalOpponent.name,
    isHome: true,
    opponent: finalOpponent,
    played: false,
    isPreseason: true,
    isPresentationMatch: true,
    tourId: tour.id,
    tourName: tour.name,
    tourIdentity: tour.identity,
    difficulty: tour.difficulty,
    opponentLevel: finalOpponent?.preseasonLevel || getTeamLevel(finalOpponent)
  });
  
  return matches;
}

/**
 * Calcula las recompensas de objetivos cumplidos/fallidos
 */
export function calculateSeasonRewards(objectives, seasonResult) {
  let totalReward = 0;
  let totalPenalty = 0;
  const results = [];
  
  if (!Array.isArray(objectives)) return { totalReward: 0, totalPenalty: 0, results: [] };
  objectives.forEach(obj => {
    const completed = isObjectiveCompleted(obj, seasonResult);
    
    if (completed) {
      totalReward += obj.reward || 0;
      results.push({ ...obj, status: 'completed', amount: obj.reward });
    } else {
      totalPenalty += Math.abs(obj.penalty || 0);
      results.push({ ...obj, status: 'failed', amount: obj.penalty });
    }
  });
  
  return {
    totalReward,
    totalPenalty,
    netResult: totalReward - totalPenalty,
    objectiveResults: results
  };
}

function isObjectiveCompleted(objective, seasonResult) {
  switch (objective.type) {
    case 'league_position':
      return seasonResult.position <= objective.target;
    case 'goal_difference':
      return seasonResult.goalDifference >= objective.target;
    case 'financial':
      return true; // Se evalúa con el presupuesto actual
    case 'cup_round':
      return (seasonResult.cupRound || 0) >= objective.target;
    case 'european_qualification':
      return !!seasonResult.europeanQualification;
    case 'goals_scored':
      return (seasonResult.goalsScored || 0) >= objective.target;
    case 'goals_conceded':
      return (seasonResult.goalsConceded || 0) <= objective.target;
    case 'wins':
      return (seasonResult.wins || 0) >= objective.target;
    case 'unbeaten_run':
      return (seasonResult.longestUnbeatenRun || 0) >= objective.target;
    default:
      // Don't penalize unknown objective types — treat as completed
      return true;
  }
}

/**
 * Prepara el estado para la nueva temporada
 */
export function prepareNewSeason(currentState, seasonResult) {
  const newSeason = currentState.currentSeason + 1;
  
  // Evolucionar jugadores (edad + overall con sistema realista)
  const agedPlayers = currentState.team.players.map(player => ({
    ...player,
    age: player.age + 1,
    overall: evolvePlayer(player),
    yellowCards: 0,
    suspended: false,
    suspensionType: null
  }));
  
  // Decrementar contratos y filtrar expirados
  const playersWithContracts = agedPlayers
    .map(player => {
      const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
      return {
        ...player,
        contractYears: contractYears - 1,
        transferListed: false,
        askingPrice: undefined
      };
    })
    // Eliminar jugadores con contrato expirado (contractYears <= 0)
    .filter(player => player.contractYears > 0);
  
  // Actualizar patrocinio (naming rights)
  let updatedNaming = currentState.stadium?.naming;
  if (updatedNaming && updatedNaming.yearsLeft > 0) {
    updatedNaming = {
      ...updatedNaming,
      yearsLeft: updatedNaming.yearsLeft - 1
    };
    // Si el contrato expira, se elimina
    if (updatedNaming.yearsLeft <= 0) {
      updatedNaming = null;
    }
  }
  
  return {
    currentSeason: newSeason,
    currentWeek: 1,
    team: {
      ...currentState.team,
      players: playersWithContracts
    },
    // Resetear datos de liga
    leagueTable: [],
    fixtures: [],
    // Mantener dinero con bonificaciones
    money: currentState.money,
    // Actualizar estadio con naming actualizado
    stadium: currentState.stadium ? {
      ...currentState.stadium,
      naming: updatedNaming
    } : currentState.stadium,
    // Fase de pretemporada
    phase: 'preseason',
    preseasonWeek: 1
  };
}

/**
 * Obtiene el nombre de la competición continental
 */
export function getCompetitionName(qualification) {
  switch (qualification) {
    case 'champions': return 'Continental Champions Cup';
    case 'europaLeague': return 'Continental Shield';
    case 'conference': return 'Continental Trophy';
    case 'libertadores': return 'South American Champions Cup';
    case 'sudamericana': return 'Copa Sudamericana';
    default: return null;
  }
}

/**
 * Calcula bonus por clasificación continental (European or SA)
 */
export function getEuropeanBonus(qualification) {
  switch (qualification) {
    case 'champions': return 15000000; // €15M
    case 'europaLeague': return 8000000; // €8M
    case 'conference': return 4000000; // €4M
    case 'libertadores': return 3000000; // $3M USD
    case 'sudamericana': return 900000; // $900K USD
    default: return 0;
  }
}
