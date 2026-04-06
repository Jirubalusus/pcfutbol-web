import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame, ensureFullLineup } from '../../context/GameContext';
import { useAds } from '../../hooks/useAds';
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
  getBoliviaTeams, getVenezuelaTeams, getSegundaRfefGroups
} from '../../data/teamsFirestore';
import { simulateWeekMatches, simulateMatch, updateTable } from '../../game/leagueEngine';
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance, calculateServicesIncome, STADIUM_SERVICES } from '../../game/stadiumEconomy';

// Combine all teams for lookup - usando getters para obtener data actualizada
// Each team gets leagueId assigned (Firestore has 'league' field, game state uses 'leagueId')
const LEAGUE_GETTERS = [
  { id: 'laliga', fn: getLaLigaTeams }, { id: 'laliga2', fn: getSegundaTeams },
  { id: 'primeraRFEF', fn: getPrimeraRfefTeams }, { id: 'segundaRFEF', fn: getSegundaRfefTeams },
  { id: 'premier', fn: getPremierTeams }, { id: 'ligue1', fn: getLigue1Teams },
  { id: 'bundesliga', fn: getBundesligaTeams }, { id: 'seriea', fn: getSerieATeams },
  { id: 'eredivisie', fn: getEredivisieTeams }, { id: 'primeiraLiga', fn: getPrimeiraLigaTeams },
  { id: 'championship', fn: getChampionshipTeams }, { id: 'belgianPro', fn: getBelgianProTeams },
  { id: 'superLig', fn: getSuperLigTeams }, { id: 'scottishPrem', fn: getScottishPremTeams },
  { id: 'serieB', fn: getSerieBTeams }, { id: 'bundesliga2', fn: getBundesliga2Teams },
  { id: 'ligue2', fn: getLigue2Teams }, { id: 'swissSuperLeague', fn: getSwissTeams },
  { id: 'austrianBundesliga', fn: getAustrianTeams }, { id: 'greekSuperLeague', fn: getGreekTeams },
  { id: 'danishSuperliga', fn: getDanishTeams }, { id: 'croatianLeague', fn: getCroatianTeams },
  { id: 'czechLeague', fn: getCzechTeams },
  { id: 'argentinaPrimera', fn: getArgentinaTeams }, { id: 'brasileiraoA', fn: getBrasileiraoTeams },
  { id: 'colombiaPrimera', fn: getColombiaTeams }, { id: 'chilePrimera', fn: getChileTeams },
  { id: 'uruguayPrimera', fn: getUruguayTeams }, { id: 'ecuadorLigaPro', fn: getEcuadorTeams },
  { id: 'paraguayPrimera', fn: getParaguayTeams }, { id: 'peruLiga1', fn: getPeruTeams },
  { id: 'boliviaPrimera', fn: getBoliviaTeams }, { id: 'venezuelaPrimera', fn: getVenezuelaTeams },
];

const getAllTeams = () => {
  const result = [];
  for (const { id, fn } of LEAGUE_GETTERS) {
    const teams = fn();
    for (const t of teams) {
      result.push({ ...t, leagueId: t.leagueId || t.league || id });
    }
  }
  return result;
};
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
import GlorySeasonEnd from '../GloryMode/GlorySeasonEnd';
import GloryPerks from '../GloryMode/GloryPerks';
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
  CalendarDays,
  Shield,
  Star,
  Award,
  MessageSquare,
  BarChart3,
  Gauge
} from 'lucide-react';
import SimulationSummary from '../SimulationSummary/SimulationSummary';
import RankedTimer from '../Ranked/RankedTimer';
import { submitRoundConfig, advancePhase as advanceRankedPhase, onMatchChange } from '../../firebase/rankedService';
import { useAuth } from '../../context/AuthContext';
import { WelcomeModal, TutorialModal, useTutorial } from '../Tutorial/Tutorial';
import TeamCrest from '../TeamCrest/TeamCrest';
import LoadingIndicator from '../common/LoadingIndicator';
import './Office.scss';

