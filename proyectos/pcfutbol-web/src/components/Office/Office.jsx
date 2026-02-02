import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
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
import { isSeasonOver } from '../../game/seasonManager';
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
  HeartPulse
} from 'lucide-react';
import './Office.scss';

export default function Office() {
  const { state, dispatch, saveGame } = useGame();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMatch, setShowMatch] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showInjuredWarning, setShowInjuredWarning] = useState(false);
  const [injuredInLineup, setInjuredInLineup] = useState([]);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const isMobile = window.innerWidth <= 768;
  
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
    
    const weekFixtures = state.fixtures.filter(f => f.week === state.currentWeek && !f.played);
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
      allTeamsCount: getAllTeams().length,
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
    const allTeams = getAllTeams().map(t => {
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
    
    // Copia local del estado para ir actualizando
    let currentFixtures = [...state.fixtures];
    let currentTable = [...state.leagueTable];
    let currentWeek = state.currentWeek;
    const allTeams = getAllTeams();
    let weeksSimulated = 0;
    let seasonEnded = false;
    
    // Track accumulated ticket income locally to avoid stale state overwrites
    let localAccumulatedIncome = state.stadium?.accumulatedTicketIncome ?? 0;
    
    // Track cup competition locally (avoids losing pendingCupMatch across ADVANCE_WEEKs)
    let localCupCompetition = state.cupCompetition ? { ...state.cupCompetition } : null;
    let cupChanged = false;
    
    // Máxima jornada de la liga (dinámica según liga del jugador)
    const maxWeek = currentFixtures.length > 0 
      ? Math.max(...currentFixtures.map(f => f.week)) 
      : 38;
    
    for (let i = 0; i < numWeeks; i++) {
      // Comprobar si la temporada ha terminado
      if (currentWeek > maxWeek || isSeasonOver(currentFixtures, playerLeagueId)) {
        seasonEnded = true;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
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
          const homeTeamData = isHome ? state.team : opponent;
          const awayTeamData = isHome ? opponent : state.team;
          
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
            
            const leagueId = state.leagueId || 'laliga';
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
            { attendanceFillRate: isHome ? attendanceFillRate : 0.7 },
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
            
            const leagueId = state.leagueId || 'laliga';
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
          
          playerInjuries.forEach(injury => {
            dispatch({
              type: 'INJURE_PLAYER',
              payload: {
                playerName: injury.player,
                weeksOut: injury.weeksOut,
                severity: injury.severity
              }
            });
          });
          
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
      
      // Simular resto de partidos de la semana
      const teamsWithPlayer = allTeams.map(t => t.id === state.teamId ? state.team : t);
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

            const cupResult = simulateMatch(
              cupHome.teamId, cupAway.teamId, homeData, awayData,
              { homeMorale: 70, awayMorale: 70 },
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
    
    // Avanzar semanas
    for (let i = 0; i < weeksSimulated; i++) {
      dispatch({ type: 'ADVANCE_WEEK' });
    }
    
    setSimulating(false);
    
    // Si la temporada terminó, mostrar modal de fin de temporada
    if (seasonEnded) {
      setShowSeasonEnd(true);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'season',
          title: 'Fin de Temporada',
          content: `La temporada ha terminado después de ${weeksSimulated} semanas simuladas.`,
          date: `Semana ${state.currentWeek + weeksSimulated}`
        }
      });
    } else {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'simulation',
          title: `Simuladas ${weeksSimulated} semanas`,
          content: `Has avanzado hasta la semana ${state.currentWeek + weeksSimulated}`,
          date: `Semana ${state.currentWeek + weeksSimulated}`
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
        <div className="office__welcome">
          <h2>Bienvenido, Míster</h2>
          <p>Temporada {state.currentSeason} · {state.preseasonPhase ? `Pretemporada ${state.preseasonWeek}/${state.preseasonMatches?.length || 5}` : `Semana ${state.currentWeek}`}</p>
        </div>
        
        <div className="office__cards">
          <div className="office__card office__card--position">
            <div className="office__card-icon">
              <Trophy size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Posición</span>
              <span className="value">{position}º</span>
            </div>
          </div>
          
          <div className="office__card office__card--points">
            <div className="office__card-icon">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Puntos</span>
              <span className="value">{teamStats?.points || 0}</span>
            </div>
          </div>
          
          <div className="office__card office__card--budget">
            <div className="office__card-icon">
              <Wallet size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Presupuesto</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
          </div>
          
          <div className="office__card office__card--squad">
            <div className="office__card-icon">
              <Users size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Plantilla</span>
              <span className="value">{state.team?.players?.length || 0}</span>
              <span className="sublabel">jugadores</span>
            </div>
          </div>
        </div>
        
        {/* Barra de confianza del míster */}
        {!state.preseasonPhase && state.currentWeek > 5 && (
          <div className="office__confidence" style={{
            margin: '0 0 1.5rem',
            padding: '0.75rem 1rem',
            background: state.managerConfidence <= 25 ? 'rgba(231,76,60,0.12)' : 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: state.managerConfidence <= 25 ? '1px solid rgba(231,76,60,0.3)' : '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#8899aa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {state.managerConfidence <= 25 ? <><AlertTriangle size={12} />{' '}</> : ''}Confianza de la directiva
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
                <h3>Próximo Partido</h3>
                <span className="office__match-week">
                  {nextMatch.isPreseason ? `Amistoso ${nextMatch.week}/5` : `Jornada ${nextMatch.week}`}
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
                  <div className="vs">VS</div>
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
              <h3>Últimos Resultados</h3>
              <div className="office__form-badges">
                {teamStats?.form && teamStats.form.length > 0 ? (
                  teamStats.form.map((result, idx) => (
                    <span key={idx} className={`form-badge ${result.toLowerCase()}`}>
                      {result}
                    </span>
                  ))
                ) : (
                  <span className="no-results">Sin partidos jugados</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="office__grid-right">
            {state.seasonObjectives?.length > 0 && (
              <div className="office__objective-preview" onClick={() => setActiveTab('objectives')}>
                <h3>
                  <Target size={18} strokeWidth={2} />
                  <span>Objetivo Principal</span>
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
                        <span className="objective-name">{criticalObj.name}</span>
                        <span className="objective-desc">{criticalObj.description}</span>
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
                  <span>Ver todos los objetivos</span>
                  <ChevronRight size={16} />
                </span>
              </div>
            )}
            
            {state.messages.length > 0 && (
              <div className="office__recent-messages" onClick={() => setActiveTab('messages')}>
                <h3>Mensajes Recientes</h3>
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
  if (showInjuredWarning) {
    return (
      <div className="office">
        <div className="injured-warning-modal">
          <div className="injured-warning-content">
            <h2><AlertTriangle size={16} /> Jugadores lesionados en alineación</h2>
            <p>Tienes {injuredInLineup.length} jugador{injuredInLineup.length > 1 ? 'es' : ''} lesionado{injuredInLineup.length > 1 ? 's' : ''} en tu alineación titular:</p>
            
            <ul className="injured-list">
              {injuredInLineup.map(p => (
                <li key={p.name}>
                  <span className="pos">{p.position}</span>
                  <span className="name">{p.name}</span>
                  <span className="weeks"><HeartPulse size={14} /> {p.injuryWeeksLeft} semana{p.injuryWeeksLeft > 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
            
            <p className="warning-hint">Ve a <strong>Alineación</strong> y sustituye a los lesionados antes de continuar.</p>
            
            <div className="warning-buttons">
              <button className="btn-primary" onClick={() => {
                setShowInjuredWarning(false);
                setActiveTab('formation');
              }}>
                Ir a Alineación
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
        allTeams={getAllTeams()} 
        onComplete={() => {
          setShowSeasonEnd(false);
          // La nueva temporada se iniciará con los nuevos fixtures generados
        }}
      />
    );
  }
  
  return (
    <div className="office">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <MobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAdvanceWeek={handleAdvanceWeek}
        onSimulate={handleSimulateWeeks}
        simulating={simulating}
      />
      
      <main className="office__main">
        <header className="office__header">
          <div className="office__team-info">
            <h1>{state.team?.name}</h1>
            <span className="office__season">Temporada {state.currentSeason} · {state.preseasonPhase ? `Pretemporada ${state.preseasonWeek}/${state.preseasonMatches?.length || 5}` : `Semana ${state.currentWeek}`}</span>
          </div>
          
          <div className="office__actions">
            <div className="office__money">
              <span className="label">Presupuesto</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
            
            <button 
              className="office__advance-btn" 
              onClick={handleAdvanceWeek}
              disabled={simulating}
            >
              <SkipForward size={18} strokeWidth={2} />
              <span>Avanzar Semana</span>
            </button>
            
            <div className="office__sim-dropdown">
              <button className="office__sim-btn" disabled={simulating || state.preseasonPhase || !!state.pendingEuropeanMatch || !!state.pendingSAMatch || !!state.pendingCupMatch}>
                <FastForward size={18} strokeWidth={2} />
                <span>{simulating ? 'Simulando...' : 'Simular'}</span>
              </button>
              {!simulating && !state.preseasonPhase && !state.pendingEuropeanMatch && !state.pendingSAMatch && !state.pendingCupMatch && (
                <div className="office__sim-options">
                  <button onClick={() => handleSimulateWeeks(4)}>4 semanas</button>
                  <button onClick={() => handleSimulateWeeks(10)}>10 semanas</button>
                  <button onClick={() => handleSimulateWeeks(19)}>Media temporada</button>
                  <button onClick={() => handleSimulateWeeks(38)}>Temporada completa</button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <div className="office__content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
