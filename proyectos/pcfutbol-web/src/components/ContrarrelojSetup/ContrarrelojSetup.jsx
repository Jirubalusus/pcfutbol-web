import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { getLeagueTier } from '../../game/leagueTiers';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeOtherLeagues, LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
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
import { Timer, ArrowLeft, RefreshCw, Zap, Users, DollarSign, Star, ChevronRight, Trophy, AlertTriangle } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './ContrarrelojSetup.scss';

// Liga → getter
const ALL_LEAGUES = [
  { id: 'laliga', getter: getLaLigaTeams, name: 'La Liga' },
  { id: 'segunda', getter: getSegundaTeams, name: 'La Liga Hypermotion' },
  { id: 'primeraRFEF', getter: getPrimeraRfefTeams, name: 'Primera Federación' },
  { id: 'segundaRFEF', getter: getSegundaRfefTeams, name: 'Segunda Federación' },
  { id: 'premierLeague', getter: getPremierTeams, name: 'Premier League' },
  { id: 'serieA', getter: getSerieATeams, name: 'Serie A' },
  { id: 'bundesliga', getter: getBundesligaTeams, name: 'Bundesliga' },
  { id: 'ligue1', getter: getLigue1Teams, name: 'Ligue 1' },
  { id: 'eredivisie', getter: getEredivisieTeams, name: 'Eredivisie' },
  { id: 'primeiraLiga', getter: getPrimeiraLigaTeams, name: 'Primeira Liga' },
  { id: 'championship', getter: getChampionshipTeams, name: 'Championship' },
  { id: 'belgianPro', getter: getBelgianProTeams, name: 'Jupiler Pro League' },
  { id: 'superLig', getter: getSuperLigTeams, name: 'Süper Lig' },
  { id: 'scottishPrem', getter: getScottishPremTeams, name: 'Scottish Premiership' },
  { id: 'serieB', getter: getSerieBTeams, name: 'Serie B' },
  { id: 'bundesliga2', getter: getBundesliga2Teams, name: '2. Bundesliga' },
  { id: 'ligue2', getter: getLigue2Teams, name: 'Ligue 2' },
  { id: 'swissSuperLeague', getter: getSwissTeams, name: 'Super League (CH)' },
  { id: 'austrianBundesliga', getter: getAustrianTeams, name: 'Bundesliga (AT)' },
  { id: 'greekSuperLeague', getter: getGreekTeams, name: 'Super League (GR)' },
  { id: 'danishSuperliga', getter: getDanishTeams, name: 'Superligaen' },
  { id: 'croatianLeague', getter: getCroatianTeams, name: 'HNL' },
  { id: 'czechLeague', getter: getCzechTeams, name: 'Chance Liga' },
  { id: 'argentinaPrimera', getter: getArgentinaTeams, name: 'Liga Profesional' },
  { id: 'brasileiraoA', getter: getBrasileiraoTeams, name: 'Série A' },
  { id: 'colombiaPrimera', getter: getColombiaTeams, name: 'Liga BetPlay' },
  { id: 'chilePrimera', getter: getChileTeams, name: 'Primera División (CL)' },
  { id: 'uruguayPrimera', getter: getUruguayTeams, name: 'Primera División (UY)' },
  { id: 'ecuadorLigaPro', getter: getEcuadorTeams, name: 'LigaPro' },
  { id: 'paraguayPrimera', getter: getParaguayTeams, name: 'División de Honor' },
  { id: 'peruLiga1', getter: getPeruTeams, name: 'Liga 1' },
  { id: 'boliviaPrimera', getter: getBoliviaTeams, name: 'División Profesional' },
  { id: 'venezuelaPrimera', getter: getVenezuelaTeams, name: 'Liga FUTVE' },
  { id: 'mls', getter: getMLSTeams, name: 'Major League Soccer' },
  { id: 'saudiPro', getter: getSaudiTeams, name: 'Saudi Pro League' },
  { id: 'ligaMX', getter: getLigaMXTeams, name: 'Liga MX' },
  { id: 'jLeague', getter: getJLeagueTeams, name: 'J1 League' },
];

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

