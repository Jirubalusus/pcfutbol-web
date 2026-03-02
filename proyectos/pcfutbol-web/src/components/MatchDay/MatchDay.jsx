import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { TutorialModal, useTutorial } from '../Tutorial/Tutorial';
import { 
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams,
  getPremierTeams, getSerieATeams, getBundesligaTeams, getLigue1Teams,
  getEredivisieTeams, getPrimeiraLigaTeams, getChampionshipTeams, getBelgianProTeams,
  getSuperLigTeams, getScottishPremTeams, getSerieBTeams, getBundesliga2Teams,
  getLigue2Teams, getSwissTeams, getAustrianTeams, getGreekTeams,
  getDanishTeams, getCroatianTeams, getCzechTeams,
  getArgentinaTeams, getBrasileiraoTeams, getColombiaTeams, getChileTeams,
  getUruguayTeams, getEcuadorTeams, getParaguayTeams, getPeruTeams,
  getBoliviaTeams, getVenezuelaTeams
} from '../../data/teamsFirestore';
import { simulateMatch, updateTable, simulateWeekMatches, calculateTeamStrength, FORMATIONS, TACTICS } from '../../game/leagueEngine';
import { ensureFullLineup } from '../../context/GameContext';

// Helper: get short name from team object (fallback to first 3 chars of name)
const getShort = (team) => team?.shortName || team?.name?.substring(0, 3)?.toUpperCase() || '???';
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance, calculateMatchIncome, calculateServicesIncome, STADIUM_SERVICES } from '../../game/stadiumEconomy';
import { calculateBoardConfidence } from '../../game/proManagerEngine';
import { getLeagueName } from '../../game/leagueTiers';
import { getStadiumInfo } from '../../data/stadiumCapacities';
import { Flame, Star, Square, HeartPulse, Ticket, Building2, SkipForward, Circle, ArrowLeft } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
// Ads handled by Office.jsx interstitial (no banner during match)
import TeamCrest from '../TeamCrest/TeamCrest';
import './MatchDay.scss';

// Función para obtener todos los equipos dinámicamente (todas las ligas)
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams(),
  ...getPremierTeams(), ...getSerieATeams(), ...getBundesligaTeams(), ...getLigue1Teams(),
  ...getEredivisieTeams(), ...getPrimeiraLigaTeams(), ...getChampionshipTeams(), ...getBelgianProTeams(),
  ...getSuperLigTeams(), ...getScottishPremTeams(), ...getSerieBTeams(), ...getBundesliga2Teams(),
  ...getLigue2Teams(), ...getSwissTeams(), ...getAustrianTeams(), ...getGreekTeams(),
  ...getDanishTeams(), ...getCroatianTeams(), ...getCzechTeams(),
  ...getArgentinaTeams(), ...getBrasileiraoTeams(), ...getColombiaTeams(), ...getChileTeams(),
  ...getUruguayTeams(), ...getEcuadorTeams(), ...getParaguayTeams(), ...getPeruTeams(),
  ...getBoliviaTeams(), ...getVenezuelaTeams()
];

