// Sistema de Personalidad y Motivaciones de Jugadores

// Tipos de personalidad
export const PERSONALITIES = {
  ambitious: { 
    name: 'Ambicioso', 
    icon: '🏆',
    description: 'Quiere ganar títulos y jugar en grandes equipos',
    priorities: { titles: 2, reputation: 1.5, money: 0.8, minutes: 1 }
  },
  mercenary: { 
    name: 'Mercenario', 
    icon: '💰',
    description: 'El dinero es lo primero',
    priorities: { titles: 0.5, reputation: 0.7, money: 2, minutes: 0.8 }
  },
  loyal: { 
    name: 'Leal', 
    icon: '❤️',
    description: 'Valora la estabilidad y el club',
    priorities: { titles: 0.8, reputation: 0.6, money: 0.7, minutes: 1.2, loyalty: 2 }
  },
  competitor: { 
    name: 'Competidor', 
    icon: '⚔️',
    description: 'Necesita jugar y competir',
    priorities: { titles: 1, reputation: 0.8, money: 0.7, minutes: 2 }
  },
  professional: { 
    name: 'Profesional', 
    icon: '📋',
    description: 'Equilibrado, valora todo por igual',
    priorities: { titles: 1, reputation: 1, money: 1, minutes: 1 }
  },
  patriot: { 
    name: 'Patriota', 
    icon: '🌍',
    description: 'Prioriza la selección nacional',
    priorities: { titles: 0.8, reputation: 1, money: 0.6, minutes: 1.8, nationalTeam: 2 }
  }
};

// Objetivos especiales que pueden tener los jugadores
export const SPECIAL_GOALS = {
  worldCup: {
    name: 'Quiere ir al Mundial',
    icon: '🏆🌍',
    description: 'Necesita minutos para entrar en la selección',
    minMinutesRequired: 70, // % de minutos jugados necesarios
    ageRange: [26, 34]
  },
  breakThrough: {
    name: 'Quiere ser titular',
    icon: '⭐',
    description: 'Joven talento que necesita oportunidades',
    ageRange: [18, 23]
  },
  lastContract: {
    name: 'Último gran contrato',
    icon: '💵',
    description: 'Veterano buscando asegurar su futuro',
    ageRange: [30, 38]
  },
  returnHome: {
    name: 'Quiere volver a casa',
    icon: '🏠',
    description: 'Añora su país/ciudad de origen',
    ageRange: [28, 38]
  },
  winTitles: {
    name: 'Hambre de títulos',
    icon: '🏆',
    description: 'Quiere ganar antes de retirarse',
    ageRange: [27, 35]
  },
  proveWorth: {
    name: 'Demostrar su valía',
    icon: '💪',
    description: 'Quiere demostrar que puede competir al máximo nivel',
    ageRange: [22, 28]
  }
};

// Generar personalidad para un jugador
export function generatePlayerPersonality(player, seed = 0) {
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset + player.name.length * 100) * 10000;
    return x - Math.floor(x);
  };
  
  // Asignar personalidad basada en características
  let personality;
  const roll = seededRandom(1);
  
  if (player.overall >= 85) {
    // Estrellas tienden a ser ambiciosos o competidores
    if (roll < 0.4) personality = 'ambitious';
    else if (roll < 0.7) personality = 'competitor';
    else if (roll < 0.85) personality = 'professional';
    else personality = 'mercenary';
  } else if (player.age >= 30) {
    // Veteranos más variados
    if (roll < 0.25) personality = 'loyal';
    else if (roll < 0.5) personality = 'mercenary';
    else if (roll < 0.7) personality = 'professional';
    else personality = 'patriot';
  } else if (player.age <= 23) {
    // Jóvenes quieren jugar
    if (roll < 0.4) personality = 'competitor';
    else if (roll < 0.6) personality = 'ambitious';
    else if (roll < 0.8) personality = 'professional';
    else personality = 'patriot';
  } else {
    // Resto más equilibrado
    const types = Object.keys(PERSONALITIES);
    personality = types[Math.floor(roll * types.length)];
  }
  
  // Generar objetivo especial (30% de probabilidad)
  let specialGoal = null;
  if (seededRandom(2) < 0.3) {
    const goals = Object.entries(SPECIAL_GOALS).filter(([_, goal]) => 
      player.age >= goal.ageRange[0] && player.age <= goal.ageRange[1]
    );
    if (goals.length > 0) {
      const goalRoll = Math.floor(seededRandom(3) * goals.length);
      specialGoal = goals[goalRoll][0];
    }
  }
  
  // Nivel de felicidad base (40-80)
  const baseHappiness = 40 + Math.floor(seededRandom(4) * 40);
  
  return {
    type: personality,
    specialGoal,
    happiness: baseHappiness,
    loyaltyYears: 0, // Años en el club
    minutesPlayed: 0, // % de minutos jugados esta temporada
    goalsScored: 0,
    assists: 0,
    wantsToLeave: false,
    contractYears: 2 + Math.floor(seededRandom(5) * 3), // 2-4 años
    lastRenewalOffer: null
  };
}

