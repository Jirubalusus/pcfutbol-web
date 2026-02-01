// ============================================================
// PLAYOFF ENGINE - Sistema de playoffs de ascenso
// Semifinales: 3º vs 6º, 4º vs 5º
// Final: ganadores se enfrentan
// El ganador asciende (3er ascenso)
// ============================================================

import { simulateMatch } from './leagueEngine';

/**
 * Genera el bracket de playoff a partir de la clasificación
 * @param {Array} table - Clasificación final de la liga
 * @param {Array} allTeams - Datos completos de equipos
 * @returns {Object} bracket con equipos y estructura
 */
export function generatePlayoffBracket(table, allTeams) {
  // Equipos en posiciones 3-6
  const playoffPositions = [2, 3, 4, 5]; // índices 0-based
  const playoffEntries = playoffPositions.map(i => table[i]).filter(Boolean);
  
  if (playoffEntries.length < 4) {
    console.warn('No hay suficientes equipos para el playoff');
    return null;
  }
  
  // Buscar datos completos de cada equipo
  const getTeamData = (teamId) => allTeams.find(t => t.id === teamId);
  
  const team3 = { ...playoffEntries[0], teamData: getTeamData(playoffEntries[0].teamId), seed: 3 };
  const team4 = { ...playoffEntries[1], teamData: getTeamData(playoffEntries[1].teamId), seed: 4 };
  const team5 = { ...playoffEntries[2], teamData: getTeamData(playoffEntries[2].teamId), seed: 5 };
  const team6 = { ...playoffEntries[3], teamData: getTeamData(playoffEntries[3].teamId), seed: 6 };
  
  return {
    semifinals: [
      {
        id: 'semi1',
        label: 'Semifinal 1',
        homeTeam: team3,  // 3º juega en casa (mejor clasificado)
        awayTeam: team6,
        result: null,
        played: false
      },
      {
        id: 'semi2',
        label: 'Semifinal 2',
        homeTeam: team4,  // 4º juega en casa
        awayTeam: team5,
        result: null,
        played: false
      }
    ],
    final: {
      id: 'final',
      label: 'Final de Ascenso',
      homeTeam: null,  // Se determina tras semis
      awayTeam: null,
      result: null,
      played: false
    },
    winner: null,
    phase: 'semifinals', // 'semifinals' | 'final' | 'completed'
    teamIds: [team3.teamId, team4.teamId, team5.teamId, team6.teamId]
  };
}

/**
 * Simula un partido de playoff
 * @returns {Object} resultado del partido con info extra de playoff
 */
export function simulatePlayoffMatch(homeEntry, awayEntry) {
  const homeTeam = homeEntry.teamData;
  const awayTeam = awayEntry.teamData;
  
  if (!homeTeam || !awayTeam) {
    console.error('Missing team data for playoff match');
    return null;
  }
  
  const result = simulateMatch(
    homeEntry.teamId,
    awayEntry.teamId,
    homeTeam,
    awayTeam,
    {
      homeMorale: homeEntry.morale || 75,
      awayMorale: awayEntry.morale || 75,
      importance: 'playoff',
      attendanceFillRate: 0.95 // Playoffs siempre llenos
    }
  );
  
  // En caso de empate en playoff: prórroga + penaltis
  let finalHomeScore = result.homeScore;
  let finalAwayScore = result.awayScore;
  let extraTime = false;
  let penalties = null;
  
  if (result.homeScore === result.awayScore) {
    extraTime = true;
    // Prórroga: probabilidad de gol extra
    const extraTimeGoal = Math.random();
    if (extraTimeGoal < 0.3) {
      // Gol en prórroga (favorece ligeramente al de casa)
      if (Math.random() < 0.55) {
        finalHomeScore++;
      } else {
        finalAwayScore++;
      }
    }
    
    // Si sigue empate: penaltis
    if (finalHomeScore === finalAwayScore) {
      penalties = simulatePenalties(homeEntry, awayEntry);
      // En penaltis, el "ganador" se marca con flag pero el score queda igual
    }
  }
  
  const winnerId = penalties
    ? penalties.winnerId
    : (finalHomeScore > finalAwayScore ? homeEntry.teamId : awayEntry.teamId);
  
  return {
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    finalHomeScore,
    finalAwayScore,
    extraTime,
    penalties,
    winnerId,
    winnerName: winnerId === homeEntry.teamId 
      ? (homeTeam.shortName || homeTeam.name) 
      : (awayTeam.shortName || awayTeam.name),
    loserName: winnerId === homeEntry.teamId 
      ? (awayTeam.shortName || awayTeam.name) 
      : (homeTeam.shortName || homeTeam.name),
    events: result.events || [],
    homeTeamName: homeTeam.shortName || homeTeam.name,
    awayTeamName: awayTeam.shortName || awayTeam.name
  };
}