export default function MatchDay({ onComplete, onBack }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const matchdayTutorial = useTutorial('matchday');

  // Memoize getAllTeams to avoid rebuilding the full team list on every render (#16)
  const allTeamsMemo = useMemo(() => getAllTeams(), []);

  // Auto-fill lineup if empty (e.g. user never visited Formation)
  useEffect(() => {
    const lineupCount = Object.values(state.lineup || {}).filter(Boolean).length;
    if (lineupCount < 11 && state.team?.players?.length >= 11) {
      const filled = ensureFullLineup(state.lineup || {}, state.team.players, state.formation);
      dispatch({ type: 'SET_LINEUP', payload: filled });
    }
  }, []);

  const [phase, setPhase] = useState('preview'); // preview, playing, result
  // Ads: interstitial shown by Office after simulation, no banner here
  const [matchResult, setMatchResult] = useState(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [currentMinute, setCurrentMinute] = useState(0);
  const eventsRef = useRef(null);
  const matchIntervalRef = useRef(null);
  // Double or Nothing perk
  const [betAmount, setBetAmount] = useState(0);
  const [showBetUI, setShowBetUI] = useState(false);
  const canBet = state.gloryData?.perks?.doubleOrNothing && state.money > 0;
  // Achilles Heel perk
  const [achillesTarget, setAchillesTarget] = useState(null);
  const [showAchillesUI, setShowAchillesUI] = useState(false);
  const canAchilles = state.gloryData?.perks?.achillesHeel;
  
  // Helper: normalizar player de eventos (V2 devuelve {name}, V1 devuelve string)
  const getPlayerName = (p) => typeof p === 'object' ? (p?.name || t('common.unknown')) : (p || t('common.unknown'));
  
  // Auto-scroll events list to bottom when new events appear
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [eventIndex]);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (matchIntervalRef.current) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;
      }
    };
  }, []);
  
  // Buscar partido: Cup match → European match → pretemporada → liga
  let playerMatch;
  let isPreseason = false;
  let isEuropeanMatch = false;
  let isCupMatch = false;
  let europeanMatchData = null;
  let cupMatchData = null;

  if (state.pendingCupMatch) {
    // Copa nacional: prioridad sobre todo excepto pretemporada ya iniciada
    cupMatchData = state.pendingCupMatch;
    isCupMatch = true;
    playerMatch = {
      homeTeam: cupMatchData.homeTeam?.teamId,
      awayTeam: cupMatchData.awayTeam?.teamId,
      week: state.currentWeek,
      isCup: true
    };
  } else if (state.pendingEuropeanMatch) {
    // European competition match takes priority
    europeanMatchData = state.pendingEuropeanMatch;
    isEuropeanMatch = true;
    // Build a compatible match object
    const euMatch = state.pendingEuropeanMatch;
    playerMatch = {
      homeTeam: euMatch.homeTeamId || euMatch.homeTeam?.teamId || euMatch.team1?.teamId,
      awayTeam: euMatch.awayTeamId || euMatch.awayTeam?.teamId || euMatch.team2?.teamId,
      week: state.currentWeek,
      isEuropean: true,
      competitionId: euMatch.competitionId,
      competitionName: euMatch.competitionName,
      matchday: euMatch.matchday,
      phase: euMatch.phase
    };
  } else if (state.pendingSAMatch) {
    // South American competition match — treated as European match type
    europeanMatchData = state.pendingSAMatch;
    isEuropeanMatch = true;
    const saMatch = state.pendingSAMatch;
    playerMatch = {
      homeTeam: saMatch.homeTeamId || saMatch.homeTeam?.teamId || saMatch.team1?.teamId,
      awayTeam: saMatch.awayTeamId || saMatch.awayTeam?.teamId || saMatch.team2?.teamId,
      week: state.currentWeek,
      isEuropean: true,
      isSouthAmerican: true,
      competitionId: saMatch.competitionId,
      competitionName: saMatch.competitionName,
      matchday: saMatch.matchday,
      phase: saMatch.phase
    };
  } else if (state.preseasonPhase && state.preseasonMatches?.length > 0) {
    const preseasonIdx = (state.preseasonWeek || 1) - 1;
    const preseasonMatch = state.preseasonMatches[preseasonIdx];
    if (preseasonMatch) {
      playerMatch = preseasonMatch;
      isPreseason = true;
    }
    // If no preseason match available (index out of bounds), fall through to league
  }
  
  if (!playerMatch) {
    playerMatch = state.fixtures.find(f => 
      f.week === state.currentWeek && 
      !f.played && 
      (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
    );
  }

  const isHome = isCupMatch
    ? (cupMatchData.homeTeam?.teamId === state.teamId)
    : isEuropeanMatch
      ? (europeanMatchData.isHome ?? (playerMatch?.homeTeam === state.teamId))
      : (playerMatch?.homeTeam === state.teamId);
  const opponentId = isHome ? playerMatch?.awayTeam : playerMatch?.homeTeam;
  
  // Resolve opponent data
  let opponent;
  if (isCupMatch) {
    // Cup match has team data embedded in cupMatchData
    const cupOpponent = isHome ? cupMatchData.awayTeam : cupMatchData.homeTeam;
    opponent = {
      ...cupOpponent,
      id: cupOpponent?.teamId,
      name: cupOpponent?.teamName,
      shortName: cupOpponent?.shortName || cupOpponent?.teamName?.substring(0, 3)?.toUpperCase(),
      players: cupOpponent?.players || [],
      reputation: cupOpponent?.reputation || 70
    };
  } else if (isEuropeanMatch) {
    // European match has team data embedded
    const eu = europeanMatchData;
    if (isHome) {
      opponent = eu.awayTeam || eu.team2 || { teamId: opponentId, name: t('common.unknown'), reputation: 70 };
    } else {
      opponent = eu.homeTeam || eu.team1 || { teamId: opponentId, name: t('common.unknown'), reputation: 70 };
    }
    // Normalize to match expected shape (id, name, shortName)
    if (!opponent.id && opponent.teamId) opponent = { ...opponent, id: opponent.teamId };
    if (!opponent.name && opponent.teamName) opponent = { ...opponent, name: opponent.teamName };
  } else if (isPreseason && playerMatch?.opponent) {
    opponent = playerMatch.opponent;
  } else {
    opponent = allTeamsMemo.find(t => t.id === opponentId);
  }
  
  // Get team strengths for preview
  // Guard: si no hay partido o rival, no calcular nada
  if (!playerMatch || !opponent) {
    const debugInfo = {
      teamId: state.teamId,
      currentWeek: state.currentWeek,
      fixturesCount: state.fixtures?.length || 0,
      weekFixtures: state.fixtures?.filter(f => f.week === state.currentWeek) || [],
      allTeamsCount: allTeamsMemo.length,
      playerMatchFound: !!playerMatch,
      opponentFound: !!opponent,
      opponentId: opponentId
    };
    console.error('MatchDay Debug (early guard):', debugInfo);
    
    return (
      <div className="match-day fade-in-up">
        <div className="match-day__no-match">
          <p>{t('matchday.noMatchThisWeek')}</p>
          <button onClick={onComplete}>{t('common.continue')}</button>
        </div>
      </div>
    );
  }
  
  const playerStrength = calculateTeamStrength(state.team, state.formation, state.tactic, 70, state.lineup);
  // En pretemporada el opponent puede no tener players completo
  const opponentStrength = (opponent?.players?.length > 0)
    ? calculateTeamStrength(opponent, '4-3-3', 'balanced')
    : { overall: opponent?.reputation || 70, attack: (opponent?.reputation || 70) * 0.9, defense: (opponent?.reputation || 70) * 0.85 };
  
  // Get morale from table
  const playerTableEntry = state.leagueTable.find(t => t.teamId === state.teamId);
  const opponentTableEntry = state.leagueTable.find(t => t.teamId === opponentId);
  
  const simulateAndPlay = () => {
    try {
      console.log('🎮 simulateAndPlay started');
      setPhase('playing');
      
      // En pretemporada el opponent puede no tener players: generar equipo sintético
      const resolvedOpponent = (opponent?.players?.length > 0) ? opponent : {
        ...opponent,
        id: opponent?.id || opponentId,
        name: opponent?.name || 'Rival',
        shortName: opponent?.shortName || opponent?.name?.slice(0, 3)?.toUpperCase() || 'RIV',
        players: Array.from({ length: 18 }, (_, i) => ({
          name: `Jugador ${i + 1}`,
          position: ['GK','CB','CB','CB','RB','LB','CM','CM','CDM','CAM','RM','LM','RW','LW','ST','ST','CF','GK'][i],
          overall: Math.round((opponent?.reputation || 70) + (Math.random() * 10 - 5)),
          age: 22 + Math.floor(Math.random() * 10),
          stamina: 80 + Math.floor(Math.random() * 15)
        }))
      };
      // Achilles Heel: remove targeted player from opponent
      const finalOpponent = achillesTarget
        ? { ...resolvedOpponent, players: (resolvedOpponent.players || []).filter(p => p.name !== achillesTarget) }
        : resolvedOpponent;
      const homeTeamData = isHome ? state.team : finalOpponent;
      const awayTeamData = isHome ? finalOpponent : state.team;
      
      console.log('🎮 Teams:', { homeTeamData: homeTeamData?.name, awayTeamData: awayTeamData?.name });
    
    // Calcular asistencia si somos locales
    let attendanceFillRate = 0.7; // Default para partidos de IA
    let matchAttendance = null;
    
    if (isHome && state.stadium) {
      const stadium = state.stadium;
      const levelCapacity = [8000, 18000, 35000, 55000, 80000][stadium.level || 0];
      const stadiumCapacity = stadium.realCapacity || levelCapacity;
      const seasonTickets = stadium.seasonTicketsFinal ?? stadium.seasonTickets ?? Math.floor(stadiumCapacity * 0.3);
      const ticketPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
      
      // Posición del rival en la tabla
      const rivalPosition = state.leagueTable.findIndex(t => t.teamId === opponentId) + 1 || 10;
      const teamPosition = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1 || 10;
      
      // División según liga (para precio justo dinámico)
      const leagueId = state.leagueId || 'laliga';
      const division = ['segunda', 'segundaRFEF', 'primeraRFEF'].includes(leagueId) ? 2 : 1;
      const teamPlayers = state.team?.players || [];
      const teamOverall = teamPlayers.length > 0 
        ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length) : 70;
      
      matchAttendance = calculateMatchAttendance({
        stadiumCapacity,
        seasonTickets,
        ticketPrice,
        rivalTeam: opponent,
        rivalPosition,
        teamPosition,
        totalTeams: state.leagueTable.length || 20,
        streak: playerTableEntry?.streak || 0,
        morale: playerTableEntry?.morale || 70,
        leagueId,
        homeTeamId: state.teamId,
        awayTeamId: opponentId,
        teamOverall,
        teamReputation: state.team?.reputation || 70,
        division
      });
      
      attendanceFillRate = matchAttendance.fillRate;
    }
    
    // Pass formation and tactic context
    const grassCondition = isHome ? (state.stadium?.grassCondition ?? 100) : 100;
    
    // Glory Mode perks: cursed stadium boosts home morale
    const gloryPerks = state.gloryData?.perks || {};
    let homeMorale = isHome ? (playerTableEntry?.morale || 70) : (opponentTableEntry?.morale || 70);
    let awayMorale = isHome ? (opponentTableEntry?.morale || 70) : (playerTableEntry?.morale || 70);
    if (gloryPerks.cursedStadium && isHome) {
      homeMorale = Math.min(99, homeMorale + 20);
      awayMorale = Math.max(30, awayMorale - 15);
    }
    
    console.log('🎮 About to simulateMatch...');
    const result = simulateMatch(
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      homeTeamData,
      awayTeamData,
      {
        homeFormation: isHome ? state.formation : '4-3-3',
        awayFormation: isHome ? '4-3-3' : state.formation,
        homeTactic: isHome ? state.tactic : 'balanced',
        awayTactic: isHome ? 'balanced' : state.tactic,
        homeMorale,
        awayMorale,
        isDerby: false,
        importance: 'normal',
        attendanceFillRate: isHome ? attendanceFillRate : 0.7,
        grassCondition,
        homeLineup: isHome ? state.lineup : null,
        awayLineup: isHome ? null : state.lineup,
        // Centro médico: especialización prevención reduce lesiones
        playerIsHome: isHome,
        medicalPrevention: state.facilitySpecs?.medical === 'prevention' ? 0.30 : 0,
        // Cup/European knockout matches need extra time + penalties on draw
        knockout: isCupMatch || isEuropeanMatch,
        // Penalty Master perk: player team gets penalty bonus
        penaltyMaster: gloryPerks.penaltyMaster && isHome ? 'home' : gloryPerks.penaltyMaster && !isHome ? 'away' : null,
        // Bench players (convocados not in lineup) for depth bonus
        playerBenchPlayers: (() => {
          const lineupNames = new Set(Object.values(state.lineup || {}).map(s => s?.name).filter(Boolean));
          return (state.team?.players || []).filter(p => (state.convocados || []).includes(p.name) && !lineupNames.has(p.name));
        })()
      },
      state.playerForm || {},
      state.teamId
    );
    
    console.log('🎮 simulateMatch done, result:', result ? 'OK' : 'NULL', result?.homeScore, '-', result?.awayScore);
    
    // Añadir info de asistencia al resultado si somos locales
    if (matchAttendance) {
      result.attendance = matchAttendance;
    }
    
    console.log('🎮 Setting matchResult...');
    setMatchResult(result);
    console.log('🎮 matchResult set, starting animation...');
    
    // Animate minute by minute
    let minute = 0;
    let eventIdx = 0;
    
    matchIntervalRef.current = setInterval(() => {
      minute += 3; // Jump 3 minutes each tick
      setCurrentMinute(Math.min(90, minute));
      
      // Show events up to current minute
      while (eventIdx < result.events.length && result.events[eventIdx].minute <= minute) {
        setEventIndex(eventIdx + 1);
        eventIdx++;
      }
      
      if (minute >= 95) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;
        setEventIndex(result.events.length);
        setTimeout(() => setPhase('result'), 500);
      }
    }, 150);
    } catch (error) {
      console.error('🔴 Error in simulateAndPlay:', error);
      console.error('🔴 Stack:', error.stack);
      // Fallback: show error state
      setPhase('preview');
      import('sileo').then(({ sileo }) => sileo.error({ title: t('matchday.errorSimulating'), description: error.message }));
    }
  };
  
  const skipToEnd = () => {
    if (matchResult) {
      if (matchIntervalRef.current) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;
      }
      setCurrentMinute(90);
      setEventIndex(matchResult.events.length);
      setPhase('result');
    }
  };
  
  const handleFinish = () => {
    // Cup match — dispatch special action and return
    if (isCupMatch && cupMatchData) {
      dispatch({
        type: 'COMPLETE_CUP_MATCH',
        payload: {
          roundIdx: cupMatchData.roundIdx,
          matchIdx: cupMatchData.matchIdx,
          homeScore: matchResult.homeScore,
          awayScore: matchResult.awayScore,
          extraTime: matchResult.extraTime || false,
          penalties: matchResult.penalties || null
        }
      });

      // Process injuries
      const playerTeamSide = isHome ? 'home' : 'away';
      const injuries = matchResult.events.filter(e => e.type === 'injury' && e.team === playerTeamSide);
      injuries.forEach(injury => {
        dispatch({
          type: 'INJURE_PLAYER',
          payload: {
            playerName: getPlayerName(injury.player),
            weeksOut: injury.weeksOut,
            severity: injury.severity
          }
        });
      });

      // Track player season stats
      const opponentGoals = isHome ? matchResult.awayScore : matchResult.homeScore;
      dispatch({
        type: 'UPDATE_PLAYER_SEASON_STATS',
        payload: {
          events: matchResult.events,
          playerTeamSide: isHome ? 'home' : 'away',
          cleanSheet: opponentGoals === 0
        }
      });

      // Process cards (official match)
      dispatch({ type: 'SERVE_SUSPENSIONS' });

      const playerYellowCards = matchResult.events.filter(
        e => e.type === 'yellow_card' && e.team === (isHome ? 'home' : 'away')
      );
      if (playerYellowCards.length > 0) {
        dispatch({
          type: 'ADD_YELLOW_CARDS',
          payload: { cards: playerYellowCards.map(e => ({ playerName: getPlayerName(e.player) })) }
        });
      }

      const playerRedCards = matchResult.events.filter(
        e => e.type === 'red_card' && e.team === (isHome ? 'home' : 'away')
      );
      if (playerRedCards.length > 0) {
        dispatch({
          type: 'ADD_RED_CARDS',
          payload: { cards: playerRedCards.map(e => ({ playerName: getPlayerName(e.player), reason: e.reason || t('matchday.directRed') })) }
        });
      }

      onComplete('cup');
      return;
    }

    // European/SA match — dispatch special action and return
    if (isEuropeanMatch && europeanMatchData) {
      const isSAMatch = !!playerMatch.isSouthAmerican;
      const euResult = {
        homeTeamId: playerMatch.homeTeam,
        awayTeamId: playerMatch.awayTeam,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore,
        extraTime: matchResult.extraTime || false,
        penalties: matchResult.penalties || null,
        events: matchResult.events || []
      };

      dispatch({
        type: isSAMatch ? 'COMPLETE_SA_MATCH' : 'COMPLETE_EUROPEAN_MATCH',
        payload: {
          competitionId: europeanMatchData.competitionId,
          matchResult: euResult,
          matchday: europeanMatchData.matchday,
          phase: europeanMatchData.phase
        }
      });

      // Add message
      const playerScore = isHome ? matchResult.homeScore : matchResult.awayScore;
      const opponentScore = isHome ? matchResult.awayScore : matchResult.homeScore;
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: isSAMatch ? 'southamerican' : 'european',
          title: `${europeanMatchData.competitionName || (isSAMatch ? 'Sudamericana' : 'Europa')}: ${state.team.name} ${playerScore} - ${opponentScore} ${opponent?.name || t('common.unknown')}`,
          contentKey: playerScore > opponentScore ? 'matchday.resultWin' : playerScore < opponentScore ? 'matchday.resultLoss' : 'matchday.resultDraw',
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }
      });

      // Process injuries
      const playerTeamSide = isHome ? 'home' : 'away';
      const injuries = matchResult.events.filter(e => e.type === 'injury' && e.team === playerTeamSide);
      injuries.forEach(injury => {
        dispatch({
          type: 'INJURE_PLAYER',
          payload: {
            playerName: getPlayerName(injury.player),
            weeksOut: injury.weeksOut,
            severity: injury.severity
          }
        });
      });

      // Process cards (European matches are official)
      dispatch({ type: 'SERVE_SUSPENSIONS' });

      const euYellowCards = matchResult.events.filter(
        e => e.type === 'yellow_card' && e.team === playerTeamSide
      );
      if (euYellowCards.length > 0) {
        dispatch({
          type: 'ADD_YELLOW_CARDS',
          payload: { cards: euYellowCards.map(e => ({ playerName: getPlayerName(e.player) })) }
        });
      }

      const euRedCards = matchResult.events.filter(
        e => e.type === 'red_card' && e.team === playerTeamSide
      );
      if (euRedCards.length > 0) {
        dispatch({
          type: 'ADD_RED_CARDS',
          payload: { cards: euRedCards.map(e => ({ playerName: getPlayerName(e.player), reason: e.reason || t('matchday.directRed') })) }
        });
      }

      // Track player season stats for European/SA matches
      const euPlayerTeamSide = isHome ? 'home' : 'away';
      const euOpponentGoals = isHome ? matchResult.awayScore : matchResult.homeScore;
      dispatch({
        type: 'UPDATE_PLAYER_SEASON_STATS',
        payload: {
          events: matchResult.events,
          playerTeamSide: euPlayerTeamSide,
          cleanSheet: euOpponentGoals === 0
        }
      });

      // v2: European/SA weeks are intercalated — no league match this week.
      // League fixtures have been remapped to non-European weeks.
      // Other leagues are simulated in ADVANCE_WEEK (GameContext).

      onComplete(isSAMatch ? 'southamerican' : 'european');
      return;
    }

    // Solo actualizar tabla/fixtures en partidos de liga (no pretemporada)
    if (!isPreseason) {
    // Update player's match in fixtures
    let updatedFixtures = (Array.isArray(state.fixtures) ? state.fixtures : []).map(f => {
      if (f.id === playerMatch.id) {
        return {
          ...f,
          played: true,
          homeScore: matchResult.homeScore,
          awayScore: matchResult.awayScore,
          events: matchResult.events,
          stats: matchResult.stats
        };
      }
      return f;
    });
    
    // Update league table
    let newTable = updateTable(
      state.leagueTable,
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      matchResult.homeScore,
      matchResult.awayScore
    );
    
    // Simulate other matches
    const allTeams = allTeamsMemo.map(t => t.id === state.teamId ? state.team : t);
    
    const otherMatchesResult = simulateWeekMatches(
      updatedFixtures,
      newTable,
      state.currentWeek,
      state.teamId,
      allTeams
    );
    
    dispatch({ type: 'SET_FIXTURES', payload: otherMatchesResult.fixtures });
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: otherMatchesResult.table });
    
    // Other leagues are simulated in ADVANCE_WEEK (GameContext)
    
    // Add result
    dispatch({
      type: 'ADD_RESULT',
      payload: {
        week: state.currentWeek,
        homeTeam: playerMatch.homeTeam,
        awayTeam: playerMatch.awayTeam,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore
      }
    });
    } // end if (!isPreseason) — no actualizar liga en amistosos
    
    // Track player season stats (both official and preseason matches)
    const playerTeamSide = isHome ? 'home' : 'away';
    const opponentGoals = isHome ? matchResult.awayScore : matchResult.homeScore;
    dispatch({
      type: 'UPDATE_PLAYER_SEASON_STATS',
      payload: {
        events: matchResult.events,
        playerTeamSide,
        cleanSheet: opponentGoals === 0
      }
    });
    
    // Update ProManager board confidence after official matches
    const playerScore = isHome ? matchResult.homeScore : matchResult.awayScore;
    const opponentScore = isHome ? matchResult.awayScore : matchResult.homeScore;
    
    if (state.gameMode === 'promanager' && state.proManagerData && !isPreseason) {
      const matchResultType = playerScore > opponentScore ? 'win' : playerScore < opponentScore ? 'loss' : 'draw';
      const pm = state.proManagerData;
      const leaguePos = (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || 10;
      const totalTeams = state.leagueTable?.length || 20;
      
      const newWinStreak = matchResultType === 'win' ? (pm.winStreak || 0) + 1 : 0;
      const newLossStreak = matchResultType === 'loss' ? (pm.lossStreak || 0) + 1 : 0;
      
      const newConfidence = calculateBoardConfidence(pm.boardConfidence ?? 60, {
        matchResult: matchResultType,
        leaguePosition: leaguePos,
        objective: pm.objective,
        totalTeams,
        winStreak: newWinStreak,
        lossStreak: newLossStreak,
      });
      
      dispatch({
        type: 'UPDATE_PROMANAGER_CONFIDENCE',
        payload: {
          boardConfidence: newConfidence,
          winStreak: newWinStreak,
          lossStreak: newLossStreak,
          totalMatches: (pm.totalMatches || 0) + 1,
          totalWins: (pm.totalWins || 0) + (matchResultType === 'win' ? 1 : 0),
          totalDraws: (pm.totalDraws || 0) + (matchResultType === 'draw' ? 1 : 0),
          totalLosses: (pm.totalLosses || 0) + (matchResultType === 'loss' ? 1 : 0),
        }
      });
      
      // Check if fired (confidence <= 0)
      if (newConfidence <= 0) {
        dispatch({
          type: 'SET_PROMANAGER_DATA',
          payload: { ...pm, fired: true, boardConfidence: 0 }
        });
        dispatch({ type: 'SET_SCREEN', payload: 'promanager_season_end' });
        return;
      }
    }

    // Glory perk: Lluvia de Millones — 50K per goal scored
    if (state.gloryData?.perks?.goalBonus && playerScore > 0) {
      dispatch({ type: 'UPDATE_MONEY', payload: playerScore * 50000 });
    }

    // Glory mode: track stats for milestone unlocks
    if (state.gloryData) {
      const prevStats = state.gloryData._stats || {};
      const margin = playerScore - opponentScore;
      const won = margin > 0;
      // Estimate opponent avg OVR vs ours for upset tracking
      const opponentAvgOvr = opponent?.players?.length > 0
        ? Math.round(opponent.players.reduce((s, p) => s + (p.overall || 70), 0) / opponent.players.length) : 70;
      const myAvgOvr = state.team?.players?.length > 0
        ? Math.round(state.team.players.reduce((s, p) => s + (p.overall || 70), 0) / state.team.players.length) : 70;
      const upsetMargin = won && opponentAvgOvr > myAvgOvr ? opponentAvgOvr - myAvgOvr : 0;

      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: {
          gloryData: {
            ...state.gloryData,
            _stats: {
              ...prevStats,
              biggestWinMargin: Math.max(prevStats.biggestWinMargin || 0, won ? margin : 0),
              biggestUpsetMargin: Math.max(prevStats.biggestUpsetMargin || 0, upsetMargin),
              maxBudget: Math.max(prevStats.maxBudget || 0, state.money || 0),
              bestPlayerOvr: Math.max(prevStats.bestPlayerOvr || 0, ...(state.team?.players || []).map(p => p.overall || 0)),
              maxYouthPlayers: Math.max(prevStats.maxYouthPlayers || 0, (state.team?.players || []).filter(p => (p.age || 99) <= 21).length),
            }
          }
        }
      });
    }

    // Glory perk: Doble o Nada — bet resolution
    if (betAmount > 0) {
      const won = playerScore > opponentScore;
      dispatch({ type: 'UPDATE_MONEY', payload: won ? betAmount : -betAmount });
    }

    // Process injuries for player's team
    const playerInjuries = matchResult.events.filter(
      e => e.type === 'injury' && e.team === playerTeamSide
    );
    
    playerInjuries.forEach(injury => {
      const injuredName = getPlayerName(injury.player);
      dispatch({
        type: 'INJURE_PLAYER',
        payload: {
          playerName: injuredName,
          weeksOut: injury.weeksOut,
          severity: injury.severity
        }
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + Math.random(),
          type: 'injury',
          titleKey: 'gameMessages.injuryTitle', titleParams: { player: injuredName },
          contentKey: 'gameMessages.injuryContent', contentParams: { player: injuredName, weeks: injury.weeksOut, severity: getInjuryText(injury.severity) },
          dateKey: isPreseason ? 'gameMessages.preseason' : 'gameMessages.weekDate', dateParams: isPreseason ? {} : { week: state.currentWeek }
        }
      });
    });
    
    // Tarjetas y sanciones SOLO en partidos oficiales (NO en pretemporada)
    console.log('🔴 isPreseason:', isPreseason, '→ cards processing:', !isPreseason);
    if (!isPreseason) {
      // 1. Primero: servir sanciones existentes (los que NO jugaron este partido)
      dispatch({ type: 'SERVE_SUSPENSIONS' });

      // 2. Procesar amarillas del partido (solo cuentan para acumulación, no doble amarilla)
      // La doble amarilla ya viene como red_card con reason="Segunda amarilla"
      const playerYellowCards = matchResult.events.filter(
        e => e.type === 'yellow_card' && e.team === playerTeamSide
      );

      if (playerYellowCards.length > 0) {
        dispatch({
          type: 'ADD_YELLOW_CARDS',
          payload: {
            cards: playerYellowCards.map(e => ({ playerName: getPlayerName(e.player) }))
          }
        });
      }

      // 3. Procesar rojas (doble amarilla = 1 partido, roja directa = 2 partidos)
      console.log('🔴 ALL events:', matchResult.events.map(e => `${e.type}|${e.team}|${typeof e.player === 'object' ? e.player?.name : e.player}`));
      console.log('🔴 playerTeamSide:', playerTeamSide, 'isHome:', isHome);
      const playerRedCards = matchResult.events.filter(
        e => e.type === 'red_card' && e.team === playerTeamSide
      );
      console.log('🔴 playerRedCards found:', playerRedCards.length, playerRedCards.map(e => `${typeof e.player === 'object' ? e.player?.name : e.player}|reason:${e.reason}`));

      if (playerRedCards.length > 0) {
        dispatch({
          type: 'ADD_RED_CARDS',
          payload: {
            cards: playerRedCards.map(e => ({ 
              playerName: getPlayerName(e.player), 
              reason: e.reason || t('matchday.directRed')
            }))
          }
        });
      }
    }

    // Ingresos por taquilla si jugamos en casa (liga + pretemporada)
    if (isHome && matchResult.attendance) {
      const att = matchResult.attendance;
      const stadium = state.stadium || {};
      const tPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
      
      // Ingresos = entradas vendidas + consumiciones (bar, tienda, etc.)
      const sLevel = stadium.level ?? 0;
      const concRate = 8 + (sLevel * 2); // €8-18 por asistente según nivel
      const ticketIncome = att.ticketSales * tPrice;
      const concessionIncome = att.attendance * concRate;
      const totalMatchIncome = ticketIncome + concessionIncome;
      
      // ACUMULAR ingresos (se cobran al final de temporada)
      const prevAccumulated = stadium.accumulatedTicketIncome ?? 0;
      
      // Calculate services income for this home match
      const svcIncome = calculateServicesIncome(stadium.services, att.attendance, true);
      const prevSvcIncome = stadium.accumulatedServicesIncome ?? 0;
      const prevSvcBreakdown = { ...(stadium.accumulatedServicesBreakdown || { catering: 0, merchandise: 0, parking: 0, events: 0, vip: 0 }) };
      // Per-service breakdown
      if (stadium.services) {
        for (const [sKey, sCfg] of Object.entries(STADIUM_SERVICES)) {
          const sLvl = stadium.services[sKey] || 0;
          if (sLvl <= 0) continue;
          const ld = sCfg.levels[sLvl];
          if (!ld) continue;
          if (sCfg.type === 'perSpectator') prevSvcBreakdown[sKey] = (prevSvcBreakdown[sKey] || 0) + Math.round(ld.rate * att.attendance);
          else if (sCfg.type === 'perMatch') prevSvcBreakdown[sKey] = (prevSvcBreakdown[sKey] || 0) + ld.rate;
        }
      }
      
      // Guardar datos de última jornada + acumular + bloquear precio
      dispatch({
        type: 'UPDATE_STADIUM',
        payload: { 
          ...stadium, 
          lastMatchTicketSales: att.ticketSales,       // Entradas vendidas (sin abonados)
          lastMatchAttendance: att.attendance,          // Asistencia total (con abonados)
          lastMatchIncome: totalMatchIncome,            // Entradas + consumiciones
          accumulatedTicketIncome: prevAccumulated + totalMatchIncome,
          accumulatedServicesIncome: prevSvcIncome + svcIncome,
          accumulatedServicesBreakdown: prevSvcBreakdown,
          ticketPriceLocked: true // Se bloquea al jugar el primer partido
        }
      });
      
      // Mensaje con detalles de taquilla
      const fillPercent = Math.round(att.fillRate * 100);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 0.1,
          type: 'stadium',
          titleKey: 'gameMessages.ticketSalesTitle', titleParams: { tickets: att.ticketSales.toLocaleString(), fill: fillPercent },
          contentKey: 'gameMessages.ticketSalesContent', contentParams: { ticketIncome: `€${(ticketIncome/1000).toFixed(0)}K`, concessionIncome: `€${(concessionIncome/1000).toFixed(0)}K`, accumulated: `€${((prevAccumulated + totalMatchIncome)/1000).toFixed(0)}K` },
          dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
        }
      });
    }
    
    // HEAL_INJURIES se llama en ADVANCE_WEEK, no aquí
    onComplete('league');
  };
  
  const getInjuryText = (severity) => {
    switch (severity) {
      case 'minor': return t('matchday.injuryMinor');
      case 'moderate': return t('matchday.injuryModerate');
      case 'serious': return t('matchday.injurySerious');
      default: return t('matchday.injuryGeneric');
    }
  };
  
  const getGoalTypeText = (type) => {
    switch (type) {
      case 'golazo': return <><Flame size={14} /> {t('matchday.golazo')}</>;
      case 'great_strike': return <><Star size={14} /> {t('matchday.goalTypeGreatStrike')}</>;
      case 'penalty': return `(${t('matchday.goalTypePenalty')})`;
      case 'header': return `(${t('matchday.goalTypeHeader')})`;
      case 'tap_in': return `(${t('matchday.goalTypeTapIn')})`;
      case 'corner': return `(${t('matchday.goalTypeCorner')})`;
      case 'late': return <><Flame size={14} /> {t('matchday.lateGoal')}</>;
      default: return '';
    }
  };
  
  const getFormText = (form) => {
    if (!form || form.length === 0) return t('matchday.noFormData');
    return form.map((r, i) => (
      <span key={i} className={`form-item ${r.toLowerCase()}`}>{r}</span>
    ));
  };
  
  // Guard duplicado eliminado — ya se comprueba al inicio del componente
  
  return (
    <div className="match-day fade-in-up">
      {matchdayTutorial.shouldShow && (
        <TutorialModal
          id="matchday"
          steps={[{ text: t('tutorial.matchdayQuick') }]}
          onComplete={matchdayTutorial.markSeen}
          onDismissAll={matchdayTutorial.dismissAll}
        />
      )}
      <div className="match-day__content">
        {phase === 'preview' && (
          <div className="match-day__preview">
            <h2>{isCupMatch ? `${cupMatchData.cupIcon || '🏆'} ${cupMatchData.cupShortName || 'Copa'} — ${cupMatchData.roundName || 'Ronda'}` : isEuropeanMatch ? `${europeanMatchData.competitionName || 'Europa'} — ${europeanMatchData.phase === 'league' ? `Jornada ${europeanMatchData.matchday}` : europeanMatchData.phase}` : isPreseason ? `Amistoso ${state.preseasonWeek}/5` : `Jornada ${state.currentWeek}`}</h2>
            
            <div className="match-day__teams">
              <div className={`match-day__team ${isHome ? 'player' : ''}`}>
                {isHome ? <span className="home-tag">LOCAL</span> : <span className="tag-spacer" />}
                <TeamCrest teamId={isHome ? state.teamId : (opponent?.id || opponentId)} size={48} />
                <h3>{isHome ? state.team.name : opponent.name}</h3>
                <div className="team-form">
                  {getFormText(isHome ? playerTableEntry?.form : opponentTableEntry?.form)}
                </div>
              </div>
              
              <div className="match-day__vs">VS</div>
              
              <div className={`match-day__team ${!isHome ? 'player' : ''}`}>
                {!isHome ? <span className="away-tag">VISITANTE</span> : <span className="tag-spacer" />}
                <TeamCrest teamId={!isHome ? state.teamId : (opponent?.id || opponentId)} size={48} />
                <h3>{!isHome ? state.team.name : opponent.name}</h3>
                <div className="team-form">
                  {getFormText(!isHome ? playerTableEntry?.form : opponentTableEntry?.form)}
                </div>
              </div>
            </div>
            
            <div className="match-day__comparison">
              <div className="comparison-row">
                <span className="home-val">{Math.round(playerStrength.overall)}</span>
                <span className="label">{t('matchday.overallStrength')}</span>
                <span className="away-val">{Math.round(opponentStrength.overall)}</span>
              </div>
              <div className="comparison-row">
                <span className="home-val">{Math.round(isHome ? playerStrength.attack : opponentStrength.attack)}</span>
                <span className="label">{t('matchday.attack')}</span>
                <span className="away-val">{Math.round(isHome ? opponentStrength.attack : playerStrength.attack)}</span>
              </div>
              <div className="comparison-row">
                <span className="home-val">{Math.round(isHome ? playerStrength.defense : opponentStrength.defense)}</span>
                <span className="label">{t('matchday.defense')}</span>
                <span className="away-val">{Math.round(isHome ? opponentStrength.defense : playerStrength.defense)}</span>
              </div>
            </div>
            
            <div className="match-day__tactics">
              <div className="tactic-info">
                <span className="label">{t('matchday.yourFormation')}:</span>
                <span className="value">{state.formation}</span>
              </div>
              <div className="tactic-info">
                <span className="label">{t('matchday.yourTactic')}:</span>
                <span className="value">{TACTICS[state.tactic]?.name || 'Equilibrado'}</span>
              </div>
            </div>
            
          </div>
        )}
        
        {phase === 'playing' && matchResult && (
          <div className="match-day__playing">
            <div className="match-day__minute">
              {currentMinute}'
            </div>
            
            <div className="match-day__score">
              {(() => {
                // Calcular marcador según los eventos mostrados hasta ahora
                const visibleEvents = matchResult.events.slice(0, eventIndex);
                const homeGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
                const awayGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'away').length;
                
                return (
                  <>
                    <div className="team">
                      <span className="name">{isHome ? (state.team?.name || getShort(state.team)) : (opponent?.name || getShort(opponent))}</span>
                      <span className="score">{homeGoals}</span>
                    </div>
                    <span className="separator">-</span>
                    <div className="team">
                      <span className="score">{awayGoals}</span>
                      <span className="name">{!isHome ? (state.team?.name || getShort(state.team)) : (opponent?.name || getShort(opponent))}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <div className="match-day__live-stats">
              <div className="stat">
                <div className="bar home" style={{ width: `${matchResult.stats.possession.home}%` }}></div>
                <span className="label">{t('matchday.possession')}</span>
                <div className="bar away" style={{ width: `${matchResult.stats.possession.away}%` }}></div>
              </div>
            </div>
            
            <div className="match-day__events" ref={eventsRef}>
              {matchResult.events.slice(0, eventIndex).map((event, idx) => (
                <div key={idx} className={`match-day__event ${event.team} ${event.type} ${event.goalType || ''} ${event.type === 'goal' ? (event.team === (isHome ? 'home' : 'away') ? 'player-goal' : 'opponent-goal') : ''}`}>
                  <span className="minute">{event.minute}'</span>
                  <span className="icon">
                    {event.type === 'goal' && <Circle size={16} className="icon-goal" />}
                    {event.type === 'yellow_card' && <span className="icon-card icon-card--yellow" />}
                    {event.type === 'red_card' && <span className="icon-card icon-card--red" />}
                    {event.type === 'injury' && <HeartPulse size={16} className="icon-injury" />}
                  </span>
                  <span className="player">
                    {typeof event.player === 'object' ? event.player?.name || t('common.unknown') : event.player}
                    {event.assist && <span className="assist"> (asist. {typeof event.assist === 'object' ? event.assist?.name : event.assist})</span>}
                    {event.type === 'goal' && event.goalType && <span className="goal-type"> {getGoalTypeText(event.goalType)}</span>}
                    {event.type === 'injury' && <span className="injury-info"> ({event.weeksOut} sem.)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {phase === 'result' && matchResult && (() => {
          const homeName = isHome ? state.team.name : opponent.name;
          const homeShort = isHome ? getShort(state.team) : getShort(opponent);
          const awayName = !isHome ? state.team.name : opponent.name;
          const awayShort = !isHome ? getShort(state.team) : getShort(opponent);
          const playerIsHome = isHome;
          const playerWon = playerIsHome 
            ? matchResult.homeScore > matchResult.awayScore 
            : matchResult.awayScore > matchResult.homeScore;
          const isDraw = matchResult.homeScore === matchResult.awayScore;
          const resultTag = playerWon ? 'V' : isDraw ? 'E' : 'D';
          const resultClass = playerWon ? 'win' : isDraw ? 'draw' : 'loss';
          
          // Separate events by team and type
          const homeGoals = matchResult.events.filter(e => e.type === 'goal' && e.team === 'home');
          const awayGoals = matchResult.events.filter(e => e.type === 'goal' && e.team === 'away');
          const homeYellows = matchResult.events.filter(e => e.type === 'yellow_card' && e.team === 'home');
          const awayYellows = matchResult.events.filter(e => e.type === 'yellow_card' && e.team === 'away');
          const homeReds = matchResult.events.filter(e => e.type === 'red_card' && e.team === 'home');
          const awayReds = matchResult.events.filter(e => e.type === 'red_card' && e.team === 'away');
          
          // Stats
          const stats = matchResult.stats;
          const statRows = [
            { label: t('matchday.possession'), home: stats.possession.home, away: stats.possession.away, suffix: '%', isPercent: true },
            { label: t('matchday.shots'), home: stats.shots.home, away: stats.shots.away },
            { label: t('matchday.shotsOnTarget'), home: stats.shotsOnTarget.home, away: stats.shotsOnTarget.away },
            { label: t('matchday.corners'), home: stats.corners.home, away: stats.corners.away },
            { label: t('matchday.fouls'), home: stats.fouls?.home ?? 0, away: stats.fouls?.away ?? 0 },
            { label: t('matchday.yellowCard'), home: stats.yellowCards.home, away: stats.yellowCards.away, icon: <Square size={14} className="card-yellow" /> },
            ...(stats.redCards.home > 0 || stats.redCards.away > 0 
              ? [{ label: t('matchday.redCard'), home: stats.redCards.home, away: stats.redCards.away, icon: <Square size={14} className="card-red" /> }] 
              : [])
          ];

          // League name
          const leagueName = getLeagueName ? getLeagueName(state.leagueId) : '';
          
          // Attendance & stadium info (home: real data, away: opponent stadium)
          const att = isHome ? matchResult.attendance : null;
          let stadiumDisplay;
          if (isHome && att) {
            const ticketPrice = (state.stadium?.ticketPrice ?? 30) + (state.stadium?.matchPriceAdjust || 0);
            stadiumDisplay = {
              name: state.stadium?.name || 'Estadio',
              capacity: state.stadium?.realCapacity || 8000,
              attendance: att.attendance || 0,
              revenue: (att.ticketSales || 0) * ticketPrice,
              isHome: true
            };
          } else {
            const opponentId = opponent?.id || opponent?.teamId;
            const oppStadium = getStadiumInfo(opponentId, opponent?.reputation);
            const oppCapacity = oppStadium?.capacity || 15000;
            const oppAttendance = Math.floor(oppCapacity * (0.65 + Math.random() * 0.25));
            stadiumDisplay = {
              name: oppStadium?.name || 'Estadio',
              capacity: oppCapacity,
              attendance: oppAttendance,
              revenue: null, // No mostramos recaudación rival
              isHome: false
            };
          }
          
          // MOTM
          const motm = matchResult.motm;
          const motmTeamShort = motm ? (motm.team === 'home' ? homeShort : awayShort) : '';
          
          // Helper to render event name
          const eName = (e) => typeof e.player === 'object' ? e.player?.name || '?' : e.player;
          
          return (
          <div className={`match-day__result pcfutbol ${resultClass}`}>
            {/* Matchday info bar */}
            <div className="result-matchday-bar">
              <span>Jornada {state.currentWeek}</span>
              <span className="bar-sep">·</span>
              <span>{leagueName}</span>
              <span className="bar-sep">·</span>
              <span>Semana {state.currentWeek}</span>
            </div>
            
            {/* Scoreboard */}
            <div className="result-scoreboard-pcf">
              <div className={`result-team-pcf ${playerIsHome ? 'is-player' : ''}`}>
                <div className="team-crest">
                  <TeamCrest teamId={isHome ? state.teamId : opponentId} size={40} />
                </div>
                <span className="team-name-pcf">{homeName}</span>
              </div>
              
              <div className="result-score-pcf">
                <span className="score-num">{matchResult.homeScore}</span>
                <span className="score-sep">–</span>
                <span className="score-num">{matchResult.awayScore}</span>
                {matchResult.extraTime && <span className="extra-time-tag">(prórroga)</span>}
                {matchResult.penalties && (
                  <span className="penalties-tag">
                    ({matchResult.penalties.home}-{matchResult.penalties.away} pen.)
                  </span>
                )}
              </div>
              
              <div className={`result-team-pcf away ${!playerIsHome ? 'is-player' : ''}`}>
                <div className="team-crest">
                  <TeamCrest teamId={!isHome ? state.teamId : opponentId} size={40} />
                </div>
                <span className="team-name-pcf">{awayName}</span>
              </div>
            </div>

            {/* Two-column goals & cards (PC Fútbol style) */}
            <div className="result-events-columns">
              <div className="events-column home">
                <div className="column-header">{homeShort}</div>
                {homeGoals.map((g, i) => (
                  <div key={`hg${i}`} className="event-item goal">
                    <span className="event-icon">⚽</span>
                    <span className="event-text">{eName(g)} {g.minute}'</span>
                    {g.goalType && <span className="event-type">{getGoalTypeText(g.goalType)}</span>}
                  </div>
                ))}
                {homeYellows.map((c, i) => (
                  <div key={`hy${i}`} className="event-item yellow">
                    <span className="event-icon">🟨</span>
                    <span className="event-text">{eName(c)} {c.minute}'</span>
                  </div>
                ))}
                {homeReds.map((c, i) => (
                  <div key={`hr${i}`} className="event-item red">
                    <span className="event-icon">🟥</span>
                    <span className="event-text">{eName(c)} {c.minute}'</span>
                  </div>
                ))}
                <div className="fouls-total">Total faltas: {stats.fouls?.home ?? 0}</div>
              </div>
              <div className="events-column away">
                <div className="column-header">{awayShort}</div>
                {awayGoals.map((g, i) => (
                  <div key={`ag${i}`} className="event-item goal">
                    <span className="event-icon">⚽</span>
                    <span className="event-text">{eName(g)} {g.minute}'</span>
                    {g.goalType && <span className="event-type">{getGoalTypeText(g.goalType)}</span>}
                  </div>
                ))}
                {awayYellows.map((c, i) => (
                  <div key={`ay${i}`} className="event-item yellow">
                    <span className="event-icon">🟨</span>
                    <span className="event-text">{eName(c)} {c.minute}'</span>
                  </div>
                ))}
                {awayReds.map((c, i) => (
                  <div key={`ar${i}`} className="event-item red">
                    <span className="event-icon">🟥</span>
                    <span className="event-text">{eName(c)} {c.minute}'</span>
                  </div>
                ))}
                <div className="fouls-total">Total faltas: {stats.fouls?.away ?? 0}</div>
              </div>
            </div>
            
            {/* Stats with visual bars */}
            <div className="result-stats">
              <h4>{t('matchday.statistics')}</h4>
              {statRows.map((row, idx) => {
                const total = (row.home + row.away) || 1;
                const homePct = row.isPercent ? row.home : (row.home / total) * 100;
                const awayPct = row.isPercent ? row.away : (row.away / total) * 100;
                const homeWins = row.home > row.away;
                const awayWins = row.away > row.home;
                
                return (
                  <div key={idx} className="stat-row">
                    <span className={`stat-val home ${homeWins ? 'leading' : ''}`}>
                      {row.home}{row.suffix || ''}
                    </span>
                    <div className="stat-center">
                      <div className="stat-bars">
                        <div className={`bar home ${homeWins ? 'leading' : ''}`} style={{ width: `${homePct}%` }} />
                        <div className={`bar away ${awayWins ? 'leading' : ''}`} style={{ width: `${awayPct}%` }} />
                      </div>
                      <span className="stat-label">{row.icon || ''} {row.label}</span>
                    </div>
                    <span className={`stat-val away ${awayWins ? 'leading' : ''}`}>
                      {row.away}{row.suffix || ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom row: Stadium + MOTM */}
            <div className="result-bottom-row">
              <div className="result-stadium-panel">
                <div className="panel-title">🏟️ {stadiumDisplay.name}</div>
                <div className="panel-row"><span>Aforo:</span> <span>{stadiumDisplay.capacity.toLocaleString()}</span></div>
                <div className="panel-row"><span>Asistencia:</span> <span>{stadiumDisplay.attendance.toLocaleString()} ({Math.round(stadiumDisplay.attendance / stadiumDisplay.capacity * 100)}%)</span></div>
                {stadiumDisplay.isHome && stadiumDisplay.revenue > 0 && (
                  <div className="panel-row"><span>Recaudación:</span> <span>€{(stadiumDisplay.revenue / 1000).toFixed(0)}K</span></div>
                )}
              </div>
              {motm && (
                <div className="result-motm-panel">
                  <div className="panel-title">⭐ Jugador del partido</div>
                  <div className="motm-name">{motm.name} ({motmTeamShort})</div>
                  {motm.goals > 0 && <div className="motm-stat">⚽ {motm.goals} {motm.goals === 1 ? 'gol' : 'goles'}</div>}
                  {motm.assists > 0 && <div className="motm-stat">🅰️ {motm.assists} {motm.assists === 1 ? 'asistencia' : 'asistencias'}</div>}
                  <div className="motm-rating">Rating: {motm.rating}</div>
                </div>
              )}
            </div>
            
          </div>
          );
        })()}
      </div>

      {/* Buttons rendered OUTSIDE __content — use position:fixed for overlay */}
      {phase === 'preview' && canAchilles && opponent?.players?.length > 0 && (
        <div className="match-day__bet-section">
          {!showAchillesUI ? (
            <button className="match-day__bet-toggle" style={{ borderColor: '#e53935' }} onClick={() => setShowAchillesUI(true)}>
              Talón de Aquiles — Lesionar rival
            </button>
          ) : (
            <div className="match-day__bet-ui" style={{ maxHeight: 200, overflowY: 'auto' }}>
              <span className="match-day__bet-label">Elige un rival para lesionar:</span>
              {(opponent.players || []).slice(0, 11).sort((a, b) => b.overall - a.overall).map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setAchillesTarget(p.name); setShowAchillesUI(false); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', width: '100%', padding: '6px 10px',
                    background: achillesTarget === p.name ? 'rgba(229,57,53,0.2)' : 'rgba(255,255,255,0.05)',
                    border: achillesTarget === p.name ? '1px solid #e53935' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, marginBottom: 3
                  }}
                >
                  <span>{p.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.position} · {p.overall}</span>
                </button>
              ))}
            </div>
          )}
          {achillesTarget && !showAchillesUI && (
            <span className="match-day__bet-hint" style={{ color: '#e53935' }}>
              {achillesTarget} no jugará este partido
            </span>
          )}
        </div>
      )}
      {phase === 'preview' && canBet && (
        <div className="match-day__bet-section">
          {!showBetUI ? (
            <button className="match-day__bet-toggle" onClick={() => setShowBetUI(true)}>
              Doble o Nada — Apostar
            </button>
          ) : (
            <div className="match-day__bet-ui">
              <span className="match-day__bet-label">Apuesta: €{betAmount.toLocaleString()}</span>
              <input
                type="range"
                min={0}
                max={Math.min(state.money, 500000)}
                step={10000}
                value={betAmount}
                onChange={e => setBetAmount(Number(e.target.value))}
                className="match-day__bet-slider"
              />
              <span className="match-day__bet-hint">
                {betAmount > 0 ? `Ganas: +€${betAmount.toLocaleString()} / Pierdes: -€${betAmount.toLocaleString()}` : 'Sin apuesta'}
              </span>
            </div>
          )}
        </div>
      )}
      {phase === 'preview' && (() => {
        const lineupCount = Object.values(state.lineup || {}).filter(Boolean).length;
        const canPlay = lineupCount >= 11;
        return (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              className="match-day__play-btn"
              onClick={() => onBack && onBack()}
              style={{ background: 'rgba(255,255,255,0.08)', flex: 'none', minWidth: '100px' }}
            >
              <ArrowLeft size={14} /> {t('common.back') || 'Volver'}
            </button>
            <div style={{ position: 'relative', display: 'inline-block', flex: 1 }}>
              <button 
                className={`match-day__play-btn${canPlay ? ' btn-pulse' : ''}`}
                onClick={canPlay ? simulateAndPlay : undefined} 
                disabled={!canPlay} 
                style={!canPlay ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                title={!canPlay ? `Necesitas 11 titulares (tienes ${lineupCount})` : ''}
              >
                <FootballIcon size={14} /> {t('matchday.playMatch')}
              </button>
            </div>
          </div>
        );
      })()}
      {phase === 'playing' && matchResult && (
        <button className="match-day__skip-btn" onClick={skipToEnd}>
          <SkipForward size={14} /> {t('matchday.skipToEnd')}
        </button>
      )}
      {phase === 'result' && matchResult && (
        <button className="match-day__continue-btn" onClick={handleFinish}>
          Continuar
        </button>
      )}
    </div>
  );
}