// Calcular felicidad del jugador
export function calculatePlayerHappiness(player, teamContext) {
  const personality = PERSONALITIES[player.personality?.type || 'professional'];
  const priorities = personality.priorities;
  
  let happiness = 50; // Base
  
  // Factor minutos jugados (0-100% de los partidos)
  const minutesPercent = player.personality?.minutesPlayed || 50;
  if (minutesPercent >= 80) happiness += 15 * priorities.minutes;
  else if (minutesPercent >= 60) happiness += 5 * priorities.minutes;
  else if (minutesPercent >= 40) happiness -= 5 * priorities.minutes;
  else if (minutesPercent >= 20) happiness -= 15 * priorities.minutes;
  else happiness -= 25 * priorities.minutes;
  
  // Factor salario vs valor de mercado
  const salaryRatio = (player.salary * 52) / (player.value * 0.15); // Salario anual vs 15% del valor
  if (salaryRatio >= 1.2) happiness += 10 * priorities.money;
  else if (salaryRatio >= 1) happiness += 5 * priorities.money;
  else if (salaryRatio < 0.8) happiness -= 10 * priorities.money;
  
  // Factor reputación del equipo
  const teamRep = teamContext.reputation || 70;
  if (teamRep >= 90) happiness += 15 * priorities.reputation;
  else if (teamRep >= 80) happiness += 8 * priorities.reputation;
  else if (teamRep >= 70) happiness += 0;
  else happiness -= 10 * priorities.reputation;
  
  // Factor títulos/posición en liga
  const leaguePosition = teamContext.leaguePosition || 10;
  if (leaguePosition <= 3) happiness += 10 * priorities.titles;
  else if (leaguePosition <= 6) happiness += 5 * priorities.titles;
  else if (leaguePosition >= 15) happiness -= 10 * priorities.titles;
  
  // Factor lealtad
  const yearsAtClub = player.personality?.loyaltyYears || 0;
  if (priorities.loyalty) {
    happiness += yearsAtClub * 3 * priorities.loyalty;
  }
  
  // Factor objetivo especial
  if (player.personality?.specialGoal) {
    const goal = SPECIAL_GOALS[player.personality.specialGoal];
    if (goal) {
      if (player.personality.specialGoal === 'worldCup' || player.personality.specialGoal === 'breakThrough') {
        // Necesitan minutos
        if (minutesPercent < goal.minMinutesRequired || 60) {
          happiness -= 20;
        }
      }
      if (player.personality.specialGoal === 'lastContract' && salaryRatio < 1) {
        happiness -= 15;
      }
      if (player.personality.specialGoal === 'winTitles' && leaguePosition > 4) {
        happiness -= 15;
      }
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(happiness)));
}

