// ============================================================
// SEASON MANAGER - Gestión de temporadas, pretemporada y transiciones
// ============================================================

import { evolvePlayer } from './seasonEngine.js';

// Configuración de competiciones europeas por liga
export const EUROPEAN_SPOTS = {
  laliga: {
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20]
  },
  segunda: {
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [20, 21, 22]
  },
  primeraRFEF: {
    // Group league - per-group zones (dynamic relegation based on group size)
    promotion: [1],       // Per group: champion ascends directly to Segunda
    playoff: [2, 3, 4, 5], // Per group: playoff for additional promotion spot
    relegationCount: 5    // Last 5 per group descend (positions calculated dynamically)
  },
  segundaRFEF: {
    promotion: [1],       // Per group: champion ascends to Primera RFEF
    playoff: [2, 3, 4, 5], // Per group: playoff for additional promotion spot
    relegation: []        // No relegation (Tercera not in game)
  },
  premierLeague: {
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20]
  },
  serieA: {
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20]
  },
  bundesliga: {
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [16, 17, 18], // 16 va a playoff
    playoffRelegation: [16]
  },
  ligue1: {
    champions: [1, 2, 3],
    europaLeague: [4],
    conference: [5],
    relegation: [17, 18],
    playoffRelegation: [16]
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
  // Other leagues
  superLig: 36,             // 19 teams = 36 matchdays (odd teams handled by engine)
  swissSuperLeague: 22,     // 12 teams
  austrianBundesliga: 22,   // 12 teams
  greekSuperLeague: 26,     // 14 teams
  danishSuperliga: 22,      // 12 teams
  croatianLeague: 18,       // 10 teams
  czechLeague: 30,          // 16 teams
  mls: 38,                  // 20 teams
  saudiPro: 34,             // 18 teams
  jLeague: 38,              // 20 teams
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
  const spots = EUROPEAN_SPOTS[leagueId] || EUROPEAN_SPOTS.laliga;
  
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
  
  // Determinar descenso
  if (spots.relegation?.includes(position)) {
    relegation = true;
  } else if (spots.relegationCount && table.length > 0) {
    // Dynamic relegation for group leagues (last N positions)
    const totalTeams = table.length;
    if (position > totalTeams - spots.relegationCount) {
      relegation = true;
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
export function generatePreseasonOptions(allTeams, playerTeam, currentLeague) {
  // Filtrar equipos disponibles (no el propio equipo)
  const availableTeams = allTeams.filter(t => t.id !== playerTeam.id && t.players?.length > 0);
  
  // Shuffle completo
  const shuffled = [...availableTeams].sort(() => Math.random() - 0.5);
  
  // Nombres para las 3 opciones
  const optionNames = ['Opción A', 'Opción B', 'Opción C'];
  
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
function generateMatches(opponents, playerTeam) {
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
      isPreseason: true
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
    isPresentationMatch: true
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
