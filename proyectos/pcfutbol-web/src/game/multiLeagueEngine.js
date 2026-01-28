// ============================================================
// MULTI-LEAGUE ENGINE - Sistema de múltiples ligas
// Inicializa y simula todas las ligas en paralelo
// ============================================================

import { initializeLeague, simulateMatch, updateTable, getWeekFixtures } from './leagueEngine';
import { 
  getLaLigaTeams, 
  getSegundaTeams, 
  getPremierTeams, 
  getSerieATeams, 
  getBundesligaTeams, 
  getLigue1Teams 
} from '../data/teamsFirestore';

// Configuración de ligas
export const LEAGUE_CONFIG = {
  laliga: {
    id: 'laliga',
    name: 'La Liga',
    country: 'España',
    teams: 20,
    getTeams: getLaLigaTeams,
    zones: {
      champions: [1, 2, 3, 4],
      europaLeague: [5, 6],
      conference: [7],
      relegation: [18, 19, 20]
    }
  },
  segunda: {
    id: 'segunda',
    name: 'Segunda División',
    country: 'España',
    teams: 22,
    getTeams: getSegundaTeams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6],
      relegation: [20, 21, 22]
    }
  },
  premierLeague: {
    id: 'premierLeague',
    name: 'Premier League',
    country: 'Inglaterra',
    teams: 20,
    getTeams: getPremierTeams,
    zones: {
      champions: [1, 2, 3, 4],
      europaLeague: [5],
      conference: [6, 7],
      relegation: [18, 19, 20]
    }
  },
  serieA: {
    id: 'serieA',
    name: 'Serie A',
    country: 'Italia',
    teams: 20,
    getTeams: getSerieATeams,
    zones: {
      champions: [1, 2, 3, 4],
      europaLeague: [5, 6],
      conference: [7],
      relegation: [18, 19, 20]
    }
  },
  bundesliga: {
    id: 'bundesliga',
    name: 'Bundesliga',
    country: 'Alemania',
    teams: 18,
    getTeams: getBundesligaTeams,
    zones: {
      champions: [1, 2, 3, 4],
      europaLeague: [5, 6],
      conference: [7],
      relegation: [16, 17, 18]
    }
  },
  ligue1: {
    id: 'ligue1',
    name: 'Ligue 1',
    country: 'Francia',
    teams: 18,
    getTeams: getLigue1Teams,
    zones: {
      champions: [1, 2, 3],
      europaLeague: [4],
      conference: [5],
      relegation: [16, 17, 18]
    }
  }
};

/**
 * Inicializa todas las ligas excepto la del jugador
 * @param {string} playerLeagueId - ID de la liga del jugador
 * @returns {Object} - Objeto con todas las ligas inicializadas
 */
export function initializeOtherLeagues(playerLeagueId) {
  const otherLeagues = {};
  
  Object.entries(LEAGUE_CONFIG).forEach(([leagueId, config]) => {
    // Saltarse la liga del jugador (esa se maneja aparte)
    if (leagueId === playerLeagueId) return;
    
    const teams = config.getTeams();
    if (!teams || teams.length === 0) {
      console.warn(`No teams found for ${leagueId}`);
      otherLeagues[leagueId] = { table: [], fixtures: [] };
      return;
    }
    
    const { table, fixtures } = initializeLeague(teams, null);
    otherLeagues[leagueId] = { table, fixtures };
  });
  
  return otherLeagues;
}

/**
 * Simula los partidos de una semana para todas las otras ligas
 * @param {Object} otherLeagues - Estado actual de otras ligas
 * @param {number} week - Semana a simular
 * @returns {Object} - Otras ligas actualizadas
 */
export function simulateOtherLeaguesWeek(otherLeagues, week) {
  const updatedLeagues = {};
  
  Object.entries(otherLeagues).forEach(([leagueId, leagueData]) => {
    if (!leagueData.fixtures || leagueData.fixtures.length === 0) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    const config = LEAGUE_CONFIG[leagueId];
    if (!config) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    const teams = config.getTeams();
    if (!teams || teams.length === 0) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    let updatedTable = [...leagueData.table];
    const updatedFixtures = leagueData.fixtures.map(fixture => {
      // Solo simular partidos de esta semana que no se han jugado
      if (fixture.week !== week || fixture.played) return fixture;
      
      const homeTeam = teams.find(t => t.id === fixture.homeTeam);
      const awayTeam = teams.find(t => t.id === fixture.awayTeam);
      
      if (!homeTeam || !awayTeam) return fixture;
      
      // Obtener moral de la tabla
      const homeEntry = updatedTable.find(t => t.teamId === fixture.homeTeam);
      const awayEntry = updatedTable.find(t => t.teamId === fixture.awayTeam);
      
      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70
      });
      
      // Actualizar tabla
      updatedTable = updateTable(updatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      
      return {
        ...fixture,
        played: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.events,
        stats: result.stats
      };
    });
    
    updatedLeagues[leagueId] = {
      table: updatedTable,
      fixtures: updatedFixtures
    };
  });
  
  return updatedLeagues;
}