// Evaluar si un jugador aceptaría una oferta de fichaje
export function evaluateTransferOffer(player, currentTeam, newTeam, offer) {
  const personality = PERSONALITIES[player.personality?.type || 'professional'];
  const priorities = personality.priorities;
  
  let score = 0;
  let reasons = [];
  
  // === FACTORES POSITIVOS ===
  
  // Mejora salarial
  const salaryIncrease = (offer.salary - player.salary) / player.salary;
  if (salaryIncrease > 0.5) {
    score += 25 * priorities.money;
    reasons.push({ positive: true, text: `+${Math.round(salaryIncrease * 100)}% de salario` });
  } else if (salaryIncrease > 0.2) {
    score += 15 * priorities.money;
    reasons.push({ positive: true, text: `Mejora salarial` });
  } else if (salaryIncrease < -0.1) {
    score -= 20 * priorities.money;
    reasons.push({ positive: false, text: `Bajada de salario` });
  }
  
  // Mejora de reputación del equipo
  const repDiff = (newTeam.reputation || 70) - (currentTeam.reputation || 70);
  if (repDiff > 15) {
    score += 30 * priorities.reputation;
    reasons.push({ positive: true, text: `Salto a un grande` });
  } else if (repDiff > 5) {
    score += 15 * priorities.reputation;
    reasons.push({ positive: true, text: `Mejor equipo` });
  } else if (repDiff < -15) {
    score -= 25 * priorities.reputation;
    reasons.push({ positive: false, text: `Paso atrás deportivo` });
  } else if (repDiff < -5) {
    score -= 10 * priorities.reputation;
    reasons.push({ positive: false, text: `Equipo de menor nivel` });
  }
  
  // Posibilidad de títulos
  if (newTeam.reputation >= 85 && currentTeam.reputation < 80) {
    score += 20 * priorities.titles;
    reasons.push({ positive: true, text: `Opción a títulos` });
  }
  
  // Minutos de juego prometidos
  if (offer.promisedRole === 'starter' && (player.personality?.minutesPlayed || 50) < 50) {
    score += 25 * priorities.minutes;
    reasons.push({ positive: true, text: `Promesa de ser titular` });
  } else if (offer.promisedRole === 'rotation' && (player.personality?.minutesPlayed || 50) > 70) {
    score -= 15 * priorities.minutes;
    reasons.push({ positive: false, text: `Perdería titularidad` });
  }
  
  // === FACTORES ESPECIALES ===
  
  // Objetivo especial del jugador
  if (player.personality?.specialGoal) {
    const goal = player.personality.specialGoal;
    
    if (goal === 'worldCup') {
      // Si no juega y el nuevo equipo le da minutos
      if ((player.personality?.minutesPlayed || 50) < 60 && offer.promisedRole === 'starter') {
        score += 40;
        reasons.push({ positive: true, text: `🌍 Oportunidad de ir al Mundial` });
      }
      // Acepta menos dinero por jugar
      if (offer.promisedRole === 'starter') {
        score += 20;
      }
    }
    
    if (goal === 'breakThrough') {
      if (offer.promisedRole === 'starter') {
        score += 30;
        reasons.push({ positive: true, text: `⭐ Oportunidad de brillar` });
      }
    }
    
    if (goal === 'lastContract') {
      if (salaryIncrease > 0.3) {
        score += 25;
        reasons.push({ positive: true, text: `💵 Asegura su futuro` });
      } else if (salaryIncrease < 0) {
        score -= 30;
        reasons.push({ positive: false, text: `No es el contrato que busca` });
      }
    }
    
    if (goal === 'winTitles') {
      if (newTeam.reputation >= 85) {
        score += 35;
        reasons.push({ positive: true, text: `🏆 Puede ganar títulos` });
      }
    }
  }
  
  // === FACTORES NEGATIVOS ===
  
  // Lealtad al club actual
  const yearsAtClub = player.personality?.loyaltyYears || 0;
  if (yearsAtClub >= 3 && priorities.loyalty) {
    score -= yearsAtClub * 5 * priorities.loyalty;
    if (yearsAtClub >= 5) {
      reasons.push({ positive: false, text: `Muy arraigado al club` });
    }
  }
  
  // Felicidad actual alta = menos ganas de irse
  const currentHappiness = player.personality?.happiness || 50;
  if (currentHappiness >= 80) {
    score -= 20;
    reasons.push({ positive: false, text: `Feliz en su club actual` });
  } else if (currentHappiness <= 40) {
    score += 20;
    reasons.push({ positive: true, text: `Descontento actual` });
  }
  
  // Calcular probabilidad final
  const baseProbability = 50;
  const finalProbability = Math.max(5, Math.min(95, baseProbability + score));
  
  return {
    probability: finalProbability,
    wouldAccept: finalProbability >= 50,
    reasons,
    score
  };
}

