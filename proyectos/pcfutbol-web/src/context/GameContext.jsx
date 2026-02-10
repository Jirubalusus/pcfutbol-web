import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { saveContrarreloj, deleteContrarrelojSave } from '../firebase/contrarrelojSaveService';
import { LALIGA_TEAMS } from '../data/teamsFirestore';
import { generateFacilityEvent, generateYouthPlayer, generateSonPlayer, applyEventChoice, FACILITY_SPECIALIZATIONS } from '../game/facilitiesSystem';
import { assignRole } from '../game/playerRoles';
import { GlobalTransferEngine, isTransferWindowOpen, formatTransferPrice, calculateMarketValue, TEAM_PROFILES } from '../game/globalTransferEngine';
import { getPositionFit, getSlotPosition } from '../game/positionSystem';
import { evaluateManager, generateWarningMessage } from '../game/managerEvaluation';
import { generateSalary, applyTeamsSalaries } from '../game/salaryGenerator';
import { getLeagueTier, getEconomyMultiplier } from '../game/leagueTiers';
import { evolvePlayer } from '../game/seasonEngine';
import { isEuropeanWeekDynamic, getPhaseForWeekCompat, isCupWeek, getCupRoundForWeek, EUROPEAN_MATCHDAY_WEEKS } from '../game/europeanCompetitions';
import { simulateEuropeanMatchday, advanceEuropeanPhase, recordPlayerLeagueResult, recordPlayerKnockoutResult, getPlayerCompetition } from '../game/europeanSeason';
import { isSouthAmericanLeague } from '../game/southAmericanCompetitions';
import { simulateSAMatchday, advanceSAPhase, recordPlayerSALeagueResult, recordPlayerSAKnockoutResult, getPlayerSACompetition } from '../game/southAmericanSeason';
import { simulateCupRound, completeCupMatch, getCupRoundName } from '../game/cupSystem';
import { simulateOtherLeaguesWeek, isAperturaClausura, getClausuraStartWeek, getLastClausuraWeek, simulateAperturaClausuraFinal, LEAGUE_CONFIG } from '../game/multiLeagueEngine';
import { sortTable } from '../game/leagueEngine';
import { updateWeeklyForm, updateMatchTracker, tickRejectedTransfers, generateInitialForm, generateAIForm, FORM_STATES, getFormMatchModifier } from '../game/formSystem';
import { generateLoanOffers, expireLoans, simulateAILoans, createLoan } from '../game/loanSystem';

const GameContext = createContext();

// ============================================================
// LINEUP INTEGRITY — Asegurar que siempre hay 11 jugadores
// Rellena huecos del lineup con los mejores disponibles
// ============================================================
function ensureFullLineup(lineup, players, formation) {
  if (!lineup || !players || players.length < 11) return lineup;
  
  const FORMATION_SLOTS = {
    '4-3-3':       ['GK','RB','CB1','CB2','LB','CM1','CDM','CM2','RW','ST','LW'],
    '4-4-2':       ['GK','RB','CB1','CB2','LB','RM','CM1','CM2','LM','ST1','ST2'],
    '4-2-3-1':     ['GK','RB','CB1','CB2','LB','CDM1','CDM2','RW','CAM','LW','ST'],
    '3-5-2':       ['GK','CB1','CB2','CB3','RM','CM1','CDM','CM2','LM','ST1','ST2'],
    '5-3-2':       ['GK','RB','CB1','CB2','CB3','LB','CM1','CDM','CM2','ST1','ST2'],
    '4-1-4-1':     ['GK','RB','CB1','CB2','LB','CDM','RM','CM1','CM2','LM','ST'],
    '3-4-3':       ['GK','CB1','CB2','CB3','RM','CM1','CM2','LM','RW','ST','LW'],
    '5-4-1':       ['GK','RB','CB1','CB2','CB3','LB','RM','CM1','CM2','LM','ST'],
    '4-5-1':       ['GK','RB','CB1','CB2','LB','RM','CM1','CDM','CM2','LM','ST'],
    '4-3-3 (MCO)': ['GK','RB','CB1','CB2','LB','CM1','CM2','CAM','RW','ST','LW'],
    '4-4-2 (Diamante)': ['GK','RB','CB1','CB2','LB','CDM','CM1','CM2','CAM','ST1','ST2'],
    '4-1-2-1-2':   ['GK','RB','CB1','CB2','LB','CDM','CM1','CM2','CAM','ST1','ST2'],
  };

  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3'];
  const filledCount = Object.values(lineup).filter(Boolean).length;
  
  // Ya tiene 11, no hacer nada
  if (filledCount >= 11) return lineup;
  
  const newLineup = { ...lineup };
  const usedNames = new Set(Object.values(newLineup).map(p => p?.name).filter(Boolean));
  const available = players.filter(p => !usedNames.has(p.name) && !p.injured && !p.suspended && !p.onLoan);
  
  // Rellenar slots vacíos
  for (const slotId of slots) {
    if (newLineup[slotId]) continue; // Ya ocupado
    
    const slotPos = getSlotPosition(slotId);
    const best = available
      .sort((a, b) => {
        const fitA = getPositionFit(a.position, slotPos);
        const fitB = getPositionFit(b.position, slotPos);
        return (fitB.factor * b.overall) - (fitA.factor * a.overall);
      })[0];
    
    if (best) {
      newLineup[slotId] = best;
      usedNames.add(best.name);
      available.splice(available.indexOf(best), 1);
    }
  }
  
  return newLineup;
}

// Valor de mercado para ofertas — usa calculateMarketValue (globalTransferEngine)
// NO aplica multiplicador de tier (las ofertas deben reflejar el valor real del jugador)
function getPlayerMarketValueForOffers(player) {
  // Si el jugador tiene askingPrice (puesto en venta), usar ese como referencia
  if (player.askingPrice && player.askingPrice > 0) return player.askingPrice;
  // Usar la fórmula canónica sin leagueId para no aplicar tier multiplier
  return calculateMarketValue(player, null);
}

// Check if we should use local storage (dev mode or ?local=true)
// On Capacitor (native), always use Firebase even though hostname is localhost
const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform;
const USE_LOCAL_STORAGE =
  !isCapacitor && (
    window.location.search.includes('local=true') ||
    window.location.hostname === 'localhost'
  );

