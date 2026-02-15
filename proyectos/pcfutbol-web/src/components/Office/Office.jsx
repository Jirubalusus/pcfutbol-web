import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { translatePosition } from '../../game/positionNames';
import { 
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams,
  getPremierTeams, getLigue1Teams, getBundesligaTeams, getSerieATeams,
  getEredivisieTeams, getPrimeiraLigaTeams, getChampionshipTeams, getBelgianProTeams,
  getSuperLigTeams, getScottishPremTeams, getSerieBTeams, getBundesliga2Teams,
  getLigue2Teams, getSwissTeams, getAustrianTeams, getGreekTeams,
  getDanishTeams, getCroatianTeams, getCzechTeams,
  getArgentinaTeams, getBrasileiraoTeams, getColombiaTeams, getChileTeams,
  getUruguayTeams, getEcuadorTeams, getParaguayTeams, getPeruTeams,
  getBoliviaTeams, getVenezuelaTeams
} from '../../data/teamsFirestore';
import { simulateWeekMatches, simulateMatch, updateTable } from '../../game/leagueEngine';
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance } from '../../game/stadiumEconomy';

// Combine all teams for lookup - usando getters para obtener data actualizada
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams(),
  ...getPremierTeams(), ...getLigue1Teams(), ...getBundesligaTeams(), ...getSerieATeams(),
  ...getEredivisieTeams(), ...getPrimeiraLigaTeams(), ...getChampionshipTeams(), ...getBelgianProTeams(),
  ...getSuperLigTeams(), ...getScottishPremTeams(), ...getSerieBTeams(), ...getBundesliga2Teams(),
  ...getLigue2Teams(), ...getSwissTeams(), ...getAustrianTeams(), ...getGreekTeams(),
  ...getDanishTeams(), ...getCroatianTeams(), ...getCzechTeams(),
  ...getArgentinaTeams(), ...getBrasileiraoTeams(), ...getColombiaTeams(), ...getChileTeams(),
  ...getUruguayTeams(), ...getEcuadorTeams(), ...getParaguayTeams(), ...getPeruTeams(),
  ...getBoliviaTeams(), ...getVenezuelaTeams()
];
import Sidebar from '../Sidebar/Sidebar';
import MobileNav from '../MobileNav/MobileNav';
import Plantilla from '../Plantilla/Plantilla';
import Formation from '../Formation/Formation';
import Calendar from '../Calendar/Calendar';
import LeagueTable from '../LeagueTable/LeagueTable';
import Transfers from '../Transfers/TransfersV2';
import Stadium from '../Stadium/Stadium';
import Facilities from '../Facilities/Facilities';
import Messages from '../Messages/Messages';
import Finance from '../Finance/Finance';
import MatchDay from '../MatchDay/MatchDay';
import Training from '../Training/Training';
import Objectives from '../Objectives/Objectives';
import SeasonEnd from '../SeasonEnd/SeasonEnd';
import ManagerFired from '../ManagerFired/ManagerFired';
import Europe from '../Europe/Europe';
import Cup from '../Cup/Cup';
import Competitions from '../Competitions/Competitions';
import ProManagerDashboard from '../ProManager/ProManagerDashboard';
import { isSeasonOver } from '../../game/seasonManager';
import { getWinterWindowRange } from '../../game/globalTransferEngine';
import { getPlayerCompetition, isTeamAlive } from '../../game/europeanSeason';
import { isCupWeek, getCupRoundForWeek } from '../../game/europeanCompetitions';
import { simulateCupRound, completeCupMatch } from '../../game/cupSystem';
import {
  Trophy,
  TrendingUp,
  Wallet,
  Users,
  Target,
  Save,
  SkipForward,
  FastForward,
  ChevronRight,
  AlertTriangle,
  HeartPulse,
  UserRound,
  Loader
} from 'lucide-react';
import RankedTimer from '../Ranked/RankedTimer';
import { submitRoundConfig, advancePhase as advanceRankedPhase, onMatchChange } from '../../firebase/rankedService';
import { useAuth } from '../../context/AuthContext';
import './Office.scss';

