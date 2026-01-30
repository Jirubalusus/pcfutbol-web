// ============================================================
// SISTEMA DE OJEADOR (SCOUTING)
// ============================================================
// Genera sugerencias de fichajes basadas en necesidades del equipo

import { calculateMarketValue, TEAM_PROFILES } from './globalTransferEngine';
import { getClubTier, calculateTransferDifficulty, PLAYER_PERSONALITIES, assignPersonality } from './transferNegotiation';

// ============================================================
// CONFIGURACIÓN DEL OJEADOR
// ============================================================

export const SCOUTING_LEVELS = {
  0: {
    name: 'Sin ojeador',
    description: 'Sugerencias básicas sin filtrar',
    accuracy: 0.2,
    maxSuggestions: 10,
    features: ['Jugadores aleatorios de la liga']
  },
  1: {
    name: 'Ojeador Amateur',
    description: 'Filtra por posiciones que necesitas',
    accuracy: 0.5,
    maxSuggestions: 15,
    features: ['Filtra por posición', 'Identifica carencias']
  },
  2: {
    name: 'Ojeador Profesional',
    description: 'Ajusta por presupuesto y nivel',
    accuracy: 0.75,
    maxSuggestions: 20,
    features: ['Filtra por posición', 'Ajuste de presupuesto', 'Análisis de nivel']
  },
  3: {
    name: 'Ojeador Élite',
    description: 'Sugerencias perfectas para tu equipo',
    accuracy: 0.95,
    maxSuggestions: 20,
    features: ['Análisis completo', 'Personalidad compatible', 'Potencial de mejora', 'Dificultad de fichaje']
  }
};

// ============================================================
// ANÁLISIS DE NECESIDADES DEL EQUIPO
// ============================================================

/**
 * Analizar qué posiciones necesita reforzar el equipo
 */
export function analyzeTeamNeeds(team, scoutingLevel = 0) {
  const players = team?.players || [];
  const needs = [];
  
  // Contar jugadores por posición
  const positionGroups = {
    GK: { positions: ['GK'], ideal: 2, current: 0, avgOvr: 0 },
    CB: { positions: ['CB'], ideal: 4, current: 0, avgOvr: 0 },
    FB: { positions: ['RB', 'LB', 'RWB', 'LWB'], ideal: 4, current: 0, avgOvr: 0 },
    CDM: { positions: ['CDM'], ideal: 2, current: 0, avgOvr: 0 },
    CM: { positions: ['CM', 'CAM'], ideal: 4, current: 0, avgOvr: 0 },
    WM: { positions: ['RM', 'LM'], ideal: 2, current: 0, avgOvr: 0 },
    WIN: { positions: ['RW', 'LW'], ideal: 2, current: 0, avgOvr: 0 },
    ST: { positions: ['ST', 'CF'], ideal: 3, current: 0, avgOvr: 0 }
  };
  
  // Calcular actuales
  players.forEach(p => {
    for (const [groupKey, group] of Object.entries(positionGroups)) {
      if (group.positions.includes(p.position)) {
        group.current++;
        group.avgOvr = (group.avgOvr * (group.current - 1) + p.overall) / group.current;
        break;
      }
    }
  });
  
  // Calcular media global del equipo
  const teamAvgOvr = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length)
    : 70;
  
  // Determinar necesidades
  for (const [groupKey, group] of Object.entries(positionGroups)) {
    const shortage = group.ideal - group.current;
    const qualityGap = teamAvgOvr - group.avgOvr;
    
    let priority = 'low';
    let reason = '';
    
    if (shortage >= 2) {
      priority = 'critical';
      reason = `Faltan ${shortage} jugadores`;
    } else if (shortage === 1) {
      priority = 'high';
      reason = 'Falta profundidad';
    } else if (qualityGap >= 5 && group.current > 0) {
      priority = 'medium';
      reason = `Nivel bajo (${Math.round(group.avgOvr)} vs ${teamAvgOvr} media)`;
    } else if (qualityGap >= 3 && group.current > 0) {
      priority = 'low';
      reason = 'Mejorable';
    }
    
    if (priority !== 'low' || (scoutingLevel >= 2 && qualityGap > 0)) {
      needs.push({
        group: groupKey,
        positions: group.positions,
        priority,
        reason,
        current: group.current,
        ideal: group.ideal,
        avgOvr: Math.round(group.avgOvr),
        targetOvr: Math.max(teamAvgOvr, Math.round(group.avgOvr) + 3)
      });
    }
  }
  
  // Ordenar por prioridad
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  needs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return { needs, teamAvgOvr };
}

