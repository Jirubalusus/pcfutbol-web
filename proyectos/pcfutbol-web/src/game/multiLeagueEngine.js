// ============================================================
// MULTI-LEAGUE ENGINE - Sistema de múltiples ligas
// Inicializa y simula todas las ligas en paralelo
// ============================================================

import { initializeLeague, simulateMatch, updateTable, sortTable, getWeekFixtures } from './leagueEngine';
import { simulateFullPlayoff, generateAllGroupPlayoffs, simulateAllGroupPlayoffs, getGroupPlayoffWinners } from './playoffEngine';
import { 
  initializeGroupLeague, 
  simulateGroupLeagueWeek, 
  getPromotedFromGroups, 
  getRelegatedFromGroups,
  distributeTeamsInGroups
} from './groupLeagueEngine';
import { 
  getLaLigaTeams, 
  getSegundaTeams, 
  getPrimeraRfefTeams,
  getSegundaRfefTeams,
  getPrimeraRfefGroups,
  getSegundaRfefGroups,
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
  getCzechTeams,
  getArgentinaTeams,
  getBrasileiraoTeams,
  getColombiaTeams,
  getChileTeams,
  getUruguayTeams,
  getEcuadorTeams,
  getParaguayTeams,
  getPeruTeams,
  getBoliviaTeams,
  getVenezuelaTeams
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
      relegation: [19, 20, 21, 22]  // 4 descienden a Primera RFEF
    }
  },
  primeraRFEF: {
    id: 'primeraRFEF',
    name: 'Primera Federación',
    country: 'España',
    isGroupLeague: true,
    numGroups: 2,
    getTeams: getPrimeraRfefTeams,
    getGroups: () => {
      const groups = getPrimeraRfefGroups();
      return {
        grupo1: groups.grupo1?.teams || groups.grupo1 || [],
        grupo2: groups.grupo2?.teams || groups.grupo2 || []
      };
    },
    zones: {
      // Per-group zones: position 1 promotes directly, 2-5 play playoff
      promotionPerGroup: 1,    // Champion of each group ascends directly to Segunda
      playoffPerGroup: [2, 3, 4, 5], // 2º-5º play playoff: winner also ascends
      relegationPerGroup: 5    // Últimos 5 de cada grupo descienden a Segunda RFEF (10 total)
    }
  },
  segundaRFEF: {
    id: 'segundaRFEF',
    name: 'Segunda Federación',
    country: 'España',
    isGroupLeague: true,
    numGroups: 5,
    getTeams: getSegundaRfefTeams,
    getGroups: () => {
      const groups = getSegundaRfefGroups();
      return {
        grupo1: groups.grupo1?.teams || groups.grupo1 || [],
        grupo2: groups.grupo2?.teams || groups.grupo2 || [],
        grupo3: groups.grupo3?.teams || groups.grupo3 || [],
        grupo4: groups.grupo4?.teams || groups.grupo4 || [],
        grupo5: groups.grupo5?.teams || groups.grupo5 || []
      };
    },
    zones: {
      // Per-group zones: position 1 promotes directly, 2-5 play playoff
      promotionPerGroup: 1,   // Champion of each group ascends directly to Primera RFEF
      playoffPerGroup: [2, 3, 4, 5], // 2º-5º play playoff: winner also ascends
      relegationPerGroup: 0   // No relegation implemented (Tercera not in game)
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
      europaLeague: [3, 4],
      conference: [5, 6, 7],
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
      europaLeague: [3, 4],
      conference: [5, 6, 7],
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
      europaLeague: [2, 3, 4],
      conference: [5, 6, 7],
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
      europaLeague: [2, 3, 4],
      conference: [5, 6, 7],
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
      europaLeague: [2, 3],
      conference: [4, 5],
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
      europaLeague: [2, 3],
      conference: [4, 5],
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
      europaLeague: [2, 3],
      conference: [4, 5],
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
      europaLeague: [2, 3],
      conference: [4, 5],
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
      europaLeague: [2, 3],
      conference: [4, 5],
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
      europaLeague: [2],
      conference: [3, 4],
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
      europaLeague: [2, 3],
      conference: [4, 5, 6],
      relegation: [15, 16]
    }
  },

  // ============================================================
  // SOUTH AMERICAN LEAGUES
  // ============================================================
  argentinaPrimera: {
    id: 'argentinaPrimera',
    name: 'Liga Profesional',
    country: 'Argentina',
    teams: 30,
    getTeams: getArgentinaTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2, 3, 4],
      sudamericana: [5, 6],
      relegation: [27, 28, 29, 30]
    }
  },
  brasileiraoA: {
    id: 'brasileiraoA',
    name: 'Série A',
    country: 'Brasil',
    teams: 20,
    getTeams: getBrasileiraoTeams,
    format: 'standard',
    zones: {
      libertadores: [1, 2, 3, 4],
      sudamericana: [5, 6, 7, 8],
      relegation: [17, 18, 19, 20]
    }
  },
  colombiaPrimera: {
    id: 'colombiaPrimera',
    name: 'Liga BetPlay',
    country: 'Colombia',
    teams: 20,
    getTeams: getColombiaTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2, 3],
      sudamericana: [4, 5, 6],
      relegation: [18, 19, 20]
    }
  },
  chilePrimera: {
    id: 'chilePrimera',
    name: 'Primera División',
    country: 'Chile',
    teams: 16,
    getTeams: getChileTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [14, 15, 16]
    }
  },
  uruguayPrimera: {
    id: 'uruguayPrimera',
    name: 'Primera División',
    country: 'Uruguay',
    teams: 16,
    getTeams: getUruguayTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [14, 15, 16]
    }
  },
  ecuadorLigaPro: {
    id: 'ecuadorLigaPro',
    name: 'LigaPro',
    country: 'Ecuador',
    teams: 16,
    getTeams: getEcuadorTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [14, 15, 16]
    }
  },
  paraguayPrimera: {
    id: 'paraguayPrimera',
    name: 'División de Honor',
    country: 'Paraguay',
    teams: 12,
    getTeams: getParaguayTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1],
      sudamericana: [2, 3],
      relegation: [11, 12]
    }
  },
  peruLiga1: {
    id: 'peruLiga1',
    name: 'Liga 1',
    country: 'Perú',
    teams: 18,
    getTeams: getPeruTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [16, 17, 18]
    }
  },
  boliviaPrimera: {
    id: 'boliviaPrimera',
    name: 'División Profesional',
    country: 'Bolivia',
    teams: 16,
    getTeams: getBoliviaTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1],
      sudamericana: [2, 3],
      relegation: [14, 15, 16]
    }
  },
  venezuelaPrimera: {
    id: 'venezuelaPrimera',
    name: 'Liga FUTVE',
    country: 'Venezuela',
    teams: 14,
    getTeams: getVenezuelaTeams,
    format: 'apertura-clausura',
    zones: {
      libertadores: [1, 2],
      sudamericana: [3, 4],
      relegation: [12, 13, 14]
    }
  }
};

