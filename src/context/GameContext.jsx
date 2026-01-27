import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { LALIGA_TEAMS } from '../data/teams';

const GameContext = createContext();

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
  
  // Stadium (gestión detallada estilo PC Fútbol)
  stadium: {
    level: 0,
    seasonTickets: { fondo: 0, lateral: 0, tribuna: 0, vip: 0 },
    ticketPrices: { fondo: 25, lateral: 45, tribuna: 75, vip: 150 },
    services: { parking: false, food: false, merchandise: false, tour: false },
    lastMatchIncome: 0,
    totalSeasonIncome: 0
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
      
      return { 
        ...state, 
        currentWeek: state.currentWeek + 1,
        money: state.money + facilityIncome - salaryExpenses,
        weeklyIncome: facilityIncome,
        weeklyExpenses: salaryExpenses
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
      const updatedPlayers = state.team.players.map(p => {
        if (p.name === action.payload.playerName) {
          return {
            ...p,
            injured: true,
            injuryWeeksLeft: action.payload.weeksOut,
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
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    
    case 'RESET_GAME':
      localStorage.removeItem('pcfutbol_saveId');
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
  
  // Save game to Firestore
  const saveGame = async () => {
    if (!state.gameStarted) return;
    
    const saveId = state.saveId || generateSaveId();
    const saveData = {
      ...state,
      saveId,
      lastSaved: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, 'saves', saveId), saveData);
      localStorage.setItem('pcfutbol_saveId', saveId);
      console.log('Game saved!');
    } catch (error) {
      console.error('Error saving game:', error);
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
        const existingSaveId = localStorage.getItem('pcfutbol_saveId');
        if (existingSaveId) {
          const loaded = await loadGame(existingSaveId);
          if (!loaded) {
            // Si no se pudo cargar, ir al menú
            dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
          }
        } else {
          dispatch({ type: 'LOAD_SAVE', payload: { loaded: true } });
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
  
  // Auto-save every 5 minutes
  useEffect(() => {
    if (state.gameStarted) {
      const interval = setInterval(saveGame, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [state.gameStarted]);
  
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