// Evaluar si un jugador aceptaría renovar
export function evaluateRenewalOffer(player, team, offer) {
  const personality = PERSONALITIES[player.personality?.type || 'professional'];
  const priorities = personality.priorities;
  
  let score = 0;
  let reasons = [];
  
  // === FACTORES BASE ===
  
  // Comparar con salario actual
  const salaryIncrease = (offer.newSalary - player.salary) / player.salary;
  if (salaryIncrease > 0.3) {
    score += 30 * priorities.money;
    reasons.push({ positive: true, text: `Gran mejora salarial (+${Math.round(salaryIncrease * 100)}%)` });
  } else if (salaryIncrease > 0.1) {
    score += 15 * priorities.money;
    reasons.push({ positive: true, text: `Mejora salarial` });
  } else if (salaryIncrease < 0) {
    score -= 25 * priorities.money;
    reasons.push({ positive: false, text: `Bajada de sueldo inaceptable` });
  } else {
    // Mismo salario
    if (player.age <= 27 && player.overall >= 80) {
      score -= 10;
      reasons.push({ positive: false, text: `Esperaba una mejora` });
    }
  }
  
  // Duración del contrato
  if (offer.years >= 4 && player.age >= 30) {
    score += 20; // Veteranos valoran contratos largos
    reasons.push({ positive: true, text: `Seguridad a largo plazo` });
  } else if (offer.years <= 1 && player.age <= 28) {
    score -= 15;
    reasons.push({ positive: false, text: `Contrato demasiado corto` });
  }
  
  // === MINUTOS JUGADOS (CRÍTICO) ===
  const minutesPercent = player.personality?.minutesPlayed || 50;
  
  if (minutesPercent < 30) {
    score -= 40 * priorities.minutes;
    reasons.push({ positive: false, text: `😤 No juega suficiente` });
    
    // Si prometen más minutos
    if (offer.promisedRole === 'starter') {
      score += 25;
      reasons.push({ positive: true, text: `Promesa de más minutos` });
    }
  } else if (minutesPercent < 50) {
    score -= 20 * priorities.minutes;
    reasons.push({ positive: false, text: `Quiere más protagonismo` });
  } else if (minutesPercent >= 80) {
    score += 15 * priorities.minutes;
    reasons.push({ positive: true, text: `Titular indiscutible` });
  }
  
  // === OBJETIVOS ESPECIALES ===
  if (player.personality?.specialGoal) {
    const goal = player.personality.specialGoal;
    
    if (goal === 'worldCup' && minutesPercent < 60) {
      score -= 35;
      reasons.push({ positive: false, text: `🌍 Necesita jugar para ir al Mundial` });
      
      if (offer.promisedRole !== 'starter') {
        score -= 20;
        reasons.push({ positive: false, text: `Sin garantías de titularidad` });
      }
    }
    
    if (goal === 'breakThrough' && minutesPercent < 50) {
      score -= 30;
      reasons.push({ positive: false, text: `⭐ Necesita oportunidades para crecer` });
    }
    
    if (goal === 'lastContract') {
      if (salaryIncrease >= 0.2 && offer.years >= 3) {
        score += 30;
        reasons.push({ positive: true, text: `💵 El contrato que buscaba` });
      } else {
        score -= 20;
        reasons.push({ positive: false, text: `Esperaba más para su último contrato` });
      }
    }
    
    if (goal === 'winTitles') {
      const leaguePosition = team.leaguePosition || 10;
      if (leaguePosition > 6) {
        score -= 25;
        reasons.push({ positive: false, text: `🏆 El equipo no compite por títulos` });
      }
    }
  }
  
  // === LEALTAD Y FELICIDAD ===
  const yearsAtClub = player.personality?.loyaltyYears || 0;
  if (yearsAtClub >= 3) {
    score += yearsAtClub * 3 * (priorities.loyalty || 1);
    if (yearsAtClub >= 5) {
      reasons.push({ positive: true, text: `❤️ Se siente en casa` });
    }
  }
  
  const happiness = player.personality?.happiness || 50;
  if (happiness >= 75) {
    score += 20;
  } else if (happiness <= 35) {
    score -= 25;
    reasons.push({ positive: false, text: `Descontento general` });
  }
  
  // === EDAD Y MERCADO ===
  if (player.age <= 25 && player.overall >= 78) {
    // Jugador joven con potencial - más opciones
    score -= 10;
    if ((team.reputation || 70) < 75) {
      reasons.push({ positive: false, text: `Podría fichar por un equipo más grande` });
    }
  }
  
  if (player.age >= 33) {
    // Veterano - menos opciones
    score += 15;
    reasons.push({ positive: true, text: `Pocas ofertas a su edad` });
  }
  
  // Probabilidad final
  const baseProbability = 50;
  const finalProbability = Math.max(5, Math.min(95, baseProbability + score));
  
  // Determinar respuesta
  let response;
  if (finalProbability >= 70) {
    response = 'accept';
  } else if (finalProbability >= 40) {
    response = 'negotiate'; // Quiere negociar
  } else {
    response = 'reject';
  }
  
  return {
    probability: finalProbability,
    response,
    reasons,
    score,
    // Qué pediría en negociación
    counterOffer: response === 'negotiate' ? {
      salary: Math.round(offer.newSalary * (1.15 + (50 - finalProbability) / 200)),
      years: offer.years,
      promisedRole: minutesPercent < 50 ? 'starter' : offer.promisedRole
    } : null
  };
}