/**
 * Simula tanda de penaltis
 */
function simulatePenalties(homeEntry, awayEntry) {
  let homeGoals = 0;
  let awayGoals = 0;
  const rounds = [];
  
  // 5 rondas estándar
  for (let i = 0; i < 5; i++) {
    const homeScores = Math.random() < 0.78; // 78% prob de marcar
    const awayScores = Math.random() < 0.75; // 75% (desventaja visitante)
    
    if (homeScores) homeGoals++;
    if (awayScores) awayGoals++;
    
    rounds.push({ home: homeScores, away: awayScores });
    
    // Comprobar si ya es imposible remontar
    const remaining = 4 - i;
    if (Math.abs(homeGoals - awayGoals) > remaining) break;
  }
  
  // Muerte súbita si empate tras 5
  let round = 5;
  while (homeGoals === awayGoals && round < 15) {
    const homeScores = Math.random() < 0.70;
    const awayScores = Math.random() < 0.68;
    
    if (homeScores) homeGoals++;
    if (awayScores) awayGoals++;
    
    rounds.push({ home: homeScores, away: awayScores });
    
    // En muerte súbita, si uno marca y otro falla, se acabó
    if (round >= 5 && homeScores !== awayScores) break;
    round++;
  }
  
  // Si aún empatan (improbable), el de casa gana por sorteo
  const winnerId = homeGoals >= awayGoals ? homeEntry.teamId : awayEntry.teamId;
  
  return {
    homeGoals,
    awayGoals,
    rounds,
    winnerId
  };
}

/**
 * Avanza el bracket de playoff: resuelve semifinales y prepara la final
 * @param {Object} bracket - Estado actual del bracket
 * @param {string} matchId - ID del partido resuelto ('semi1', 'semi2', 'final')
 * @param {Object} result - Resultado del partido
 * @returns {Object} bracket actualizado
 */
export function advancePlayoffBracket(bracket, matchId, result) {
  const updated = JSON.parse(JSON.stringify(bracket));
  
  if (matchId === 'semi1' || matchId === 'semi2') {
    const semiIdx = matchId === 'semi1' ? 0 : 1;
    updated.semifinals[semiIdx].result = result;
    updated.semifinals[semiIdx].played = true;
    
    // Si ambas semis se jugaron, preparar la final
    if (updated.semifinals[0].played && updated.semifinals[1].played) {
      const winner1Id = updated.semifinals[0].result.winnerId;
      const winner2Id = updated.semifinals[1].result.winnerId;
      
      // El ganador del semi1 (seed más alto) juega en casa en la final
      const semi1Home = updated.semifinals[0].homeTeam;
      const semi1Away = updated.semifinals[0].awayTeam;
      const semi2Home = updated.semifinals[1].homeTeam;
      const semi2Away = updated.semifinals[1].awayTeam;
      
      const finalist1 = winner1Id === semi1Home.teamId ? semi1Home : semi1Away;
      const finalist2 = winner2Id === semi2Home.teamId ? semi2Home : semi2Away;
      
      // El de mejor seed juega en casa
      updated.final.homeTeam = finalist1.seed < finalist2.seed ? finalist1 : finalist2;
      updated.final.awayTeam = finalist1.seed < finalist2.seed ? finalist2 : finalist1;
      updated.phase = 'final';
    }
  } else if (matchId === 'final') {
    updated.final.result = result;
    updated.final.played = true;
    updated.winner = result.winnerId;
    updated.phase = 'completed';
  }
  
  return updated;
}

