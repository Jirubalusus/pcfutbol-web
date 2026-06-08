import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Trophy, Shield, PenLine, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import PageLoader from '../common/PageLoader';
import BadgeEditor, { BadgePreview, DEFAULT_BADGE } from './BadgeEditor';
import { getGlorySquad } from '../../data/fictionalPlayers';
import { initializeLeague } from '../../game/leagueEngine';
import { LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { loadActiveSeasonUniverse, getAllTeamsFromUniverse, initializeOtherLeaguesFromUniverse, buildLeagueGettersFromUniverse } from '../../data/activeSeasonUniverse';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import { qualifyTeamsForEurope, LEAGUE_SLOTS, buildSeasonCalendar, remapFixturesForEuropean, ensureEuropeanLeagueStandings } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { buildGloryHistoricalFlags, gloryStartsInHistoricalPrimeraRfef } from '../../game/gloryHistoricalRules';
import './GloryMode.scss';

const STEPS = ['info', 'badge', 'confirm'];
const STEP_META = {
  info: { icon: PenLine, eyebrowKey: 'glory.setup.infoEyebrow', titleKey: 'glory.setup.infoTitle', descKey: 'glory.setup.infoDesc' },
  badge: { icon: Shield, eyebrowKey: 'glory.setup.badgeEyebrow', titleKey: 'glory.setup.badgeTitle', descKey: 'glory.setup.badgeDesc' },
  confirm: { icon: Trophy, eyebrowKey: 'glory.setup.confirmEyebrow', titleKey: 'glory.setup.confirmTitle', descKey: 'glory.setup.confirmDesc' },
};

function getSpanishLowerDivisionEntries(activeSeasonUniverse) {
  return (activeSeasonUniverse?.entries || [])
    .filter(entry => ['segundaRFEF', 'primeraRFEF'].includes(entry.id) && entry.teams?.length)
    .sort((a, b) => {
      const rank = { segundaRFEF: 0, primeraRFEF: 1 };
      return (rank[a.id] ?? 9) - (rank[b.id] ?? 9);
    });
}

function getGlorySetupDivisionMeta(activeSeasonUniverse, t) {
  const spanishLowerDivisionEntries = getSpanishLowerDivisionEntries(activeSeasonUniverse);
  const targetLeagueId = spanishLowerDivisionEntries[0]?.id || 'segundaRFEF';
  const historicalNoSegundaRfef = gloryStartsInHistoricalPrimeraRfef(activeSeasonUniverse, targetLeagueId);
  if (historicalNoSegundaRfef) {
    return {
      targetLeagueId,
      historicalNoSegundaRfef: true,
      label: t('glory.setup.primeraLabel'),
      shortLabel: t('glory.setup.primeraShort'),
      tag: t('glory.setup.primeraTag'),
      desc: t('glory.setup.primeraDesc'),
      confirmValue: t('glory.setup.primeraConfirm'),
      note: t('glory.setup.primeraNote')
    };
  }
  return {
    targetLeagueId,
    historicalNoSegundaRfef: false,
    label: 'Segunda RFEF',
    shortLabel: 'Segunda RFEF',
    tag: t('glory.setup.segundaTag'),
    desc: t('glory.setup.infoDesc'),
    confirmValue: t('glory.setup.segundaConfirm'),
    note: null
  };
}

// Equipación derivada automáticamente del escudo (sin paso de UI). Se conserva
// `kit` en gloryData por compatibilidad con partidas y vistas existentes.
function deriveKitFromBadge(badge) {
  const b = badge || {};
  return {
    style: 'solid',
    primary: b.color1 || '#1a237e',
    secondary: b.color2 || b.accentColor || '#ffd740',
  };
}

export default function GlorySetup() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [badge, setBadge] = useState(DEFAULT_BADGE);
  const [starting, setStarting] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const [activeSeasonUniverseMeta, setActiveSeasonUniverseMeta] = useState(null);

  const activeStep = STEPS[step];
  const divisionMeta = useMemo(() => getGlorySetupDivisionMeta(activeSeasonUniverseMeta, t), [activeSeasonUniverseMeta, t]);
  const activeStepMeta = STEP_META[activeStep];
  const activeMeta = {
    icon: activeStepMeta.icon,
    eyebrow: t(activeStepMeta.eyebrowKey),
    title: t(activeStepMeta.titleKey),
    desc: activeStep === 'info' ? divisionMeta.desc : t(activeStepMeta.descKey),
  };
  const ActiveIcon = activeMeta.icon;

  useEffect(() => {
    let cancelled = false;
    loadActiveSeasonUniverse()
      .then(universe => {
        if (!cancelled) setActiveSeasonUniverseMeta(universe);
      })
      .catch(error => {
        console.warn('[GlorySetup] No se pudo leer la temporada activa para el texto inicial:', error);
      });
    return () => { cancelled = true; };
  }, []);

  const canProceed = () => {
    if (step === 0) return teamName.trim().length >= 2;
    return true;
  };

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    setSetupError(null);

    try {
      const name = teamName.trim() || 'FC Gloria';
      const stadium = stadiumName.trim() || 'Estadio Municipal';
      const activeSeasonUniverse = activeSeasonUniverseMeta || await loadActiveSeasonUniverse();

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

    const spanishLowerDivisionEntries = getSpanishLowerDivisionEntries(activeSeasonUniverse);

    if (spanishLowerDivisionEntries.length === 0) {
      throw new Error('No lower-division teams are loaded for the active season');
    }

    const targetLeagueId = spanishLowerDivisionEntries[0].id;
    const gloryHistoricalFlags = buildGloryHistoricalFlags(activeSeasonUniverse, targetLeagueId);
    const leagueEntries = spanishLowerDivisionEntries.filter(entry => entry.id === targetLeagueId);
    const selectedEntry = leagueEntries[Math.floor(Math.random() * leagueEntries.length)];
    const randomGroupKey = selectedEntry.groupId || selectedEntry.sourceLeagueId || targetLeagueId;
    const groupTeams = [...selectedEntry.teams];
    const replaceIndex = Math.floor(Math.random() * groupTeams.length);
    groupTeams[replaceIndex] = { ...gloryTeam, leagueId: targetLeagueId };
    const leagueData = initializeLeague(groupTeams, 'glory_team');

    dispatch({
      type: 'NEW_GAME',
      payload: {
        teamId: 'glory_team',
        team: gloryTeam,
        leagueId: targetLeagueId,
        group: randomGroupKey,
        gameMode: 'glory',
        managerName: state.managerName || 'Manager',
        managerConfidence: 80,
        stadiumInfo: { name: stadium, capacity: 3000 },
        stadiumLevel: 0,
        preseasonPhase: false,
        preseasonMatches: [],
        databaseSeasonId: activeSeasonUniverse.databaseSeasonId,
        careerStartSeason: activeSeasonUniverse.startYear,
        historicalDatabase: activeSeasonUniverse.historical,
        historicalDatabaseLabel: activeSeasonUniverse.label,
        gloryData: {
          badge,
          kit: deriveKitFromBadge(badge),
          teamName: name,
          stadiumName: stadium,
          ...gloryHistoricalFlags,
          startDivision: gloryHistoricalFlags.startDivision,
          historicalNoSegundaRfef: gloryHistoricalFlags.historicalNoSegundaRfef,
          noRelegationFrom: gloryHistoricalFlags.noRelegationFrom,
          season: 1,
          division: targetLeagueId,
          pickedCards: [],
          perks: {},
          trophies: [],
          history: [],
          championsWon: false,
        },
      },
    });

    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: targetLeagueId });
    dispatch({ type: 'SET_PLAYER_GROUP', payload: randomGroupKey });

    const otherLeagues = initializeOtherLeaguesFromUniverse(activeSeasonUniverse, targetLeagueId, randomGroupKey);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });

    const allLeagueTeamsWithData = getAllTeamsFromUniverse(activeSeasonUniverse).map(t => ({
      ...t,
      leagueId: t.leagueId || targetLeagueId,
      players: t.players || [],
      budget: t.budget || (t.reputation > 4 ? 100000000 : t.reputation > 3 ? 50000000 : 20000000)
    }));
    allLeagueTeamsWithData.push({ ...gloryTeam, leagueId: targetLeagueId, players: gloryPlayers, budget: 200000 });
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });

    let cupRounds = 0;
    try {
      const cupData = getCupTeams(targetLeagueId, gloryTeam, {}, leagueData.table);
      if (cupData?.teams?.length >= 4) {
        const bracket = generateCupBracket(cupData.teams, 'glory_team');
        if (bracket) {
          dispatch({ type: 'INIT_CUP_COMPETITION', payload: bracket });
          cupRounds = bracket.rounds?.length || 0;
        }
      }
    } catch (e) { console.warn('Glory cup init error:', e); }

    try {
      const allTeamsMap = {};
      const activeLeagueGetters = buildLeagueGettersFromUniverse(activeSeasonUniverse);
      for (const lid of Object.keys(LEAGUE_SLOTS)) {
        const teams = activeLeagueGetters[lid]?.() || LEAGUE_CONFIG[lid]?.getTeams?.();
        (teams || []).forEach(t => { allTeamsMap[t.id || t.teamId] = t; });
      }
      const bootstrapStandings = ensureEuropeanLeagueStandings(
        {},
        (lid) => activeLeagueGetters[lid]?.() || LEAGUE_CONFIG[lid]?.getTeams?.()
      );
      const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
      dispatch({
        type: 'INIT_EUROPEAN_COMPETITIONS',
        payload: initializeEuropeanCompetitions(qualifiedTeams, {
          seasonId: activeSeasonUniverse.databaseSeasonId,
          historical: activeSeasonUniverse.historical
        })
      });
    } catch (e) {
      console.error('Glory Euro comps init error:', e);
    }

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
    } catch (error) {
      console.error('[GlorySetup] No se pudo preparar Camino a la Gloria:', error);
      setSetupError(t('glory.setup.error'));
      setStarting(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 'info':
        return (
          <div className="glory-setup__info">
            <div className="glory-setup__identity-preview">
              <BadgePreview badge={badge} size={130} />
              <div className="glory-setup__identity-name">{teamName.trim() || t('glory.setup.defaultClub')}</div>
              <span className="glory-setup__identity-tag">{divisionMeta.tag}</span>
              <span className="glory-setup__identity-stadium">
                <MapPin size={13} /> {stadiumName.trim() || t('glory.setup.defaultStadium')}
              </span>
            </div>

            <div className="glory-setup__info-form">
              <div className="glory-setup__field">
                <label>{t('glory.setup.clubName')}</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder={t('glory.setup.defaultClub')} maxLength={30} autoFocus />
              </div>

              <div className="glory-setup__field">
                <label>{t('glory.setup.stadiumName')}</label>
                <input type="text" value={stadiumName} onChange={e => setStadiumName(e.target.value)} placeholder={t('glory.setup.defaultStadium')} maxLength={30} />
              </div>

              <div className="glory-setup__info-points">
                <span><Sparkles size={14} /> {t('glory.setup.fictionalSquad')}</span>
                <span><Sparkles size={14} /> {t('glory.setup.objectiveChampions')}</span>
              </div>
              {divisionMeta.historicalNoSegundaRfef && (
                <div className="glory-setup__historical-note" data-audit="glory-historical-no-segunda-rfef">
                  {divisionMeta.note}
                </div>
              )}
            </div>
          </div>
        );

      case 'badge':
        return <BadgeEditor value={badge} onChange={setBadge} teamName={teamName} />;

      case 'confirm':
        return (
          <div className="glory-setup__confirm fade-in-up">
            <div className="glory-setup__confirm-header">
              <div className="glory-setup__confirm-badge-wrap">
                <BadgePreview badge={badge} size={108} />
              </div>
              <div className="glory-setup__confirm-info">
                <span className="glory-setup__section-tag">{t('glory.setup.summaryTag')}</span>
                <h3>{teamName || t('glory.setup.defaultClub')}</h3>
                <span className="glory-setup__confirm-stadium">
                  <MapPin size={14} /> {stadiumName || t('glory.setup.defaultStadium')}
                </span>
                <span className="glory-setup__confirm-division">{divisionMeta.shortLabel}</span>
              </div>
            </div>

            <div className="glory-setup__confirm-details">
              <div className="glory-setup__confirm-item"><span className="label">{t('glory.setup.confirmDivisionLabel')}</span><span className="value">{divisionMeta.confirmValue}</span></div>
              <div className="glory-setup__confirm-item"><span className="label">{t('glory.setup.confirmSquadLabel')}</span><span className="value">{t('glory.setup.confirmSquadValue')}</span></div>
              <div className="glory-setup__confirm-item"><span className="label">{t('glory.setup.confirmBudgetLabel')}</span><span className="value">200.000 €</span></div>
              <div className="glory-setup__confirm-item"><span className="label">{t('glory.setup.confirmStadiumLabel')}</span><span className="value">{t('glory.setup.confirmStadiumValue')}</span></div>
              <div className="glory-setup__confirm-item"><span className="label">{t('glory.setup.confirmObjectiveLabel')}</span><span className="value glory-setup__confirm-goal"><Trophy size={14} /> {t('glory.setup.confirmObjectiveValue')}</span></div>
            </div>
            {divisionMeta.historicalNoSegundaRfef && (
              <div className="glory-setup__historical-note glory-setup__historical-note--confirm">
                {t('glory.setup.historicalNoteConfirm')}
              </div>
            )}
          </div>
        );
    }
  };

  if (starting) {
    return <PageLoader label={t('glory.setup.preparing')} />;
  }

  const isConfirm = activeStep === 'confirm';

  return (
    <div className="glory-setup" data-audit="glory-setup" data-glory-step={activeStep}>
      <header className="glory-setup__header">
        <button className="btn-back" onClick={() => {
          if (step > 0) setStep(step - 1);
          else dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
        }}>
          <ArrowLeft size={18} />
        </button>
        <div className="glory-setup__title">
          <h2>{t('glory.setup.title')}</h2>
          <span className="glory-setup__subtitle">{t('glory.setup.stepProgress', { current: step + 1, total: STEPS.length, title: activeMeta.title })}</span>
        </div>
        <nav className="glory-setup__progress" aria-label={t('glory.setup.progressAria')}>
          {STEPS.map((stepId, i) => (
            <div key={stepId} className={`glory-setup__progress-step ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
              <div className={`glory-setup__progress-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`} />
              <span>{t(STEP_META[stepId].titleKey)}</span>
            </div>
          ))}
        </nav>
      </header>

      <main className="glory-setup__content" data-glory-scroll-root>
        <div className={`glory-setup__step glory-setup__step--${activeStep}`}>
          <div className="glory-setup__step-head">
            <span className="glory-setup__eyebrow"><ActiveIcon size={14} /> {activeMeta.eyebrow}</span>
            <h3>{activeMeta.title}</h3>
            <p>{activeMeta.desc}</p>
          </div>
          {renderStep()}
        </div>
      </main>

      <footer className="glory-setup__nav">
        {setupError && (
          <p className="glory-setup__error" role="alert">{setupError}</p>
        )}
        <div className="glory-setup__nav-inner">
          {isConfirm ? (
            <button className="glory-setup__start-btn" onClick={handleStart} disabled={starting}>
              <Trophy size={18} /> {starting ? t('glory.setup.preparingBtn') : t('glory.setup.startBtn')}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button className="glory-setup__next-btn" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              {t('glory.setup.nextBtn')} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
