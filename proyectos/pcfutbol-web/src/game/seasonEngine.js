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
  // MEJORADO: Más generoso para equipos pequeños, más realista
  let budgetMultiplier = 1.0;
  
  if (outcome.champions) budgetMultiplier = 1.35;      // Champions = +35%
  else if (outcome.europaLeague) budgetMultiplier = 1.20;
  else if (outcome.conferenceLeague) budgetMultiplier = 1.12;
  else if (outcome.promotion) budgetMultiplier = 1.8;   // ASCENSO = +80% (TV, sponsors, etc.)
  else if (outcome.relegation) budgetMultiplier = 0.85; // Descenso = -15% (no tan brutal)
  else budgetMultiplier = 1.05; // Inflación base +5% anual
  
  // Bonus por consolidación: si el equipo lleva tiempo en una liga, crece más
  if (team.seasonsInCurrentLeague && team.seasonsInCurrentLeague >= 3) {
    budgetMultiplier *= 1.05; // +5% extra por estabilidad
  }

  // Envejecer jugadores
  const updatedPlayers = team.players.map(p => {
    let newOverall = p.overall;
    
    // Jugadores jóvenes mejoran (potencial)
    if (p.age <= 24 && Math.random() < 0.4) {
      newOverall = Math.min(99, newOverall + 1);
    }
    // Veteranos decaen más gradualmente
    else if (p.age >= 32) {
      const decayChance = (p.age - 31) * 0.15; // 15% a los 32, 30% a los 33, etc.
      if (Math.random() < decayChance) {
        newOverall = Math.max(55, newOverall - 1);
      }
    }
    
    return {
      ...p,
      age: p.age + 1,
      overall: newOverall,
      // Resetear estado
      injured: false,
      injuredWeeks: 0,
      trainingProgress: 0
    };
  });

  // Retirar jugadores muy mayores (>36) con probabilidad
  const activePlayers = updatedPlayers.filter(p => {
    if (p.age > 38) return false;
    if (p.age > 36) return Math.random() > 0.5; // 50% de retirarse
    return true;
  });
  const retiredPlayers = updatedPlayers.filter(p => !activePlayers.includes(p));

  return {
    ...team,
    players: activePlayers,
    budget: Math.round(team.budget * budgetMultiplier),
    retiredPlayers,
    seasonsInCurrentLeague: outcome.promotion || outcome.relegation ? 1 : (team.seasonsInCurrentLeague || 1) + 1
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
 * MEJORADO: Más equilibrado, tiene en cuenta experiencia
 */
export function simulatePlayoff(teamPosition, teamOverall, playoffExperience = 0) {
  // Probabilidad base de ganar el playoff según posición
  // AUMENTADAS para que no sea tan frustrante
  const baseProbability = {
    3: 0.42,  // Era 0.35
    4: 0.35,  // Era 0.28
    5: 0.28,  // Era 0.22
    6: 0.22   // Era 0.15
  };
  
  let probability = baseProbability[teamPosition] || 0.25;
  
  // Ajustar por overall del equipo (más impacto)
  probability += (teamOverall - 70) * 0.015;
  
  // Bonus por experiencia en playoffs (aprendes de los fracasos)
  probability += Math.min(playoffExperience * 0.05, 0.15); // Hasta +15%
  
  // Factor suerte del día (puede ser tu día)
  const luckFactor = (Math.random() - 0.5) * 0.1; // ±5%
  probability += luckFactor;
  
  // Clamp entre 10% y 60%
  probability = Math.max(0.10, Math.min(0.60, probability));
  
  const won = Math.random() < probability;
  
  return {
    won,
    probability: Math.round(probability * 100)
  };
}