/**
 * Auto-simula todo el playoff completo (para cuando el jugador no está involucrado)
 * @param {Array} table - Clasificación final de Segunda
 * @param {Array} allTeams - Datos de todos los equipos
 * @returns {Object} bracket completo con resultados
 */
export function simulateFullPlayoff(table, allTeams) {
  let bracket = generatePlayoffBracket(table, allTeams);
  if (!bracket) return null;
  
  // Semifinal 1: 3 vs 6
  const semi1Result = simulatePlayoffMatch(
    bracket.semifinals[0].homeTeam,
    bracket.semifinals[0].awayTeam
  );
  bracket = advancePlayoffBracket(bracket, 'semi1', semi1Result);
  
  // Semifinal 2: 4 vs 5
  const semi2Result = simulatePlayoffMatch(
    bracket.semifinals[1].homeTeam,
    bracket.semifinals[1].awayTeam
  );
  bracket = advancePlayoffBracket(bracket, 'semi2', semi2Result);
  
  // Final
  const finalResult = simulatePlayoffMatch(
    bracket.final.homeTeam,
    bracket.final.awayTeam
  );
  bracket = advancePlayoffBracket(bracket, 'final', finalResult);
  
  return bracket;
}

/**
 * Comprueba si un equipo está en el playoff
 */
export function isTeamInPlayoff(teamId, playoffBracket) {
  if (!playoffBracket) return false;
  return playoffBracket.teamIds.includes(teamId);
}

/**
 * Obtiene el próximo partido de playoff para un equipo
 */
export function getNextPlayoffMatch(teamId, bracket) {
  if (!bracket) return null;
  
  if (bracket.phase === 'semifinals') {
    const semi = bracket.semifinals.find(s => 
      !s.played && (s.homeTeam.teamId === teamId || s.awayTeam.teamId === teamId)
    );
    return semi;
  }
  
  if (bracket.phase === 'final') {
    if (!bracket.final.played && 
        (bracket.final.homeTeam?.teamId === teamId || bracket.final.awayTeam?.teamId === teamId)) {
      return bracket.final;
    }
  }
  
  return null;
}

/**
 * Comprueba si un equipo sigue vivo en el playoff
 */
export function isTeamAliveInPlayoff(teamId, bracket) {
  if (!bracket || bracket.phase === 'completed') return false;
  
  if (bracket.phase === 'semifinals') {
    // Está en una semifinal que no se ha jugado
    return bracket.semifinals.some(s => 
      !s.played && (s.homeTeam.teamId === teamId || s.awayTeam.teamId === teamId)
    ) || bracket.semifinals.some(s =>
      s.played && s.result.winnerId === teamId
    );
  }
  
  if (bracket.phase === 'final') {
    return bracket.final.homeTeam?.teamId === teamId || bracket.final.awayTeam?.teamId === teamId;
  }
  
  return false;
}

/**
 * Genera texto descriptivo del resultado de un playoff match
 */
export function getPlayoffMatchSummary(match) {
  if (!match.result) return '';
  const r = match.result;
  
  let text = `${r.homeTeamName} ${r.homeScore} - ${r.awayScore} ${r.awayTeamName}`;
  
  if (r.extraTime && !r.penalties) {
    text += ` (Prórroga: ${r.finalHomeScore}-${r.finalAwayScore})`;
  }
  if (r.penalties) {
    text += ` (Penaltis: ${r.penalties.homeGoals}-${r.penalties.awayGoals})`;
  }
  
  text += ` → Avanza: ${r.winnerName}`;
  return text;
}

// ============================================================
// GROUP PLAYOFF ENGINE - Playoffs para ligas de grupos (RFEF)
// Formato: 2º-5º de cada grupo juegan playoff interno
// Semi 1: 2º vs 5º | Semi 2: 3º vs 4º | Final: ganadores
// El ganador de cada grupo asciende
// ============================================================