// Generar demanda de renovación de un jugador
export function generateRenewalDemand(player, team) {
  const personality = PERSONALITIES[player.personality?.type || 'professional'];
  const minutesPercent = player.personality?.minutesPlayed || 50;
  
  // Salario base pedido
  let salaryMultiplier = 1.1; // Piden 10% más por defecto
  
  // Ajustes según situación
  if (player.overall >= 85) salaryMultiplier += 0.2;
  if (player.age <= 25 && player.overall >= 78) salaryMultiplier += 0.15;
  if (minutesPercent >= 80) salaryMultiplier += 0.1;
  if (minutesPercent < 40) salaryMultiplier -= 0.1; // Piden menos si no juegan
  if (player.age >= 32) salaryMultiplier -= 0.1;
  
  // Personalidad
  if (personality.priorities.money > 1.5) salaryMultiplier += 0.2;
  
  const demandedSalary = Math.round(player.salary * salaryMultiplier);
  
  // Años pedidos
  let demandedYears = 3;
  if (player.age >= 32) demandedYears = 2;
  if (player.age >= 35) demandedYears = 1;
  if (player.age <= 25) demandedYears = 4;
  if (player.personality?.specialGoal === 'lastContract') demandedYears = Math.max(3, demandedYears);
  
  // Condiciones especiales
  const conditions = [];
  if (minutesPercent < 50 && player.personality?.specialGoal === 'worldCup') {
    conditions.push({ type: 'minutes', text: 'Garantía de minutos', required: true });
  }
  if (minutesPercent < 40) {
    conditions.push({ type: 'role', text: 'Rol de titular', required: player.overall >= 75 });
  }
  
  return {
    salary: demandedSalary,
    years: demandedYears,
    conditions,
    willing: (player.personality?.happiness || 50) >= 40
  };
}

// Actualizar estado del jugador cada semana
export function updatePlayerState(player, matchPlayed, wasStarter, goals = 0, assists = 0) {
  if (!player.personality) return player;
  
  const newPersonality = { ...player.personality };
  
  // Actualizar minutos
  // Simplificación: si jugó de titular = 90min, si no = 0-30min
  const minutesThisMatch = wasStarter ? 90 : (matchPlayed ? 20 : 0);
  const totalPossibleMinutes = 90; // Por partido
  const matchMinutesPercent = (minutesThisMatch / totalPossibleMinutes) * 100;
  
  // Media móvil de minutos (últimos ~10 partidos)
  newPersonality.minutesPlayed = Math.round(
    (newPersonality.minutesPlayed * 0.9) + (matchMinutesPercent * 0.1)
  );
  
  // Actualizar estadísticas
  newPersonality.goalsScored = (newPersonality.goalsScored || 0) + goals;
  newPersonality.assists = (newPersonality.assists || 0) + assists;
  
  // Actualizar felicidad basado en minutos
  if (wasStarter) {
    newPersonality.happiness = Math.min(100, newPersonality.happiness + 2);
  } else if (!matchPlayed) {
    newPersonality.happiness = Math.max(0, newPersonality.happiness - 3);
  }
  
  // Si lleva mucho sin jugar, considerar querer irse
  if (newPersonality.minutesPlayed < 20 && newPersonality.happiness < 40) {
    newPersonality.wantsToLeave = true;
  } else if (newPersonality.minutesPlayed >= 60 && newPersonality.happiness >= 60) {
    newPersonality.wantsToLeave = false;
  }
  
  return { ...player, personality: newPersonality };
}