export default function ContrarrelojSetup() {
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
            const entry = { team: t, leagueId: league.id, leagueName: league.name, tier };
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

  const handleStart = async () => {
    if (!selectedTeam || !selectedLeagueId || starting) return;
    setStarting(true);

    const leagueId = selectedLeagueId;
    const team = selectedTeam;

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
        _contrarrelojUserId: user?.uid || null
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
        const bootstrapStandings = {};
        const allTeamsMap = {};
        for (const [lid, slots] of Object.entries(LEAGUE_SLOTS)) {
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
        const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
        const usedTeamIds = new Set();
        Object.values(qualifiedTeams).forEach(teams => teams.forEach(t => usedTeamIds.add(t.teamId)));
        const available = Object.values(allTeamsMap).filter(t => !usedTeamIds.has(t.id || t.teamId)).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
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
        dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: initializeEuropeanCompetitions(qualifiedTeams) });
      } catch (err) { console.error('Error bootstrapping European comps:', err); }
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
        title: '⏱️ ¡Modo Contrarreloj activado!',
        content: `Objetivo: ganar la ${isPlayerInSA ? 'Copa Libertadores' : 'Champions League'} con ${team.name} en el menor número de temporadas. ¡El reloj corre!`,
        date: 'Semana 1'
      }
    });
  };

  return (
    <div className="contrarreloj-setup">
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
            <ArrowLeft size={20} /> Menú
          </button>
          <div className="header-title">
            <Timer size={32} className="timer-icon" />
            <div>
              <h1>CONTRARRELOJ</h1>
              <p className="subtitle">¿Puedes llegar a la cima del fútbol europeo/sudamericano?</p>
            </div>
          </div>
        </div>

        {/* Challenge info */}
        <div className="contrarreloj-setup__challenge">
          <div className="challenge-card">
            <Trophy size={20} className="icon gold" />
            <div>
              <strong>Objetivo</strong>
              <span>Ganar la Champions League o Copa Libertadores</span>
            </div>
          </div>
          <div className="challenge-card">
            <AlertTriangle size={20} className="icon red" />
            <div>
              <strong>Pierdes si</strong>
              <span>Te despiden o tu presupuesto llega a negativo</span>
            </div>
          </div>
          <div className="challenge-card">
            <Zap size={20} className="icon amber" />
            <div>
              <strong>Ranking</strong>
              <span>El menor número de temporadas gana</span>
            </div>
          </div>
        </div>

        {/* Team selection */}
        <div className="contrarreloj-setup__teams">
          <div className="teams-header">
            <h2>Elige tu desafío</h2>
            <button className="btn-reroll" onClick={handleReroll}>
              <RefreshCw size={16} /> Nuevos equipos
            </button>
          </div>

          <div className="teams-grid">
            {candidates.map((c, idx) => {
              const avg = getAvgOverall(c.team);
              const isSelected = selectedTeam?.id === c.team.id;
              return (
                <button
                  key={c.team.id || idx}
                  className={`team-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(c)}
                >
                  <div className="team-card__badge"
                    style={{
                      background: c.team.colors?.primary || '#1a3a5a',
                      color: c.team.colors?.secondary || '#fff'
                    }}
                  >
                    {c.team.shortName?.slice(0, 3) || c.team.name?.slice(0, 3)}
                  </div>
                  <div className="team-card__info">
                    <span className="name">{c.team.name}</span>
                    <span className="league">{c.leagueName}</span>
                  </div>
                  <div className="team-card__stats">
                    <div className="stat">
                      <Users size={12} />
                      <span>{avg} OVR</span>
                    </div>
                    <div className="stat">
                      <DollarSign size={12} />
                      <span>{formatMoney(c.team.budget)}</span>
                    </div>
                    <div className="stat">
                      <Star size={12} />
                      <span>{c.team.reputation}★</span>
                    </div>
                  </div>
                  {isSelected && <div className="selected-indicator"><ChevronRight size={20} /></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected team detail + start */}
        {selectedTeam && (
          <div className="contrarreloj-setup__confirm">
            <div className="confirm-team">
              <div className="badge-large"
                style={{
                  background: selectedTeam.colors?.primary || '#1a3a5a',
                  color: selectedTeam.colors?.secondary || '#fff'
                }}
              >
                {selectedTeam.shortName || selectedTeam.name?.slice(0, 3)}
              </div>
              <div className="confirm-info">
                <h3>{selectedTeam.name}</h3>
                <p>{candidates.find(c => c.team.id === selectedTeam.id)?.leagueName}</p>
                <p className="target">
                  Meta: {isSouthAmericanLeague(selectedLeagueId) ? '🏆 Copa Libertadores' : '🏆 Champions League'}
                </p>
              </div>
            </div>
            <button className="btn-start" onClick={handleStart} disabled={starting}>
              <Timer size={20} />
              {starting ? 'Iniciando...' : '¡ACEPTAR EL DESAFÍO!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
