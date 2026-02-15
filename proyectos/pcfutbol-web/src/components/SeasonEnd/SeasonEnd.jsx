import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Medal,
  Star,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plane,
  Home,
  Swords,
  Sparkles,
  Zap,
  Globe,
  ClipboardList,
  Ticket,
  Flag,
  Flame
} from 'lucide-react';
import {
  getSeasonResult,
  calculateSeasonRewards,
  generatePreseasonOptions,
  getCompetitionName,
  getEuropeanBonus,
  EUROPEAN_SPOTS
} from '../../game/seasonManager';
import { qualifyTeamsForEurope, buildSeasonCalendar, buildEuropeanCalendar, remapFixturesForEuropean } from '../../game/europeanCompetitions';
import { getCupTeams, generateCupBracket, CUP_CONFIGS } from '../../game/cupSystem';
import { LEAGUE_CONFIG, isAperturaClausura, simulateAperturaClausuraFinal } from '../../game/multiLeagueEngine';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { initializeSACompetitions } from '../../game/southAmericanSeason';
import { initializeLeague, simulateMatch } from '../../game/leagueEngine';
import { initializeNewSeasonWithPromotions, getLeagueName, getLeagueTable } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import {
  generatePlayoffBracket,
  simulatePlayoffMatch,
  advancePlayoffBracket,
  simulateFullPlayoff,
  isTeamInPlayoff,
  getNextPlayoffMatch,
  getPlayoffMatchSummary,
  generateAllGroupPlayoffs,
  simulateAllGroupPlayoffs,
  getGroupPlayoffWinners,
  advanceGroupPlayoffBracket
} from '../../game/playoffEngine';
import { getSegundaTeams, getLaLigaTeams, getPrimeraRfefTeams, getSegundaRfefTeams } from '../../data/teamsFirestore';
import FootballIcon from '../icons/FootballIcon';
import './SeasonEnd.scss';