// ============================================================
// APERTURA-CLAUSURA HELPERS
// ============================================================

/**
 * Checks if a league uses the Apertura-Clausura format
 */
export function isAperturaClausura(leagueId) {
  return LEAGUE_CONFIG[leagueId]?.format === 'apertura-clausura';
}

/**
 * Returns current phase (apertura/clausura) based on week and team count
 */
export function getAperturaClausuraPhase(week, totalTeams) {
  const halfPoint = totalTeams - 1; // N-1 jornadas por torneo
  return week <= halfPoint ? 'apertura' : 'clausura';
}

/**
 * Returns the week number where Clausura starts
 */
export function getClausuraStartWeek(totalTeams) {
  return totalTeams; // Week N marks start of clausura (after N-1 apertura rounds)
}

/**
 * Merge apertura and clausura tables into an accumulated table
 */
export function computeAccumulatedTable(aperturaTable, clausuraTable) {
  if (!aperturaTable || aperturaTable.length === 0) return clausuraTable || [];
  if (!clausuraTable || clausuraTable.length === 0) return aperturaTable;
  
  const accumulated = aperturaTable.map(aEntry => {
    const cEntry = clausuraTable.find(t => t.teamId === aEntry.teamId);
    if (!cEntry) return { ...aEntry };
    return {
      ...aEntry,
      played: aEntry.played + cEntry.played,
      won: aEntry.won + cEntry.won,
      drawn: aEntry.drawn + cEntry.drawn,
      lost: aEntry.lost + cEntry.lost,
      goalsFor: aEntry.goalsFor + cEntry.goalsFor,
      goalsAgainst: aEntry.goalsAgainst + cEntry.goalsAgainst,
      goalDifference: aEntry.goalDifference + cEntry.goalDifference,
      points: aEntry.points + cEntry.points,
      form: cEntry.form, // Show latest form
      morale: cEntry.morale || aEntry.morale
    };
  });
  
  return sortTable(accumulated);
}

