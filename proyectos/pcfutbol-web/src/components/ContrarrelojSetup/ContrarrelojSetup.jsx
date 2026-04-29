import React, { useState, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { getLeagueTier } from '../../game/leagueTiers';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeOtherLeagues, LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import { generatePreseasonOptions } from '../../game/seasonManager';
import { qualifyTeamsForEurope, LEAGUE_SLOTS, buildSeasonCalendar, remapFixturesForEuropean, ensureEuropeanLeagueStandings } from '../../game/europeanCompetitions';
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
import { Timer, ArrowLeft, RefreshCw, Zap, Users, DollarSign, Star, ChevronRight, Trophy, AlertTriangle } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import TeamCrest from '../TeamCrest/TeamCrest';
import './ContrarrelojSetup.scss';

// Liga → getter (names pulled from LEAGUE_CONFIG to match renamed leagues)
const ALL_LEAGUES = [
  { id: 'laliga', getter: getLaLigaTeams },
  { id: 'segunda', getter: getSegundaTeams },
  { id: 'primeraRFEF', getter: getPrimeraRfefTeams },
  { id: 'segundaRFEF', getter: getSegundaRfefTeams },
  { id: 'premierLeague', getter: getPremierTeams },
  { id: 'serieA', getter: getSerieATeams },
  { id: 'bundesliga', getter: getBundesligaTeams },
  { id: 'ligue1', getter: getLigue1Teams },
  { id: 'eredivisie', getter: getEredivisieTeams },
  { id: 'primeiraLiga', getter: getPrimeiraLigaTeams },
  { id: 'championship', getter: getChampionshipTeams },
  { id: 'belgianPro', getter: getBelgianProTeams },
  { id: 'superLig', getter: getSuperLigTeams },
  { id: 'scottishPrem', getter: getScottishPremTeams },
  { id: 'serieB', getter: getSerieBTeams },
  { id: 'bundesliga2', getter: getBundesliga2Teams },
  { id: 'ligue2', getter: getLigue2Teams },
  { id: 'swissSuperLeague', getter: getSwissTeams },
  { id: 'austrianBundesliga', getter: getAustrianTeams },
  { id: 'greekSuperLeague', getter: getGreekTeams },
  { id: 'danishSuperliga', getter: getDanishTeams },
  { id: 'croatianLeague', getter: getCroatianTeams },
  { id: 'czechLeague', getter: getCzechTeams },
  { id: 'argentinaPrimera', getter: getArgentinaTeams },
  { id: 'brasileiraoA', getter: getBrasileiraoTeams },
  { id: 'colombiaPrimera', getter: getColombiaTeams },
  { id: 'chilePrimera', getter: getChileTeams },
  { id: 'uruguayPrimera', getter: getUruguayTeams },
  { id: 'ecuadorLigaPro', getter: getEcuadorTeams },
  { id: 'paraguayPrimera', getter: getParaguayTeams },
  { id: 'peruLiga1', getter: getPeruTeams },
  { id: 'boliviaPrimera', getter: getBoliviaTeams },
  { id: 'venezuelaPrimera', getter: getVenezuelaTeams },
  { id: 'mls', getter: getMLSTeams },
  { id: 'saudiPro', getter: getSaudiTeams },
  { id: 'ligaMX', getter: getLigaMXTeams },
  { id: 'jLeague', getter: getJLeagueTeams },
].map(l => ({
  ...l,
  name: LEAGUE_CONFIG[l.id]?.name || l.id,
  country: LEAGUE_CONFIG[l.id]?.country || ''
}));

// Ligas que NO aplican para contrarreloj
// primeraRFEF excluida (grupos manejados automáticamente para segundaRFEF)
const EXCLUDED_LEAGUES = ['primeraRFEF'];

function getAvgOverall(team) {
  if (!team?.players?.length) return 0;
  return Math.round(team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length);
}

function formatMoney(amount) {
  if (!amount) return '€0';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  return `€${(amount / 1000).toFixed(0)}K`;
}

function getSquadValue(team) {
  return (team?.players || []).reduce((sum, p) => sum + (p.value || 0), 0);
}

const COUNTRY_LEAGUE_LABELS = {
  'España': 'Liga española',
  'Inglaterra': 'Liga inglesa',
  'Italia': 'Liga italiana',
  'Alemania': 'Liga alemana',
  'Francia': 'Liga francesa',
  'Países Bajos': 'Liga neerlandesa',
  'Portugal': 'Liga portuguesa',
  'Bélgica': 'Liga belga',
  'Turquía': 'Liga turca',
  'Escocia': 'Liga escocesa',
  'Suiza': 'Liga suiza',
  'Austria': 'Liga austríaca',
  'Grecia': 'Liga griega',
  'Dinamarca': 'Liga danesa',
  'Croacia': 'Liga croata',
  'Chequia': 'Liga checa',
  'Argentina': 'Liga argentina',
  'Brasil': 'Liga brasileña',
  'Colombia': 'Liga colombiana',
  'Chile': 'Liga chilena',
  'Uruguay': 'Liga uruguaya',
  'Ecuador': 'Liga ecuatoriana',
  'Paraguay': 'Liga paraguaya',
  'Perú': 'Liga peruana',
  'Bolivia': 'Liga boliviana',
  'Venezuela': 'Liga venezolana'
};

function getCountryLeagueLabel(country) {
  return COUNTRY_LEAGUE_LABELS[country] || (country ? `Liga de ${country}` : '');
}

function ensureBudgetAndReputation(team, leagueId) {
  const tierBudgets = {
    1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
    2: { pct: 0.10, min: 5_000_000, max: 120_000_000 },
    3: { pct: 0.07, min: 1_500_000, max: 30_000_000 },
    4: { pct: 0.05, min: 300_000, max: 5_000_000 },
    5: { pct: 0.03, min: 100_000, max: 1_500_000 }
  };
  const currentTier = getLeagueTier(leagueId);
  const budgetConfig = tierBudgets[currentTier] || tierBudgets[3];

  const avgOverall = team.players?.length
    ? team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length : 70;
  const totalValue = (team.players || []).reduce((sum, p) => sum + (p.value || 0), 0);

  if (!team.reputation || team.reputation < 1 || team.reputation > 5) {
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

export default function ContrarrelojSetup() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { user, isAuthenticated } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [rerollKey, setRerollKey] = useState(0);

  // Generate 5 random low-reputation teams from all leagues
  // South American league IDs
  const SA_LEAGUES = new Set([
    'argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
    'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
    'boliviaPrimera', 'venezuelaPrimera'
  ]);

  const candidates = useMemo(() => {
    const europePool = [];
    const saPool = [];

    // Solo Europa y Sudamérica — las ligas de "Resto del Mundo" no participan en contrarreloj
    const REST_OF_WORLD = new Set(['mls', 'saudiPro', 'ligaMX', 'jLeague']);

    for (const league of ALL_LEAGUES) {
      if (EXCLUDED_LEAGUES.includes(league.id)) continue;
      if (REST_OF_WORLD.has(league.id)) continue;
      try {
        const teams = league.getter();
        if (!teams || teams.length === 0) continue;
        for (const team of teams) {
          // Excluir filiales españoles (no pueden ascender a la misma liga que su primer equipo)
          if (team.name && /\sB$/i.test(team.name.trim())) continue;
          const t = { ...team };
          ensureBudgetAndReputation(t, league.id);
          const tier = getLeagueTier(league.id);
          if (t.reputation <= 2 || tier >= 3) {
            const entry = {
              team: t,
              leagueId: league.id,
              leagueName: league.name,
              leagueCountry: league.country,
              leagueRegionLabel: getCountryLeagueLabel(league.country),
              tier
            };
            if (SA_LEAGUES.has(league.id)) saPool.push(entry);
            else europePool.push(entry);
          }
        }
      } catch { /* skip */ }
    }

    // Shuffle each pool
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);
    shuffle(europePool);
    shuffle(saPool);

    // Guarantee at least 1 Europe + 1 South America, fill rest randomly
    const picked = [];
    if (europePool.length > 0) picked.push(europePool.shift());
    if (saPool.length > 0) picked.push(saPool.shift());

    // Combine remaining pools and fill up to 5
    const remaining = shuffle([...europePool, ...saPool]);
    while (picked.length < 5 && remaining.length > 0) {
      picked.push(remaining.shift());
    }

    // Shuffle final order so SA/EU aren't always first
    return shuffle(picked);
  }, [rerollKey]);

  const handleReroll = () => {
    setSelectedTeam(null);
    setSelectedLeagueId(null);
    setRerollKey(k => k + 1);
  };

  const handleSelect = (candidate) => {
    setSelectedTeam(candidate.team);
    setSelectedLeagueId(candidate.leagueId);
  };

  const activeCandidate = candidates.find(c => c.team.id === selectedTeam?.id) || candidates[0] || null;
  const activeTeam = selectedTeam || activeCandidate?.team || null;
  const activeLeagueId = selectedLeagueId || activeCandidate?.leagueId || null;
  const activeAvg = activeTeam ? getAvgOverall(activeTeam) : 0;
  const activeSquadCount = activeTeam?.players?.length || 0;
  const activeSquadValue = activeTeam ? formatMoney(getSquadValue(activeTeam)) : '€0';
  const activeBudget = activeTeam ? formatMoney(activeTeam.budget) : '€0';
  const activeDifficulty = activeAvg >= 72 ? 'Duro' : activeAvg >= 66 ? 'Muy duro' : 'Épico';
  const activeDifficultyClass = activeAvg >= 72 ? 'hard' : activeAvg >= 66 ? 'extreme' : 'legend';

  const handleStart = async () => {
    const startTeam = selectedTeam || activeCandidate?.team;
    const startLeagueId = selectedLeagueId || activeCandidate?.leagueId;
    if (!startTeam || !startLeagueId || starting) return;
    if (!selectedTeam && activeCandidate) {
      setSelectedTeam(activeCandidate.team);
      setSelectedLeagueId(activeCandidate.leagueId);
    }
    setStarting(true);

    const leagueId = startLeagueId;
    const team = startTeam;

    // Get league teams for this league
    const leagueEntry = ALL_LEAGUES.find(l => l.id === leagueId);
    if (!leagueEntry) return;
    
    // Handle group leagues (Segunda RFEF, Primera RFEF): find the team's group
    const GROUP_LEAGUES = {
      segundaRFEF: getSegundaRfefGroups,
      primeraRFEF: getPrimeraRfefGroups
    };
    
    let leagueTeams;
    let playerGroupId = null;
    
    if (GROUP_LEAGUES[leagueId]) {
      const groups = GROUP_LEAGUES[leagueId]();
      // Find which group this team belongs to
      for (const [groupId, groupData] of Object.entries(groups)) {
        const groupTeams = groupData?.teams || groupData || [];
        if (groupTeams.some(t => t.id === team.id)) {
          leagueTeams = groupTeams;
          playerGroupId = groupId;
          break;
        }
      }
      // Fallback: if team not found in any group, use all teams (shouldn't happen)
      if (!leagueTeams) leagueTeams = leagueEntry.getter();
    } else {
      leagueTeams = leagueEntry.getter();
    }
    
    const leagueData = initializeLeague(leagueTeams, team.id);

    const stadiumInfo = getStadiumInfo(team.id, team.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);

    // Generate preseason (pick first option automatically)
    const allTeamsFlat = [];
    for (const l of ALL_LEAGUES) {
      try { allTeamsFlat.push(...l.getter()); } catch { /* skip */ }
    }
    const preseasonOptions = generatePreseasonOptions(allTeamsFlat, team, leagueId);
    const preseason = preseasonOptions[0];

    // Get manager name from Firebase Auth
    const authUser = getAuth().currentUser;
    const managerName = authUser?.displayName || authUser?.email?.split('@')[0] || undefined;

    dispatch({
      type: 'NEW_GAME',
      payload: {
        teamId: team.id,
        team: { ...team },
        leagueId,
        group: playerGroupId,
        stadiumInfo,
        stadiumLevel,
        preseasonMatches: preseason?.matches || [],
        preseasonPhase: true,
        gameMode: 'contrarreloj',
        _contrarrelojUserId: user?.isGuest ? null : (user?.uid || null),
        managerName
      }
    });

    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: leagueId });
    
    // For group leagues, store the player's group ID
    if (playerGroupId) {
      dispatch({ type: 'SET_PLAYER_GROUP', payload: playerGroupId });
    }

    // Load ALL league teams for the global transfer engine
    const allLeagueTeamsWithData = [];
    for (const league of ALL_LEAGUES) {
      try {
        const teams = league.getter();
        for (const t of teams) {
          allLeagueTeamsWithData.push({
            ...t, id: t.id, name: t.name, players: t.players || [],
            budget: t.budget || (t.reputation > 4 ? 100_000_000 : t.reputation > 3 ? 50_000_000 : 20_000_000),
            leagueId: league.id
          });
        }
      } catch { /* skip */ }
    }
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });

    const otherLeagues = initializeOtherLeagues(leagueId, playerGroupId);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    // Bootstrap continental competitions
    const isPlayerInSA = isSouthAmericanLeague(leagueId);

    if (isPlayerInSA) {
      try {
        const bootstrapStandings = {};
        const allTeamsMap = {};
        for (const [lid, slots] of Object.entries(SA_LEAGUE_SLOTS)) {
          const config = LEAGUE_CONFIG[lid];
          if (!config?.getTeams) continue;
          const lt = config.getTeams();
          if (!lt?.length) continue;
          const sorted = [...lt].sort((a, b) => (b.reputation || 70) - (a.reputation || 70));
          bootstrapStandings[lid] = sorted.map((t, idx) => ({
            teamId: t.id || t.teamId, teamName: t.name || t.teamName,
            shortName: t.shortName || '', reputation: t.reputation || 70,
            overall: t.overall || 70, leaguePosition: idx + 1
          }));
          lt.forEach(t => { allTeamsMap[t.id || t.teamId] = t; });
        }
        const qualifiedTeams = qualifyTeamsForSouthAmerica(bootstrapStandings, allTeamsMap);
        const usedTeamIds = new Set();
        Object.values(qualifiedTeams).forEach(teams => teams.forEach(t => usedTeamIds.add(t.teamId)));
        const available = Object.values(allTeamsMap).filter(t => !usedTeamIds.has(t.id || t.teamId)).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        for (const compId of ['copaLibertadores', 'copaSudamericana']) {
          const needed = 32 - qualifiedTeams[compId].length;
          if (needed > 0) {
            const fillers = available.splice(0, needed);
            qualifiedTeams[compId].push(...fillers.map(t => ({
              teamId: t.id || t.teamId, teamName: t.name || t.teamName,
              shortName: t.shortName || '', league: t.league || 'unknown',
              leaguePosition: 0, reputation: t.reputation || 60,
              overall: t.overall || 65, players: t.players || [], ...t
            })));
            fillers.forEach(t => usedTeamIds.add(t.id || t.teamId));
          }
        }
        dispatch({ type: 'INIT_SA_COMPETITIONS', payload: initializeSACompetitions(qualifiedTeams) });
      } catch (err) { console.error('Error bootstrapping SA comps:', err); }
    } else {
      try {
        const allTeamsMap = {};
        for (const lid of Object.keys(LEAGUE_SLOTS)) {
          const lt = LEAGUE_CONFIG[lid]?.getTeams?.();
          (lt || []).forEach(t => { allTeamsMap[t.id || t.teamId] = t; });
        }
        const bootstrapStandings = ensureEuropeanLeagueStandings(
          {},
          (lid) => LEAGUE_CONFIG[lid]?.getTeams?.()
        );
        const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
        dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: initializeEuropeanCompetitions(qualifiedTeams) });
      } catch (err) {
        console.error('Error bootstrapping European comps:', err);
      }
    }

    // Cup competition
    let cupBracket = null;
    let cupRounds = 0;
    try {
      const cupData = getCupTeams(leagueId, team, {}, leagueData.table);
      if (cupData?.teams.length >= 2) {
        cupBracket = generateCupBracket(cupData.teams, team.id);
        if (cupBracket) cupRounds = cupBracket.rounds.length;
      }
    } catch { /* skip */ }
    if (cupBracket) dispatch({ type: 'INIT_CUP_COMPETITION', payload: cupBracket });

    // Season calendar
    try {
      const totalLeagueMDs = leagueData.fixtures.length > 0
        ? Math.max(...leagueData.fixtures.map(f => f.week)) : 38;
      const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds });
      const remappedFixtures = remapFixturesForEuropean(leagueData.fixtures, europeanCalendar.leagueWeekMap);
      dispatch({ type: 'SET_FIXTURES', payload: remappedFixtures });
      dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
    } catch { /* skip */ }

    const objectives = generateSeasonObjectives(team, leagueId, leagueData.table);
    dispatch({ type: 'SET_SEASON_OBJECTIVES', payload: objectives });

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'contrarreloj',
        title: `⏱️ ${t('contrarreloj.activated')}`,
        content: t('contrarreloj.objectiveMessage', {
          competition: isPlayerInSA ? t('contrarreloj.southAmericanCup') : t('contrarreloj.continentalCup'),
          team: team.name
        }),
        date: `${t('common.week')} 1`
      }
    });
  };

  return (
    <div className="contrarreloj-setup unified-screen">
      <div className="contrarreloj-setup__bg">
        <div className="contrarreloj-setup__gradient" />
        <div className="contrarreloj-setup__particles">
          {[...Array(8)].map((_, i) => <div key={i} className={`particle particle--${i}`} />)}
        </div>
      </div>

      <div className="contrarreloj-setup__content">
        {/* Header */}
        <div className="contrarreloj-setup__header">
          <button className="btn-back" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })}>
            <ArrowLeft size={16} /> {t('contrarrelojSetup.menu')}
          </button>
          <div className="header-title">
            <div className="timer-stage" aria-hidden="true">
              <div className="timer-stage__glow" />
              <span className="timer-stage__speed timer-stage__speed--top" />
              <span className="timer-stage__speed timer-stage__speed--mid" />
              <span className="timer-stage__speed timer-stage__speed--low" />
              <div className="timer-stage__dial">
                <span className="timer-stage__crown" />
                <span className="timer-stage__rim" />
                <span className="timer-stage__ring timer-stage__ring--outer" />
                <span className="timer-stage__ring timer-stage__ring--inner" />
                <span className="timer-stage__marker timer-stage__marker--12" />
                <span className="timer-stage__marker timer-stage__marker--2" />
                <span className="timer-stage__marker timer-stage__marker--4" />
                <span className="timer-stage__marker timer-stage__marker--6" />
                <span className="timer-stage__marker timer-stage__marker--8" />
                <span className="timer-stage__marker timer-stage__marker--10" />
                <span className="timer-stage__needle timer-stage__needle--minutes" />
                <span className="timer-stage__needle timer-stage__needle--seconds" />
                <span className="timer-stage__hub" />
              </div>
            </div>
            <div className="header-copy">
              <span className="mode-kicker">Modo límite · Carrera a contrarreloj</span>
              <h1>{t('contrarrelojSetup.title')}</h1>
              <p className="subtitle">{t('contrarrelojSetup.subtitle')}</p>
            </div>
            <div className="header-scoreboard" aria-hidden="true">
              <span>00:00</span>
              <small>El tiempo no perdona</small>
            </div>
          </div>
        </div>

        {/* Challenge info */}
        <div className="contrarreloj-setup__challenge">
          <div className="challenge-card">
            <Trophy size={20} className="icon gold" />
            <div>
              <strong>{t('contrarrelojSetup.objective')}</strong>
              <span>{t('contrarrelojSetup.winChampions')}</span>
            </div>
          </div>
          <div className="challenge-card">
            <AlertTriangle size={20} className="icon red" />
            <div>
              <strong>{t('contrarrelojSetup.losesIf')}</strong>
              <span>{t('contrarrelojSetup.fired')}</span>
            </div>
          </div>
          <div className="challenge-card">
            <Zap size={20} className="icon amber" />
            <div>
              <strong>{t('contrarrelojSetup.ranking')}</strong>
              <span>{t('contrarrelojSetup.fewestSeasons')}</span>
            </div>
          </div>
        </div>

        {/* Team selection */}
        <div className="contrarreloj-setup__board">
          <section className="contrarreloj-setup__teams">
            <div className="teams-header">
              <h2>{t('contrarrelojSetup.chooseChallenge')}</h2>
              <button className="btn-reroll" onClick={handleReroll}>
                <RefreshCw size={16} /> {t('contrarrelojSetup.newTeams')}
              </button>
            </div>

            <div className="teams-grid" role="list">
              {candidates.map((c, idx) => {
                const avg = getAvgOverall(c.team);
                const isSelected = activeTeam?.id === c.team.id;
                const diffClass = avg >= 72 ? 'hard' : avg >= 66 ? 'extreme' : 'legend';
                const squadValue = formatMoney(getSquadValue(c.team));
                return (
                  <button
                    key={c.team.id || idx}
                    className={`team-card team-card--${diffClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(c)}
                    role="listitem"
                  >
                    <span className="team-card__rank">{idx + 1}</span>
                    <div className="team-card__crest"><TeamCrest teamId={c.team.id} size={54} /></div>
                    <div className="team-card__info">
                      <span className="name">{c.team.name}</span>
                      <span className="league">{c.leagueName}{c.leagueRegionLabel ? ` · ${c.leagueRegionLabel}` : ''}</span>
                    </div>
                    <div className="team-card__stats">
                      <div className="stat">
                        <Users size={14} />
                        <span>{avg} {t('contrarrelojSetup.ovr')}</span>
                      </div>
                      <div className="stat">
                        <DollarSign size={14} />
                        <span>{formatMoney(c.team.budget)}</span>
                      </div>
                      <div className="stat">
                        <Star size={14} />
                        <span>{squadValue}</span>
                      </div>
                    </div>
                    {isSelected && <div className="selected-indicator"><ChevronRight size={20} /></div>}
                  </button>
                );
              })}
            </div>
          </section>

          {activeTeam && (
            <aside className={`contrarreloj-setup__detail contrarreloj-setup__detail--${activeDifficultyClass}`}>
              <div className="detail-card">
                <div className="detail-card__crest"><TeamCrest teamId={activeTeam.id} size={96} /></div>
                <span className="detail-card__eyebrow">
                  {activeCandidate?.leagueName}{activeCandidate?.leagueRegionLabel ? ` · ${activeCandidate.leagueRegionLabel}` : ''}
                </span>
                <h3>{activeTeam.name}</h3>
                <p>{t('contrarrelojSetup.goal')} {isSouthAmericanLeague(activeLeagueId) ? t('contrarrelojSetup.libertadores') : t('contrarrelojSetup.championsLeague')}</p>

                <div className="detail-card__stats">
                  <div><span>{t('contrarrelojSetup.ovr')}</span><strong>{activeAvg}</strong></div>
                  <div><span>Plantilla</span><strong>{activeSquadCount}</strong></div>
                  <div><span>Presupuesto</span><strong>{activeBudget}</strong></div>
                  <div><span>Valor</span><strong>{activeSquadValue}</strong></div>
                </div>

                <div className="detail-card__briefing">
                  <div><span>Dificultad</span><strong>{activeDifficulty}</strong></div>
                  <div><span>Objetivo</span><strong>{isSouthAmericanLeague(activeLeagueId) ? 'Libertadores' : 'Champions'}</strong></div>
                  <div><span>Ranking</span><strong>Temporadas mínimas</strong></div>
                </div>

                <button className="btn-start" onClick={handleStart} disabled={starting}>
                  <Timer size={22} />
                  {starting ? t('contrarrelojSetup.starting') : t('contrarrelojSetup.acceptChallenge')}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
