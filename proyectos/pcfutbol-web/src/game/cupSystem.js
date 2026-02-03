// ============================================================
// CUP SYSTEM — Sistema de copas nacionales
// Cada país con ligas en el juego tiene una copa doméstica.
// Formato: eliminación directa a partido único.
// ============================================================

import { LEAGUE_CONFIG } from './multiLeagueEngine';
import { simulateMatch } from './leagueEngine';

// ============================================================
// CONFIGURACIÓN DE COPAS
// ============================================================

export const CUP_CONFIGS = {
  'España': { id: 'copaDelRey', name: 'Copa del Rey', icon: '👑', shortName: 'Copa' },
  'Inglaterra': { id: 'faCup', name: 'FA Cup', icon: '🏆', shortName: 'FA Cup' },
  'Italia': { id: 'coppaItalia', name: 'Coppa Italia', icon: '🏆', shortName: 'Coppa' },
  'Alemania': { id: 'dfbPokal', name: 'DFB-Pokal', icon: '🏆', shortName: 'Pokal' },
  'Francia': { id: 'coupeDeFrance', name: 'Coupe de France', icon: '🏆', shortName: 'Coupe' },
  'Países Bajos': { id: 'knvbBeker', name: 'KNVB Beker', icon: '🏆', shortName: 'Beker' },
  'Portugal': { id: 'tacaPortugal', name: 'Taça de Portugal', icon: '🏆', shortName: 'Taça' },
  'Bélgica': { id: 'bekerBelgie', name: 'Beker van België', icon: '🏆', shortName: 'Beker' },
  'Turquía': { id: 'turkishCup', name: 'Türkiye Kupası', icon: '🏆', shortName: 'Kupa' },
  'Escocia': { id: 'scottishCup', name: 'Scottish Cup', icon: '🏆', shortName: 'Scottish Cup' },
  'Suiza': { id: 'swissCup', name: 'Schweizer Cup', icon: '🏆', shortName: 'Cup' },
  'Austria': { id: 'oefbCup', name: 'ÖFB Cup', icon: '🏆', shortName: 'ÖFB Cup' },
  'Grecia': { id: 'greekCup', name: 'Κύπελλο Ελλάδας', icon: '🏆', shortName: 'Cup' },
  'Dinamarca': { id: 'danishCup', name: 'DBU Pokalen', icon: '🏆', shortName: 'Pokalen' },
  'Croacia': { id: 'croatianCup', name: 'Hrvatski kup', icon: '🏆', shortName: 'Kup' },
  'Chequia': { id: 'czechCup', name: 'MOL Cup', icon: '🏆', shortName: 'MOL Cup' },
  // South America
  'Argentina': { id: 'copaArgentina', name: 'Copa Argentina', icon: '🏆', shortName: 'Copa' },
  'Brasil': { id: 'copaDoBrasil', name: 'Copa do Brasil', icon: '🏆', shortName: 'Copa' },
  'Colombia': { id: 'copaColombia', name: 'Copa Colombia', icon: '🏆', shortName: 'Copa' },
  'Chile': { id: 'copaChile', name: 'Copa Chile', icon: '🏆', shortName: 'Copa' },
  'Uruguay': { id: 'copaUruguay', name: 'Copa Uruguay', icon: '🏆', shortName: 'Copa' },
  'Ecuador': { id: 'copaEcuador', name: 'Copa Ecuador', icon: '🏆', shortName: 'Copa' },
  'Paraguay': { id: 'copaParaguay', name: 'Copa Paraguay', icon: '🏆', shortName: 'Copa' },
  'Perú': { id: 'copaPeru', name: 'Copa Perú', icon: '🏆', shortName: 'Copa' },
  'Bolivia': { id: 'copaBolivia', name: 'Copa Bolivia', icon: '🏆', shortName: 'Copa' },
  'Venezuela': { id: 'copaVenezuela', name: 'Copa Venezuela', icon: '🏆', shortName: 'Copa' }
};

// Ligas de grupos que NO cuentan para la copa (divisiones bajas de España)
const GROUP_LEAGUE_IDS = ['primeraRFEF', 'segundaRFEF'];