/**
 * Inicializa todas las ligas excepto la del jugador
 * @param {string} playerLeagueId - ID de la liga del jugador
 * @returns {Object} - Objeto con todas las ligas inicializadas
 */
/**
 * @param {string} playerLeagueId - ID de la liga del jugador
 * @param {string} [playerGroupId] - ID del grupo del jugador (solo para ligas de grupos)
 */
export function initializeOtherLeagues(playerLeagueId, playerGroupId = null) {
  const otherLeagues = {};
  
  Object.entries(LEAGUE_CONFIG).forEach(([leagueId, config]) => {
    // Handle group leagues (Primera RFEF, Segunda RFEF)
    if (config.isGroupLeague) {
      try {
        const groupsData = config.getGroups();
        if (!groupsData || Object.keys(groupsData).length === 0) {
          console.warn(`No groups found for ${leagueId}`);
          otherLeagues[leagueId] = { isGroupLeague: true, groups: {} };
          return;
        }
        
        const hasTeams = Object.values(groupsData).some(g => g && g.length > 0);
        if (!hasTeams) {
          console.warn(`No teams in groups for ${leagueId}`);
          otherLeagues[leagueId] = { isGroupLeague: true, groups: {} };
          return;
        }
        
        // If this is the player's league, exclude the player's group
        // (player's group table/fixtures are managed via state.leagueTable/state.fixtures)
        let filteredGroupsData = groupsData;
        if (leagueId === playerLeagueId && playerGroupId) {
          filteredGroupsData = {};
          Object.entries(groupsData).forEach(([gId, teams]) => {
            if (gId !== playerGroupId) {
              filteredGroupsData[gId] = teams;
            }
          });
        }
        
        // Skip entirely if player's league is NOT a group league
        if (leagueId === playerLeagueId && !playerGroupId) return;
        
        const groupLeague = initializeGroupLeague(filteredGroupsData, null);
        otherLeagues[leagueId] = {
          isGroupLeague: true,
          playerGroup: leagueId === playerLeagueId ? playerGroupId : null,
          ...groupLeague
        };
      } catch (e) {
        console.warn(`Error initializing group league ${leagueId}:`, e);
        otherLeagues[leagueId] = { isGroupLeague: true, groups: {} };
      }
      return;
    }
    
    // Skip non-group player league
    if (leagueId === playerLeagueId) return;
    
    const teams = config.getTeams();
    if (!teams || teams.length === 0) {
      console.warn(`No teams found for ${leagueId}`);
      otherLeagues[leagueId] = { table: [], fixtures: [] };
      return;
    }
    
    const { table, fixtures } = initializeLeague(teams, null);
    
    if (isAperturaClausura(leagueId)) {
      // Apertura-Clausura: initialize with accumulated table tracking
      const accumulatedTable = table.map(t => ({ ...t }));
      otherLeagues[leagueId] = { 
        table, fixtures, accumulatedTable, 
        aperturaTable: null, currentTournament: 'apertura' 
      };
    } else {
      otherLeagues[leagueId] = { table, fixtures };
    }
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
    const config = LEAGUE_CONFIG[leagueId];
    
    // Handle group leagues
    if (leagueData.isGroupLeague || config?.isGroupLeague) {
      if (!leagueData.groups || Object.keys(leagueData.groups).length === 0) {
        updatedLeagues[leagueId] = leagueData;
        return;
      }
      
      try {
        const groupsTeams = config?.getGroups?.() || {};
        const updated = simulateGroupLeagueWeek(leagueData, week, groupsTeams);
        updatedLeagues[leagueId] = {
          ...updated,
          isGroupLeague: true
        };
      } catch (e) {
        console.warn(`Error simulating group league ${leagueId} week ${week}:`, e);
        updatedLeagues[leagueId] = leagueData;
      }
      return;
    }
    
    if (!leagueData.fixtures || leagueData.fixtures.length === 0) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    if (!config) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    const teams = config.getTeams();
    if (!teams || teams.length === 0) {
      updatedLeagues[leagueId] = leagueData;
      return;
    }
    
    // ---- Apertura-Clausura: Check if we need to reset table for Clausura ----
    let updatedTable = [...leagueData.table];
    let accumulatedTable = leagueData.accumulatedTable ? leagueData.accumulatedTable.map(t => ({ ...t })) : null;
    let aperturaTable = leagueData.aperturaTable || null;
    let currentTournament = leagueData.currentTournament || 'apertura';
    
    if (isAperturaClausura(leagueId)) {
      const clausuraStart = getClausuraStartWeek(config.teams);
      if (week === clausuraStart && currentTournament === 'apertura') {
        // Save Apertura table and reset for Clausura
        aperturaTable = updatedTable.map(t => ({ ...t }));
        currentTournament = 'clausura';
        // Reset current table (keep team info, zero stats)
        updatedTable = updatedTable.map(entry => ({
          ...entry,
          played: 0, won: 0, drawn: 0, lost: 0,
          goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
          points: 0, form: [], homeForm: [], awayForm: [],
          streak: 0, morale: 70
        }));
      }
    }
    
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
      
      // Actualizar tabla del torneo actual
      updatedTable = updateTable(updatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      
      // Actualizar tabla acumulada (si es apertura-clausura)
      if (accumulatedTable) {
        accumulatedTable = updateTable(accumulatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
      }
      
      return {
        ...fixture,
        played: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.events,
        stats: result.stats
      };
    });
    
    if (isAperturaClausura(leagueId)) {
      updatedLeagues[leagueId] = {
        table: updatedTable,
        fixtures: updatedFixtures,
        accumulatedTable,
        aperturaTable,
        currentTournament
      };
    } else {
      updatedLeagues[leagueId] = {
        table: updatedTable,
        fixtures: updatedFixtures
      };
    }
  });
  
  return updatedLeagues;
}