export default function SeasonEnd({ allTeams, onComplete }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const playerLeagueId = state.playerLeagueId || 'laliga';
  
  // Determinar si hay playoffs pendientes
  const segundaTable = useMemo(() => {
    if (playerLeagueId === 'segunda') return state.leagueTable;
    return state.otherLeagues?.segunda?.table || [];
  }, [state.leagueTable, state.otherLeagues, playerLeagueId]);
  
  const playerInPlayoff = useMemo(() => {
    if (playerLeagueId !== 'segunda') return false;
    const pos = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1;
    return pos >= 3 && pos <= 6;
  }, [state.leagueTable, state.teamId, playerLeagueId]);
  
  // RFEF playoff detection: player in position 2-5 of their group
  const playerInRFEFPlayoff = useMemo(() => {
    if (playerLeagueId !== 'primeraRFEF' && playerLeagueId !== 'segundaRFEF') return false;
    // Player's group table is at state.leagueTable (flattened for compatibility)
    const groupTable = state.leagueTable || [];
    const pos = groupTable.findIndex(t => t.teamId === state.teamId) + 1;
    return pos >= 2 && pos <= 5;
  }, [state.leagueTable, state.teamId, playerLeagueId]);
  
  const anyPlayoff = playerInPlayoff || playerInRFEFPlayoff;
  
  // Apertura-Clausura final detection
  const pendingAPCLFinal = state.pendingAperturaClausuraFinal;
  const resolvedAPCLFinal = state.aperturaClausuraFinal;
  const hasAPCLFinal = !!pendingAPCLFinal;
  
  // Estado inicial: AP-CL final first, then playoff, then summary
  const getInitialPhase = () => {
    if (hasAPCLFinal) return 'apcl_final';
    if (anyPlayoff) return 'playoff';
    return 'summary';
  };
  
  const [phase, setPhase] = useState(getInitialPhase);
  const [selectedPreseason, setSelectedPreseason] = useState(null);
  const [playoffBracket, setPlayoffBracket] = useState(null);
  const [playoffMatchResult, setPlayoffMatchResult] = useState(null);
  const [playerEliminated, setPlayerEliminated] = useState(false);
  
  // AP-CL Final state
  const [apclLeg, setApclLeg] = useState(1); // 1 = leg 1, 2 = leg 2, 3 = done
  const [apclLeg1Result, setApclLeg1Result] = useState(null);
  const [apclLeg2Result, setApclLeg2Result] = useState(null);
  const [apclFinalResult, setApclFinalResult] = useState(resolvedAPCLFinal || null);
  
  // RFEF playoff brackets (all groups, player group is interactive)
  const [rfefPlayoffBrackets, setRfefPlayoffBrackets] = useState(null);
  
  // Inicializar playoff
  useEffect(() => {
    if (segundaTable.length > 0 && !playoffBracket) {
      const allTeamsData = [...getLaLigaTeams(), ...getSegundaTeams(), ...allTeams];
      // Deduplicar
      const uniqueTeams = [];
      const seen = new Set();
      allTeamsData.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); uniqueTeams.push(t); }});
      
      if (playerInPlayoff) {
        // Generar bracket sin simular (el jugador jugará los partidos)
        const bracket = generatePlayoffBracket(segundaTable, uniqueTeams);
        setPlayoffBracket(bracket);
      } else {
        // Auto-simular todo el playoff
        const bracket = simulateFullPlayoff(segundaTable, uniqueTeams);
        setPlayoffBracket(bracket);
      }
    }
  }, [segundaTable, playerInPlayoff]);
  
  // Initialize RFEF playoffs
  useEffect(() => {
    if (playerLeagueId !== 'primeraRFEF' && playerLeagueId !== 'segundaRFEF') return;
    if (rfefPlayoffBrackets) return;
    
    // Get group league data
    const groupLeagueData = state.leagueGroupData || state.otherLeagues?.[playerLeagueId];
    if (!groupLeagueData?.groups) return;
    
    const rfefTeams = playerLeagueId === 'primeraRFEF' ? getPrimeraRfefTeams() : getSegundaRfefTeams();
    
    // Generate playoff brackets for all groups
    const { brackets, playerGroupId } = generateAllGroupPlayoffs(groupLeagueData, rfefTeams, state.teamId);
    
    if (playerInRFEFPlayoff && playerGroupId) {
      // Player participates: simulate all OTHER groups, leave player's group for interactive play
      const { brackets: simBrackets, playerBracket } = simulateAllGroupPlayoffs(brackets, state.teamId);
      setRfefPlayoffBrackets(simBrackets);
      // Use the player's group bracket as the main playoffBracket for reuse of existing UI
      if (playerBracket) {
        setPlayoffBracket(playerBracket);
      }
    } else {
      // Player NOT in playoff: auto-simulate all groups
      const { brackets: simBrackets } = simulateAllGroupPlayoffs(brackets, null);
      setRfefPlayoffBrackets(simBrackets);
    }
  }, [playerLeagueId, state.leagueGroupData, state.otherLeagues, playerInRFEFPlayoff, rfefPlayoffBrackets]);
  
  // Obtener resultado de temporada
  const seasonResult = useMemo(() => {
    return getSeasonResult(state.leagueTable, state.teamId, playerLeagueId);
  }, [state.leagueTable, state.teamId, playerLeagueId]);
  
  // Calcular recompensas de objetivos
  const objectiveRewards = useMemo(() => {
    return calculateSeasonRewards(state.seasonObjectives || [], seasonResult);
  }, [state.seasonObjectives, seasonResult]);
  
  // Generar opciones de pretemporada
  const preseasonOptions = useMemo(() => {
    return generatePreseasonOptions(allTeams, state.team, playerLeagueId);
  }, [allTeams, state.team, playerLeagueId]);
  
  // Bonus europeo
  const europeanBonus = getEuropeanBonus(seasonResult.qualification);
  const competitionName = getCompetitionName(seasonResult.qualification);
  
  // Coste salarial anual (salario semanal × 52)
  const totalSalaryCost = useMemo(() => {
    const players = state.team?.players || [];
    return players.reduce((sum, p) => {
      const baseSalary = p.salary || 0;
      // For loaned players, only pay our share of their salary
      const share = (p.onLoan && p.loanSalaryShare != null) ? p.loanSalaryShare : 1;
      return sum + (baseSalary * share);
    }, 0) * 52;
  }, [state.team?.players]);
  
  // Si el jugador ganó el playoff, actualizar su seasonResult (copia para no mutar)
  const playerWonPlayoff = playoffBracket?.winner === state.teamId;
  const mutableResult = { ...seasonResult };
  if (playerWonPlayoff) {
    mutableResult.promotion = true;
    mutableResult.playoff = false;
  }
  
  const formatMoney = (amount) => {
    if (Math.abs(amount) >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  const handleSelectPreseason = (option) => {
    setSelectedPreseason(option);
  };
  
  // Handler para simular un partido de playoff del jugador
  const handlePlayoffMatch = () => {
    if (!playoffBracket) return;
    
    const nextMatch = getNextPlayoffMatch(state.teamId, playoffBracket);
    if (!nextMatch) return;
    
    const result = simulatePlayoffMatch(nextMatch.homeTeam, nextMatch.awayTeam);
    // Use group-aware advance for RFEF playoffs, standard for Segunda
    const isRFEF = playerLeagueId === 'primeraRFEF' || playerLeagueId === 'segundaRFEF';
    const updatedBracket = isRFEF
      ? advanceGroupPlayoffBracket(playoffBracket, nextMatch.id, result)
      : advancePlayoffBracket(playoffBracket, nextMatch.id, result);
    
    setPlayoffMatchResult(result);
    setPlayoffBracket(updatedBracket);
    
    // Update the RFEF brackets with the player's updated bracket
    if (isRFEF && rfefPlayoffBrackets && playoffBracket.groupId) {
      setRfefPlayoffBrackets(prev => ({
        ...prev,
        [playoffBracket.groupId]: updatedBracket
      }));
    }
    
    // Comprobar si el jugador fue eliminado
    if (result.winnerId !== state.teamId) {
      setPlayerEliminated(true);
      // Auto-simular el resto del playoff si queda la final
      if (updatedBracket.phase === 'final') {
        const finalResult = simulatePlayoffMatch(updatedBracket.final.homeTeam, updatedBracket.final.awayTeam);
        const completedBracket = isRFEF
          ? advanceGroupPlayoffBracket(updatedBracket, updatedBracket.final.id, finalResult)
          : advancePlayoffBracket(updatedBracket, 'final', finalResult);
        setPlayoffBracket(completedBracket);
        
        // Update RFEF brackets
        if (isRFEF && rfefPlayoffBrackets && playoffBracket.groupId) {
          setRfefPlayoffBrackets(prev => ({
            ...prev,
            [playoffBracket.groupId]: completedBracket
          }));
        }
      }
    }
  };
  
  const handlePlayoffContinue = () => {
    setPlayoffMatchResult(null);
    
    if (playoffBracket.phase === 'completed' || playerEliminated) {
      setPhase('summary');
    }
    // Si el jugador sigue vivo y queda la final, se queda en 'playoff'
  };
  
  // ============================================================
  // AP-CL FINAL: Interactive two-leg final
  // ============================================================
  const handlePlayAPCLLeg = () => {
    if (!pendingAPCLFinal) return;
    const config = LEAGUE_CONFIG[pendingAPCLFinal.leagueId || playerLeagueId];
    if (!config) return;
    const leagueTeams = config.getTeams();
    if (!leagueTeams || leagueTeams.length === 0) return;

    const aperturaTeam = leagueTeams.find(t => t.id === pendingAPCLFinal.aperturaChampion);
    const clausuraTeam = leagueTeams.find(t => t.id === pendingAPCLFinal.clausuraChampion);
    if (!aperturaTeam || !clausuraTeam) return;

    if (apclLeg === 1) {
      // Leg 1: Apertura at home vs Clausura away
      const result = simulateMatch(
        pendingAPCLFinal.aperturaChampion, pendingAPCLFinal.clausuraChampion,
        aperturaTeam, clausuraTeam,
        { importance: 'final', homeMorale: 85, awayMorale: 85 }
      );
      setApclLeg1Result({ homeScore: result.homeScore, awayScore: result.awayScore, events: result.events });
      setApclLeg(2);
    } else if (apclLeg === 2) {
      // Leg 2: Clausura at home vs Apertura away
      const result = simulateMatch(
        pendingAPCLFinal.clausuraChampion, pendingAPCLFinal.aperturaChampion,
        clausuraTeam, aperturaTeam,
        { importance: 'final', homeMorale: 85, awayMorale: 85 }
      );
      setApclLeg2Result({ homeScore: result.homeScore, awayScore: result.awayScore, events: result.events });

      // Compute aggregate
      const leg1 = apclLeg1Result;
      const leg2 = { homeScore: result.homeScore, awayScore: result.awayScore };
      const aperturaTotal = leg1.homeScore + leg2.awayScore;
      const clausuraTotal = leg1.awayScore + leg2.homeScore;
      const aperturaAwayGoals = leg2.awayScore;
      const clausuraAwayGoals = leg1.awayScore;

      let winner, winReason;
      if (aperturaTotal > clausuraTotal) {
        winner = pendingAPCLFinal.aperturaChampion; winReason = 'aggregate';
      } else if (clausuraTotal > aperturaTotal) {
        winner = pendingAPCLFinal.clausuraChampion; winReason = 'aggregate';
      } else if (aperturaAwayGoals > clausuraAwayGoals) {
        winner = pendingAPCLFinal.aperturaChampion; winReason = 'awayGoals';
      } else if (clausuraAwayGoals > aperturaAwayGoals) {
        winner = pendingAPCLFinal.clausuraChampion; winReason = 'awayGoals';
      } else {
        winner = pendingAPCLFinal.clausuraChampion; winReason = 'clausuraAdvantage';
      }

      const finalRes = {
        aperturaChampion: pendingAPCLFinal.aperturaChampion,
        aperturaChampionName: pendingAPCLFinal.aperturaChampionName,
        clausuraChampion: pendingAPCLFinal.clausuraChampion,
        clausuraChampionName: pendingAPCLFinal.clausuraChampionName,
        leg1: { home: pendingAPCLFinal.aperturaChampion, away: pendingAPCLFinal.clausuraChampion, homeScore: leg1.homeScore, awayScore: leg1.awayScore },
        leg2: { home: pendingAPCLFinal.clausuraChampion, away: pendingAPCLFinal.aperturaChampion, homeScore: leg2.homeScore, awayScore: leg2.awayScore },
        aggregate: { apertura: aperturaTotal, clausura: clausuraTotal },
        awayGoals: { apertura: aperturaAwayGoals, clausura: clausuraAwayGoals },
        winner,
        winnerName: winner === pendingAPCLFinal.aperturaChampion
          ? pendingAPCLFinal.aperturaChampionName
          : pendingAPCLFinal.clausuraChampionName,
        winReason,
        hadFinal: true
      };
      setApclFinalResult(finalRes);
      setApclLeg(3);

      // Dispatch to store in state
      dispatch({ type: 'COMPLETE_APCL_FINAL', payload: finalRes });
    }
  };

  const handleAPCLContinue = () => {
    if (apclLeg === 3 || apclFinalResult) {
      setPhase(anyPlayoff ? 'playoff' : 'summary');
    }
  };

  const handleConfirm = () => {
    if (!selectedPreseason) return;
    
    // Calcular total de dinero (ingresos - salarios)
    const totalMoney = objectiveRewards.netResult + europeanBonus - totalSalaryCost;
    
    // Build RFEF playoff data for promotion processing
    const rfefPlayoffOptions = {};
    if (rfefPlayoffBrackets) {
      if (playerLeagueId === 'primeraRFEF' || state.otherLeagues?.primeraRFEF) {
        // Check if we have Primera RFEF brackets
        const isPrimera = playerLeagueId === 'primeraRFEF';
        if (isPrimera) {
          rfefPlayoffOptions.primeraRFEFPlayoffBrackets = rfefPlayoffBrackets;
        }
      }
      if (playerLeagueId === 'segundaRFEF' || state.otherLeagues?.segundaRFEF) {
        const isSegunda = playerLeagueId === 'segundaRFEF';
        if (isSegunda) {
          rfefPlayoffOptions.segundaRFEFPlayoffBrackets = rfefPlayoffBrackets;
        }
      }
    }
    
    // Procesar promoción/relegación y generar nuevas ligas (con playoff resuelto)
    const newSeasonData = initializeNewSeasonWithPromotions(state, state.teamId, playoffBracket, rfefPlayoffOptions);
    
    // Generar nuevos objetivos para la nueva liga del jugador
    const newPlayerLeagueId = newSeasonData.newPlayerLeagueId || state.playerLeagueId || 'laliga';
    const newObjectives = generateSeasonObjectives(state.team, newPlayerLeagueId, newSeasonData.playerLeague.table);
    
    // Collect messages to dispatch AFTER START_NEW_SEASON (so they aren't wiped)
    const pendingMessages = [];
    if (newSeasonData.changes.relegated.length > 0 || newSeasonData.changes.promoted.length > 0 || newSeasonData.changes.playoffWinner) {
      if (newSeasonData.changes.relegated.length > 0) {
        pendingMessages.push({
          id: Date.now(),
          type: 'relegation',
          title: t('seasonEnd.msgRelegationTitle'),
          content: t('seasonEnd.msgRelegated', { teams: newSeasonData.changes.relegated.join(', ') }),
          date: t('seasonEnd.endOfSeasonDate', { season: state.currentSeason })
        });
      }
      if (newSeasonData.changes.promoted.length > 0) {
        pendingMessages.push({
          id: Date.now() + 1,
          type: 'promotion',
          title: t('seasonEnd.msgPromotionTitle'),
          content: t('seasonEnd.msgPromoted', { teams: newSeasonData.changes.promoted.join(', ') }),
          date: t('seasonEnd.endOfSeasonDate', { season: state.currentSeason })
        });
      }
      if (newSeasonData.changes.playoffWinner) {
        pendingMessages.push({
          id: Date.now() + 2,
          type: 'promotion',
          title: t('seasonEnd.msgPlayoffPromotion'),
          content: t('seasonEnd.msgPlayoffWinner', { team: newSeasonData.changes.playoffWinner }),
          date: t('seasonEnd.endOfSeasonDate', { season: state.currentSeason })
        });
      }
      if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
        // Detect promotion: moving to a higher tier league
        const tierOrder = ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'];
        const oldTier = tierOrder.indexOf(state.playerLeagueId || 'laliga');
        const newTier = tierOrder.indexOf(newSeasonData.newPlayerLeagueId);
        const isPromotion = newTier >= 0 && oldTier >= 0 ? newTier < oldTier : newSeasonData.newPlayerLeagueId === 'laliga';
        pendingMessages.push({
          id: Date.now() + 3,
          type: isPromotion ? 'promotion' : 'relegation',
          title: isPromotion ? t('seasonEnd.msgPlayerPromotion') : t('seasonEnd.msgPlayerRelegation'),
          content: isPromotion 
            ? t('seasonEnd.msgTeamPromoted', { team: state.team.name })
            : t('seasonEnd.msgTeamRelegated', { team: state.team.name }),
          date: t('seasonEnd.endOfSeasonDate', { season: state.currentSeason })
        });
      }
    }
    
    // ============================================================
    // CUP COMPETITION — Initialize domestic cup
    // ============================================================
    let cupBracket = null;
    let cupRounds = 0;

    try {
      const cupData = getCupTeams(
        newPlayerLeagueId,
        state.team,
        newSeasonData.otherLeagues || state.otherLeagues,
        newSeasonData.playerLeague?.table || state.leagueTable
      );

      if (cupData && cupData.teams.length >= 2) {
        cupBracket = generateCupBracket(cupData.teams, state.teamId);
        if (cupBracket) {
          cupRounds = cupBracket.rounds.length;
        }
      }
    } catch (err) {
      console.warn('Error initializing cup competition:', err);
    }

    // ============================================================
    // SEASON CALENDAR — Intercalate European AND cup weeks into fixtures
    // ============================================================
    let finalFixtures = newSeasonData.playerLeague.fixtures;
    let europeanCalendar = null;
    const hasEuropean = !!seasonResult.qualification;

    {
      // ALWAYS build season calendar (even league-only) so Calendar component
      // can properly show competition tabs (Liga / Copa / Europa)
      const totalLeagueMDs = finalFixtures.length > 0
        ? Math.max(...finalFixtures.map(f => f.week))
        : 38;
      europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean, cupRounds });
      finalFixtures = remapFixturesForEuropean(finalFixtures, europeanCalendar.leagueWeekMap);
    }

    // ============================================================
    // CONTRARRELOJ: Record trophies for league/cup wins this season
    // ============================================================
    if (state.gameMode === 'contrarreloj') {
      // League champion?
      const playerPos = state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1;
      if (playerPos === 1) {
        dispatch({
          type: 'CONTRARRELOJ_ADD_TROPHY',
          payload: {
            type: 'league',
            season: state.currentSeason,
            name: getLeagueName(playerLeagueId) || playerLeagueId
          }
        });
      }
      // Cup champion is already handled in COMPLETE_CUP_MATCH
      // European/SA champion is already handled in COMPLETE_EUROPEAN_MATCH / COMPLETE_SA_MATCH
    }

    // Save final season stats for ProManager season end screen (before table resets)
    if (state.gameMode === 'promanager' && state.proManagerData) {
      const finalTeamEntry = state.leagueTable?.find(t => t.teamId === state.teamId);
      const finalPosition = (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || 1;
      dispatch({
        type: 'SET_PROMANAGER_DATA',
        payload: {
          ...state.proManagerData,
          lastSeasonStats: {
            position: finalPosition,
            points: finalTeamEntry?.points || 0,
            won: finalTeamEntry?.won || 0,
            drawn: finalTeamEntry?.drawn || 0,
            lost: finalTeamEntry?.lost || 0,
            goalsFor: finalTeamEntry?.goalsFor || 0,
            goalsAgainst: finalTeamEntry?.goalsAgainst || 0,
            cupResult: state.cupCompetition?.playerEliminated 
              ? t('seasonEnd.pmCupEliminated', { round: state.cupCompetition.rounds?.[state.cupCompetition.currentRound]?.name || 'copa' })
              : state.cupCompetition?.winner === state.teamId ? t('seasonEnd.pmCupChampion') : null,
            europeanResult: state.europeanCompetitions ? t('seasonEnd.pmEuropeanParticipated') : null,
            league: state.playerLeagueId || 'laliga',
            season: state.currentSeason || 1
          }
        }
      });
    }

    // Dispatch para iniciar nueva temporada
    dispatch({
      type: 'START_NEW_SEASON',
      payload: {
        seasonResult: mutableResult,
        objectiveRewards,
        europeanBonus,
        preseasonMatches: selectedPreseason.matches,
        moneyChange: totalMoney,
        newFixtures: finalFixtures,
        newTable: newSeasonData.playerLeague.table,
        newObjectives,
        newPlayerLeagueId: newSeasonData.newPlayerLeagueId,
        europeanCalendar
      }
    });
    
    // Actualizar otras ligas
    dispatch({
      type: 'SET_OTHER_LEAGUES',
      payload: newSeasonData.otherLeagues
    });
    
    // Dispatch pending messages AFTER START_NEW_SEASON so they aren't wiped
    pendingMessages.forEach(msg => {
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
    });
    
    // Actualizar liga del jugador si cambió
    if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
      dispatch({
        type: 'SET_PLAYER_LEAGUE',
        payload: newSeasonData.newPlayerLeagueId
      });
    }
    
    // Update player's group ID for group leagues
    if (newSeasonData.playerLeague?.playerGroup) {
      dispatch({
        type: 'SET_PLAYER_GROUP',
        payload: newSeasonData.playerLeague.playerGroup
      });
    } else if (newSeasonData.playerLeague && !newSeasonData.playerLeague.isGroupLeague) {
      dispatch({ type: 'SET_PLAYER_GROUP', payload: null });
    }
    
    // Initialize cup competition
    if (cupBracket) {
      dispatch({
        type: 'INIT_CUP_COMPETITION',
        payload: cupBracket
      });
    }
    
    // ============================================================
    // CONTINENTAL COMPETITIONS — Initialize for next season
    // ============================================================
    const isInSALeague = isSouthAmericanLeague(newSeasonData.newPlayerLeagueId || playerLeagueId);
    
    try {
      const leagueStandings = {};
      const allTeamsMap = {};

      const playerTable = newSeasonData.playerLeague?.table || state.leagueTable || [];
      const newPlayerLeague = newSeasonData.newPlayerLeagueId || playerLeagueId;
      if (playerTable.length > 0) {
        leagueStandings[newPlayerLeague] = playerTable;
      }
      
      const otherLeagues = newSeasonData.otherLeagues || state.otherLeagues || {};
      for (const [leagueId, leagueData] of Object.entries(otherLeagues)) {
        if (leagueData?.table?.length > 0 && leagueId !== newPlayerLeague) {
          leagueStandings[leagueId] = leagueData.table;
        }
      }

      allTeams.forEach(t => {
        allTeamsMap[t.id || t.teamId] = t;
      });

      if (isInSALeague) {
        // ── SOUTH AMERICAN COMPETITIONS ──
        const qualifiedTeams = qualifyTeamsForSouthAmerica(leagueStandings, allTeamsMap);
        
        const totalQualified = qualifiedTeams.copaLibertadores.length + 
                               qualifiedTeams.copaSudamericana.length;

        if (totalQualified >= 8) {
          const usedTeamIds = new Set();
          Object.values(qualifiedTeams).forEach(teams => 
            teams.forEach(t => usedTeamIds.add(t.teamId))
          );

          const remainingTeams = allTeams
            .filter(t => !usedTeamIds.has(t.id || t.teamId) && isSouthAmericanLeague(t.league || t.leagueId || ''))
            .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

          for (const compId of ['copaLibertadores', 'copaSudamericana']) {
            const needed = 32 - qualifiedTeams[compId].length;
            if (needed > 0) {
              const fillers = remainingTeams.splice(0, needed);
              qualifiedTeams[compId].push(...fillers.map(t => ({
                teamId: t.id || t.teamId,
                teamName: t.name || t.teamName,
                shortName: t.shortName || '',
                league: t.league || 'unknown',
                leaguePosition: 0,
                reputation: t.reputation || 60,
                overall: t.overall || 65,
                players: t.players || [],
                ...t
              })));
            }
          }

          const saState = initializeSACompetitions(qualifiedTeams);
          dispatch({ type: 'INIT_SA_COMPETITIONS', payload: saState });

          const playerQualComp = ['copaLibertadores', 'copaSudamericana']
            .find(c => qualifiedTeams[c].some(t => (t.teamId || t.id) === state.teamId));

          if (playerQualComp) {
            const compNames = { copaLibertadores: 'South American Champions Cup', copaSudamericana: 'Copa Sudamericana' };
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: Date.now() + 100,
                type: 'southamerican',
                title: t('seasonEnd.msgContinentalComp'),
                content: t('seasonEnd.msgTeamPlaysContinental', { comp: compNames[playerQualComp] }),
                date: t('seasonEnd.startOfSeasonDate', { season: state.currentSeason + 1 })
              }
            });
          }
        }
      } else {
        // ── EUROPEAN COMPETITIONS ──
        const qualifiedTeams = qualifyTeamsForEurope(leagueStandings, allTeamsMap);
        
        const totalQualified = qualifiedTeams.championsLeague.length + 
                               qualifiedTeams.europaLeague.length + 
                               qualifiedTeams.conferenceleague.length;

        if (totalQualified >= 12) {
          const usedTeamIds = new Set();
          Object.values(qualifiedTeams).forEach(teams => 
            teams.forEach(t => usedTeamIds.add(t.teamId))
          );

          const remainingTeams = allTeams
            .filter(t => !usedTeamIds.has(t.id || t.teamId))
            .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

          for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
            const needed = 32 - qualifiedTeams[compId].length;
            if (needed > 0) {
              const fillers = remainingTeams.splice(0, needed);
              qualifiedTeams[compId].push(...fillers.map(t => ({
                teamId: t.id || t.teamId,
                teamName: t.name || t.teamName,
                shortName: t.shortName || '',
                league: t.league || 'unknown',
                leaguePosition: 0,
                reputation: t.reputation || 60,
                overall: t.overall || 65,
                players: t.players || [],
                ...t
              })));
            }
          }

          const europeanState = initializeEuropeanCompetitions(qualifiedTeams);
          dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: europeanState });

          const playerQualComp = ['championsLeague', 'europaLeague', 'conferenceleague']
            .find(c => qualifiedTeams[c].some(t => (t.teamId || t.id) === state.teamId));

          if (playerQualComp) {
            const compNames = { championsLeague: 'Continental Champions Cup', europaLeague: 'Continental Shield', conferenceleague: 'Continental Trophy' };
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: Date.now() + 100,
                type: 'european',
                title: t('seasonEnd.msgEuropeanComp'),
                content: t('seasonEnd.msgTeamPlaysContinental', { comp: compNames[playerQualComp] }),
                date: t('seasonEnd.startOfSeasonDate', { season: state.currentSeason + 1 })
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error initializing continental competitions:', err);
    }
    
    onComplete();
  };
  
  // === FASE FINAL APERTURA vs CLAUSURA ===
  if (phase === 'apcl_final' && pendingAPCLFinal) {
    const winReasonLabel = (reason) => {
      if (reason === 'aggregate') return t('seasonEnd.byAggregate');
      if (reason === 'awayGoals') return t('seasonEnd.byAwayGoals');
      if (reason === 'clausuraAdvantage') return t('seasonEnd.byClausuraAdvantage');
      if (reason === 'sameChampion') return t('seasonEnd.sameChampion');
      return '';
    };
    const playerIsApertura = state.teamId === pendingAPCLFinal.aperturaChampion;
    const playerIsClausura = state.teamId === pendingAPCLFinal.clausuraChampion;

    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Trophy size={32} className="header-icon playoff-icon" />
            <div>
              <h1>{t('seasonEnd.finalTitle')} {pendingAPCLFinal.leagueName || t('seasonEnd.league')}</h1>
              <p>{t('seasonEnd.aperturaVsClausura')} — {apclLeg <= 2 ? (apclLeg === 1 ? t('seasonEnd.firstLeg') : t('seasonEnd.secondLeg')) : t('seasonEnd.result')}</p>
            </div>
          </div>

          {/* Bracket visual */}
          <div className="playoff-bracket">
            <h3><ClipboardList size={14} /> {t('seasonEnd.aperturaChampVsClausuraChamp')}</h3>
            <div className="bracket-matches">
              {/* Leg 1 */}
              <div className={`bracket-match ${apclLeg1Result ? 'played' : ''}`}>
                <span className="bracket-label">{t('seasonEnd.leg1Label')}</span>
                <div className="bracket-teams">
                  <span className={`team ${playerIsApertura ? 'player-team' : ''}`}>
                    {pendingAPCLFinal.aperturaChampionName} <small>({t('seasonEnd.apertura')})</small>
                  </span>
                  {apclLeg1Result && (
                    <span className="score">{apclLeg1Result.homeScore} - {apclLeg1Result.awayScore}</span>
                  )}
                  <span className={`team ${playerIsClausura ? 'player-team' : ''}`}>
                    {pendingAPCLFinal.clausuraChampionName} <small>({t('seasonEnd.clausura')})</small>
                  </span>
                </div>
              </div>

              {/* Leg 2 */}
              <div className={`bracket-match ${apclLeg2Result ? 'played' : ''}`}>
                <span className="bracket-label">{t('seasonEnd.leg2Label')}</span>
                <div className="bracket-teams">
                  <span className={`team ${playerIsClausura ? 'player-team' : ''}`}>
                    {pendingAPCLFinal.clausuraChampionName} <small>({t('seasonEnd.clausura')})</small>
                  </span>
                  {apclLeg2Result && (
                    <span className="score">{apclLeg2Result.homeScore} - {apclLeg2Result.awayScore}</span>
                  )}
                  <span className={`team ${playerIsApertura ? 'player-team' : ''}`}>
                    {pendingAPCLFinal.aperturaChampionName} <small>({t('seasonEnd.apertura')})</small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Final result */}
          {apclFinalResult && (
            <div className={`playoff-result ${apclFinalResult.winner === state.teamId ? 'victory' : 'defeat'}`}>
              <h3>
                {apclFinalResult.winner === state.teamId
                  ? <><Sparkles size={14} /> {t('seasonEnd.championExclaim')}</>
                  : t('seasonEnd.runnerUp')}
              </h3>
              <p className="result-score">
                {t('seasonEnd.aggregate')}: {apclFinalResult.aperturaChampionName} {apclFinalResult.aggregate.apertura} - {apclFinalResult.aggregate.clausura} {apclFinalResult.clausuraChampionName}
              </p>
              <p className="result-extra">{winReasonLabel(apclFinalResult.winReason)}</p>
              {apclFinalResult.winner === state.teamId && (
                <p className="promotion-msg"><Trophy size={14} /> {t('seasonEnd.championOfLeague', { team: state.team?.name, league: pendingAPCLFinal.leagueName })}</p>
              )}
              <button className="btn-continue" onClick={handleAPCLContinue}>
                {t('seasonEnd.continueBtn')} <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Play next leg */}
          {!apclFinalResult && (
            <div className="playoff-next-match">
              <h3><Zap size={14} /> {apclLeg === 1 ? t('seasonEnd.firstLegMatch') : t('seasonEnd.secondLegMatch')}</h3>
              <p className="next-match-info">
                {apclLeg === 1
                  ? <><strong>{pendingAPCLFinal.aperturaChampionName}</strong> <small>{t('seasonEnd.local')}</small> vs <strong>{pendingAPCLFinal.clausuraChampionName}</strong></>
                  : <><strong>{pendingAPCLFinal.clausuraChampionName}</strong> <small>{t('seasonEnd.local')}</small> vs <strong>{pendingAPCLFinal.aperturaChampionName}</strong></>
                }
              </p>
              <p className="next-match-venue">
                {(apclLeg === 1 && playerIsApertura) || (apclLeg === 2 && playerIsClausura)
                  ? <><Home size={12} /> {t('seasonEnd.homeGame')}</>
                  : <><Plane size={12} /> {t('seasonEnd.awayGame')}</>
                }
              </p>
              <button className="btn-continue btn-play-match" onClick={handlePlayAPCLLeg}>
                <FootballIcon size={14} /> {t('seasonEnd.playMatch')} <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === FASE PLAYOFF (si el jugador está en playoff de Segunda) ===
  if (phase === 'playoff' && playoffBracket) {
    const nextMatch = getNextPlayoffMatch(state.teamId, playoffBracket);
    const isPlayerHome = nextMatch?.homeTeam?.teamId === state.teamId;
    const opponentEntry = nextMatch ? (isPlayerHome ? nextMatch.awayTeam : nextMatch.homeTeam) : null;
    
    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Zap size={32} className="header-icon playoff-icon" />
            <div>
              <h1>{t('seasonEnd.playoffDeAscenso')}</h1>
              <p>{playoffBracket.phase === 'semifinals' ? t('seasonEnd.semisLabel') : t('seasonEnd.finalLabel')}</p>
            </div>
          </div>
          
          {/* Bracket visual */}
          <div className="playoff-bracket">
            <h3><ClipboardList size={14} /> {t('seasonEnd.playoffBracket')}</h3>
            <div className="bracket-matches">
              {playoffBracket.semifinals.map((semi, idx) => (
                <div key={idx} className={`bracket-match ${semi.played ? 'played' : ''}`}>
                  <span className="bracket-label">{semi.label}</span>
                  <div className="bracket-teams">
                    <span className={`team ${semi.result?.winnerId === semi.homeTeam.teamId ? 'winner' : ''} ${semi.homeTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {semi.homeTeam.teamName} ({semi.homeTeam.seed}º)
                    </span>
                    {semi.played && (
                      <span className="score">
                        {semi.result.homeScore} - {semi.result.awayScore}
                        {semi.result.extraTime && !semi.result.penalties && ` (${t('seasonEnd.extraTimeShort')})`}
                        {semi.result.penalties && ` (${t('seasonEnd.penShort')}: ${semi.result.penalties.homeGoals}-${semi.result.penalties.awayGoals})`}
                      </span>
                    )}
                    <span className={`team ${semi.result?.winnerId === semi.awayTeam.teamId ? 'winner' : ''} ${semi.awayTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {semi.awayTeam.teamName} ({semi.awayTeam.seed}º)
                    </span>
                  </div>
                </div>
              ))}
              
              {playoffBracket.final.homeTeam && (
                <div className={`bracket-match final-match ${playoffBracket.final.played ? 'played' : ''}`}>
                  <span className="bracket-label"><Trophy size={14} /> {t('seasonEnd.finalBracketLabel')}</span>
                  <div className="bracket-teams">
                    <span className={`team ${playoffBracket.final.result?.winnerId === playoffBracket.final.homeTeam.teamId ? 'winner' : ''} ${playoffBracket.final.homeTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {playoffBracket.final.homeTeam.teamName}
                    </span>
                    {playoffBracket.final.played && (
                      <span className="score">
                        {playoffBracket.final.result.homeScore} - {playoffBracket.final.result.awayScore}
                        {playoffBracket.final.result.extraTime && !playoffBracket.final.result.penalties && ` (${t('seasonEnd.extraTimeShort')})`}
                        {playoffBracket.final.result.penalties && ` (${t('seasonEnd.penShort')}: ${playoffBracket.final.result.homeGoals}-${playoffBracket.final.result.awayGoals})`}
                      </span>
                    )}
                    <span className={`team ${playoffBracket.final.result?.winnerId === playoffBracket.final.awayTeam?.teamId ? 'winner' : ''} ${playoffBracket.final.awayTeam?.teamId === state.teamId ? 'player-team' : ''}`}>
                      {playoffBracket.final.awayTeam?.teamName || '?'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Resultado del último partido */}
          {playoffMatchResult && (
            <div className={`playoff-result ${playoffMatchResult.winnerId === state.teamId ? 'victory' : 'defeat'}`}>
              <h3>{playoffMatchResult.winnerId === state.teamId ? <><Sparkles size={14} /> {t('seasonEnd.victoryExclaim')}</> : t('seasonEnd.defeatLabel')}</h3>
              <p className="result-score">
                {playoffMatchResult.homeTeamName} {playoffMatchResult.homeScore} - {playoffMatchResult.awayScore} {playoffMatchResult.awayTeamName}
              </p>
              {playoffMatchResult.extraTime && !playoffMatchResult.penalties && (
                <p className="result-extra">{t('seasonEnd.extraTimeLabel')}: {playoffMatchResult.finalHomeScore} - {playoffMatchResult.finalAwayScore}</p>
              )}
              {playoffMatchResult.penalties && (
                <p className="result-extra">{t('seasonEnd.penaltiesLabel')}: {playoffMatchResult.penalties.homeGoals} - {playoffMatchResult.penalties.awayGoals}</p>
              )}
              
              {playoffMatchResult.winnerId === state.teamId && playoffBracket.phase === 'completed' && (
                <p className="promotion-msg"><Trophy size={14} /> {t('seasonEnd.teamAscends', { team: state.team?.name })}</p>
              )}
              {playerEliminated && (
                <p className="elimination-msg">{t('seasonEnd.eliminatedFromPlayoff')}</p>
              )}
              
              <button className="btn-continue" onClick={handlePlayoffContinue}>
                {t('seasonEnd.continueBtn')} <ChevronRight size={20} />
              </button>
            </div>
          )}
          
          {/* Botón para jugar el siguiente partido */}
          {!playoffMatchResult && nextMatch && !playerEliminated && (
            <div className="playoff-next-match">
              <h3><Zap size={14} /> {t('seasonEnd.nextMatchLabel')}</h3>
              <p className="next-match-info">
                {nextMatch.label}: <strong>{nextMatch.homeTeam.teamName}</strong> vs <strong>{nextMatch.awayTeam.teamName}</strong>
              </p>
              <p className="next-match-venue">
                {isPlayerHome ? <><Home size={12} /> {t('seasonEnd.homeGame')}</> : <><Plane size={12} /> {t('seasonEnd.awayGame')}</>}
              </p>
              <button className="btn-continue btn-play-match" onClick={handlePlayoffMatch}>
                <FootballIcon size={14} /> {t('seasonEnd.playMatch')} <ChevronRight size={20} />
              </button>
            </div>
          )}
          
          {/* Si ya no queda partido (eliminado o playoff completado) */}
          {!playoffMatchResult && !nextMatch && (
            <div className="playoff-completed">
              {playoffBracket.phase === 'completed' && (
                <>
                  <h3><Trophy size={14} /> {t('seasonEnd.playoffCompletedLabel')}</h3>
                  {playoffBracket.winner === state.teamId ? (
                    <p className="promotion-msg">{t('seasonEnd.teamAscends', { team: state.team?.name })}</p>
                  ) : (
                    <p>{t('seasonEnd.playoffWinnerLabel')}: {playoffBracket.final?.result?.winnerName}</p>
                  )}
                </>
              )}
              <button className="btn-continue" onClick={() => setPhase('summary')}>
                {t('seasonEnd.viewSeasonSummary')} <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // === Fase 1: Resumen de temporada ===
  if (phase === 'summary') {
    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Trophy size={32} className="header-icon" />
            <div>
              <h1>{t('seasonEnd.seasonEndTitle', { season: state.currentSeason })}</h1>
              <p>{state.team?.name}</p>
            </div>
          </div>
          
          {/* Posición Final */}
          <div className="final-position">
            <div className="position-badge">
              <span className="position-number">{seasonResult.position}º</span>
              <span className="position-label">{t('seasonEnd.finalPositionLabel')}</span>
            </div>
            
            <div className="season-stats">
              <div className="stat">
                <span className="value">{seasonResult.points}</span>
                <span className="label">{t('seasonEnd.pointsLabel')}</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.wins}</span>
                <span className="label">{t('seasonEnd.winsLabel')}</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.draws}</span>
                <span className="label">{t('seasonEnd.drawsLabel')}</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.losses}</span>
                <span className="label">{t('seasonEnd.lossesLabel')}</span>
              </div>
              <div className="stat">
                <span className={`value ${seasonResult.goalDifference >= 0 ? 'positive' : 'negative'}`}>
                  {seasonResult.goalDifference > 0 ? '+' : ''}{seasonResult.goalDifference}
                </span>
                <span className="label">{t('seasonEnd.goalDiffLabel')}</span>
              </div>
            </div>
          </div>
          
          {/* Resultado en Copa doméstica */}
          {state.cupCompetition && (() => {
            const cup = state.cupCompetition;
            const cupName = cup.config?.name || 'Copa';
            const cupIcon = cup.config?.icon || '🏆';
            let cupResult = null;
            let isChampion = false;

            if (cup.winner === state.teamId) {
              cupResult = t('seasonEnd.championLabel');
              isChampion = true;
            } else if (cup.playerEliminated) {
              // Find the round where the player lost
              for (let i = 0; i < cup.rounds.length; i++) {
                const round = cup.rounds[i];
                for (const match of round.matches) {
                  if (match.played && !match.bye &&
                    (match.homeTeam?.teamId === state.teamId || match.awayTeam?.teamId === state.teamId) &&
                    match.winnerId && match.winnerId !== state.teamId) {
                    cupResult = round.name;
                    break;
                  }
                }
                if (cupResult) break;
              }
              if (!cupResult) cupResult = t('seasonEnd.eliminatedLabel');
            } else {
              // Player still alive but cup not finished — find the furthest round reached
              let lastRoundPlayed = null;
              for (let i = cup.rounds.length - 1; i >= 0; i--) {
                const round = cup.rounds[i];
                const playerMatch = round.matches.find(m =>
                  m.homeTeam?.teamId === state.teamId || m.awayTeam?.teamId === state.teamId
                );
                if (playerMatch && (playerMatch.played || playerMatch.bye)) {
                  lastRoundPlayed = round.name;
                  break;
                }
              }
              if (lastRoundPlayed) {
                cupResult = lastRoundPlayed;
              } else {
                // Didn't play any round — check if they had a bye in round 1
                cupResult = cup.rounds[0]?.name || t('seasonEnd.participantLabel');
              }
            }

            return (
              <div className={`competition-result ${isChampion ? 'competition-result--champion' : ''}`}>
                <Flag size={24} className="result-icon" />
                <div className="result-info">
                  <h3>{cupIcon} {cupName}</h3>
                  <p>{isChampion ? t('seasonEnd.cupChampion') : cup.playerEliminated ? t('seasonEnd.cupEliminatedIn', { round: cupResult }) : t('seasonEnd.cupReached', { round: cupResult })}</p>
                </div>
              </div>
            );
          })()}

          {/* Resultado en competición europea */}
          {state.europeanCompetitions?.competitions && (() => {
            const comps = state.europeanCompetitions.competitions;
            for (const [compId, compState] of Object.entries(comps)) {
              if (!compState) continue;
              if (!compState.teams?.some(t => t.teamId === state.teamId)) continue;

              const compName = compState.config?.shortName || compState.config?.name || compId;
              const icon = compState.config?.icon || '🌍';
              let result = null;
              let isChampion = false;

              // Won the final
              if (compState.finalResult?.winner?.teamId === state.teamId) {
                result = t('seasonEnd.championLabel');
                isChampion = true;
              } else {
                // Check elimination in reverse order (from final backwards)
                // Lost in final
                if (compState.finalResult?.winner && compState.finalResult.winner.teamId !== state.teamId) {
                  const fm = compState.finalMatchup;
                  if (fm && (fm.team1?.teamId === state.teamId || fm.team2?.teamId === state.teamId)) {
                    result = t('seasonEnd.finalRunnerUp');
                  }
                }

                // Check knockout phases
                if (!result) {
                  const phases = [
                    { key: 'sfResults', name: t('seasonEnd.semifinalsPhase') },
                    { key: 'qfResults', name: t('seasonEnd.quarterFinalsPhase') },
                    { key: 'r16Results', name: t('seasonEnd.roundOf16Phase') },
                    { key: 'playoffResults', name: t('seasonEnd.playoffPhase') }
                  ];
                  for (const { key, name } of phases) {
                    const results = compState[key];
                    if (!results || results.length === 0) continue;
                    const teamMatch = results.find(r =>
                      r.team1?.teamId === state.teamId || r.team2?.teamId === state.teamId
                    );
                    if (teamMatch) {
                      if (teamMatch.winner && teamMatch.winner.teamId !== state.teamId) {
                        result = name;
                      } else if (teamMatch.winner && teamMatch.winner.teamId === state.teamId) {
                        // Won this round but didn't find elimination later — still active
                        continue;
                      }
                      break;
                    }
                  }
                }

                // Swiss phase elimination
                if (!result) {
                  const q = compState.qualification;
                  if (q?.eliminated?.some(t => t.teamId === state.teamId)) {
                    // Find position in Swiss standings
                    const standing = compState.standings?.find(s => s.teamId === state.teamId);
                    const pos = standing ? compState.standings.indexOf(standing) + 1 : null;
                    result = pos ? t('seasonEnd.leaguePhasePos', { pos }) : t('seasonEnd.leaguePhase');
                  }
                }

                // Fallback: still active or unknown — show league position
                if (!result) {
                  const standing = compState.standings?.find(s => s.teamId === state.teamId);
                  if (standing) {
                    const pos = compState.standings
                      .sort((a, b) => (b.points - a.points) || (b.goalDifference - a.goalDifference))
                      .findIndex(s => s.teamId === state.teamId) + 1;
                    if (compState.phase === 'league' || compState.currentMatchday < 8) {
                      result = t('seasonEnd.leaguePhasePosMatchday', { pos, matchday: compState.currentMatchday || 0 });
                    } else {
                      result = t('seasonEnd.posInLeaguePhase', { pos });
                    }
                  } else {
                    result = t('seasonEnd.participantLabel');
                  }
                }
              }

              return (
                <div className={`competition-result ${isChampion ? 'competition-result--champion' : ''}`}>
                  <Globe size={24} className="result-icon" />
                  <div className="result-info">
                    <h3>{icon} {compName}</h3>
                    <p>{isChampion ? t('seasonEnd.cupChampion') : result}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Resultado en competición sudamericana */}
          {state.saCompetitions?.competitions && (() => {
            const comps = state.saCompetitions.competitions;
            for (const [compId, compState] of Object.entries(comps)) {
              if (!compState) continue;
              if (!compState.teams?.some(t => t.teamId === state.teamId)) continue;

              const compName = compState.config?.shortName || compState.config?.name || compId;
              const icon = compState.config?.icon || '🌎';
              let result = null;
              let isChampion = false;

              // Won the final
              if (compState.finalResult?.winner?.teamId === state.teamId) {
                result = t('seasonEnd.championLabel');
                isChampion = true;
              } else {
                // Lost in final
                if (compState.finalResult?.winner && compState.finalResult.winner.teamId !== state.teamId) {
                  const fm = compState.finalMatchup;
                  if (fm && (fm.team1?.teamId === state.teamId || fm.team2?.teamId === state.teamId)) {
                    result = t('seasonEnd.finalRunnerUp');
                  }
                }

                // Check knockout phases
                if (!result) {
                  const phases = [
                    { key: 'sfResults', name: t('seasonEnd.semifinalsPhase') },
                    { key: 'qfResults', name: t('seasonEnd.quarterFinalsPhase') },
                    { key: 'r16Results', name: t('seasonEnd.roundOf16Phase') },
                    { key: 'playoffResults', name: t('seasonEnd.playoffPhase') }
                  ];
                  for (const { key, name } of phases) {
                    const results = compState[key];
                    if (!results || results.length === 0) continue;
                    const teamMatch = results.find(r =>
                      r.team1?.teamId === state.teamId || r.team2?.teamId === state.teamId
                    );
                    if (teamMatch) {
                      if (teamMatch.winner && teamMatch.winner.teamId !== state.teamId) {
                        result = name;
                      } else if (teamMatch.winner && teamMatch.winner.teamId === state.teamId) {
                        continue;
                      }
                      break;
                    }
                  }
                }

                // Swiss phase elimination
                if (!result) {
                  const q = compState.qualification;
                  if (q?.eliminated?.some(t => t.teamId === state.teamId)) {
                    const standing = compState.standings?.find(s => s.teamId === state.teamId);
                    const pos = standing ? compState.standings.indexOf(standing) + 1 : null;
                    result = pos ? t('seasonEnd.leaguePhasePos', { pos }) : t('seasonEnd.leaguePhase');
                  }
                }

                // Fallback
                if (!result) {
                  const standing = compState.standings?.find(s => s.teamId === state.teamId);
                  if (standing) {
                    const pos = compState.standings
                      .sort((a, b) => (b.points - a.points) || (b.goalDifference - a.goalDifference))
                      .findIndex(s => s.teamId === state.teamId) + 1;
                    if (compState.phase === 'league' || compState.currentMatchday < 8) {
                      result = t('seasonEnd.leaguePhasePosMatchday', { pos, matchday: compState.currentMatchday || 0 });
                    } else {
                      result = t('seasonEnd.posInLeaguePhase', { pos });
                    }
                  } else {
                    result = t('seasonEnd.participantLabel');
                  }
                }
              }

              return (
                <div className={`competition-result ${isChampion ? 'competition-result--champion' : ''}`}>
                  <Globe size={24} className="result-icon" />
                  <div className="result-info">
                    <h3>{icon} {compName}</h3>
                    <p>{isChampion ? t('seasonEnd.cupChampion') : result}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Clasificación Europea (próxima temporada) */}
          {competitionName && (
            <div className="european-qualification">
              <Star size={24} className="star-icon" />
              <div className="qualification-info">
                <h3>{t('seasonEnd.qualifiedForComp', { competition: competitionName })}</h3>
                <p>{t('seasonEnd.qualificationBonusLabel')}: <strong>{formatMoney(europeanBonus)}</strong></p>
              </div>
            </div>
          )}
          
          {/* Premios económicos de competición europea */}
          {state.europeanCompetitions?.competitions && (() => {
            let totalEuropeanPrize = 0;
            let euroCompName = null;
            for (const [cId, cState] of Object.entries(state.europeanCompetitions.competitions)) {
              if (!cState) continue;
              const prize = cState.prizesMoney?.[state.teamId] || 0;
              if (prize > 0) {
                totalEuropeanPrize += prize;
                euroCompName = cState.config?.shortName || cId;
              }
            }
            if (totalEuropeanPrize > 0) {
              return (
                <div className="european-qualification" style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
                  <Globe size={24} className="star-icon" style={{ color: '#66bb6a' }} />
                  <div className="qualification-info">
                    <h3>{t('seasonEnd.prizesComp', { comp: euroCompName })}</h3>
                    <p>{t('seasonEnd.europeanCompIncome')}: <strong>{formatMoney(totalEuropeanPrize)}</strong></p>
                    <p style={{ fontSize: '0.8em', opacity: 0.7, marginTop: 4 }}>{t('seasonEnd.alreadyCollected')}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Premios económicos de competición sudamericana */}
          {state.saCompetitions?.competitions && (() => {
            let totalSAPrize = 0;
            let saCompName = null;
            for (const [cId, cState] of Object.entries(state.saCompetitions.competitions)) {
              if (!cState) continue;
              const prize = cState.prizesMoney?.[state.teamId] || 0;
              if (prize > 0) {
                totalSAPrize += prize;
                saCompName = cState.config?.shortName || cId;
              }
            }
            if (totalSAPrize > 0) {
              return (
                <div className="european-qualification" style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
                  <Globe size={24} className="star-icon" style={{ color: '#66bb6a' }} />
                  <div className="qualification-info">
                    <h3>{t('seasonEnd.prizesComp', { comp: saCompName })}</h3>
                    <p>{t('seasonEnd.saCompIncome')}: <strong>{formatMoney(totalSAPrize)}</strong></p>
                    <p style={{ fontSize: '0.8em', opacity: 0.7, marginTop: 4 }}>{t('seasonEnd.alreadyCollected')}</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Resultado Final Apertura vs Clausura */}
          {(apclFinalResult || resolvedAPCLFinal) && (() => {
            const finalData = apclFinalResult || resolvedAPCLFinal;
            const playerWon = finalData.winner === state.teamId;
            const winReasonText = finalData.winReason === 'aggregate' ? t('seasonEnd.byGlobalResult')
              : finalData.winReason === 'awayGoals' ? t('seasonEnd.byAwayGoalsResult')
              : finalData.winReason === 'clausuraAdvantage' ? t('seasonEnd.bySportingAdvantage')
              : finalData.winReason === 'sameChampion' ? t('seasonEnd.bothTournamentsChampion') : '';

            return (
              <div className={`competition-result ${playerWon ? 'competition-result--champion' : ''}`}>
                <Trophy size={24} className="result-icon" />
                <div className="result-info">
                  <h3>🏆 {t('seasonEnd.apclFinalLabel', { league: LEAGUE_CONFIG[playerLeagueId]?.name || t('seasonEnd.league') })}</h3>
                  {finalData.hadFinal ? (
                    <>
                      <p>
                        {finalData.aperturaChampionName} <small>({t('seasonEnd.apertura')})</small> vs {finalData.clausuraChampionName} <small>({t('seasonEnd.clausura')})</small>
                      </p>
                      <p>
                        {t('seasonEnd.legScore', { home1: finalData.leg1?.homeScore, away1: finalData.leg1?.awayScore, home2: finalData.leg2?.homeScore, away2: finalData.leg2?.awayScore })}
                      </p>
                      <p>
                        <strong>{t('seasonEnd.championColon', { name: finalData.winnerName })}</strong> {winReasonText}
                      </p>
                    </>
                  ) : (
                    <p>{t('seasonEnd.winsAperturaAndClausura', { name: finalData.winnerName })}</p>
                  )}
                  {playerWon && <p>{t('seasonEnd.yourTeamIsChampion')}</p>}
                </div>
              </div>
            );
          })()}

          {/* Ascenso por playoff */}
          {playerWonPlayoff && (
            <div className="european-qualification promotion-celebration">
              <Trophy size={24} className="star-icon" />
              <div className="qualification-info">
                <h3><Sparkles size={16} /> {t('seasonEnd.playoffPromotionTitle')}</h3>
                <p>{t('seasonEnd.teamPlaysInLeague', { team: state.team?.name })}</p>
              </div>
            </div>
          )}
          
          {/* Resultados del playoff de Segunda (solo si el jugador está en Segunda pero no en el playoff) */}
          {playoffBracket && playoffBracket.phase === 'completed' && !playerInPlayoff && playerLeagueId === 'segunda' && (
            <div className="playoff-summary-box">
              <h3><Trophy size={14} /> {t('seasonEnd.playoffDeAscensoSegunda')}</h3>
              <div className="playoff-summary-results">
                {playoffBracket.semifinals.map((semi, idx) => (
                  <p key={idx}>{getPlayoffMatchSummary(semi)}</p>
                ))}
                <p className="final-result"><strong>{getPlayoffMatchSummary(playoffBracket.final)}</strong></p>
                <p className="playoff-winner">{t('seasonEnd.promoted')}: <strong>{playoffBracket.final.result?.winnerName}</strong></p>
              </div>
            </div>
          )}
          
          {/* Descenso */}
          {seasonResult.relegation && (
            <div className="relegation-warning">
              <TrendingDown size={24} />
              <div>
                <h3>{t('seasonEnd.relegationTitle')}</h3>
                <p>{t('seasonEnd.relegationDesc')}</p>
              </div>
            </div>
          )}
          
          {/* Objetivos */}
          <div className="objectives-summary">
            <h3><Target size={18} /> {t('seasonEnd.seasonObjectivesTitle')}</h3>
            
            <div className="objectives-list">
              {objectiveRewards.objectiveResults.map((obj, idx) => (
                <div key={idx} className={`objective-item objective-item--${obj.status}`}>
                  {obj.status === 'completed' ? (
                    <CheckCircle2 size={18} className="icon-completed" />
                  ) : (
                    <XCircle size={18} className="icon-failed" />
                  )}
                  <span className="name">{obj.nameKey ? t(obj.nameKey) : obj.name}</span>
                  <span className={`amount ${obj.status === 'completed' ? 'positive' : 'negative'}`}>
                    {obj.status === 'completed' ? '+' : ''}{formatMoney(obj.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="objectives-total">
              <span>{t('seasonEnd.objectiveBalanceLabel')}</span>
              <span className={objectiveRewards.netResult >= 0 ? 'positive' : 'negative'}>
                {objectiveRewards.netResult >= 0 ? '+' : ''}{formatMoney(objectiveRewards.netResult)}
              </span>
            </div>
          </div>
          
          {/* Total */}
          <div className="season-total">
            <div className="total-row">
              <span>{t('seasonEnd.objectivesFinance')}</span>
              <span className={objectiveRewards.netResult >= 0 ? 'positive' : 'negative'}>
                {objectiveRewards.netResult >= 0 ? '+' : ''}{formatMoney(objectiveRewards.netResult)}
              </span>
            </div>
            {europeanBonus > 0 && (
              <div className="total-row">
                <span>{t('seasonEnd.europeanBonusLabel')}</span>
                <span className="positive">+{formatMoney(europeanBonus)}</span>
              </div>
            )}
            {(state.stadium?.accumulatedTicketIncome ?? 0) > 0 && (
              <div className="total-row">
                <span><Ticket size={12} /> {t('seasonEnd.ticketAccumulated')}</span>
                <span className="positive">+{formatMoney(state.stadium?.accumulatedTicketIncome ?? 0)}</span>
              </div>
            )}
            <div className="total-row">
              <span>{t('seasonEnd.wageBill')}</span>
              <span className="negative">-{formatMoney(totalSalaryCost)}</span>
            </div>
            <div className="total-row total-row--final">
              <span>{t('seasonEnd.finalBalance')}</span>
              <span className={(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost) >= 0 ? 'positive' : 'negative'}>
                {(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost) >= 0 ? '+' : ''}
                {formatMoney(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost)}
              </span>
            </div>
          </div>
          
          <button className="btn-continue" onClick={() => setPhase('preseason')}>
            {t('seasonEnd.continueToPreseason')}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }
  
  // Fase 2: Selección de pretemporada
  return (
    <div className="season-end">
      <div className="season-end__modal season-end__modal--preseason">
        <div className="modal-header">
          <Calendar size={32} className="header-icon" />
          <div>
            <h1>{t('seasonEnd.preseasonTitle', { season: state.currentSeason + 1 })}</h1>
            <p>{t('seasonEnd.choosePlan')}</p>
          </div>
        </div>
        
        <p className="preseason-intro">
          {t('seasonEnd.preseasonIntro')}
        </p>
        
        <div className="preseason-options">
          {preseasonOptions.map(option => (
            <div 
              key={option.id}
              className={`preseason-card ${selectedPreseason?.id === option.id ? 'selected' : ''}`}
              onClick={() => handleSelectPreseason(option)}
            >
              <div className="card-header">
                {option.id === 'prestige' && <Plane size={24} />}
                {option.id === 'balanced' && <Swords size={24} />}
                {option.id === 'regional' && <Home size={24} />}
                <h3>{option.name}</h3>
              </div>
              
              <p className="card-description">{option.description}</p>
              
              <div className="card-details">
                <span className={`difficulty difficulty--${option.difficulty}`}>
                  {t('seasonEnd.difficultyLabel')}: {option.difficulty === 'high' ? t('seasonEnd.difficultyHigh') : option.difficulty === 'medium' ? t('seasonEnd.difficultyMedium') : t('seasonEnd.difficultyLow')}
                </span>
                <span className="earnings">
                  {t('seasonEnd.potentialEarnings')}: {option.potentialEarnings}
                </span>
              </div>
              
              <div className="matches-preview">
                <h4>{t('seasonEnd.rivalsLabel')}</h4>
                <ul>
                  {option.matches.map((match, idx) => (
                    <li key={idx}>
                      <span className="match-location">
                        {match.isHome ? <Home size={14} /> : <Plane size={14} />}
                      </span>
                      <span className="opponent-name">{match.opponent.name}</span>
                      <span className="opponent-ovr">{match.opponent.reputation} OVR</span>
                      {match.isPresentationMatch && (
                        <span className="presentation-badge">
                          <Sparkles size={12} /> {t('seasonEnd.presentationBadge')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
            </div>
          ))}
        </div>
        
        <div className="preseason-actions">
          <button 
            className="btn-back" 
            onClick={() => setPhase('summary')}
          >
            {t('seasonEnd.backBtn')}
          </button>
          <button 
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedPreseason}
          >
            {t('seasonEnd.startPreseason')}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