// Orden de tier de las ligas principales por país (primera div primero)
const LEAGUE_TIER_ORDER = {};
Object.entries(LEAGUE_CONFIG).forEach(([id, cfg]) => {
  if (!cfg.country) return;
  if (!LEAGUE_TIER_ORDER[cfg.country]) LEAGUE_TIER_ORDER[cfg.country] = [];
  LEAGUE_TIER_ORDER[cfg.country].push({
    id,
    isGroupLeague: !!cfg.isGroupLeague,
    teams: cfg.teams || 0
  });
});
// Ordenar: no-grupo primero, luego por número de equipos descendente (primera div tiene más prioridad)
Object.values(LEAGUE_TIER_ORDER).forEach(leagues => {
  leagues.sort((a, b) => {
    if (a.isGroupLeague !== b.isGroupLeague) return a.isGroupLeague ? 1 : -1;
    return 0; // Mantener orden original para ligas del mismo tipo
  });
});

/**
 * Obtiene los equipos que participan en la copa de un país.
 * Para países con 2+ ligas: combina las 2 primeras divisiones no-grupo.
 * Para países con 1 liga: usa esos equipos.
 * Siempre incluye al equipo del jugador.
 *
 * @param {string} playerLeagueId - ID de la liga del jugador
 * @param {Object} playerTeam - Datos del equipo del jugador
 * @param {Object} otherLeagues - Estado de otras ligas
 * @param {Array} leagueTable - Tabla de la liga del jugador
 * @returns {{ teams: Array, cupConfig: Object, country: string } | null}
 */
export function getCupTeams(playerLeagueId, playerTeam, otherLeagues, leagueTable) {
  const playerLeagueConfig = LEAGUE_CONFIG[playerLeagueId];
  if (!playerLeagueConfig || !playerLeagueConfig.country) return null;

  const country = playerLeagueConfig.country;
  const cupConfig = CUP_CONFIGS[country];
  if (!cupConfig) return null;

  // Encontrar ligas de este país (excluir ligas de grupos)
  const countryLeagues = Object.entries(LEAGUE_CONFIG)
    .filter(([id, cfg]) => cfg.country === country && !GROUP_LEAGUE_IDS.includes(id))
    .sort((a, b) => {
      // Primera división primero (la que tiene zones.champions)
      const aIsFirst = !!a[1].zones?.champions;
      const bIsFirst = !!b[1].zones?.champions;
      if (aIsFirst !== bIsFirst) return aIsFirst ? -1 : 1;
      return 0;
    });

  // Tomar máximo las 2 primeras ligas no-grupo
  const leaguesToUse = countryLeagues.slice(0, 2);

  const teams = [];
  const addedTeamIds = new Set();

  for (const [leagueId, config] of leaguesToUse) {
    let leagueTeams = [];

    if (leagueId === playerLeagueId) {
      // Liga del jugador: obtener equipos de la tabla + datos completos
      const table = leagueTable || [];
      const allLeagueTeams = config.getTeams ? config.getTeams() : [];
      
      for (const entry of table) {
        if (addedTeamIds.has(entry.teamId)) continue;
        const fullTeam = allLeagueTeams.find(t => t.id === entry.teamId);
        if (fullTeam) {
          teams.push({
            teamId: fullTeam.id,
            teamName: fullTeam.name,
            shortName: fullTeam.shortName || fullTeam.name?.substring(0, 3).toUpperCase(),
            reputation: fullTeam.reputation || 70,
            players: fullTeam.players || [],
            leagueId,
            leaguePosition: table.indexOf(entry) + 1,
            isFirstDivision: !!config.zones?.champions
          });
          addedTeamIds.add(entry.teamId);
        }
      }
    } else {
      // Otra liga: obtener de otherLeagues o directamente
      const leagueData = otherLeagues?.[leagueId];
      const allLeagueTeams = config.getTeams ? config.getTeams() : [];

      if (leagueData?.table?.length > 0) {
        for (const entry of leagueData.table) {
          if (addedTeamIds.has(entry.teamId)) continue;
          const fullTeam = allLeagueTeams.find(t => t.id === entry.teamId);
          if (fullTeam) {
            teams.push({
              teamId: fullTeam.id,
              teamName: fullTeam.name,
              shortName: fullTeam.shortName || fullTeam.name?.substring(0, 3).toUpperCase(),
              reputation: fullTeam.reputation || 70,
              players: fullTeam.players || [],
              leagueId,
              leaguePosition: leagueData.table.indexOf(entry) + 1,
              isFirstDivision: !!config.zones?.champions
            });
            addedTeamIds.add(entry.teamId);
          }
        }
      } else {
        // Sin tabla disponible: usar equipos directamente
        for (const t of allLeagueTeams) {
          if (addedTeamIds.has(t.id)) continue;
          teams.push({
            teamId: t.id,
            teamName: t.name,
            shortName: t.shortName || t.name?.substring(0, 3).toUpperCase(),
            reputation: t.reputation || 70,
            players: t.players || [],
            leagueId,
            leaguePosition: allLeagueTeams.indexOf(t) + 1,
            isFirstDivision: !!config.zones?.champions
          });
          addedTeamIds.add(t.id);
        }
      }
    }
  }

  // Asegurar que el equipo del jugador está incluido
  if (playerTeam && !addedTeamIds.has(playerTeam.id)) {
    teams.push({
      teamId: playerTeam.id,
      teamName: playerTeam.name,
      shortName: playerTeam.shortName || playerTeam.name?.substring(0, 3).toUpperCase(),
      reputation: playerTeam.reputation || 70,
      players: playerTeam.players || [],
      leagueId: playerLeagueId,
      leaguePosition: 99,
      isFirstDivision: false
    });
  }

  return { teams, cupConfig, country };
}