const initialState = {
  // User & Save
  saveId: null,
  loaded: false,

  // Manager Name (for ranking - no real user data)
  managerName: `gaffer${Math.floor(Math.random() * 9000000000) + 1000000000}`,

  // Game State
  gameStarted: false,
  currentWeek: 1,
  currentSeason: 1,

  // Player's Team
  teamId: null,
  team: null,
  leagueId: null,
  leagueTier: 1,
  formation: '4-3-3',
  tactic: 'balanced',
  lineup: {}, // Alineación actual: { slotId: playerName }
  convocados: [], // Lista de nombres de jugadores convocados

  // Finances
  money: 0,
  weeklyIncome: 0,
  weeklyExpenses: 0,

  // Transfers - jugadores bloqueados tras fichaje fallido (se resetea cada temporada)
  blockedPlayers: [], // Array de player IDs bloqueados hasta fin de temporada

  // Cesiones (Loans)
  activeLoans: [],       // Cesiones activas (tanto cedidos como recibidos)
  loanHistory: [],       // Historial de cesiones
  incomingLoanOffers: [], // Ofertas de cesión entrantes

  // Facilities
  facilities: {
    stadium: 0,
    training: 0,
    youth: 0,
    medical: 0,
    scouting: 0,
    sponsorship: 0
  },

  // Facility Specializations (null = no elegida aún)
  facilitySpecs: {
    youth: null,
    medical: null,
    training: null
  },
  facilitySpecsLocked: {},  // { youth: true, medical: true } â†' bloqueado hasta nueva temporada

  // Facility Stats (para feedback)
  facilityStats: {
    medical: { weeksSaved: 0, injuriesPrevented: 0, treatmentsApplied: 0 },
    youth: { playersGenerated: 0, totalOvr: 0 },
    training: { totalProgress: 0 }
  },

  // Medical treatments used this week (resets each week)
  medicalTreatmentsUsed: 0,

  // Pending facility event
  pendingEvent: null,

  // Stadium (simplificado)
  stadium: {
    level: 0,
    seasonTickets: 2400, // Número de abonados (simplificado)
    ticketPrice: 30, // Precio medio por entrada
    grassCondition: 100,
    naming: null, // { sponsorId, name, yearsLeft, yearlyIncome }
    lastEventWeek: 0
  },

  // League Data
  leagueTable: [],
  fixtures: [],
  results: [],

  // Player individual season stats
  playerSeasonStats: {},  // { [playerName]: { goals, assists, cleanSheets, matchesPlayed, yellowCards, redCards, motm } }

  // Otras ligas (para simular en paralelo)
  otherLeagues: {
    segunda: { table: [], fixtures: [] },
    premierLeague: { table: [], fixtures: [] },
    serieA: { table: [], fixtures: [] },
    bundesliga: { table: [], fixtures: [] },
    ligue1: { table: [], fixtures: [] }
  },

  // Liga actual del jugador
  playerLeagueId: 'laliga',
  playerGroupId: null, // For group leagues (primeraRFEF, segundaRFEF)

  // Apertura-Clausura state (for player's league when applicable)
  aperturaTable: null,       // Frozen Apertura final standings
  currentTournament: 'apertura', // 'apertura' or 'clausura'
  aperturaClausuraFinal: null,   // Final result { winner, finalResult, ... }
  pendingAperturaClausuraFinal: null, // Set when player is in the AP-CL final

  // Transfer Market
  transferOffers: [],
  playerMarket: [],
  freeAgents: [],

  // Manager evaluation
  managerConfidence: 75, // 0-100, por debajo de 10 = despido
  managerFired: false,

  // European Competitions
  europeanCompetitions: null,     // Set via INIT_EUROPEAN_COMPETITIONS
  pendingEuropeanMatch: null,     // Set when player has a European match this week
  europeanQualification: null,    // Set at season end for next season
  europeanCalendar: null,         // Set when player has European comps; output of buildSeasonCalendar()

  // South American Competitions (Libertadores / Sudamericana)
  saCompetitions: null,           // Set via INIT_SA_COMPETITIONS
  pendingSAMatch: null,           // Set when player has an SA match this week

  // Copa Nacional
  cupCompetition: null,           // Bracket state de la copa nacional
  pendingCupMatch: null,          // Partido de copa del jugador para esta semana

  // Messages & Events
  messages: [],

  // Game Settings
  settings: {
    difficulty: 'normal', // easy, normal, hard
    matchSpeed: 'normal', // slow, normal, fast
    autoSave: true,
    showTutorials: true,
    soundEnabled: true,
    musicVolume: 70,
    sfxVolume: 80
  },

  // Training
  training: {
    type: 'balanced',
    intensity: null,
    specialPlayers: []
  },

  // Objectives & Career
  seasonObjectives: [],
  managerRating: 50,
  jobOffers: [],

  // Game Mode
  gameMode: 'career', // 'career' | 'contrarreloj'
  contrarrelojData: null, // { seasonsPlayed, trophies, startTeam, startLeague, won, finished, loseReason, wonCompetition }

  // UI State
  currentScreen: 'main_menu',

  // Form System (PES6-style arrows)
  playerForm: {},           // { [playerName]: 'excellent'|'good'|'normal'|'low'|'terrible' }
  matchTracker: {},         // { [playerName]: { consecutivePlayed, weeksSincePlay } }
  rejectedTransfers: {}     // { [playerName]: { weeksLeft, totalWeeks, quality } }
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SAVE': {
      // Firestore can convert arrays to objects with numeric keys.
      // Sanitize critical array fields back to proper arrays.
      const _p = action.payload || {};
      const _toArr = (v) => {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          // Firestore object-with-numeric-keys â†' array
          const keys = Object.keys(v);
          if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            return keys.sort((a, b) => +a - +b).map(k => v[k]);
          }
        }
        return v;  // null/undefined/etc. pass through
      };
      const sanitized = { ..._p };
      // Array fields that Firestore might mangle
      ['leagueTable', 'fixtures', 'results', 'messages', 'transferOffers', 'playerMarket',
       'freeAgents', 'seasonObjectives', 'jobOffers', 'blockedPlayers', 'activeLoans',
       'loanHistory', 'incomingLoanOffers', 'convocados', 'preseasonMatches'].forEach(key => {
        if (key in sanitized) sanitized[key] = _toArr(sanitized[key]) || [];
      });
      // Sanitize team.players
      if (sanitized.team && sanitized.team.players) {
        sanitized.team = { ...sanitized.team, players: _toArr(sanitized.team.players) || [] };
      }
      
      // === SALARY MIGRATION ===
      // Recalculate salaries if they don't match the current league tier.
      // Catches: old saves with broken formulas, promotions where salaries weren't updated, etc.
      if (sanitized.team?.players?.length > 0) {
        const leagueId = sanitized.playerLeagueId || sanitized.leagueId;
        if (leagueId) {
          const players = sanitized.team.players;
          const avgSalary = players.reduce((s, p) => s + (p.salary || 0), 0) / players.length;
          
          // Calculate what the expected average salary SHOULD be for this league
          const avgOvr = Math.round(players.reduce((s, p) => s + (p.overall || 70), 0) / players.length);
          const expectedAvg = generateSalary({ overall: avgOvr, age: 27, name: 'Test' }, leagueId);
          
          // If actual avg is less than 30% of expected, salaries are wrong for this league
          const needsMigration = avgSalary < expectedAvg * 0.3;
          
          if (needsMigration) {
            console.log(`⚡ Salary migration: avg ${Math.round(avgSalary)}/wk vs expected ${expectedAvg}/wk for ${leagueId}. Recalculating.`);
            sanitized.team = {
              ...sanitized.team,
              players: players.map(p => ({
                ...p,
                salary: generateSalary(p, leagueId)
              }))
            };
          }
        }
      }
      
      return { ...state, ...sanitized, loaded: true };
    }

    case 'NEW_GAME': {
      // Obtener estadio real del equipo
      const stadiumInfo = action.payload.stadiumInfo || { name: 'Estadio', capacity: 8000 };
      const stadiumLevel = action.payload.stadiumLevel ?? 0;

      // League tier para escalado económico
      const leagueId = action.payload.leagueId;
      const leagueTier = leagueId ? getLeagueTier(leagueId) : 1;

      // Función para generar contrato basado en edad
      const generateContract = (age) => {
        if (age <= 21) return Math.floor(Math.random() * 3) + 3; // 3-5 años (jóvenes promesas)
        if (age <= 25) return Math.floor(Math.random() * 3) + 3; // 3-5 años (desarrollo)
        if (age <= 28) return Math.floor(Math.random() * 3) + 2; // 2-4 años (plenitud)
        if (age <= 32) return Math.floor(Math.random() * 2) + 2; // 2-3 años (veteranos)
        return Math.floor(Math.random() * 2) + 1; // 1-2 años (veteranos mayores)
      };

      // Asignar roles, contratos y salarios a todos los jugadores
      // Salarios escalados por tier de liga
      const teamWithRoles = {
        ...action.payload.team,
        players: action.payload.team.players.map(player => ({
          ...player,
          role: player.role || assignRole(player),
          contractYears: player.contractYears ?? generateContract(player.age || 25),
          salary: generateSalary(player, leagueId || leagueTier)
        }))
      };

      const initialForm = generateInitialForm(teamWithRoles.players);
      const initialTracker = {};
      teamWithRoles.players.forEach(p => {
        initialTracker[p.name] = { consecutivePlayed: 0, weeksSincePlay: 3 }; // Start as "rested"
      });

      // Contrarreloj mode support
      const incomingGameMode = action.payload.gameMode || 'career';
      const contrarrelojInit = incomingGameMode === 'contrarreloj' ? {
        seasonsPlayed: 1,
        trophies: [],
        seasonHistory: [],
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0,
        totalMatches: 0,
        startTeam: { id: action.payload.teamId, name: action.payload.team?.name },
        startLeague: leagueId,
        won: false,
        finished: false,
        loseReason: null,
        wonCompetition: null
      } : null;

      return {
        ...initialState,
        gameStarted: true,
        gameMode: incomingGameMode,
        contrarrelojData: contrarrelojInit,
        _contrarrelojUserId: incomingGameMode === 'contrarreloj' ? (action.payload._contrarrelojUserId || null) : null,
        teamId: action.payload.teamId,
        team: teamWithRoles,
        leagueId: leagueId,
        leagueTier: leagueTier,
        money: teamWithRoles.budget,
        loaded: true,
        currentScreen: 'office',
        stadium: {
          ...initialState.stadium,
          level: stadiumLevel,
          name: stadiumInfo.name,
          realCapacity: stadiumInfo.capacity,
          // Abonados iniciales: ~40% de capacidad real como base
          seasonTickets: Math.floor((stadiumInfo.capacity || 8000) * 0.4),
          seasonTicketsFinal: null, // Se fija al cerrar la campaña
          seasonTicketsCampaignOpen: true,
          ticketPrice: 30,
          grassCondition: 100
        },
        facilities: {
          ...initialState.facilities,
          stadium: stadiumLevel
        },
        // Pretemporada
        preseasonMatches: action.payload.preseasonMatches || [],
        preseasonPhase: action.payload.preseasonPhase || false,
        preseasonWeek: action.payload.preseasonPhase ? 1 : 0,
        playerForm: initialForm,
        matchTracker: initialTracker,
        rejectedTransfers: {}
      };
    }

    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };

    case 'SET_MANAGER_NAME':
      return { ...state, managerName: action.payload };

    case 'UPDATE_MONEY':
      return { ...state, money: state.money + action.payload };

    case 'TREAT_INJURY': {
      const { playerId, weeksReduced, cost } = action.payload;
      const updatedPlayers = state.team?.players?.map(p => {
        if (p.id === playerId || p.name === playerId) {
          const newWeeksLeft = Math.max(0, (p.injuryWeeksLeft || 0) - weeksReduced);
          return {
            ...p,
            injuryWeeksLeft: newWeeksLeft,
            injured: newWeeksLeft > 0,
            treated: true
          };
        }
        return p;
      }) || [];

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        money: state.money - cost
      };
    }

    case 'SET_LEAGUE_TABLE':
      return { ...state, leagueTable: action.payload };

    case 'SET_FIXTURES':
      return { ...state, fixtures: action.payload };

    case 'SET_OTHER_LEAGUES':
      return { ...state, otherLeagues: action.payload };

    case 'UPDATE_OTHER_LEAGUE': {
      const { leagueId, table, fixtures } = action.payload;
      return {
        ...state,
        otherLeagues: {
          ...state.otherLeagues,
          [leagueId]: {
            table: table || state.otherLeagues[leagueId]?.table || [],
            fixtures: fixtures || state.otherLeagues[leagueId]?.fixtures || []
          }
        }
      };
    }

    case 'SET_PLAYER_LEAGUE': {
      const newLeagueId = action.payload;
      const newLeagueTier = newLeagueId ? getLeagueTier(newLeagueId) : (state.leagueTier || 1);
      const oldLeagueTier = state.leagueTier || (state.playerLeagueId ? getLeagueTier(state.playerLeagueId) : 1);
      
      // Recalculate salaries when league tier changes (promotion/relegation)
      let updatedTeam = state.team;
      if (newLeagueTier !== oldLeagueTier && state.team?.players?.length > 0) {
        console.log(`⚡ League change: tier ${oldLeagueTier} → ${newLeagueTier}. Recalculating salaries for ${newLeagueId}`);
        updatedTeam = {
          ...state.team,
          players: state.team.players.map(p => ({
            ...p,
            salary: generateSalary(p, newLeagueId)
          }))
        };
      }
      
      return {
        ...state,
        team: updatedTeam,
        playerLeagueId: newLeagueId,
        leagueId: newLeagueId,
        leagueTier: newLeagueTier
      };
    }

    case 'SET_PLAYER_GROUP':
      return { ...state, playerGroupId: action.payload };

    case 'ADD_RESULT':
      return {
        ...state,
        results: [...state.results, action.payload]
      };

    case 'UPDATE_PLAYER_SEASON_STATS': {
      const { events, playerTeamSide, cleanSheet } = action.payload;
      const currentStats = { ...state.playerSeasonStats };

      // Helper: normalize player from events (V2 returns {name}, V1 returns string)
      const _gpn = (p) => typeof p === 'object' ? (p?.name || 'Desconocido') : (p || 'Desconocido');
      const _initStat = () => ({ goals: 0, assists: 0, cleanSheets: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, motm: 0 });

      // Count goals and assists from match events
      events.forEach(event => {
        if (event.type === 'goal' && event.team === playerTeamSide) {
          const scorerName = _gpn(event.player);
          if (!currentStats[scorerName]) currentStats[scorerName] = _initStat();
          currentStats[scorerName].goals++;

          if (event.assist) {
            const assistName = _gpn(event.assist);
            if (!currentStats[assistName]) currentStats[assistName] = _initStat();
            currentStats[assistName].assists++;
          }
        }
        if (event.type === 'yellow_card' && event.team === playerTeamSide) {
          const name = _gpn(event.player);
          if (!currentStats[name]) currentStats[name] = _initStat();
          currentStats[name].yellowCards++;
        }
        if (event.type === 'red_card' && event.team === playerTeamSide) {
          const name = _gpn(event.player);
          if (!currentStats[name]) currentStats[name] = _initStat();
          currentStats[name].redCards++;
        }
      });

      // Record matches played for lineup players
      const lineup = state.convocados || [];
      lineup.forEach(name => {
        if (!currentStats[name]) currentStats[name] = { goals: 0, assists: 0, cleanSheets: 0, matchesPlayed: 0, yellowCards: 0, redCards: 0, motm: 0 };
        currentStats[name].matchesPlayed++;
      });

      // Clean sheets for GK
      if (cleanSheet) {
        const gk = state.team?.players?.find(p => p.position === 'GK' && lineup.includes(p.name));
        if (gk && currentStats[gk.name]) {
          currentStats[gk.name].cleanSheets++;
        }
      }

      return { ...state, playerSeasonStats: currentStats };
    }

    case 'START_NEW_SEASON': {
      const { seasonResult, objectiveRewards, europeanBonus, preseasonMatches, moneyChange, newFixtures, newTable, newObjectives } = action.payload;

      // === PROCESAR CESIONES AL FINAL DE TEMPORADA ===
      const currentLoans = state.activeLoans || [];
      const { expiredLoans: seasonExpiredLoans, remainingLoans: seasonRemainingLoans, messages: loanExpireMessages } = expireLoans(currentLoans, state.leagueTeams);

      // Función para calcular si un jugador decide retirarse
      const checkRetirement = (player, newAge) => {
        // Ya anunció retiro
        if (player.retiring) return true;

        // Probabilidad por edad (empieza a los 33)
        if (newAge >= 33) {
          const baseChance = (newAge - 32) * 0.12; // 12% a los 33, 24% a los 34, etc.
          if (Math.random() < baseChance) return true;
        }

        // Por lesiones graves consecutivas (>6 semanas cada una)
        const severeInjuries = player.severeInjuryCount || 0;
        if (severeInjuries >= 2 && Math.random() < 0.30) return true;

        return false;
      };

      // Quitar jugadores en cesión recibida (onLoan: true) antes de evolucionar
      const playersWithoutLoans = (state.team?.players || []).filter(p => !p.onLoan);

      // Añadir jugadores propios que vuelven de cesión
      const myLoanedOutPlayers = seasonExpiredLoans
        .filter(l => l.fromTeamId === state.teamId)
        .map(l => l.playerData)
        .filter(Boolean);

      const allPlayersForEvolution = [...playersWithoutLoans, ...myLoanedOutPlayers];

      // Evolucionar jugadores, reducir contratos y filtrar expirados
      const evolvedPlayers = (allPlayersForEvolution.map(player => {
        const newAge = (player.age || 25) + 1;
        const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;

        // Evolución realista: cada jugador es único
        const newOverall = evolvePlayer(player);

        // Check retiro
        const willRetire = checkRetirement(player, newAge);

        return {
          ...player,
          age: newAge,
          overall: newOverall,
          contractYears: contractYears - 1,
          injured: false,
          injuryWeeksLeft: 0,
          yellowCards: 0,
          suspended: false,
          suspensionType: null,
          retiring: willRetire,
          severeInjuryCount: 0, // Reset al inicio de temporada
          // Limpiar flags de cesión
          onLoan: false,
          loanFromTeam: undefined,
          loanFromTeamId: undefined,
          loanSalaryShare: undefined
        };
      }) || []);

      // Capturar jugadores que se van (retiro o fin contrato) para generar "hijos"
      const departingPlayers = evolvedPlayers.filter(p => p.contractYears <= 0 || p.retiring);
      const retiringPlayers = evolvedPlayers.filter(p => p.retiring);

      // Filtrar: solo quedan los activos
      const updatedPlayers = evolvedPlayers.filter(player => player.contractYears > 0 && !player.retiring);

      // Limpiar lineup de jugadores que ya no están en la plantilla
      const playerNames = new Set(updatedPlayers.map(p => p.name));
      const cleanedLineup = {};
      if (state.lineup) {
        Object.entries(state.lineup).forEach(([slot, player]) => {
          if (player && playerNames.has(player.name)) {
            cleanedLineup[slot] = player;
          }
        });
      }

      // Actualizar patrocinio (naming rights) - reducir años
      let updatedNaming = state.stadium?.naming;
      if (updatedNaming && updatedNaming.yearsLeft > 0) {
        updatedNaming = {
          ...updatedNaming,
          yearsLeft: updatedNaming.yearsLeft - 1
        };
        if (updatedNaming.yearsLeft <= 0) {
          updatedNaming = null;
        }
      }

      // Generar "hijos" de jugadores retirados del equipo del jugador
      const retirementSons = retiringPlayers.map(retired => generateSonPlayer(retired));
      const finalPlayers = [...updatedPlayers, ...retirementSons];

      // Mensajes de retiros e hijos
      const retirementMessages = [];
      retiringPlayers.forEach((retired, idx) => {
        retirementMessages.push({
          id: Date.now() + idx + 0.5,
          type: 'retirement',
          titleKey: 'gameMessages.playerRetiredTitle', titleParams: { player: retired.name },
          contentKey: 'gameMessages.playerRetired', contentParams: { player: retired.name, position: retired.position, overall: retired.overall },
          dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }
        });
      });
      retirementSons.forEach((son, idx) => {
        retirementMessages.push({
          id: Date.now() + idx + 0.8,
          type: 'youth',
          titleKey: 'gameMessages.newYouthPlayerSon', titleParams: { player: son.name },
          contentKey: 'gameMessages.youthSonContent', contentParams: { parent: son.parentName, position: son.position, overall: son.overall, potential: son.potential },
          dateKey: 'gameMessages.startOfSeason', dateParams: { season: state.currentSeason + 1 }
        });
      });

      // Actualizar playerNames para lineup con los nuevos jugadores
      const finalPlayerNames = new Set(finalPlayers.map(p => p.name));

      // === ENVEJECER Y GENERAR HIJOS EN EQUIPOS IA (leagueTeams) ===
      const updatedLeagueTeamsForSeason = (state.leagueTeams || []).map(team => {
        if (team.id === state.teamId) return team; // Skip player's team (already handled)
        if (!team.players || team.players.length === 0) return team;

        // Envejecer jugadores
        const agedPlayers = team.players.map(p => ({
          ...p,
          age: (p.age || 25) + 1,
          overall: evolvePlayer(p)
        }));

        // Retirar viejos
        const active = agedPlayers.filter(p => {
          if (p.age > 38) return false;
          if (p.age > 36) return Math.random() > 0.5;
          return true;
        });
        const retired = agedPlayers.filter(p => !active.includes(p));

        // Generar hijos de retirados
        const sons = retired.map(r => generateSonPlayer(r));

        return { ...team, players: [...active, ...sons] };
      });

      // Calcular dinero final tras temporada
      const seasonEndMoney = state.money + moneyChange + (state.stadium?.accumulatedTicketIncome ?? 0) + (state.stadium?.seasonTicketIncomeCollected ?? 0);

      // Check bancarrota al final de temporada
      const isBankruptAtSeasonEnd = seasonEndMoney < 0;

      return {
        ...state,
        currentSeason: state.currentSeason + 1,
        currentWeek: 1,
        team: {
          ...state.team,
          players: finalPlayers
        },
        // Limpiar alineación y convocados — asegurar 11 siempre
        lineup: ensureFullLineup(cleanedLineup, finalPlayers, state.formation),
        convocados: (state.convocados || []).filter(name => playerNames.has(name)),
        // Cobrar ingresos acumulados de taquilla + abonados al final de temporada
        money: seasonEndMoney,
        // Despido por bancarrota si el dinero es negativo tras temporada
        managerFired: isBankruptAtSeasonEnd || state.managerFired,
        managerFiredReason: isBankruptAtSeasonEnd
          ? 'managerFired.bankruptReason'
          : state.managerFiredReason,
        // Actualizar estadio: cobrar acumulado, resetear para nueva temporada, desbloquear precio
        stadium: {
          ...state.stadium,
          naming: updatedNaming,
          accumulatedTicketIncome: 0,    // Reset: nueva temporada empieza de cero
          ticketPriceLocked: false,       // Desbloquear precio para la nueva temporada
          lastMatchAttendance: null,
          lastMatchTicketSales: null,
          lastMatchIncome: null,
          seasonTicketsCampaignOpen: true, // Reabrir campaña de abonos
          seasonTicketsFinal: null,
          seasonTicketIncomeCollected: 0,
          totalSeasonIncome: 0
        },
        // Guardar partidos de pretemporada
        preseasonMatches: preseasonMatches,
        preseasonPhase: true,
        preseasonWeek: 1,
        // Usar nuevos fixtures y tabla generados
        leagueTable: newTable || [],
        fixtures: newFixtures || [],
        seasonObjectives: newObjectives || [],
        // Guardar resultado anterior
        lastSeasonResult: seasonResult,
        europeanQualification: seasonResult.qualification,
        // Reset para nueva temporada
        training: { intensity: null }, // Desbloquear entrenamiento
        medicalSlots: [], // Liberar slots médicos
        blockedPlayers: [], // Reset: desbloquear jugadores para nueva temporada
        facilitySpecsLocked: {}, // Desbloquear especializaciones
        facilitySpecs: { youth: null, medical: null, training: null }, // Reset especializaciones
        playerSeasonStats: {},  // Reset para nueva temporada
        // Reset Apertura-Clausura state
        aperturaTable: null,
        currentTournament: 'apertura',
        aperturaClausuraFinal: null,
        pendingAperturaClausuraFinal: null,
        // Reset European state (will be re-initialized by SeasonEnd)
        europeanCompetitions: null,
        pendingEuropeanMatch: null,
        europeanCalendar: action.payload.europeanCalendar || null,
        // Reset SA state (will be re-initialized by SeasonEnd)
        saCompetitions: null,
        pendingSAMatch: null,
        // Reset cup state (will be re-initialized by SeasonEnd)
        cupCompetition: null,
        pendingCupMatch: null,
        // Equipos IA con jugadores envejecidos + hijos de retirados
        leagueTeams: updatedLeagueTeamsForSeason,
        // Cesiones: limpiar para nueva temporada
        activeLoans: seasonRemainingLoans, // Solo quedan las compradas/no activas
        loanHistory: [...(state.loanHistory || []), ...seasonExpiredLoans],
        incomingLoanOffers: [],
        // Mensajes: retiros + hijos + cesiones
        messages: [...retirementMessages, ...loanExpireMessages.map(m => ({
          id: Date.now() + Math.random(), type: 'loan', titleKey: m.titleKey || 'gameMessages.loan', title: m.title || 'Loan', content: m.content || '', dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }
        }))].slice(0, 50),
        // Form system reset
        playerForm: generateInitialForm(
          finalPlayers,
          state.team?.players?.find(p => p.role === 'captain')?.name
        ),
        matchTracker: Object.fromEntries(
          (finalPlayers || []).map(p => [p.name, { consecutivePlayed: 0, weeksSincePlay: 3 }])
        ),
        rejectedTransfers: {},
        // Contrarreloj: increment seasons played + record season history + accumulate stats
        contrarrelojData: state.contrarrelojData ? (() => {
          const teamStats = state.leagueTable?.find(t => t.teamId === state.teamId);
          const w = teamStats?.won || 0;
          const d = teamStats?.drawn || 0;
          const l = teamStats?.lost || 0;
          return {
          ...state.contrarrelojData,
          // Si bancarrota al final de temporada, marcar como derrota en contrarreloj
          ...(isBankruptAtSeasonEnd && !state.contrarrelojData.finished ? { won: false, finished: true, loseReason: 'bankrupt' } : {}),
          seasonsPlayed: (state.contrarrelojData.seasonsPlayed || 1) + 1,
          totalWins: (state.contrarrelojData.totalWins || 0) + w,
          totalDraws: (state.contrarrelojData.totalDraws || 0) + d,
          totalLosses: (state.contrarrelojData.totalLosses || 0) + l,
          totalMatches: (state.contrarrelojData.totalMatches || 0) + w + d + l,
          seasonHistory: [...(state.contrarrelojData.seasonHistory || []), {
            season: state.contrarrelojData.seasonsPlayed || 1,
            league: state.leagueId || state.playerLeagueId,
            leagueName: null, // resolved in component
            position: seasonResult?.position || 0,
            totalTeams: state.leagueTable?.length || 0,
            promoted: !!seasonResult?.promotion,
            promotedTo: seasonResult?.promotion ? (action.payload.newPlayerLeagueId || null) : null,
            relegated: !!seasonResult?.relegation,
            relegatedTo: seasonResult?.relegation ? (action.payload.newPlayerLeagueId || null) : null,
            europeanPhase: (() => {
              // Extract best european/SA phase reached from current state
              const comps = state.europeanCompetitions || state.saCompetitions;
              if (!comps) return null;
              for (const comp of Object.values(comps)) {
                if (!comp?.state) continue;
                const teamState = comp.state.teamResults?.[state.teamId];
                if (teamState?.phase) return teamState.phase;
                // Check if team is in the competition
                const isAlive = comp.state.teams?.some(t => (t.teamId || t.id) === state.teamId);
                if (isAlive) return comp.state.currentPhase || 'Fase de grupos';
              }
              return null;
            })(),
            europeanComp: (() => {
              const comps = state.europeanCompetitions || state.saCompetitions;
              if (!comps) return null;
              for (const [name, comp] of Object.entries(comps)) {
                if (!comp?.state) continue;
                const teams = comp.state.teams || [];
                if (teams.some(t => (t.teamId || t.id) === state.teamId)) {
                  return name === 'championsLeague' ? 'Continental Champions Cup'
                    : name === 'europaLeague' ? 'Continental Shield'
                    : name === 'conferenceleague' ? 'Continental Trophy'
                    : name === 'copaLibertadores' ? 'South American Champions Cup'
                    : name === 'copaSudamericana' ? 'Copa Sudamericana'
                    : name;
                }
              }
              return null;
            })()
          }]
        };
        })() : null
      };
    }

    case 'END_PRESEASON': {
      // Si se proporcionan nuevos fixtures y tabla, usarlos
      const newFixtures = action.payload?.fixtures || state.fixtures;
      const newTable = action.payload?.table || state.leagueTable;
      const newObjectives = action.payload?.objectives || state.seasonObjectives;

      return {
        ...state,
        preseasonPhase: false,
        preseasonMatches: [],
        preseasonWeek: 0,
        fixtures: newFixtures,
        leagueTable: newTable,
        seasonObjectives: newObjectives
      };
    }

    case 'ADVANCE_PRESEASON_WEEK': {
      // Generar ofertas por jugadores en venta durante pretemporada
      let preseasonIncomingOffers = [...(state.incomingOffers || [])];
      let preseasonMessages = [];

      if (state.team?.players) {
        const listedPlayers = state.team.players.filter(p => p.transferListed && !p.onLoan);
        for (const listedPlayer of listedPlayers) {
          const alreadyHasOffer = preseasonIncomingOffers.some(
            o => o.player?.name === listedPlayer.name && o.status === 'pending'
          );
          if (!alreadyHasOffer) {
            const allTeams = state.leagueTeams || [];
            const potentialBuyers = allTeams.filter(t => t.id !== state.teamId && (t.budget || 0) >= 500_000);

            let buyer;
            if (potentialBuyers.length > 0) {
              buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];
            } else {
              const fakeNames = ['FC Esperanza', 'Atlético Progreso', 'CD Horizonte', 'UD Fénix', 'Racing Nuevo'];
              buyer = { id: `fake_${Date.now()}`, name: fakeNames[Math.floor(Math.random() * fakeNames.length)], budget: 10_000_000 };
            }

            const mktValue = getPlayerMarketValueForOffers(listedPlayer);
            const offerAmt = Math.max(50_000, Math.round(mktValue * (0.80 + Math.random() * 0.40)));

            preseasonIncomingOffers.push({
              id: `incoming_preseason_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              player: { name: listedPlayer.name, position: listedPlayer.position, overall: listedPlayer.overall, age: listedPlayer.age },
              fromTeam: buyer.name, fromTeamId: buyer.id,
              amount: offerAmt, salaryOffer: Math.round((listedPlayer.salary || 50000) * 1.3),
              status: 'pending', createdAt: Date.now(), expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
            });

            preseasonMessages.push({
              id: Date.now() + Math.random(), type: 'offer',
              titleKey: 'gameMessages.offerForListedPlayer',
              contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmt), player: listedPlayer.name },
              dateKey: 'gameMessages.preseason'
            });
          }
        }

        // También generar ofertas aleatorias en pretemporada (80% chance)
        if (Math.random() < 0.80) {
          const eligiblePlayers = state.team.players.filter(p => !p.injured && !p.onLoan).sort(() => Math.random() - 0.5);
          const numOffers = Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : 3;
          const usedNames = new Set(preseasonIncomingOffers.map(o => o.player?.name));

          for (let i = 0; i < Math.min(numOffers, eligiblePlayers.length); i++) {
            const targetPlayer = eligiblePlayers[i];
            if (usedNames.has(targetPlayer.name)) continue;

            const mktValue = getPlayerMarketValueForOffers(targetPlayer);
            const allTeams = state.leagueTeams || [];
            const buyers = allTeams.filter(t => t.id !== state.teamId && (t.budget || 0) >= mktValue * 0.5);

            if (buyers.length > 0) {
              const buyer = buyers[Math.floor(Math.random() * buyers.length)];
              const offerAmt = Math.round(mktValue * (0.85 + Math.random() * 0.35));

              preseasonIncomingOffers.push({
                id: `incoming_pre_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                player: { name: targetPlayer.name, position: targetPlayer.position, overall: targetPlayer.overall, age: targetPlayer.age },
                fromTeam: buyer.name, fromTeamId: buyer.id,
                amount: offerAmt, salaryOffer: Math.round((targetPlayer.salary || 50000) * 1.3),
                status: 'pending', createdAt: Date.now(), expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
              });
              usedNames.add(targetPlayer.name);

              preseasonMessages.push({
                id: Date.now() + Math.random(), type: 'offer',
                titleKey: 'gameMessages.newOfferReceived',
                contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmt), player: targetPlayer.name },
                dateKey: 'gameMessages.preseason'
              });
            }
          }
        }
      }

      // ============================================================
      // PROCESAR OFERTAS ENVIADAS (outgoing) EN PRETEMPORADA
      // Misma lógica que ADVANCE_WEEK pero usando preseasonWeek
      // ============================================================
      const nextPreseasonWeek = (state.preseasonWeek || 1) + 1;
      let resolvedPreseasonOutgoing = [...(state.outgoingOffers || [])];
      let preseasonOfferMessages = [];
      let preseasonMoneyReturned = 0;

      resolvedPreseasonOutgoing = resolvedPreseasonOutgoing.map(offer => {
        if (offer.status !== 'pending') return offer;

        const weeksPending = nextPreseasonWeek - (offer.submittedWeek || nextPreseasonWeek);
        const allTeams = state.leagueTeams || [];
        const targetTeam = allTeams.find(t => t.id === offer.toTeamId);
        const targetPlayer = targetTeam ? (targetTeam.players || []).find(p => p.name === offer.playerName) : null;

        if (!targetTeam || !targetPlayer) {
          preseasonMoneyReturned += offer.amount;
          preseasonOfferMessages.push({
            id: Date.now() + Math.random(), type: 'transfer',
            titleKey: 'gameMessages.offerCancelled', titleParams: { player: offer.playerName },
            contentKey: 'gameMessages.playerUnavailableRefund', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) },
            dateKey: 'gameMessages.preseason'
          });
          return null;
        }

        const playerMarketValue = calculateMarketValue(targetPlayer, targetTeam.leagueId);
        const offerRatio = offer.amount / playerMarketValue;
        const expiryWeeks = offerRatio >= 0.90 ? 3 : offerRatio >= 0.70 ? 2 : 1;

        if (weeksPending >= expiryWeeks) {
          preseasonMoneyReturned += offer.amount;
          preseasonOfferMessages.push({
            id: Date.now() + Math.random(), type: 'transfer',
            titleKey: 'gameMessages.offerExpiredPlayer', titleParams: { player: offer.playerName },
            contentKey: 'gameMessages.offerExpiredRefund', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) },
            dateKey: 'gameMessages.preseason'
          });
          return null;
        }

        if (weeksPending < 1) return offer;

        const isStarter = targetPlayer.overall >= (targetTeam.players || []).reduce((sum, p) => sum + p.overall, 0) / (targetTeam.players?.length || 1) + 3;

        let clubResponse = 'rejected';
        let clubReason = '';
        let clubCounterAmount = null;

        if (isStarter && offerRatio < 1.3) {
          clubResponse = 'rejected';
          clubReason = 'Titular indiscutible, no está en venta';
        } else if (offerRatio >= 1.15) {
          clubResponse = 'accepted';
          clubReason = 'Oferta irrechazable';
        } else if (offerRatio >= 0.90) {
          if (Math.random() < 0.65) {
            clubResponse = 'accepted';
            clubReason = 'Oferta aceptada';
          } else {
            clubResponse = 'countered';
            clubCounterAmount = Math.round(playerMarketValue * (1.05 + Math.random() * 0.15));
            clubReason = `Piden ${formatTransferPrice(clubCounterAmount)}`;
          }
        } else if (offerRatio >= 0.70) {
          if (Math.random() < 0.2) {
            clubResponse = 'accepted';
            clubReason = 'Necesitan liquidez';
          } else if (Math.random() < 0.6) {
            clubResponse = 'countered';
            clubCounterAmount = Math.round(playerMarketValue * (1.1 + Math.random() * 0.2));
            clubReason = `Piden ${formatTransferPrice(clubCounterAmount)}`;
          } else {
            clubReason = 'Oferta insuficiente';
          }
        } else {
          clubReason = 'Oferta irrisoria';
        }

        let playerResponse = 'rejected';
        let playerReason = '';
        const requiredSalary = Math.round((targetPlayer.salary || 50000) * 1.1);

        if (offer.salaryOffer >= requiredSalary * 1.2) {
          playerResponse = 'accepted';
          playerReason = 'Encantado con la propuesta';
        } else if (offer.salaryOffer >= requiredSalary * 0.95) {
          if (Math.random() < 0.7) {
            playerResponse = 'accepted';
            playerReason = 'Acepta el proyecto deportivo';
          } else {
            playerReason = 'Quiere un salario mayor';
          }
        } else if (offer.salaryOffer >= requiredSalary * 0.7) {
          if (Math.random() < 0.25) {
            playerResponse = 'accepted';
            playerReason = 'Le convence el proyecto';
          } else {
            playerReason = 'Salario insuficiente';
          }
        } else {
          playerReason = 'Oferta salarial irrisoria';
        }

        const bothAccepted = clubResponse === 'accepted' && playerResponse === 'accepted';
        const icon = bothAccepted ? '✅' : clubResponse === 'countered' ? '🔄' : '❌';

        preseasonOfferMessages.push({
          id: Date.now() + Math.random(), type: 'transfer',
          titleKey: bothAccepted ? 'gameMessages.transferComplete' : 'gameMessages.offerResponse',
          titleParams: { player: offer.playerName, icon },
          contentKey: bothAccepted ? 'gameMessages.transferCompleteContent' : 'gameMessages.offerRejectedContent',
          contentParams: bothAccepted
            ? { player: offer.playerName, cost: formatTransferPrice(offer.amount) }
            : { clubReason, playerReason },
          dateKey: 'gameMessages.preseason'
        });

        if (bothAccepted) {
          // Fichaje — el jugador se añade al equipo
          // (se manejará abajo)
        } else if (clubResponse !== 'countered') {
          preseasonMoneyReturned += offer.amount;
        }

        return {
          ...offer,
          status: 'resolved',
          clubResponse, clubReason, clubCounterAmount,
          playerResponse, playerReason,
          resolvedWeek: nextPreseasonWeek,
          expiryWeek: nextPreseasonWeek + 2
        };
      }).filter(Boolean);

      // Procesar fichajes completados en pretemporada
      let preseasonUpdatedPlayers = state.team ? [...state.team.players] : [];
      let preseasonUpdatedLeagueTeams = [...(state.leagueTeams || [])];

      resolvedPreseasonOutgoing.forEach(offer => {
        if (offer.resolvedWeek === nextPreseasonWeek && offer.clubResponse === 'accepted' && offer.playerResponse === 'accepted') {
          const targetTeam = preseasonUpdatedLeagueTeams.find(t => t.id === offer.toTeamId);
          const targetPlayer = targetTeam ? (targetTeam.players || []).find(p => p.name === offer.playerName) : null;
          if (targetPlayer) {
            preseasonUpdatedPlayers.push({
              ...targetPlayer,
              salary: offer.salaryOffer,
              contractYears: offer.contractYears || 4,
              teamId: state.teamId,
              morale: 80,
              fitness: 100
            });
            preseasonUpdatedLeagueTeams = preseasonUpdatedLeagueTeams.map(t => {
              if (t.id === offer.toTeamId) {
                return { ...t, players: (t.players || []).filter(p => p.name !== offer.playerName), budget: (t.budget || 50_000_000) + offer.amount };
              }
              return t;
            });
          }
        }
      });

      return {
        ...state,
        preseasonWeek: nextPreseasonWeek,
        incomingOffers: preseasonIncomingOffers,
        outgoingOffers: resolvedPreseasonOutgoing,
        money: (state.money || 0) + preseasonMoneyReturned,
        team: state.team ? { ...state.team, players: preseasonUpdatedPlayers } : null,
        leagueTeams: preseasonUpdatedLeagueTeams,
        messages: [...preseasonOfferMessages, ...preseasonMessages, ...state.messages].slice(0, 50)
      };
    }

    case 'ADVANCE_WEEK': {
      // ============================================================
      // AUTO-RESOLVE pending European/SA matches (e.g. during simulate season)
      // If ADVANCE_WEEK is called while a pendingEuropeanMatch/pendingSAMatch
      // exists, the player didn't play it interactively â†' auto-simulate.
      // ============================================================
      let resolvedEuropean = state.europeanCompetitions;
      let resolvedSA = state.saCompetitions;

      const autoSimPendingMatch = (pm, competitions, recordLeague, recordKnockout, advancePhase, teamId) => {
        const compState = competitions?.competitions?.[pm.competitionId];
        if (!compState) return competitions;
        const homeRep = pm.homeTeam?.reputation || pm.team1?.reputation || 70;
        const awayRep = pm.awayTeam?.reputation || pm.team2?.reputation || 70;
        const diff = (homeRep + 5) - awayRep;
        const hExp = 1.2 + diff * 0.02;
        const aExp = 1.2 - diff * 0.02;
        const homeScore = Math.max(0, Math.round(hExp + (Math.random() * 2 - 1)));
        const awayScore = Math.max(0, Math.round(aExp + (Math.random() * 2 - 1)));
        const autoResult = {
          homeTeamId: pm.homeTeamId || pm.homeTeam?.teamId || pm.team1?.teamId,
          awayTeamId: pm.awayTeamId || pm.awayTeam?.teamId || pm.team2?.teamId,
          homeScore, awayScore, events: []
        };
        let updatedComp = pm.phase === 'league'
          ? recordLeague(compState, autoResult, pm.matchday)
          : recordKnockout(compState, autoResult, pm.phase);
        // Phase advancement
        if ((pm.phase === 'league' && pm.matchday === 8 && updatedComp.currentMatchday >= 8) || pm.phase !== 'league') {
          const advanced = advancePhase(updatedComp, teamId);
          if (advanced.updatedState.phase !== compState.phase || pm.phase === 'league') {
            updatedComp = advanced.updatedState;
          }
        }
        return {
          ...competitions,
          competitions: { ...competitions.competitions, [pm.competitionId]: updatedComp }
        };
      };

      if (state.pendingEuropeanMatch) {
        resolvedEuropean = autoSimPendingMatch(
          state.pendingEuropeanMatch, resolvedEuropean,
          recordPlayerLeagueResult, recordPlayerKnockoutResult, advanceEuropeanPhase, state.teamId
        );
      }
      if (state.pendingSAMatch) {
        resolvedSA = autoSimPendingMatch(
          state.pendingSAMatch, resolvedSA,
          recordPlayerSALeagueResult, recordPlayerSAKnockoutResult, advanceSAPhase, state.teamId
        );
      }

      // NO weekly income. All revenue (commercial, tickets, season tickets)
      // is accumulated and collected at end of season via START_NEW_SEASON.
      // Only player sales add money instantly.
      const totalIncome = 0;

      // Salaries are NOT deducted weekly â€" they are paid at end of season
      // via START_NEW_SEASON (SeasonEnd calculates totalSalaryCost = weekly * 52)
      const salaryExpenses = 0;

      // Heal injuries - reduce weeks left by 1
      let updatedPlayers = state.team?.players?.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          const newWeeksLeft = p.injuryWeeksLeft - 1;
          if (newWeeksLeft <= 0) {
            // Player healed - remove injury flags including treated
            return { ...p, injured: false, injuryWeeksLeft: 0, injuryType: null, treated: false };
          }
          return { ...p, injuryWeeksLeft: newWeeksLeft };
        }
        // Clear resting status
        if (p.resting && p.restWeeks) {
          const newRestWeeks = p.restWeeks - 1;
          if (newRestWeeks <= 0) {
            return { ...p, resting: false, restWeeks: 0 };
          }
          return { ...p, restWeeks: newRestWeeks };
        }
        return p;
      }) || [];

      // Generate youth players at end of season (week 38) using specialization
      const newYouthPlayers = [];
      let updatedYouthStats = state.facilityStats?.youth || { playersGenerated: 0, totalOvr: 0 };

      if (state.currentWeek === 38) {
        const youthLevel = state.facilities?.youth || 0;
        const youthSpec = state.facilitySpecs?.youth || 'general';
        // Siempre 1 canterano por temporada â€" el nivel mejora su media
        const newPlayer = generateYouthPlayer(youthLevel, youthSpec);
        newYouthPlayers.push(newPlayer);
        updatedYouthStats = {
          playersGenerated: updatedYouthStats.playersGenerated + 1,
          totalOvr: updatedYouthStats.totalOvr + newPlayer.overall
        };
        updatedPlayers = [...updatedPlayers, ...newYouthPlayers];
      }

      // Generate facility event (15% chance per week if facilities > 0)
      let newEvent = null;
      if (!state.pendingEvent) {
        newEvent = generateFacilityEvent(state.facilities, updatedPlayers, state.currentWeek + 1);
      }

      // Generate messages
      const newMessages = [];

      if (newYouthPlayers.length > 0) {
        const specName = FACILITY_SPECIALIZATIONS.youth.options.find(o => o.id === state.facilitySpecs?.youth)?.name || 'General';
        const youthPlayer = newYouthPlayers[0];
        newMessages.push({
          id: Date.now(),
          type: 'youth',
          titleKey: 'gameMessages.newYouthPlayer',
          contentKey: 'gameMessages.youthPlayerContent', contentParams: { spec: specName, player: youthPlayer.name, position: youthPlayer.position, overall: youthPlayer.overall, age: youthPlayer.age },
          dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }
        });
      }

      // Stadium: Grass recovery (+5% per week, max 100)
      const GRASS_RECOVERY_PER_WEEK = 5;
      const currentGrass = state.stadium?.grassCondition ?? 100;
      const newGrassCondition = Math.min(100, currentGrass + GRASS_RECOVERY_PER_WEEK);

      // Update stadium state
      const updatedStadium = state.stadium ? {
        ...state.stadium,
        grassCondition: newGrassCondition
      } : state.stadium;

      // ============================================================
      // SIMULACIÃ"N DEL MERCADO GLOBAL
      // ============================================================
      const nextWeek = state.currentWeek + 1;
      // Calcular total de jornadas de liga basado en fixtures
      const totalWeeks = state.fixtures?.length > 0
        ? Math.max(...state.fixtures.map(f => f.week))
        : 38;
      const windowStatus = isTransferWindowOpen(nextWeek, {
        preseasonPhase: state.preseasonPhase || false,
        totalWeeks
      });
      let updatedLeagueTeams = state.leagueTeams || [];
      let marketSummary = state.globalMarket?.summary || { recentTransfers: [], activeRumors: [], totalTransfers: 0, totalSpent: 0 };
      let newTransferMessages = [];

      if (state.leagueTeams && state.leagueTeams.length > 0) {
        // Crear/restaurar el motor global
        const engine = new GlobalTransferEngine(new Map(), state.teamId);

        // Inicializar equipos con datos actuales
        const teamsData = state.leagueTeams.map(t => ({
          ...t,
          budget: t.budget || 50_000_000
        }));
        engine.initializeTeams(teamsData);
        engine.season = state.currentSeason || 1;

        // Simular semana de mercado
        const events = engine.simulateWeek(nextWeek, windowStatus.open, windowStatus.type);

        // Procesar eventos
        events.forEach(event => {
          if (event.type === 'transfer') {
            const t = event.data;
            // Solo crear notificación si involucra al equipo del jugador
            if (t.from?.id === state.teamId || t.to?.id === state.teamId) {
              newTransferMessages.push({
                id: Date.now() + Math.random(),
                type: 'transfer',
                titleKey: 'gameMessages.transferConfirmed',
                contentKey: 'gameMessages.transferConfirmedContent', contentParams: { player: t.player.name, position: t.player.position, overall: t.player.overall, toTeam: t.to.name, fromTeam: t.from.name, price: formatTransferPrice(t.price) },
                dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
              });
            }
            marketSummary.recentTransfers = [event.data, ...(marketSummary.recentTransfers || [])].slice(0, 30);
            marketSummary.totalTransfers = (marketSummary.totalTransfers || 0) + 1;
            marketSummary.totalSpent = (marketSummary.totalSpent || 0) + t.price;
          } else if (event.type === 'rumor') {
            marketSummary.activeRumors = [event.data, ...(marketSummary.activeRumors || [])].slice(0, 20);
          }
        });

        // Actualizar plantillas de todos los equipos
        updatedLeagueTeams = Array.from(engine.allTeams.values()).map(t => ({
          ...t,
          players: t.players,
          budget: t.budget
        }));
      }

      // ============================================================
      // OFERTAS ENTRANTES POR JUGADORES DEL USUARIO
      // 40% probabilidad base por día (80% en pretemporada)
      // Puede generar 1-4 ofertas cuando se activa
      // Pretemporada: mínimo 3-5 ofertas garantizadas en total
      // ============================================================
      let newIncomingOffers = [...(state.incomingOffers || [])];

      const isPreseason = state.preseasonPhase || false;
      // Pretemporada: 80% chance, temporada normal: 40% chance
      const offerChance = isPreseason ? 0.80 : 0.40;

      if (windowStatus.open && state.team?.players && Math.random() < offerChance) {
        // Cuántas ofertas hoy: 1-4 (más probable 1-2)
        const roll = Math.random();
        const numOffers = roll < 0.45 ? 1 : roll < 0.75 ? 2 : roll < 0.92 ? 3 : 4;

        // Cualquier jugador puede recibir ofertas (no filtrar por OVR)
        const eligiblePlayers = state.team.players
          .filter(p => !p.injured && !p.onLoan)
          .sort(() => Math.random() - 0.5); // Shuffle

        const usedNames = new Set();

        for (let i = 0; i < Math.min(numOffers, eligiblePlayers.length); i++) {
          const targetPlayer = eligiblePlayers[i];
          if (usedNames.has(targetPlayer.name)) continue;

          // Equipos interesados: presupuesto suficiente para el valor del jugador
          const marketValue = getPlayerMarketValueForOffers(targetPlayer);
          const interestedTeams = (state.leagueTeams || []).filter(t => {
            if (t.id === state.teamId) return false;
            return t.budget >= marketValue * 0.5;
          });

          if (interestedTeams.length > 0) {
            const buyer = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
            const offerAmount = Math.round(marketValue * (0.85 + Math.random() * 0.35)); // 85-120%

            // Caducidad: 1-2 semanas (ofertas altas más pacientes)
            const offerRatio = offerAmount / marketValue;
            const expiryWeeks = offerRatio >= 0.95 ? 2 : 1;
            const newOffer = {
              id: `incoming_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
              player: {
                name: targetPlayer.name,
                position: targetPlayer.position,
                overall: targetPlayer.overall,
                age: targetPlayer.age
              },
              fromTeam: buyer.name,
              fromTeamId: buyer.id,
              amount: offerAmount,
              salaryOffer: Math.round((targetPlayer.salary || 50000) * 1.3),
              status: 'pending',
              createdWeek: nextWeek,
              expiryWeek: nextWeek + expiryWeeks,
              createdAt: Date.now(),
              expiresAt: Date.now() + expiryWeeks * 7 * 24 * 60 * 60 * 1000
            };

            newIncomingOffers.push(newOffer);
            usedNames.add(targetPlayer.name);

            newTransferMessages.push({
              id: Date.now() + Math.random(),
              type: 'offer',
              titleKey: 'gameMessages.newOfferReceived',
              contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmount), player: targetPlayer.name },
              dateKey: isPreseason ? 'gameMessages.preseason' : 'gameMessages.weekDate', dateParams: isPreseason ? {} : { week: nextWeek }
            });
          }
        }
      }

      // Pretemporada: garantizar mínimo ofertas si no han llegado suficientes
      // Genera 1-2 ofertas extra si esta semana no se generó ninguna
      if (isPreseason && windowStatus.open && state.team?.players) {
        const offersThisRound = newIncomingOffers.length - (state.incomingOffers || []).length;
        if (offersThisRound === 0) {
          // Forzar al menos 1 oferta en pretemporada
          const eligibleForced = state.team.players
            .filter(p => !p.injured && !p.onLoan)
            .sort(() => Math.random() - 0.5);

          if (eligibleForced.length > 0) {
            const targetPlayer = eligibleForced[0];
            const marketValue = getPlayerMarketValueForOffers(targetPlayer);
            const potentialBuyers = (state.leagueTeams || []).filter(t => {
              if (t.id === state.teamId) return false;
              return t.budget >= marketValue * 0.3;
            });

            if (potentialBuyers.length > 0) {
              const buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];
              const offerAmount = Math.round(marketValue * (0.80 + Math.random() * 0.40));

              newIncomingOffers.push({
                id: `incoming_preseason_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                player: {
                  name: targetPlayer.name,
                  position: targetPlayer.position,
                  overall: targetPlayer.overall,
                  age: targetPlayer.age
                },
                fromTeam: buyer.name,
                fromTeamId: buyer.id,
                amount: offerAmount,
                salaryOffer: Math.round((targetPlayer.salary || 50000) * 1.3),
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 días en pretemporada
              });

              newTransferMessages.push({
                id: Date.now() + Math.random(),
                type: 'offer',
                titleKey: 'gameMessages.newOfferReceived',
                contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmount), player: targetPlayer.name },
                dateKey: 'gameMessages.preseason'
              });
            }
          }
        }
      }

      // ============================================================
      // OFERTAS GARANTIZADAS PARA JUGADORES EN VENTA (transferListed)
      // Si un jugador está puesto en venta, SIEMPRE recibe al menos 1 oferta
      // No depende de ventana de mercado â€" si lo pones en venta, llegan ofertas
      // ============================================================
      if (state.team?.players) {
        const listedPlayers = state.team.players.filter(p => p.transferListed && !p.onLoan);
        console.log('[OFFERS] Listed players:', listedPlayers.length, 'LeagueTeams:', (state.leagueTeams || []).length, 'Window:', windowStatus.open);
        for (const listedPlayer of listedPlayers) {
          // Check si ya tiene oferta pendiente
          const alreadyHasOffer = newIncomingOffers.some(
            o => o.player?.name === listedPlayer.name && o.status === 'pending'
          );
          if (!alreadyHasOffer) {
            // Buscar compradores: equipos con presupuesto suficiente (excluir nuestro equipo)
            const allTeams = state.leagueTeams || [];
            const potentialBuyers = allTeams.filter(t => {
              if (t.id === state.teamId) return false;
              return (t.budget || 0) >= 500_000; // Umbral más bajo para divisiones bajas
            });

            console.log('[OFFERS] Player:', listedPlayer.name, 'Buyers found:', potentialBuyers.length, 'AllTeams:', allTeams.length);

            // Si no hay compradores en leagueTeams, generar comprador sintético
            let buyer;
            if (potentialBuyers.length > 0) {
              buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];
            } else {
              // Fallback: equipo genérico interesado
              const fakeTeamNames = ['FC Esperanza', 'Atlético Progreso', 'CD Horizonte', 'UD Fénix', 'Racing Nuevo', 'CF Promesa', 'SD Aurora', 'Real Frontera'];
              buyer = {
                id: `fake_buyer_${Date.now()}`,
                name: fakeTeamNames[Math.floor(Math.random() * fakeTeamNames.length)],
                budget: 10_000_000
              };
            }

            const mktValue = getPlayerMarketValueForOffers(listedPlayer);
            // Oferta razonable: 80-120% del valor de mercado (mínimo â'¬50K)
            const offerAmt = Math.max(50_000, Math.round(mktValue * (0.80 + Math.random() * 0.40)));

            const listedOffer = {
              id: `incoming_listed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              player: {
                name: listedPlayer.name,
                position: listedPlayer.position,
                overall: listedPlayer.overall,
                age: listedPlayer.age
              },
              fromTeam: buyer.name,
              fromTeamId: buyer.id,
              amount: offerAmt,
              salaryOffer: Math.round((listedPlayer.salary || 50000) * 1.3),
              status: 'pending',
              createdAt: Date.now(),
              expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 días para dar margen
            };

            newIncomingOffers.push(listedOffer);

            newTransferMessages.push({
              id: Date.now() + Math.random(),
              type: 'offer',
              titleKey: 'gameMessages.offerForListedPlayer',
              contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmt), player: listedPlayer.name },
              dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
            });
          }
        }
      }

      // Limpiar ofertas recibidas expiradas (por semana o por timestamp)
      const expiredIncomingMessages = [];
      const expiredIncoming = newIncomingOffers.filter(o =>
        o.status === 'pending' && ((o.expiryWeek && nextWeek >= o.expiryWeek) || (o.expiresAt && o.expiresAt <= Date.now()))
      );
      if (expiredIncoming.length > 0) {
        expiredIncoming.forEach(o => {
          expiredIncomingMessages.push({
            id: Date.now() + Math.random(), type: 'offer',
            titleKey: 'gameMessages.offerExpired',
            contentKey: 'gameMessages.offerExpiredContent', contentParams: { team: o.fromTeam, player: o.player?.name },
            dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
          });
        });
      }
      newIncomingOffers = newIncomingOffers.filter(o =>
        o.status !== 'pending' || (
          (!o.expiryWeek || nextWeek < o.expiryWeek) &&
          (!o.expiresAt || o.expiresAt > Date.now())
        )
      );

      // ============================================================
      // EVALUACIÃ"N DEL MÍSTER (cada 3 semanas, o cada semana si bancarrota)
      // ============================================================
      const updatedMoney = state.money + totalIncome - salaryExpenses;
      const isBankrupt = updatedMoney < 0;
      let managerEval = { confidence: state.managerConfidence || 75, warning: null, fired: false, reason: null };
      if ((nextWeek > 5 && nextWeek % 3 === 0 && !state.preseasonPhase) || isBankrupt) {
        managerEval = evaluateManager({
          ...state,
          money: updatedMoney,
          currentWeek: nextWeek,
          team: { ...state.team, players: updatedPlayers }
        });

        const warningMsg = generateWarningMessage(managerEval, nextWeek);
        if (warningMsg) {
          newMessages.push(warningMsg);
        }
      }

      // ============================================================
      // EUROPEAN COMPETITIONS â€" Check for European matchday
      // v2: Uses dynamic calendar (intercalated weeks) when available
      // ============================================================
      let updatedEuropean = resolvedEuropean;
      let pendingEuropeanMatch = null;
      let europeanMessages = [];

      const isEuWeek = isEuropeanWeekDynamic(nextWeek, state.europeanCalendar);
      if (updatedEuropean && isEuWeek) {
        const phaseInfo = getPhaseForWeekCompat(nextWeek, state.europeanCalendar);

        if (phaseInfo && phaseInfo.phase === 'league') {
          // Swiss league phase matchday
          for (const [compId, compState] of Object.entries(updatedEuropean.competitions)) {
            if (!compState || compState.phase !== 'league') continue;

            const { updatedState, playerMatch } = simulateEuropeanMatchday(
              compState, phaseInfo.matchday, state.teamId
            );
            updatedEuropean = {
              ...updatedEuropean,
              competitions: {
                ...updatedEuropean.competitions,
                [compId]: updatedState
              }
            };

            if (playerMatch) {
              // Add competition context to player match
              pendingEuropeanMatch = {
                ...playerMatch,
                competitionId: compId,
                competitionName: compState.config?.name || compId,
                phase: 'league'
              };
            }

            // Check if league phase is over (matchday 8) â†' advance
            // BUT only if player doesn't have a pending match this matchday
            if (phaseInfo.matchday === 8 && updatedState.currentMatchday >= 8 && !playerMatch) {
              const advanced = advanceEuropeanPhase(updatedState, state.teamId);
              updatedEuropean.competitions[compId] = advanced.updatedState;
              europeanMessages.push(...advanced.messages);
              if (advanced.playerMatch) {
                pendingEuropeanMatch = {
                  ...advanced.playerMatch,
                  competitionId: compId,
                  competitionName: compState.config?.name || compId,
                  phase: advanced.updatedState.phase
                };
              }
            }
          }
        } else if (phaseInfo) {
          // Knockout phase weeks â€" advance competition phases
          for (const [compId, compState] of Object.entries(updatedEuropean.competitions)) {
            if (!compState || compState.phase === 'completed' || compState.phase === 'league') continue;

            const advanced = advanceEuropeanPhase(compState, state.teamId);
            updatedEuropean = {
              ...updatedEuropean,
              competitions: {
                ...updatedEuropean.competitions,
                [compId]: advanced.updatedState
              }
            };
            europeanMessages.push(...advanced.messages);
            if (advanced.playerMatch) {
              pendingEuropeanMatch = {
                ...advanced.playerMatch,
                competitionId: compId,
                competitionName: compState.config?.name || compId,
                phase: advanced.updatedState.phase
              };
            }
          }
        }
      }

      // Format European messages
      const formattedEuropeanMessages = europeanMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type || 'european',
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
      }));

      // ============================================================
      // SOUTH AMERICAN COMPETITIONS â€" Same intercalated week check
      // Uses the same calendar system (hasEuropean flag triggers SA weeks too)
      // ============================================================
      let updatedSA = resolvedSA;
      let pendingSAMatch = null;
      let saMessages = [];

      // SA competitions use the same intercalated weeks as European
      if (updatedSA && isEuWeek) {
        const phaseInfo = getPhaseForWeekCompat(nextWeek, state.europeanCalendar);

        if (phaseInfo && phaseInfo.phase === 'league') {
          for (const [compId, compState] of Object.entries(updatedSA.competitions)) {
            if (!compState || compState.phase !== 'league') continue;

            const { updatedState, playerMatch } = simulateSAMatchday(
              compState, phaseInfo.matchday, state.teamId
            );
            updatedSA = {
              ...updatedSA,
              competitions: { ...updatedSA.competitions, [compId]: updatedState }
            };

            if (playerMatch) {
              pendingSAMatch = {
                ...playerMatch,
                competitionId: compId,
                competitionName: compState.config?.name || compId,
                phase: 'league'
              };
            }

            if (phaseInfo.matchday === 8 && updatedState.currentMatchday >= 8 && !playerMatch) {
              const advanced = advanceSAPhase(updatedState, state.teamId);
              updatedSA.competitions[compId] = advanced.updatedState;
              saMessages.push(...advanced.messages);
              if (advanced.playerMatch) {
                pendingSAMatch = {
                  ...advanced.playerMatch,
                  competitionId: compId,
                  competitionName: compState.config?.name || compId,
                  phase: advanced.updatedState.phase
                };
              }
            }
          }
        } else if (phaseInfo) {
          for (const [compId, compState] of Object.entries(updatedSA.competitions)) {
            if (!compState || compState.phase === 'completed' || compState.phase === 'league') continue;

            const advanced = advanceSAPhase(compState, state.teamId);
            updatedSA = {
              ...updatedSA,
              competitions: { ...updatedSA.competitions, [compId]: advanced.updatedState }
            };
            saMessages.push(...advanced.messages);
            if (advanced.playerMatch) {
              pendingSAMatch = {
                ...advanced.playerMatch,
                competitionId: compId,
                competitionName: compState.config?.name || compId,
                phase: advanced.updatedState.phase
              };
            }
          }
        }
      }

      const formattedSAMessages = saMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type || 'southamerican',
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
      }));

      // ============================================================
      // CUP COMPETITION â€" Check for cup matchday
      // ============================================================
      let updatedCupCompetition = state.cupCompetition;
      let pendingCupMatch = null;
      let cupMessages = [];

      const isCupWeekNow = isCupWeek(nextWeek, state.europeanCalendar);
      if (isCupWeekNow && updatedCupCompetition && !updatedCupCompetition.winner) {
        const cupRoundIdx = getCupRoundForWeek(nextWeek, state.europeanCalendar);
        if (cupRoundIdx !== null && cupRoundIdx === updatedCupCompetition.currentRound) {
          // Build allTeamsData map for simulation
          const cupAllTeams = {};
          if (state.leagueTeams) {
            state.leagueTeams.forEach(t => { cupAllTeams[t.id] = t; });
          }
          if (state.team) {
            cupAllTeams[state.teamId] = state.team;
          }

          const { updatedBracket, playerMatch } = simulateCupRound(
            updatedCupCompetition,
            cupRoundIdx,
            state.teamId,
            cupAllTeams
          );
          updatedCupCompetition = updatedBracket;

          if (playerMatch && !updatedCupCompetition.playerEliminated) {
            pendingCupMatch = {
              ...playerMatch,
              cupName: updatedCupCompetition.config?.name || 'Copa',
              cupIcon: updatedCupCompetition.config?.icon || '🏆',
              cupShortName: updatedCupCompetition.config?.shortName || 'Copa',
              roundName: updatedCupCompetition.rounds[cupRoundIdx]?.name || `Ronda ${cupRoundIdx + 1}`
            };
          }

          // Mensaje si el jugador tenía bye
          if (!playerMatch && !updatedCupCompetition.playerEliminated) {
            // Player had a bye this round or all matches were auto-simulated
            const playerHadBye = updatedCupCompetition.rounds[cupRoundIdx]?.matches.some(
              m => m.bye && (m.homeTeam?.teamId === state.teamId)
            );
            if (playerHadBye) {
              cupMessages.push({
                id: Date.now() + Math.random(),
                type: 'cup',
                titleKey: 'gameMessages.cupByeTitle', titleParams: { icon: updatedCupCompetition.config?.icon || '🏆', cup: updatedCupCompetition.config?.shortName || 'Cup' },
                contentKey: 'gameMessages.cupByeContent',
                dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
              });
            }
          }

          // Comprobar si hay ganador
          if (updatedCupCompetition.winner) {
            const winnerName = updatedCupCompetition.rounds[updatedCupCompetition.rounds.length - 1]
              ?.matches[0]?.winnerId === state.teamId
              ? state.team?.name : 'otro equipo';
            cupMessages.push({
              id: Date.now() + Math.random(),
              type: 'cup',
              titleKey: 'gameMessages.cupFinishedTitle', titleParams: { icon: updatedCupCompetition.config?.icon || '🏆', cup: updatedCupCompetition.config?.name || 'Cup' },
              contentKey: updatedCupCompetition.winner === state.teamId ? 'gameMessages.cupWonContent' : 'gameMessages.cupWonByOther',
              contentParams: { cup: updatedCupCompetition.config?.name || 'Cup', winner: winnerName },
              dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
            });
          }
        }
      }

      // ============================================================
      // SIMULATE OTHER LEAGUES (all first-division leagues in parallel)
      // ============================================================
      let updatedOtherLeagues = state.otherLeagues;
      if (updatedOtherLeagues && Object.keys(updatedOtherLeagues).length > 0) {
        try {
          updatedOtherLeagues = simulateOtherLeaguesWeek(updatedOtherLeagues, nextWeek);
        } catch (e) {
          console.warn('Error simulating other leagues week', nextWeek, e);
        }
      }

      // ============================================================
      // CESIONES: Actualización semanal
      // ============================================================
      let updatedActiveLoans = [...(state.activeLoans || [])].map(loan => {
        if (loan.status === 'active' && loan.weeksRemaining > 0) {
          return { ...loan, weeksRemaining: loan.weeksRemaining - 1 };
        }
        return loan;
      });

      // Generar ofertas de cesión entrantes (20% chance durante ventana de mercado)
      let updatedIncomingLoanOffers = [...(state.incomingLoanOffers || [])];
      let loanOfferMessages = [];

      if (windowStatus.open && state.team?.players && Math.random() < 0.20) {
        const newLoanOffers = generateLoanOffers(
          state.team,
          state.leagueTeams || [],
          state.teamId
        );
        if (newLoanOffers.length > 0) {
          updatedIncomingLoanOffers = [...updatedIncomingLoanOffers, ...newLoanOffers];
          newLoanOffers.forEach(offer => {
            loanOfferMessages.push({
              id: Date.now() + Math.random(),
              type: 'loan',
              titleKey: 'gameMessages.loanOfferReceived',
              contentKey: 'gameMessages.loanOfferContent', contentParams: { team: offer.toTeamName, player: offer.playerData.name, fee: `€${(offer.loanFee / 1_000_000).toFixed(1)}M` },
              dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
            });
          });
        }
      }

      // Limpiar ofertas de cesión expiradas
      updatedIncomingLoanOffers = updatedIncomingLoanOffers.filter(o =>
        o.status !== 'pending' || (o.expiresAt && o.expiresAt > Date.now())
      );

      // Simular cesiones IA (sin notificaciones — no son relevantes para el jugador)
      if (windowStatus.open && updatedLeagueTeams.length > 0) {
        simulateAILoans(updatedLeagueTeams, state.teamId, updatedActiveLoans);
      }
      const aiLoanMessages = [];

      // === FORM SYSTEM: Update match tracker and form ===
      // Update match tracker: who played this week?
      // Players in convocados played, rest didn't
      const playedThisWeek = state.convocados || [];
      const updatedTracker = updateMatchTracker(
        state.matchTracker || {},
        state.team?.players || [],
        playedThisWeek
      );

      // Tick rejected transfer penalties
      const updatedRejected = tickRejectedTransfers(state.rejectedTransfers);

      // Calculate new form based on play/rest cycle
      const captainName = state.team?.players?.find(p => p.role === 'captain')?.name || null;
      const newForm = updateWeeklyForm(
        state.playerForm || {},
        state.team?.players || [],
        updatedTracker,
        {
          rejectedTransfers: updatedRejected,
          captainName
        }
      );

      // ============================================================
      // APERTURA-CLAUSURA: Detect tournament phase transition
      // for the player's league
      // ============================================================
      let updatedLeagueTable = state.leagueTable;
      let updatedAperturaTable = state.aperturaTable;
      let updatedCurrentTournament = state.currentTournament || 'apertura';

      if (isAperturaClausura(state.playerLeagueId)) {
        const playerConfig = LEAGUE_CONFIG[state.playerLeagueId];
        if (playerConfig) {
          const clausuraStart = getClausuraStartWeek(playerConfig.teams);
          if (nextWeek === clausuraStart && updatedCurrentTournament === 'apertura') {
            // Freeze Apertura table
            updatedAperturaTable = state.leagueTable.map(t => ({ ...t }));
            updatedCurrentTournament = 'clausura';
            // Reset league table for Clausura (zero stats, fresh start)
            updatedLeagueTable = state.leagueTable.map(entry => ({
              ...entry,
              played: 0, won: 0, drawn: 0, lost: 0,
              goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
              points: 0, form: [], homeForm: [], awayForm: [],
              streak: 0, morale: 70
            }));
          }
        }
      }

      // ============================================================
      // APERTURA-CLAUSURA FINAL: Detect end of Clausura for player's league
      // ============================================================
      let aperturaClausuraFinal = state.aperturaClausuraFinal || null;
      let pendingAperturaClausuraFinal = state.pendingAperturaClausuraFinal || null;
      let apclFinalMessages = [];

      if (isAperturaClausura(state.playerLeagueId) && updatedCurrentTournament === 'clausura' && !aperturaClausuraFinal && !pendingAperturaClausuraFinal) {
        const playerConfig = LEAGUE_CONFIG[state.playerLeagueId];
        if (playerConfig) {
          const lastWeek = getLastClausuraWeek(playerConfig.teams);
          // Detect: current week is the last clausura week (fixtures just played)
          // state.currentWeek is the week that was just played, nextWeek = currentWeek + 1
          if (state.currentWeek >= lastWeek) {
            // Clausura just ended â€" determine Apertura & Clausura champions
            const sortedApertura = updatedAperturaTable ? sortTable([...updatedAperturaTable]) : [];
            const sortedClausura = sortTable([...updatedLeagueTable]);
            const aperturaChampId = sortedApertura[0]?.teamId;
            const clausuraChampId = sortedClausura[0]?.teamId;

            if (aperturaChampId && clausuraChampId) {
              const playerTeamId = state.teamId;
              const playerIsFinalTeam = (playerTeamId === aperturaChampId || playerTeamId === clausuraChampId);

              if (aperturaChampId === clausuraChampId) {
                // Same team won both â€" champion directly
                aperturaClausuraFinal = {
                  aperturaChampion: aperturaChampId,
                  aperturaChampionName: sortedApertura[0]?.teamName || aperturaChampId,
                  clausuraChampion: clausuraChampId,
                  clausuraChampionName: sortedClausura[0]?.teamName || clausuraChampId,
                  winner: aperturaChampId,
                  winnerName: sortedApertura[0]?.teamName || aperturaChampId,
                  winReason: 'sameChampion',
                  hadFinal: false
                };
                apclFinalMessages.push({
                  id: Date.now() + 500,
                  type: 'league',
                  titleKey: 'gameMessages.leagueChampion',
                  contentKey: 'gameMessages.directChampion', contentParams: { team: sortedApertura[0]?.teamName, league: LEAGUE_CONFIG[state.playerLeagueId]?.name || 'Liga' },
                  dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
                });
              } else if (playerIsFinalTeam) {
                // Player is in the final â€" set pending for interactive play
                const allTeams = playerConfig.getTeams();
                const aperturaTeam = allTeams.find(t => t.id === aperturaChampId);
                const clausuraTeam = allTeams.find(t => t.id === clausuraChampId);
                pendingAperturaClausuraFinal = {
                  aperturaChampion: aperturaChampId,
                  aperturaChampionName: aperturaTeam?.name || sortedApertura[0]?.teamName || aperturaChampId,
                  clausuraChampion: clausuraChampId,
                  clausuraChampionName: clausuraTeam?.name || sortedClausura[0]?.teamName || clausuraChampId,
                  leagueId: state.playerLeagueId,
                  leagueName: LEAGUE_CONFIG[state.playerLeagueId]?.name || 'Liga'
                };
                apclFinalMessages.push({
                  id: Date.now() + 500,
                  type: 'league',
                  titleKey: 'gameMessages.aperturaClausuraFinal',
                  contentKey: 'gameMessages.aperturaClausuraFinalContent', contentParams: { league: LEAGUE_CONFIG[state.playerLeagueId]?.name || 'Liga', apertura: sortedApertura[0]?.teamName, clausura: sortedClausura[0]?.teamName },
                  dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
                });
              } else {
                // Player is NOT in the final â€" auto-simulate
                const allTeams = playerConfig.getTeams();
                aperturaClausuraFinal = simulateAperturaClausuraFinal(aperturaChampId, clausuraChampId, allTeams);
                if (aperturaClausuraFinal) {
                  const winReasonText = aperturaClausuraFinal.winReason === 'aggregate' ? 'por resultado global'
                    : aperturaClausuraFinal.winReason === 'awayGoals' ? 'por goles de visitante'
                    : 'por ventaja deportiva';
                  apclFinalMessages.push({
                    id: Date.now() + 500,
                    type: 'league',
                    titleKey: 'gameMessages.aperturaClausuraFinalResult',
                    contentKey: 'gameMessages.aperturaClausuraFinalResultContent',
                    contentParams: { winner: aperturaClausuraFinal.winnerName, league: LEAGUE_CONFIG[state.playerLeagueId]?.name || 'Liga', leg1Home: aperturaClausuraFinal.leg1.homeScore, leg1Away: aperturaClausuraFinal.leg1.awayScore, leg2Home: aperturaClausuraFinal.leg2.homeScore, leg2Away: aperturaClausuraFinal.leg2.awayScore },
                    dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
                  });
                }
              }
            }
          }
        }
      }

      // ============================================================
      // CONTRARRELOJ: Check bankrupt condition
      // ============================================================
      let finalMoney = state.money + totalIncome - salaryExpenses;
      let contrarrelojUpdate = state.contrarrelojData;
      let contrarrelojScreenOverride = null;

      if (state.gameMode === 'contrarreloj' && contrarrelojUpdate && !contrarrelojUpdate.finished) {
        // Bankrupt check
        if (finalMoney < 0) {
          contrarrelojUpdate = {
            ...contrarrelojUpdate,
            won: false,
            finished: true,
            loseReason: 'bankrupt'
          };
          contrarrelojScreenOverride = 'contrarreloj_end';
        }
        // Fired check
        else if (managerEval.fired) {
          contrarrelojUpdate = {
            ...contrarrelojUpdate,
            won: false,
            finished: true,
            loseReason: 'fired'
          };
          contrarrelojScreenOverride = 'contrarreloj_end';
        }
      }

      // ============================================================
      // PROCESAR OFERTAS PENDIENTES DEL USUARIO (estilo PC Gaffer)
      // Las ofertas se envían y se resuelven al simular un partido.
      // El dinero ya fue descontado al enviar. Se devuelve si rechazan.
      // Caducidad: 1-3 semanas según oferta. Ofertas expiradas → devuelven dinero.
      // ============================================================
      let resolvedOutgoingOffers = [...(state.outgoingOffers || [])];
      let offerMessages = [];
      let moneyReturned = 0; // Dinero devuelto por rechazos/expiraciones

      resolvedOutgoingOffers = resolvedOutgoingOffers.map(offer => {
        if (offer.status !== 'pending') {
          // Limpiar ofertas resueltas antiguas (> 3 semanas desde resolución)
          if (offer.status === 'resolved' && offer.resolvedWeek && nextWeek - offer.resolvedWeek > 3) {
            return null; // Marcar para eliminar
          }
          // Caducidad de contraofertas sin respuesta (2 semanas)
          if (offer.status === 'resolved' && offer.clubResponse === 'countered' && offer.resolvedWeek && nextWeek - offer.resolvedWeek > 2) {
            moneyReturned += offer.amount;
            offerMessages.push({
              id: Date.now() + Math.random(), type: 'transfer',
              titleKey: 'gameMessages.counterOfferExpired', titleParams: { player: offer.playerName },
              contentKey: 'gameMessages.counterOfferExpiredContent', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) },
              dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
            });
            return null;
          }
          return offer;
        }

        // Calcular caducidad: ofertas altas (>90% valor) = 3 sem, medias = 2 sem, bajas = 1 sem
        const weeksPending = nextWeek - (offer.submittedWeek || nextWeek);
        const targetTeam = updatedLeagueTeams.find(t => t.id === offer.toTeamId);
        const targetPlayer = targetTeam ? (targetTeam.players || []).find(p => p.name === offer.playerName) : null;

        if (!targetTeam || !targetPlayer) {
          moneyReturned += offer.amount;
          offerMessages.push({
            id: Date.now() + Math.random(), type: 'transfer',
            titleKey: 'gameMessages.offerCancelled', titleParams: { player: offer.playerName },
            contentKey: 'gameMessages.playerUnavailableRefund', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) },
            dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
          });
          return null;
        }

        const playerMarketValue = calculateMarketValue(targetPlayer, targetTeam.leagueId);
        const offerRatio = offer.amount / playerMarketValue;
        // Caducidad: ofertas generosas = 3 sem, razonables = 2 sem, bajas = 1 sem
        const expiryWeeks = offerRatio >= 0.90 ? 3 : offerRatio >= 0.70 ? 2 : 1;

        // ¿Ha expirado?
        if (weeksPending >= expiryWeeks) {
          moneyReturned += offer.amount;
          offerMessages.push({
            id: Date.now() + Math.random(), type: 'transfer',
            titleKey: 'gameMessages.offerExpiredPlayer', titleParams: { player: offer.playerName },
            contentKey: 'gameMessages.offerExpiredRefund', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) },
            dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
          });
          return null;
        }

        // Solo resolver tras al menos 1 semana de espera
        if (weeksPending < 1) return offer;

        const isStarter = targetPlayer.overall >= (targetTeam.players || []).reduce((sum, p) => sum + p.overall, 0) / (targetTeam.players?.length || 1) + 3;

        // --- RESPUESTA DEL CLUB ---
        let clubResponse = 'rejected';
        let clubReason = '';
        let clubCounterAmount = null;

        if (isStarter && offerRatio < 1.3) {
          clubResponse = 'rejected';
          clubReason = 'Titular indiscutible, no está en venta';
        } else if (offerRatio >= 1.15) {
          clubResponse = 'accepted';
          clubReason = 'Oferta irrechazable';
        } else if (offerRatio >= 0.90) {
          if (Math.random() < 0.65) {
            clubResponse = 'accepted';
            clubReason = 'Oferta aceptada';
          } else {
            clubResponse = 'countered';
            clubCounterAmount = Math.round(playerMarketValue * (1.05 + Math.random() * 0.15));
            clubReason = `Piden ${formatTransferPrice(clubCounterAmount)}`;
          }
        } else if (offerRatio >= 0.70) {
          if (Math.random() < 0.2) {
            clubResponse = 'accepted';
            clubReason = 'Necesitan liquidez';
          } else if (Math.random() < 0.6) {
            clubResponse = 'countered';
            clubCounterAmount = Math.round(playerMarketValue * (1.1 + Math.random() * 0.2));
            clubReason = `Piden ${formatTransferPrice(clubCounterAmount)}`;
          } else {
            clubReason = 'Oferta insuficiente';
          }
        } else {
          clubReason = 'Oferta irrisoria';
        }

        // --- RESPUESTA DEL JUGADOR ---
        let playerResponse = 'rejected';
        let playerReason = '';
        const requiredSalary = Math.round((targetPlayer.salary || 50000) * 1.1);

        if (offer.salaryOffer >= requiredSalary * 1.2) {
          playerResponse = 'accepted';
          playerReason = 'Encantado con la propuesta';
        } else if (offer.salaryOffer >= requiredSalary * 0.95) {
          if (Math.random() < 0.7) {
            playerResponse = 'accepted';
            playerReason = 'Acepta el proyecto deportivo';
          } else {
            playerReason = 'Quiere un salario mayor';
          }
        } else if (offer.salaryOffer >= requiredSalary * 0.7) {
          if (Math.random() < 0.25) {
            playerResponse = 'accepted';
            playerReason = 'Le convence el proyecto';
          } else {
            playerReason = 'Salario insuficiente';
          }
        } else {
          playerReason = 'Oferta salarial irrisoria';
        }

        // Resultado final
        const bothAccepted = clubResponse === 'accepted' && playerResponse === 'accepted';
        const resolved = {
          ...offer,
          status: 'resolved',
          clubResponse,
          clubReason,
          clubCounterAmount,
          playerResponse,
          playerReason,
          resolvedWeek: nextWeek,
          expiryWeek: nextWeek + 2 // Contraofertas caducan en 2 semanas
        };

        // Generar mensaje
        const icon = bothAccepted ? '✅' : clubResponse === 'countered' ? '🔄' : '❌';
        offerMessages.push({
          id: Date.now() + Math.random(),
          type: 'transfer',
          titleKey: bothAccepted ? 'gameMessages.transferComplete' : 'gameMessages.offerResponse',
          titleParams: { player: offer.playerName, icon },
          contentKey: bothAccepted ? 'gameMessages.transferCompleteContent' : 'gameMessages.offerRejectedContent',
          contentParams: bothAccepted
            ? { player: offer.playerName, cost: formatTransferPrice(offer.amount) }
            : { clubReason, playerReason },
          dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
        });

        // Si ambos aceptan → fichaje completado (dinero ya descontado)
        if (bothAccepted) {
          const newPlayer = {
            ...targetPlayer,
            salary: offer.salaryOffer,
            contractYears: offer.contractYears || 4,
            teamId: state.teamId,
            morale: 80,
            fitness: 100
          };
          updatedPlayers = [...updatedPlayers, newPlayer];
          updatedLeagueTeams = updatedLeagueTeams.map(t => {
            if (t.id === offer.toTeamId) {
              return { ...t, players: (t.players || []).filter(p => p.name !== offer.playerName), budget: (t.budget || 50_000_000) + offer.amount };
            }
            return t;
          });
        } else {
          // Rechazado por alguno → devolver dinero (salvo contraoferta pendiente)
          if (clubResponse !== 'countered') {
            moneyReturned += offer.amount;
          }
        }

        return resolved;
      }).filter(Boolean); // Eliminar nulls (expiradas/limpiadas)

      // Aplicar dinero devuelto
      finalMoney += moneyReturned;

      return {
        ...state,
        currentWeek: nextWeek,
        leagueTable: updatedLeagueTable,
        aperturaTable: updatedAperturaTable,
        currentTournament: updatedCurrentTournament,
        aperturaClausuraFinal: aperturaClausuraFinal,
        pendingAperturaClausuraFinal: pendingAperturaClausuraFinal,
        money: finalMoney,
        weeklyIncome: totalIncome,
        weeklyExpenses: salaryExpenses,
        team: state.team ? { ...state.team, players: updatedPlayers } : null,
        stadium: updatedStadium,
        messages: [...expiredIncomingMessages, ...offerMessages, ...apclFinalMessages, ...cupMessages, ...formattedEuropeanMessages, ...formattedSAMessages, ...newTransferMessages, ...loanOfferMessages, ...aiLoanMessages, ...newMessages, ...state.messages].slice(0, 50),
        outgoingOffers: resolvedOutgoingOffers,
        pendingEvent: newEvent || state.pendingEvent,
        facilityStats: {
          ...state.facilityStats,
          youth: updatedYouthStats
        },
        medicalTreatmentsUsed: 0, // Reset treatments each week
        // Mercado global
        leagueTeams: updatedLeagueTeams,
        incomingOffers: newIncomingOffers,
        globalMarket: {
          ...state.globalMarket,
          summary: marketSummary,
          windowOpen: windowStatus.open,
          windowType: windowStatus.type
        },
        // Evaluación del míster
        managerConfidence: managerEval.confidence,
        managerFired: managerEval.fired,
        // European competitions
        europeanCompetitions: updatedEuropean,
        pendingEuropeanMatch,
        // South American competitions
        saCompetitions: updatedSA,
        pendingSAMatch,
        // European calendar (preserved from season setup)
        europeanCalendar: state.europeanCalendar,
        // Cup competition
        cupCompetition: updatedCupCompetition,
        pendingCupMatch,
        // Other leagues (simulated each week)
        otherLeagues: updatedOtherLeagues,
        // Form system
        playerForm: newForm,
        matchTracker: updatedTracker,
        rejectedTransfers: updatedRejected,
        // Cesiones
        activeLoans: updatedActiveLoans,
        incomingLoanOffers: updatedIncomingLoanOffers,
        // Contrarreloj
        contrarrelojData: contrarrelojUpdate,
        ...(contrarrelojScreenOverride ? { currentScreen: contrarrelojScreenOverride } : {})
      };
    }

    case 'ADVANCE_WEEKS_BATCH': {
      // Run ADVANCE_WEEK N times in a single reducer call (1 re-render instead of N)
      const count = action.payload?.count || 1;
      let currentState = state;
      for (let i = 0; i < count; i++) {
        currentState = gameReducer(currentState, { type: 'ADVANCE_WEEK' });
        // Early exit if manager fired, contrarreloj ended, or season screen changed
        if (currentState.managerFired || currentState.contrarrelojData?.finished) break;
      }
      return currentState;
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [action.payload, ...state.messages].slice(0, 50)
      };

    case 'SET_FORMATION':
      return { ...state, formation: action.payload };

    case 'SET_TACTIC':
      return { ...state, tactic: action.payload };

    case 'CLEAR_RESOLVED_OFFERS':
      return {
        ...state,
        outgoingOffers: (state.outgoingOffers || []).filter(o => o.status === 'pending')
      };

    case 'SET_LINEUP':
      return { ...state, lineup: action.payload };

    case 'SET_MANAGER_FIRED':
      return {
        ...state,
        managerFired: true,
        managerFiredReason: action.payload?.reason || 'La directiva ha prescindido de tus servicios'
      };

    case 'SET_CONVOCADOS':
      return { ...state, convocados: action.payload };

    case 'ADD_TRANSFER_OFFER':
      return {
        ...state,
        transferOffers: [...state.transferOffers, action.payload]
      };

    case 'REMOVE_TRANSFER_OFFER':
      return {
        ...state,
        transferOffers: state.transferOffers.filter(o => o.id !== action.payload)
      };

    case 'UPDATE_TRANSFER_OFFER':
      return {
        ...state,
        transferOffers: state.transferOffers.map(o =>
          o.id === action.payload.id ? action.payload : o
        )
      };

    case 'SIGN_PLAYER': {
      // Block signing if can't afford it
      if (state.money < action.payload.fee) return state;
      const newPlayer = {
        ...action.payload.player,
        role: action.payload.player.role || assignRole(action.payload.player)
      };
      return {
        ...state,
        team: {
          ...state.team,
          players: [...state.team.players, newPlayer]
        },
        money: state.money - action.payload.fee
      };
    }

    case 'SELL_PLAYER':
      return {
        ...state,
        team: {
          ...state.team,
          players: state.team.players.filter(p => p.name !== action.payload.playerName)
        },
        money: state.money + action.payload.fee
      };

    case 'UPGRADE_FACILITY':
      return {
        ...state,
        facilities: {
          ...state.facilities,
          [action.payload.facilityId]: (state.facilities[action.payload.facilityId] || 0) + 1
        },
        money: state.money - action.payload.cost
      };

    case 'BLOCK_PLAYER': {
      // Bloquear un jugador tras fichaje fallido (hasta fin de temporada)
      const playerId = action.payload;
      const currentBlocked = state.blockedPlayers || [];
      if (currentBlocked.includes(playerId)) return state;
      return {
        ...state,
        blockedPlayers: [...currentBlocked, playerId]
      };
    }

    case 'UPDATE_STADIUM':
      return {
        ...state,
        stadium: { ...state.stadium, ...action.payload }
      };

    // ============================================================
    // MERCADO GLOBAL V2
    // ============================================================

    case 'SET_GLOBAL_MARKET':
      return {
        ...state,
        globalMarket: action.payload
      };

    case 'ADD_OUTGOING_OFFER':
      // Descontar dinero al enviar la oferta (se devuelve si rechazan)
      return {
        ...state,
        outgoingOffers: [...(state.outgoingOffers || []), action.payload],
        money: state.money - (action.payload.amount || 0)
      };

    case 'UPDATE_OUTGOING_OFFER':
      return {
        ...state,
        outgoingOffers: (state.outgoingOffers || []).map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload } : o
        )
      };

    case 'REMOVE_OUTGOING_OFFER':
      return {
        ...state,
        outgoingOffers: (state.outgoingOffers || []).filter(o => o.id !== action.payload)
      };

    case 'ADD_INCOMING_OFFER':
      return {
        ...state,
        incomingOffers: [...(state.incomingOffers || []), action.payload]
      };

    case 'UPDATE_INCOMING_OFFER':
      return {
        ...state,
        incomingOffers: (state.incomingOffers || []).map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload } : o
        )
      };

    case 'REMOVE_INCOMING_OFFER':
      return {
        ...state,
        incomingOffers: (state.incomingOffers || []).filter(o => o.id !== action.payload)
      };

    case 'ADD_TRANSFER_NEWS':
      return {
        ...state,
        transferNews: [...(state.transferNews || []).slice(-50), action.payload]
      };

    case 'UPDATE_LEAGUE_TEAMS':
      return {
        ...state,
        leagueTeams: applyTeamsSalaries(action.payload)
      };

    case 'REMOVE_FREE_AGENT':
      return {
        ...state,
        freeAgents: (state.freeAgents || []).filter(p => p.name !== action.payload.playerName)
      };

    // ============================================================
    // GESTIÃ"N DE OFERTAS
    // ============================================================

    case 'ACCEPT_INCOMING_OFFER': {
      // Usuario acepta vender jugador
      const offer = action.payload;
      const soldPlayer = state.team.players.find(p => p.name === offer.player.name);
      if (!soldPlayer) return state;

      // Quitar jugador del equipo
      const updatedPlayers = state.team.players.filter(p => p.name !== offer.player.name);

      // Limpiar lineup si estaba
      const cleanedLineup = {};
      if (state.lineup) {
        Object.entries(state.lineup).forEach(([slot, p]) => {
          if (p && p.name !== offer.player.name) {
            cleanedLineup[slot] = p;
          }
        });
      }

      // Actualizar leagueTeams - añadir jugador al equipo comprador
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === offer.fromTeamId) {
          return {
            ...t,
            players: [...(t.players || []), { ...soldPlayer, teamId: t.id, contractYears: 4 }],
            budget: (t.budget || 50_000_000) - offer.amount
          };
        }
        return t;
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(cleanedLineup, updatedPlayers, state.formation),
        money: state.money + offer.amount,
        leagueTeams: updatedLeagueTeams,
        incomingOffers: (state.incomingOffers || []).filter(o => o.id !== offer.id),
        messages: [{
          id: Date.now(),
          type: 'transfer',
          titleKey: 'gameMessages.saleComplete',
          contentKey: 'gameMessages.saleCompleteContent', contentParams: { player: offer.player.name, team: offer.fromTeam, amount: formatTransferPrice(offer.amount) },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'REJECT_INCOMING_OFFER': {
      const offer = action.payload;
      return {
        ...state,
        incomingOffers: (state.incomingOffers || []).map(o =>
          o.id === offer.id ? { ...o, status: 'rejected' } : o
        )
      };
    }

    case 'REJECT_TRANSFER_PENALTY': {
      const { playerName, offerQuality } = action.payload;
      const totalWeeks = offerQuality === 'excellent' ? 8 : offerQuality === 'good' ? 5 : 3;
      const updatedRejected = {
        ...state.rejectedTransfers,
        [playerName]: { weeksLeft: totalWeeks, totalWeeks, quality: offerQuality }
      };
      const updatedForm = { ...state.playerForm };
      updatedForm[playerName] = 'terrible'; // Immediate effect

      return { ...state, rejectedTransfers: updatedRejected, playerForm: updatedForm };
    }

    case 'COUNTER_INCOMING_OFFER': {
      const offer = action.payload;
      const counterAmount = Math.round(offer.amount * 1.3);
      // 60% chance the buying team accepts the counter
      const accepts = Math.random() < 0.6;
      if (accepts) {
        return {
          ...state,
          incomingOffers: (state.incomingOffers || []).map(o =>
            o.id === offer.id ? { ...o, amount: counterAmount, status: 'pending', counterAccepted: true } : o
          ),
          messages: [{
            id: Date.now(),
            type: 'offer',
            titleKey: 'gameMessages.counterOfferAccepted',
            contentKey: 'gameMessages.counterOfferAcceptedContent', contentParams: { team: offer.fromTeam, amount: formatTransferPrice(counterAmount), player: offer.player.name },
            dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
          }, ...state.messages].slice(0, 50)
        };
      } else {
        return {
          ...state,
          incomingOffers: (state.incomingOffers || []).map(o =>
            o.id === offer.id ? { ...o, status: 'rejected', counterRejected: true } : o
          ),
          messages: [{
            id: Date.now(),
            type: 'offer',
            titleKey: 'gameMessages.counterOfferRejected',
            contentKey: 'gameMessages.counterOfferRejectedContent', contentParams: { team: offer.fromTeam, amount: formatTransferPrice(counterAmount), player: offer.player.name },
            dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
          }, ...state.messages].slice(0, 50)
        };
      }
    }

    case 'PROCESS_OUTGOING_OFFER': {
      // Simular respuesta de la IA a oferta del usuario
      const offer = action.payload;
      const targetTeam = (state.leagueTeams || []).find(t => t.id === offer.toTeamId);
      if (!targetTeam) return state;

      const targetPlayer = (targetTeam.players || []).find(p => p.name === offer.player.name);
      if (!targetPlayer) return state;

      const marketValue = calculateMarketValue(targetPlayer, targetTeam.leagueId);
      const offerRatio = offer.amount / marketValue;

      // Decidir respuesta
      let response = 'rejected';
      let counterAmount = null;

      if (offerRatio >= 1.1) {
        // Oferta generosa - aceptar
        response = 'accepted';
      } else if (offerRatio >= 0.85) {
        // Oferta razonable - 60% aceptar, 40% contraoferta
        response = Math.random() < 0.6 ? 'accepted' : 'countered';
        if (response === 'countered') {
          counterAmount = Math.round(marketValue * (1.05 + Math.random() * 0.15));
        }
      } else if (offerRatio >= 0.7) {
        // Oferta baja - 20% aceptar, 50% contraoferta, 30% rechazar
        const roll = Math.random();
        if (roll < 0.2) response = 'accepted';
        else if (roll < 0.7) {
          response = 'countered';
          counterAmount = Math.round(marketValue * (1.1 + Math.random() * 0.2));
        }
      }
      // Si < 0.7, queda rechazado

      const updatedOffer = {
        ...offer,
        status: response,
        counterAmount: counterAmount,
        respondedAt: Date.now()
      };

      let newState = {
        ...state,
        outgoingOffers: (state.outgoingOffers || []).map(o =>
          o.id === offer.id ? updatedOffer : o
        )
      };

      // Si fue aceptada, completar la transferencia
      if (response === 'accepted') {
        const newPlayer = {
          ...targetPlayer,
          teamId: state.teamId,
          contractYears: 4,
          salary: Math.round((targetPlayer.salary || 50000) * 1.2)
        };

        newState = {
          ...newState,
          team: {
            ...state.team,
            players: [...state.team.players, newPlayer]
          },
          money: state.money - offer.amount,
          leagueTeams: (state.leagueTeams || []).map(t => {
            if (t.id === offer.toTeamId) {
              return {
                ...t,
                players: (t.players || []).filter(p => p.name !== targetPlayer.name),
                budget: (t.budget || 50_000_000) + offer.amount
              };
            }
            return t;
          }),
          messages: [{
            id: Date.now(),
            type: 'transfer',
            titleKey: 'gameMessages.transferComplete',
            contentKey: 'gameMessages.transferCompleteContent', contentParams: { player: targetPlayer.name, cost: formatTransferPrice(offer.amount) },
            dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
          }, ...state.messages].slice(0, 50)
        };
      }

      return newState;
    }

    case 'ACCEPT_COUNTER_OFFER': {
      const offer = action.payload;
      const targetTeam = (state.leagueTeams || []).find(t => t.id === offer.toTeamId);
      if (!targetTeam) return state;
      const playerName = offer.playerName || offer.player?.name;
      const targetPlayer = (targetTeam.players || []).find(p => p.name === playerName);
      if (!targetPlayer) return state;
      const finalAmount = offer.clubCounterAmount || offer.counterAmount || offer.amount;
      // El dinero original (offer.amount) ya fue descontado al enviar.
      // Solo descontar la DIFERENCIA entre contraoferta y oferta original.
      const extraCost = finalAmount - (offer.amount || 0);
      if (state.money < extraCost) return state;

      const newPlayer = {
        ...targetPlayer,
        teamId: state.teamId,
        salary: offer.salaryOffer || targetPlayer.salary,
        contractYears: offer.contractYears || 4,
        role: assignRole(targetPlayer)
      };

      return {
        ...state,
        team: { ...state.team, players: [...state.team.players, newPlayer] },
        money: state.money - extraCost,
        leagueTeams: (state.leagueTeams || []).map(t => {
          if (t.id === offer.toTeamId) {
            return {
              ...t,
              players: (t.players || []).filter(p => p.name !== targetPlayer.name),
              budget: (t.budget || 50_000_000) + finalAmount
            };
          }
          return t;
        }),
        outgoingOffers: (state.outgoingOffers || []).filter(o => o.id !== offer.id),
        messages: [{
          id: Date.now(),
          type: 'transfer',
          titleKey: 'gameMessages.transferComplete',
          contentKey: 'gameMessages.transferCompleteCounterContent', contentParams: { player: targetPlayer.name, cost: formatTransferPrice(finalAmount) },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    // RECORD_MATCH_INCOME removed â€" income is accumulated via UPDATE_STADIUM dispatches

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(m => m.id !== action.payload)
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      };

    case 'UPDATE_TEAM':
      return { ...state, team: action.payload };

    case 'UPDATE_PLAYER':
      return {
        ...state,
        team: {
          ...state.team,
          players: state.team.players.map(p =>
            p.name === action.payload.name ? action.payload : p
          )
        }
      };

    case 'REMOVE_PLAYER': {
      const remainingPlayers = state.team.players.filter(p => p.name !== action.payload);
      const lineupAfterRemove = {};
      if (state.lineup) {
        Object.entries(state.lineup).forEach(([slot, p]) => {
          if (p && p.name !== action.payload) {
            lineupAfterRemove[slot] = p;
          }
        });
      }
      return {
        ...state,
        team: { ...state.team, players: remainingPlayers },
        lineup: ensureFullLineup(lineupAfterRemove, remainingPlayers, state.formation),
        convocados: (state.convocados || []).filter(name => name !== action.payload)
      };
    }

    case 'INJURE_PLAYER': {
      // Centro médico reduce tiempo de lesiones (nivel base + especialización recuperación)
      const medicalLevel = state.facilities?.medical || 0;
      const medicalReduction = [0, 0.20, 0.35, 0.50][medicalLevel];
      const recoverySpecBonus = state.facilitySpecs?.medical === 'recovery' ? 0.50 : 0;
      const totalReduction = Math.min(0.75, medicalReduction + recoverySpecBonus); // Cap 75%
      const baseWeeks = action.payload.weeksOut;
      const reducedWeeks = Math.max(1, Math.round(baseWeeks * (1 - totalReduction)));

      // Lesión grave = más de 6 semanas
      const isSevere = baseWeeks >= 6;

      const updatedPlayers = state.team.players.map(p => {
        if (p.name === action.payload.playerName) {
          // Trackear lesiones graves consecutivas
          const currentSevereCount = p.severeInjuryCount || 0;
          const newSevereCount = isSevere ? currentSevereCount + 1 : 0; // Reset si no es grave

          // Check si decide retirarse por lesiones (2+ graves seguidas, >30 años)
          let willRetire = p.retiring || false;
          if (newSevereCount >= 2 && (p.age || 25) >= 30 && Math.random() < 0.25) {
            willRetire = true;
          }

          return {
            ...p,
            injured: true,
            injuryWeeksLeft: reducedWeeks,
            injuryType: action.payload.severity,
            severeInjuryCount: newSevereCount,
            retiring: willRetire
          };
        }
        return p;
      });
      return {
        ...state,
        team: { ...state.team, players: updatedPlayers }
      };
    }

    case 'ADD_YELLOW_CARDS': {
      // payload: { cards: [{ playerName: string }] }
      // Solo suma amarillas acumuladas (NO doble amarilla del mismo partido, eso viene como red_card)
      const cards = action.payload.cards || [];
      if (cards.length === 0) return state;

      const newlySuspendedYellow = new Set();
      const updatedPlayers = state.team.players.map(p => {
        const cardCount = cards.filter(c => c.playerName === p.name).length;
        if (cardCount === 0) return p;

        const newYellows = (p.yellowCards || 0) + cardCount;

        if (newYellows >= 5) {
          // 5 amarillas acumuladas = 1 partido de sanción, reset contador
          newlySuspendedYellow.add(p.name);
          return {
            ...p,
            yellowCards: 0,
            suspended: true,
            suspensionType: 'yellow',
            suspensionMatches: 1
          };
        }
        return { ...p, yellowCards: newYellows };
      });

      // Auto-sacar del lineup si se sancionó por acumulación
      let lineupYellow = state.lineup || {};
      if (newlySuspendedYellow.size > 0) {
        lineupYellow = { ...lineupYellow };
        Object.keys(lineupYellow).forEach(slot => {
          if (lineupYellow[slot] && newlySuspendedYellow.has(lineupYellow[slot].name)) {
            delete lineupYellow[slot];
          }
        });
      }

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(lineupYellow, updatedPlayers, state.formation)
      };
    }

    case 'ADD_RED_CARDS': {
      // payload: { cards: [{ playerName: string, reason: string }] }
      // Doble amarilla = 1 partido, Roja directa = 2 partidos
      const redCards = action.payload.cards || [];
      if (redCards.length === 0) return state;

      const suspendedNames_red = new Set(redCards.map(c => c.playerName));

      const updatedPlayers = state.team.players.map(p => {
        const card = redCards.find(c => c.playerName === p.name);
        if (!card) return p;

        const isDoubleYellow = card.reason === 'Segunda amarilla';
        const matchesBanned = isDoubleYellow ? 1 : 2; // Doble amarilla = 1, Roja directa = 2

        return {
          ...p,
          suspended: true,
          suspensionType: isDoubleYellow ? 'double_yellow' : 'red',
          suspensionMatches: matchesBanned
        };
      });

      // Auto-sacar del lineup a los recién sancionados
      const currentLineup_red = state.lineup || {};
      const cleanedLineup_red = { ...currentLineup_red };
      Object.keys(cleanedLineup_red).forEach(slot => {
        if (cleanedLineup_red[slot] && suspendedNames_red.has(cleanedLineup_red[slot].name)) {
          delete cleanedLineup_red[slot];
        }
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(cleanedLineup_red, updatedPlayers, state.formation)
      };
    }

    case 'SERVE_SUSPENSIONS': {
      // Llamar ANTES de cada partido oficial: decrementa 1 partido a cada sancionado
      // Los que llegan a 0 quedan libres
      const updatedPlayers = state.team.players.map(p => {
        if (!p.suspended || !p.suspensionMatches) return p;

        const remaining = p.suspensionMatches - 1;
        if (remaining <= 0) {
          return { ...p, suspended: false, suspensionType: null, suspensionMatches: 0 };
        }
        return { ...p, suspensionMatches: remaining };
      });

      // Auto-sacar sancionados del lineup
      const currentLineup = state.lineup || {};
      const cleanedLineup = { ...currentLineup };
      const stillSuspended = updatedPlayers.filter(p => p.suspended);
      const suspendedNames = new Set(stillSuspended.map(p => p.name));

      Object.keys(cleanedLineup).forEach(slot => {
        if (cleanedLineup[slot] && suspendedNames.has(cleanedLineup[slot].name)) {
          delete cleanedLineup[slot];
        }
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(cleanedLineup, updatedPlayers, state.formation)
      };
    }

    case 'HEAL_INJURIES': {
      const currentSlots = state.medicalSlots || [];
      const healed = [];
      const hasPerformanceSpec = state.facilitySpecs?.medical === 'performance';

      const healedPlayers = state.team.players.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          const newWeeksLeft = p.injuryWeeksLeft - 1;
          if (newWeeksLeft <= 0) {
            healed.push(p.name);
            // Rendimiento: jugadores vuelven con +2 OVR temporal por 4 semanas
            const postInjuryBoost = hasPerformanceSpec ? {
              postInjuryBonus: 2,
              postInjuryWeeksLeft: 4
            } : {};
            return { ...p, injured: false, injuryWeeksLeft: 0, injuryType: null, treated: false, ...postInjuryBoost };
          }
          return { ...p, injuryWeeksLeft: newWeeksLeft };
        }
        // Reducir bonus post-lesión
        if (p.postInjuryWeeksLeft > 0) {
          const weeksLeft = p.postInjuryWeeksLeft - 1;
          return weeksLeft <= 0
            ? { ...p, postInjuryBonus: 0, postInjuryWeeksLeft: 0 }
            : { ...p, postInjuryWeeksLeft: weeksLeft };
        }
        return p;
      });

      // Liberar slots de médicos de jugadores curados
      const newSlots = currentSlots.filter(name => !healed.includes(name));

      return {
        ...state,
        team: { ...state.team, players: healedPlayers },
        medicalSlots: newSlots
      };
    }

    case 'APPLY_MEDICAL_TREATMENT': {
      // Nuevo sistema: cada médico se queda con el jugador hasta que se cure
      const { playerName, healingWeeks, cost } = action.payload;
      const player = state.team?.players?.find(p => p.name === playerName);
      const currentSlots = state.medicalSlots || [];

      // Verificar que el jugador existe, está lesionado y no tiene médico
      if (!player || !player.injured || currentSlots.includes(playerName)) {
        return state;
      }

      // Verificar dinero
      if (state.money < cost) {
        return state;
      }

      // Aplicar tratamiento
      const oldWeeks = player.injuryWeeksLeft;
      const newWeeks = Math.max(0, oldWeeks - healingWeeks);
      const weeksSaved = oldWeeks - newWeeks;

      const updatedPlayers = state.team.players.map(p => {
        if (p.name === playerName) {
          return {
            ...p,
            injuryWeeksLeft: newWeeks,
            injured: newWeeks > 0,
            treated: true
          };
        }
        return p;
      });

      // Añadir al slot de médicos (solo si sigue lesionado)
      const newSlots = newWeeks > 0 ? [...currentSlots, playerName] : currentSlots;

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        medicalSlots: newSlots,
        money: state.money - cost,
        facilityStats: {
          ...state.facilityStats,
          medical: {
            ...state.facilityStats?.medical,
            weeksSaved: (state.facilityStats?.medical?.weeksSaved || 0) + weeksSaved,
            treatmentsApplied: (state.facilityStats?.medical?.treatmentsApplied || 0) + 1
          }
        },
        messages: [{
          id: Date.now(),
          type: 'medical',
          titleKey: 'gameMessages.treatmentApplied',
          contentKey: 'gameMessages.medicalTreatment', contentParams: { player: playerName, oldWeeks, newWeeks, cost: `€${(cost/1000000).toFixed(1)}M` },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };

    case 'SET_TRAINING':
      return {
        ...state,
        training: {
          ...state.training,
          ...action.payload
        }
      };

    case 'SET_SEASON_OBJECTIVES':
      return {
        ...state,
        seasonObjectives: action.payload
      };

    case 'SET_MANAGER_RATING':
      return {
        ...state,
        managerRating: action.payload
      };

    case 'SET_JOB_OFFERS':
      return {
        ...state,
        jobOffers: action.payload
      };

    case 'APPLY_TRAINING': {
      // Aplicar efectos del entrenamiento a los jugadores
      if (!state.team?.players || !state.training) return state;

      const trainingType = state.training.type || 'balanced';
      const intensity = state.training.intensity || 'normal';
      const trainingFacilityLevel = state.facilities?.training || 0;

      // Modificadores
      const intensityModifiers = { light: 0.5, normal: 1.0, intense: 1.5 };
      const facilityBonuses = [0, 0.1, 0.2, 0.35];
      const injuryRisks = { light: 0.02, normal: 0.05, intense: 0.12 };

      const intensityMod = intensityModifiers[intensity] || 1.0;
      const facilityBonus = facilityBonuses[trainingFacilityLevel] || 0;
      const injuryRisk = injuryRisks[intensity] || 0.05;

      const trainedPlayers = state.team.players.map(player => {
        // No entrenar jugadores lesionados
        if (player.injured) return player;

        // Factor de edad
        const ageFactor = player.age <= 21 ? 1.5 :
                          player.age <= 25 ? 1.2 :
                          player.age <= 29 ? 1.0 :
                          player.age <= 33 ? 0.6 : 0.3;

        // Factor de nivel
        const levelFactor = player.overall < 70 ? 1.3 :
                            player.overall < 75 ? 1.1 :
                            player.overall < 80 ? 1.0 :
                            player.overall < 85 ? 0.8 : 0.5;

        // Progresión base
        const baseProgress = 0.05;
        const totalProgress = baseProgress * intensityMod * ageFactor * levelFactor * (1 + facilityBonus);

        // Aplicar progresión (acumulativa)
        const currentProgress = player.trainingProgress || 0;
        const newProgress = currentProgress + totalProgress;

        // Subir media si acumula +1.0
        let newOverall = player.overall;
        let remainingProgress = newProgress;

        if (newProgress >= 1.0) {
          const pointsToAdd = Math.floor(newProgress);
          newOverall = Math.min(99, player.overall + pointsToAdd);
          remainingProgress = newProgress - pointsToAdd;
        }

        // Comprobar lesión por entrenamiento
        const gotInjured = Math.random() < injuryRisk;

        if (gotInjured && !player.injured) {
          return {
            ...player,
            overall: newOverall,
            trainingProgress: remainingProgress,
            injured: true,
            injuryWeeksLeft: 1 + Math.floor(Math.random() * 2),
            injuryType: 'training'
          };
        }

        return {
          ...player,
          overall: newOverall,
          trainingProgress: remainingProgress
        };
      });

      return {
        ...state,
        team: { ...state.team, players: trainedPlayers }
      };
    }

    case 'GENERATE_YOUTH_PLAYER': {
      // Usar el sistema de especialización
      const youthLevel = state.facilities?.youth || 0;
      const youthSpec = state.facilitySpecs?.youth || 'general';
      const newPlayer = generateYouthPlayer(youthLevel, youthSpec);

      return {
        ...state,
        team: {
          ...state.team,
          players: [...state.team.players, newPlayer]
        },
        facilityStats: {
          ...state.facilityStats,
          youth: {
            playersGenerated: (state.facilityStats?.youth?.playersGenerated || 0) + 1,
            totalOvr: (state.facilityStats?.youth?.totalOvr || 0) + newPlayer.overall
          }
        }
      };
    }

    case 'SET_FACILITY_SPEC': {
      // Si ya está bloqueada, no permitir cambio
      if (state.facilitySpecsLocked?.[action.payload.facility]) return state;
      return {
        ...state,
        facilitySpecs: {
          ...state.facilitySpecs,
          [action.payload.facility]: action.payload.spec
        },
        facilitySpecsLocked: {
          ...state.facilitySpecsLocked,
          [action.payload.facility]: true
        }
      };
    }

    case 'SET_PENDING_EVENT': {
      return {
        ...state,
        pendingEvent: action.payload
      };
    }

    case 'HANDLE_EVENT_CHOICE': {
      if (!state.pendingEvent) return state;
      return applyEventChoice(state, state.pendingEvent, action.payload);
    }

    case 'DISMISS_EVENT': {
      return {
        ...state,
        pendingEvent: null
      };
    }

    // ============================================================
    // EUROPEAN COMPETITIONS
    // ============================================================

    case 'INIT_EUROPEAN_COMPETITIONS': {
      return {
        ...state,
        europeanCompetitions: action.payload,
        pendingEuropeanMatch: null
      };
    }

    case 'COMPLETE_EUROPEAN_MATCH': {
      // Player finished their European match. Record the result.
      const { competitionId, matchResult, matchday, phase } = action.payload;
      let updatedEuropean = { ...state.europeanCompetitions };
      const compState = updatedEuropean.competitions[competitionId];
      if (!compState) return state;

      let updatedComp;
      if (phase === 'league') {
        updatedComp = recordPlayerLeagueResult(compState, matchResult, matchday);
      } else {
        updatedComp = recordPlayerKnockoutResult(compState, matchResult, phase);
      }

      updatedEuropean = {
        ...updatedEuropean,
        competitions: {
          ...updatedEuropean.competitions,
          [competitionId]: updatedComp
        }
      };

      // After recording league matchday 8, trigger phase advancement (leagueâ†'playoff)
      let advanceMessages = [];
      let newPendingMatch = null;
      if (phase === 'league' && matchday === 8 && updatedComp.currentMatchday >= 8) {
        const advanced = advanceEuropeanPhase(updatedComp, state.teamId);
        updatedEuropean.competitions[competitionId] = advanced.updatedState;
        advanceMessages = advanced.messages;
        if (advanced.playerMatch) {
          newPendingMatch = {
            ...advanced.playerMatch,
            competitionId,
            competitionName: updatedComp.config?.name || competitionId,
            phase: advanced.updatedState.phase
          };
        }
      }

      // After recording knockout result, try to advance the phase
      // (e.g., after player completes playoff match â†' advance to R16 draw)
      if (phase !== 'league') {
        const currentComp = updatedEuropean.competitions[competitionId];
        const advanced = advanceEuropeanPhase(currentComp, state.teamId);
        if (advanced.updatedState.phase !== currentComp.phase) {
          // Phase actually advanced
          updatedEuropean.competitions[competitionId] = advanced.updatedState;
          advanceMessages.push(...advanced.messages);
          if (advanced.playerMatch) {
            newPendingMatch = {
              ...advanced.playerMatch,
              competitionId,
              competitionName: currentComp.config?.name || competitionId,
              phase: advanced.updatedState.phase
            };
          }
        }
      }

      // Award prize money to player
      const finalComp = updatedEuropean.competitions[competitionId];
      const playerPrize = finalComp.prizesMoney?.[state.teamId] || 0;
      const prevPrize = compState.prizesMoney?.[state.teamId] || 0;
      const newPrize = playerPrize - prevPrize;

      const prizeMessages = newPrize > 0 ? [{
        id: Date.now(),
        type: 'european',
        titleKey: 'gameMessages.europeanIncome', titleParams: { icon: finalComp.config.icon },
        contentKey: 'gameMessages.prizeMoneyContent', contentParams: { competition: finalComp.config.shortName, amount: `€${(newPrize / 1_000_000).toFixed(1)}M` },
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }] : [];

      const fmtAdvanceMessages = advanceMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'european',
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));

      // â"€â"€ CONTRARRELOJ: Check European competition wins â"€â"€
      let contrarrelojWinEu = {};
      if (state.gameMode === 'contrarreloj' && state.contrarrelojData && !state.contrarrelojData.finished) {
        if (finalComp.phase === 'completed' && finalComp.finalResult?.winner?.teamId === state.teamId) {
          if (competitionId === 'championsLeague') {
            // WIN CONDITION: Champions League won!
            const existingTrophies = [...(state.contrarrelojData.trophies || []), {
              type: 'champions', season: state.currentSeason,
              name: finalComp.config?.name || 'Continental Champions Cup'
            }];
            contrarrelojWinEu = {
              contrarrelojData: {
                ...state.contrarrelojData,
                trophies: existingTrophies,
                won: true,
                finished: true,
                wonCompetition: 'champions'
              },
              currentScreen: 'contrarreloj_end'
            };
          } else {
            // Europa League / Conference League â€" record trophy but don't win contrarreloj
            const trophyType = competitionId === 'europaLeague' ? 'europaLeague' : 'conference';
            contrarrelojWinEu = {
              contrarrelojData: {
                ...state.contrarrelojData,
                trophies: [...(state.contrarrelojData.trophies || []), {
                  type: trophyType, season: state.currentSeason,
                  name: finalComp.config?.name || competitionId
                }]
              }
            };
          }
        }
      }

      return {
        ...state,
        europeanCompetitions: updatedEuropean,
        pendingEuropeanMatch: newPendingMatch,
        money: state.money + newPrize,
        messages: [...fmtAdvanceMessages, ...prizeMessages, ...state.messages].slice(0, 50),
        ...contrarrelojWinEu
      };
    }

    case 'ADVANCE_EUROPEAN_PHASE': {
      // Manually trigger phase advancement
      const { competitionId: compId } = action.payload;
      const european = { ...state.europeanCompetitions };
      const comp = european.competitions[compId];
      if (!comp) return state;

      const { updatedState, playerMatch, messages } = advanceEuropeanPhase(comp, state.teamId);
      european.competitions[compId] = updatedState;

      const fmtMessages = messages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'european',
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));

      let newPendingMatch = state.pendingEuropeanMatch;
      if (playerMatch) {
        newPendingMatch = {
          ...playerMatch,
          competitionId: compId,
          competitionName: comp.config?.name || compId,
          phase: updatedState.phase
        };
      }

      return {
        ...state,
        europeanCompetitions: european,
        pendingEuropeanMatch: newPendingMatch,
        messages: [...fmtMessages, ...state.messages].slice(0, 50)
      };
    }

    case 'CLEAR_EUROPEAN_MATCH': {
      return {
        ...state,
        pendingEuropeanMatch: null
      };
    }

    // ============================================================
    // SOUTH AMERICAN COMPETITIONS (same pattern as European)
    // ============================================================

    case 'INIT_SA_COMPETITIONS': {
      return {
        ...state,
        saCompetitions: action.payload,
        pendingSAMatch: null
      };
    }

    case 'COMPLETE_SA_MATCH': {
      const { competitionId, matchResult, matchday, phase } = action.payload;
      let updatedSA = { ...state.saCompetitions };
      const compState = updatedSA.competitions[competitionId];
      if (!compState) return state;

      let updatedComp;
      if (phase === 'league') {
        updatedComp = recordPlayerSALeagueResult(compState, matchResult, matchday);
      } else {
        updatedComp = recordPlayerSAKnockoutResult(compState, matchResult, phase);
      }

      updatedSA = {
        ...updatedSA,
        competitions: { ...updatedSA.competitions, [competitionId]: updatedComp }
      };

      let advanceMessages = [];
      let newPendingMatch = null;
      if (phase === 'league' && matchday === 8 && updatedComp.currentMatchday >= 8) {
        const advanced = advanceSAPhase(updatedComp, state.teamId);
        updatedSA.competitions[competitionId] = advanced.updatedState;
        advanceMessages = advanced.messages;
        if (advanced.playerMatch) {
          newPendingMatch = {
            ...advanced.playerMatch,
            competitionId,
            competitionName: updatedComp.config?.name || competitionId,
            phase: advanced.updatedState.phase
          };
        }
      }

      if (phase !== 'league') {
        const currentComp = updatedSA.competitions[competitionId];
        const advanced = advanceSAPhase(currentComp, state.teamId);
        if (advanced.updatedState.phase !== currentComp.phase) {
          updatedSA.competitions[competitionId] = advanced.updatedState;
          advanceMessages.push(...advanced.messages);
          if (advanced.playerMatch) {
            newPendingMatch = {
              ...advanced.playerMatch,
              competitionId,
              competitionName: currentComp.config?.name || competitionId,
              phase: advanced.updatedState.phase
            };
          }
        }
      }

      const finalComp = updatedSA.competitions[competitionId];
      const playerPrize = finalComp.prizesMoney?.[state.teamId] || 0;
      const prevPrize = compState.prizesMoney?.[state.teamId] || 0;
      const newPrize = playerPrize - prevPrize;

      const prizeMessages = newPrize > 0 ? [{
        id: Date.now(),
        type: 'southamerican',
        titleKey: 'gameMessages.continentalIncome', titleParams: { icon: finalComp.config.icon },
        contentKey: 'gameMessages.prizeMoneyContent', contentParams: { competition: finalComp.config.shortName, amount: `$${(newPrize / 1_000_000).toFixed(1)}M` },
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }] : [];

      const fmtAdvanceMessages = advanceMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'southamerican',
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));

      // â"€â"€ CONTRARRELOJ: Check SA competition wins â"€â"€
      let contrarrelojWinSA = {};
      if (state.gameMode === 'contrarreloj' && state.contrarrelojData && !state.contrarrelojData.finished) {
        if (finalComp.phase === 'completed' && finalComp.finalResult?.winner?.teamId === state.teamId) {
          if (competitionId === 'copaLibertadores') {
            // WIN CONDITION: Copa Libertadores won!
            const existingTrophies = [...(state.contrarrelojData.trophies || []), {
              type: 'libertadores', season: state.currentSeason,
              name: finalComp.config?.name || 'South American Champions Cup'
            }];
            contrarrelojWinSA = {
              contrarrelojData: {
                ...state.contrarrelojData,
                trophies: existingTrophies,
                won: true,
                finished: true,
                wonCompetition: 'libertadores'
              },
              currentScreen: 'contrarreloj_end'
            };
          } else {
            // Copa Sudamericana â€" record trophy but don't win contrarreloj
            contrarrelojWinSA = {
              contrarrelojData: {
                ...state.contrarrelojData,
                trophies: [...(state.contrarrelojData.trophies || []), {
                  type: 'copaSudamericana', season: state.currentSeason,
                  name: finalComp.config?.name || 'Copa Sudamericana'
                }]
              }
            };
          }
        }
      }

      return {
        ...state,
        saCompetitions: updatedSA,
        pendingSAMatch: newPendingMatch,
        money: state.money + newPrize,
        messages: [...fmtAdvanceMessages, ...prizeMessages, ...state.messages].slice(0, 50),
        ...contrarrelojWinSA
      };
    }

    case 'CLEAR_SA_MATCH': {
      return {
        ...state,
        pendingSAMatch: null
      };
    }

    // ============================================================
    // COPA NACIONAL
    // ============================================================

    case 'SET_EUROPEAN_CALENDAR': {
      return {
        ...state,
        europeanCalendar: action.payload
      };
    }

    case 'INIT_CUP_COMPETITION': {
      return {
        ...state,
        cupCompetition: action.payload,
        pendingCupMatch: null
      };
    }

    case 'COMPLETE_CUP_MATCH': {
      // El jugador terminó su partido de copa
      const { roundIdx, matchIdx, homeScore, awayScore } = action.payload;
      if (!state.cupCompetition) return state;

      const updatedBracket = completeCupMatch(
        state.cupCompetition,
        roundIdx,
        matchIdx,
        homeScore,
        awayScore,
        state.teamId
      );

      const cupMessages = [];

      // Mensaje de resultado
      const match = state.cupCompetition.rounds[roundIdx]?.matches[matchIdx];
      if (match) {
        const isHome = match.homeTeam?.teamId === state.teamId;
        const playerScore = isHome ? homeScore : awayScore;
        const rivalScore = isHome ? awayScore : homeScore;
        const rivalName = isHome ? match.awayTeam?.teamName : match.homeTeam?.teamName;
        const won = updatedBracket.rounds[roundIdx]?.matches[matchIdx]?.winnerId === state.teamId;

        cupMessages.push({
          id: Date.now(),
          type: 'cup',
          titleKey: 'gameMessages.cupMatchResult', titleParams: { icon: updatedBracket.config?.icon || '🏆', cup: updatedBracket.config?.shortName || 'Cup', team: state.team.name, playerScore, rivalScore, rival: rivalName || 'Rival' },
          contentKey: won ? 'gameMessages.cupAdvance' : 'gameMessages.cupEliminated',
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        });
      }

      // Comprobar si ganó la copa
      let contrarrelojCupTrophy = {};
      if (updatedBracket.winner === state.teamId) {
        cupMessages.push({
          id: Date.now() + 1,
          type: 'cup',
          titleKey: 'gameMessages.cupChampionTitle', titleParams: { icon: updatedBracket.config?.icon || '🏆', cup: (updatedBracket.config?.name || 'Cup').toUpperCase() },
          contentKey: 'gameMessages.cupChampionContent', contentParams: { team: state.team.name, cup: updatedBracket.config?.name || 'Cup' },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        });
        // Contrarreloj: record cup trophy
        if (state.gameMode === 'contrarreloj' && state.contrarrelojData) {
          contrarrelojCupTrophy = {
            contrarrelojData: {
              ...state.contrarrelojData,
              trophies: [...(state.contrarrelojData.trophies || []), {
                type: 'cup',
                season: state.currentSeason,
                name: updatedBracket.config?.name || 'Copa Nacional'
              }]
            }
          };
        }
      }

      return {
        ...state,
        cupCompetition: updatedBracket,
        pendingCupMatch: null,
        messages: [...cupMessages, ...state.messages].slice(0, 50),
        ...contrarrelojCupTrophy
      };
    }

    case 'CLEAR_CUP_MATCH': {
      return {
        ...state,
        pendingCupMatch: null
      };
    }

    // ============================================================
    // SISTEMA DE CESIONES (LOANS)
    // ============================================================

    case 'LOAN_OUT_PLAYER': {
      // Ceder jugador propio a otro equipo
      const { player, toTeamId, toTeamName, loanFee, salaryShare, purchaseOption } = action.payload;

      // Quitar jugador de la plantilla
      const updatedPlayers = state.team.players.filter(p => p.name !== player.name);

      // Limpiar lineup si estaba
      const cleanedLineup = {};
      if (state.lineup) {
        Object.entries(state.lineup).forEach(([slot, p]) => {
          if (p && p.name !== player.name) {
            cleanedLineup[slot] = p;
          }
        });
      }

      // Crear cesión
      const loan = createLoan(
        player,
        { id: state.teamId, name: state.team.name },
        { id: toTeamId, name: toTeamName },
        loanFee, salaryShare, purchaseOption
      );

      // Actualizar leagueTeams â€" añadir jugador al equipo receptor
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === toTeamId) {
          const loanedPlayer = {
            ...player,
            onLoan: true,
            loanFromTeam: state.team.name,
            loanFromTeamId: state.teamId,
            teamId: toTeamId
          };
          return {
            ...t,
            players: [...(t.players || []), loanedPlayer],
            budget: (t.budget || 50_000_000) - loanFee
          };
        }
        return t;
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(cleanedLineup, updatedPlayers, state.formation),
        convocados: (state.convocados || []).filter(name => name !== player.name),
        money: state.money + loanFee,
        activeLoans: [...(state.activeLoans || []), loan],
        leagueTeams: updatedLeagueTeams,
        messages: [{
          id: Date.now(),
          type: 'loan',
          titleKey: 'gameMessages.playerLoaned',
          contentKey: 'gameMessages.playerLoanedContent', contentParams: { player: player.name, team: toTeamName, fee: formatTransferPrice(loanFee), option: purchaseOption ? formatTransferPrice(purchaseOption) : '' },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'LOAN_IN_PLAYER': {
      // Recibir jugador en cesión desde otro equipo
      const { player, fromTeamId, fromTeamName, loanFee, salaryShare, purchaseOption } = action.payload;

      // Verificar presupuesto
      if (state.money < loanFee) return state;

      // Añadir jugador a la plantilla con flag de cesión
      const loanedPlayer = {
        ...player,
        onLoan: true,
        loanFromTeam: fromTeamName,
        loanFromTeamId: fromTeamId,
        loanSalaryShare: salaryShare,
        teamId: state.teamId
      };

      // Crear cesión
      const loan = createLoan(
        player,
        { id: fromTeamId, name: fromTeamName },
        { id: state.teamId, name: state.team.name },
        loanFee, salaryShare, purchaseOption
      );

      // Actualizar leagueTeams â€" quitar jugador del equipo propietario
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === fromTeamId) {
          return {
            ...t,
            players: (t.players || []).filter(p => p.name !== player.name),
            budget: (t.budget || 50_000_000) + loanFee
          };
        }
        return t;
      });

      return {
        ...state,
        team: { ...state.team, players: [...state.team.players, loanedPlayer] },
        money: state.money - loanFee,
        activeLoans: [...(state.activeLoans || []), loan],
        leagueTeams: updatedLeagueTeams,
        messages: [{
          id: Date.now(),
          type: 'loan',
          titleKey: 'gameMessages.playerReceivedOnLoan',
          contentKey: 'gameMessages.playerReceivedOnLoanContent', contentParams: { player: player.name, team: fromTeamName, fee: formatTransferPrice(loanFee), option: purchaseOption ? formatTransferPrice(purchaseOption) : '' },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'EXPIRE_LOANS': {
      // Al final de temporada: devolver todos los jugadores cedidos
      const currentLoans = state.activeLoans || [];
      const { expiredLoans, remainingLoans, messages: loanMessages } = expireLoans(currentLoans, state.leagueTeams);

      // Jugadores prestados (onLoan: true) se eliminan de la plantilla
      let updatedPlayers = (state.team?.players || []).filter(p => !p.onLoan);

      // Jugadores propios cedidos vuelven a la plantilla
      const myLoanedOut = expiredLoans.filter(l => l.fromTeamId === state.teamId);
      for (const loan of myLoanedOut) {
        if (loan.playerData) {
          updatedPlayers.push({
            ...loan.playerData,
            onLoan: false,
            loanFromTeam: undefined,
            loanFromTeamId: undefined,
            loanSalaryShare: undefined,
            teamId: state.teamId
          });
        }
      }

      // Formatear mensajes
      const formattedMessages = loanMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type,
        title: m.title,
        content: m.content,
        dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }
      }));

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        activeLoans: remainingLoans,
        loanHistory: [...(state.loanHistory || []), ...expiredLoans],
        messages: [...formattedMessages, ...state.messages].slice(0, 50)
      };
    }

    case 'EXERCISE_LOAN_PURCHASE': {
      // Ejecutar opción de compra â€" convierte cesión en traspaso definitivo
      const { loanId } = action.payload;
      const loan = (state.activeLoans || []).find(l => l.id === loanId);

      if (!loan || !loan.purchaseOption || loan.status !== 'active') return state;
      if (state.money < loan.purchaseOption) return state;

      // El jugador ya está en la plantilla (con onLoan: true), convertirlo en definitivo
      const updatedPlayers = state.team.players.map(p => {
        if (p.name === loan.playerId && p.onLoan) {
          return {
            ...p,
            onLoan: false,
            loanFromTeam: undefined,
            loanFromTeamId: undefined,
            loanSalaryShare: undefined,
            contractYears: 4 // Nuevo contrato
          };
        }
        return p;
      });

      // Actualizar cesión como comprada
      const updatedLoans = (state.activeLoans || []).map(l =>
        l.id === loanId ? { ...l, status: 'purchased' } : l
      );

      // Actualizar leagueTeams â€" dar dinero al equipo propietario
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === loan.fromTeamId) {
          return {
            ...t,
            budget: (t.budget || 50_000_000) + loan.purchaseOption
          };
        }
        return t;
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        money: state.money - loan.purchaseOption,
        activeLoans: updatedLoans,
        loanHistory: [...(state.loanHistory || []), { ...loan, status: 'purchased' }],
        leagueTeams: updatedLeagueTeams,
        messages: [{
          id: Date.now(),
          type: 'transfer',
          titleKey: 'gameMessages.purchaseOptionExecuted',
          contentKey: 'gameMessages.purchaseOptionContent', contentParams: { player: loan.playerData?.name || loan.playerId, amount: formatTransferPrice(loan.purchaseOption) },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'ACCEPT_LOAN_OFFER': {
      // Aceptar oferta de cesión entrante â€" ceder jugador propio
      const offer = action.payload;
      const player = state.team.players.find(p => p.name === offer.playerId);
      if (!player) return state;

      // Quitar jugador de la plantilla
      const updatedPlayers = state.team.players.filter(p => p.name !== offer.playerId);

      // Limpiar lineup
      const cleanedLineup = {};
      if (state.lineup) {
        Object.entries(state.lineup).forEach(([slot, p]) => {
          if (p && p.name !== offer.playerId) {
            cleanedLineup[slot] = p;
          }
        });
      }

      // Crear cesión
      const loan = createLoan(
        player,
        { id: state.teamId, name: state.team.name },
        { id: offer.toTeamId, name: offer.toTeamName },
        offer.loanFee, offer.salaryShare, offer.purchaseOption
      );

      // Actualizar leagueTeams
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === offer.toTeamId) {
          const loanedPlayer = {
            ...player,
            onLoan: true,
            loanFromTeam: state.team.name,
            loanFromTeamId: state.teamId,
            teamId: offer.toTeamId
          };
          return {
            ...t,
            players: [...(t.players || []), loanedPlayer],
            budget: (t.budget || 50_000_000) - offer.loanFee
          };
        }
        return t;
      });

      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        lineup: ensureFullLineup(cleanedLineup, updatedPlayers, state.formation),
        convocados: (state.convocados || []).filter(name => name !== offer.playerId),
        money: state.money + offer.loanFee,
        activeLoans: [...(state.activeLoans || []), loan],
        incomingLoanOffers: (state.incomingLoanOffers || []).filter(o => o.id !== offer.id),
        leagueTeams: updatedLeagueTeams,
        messages: [{
          id: Date.now(),
          type: 'loan',
          titleKey: 'gameMessages.loanAccepted',
          contentKey: 'gameMessages.playerLoanedContent', contentParams: { player: player.name, team: offer.toTeamName, fee: formatTransferPrice(offer.loanFee), option: '' },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    case 'REJECT_LOAN_OFFER': {
      const offer = action.payload;
      return {
        ...state,
        incomingLoanOffers: (state.incomingLoanOffers || []).filter(o => o.id !== offer.id)
      };
    }

    // ============================================================
    // APERTURA-CLAUSURA
    // ============================================================

    case 'SET_TOURNAMENT_PHASE':
      return { ...state, currentTournament: action.payload };

    case 'SAVE_APERTURA_TABLE':
      return { ...state, aperturaTable: action.payload };

    case 'COMPLETE_APCL_FINAL': {
      // Player played the final interactively â€" store the result
      const finalResult = action.payload; // { winner, winnerName, leg1, leg2, ... }
      return {
        ...state,
        aperturaClausuraFinal: finalResult,
        pendingAperturaClausuraFinal: null,
        messages: [{
          id: Date.now(),
          type: 'league',
          titleKey: 'gameMessages.aperturaClausuraFinalResult',
          contentKey: finalResult.hadFinal ? 'gameMessages.aperturaClausuraFinalResultContent' : 'gameMessages.directChampionShort',
          contentParams: finalResult.hadFinal
            ? { winner: finalResult.winnerName, league: '', leg1Home: finalResult.leg1?.homeScore, leg1Away: finalResult.leg1?.awayScore, leg2Home: finalResult.leg2?.homeScore, leg2Away: finalResult.leg2?.awayScore }
            : { winner: finalResult.winnerName },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }, ...state.messages].slice(0, 50)
      };
    }

    // ============================================================
    // CONTRARRELOJ MODE
    // ============================================================

    case 'SET_GAME_MODE':
      return { ...state, gameMode: action.payload };

    case 'CONTRARRELOJ_WIN': {
      if (state.gameMode !== 'contrarreloj' || !state.contrarrelojData) return state;
      return {
        ...state,
        contrarrelojData: {
          ...state.contrarrelojData,
          won: true,
          finished: true,
          wonCompetition: action.payload?.competition || 'champions'
        },
        currentScreen: 'contrarreloj_end'
      };
    }

    case 'CONTRARRELOJ_LOSE': {
      if (state.gameMode !== 'contrarreloj' || !state.contrarrelojData) return state;
      return {
        ...state,
        contrarrelojData: {
          ...state.contrarrelojData,
          won: false,
          finished: true,
          loseReason: action.payload?.reason || 'fired'
        },
        currentScreen: 'contrarreloj_end'
      };
    }

    case 'CONTRARRELOJ_ADD_TROPHY': {
      if (!state.contrarrelojData) return state;
      const trophy = action.payload; // { type, season, name }
      return {
        ...state,
        contrarrelojData: {
          ...state.contrarrelojData,
          trophies: [...(state.contrarrelojData.trophies || []), trophy]
        }
      };
    }

    case 'CONTRARRELOJ_INCREMENT_SEASON': {
      if (!state.contrarrelojData) return state;
      return {
        ...state,
        contrarrelojData: {
          ...state.contrarrelojData,
          seasonsPlayed: (state.contrarrelojData.seasonsPlayed || 1) + 1
        }
      };
    }

    case 'CONTRARRELOJ_RECORD_SEASON': {
      if (!state.contrarrelojData) return state;
      // payload: { season, league, leagueName, position, totalTeams, promoted, relegated, europeanPhase, trophies }
      const record = action.payload;
      return {
        ...state,
        contrarrelojData: {
          ...state.contrarrelojData,
          seasonHistory: [...(state.contrarrelojData.seasonHistory || []), record]
        }
      };
    }

    case 'RESET_GAME':
      localStorage.removeItem('pcfutbol_saveId');
      localStorage.removeItem('pcfutbol_local_save');
      return {
        ...initialState,
        loaded: true,
        settings: state.settings // Mantener las opciones
      };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const contrarrelojSaveRef = useRef(null); // debounce timer for contrarreloj auto-save

  // Generate unique save ID
  const generateSaveId = () => {
    return 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Save game - uses localStorage in dev mode, Firebase in production
  const saveGame = async () => {
    if (!state.gameStarted) return;
    if (state.gameMode === 'contrarreloj') return; // Contrarreloj uses its own auto-save

    const saveData = {
      ...state,
      lastSaved: new Date().toISOString()
    };

    if (USE_LOCAL_STORAGE) {
      // Local storage mode
      try {
        localStorage.setItem('pcfutbol_local_save', JSON.stringify(saveData));
        console.log('💾 Game saved to localStorage!');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    } else {
      // Firebase mode
      const saveId = state.saveId || generateSaveId();
      saveData.saveId = saveId;

      try {
        await setDoc(doc(db, 'saves', saveId), saveData);
        localStorage.setItem('pcfutbol_saveId', saveId);
        console.log('☁️ Game saved to Firebase!');
      } catch (error) {
        console.error('Error saving game:', error);
      }
    }
  };

  // Load game from localStorage
  const loadLocalSave = () => {
    try {
      const saved = localStorage.getItem('pcfutbol_local_save');
      if (saved) {
        const data = JSON.parse(saved);
        dispatch({ type: 'LOAD_SAVE', payload: data });
        console.log('💾 Game loaded from localStorage!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  };

  // Load game from Firestore
  const loadGame = async (saveId) => {
    try {
      const docRef = doc(db, 'saves', saveId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        dispatch({ type: 'LOAD_SAVE', payload: docSnap.data() });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading game:', error);
      return false;
    }
  };

  // Check for existing save on load
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        if (USE_LOCAL_STORAGE) {
          // Try to load from localStorage first
          const loaded = loadLocalSave();
          if (!loaded) {
            dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
          }
        } else {
          // Try Firebase
          const existingSaveId = localStorage.getItem('pcfutbol_saveId');
          if (existingSaveId) {
            const loaded = await loadGame(existingSaveId);
            if (!loaded) {
              dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
            }
          } else {
            dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
          }
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
        dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
      }
    };

    // Timeout de seguridad para no quedarse cargando forever
    const timeout = setTimeout(() => {
      if (!state.loaded) {
        console.warn('Loading timeout, going to main menu');
        dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
      }
    }, 3000);

    loadInitialState();

    return () => clearTimeout(timeout);
  }, []);

  // Auto-save on state changes (debounced) — respects autoSave setting
  useEffect(() => {
    if (state.gameStarted && state.gameMode !== 'contrarreloj' && state.settings?.autoSave !== false) {
      const timeout = setTimeout(saveGame, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.currentWeek, state.money, state.team]);

  // ============================================================
  // CONTRARRELOJ AUTO-SAVE (Firebase)
  // Triggers on week advance, season change, and key state changes.
  // Debounced to avoid spamming Firebase on rapid dispatches.
  // ============================================================
  useEffect(() => {
    if (
      state.gameMode !== 'contrarreloj' ||
      !state.gameStarted ||
      !state._contrarrelojUserId
    ) return;

    // Don't save finished runs â€" delete the save instead
    if (state.contrarrelojData?.finished) {
      deleteContrarrelojSave(state._contrarrelojUserId).catch(err =>
        console.error('Error deleting contrarreloj save:', err)
      );
      return;
    }

    // Debounce: wait 2s after last state change before saving
    if (contrarrelojSaveRef.current) clearTimeout(contrarrelojSaveRef.current);
    contrarrelojSaveRef.current = setTimeout(() => {
      const saveData = { ...state };
      delete saveData.loaded;
      delete saveData._contrarrelojUserId; // don't persist the userId field in state

      saveContrarreloj(state._contrarrelojUserId, saveData)
        .then(() => console.log('⏱️ Contrarreloj auto-saved to Firebase'))
        .catch(err => console.error('Error auto-saving contrarreloj:', err));
    }, 2000);

    return () => {
      if (contrarrelojSaveRef.current) clearTimeout(contrarrelojSaveRef.current);
    };
  }, [state.currentWeek, state.currentSeason, state.money, state.contrarrelojData?.finished, state.gameMode]);

  // ============================================================
  // SAVE ON APP CLOSE / BACKGROUND (visibilitychange + Capacitor pause)
  // Fires immediately (no debounce) so nothing is lost when user kills the app
  // ============================================================
  useEffect(() => {
    const saveOnExit = () => {
      if (
        state.gameMode === 'contrarreloj' &&
        state.gameStarted &&
        state._contrarrelojUserId &&
        !state.contrarrelojData?.finished
      ) {
        const saveData = { ...state };
        delete saveData.loaded;
        delete saveData._contrarrelojUserId;
        // Use fire-and-forget — browser may kill the tab before promise resolves
        saveContrarreloj(state._contrarrelojUserId, saveData).catch(() => {});
      }
      // Also save normal game mode
      if (state.gameStarted && state.gameMode !== 'contrarreloj' && state.settings?.autoSave !== false) {
        saveGame();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') saveOnExit();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', saveOnExit);

    // Capacitor App.pause event (Android background)
    let appListener = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('pause', saveOnExit).then(l => { appListener = l; }).catch(() => {});
    }).catch(() => {}); // ignore if not available (web)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', saveOnExit);
      if (appListener) appListener.remove();
    };
  }, [state]);

  const value = {
    state,
    dispatch,
    saveGame,
    loadGame
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}



