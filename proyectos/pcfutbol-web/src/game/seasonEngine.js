// Motor de fin de temporada
// Gestiona ascensos, descensos y transición a nueva temporada

import { generateSonPlayer } from './facilitiesSystem';

// ============================================================
// EVOLUCIÓN DE JUGADORES
// Sistema realista con variación única por jugador
// ============================================================

// Hash determinista basado en nombre del jugador
function nameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Genera un float 0-1 determinista para un jugador + aspecto
function playerSeed(name, aspect) {
  const h = nameHash(name + ':' + aspect);
  return (h % 10000) / 10000;
}

/**
 * Calcula la evolución de overall de un jugador al final de temporada.
 * 
 * Filosofía:
 * - Cada jugador tiene un "potencial de crecimiento" único (determinista por nombre)
 * - Muy jóvenes (16-20): crecimiento alto (+1 a +4)
 * - Jóvenes (21-24): crecimiento moderado (+1 a +2)
 * - Prime (25-28): ligero crecimiento o meseta (+0 a +1)
 * - Madurez (29-33): meseta, raramente bajan
 * - Declive (34+): empiezan a perder, variable por jugador
 * 
 * El resultado NO es fijo: combina un componente determinista (personalidad)
 * con variación aleatoria (forma de la temporada, lesiones, etc.)
 */
export function evolvePlayer(player) {
  const { name, age, overall } = player;
  
  // === "HIJOS" DE JUGADORES: crecimiento acelerado hacia potential ===
  if (player.isSon && player.potential) {
    return evolveSonPlayer(player);
  }
  
  // === PERFIL ÚNICO DEL JUGADOR (determinista por nombre) ===
  const talentSeed = playerSeed(name, 'talent');     // 0-1: talento natural
  const peakAgeSeed = playerSeed(name, 'peakAge');    // 0-1: cuándo llega al pico
  const durability = playerSeed(name, 'durability');  // 0-1: resistencia al declive
  
  // Edad pico: entre 28 y 33 dependiendo del jugador
  const peakAge = 28 + Math.floor(peakAgeSeed * 6);  // 28-33
  
  // Factor talento: jugadores con más talento crecen más rápido
  // Rango: 0.6 (talento bajo) a 1.4 (talento alto)
  const talentFactor = 0.6 + talentSeed * 0.8;
  
  // Factor suerte de la temporada (aleatorio, simula buena/mala temporada)
  const seasonLuck = (Math.random() - 0.5) * 0.6; // -0.3 a +0.3
  
  let change = 0;
  
  if (age <= 20) {
    // MUY JÓVENES: crecimiento alto
    // Base: +1.5 a +3.5, modificado por talento y suerte
    const base = 1.5 + talentFactor * 1.5; // 2.4 a 3.6
    change = base + seasonLuck;
    // Algunos cracks pegan un estirón brutal
    if (talentSeed > 0.85 && Math.random() < 0.25) change += 1;
  } 
  else if (age <= 24) {
    // JÓVENES: crecimiento moderado
    // Base: +0.8 a +2.2
    const base = 0.8 + talentFactor * 1.0; // 1.4 a 1.9
    change = base + seasonLuck;
  }
  else if (age <= 28) {
    // PRIME TEMPRANO: crecimiento lento, llegando al pico
    // Base: +0.2 a +0.8
    const base = 0.2 + talentFactor * 0.4; // 0.44 a 0.76
    change = base + seasonLuck * 0.7;
    // Si ya tiene overall muy alto (90+), más difícil mejorar
    if (overall >= 90) change *= 0.5;
  }
  else if (age <= peakAge) {
    // PRIME/MESETA: se mantiene, pequeños ajustes
    // Base: -0.2 a +0.4
    change = 0.1 + seasonLuck * 0.5;
    if (overall >= 92) change -= 0.3; // Techos naturales
  }
  else {
    // DECLIVE: después de la edad pico
    const yearsPostPeak = age - peakAge;
    // Cuánto declina depende de durabilidad y años post-pico
    // Jugadores duraderos: bajan menos, más tarde
    // Base: -0.5 por año post-pico, reducido por durabilidad
    const decayRate = 0.5 + (1.0 - durability) * 0.8; // 0.5 a 1.3 por año
    const base = -(yearsPostPeak * decayRate);
    change = base + seasonLuck * 0.4; // La suerte ayuda menos
    
    // A los 37+ el declive es más pronunciado siempre
    if (age >= 37) change -= 1.0;
    // A los 39+ caída libre
    if (age >= 39) change -= 1.5;
  }
  
  // Redondear con probabilidad proporcional a la parte decimal
  // Ej: +1.7 → 70% de +2, 30% de +1
  const sign = change >= 0 ? 1 : -1;
  const absChange = Math.abs(change);
  const intPart = Math.floor(absChange);
  const fracPart = absChange - intPart;
  const roundedChange = sign * (intPart + (Math.random() < fracPart ? 1 : 0));
  
  // Aplicar límites
  const newOverall = Math.max(50, Math.min(99, overall + roundedChange));
  
  return newOverall;
}