/**
 * Genera el bracket de copa con seeding.
 * Los equipos de primera división con mejor reputación reciben byes.
 * En rondas tempranas, equipos de primera no se enfrentan entre sí.
 *
 * @param {Array} teams - Equipos participantes (de getCupTeams)
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} Bracket completo
 */
export function generateCupBracket(teams, playerTeamId) {
  if (!teams || teams.length < 2) return null;

  const N = teams.length;
  const totalRounds = Math.ceil(Math.log2(N));
  const bracketSize = Math.pow(2, totalRounds);
  const byes = bracketSize - N;

  // Ordenar equipos: primera div primero, luego por reputación/posición
  const sorted = [...teams].sort((a, b) => {
    // Primera división > segunda
    if (a.isFirstDivision !== b.isFirstDivision) return a.isFirstDivision ? -1 : 1;
    // Mayor reputación primero
    if (b.reputation !== a.reputation) return b.reputation - a.reputation;
    // Mejor posición primero
    return a.leaguePosition - b.leaguePosition;
  });

  // Los equipos con bye son los N mejores rankeados (cabezas de serie)
  const byeTeams = sorted.slice(0, byes);
  const playingTeams = sorted.slice(byes);

  // Separar equipos de primera y segunda división entre los que juegan ronda 1
  const firstDivPlaying = playingTeams.filter(t => t.isFirstDivision);
  const secondDivPlaying = playingTeams.filter(t => !t.isFirstDivision);

  // Generar emparejamientos de ronda 1 intentando que primera no juegue contra primera
  const firstRoundMatches = [];
  const firstRoundSize = bracketSize / 2;
  
  // Mezclar aleatoriamente dentro de cada grupo
  const shuffle = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledFirst = shuffle(firstDivPlaying);
  const shuffledSecond = shuffle(secondDivPlaying);

  // Emparejar: primera div vs segunda div donde sea posible
  const paired = [];
  const usedFirst = new Set();
  const usedSecond = new Set();

  // Primero emparejar primera vs segunda
  for (let i = 0; i < shuffledFirst.length && i < shuffledSecond.length; i++) {
    paired.push({
      home: shuffledSecond[i], // Segunda en casa (ventaja para el "débil")
      away: shuffledFirst[i]
    });
    usedFirst.add(i);
    usedSecond.add(i);
  }

  // Emparejar los restantes entre sí
  const remainingFirst = shuffledFirst.filter((_, i) => !usedFirst.has(i));
  const remainingSecond = shuffledSecond.filter((_, i) => !usedSecond.has(i));
  const remaining = shuffle([...remainingFirst, ...remainingSecond]);

  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      paired.push({ home: remaining[i], away: remaining[i + 1] });
    }
  }

  // Construir rondas
  const rounds = [];

  // Ronda 1: partidos reales + byes
  const round1Matches = [];
  let matchIdx = 0;
  let pairIdx = 0;
  let byeIdx = 0;

  // Distribuir byes y partidos en el bracket
  // Los byes van en las primeras posiciones (equipos cabezas de serie)
  const shuffledByes = shuffle(byeTeams);

  for (let i = 0; i < firstRoundSize; i++) {
    if (byeIdx < shuffledByes.length) {
      // Bye: el equipo pasa directamente
      round1Matches.push({
        id: `cup_r0_m${i}`,
        homeTeam: shuffledByes[byeIdx],
        awayTeam: null,
        homeScore: null,
        awayScore: null,
        played: true,
        bye: true,
        winnerId: shuffledByes[byeIdx].teamId
      });
      byeIdx++;
    } else if (pairIdx < paired.length) {
      round1Matches.push({
        id: `cup_r0_m${i}`,
        homeTeam: paired[pairIdx].home,
        awayTeam: paired[pairIdx].away,
        homeScore: null,
        awayScore: null,
        played: false,
        bye: false,
        winnerId: null
      });
      pairIdx++;
    }
  }

  rounds.push({
    name: getCupRoundName(0, totalRounds),
    matches: round1Matches
  });

  // Rondas posteriores: vacías hasta que se resuelvan las anteriores
  for (let r = 1; r < totalRounds; r++) {
    const matchCount = Math.pow(2, totalRounds - r - 1);
    const roundMatches = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: `cup_r${r}_m${m}`,
        homeTeam: null,
        awayTeam: null,
        homeScore: null,
        awayScore: null,
        played: false,
        bye: false,
        winnerId: null
      });
    }
    rounds.push({
      name: getCupRoundName(r, totalRounds),
      matches: roundMatches
    });
  }

  // Encontrar la copa del país
  const playerTeam = teams.find(t => t.teamId === playerTeamId);
  const country = playerTeam?.leagueId ? LEAGUE_CONFIG[playerTeam.leagueId]?.country : null;
  const cupCfg = country ? CUP_CONFIGS[country] : { name: 'Copa', icon: '🏆', shortName: 'Copa' };

  return {
    config: { ...cupCfg, country },
    rounds,
    currentRound: 0,
    playerTeamId,
    playerEliminated: false,
    winner: null
  };
}