/**
 * Obtiene la clasificación de una liga específica
 * Para ligas de grupos, devuelve un objeto { grupo1: table, grupo2: table, ... }
 * Para ligas normales, devuelve un array
 * @param {Object} state - Estado del juego
 * @param {string} leagueId - ID de la liga
 * @param {string} [groupId] - ID del grupo (solo para ligas de grupos)
 * @returns {Array|Object} - Tabla de clasificación
 */
export function getLeagueTable(state, leagueId, groupId = null) {
  const config = LEAGUE_CONFIG[leagueId];
  
  // Player's league
  if (leagueId === state.playerLeagueId) {
    if (config?.isGroupLeague && state.leagueGroupData) {
      if (groupId) {
        return state.leagueGroupData.groups?.[groupId]?.table || [];
      }
      // Return all group tables
      const tables = {};
      Object.entries(state.leagueGroupData.groups || {}).forEach(([gId, gData]) => {
        tables[gId] = gData.table || [];
      });
      return tables;
    }
    return state.leagueTable || [];
  }
  
  // Other leagues
  const leagueData = state.otherLeagues?.[leagueId];
  if (!leagueData) return [];
  
  if (leagueData.isGroupLeague || config?.isGroupLeague) {
    if (groupId) {
      return leagueData.groups?.[groupId]?.table || [];
    }
    // Return all group tables
    const tables = {};
    Object.entries(leagueData.groups || {}).forEach(([gId, gData]) => {
      tables[gId] = gData.table || [];
    });
    return tables;
  }
  
  return leagueData.table || [];
}

/**
 * Obtiene los fixtures de una liga específica
 * @param {Object} state - Estado del juego
 * @param {string} leagueId - ID de la liga
 * @param {string} [groupId] - ID del grupo (solo para ligas de grupos)
 * @returns {Array} - Fixtures de la liga
 */