/**
 * Obtiene la clasificación de una liga específica
 * @param {Object} state - Estado del juego
 * @param {string} leagueId - ID de la liga
 * @returns {Array} - Tabla de clasificación
 */
export function getLeagueTable(state, leagueId) {
  if (leagueId === state.playerLeagueId || leagueId === 'laliga') {
    return state.leagueTable || [];
  }
  return state.otherLeagues?.[leagueId]?.table || [];
}

/**
 * Obtiene los fixtures de una liga específica
 * @param {Object} state - Estado del juego
 * @param {string} leagueId - ID de la liga
 * @returns {Array} - Fixtures de la liga
 */
export function getLeagueFixtures(state, leagueId) {
  if (leagueId === state.playerLeagueId || leagueId === 'laliga') {
    return state.fixtures || [];
  }
  return state.otherLeagues?.[leagueId]?.fixtures || [];
}

/**
 * Obtiene la configuración de zonas de una liga
 * @param {string} leagueId - ID de la liga
 * @returns {Object} - Configuración de zonas
 */
export function getLeagueZones(leagueId) {
  return LEAGUE_CONFIG[leagueId]?.zones || LEAGUE_CONFIG.laliga.zones;
}

/**
 * Obtiene el nombre de una liga
 * @param {string} leagueId - ID de la liga
 * @returns {string} - Nombre de la liga
 */
export function getLeagueName(leagueId) {
  return LEAGUE_CONFIG[leagueId]?.name || leagueId;
}

// ============================================================
// SISTEMA DE PROMOCIÓN Y RELEGACIÓN
// ============================================================

// Relaciones entre ligas (qué liga sube/baja a cuál)
const LEAGUE_RELATIONS = {
  laliga: {
    relegatesTo: 'segunda',
    promotedFrom: 'segunda',
    relegationSpots: 3, // Últimos 3 descienden
    promotionSpots: 2   // Primeros 2 de Segunda ascienden directo
  },
  segunda: {
    relegatesTo: null, // No implementamos más divisiones por ahora
    promotedFrom: null,
    promotesTo: 'laliga',
    relegationSpots: 0,
    promotionSpots: 2
  }
  // Otras ligas europeas no tienen segunda división implementada
};

/**
 * Obtiene los equipos que descienden de una liga
 * @param {Array} table - Clasificación final
 * @param {string} leagueId - ID de la liga
 * @returns {Array} - IDs de equipos que descienden
 */
export function getRelegatedTeams(table, leagueId) {
  const config = LEAGUE_CONFIG[leagueId];
  const relations = LEAGUE_RELATIONS[leagueId];
  
  if (!config || !relations || !relations.relegatesTo) {
    return [];
  }
  
  const zones = config.zones;
  if (!zones.relegation) return [];
  
  // Obtener equipos en posiciones de descenso
  return zones.relegation.map(pos => table[pos - 1]?.teamId).filter(Boolean);
}

/**
 * Obtiene los equipos que ascienden de una liga
 * @param {Array} table - Clasificación final
 * @param {string} leagueId - ID de la liga
 * @returns {Array} - IDs de equipos que ascienden
 */
export function getPromotedTeams(table, leagueId) {
  const config = LEAGUE_CONFIG[leagueId];
  const relations = LEAGUE_RELATIONS[leagueId];
  
  if (!config || !relations || !relations.promotesTo) {
    return [];
  }
  
  const zones = config.zones;
  if (!zones.promotion) return [];
  
  // Obtener equipos en posiciones de ascenso directo
  return zones.promotion.map(pos => table[pos - 1]?.teamId).filter(Boolean);
}

/**
 * Procesa los descensos y ascensos entre La Liga y Segunda
 * @param {Array} laligaTable - Clasificación final de La Liga
 * @param {Array} segundaTable - Clasificación final de Segunda
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} - Nuevos equipos para cada liga y nueva liga del jugador
 */