/**
 * Simula todos los partidos de una ronda EXCEPTO el del jugador.
 * Si el jugador ya fue eliminado, simula todos.
 *
 * @param {Object} bracket - Estado actual del bracket
 * @param {number} roundIdx - Índice de la ronda a simular
 * @param {string} playerTeamId - ID del equipo del jugador
 * @param {Object} allTeamsData - Map de teamId → datos del equipo (para simulateMatch)
 * @returns {{ updatedBracket: Object, playerMatch: Object|null }}
 */
export function simulateCupRound(bracket, roundIdx, playerTeamId, allTeamsData) {
  if (!bracket || !bracket.rounds[roundIdx]) {
    return { updatedBracket: bracket, playerMatch: null };
  }

  const round = { ...bracket.rounds[roundIdx] };
  const updatedMatches = [...round.matches];
  let playerMatch = null;

  for (let i = 0; i < updatedMatches.length; i++) {
    const match = updatedMatches[i];
    
    // Skip ya jugados y byes
    if (match.played || match.bye) continue;
    
    // Skip si no hay equipos (ronda aún no poblada)
    if (!match.homeTeam || !match.awayTeam) continue;

    // ¿Es el partido del jugador?
    const isPlayerMatch = (
      match.homeTeam.teamId === playerTeamId ||
      match.awayTeam.teamId === playerTeamId
    );

    if (isPlayerMatch && !bracket.playerEliminated) {
      // No simular — devolver como pendiente
      playerMatch = { ...match, roundIdx, matchIdx: i };
      continue;
    }

    // Simular el partido
    const homeData = resolveTeamData(match.homeTeam, allTeamsData);
    const awayData = resolveTeamData(match.awayTeam, allTeamsData);

    const result = simulateMatch(
      match.homeTeam.teamId,
      match.awayTeam.teamId,
      homeData,
      awayData,
      { homeMorale: 70, awayMorale: 70 }
    );

    // En copa no hay empates: si empatan, se resuelve con prórroga/penaltis
    let homeScore = result.homeScore;
    let awayScore = result.awayScore;
    let winnerId;

    if (homeScore === awayScore) {
      // Simular "penaltis" — 50/50 con ligera ventaja para el mejor equipo
      const homeRep = match.homeTeam.reputation || 70;
      const awayRep = match.awayTeam.reputation || 70;
      const homeChance = 0.5 + (homeRep - awayRep) / 200;
      winnerId = Math.random() < homeChance ? match.homeTeam.teamId : match.awayTeam.teamId;
      // Marcar como penaltis en el resultado
      if (winnerId === match.homeTeam.teamId) {
        homeScore = homeScore + 0; // Mantener marcador original
      }
    } else {
      winnerId = homeScore > awayScore ? match.homeTeam.teamId : match.awayTeam.teamId;
    }

    updatedMatches[i] = {
      ...match,
      homeScore,
      awayScore,
      played: true,
      winnerId,
      penalties: homeScore === awayScore
    };
  }

  const updatedRound = { ...round, matches: updatedMatches };
  const updatedRounds = [...bracket.rounds];
  updatedRounds[roundIdx] = updatedRound;

  // Avanzar bracket: poblar siguiente ronda con ganadores
  const updatedBracket = advanceCupBracket({ ...bracket, rounds: updatedRounds }, roundIdx);

  return { updatedBracket, playerMatch };
}

