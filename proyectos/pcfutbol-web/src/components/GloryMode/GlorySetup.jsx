import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Trophy, Shirt, Shield, PenLine, MapPin, ChevronRight } from 'lucide-react';
import BadgeEditor, { BadgePreview } from './BadgeEditor';
import KitEditor, { KitPreview } from './KitEditor';
import { getGlorySquad } from '../../data/fictionalPlayers';
import { getSegundaRfefGroups } from '../../data/teamsFirestore';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeOtherLeagues, LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import { qualifyTeamsForEurope, LEAGUE_SLOTS, buildSeasonCalendar, remapFixturesForEuropean } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { initializeSACompetitions } from '../../game/southAmericanSeason';
import './GloryMode.scss';

const STEPS = ['info', 'badge', 'kit', 'confirm'];

export default function GlorySetup() {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [badge, setBadge] = useState({ shape: 'shield', color1: '#1a237e', color2: '#ffd740', icon: 'star' });
  const [kit, setKit] = useState({ style: 'solid', primary: '#1a237e', secondary: '#ffd740' });

  const canProceed = () => {
    if (step === 0) return teamName.trim().length >= 2;
    return true;
  };

  const handleStart = () => {
    const name = teamName.trim() || 'FC Gloria';
    const stadium = stadiumName.trim() || 'Estadio Municipal';

    // Build the fictional team in the same format as real teams
    const gloryPlayers = getGlorySquad();
    const gloryTeam = {
      id: 'glory_team',
      name: name,
      shortName: name.substring(0, 3).toUpperCase(),
      badge: null,
      budget: 200000,
      reputation: 1,
      players: gloryPlayers,
    };

    // Pick a random Segunda RFEF group
    const groups = getSegundaRfefGroups();
    const groupKeys = Object.keys(groups).filter(k => groups[k].teams && groups[k].teams.length > 0);
    
    if (groupKeys.length === 0) {
      // Fallback if teams aren't loaded yet
      console.error('[GlorySetup] No teams loaded in Segunda RFEF groups');
      return;
    }

    const randomGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
    const groupTeams = [...groups[randomGroupKey].teams];

    // Replace a random team in the group with our glory team
    const replaceIndex = Math.floor(Math.random() * groupTeams.length);
    groupTeams[replaceIndex] = gloryTeam;

    // Initialize league with modified team list
    const leagueData = initializeLeague(groupTeams, 'glory_team');

    // Dispatch NEW_GAME
    dispatch({
      type: 'NEW_GAME',
      payload: {
        teamId: 'glory_team',
        team: gloryTeam,
        leagueId: 'segundaRFEF',
        group: randomGroupKey,
        gameMode: 'glory',
        managerName: state.managerName || 'Manager',
        managerConfidence: 80,
        stadiumInfo: { name: stadium, capacity: 3000 },
        stadiumLevel: 0,
        preseasonPhase: false,
        preseasonMatches: [],
        gloryData: {
          badge,
          kit,
          teamName: name,
          stadiumName: stadium,
          season: 1,
          division: 'segundaRFEF',
          pickedCards: [],
          perks: {},
          trophies: [],
          history: [],
          championsWon: false,
        },
      },
    });

    // Set league table (fixtures set later after European calendar remapping — #24)
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: 'segundaRFEF' });
    dispatch({ type: 'SET_PLAYER_GROUP', payload: randomGroupKey });

    // Initialize other leagues (same as career/contrarreloj modes)
    const otherLeagues = initializeOtherLeagues('segundaRFEF', randomGroupKey);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    // Build allLeagueTeams for Transfers Explorar tab
    const allLeagueTeamsWithData = [];
    Object.entries(LEAGUE_CONFIG).forEach(([leagueId, config]) => {
      if (config.isGroupLeague) {
        const groupsFn = config.getGroups;
        if (groupsFn) {
          const groups = groupsFn();
          Object.values(groups).forEach(teams => {
            (teams || []).forEach(t => {
              allLeagueTeamsWithData.push({ ...t, leagueId, players: t.players || [], budget: t.budget || 20_000_000 });
            });
          });
        }
      } else {
        const teams = config.getTeams();
        (teams || []).forEach(t => {
          allLeagueTeamsWithData.push({ ...t, leagueId, players: t.players || [], budget: t.budget || (t.reputation > 4 ? 100_000_000 : t.reputation > 3 ? 50_000_000 : 20_000_000) });
        });
      }
    });
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });

    // Cup competition
    let cupRounds = 0;
    try {
      const cupData = getCupTeams('segundaRFEF', gloryTeam, {}, leagueData.table);
      if (cupData?.teams?.length >= 4) {
        const bracket = generateCupBracket(cupData.teams, 'glory_team');
        if (bracket) {
          dispatch({ type: 'INIT_CUP_COMPETITION', payload: bracket });
          cupRounds = bracket.rounds?.length || 0;
        }
      }
    } catch (e) { console.warn('Glory cup init error:', e); }

    // European competitions bootstrap
    try {
      const bootstrapStandings = {};
      const allTeamsMap = {};
      for (const [lid, slots] of Object.entries(LEAGUE_SLOTS)) {
        const config = LEAGUE_CONFIG[lid];
        if (!config) continue;
        const teams = config.getTeams ? config.getTeams() : null;
        if (!teams?.length) continue;
        const sorted = [...teams].sort((a, b) => (b.reputation || 70) - (a.reputation || 70));
        bootstrapStandings[lid] = sorted.map((t, idx) => ({
          teamId: t.id || t.teamId, teamName: t.name || t.teamName,
          shortName: t.shortName || '', reputation: t.reputation || 70,
          overall: t.overall || 70, leaguePosition: idx + 1
        }));
        teams.forEach(t => { allTeamsMap[t.id || t.teamId] = t; });
      }
      const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
      // Fill any gaps
      const usedTeamIds = new Set();
      Object.values(qualifiedTeams).forEach(ts => ts.forEach(t => usedTeamIds.add(t.teamId)));
      const available = Object.values(allTeamsMap).filter(t => !usedTeamIds.has(t.id || t.teamId)).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
      for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
        const needed = 32 - (qualifiedTeams[compId]?.length || 0);
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
    } catch (e) { console.warn('Glory Euro comps init error:', e); }

    // Season calendar with European weeks
    try {
      const totalLeagueMDs = leagueData.fixtures.length > 0
        ? Math.max(...leagueData.fixtures.map(f => f.week)) : 38;
      const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds });
      const remappedFixtures = remapFixturesForEuropean(leagueData.fixtures, europeanCalendar.leagueWeekMap);
      dispatch({ type: 'SET_FIXTURES', payload: remappedFixtures });
      dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
    } catch (e) {
      console.warn('Glory calendar init error:', e);
      // Fallback: set original fixtures without European remapping
      dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    }

    // Set glory user ID for auto-save
    if (user?.uid) {
      dispatch({ type: 'SET_GLORY_USER_ID', payload: user.uid });
    }
  };

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'info':
        return (
          <div className="glory-setup__step fade-in-up">
            <div className="glory-setup__step-icon">
              <PenLine size={28} />
            </div>
            <h3 className="glory-setup__step-title">Crea tu club</h3>
            <p className="glory-setup__step-desc">Dale nombre a tu proyecto. Empezarás en Segunda RFEF con jugadores desconocidos y un sueño.</p>

            <div className="glory-setup__field">
              <label>Nombre del club</label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="FC Gloria"
                maxLength={30}
                autoFocus
              />
            </div>

            <div className="glory-setup__field">
              <label>Nombre del estadio</label>
              <input
                type="text"
                value={stadiumName}
                onChange={e => setStadiumName(e.target.value)}
                placeholder="Estadio Municipal"
                maxLength={30}
              />
            </div>
          </div>
        );

      case 'badge':
        return (
          <div className="glory-setup__step fade-in-up">
            <div className="glory-setup__step-icon">
              <Shield size={28} />
            </div>
            <h3 className="glory-setup__step-title">Diseña tu escudo</h3>
            <p className="glory-setup__step-desc">La identidad visual de tu club empieza aquí.</p>
            <BadgeEditor value={badge} onChange={setBadge} />
          </div>
        );

      case 'kit':
        return (
          <div className="glory-setup__step fade-in-up">
            <div className="glory-setup__step-icon">
              <Shirt size={28} />
            </div>
            <h3 className="glory-setup__step-title">Equipación</h3>
            <p className="glory-setup__step-desc">Los colores que te representarán en el camino a la gloria.</p>
            <KitEditor value={kit} onChange={setKit} />
          </div>
        );

      case 'confirm':
        return (
          <div className="glory-setup__step glory-setup__confirm fade-in-up">
            <div className="glory-setup__confirm-header">
              <BadgePreview badge={badge} size={80} />
              <div className="glory-setup__confirm-info">
                <h3>{teamName || 'FC Gloria'}</h3>
                <span className="glory-setup__confirm-stadium">
                  <MapPin size={14} /> {stadiumName || 'Estadio Municipal'}
                </span>
                <span className="glory-setup__confirm-division">Segunda RFEF</span>
              </div>
              <KitPreview kit={kit} size={60} />
            </div>

            <div className="glory-setup__confirm-details">
              <div className="glory-setup__confirm-item">
                <span className="label">División</span>
                <span className="value">Segunda RFEF (4ª categoría)</span>
              </div>
              <div className="glory-setup__confirm-item">
                <span className="label">Plantilla</span>
                <span className="value">20 jugadores</span>
              </div>
              <div className="glory-setup__confirm-item">
                <span className="label">Presupuesto</span>
                <span className="value">200.000 €</span>
              </div>
              <div className="glory-setup__confirm-item">
                <span className="label">Estadio</span>
                <span className="value">3.000 localidades</span>
              </div>
              <div className="glory-setup__confirm-item">
                <span className="label">Objetivo</span>
                <span className="value glory-setup__confirm-goal">
                  <Trophy size={14} /> Ganar la Champions League
                </span>
              </div>
            </div>

            <button className="glory-setup__start-btn" onClick={handleStart}>
              <Trophy size={18} /> Comenzar el Camino
              <ChevronRight size={18} />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="glory-setup unified-screen">
      <div className="glory-setup__header">
        <button className="btn-back" onClick={() => {
          if (step > 0) setStep(step - 1);
          else dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
        }}>
          <ArrowLeft size={18} />
        </button>
        <div className="glory-setup__title">
          <h2>Camino a la Gloria</h2>
          <span className="glory-setup__subtitle">Paso {step + 1} de {STEPS.length}</span>
        </div>
      </div>

      <div className="glory-setup__progress">
        {STEPS.map((_, i) => (
          <div key={i} className={`glory-setup__progress-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`} />
        ))}
      </div>

      <div className="glory-setup__content">
        {renderStep()}
      </div>

      {step < STEPS.length - 1 && (
        <div className="glory-setup__nav">
          <button
            className="glory-setup__next-btn"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Siguiente <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