/**
 * Evolución especial para "hijos" de jugadores retirados
 * Crecen más rápido hacia su potential, luego se comportan como jugadores normales
 */
function evolveSonPlayer(player) {
  const { age, overall, potential } = player;
  const gap = potential - overall;
  const seasonLuck = (Math.random() - 0.5) * 0.4; // -0.2 a +0.2
  
  let change = 0;
  
  if (age <= 20) {
    // Juventud: crecimiento rápido hacia potential
    // Cubrir ~20-30% del gap por temporada
    const growthRate = 0.20 + Math.random() * 0.10;
    change = Math.max(2, gap * growthRate) + seasonLuck;
  } else if (age <= 24) {
    // Desarrollo: sigue creciendo pero más lento
    // Cubrir ~12-20% del gap restante
    const growthRate = 0.12 + Math.random() * 0.08;
    change = Math.max(1, gap * growthRate) + seasonLuck;
  } else if (age <= 28) {
    // Prime: ajustes finos, ya cerca del potential
    if (gap > 3) {
      change = 1 + seasonLuck;
    } else {
      change = 0.2 + seasonLuck * 0.5;
    }
  } else if (age <= 32) {
    // Meseta/inicio declive
    change = -0.2 + seasonLuck * 0.5;
  } else {
    // Declive — comportamiento normal
    const yearsOver = age - 32;
    change = -(yearsOver * 0.8) + seasonLuck * 0.3;
    if (age >= 37) change -= 1.0;
  }
  
  // Si supera el potential, frenar
  if (overall >= potential && change > 0) {
    change = Math.min(change, 0.3);
  }
  
  // Redondear con probabilidad proporcional
  const sign = change >= 0 ? 1 : -1;
  const absChange = Math.abs(change);
  const intPart = Math.floor(absChange);
  const fracPart = absChange - intPart;
  const roundedChange = sign * (intPart + (Math.random() < fracPart ? 1 : 0));
  
  return Math.max(50, Math.min(99, overall + roundedChange));
}

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
    title = '🏆 ¡Continental Champions Cup!';
    content = `¡Enhorabuena! ${teamName} ha terminado en ${position}ª posición y jugará la Continental Champions Cup la próxima temporada.`;
    type = 'success';
  } else if (outcome.europaLeague) {
    title = '🥈 Continental Shield';
    content = `${teamName} ha terminado en ${position}ª posición y se ha clasificado para la Continental Shield.`;
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

  // Evolucionar jugadores (edad + overall)
  const updatedPlayers = team.players.map(p => {
    const newOverall = evolvePlayer(p);
    
    return {
      ...p,
      age: p.age + 1,
      overall: newOverall,
      // Resetear estado
      injured: false,
      injuryWeeksLeft: 0,
      injuryType: null,
      treated: false,
      trainingProgress: 0,
      yellowCards: 0,
      suspended: false,
      suspensionType: null
    };
  });

  // Retirar jugadores muy mayores (>36) con probabilidad
  const activePlayers = updatedPlayers.filter(p => {
    if (p.age > 38) return false;
    if (p.age > 36) return Math.random() > 0.5; // 50% de retirarse
    return true;
  });
  const retiredPlayers = updatedPlayers.filter(p => !activePlayers.includes(p));

  // Generar "hijos" para reemplazar a los retirados
  const newSons = retiredPlayers.map(retired => generateSonPlayer(retired));

  return {
    ...team,
    players: [...activePlayers, ...newSons],
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