/**
 * Genera bracket de playoff para un grupo individual (posiciones 2-5)
 * @param {Array} groupTable - Clasificación del grupo (ordenada)
 * @param {Array} allTeams - Datos completos de todos los equipos
 * @param {string} groupId - ID del grupo (ej: 'grupo1')
 * @returns {Object} bracket con estructura de playoff
 */
export function generateGroupPlayoffBracket(groupTable, allTeams, groupId) {
  // Posiciones 2-5 (índices 1-4)
  const playoffPositions = [1, 2, 3, 4]; // 0-based
  const playoffEntries = playoffPositions.map(i => groupTable[i]).filter(Boolean);
  
  if (playoffEntries.length < 4) {
    console.warn(`No hay suficientes equipos para playoff en ${groupId}`);
    return null;
  }
  
  const getTeamData = (teamId) => allTeams.find(t => t.id === teamId);
  
  const team2 = { ...playoffEntries[0], teamData: getTeamData(playoffEntries[0].teamId), seed: 2 };
  const team3 = { ...playoffEntries[1], teamData: getTeamData(playoffEntries[1].teamId), seed: 3 };
  const team4 = { ...playoffEntries[2], teamData: getTeamData(playoffEntries[2].teamId), seed: 4 };
  const team5 = { ...playoffEntries[3], teamData: getTeamData(playoffEntries[3].teamId), seed: 5 };
  
  return {
    groupId,
    semifinals: [
      {
        id: `${groupId}_semi1`,
        label: `Semifinal 1 (${groupId})`,
        homeTeam: team2,  // 2º en casa
        awayTeam: team5,
        result: null,
        played: false
      },
      {
        id: `${groupId}_semi2`,
        label: `Semifinal 2 (${groupId})`,
        homeTeam: team3,  // 3º en casa
        awayTeam: team4,
        result: null,
        played: false
      }
    ],
    final: {
      id: `${groupId}_final`,
      label: `Final de Ascenso (${groupId})`,
      homeTeam: null,
      awayTeam: null,
      result: null,
      played: false
    },
    winner: null,
    phase: 'semifinals',
    teamIds: [team2.teamId, team3.teamId, team4.teamId, team5.teamId]
  };
}

/**
 * Genera playoffs para TODOS los grupos de una liga RFEF
 * @param {Object} groupLeagueData - { groups: { grupo1: { table, fixtures }, ... } }
 * @param {Array} allTeams - Datos completos de todos los equipos
 * @param {string|null} playerTeamId - ID del equipo del jugador
 * @returns {Object} { brackets: { grupo1: bracket, grupo2: bracket, ... }, playerGroupId: string|null }
 */
export function generateAllGroupPlayoffs(groupLeagueData, allTeams, playerTeamId = null) {
  const brackets = {};
  let playerGroupId = null;
  
  if (!groupLeagueData?.groups) return { brackets, playerGroupId };
  
  Object.entries(groupLeagueData.groups).forEach(([groupId, groupData]) => {
    const table = groupData.table || [];
    if (table.length < 5) return; // Need at least 5 teams for playoff
    
    const bracket = generateGroupPlayoffBracket(table, allTeams, groupId);
    if (bracket) {
      brackets[groupId] = bracket;
      
      // Check if player is in this playoff
      if (playerTeamId && bracket.teamIds.includes(playerTeamId)) {
        playerGroupId = groupId;
      }
    }
  });
  
  return { brackets, playerGroupId };
}

/**
 * Auto-simula el playoff de un grupo completo
 * @param {Object} bracket - Bracket del grupo
 * @returns {Object} bracket con resultados
 */
