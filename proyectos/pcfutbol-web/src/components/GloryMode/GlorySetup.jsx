import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Trophy, Shirt, Shield, PenLine, MapPin, ChevronRight, Sparkles } from 'lucide-react';
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
const STEP_META = {
  info: { icon: PenLine, eyebrow: 'Fundación', title: 'Crea tu club', desc: 'Dale nombre a tu proyecto. Empezarás en Segunda RFEF con jugadores desconocidos y un sueño.' },
  badge: { icon: Shield, eyebrow: 'Identidad visual', title: 'Diseña tu escudo', desc: 'La identidad visual de tu club empieza aquí.' },
  kit: { icon: Shirt, eyebrow: 'Primera equipación', title: 'Equipación', desc: 'Los colores que te representarán en el camino a la gloria.' },
  confirm: { icon: Trophy, eyebrow: 'Confirmación', title: 'Tu club está listo', desc: 'Revisa la identidad del proyecto antes de arrancar la partida.' },
};

export default function GlorySetup() {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [badge, setBadge] = useState({ shape: 'shield', color1: '#1a237e', color2: '#ffd740', icon: 'star' });
  const [kit, setKit] = useState({ style: 'solid', primary: '#1a237e', secondary: '#ffd740' });

  const activeStep = STEPS[step];
  const activeMeta = STEP_META[activeStep];
  const ActiveIcon = activeMeta.icon;

  const canProceed = () => {
    if (step === 0) return teamName.trim().length >= 2;
    return true;
  };

  const handleStart = () => {
    const name = teamName.trim() || 'FC Gloria';
    const stadium = stadiumName.trim() || 'Estadio Municipal';

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

    const groups = getSegundaRfefGroups();
    const groupKeys = Object.keys(groups).filter(k => groups[k].teams && groups[k].teams.length > 0);

    if (groupKeys.length === 0) {
      console.error('[GlorySetup] No teams loaded in Segunda RFEF groups');
      return;
    }

    const randomGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
    const groupTeams = [...groups[randomGroupKey].teams];
    const replaceIndex = Math.floor(Math.random() * groupTeams.length);
    groupTeams[replaceIndex] = gloryTeam;
    const leagueData = initializeLeague(groupTeams, 'glory_team');

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

    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: 'segundaRFEF' });
    dispatch({ type: 'SET_PLAYER_GROUP', payload: randomGroupKey });

    const otherLeagues = initializeOtherLeagues('segundaRFEF', randomGroupKey);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    const allLeagueTeamsWithData = [];
    Object.entries(LEAGUE_CONFIG).forEach(([leagueId, config]) => {
      if (config.isGroupLeague) {
        const groupsFn = config.getGroups;
        if (groupsFn) {
          const groups = groupsFn();
          Object.values(groups).forEach(teams => {
            (teams || []).forEach(t => {
              allLeagueTeamsWithData.push({ ...t, leagueId, players: t.players || [], budget: t.budget || 20000000 });
            });
          });
        }
      } else {
        const teams = config.getTeams();
        (teams || []).forEach(t => {
          allLeagueTeamsWithData.push({ ...t, leagueId, players: t.players || [], budget: t.budget || (t.reputation > 4 ? 100000000 : t.reputation > 3 ? 50000000 : 20000000) });
        });
      }
    });
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });

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
          overall: t.overall || 70, leaguePosition: idx + 1,
        }));
        teams.forEach(t => { allTeamsMap[t.id || t.teamId] = t; });
      }
      const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
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
            overall: t.overall || 65, players: t.players || [], ...t,
          })));
          fillers.forEach(t => usedTeamIds.add(t.id || t.teamId));
        }
      }
      dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: initializeEuropeanCompetitions(qualifiedTeams) });
    } catch (e) { console.warn('Glory Euro comps init error:', e); }

    try {
      const totalLeagueMDs = leagueData.fixtures.length > 0
        ? Math.max(...leagueData.fixtures.map(f => f.week)) : 38;
      const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds });
      const remappedFixtures = remapFixturesForEuropean(leagueData.fixtures, europeanCalendar.leagueWeekMap);
      dispatch({ type: 'SET_FIXTURES', payload: remappedFixtures });
      dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
    } catch (e) {
      console.warn('Glory calendar init error:', e);
      dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    }

    if (user?.uid) {
      dispatch({ type: 'SET_GLORY_USER_ID', payload: user.uid });
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 'info':
        return (
          <div className="glory-setup__step-body glory-setup__step-body--info">
            <div className="glory-setup__intro-card">
              <div className="glory-setup__intro-copy">
                <span className="glory-setup__section-tag">Proyecto deportivo</span>
                <h4>Todo gran club empieza con una historia y una casa.</h4>
                <p>Define la base de tu identidad antes de pasar al escudo y la equipación.</p>
              </div>
              <div className="glory-setup__intro-points">
                <span><Sparkles size={14} /> Segunda RFEF</span>
                <span><Sparkles size={14} /> Plantilla ficticia</span>
                <span><Sparkles size={14} /> Objetivo máximo</span>
              </div>
            </div>

            <div className="glory-setup__field-grid">
              <div className="glory-setup__field">
                <label>Nombre del club</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="FC Gloria" maxLength={30} autoFocus />
              </div>

              <div className="glory-setup__field">
                <label>Nombre del estadio</label>
                <input type="text" value={stadiumName} onChange={e => setStadiumName(e.target.value)} placeholder="Estadio Municipal" maxLength={30} />
              </div>
            </div>
          </div>
        );

      case 'badge':
        return <BadgeEditor value={badge} onChange={setBadge} />;

      case 'kit':
        return <KitEditor value={kit} onChange={setKit} />;

      case 'confirm':
        return (
          <div className="glory-setup__step-body glory-setup__confirm fade-in-up">
            <div className="glory-setup__confirm-header">
              <div className="glory-setup__confirm-identity">
                <div className="glory-setup__confirm-badge-wrap">
                  <BadgePreview badge={badge} size={84} />
                </div>
                <div className="glory-setup__confirm-info">
                  <span className="glory-setup__section-tag">Resumen del club</span>
                  <h3>{teamName || 'FC Gloria'}</h3>
                  <span className="glory-setup__confirm-stadium">
                    <MapPin size={14} /> {stadiumName || 'Estadio Municipal'}
                  </span>
                  <span className="glory-setup__confirm-division">Segunda RFEF</span>
                </div>
              </div>
              <div className="glory-setup__confirm-kit-wrap">
                <KitPreview kit={kit} size={72} />
              </div>
            </div>

            <div className="glory-setup__confirm-details">
              <div className="glory-setup__confirm-item"><span className="label">División</span><span className="value">Segunda RFEF (4ª categoría)</span></div>
              <div className="glory-setup__confirm-item"><span className="label">Plantilla</span><span className="value">20 jugadores</span></div>
              <div className="glory-setup__confirm-item"><span className="label">Presupuesto</span><span className="value">200.000 €</span></div>
              <div className="glory-setup__confirm-item"><span className="label">Estadio</span><span className="value">3.000 localidades</span></div>
              <div className="glory-setup__confirm-item"><span className="label">Objetivo</span><span className="value glory-setup__confirm-goal"><Trophy size={14} /> Ganar la Champions League</span></div>
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

      <div className="glory-setup__progress-shell">
        <div className="glory-setup__progress">
          {STEPS.map((stepId, i) => (
            <div key={stepId} className={`glory-setup__progress-step ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
              <div className={`glory-setup__progress-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`} />
              <span>{STEP_META[stepId].title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glory-setup__content">
        <div className={`glory-setup__step glory-setup__step--${activeStep}`}>
          <div className="glory-setup__step-chrome">
            <div className="glory-setup__step-icon">
              <ActiveIcon size={28} />
            </div>
            <div className="glory-setup__step-headline">
              <span className="glory-setup__section-tag">{activeMeta.eyebrow}</span>
              <h3 className="glory-setup__step-title">{activeMeta.title}</h3>
              <p className="glory-setup__step-desc">{activeMeta.desc}</p>
            </div>
          </div>
          {renderStep()}
        </div>
      </div>

      {step < STEPS.length - 1 && (
        <div className="glory-setup__nav">
          <button className="glory-setup__next-btn" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Siguiente <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
