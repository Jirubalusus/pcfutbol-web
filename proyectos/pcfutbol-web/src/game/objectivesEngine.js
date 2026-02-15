// Sistema de Objetivos del Juego
// Define los objetivos de temporada y evalúa el rendimiento del entrenador

/**
 * Genera los objetivos de temporada basados en el equipo y liga
 */
export function generateSeasonObjectives(team, leagueId, leagueTable) {
  const reputation = team.reputation || 70;
  const teamPosition = leagueTable.findIndex(t => t.teamId === team.id) + 1;
  
  // Determinar categoría del equipo
  let teamTier = 'mid'; // low, mid, high, elite
  if (reputation >= 90) teamTier = 'elite';
  else if (reputation >= 80) teamTier = 'high';
  else if (reputation >= 70) teamTier = 'mid';
  else teamTier = 'low';
  
  const objectives = [];
  
  // Objetivo principal: Posición en liga
  const positionObjective = getPositionObjective(teamTier, leagueId, leagueTable.length);
  objectives.push(positionObjective);
  
  // Objetivos secundarios según el tier
  if (teamTier === 'elite') {
    objectives.push({
      id: 'title_contender',
      type: 'league_position',
      nameKey: 'objNames.titleContender',
      descKey: 'objDescs.titleContender',
      target: 2,
      priority: 'high',
      reward: 5000000,
      penalty: -2000000
    });
  }
  
  if (teamTier !== 'low') {
    objectives.push({
      id: 'goal_difference',
      type: 'goal_difference',
      nameKey: 'objNames.goalDifference',
      descKey: 'objDescs.goalDifference',
      target: 1,
      priority: 'medium',
      reward: 1000000,
      penalty: 0
    });
  }
  
  // Objetivo económico
  objectives.push({
    id: 'financial_stability',
    type: 'financial',
    nameKey: 'objNames.financialStability',
    descKey: 'objDescs.financialStability',
    target: 0,
    priority: 'high',
    reward: 2000000,
    penalty: -1000000
  });
  
  // Objetivo de desarrollo (si hay jóvenes)
  const youngPlayers = team.players?.filter(p => p.age <= 21) || [];
  if (youngPlayers.length >= 3) {
    objectives.push({
      id: 'youth_development',
      type: 'youth_minutes',
      nameKey: 'objNames.youthDevelopment',
      descKey: 'objDescs.youthDevelopment',
      target: 10, // partidos con jóvenes en el XI
      priority: 'low',
      reward: 500000,
      penalty: 0
    });
  }
  
  return objectives;
}

/**
 * Determina el objetivo de posición según el tier del equipo
 */
function getPositionObjective(tier, leagueId, totalTeams) {
  const isLowerLeague = ['segunda', 'primeraRFEF', 'segundaRFEF'].includes(leagueId);
  
  const objectives = {
    elite: {
      nameKey: 'objNames.championsQualification',
      descKey: 'objDescs.championsQualification',
      target: 4,
      priority: 'critical',
      reward: 10000000,
      penalty: -5000000
    },
    high: {
      nameKey: 'objNames.europeanQualification',
      descKey: 'objDescs.europeanQualification',
      target: 6,
      priority: 'critical',
      reward: 5000000,
      penalty: -3000000
    },
    mid: {
      nameKey: 'objNames.topHalf',
      descKey: 'objDescs.topHalf',
      target: Math.ceil(totalTeams / 2),
      priority: 'critical',
      reward: 2000000,
      penalty: -1000000
    },
    low: {
      nameKey: 'objNames.avoidRelegation',
      descKey: 'objDescs.avoidRelegation',
      target: totalTeams - 3, // últimos 3 descienden
      priority: 'critical',
      reward: 3000000,
      penalty: -2000000
    }
  };
  
  // Ajustar para ligas menores
  if (isLowerLeague && tier !== 'low') {
    return {
      id: 'league_position',
      type: 'league_position',
      nameKey: 'objNames.promotion',
      descKey: 'objDescs.promotion',
      target: leagueId === 'segunda' ? 6 : 5, // Segunda: top 6 (2 direct + 3-6 playoff), RFEF: top 5 (1 direct + 2-5 playoff)
      priority: 'critical',
      reward: 8000000,
      penalty: -2000000
    };
  }
  
  return {
    id: 'league_position',
    type: 'league_position',
    ...objectives[tier]
  };
}

/**
 * Evalúa el cumplimiento de objetivos al final de temporada
 */
export function evaluateSeasonObjectives(objectives, teamStats, money) {
  const results = objectives.map(obj => {
    let completed = false;
    let progress = 0;
    
    switch (obj.type) {
      case 'league_position':
        completed = teamStats.position <= obj.target;
        progress = Math.max(0, Math.min(100, (1 - (teamStats.position - 1) / obj.target) * 100));
        break;
        
      case 'goal_difference':
        const gd = teamStats.goalsFor - teamStats.goalsAgainst;
        completed = gd >= obj.target;
        progress = Math.max(0, Math.min(100, (gd / 20) * 100));
        break;
        
      case 'financial':
        completed = money >= obj.target;
        progress = money >= 0 ? 100 : Math.max(0, 100 + (money / 10000000) * 100);
        break;
        
      case 'youth_minutes':
        const youthGames = teamStats.youthGames || 0;
        completed = youthGames >= obj.target;
        progress = Math.min(100, (youthGames / obj.target) * 100);
        break;
        
      default:
        completed = false;
        progress = 0;
    }
    
    return {
      ...obj,
      completed,
      progress: Math.round(progress)
    };
  });
  
  return results;
}