export default function Office() {
  const { t } = useTranslation();
  const { state, dispatch, saveGame } = useGame();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMatch, setShowMatch] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showInjuredWarning, setShowInjuredWarning] = useState(false);
  const [injuredInLineup, setInjuredInLineup] = useState([]);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [noPlayersWarned, setNoPlayersWarned] = useState(false);
  const [showNoPlayersWarning, setShowNoPlayersWarning] = useState(false);
  const [simProgress, setSimProgress] = useState(null); // { current, total, week }
  const isMobile = window.innerWidth <= 768;
  const isRanked = state.gameMode === 'ranked' && !!state.rankedMatchId;
  
  // Memoize getAllTeams to avoid recalculating on every render
  const allTeamsMemo = useMemo(() => getAllTeams(), [state.leagueTeams]);
  const [rankedSubmitted, setRankedSubmitted] = useState(false);
  
  // Regenerate leagueTeams if missing (e.g. loaded from save without them)
  useEffect(() => {
    if (state.gameStarted && (!state.leagueTeams || state.leagueTeams.length === 0)) {
      dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: getAllTeams() });
    }
  }, [state.gameStarted, state.leagueTeams]);
  
  const handleRankedSubmit = async () => {
    if (!state.rankedMatchId || rankedSubmitted || !user?.uid) return;
    try {
      const config = { formation: state.formation, tactic: state.tactic, morale: 75 };
      await submitRoundConfig(state.rankedMatchId, user.uid, config);
      setRankedSubmitted(true);
      // Try to advance phase after a short delay
      setTimeout(() => advanceRankedPhase(state.rankedMatchId).catch(() => {}), 2000);
    } catch (e) {
      console.error('Error submitting ranked config:', e);
      alert(e.message);
    }
  };
  
  // Listen for ranked match phase changes while in Office
  React.useEffect(() => {
    if (!isRanked || !state.rankedMatchId) return;
    const unsub = onMatchChange(state.rankedMatchId, (data) => {
      if (!data) return;
      // Redirect to RankedMatch for simulation/results phases
      if (['simulating1', 'simulating2', 'results'].includes(data.phase)) {
        dispatch({ type: 'SET_SCREEN', payload: 'ranked_match' });
      }
      // Reset submit button when phase changes to a new round
      if (data.phase === 'round2') {
        setRankedSubmitted(false);
      }
      // Both-ready advance is handled by RankedTimer — no duplicate trigger here
    });
    return () => unsub();
  }, [isRanked, state.rankedMatchId]);
  
  // Detectar si la temporada ha terminado
  const playerLeagueId = state.playerLeagueId || 'laliga';
  const leagueIsOver = !state.preseasonPhase && state.fixtures?.length > 0 && isSeasonOver(state.fixtures, playerLeagueId);
  
  // v2: If European calendar exists, season continues until European comps finish
  let seasonOver = leagueIsOver;
  if (seasonOver && state.europeanCalendar && state.europeanCompetitions) {
    const playerComp = getPlayerCompetition(state.europeanCompetitions, state.teamId);
    const stillAlive = playerComp && isTeamAlive(playerComp.state, state.teamId);
    const hasMoreEuropeanWeeks = state.currentWeek < state.europeanCalendar.totalWeeks;
    if ((stillAlive && hasMoreEuropeanWeeks) || state.pendingEuropeanMatch) {
      seasonOver = false; // Player still has European matches to play
    }
  }
  // Same check for SA competitions
  if (seasonOver && state.europeanCalendar && state.saCompetitions) {
    const hasMoreWeeks = state.currentWeek < state.europeanCalendar.totalWeeks;
    if (hasMoreWeeks || state.pendingSAMatch) {
      seasonOver = false; // Player still has SA matches to play
    }
  }
  // Note: pendingAperturaClausuraFinal is handled inside SeasonEnd component
  
  // Calcular punto medio de la temporada
  const maxWeek = state.fixtures?.length > 0 
    ? Math.max(...state.fixtures.map(f => f.week)) : 38;
  const halfSeason = Math.ceil(maxWeek / 2);
  const isPastHalfSeason = !state.preseasonPhase && state.currentWeek >= halfSeason;

  const formatMoney = (amount) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  // Comprobar lesionados en alineación titular
  const getInjuredInLineup = () => {
    const lineup = state.lineup || {};
    const lineupNames = Object.values(lineup).filter(p => p).map(p => p.name);
    const players = state.team?.players || [];
    return players.filter(p => 
      lineupNames.includes(p.name) && p.injured && p.injuryWeeksLeft > 0
    );
  };

  const getSuspendedInLineup = () => {
    const lineup = state.lineup || {};
    const lineupNames = Object.values(lineup).filter(p => p).map(p => p.name);
    const players = state.team?.players || [];
    return players.filter(p => 
      lineupNames.includes(p.name) && p.suspended && p.suspensionMatches > 0
    );
  };

  const handleAdvanceWeek = () => {
    console.log('🔄 handleAdvanceWeek called', { 
      preseasonPhase: state.preseasonPhase, 
      currentWeek: state.currentWeek,
      fixturesLength: state.fixtures?.length,
      teamId: state.teamId,
      gameMode: state.gameMode,
      seasonOver
    });
    // Comprobar si hay suficientes jugadores (mínimo 11)
    const totalPlayers = (state.team?.players || []).length;
    if (totalPlayers < 11) {
      if (noPlayersWarned) {
        // Segundo intento sin fichar → Game Over
        if (state.gameMode === 'contrarreloj') {
          dispatch({ type: 'CONTRARRELOJ_LOSE', payload: { reason: 'no_players' } });
        } else {
          dispatch({ type: 'SET_MANAGER_FIRED', payload: { reason: t('office.notEnoughPlayers') } });
        }
        return;
      }
      // Primer aviso
      setNoPlayersWarned(true);
      setShowNoPlayersWarning(true);
      return;
    }
    // Si ya tiene 11+, resetear el aviso
    setNoPlayersWarned(false);

    // Comprobar si la temporada ha terminado
    if (seasonOver) {
      setShowSeasonEnd(true);
      return;
    }
    
    // Comprobar si hay lesionados en la alineación
    const injured = getInjuredInLineup();
    if (injured.length > 0) {
      setInjuredInLineup(injured);
      setShowInjuredWarning(true);
      return;
    }
    
    // Auto-sacar sancionados del lineup antes de avanzar
    const suspendedInLineup = getSuspendedInLineup();
    if (suspendedInLineup.length > 0) {
      // Remove suspended players from lineup automatically
      const cleanedLineup = { ...(state.lineup || {}) };
      const suspNames = new Set(suspendedInLineup.map(p => p.name));
      Object.keys(cleanedLineup).forEach(slot => {
        if (cleanedLineup[slot] && suspNames.has(cleanedLineup[slot].name)) {
          delete cleanedLineup[slot];
        }
      });
      dispatch({ type: 'SET_LINEUP', payload: cleanedLineup });
    }
    
    proceedAdvanceWeek();
  };
  
  const proceedAdvanceWeek = () => {
    // Doble check de fin de temporada
    if (seasonOver) {
      setShowSeasonEnd(true);
      return;
    }
    
    // Si estamos en pretemporada, jugar partido amistoso
    if (state.preseasonPhase) {
      const preseasonMatch = state.preseasonMatches?.[state.preseasonWeek - 1];
      if (preseasonMatch) {
        setShowMatch(true);
        return;
      } else {
        // Pretemporada terminada
        dispatch({ type: 'END_PRESEASON' });
        return;
      }
    }
    
    const weekFixtures = (state.fixtures || []).filter(f => f.week === state.currentWeek && !f.played);
    const playerMatch = weekFixtures.find(f => 
      f.homeTeam === state.teamId || f.awayTeam === state.teamId
    );
    
    // DEBUG
    console.log('handleAdvanceWeek DEBUG:', {
      teamId: state.teamId,
      currentWeek: state.currentWeek,
      totalFixtures: state.fixtures?.length,
      weekFixturesCount: weekFixtures.length,
      weekFixtures: weekFixtures.slice(0, 3),
      playerMatch: playerMatch,
      allTeamsCount: allTeamsMemo.length,
      seasonOver: seasonOver,
      pendingEuropeanMatch: state.pendingEuropeanMatch ? 'yes' : 'no'
    });
    
    if (state.pendingCupMatch) {
      // Cup match takes priority
      setShowMatch(true);
    } else if (state.pendingEuropeanMatch) {
      // European match takes priority (midweek before weekend league match)
      setShowMatch(true);
    } else if (state.pendingSAMatch) {
      // SA match takes priority (same logic as European)
      setShowMatch(true);
    } else if (playerMatch) {
      setShowMatch(true);
    } else {
      const result = simulateOtherMatches();
      dispatch({ type: 'SET_FIXTURES', payload: result.fixtures });
      dispatch({ type: 'SET_LEAGUE_TABLE', payload: result.table });
      dispatch({ type: 'ADVANCE_WEEK' });
    }
  };
  
  const handleMatchComplete = (completedMatchType) => {
    setShowMatch(false);
    
    // Auto-save after every match (if autoSave enabled)
    if (state.settings?.autoSave !== false) {
      // Small delay to let dispatches settle before saving
      setTimeout(() => saveGame(), 500);
    }
    
    if (state.preseasonPhase) {
      // Avanzar semana de pretemporada
      const nextWeek = (state.preseasonWeek || 1) + 1;
      if (nextWeek > (state.preseasonMatches?.length || 5)) {
        // Pretemporada terminada
        dispatch({ type: 'END_PRESEASON' });
      } else {
        dispatch({ type: 'ADVANCE_PRESEASON_WEEK' });
      }
    } else {
      // After a cup/European match, check if there's still a league match this week
      // Use completedMatchType to avoid stale state issues:
      // - After a league match: we know fixtures were updated, skip stale check
      // - After cup/european: check if there's a pending league match (stale is OK here
      //   because the league fixture wasn't touched)
      
      if (completedMatchType === 'league') {
        // League match done — MatchDay already simulated other matches and dispatched
        // SET_FIXTURES + SET_LEAGUE_TABLE. Don't re-simulate (stale state would overwrite).
        dispatch({ type: 'ADVANCE_WEEK' });
      } else {
        // Cup or European match done — check if there's still a league match this week
        const weekFixtures = state.fixtures.filter(f => f.week === state.currentWeek && !f.played);
        const leagueMatch = weekFixtures.find(f => 
          f.homeTeam === state.teamId || f.awayTeam === state.teamId
        );
        
        if (leagueMatch) {
          // Still a league match to play — don't advance
          return;
        }
        
        dispatch({ type: 'ADVANCE_WEEK' });
      }
    }
  };
  
  const simulateOtherMatches = (fixtures = state.fixtures, table = state.leagueTable, week = state.currentWeek) => {
    const allTeams = allTeamsMemo.map(t => {
      if (t.id === state.teamId) {
        return state.team;
      }
      return t;
    });
    
    const result = simulateWeekMatches(
      fixtures,
      table,
      week,
      state.teamId,
      allTeams
    );
    
    return result;
  };
  
  const handleSimulateWeeks = async (numWeeks) => {
    // No simular múltiples semanas durante pretemporada
    if (state.preseasonPhase) return;
    // No simular si hay partido de copa o europeo pendiente
    if (state.pendingCupMatch) return;
    if (state.pendingEuropeanMatch) return;
    if (state.pendingSAMatch) return;
    
    setSimulating(true);
    dispatch({ type: 'SET_SIMULATING', payload: true });
    if (!isRanked) setSimProgress({ pct: 0, week: state.currentWeek });
    
    // Copia local del estado para ir actualizando
    let currentFixtures = [...state.fixtures];
    let currentTable = [...state.leagueTable];
    let currentWeek = state.currentWeek;
    const allTeams = allTeamsMemo;
    let weeksSimulated = 0;
    let seasonEnded = false;
    
    // Track local team state so injuries are reflected in subsequent simulated weeks
    let localTeamPlayers = state.team?.players ? state.team.players.map(p => ({ ...p })) : [];
    
    // Track accumulated ticket income locally to avoid stale state overwrites
    let localAccumulatedIncome = state.stadium?.accumulatedTicketIncome ?? 0;
    
    // Track cup competition locally (avoids losing pendingCupMatch across ADVANCE_WEEKs)
    let localCupCompetition = state.cupCompetition ? { ...state.cupCompetition } : null;
    let cupChanged = false;
    
    // Máxima jornada de la liga (dinámica según liga del jugador)
    const maxWeek = currentFixtures.length > 0 
      ? Math.max(...currentFixtures.map(f => f.week)) 
      : 38;
    
    // Only add safety margin for end-of-season simulation (numWeeks > halfSeason remaining)
    const halfSeasonLocal = Math.ceil(maxWeek / 2);
    const isEndOfSeasonSim = numWeeks > (halfSeasonLocal - currentWeek + 5);
    const effectiveNumWeeks = isEndOfSeasonSim ? Math.max(numWeeks, maxWeek - currentWeek + 2) : numWeeks;
    
    for (let i = 0; i < effectiveNumWeeks; i++) {
      // Comprobar si la temporada ha terminado
      if (currentWeek > maxWeek || isSeasonOver(currentFixtures, playerLeagueId) || state.pendingAperturaClausuraFinal) {
        seasonEnded = true;
        break;
      }
      
      // Yield to UI every 2 weeks to keep progress bar smooth
      // Phase 1 (local sim) = 0-50% of total progress
      if (i % 2 === 0) {
        if (!isRanked) setSimProgress({ pct: Math.round((i / effectiveNumWeeks) * 50), week: currentWeek });
        await new Promise(resolve => setTimeout(resolve, 16));
      }
      weeksSimulated++;
      
      // Buscar partido del jugador en esta semana
      const weekFixtures = currentFixtures.filter(f => f.week === currentWeek && !f.played);
      const playerMatch = weekFixtures.find(f => 
        f.homeTeam === state.teamId || f.awayTeam === state.teamId
      );
      
      // Simular partido del jugador si existe
      if (playerMatch) {
        const isHome = playerMatch.homeTeam === state.teamId;
        const opponentId = isHome ? playerMatch.awayTeam : playerMatch.homeTeam;
        const opponent = allTeams.find(t => t.id === opponentId);
        
        if (opponent) {
          const localTeam = { ...state.team, players: localTeamPlayers };
          const homeTeamData = isHome ? localTeam : opponent;
          const awayTeamData = isHome ? opponent : localTeam;
          
          // Get table entries for morale
          const teamEntry = currentTable.find(t => t.teamId === state.teamId);
          const opponentEntry = currentTable.find(t => t.teamId === opponentId);
          
          // Calcular asistencia si somos locales
          let attendanceFillRate = 0.7;
          if (isHome && state.stadium) {
            const stadium = state.stadium;
            const levelCapacity = [8000, 18000, 35000, 55000, 80000][stadium.level || 0];
            const stadiumCapacity = stadium.realCapacity || levelCapacity;
            const seasonTickets = stadium.seasonTicketsFinal ?? stadium.seasonTickets ?? Math.floor(stadiumCapacity * 0.3);
            const ticketPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
            const rivalPosition = currentTable.findIndex(t => t.teamId === opponentId) + 1 || 10;
            const teamPosition = currentTable.findIndex(t => t.teamId === state.teamId) + 1 || 10;
            const teamEntry = currentTable.find(t => t.teamId === state.teamId);
            
            const leagueId = state.playerLeagueId || state.leagueId || 'laliga';
            const division = ['segunda', 'segundaRFEF', 'primeraRFEF'].includes(leagueId) ? 2 : 1;
            const teamPlayers = state.team?.players || [];
            const teamOvr = teamPlayers.length > 0 
              ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length) : 70;
            
            const attendance = calculateMatchAttendance({
              stadiumCapacity,
              seasonTickets,
              ticketPrice,
              rivalTeam: opponent,
              rivalPosition,
              teamPosition,
              totalTeams: currentTable.length || 20,
              streak: teamEntry?.streak || 0,
              morale: teamEntry?.morale || 70,
              leagueId,
              homeTeamId: state.teamId,
              awayTeamId: opponentId,
              teamOverall: teamOvr,
              teamReputation: state.team?.reputation || 70,
              division
            });
            attendanceFillRate = attendance.fillRate;
          }
          
          const result = simulateMatch(
            playerMatch.homeTeam,
            playerMatch.awayTeam,
            homeTeamData,
            awayTeamData,
            {
              homeFormation: isHome ? (state.formation || '4-3-3') : '4-3-3',
              awayFormation: isHome ? '4-3-3' : (state.formation || '4-3-3'),
              homeTactic: isHome ? (state.tactic || 'balanced') : 'balanced',
              awayTactic: isHome ? 'balanced' : (state.tactic || 'balanced'),
              homeMorale: isHome ? (teamEntry?.morale || 70) : (opponentEntry?.morale || 70),
              awayMorale: isHome ? (opponentEntry?.morale || 70) : (teamEntry?.morale || 70),
              homeLineup: isHome ? (state.lineup || null) : null,
              awayLineup: isHome ? null : (state.lineup || null),
              attendanceFillRate: isHome ? attendanceFillRate : 0.7,
              grassCondition: state.stadium?.grassCondition ?? 100,
              medicalPrevention: state.facilitySpecs?.medical === 'prevention' ? 0.30 : 0,
              playerIsHome: isHome
            },
            state.playerForm || {},
            state.teamId
          );
          
          // Ingresos de taquilla si somos locales (ACUMULAR, no dar directo)
          if (isHome && state.stadium) {
            const stadium = state.stadium;
            const levelCap = [8000, 18000, 35000, 55000, 80000][stadium.level || 0];
            const sCap = stadium.realCapacity || levelCap;
            const sTix = stadium.seasonTicketsFinal ?? stadium.seasonTickets ?? Math.floor(sCap * 0.3);
            const tPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
            const sLevel = stadium.level ?? 0;
            
            const leagueId = state.playerLeagueId || state.leagueId || 'laliga';
            const division = ['segunda', 'segundaRFEF', 'primeraRFEF'].includes(leagueId) ? 2 : 1;
            const teamPlayers = state.team?.players || [];
            const teamOvr = teamPlayers.length > 0 
              ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length) : 70;
            
            const att = calculateMatchAttendance({
              stadiumCapacity: sCap,
              seasonTickets: sTix,
              ticketPrice: tPrice,
              rivalTeam: opponent,
              rivalPosition: currentTable.findIndex(t => t.teamId === opponentId) + 1 || 10,
              teamPosition: currentTable.findIndex(t => t.teamId === state.teamId) + 1 || 10,
              totalTeams: currentTable.length || 20,
              streak: currentTable.find(t => t.teamId === state.teamId)?.streak || 0,
              morale: currentTable.find(t => t.teamId === state.teamId)?.morale || 70,
              leagueId,
              homeTeamId: state.teamId,
              awayTeamId: opponentId,
              teamOverall: teamOvr,
              teamReputation: state.team?.reputation || 70,
              division
            });
            
            const tktIncome = att.ticketSales * tPrice;
            const concRate = 8 + (sLevel * 2);
            const concIncome = att.attendance * concRate;
            const totalIncome = tktIncome + concIncome;
            
            // Acumular ingresos localmente (evita stale state overwrites)
            localAccumulatedIncome += totalIncome;
          }
          
          // Aplicar lesiones del equipo del jugador
          const playerTeamSide = isHome ? 'home' : 'away';
          const playerInjuries = result.events?.filter(e => 
            e.type === 'injury' && e.team === playerTeamSide
          ) || [];
          
          // Note: During batch simulation, injuries from match events are NOT dispatched
          // individually because ADVANCE_WEEKS_BATCH will also process injuries via ADVANCE_WEEK,
          // Always dispatch injuries — ADVANCE_WEEK heals by decrementing weeksLeft,
          // which is correct: injury on week N gets 1 week healed on N+1.
          {
            playerInjuries.forEach(injury => {
              dispatch({
                type: 'INJURE_PLAYER',
                payload: {
                  playerName: injury.player,
                  weeksOut: injury.weeksOut,
                  severity: injury.severity
                }
              });
              // Update local team state so subsequent weeks reflect injuries
              localTeamPlayers = localTeamPlayers.map(p =>
                p.name === injury.player
                  ? { ...p, injured: true, injuryWeeksLeft: injury.weeksOut }
                  : p
              );
            });
          }
          
          // Actualizar fixtures
          currentFixtures = currentFixtures.map(f => {
            if (f.id === playerMatch.id) {
              return { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore, events: result.events };
            }
            return f;
          });
          
          // Actualizar tabla
          currentTable = updateTable(
            currentTable,
            playerMatch.homeTeam,
            playerMatch.awayTeam,
            result.homeScore,
            result.awayScore
          );
        }
      }
      
      // Heal injuries locally each week (mirrors ADVANCE_WEEK)
      localTeamPlayers = localTeamPlayers.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          const left = p.injuryWeeksLeft - 1;
          return left <= 0
            ? { ...p, injured: false, injuryWeeksLeft: 0, injuryType: null }
            : { ...p, injuryWeeksLeft: left };
        }
        return p;
      });

      // Simular resto de partidos de la semana
      const localTeamForOthers = { ...state.team, players: localTeamPlayers };
      const teamsWithPlayer = allTeamsMemo.map(t => t.id === state.teamId ? localTeamForOthers : t);
      const otherResult = simulateWeekMatches(
        currentFixtures,
        currentTable,
        currentWeek,
        state.teamId,
        teamsWithPlayer
      );
      
      currentFixtures = otherResult.fixtures;
      currentTable = otherResult.table;

      // ── CUP: Auto-simular partido de copa del jugador ──
      if (localCupCompetition && !localCupCompetition.winner &&
          isCupWeek(currentWeek, state.europeanCalendar)) {
        const cupRoundIdx = getCupRoundForWeek(currentWeek, state.europeanCalendar);
        if (cupRoundIdx !== null && cupRoundIdx === localCupCompetition.currentRound) {
          // Build teams map for cup simulation
          const cupTeamsMap = {};
          if (state.leagueTeams) {
            state.leagueTeams.forEach(t => { cupTeamsMap[t.id] = t; });
          }
          if (state.team) cupTeamsMap[state.teamId] = state.team;

          const { updatedBracket, playerMatch: cupPlayerMatch } = simulateCupRound(
            localCupCompetition, cupRoundIdx, state.teamId, cupTeamsMap
          );
          localCupCompetition = updatedBracket;

          // Auto-simulate the player's cup match
          if (cupPlayerMatch && !localCupCompetition.playerEliminated) {
            const cupHome = cupPlayerMatch.homeTeam;
            const cupAway = cupPlayerMatch.awayTeam;
            const homeData = cupTeamsMap[cupHome.teamId] || { id: cupHome.teamId, name: cupHome.teamName, players: cupHome.players || [], reputation: cupHome.reputation || 70 };
            const awayData = cupTeamsMap[cupAway.teamId] || { id: cupAway.teamId, name: cupAway.teamName, players: cupAway.players || [], reputation: cupAway.reputation || 70 };

            const cupIsHome = cupHome.teamId === state.teamId;
            const cupResult = simulateMatch(
              cupHome.teamId, cupAway.teamId, homeData, awayData,
              {
                homeFormation: cupIsHome ? (state.formation || '4-3-3') : '4-3-3',
                awayFormation: cupIsHome ? '4-3-3' : (state.formation || '4-3-3'),
                homeTactic: cupIsHome ? (state.tactic || 'balanced') : 'balanced',
                awayTactic: cupIsHome ? 'balanced' : (state.tactic || 'balanced'),
                homeLineup: cupIsHome ? (state.lineup || null) : null,
                awayLineup: cupIsHome ? null : (state.lineup || null),
                homeMorale: 70, awayMorale: 70,
                grassCondition: state.stadium?.grassCondition ?? 100,
                medicalPrevention: state.facilitySpecs?.medical === 'prevention' ? 0.30 : 0,
                playerIsHome: cupIsHome,
                knockout: true
              },
              state.playerForm || {}, state.teamId
            );

            localCupCompetition = completeCupMatch(
              localCupCompetition, cupRoundIdx, cupPlayerMatch.matchIdx,
              cupResult.homeScore, cupResult.awayScore, state.teamId
            );
          }
          cupChanged = true;
        }
      }

      currentWeek++;
    }
    
    // Aplicar todos los cambios de una vez
    dispatch({ type: 'SET_FIXTURES', payload: currentFixtures });
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: currentTable });
    
    // Si la copa cambió durante la simulación, actualizar
    if (cupChanged && localCupCompetition) {
      dispatch({ type: 'INIT_CUP_COMPETITION', payload: localCupCompetition });
    }
    
    // Aplicar ingresos acumulados de taquilla de una vez (evita stale state)
    if (localAccumulatedIncome > (state.stadium?.accumulatedTicketIncome ?? 0)) {
      dispatch({
        type: 'UPDATE_STADIUM',
        payload: {
          accumulatedTicketIncome: localAccumulatedIncome,
          ticketPriceLocked: true
        }
      });
    }
    
    // Other leagues are now simulated inside ADVANCE_WEEK (GameContext)
    
    // Avanzar semanas en chunks para no bloquear el UI
    // Phase 2 (reducer) = 50-100% of total progress
    const CHUNK_SIZE = 4;
    for (let c = 0; c < weeksSimulated; c += CHUNK_SIZE) {
      const chunk = Math.min(CHUNK_SIZE, weeksSimulated - c);
      dispatch({ type: 'ADVANCE_WEEKS_BATCH', payload: { count: chunk } });
      if (!isRanked) setSimProgress({ pct: 50 + Math.round(((c + chunk) / weeksSimulated) * 50), week: state.currentWeek + c + chunk });
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    setSimulating(false);
    dispatch({ type: 'SET_SIMULATING', payload: false });
    setSimProgress(null);
    
    // Auto-save after simulation (if autoSave enabled)
    if (state.settings?.autoSave !== false) {
      setTimeout(() => saveGame(), 500);
    }
    
    // Si la temporada terminó, mostrar modal de fin de temporada
    if (seasonEnded) {
      setShowSeasonEnd(true);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'season',
          title: t('office.seasonEnd'),
          content: t('office.seasonEndedAfterWeeks', { weeks: weeksSimulated }),
          date: `${t('common.week')} ${state.currentWeek + weeksSimulated}`
        }
      });
    } else {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'simulation',
          title: t('office.simulatedWeeks', { weeks: weeksSimulated }),
          content: t('office.advancedToWeek', { week: state.currentWeek + weeksSimulated }),
          date: `${t('common.week')} ${state.currentWeek + weeksSimulated}`
        }
      });
    }
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'plantilla':
        return <Plantilla />;
      case 'formation':
        return <Formation />;
      case 'training':
        return <Training />;
      case 'objectives':
        return <Objectives />;
      case 'calendar':
        return <Calendar />;
      case 'table':
        return <Competitions />;
      case 'transfers':
        return <Transfers />;
      case 'stadium':
        return <Stadium />;
      case 'finance':
        return <Finance />;
      case 'facilities':
        return <Facilities />;
      case 'competitions':
        return <Competitions />;
      case 'europe':
        return <Europe />;
      case 'cup':
        return <Cup />;
      case 'messages':
        return <Messages />;
      default:
        return renderOverview();
    }
  };
  
  const renderOverview = () => {
    const position = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1;
    const teamStats = state.leagueTable.find(t => t.teamId === state.teamId);
    
    // En pretemporada mostrar el amistoso, en liga el siguiente partido
    let nextMatch = null;
    if (state.preseasonPhase && state.preseasonMatches?.length > 0) {
      const preseasonIdx = (state.preseasonWeek || 1) - 1;
      const preMatch = state.preseasonMatches[preseasonIdx];
      if (preMatch && !preMatch.played) {
        nextMatch = {
          ...preMatch,
          isPreseason: true,
          week: state.preseasonWeek
        };
      }
    } else {
      nextMatch = state.fixtures.find(f => 
        f.week >= state.currentWeek && 
        !f.played && 
        (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
      );
    }
    
    return (
      <div className="office__overview">
        {state.gameMode === 'promanager' && <ProManagerDashboard />}
        <div className="office__welcome">
          <h2>{t('office.welcomeName', { name: user?.displayName || t('office.manager') })}</h2>
          <p>{t('office.seasonInfo', { season: state.currentSeason })} · {state.preseasonPhase ? t('office.preseason', { week: state.preseasonWeek, total: state.preseasonMatches?.length || 5 }) : t('office.weekInfo', { week: state.currentWeek })}</p>
        </div>
        
        <div className="office__cards">
          <div className="office__card office__card--position">
            <div className="office__card-icon">
              <Trophy size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">{t('leagueTable.position')}</span>
              <span className="value">{position}º</span>
            </div>
          </div>
          
          <div className="office__card office__card--points">
            <div className="office__card-icon">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">{t('leagueTable.points')}</span>
              <span className="value">{teamStats?.points || 0}</span>
            </div>
          </div>
          
          <div className="office__card office__card--budget">
            <div className="office__card-icon">
              <Wallet size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">{t('office.budget')}</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
          </div>
          
          <div className="office__card office__card--squad">
            <div className="office__card-icon">
              <Users size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">{t('plantilla.title')}</span>
              <span className="value">{state.team?.players?.length || 0}</span>
              <span className="sublabel">{t('office.players')}</span>
            </div>
          </div>
        </div>
        
        {/* Barra de confianza del míster */}
        {!state.preseasonPhase && state.currentWeek > 5 && !isRanked && (
          <div className="office__confidence" style={{
            margin: '0 0 1.5rem',
            padding: '0.75rem 1rem',
            background: state.managerConfidence <= 25 ? 'rgba(231,76,60,0.12)' : 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: state.managerConfidence <= 25 ? '1px solid rgba(231,76,60,0.3)' : '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#8899aa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {state.managerConfidence <= 25 ? <><AlertTriangle size={12} />{' '}</> : ''}{t('office.boardConfidence')}
              </span>
              <span style={{ 
                fontSize: '0.85rem', fontWeight: 700,
                color: state.managerConfidence > 60 ? '#2ecc71' : state.managerConfidence > 40 ? '#f39c12' : state.managerConfidence > 25 ? '#e67e22' : '#e74c3c'
              }}>
                {state.managerConfidence}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', transition: 'width 0.5s, background 0.5s',
                width: `${state.managerConfidence}%`,
                background: state.managerConfidence > 60 ? '#2ecc71' : state.managerConfidence > 40 ? '#f39c12' : state.managerConfidence > 25 ? '#e67e22' : '#e74c3c'
              }} />
            </div>
          </div>
        )}
        
        <div className="office__grid">
          <div className="office__grid-left">
            {nextMatch && (
              <div className="office__next-match">
                <h3>{t('office.nextMatch')}</h3>
                <span className="office__match-week">
                  {nextMatch.isPreseason ? t('office.friendlyMatch', { week: nextMatch.week }) : t('office.matchday', { week: nextMatch.week })}
                </span>
                <div className="office__match-preview">
                  <div className="team home">
                    <span className="name">
                      {nextMatch.isPreseason 
                        ? (nextMatch.homeTeamName || nextMatch.homeTeam)
                        : (nextMatch.homeTeam === state.teamId ? state.team.name : 
                          state.leagueTable.find(t => t.teamId === nextMatch.homeTeam)?.teamName)}
                    </span>
                  </div>
                  <div className="vs">{t('office.vs')}</div>
                  <div className="team away">
                    <span className="name">
                      {nextMatch.isPreseason
                        ? (nextMatch.awayTeamName || nextMatch.awayTeam)
                        : (nextMatch.awayTeam === state.teamId ? state.team.name : 
                          state.leagueTable.find(t => t.teamId === nextMatch.awayTeam)?.teamName)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="office__form">
              <h3>{t('office.lastResults')}</h3>
              <div className="office__form-badges">
                {teamStats?.form && teamStats.form.length > 0 ? (
                  teamStats.form.map((result, idx) => (
                    <span key={idx} className={`form-badge ${result.toLowerCase()}`}>
                      {t(`office.form_${result}`)}
                    </span>
                  ))
                ) : (
                  <span className="no-results">{t('office.noMatches')}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="office__grid-right">
            {state.seasonObjectives?.length > 0 && state.gameMode !== 'contrarreloj' && !isRanked && (
              <div className="office__objective-preview" onClick={() => setActiveTab('objectives')}>
                <h3>
                  <Target size={18} strokeWidth={2} />
                  <span>{t('office.mainObjective')}</span>
                </h3>
                {(() => {
                  const criticalObj = state.seasonObjectives.find(o => o.priority === 'critical');
                  if (!criticalObj) return null;
                  
                  let progress = 0;
                  if (criticalObj.type === 'league_position') {
                    if (position <= criticalObj.target) progress = 100;
                    else progress = Math.max(0, Math.round((1 - (position - criticalObj.target) / (20 - criticalObj.target)) * 100));
                  }
                  
                  const status = progress >= 100 ? 'completed' : progress >= 70 ? 'on-track' : progress >= 40 ? 'warning' : 'danger';
                  
                  return (
                    <div className={`objective-item objective-item--${status}`}>
                      <div className="objective-info">
                        <span className="objective-name">{criticalObj.nameKey ? t(criticalObj.nameKey) : criticalObj.name}</span>
                        <span className="objective-desc">{criticalObj.descKey ? t(criticalObj.descKey) : criticalObj.description}</span>
                      </div>
                      <div className="objective-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="progress-text">{progress}%</span>
                      </div>
                    </div>
                  );
                })()}
                <span className="view-all">
                  <span>{t('office.viewAllObjectives')}</span>
                  <ChevronRight size={16} />
                </span>
              </div>
            )}
            
            {state.messages.length > 0 && !isRanked && (
              <div className="office__recent-messages" onClick={() => setActiveTab('messages')}>
                <h3>{t('office.recentMessages')}</h3>
                {state.messages.slice(0, 3).map(msg => (
                  <div key={msg.id} className="office__message-preview">
                    <span className="title">{msg.title}</span>
                    <span className="date">{msg.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  if (showMatch) {
    return <MatchDay onComplete={handleMatchComplete} />;
  }
  
  // Modal de advertencia de lesionados en alineación
  if (showNoPlayersWarning) {
    const currentPlayers = (state.team?.players || []).length;
    return (
      <div className="office">
        <div className="injured-warning-modal">
          <div className="injured-warning-content">
            <h2><AlertTriangle size={16} /> {t('office.insufficientSquad')}</h2>
            <p>{t('office.onlyHavePlayers', { count: currentPlayers })}</p>
            <p className="warning-hint">{t('office.goToTransfersWarning')}</p>
            <div className="warning-buttons">
              <button className="btn-primary" onClick={() => {
                setShowNoPlayersWarning(false);
                setActiveTab('transfers');
              }}>
                <Users size={16} /> {t('office.goToTransfers')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showInjuredWarning) {
    return (
      <div className="office">
        <div className="injured-warning-modal">
          <div className="injured-warning-content">
            <h2><AlertTriangle size={16} /> {t('office.injuredWarning')}</h2>
            <p>{t('office.playersInjured', { count: injuredInLineup.length })}:</p>
            
            <ul className="injured-list">
              {injuredInLineup.map(p => (
                <li key={p.name}>
                  <span className="pos">{translatePosition(p.position)}</span>
                  <span className="name">{p.name}</span>
                  <span className="weeks"><HeartPulse size={14} /> {t('office.weeksOut', { weeks: p.injuryWeeksLeft })}</span>
                </li>
              ))}
            </ul>
            
            <p className="warning-hint">{t('office.checkFormation')}</p>
            
            <div className="warning-buttons">
              <button className="btn-primary" onClick={() => {
                setShowInjuredWarning(false);
                setActiveTab('formation');
              }}>
                {t('office.goToFormation')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Modal de despido
  if (state.managerFired) {
    return <ManagerFired />;
  }
  
  // Modal de fin de temporada
  if (showSeasonEnd) {
    return (
      <SeasonEnd 
        allTeams={allTeamsMemo} 
        onComplete={() => {
          setShowSeasonEnd(false);
          // In ProManager mode, show the season end screen with offers
          if (state.gameMode === 'promanager') {
            dispatch({ type: 'SET_SCREEN', payload: 'promanager_season_end' });
          }
        }}
      />
    );
  }
  
  return (
    <div className={`office ${isRanked ? 'office--ranked' : ''}`}>
      {isRanked && <RankedTimer />}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isRanked={isRanked} />
      {!isRanked && <MobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAdvanceWeek={handleAdvanceWeek}
        onSimulate={handleSimulateWeeks}
        simulating={simulating}
      />}
      {isRanked && <MobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAdvanceWeek={handleRankedSubmit}
        onSimulate={() => {}}
        simulating={rankedSubmitted}
        isRanked={true}
      />}
      
      <main className="office__main">
        <header className="office__header">
          <div className="office__team-info">
            <h1>{state.team?.name}</h1>
            <span 
              className="office__manager-name" 
              onClick={() => {
                const newName = window.prompt(t('office.changeManagerName'), state.managerName || 'Gaffer');
                if (newName && newName.trim()) {
                  dispatch({ type: 'SET_MANAGER_NAME', payload: newName.trim().slice(0, 20) });
                }
              }}
              title={t('office.clickToChangeName')}
            >
              <UserRound size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {state.managerName || 'Gaffer'}
            </span>
            <span className="office__season">{t('office.seasonInfo', { season: state.currentSeason })} · {state.preseasonPhase ? t('office.preseason', { week: state.preseasonWeek, total: state.preseasonMatches?.length || 5 }) : t('office.weekInfo', { week: state.currentWeek })}</span>
          </div>
          
          {!isRanked && (
          <div className="office__actions">
            <div className="office__money">
              <span className="label">{t('office.budget')}</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
            
            <button 
              className="office__advance-btn" 
              onClick={handleAdvanceWeek}
              disabled={simulating}
            >
              <SkipForward size={18} strokeWidth={2} />
              <span>{t('office.simulateWeek')}</span>
            </button>
            
            <div className="office__sim-dropdown">
              <button className="office__sim-btn" disabled={simulating || state.preseasonPhase || !!state.pendingEuropeanMatch || !!state.pendingSAMatch || !!state.pendingCupMatch}>
                <FastForward size={18} strokeWidth={2} />
                <span>{simulating ? t('office.simulating') : t('office.simulate')}</span>
              </button>
              {!simulating && !state.preseasonPhase && !state.pendingEuropeanMatch && !state.pendingSAMatch && !state.pendingCupMatch && (
                <div className="office__sim-options">
                  <button onClick={() => handleSimulateWeeks(3)}>{t('office.threeMatches')}</button>
                  {isPastHalfSeason ? (
                    <button onClick={() => handleSimulateWeeks(maxWeek - state.currentWeek + 2)}>{t('office.endOfSeason')}</button>
                  ) : (
                    <button onClick={() => handleSimulateWeeks(halfSeason - state.currentWeek + 1)}>{t('office.halfSeason')}</button>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
          {isRanked && (
            <div className="office__actions office__actions--ranked">
              <div className="office__money">
                <span className="label">{t('office.budget')}</span>
                <span className="value">{formatMoney(state.money)}</span>
              </div>
            </div>
          )}
        </header>
        
        <div className="office__content">
          {renderContent()}
        </div>
      </main>
      
      {/* Simulation Progress Modal */}
      {simProgress && !isRanked && (
        <div className="sim-modal-overlay">
          <div className="sim-modal">
            <div className="sim-modal__icon"><Loader size={40} className="sim-modal__spinner" /></div>
            <h3 className="sim-modal__title">{t('office.simulating')}...</h3>
            <p className="sim-modal__week">{t('common.week')} {simProgress.week}</p>
            <div className="sim-modal__bar-bg">
              <div 
                className="sim-modal__bar-fill" 
                style={{ width: `${Math.min(100, simProgress.pct || 0)}%` }}
              />
            </div>
            <p className="sim-modal__pct">
              {Math.min(100, simProgress.pct || 0)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