// ============================================================
// GENERACIÓN DE SUGERENCIAS
// ============================================================

/**
 * Generar sugerencias de fichajes
 */
export function generateScoutingSuggestions(myTeam, allTeams, scoutingLevel = 0, budget = 0) {
  const config = SCOUTING_LEVELS[scoutingLevel] || SCOUTING_LEVELS[0];
  const { needs, teamAvgOvr } = analyzeTeamNeeds(myTeam, scoutingLevel);
  const myTier = getClubTier(myTeam?.name || '');
  const myTeamId = myTeam?.id;
  
  // Recopilar todos los jugadores disponibles
  let allPlayers = [];
  (allTeams || []).forEach(team => {
    if (team.id === myTeamId) return;
    
    (team.players || []).forEach(player => {
      // Asignar personalidad si no tiene
      if (!player.personality) {
        player.personality = assignPersonality(player);
      }
      
      allPlayers.push({
        ...player,
        teamId: team.id,
        teamName: team.name,
        teamTier: getClubTier(team.name)
      });
    });
  });
  
  // Aplicar filtros según nivel de ojeador
  let suggestions = [];
  
  if (scoutingLevel === 0) {
    // Nivel 0: Random
    allPlayers = allPlayers.sort(() => Math.random() - 0.5);
    suggestions = allPlayers.slice(0, config.maxSuggestions);
  } else {
    // Nivel 1+: Filtrar por necesidades
    const neededPositions = new Set();
    needs.forEach(n => n.positions.forEach(p => neededPositions.add(p)));
    
    // Filtrar jugadores
    let filtered = allPlayers.filter(p => {
      // Nivel 1+: Posición necesaria
      if (neededPositions.size > 0 && !neededPositions.has(p.position)) {
        // Permitir algunos jugadores de otras posiciones (20%)
        if (Math.random() > 0.2) return false;
      }
      
      // Nivel 2+: Ajuste de presupuesto
      if (scoutingLevel >= 2) {
        const value = calculateMarketValue(p);
        if (value > budget * 0.7) return false; // Max 70% del presupuesto
      }
      
      // Nivel 2+: Nivel apropiado
      if (scoutingLevel >= 2) {
        const minOvr = teamAvgOvr - 8;
        const maxOvr = teamAvgOvr + 12;
        if (p.overall < minOvr || p.overall > maxOvr) return false;
      }
      
      // Nivel 3: Dificultad razonable
      if (scoutingLevel >= 3) {
        const difficulty = calculateTransferDifficulty(
          p,
          { name: p.teamName },
          { name: myTeam?.name || '' }
        );
        if (difficulty.percentage < 15) return false; // Muy difícil, no sugerir
      }
      
      return true;
    });
    
    // Nivel 3: Ordenar por idoneidad
    if (scoutingLevel >= 3) {
      filtered = filtered.map(p => {
        let score = 0;
        
        // Puntos por posición necesaria
        const matchingNeed = needs.find(n => n.positions.includes(p.position));
        if (matchingNeed) {
          if (matchingNeed.priority === 'critical') score += 30;
          else if (matchingNeed.priority === 'high') score += 20;
          else if (matchingNeed.priority === 'medium') score += 10;
          else score += 5;
        }
        
        // Puntos por nivel apropiado
        const ovrDiff = Math.abs(p.overall - teamAvgOvr);
        if (ovrDiff <= 3) score += 15;
        else if (ovrDiff <= 5) score += 10;
        else if (ovrDiff <= 8) score += 5;
        
        // Puntos por edad (preferir jóvenes con potencial)
        if (p.age <= 23) score += 15;
        else if (p.age <= 26) score += 10;
        else if (p.age <= 29) score += 5;
        
        // Puntos por precio asequible
        const value = calculateMarketValue(p);
        const budgetRatio = value / budget;
        if (budgetRatio <= 0.2) score += 10;
        else if (budgetRatio <= 0.4) score += 5;
        
        // Puntos por personalidad compatible (aventurero, mercenario = más fácil)
        if (p.personality === 'adventurous') score += 10;
        else if (p.personality === 'mercenary') score += 8;
        else if (p.personality === 'professional') score += 5;
        
        // Penalización por dificultad
        const difficulty = calculateTransferDifficulty(
          p,
          { name: p.teamName },
          { name: myTeam?.name || '' }
        );
        if (difficulty.tierDiff > 0) {
          score -= difficulty.tierDiff * 5;
        }
        
        return { ...p, scoutScore: score };
      });
      
      filtered.sort((a, b) => b.scoutScore - a.scoutScore);
    } else {
      // Niveles 1-2: Ordenar por overall y algo de random
      filtered.sort((a, b) => {
        const ovrDiff = b.overall - a.overall;
        if (Math.abs(ovrDiff) > 3) return ovrDiff;
        return Math.random() - 0.5;
      });
    }
    
    suggestions = filtered.slice(0, config.maxSuggestions);
  }
  
  // Añadir metadatos a cada sugerencia
  suggestions = suggestions.map(p => {
    const value = calculateMarketValue(p);
    const difficulty = calculateTransferDifficulty(
      p,
      { name: p.teamName },
      { name: myTeam?.name || '' }
    );
    const matchingNeed = needs.find(n => n.positions.includes(p.position));
    
    return {
      ...p,
      marketValue: value,
      difficulty,
      matchesNeed: !!matchingNeed,
      needPriority: matchingNeed?.priority || null,
      recommendation: generateRecommendation(p, matchingNeed, difficulty, scoutingLevel)
    };
  });
  
  return {
    suggestions,
    needs,
    teamAvgOvr,
    scoutingLevel,
    config
  };
}

