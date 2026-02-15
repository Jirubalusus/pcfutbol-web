import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { generateInitialOffers, getBoardObjective } from '../../game/proManagerEngine';
import { getLeagueTier } from '../../game/leagueTiers';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeOtherLeagues, LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { generatePreseasonOptions } from '../../game/seasonManager';
import { qualifyTeamsForEurope, LEAGUE_SLOTS, buildSeasonCalendar, remapFixturesForEuropean } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { initializeSACompetitions } from '../../game/southAmericanSeason';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import {
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams,
  getPrimeraRfefGroups, getSegundaRfefGroups,
  getPremierTeams, getSerieATeams, getBundesligaTeams, getLigue1Teams,
  getEredivisieTeams, getPrimeiraLigaTeams, getChampionshipTeams,
  getBelgianProTeams, getSuperLigTeams, getScottishPremTeams,
  getSerieBTeams, getBundesliga2Teams, getLigue2Teams,
  getSwissTeams, getAustrianTeams, getGreekTeams,
  getDanishTeams, getCroatianTeams, getCzechTeams,
  getArgentinaTeams, getBrasileiraoTeams, getColombiaTeams,
  getChileTeams, getUruguayTeams, getEcuadorTeams,
  getParaguayTeams, getPeruTeams, getBoliviaTeams, getVenezuelaTeams,
  getMLSTeams, getSaudiTeams, getLigaMXTeams, getJLeagueTeams
} from '../../data/teamsFirestore';
import { ArrowLeft, Briefcase, Users, Star, Target } from 'lucide-react';
import './ProManagerSetup.scss';

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

const ALL_LEAGUES = Object.entries(LEAGUE_CONFIG).map(([id, cfg]) => ({
  id, name: cfg.name, getter: ALL_LEAGUE_GETTERS[id] || cfg.getTeams
})).filter(l => l.getter);

function getAvgOverall(team) {
  if (!team?.players?.length) return 0;
  return Math.round(team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length);
}

function formatMoney(amount) {
  if (!amount) return '€0';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  return `€${(amount / 1000).toFixed(0)}K`;
}

function ensureBudgetAndReputation(team, leagueId) {
  const tierBudgets = {
    1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
    2: { pct: 0.10, min: 5_000_000, max: 120_000_000 },
    3: { pct: 0.07, min: 1_500_000, max: 30_000_000 },
    4: { pct: 0.05, min: 300_000, max: 5_000_000 },
    5: { pct: 0.03, min: 100_000, max: 1_500_000 }
  };
  const avgOverall = team.players?.length
    ? team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length : 70;
  const totalValue = (team.players || []).reduce((sum, p) => sum + (p.value || 0), 0);
  const currentTier = getLeagueTier(leagueId);
  const budgetConfig = tierBudgets[currentTier] || tierBudgets[3];

  if (!team.reputation) {
    if (avgOverall >= 82) team.reputation = 5;
    else if (avgOverall >= 78) team.reputation = 4;
    else if (avgOverall >= 73) team.reputation = 3;
    else if (avgOverall >= 68) team.reputation = 2;
    else team.reputation = 1;
  }

  if (!team.budget) {
    const baseBudget = Math.max(totalValue * budgetConfig.pct, budgetConfig.min);
    const repMultiplier = [0.5, 0.7, 1.0, 1.5, 2.5][team.reputation - 1] || 1.0;
    team.budget = Math.round(Math.min(baseBudget * repMultiplier, budgetConfig.max));
  }
  return team;
}