/**
 * Completa el partido del jugador en la copa y actualiza el bracket.
 *
 * @param {Object} bracket - Estado actual del bracket
 * @param {number} roundIdx - Índice de la ronda
 * @param {number} matchIdx - Índice del partido en la ronda
 * @param {number} homeScore - Goles del local
 * @param {number} awayScore - Goles del visitante
 * @param {string} playerTeamId - ID del equipo del jugador
 * @returns {Object} Bracket actualizado
 */
export function completeCupMatch(bracket, roundIdx, matchIdx, homeScore, awayScore, playerTeamId) {
  if (!bracket || !bracket.rounds[roundIdx]) return bracket;

  const match = bracket.rounds[roundIdx].matches[matchIdx];
  if (!match) return bracket;

  let winnerId;
  let penalties = false;

  if (homeScore === awayScore) {
    // Penaltis: el jugador tiene 55% de probabilidad de ganar
    const playerIsHome = match.homeTeam.teamId === playerTeamId;
    winnerId = Math.random() < 0.55 ? playerTeamId :
      (playerIsHome ? match.awayTeam.teamId : match.homeTeam.teamId);
    penalties = true;
  } else {
    winnerId = homeScore > awayScore ? match.homeTeam.teamId : match.awayTeam.teamId;
  }

  const updatedMatch = {
    ...match,
    homeScore,
    awayScore,
    played: true,
    winnerId,
    penalties
  };

  const updatedRounds = [...bracket.rounds];
  const updatedRound = { ...updatedRounds[roundIdx] };
  const updatedMatches = [...updatedRound.matches];
  updatedMatches[matchIdx] = updatedMatch;
  updatedRound.matches = updatedMatches;
  updatedRounds[roundIdx] = updatedRound;

  let updatedBracket = { ...bracket, rounds: updatedRounds };

  // Comprobar si el jugador fue eliminado
  if (winnerId !== playerTeamId) {
    updatedBracket.playerEliminated = true;
  }

  // Avanzar bracket
  updatedBracket = advanceCupBracket(updatedBracket, roundIdx);

  // Comprobar si la copa ha terminado
  const lastRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
  if (lastRound.matches.length === 1 && lastRound.matches[0].played) {
    updatedBracket.winner = lastRound.matches[0].winnerId;
  }

  return updatedBracket;
}

