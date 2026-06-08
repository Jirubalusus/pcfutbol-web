import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import {
  evaluateSeason, updatePrestige, generateSeasonEndOffers, calculateOfferMomentum,
  getSeasonEndConfidence, getBoardObjective, buildCareerLeagueGetters,
  shouldEndProManagerCareerAfterDismissal, getProManagerEligibleLeagueIds,
  buildSwitchedProManagerLeague
} from '../../game/proManagerEngine';
import { LEAGUE_CONFIG, initializeNewSeasonWithPromotions, completeRemainingLeagues, isAperturaClausura, computeAccumulatedTable } from '../../game/multiLeagueEngine';

import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { generatePreseasonOptions, getSeasonResult } from '../../game/seasonManager';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import { getLeagueTier } from '../../game/leagueTiers';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import { qualifyTeamsForEurope, buildSeasonCalendar, remapFixturesForEuropean, LEAGUE_SLOTS, ensureEuropeanLeagueStandings, getEuropeanEraContextFromState, seasonIdFromStartYear } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, buildSouthAmericanQualifiedTeams, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { initializeSACompetitions } from '../../game/southAmericanSeason';
import {
  getLaLigaTeams, getSegundaTeams, getPremierTeams, getSerieATeams,
  getBundesligaTeams, getLigue1Teams, getEredivisieTeams, getPrimeiraLigaTeams,
  getChampionshipTeams, getBelgianProTeams, getSuperLigTeams, getScottishPremTeams,
  getSerieBTeams, getBundesliga2Teams, getLigue2Teams, getSwissTeams,
  getAustrianTeams, getGreekTeams, getDanishTeams, getCroatianTeams,
  getCzechTeams, getArgentinaTeams, getBrasileiraoTeams, getColombiaTeams,
  getChileTeams, getUruguayTeams, getEcuadorTeams, getParaguayTeams,
  getPeruTeams, getBoliviaTeams, getVenezuelaTeams,
  getMLSTeams, getSaudiTeams, getLigaMXTeams, getJLeagueTeams,
  getPrimeraRfefTeams, getSegundaRfefTeams
} from '../../data/teamsFirestore';
import { Trophy, TrendingUp, TrendingDown, Target, Briefcase, ChevronRight, Home, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import './ProManagerSeasonEnd.scss';

const ALL_LEAGUE_GETTERS = {
  laliga: getLaLigaTeams, segunda: getSegundaTeams, primeraRFEF: getPrimeraRfefTeams,
  segundaRFEF: getSegundaRfefTeams, premierLeague: getPremierTeams, serieA: getSerieATeams,
  bundesliga: getBundesligaTeams, ligue1: getLigue1Teams, eredivisie: getEredivisieTeams,
  primeiraLiga: getPrimeiraLigaTeams, championship: getChampionshipTeams,
  belgianPro: getBelgianProTeams, superLig: getSuperLigTeams, scottishPrem: getScottishPremTeams,
  serieB: getSerieBTeams, bundesliga2: getBundesliga2Teams, ligue2: getLigue2Teams,
  swissSuperLeague: getSwissTeams, austrianBundesliga: getAustrianTeams,
  greekSuperLeague: getGreekTeams, danishSuperliga: getDanishTeams,
  croatianLeague: getCroatianTeams, czechLeague: getCzechTeams,
  argentinaPrimera: getArgentinaTeams, brasileiraoA: getBrasileiraoTeams,
  colombiaPrimera: getColombiaTeams, chilePrimera: getChileTeams,
  uruguayPrimera: getUruguayTeams, ecuadorLigaPro: getEcuadorTeams,
  paraguayPrimera: getParaguayTeams, peruLiga1: getPeruTeams,
  boliviaPrimera: getBoliviaTeams, venezuelaPrimera: getVenezuelaTeams,
  mls: getMLSTeams, saudiPro: getSaudiTeams, ligaMX: getLigaMXTeams, jLeague: getJLeagueTeams
};

function getAvgOverall(team) {
  if (!team?.players?.length) return 65;
  return Math.round(team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length);
}

function formatMoney(amount) {
  if (!amount) return '€0';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  return `€${(amount / 1000).toFixed(0)}K`;
}

/**
 * Shared helper: initialize continental competitions for next season
 */
function _initContinentalComps(dispatch, newPlayerLeagueId, newSeasonData, state, allTeamsFlat, t, completedState = null) {
  const isInSA = isSouthAmericanLeague(newPlayerLeagueId);
  const nextHistoricalSeasonId = state?.historicalDatabase
    ? seasonIdFromStartYear((Number(state.careerStartSeason) || 2025) + (Number(state.currentSeason) || 1))
    : null;
  try {
    const leagueStandings = {};
    const allTeamsMap = {};

    // Prefer the FINAL standings of the season that just ended (completedState)
    // so next-season continental qualification reflects who actually finished
    // where — not the freshly reset/reputation-ordered new-season tables.
    const finalPlayerLeagueId = completedState?.playerLeagueId || completedState?.leagueId || newPlayerLeagueId;
    const finalPlayerTable = completedState
      ? (isAperturaClausura(finalPlayerLeagueId) && completedState.aperturaTable
          ? computeAccumulatedTable(completedState.aperturaTable, completedState.leagueTable || [])
          : (completedState.leagueTable || []))
      : (newSeasonData.playerLeague?.table || []);
    if (finalPlayerTable.length > 0) leagueStandings[finalPlayerLeagueId] = finalPlayerTable;

    const otherLeagues = completedState?.otherLeagues || newSeasonData.otherLeagues || {};
    for (const [lid, ld] of Object.entries(otherLeagues)) {
      if (lid === finalPlayerLeagueId) continue;
      const standings = isAperturaClausura(lid) && ld?.accumulatedTable?.length > 0
        ? ld.accumulatedTable
        : ld?.table;
      if (standings?.length > 0) leagueStandings[lid] = standings;
    }
    allTeamsFlat.forEach(tt => { allTeamsMap[tt.id || tt.teamId] = tt; });

    if (isInSA) {
      const saFillerPool = allTeamsFlat.filter(tt => isSouthAmericanLeague(tt.league || tt.leagueId || ''));
      const qualified = buildSouthAmericanQualifiedTeams({
        leagueStandings,
        allTeamsMap,
        fillerPool: saFillerPool,
        playerLeagueId: finalPlayerLeagueId
      });
      const saState = initializeSACompetitions(qualified);
      if (saState) dispatch({ type: 'INIT_SA_COMPETITIONS', payload: saState });
    } else {
      // Patch missing European leagues from LEAGUE_CONFIG.getTeams() so
      // saves that predate a newly added league still build 32-team
      // fields of real clubs instead of failing the qualification.
      const patched = ensureEuropeanLeagueStandings(
        leagueStandings,
        (lid) => LEAGUE_CONFIG[lid]?.getTeams?.()
      );
      const qualified = qualifyTeamsForEurope(patched, allTeamsMap);
      const euroState = initializeEuropeanCompetitions(qualified, {
        seasonId: nextHistoricalSeasonId,
        historical: state?.historicalDatabase
      });
      if (euroState) dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: euroState });
    }
  } catch (e) {
    console.error('[ProManager] Continental competition init failed:', e);
  }
}

