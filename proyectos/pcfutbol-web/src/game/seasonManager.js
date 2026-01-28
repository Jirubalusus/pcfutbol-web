// ============================================================
// SEASON MANAGER - Gestión de temporadas, pretemporada y transiciones
// ============================================================

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
  premierLeague: {
    champions: [1, 2, 3, 4],
    europaLeague: [5],
    conference: [6, 7], // Conference puede incluir ganador FA Cup
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
    relegation: [16, 17, 18],
    playoffRelegation: [16]
  }
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
  segundaRFEF: 34
};

/**
 * Determina si la temporada ha terminado
 */
export function isSeasonOver(fixtures, leagueId = 'laliga') {
  const maxWeek = LEAGUE_MATCHDAYS[leagueId] || 38;
  const allPlayed = fixtures.every(f => f.played);
  const lastWeekPlayed = fixtures.filter(f => f.week === maxWeek).every(f => f.played);
  
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
  
  // Determinar clasificación
  if (spots.champions?.includes(position)) {
    qualification = 'champions';
  } else if (spots.europaLeague?.includes(position)) {
    qualification = 'europaLeague';
  } else if (spots.conference?.includes(position)) {
    qualification = 'conference';
  }
  
  // Determinar descenso
  if (spots.relegation?.includes(position)) {
    relegation = true;
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
  const availableTeams = allTeams.filter(t => t.id !== playerTeam.id);
  
  // Categorizar equipos por reputación
  const topTeams = availableTeams.filter(t => t.reputation >= 80).slice(0, 20);
  const midTeams = availableTeams.filter(t => t.reputation >= 60 && t.reputation < 80).slice(0, 30);
  const lowTeams = availableTeams.filter(t => t.reputation >= 40 && t.reputation < 60).slice(0, 30);
  
  // Función para seleccionar equipos aleatorios
  const pickRandom = (arr, count) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };
  
  // Generar 3 opciones de pretemporada
  const options = [
    {
      id: 'prestige',
      name: 'Gira de Prestigio',
      description: 'Enfréntate a grandes equipos europeos',
      difficulty: 'high',
      potentialEarnings: '€2-4M',
      matches: generateMatches(pickRandom(topTeams, 4), playerTeam, true)
    },
    {
      id: 'balanced',
      name: 'Pretemporada Equilibrada',
      description: 'Mezcla de rivales para preparar la temporada',
      difficulty: 'medium',
      potentialEarnings: '€1-2M',
      matches: generateMatches([
        ...pickRandom(topTeams, 1),
        ...pickRandom(midTeams, 2),
        ...pickRandom(lowTeams, 1)
      ], playerTeam, true)
    },
    {
      id: 'regional',
      name: 'Torneo Regional',
      description: 'Partidos cercanos con menor desgaste',
      difficulty: 'low',
      potentialEarnings: '€0.5-1M',
      matches: generateMatches([
        ...pickRandom(midTeams, 2),
        ...pickRandom(lowTeams, 2)
      ], playerTeam, true)
    }
  ];
  
  return options;
}

/**
 * Genera los 5 partidos de pretemporada
 * El último siempre es en casa
 */
function generateMatches(opponents, playerTeam, lastAtHome = true) {
  const matches = [];
  
  for (let i = 0; i < 4; i++) {
    const opponent = opponents[i] || opponents[0];
    const isHome = i === 3 ? lastAtHome : Math.random() > 0.6; // Último en casa, otros mayormente fuera
    
    matches.push({
      id: `preseason_${i + 1}`,
      week: i + 1,
      homeTeam: isHome ? playerTeam.id : opponent.id,
      awayTeam: isHome ? opponent.id : playerTeam.id,
      homeTeamName: isHome ? playerTeam.name : opponent.name,
      awayTeamName: isHome ? opponent.name : playerTeam.name,
      isHome,
      opponent: opponent,
      played: false,
      isPreseason: true
    });
  }
  
  // Partido 5 - Siempre en casa (presentación del equipo)
  const finalOpponent = opponents[opponents.length > 4 ? 4 : opponents.length - 1] || opponents[0];
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
    isPresentationMatch: true // Partido de presentación
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
    default:
      return false;
  }
}

/**
 * Prepara el estado para la nueva temporada
 */
export function prepareNewSeason(currentState, seasonResult) {
  const newSeason = currentState.currentSeason + 1;
  
  // Envejecer jugadores
  const agedPlayers = currentState.team.players.map(player => ({
    ...player,
    age: player.age + 1,
    // Reducir overall para jugadores mayores de 32
    overall: player.age >= 32 
      ? Math.max(50, player.overall - Math.floor(Math.random() * 3))
      : player.overall
  }));
  
  // Decrementar contratos y filtrar expirados
  const playersWithContracts = agedPlayers
    .map(player => {
      const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
      return {
        ...player,
        contractYears: contractYears - 1
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
 * Obtiene el nombre de la competición europea
 */
export function getCompetitionName(qualification) {
  switch (qualification) {
    case 'champions': return 'UEFA Champions League';
    case 'europaLeague': return 'UEFA Europa League';
    case 'conference': return 'UEFA Conference League';
    default: return null;
  }
}

/**
 * Calcula bonus por clasificación europea
 */
export function getEuropeanBonus(qualification) {
  switch (qualification) {
    case 'champions': return 15000000; // €15M
    case 'europaLeague': return 8000000; // €8M
    case 'conference': return 4000000; // €4M
    default: return 0;
  }
}