/**
 * Calcula la valoración del entrenador basada en resultados
 */
export function calculateManagerRating(objectiveResults, teamStats) {
  let rating = 50; // Base
  
  // Objetivos críticos pesan más
  objectiveResults.forEach(obj => {
    const weight = obj.priority === 'critical' ? 20 : 
                   obj.priority === 'high' ? 10 : 5;
    
    if (obj.completed) {
      rating += weight;
    } else {
      rating -= weight * 0.5;
    }
  });
  
  // Bonus por superar expectativas
  const criticalObj = objectiveResults.find(o => o.priority === 'critical');
  if (criticalObj && criticalObj.type === 'league_position') {
    if (teamStats.position <= criticalObj.target - 3) {
      rating += 15; // Muy por encima de expectativas
    }
  }
  
  // Penalización por descenso
  if (teamStats.relegated) {
    rating -= 30;
  }
  
  return Math.max(0, Math.min(100, Math.round(rating)));
}

/**
 * Determina si el entrenador es despedido
 */
export function checkDismissal(managerRating, teamReputation) {
  // Equipos más exigentes tienen umbral más alto
  const dismissalThreshold = teamReputation >= 90 ? 40 :
                              teamReputation >= 80 ? 35 :
                              teamReputation >= 70 ? 30 : 25;
  
  return managerRating < dismissalThreshold;
}

/**
 * Genera ofertas de trabajo de otros equipos
 */
export function generateJobOffers(managerRating, currentTeamReputation, allTeams, currentTeamId) {
  if (managerRating < 50) return []; // Sin ofertas si es malo
  
  const offers = [];
  
  // Filtrar equipos que podrían ofrecer
  const potentialTeams = allTeams.filter(team => {
    if (team.id === currentTeamId) return false;
    
    // Solo equipos de reputación similar o inferior
    const repDiff = team.reputation - currentTeamReputation;
    
    // Si el rating es muy alto, equipos mejores también pueden ofrecer
    if (managerRating >= 80) {
      return repDiff <= 10;
    } else if (managerRating >= 70) {
      return repDiff <= 5;
    } else if (managerRating >= 60) {
      return repDiff <= 0;
    }
    return repDiff <= -5;
  });
  
  // Generar 0-3 ofertas aleatorias
  const numOffers = managerRating >= 80 ? 3 :
                    managerRating >= 70 ? 2 :
                    managerRating >= 60 ? 1 : 0;
  
  const shuffled = [...potentialTeams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(numOffers, shuffled.length); i++) {
    const team = shuffled[i];
    const salaryMultiplier = 1 + (team.reputation - currentTeamReputation) / 100;
    
    offers.push({
      teamId: team.id,
      teamName: team.name,
      teamReputation: team.reputation,
      leagueId: team.leagueId || 'laliga',
      salary: Math.round(50000 * salaryMultiplier), // Salario semanal base
      contractYears: 2 + Math.floor(Math.random() * 2),
      budget: team.budget,
      description: getOfferDescription(team, currentTeamReputation)
    });
  }
  
  return offers;
}

function getOfferDescription(team, currentRep) {
  if (team.reputation > currentRep + 10) {
    return `${team.name} está impresionado por tu trabajo y quiere que lleves al equipo al siguiente nivel.`;
  } else if (team.reputation > currentRep) {
    return `${team.name} busca un entrenador con tu perfil para competir por los puestos altos.`;
  } else {
    return `${team.name} necesita un técnico experimentado para estabilizar el proyecto.`;
  }
}

/**
 * Mensaje de evaluación de fin de temporada
 */
export function getSeasonEvaluationMessage(managerRating, objectiveResults, teamStats) {
  const criticalCompleted = objectiveResults.filter(o => o.priority === 'critical' && o.completed).length;
  const criticalTotal = objectiveResults.filter(o => o.priority === 'critical').length;
  
  if (managerRating >= 80) {
    return {
      title: '¡Temporada excepcional!',
      icon: '🏆',
      message: `Has superado todas las expectativas. El club está encantado con tu trabajo y la afición te adora.`,
      tone: 'success'
    };
  } else if (managerRating >= 60) {
    return {
      title: 'Buena temporada',
      icon: '👍',
      message: `Has cumplido los objetivos principales. La directiva está satisfecha con tu rendimiento.`,
      tone: 'positive'
    };
  } else if (managerRating >= 40) {
    return {
      title: 'Temporada irregular',
      icon: '😐',
      message: `Los resultados no han sido los esperados. La directiva confía en que mejorarás la próxima temporada.`,
      tone: 'warning'
    };
  } else {
    return {
      title: 'Temporada decepcionante',
      icon: '😞',
      message: `No has cumplido con las expectativas del club. Tu puesto está en peligro.`,
      tone: 'danger'
    };
  }
}
