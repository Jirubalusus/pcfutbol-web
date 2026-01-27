// Motor de fin de temporada
// Gestiona ascensos, descensos y transición a nueva temporada

/**
 * Verifica si la temporada ha terminado
 */
export function isSeasonEnd(currentWeek, totalWeeks = 38) {
  return currentWeek >= totalWeeks;
}

/**
 * Calcula el resultado de fin de temporada para el equipo del jugador
 */
export function calculateSeasonOutcome(position, leagueId, totalTeams) {
  const outcome = {
    promotion: false,
    relegation: false,
    playoff: false,
    champions: false,
    europaLeague: false,
    conferenceLeague: false,
    newLeagueId: leagueId
  };

  // Ligas españolas
  if (leagueId === 'laliga') {
    if (position <= 4) outcome.champions = true;
    else if (position <= 5) outcome.europaLeague = true;
    else if (position <= 6) outcome.conferenceLeague = true;
    else if (position >= totalTeams - 2) {
      outcome.relegation = true;
      outcome.newLeagueId = 'segunda';
    }
  } 
  else if (leagueId === 'segunda') {
    if (position <= 2) {
      outcome.promotion = true;
      outcome.newLeagueId = 'laliga';
    } else if (position <= 6) {
      outcome.playoff = true;
    } else if (position >= totalTeams - 3) {
      outcome.relegation = true;
      outcome.newLeagueId = 'primeraRFEF';
    }
  }
  else if (leagueId === 'primeraRFEF') {
    if (position <= 2) {
      outcome.promotion = true;
      outcome.newLeagueId = 'segunda';
    } else if (position <= 6) {
      outcome.playoff = true;
    } else if (position >= totalTeams - 3) {
      outcome.relegation = true;
      outcome.newLeagueId = 'segundaRFEF';
    }
  }
  else if (leagueId === 'segundaRFEF') {
    if (position <= 2) {
      outcome.promotion = true;
      outcome.newLeagueId = 'primeraRFEF';
    } else if (position <= 6) {
      outcome.playoff = true;
    }
    // No hay descenso desde Segunda RFEF en este juego
  }
  // Ligas internacionales top
  else if (['premierLeague', 'bundesliga', 'serieA', 'ligue1'].includes(leagueId)) {
    if (position <= 4) outcome.champions = true;
    else if (position <= 5) outcome.europaLeague = true;
    else if (position <= 6 || position === 7) outcome.conferenceLeague = true;
    // Por ahora no hay descenso en ligas extranjeras
  }
  else if (['eredivisie', 'primeiraLiga'].includes(leagueId)) {
    if (position <= 2) outcome.champions = true;
    else if (position <= 3) outcome.champions = true; // Previa
    else if (position <= 4) outcome.europaLeague = true;
  }

  return outcome;
}

/**
 * Genera el mensaje de fin de temporada
 */
export function generateSeasonEndMessage(outcome, teamName, position) {
  let title = '📋 Fin de temporada';
  let content = '';
  let type = 'season_end';

  if (outcome.champions) {
    title = '🏆 ¡Champions League!';
    content = `¡Enhorabuena! ${teamName} ha terminado en ${position}ª posición y jugará la Champions League la próxima temporada.`;
    type = 'success';
  } else if (outcome.europaLeague) {
    title = '🥈 Europa League';
    content = `${teamName} ha terminado en ${position}ª posición y se ha clasificado para la Europa League.`;
    type = 'success';
  } else if (outcome.conferenceLeague) {
    title = '🥉 Conference League';
    content = `${teamName} ha terminado en ${position}ª posición y jugará la Conference League.`;
    type = 'success';
  } else if (outcome.promotion) {
    title = '🎉 ¡ASCENSO!';
    content = `¡Histórico! ${teamName} ha conseguido el ascenso tras una temporada espectacular en ${position}ª posición.`;
    type = 'success';
  } else if (outcome.playoff) {
    title = '🏟️ Playoff de ascenso';
    content = `${teamName} ha terminado ${position}º y disputará el playoff de ascenso. ¡Todo por decidir!`;
    type = 'warning';
  } else if (outcome.relegation) {
    title = '📉 Descenso';
    content = `Temporada difícil para ${teamName}. La posición ${position}ª supone el descenso de categoría.`;
    type = 'danger';
  } else {
    content = `${teamName} ha terminado la temporada en ${position}ª posición. Una temporada para olvidar y construir de cara al futuro.`;
  }

  return { title, content, type };
}

/**
 * Prepara el equipo para la nueva temporada
 */
export function prepareNewSeason(team, outcome, newLeagueTeams) {
  // Ajustar presupuesto según resultado
  let budgetMultiplier = 1.0;
  
  if (outcome.champions) budgetMultiplier = 1.3;
  else if (outcome.europaLeague) budgetMultiplier = 1.15;
  else if (outcome.conferenceLeague) budgetMultiplier = 1.08;
  else if (outcome.promotion) budgetMultiplier = 1.5; // Gran inyección por ascenso
  else if (outcome.relegation) budgetMultiplier = 0.7; // Pérdida significativa
  else budgetMultiplier = 1.02; // Ligero aumento inflacionario

  // Envejecer jugadores
  const updatedPlayers = team.players.map(p => ({
    ...p,
    age: p.age + 1,
    // Reducir media de veteranos
    overall: p.age >= 33 ? Math.max(60, p.overall - 1) : p.overall,
    // Resetear estado
    injured: false,
    injuredWeeks: 0,
    trainingProgress: 0
  }));

  // Retirar jugadores muy mayores (>38)
  const activePlayers = updatedPlayers.filter(p => p.age <= 38);
  const retiredPlayers = updatedPlayers.filter(p => p.age > 38);

  return {
    ...team,
    players: activePlayers,
    budget: Math.round(team.budget * budgetMultiplier),
    retiredPlayers
  };
}

/**
 * Genera objetivos para la nueva temporada basado en el resultado anterior
 */
export function generateNewSeasonObjectives(team, newLeagueId, previousOutcome) {
  // Esta función se usará junto con objectivesEngine.generateSeasonObjectives
  // para ajustar los objetivos basándose en la temporada anterior
  
  let adjustedReputation = team.reputation;
  
  if (previousOutcome.champions) adjustedReputation = Math.min(99, adjustedReputation + 2);
  else if (previousOutcome.promotion) adjustedReputation = Math.min(99, adjustedReputation + 5);
  else if (previousOutcome.relegation) adjustedReputation = Math.max(40, adjustedReputation - 5);
  
  return {
    ...team,
    reputation: adjustedReputation
  };
}

/**
 * Simula el playoff de ascenso (simplificado)
 */
export function simulatePlayoff(teamPosition, teamOverall) {
  // Probabilidad base de ganar el playoff según posición
  const baseProbability = {
    3: 0.35,
    4: 0.28,
    5: 0.22,
    6: 0.15
  };
  
  const probability = baseProbability[teamPosition] || 0.2;
  
  // Ajustar por overall del equipo
  const adjustedProbability = probability + (teamOverall - 75) * 0.01;
  
  const won = Math.random() < adjustedProbability;
  
  return {
    won,
    probability: Math.round(adjustedProbability * 100)
  };
}
