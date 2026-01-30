// ============================================================
// MULTI-LEAGUE ENGINE - Sistema de múltiples ligas
// Inicializa y simula todas las ligas en paralelo
// ============================================================

import { initializeLeague, simulateMatch, updateTable, getWeekFixtures } from './leagueEngine';
import { simulateFullPlayoff } from './playoffEngine';
import { 
  getLaLigaTeams, 
  getSegundaTeams, 
  getPremierTeams, 
  getSerieATeams, 
  getBundesligaTeams, 
  getLigue1Teams,
  getEredivisieTeams,
  getPrimeiraLigaTeams,
  getChampionshipTeams,
  getBelgianProTeams,
  getSuperLigTeams,
  getScottishPremTeams,
  getSerieBTeams,
  getBundesliga2Teams,
  getLigue2Teams,
  getSwissTeams,
  getAustrianTeams,
  getGreekTeams,
  getDanishTeams,
  getCroatianTeams,
  getCzechTeams
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
  },
  eredivisie: {
    id: 'eredivisie',
    name: 'Eredivisie',
    country: 'Países Bajos',
    teams: 18,
    getTeams: getEredivisieTeams,
    zones: {
      champions: [1, 2],
      europaLeague: [3],
      conference: [4, 5],
      relegation: [16, 17, 18]
    }
  },
  primeiraLiga: {
    id: 'primeiraLiga',
    name: 'Primeira Liga',
    country: 'Portugal',
    teams: 18,
    getTeams: getPrimeiraLigaTeams,
    zones: {
      champions: [1, 2],
      europaLeague: [3],
      conference: [4],
      relegation: [16, 17, 18]
    }
  },
  championship: {
    id: 'championship',
    name: 'Championship',
    country: 'Inglaterra',
    teams: 24,
    getTeams: getChampionshipTeams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6],
      relegation: [22, 23, 24]
    }
  },
  belgianPro: {
    id: 'belgianPro',
    name: 'Jupiler Pro League',
    country: 'Bélgica',
    teams: 16,
    getTeams: getBelgianProTeams,
    zones: {
      champions: [1],
      europaLeague: [2],
      conference: [3],
      relegation: [15, 16]
    }
  },
  superLig: {
    id: 'superLig',
    name: 'Süper Lig',
    country: 'Turquía',
    teams: 19,
    getTeams: getSuperLigTeams,
    zones: {
      champions: [1],
      europaLeague: [2],
      conference: [3],
      relegation: [17, 18, 19]
    }
  },
  scottishPrem: {
    id: 'scottishPrem',
    name: 'Scottish Premiership',
    country: 'Escocia',
    teams: 12,
    getTeams: getScottishPremTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [11, 12]
    }
  },
  serieB: {
    id: 'serieB',
    name: 'Serie B',
    country: 'Italia',
    teams: 20,
    getTeams: getSerieBTeams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6, 7, 8],
      relegation: [18, 19, 20]
    }
  },
  bundesliga2: {
    id: 'bundesliga2',
    name: '2. Bundesliga',
    country: 'Alemania',
    teams: 18,
    getTeams: getBundesliga2Teams,
    zones: {
      promotion: [1, 2],
      playoff: [3],
      relegation: [16, 17, 18]
    }
  },
  ligue2: {
    id: 'ligue2',
    name: 'Ligue 2',
    country: 'Francia',
    teams: 18,
    getTeams: getLigue2Teams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5],
      relegation: [16, 17, 18]
    }
  },
  swissSuperLeague: {
    id: 'swissSuperLeague',
    name: 'Super League',
    country: 'Suiza',
    teams: 12,
    getTeams: getSwissTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [11, 12]
    }
  },
  austrianBundesliga: {
    id: 'austrianBundesliga',
    name: 'Bundesliga (AT)',
    country: 'Austria',
    teams: 12,
    getTeams: getAustrianTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [11, 12]
    }
  },
  greekSuperLeague: {
    id: 'greekSuperLeague',
    name: 'Super League',
    country: 'Grecia',
    teams: 14,
    getTeams: getGreekTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [13, 14]
    }
  },
  danishSuperliga: {
    id: 'danishSuperliga',
    name: 'Superligaen',
    country: 'Dinamarca',
    teams: 12,
    getTeams: getDanishTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [11, 12]
    }
  },
  croatianLeague: {
    id: 'croatianLeague',
    name: 'HNL',
    country: 'Croacia',
    teams: 10,
    getTeams: getCroatianTeams,
    zones: {
      champions: [1],
      relegation: [9, 10]
    }
  },
  czechLeague: {
    id: 'czechLeague',
    name: 'Chance Liga',
    country: 'Chequia',
    teams: 16,
    getTeams: getCzechTeams,
    zones: {
      champions: [1],
      conference: [2],
      relegation: [15, 16]
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
/**
 * Procesa los descensos y ascensos entre La Liga y Segunda
 * 3 descienden de La Liga, 3 ascienden de Segunda (2 directos + 1 playoff)
 * @param {Object} options
 * @param {Array} options.laligaTable - Clasificación final de La Liga
 * @param {Array} options.segundaTable - Clasificación final de Segunda
 * @param {string} options.playerTeamId - ID del equipo del jugador
 * @param {Object|null} options.playoffBracket - Bracket de playoff ya resuelto (si el jugador jugó el playoff)
 * @returns {Object} - Nuevos equipos para cada liga y nueva liga del jugador
 */
export function processSpanishPromotionRelegation(laligaTable, segundaTable, playerTeamId, playoffBracket = null) {
  // Equipos que descienden de La Liga (posiciones 18, 19, 20)
  const relegatedFromLaLiga = getRelegatedTeams(laligaTable, 'laliga');
  
  // Equipos que ascienden DIRECTO de Segunda (posiciones 1 y 2)
  const autoPromoted = getPromotedTeams(segundaTable, 'segunda');
  
  // === PLAYOFF DE ASCENSO ===
  // Si no se pasó un bracket resuelto, simular el playoff ahora
  const allSegundaTeams = getSegundaTeams();
  const allLaLigaTeams = getLaLigaTeams();
  const allTeams = [...allLaLigaTeams, ...allSegundaTeams];
  
  let resolvedBracket = playoffBracket;
  if (!resolvedBracket || resolvedBracket.phase !== 'completed') {
    resolvedBracket = simulateFullPlayoff(segundaTable, allTeams);
  }
  
  // El ganador del playoff asciende también
  const playoffWinnerId = resolvedBracket?.winner || null;
  
  // Total de ascensos: 2 directos + 1 playoff
  const promotedFromSegunda = [...autoPromoted];
  if (playoffWinnerId && !promotedFromSegunda.includes(playoffWinnerId)) {
    promotedFromSegunda.push(playoffWinnerId);
  }
  
  // Verificar si el jugador asciende o desciende
  let newPlayerLeague = null;
  if (relegatedFromLaLiga.includes(playerTeamId)) {
    newPlayerLeague = 'segunda';
  } else if (promotedFromSegunda.includes(playerTeamId)) {
    newPlayerLeague = 'laliga';
  }
  
  // Crear arrays de IDs de equipos actuales en cada liga
  const currentLaLigaIds = laligaTable.map(t => t.teamId);
  const currentSegundaIds = segundaTable.map(t => t.teamId);
  
  // Calcular nuevos equipos de La Liga:
  // - Quitar los relegados (3)
  // - Añadir los promocionados de Segunda (3: 2 directos + 1 playoff)
  const newLaLigaIds = currentLaLigaIds
    .filter(id => !relegatedFromLaLiga.includes(id))
    .concat(promotedFromSegunda);
  
  // Calcular nuevos equipos de Segunda:
  // - Quitar los promocionados (3)
  // - Añadir los relegados de La Liga (3)
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
  
  // Nombres para mensajes
  const playoffWinnerName = resolvedBracket?.final?.result?.winnerName || playoffWinnerId || '';
  
  return {
    newLaLigaTeams,
    newSegundaTeams,
    relegatedFromLaLiga,
    promotedFromSegunda,
    playoffBracket: resolvedBracket,
    playoffWinnerId,
    newPlayerLeague,
    changes: {
      relegated: relegatedFromLaLiga.map(id => {
        const team = laligaTable.find(t => t.teamId === id);
        return team?.teamName || id;
      }),
      promoted: autoPromoted.map(id => {
        const team = segundaTable.find(t => t.teamId === id);
        return team?.teamName || id;
      }),
      playoffWinner: playoffWinnerName
    }
  };
}

/**
 * Inicializa una nueva temporada con los cambios de promoción/relegación
 * @param {Object} state - Estado actual del juego
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} - Nuevos datos de liga y otras ligas
 */
export function initializeNewSeasonWithPromotions(state, playerTeamId, playoffBracket = null) {
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
    
    // Procesar cambios (incluye playoff de ascenso de Segunda)
    const changes = processSpanishPromotionRelegation(laligaTable, segundaTable, playerTeamId, playoffBracket);
    
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
    Object.keys(LEAGUE_CONFIG).forEach(leagueId => {
      // Saltar las ligas españolas que ya se manejan arriba
      if (leagueId === 'laliga' || leagueId === 'segunda') return;
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