export function simulateGroupPlayoff(bracket) {
  if (!bracket) return null;
  
  // Semifinal 1: 2º vs 5º
  const semi1Result = simulatePlayoffMatch(
    bracket.semifinals[0].homeTeam,
    bracket.semifinals[0].awayTeam
  );
  bracket = advanceGroupPlayoffBracket(bracket, bracket.semifinals[0].id, semi1Result);
  
  // Semifinal 2: 3º vs 4º
  const semi2Result = simulatePlayoffMatch(
    bracket.semifinals[1].homeTeam,
    bracket.semifinals[1].awayTeam
  );
  bracket = advanceGroupPlayoffBracket(bracket, bracket.semifinals[1].id, semi2Result);
  
  // Final
  if (bracket.final.homeTeam && bracket.final.awayTeam) {
    const finalResult = simulatePlayoffMatch(
      bracket.final.homeTeam,
      bracket.final.awayTeam
    );
    bracket = advanceGroupPlayoffBracket(bracket, bracket.final.id, finalResult);
  }
  
  return bracket;
}

/**
 * Avanza bracket de grupo: identifica semi1/semi2/final por el id del match
 */
export function advanceGroupPlayoffBracket(bracket, matchId, result) {
  const updated = JSON.parse(JSON.stringify(bracket));
  
  // Determinar si es semi1, semi2 o final
  const isSemi1 = matchId === updated.semifinals[0].id;
  const isSemi2 = matchId === updated.semifinals[1].id;
  const isFinal = matchId === updated.final.id;
  
  if (isSemi1 || isSemi2) {
    const semiIdx = isSemi1 ? 0 : 1;
    updated.semifinals[semiIdx].result = result;
    updated.semifinals[semiIdx].played = true;
    
    // Si ambas semis jugadas, preparar la final
    if (updated.semifinals[0].played && updated.semifinals[1].played) {
      const winner1Id = updated.semifinals[0].result.winnerId;
      const winner2Id = updated.semifinals[1].result.winnerId;
      
      const semi1Home = updated.semifinals[0].homeTeam;
      const semi1Away = updated.semifinals[0].awayTeam;
      const semi2Home = updated.semifinals[1].homeTeam;
      const semi2Away = updated.semifinals[1].awayTeam;
      
      const finalist1 = winner1Id === semi1Home.teamId ? semi1Home : semi1Away;
      const finalist2 = winner2Id === semi2Home.teamId ? semi2Home : semi2Away;
      
      // Mejor seed juega en casa
      updated.final.homeTeam = finalist1.seed < finalist2.seed ? finalist1 : finalist2;
      updated.final.awayTeam = finalist1.seed < finalist2.seed ? finalist2 : finalist1;
      updated.phase = 'final';
    }
  } else if (isFinal) {
    updated.final.result = result;
    updated.final.played = true;
    updated.winner = result.winnerId;
    updated.phase = 'completed';
  }
  
  return updated;
}

/**
 * Auto-simula TODOS los playoffs de grupo excepto el del jugador
 * @param {Object} allBrackets - { grupo1: bracket, grupo2: bracket, ... }
 * @param {string|null} playerTeamId - ID del equipo del jugador  
 * @returns {{ brackets: Object, playerBracket: Object|null }}
 */
export function simulateAllGroupPlayoffs(allBrackets, playerTeamId = null) {
  const results = {};
  let playerBracket = null;
  
  Object.entries(allBrackets).forEach(([groupId, bracket]) => {
    if (!bracket) return;
    
    const playerInThisPlayoff = playerTeamId && bracket.teamIds.includes(playerTeamId);
    
    if (playerInThisPlayoff) {
      // Don't simulate — player plays this one
      playerBracket = bracket;
      results[groupId] = bracket;
    } else {
      // Auto-simulate
      results[groupId] = simulateGroupPlayoff(bracket);
    }
  });
  
  return { brackets: results, playerBracket };
}

/**
 * Obtiene todos los ganadores de playoffs de grupo (equipos que ascienden)
 * @param {Object} allBrackets - { grupo1: bracket, ... }
 * @returns {Array} - Array de teamIds que ganaron sus playoffs
 */
export function getGroupPlayoffWinners(allBrackets) {
  const winners = [];
  
  Object.values(allBrackets).forEach(bracket => {
    if (bracket?.winner) {
      winners.push(bracket.winner);
    }
  });
  
  return winners;
}
