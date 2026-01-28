import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { LALIGA_TEAMS } from '../data/teamsFirestore';
import { generateFacilityEvent, generateYouthPlayer, applyEventChoice, FACILITY_SPECIALIZATIONS } from '../game/facilitiesSystem';
import { assignRole } from '../game/playerRoles';
import { GlobalTransferEngine, isTransferWindowOpen, formatTransferPrice, calculateMarketValue, TEAM_PROFILES } from '../game/globalTransferEngine';

const GameContext = createContext();

// Check if we should use local storage (dev mode or ?local=true)
const USE_LOCAL_STORAGE = 
  window.location.search.includes('local=true') || 
  window.location.hostname === 'localhost';

const initialState = {
  // User & Save
  saveId: null,
  loaded: false,
  
  // Game State
  gameStarted: false,
  currentWeek: 1,
  currentSeason: 1,
  
  // Player's Team
  teamId: null,
  team: null,
  formation: '4-3-3',
  tactic: 'balanced',
  lineup: {}, // Alineación actual: { slotId: playerName }
  convocados: [], // Lista de nombres de jugadores convocados
  
  // Finances
  money: 0,
  weeklyIncome: 0,
  weeklyExpenses: 0,
  
  // Facilities
  facilities: {
    stadium: 0,
    training: 0,
    youth: 0,
    medical: 0,
    scouting: 0,
    sponsorship: 0
  },
  
  // Facility Specializations
  facilitySpecs: {
    youth: 'offensive',      // offensive, defensive, technical, physical
    medical: 'recovery',     // prevention, recovery, performance
    training: 'balanced'     // intensive, balanced, conservative
  },
  
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
  
  // Transfer Market
  transferOffers: [],
  playerMarket: [],
  
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
    intensity: 'normal',
    specialPlayers: []
  },
  
  // Objectives & Career
  seasonObjectives: [],
  managerRating: 50,
  jobOffers: [],
  
  // UI State
  currentScreen: 'main_menu'
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SAVE':
      return { ...state, ...action.payload, loaded: true };
    
    case 'NEW_GAME': {
      // Obtener estadio real del equipo
      const stadiumInfo = action.payload.stadiumInfo || { name: 'Estadio', capacity: 8000 };
      const stadiumLevel = action.payload.stadiumLevel ?? 0;
      
      // Función para generar contrato basado en edad
      const generateContract = (age) => {
        if (age <= 21) return Math.floor(Math.random() * 3) + 3; // 3-5 años (jóvenes promesas)
        if (age <= 25) return Math.floor(Math.random() * 3) + 3; // 3-5 años (desarrollo)
        if (age <= 28) return Math.floor(Math.random() * 3) + 2; // 2-4 años (plenitud)
        if (age <= 32) return Math.floor(Math.random() * 2) + 2; // 2-3 años (veteranos)
        return Math.floor(Math.random() * 2) + 1; // 1-2 años (veteranos mayores)
      };
      
      // Asignar roles y contratos a todos los jugadores
      const teamWithRoles = {
        ...action.payload.team,
        players: action.payload.team.players.map(player => ({
          ...player,
          role: player.role || assignRole(player),
          contractYears: player.contractYears ?? generateContract(player.age || 25)
        }))
      };
      
      return { 
        ...initialState, 
        gameStarted: true,
        teamId: action.payload.teamId,
        team: teamWithRoles,
        money: teamWithRoles.budget,
        loaded: true,
        currentScreen: 'office',
        stadium: {
          ...initialState.stadium,
          level: stadiumLevel,
          name: stadiumInfo.name,
          realCapacity: stadiumInfo.capacity,
          grassCondition: 100
        },
        facilities: {
          ...initialState.facilities,
          stadium: stadiumLevel
        },
        // Pretemporada
        preseasonMatches: action.payload.preseasonMatches || [],
        preseasonPhase: action.payload.preseasonPhase || false,
        preseasonWeek: action.payload.preseasonPhase ? 1 : 0
      };
    }
    
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    
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
    
    case 'SET_PLAYER_LEAGUE':
      return { ...state, playerLeagueId: action.payload };
    
    case 'ADD_RESULT':
      return { 
        ...state, 
        results: [...state.results, action.payload]
      };
    
    case 'START_NEW_SEASON': {
      const { seasonResult, objectiveRewards, europeanBonus, preseasonMatches, moneyChange, newFixtures, newTable, newObjectives } = action.payload;
      
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
      
      // Envejecer jugadores, reducir contratos y filtrar expirados
      const updatedPlayers = (state.team?.players?.map(player => {
        const newAge = (player.age || 25) + 1;
        const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
        
        // Reducir overall para jugadores mayores
        let overallChange = 0;
        if (newAge >= 34) overallChange = -3;
        else if (newAge >= 32) overallChange = -2;
        else if (newAge >= 30) overallChange = -1;
        else if (newAge <= 23) overallChange = Math.random() > 0.7 ? 1 : 0; // Jóvenes pueden mejorar
        
        // Check retiro
        const willRetire = checkRetirement(player, newAge);
        
        return {
          ...player,
          age: newAge,
          overall: Math.max(40, Math.min(99, player.overall + overallChange)),
          contractYears: contractYears - 1,
          injured: false,
          injuryWeeksLeft: 0,
          retiring: willRetire,
          severeInjuryCount: 0 // Reset al inicio de temporada
        };
      }) || [])
        // Filtrar jugadores con contrato expirado o que se retiran
        .filter(player => player.contractYears > 0 && !player.retiring);
      
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
      
      return {
        ...state,
        currentSeason: state.currentSeason + 1,
        currentWeek: 1,
        team: {
          ...state.team,
          players: updatedPlayers
        },
        // Limpiar alineación y convocados
        lineup: cleanedLineup,
        convocados: (state.convocados || []).filter(name => playerNames.has(name)),
        money: state.money + moneyChange,
        // Actualizar estadio con naming actualizado
        stadium: {
          ...state.stadium,
          naming: updatedNaming
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
        medicalSlots: [] // Liberar slots médicos
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
    
    case 'ADVANCE_WEEK': {
      // Calculate weekly income from facilities
      const stadiumLevel = state.facilities?.stadium || 0;
      const sponsorLevel = state.facilities?.sponsorship || 0;
      const stadiumIncomes = [500000, 900000, 1500000, 2500000];
      const sponsorIncomes = [200000, 500000, 1000000, 2000000];
      const facilityIncome = stadiumIncomes[stadiumLevel] + sponsorIncomes[sponsorLevel];
      
      // Calculate weekly salary expenses
      const salaryExpenses = state.team?.players?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;
      
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
        const youthSpec = state.facilitySpecs?.youth || 'offensive';
        const numYouth = 1 + youthLevel;
        
        for (let i = 0; i < numYouth; i++) {
          const newPlayer = generateYouthPlayer(youthLevel, youthSpec);
          newYouthPlayers.push(newPlayer);
          updatedYouthStats = {
            playersGenerated: updatedYouthStats.playersGenerated + 1,
            totalOvr: updatedYouthStats.totalOvr + newPlayer.overall
          };
        }
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
        const specName = FACILITY_SPECIALIZATIONS.youth.options.find(o => o.id === (state.facilitySpecs?.youth || 'offensive'))?.name || 'General';
        newMessages.push({
          id: Date.now(),
          type: 'youth',
          title: '🌱 Nuevos canteranos',
          content: `La cantera (${specName}) ha promocionado ${newYouthPlayers.length} jugador${newYouthPlayers.length > 1 ? 'es' : ''}: ${newYouthPlayers.map(p => `${p.name} (${p.position}, ${p.overall})`).join(', ')}`,
          date: `Fin Temporada ${state.currentSeason}`
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
      // SIMULACIÓN DEL MERCADO GLOBAL
      // ============================================================
      const nextWeek = state.currentWeek + 1;
      const windowStatus = isTransferWindowOpen(nextWeek);
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
            newTransferMessages.push({
              id: Date.now() + Math.random(),
              type: 'transfer',
              title: '🔄 Fichaje confirmado',
              content: `${t.player.name} (${t.player.position}, ${t.player.overall}) ficha por ${t.to.name} desde ${t.from.name} por ${formatTransferPrice(t.price)}`,
              date: `Semana ${nextWeek}`
            });
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
      // ============================================================
      let newIncomingOffers = [...(state.incomingOffers || [])];
      
      if (windowStatus.open && state.team?.players && Math.random() < 0.25) {
        // 25% chance cada semana de recibir una oferta
        const myPlayers = state.team.players.filter(p => p.overall >= 70);
        if (myPlayers.length > 0) {
          const targetPlayer = myPlayers[Math.floor(Math.random() * myPlayers.length)];
          const interestedTeams = (state.leagueTeams || []).filter(t => {
            if (t.id === state.teamId) return false;
            const profile = TEAM_PROFILES[Object.keys(TEAM_PROFILES).find(k => 
              TEAM_PROFILES[k].teams?.includes(t.name)
            ) || 'lowTable'];
            return targetPlayer.overall >= (profile?.targetOvrMin || 65) - 3 && t.budget >= 5_000_000;
          });
          
          if (interestedTeams.length > 0) {
            const buyer = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
            const marketValue = calculateMarketValue(targetPlayer);
            const offerAmount = Math.round(marketValue * (0.7 + Math.random() * 0.4)); // 70-110% del valor
            
            const newOffer = {
              id: `incoming_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días
            };
            
            newIncomingOffers.push(newOffer);
            
            newTransferMessages.push({
              id: Date.now() + Math.random(),
              type: 'offer',
              title: '📩 Nueva oferta recibida',
              content: `${buyer.name} ofrece ${formatTransferPrice(offerAmount)} por ${targetPlayer.name}`,
              date: `Semana ${nextWeek}`
            });
          }
        }
      }
      
      // Limpiar ofertas expiradas
      newIncomingOffers = newIncomingOffers.filter(o => 
        o.status !== 'pending' || (o.expiresAt && o.expiresAt > Date.now())
      );
      
      return { 
        ...state, 
        currentWeek: nextWeek,
        money: state.money + facilityIncome - salaryExpenses,
        weeklyIncome: facilityIncome,
        weeklyExpenses: salaryExpenses,
        team: state.team ? { ...state.team, players: updatedPlayers } : null,
        stadium: updatedStadium,
        messages: [...newTransferMessages, ...newMessages, ...state.messages].slice(0, 50),
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
        }
      };
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
    
    case 'SET_LINEUP':
      return { ...state, lineup: action.payload };
    
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
      return {
        ...state,
        outgoingOffers: [...(state.outgoingOffers || []), action.payload]
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
        leagueTeams: action.payload
      };
    
    // ============================================================
    // GESTIÓN DE OFERTAS
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
        lineup: cleanedLineup,
        money: state.money + offer.amount,
        leagueTeams: updatedLeagueTeams,
        incomingOffers: (state.incomingOffers || []).filter(o => o.id !== offer.id),
        messages: [{
          id: Date.now(),
          type: 'transfer',
          title: '✅ Venta completada',
          content: `Has vendido a ${offer.player.name} al ${offer.fromTeam} por ${formatTransferPrice(offer.amount)}`,
          date: `Semana ${state.currentWeek}`
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
    
    case 'PROCESS_OUTGOING_OFFER': {
      // Simular respuesta de la IA a oferta del usuario
      const offer = action.payload;
      const targetTeam = (state.leagueTeams || []).find(t => t.id === offer.toTeamId);
      if (!targetTeam) return state;
      
      const targetPlayer = (targetTeam.players || []).find(p => p.name === offer.player.name);
      if (!targetPlayer) return state;
      
      const marketValue = calculateMarketValue(targetPlayer);
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
            title: '✅ Fichaje completado',
            content: `¡${targetPlayer.name} es nuevo jugador del equipo! Coste: ${formatTransferPrice(offer.amount)}`,
            date: `Semana ${state.currentWeek}`
          }, ...state.messages].slice(0, 50)
        };
      }
      
      return newState;
    }
    
    case 'RECORD_MATCH_INCOME': {
      // Registrar ingresos de un partido en casa
      const matchIncome = action.payload.income;
      return {
        ...state,
        stadium: {
          ...state.stadium,
          lastMatchIncome: matchIncome,
          totalSeasonIncome: (state.stadium?.totalSeasonIncome || 0) + matchIncome
        },
        money: state.money + matchIncome
      };
    }
    
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
    
    case 'REMOVE_PLAYER':
      return {
        ...state,
        team: {
          ...state.team,
          players: state.team.players.filter(p => p.name !== action.payload)
        }
      };
    
    case 'INJURE_PLAYER': {
      // Centro médico reduce tiempo de lesiones
      const medicalLevel = state.facilities?.medical || 0;
      const medicalReduction = [0, 0.20, 0.35, 0.50][medicalLevel]; // 0%, 20%, 35%, 50%
      const baseWeeks = action.payload.weeksOut;
      const reducedWeeks = Math.max(1, Math.round(baseWeeks * (1 - medicalReduction)));
      
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
    
    case 'HEAL_INJURIES': {
      const currentSlots = state.medicalSlots || [];
      const healed = [];
      
      const healedPlayers = state.team.players.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          const newWeeksLeft = p.injuryWeeksLeft - 1;
          if (newWeeksLeft <= 0) {
            healed.push(p.name); // Marcar como curado para liberar slot
            return { ...p, injured: false, injuryWeeksLeft: 0, injuryType: null, treated: false };
          }
          return { ...p, injuryWeeksLeft: newWeeksLeft };
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
          title: '💉 Tratamiento aplicado',
          content: `${playerName} ha recibido tratamiento. Lesión reducida de ${oldWeeks} a ${newWeeks} semanas. Coste: €${(cost/1000000).toFixed(1)}M`,
          date: `Semana ${state.currentWeek}`
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
      const youthSpec = state.facilitySpecs?.youth || 'offensive';
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
      return {
        ...state,
        facilitySpecs: {
          ...state.facilitySpecs,
          [action.payload.facility]: action.payload.spec
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
  
  // Generate unique save ID
  const generateSaveId = () => {
    return 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };
  
  // Save game - uses localStorage in dev mode, Firebase in production
  const saveGame = async () => {
    if (!state.gameStarted) return;
    
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
  
  // Auto-save every 2 minutes in local mode, 5 in Firebase
  useEffect(() => {
    if (state.gameStarted) {
      const interval = setInterval(saveGame, USE_LOCAL_STORAGE ? 2 * 60 * 1000 : 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [state.gameStarted]);
  
  // Save on state changes in local mode (debounced)
  useEffect(() => {
    if (USE_LOCAL_STORAGE && state.gameStarted) {
      const timeout = setTimeout(saveGame, 1000);
      return () => clearTimeout(timeout);
    }
  }, [state.currentWeek, state.money, state.team]);
  
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