export default function ProManagerSetup() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { user } = useAuth();
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [starting, setStarting] = useState(false);

  const offers = useMemo(() => {
    return generateInitialOffers(null, 10, ALL_LEAGUE_GETTERS).map(offer => {
      ensureBudgetAndReputation(offer.team, offer.leagueId);
      return offer;
    });
  }, []);

  const handleBack = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };

  const handleStart = async () => {
    if (!selectedOffer || starting) return;
    setStarting(true);

    const { team, leagueId, objective } = selectedOffer;
    ensureBudgetAndReputation(team, leagueId);

    const leagueEntry = ALL_LEAGUES.find(l => l.id === leagueId);
    if (!leagueEntry) return;

    let leagueTeams;
    try { leagueTeams = leagueEntry.getter(); } catch { return; }

    const leagueData = initializeLeague(leagueTeams, team.id);
    const stadiumInfo = getStadiumInfo(team.id, team.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);

    const allTeamsFlat = [];
    for (const l of ALL_LEAGUES) {
      try { allTeamsFlat.push(...l.getter()); } catch { /* skip */ }
    }
    const preseasonOptions = generatePreseasonOptions(allTeamsFlat, team, leagueId);
    const preseason = preseasonOptions[0];

    dispatch({
      type: 'NEW_GAME',
      payload: {
        teamId: team.id,
        team: { ...team },
        leagueId,
        stadiumInfo,
        stadiumLevel,
        preseasonMatches: preseason?.matches || [],
        preseasonPhase: true,
        gameMode: 'promanager',
        _proManagerUserId: user?.uid || null
      }
    });

    // Set ProManager data in state
    dispatch({
      type: 'SET_PROMANAGER_DATA',
      payload: {
        prestige: 10,
        boardConfidence: 60,
        objective,
        seasonsManaged: 1,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0,
        totalMatches: 0,
        titles: 0,
        careerHistory: [],
        winStreak: 0,
        lossStreak: 0,
        fired: false,
      }
    });

    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: leagueId });

    // Load all league teams for transfers
    const allLeagueTeamsWithData = [];
    for (const league of ALL_LEAGUES) {
      try {
        const teams = league.getter();
        for (const tt of teams) {
          allLeagueTeamsWithData.push({
            ...tt, id: tt.id, name: tt.name, players: tt.players || [],
            budget: tt.budget || (tt.reputation > 4 ? 100_000_000 : tt.reputation > 3 ? 50_000_000 : 20_000_000),
            leagueId: league.id
          });
        }
      } catch { /* skip */ }
    }
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });

    const otherLeagues = initializeOtherLeagues(leagueId, null);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    // Bootstrap continental competitions (same as ContrarrelojSetup)
    const isPlayerInSA = isSouthAmericanLeague(leagueId);
    if (isPlayerInSA) {
      try {
        const bootstrapStandings = {};
        for (const [lid, slots] of Object.entries(SA_LEAGUE_SLOTS)) {
          const config = LEAGUE_CONFIG[lid];
          if (!config) continue;
          const teams = config.getTeams ? config.getTeams() : ALL_LEAGUE_GETTERS[lid]?.();
          if (!teams?.length) continue;
          bootstrapStandings[lid] = teams.map((t, i) => ({
            teamId: t.id, teamName: t.name, shortName: t.shortName || '',
            reputation: t.reputation || 70, overall: t.overall || 70, leaguePosition: i + 1
          }));
        }
        const qualified = qualifyTeamsForSouthAmerica(bootstrapStandings);
        const saComps = initializeSACompetitions(qualified);
        if (saComps) dispatch({ type: 'INIT_SA_COMPETITIONS', payload: saComps });
      } catch (e) { console.warn('SA comps init error:', e); }
    } else {
      try {
        const bootstrapStandings = {};
        for (const [lid, slots] of Object.entries(LEAGUE_SLOTS)) {
          const config = LEAGUE_CONFIG[lid];
          if (!config) continue;
          const teams = config.getTeams ? config.getTeams() : ALL_LEAGUE_GETTERS[lid]?.();
          if (!teams?.length) continue;
          bootstrapStandings[lid] = teams.map((t, i) => ({
            teamId: t.id, teamName: t.name, shortName: t.shortName || '',
            reputation: t.reputation || 70, overall: t.overall || 70, leaguePosition: i + 1
          }));
        }
        const qualified = qualifyTeamsForEurope(bootstrapStandings);
        const euroComps = initializeEuropeanCompetitions(qualified);
        if (euroComps) dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: euroComps });
      } catch (e) { console.warn('Euro comps init error:', e); }
    }

    // Cup
    let cupRounds = 0;
    try {
      const cupData = getCupTeams(leagueId, team, {}, leagueTeams.map((t, i) => ({ teamId: t.id, teamName: t.name, leaguePosition: i + 1 })));
      if (cupData?.teams?.length >= 4) {
        const bracket = generateCupBracket(cupData.teams, team.id);
        dispatch({ type: 'INIT_CUP_COMPETITION', payload: bracket });
        cupRounds = bracket.rounds?.length || 0;
      }
    } catch { /* skip */ }

    // Build season calendar (intercalate European/Cup weeks with league)
    const hasEuropean = !isPlayerInSA ? true : false; // SA also uses same calendar system
    const hasContinental = isPlayerInSA || hasEuropean;
    const totalLeagueMDs = leagueData.fixtures
      ? Math.max(...leagueData.fixtures.map(f => f.week || 0), 0)
      : (leagueTeams.length - 1) * 2;
    const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: hasContinental, cupRounds });
    const remappedFixtures = remapFixturesForEuropean(leagueData.fixtures, europeanCalendar.leagueWeekMap);
    dispatch({ type: 'SET_FIXTURES', payload: remappedFixtures });
    dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
  };

  return (
    <div className="promanager-setup">
      <div className="promanager-setup__bg">
        <div className="promanager-setup__gradient" />
        <div className="promanager-setup__particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`particle particle--${i}`} />
          ))}
        </div>
      </div>

      <div className="promanager-setup__content">
        <div className="promanager-setup__header">
          <button className="btn-back" onClick={handleBack}>
            <ArrowLeft size={18} />
            <span>{t('common.back')}</span>
          </button>
          <div className="header-info">
            <h1>
              <Briefcase size={24} />
              {t('proManager.title')}
            </h1>
            <p>{t('proManager.chooseTeam')}</p>
          </div>
        </div>

        <div className="promanager-setup__offers">
          {offers.length === 0 && (
            <p className="no-offers">{t('proManager.noOffers')}</p>
          )}

          <div className="offers-grid">
            {offers.map((offer, idx) => {
              const avgOvr = getAvgOverall(offer.team);
              const isSelected = selectedOffer?.team?.id === offer.team.id;
              return (
                <button
                  key={offer.team.id + idx}
                  className={`offer-card ${isSelected ? 'offer-card--selected' : ''}`}
                  onClick={() => setSelectedOffer(offer)}
                >
                  <div className="offer-card__header">
                    <h3>{offer.team.name}</h3>
                    <span className="league-name">{offer.leagueName}</span>
                  </div>
                  <div className="offer-card__stats">
                    <div className="stat">
                      <Star size={14} />
                      <span>{avgOvr} OVR</span>
                    </div>
                    <div className="stat">
                      <Users size={14} />
                      <span>{offer.team.players?.length || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="money">{formatMoney(offer.team.budget)}</span>
                    </div>
                  </div>
                  <div className="offer-card__objective">
                    <Target size={14} />
                    <span>{t(offer.objective.label, offer.objective.labelParams)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOffer && (
            <button
              className="btn-start"
              onClick={handleStart}
              disabled={starting}
            >
              <Briefcase size={20} />
              {starting ? t('common.loading') : t('proManager.startCareer')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
