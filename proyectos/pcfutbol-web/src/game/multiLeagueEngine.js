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
  getVenezuelaTeams,
  getMLSTeams,
  getSaudiTeams,
  getLigaMXTeams,
  getJLeagueTeams,
  getEliteserienTeams,
  getAllsvenskanTeams,
  getEkstraklasaTeams,
  getEersteDivisieTeams,
  getLigaPortugal2Teams,
  getRussiaPremierTeams,
  getUkrainePremierTeams,
  getRomaniaSuperligaTeams,
  getHungaryNBITeams,
  getKLeague1Teams,
  getALeagueMenTeams,
  getSouthAfricaPSLTeams
} from '../data/teamsFirestore';

// Configuración de ligas
export const LEAGUE_CONFIG = {
  laliga: {
    id: 'laliga',
    name: 'Liga Ibérica',
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
    name: 'First League',
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
    name: 'Calcio League',
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
    name: 'Erste Liga',
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
    name: 'Division Première',
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
    name: 'Calcio B',
    country: 'Italia',
    teams: 20,
    getTeams: getSerieBTeams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6, 7, 8],
      relegation: [19, 20]
    }
  },
  bundesliga2: {
    id: 'bundesliga2',
    name: 'Zweite Liga',
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
    name: 'Division Seconde',
    country: 'Francia',
    teams: 18,
    getTeams: getLigue2Teams,
    zones: {
      promotion: [1, 2],
      playoff: [3],
      relegation: [16, 17, 18]
    }
  },
  swissSuperLeague: {
    id: 'swissSuperLeague',
    name: 'Alpine League',
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
    name: 'Erste Liga (AT)',
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
  eliteserien: {
    id: 'eliteserien',
    name: 'Fjord League',
    country: 'Noruega',
    teams: 16,
    getTeams: getEliteserienTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4],
      relegation: [15, 16]
    }
  },
  allsvenskan: {
    id: 'allsvenskan',
    name: 'Scandi League',
    country: 'Suecia',
    teams: 16,
    getTeams: getAllsvenskanTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4],
      relegation: [15, 16]
    }
  },
  ekstraklasa: {
    id: 'ekstraklasa',
    name: 'Vistula League',
    country: 'Polonia',
    teams: 18,
    getTeams: getEkstraklasaTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4, 5],
      relegation: [17, 18]
    }
  },
  eersteDivisie: {
    id: 'eersteDivisie',
    name: 'Dutch Second',
    country: 'Países Bajos',
    teams: 20,
    getTeams: getEersteDivisieTeams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6, 7, 8],
      relegation: [19, 20]
    }
  },
  ligaPortugal2: {
    id: 'ligaPortugal2',
    name: 'Liga Lusitana 2',
    country: 'Portugal',
    teams: 18,
    getTeams: getLigaPortugal2Teams,
    zones: {
      promotion: [1, 2],
      playoff: [3, 4, 5, 6],
      relegation: [17, 18]
    }
  },
  russiaPremier: {
    id: 'russiaPremier',
    name: 'Volga League',
    country: 'Rusia',
    teams: 16,
    getTeams: getRussiaPremierTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4, 5],
      relegation: [15, 16]
    }
  },
  ukrainePremier: {
    id: 'ukrainePremier',
    name: 'Dnipro League',
    country: 'Ucrania',
    teams: 16,
    getTeams: getUkrainePremierTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4, 5],
      relegation: [15, 16]
    }
  },
  romaniaSuperliga: {
    id: 'romaniaSuperliga',
    name: 'Carpathian League',
    country: 'Rumania',
    teams: 16,
    getTeams: getRomaniaSuperligaTeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4, 5],
      relegation: [15, 16]
    }
  },
  hungaryNBI: {
    id: 'hungaryNBI',
    name: 'Danube League',
    country: 'Hungría',
    teams: 12,
    getTeams: getHungaryNBITeams,
    zones: {
      champions: [1],
      europaLeague: [2, 3],
      conference: [4],
      relegation: [11, 12]
    }
  },
  kLeague1: {
    id: 'kLeague1',
    name: 'Hanbando League',
    country: 'Corea del Sur',
    teams: 12,
    getTeams: getKLeague1Teams,
    zones: {
      champions: [1],
      continentalCup: [2, 3],
      relegation: [11, 12]
    }
  },
  aLeagueMen: {
    id: 'aLeagueMen',
    name: 'Southern Cross League',
    country: 'Australia',
    teams: 12,
    getTeams: getALeagueMenTeams,
    zones: {
      champions: [1],
      continentalCup: [2, 3, 4, 5, 6],
      relegation: []
    }
  },
  southAfricaPSL: {
    id: 'southAfricaPSL',
    name: 'Veld League',
    country: 'Sudáfrica',
    teams: 16,
    getTeams: getSouthAfricaPSLTeams,
    zones: {
      champions: [1],
      continentalCup: [2, 3, 4],
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
    format: 'standard',
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
    format: 'standard',
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
  },
  // Rest of World
  mls: {
    id: 'mls',
    name: 'Major League Soccer',
    country: 'USA',
    teams: 20,
    getTeams: getMLSTeams,
    format: 'standard',
    zones: {
      promotion: [],
      relegation: []
    }
  },
  saudiPro: {
    id: 'saudiPro',
    name: 'Saudi Pro League',
    country: 'Arabia Saudí',
    teams: 18,
    getTeams: getSaudiTeams,
    format: 'standard',
    zones: {
      championsLeague: [1, 2, 3],
      relegation: [16, 17, 18]
    }
  },
  ligaMX: {
    id: 'ligaMX',
    name: 'Liga MX',
    country: 'México',
    teams: 18,
    getTeams: getLigaMXTeams,
    format: 'apertura-clausura',
    zones: {
      relegation: [17, 18]
    }
  },
  jLeague: {
    id: 'jLeague',
    name: 'J1 League',
    country: 'Japón',
    teams: 20,
    getTeams: getJLeagueTeams,
    format: 'standard',
    zones: {
      championsLeague: [1, 2, 3],
      relegation: [18, 19, 20]
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
 * Returns the last week of the Clausura (last matchday of the full season)
 */
export function getLastClausuraWeek(totalTeams) {
  return 2 * (totalTeams - 1); // N-1 apertura + N-1 clausura
}

/**
 * Simulate the Apertura vs Clausura final (two-leg tie)
 * Leg 1: Apertura champion (home) vs Clausura champion (away)
 * Leg 2: Clausura champion (home) vs Apertura champion (away) — home advantage
 * Tiebreak: away goals → if still tied, Clausura champion wins (sporting advantage)
 *
 * @param {string} aperturaChampId - Team ID of Apertura champion
 * @param {string} clausuraChampId - Team ID of Clausura champion
 * @param {Array} allTeams - All team objects for this league
 * @returns {Object|null} Final result object
 */
export function simulateAperturaClausuraFinal(aperturaChampId, clausuraChampId, allTeams) {
  const aperturaTeam = allTeams.find(t => t.id === aperturaChampId);
  const clausuraTeam = allTeams.find(t => t.id === clausuraChampId);

  if (!aperturaTeam || !clausuraTeam) return null;

  // Leg 1: Apertura champion at home
  const leg1 = simulateMatch(aperturaChampId, clausuraChampId, aperturaTeam, clausuraTeam, {
    importance: 'final',
    homeMorale: 85,
    awayMorale: 85
  });

  // Leg 2: Clausura champion at home (home advantage in return leg)
  const leg2 = simulateMatch(clausuraChampId, aperturaChampId, clausuraTeam, aperturaTeam, {
    importance: 'final',
    homeMorale: 85,
    awayMorale: 85
  });

  // Aggregate scores
  const aperturaTotal = leg1.homeScore + leg2.awayScore;
  const clausuraTotal = leg1.awayScore + leg2.homeScore;

  // Away goals: each team's goals scored away from home
  const aperturaAwayGoals = leg2.awayScore; // Apertura scored away in leg 2
  const clausuraAwayGoals = leg1.awayScore; // Clausura scored away in leg 1

  let winner;
  let winReason;

  if (aperturaTotal > clausuraTotal) {
    winner = aperturaChampId;
    winReason = 'aggregate';
  } else if (clausuraTotal > aperturaTotal) {
    winner = clausuraChampId;
    winReason = 'aggregate';
  } else {
    // Tied on aggregate — check away goals
    if (aperturaAwayGoals > clausuraAwayGoals) {
      winner = aperturaChampId;
      winReason = 'awayGoals';
    } else if (clausuraAwayGoals > aperturaAwayGoals) {
      winner = clausuraChampId;
      winReason = 'awayGoals';
    } else {
      // Still tied — Clausura champion wins (sporting advantage)
      winner = clausuraChampId;
      winReason = 'clausuraAdvantage';
    }
  }

  return {
    aperturaChampion: aperturaChampId,
    aperturaChampionName: aperturaTeam.name || aperturaTeam.shortName || aperturaChampId,
    clausuraChampion: clausuraChampId,
    clausuraChampionName: clausuraTeam.name || clausuraTeam.shortName || clausuraChampId,
    leg1: { home: aperturaChampId, away: clausuraChampId, homeScore: leg1.homeScore, awayScore: leg1.awayScore },
    leg2: { home: clausuraChampId, away: aperturaChampId, homeScore: leg2.homeScore, awayScore: leg2.awayScore },
    aggregate: { apertura: aperturaTotal, clausura: clausuraTotal },
    awayGoals: { apertura: aperturaAwayGoals, clausura: clausuraAwayGoals },
    winner,
    winnerName: winner === aperturaChampId
      ? (aperturaTeam.name || aperturaChampId)
      : (clausuraTeam.name || clausuraChampId),
    winReason,
    hadFinal: true
  };
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
    
    // Skip leagues with no unplayed fixtures this week (avoid unnecessary processing)
    const hasFixturesThisWeek = leagueData.fixtures.some(f => f.week === week && !f.played);
    if (!hasFixturesThisWeek && !isAperturaClausura(leagueId)) {
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
    
    // Build team lookup map for O(1) access instead of O(n) .find()
    const teamsMap = new Map(teams.map(t => [t.id, t]));
    
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
      
      const homeTeam = teamsMap.get(fixture.homeTeam);
      const awayTeam = teamsMap.get(fixture.awayTeam);
      
      if (!homeTeam || !awayTeam) return fixture;
      
      // Obtener moral de la tabla
      const homeEntry = updatedTable.find(t => t.teamId === fixture.homeTeam);
      const awayEntry = updatedTable.find(t => t.teamId === fixture.awayTeam);
      
      // Add random tactics and momentum for AI variety (same as simulateWeekMatches)
      const aiTactics = ['balanced', 'attacking', 'defensive', 'possession', 'counter'];
      const pickTactic = () => aiTactics[Math.floor(Math.random() * aiTactics.length)];
      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70,
        homeTactic: pickTactic(),
        awayTactic: pickTactic(),
        homeSeasonMomentum: homeEntry?.streak || 0,
        awaySeasonMomentum: awayEntry?.streak || 0
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
      // Check if clausura just ended (last matchday of the season)
      let finalResult = leagueData.finalResult || null;
      let champion = leagueData.champion || null;

      if (currentTournament === 'clausura' && !finalResult) {
        const lastWeek = getLastClausuraWeek(config.teams);
        if (week === lastWeek) {
          // Clausura ended — determine champions and play final if needed
          const sortedApertura = aperturaTable ? sortTable([...aperturaTable]) : [];
          const sortedClausura = sortTable([...updatedTable]);
          const aperturaChampId = sortedApertura[0]?.teamId;
          const clausuraChampId = sortedClausura[0]?.teamId;

          if (aperturaChampId && clausuraChampId) {
            if (aperturaChampId === clausuraChampId) {
              // Same team won both — champion directly
              champion = aperturaChampId;
              finalResult = {
                aperturaChampion: aperturaChampId,
                aperturaChampionName: sortedApertura[0]?.teamName || aperturaChampId,
                clausuraChampion: clausuraChampId,
                clausuraChampionName: sortedClausura[0]?.teamName || clausuraChampId,
                winner: aperturaChampId,
                winnerName: sortedApertura[0]?.teamName || aperturaChampId,
                winReason: 'sameChampion',
                hadFinal: false
              };
            } else {
              // Different champions — simulate two-leg final
              finalResult = simulateAperturaClausuraFinal(aperturaChampId, clausuraChampId, teams);
              champion = finalResult?.winner || null;
            }
          }
        }
      }

      updatedLeagues[leagueId] = {
        table: updatedTable,
        fixtures: updatedFixtures,
        accumulatedTable,
        aperturaTable,
        currentTournament,
        finalResult,
        champion
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
 * Complete all remaining unplayed weeks for leagues that have more matchdays
 * than the player's league. Called at season end to ensure all leagues finish.
 * @param {Object} otherLeagues - Current state of other leagues
 * @param {number} currentWeek - The last week that was simulated
 * @returns {Object} - Updated other leagues with all remaining fixtures played
 */
export function completeRemainingLeagues(otherLeagues, currentWeek) {
  const updatedLeagues = { ...otherLeagues };
  
  Object.entries(updatedLeagues).forEach(([leagueId, leagueData]) => {
    if (!leagueData) return;
    
    // Handle group leagues
    if (leagueData.isGroupLeague) {
      if (!leagueData.groups) return;
      let hasUnplayed = false;
      Object.values(leagueData.groups).forEach(g => {
        if (g.fixtures?.some(f => !f.played)) hasUnplayed = true;
      });
      if (!hasUnplayed) return;
      
      // Simulate remaining weeks for group league
      const config = LEAGUE_CONFIG[leagueId];
      const groupsTeams = config?.getGroups?.() || {};
      let maxWeek = 0;
      Object.values(leagueData.groups).forEach(g => {
        (g.fixtures || []).forEach(f => { if (f.week > maxWeek) maxWeek = f.week; });
      });
      
      let updated = leagueData;
      for (let week = currentWeek + 1; week <= maxWeek; week++) {
        try {
          updated = simulateGroupLeagueWeek(updated, week, groupsTeams);
        } catch (e) {
          console.warn(`Error completing group league ${leagueId} week ${week}:`, e);
        }
      }
      updatedLeagues[leagueId] = { ...updated, isGroupLeague: true };
      return;
    }
    
    // Standard/apertura-clausura leagues
    if (!leagueData.fixtures || leagueData.fixtures.length === 0) return;
    const hasUnplayed = leagueData.fixtures.some(f => !f.played);
    if (!hasUnplayed) return;
    
    const maxWeek = Math.max(...leagueData.fixtures.map(f => f.week));
    if (maxWeek <= currentWeek) return; // Already fully covered
    
    // Simulate remaining weeks
    let tempLeagues = { [leagueId]: leagueData };
    for (let week = currentWeek + 1; week <= maxWeek; week++) {
      tempLeagues = simulateOtherLeaguesWeek(tempLeagues, week);
    }
    updatedLeagues[leagueId] = tempLeagues[leagueId];
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
    relegationSpots: 3, // Últimos 3 descienden (positions 18-20)
    promotionSpots: 2   // Primeros 2 de Segunda ascienden directo
  },
  segunda: {
    relegatesTo: 'primeraRFEF',
    promotedFrom: 'primeraRFEF',
    promotesTo: 'laliga',
    relegationSpots: 4,  // Últimos 4 descienden a Primera RFEF (positions 19-22)
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
  },
  // ============================================================
  // NON-SPANISH LEAGUE PAIRS
  // ============================================================
  premierLeague: {
    relegatesTo: 'championship',
    promotedFrom: 'championship',
    relegationSpots: 3,       // Positions 18,19,20 descend
    directPromotionSpots: 2,  // Top 2 of Championship promote directly
    playoffPositions: [3, 4, 5, 6] // 3rd-6th play playoff, winner promotes
  },
  championship: {
    promotesTo: 'premierLeague',
    relegatesTo: null,        // No third tier implemented
    promotedFrom: null
  },
  serieA: {
    relegatesTo: 'serieB',
    promotedFrom: 'serieB',
    relegationSpots: 3,       // Positions 18,19,20 descend
    directPromotionSpots: 2,  // Top 2 of Serie B promote directly
    playoffPositions: [3, 4, 5, 6, 7, 8] // 3rd-8th play playoff
  },
  serieB: {
    promotesTo: 'serieA',
    relegatesTo: null,
    promotedFrom: null
  },
  bundesliga: {
    relegatesTo: 'bundesliga2',
    promotedFrom: 'bundesliga2',
    directRelegationSpots: 2,   // Positions 17,18 descend directly
    playoffRelegationPos: 16,   // 16th plays playoff vs 3rd of Bundesliga 2
    directPromotionSpots: 2,    // Top 2 of Bundesliga 2 promote directly
    playoffPromotionPos: 3      // 3rd of Bundesliga 2 plays playoff vs 16th of Bundesliga
  },
  bundesliga2: {
    promotesTo: 'bundesliga',
    relegatesTo: null,
    promotedFrom: null
  },
  ligue1: {
    relegatesTo: 'ligue2',
    promotedFrom: 'ligue2',
    directRelegationSpots: 2,   // Positions 17,18 descend directly
    playoffRelegationPos: 16,   // 16th plays playoff vs 3rd of Ligue 2
    directPromotionSpots: 2,    // Top 2 of Ligue 2 promote directly
    playoffPromotionPos: 3      // 3rd of Ligue 2 plays playoff vs 16th of Ligue 1
  },
  ligue2: {
    promotesTo: 'ligue1',
    relegatesTo: null,
    promotedFrom: null
  }
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

// ============================================================
// GENERIC PROMOTION/RELEGATION FOR NON-SPANISH LEAGUE PAIRS
// ============================================================

/**
 * Non-Spanish league pairs definition for promotion/relegation processing.
 * Each entry: { topLeague, bottomLeague, type, ...config }
 *   type 'standard': directDown relegated, directUp promoted, playoffPositions for playoff winner
 *   type 'playoff':  directDown relegated, playoffRelegationPos plays vs playoffPromotionPos, directUp promoted
 */
const LEAGUE_PAIRS = [
  {
    topLeague: 'premierLeague',
    bottomLeague: 'championship',
    type: 'standard',        // 3 down, 2 up + playoff(3-6)
    directDown: 3,           // bottom 3 of top league
    directUp: 2,             // top 2 of bottom league
    playoffPositions: [3, 4, 5, 6]  // 3rd-6th of bottom league play playoff
  },
  {
    topLeague: 'serieA',
    bottomLeague: 'serieB',
    type: 'standard',        // 3 down, 2 up + playoff(3-8)
    directDown: 3,
    directUp: 2,
    playoffPositions: [3, 4, 5, 6, 7, 8]
  },
  {
    topLeague: 'bundesliga',
    bottomLeague: 'bundesliga2',
    type: 'playoff',         // 2 down + 16th playoff, 2 up + 3rd playoff
    directDown: 2,           // bottom 2 of top league descend
    playoffRelegationPos: 16,// 16th of top league plays playoff
    directUp: 2,             // top 2 of bottom league promote
    playoffPromotionPos: 3   // 3rd of bottom league plays playoff
  },
  {
    topLeague: 'ligue1',
    bottomLeague: 'ligue2',
    type: 'playoff',         // 2 down + 16th playoff, 2 up + 3rd playoff
    directDown: 2,
    playoffRelegationPos: 16,
    directUp: 2,
    playoffPromotionPos: 3
  }
];

/**
 * Simulate a single playoff match (two legs) between two teams.
 * Returns the winner's teamId.
 */
function simulatePlayoffTwoLegs(team1Data, team2Data) {
  if (!team1Data || !team2Data) return team1Data?.id || team2Data?.id || null;
  
  const leg1 = simulateMatch(team1Data.id, team2Data.id, team1Data, team2Data, {
    importance: 'playoff', homeMorale: 80, awayMorale: 80
  });
  const leg2 = simulateMatch(team2Data.id, team1Data.id, team2Data, team1Data, {
    importance: 'playoff', homeMorale: 80, awayMorale: 80
  });
  
  const team1Total = leg1.homeScore + leg2.awayScore;
  const team2Total = leg1.awayScore + leg2.homeScore;
  
  if (team1Total > team2Total) return team1Data.id;
  if (team2Total > team1Total) return team2Data.id;
  // Away goals
  const team1Away = leg2.awayScore;
  const team2Away = leg1.awayScore;
  if (team1Away > team2Away) return team1Data.id;
  if (team2Away > team1Away) return team2Data.id;
  // Random tiebreak
  return Math.random() > 0.5 ? team1Data.id : team2Data.id;
}

/**
 * Simulate a mini playoff bracket for promotion (standard type).
 * playoffPositions: array of 1-based positions (e.g. [3,4,5,6])
 * Returns the winner teamId.
 */
function simulatePromotionPlayoffBracket(bottomTable, allTeams, playoffPositions) {
  const entries = playoffPositions.map(pos => bottomTable[pos - 1]).filter(Boolean);
  if (entries.length < 2) return entries[0]?.teamId || null;
  
  const getTeam = (teamId) => allTeams.find(t => t.id === teamId);
  
  if (entries.length === 4) {
    // Standard 4-team bracket: 3v6, 4v5 → final
    const semi1Winner = simulatePlayoffTwoLegs(getTeam(entries[0].teamId), getTeam(entries[3].teamId));
    const semi2Winner = simulatePlayoffTwoLegs(getTeam(entries[1].teamId), getTeam(entries[2].teamId));
    return simulatePlayoffTwoLegs(getTeam(semi1Winner), getTeam(semi2Winner));
  }
  
  if (entries.length === 6) {
    // Serie B style: 3v8, 4v7, 5v6 → then 3 winners play (best seed gets bye or round-robin sim)
    // Simplified: quarter-final round → semi-final → final
    const qf1Winner = simulatePlayoffTwoLegs(getTeam(entries[0].teamId), getTeam(entries[5].teamId)); // 3v8
    const qf2Winner = simulatePlayoffTwoLegs(getTeam(entries[1].teamId), getTeam(entries[4].teamId)); // 4v7
    const qf3Winner = simulatePlayoffTwoLegs(getTeam(entries[2].teamId), getTeam(entries[3].teamId)); // 5v6
    // Semi: qf1 winner vs qf3 winner, qf2 gets bye to final (best remaining seed)
    const semiWinner = simulatePlayoffTwoLegs(getTeam(qf1Winner), getTeam(qf3Winner));
    return simulatePlayoffTwoLegs(getTeam(qf2Winner), getTeam(semiWinner));
  }
  
  // Generic: just do sequential elimination
  let currentWinner = getTeam(entries[0].teamId);
  for (let i = 1; i < entries.length; i++) {
    const winnerId = simulatePlayoffTwoLegs(currentWinner, getTeam(entries[i].teamId));
    currentWinner = getTeam(winnerId);
  }
  return currentWinner?.id || null;
}

/**
 * Process promotion/relegation for a single non-Spanish league pair.
 * Returns { relegated, promoted, playoffWinner, newPlayerLeagueId (or null) }
 */
function processLeaguePairPromotionRelegation(pair, topTable, bottomTable, playerTeamId) {
  const topConfig = LEAGUE_CONFIG[pair.topLeague];
  const bottomConfig = LEAGUE_CONFIG[pair.bottomLeague];
  if (!topConfig || !bottomConfig) return null;
  
  const allTopTeams = topConfig.getTeams();
  const allBottomTeams = bottomConfig.getTeams();
  const allTeams = [...allTopTeams, ...allBottomTeams];
  const findTeam = (id) => allTeams.find(t => t.id === id);
  
  let relegatedIds = [];  // teams going down from top
  let promotedIds = [];   // teams going up from bottom
  let playoffWinnerId = null;
  let playoffRelegationResult = null; // for 'playoff' type
  
  if (pair.type === 'standard') {
    // Direct relegation: bottom N of top league
    const topLen = topTable.length;
    relegatedIds = topTable.slice(topLen - pair.directDown).map(t => t.teamId);
    
    // Direct promotion: top N of bottom league
    promotedIds = bottomTable.slice(0, pair.directUp).map(t => t.teamId);
    
    // Playoff: positions play bracket, winner also promotes
    if (pair.playoffPositions && pair.playoffPositions.length >= 2) {
      playoffWinnerId = simulatePromotionPlayoffBracket(bottomTable, allTeams, pair.playoffPositions);
      if (playoffWinnerId && !promotedIds.includes(playoffWinnerId)) {
        promotedIds.push(playoffWinnerId);
      }
    }
  } else if (pair.type === 'playoff') {
    // Direct relegation: bottom N of top league
    const topLen = topTable.length;
    relegatedIds = topTable.slice(topLen - pair.directDown).map(t => t.teamId);
    
    // Direct promotion: top N of bottom league
    promotedIds = bottomTable.slice(0, pair.directUp).map(t => t.teamId);
    
    // Relegation/Promotion playoff: 16th of top vs 3rd of bottom
    const relegPlayoffTeamId = topTable[pair.playoffRelegationPos - 1]?.teamId;
    const promPlayoffTeamId = bottomTable[pair.playoffPromotionPos - 1]?.teamId;
    
    if (relegPlayoffTeamId && promPlayoffTeamId) {
      const winnerId = simulatePlayoffTwoLegs(findTeam(promPlayoffTeamId), findTeam(relegPlayoffTeamId));
      if (winnerId === promPlayoffTeamId) {
        // Bottom league team won → promotes, top league team relegates
        promotedIds.push(promPlayoffTeamId);
        relegatedIds.push(relegPlayoffTeamId);
      }
      // If top league team won, both stay in their leagues (no swap)
      playoffRelegationResult = { winner: winnerId, topTeam: relegPlayoffTeamId, bottomTeam: promPlayoffTeamId };
    }
  }
  
  // Determine player league change
  let newPlayerLeagueId = null;
  if (relegatedIds.includes(playerTeamId)) {
    newPlayerLeagueId = pair.bottomLeague;
  } else if (promotedIds.includes(playerTeamId)) {
    newPlayerLeagueId = pair.topLeague;
  }
  
  // Build new team lists
  const currentTopIds = topTable.map(t => t.teamId);
  const currentBottomIds = bottomTable.map(t => t.teamId);
  
  const newTopIds = currentTopIds.filter(id => !relegatedIds.includes(id)).concat(promotedIds);
  const newBottomIds = currentBottomIds.filter(id => !promotedIds.includes(id)).concat(relegatedIds);
  
  const newTopTeams = newTopIds.map(findTeam).filter(Boolean);
  const newBottomTeams = newBottomIds.map(findTeam).filter(Boolean);
  
  return {
    topLeague: pair.topLeague,
    bottomLeague: pair.bottomLeague,
    relegatedIds,
    promotedIds,
    playoffWinnerId,
    playoffRelegationResult,
    newPlayerLeagueId,
    newTopTeams,
    newBottomTeams,
    changes: {
      relegated: relegatedIds.map(id => {
        const t = topTable.find(e => e.teamId === id);
        return t?.teamName || findTeam(id)?.name || id;
      }),
      promoted: promotedIds.map(id => {
        const t = bottomTable.find(e => e.teamId === id);
        return t?.teamName || findTeam(id)?.name || id;
      }),
      playoffWinner: playoffWinnerId ? (findTeam(playoffWinnerId)?.name || playoffWinnerId) : null
    }
  };
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
    
    // For RFEF group leagues, reconstruct full group data by merging player's group back in
    const reconstructGroupData = (leagueId) => {
      const otherData = state.otherLeagues?.[leagueId];
      if (playerLeagueId !== leagueId || !state.playerGroupId) return otherData;
      // Player's group data is in state.leagueTable/fixtures, other groups in otherLeagues
      const fullGroups = { ...(otherData?.groups || {}) };
      fullGroups[state.playerGroupId] = {
        table: state.leagueTable || [],
        fixtures: state.fixtures || []
      };
      return { isGroupLeague: true, groups: fullGroups, playerGroup: state.playerGroupId };
    };
    
    const primeraRFEFData = reconstructGroupData('primeraRFEF');
    const segundaRFEFData = reconstructGroupData('segundaRFEF');
    
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
    
    // Include the player's custom team (e.g. glory_team) in the pool so it's not lost
    const playerTeamFromState = state.team;
    if (playerTeamFromState && playerTeamFromState.id && !allTeamsPool.some(t => t.id === playerTeamFromState.id)) {
      allTeamsPool.push(playerTeamFromState);
    }
    
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
    
    // === PROCESS NON-SPANISH LEAGUE PAIR PROMOTIONS ===
    const nonSpanishOverrides = {};
    const nonSpanishPairChanges = [];
    
    const getNonSpanishTable = (leagueId) => {
      const ld = state.otherLeagues?.[leagueId];
      if (!ld) return [];
      if (ld.accumulatedTable && ld.accumulatedTable.length > 0) return ld.accumulatedTable;
      return ld.table || [];
    };
    
    for (const pair of LEAGUE_PAIRS) {
      const topTable = getNonSpanishTable(pair.topLeague);
      const bottomTable = getNonSpanishTable(pair.bottomLeague);
      if (topTable.length === 0 || bottomTable.length === 0) continue;
      
      const pairResult = processLeaguePairPromotionRelegation(pair, topTable, bottomTable, null);
      if (!pairResult) continue;
      
      nonSpanishOverrides[pair.topLeague] = pairResult.newTopTeams;
      nonSpanishOverrides[pair.bottomLeague] = pairResult.newBottomTeams;
      nonSpanishPairChanges.push({
        topLeague: pair.topLeague,
        bottomLeague: pair.bottomLeague,
        ...pairResult.changes
      });
    }
    
    // === INITIALIZE ALL LEAGUES ===
    const otherLeagues = {};
    
    // Initialize non-Spanish leagues (with team swaps from promotion/relegation)
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
        const teams = nonSpanishOverrides[leagueId] || config.getTeams();
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
  
  // ============================================================
  // NON-SPANISH LEAGUES: Process promotion/relegation for all pairs
  // ============================================================
  
  // Helper to get a league's final table from state
  const getLeagueFinalTable = (leagueId) => {
    if (leagueId === playerLeagueId) return state.leagueTable || [];
    const ld = state.otherLeagues?.[leagueId];
    if (!ld) return [];
    // For apertura-clausura leagues, use accumulated table
    if (ld.accumulatedTable && ld.accumulatedTable.length > 0) return ld.accumulatedTable;
    return ld.table || [];
  };
  
  // Process all league pairs and collect results
  const pairResults = [];
  let newPlayerLeagueId = playerLeagueId;
  
  // Map of leagueId → new team list (overrides default getTeams)
  const leagueTeamOverrides = {};
  
  for (const pair of LEAGUE_PAIRS) {
    const topTable = getLeagueFinalTable(pair.topLeague);
    const bottomTable = getLeagueFinalTable(pair.bottomLeague);
    
    if (topTable.length === 0 || bottomTable.length === 0) continue;
    
    const result = processLeaguePairPromotionRelegation(pair, topTable, bottomTable, playerTeamId);
    if (!result) continue;
    
    pairResults.push(result);
    
    if (result.newPlayerLeagueId) {
      newPlayerLeagueId = result.newPlayerLeagueId;
    }
    
    leagueTeamOverrides[pair.topLeague] = result.newTopTeams;
    leagueTeamOverrides[pair.bottomLeague] = result.newBottomTeams;
  }
  
  // Build all changes for display
  const allChanges = { relegated: [], promoted: [], playoffWinner: '', leaguePairChanges: [] };
  for (const pr of pairResults) {
    allChanges.leaguePairChanges.push({
      topLeague: pr.topLeague,
      bottomLeague: pr.bottomLeague,
      ...pr.changes
    });
    // Also add to top-level arrays for backward compatibility with message display
    if (pr.changes.relegated.length > 0) {
      allChanges.relegated.push(...pr.changes.relegated);
    }
    if (pr.changes.promoted.length > 0) {
      allChanges.promoted.push(...pr.changes.promoted);
    }
    if (pr.changes.playoffWinner && !allChanges.playoffWinner) {
      allChanges.playoffWinner = pr.changes.playoffWinner;
    }
  }
  
  // Initialize all leagues with swapped teams
  const otherLeagues = {};
  
  Object.keys(LEAGUE_CONFIG).forEach(leagueId => {
    if (leagueId === newPlayerLeagueId) return; // player's league handled separately
    const config = LEAGUE_CONFIG[leagueId];
    
    if (config.isGroupLeague) {
      try {
        const groupsData = config.getGroups();
        const groupLeague = initializeGroupLeague(groupsData, null);
        otherLeagues[leagueId] = { isGroupLeague: true, ...groupLeague };
      } catch (e) {
        otherLeagues[leagueId] = { isGroupLeague: true, groups: {} };
      }
      return;
    }
    
    // Use overridden teams if promotion/relegation affected this league
    const teams = leagueTeamOverrides[leagueId] || config.getTeams();
    if (!teams || teams.length === 0) {
      otherLeagues[leagueId] = { table: [], fixtures: [] };
      return;
    }
    
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
  });
  
  // Initialize player's league
  const playerConfig = LEAGUE_CONFIG[newPlayerLeagueId];
  
  if (playerConfig?.isGroupLeague) {
    const groupsData = playerConfig.getGroups();
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
      newPlayerLeagueId,
      changes: allChanges
    };
  }
  
  const playerTeams = leagueTeamOverrides[newPlayerLeagueId] || playerConfig?.getTeams() || [];
  const playerLeagueData = initializeLeague(playerTeams, playerTeamId);
  
  if (isAperturaClausura(newPlayerLeagueId)) {
    return {
      playerLeague: {
        ...playerLeagueData,
        accumulatedTable: playerLeagueData.table.map(t => ({ ...t })),
        aperturaTable: null,
        currentTournament: 'apertura'
      },
      otherLeagues,
      newPlayerLeagueId,
      changes: allChanges
    };
  }
  
  return {
    playerLeague: playerLeagueData,
    otherLeagues,
    newPlayerLeagueId,
    changes: allChanges
  };
}