export default function Office() {
  const { t } = useTranslation();
  const { state, dispatch, saveGame } = useGame();
  const { maybeShowInterstitial } = useAds(state.premium);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMatch, setShowMatch] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showInjuredWarning, setShowInjuredWarning] = useState(false);
  const [injuredInLineup, setInjuredInLineup] = useState([]);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [showGlorySeasonEnd, setShowGlorySeasonEnd] = useState(false);
  const [gloryFinalPosition, setGloryFinalPosition] = useState(1);
  const [noPlayersWarned, setNoPlayersWarned] = useState(false);
  const [showNoPlayersWarning, setShowNoPlayersWarning] = useState(false);
  const [simProgress, setSimProgress] = useState(null); // { current, total, week }
  const [simSummaryData, setSimSummaryData] = useState(null);
  const snapshotRef = useRef(null); // stores pre-simulation snapshot
  const stateRef = useRef(state); // keeps fresh state for async callbacks (#7, #9-10)
  stateRef.current = state;
  
  // Tutorial system
  const officeTutorial = useTutorial('office');
  
  // Watch for pending tab navigation (from notifications / messages deep-link)
  useEffect(() => {
    if (state.pendingTab) {
      setActiveTab(state.pendingTab);
      dispatch({ type: 'CLEAR_PENDING_TAB' });
    }
  }, [state.pendingTab]);

  // NOTE: Not reactive to window resizes, but fine — only affects initial layout. (#23)
  const isMobile = window.innerWidth <= 768;
  const isRanked = state.gameMode === 'ranked' && !!state.rankedMatchId;
  
  // Memoize getAllTeams to avoid recalculating on every render
  const allTeamsMemo = useMemo(() => getAllTeams(), [state.leagueTeams]);
  const [rankedSubmitted, setRankedSubmitted] = useState(false);
  
  // Regenerate leagueTeams if missing (e.g. loaded from save without them)
  useEffect(() => {
    if (state.gameStarted && (!state.leagueTeams || state.leagueTeams.length === 0)) {
      const teams = getAllTeams();
      // Glory mode: ensure glory_team is in the pool (it's not in Firestore)
      // Also inject group rivals from leagueTable so transfers work
      if (state.gameMode === 'glory') {
        if (state.team && !teams.some(t => t.id === state.teamId)) {
          teams.push({ ...state.team, leagueId: state.playerLeagueId || 'segundaRFEF' });
        }
        // Add group rivals that may not be in the flat Firestore list
        const groupTeamIds = new Set((state.leagueTable || []).map(e => e.teamId));
        const existingIds = new Set(teams.map(t => t.id));
        // Find group rivals from Segunda RFEF groups
        try {
          const groups = getSegundaRfefGroups();
          const groupId = state.playerGroupId;
          if (groupId && groups[groupId]?.teams) {
            for (const t of groups[groupId].teams) {
              if (!existingIds.has(t.id)) {
                teams.push({ ...t, leagueId: 'segundaRFEF' });
                existingIds.add(t.id);
              }
            }
          }
        } catch (e) { /* skip */ }
      }
      dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: teams });
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
      import('sileo').then(({ sileo: s }) => s.error({ title: e.message }));
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
  
  // Build simulation summary when batch sim completes (3+ weeks only, NOT single advance)
  useEffect(() => {
    if (snapshotRef.current && !simulating && !isRanked) {
      const snap = snapshotRef.current;
      snapshotRef.current = null;
      // Only show summary for batch sims (3+ weeks), not single advance
      const isBatch = snap.weekRange && (snap.weekRange.to - snap.weekRange.from) >= 3;
      if (!isBatch) return;
      try {
        const summary = buildSummaryData(snap, state, { simWeek: state.currentWeek - 1, weekRange: snap.weekRange });
        if (summary.playerMatch || summary.batchPlayerResults || summary.newInjuries.length || summary.recovered.length || summary.leagueResults.length) {
          setSimSummaryData(summary);
        }
      } catch (err) {
        console.error('Error building simulation summary:', err);
      }
    }
  }, [state.currentWeek, simulating]);

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

  // Snapshot state before simulation for comparison
  const takeSnapshot = () => ({
    players: (state.team?.players || []).map(p => ({ name: p.name, injured: p.injured, injuryWeeksLeft: p.injuryWeeksLeft || 0 })),
    standing: state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1,
  });

  // Build summary data by comparing before/after snapshots
  // NOTE: snapshot.lineup may be stale if lineup changed mid-sim. Minor — only affects summary display. (#22)
  const buildSummaryData = (snapshot, afterState, extras = {}) => {
    const afterPlayers = afterState.team?.players || [];
    const afterStanding = afterState.leagueTable.findIndex(t => t.teamId === afterState.teamId) + 1;

    // New injuries: players who weren't injured before but are now
    const prevInjuredSet = new Set(snapshot.players.filter(p => p.injured).map(p => p.name));
    const newInjuries = afterPlayers
      .filter(p => p.injured && p.injuryWeeksLeft > 0 && !prevInjuredSet.has(p.name))
      .map(p => ({ name: p.name, weeksOut: p.injuryWeeksLeft }));

    // Recovered: players who were injured before but aren't now
    const recovered = snapshot.players
      .filter(p => p.injured && p.injuryWeeksLeft > 0)
      .map(p => p.name)
      .filter(name => {
        const after = afterPlayers.find(ap => ap.name === name);
        return after && !after.injured;
      });

    // League results — if weekRange exists (batch sim), gather ALL weeks; otherwise just last week
    const weekFrom = extras.weekRange?.from;
    const weekTo = extras.weekRange?.to;
    const isBatchSim = weekFrom != null && weekTo != null && (weekTo - weekFrom) > 1;
    
    const simmedFixtures = (afterState.fixtures || []).filter(f => {
      if (!f.played) return false;
      if (isBatchSim) return f.week >= weekFrom && f.week < weekTo;
      return f.week === (extras.simWeek || afterState.currentWeek - 1);
    });

    // For batch: show last 5 other results from the LAST week only
    const lastWeekFixtures = isBatchSim
      ? simmedFixtures.filter(f => f.week === weekTo - 1)
      : simmedFixtures;
    const otherResults = lastWeekFixtures
      .filter(f => f.homeTeam !== afterState.teamId && f.awayTeam !== afterState.teamId)
      .slice(0, 5)
      .map(f => {
        const homeName = afterState.leagueTable.find(t => t.teamId === f.homeTeam)?.teamName || f.homeTeam;
        const awayName = afterState.leagueTable.find(t => t.teamId === f.awayTeam)?.teamName || f.awayTeam;
        return { homeTeam: homeName, awayTeam: awayName, homeTeamId: f.homeTeam, awayTeamId: f.awayTeam, homeScore: f.homeScore, awayScore: f.awayScore };
      });

    // Player matches — for batch sim, collect ALL player results
    const playerFixtures = simmedFixtures.filter(f =>
      f.homeTeam === afterState.teamId || f.awayTeam === afterState.teamId
    );
    const playerFixture = playerFixtures.length > 0 ? playerFixtures[playerFixtures.length - 1] : null;
    
    // Build batch player results summary (W/D/L + GF/GA)
    let batchPlayerResults = null;
    if (isBatchSim && playerFixtures.length > 1) {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      const matchResults = [];
      playerFixtures.forEach(f => {
        const isHome = f.homeTeam === afterState.teamId;
        const gf = isHome ? f.homeScore : f.awayScore;
        const ga = isHome ? f.awayScore : f.homeScore;
        goalsFor += gf; goalsAgainst += ga;
        if (gf > ga) wins++; else if (gf < ga) losses++; else draws++;
        const oppId = isHome ? f.awayTeam : f.homeTeam;
        const oppName = afterState.leagueTable.find(t => t.teamId === oppId)?.teamName || oppId;
        matchResults.push({ opponent: oppName, gf, ga, week: f.week });
      });
      batchPlayerResults = { wins, draws, losses, goalsFor, goalsAgainst, total: playerFixtures.length, matches: matchResults };
    }
    let playerMatch = extras.playerMatch || null;
    if (!playerMatch && playerFixture) {
      const isHome = playerFixture.homeTeam === afterState.teamId;
      const homeName = afterState.leagueTable.find(t => t.teamId === playerFixture.homeTeam)?.teamName || playerFixture.homeTeam;
      const awayName = afterState.leagueTable.find(t => t.teamId === playerFixture.awayTeam)?.teamName || playerFixture.awayTeam;
      playerMatch = {
        homeTeam: homeName, awayTeam: awayName,
        homeScore: playerFixture.homeScore, awayScore: playerFixture.awayScore,
        isHome, events: playerFixture.events || []
      };
    }

    // Cards from ALL player match events (batch or single)
    // Track counts per player + suspension info
    const yellowMap = {}; // { name: { count, suspended, missesWeek } }
    const redMap = {};    // { name: { count, missesWeek } }
    const fixturesToScan = isBatchSim ? playerFixtures : (playerFixture ? [playerFixture] : []);
    fixturesToScan.forEach(f => {
      const playerSide = f.homeTeam === afterState.teamId ? 'home' : 'away';
      (f.events || []).forEach(e => {
        if (e.team !== playerSide) return;
        const playerName = typeof e.player === 'string' ? e.player : (e.player?.name || e.playerName || '?');
        if (e.type === 'yellowCard' || e.type === 'yellow_card') {
          if (!yellowMap[playerName]) yellowMap[playerName] = { count: 0, suspended: false, missesWeek: null };
          yellowMap[playerName].count++;
        }
        if (e.type === 'redCard' || e.type === 'red_card') {
          if (!redMap[playerName]) redMap[playerName] = { count: 0, missesWeek: null };
          redMap[playerName].count++;
        }
      });
    });
    // Check suspensions: player who accumulated yellows or got red
    const currentWeek = afterState.currentWeek || 1;
    afterPlayers.forEach(p => {
      if (p.suspended) {
        const missesWeek = p.suspensionMatchesLeft === 1 ? currentWeek : currentWeek;
        const alreadyPlayed = afterState.fixtures?.some(f => f.week === currentWeek && f.played);
        if (yellowMap[p.name]) {
          yellowMap[p.name].suspended = true;
          yellowMap[p.name].missesWeek = missesWeek;
          yellowMap[p.name].alreadyPlayed = alreadyPlayed;
        }
        if (redMap[p.name]) {
          redMap[p.name].missesWeek = missesWeek;
          redMap[p.name].alreadyPlayed = alreadyPlayed;
        }
        // If suspended but not in our card maps (accumulated from before), add to yellow
        if (!yellowMap[p.name] && !redMap[p.name] && p.suspensionType === 'yellow') {
          yellowMap[p.name] = { count: 0, suspended: true, missesWeek, alreadyPlayed };
        }
      }
    });
    const cards = {
      yellow: Object.entries(yellowMap).map(([name, info]) => ({ name, ...info })),
      red: Object.entries(redMap).map(([name, info]) => ({ name, ...info })),
    };

    return {
      playerMatch,
      batchPlayerResults,
      leagueResults: otherResults,
      cupResult: extras.cupResult || null,
      europeanResult: extras.europeanResult || null,
      newInjuries,
      recovered,
      cards,
      standingBefore: snapshot.standing,
      standingAfter: afterStanding,
      weekRange: extras.weekRange || null,
    };
  };

  const handleAdvanceWeek = () => {
    console.log('🔄 handleAdvanceWeek called', { 
      preseasonPhase: state.preseasonPhase, 
      currentWeek: state.currentWeek,
      fixturesLength: state.fixtures?.length,
      teamId: state.teamId,
      gameMode: state.gameMode,
      seasonOver,
      leagueIsOver,
      fixturesAtWeek: (state.fixtures || []).filter(f => f.week === state.currentWeek).length,
      unplayedAtWeek: (state.fixtures || []).filter(f => f.week === state.currentWeek && !f.played).length,
      playerMatchAtWeek: (state.fixtures || []).filter(f => f.week === state.currentWeek && !f.played && (f.homeTeam === state.teamId || f.awayTeam === state.teamId)).length,
      firstFixtureWeek: state.fixtures?.length > 0 ? Math.min(...state.fixtures.map(f => f.week)) : 'N/A',
      preseasonWeek: state.preseasonWeek,
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
      // Safety: don't trigger season end if no fixtures have been played
      const anyPlayed = (state.fixtures || []).some(f => f.played);
      if (!anyPlayed) {
        console.warn('⚠️ seasonOver=true but no fixtures played — skipping season end');
      } else {
        // Capture final league position for glory mode before SeasonEnd resets table
        if (state.gameMode === 'glory') {
          const pos = (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || 1;
          setGloryFinalPosition(pos > 0 ? pos : 1);
        }
        setShowSeasonEnd(true);
        return;
      }
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
      const anyPlayed = (state.fixtures || []).some(f => f.played);
      if (anyPlayed) {
        setShowSeasonEnd(true);
        return;
      }
      console.warn('⚠️ proceedAdvanceWeek: seasonOver but no fixtures played, continuing...');
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
    
    
    // Helper: check if player's team is involved in a pending match
    const isPlayerInMatch = (pm) => {
      if (!pm) return false;
      const ids = [pm.homeTeamId, pm.awayTeamId, pm.homeTeam?.teamId, pm.awayTeam?.teamId, pm.team1?.teamId, pm.team2?.teamId];
      return ids.includes(state.teamId);
    };

    if (state.pendingCupMatch && isPlayerInMatch(state.pendingCupMatch)) {
      // Cup match takes priority (only if player is involved)
      setShowMatch(true);
    } else if (state.pendingEuropeanMatch && isPlayerInMatch(state.pendingEuropeanMatch)) {
      // European match takes priority (only if player is involved)
      setShowMatch(true);
    } else if (state.pendingSAMatch && isPlayerInMatch(state.pendingSAMatch)) {
      // SA match takes priority (only if player is involved)
      setShowMatch(true);
    } else if (state.pendingCupMatch || state.pendingEuropeanMatch || state.pendingSAMatch) {
      // Pending match exists but player NOT involved — auto-resolve via ADVANCE_WEEK
      snapshotRef.current = takeSnapshot();
      dispatch({ type: 'ADVANCE_WEEK' });
    } else if (playerMatch) {
      setShowMatch(true);
    } else {
      snapshotRef.current = takeSnapshot();
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
      
      // Capture snapshot before ADVANCE_WEEK for summary modal
      snapshotRef.current = takeSnapshot();
      
      if (completedMatchType === 'league') {
        // League match done — MatchDay already simulated other matches and dispatched
        // SET_FIXTURES + SET_LEAGUE_TABLE. Don't re-simulate (stale state would overwrite).
        dispatch({ type: 'ADVANCE_WEEK' });
      } else {
        // Cup or European match done — check if there's still a league match this week
        // Use stateRef to get fresh state after dispatches from MatchDay (#9-10)
        const freshState = stateRef.current;
        const weekFixtures = freshState.fixtures.filter(f => f.week === freshState.currentWeek && !f.played);
        const leagueMatch = weekFixtures.find(f => 
          f.homeTeam === freshState.teamId || f.awayTeam === freshState.teamId
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
    
    // Capture pre-simulation snapshot for summary
    const preSimSnapshot = takeSnapshot();
    preSimSnapshot.weekRange = { from: state.currentWeek, to: state.currentWeek + numWeeks };
    
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
    
    // Track local lineup so injured/suspended players are ejected for subsequent weeks
    let localLineup = state.lineup ? { ...state.lineup } : {};
    
    // Medical reduction (mirrors INJURE_PLAYER reducer logic)
    const medicalLevel = state.facilities?.medical || 0;
    const medicalReduction = [0, 0.20, 0.35, 0.50][medicalLevel];
    const recoverySpecBonus = state.facilitySpecs?.medical === 'recovery' ? 0.50 : 0;
    const totalMedicalReduction = Math.min(0.75, medicalReduction + recoverySpecBonus);
    
    // Track accumulated ticket income locally to avoid stale state overwrites
    let localAccumulatedIncome = state.stadium?.accumulatedTicketIncome ?? 0;
    let localAccumulatedServicesIncome = state.stadium?.accumulatedServicesIncome ?? 0;
    let localServicesBreakdown = { ...(state.stadium?.accumulatedServicesBreakdown || { catering: 0, merchandise: 0, parking: 0, events: 0, vip: 0 }) };
    let localGoalBonusMoney = 0;
    
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
      if (currentWeek > maxWeek || isSeasonOver(currentFixtures, playerLeagueId) || stateRef.current.pendingAperturaClausuraFinal) {
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
              homeLineup: isHome ? (localLineup || null) : null,
              awayLineup: isHome ? null : (localLineup || null),
              attendanceFillRate: isHome ? attendanceFillRate : 0.7,
              grassCondition: state.stadium?.grassCondition ?? 100,
              medicalPrevention: state.facilitySpecs?.medical === 'prevention' ? 0.30 : 0,
              playerIsHome: isHome
            },
            state.playerForm || {},
            state.teamId
          );

          const playerGoalsScored = isHome ? result.homeScore : result.awayScore;
          if (state.gloryData?.perks?.goalBonus && playerGoalsScored > 0) {
            localGoalBonusMoney += playerGoalsScored * 50000;
          }
          
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
            const svcIncome = calculateServicesIncome(stadium.services, att.attendance, true);
            // Track per-service breakdown
            if (stadium.services) {
              for (const [sKey, sCfg] of Object.entries(STADIUM_SERVICES)) {
                const sLvl = stadium.services[sKey] || 0;
                if (sLvl <= 0) continue;
                const ld = sCfg.levels[sLvl];
                if (!ld) continue;
                if (sCfg.type === 'perSpectator') localServicesBreakdown[sKey] = (localServicesBreakdown[sKey] || 0) + Math.round(ld.rate * att.attendance);
                else if (sCfg.type === 'perWeek') localServicesBreakdown[sKey] = (localServicesBreakdown[sKey] || 0) + ld.rate;
                else if (sCfg.type === 'perMatch') localServicesBreakdown[sKey] = (localServicesBreakdown[sKey] || 0) + ld.rate;
              }
            }
            const totalIncome = tktIncome + concIncome;
            
            // Acumular ingresos localmente (evita stale state overwrites)
            localAccumulatedIncome += totalIncome;
            // Services income tracked separately (paid at end of season)
            localAccumulatedServicesIncome += svcIncome;
          } else if (state.stadium?.services) {
            // Away week: still collect events income (fixed weekly)
            const eventsLevel = state.stadium.services.events || 0;
            const eventsRates = [0, 10000, 25000, 50000];
            const awayEventsIncome = eventsRates[eventsLevel] || 0;
            localAccumulatedServicesIncome += awayEventsIncome;
            if (awayEventsIncome > 0) localServicesBreakdown.events = (localServicesBreakdown.events || 0) + awayEventsIncome;
          }
          
          // Aplicar lesiones del equipo del jugador
          const playerTeamSide = isHome ? 'home' : 'away';
          const playerInjuries = result.events?.filter(e => 
            e.type === 'injury' && e.team === playerTeamSide
          ) || [];
          
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
              // Apply medical reduction to match INJURE_PLAYER reducer
              const reducedWeeksLocal = Math.max(1, Math.round(injury.weeksOut * (1 - totalMedicalReduction)));
              localTeamPlayers = localTeamPlayers.map(p =>
                p.name === injury.player
                  ? { ...p, injured: true, injuryWeeksLeft: reducedWeeksLocal, injuredThisWeek: true }
                  : p
              );
              // Eject injured player from local lineup
              Object.keys(localLineup).forEach(slot => {
                if (localLineup[slot]?.name === injury.player) {
                  delete localLineup[slot];
                }
              });
            });
            // Auto-fill empty lineup slots after injury ejections
            localLineup = ensureFullLineup(localLineup, localTeamPlayers, state.formation);
          }
          
          // ── CARDS & SUSPENSIONS (batch simulation) ──
          // 1. Serve existing suspensions (decrement before this match)
          dispatch({ type: 'SERVE_SUSPENSIONS' });
          localTeamPlayers = localTeamPlayers.map(p => {
            if (!p.suspended || !p.suspensionMatches) return p;
            const remaining = p.suspensionMatches - 1;
            if (remaining <= 0) {
              return { ...p, suspended: false, suspensionType: null, suspensionMatches: 0 };
            }
            return { ...p, suspensionMatches: remaining };
          });

          // 2. Process yellow cards
          const _gpn = (p) => typeof p === 'object' ? (p?.name || 'Unknown') : (p || 'Unknown');
          const playerYellowCards = (result.events || []).filter(
            e => e.type === 'yellow_card' && e.team === playerTeamSide
          );
          if (playerYellowCards.length > 0) {
            dispatch({
              type: 'ADD_YELLOW_CARDS',
              payload: { cards: playerYellowCards.map(e => ({ playerName: _gpn(e.player) })) }
            });
            // Track locally
            playerYellowCards.forEach(e => {
              const name = _gpn(e.player);
              localTeamPlayers = localTeamPlayers.map(p => {
                if (p.name !== name) return p;
                const newYellows = (p.yellowCards || 0) + 1;
                if (newYellows >= 5) {
                  // Eject suspended player from local lineup
                  Object.keys(localLineup).forEach(slot => {
                    if (localLineup[slot]?.name === name) delete localLineup[slot];
                  });
                  return { ...p, yellowCards: 0, suspended: true, suspensionType: 'yellow', suspensionMatches: 1 };
                }
                return { ...p, yellowCards: newYellows };
              });
            });
          }

          // 3. Process red cards
          const playerRedCards = (result.events || []).filter(
            e => e.type === 'red_card' && e.team === playerTeamSide
          );
          if (playerRedCards.length > 0) {
            dispatch({
              type: 'ADD_RED_CARDS',
              payload: { cards: playerRedCards.map(e => ({ playerName: _gpn(e.player), reason: e.reason || 'Roja directa' })) }
            });
            // Track locally
            playerRedCards.forEach(e => {
              const name = _gpn(e.player);
              const isDoubleYellow = e.reason === 'Segunda amarilla';
              const matchesBanned = isDoubleYellow ? 1 : 2;
              localTeamPlayers = localTeamPlayers.map(p => {
                if (p.name !== name) return p;
                return { ...p, suspended: true, suspensionType: isDoubleYellow ? 'double_yellow' : 'red', suspensionMatches: matchesBanned };
              });
              // Eject suspended player from local lineup
              Object.keys(localLineup).forEach(slot => {
                if (localLineup[slot]?.name === name) delete localLineup[slot];
              });
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
      // Skip players injured THIS iteration (injuredThisWeek flag) — same fix as reducer
      localTeamPlayers = localTeamPlayers.map(p => {
        if (p.injured && p.injuryWeeksLeft > 0) {
          if (p.injuredThisWeek) {
            return { ...p, injuredThisWeek: false }; // Clear flag, heal next iteration
          }
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
                homeLineup: cupIsHome ? (localLineup || null) : null,
                awayLineup: cupIsHome ? null : (localLineup || null),
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
          accumulatedServicesIncome: localAccumulatedServicesIncome,
          accumulatedServicesBreakdown: localServicesBreakdown,
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
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Sync injury state from local simulation to fix double-healing
    // (ADVANCE_WEEKS_BATCH healed injuries N times, but injuries created mid-sim
    // should only be healed for weeks after they occurred — localTeamPlayers has the correct state)
    const injurySync = localTeamPlayers
      .filter(p => p.injured || p.injuryWeeksLeft > 0 || localTeamPlayers.find(lp => lp.name === p.name)?.injured !== undefined)
      .map(p => ({ name: p.name, injured: p.injured, injuryWeeksLeft: p.injuryWeeksLeft || 0, injuryType: p.injuryType || null }));
    if (injurySync.length > 0) {
      dispatch({ type: 'SYNC_BATCH_INJURIES', payload: { players: injurySync } });
    }
    
    // Sync lineup from local state (injured/suspended players were ejected locally)
    dispatch({ type: 'SET_LINEUP', payload: localLineup });

    if (localGoalBonusMoney > 0) {
      dispatch({ type: 'UPDATE_MONEY', payload: localGoalBonusMoney });
      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: {
          gloryData: {
            ...state.gloryData,
            goalBonusEarned: (state.gloryData?.goalBonusEarned || 0) + localGoalBonusMoney,
          }
        }
      });
    }
    
    // Set snapshot for summary modal (useEffect will pick it up when state updates)
    snapshotRef.current = preSimSnapshot;
    
    setSimulating(false);
    dispatch({ type: 'SET_SIMULATING', payload: false });
    setSimProgress(null);
    maybeShowInterstitial(); // Show interstitial ad after simulation (free users only)
    
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
      case 'glory_perks':
        return <GloryPerks />;
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

    const confidenceColor = state.managerConfidence > 60 ? '#2ecc71' : state.managerConfidence > 40 ? '#f39c12' : state.managerConfidence > 25 ? '#e67e22' : '#e74c3c';
    
    return (
      <div className="office__overview">
        {state.gameMode === 'promanager' && <ProManagerDashboard />}

        {/* ── Hero Card ── */}
        <div className="office__hero">
          <div className="office__hero-radial" />
          <div className="office__hero-top">
            <div className="office__hero-icon">
              <UserRound size={26} strokeWidth={1.8} />
            </div>
            <div className="office__hero-text">
              <h2>{t('office.welcomeName', { name: state.managerName || t('office.manager') })}</h2>
              <p>{t('office.seasonInfo', { season: state.currentSeason })} · {state.preseasonPhase ? t('office.preseason', { week: state.preseasonWeek, total: state.preseasonMatches?.length || 5 }) : t('office.weekInfo', { week: state.currentWeek })}</p>
            </div>
          </div>
          <div className="office__hero-stats">
            {!state.preseasonPhase && state.currentWeek > 5 && !isRanked && state.gameMode !== 'promanager' && (
              <div className="office__hero-stat">
                <Gauge size={15} />
                <span className="office__hero-stat-value" style={{ color: confidenceColor }}>{state.managerConfidence}%</span>
                <span className="office__hero-stat-label">{t('office.boardConfidence')}</span>
              </div>
            )}
            <div className="office__hero-stat">
              <Trophy size={15} />
              <span className="office__hero-stat-value">{position}º</span>
              <span className="office__hero-stat-label">{t('leagueTable.position')}</span>
            </div>
            <div className="office__hero-stat">
              <TrendingUp size={15} />
              <span className="office__hero-stat-value">{teamStats?.points || 0}</span>
              <span className="office__hero-stat-label">{t('leagueTable.points')}</span>
            </div>
            <div className="office__hero-stat">
              <Wallet size={15} />
              <span className="office__hero-stat-value">{formatMoney(state.money)}</span>
              <span className="office__hero-stat-label">{t('office.budget')}</span>
            </div>
          </div>
        </div>

        {/* ── Board Panel Card ── */}
        {!state.preseasonPhase && state.currentWeek > 5 && !isRanked && state.gameMode !== 'promanager' && (
          <div className="office__panel-card">
            <div className="office__panel-header">
              <div className="office__panel-header-icon"><Shield size={16} /></div>
              <span>Panel</span>
            </div>
            <div className="office__panel-body">
              <div className="office__panel-confidence">
                <div className="office__panel-confidence-row">
                  <span className="office__panel-confidence-label">
                    {state.managerConfidence <= 25 && <AlertTriangle size={12} />}
                    {t('office.boardConfidence')}
                  </span>
                  <span className="office__panel-confidence-value" style={{ color: confidenceColor }}>{state.managerConfidence}%</span>
                </div>
                <div className="office__panel-confidence-track">
                  <div className="office__panel-confidence-fill" style={{ width: `${state.managerConfidence}%`, background: confidenceColor }} />
                </div>
              </div>

              {state.seasonObjectives?.length > 0 && state.gameMode !== 'contrarreloj' && (() => {
                const criticalObj = state.seasonObjectives.find(o => o.priority === 'critical');
                if (!criticalObj) return null;
                return (
                  <div className="office__panel-objective">
                    <Target size={14} />
                    <span>{criticalObj.nameKey ? t(criticalObj.nameKey) : criticalObj.name}</span>
                  </div>
                );
              })()}

              {state.teamPrestige !== undefined && (
                <div className="office__panel-prestige">
                  <Star size={14} />
                  <span className="office__panel-prestige-label">{t('office.prestige') || 'Prestigio'}</span>
                  <span className="office__panel-prestige-value">{state.teamPrestige}</span>
                </div>
              )}

              <div className="office__panel-stats">
                <div className="office__panel-stat-item">
                  <div className="office__panel-stat-icon" style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}><BarChart3 size={15} /></div>
                  <div className="office__panel-stat-info">
                    <span className="office__panel-stat-val">{teamStats?.played || 0}</span>
                    <span className="office__panel-stat-lbl">{t('leagueTable.played')}</span>
                  </div>
                </div>
                <div className="office__panel-stat-item">
                  <div className="office__panel-stat-icon" style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158' }}><Award size={15} /></div>
                  <div className="office__panel-stat-info">
                    <span className="office__panel-stat-val">{teamStats?.won || 0}</span>
                    <span className="office__panel-stat-lbl">{t('leagueTable.won')}</span>
                  </div>
                </div>
                <div className="office__panel-stat-item">
                  <div className="office__panel-stat-icon" style={{ background: 'rgba(255,215,0,0.12)', color: '#ffd700' }}><Trophy size={15} /></div>
                  <div className="office__panel-stat-info">
                    <span className="office__panel-stat-val">{state.titlesWon || 0}</span>
                    <span className="office__panel-stat-lbl">{t('office.titles') || 'Títulos'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="office__grid">
          <div className="office__grid-left">
            {/* ── Next Match Card ── */}
            {nextMatch && (
              <div className="office__next-match">
                <div className="office__glass-header">
                  <CalendarDays size={16} />
                  <span>{t('office.nextMatch')}</span>
                </div>
                <div className="office__next-match-body">
                  <span className="office__match-week-badge">
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
                    <div className="vs-pill">{t('office.vs')}</div>
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
              </div>
            )}
            
            {/* ── Last Results Card ── */}
            <div className="office__form">
              <div className="office__glass-header">
                <BarChart3 size={16} />
                <span>{t('office.lastResults')}</span>
              </div>
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
            {/* ── Objectives Preview Card ── */}
            {state.seasonObjectives?.length > 0 && state.gameMode !== 'contrarreloj' && !isRanked && (
              <div className="office__objective-preview" onClick={() => setActiveTab('objectives')}>
                <div className="office__glass-header">
                  <Target size={16} />
                  <span>{t('office.mainObjective')}</span>
                </div>
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
            
            {/* ── Messages Preview Card ── */}
            {state.messages.length > 0 && !isRanked && (
              <div className="office__recent-messages" onClick={() => setActiveTab('messages')}>
                <div className="office__glass-header">
                  <MessageSquare size={16} />
                  <span>{t('office.recentMessages')}</span>
                </div>
                {state.messages.slice(0, 3).map(msg => (
                  <div key={msg.id} className="office__message-preview">
                    <span className="title">{msg.titleKey ? t(msg.titleKey, msg.titleParams) : msg.title}</span>
                    <span className="date">{msg.dateKey ? t(msg.dateKey, msg.dateParams) : msg.date}</span>
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
    return <MatchDay onComplete={handleMatchComplete} onBack={() => setShowMatch(false)} />;
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
    if (showGlorySeasonEnd) {
      return (
        <GlorySeasonEnd
          leaguePosition={gloryFinalPosition}
          onComplete={() => {
            snapshotRef.current = null;
            setSimSummaryData(null);
            setShowSeasonEnd(false);
            setShowGlorySeasonEnd(false);
          }}
        />
      );
    }
    return (
      <SeasonEnd 
        allTeams={allTeamsMemo} 
        onComplete={() => {
          if (state.gameMode === 'glory') {
            // Store final position from the season that just ended
            // (leagueTable may still have previous season data at this point)
            const pos = state.gloryData?._finalPosition || 
              (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || 1;
            setGloryFinalPosition(pos > 0 ? pos : 1);
            snapshotRef.current = null;
            setSimSummaryData(null);
            setShowGlorySeasonEnd(true);
          } else {
            setShowSeasonEnd(false);
            if (state.gameMode === 'promanager') {
              dispatch({ type: 'SET_SCREEN', payload: 'promanager_season_end' });
            }
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
            <h1><TeamCrest teamId={state.teamId} size={24} /> {state.team?.name}</h1>
            <span className="office__season">{t('office.seasonInfo', { season: state.currentSeason })} · {state.preseasonPhase ? t('office.preseason', { week: state.preseasonWeek, total: state.preseasonMatches?.length || 5 }) : t('office.weekInfo', { week: state.currentWeek })}</span>
          </div>
          
          {!isRanked && (
          <div className="office__actions">
            <div className="office__money">
              <span className="label">{t('office.budget')}</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
            
            <button 
              className={`office__advance-btn${!simulating ? ' btn-pulse' : ''}`}
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
      
      {/* Simulation Summary Modal */}
      {simSummaryData && (
        <SimulationSummary data={simSummaryData} onClose={() => setSimSummaryData(null)} />
      )}
      
      {/* Tutorial Modals */}
      {officeTutorial.showWelcome && activeTab === 'overview' && (
        <WelcomeModal
          onAccept={officeTutorial.acceptWelcome}
          onDecline={officeTutorial.declineWelcome}
        />
      )}
      {officeTutorial.shouldShow && activeTab === 'overview' && !officeTutorial.showWelcome && (
        <TutorialModal
          id="office"
          steps={[
            { selector: '.sidebar__nav, .sidebar', text: t('tutorial.officeNav') },
            { selector: '.office__advance-btn', text: t('tutorial.officeSimulate') },
            { selector: '.office__hero-stats', text: t('tutorial.officeBudget') },
          ]}
          onComplete={officeTutorial.markSeen}
          onDismissAll={officeTutorial.dismissAll}
        />
      )}

      {/* Simulation Progress Modal */}
      {simProgress && !isRanked && (
        <div className="sim-modal-overlay">
          <div className="sim-modal">
            <div className="sim-modal__icon"><LoadingIndicator size="lg" /></div>
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