/**
 * Puebla la siguiente ronda con los ganadores de la ronda actual.
 * Cada par de partidos consecutivos alimenta un partido de la siguiente ronda.
 */
export function advanceCupBracket(bracket, roundIdx) {
  if (roundIdx >= bracket.rounds.length - 1) {
    // Ya es la última ronda, comprobar si hay ganador
    const lastRound = bracket.rounds[bracket.rounds.length - 1];
    if (lastRound.matches.length === 1 && lastRound.matches[0].played) {
      return { ...bracket, winner: lastRound.matches[0].winnerId };
    }
    return bracket;
  }

  const currentRound = bracket.rounds[roundIdx];
  const nextRound = bracket.rounds[roundIdx + 1];

  // Verificar si todos los partidos de la ronda actual están jugados
  const allPlayed = currentRound.matches.every(m => m.played || m.bye);
  if (!allPlayed) return bracket;

  // Poblar siguiente ronda
  const updatedNextMatches = [...nextRound.matches];
  for (let i = 0; i < currentRound.matches.length; i += 2) {
    const match1 = currentRound.matches[i];
    const match2 = currentRound.matches[i + 1];
    const nextMatchIdx = Math.floor(i / 2);

    if (nextMatchIdx < updatedNextMatches.length) {
      const winner1 = match1 ? getMatchWinner(match1) : null;
      const winner2 = match2 ? getMatchWinner(match2) : null;

      updatedNextMatches[nextMatchIdx] = {
        ...updatedNextMatches[nextMatchIdx],
        homeTeam: winner1,
        awayTeam: winner2
      };
    }
  }

  const updatedRounds = [...bracket.rounds];
  updatedRounds[roundIdx + 1] = { ...nextRound, matches: updatedNextMatches };

  // Actualizar currentRound del bracket
  return {
    ...bracket,
    rounds: updatedRounds,
    currentRound: roundIdx + 1
  };
}

/**
 * Devuelve el nombre localizado de una ronda de copa.
 */
export function getCupRoundName(roundIdx, totalRounds) {
  const roundsFromEnd = totalRounds - roundIdx;
  
  switch (roundsFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semifinales';
    case 3: return 'Cuartos de Final';
    case 4: return 'Octavos de Final';
    case 5: return 'Dieciseisavos';
    case 6: return 'Treintaidosavos';
    default: return `Ronda ${roundIdx + 1}`;
  }
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

/**
 * Obtiene el equipo ganador de un partido.
 */
function getMatchWinner(match) {
  if (!match) return null;
  if (match.bye && match.homeTeam) return match.homeTeam;
  if (!match.played || !match.winnerId) return null;
  if (match.homeTeam?.teamId === match.winnerId) return match.homeTeam;
  if (match.awayTeam?.teamId === match.winnerId) return match.awayTeam;
  return null;
}

/**
 * Resuelve datos de equipo para simulateMatch.
 * Necesita al menos: id, name, players, reputation.
 */
function resolveTeamData(cupTeam, allTeamsData) {
  if (!cupTeam) return { id: 'unknown', name: 'Desconocido', players: [], reputation: 60 };
  
  // Buscar en allTeamsData si hay datos más completos
  const fullData = allTeamsData?.[cupTeam.teamId];
  
  if (fullData) {
    return {
      ...fullData,
      id: fullData.id || cupTeam.teamId,
      name: fullData.name || cupTeam.teamName
    };
  }

  // Usar datos del bracket
  return {
    id: cupTeam.teamId,
    name: cupTeam.teamName,
    shortName: cupTeam.shortName,
    reputation: cupTeam.reputation || 70,
    players: cupTeam.players || generateSyntheticPlayers(cupTeam.reputation || 70)
  };
}

/**
 * Genera jugadores sintéticos para equipos sin datos completos.
 */
function generateSyntheticPlayers(reputation) {
  const positions = ['GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CDM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'ST', 'CF', 'GK'];
  return positions.map((pos, i) => ({
    name: `Jugador ${i + 1}`,
    position: pos,
    overall: Math.round(reputation + (Math.random() * 10 - 5)),
    age: 22 + Math.floor(Math.random() * 10),
    stamina: 80 + Math.floor(Math.random() * 15)
  }));
}