export function getLeagueFixtures(state, leagueId, groupId = null) {
  const config = LEAGUE_CONFIG[leagueId];
  
  if (leagueId === state.playerLeagueId) {
    if (config?.isGroupLeague && state.leagueGroupData) {
      if (groupId) {
        return state.leagueGroupData.groups?.[groupId]?.fixtures || [];
      }
      // Return all fixtures from all groups
      const allFixtures = [];
      Object.entries(state.leagueGroupData.groups || {}).forEach(([gId, gData]) => {
        (gData.fixtures || []).forEach(f => allFixtures.push({ ...f, groupId: gId }));
      });
      return allFixtures;
    }
    return state.fixtures || [];
  }
  
  const leagueData = state.otherLeagues?.[leagueId];
  if (!leagueData) return [];
  
  if (leagueData.isGroupLeague || config?.isGroupLeague) {
    if (groupId) {
      return leagueData.groups?.[groupId]?.fixtures || [];
    }
    const allFixtures = [];
    Object.entries(leagueData.groups || {}).forEach(([gId, gData]) => {
      (gData.fixtures || []).forEach(f => allFixtures.push({ ...f, groupId: gId }));
    });
    return allFixtures;
  }
  
  return leagueData.fixtures || [];
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
    relegatesTo: 'primeraRFEF',
    promotedFrom: 'primeraRFEF',
    promotesTo: 'laliga',
    relegationSpots: 3,  // Últimos 3 descienden a Primera RFEF
    promotionSpots: 2
  },
  primeraRFEF: {
    relegatesTo: 'segundaRFEF',
    promotedFrom: 'segundaRFEF',
    promotesTo: 'segunda',
    isGroupLeague: true,
    promotionPerGroup: 1,   // Campeón de cada grupo asciende a Segunda
    relegationPerGroup: 2   // Últimos 2 de cada grupo descienden a Segunda RFEF
  },
  segundaRFEF: {
    relegatesTo: null,       // No hay Tercera RFEF implementada
    promotedFrom: null,
    promotesTo: 'primeraRFEF',
    isGroupLeague: true,
    promotionPerGroup: 1,   // Campeón de cada grupo asciende a Primera RFEF
    relegationPerGroup: 0
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
 * Procesa ascensos/descensos entre Segunda y Primera RFEF
 * y entre Primera RFEF y Segunda RFEF
 */
/**
 * @param {Object} options.primeraRFEFPlayoffBrackets - Pre-resolved playoff brackets (if player participated)
 * @param {Object} options.segundaRFEFPlayoffBrackets - Pre-resolved playoff brackets (if player participated)
 */
function processRFEFPromotionRelegation(segundaTable, primeraRFEFData, segundaRFEFData, options = {}) {
  const allSegundaTeams = getSegundaTeams();
  const allPrimeraRfefTeams = getPrimeraRfefTeams();
  const allSegundaRfefTeams = getSegundaRfefTeams();
  
  const changes = {
    segundaToRFEF: [],    // Teams relegated from Segunda to Primera RFEF
    rfefToSegunda: [],    // Teams promoted from Primera RFEF to Segunda (direct + playoff)
    rfefToSegundaRFEF: [],// Teams relegated from Primera RFEF to Segunda RFEF
    segundaRFEFToRFEF: [],// Teams promoted from Segunda RFEF to Primera RFEF (direct + playoff)
    primeraRFEFPlayoffBrackets: {},  // Playoff brackets for Primera RFEF
    segundaRFEFPlayoffBrackets: {}   // Playoff brackets for Segunda RFEF
  };
  
  // 1. Segunda → Primera RFEF: Last 4 of Segunda descend (positions 19-22)
  if (segundaTable && segundaTable.length > 0) {
    const zones = LEAGUE_CONFIG.segunda.zones;
    if (zones.relegation) {
      changes.segundaToRFEF = zones.relegation
        .map(pos => segundaTable[pos - 1]?.teamId)
        .filter(Boolean);
    }
  }
  
  // 2. Primera RFEF → Segunda: Champions ascend directly + playoff winners
  if (primeraRFEFData?.groups) {
    // Direct: champion of each group
    const directPromoted = getPromotedFromGroups(primeraRFEFData, 1);
    changes.rfefToSegunda = directPromoted.map(p => p.teamId);
    
    // Playoff: 2º-5º of each group play playoff, winner ascends
    let playoffBrackets = options.primeraRFEFPlayoffBrackets;
    if (!playoffBrackets) {
      // Auto-generate and simulate all playoffs
      const { brackets } = generateAllGroupPlayoffs(primeraRFEFData, allPrimeraRfefTeams, null);
      const simResult = simulateAllGroupPlayoffs(brackets, null);
      playoffBrackets = simResult.brackets;
    }
    changes.primeraRFEFPlayoffBrackets = playoffBrackets;
    
    // Add playoff winners to promoted list
    const playoffWinners = getGroupPlayoffWinners(playoffBrackets);
    changes.rfefToSegunda = [...changes.rfefToSegunda, ...playoffWinners];
  }
  
  // 3. Primera RFEF → Segunda RFEF: Last 5 of each group descend (10 total)
  if (primeraRFEFData?.groups) {
    const relegated = getRelegatedFromGroups(primeraRFEFData, 5);
    changes.rfefToSegundaRFEF = relegated.map(r => r.teamId);
  }
  
  // 4. Segunda RFEF → Primera RFEF: Champions ascend directly + playoff winners
  if (segundaRFEFData?.groups) {
    // Direct: champion of each group
    const directPromoted = getPromotedFromGroups(segundaRFEFData, 1);
    changes.segundaRFEFToRFEF = directPromoted.map(p => p.teamId);
    
    // Playoff: 2º-5º of each group play playoff, winner ascends
    let playoffBrackets = options.segundaRFEFPlayoffBrackets;
    if (!playoffBrackets) {
      const { brackets } = generateAllGroupPlayoffs(segundaRFEFData, allSegundaRfefTeams, null);
      const simResult = simulateAllGroupPlayoffs(brackets, null);
      playoffBrackets = simResult.brackets;
    }
    changes.segundaRFEFPlayoffBrackets = playoffBrackets;
    
    // Add playoff winners to promoted list
    const playoffWinners = getGroupPlayoffWinners(playoffBrackets);
    changes.segundaRFEFToRFEF = [...changes.segundaRFEFToRFEF, ...playoffWinners];
  }
  
  return changes;
}

/**
 * Inicializa una nueva temporada con los cambios de promoción/relegación
 * @param {Object} state - Estado actual del juego
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} - Nuevos datos de liga y otras ligas
 */
/**
 * @param {Object|null} playoffBracket - Segunda División playoff bracket (resolved)
 * @param {Object} rfefPlayoffs - { primeraRFEFPlayoffBrackets, segundaRFEFPlayoffBrackets }
 */
export function initializeNewSeasonWithPromotions(state, playerTeamId, playoffBracket = null, rfefPlayoffs = {}) {
  const playerLeagueId = state.playerLeagueId || 'laliga';
  
  // Solo procesamos promoción/relegación para ligas españolas
  const spanishLeagues = ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'];
  
  if (spanishLeagues.includes(playerLeagueId)) {
    // Obtener tablas finales de todas las ligas españolas
    const laligaTable = playerLeagueId === 'laliga' 
      ? state.leagueTable 
      : state.otherLeagues?.laliga?.table || [];
    
    const segundaTable = playerLeagueId === 'segunda'
      ? state.leagueTable
      : state.otherLeagues?.segunda?.table || [];
    
    const primeraRFEFData = playerLeagueId === 'primeraRFEF'
      ? (state.leagueGroupData || state.otherLeagues?.primeraRFEF)
      : state.otherLeagues?.primeraRFEF;
    
    const segundaRFEFData = playerLeagueId === 'segundaRFEF'
      ? (state.leagueGroupData || state.otherLeagues?.segundaRFEF)
      : state.otherLeagues?.segundaRFEF;
    
    // Process LaLiga ↔ Segunda promotion/relegation (existing logic)
    let laligaSegundaChanges = { changes: { relegated: [], promoted: [], playoffWinner: '' } };
    if (segundaTable.length > 0 && laligaTable.length > 0) {
      laligaSegundaChanges = processSpanishPromotionRelegation(laligaTable, segundaTable, playerTeamId, playoffBracket);
    }
    
    // Process RFEF promotion/relegation (with playoffs)
    const rfefChanges = processRFEFPromotionRelegation(segundaTable, primeraRFEFData, segundaRFEFData, {
      primeraRFEFPlayoffBrackets: rfefPlayoffs.primeraRFEFPlayoffBrackets || null,
      segundaRFEFPlayoffBrackets: rfefPlayoffs.segundaRFEFPlayoffBrackets || null
    });
    
    // === BUILD NEW TEAM LISTS ===
    const allLaLigaTeams = getLaLigaTeams();
    const allSegundaTeams = getSegundaTeams();
    const allPrimeraRfefTeams = getPrimeraRfefTeams();
    const allSegundaRfefTeams = getSegundaRfefTeams();
    const allTeamsPool = [...allLaLigaTeams, ...allSegundaTeams, ...allPrimeraRfefTeams, ...allSegundaRfefTeams];
    
    const findTeam = (id) => allTeamsPool.find(t => t.id === id);
    
    // New La Liga teams
    const newLaLigaTeams = laligaSegundaChanges.newLaLigaTeams || allLaLigaTeams;
    
    // New Segunda teams: remove promoted to LaLiga, remove relegated to Primera RFEF, add from LaLiga, add from Primera RFEF
    let newSegundaIds;
    if (laligaSegundaChanges.newSegundaTeams) {
      // Start with what processSpanishPromotionRelegation gave us (already handles LaLiga↔Segunda)
      newSegundaIds = laligaSegundaChanges.newSegundaTeams.map(t => t.id);
    } else {
      newSegundaIds = segundaTable.map(t => t.teamId);
    }
    // Remove those relegated to Primera RFEF
    newSegundaIds = newSegundaIds.filter(id => !rfefChanges.segundaToRFEF.includes(id));
    // Add those promoted from Primera RFEF
    newSegundaIds = [...newSegundaIds, ...rfefChanges.rfefToSegunda];
    const newSegundaTeams = newSegundaIds.map(findTeam).filter(Boolean);
    
    // New Primera RFEF teams: remove promoted to Segunda, remove relegated to Segunda RFEF, 
    // add relegated from Segunda, add promoted from Segunda RFEF
    let currentPrimeraRFEFIds = allPrimeraRfefTeams.map(t => t.id);
    currentPrimeraRFEFIds = currentPrimeraRFEFIds
      .filter(id => !rfefChanges.rfefToSegunda.includes(id))
      .filter(id => !rfefChanges.rfefToSegundaRFEF.includes(id));
    currentPrimeraRFEFIds = [
      ...currentPrimeraRFEFIds,
      ...rfefChanges.segundaToRFEF,
      ...rfefChanges.segundaRFEFToRFEF
    ];
    const newPrimeraRFEFTeams = currentPrimeraRFEFIds.map(findTeam).filter(Boolean);
    
    // New Segunda RFEF teams: remove promoted to Primera RFEF, add relegated from Primera RFEF
    let currentSegundaRFEFIds = allSegundaRfefTeams.map(t => t.id);
    currentSegundaRFEFIds = currentSegundaRFEFIds
      .filter(id => !rfefChanges.segundaRFEFToRFEF.includes(id));
    currentSegundaRFEFIds = [
      ...currentSegundaRFEFIds,
      ...rfefChanges.rfefToSegundaRFEF
    ];
    const newSegundaRFEFTeams = currentSegundaRFEFIds.map(findTeam).filter(Boolean);
    
    // Determine player's new league
    let newPlayerLeagueId = laligaSegundaChanges.newPlayerLeague || playerLeagueId;
    
    // Check if player was in RFEF leagues and got promoted/relegated
    if (rfefChanges.rfefToSegunda.includes(playerTeamId)) {
      newPlayerLeagueId = 'segunda';
    } else if (rfefChanges.rfefToSegundaRFEF.includes(playerTeamId)) {
      newPlayerLeagueId = 'segundaRFEF';
    } else if (rfefChanges.segundaRFEFToRFEF.includes(playerTeamId)) {
      newPlayerLeagueId = 'primeraRFEF';
    } else if (rfefChanges.segundaToRFEF.includes(playerTeamId)) {
      newPlayerLeagueId = 'primeraRFEF';
    }
    
    // === INITIALIZE ALL LEAGUES ===
    const otherLeagues = {};
    
    // Initialize non-Spanish leagues
    Object.keys(LEAGUE_CONFIG).forEach(leagueId => {
      if (spanishLeagues.includes(leagueId)) return;
      const config = LEAGUE_CONFIG[leagueId];
      if (config.isGroupLeague) {
        try {
          const groupsData = config.getGroups();
          const groupLeague = initializeGroupLeague(groupsData, null);
          otherLeagues[leagueId] = { isGroupLeague: true, ...groupLeague };
        } catch (e) {
          otherLeagues[leagueId] = { isGroupLeague: true, groups: {} };
        }
      } else {
        const teams = config.getTeams();
        if (teams && teams.length > 0) {
          const { table, fixtures } = initializeLeague(teams, null);
          if (isAperturaClausura(leagueId)) {
            otherLeagues[leagueId] = { 
              table, fixtures,
              accumulatedTable: table.map(t => ({ ...t })),
              aperturaTable: null, currentTournament: 'apertura'
            };
          } else {
            otherLeagues[leagueId] = { table, fixtures };
          }
        }
      }
    });
    
    // Initialize Spanish leagues
    const initSpanishLeague = (leagueId, teams, isPlayer) => {
      const config = LEAGUE_CONFIG[leagueId];
      if (config?.isGroupLeague) {
        // Distribute teams into groups
        const numGroups = config.numGroups || 2;
        const groupsData = distributeTeamsInGroups(teams, numGroups);
        return initializeGroupLeague(groupsData, isPlayer ? playerTeamId : null);
      } else {
        return initializeLeague(teams, isPlayer ? playerTeamId : null);
      }
    };
    
    // La Liga
    const newLaLigaData = initializeLeague(newLaLigaTeams, newPlayerLeagueId === 'laliga' ? playerTeamId : null);
    // Segunda
    const newSegundaData = initializeLeague(newSegundaTeams, newPlayerLeagueId === 'segunda' ? playerTeamId : null);
    // Primera RFEF (group league)
    const primeraRFEFGroupsData = distributeTeamsInGroups(newPrimeraRFEFTeams, 2);
    const newPrimeraRFEFData = initializeGroupLeague(primeraRFEFGroupsData, newPlayerLeagueId === 'primeraRFEF' ? playerTeamId : null);
    // Segunda RFEF (group league)
    const segundaRFEFGroupsData = distributeTeamsInGroups(newSegundaRFEFTeams, 5);
    const newSegundaRFEFData = initializeGroupLeague(segundaRFEFGroupsData, newPlayerLeagueId === 'segundaRFEF' ? playerTeamId : null);
    
    // Place each league appropriately (player league vs other leagues)
    const spanishLeagueData = {
      laliga: newLaLigaData,
      segunda: newSegundaData,
      primeraRFEF: { isGroupLeague: true, ...newPrimeraRFEFData },
      segundaRFEF: { isGroupLeague: true, ...newSegundaRFEFData }
    };
    
    // Add non-player Spanish leagues to otherLeagues
    spanishLeagues.forEach(leagueId => {
      if (leagueId !== newPlayerLeagueId) {
        otherLeagues[leagueId] = spanishLeagueData[leagueId];
      }
    });
    
    // Build result based on player league type
    const playerData = spanishLeagueData[newPlayerLeagueId];
    const isGroupPlayerLeague = LEAGUE_CONFIG[newPlayerLeagueId]?.isGroupLeague;
    
    const result = {
      otherLeagues,
      newPlayerLeagueId,
      changes: {
        ...(laligaSegundaChanges.changes || {}),
        rfefPromoted: rfefChanges.rfefToSegunda.map(id => findTeam(id)?.name || id),
        rfefRelegated: rfefChanges.rfefToSegundaRFEF.map(id => findTeam(id)?.name || id),
        segundaToRFEF: rfefChanges.segundaToRFEF.map(id => findTeam(id)?.name || id),
        segundaRFEFPromoted: rfefChanges.segundaRFEFToRFEF.map(id => findTeam(id)?.name || id)
      },
      playoffBracket: laligaSegundaChanges.playoffBracket,
      primeraRFEFPlayoffBrackets: rfefChanges.primeraRFEFPlayoffBrackets,
      segundaRFEFPlayoffBrackets: rfefChanges.segundaRFEFPlayoffBrackets
    };
    
    if (isGroupPlayerLeague) {
      // For group leagues, provide the player's group table/fixtures at the top level
      // so consuming code that accesses playerLeague.table/fixtures still works
      const pg = playerData.playerGroup;
      const pgData = pg ? playerData.groups?.[pg] : null;
      result.playerLeague = {
        isGroupLeague: true,
        groups: playerData.groups,
        playerGroup: pg,
        // Flatten player's group data for compatibility
        table: pgData?.table || [],
        fixtures: pgData?.fixtures || []
      };
    } else {
      result.playerLeague = {
        table: playerData.table,
        fixtures: playerData.fixtures
      };
    }
    
    return result;
  }
  
  // Para otras ligas europeas, simplemente reiniciamos sin cambios
  const otherLeagues = initializeOtherLeagues(playerLeagueId, state.playerGroupId);
  const config = LEAGUE_CONFIG[playerLeagueId];
  
  if (config?.isGroupLeague) {
    const groupsData = config.getGroups();
    const playerLeagueData = initializeGroupLeague(groupsData, playerTeamId);
    const pg = playerLeagueData.playerGroup;
    const pgData = pg ? playerLeagueData.groups?.[pg] : null;
    return {
      playerLeague: {
        isGroupLeague: true,
        ...playerLeagueData,
        table: pgData?.table || [],
        fixtures: pgData?.fixtures || []
      },
      otherLeagues,
      newPlayerLeagueId: playerLeagueId,
      changes: { relegated: [], promoted: [] }
    };
  }
  
  const teams = config?.getTeams() || [];
  const playerLeagueData = initializeLeague(teams, playerTeamId);
  
  return {
    playerLeague: playerLeagueData,
    otherLeagues,
    newPlayerLeagueId: playerLeagueId,
    changes: { relegated: [], promoted: [] }
  };
}
