import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { progressiveLiveStat, progressiveLiveXg, progressiveLivePossession, buildMomentumBuckets, deriveLivePlayerRatings } from '../../game/liveMatchStats';
import { hasGloryCombo } from '../../game/gloryEngine';
import { ensureFullLineup } from '../../context/GameContext';

// Helper: get short name from team object (fallback to first 3 chars of name)
const getShort = (team) => team?.shortName || team?.name?.substring(0, 3)?.toUpperCase() || '???';
const formatMatchMinute = (minute) => Number(minute) > 90 ? `90+${Number(minute) - 90}` : `${minute}`;
// Expected goals are shown football-style: a single decimal (e.g. "1.2"), never
// as a bare integer. Used by both the live and the final result stat rows.
const formatXg = (value) => (Number(value) || 0).toFixed(1);
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance, calculateMatchIncome, calculateServicesIncome, STADIUM_SERVICES } from '../../game/stadiumEconomy';
import { calculateBoardConfidence } from '../../game/proManagerEngine';
import { getLeagueName } from '../../game/leagueTiers';
import { getStadiumInfo } from '../../data/stadiumCapacities';
import { Flame, Star, Square, HeartPulse, Ticket, Building2, SkipForward, ArrowLeft } from 'lucide-react';
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

  // Memoize team catalogue. Merge dynamic/historical teams and table stubs so
  // historical Transfermarkt IDs can always resolve an opponent even before the
  // deferred market/team pool has finished loading.
  const allTeamsMemo = useMemo(() => {
    const byId = new Map();
    const addTeam = (team) => {
      if (!team?.id) return;
      byId.set(team.id, { ...(byId.get(team.id) || {}), ...team });
    };

    getAllTeams().forEach(addTeam);
    (state.leagueTeams || []).forEach(addTeam);
    if (state.team) addTeam({ ...state.team, id: state.teamId || state.team.id });
    (state.leagueTable || []).forEach(entry => {
      if (!entry?.teamId || byId.has(entry.teamId)) return;
      addTeam({
        id: entry.teamId,
        name: entry.teamName || entry.teamId,
        shortName: entry.shortName || entry.teamName || entry.teamId,
        reputation: entry.reputation || 50,
        players: []
      });
    });

    return Array.from(byId.values());
  }, [state.leagueTeams, state.leagueTable, state.team, state.teamId]);

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
  // Double or Nothing perk: apuesta cerrada antes del partido desde Oficina/Mejoras
  const pendingRouletteBet = state.gloryData?.matchRouletteBet?.status === 'pending'
    ? state.gloryData.matchRouletteBet
    : null;
  const [betAmount, setBetAmount] = useState(pendingRouletteBet?.amount || 0);
  const canBet = !!pendingRouletteBet && betAmount > 0;
  // Achilles Heel perk: target is chosen from Office header before the match.

  // Helper: normalizar player de eventos (V2 devuelve {name}, V1 devuelve string)
  const getPlayerName = (p) => typeof p === 'object' ? (p?.name || t('common.unknown')) : (p || t('common.unknown'));

  // Helper: localized tactic name. Maps tactic ids to the existing Formation
  // tactic translation keys so the preview never falls back to hardcoded Spanish.
  const TACTIC_NAME_KEYS = {
    balanced: 'formation.tacBalanced',
    attacking: 'formation.tacAttacking',
    defensive: 'formation.tacDefensive',
    possession: 'formation.tacPossession',
    counter: 'formation.tacCounter',
    highPress: 'matchday.tacticHighPress',
  };
  const getTacticName = (tacticId) => {
    const key = TACTIC_NAME_KEYS[tacticId];
    return key ? t(key) : (TACTICS[tacticId]?.name || t('formation.tacBalanced'));
  };
  
  useEffect(() => {
    if (pendingRouletteBet?.amount) setBetAmount(pendingRouletteBet.amount);
  }, [pendingRouletteBet?.amount]);
  
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
    const dynamicTeams = state.leagueTeams || [];
    opponent = dynamicTeams.find(t => t.id === opponentId || t.teamId === opponentId)
      || allTeamsMemo.find(t => t.id === opponentId || t.teamId === opponentId);
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

    // Pass 'league' so Office advances the week and doesn't loop back here
    // when the opponent can't be resolved (e.g. data loading incomplete).
    return (
      <div className="match-day">
        <div className="match-day__no-match">
          <p>{t('matchday.noMatchThisWeek')}</p>
          <button onClick={() => onComplete('league')}>{t('common.continue')}</button>
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
  const storedAchillesTarget = state.gloryData?.achillesHeelTarget;
  const achillesTarget = storedAchillesTarget
    && storedAchillesTarget.week === (state.currentWeek || 1)
    && storedAchillesTarget.season === (state.currentSeason || 1)
    && storedAchillesTarget.opponentId === (opponent?.id || opponent?.teamId)
      ? storedAchillesTarget.playerName
      : null;
  
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
          name: t('matchday.syntheticPlayer', { number: i + 1 }),
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
      minute += 2; // Ritmo más pausado: antes saltaba 3 minutos por tick
      const maxMinute = result.extraTime ? 120 : 90 + (result.stoppageTime || 5);
      setCurrentMinute(Math.min(maxMinute, minute));
      
      // Show events up to current minute
      while (eventIdx < result.events.length && result.events[eventIdx].minute <= minute) {
        setEventIndex(eventIdx + 1);
        eventIdx++;
      }
      
      if (minute >= maxMinute) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;
        setEventIndex(result.events.length);
        setTimeout(() => setPhase('result'), 900);
      }
    }, 260);
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
      setCurrentMinute(matchResult.extraTime ? 120 : 90 + (matchResult.stoppageTime || 0));
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
        e => e.type === 'yellow_card' && e.team === (isHome ? 'home' : 'away') && e.countsForAccumulation !== false && !e.isSecondYellow
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
        e => e.type === 'yellow_card' && e.team === playerTeamSide && e.countsForAccumulation !== false && !e.isSecondYellow
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
      const goalBonusMoney = playerScore * 50000;
      dispatch({ type: 'UPDATE_MONEY', payload: goalBonusMoney });
      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: {
          gloryData: {
            ...state.gloryData,
            goalBonusEarned: (state.gloryData?.goalBonusEarned || 0) + goalBonusMoney,
          }
        }
      });
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
      const drawn = playerScore === opponentScore;
      const moneyDelta = won ? betAmount : drawn ? -Math.round(betAmount / 2) : -betAmount;
      const prevCasino = state.gloryData?.casino || { winStreak: 0, lossStreak: 0, bubbleActive: false, investigation: false };
      const casinoCombo = hasGloryCombo(state.gloryData, 'club_casino');
      const nextCasino = {
        ...prevCasino,
        winStreak: won ? (prevCasino.winStreak || 0) + 1 : 0,
        lossStreak: (!won && !drawn) ? (prevCasino.lossStreak || 0) + 1 : 0,
      };
      if (casinoCombo && nextCasino.winStreak >= 5) nextCasino.bubbleActive = true;
      if (casinoCombo && nextCasino.lossStreak >= 2) nextCasino.investigation = true;
      dispatch({ type: 'UPDATE_MONEY', payload: nextCasino.bubbleActive && won ? moneyDelta * 2 : moneyDelta });
      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: {
          gloryData: {
            ...state.gloryData,
            casino: nextCasino,
            lastBet: { amount: betAmount, result: won ? 'win' : drawn ? 'draw' : 'loss', delta: moneyDelta },
            matchRouletteBet: {
              ...(pendingRouletteBet || {}),
              status: 'resolved',
              result: won ? 'win' : drawn ? 'draw' : 'loss',
              delta: nextCasino.bubbleActive && won ? moneyDelta * 2 : moneyDelta,
              resolvedWeek: state.currentWeek || 1
            }
          }
        }
      });
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
        e => e.type === 'yellow_card' && e.team === playerTeamSide && e.countsForAccumulation !== false && !e.isSecondYellow
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
        // Notify player about suspensions
        playerRedCards.forEach(e => {
          const pName = getPlayerName(e.player);
          const isDoubleYellow = e.reason === 'Segunda amarilla';
          const matches = isDoubleYellow ? 1 : 2;
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + Math.random(),
              type: 'discipline',
              titleKey: isDoubleYellow ? 'gameMessages.doubleYellowTitle' : 'gameMessages.redCardTitle',
              titleParams: { player: pName },
              contentKey: isDoubleYellow ? 'gameMessages.doubleYellowContent' : 'gameMessages.redCardContent',
              contentParams: { player: pName, matches },
              dateKey: 'gameMessages.weekDate',
              dateParams: { week: state.currentWeek }
            }
          });
        });
      }

      // Notify about yellow accumulation danger (4/5)
      playerYellowCards.forEach(e => {
        const pName = getPlayerName(e.player);
        const player = state.team?.players?.find(p => p.name === pName);
        const newYellows = (player?.yellowCards || 0) + 1;
        if (newYellows === 4) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + Math.random(),
              type: 'discipline',
              titleKey: 'gameMessages.yellowWarningTitle',
              titleParams: { player: pName },
              contentKey: 'gameMessages.yellowWarningContent',
              contentParams: { player: pName },
              dateKey: 'gameMessages.weekDate',
              dateParams: { week: state.currentWeek }
            }
          });
        }
      });
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

  const renderEventPlayer = (event) => {
    if (event.type === 'substitution') {
      return (
        <span className="substitution-flow football-style">
          <span className="sub-out"><span className="sub-label">{t('matchday.subOut')}</span> ↓ {getPlayerName(event.playerOut)}</span>
          <span className="sub-in"><span className="sub-label">{t('matchday.subIn')}</span> ↑ {getPlayerName(event.playerIn)}</span>
        </span>
      );
    }

    return (
      <>
        {typeof event.player === 'object' ? event.player?.name || t('common.unknown') : event.player}
        {event.assist && <span className="assist"> ({t('matchday.assistShort')} {typeof event.assist === 'object' ? event.assist?.name : event.assist})</span>}
        {event.type === 'goal' && event.goalType && <span className="goal-type"> {getGoalTypeText(event.goalType)}</span>}
        {event.type === 'injury' && <span className="injury-info"> ({t('matchday.weeksAbbr', { weeks: event.weeksOut })})</span>}
      </>
    );
  };
  
  const getFormText = (form) => {
    if (!form || form.length === 0) return t('matchday.noFormData');
    return form.map((r, i) => (
      <span key={i} className={`form-item ${r.toLowerCase()}`}>{r}</span>
    ));
  };
  
  // Guard duplicado eliminado — ya se comprueba al inicio del componente
  
  return (
    <div className={`match-day match-day--${phase}`}>
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
            <h2>{isCupMatch ? `${cupMatchData.cupIcon || '🏆'} ${cupMatchData.cupShortName || t('matchday.cup')} — ${cupMatchData.roundName || t('matchday.round')}` : isEuropeanMatch ? `${europeanMatchData.competitionName || t('matchday.europe')} — ${europeanMatchData.phase === 'league' ? t('matchday.matchweek', { week: europeanMatchData.matchday }) : europeanMatchData.phase}` : isPreseason ? t('matchday.friendly', { n: state.preseasonWeek }) : t('matchday.matchweek', { week: state.currentWeek })}</h2>
            
            <div className="match-day__teams">
              <div className={`match-day__team ${isHome ? 'player' : ''}`}>
                {isHome ? <span className="home-tag">{t('matchday.homeTag')}</span> : <span className="tag-spacer" />}
                <TeamCrest team={isHome ? state.team : opponent} teamId={isHome ? state.teamId : (opponent?.id || opponentId)} size={48} />
                <h3>{isHome ? state.team.name : opponent.name}</h3>
                <div className="team-form">
                  {getFormText(isHome ? playerTableEntry?.form : opponentTableEntry?.form)}
                </div>
              </div>
              
              <div className="match-day__vs">VS</div>
              
              <div className={`match-day__team ${!isHome ? 'player' : ''}`}>
                {!isHome ? <span className="away-tag">{t('matchday.awayTag')}</span> : <span className="tag-spacer" />}
                <TeamCrest team={!isHome ? state.team : opponent} teamId={!isHome ? state.teamId : (opponent?.id || opponentId)} size={48} />
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
                <span className="value">{getTacticName(state.tactic)}</span>
              </div>
            </div>
            
          </div>
        )}
        
        {phase === 'playing' && matchResult && (() => {
          const visibleEvents = matchResult.events.slice(0, eventIndex);
          const homeName = isHome ? (state.team?.name || getShort(state.team)) : (opponent?.name || getShort(opponent));
          const awayName = !isHome ? (state.team?.name || getShort(state.team)) : (opponent?.name || getShort(opponent));
          const homeShort = isHome ? getShort(state.team) : getShort(opponent);
          const awayShort = !isHome ? getShort(state.team) : getShort(opponent);
          const homeGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
          const awayGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'away').length;
          const homeSubs = visibleEvents.filter(e => e.type === 'substitution' && e.team === 'home').length;
          const awaySubs = visibleEvents.filter(e => e.type === 'substitution' && e.team === 'away').length;
          const lastEvent = visibleEvents[visibleEvents.length - 1];
          // Progressive live shots: start low and converge to the real totals at full time,
          // instead of showing the final aggregate stats from the very first tick.
          const fullTimeMinute = matchResult.extraTime ? 120 : 90 + (matchResult.stoppageTime || 5);
          const liveProgress = Math.max(0, Math.min(1, currentMinute / fullTimeMinute));
          const momentumSeed = (matchResult.stats?.shots?.home || 0) * 31
            + (matchResult.stats?.shots?.away || 0) * 17
            + (matchResult.stats?.possession?.home ?? 50);
          const livePossession = progressiveLivePossession({
            finalHome: matchResult.stats?.possession?.home ?? 50,
            currentMinute,
            fullTimeMinute,
            events: visibleEvents,
            seed: momentumSeed
          });
          const possessionHome = livePossession.home;
          const possessionAway = livePossession.away;
          // Goals already scored count as at least one shot (and one on-target) for that team.
          const liveOnTargetHome = progressiveLiveStat(matchResult.stats?.shotsOnTarget?.home, liveProgress, homeGoals);
          const liveOnTargetAway = progressiveLiveStat(matchResult.stats?.shotsOnTarget?.away, liveProgress, awayGoals);
          const liveShotsHome = Math.max(progressiveLiveStat(matchResult.stats?.shots?.home, liveProgress, homeGoals), liveOnTargetHome);
          const liveShotsAway = Math.max(progressiveLiveStat(matchResult.stats?.shots?.away, liveProgress, awayGoals), liveOnTargetAway);
          // Progressive expected goals: accumulate toward the real match xG and
          // converge at full time. Each goal already scored credits a modest
          // per-goal xG floor (~0.3) so the figure never lags far behind the
          // scoreline, but a goal never snaps xG to 1.0 — xG is chance quality.
          const liveXgHome = progressiveLiveXg(matchResult.stats?.xg?.home, liveProgress, homeGoals * 0.3);
          const liveXgAway = progressiveLiveXg(matchResult.stats?.xg?.away, liveProgress, awayGoals * 0.3);
          const xgTotal = liveXgHome + liveXgAway || 1;
          const shotPressureHome = liveOnTargetHome + homeGoals * 3;
          const shotPressureAway = liveOnTargetAway + awayGoals * 3;
          const momentumHome = Math.max(20, Math.min(80, Math.round((possessionHome * 0.55) + ((shotPressureHome + 1) / Math.max(2, shotPressureHome + shotPressureAway + 2)) * 45)));
          const momentumAway = 100 - momentumHome;
          const matchStage = currentMinute >= 90 ? t('matchday.stageFinishing') : currentMinute >= 46 ? t('matchday.stageSecondHalf') : currentMinute >= 45 ? t('matchday.halftime') : t('matchday.stageFirstHalf');
          const latestEventKey = lastEvent ? `${lastEvent.minute}-${lastEvent.type}-${lastEvent.team}-${getPlayerName(lastEvent.player || lastEvent.playerIn || lastEvent.playerOut)}` : 'kickoff';
          const isGoalFlash = lastEvent?.type === 'goal';
          const liveRows = [
            { statKey: 'possession', label: t('matchday.possession'), home: `${possessionHome}%`, away: `${possessionAway}%`, homePct: possessionHome, awayPct: possessionAway },
            { statKey: 'shots', label: t('matchday.shots'), home: liveShotsHome, away: liveShotsAway },
            { statKey: 'shotsOnTarget', label: t('matchday.onTarget'), home: liveOnTargetHome, away: liveOnTargetAway },
            { statKey: 'xg', label: 'xG', home: formatXg(liveXgHome), away: formatXg(liveXgAway), homePct: Math.round((liveXgHome / xgTotal) * 100), awayPct: Math.round((liveXgAway / xgTotal) * 100) },
            { statKey: 'substitutions', label: t('matchday.substitutions'), home: `${homeSubs}/5`, away: `${awaySubs}/5`, homePct: homeSubs * 20, awayPct: awaySubs * 20 }
          ];

          // Competition / round header (mirrors the pre-match heading logic).
          const competitionLabel = isCupMatch
            ? `${cupMatchData.cupShortName || t('matchday.cup')} · ${cupMatchData.roundName || t('matchday.round')}`
            : isEuropeanMatch
              ? `${europeanMatchData.competitionName || t('matchday.europe')} · ${europeanMatchData.phase === 'league' ? t('matchday.matchweek', { week: europeanMatchData.matchday }) : europeanMatchData.phase}`
              : isPreseason
                ? t('matchday.friendly', { n: state.preseasonWeek })
                : t('matchday.matchweek', { week: state.currentWeek });

          // Goals strip — only the goals already shown, grouped per side.
          const homeScorers = visibleEvents.filter(e => e.type === 'goal' && e.team === 'home');
          const awayScorers = visibleEvents.filter(e => e.type === 'goal' && e.team === 'away');

          // Progressive momentum / live pressure chart by time buckets.
          const momentumBuckets = buildMomentumBuckets({
            currentMinute,
            fullTimeMinute,
            possessionHome,
            events: visibleEvents,
            seed: momentumSeed,
            bucketCount: 90
          });
          // Half-time divider sits at minute 45 mapped onto the bucket timeline.
          const halftimePct = Math.max(0, Math.min(100, (45 / fullTimeMinute) * 100));

          // Deterministic live ratings derived from lineups + events so far.
          const topRatedHome = deriveLivePlayerRatings(matchResult.finalLineups?.home, visibleEvents, 'home', liveProgress).slice(0, 3);
          const topRatedAway = deriveLivePlayerRatings(matchResult.finalLineups?.away, visibleEvents, 'away', liveProgress).slice(0, 3);
          const ratingClass = (r) => (r >= 8 ? 'rt-high' : r >= 7 ? 'rt-good' : r >= 6 ? 'rt-mid' : 'rt-low');

          return (
          <div className={`match-day__playing match-day__playing--tv ${isGoalFlash ? 'is-goal-flash' : ''}`} data-matchday-live-sofascore>
            <div className="live-scoreboard-tv">
              <div className="live-scoreboard-tv__meta">
                <span className="live-pill">{t('matchday.live')}</span>
                <span className="live-competition">{competitionLabel}</span>
                <span>{matchStage}</span>
                <span className="live-minute">{formatMatchMinute(currentMinute)}'</span>
              </div>
              <div className="live-scoreboard-tv__main">
                <div className="live-team live-team--home">
                  <TeamCrest team={isHome ? state.team : opponent} teamId={isHome ? state.teamId : (opponent?.id || opponentId)} size={34} />
                  <span>{homeName}</span>
                </div>
                <div className="live-scorebox">
                  <strong>{homeGoals}</strong>
                  <span>–</span>
                  <strong>{awayGoals}</strong>
                </div>
                <div className="live-team live-team--away">
                  <span>{awayName}</span>
                  <TeamCrest team={!isHome ? state.team : opponent} teamId={!isHome ? state.teamId : (opponent?.id || opponentId)} size={34} />
                </div>
              </div>
              {(homeScorers.length > 0 || awayScorers.length > 0) && (
                <div className="live-goals-strip" data-live-goals-strip>
                  <div className="goals-col goals-col--home">
                    {homeScorers.map((ev, i) => (
                      <span className="goal-chip" key={`h-${i}`}>
                        <span className="goal-ball">⚽</span>
                        {getPlayerName(ev.player)} <em>{formatMatchMinute(ev.minute)}'</em>
                      </span>
                    ))}
                  </div>
                  <div className="goals-col goals-col--away">
                    {awayScorers.map((ev, i) => (
                      <span className="goal-chip" key={`a-${i}`}>
                        <em>{formatMatchMinute(ev.minute)}'</em> {getPlayerName(ev.player)}
                        <span className="goal-ball">⚽</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="live-main-grid">
              <div className="live-left-panel">
                <div className={`live-feature-card ${lastEvent?.type || 'waiting'}`} key={latestEventKey}>
                  <span className="feature-kicker">{t('matchday.lastEvent')}</span>
                  {lastEvent ? (
                    <>
                      <div className="feature-minute">{formatMatchMinute(lastEvent.minute)}'</div>
                      <div className="feature-title">
                        {lastEvent.type === 'goal' && `⚽ ${t('matchday.eventGoal')}`}
                        {lastEvent.type === 'yellow_card' && `🟨 ${t('matchday.yellowCard')}`}
                        {lastEvent.type === 'red_card' && `🟥 ${t('matchday.redCard')}`}
                        {lastEvent.type === 'injury' && `🩺 ${t('matchday.injury')}`}
                        {lastEvent.type === 'substitution' && `🔄 ${t('matchday.substitution')}`}
                        <span>{lastEvent.team === 'home' ? homeShort : awayShort}</span>
                      </div>
                      <div className="feature-player">{renderEventPlayer(lastEvent)}</div>
                    </>
                  ) : (
                    <>
                      <div className="feature-title">{t('matchday.matchStarting')}</div>
                      <div className="feature-player muted">{t('matchday.waitingFirstAction')}</div>
                    </>
                  )}
                </div>

                <div className="live-momentum-card" data-momentum-crests="2" data-bucket-count={momentumBuckets.length}>
                  <div className="momentum-head">
                    <span className="mini-title">{t('matchday.momentum')}</span>
                    <span className="momentum-dominance">{homeShort} {momentumHome}% · {momentumAway}% {awayShort}</span>
                  </div>
                  <div className="momentum-body">
                    <div className="momentum-crests" aria-hidden="true">
                      <span className="momentum-crest momentum-crest--home">
                        <TeamCrest team={isHome ? state.team : opponent} teamId={isHome ? state.teamId : (opponent?.id || opponentId)} size={22} />
                      </span>
                      <span className="momentum-crest momentum-crest--away">
                        <TeamCrest team={!isHome ? state.team : opponent} teamId={!isHome ? state.teamId : (opponent?.id || opponentId)} size={22} />
                      </span>
                    </div>
                    <div className="live-momentum-chart" data-live-momentum-chart data-bucket-count={momentumBuckets.length}>
                      <span className="mom-zone mom-zone--home" aria-hidden="true" />
                      <span className="mom-zone mom-zone--away" aria-hidden="true" />
                      {momentumBuckets.map((b, i) => {
                        const h = b.active ? Math.max(4, Math.abs(b.value)) : 0;
                        const dir = b.value >= 0 ? 'up' : 'down';
                        return (
                          <div className={`mom-bucket ${b.active ? 'active' : ''}`} key={i} title={`${b.start}'–${b.end}'`}>
                            {b.active && (
                              <span className={`mom-bar mom-bar--${dir}`} style={{ height: `${h / 2}%` }} />
                            )}
                            {b.goals.map((g, gi) => (
                              <span className={`mom-goal mom-goal--${g}`} key={gi} aria-hidden="true" />
                            ))}
                          </div>
                        );
                      })}
                      <span className="mom-baseline" aria-hidden="true" />
                      <span className="mom-halftime" style={{ left: `${halftimePct}%` }} aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <div className="match-day__live-stats live-stats-grid">
                  {liveRows.map((row) => {
                    const numericHome = typeof row.home === 'number' ? row.home : parseInt(row.home, 10) || 0;
                    const numericAway = typeof row.away === 'number' ? row.away : parseInt(row.away, 10) || 0;
                    const total = numericHome + numericAway || 1;
                    const homePct = row.homePct ?? Math.round((numericHome / total) * 100);
                    const awayPct = row.awayPct ?? Math.round((numericAway / total) * 100);
                    return (
                      <div className="live-stat-row" key={row.label} data-stat-key={row.statKey}>
                        <span className="live-stat-value home">{row.home}</span>
                        <div className="live-stat-center">
                          <span>{row.label}</span>
                          <div className="live-stat-bars">
                            <i className="home" style={{ width: `${homePct}%` }} />
                            <i className="away" style={{ width: `${awayPct}%` }} />
                          </div>
                        </div>
                        <span className="live-stat-value away">{row.away}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="live-top-rated" data-live-top-rated>
                  <div className="mini-title">{t('matchday.topRated')}</div>
                  <div className="top-rated-cols">
                    <div className="top-rated-col">
                      <span className="trc-team">{homeShort}</span>
                      {topRatedHome.map((p, i) => (
                        <div className="rated-row" key={`th-${i}`}>
                          <span className="rated-name">{p.name}{p.goals > 0 && <em className="rated-goals"> {'⚽'.repeat(p.goals)}</em>}</span>
                          <span className={`rated-rating ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="top-rated-col">
                      <span className="trc-team">{awayShort}</span>
                      {topRatedAway.map((p, i) => (
                        <div className="rated-row" key={`ta-${i}`}>
                          <span className="rated-name">{p.name}{p.goals > 0 && <em className="rated-goals"> {'⚽'.repeat(p.goals)}</em>}</span>
                          <span className={`rated-rating ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="match-day__events live-timeline" ref={eventsRef}>
                <span className="live-timeline__rail" aria-hidden="true" />
                {visibleEvents.map((event, idx) => {
                  const eventTeamName = event.team === 'home' ? homeShort : awayShort;
                  return (
                    <div key={idx} className={`match-day__event ${event.team} ${event.type} ${event.goalType || ''} ${event.type === 'goal' ? (event.team === (isHome ? 'home' : 'away') ? 'player-goal' : 'opponent-goal') : ''}`}>
                      <span className="minute">{formatMatchMinute(event.minute)}'</span>
                      <span className="icon">
                        {event.type === 'goal' && <img src="/assets/icons/goal-net-ball.svg" alt="" className="icon-goal" />}
                        {event.type === 'yellow_card' && <span className="icon-card icon-card--yellow" />}
                        {event.type === 'red_card' && <span className="icon-card icon-card--red" />}
                        {event.type === 'injury' && <HeartPulse size={16} className="icon-injury" />}
                        {event.type === 'substitution' && <span className="icon-substitution">⇄</span>}
                      </span>
                      <span className="player">
                        <span className="event-team">{eventTeamName}</span>
                        <span className="event-main">{renderEventPlayer(event)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          );
        })()}
        
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
          const homeSubs = matchResult.events.filter(e => e.type === 'substitution' && e.team === 'home');
          const awaySubs = matchResult.events.filter(e => e.type === 'substitution' && e.team === 'away');
          
          // Stats
          const stats = matchResult.stats;
          const matchStory = Array.isArray(stats.matchStory) ? stats.matchStory : [];
          const statRows = [
            { statKey: 'possession', label: t('matchday.possession'), home: stats.possession.home, away: stats.possession.away, suffix: '%', isPercent: true },
            { statKey: 'shots', label: t('matchday.shots'), home: stats.shots.home, away: stats.shots.away },
            { statKey: 'shotsOnTarget', label: t('matchday.shotsOnTarget'), home: stats.shotsOnTarget.home, away: stats.shotsOnTarget.away },
            // Expected goals — football-style one-decimal figure (e.g. "1.2"), with
            // the raw numeric kept for the comparison bars.
            { statKey: 'xg', label: 'xG', home: formatXg(stats.xg?.home), away: formatXg(stats.xg?.away), rawHome: stats.xg?.home ?? 0, rawAway: stats.xg?.away ?? 0 },
            { statKey: 'bigChances', label: t('matchday.bigChances'), home: stats.bigChances?.home ?? 0, away: stats.bigChances?.away ?? 0 },
            { statKey: 'saves', label: t('matchday.saves'), home: stats.saves?.home ?? 0, away: stats.saves?.away ?? 0 },
            { statKey: 'corners', label: t('matchday.corners'), home: stats.corners.home, away: stats.corners.away },
            { statKey: 'fouls', label: t('matchday.fouls'), home: stats.fouls?.home ?? 0, away: stats.fouls?.away ?? 0 },
            { statKey: 'substitutions', label: t('matchday.substitutions'), home: `${stats.substitutions?.home ?? homeSubs.length}/5`, away: `${stats.substitutions?.away ?? awaySubs.length}/5`, rawHome: stats.substitutions?.home ?? homeSubs.length, rawAway: stats.substitutions?.away ?? awaySubs.length },
            { statKey: 'yellowCards', label: t('matchday.yellowCard'), home: stats.yellowCards.home, away: stats.yellowCards.away, icon: <Square size={14} className="card-yellow" /> },
            ...(stats.redCards.home > 0 || stats.redCards.away > 0
              ? [{ statKey: 'redCards', label: t('matchday.redCard'), home: stats.redCards.home, away: stats.redCards.away, icon: <Square size={14} className="card-red" /> }]
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
              name: state.stadium?.name || t('matchday.stadium'),
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
              name: oppStadium?.name || t('matchday.stadium'),
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

          // ── Match momentum (SofaScore-style): full-match buckets + every event marker ──
          // Same deterministic engine as the live panel, but fed the WHOLE match so all
          // 90 buckets are active and the silhouette spikes on the real goals.
          const resultFullMinute = matchResult.extraTime ? 120 : 90 + (matchResult.stoppageTime || 5);
          const resultMomentumSeed = (matchResult.stats?.shots?.home || 0) * 31
            + (matchResult.stats?.shots?.away || 0) * 17
            + (matchResult.stats?.possession?.home ?? 50);
          const resultMomentumBuckets = buildMomentumBuckets({
            currentMinute: resultFullMinute, // full match elapsed → every bucket active
            fullTimeMinute: resultFullMinute,
            possessionHome: matchResult.stats?.possession?.home ?? 50,
            events: matchResult.events,
            seed: resultMomentumSeed,
            bucketCount: 90
          });
          const resultHalftimePct = Math.max(0, Math.min(100, (45 / resultFullMinute) * 100));
          const resultEtPct = matchResult.extraTime ? Math.max(0, Math.min(100, (105 / resultFullMinute) * 100)) : null;
          // Goals + yellow/red cards, placed by minute on their own team's half. Markers
          // that land close together on the same half are stacked outward to stay legible.
          const eventTypeLabel = (type) => type === 'goal' ? t('matchday.eventGoal')
            : type === 'yellow_card' ? t('matchday.yellowCard') : t('matchday.redCard');
          const lastMarkerLeft = { home: -100, away: -100 };
          const markerStack = { home: 0, away: 0 };
          const resultMarkers = matchResult.events
            .filter(e => e.type === 'goal' || e.type === 'yellow_card' || e.type === 'red_card')
            .slice()
            .sort((a, b) => a.minute - b.minute)
            .map((e) => {
              const left = Math.max(0, Math.min(100, (e.minute / resultFullMinute) * 100));
              if (left - lastMarkerLeft[e.team] < 3.2) markerStack[e.team] += 1; else markerStack[e.team] = 0;
              lastMarkerLeft[e.team] = left;
              return { minute: e.minute, team: e.team, type: e.type, player: eName(e), left, stack: markerStack[e.team] };
            });

          // Render a single substitutions block for one team column
          const renderSubstitutions = (subs) => (
            <div className="result-substitutions">
              <div className="subs-header">
                <span className="subs-title">⇄ {t('matchday.substitutions')}</span>
                <span className="subs-count">{subs.length}</span>
              </div>
              {subs.length === 0 ? (
                <div className="subs-empty">{t('matchday.noSubstitutions')}</div>
              ) : (
                subs.map((s, i) => (
                  <div key={`sub${i}`} className="sub-row">
                    <span className="sub-min">{formatMatchMinute(s.minute)}'</span>
                    <span className="sub-out">{getPlayerName(s.playerOut)}</span>
                    <span className="sub-arrow">→</span>
                    <span className="sub-in">{getPlayerName(s.playerIn)}</span>
                  </div>
                ))
              )}
            </div>
          );

          return (
          <div className={`match-day__result pcfutbol ${resultClass}`} data-md-result-build="matchday-result-scrolllock-20260606">
            {/* Matchday info bar */}
            <div className="result-matchday-bar">
              <span>{t('matchday.matchweek', { week: state.currentWeek })}</span>
              <span className="bar-sep">·</span>
              <span>{leagueName}</span>
              <span className="bar-sep">·</span>
              <span>{t('matchday.weekLabel', { week: state.currentWeek })}</span>
            </div>
            
            {/* Scoreboard */}
            <div className="result-scoreboard-pcf">
              <div className={`result-team-pcf ${playerIsHome ? 'is-player' : ''}`}>
                <div className="team-crest">
                  <TeamCrest team={isHome ? state.team : opponent} teamId={isHome ? state.teamId : opponentId} size={40} />
                </div>
                <span className="team-name-pcf">{homeName}</span>
              </div>
              
              <div className="result-score-pcf">
                <span className="score-num">{matchResult.homeScore}</span>
                <span className="score-sep">–</span>
                <span className="score-num">{matchResult.awayScore}</span>
                {matchResult.extraTime && <span className="extra-time-tag">({t('matchday.extraTime')})</span>}
                {matchResult.penalties && (
                  <span className="penalties-tag">
                    ({matchResult.penalties.home}-{matchResult.penalties.away} {t('matchday.penaltiesShort')})
                  </span>
                )}
              </div>
              
              <div className={`result-team-pcf away ${!playerIsHome ? 'is-player' : ''}`}>
                <div className="team-crest">
                  <TeamCrest team={!isHome ? state.team : opponent} teamId={!isHome ? state.teamId : opponentId} size={40} />
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
                    <span className="event-text">{eName(g)} {formatMatchMinute(g.minute)}'</span>
                    {g.goalType && <span className="event-type">{getGoalTypeText(g.goalType)}</span>}
                  </div>
                ))}
                {homeYellows.map((c, i) => (
                  <div key={`hy${i}`} className="event-item yellow">
                    <span className="event-icon">🟨</span>
                    <span className="event-text">{eName(c)} {formatMatchMinute(c.minute)}'</span>
                  </div>
                ))}
                {homeReds.map((c, i) => (
                  <div key={`hr${i}`} className="event-item red">
                    <span className="event-icon">🟥</span>
                    <span className="event-text">{eName(c)} {formatMatchMinute(c.minute)}'</span>
                  </div>
                ))}
                {renderSubstitutions(homeSubs)}
                <div className="fouls-total">{t('matchday.totalFouls', { count: stats.fouls?.home ?? 0 })}</div>
              </div>
              <div className="events-column away">
                <div className="column-header">{awayShort}</div>
                {awayGoals.map((g, i) => (
                  <div key={`ag${i}`} className="event-item goal">
                    <span className="event-icon">⚽</span>
                    <span className="event-text">{eName(g)} {formatMatchMinute(g.minute)}'</span>
                    {g.goalType && <span className="event-type">{getGoalTypeText(g.goalType)}</span>}
                  </div>
                ))}
                {awayYellows.map((c, i) => (
                  <div key={`ay${i}`} className="event-item yellow">
                    <span className="event-icon">🟨</span>
                    <span className="event-text">{eName(c)} {formatMatchMinute(c.minute)}'</span>
                  </div>
                ))}
                {awayReds.map((c, i) => (
                  <div key={`ar${i}`} className="event-item red">
                    <span className="event-icon">🟥</span>
                    <span className="event-text">{eName(c)} {formatMatchMinute(c.minute)}'</span>
                  </div>
                ))}
                {renderSubstitutions(awaySubs)}
                <div className="fouls-total">{t('matchday.totalFouls', { count: stats.fouls?.away ?? 0 })}</div>
              </div>
            </div>
            
            {/* Stats with visual bars */}
            <div className="result-stats">
              <h4>{t('matchday.statistics')}</h4>
              {statRows.map((row, idx) => {
                const homeRaw = row.rawHome ?? row.home;
                const awayRaw = row.rawAway ?? row.away;
                const numericHome = typeof homeRaw === 'number' ? homeRaw : parseFloat(homeRaw) || 0;
                const numericAway = typeof awayRaw === 'number' ? awayRaw : parseFloat(awayRaw) || 0;
                const total = (numericHome + numericAway) || 1;
                const homePct = row.isPercent ? numericHome : (numericHome / total) * 100;
                const awayPct = row.isPercent ? numericAway : (numericAway / total) * 100;
                const homeWins = numericHome > numericAway;
                const awayWins = numericAway > numericHome;
                
                return (
                  <div key={idx} className="stat-row" data-stat-key={row.statKey}>
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

            {/* Match momentum: SofaScore-style full-match timeline with goals & cards */}
            <div className="result-momentum-card" data-result-momentum data-bucket-count={resultMomentumBuckets.length}>
              <div className="result-momentum-head">
                <h4>{t('matchday.matchMomentum')}</h4>
                <div className="result-momentum-legend">
                  <span className="rml-item home"><i />{homeShort}</span>
                  <span className="rml-item away"><i />{awayShort}</span>
                </div>
              </div>
              <div className="momentum-body">
                <div className="momentum-crests" aria-hidden="true">
                  <span className="momentum-crest momentum-crest--home">
                    <TeamCrest team={isHome ? state.team : opponent} teamId={isHome ? state.teamId : opponentId} size={22} />
                  </span>
                  <span className="momentum-crest momentum-crest--away">
                    <TeamCrest team={!isHome ? state.team : opponent} teamId={!isHome ? state.teamId : opponentId} size={22} />
                  </span>
                </div>
                <div className="live-momentum-chart result-momentum-chart" data-result-momentum-chart data-bucket-count={resultMomentumBuckets.length}>
                  <span className="mom-zone mom-zone--home" aria-hidden="true" />
                  <span className="mom-zone mom-zone--away" aria-hidden="true" />
                  {resultMomentumBuckets.map((b, i) => {
                    const h = Math.max(4, Math.abs(b.value));
                    const dir = b.value >= 0 ? 'up' : 'down';
                    return (
                      <div className="mom-bucket active" key={i} title={`${b.start}'–${b.end}'`}>
                        <span className={`mom-bar mom-bar--${dir}`} style={{ height: `${h / 2}%` }} />
                      </div>
                    );
                  })}
                  <span className="mom-baseline" aria-hidden="true" />
                  <span className="mom-halftime" style={{ left: `${resultHalftimePct}%` }} aria-hidden="true" />
                  {resultEtPct != null && (
                    <span className="mom-halftime mom-halftime--et" style={{ left: `${resultEtPct}%` }} aria-hidden="true" />
                  )}
                  {resultMarkers.map((m, i) => {
                    const teamShort = m.team === 'home' ? homeShort : awayShort;
                    const label = `${formatMatchMinute(m.minute)}' · ${teamShort} · ${eventTypeLabel(m.type)}${m.player ? ` · ${m.player}` : ''}`;
                    return (
                      <span
                        key={`rm-${i}`}
                        className={`result-event-marker result-event-marker--${m.team} is-${m.type}`}
                        style={{ left: `${m.left}%`, '--stack': m.stack }}
                        title={label}
                        aria-label={label}
                      >
                        {m.type === 'goal' ? (
                          <img src="/assets/icons/goal-net-ball.svg" alt="" className="rem-goal" />
                        ) : (
                          <span className={`rem-card rem-card--${m.type === 'yellow_card' ? 'yellow' : 'red'}`} />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              {resultMarkers.length === 0 && (
                <div className="result-momentum-empty">{t('matchday.noEvents')}</div>
              )}
            </div>

            {matchStory.length > 0 && (
              <div className="result-match-story">
                <h4>{t('matchday.matchKeys')}</h4>
                {matchStory.map((line, idx) => (
                  <div key={`story${idx}`} className="story-line">
                    <span className="story-bullet">▸</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom row: Stadium + MOTM */}
            <div className="result-bottom-row">
              <div className="result-stadium-panel">
                <div className="panel-title">🏟️ {stadiumDisplay.name}</div>
                <div className="panel-row"><span>{t('matchday.capacity')}:</span> <span>{stadiumDisplay.capacity.toLocaleString()}</span></div>
                <div className="panel-row"><span>{t('matchday.attendance')}:</span> <span>{stadiumDisplay.attendance.toLocaleString()} ({Math.round(stadiumDisplay.attendance / stadiumDisplay.capacity * 100)}%)</span></div>
                {stadiumDisplay.isHome && stadiumDisplay.revenue > 0 && (
                  <div className="panel-row"><span>{t('matchday.revenue')}:</span> <span>€{(stadiumDisplay.revenue / 1000).toFixed(0)}K</span></div>
                )}
              </div>
              {motm && (
                <div className="result-motm-panel">
                  <div className="panel-title">⭐ {t('matchday.motm')}</div>
                  <div className="motm-name">{motm.name} ({motmTeamShort})</div>
                  {motm.goals > 0 && <div className="motm-stat">⚽ {motm.goals} {t(motm.goals === 1 ? 'matchday.goalSingular' : 'matchday.goalPlural')}</div>}
                  {motm.assists > 0 && <div className="motm-stat">🅰️ {motm.assists} {t(motm.assists === 1 ? 'matchday.assistSingular' : 'matchday.assistPlural')}</div>}
                  <div className="motm-rating">{t('matchday.rating')}: {motm.rating}</div>
                </div>
              )}
            </div>
            
          </div>
          );
        })()}
      </div>

      {/* Buttons rendered OUTSIDE __content — use position:fixed for overlay */}
      {phase === 'preview' && canBet && (
        <div className="match-day__bet-section">
          <div className="match-day__bet-ui">
            <span className="match-day__bet-label">🎰 {t('matchday.rouletteBetPrepared')}</span>
            <div className="match-day__roulette-banner">
              <strong>{pendingRouletteBet.label || t('matchday.rouletteSlotChosen')} · {pendingRouletteBet.percent}%</strong>
              <span>{t('matchday.rouletteFundsLocked', { amount: `€${betAmount.toLocaleString('es-ES')}` })}</span>
            </div>
            <span className="match-day__bet-hint">
              {t('matchday.rouletteOutcomeHint', { win: `+€${betAmount.toLocaleString('es-ES')}`, draw: `-€${Math.round(betAmount / 2).toLocaleString('es-ES')}`, lose: `-€${betAmount.toLocaleString('es-ES')}` })}
            </span>
            {state.gloryData?.casino?.bubbleActive && <span className="match-day__bet-hint match-day__bet-hint--hot">{t('matchday.rouletteBubbleActive')}</span>}
            {state.gloryData?.casino?.investigation && <span className="match-day__bet-hint match-day__bet-hint--danger">{t('matchday.rouletteInvestigation')}</span>}
          </div>
        </div>
      )}
      {phase === 'preview' && (() => {
        const lineupCount = Object.values(state.lineup || {}).filter(Boolean).length;
        const canPlay = lineupCount >= 11;
        return (
          <div className="match-day__actions">
            <button 
              className="match-day__play-btn match-day__play-btn--secondary"
              onClick={() => onBack && onBack()}
            >
              <ArrowLeft size={14} /> {t('common.back')}
            </button>
            <div className="match-day__play-slot">
              <button 
                className={`match-day__play-btn match-day__play-btn--primary${canPlay ? ' btn-pulse' : ''}`}
                onClick={canPlay ? simulateAndPlay : undefined} 
                disabled={!canPlay} 
                title={!canPlay ? t('matchday.needStarters', { count: lineupCount }) : ''}
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
      {/* Result CTA portaled to <body> so an ancestor transform (the screen-enter
          animation on .app-screen-transition) can't turn position:fixed into
          modal-relative — keeps it pinned to the real viewport bottom. */}
      {phase === 'result' && matchResult && createPortal(
        <button className="match-day__continue-btn" onClick={handleFinish}>
          {t('common.continue')}
        </button>,
        document.body
      )}
    </div>
  );
}
