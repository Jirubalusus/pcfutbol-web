import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { LALIGA_TEAMS } from '../data/teamsFirestore';
import { generateFacilityEvent, generateYouthPlayer, applyEventChoice, FACILITY_SPECIALIZATIONS } from '../game/facilitiesSystem';

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
    
    case 'NEW_GAME':
      return { 
        ...initialState, 
        gameStarted: true,
        teamId: action.payload.teamId,
        team: action.payload.team,
        money: action.payload.team.budget,
        loaded: true,
        currentScreen: 'office'
      };
    
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    
    case 'UPDATE_MONEY':
      return { ...state, money: state.money + action.payload };
    
    case 'SET_LEAGUE_TABLE':
      return { ...state, leagueTable: action.payload };
    
    case 'SET_FIXTURES':
      return { ...state, fixtures: action.payload };
    
    case 'ADD_RESULT':
      return { 
        ...state, 
        results: [...state.results, action.payload]
      };
    
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
      
      return { 
        ...state, 
        currentWeek: state.currentWeek + 1,
        money: state.money + facilityIncome - salaryExpenses,
        weeklyIncome: facilityIncome,
        weeklyExpenses: salaryExpenses,
        team: state.team ? { ...state.team, players: updatedPlayers } : null,
        stadium: updatedStadium,
        messages: [...newMessages, ...state.messages].slice(0, 50),
        pendingEvent: newEvent || state.pendingEvent,
        facilityStats: {
          ...state.facilityStats,
          youth: updatedYouthStats
        },
        medicalTreatmentsUsed: 0 // Reset treatments each week
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
    
    case 'SIGN_PLAYER':
      return {
        ...state,
        team: {
          ...state.team,
          players: [...state.team.players, action.payload.player]
        },
        money: state.money - action.payload.fee
      };
    
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
        stadium: action.payload
      };
    
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
    
    case 'INJURE_PLAYER': {
      // Centro médico reduce tiempo de lesiones
      const medicalLevel = state.facilities?.medical || 0;
      const medicalReduction = [0, 0.20, 0.35, 0.50][medicalLevel]; // 0%, 20%, 35%, 50%
      const baseWeeks = action.payload.weeksOut;
      const reducedWeeks = Math.max(1, Math.round(baseWeeks * (1 - medicalReduction)));
      
      const updatedPlayers = state.team.players.map(p => {
        if (p.name === action.payload.playerName) {
          return {
            ...p,
            injured: true,
            injuryWeeksLeft: reducedWeeks,
            injuryType: action.payload.severity
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
      const healedPlayers = state.team.players.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          const newWeeksLeft = p.injuryWeeksLeft - 1;
          if (newWeeksLeft <= 0) {
            return { ...p, injured: false, injuryWeeksLeft: 0, injuryType: null };
          }
          return { ...p, injuryWeeksLeft: newWeeksLeft };
        }
        return p;
      });
      return {
        ...state,
        team: { ...state.team, players: healedPlayers }
      };
    }
    
    case 'APPLY_MEDICAL_TREATMENT': {
      // Apply treatment to reduce injury time by half
      const playerName = action.payload;
      const player = state.team?.players?.find(p => p.name === playerName);
      
      if (!player || !player.injured || player.treated) {
        return state;
      }
      
      // Check if treatments available
      const medicalLevel = state.facilities?.medical || 0;
      const treatmentsPerLevel = [0, 0, 1, 2];
      const maxTreatments = treatmentsPerLevel[medicalLevel];
      const usedTreatments = state.medicalTreatmentsUsed || 0;
      
      if (usedTreatments >= maxTreatments) {
        return state;
      }
      
      // Calculate weeks saved
      const oldWeeks = player.injuryWeeksLeft;
      const newWeeks = Math.max(1, Math.ceil(oldWeeks / 2));
      const weeksSaved = oldWeeks - newWeeks;
      
      const updatedPlayers = state.team.players.map(p => {
        if (p.name === playerName) {
          return {
            ...p,
            injuryWeeksLeft: newWeeks,
            treated: true
          };
        }
        return p;
      });
      
      return {
        ...state,
        team: { ...state.team, players: updatedPlayers },
        medicalTreatmentsUsed: usedTreatments + 1,
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
          content: `${playerName} ha recibido tratamiento. Lesión reducida de ${oldWeeks} a ${newWeeks} semanas.`,
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
