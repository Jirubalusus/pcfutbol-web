import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import {
  evaluateSeason, updatePrestige, generateSeasonEndOffers,
  getSeasonEndConfidence, getBoardObjective
} from '../../game/proManagerEngine';
import { LEAGUE_CONFIG, initializeOtherLeagues, initializeNewSeasonWithPromotions } from '../../game/multiLeagueEngine';
import { initializeLeague } from '../../game/leagueEngine';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { generatePreseasonOptions, getSeasonResult } from '../../game/seasonManager';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import { getLeagueTier } from '../../game/leagueTiers';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import { qualifyTeamsForEurope, buildSeasonCalendar, remapFixturesForEuropean, LEAGUE_SLOTS } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
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
import { Trophy, TrendingUp, TrendingDown, Target, Briefcase, ChevronRight, Home, ArrowRight } from 'lucide-react';
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
function _initContinentalComps(dispatch, newPlayerLeagueId, newSeasonData, state, allTeamsFlat, t) {
  const isInSA = isSouthAmericanLeague(newPlayerLeagueId);
  try {
    const leagueStandings = {};
    const allTeamsMap = {};
    const playerTable = newSeasonData.playerLeague?.table || [];
    if (playerTable.length > 0) leagueStandings[newPlayerLeagueId] = playerTable;

    const otherLeagues = newSeasonData.otherLeagues || {};
    for (const [lid, ld] of Object.entries(otherLeagues)) {
      if (ld?.table?.length > 0 && lid !== newPlayerLeagueId) leagueStandings[lid] = ld.table;
    }
    allTeamsFlat.forEach(tt => { allTeamsMap[tt.id || tt.teamId] = tt; });

    if (isInSA) {
      const qualified = qualifyTeamsForSouthAmerica(leagueStandings, allTeamsMap);
      const usedIds = new Set();
      Object.values(qualified).forEach(teams => teams.forEach(tt => usedIds.add(tt.teamId)));
      const remaining = allTeamsFlat.filter(tt => !usedIds.has(tt.id || tt.teamId) && isSouthAmericanLeague(tt.league || tt.leagueId || '')).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
      for (const compId of ['copaLibertadores', 'copaSudamericana']) {
        const needed = 32 - qualified[compId].length;
        if (needed > 0) {
          const fillers = remaining.splice(0, needed);
          qualified[compId].push(...fillers.map(tt => ({ teamId: tt.id || tt.teamId, teamName: tt.name || tt.teamName, shortName: tt.shortName || '', league: tt.league || 'unknown', leaguePosition: 0, reputation: tt.reputation || 60, overall: tt.overall || 65, players: tt.players || [], ...tt })));
        }
      }
      const saState = initializeSACompetitions(qualified);
      if (saState) dispatch({ type: 'INIT_SA_COMPETITIONS', payload: saState });
    } else {
      const qualified = qualifyTeamsForEurope(leagueStandings, allTeamsMap);
      const usedIds = new Set();
      Object.values(qualified).forEach(teams => teams.forEach(tt => usedIds.add(tt.teamId)));
      const remaining = allTeamsFlat.filter(tt => !usedIds.has(tt.id || tt.teamId)).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
      for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
        const needed = 32 - qualified[compId].length;
        if (needed > 0) {
          const fillers = remaining.splice(0, needed);
          qualified[compId].push(...fillers.map(tt => ({ teamId: tt.id || tt.teamId, teamName: tt.name || tt.teamName, shortName: tt.shortName || '', league: tt.league || 'unknown', leaguePosition: 0, reputation: tt.reputation || 60, overall: tt.overall || 65, players: tt.players || [], ...tt })));
        }
      }
      const euroState = initializeEuropeanCompetitions(qualified);
      if (euroState) dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: euroState });
    }
  } catch (e) { console.warn('ProManager continental comps init error:', e); }
}

export default function ProManagerSeasonEnd() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const pm = state.proManagerData;
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

  const offers = useMemo(() => {
    return generateSeasonEndOffers(
      newPrestige,
      state.playerLeagueId || state.leagueId,
      state.teamId,
      ALL_LEAGUE_GETTERS
    );
  }, [newPrestige, state.playerLeagueId, state.leagueId, state.teamId]);

  // Animate prestige change
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPrestige(newPrestige), 500);
    return () => clearTimeout(timer);
  }, [newPrestige]);

  const canRenew = seasonEval.result !== 'failed' && !pm?.fired;

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

    // Process promotion/relegation
    const newSeasonData = initializeNewSeasonWithPromotions(state, state.teamId, null, {});
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

    // Continental competitions
    _initContinentalComps(dispatch, newPlayerLeagueId, newSeasonData, state, allTeamsFlat, t);

    dispatch({ type: 'SET_SCREEN', payload: 'office' });
  };

  const handleAcceptOffer = (offer) => {
    const { team, leagueId, objective } = offer;

    // Initialize league for the new team
    const leagueEntry = Object.entries(LEAGUE_CONFIG).find(([id]) => id === leagueId);
    if (!leagueEntry) return;
    const [, config] = leagueEntry;
    const getter = ALL_LEAGUE_GETTERS[leagueId] || config.getTeams;
    if (!getter) return;

    let leagueTeams;
    try { leagueTeams = getter(); } catch { return; }

    const leagueData = initializeLeague(leagueTeams, team.id);
    const stadiumInfo = getStadiumInfo(team.id, team.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);

    // Build all teams for preseason + transfers
    const allTeamsFlat = [];

    // Generate preseason (auto-pick first)
    const preseasonOpts = generatePreseasonOptions(
      Object.entries(ALL_LEAGUE_GETTERS).reduce((acc, [, g]) => { try { acc.push(...g()); } catch {} return acc; }, []),
      team, leagueId
    );
    const preseason = preseasonOpts[0];

    // First switch team (resets state)
    dispatch({
      type: 'PROMANAGER_SWITCH_TEAM',
      payload: { team, leagueId, stadiumInfo, stadiumLevel, _proManagerUserId: user?.uid || null, preseasonMatches: preseason?.matches || [] }
    });

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

    // Initialize league, fixtures, other leagues
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: leagueId });

    const otherLeagues = initializeOtherLeagues(leagueId, null);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    // Load all league teams for transfers
    const allLeagueTeamsWithData = [];
    const allTeamsFlat = [];
    for (const [lid, lgetter] of Object.entries(ALL_LEAGUE_GETTERS)) {
      try {
        const teams = lgetter();
        allTeamsFlat.push(...teams);
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
            <h2>{t('proManager.seasonEnd.jobOffers')}</h2>

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
                  <div key={offer.team.id + idx} className="offer-item">
                    <div className="offer-info">
                      <h4>{offer.team.name}</h4>
                      <span className="league">{offer.leagueName} · {offer.country}</span>
                      <div className="offer-objective">
                        <Target size={12} />
                        {t(offer.objective.label, offer.objective.labelParams)}
                      </div>
                      <span className="budget">{formatMoney(offer.team.budget)}</span>
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

            {/* Retire */}
            <button className="btn-retire" onClick={handleRetire}>
              <Home size={16} />
              {t('proManager.seasonEnd.retire')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