/**
 * Generar texto de recomendación
 */
function generateRecommendation(player, need, difficulty, scoutingLevel) {
  if (scoutingLevel < 2) return null;
  
  const parts = [];
  
  // Por posición
  if (need) {
    if (need.priority === 'critical') {
      parts.push(`Cubre una necesidad crítica en ${need.group}`);
    } else if (need.priority === 'high') {
      parts.push(`Refuerzo importante para ${need.group}`);
    }
  }
  
  // Por edad
  if (player.age <= 22) {
    parts.push('Gran potencial de mejora');
  } else if (player.age >= 30) {
    parts.push('Experiencia inmediata');
  }
  
  // Por dificultad
  if (difficulty.percentage >= 70) {
    parts.push('Fichaje muy asequible');
  } else if (difficulty.percentage >= 50) {
    parts.push('Negociación viable');
  } else if (difficulty.percentage < 30) {
    parts.push('⚠️ Difícil de convencer');
  }
  
  // Por personalidad
  const personality = PLAYER_PERSONALITIES[player.personality];
  if (personality) {
    if (player.personality === 'adventurous') {
      parts.push('Abierto a nuevos retos');
    } else if (player.personality === 'mercenary') {
      parts.push('Sensible a buenas ofertas');
    } else if (player.personality === 'ambitious' && difficulty.tierDiff <= 0) {
      parts.push('Buscará subir de nivel');
    }
  }
  
  return parts.length > 0 ? parts.join('. ') + '.' : null;
}

// ============================================================
// LIGAS DISPONIBLES PARA EXPLORAR
// ============================================================

export const AVAILABLE_LEAGUES = [
  { id: 'laliga', name: 'La Liga', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#ff4444' },
  { id: 'segunda', name: 'La Liga 2', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#ff8844' },
  { id: 'premierLeague', name: 'Premier League', country: 'Inglaterra', flagUrl: 'https://flagcdn.com/gb-eng.svg', color: '#3d195b' },
  { id: 'serieA', name: 'Serie A', country: 'Italia', flagUrl: 'https://flagcdn.com/it.svg', color: '#008c45' },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Alemania', flagUrl: 'https://flagcdn.com/de.svg', color: '#dd0000' },
  { id: 'ligue1', name: 'Ligue 1', country: 'Francia', flagUrl: 'https://flagcdn.com/fr.svg', color: '#091c3e' },
];

/**
 * Obtener equipos de una liga
 */
export function getTeamsByLeague(allTeams, leagueId) {
  let teams = allTeams || [];
  if (leagueId) {
    teams = teams.filter(t => t.leagueId === leagueId);
  }
  return teams.map(team => ({
    ...team,
    tier: getClubTier(team.name),
    avgOverall: team.players?.length > 0
      ? Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length)
      : 70,
    totalValue: team.players?.reduce((sum, p) => sum + calculateMarketValue(p), 0) || 0
  })).sort((a, b) => b.avgOverall - a.avgOverall);
}

export default {
  SCOUTING_LEVELS,
  analyzeTeamNeeds,
  generateScoutingSuggestions,
  AVAILABLE_LEAGUES,
  getTeamsByLeague
};