export default function ProManagerSeasonEnd() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const pm = state.proManagerData || {};
  const [step, setStep] = useState('summary'); // 'summary' | 'offers'
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [animatedPrestige, setAnimatedPrestige] = useState(pm?.prestige || 10);

  const lastStats = pm?.lastSeasonStats;
  const position = lastStats?.position || (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || 1;
  const teamEntry = lastStats || state.leagueTable?.find(t => t.teamId === state.teamId);

  const seasonEval = useMemo(() => {
    return evaluateSeason(position, pm?.objective, state.cupResult);
  }, [position, pm?.objective, state.cupResult]);

  const newPrestige = useMemo(() => {
    return updatePrestige(pm?.prestige || 10, seasonEval, pm?.fired);
  }, [pm?.prestige, seasonEval, pm?.fired]);

  const newConfidence = useMemo(() => {
    return getSeasonEndConfidence(seasonEval.result);
  }, [seasonEval.result]);

  const careerLeagueGetters = useMemo(() => (
    buildCareerLeagueGetters(state, ALL_LEAGUE_GETTERS)
  ), [state.playerLeagueId, state.leagueTable, state.otherLeagues, state.leagueTeams, state.team, state.teamId]);

  const careerSeason = pm?.seasonsManaged || state.currentSeason || 1;
  const euroEra = useMemo(() => getEuropeanEraContextFromState(state), [
    state.historicalDatabase, state.databaseSeasonId, state.careerStartSeason, state.currentSeason
  ]);
  const seasonResult = useMemo(() => (
    getSeasonResult(state.leagueTable || [], state.teamId, state.playerLeagueId || state.leagueId, euroEra)
  ), [state.leagueTable, state.teamId, state.playerLeagueId, state.leagueId, euroEra]);
  const offerMomentum = useMemo(() => calculateOfferMomentum({
    seasonEvalResult: seasonEval.result,
    promoted: !!seasonResult?.promotion || !!lastStats?.promoted,
    cupResult: state.cupResult || lastStats?.cupResult,
    europeanResult: lastStats?.europeanResult,
    position,
  }), [seasonEval.result, seasonResult?.promotion, lastStats?.promoted, state.cupResult, lastStats?.cupResult, lastStats?.europeanResult, position]);
  const isDismissal = !!pm?.fired || (pm?.boardConfidence ?? 100) <= 0;
  const dismissalHistory = Array.isArray(pm?.dismissalHistory) ? pm.dismissalHistory : [];
  const careerLostByDismissal = isDismissal && shouldEndProManagerCareerAfterDismissal(careerSeason, dismissalHistory);
  const previousDismissalSeason = dismissalHistory
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0] || null;

  // Only offer leagues that are actually part of the active save (player league + the
  // other leagues persisted on the career). Stops historical careers from surfacing
  // static-only leagues that cannot be prepared after a year rollover.
  const eligibleLeagueIds = useMemo(() => {
    return getProManagerEligibleLeagueIds(state);
  }, [state.playerLeagueId, state.leagueId, state.otherLeagues, state.leagueTeams, state.leagueTable]);

  const offers = useMemo(() => {
    return generateSeasonEndOffers(
      newPrestige,
      state.playerLeagueId || state.leagueId,
      state.teamId,
      careerLeagueGetters,
      isDismissal
        ? { wasFired: true, minOffers: 5, maxOffers: 6, eligibleLeagueIds }
        : { offerMomentum, performanceBoost: offerMomentum.score, eligibleLeagueIds }
    );
  }, [newPrestige, state.playerLeagueId, state.leagueId, state.teamId, careerLeagueGetters, isDismissal, offerMomentum, eligibleLeagueIds]);

  // Animate prestige change
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPrestige(newPrestige), 500);
    return () => clearTimeout(timer);
  }, [newPrestige]);

  const canRenew = seasonEval.result !== 'failed' && !isDismissal && !careerLostByDismissal;

  const handleRenew = () => {
    // Stay with current team — trigger full season transition
    const leagueId = state.playerLeagueId || state.leagueId;
    const objective = getBoardObjective(
      getAvgOverall(state.team), leagueId, state.team
    );
    dispatch({
      type: 'SET_PROMANAGER_DATA',
      payload: {
        ...pm,
        prestige: newPrestige,
        boardConfidence: newConfidence,
        objective,
        seasonsManaged: (pm.seasonsManaged || 1) + 1,
        fired: false,
        winStreak: 0,
        lossStreak: 0,
        careerHistory: [...(pm.careerHistory || []), {
          season: pm.seasonsManaged || 1,
          teamName: state.team?.name,
          leagueId: leagueId,
          position,
          result: seasonEval.result,
        }]
      }
    });

    // Build all teams for preseason
    const allTeamsFlat = [];
    for (const [lid, getter] of Object.entries(ALL_LEAGUE_GETTERS)) {
      try { allTeamsFlat.push(...getter()); } catch { /* skip */ }
    }

    // Season result for transition
    const seasonResult = getSeasonResult(state.leagueTable, state.teamId, leagueId);

    // Complete any unfinished other leagues before processing promotion/relegation
    let completedState = state;
    if (state.otherLeagues && Object.keys(state.otherLeagues).length > 0) {
      try {
        const completed = completeRemainingLeagues(state.otherLeagues, state.currentWeek);
        completedState = { ...state, otherLeagues: completed };
      } catch (e) {
        console.warn('Error completing other leagues in ProManager season end:', e);
      }
    }

    // Process promotion/relegation
    const newSeasonData = initializeNewSeasonWithPromotions(completedState, state.teamId, null, {});
    const newPlayerLeagueId = newSeasonData.newPlayerLeagueId || leagueId;

    // Generate preseason (auto-pick first option)
    const preseasonOpts = generatePreseasonOptions(allTeamsFlat, state.team, newPlayerLeagueId);
    const preseason = preseasonOpts[0];

    // Generate new objectives
    const newObjectives = generateSeasonObjectives(state.team, newPlayerLeagueId, newSeasonData.playerLeague.table);

    // Cup
    let cupBracket = null;
    let cupRounds = 0;
    try {
      const cupData = getCupTeams(newPlayerLeagueId, state.team, newSeasonData.otherLeagues || state.otherLeagues, newSeasonData.playerLeague?.table);
      if (cupData?.teams?.length >= 2) {
        cupBracket = generateCupBracket(cupData.teams, state.teamId);
        if (cupBracket) cupRounds = cupBracket.rounds.length;
      }
    } catch { /* skip */ }

    // Season calendar
    let finalFixtures = newSeasonData.playerLeague.fixtures;
    let europeanCalendar = null;
    try {
      const totalLeagueMDs = finalFixtures.length > 0 ? Math.max(...finalFixtures.map(f => f.week)) : 38;
      europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: !!seasonResult.qualification, cupRounds });
      finalFixtures = remapFixturesForEuropean(finalFixtures, europeanCalendar.leagueWeekMap);
    } catch { /* skip */ }

    // Dispatch START_NEW_SEASON for full state transition
    dispatch({
      type: 'START_NEW_SEASON',
      payload: {
        seasonResult,
        objectiveRewards: { netResult: 0, totalReward: 0, totalPenalty: 0, objectiveResults: [] },
        europeanBonus: 0,
        preseasonMatches: preseason?.matches || [],
        moneyChange: 0,
        newFixtures: finalFixtures,
        newTable: newSeasonData.playerLeague.table,
        newObjectives,
        newPlayerLeagueId,
        newPlayerGroupId: newSeasonData.playerLeague?.playerGroup || null,
        newOtherLeagues: newSeasonData.otherLeagues,
        europeanCalendar
      }
    });

    // Other leagues
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: newSeasonData.otherLeagues });

    if (newPlayerLeagueId !== leagueId) {
      dispatch({ type: 'SET_PLAYER_LEAGUE', payload: newPlayerLeagueId });
    }

    if (cupBracket) {
      dispatch({ type: 'INIT_CUP_COMPETITION', payload: cupBracket });
    }

    // Continental competitions — qualify from the FINAL standings just played.
    _initContinentalComps(dispatch, newPlayerLeagueId, newSeasonData, state, allTeamsFlat, t, completedState);

    dispatch({ type: 'SET_SCREEN', payload: 'office' });
  };

  const handleAcceptOffer = (offer) => {
    const { team, leagueId, objective } = offer;

    // Process the same season rollover as renewing, then move the manager into
    // the selected club's league inside that rolled-over universe. Do not reload
    // static league getters here, or promotions/relegations from the save vanish.
    const leagueEntry = Object.entries(LEAGUE_CONFIG).find(([id]) => id === leagueId);
    if (!leagueEntry) return;

    let completedState = state;
    try {
      completedState = {
        ...state,
        otherLeagues: completeRemainingLeagues(state.otherLeagues || {}, state.currentWeek || 1)
      };
    } catch { /* keep current state if AI completion fails */ }

    const newSeasonData = initializeNewSeasonWithPromotions(completedState, state.teamId, null, {});
    const previousPlayerLeagueId = newSeasonData.newPlayerLeagueId || state.playerLeagueId || state.leagueId;
    const selectedLeagueData = leagueId === previousPlayerLeagueId
      ? newSeasonData.playerLeague
      : newSeasonData.otherLeagues?.[leagueId];

    // Build the league the manager is switching into. This GUARANTEES the offered
    // team is in the classification exactly once (marked isPlayer) and that the
    // regenerated fixtures include its matches — even when the promotion/relegation
    // rollover moved the club out of selectedLeagueData. Falls back to the static
    // getter if the rollover produced no table for this league at all.
    const leagueData = buildSwitchedProManagerLeague({
      selectedLeagueData,
      team,
      leagueId,
      careerGetters: careerLeagueGetters,
      fallbackGetter: () => {
        try { return ALL_LEAGUE_GETTERS[leagueId]?.() || LEAGUE_CONFIG[leagueId]?.getTeams?.() || []; }
        catch { return []; }
      },
    });
    if (!leagueData) return;

    const otherLeagues = { ...(newSeasonData.otherLeagues || {}) };
    if (leagueId !== previousPlayerLeagueId && newSeasonData.playerLeague) {
      otherLeagues[previousPlayerLeagueId] = {
        ...newSeasonData.playerLeague,
        table: (newSeasonData.playerLeague.table || []).map(entry => ({ ...entry, isPlayer: false }))
      };
    }
    delete otherLeagues[leagueId];

    const switchedCareerGetters = buildCareerLeagueGetters(
      {
        ...state,
        playerLeagueId: leagueId,
        leagueTable: leagueData.table,
        otherLeagues,
        leagueTeams: [
          ...(state.leagueTeams || []).filter(tt => (tt.id || tt.teamId) !== team.id),
          { ...team, leagueId }
        ],
        team: { ...team, leagueId },
        teamId: team.id,
      },
      ALL_LEAGUE_GETTERS
    );
    const allTeamsFlat = Object.values(switchedCareerGetters).reduce((acc, getter) => {
      try { acc.push(...(getter() || [])); } catch { /* skip */ }
      return acc;
    }, []);

    const stadiumInfo = getStadiumInfo(team.id, team.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);

    // Generate preseason (auto-pick first) from the persisted career universe.
    const preseasonOpts = generatePreseasonOptions(allTeamsFlat, team, leagueId);
    const preseason = preseasonOpts[0];

    dispatch({
      type: 'PROMANAGER_SWITCH_TEAM',
      payload: { team, leagueId, stadiumInfo, stadiumLevel, _proManagerUserId: user?.uid || null, preseasonMatches: preseason?.matches || [] }
    });

    const updatedDismissalHistory = isDismissal
      ? [...dismissalHistory, careerSeason]
      : dismissalHistory;

    // Set ProManager data with updated career history
    dispatch({
      type: 'SET_PROMANAGER_DATA',
      payload: {
        ...pm,
        prestige: newPrestige,
        boardConfidence: 60,
        objective,
        seasonsManaged: (pm.seasonsManaged || 1) + 1,
        fired: false,
        dismissalHistory: updatedDismissalHistory,
        lastDismissalSeason: isDismissal ? careerSeason : pm.lastDismissalSeason,
        winStreak: 0,
        lossStreak: 0,
        currentTeamId: team.id,
        currentLeagueId: leagueId,
        careerHistory: [...(pm.careerHistory || []), {
          season: pm.seasonsManaged || 1,
          teamName: state.team?.name,
          leagueId: state.playerLeagueId || state.leagueId,
          position,
          result: seasonEval.result,
        }]
      }
    });

    // Initialize league, fixtures, other leagues from the rolled-over universe.
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: leagueId });
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    // Load all league teams for transfers from the same career universe.
    const allLeagueTeamsWithData = [];
    for (const [lid, lgetter] of Object.entries(switchedCareerGetters)) {
      try {
        const teams = lgetter();
        for (const tt of teams) {
          allLeagueTeamsWithData.push({
            ...tt, id: tt.id, name: tt.name, players: tt.players || [],
            budget: tt.budget || (tt.reputation > 4 ? 100_000_000 : tt.reputation > 3 ? 50_000_000 : 20_000_000),
            leagueId: lid
          });
        }
      } catch { /* skip */ }
    }
    if (allLeagueTeamsWithData.length > 0) {
      dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });
    }

    // Season calendar + fixtures remap
    let finalFixtures = leagueData.fixtures;
    let europeanCalendar = null;
    try {
      const totalLeagueMDs = finalFixtures.length > 0 ? Math.max(...finalFixtures.map(f => f.week)) : 38;
      europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds: 0 });
      finalFixtures = remapFixturesForEuropean(finalFixtures, europeanCalendar.leagueWeekMap);
    } catch { /* skip */ }

    dispatch({ type: 'SET_FIXTURES', payload: finalFixtures });
    if (europeanCalendar) {
      dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
    }

    // Generate new objectives
    const newObjectives = generateSeasonObjectives(team, leagueId, leagueData.table);
    dispatch({ type: 'SET_SEASON_OBJECTIVES', payload: newObjectives });

    // Cup
    try {
      const cupData = getCupTeams(leagueId, team, otherLeagues, leagueData.table);
      if (cupData?.teams?.length >= 2) {
        const bracket = generateCupBracket(cupData.teams, team.id);
        if (bracket) dispatch({ type: 'INIT_CUP_COMPETITION', payload: bracket });
      }
    } catch { /* skip */ }

    // Continental competitions
    const fakeNewSeasonData = { newPlayerLeagueId: leagueId, otherLeagues, playerLeague: { table: leagueData.table } };
    _initContinentalComps(dispatch, leagueId, fakeNewSeasonData, state, allTeamsFlat, t);
  };

  const handleRetire = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };

  const evalEmoji = {
    champion: '🏆',
    exceeded: '🌟',
    met: '✅',
    close: '😐',
    failed: '❌',
  }[seasonEval.result] || '📋';

  const evalColor = {
    champion: '#ffd700',
    exceeded: '#4ade80',
    met: '#4ade80',
    close: '#f59e0b',
    failed: '#ef4444',
  }[seasonEval.result] || '#8899aa';

  const marketMessage = {
    elite: 'Tu temporada ha sacudido el mercado: llegan clubes claramente superiores.',
    breakthrough: 'Ascenso o título pesan: el siguiente salto profesional ya es real.',
    strong: 'Buen año: las ofertas suben de nivel y presupuesto.',
    positive: 'Objetivo cumplido: el mercado mejora ligeramente.',
    normal: 'El mercado se mantiene prudente.'
  }[offerMomentum.level];

  return (
    <div className="pm-season-end">
      <div className="pm-season-end__bg">
        <div className="pm-season-end__gradient" />
      </div>

      <div className="pm-season-end__content">
        {step === 'summary' && (
          <div className="pm-season-end__summary">
            <div className="pm-season-end__title">
              <Briefcase size={24} />
              <h1>{t('proManager.seasonEnd.title')}</h1>
              <span className="season-num">{t('common.season')} {pm?.seasonsManaged || 1}</span>
            </div>

            {/* Season Summary */}
            <div className="pm-season-end__card">
              <h2>{state.team?.name}</h2>
              <div className="stats-row">
                <div className="stat">
                  <span className="label">{t('ranking.position')}</span>
                  <span className="value">{position}º</span>
                </div>
                <div className="stat">
                  <span className="label">{t('leagueTable.points')}</span>
                  <span className="value">{teamEntry?.points || 0}</span>
                </div>
                <div className="stat">
                  <span className="label">{t('managerFired.balance')}</span>
                  <span className="value">{teamEntry?.won || 0}W {teamEntry?.drawn || 0}D {teamEntry?.lost || 0}L</span>
                </div>
              </div>
            </div>

            {/* Season Achievements */}
            {lastStats && (
              <div className="pm-season-end__achievements">
                {lastStats.cupResult && (
                  <div className="achievement">🏆 {t('proManager.seasonEnd.cupResult', { result: lastStats.cupResult })}</div>
                )}
                {lastStats.europeanResult && (
                  <div className="achievement">🌍 {t('proManager.seasonEnd.europeanResult', { result: lastStats.europeanResult })}</div>
                )}
                {position === 1 && (
                  <div className="achievement">🥇 {t('proManager.seasonEnd.leagueChampion')}</div>
                )}
                {position <= 4 && position > 1 && (
                  <div className="achievement">⭐ {t('proManager.seasonEnd.topFour')}</div>
                )}
                {(teamEntry?.goalsFor || 0) > 0 && (
                  <div className="achievement">⚽ {t('proManager.seasonEnd.goalsSummary', { goalsFor: teamEntry.goalsFor, goalsAgainst: teamEntry.goalsAgainst })}</div>
                )}
              </div>
            )}

            {/* Board Evaluation */}
            <div className="pm-season-end__eval" style={{ borderColor: evalColor }}>
              <div className="eval-header">
                <span className="emoji">{evalEmoji}</span>
                <h3>{t(`proManager.seasonEnd.${seasonEval.result}`)}</h3>
              </div>
              {pm?.objective && (
                <p className="objective-reminder">
                  <Target size={14} />
                  {t(pm.objective.label, pm.objective.labelParams)}
                </p>
              )}
            </div>

            {/* Career market momentum */}
            {offerMomentum.score > 0 && !isDismissal && (
              <div className={`pm-season-end__market pm-season-end__market--${offerMomentum.level}`}>
                <div className="market-glow" />
                <Sparkles size={18} />
                <div>
                  <strong>Reputación en alza</strong>
                  <span>{marketMessage}</span>
                </div>
                <b>+{offerMomentum.score} mercado</b>
              </div>
            )}

            {/* Prestige Change */}
            <div className="pm-season-end__prestige">
              <div className="prestige-label">
                {seasonEval.prestigeChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{t('proManager.prestige')}</span>
              </div>
              <div className="prestige-change">
                <span className="old">{pm?.prestige || 10}</span>
                <ArrowRight size={14} />
                <span className={`new ${seasonEval.prestigeChange >= 0 ? 'positive' : 'negative'}`}>
                  {animatedPrestige}
                </span>
                <span className={`delta ${seasonEval.prestigeChange >= 0 ? 'positive' : 'negative'}`}>
                  ({seasonEval.prestigeChange >= 0 ? '+' : ''}{seasonEval.prestigeChange})
                </span>
              </div>
              <div className="prestige-bar">
                <div className="prestige-bar__fill" style={{ width: `${animatedPrestige}%` }} />
              </div>
            </div>

            <button className="btn-next" onClick={() => setStep('offers')}>
              {t('proManager.seasonEnd.viewOffers')}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 'offers' && (
          <div className="pm-season-end__offers">
            <div className="pm-season-end__offers-head">
              <div>
                <span className="kicker">{isDismissal ? 'Despido confirmado' : offerMomentum.score > 0 ? 'Mercado en alza' : 'Mercado de entrenadores'}</span>
                <h2>{careerLostByDismissal ? 'Carrera terminada' : t('proManager.seasonEnd.jobOffers')}</h2>
              </div>
              {!careerLostByDismissal && <span className="offers-count">{offers.length} ofertas</span>}
            </div>

            {careerLostByDismissal ? (
              <div className="pm-season-end__game-over">
                <AlertTriangle size={28} />
                <div>
                  <h3>Has perdido la partida</h3>
                  <p>Te han despedido otra vez con solo {careerSeason - previousDismissalSeason} temporadas de diferencia. Tu carrera profesional queda cerrada.</p>
                </div>
                <button className="btn-retire btn-retire--inline" onClick={handleRetire}>
                  <Home size={16} />
                  Volver al menú
                </button>
              </div>
            ) : (
              <>
                {isDismissal && (
                  <div className="pm-season-end__dismissal-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Última oportunidad profesional</strong>
                      <span>Ahora recibirás 5 o 6 ofertas de clubes menores. Si te echan otra vez en las próximas 2 temporadas, perderás la partida.</span>
                    </div>
                  </div>
                )}

                {/* Renewal option */}
                {canRenew && (
                  <div className="pm-season-end__renewal">
                    <h3>{t('proManager.seasonEnd.renewWith', { team: state.team?.name })}</h3>
                    <button className="btn-renew" onClick={handleRenew}>
                      {t('proManager.seasonEnd.renew')}
                    </button>
                  </div>
                )}

                {/* External offers */}
                {offers.length > 0 ? (
                  <div className="offers-list">
                    {offers.map((offer, idx) => (
                      <div key={offer.team.id + idx} className={`offer-item offer-item--${offer.marketTier || 'standard'}`} style={{ '--offer-delay': `${idx * 70}ms` }}>
                        <div className="offer-rank">#{idx + 1}</div>
                        <div className="offer-info">
                          <h4>{offer.team.name}</h4>
                          <span className="league">{offer.leagueName} · {offer.country}</span>
                          {offer.marketTier && offer.marketTier !== 'standard' && (
                            <span className="offer-upgrade">Oferta mejorada por temporada exitosa</span>
                          )}
                          <div className="offer-meta">
                            <div className="offer-objective">
                              <Target size={12} />
                              {t(offer.objective.label, offer.objective.labelParams)}
                            </div>
                            <span className="budget">{formatMoney(offer.team.budget)}</span>
                          </div>
                        </div>
                        <button className="btn-accept" onClick={() => handleAcceptOffer(offer)}>
                          {t('common.accept')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-offers">{t('proManager.seasonEnd.noExternalOffers')}</p>
                )}

                {isDismissal && (
                  <p className="pm-season-end__fineprint">Aviso: un segundo despido con 2 temporadas o menos de diferencia cuenta como fracaso definitivo de carrera.</p>
                )}

                {/* Retire */}
                <button className="btn-retire" onClick={handleRetire}>
                  <Home size={16} />
                  {t('proManager.seasonEnd.retire')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