export function processSpanishPromotionRelegation(laligaTable, segundaTable, playerTeamId) {
  // Equipos que descienden de La Liga (posiciones 18, 19, 20)
  const relegatedFromLaLiga = getRelegatedTeams(laligaTable, 'laliga');
  
  // Equipos que ascienden de Segunda (posiciones 1 y 2)
  const promotedFromSegunda = getPromotedTeams(segundaTable, 'segunda');
  
  // Verificar si el jugador asciende o desciende
  let newPlayerLeague = null;
  if (relegatedFromLaLiga.includes(playerTeamId)) {
    newPlayerLeague = 'segunda';
  } else if (promotedFromSegunda.includes(playerTeamId)) {
    newPlayerLeague = 'laliga';
  }
  
  // Obtener todos los equipos de ambas ligas
  const allLaLigaTeams = getLaLigaTeams();
  const allSegundaTeams = getSegundaTeams();
  
  // Crear arrays de IDs de equipos actuales en cada liga
  const currentLaLigaIds = laligaTable.map(t => t.teamId);
  const currentSegundaIds = segundaTable.map(t => t.teamId);
  
  // Calcular nuevos equipos de La Liga:
  // - Quitar los relegados
  // - Añadir los promocionados de Segunda
  const newLaLigaIds = currentLaLigaIds
    .filter(id => !relegatedFromLaLiga.includes(id))
    .concat(promotedFromSegunda);
  
  // Calcular nuevos equipos de Segunda:
  // - Quitar los promocionados
  // - Añadir los relegados de La Liga
  const newSegundaIds = currentSegundaIds
    .filter(id => !promotedFromSegunda.includes(id))
    .concat(relegatedFromLaLiga);
  
  // Buscar los objetos team completos
  const newLaLigaTeams = newLaLigaIds.map(id => 
    allLaLigaTeams.find(t => t.id === id) || 
    allSegundaTeams.find(t => t.id === id)
  ).filter(Boolean);
  
  const newSegundaTeams = newSegundaIds.map(id => 
    allSegundaTeams.find(t => t.id === id) || 
    allLaLigaTeams.find(t => t.id === id)
  ).filter(Boolean);
  
  return {
    newLaLigaTeams,
    newSegundaTeams,
    relegatedFromLaLiga,
    promotedFromSegunda,
    newPlayerLeague,
    changes: {
      relegated: relegatedFromLaLiga.map(id => {
        const team = laligaTable.find(t => t.teamId === id);
        return team?.teamName || id;
      }),
      promoted: promotedFromSegunda.map(id => {
        const team = segundaTable.find(t => t.teamId === id);
        return team?.teamName || id;
      })
    }
  };
}

/**
 * Inicializa una nueva temporada con los cambios de promoción/relegación
 * @param {Object} state - Estado actual del juego
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} - Nuevos datos de liga y otras ligas
 */
export function initializeNewSeasonWithPromotions(state, playerTeamId) {
  const playerLeagueId = state.playerLeagueId || 'laliga';
  
  // Solo procesamos promoción/relegación para ligas españolas
  if (playerLeagueId === 'laliga' || playerLeagueId === 'segunda') {
    // Obtener tablas finales
    const laligaTable = playerLeagueId === 'laliga' 
      ? state.leagueTable 
      : state.otherLeagues?.laliga?.table || [];
    
    const segundaTable = playerLeagueId === 'segunda'
      ? state.leagueTable
      : state.otherLeagues?.segunda?.table || [];
    
    // Si no hay datos de Segunda, no podemos procesar
    if (segundaTable.length === 0) {
      console.warn('No Segunda table data, skipping promotion/relegation');
      return initializeOtherLeagues(playerLeagueId);
    }
    
    // Procesar cambios
    const changes = processSpanishPromotionRelegation(laligaTable, segundaTable, playerTeamId);
    
    // Inicializar nuevas ligas con los equipos actualizados
    const newLaLigaData = initializeLeague(
      changes.newLaLigaTeams, 
      changes.newPlayerLeague === 'laliga' || (playerLeagueId === 'laliga' && !changes.newPlayerLeague) ? playerTeamId : null
    );
    
    const newSegundaData = initializeLeague(
      changes.newSegundaTeams,
      changes.newPlayerLeague === 'segunda' || (playerLeagueId === 'segunda' && !changes.newPlayerLeague) ? playerTeamId : null
    );
    
    // Inicializar otras ligas europeas (sin cambios, solo reiniciar)
    const otherLeagues = {};
    ['premierLeague', 'serieA', 'bundesliga', 'ligue1'].forEach(leagueId => {
      const config = LEAGUE_CONFIG[leagueId];
      const teams = config.getTeams();
      if (teams && teams.length > 0) {
        const { table, fixtures } = initializeLeague(teams, null);
        otherLeagues[leagueId] = { table, fixtures };
      }
    });
    
    // Determinar cuál es la liga del jugador y cuáles son "otras"
    const finalPlayerLeague = changes.newPlayerLeague || playerLeagueId;
    
    if (finalPlayerLeague === 'laliga') {
      otherLeagues.segunda = newSegundaData;
      return {
        playerLeague: {
          table: newLaLigaData.table,
          fixtures: newLaLigaData.fixtures
        },
        otherLeagues,
        newPlayerLeagueId: 'laliga',
        changes: changes.changes
      };
    } else {
      otherLeagues.laliga = newLaLigaData;
      return {
        playerLeague: {
          table: newSegundaData.table,
          fixtures: newSegundaData.fixtures
        },
        otherLeagues,
        newPlayerLeagueId: 'segunda',
        changes: changes.changes
      };
    }
  }
  
  // Para otras ligas europeas, simplemente reiniciamos sin cambios
  const otherLeagues = initializeOtherLeagues(playerLeagueId);
  const config = LEAGUE_CONFIG[playerLeagueId];
  const teams = config?.getTeams() || [];
  const playerLeagueData = initializeLeague(teams, playerTeamId);
  
  return {
    playerLeague: playerLeagueData,
    otherLeagues,
    newPlayerLeagueId: playerLeagueId,
    changes: { relegated: [], promoted: [] }
  };
}
