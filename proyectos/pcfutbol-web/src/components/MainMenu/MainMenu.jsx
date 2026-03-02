import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import { hasActiveCareer, getCareerSave, deleteCareerSave } from '../../firebase/careerSaveService';
import { hasActiveContrarreloj, getContrarrelojSave, deleteContrarrelojSave } from '../../firebase/contrarrelojSaveService';
import { hasActiveProManager, getProManagerSave, deleteProManagerSave } from '../../firebase/proManagerService';
import { hasActiveGlory, getGlorySave, deleteGlorySave } from '../../firebase/glorySaveService';
import { 
  Play, LogIn, LogOut, Save, Trophy, Settings as SettingsIcon, 
  Lightbulb, User, Gamepad2, ChevronRight, Timer, Swords, Briefcase, Package, Mountain, Globe
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import EditionMode from '../EditionMode/EditionMode';
import { useTheme } from '../../context/ThemeContext';
import { getActiveEditionId } from '../../data/editions/editionService';
import './MainMenu.scss';

export default function MainMenu() {
  const { t } = useTranslation();
  const { themeId, themes: themeList } = useTheme();
  const isLightTheme = themeList[themeId]?.colorScheme === 'light';
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, isEmailVerified, logout, loading: authLoading } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuTab, setMenuTab] = useState('solo');
  const [showAuth, setShowAuth] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Career state
  const [careerInfo, setCareerInfo] = useState({ hasActive: false, summary: null });
  const [showCareerPrompt, setShowCareerPrompt] = useState(false);
  const [loadingCareer, setLoadingCareer] = useState(false);
  
  // Contrarreloj state
  const [contrarrelojInfo, setContrarrelojInfo] = useState({ hasActive: false, summary: null });
  const [showContrarrelojPrompt, setShowContrarrelojPrompt] = useState(false);
  const [loadingContrarreloj, setLoadingContrarreloj] = useState(false);
  const [showEditionMode, setShowEditionMode] = useState(false);
  
  // ProManager state
  const [proManagerInfo, setProManagerInfo] = useState({ hasActive: false, summary: null });
  const [showProManagerPrompt, setShowProManagerPrompt] = useState(false);
  const [loadingProManager, setLoadingProManager] = useState(false);
  
  // Glory state
  const [gloryInfo, setGloryInfo] = useState({ hasActive: false, summary: null });
  const [showGloryPrompt, setShowGloryPrompt] = useState(false);
  const [loadingGlory, setLoadingGlory] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  // Detect active contrarreloj: check in-memory state first, then Firebase
  const isContrarrelojInMemory = state.gameStarted && state.gameMode === 'contrarreloj' && !state.contrarrelojData?.finished;

  useEffect(() => {
    // If contrarreloj is already in memory, use that info directly
    if (isContrarrelojInMemory) {
      setContrarrelojInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || t('common.unknownTeam'),
          teamId: state.teamId,
          leagueId: state.leagueId || state.playerLeagueId,
          season: state.contrarrelojData?.seasonsPlayed || 1,
          week: state.currentWeek || 1,
          money: state.money || 0,
          trophies: state.contrarrelojData?.trophies?.length || 0
        }
      });
      return;
    }

    // Otherwise check Firebase
    if (isAuthenticated && user?.uid) {
      hasActiveContrarreloj(user.uid)
        .then(info => setContrarrelojInfo(info))
        .catch(() => setContrarrelojInfo({ hasActive: false, summary: null }));
    } else {
      setContrarrelojInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, isContrarrelojInMemory]);

  // Detect active ProManager
  const isProManagerInMemory = state.gameStarted && state.gameMode === 'promanager' && !state.proManagerData?.finished;

  useEffect(() => {
    if (isProManagerInMemory) {
      setProManagerInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || 'Unknown',
          teamId: state.teamId,
          season: state.proManagerData?.seasonsManaged || 1,
          prestige: state.proManagerData?.prestige || 10,
        }
      });
      return;
    }
    if (isAuthenticated && user?.uid) {
      hasActiveProManager(user.uid)
        .then(info => setProManagerInfo(info))
        .catch(() => setProManagerInfo({ hasActive: false, summary: null }));
    } else {
      setProManagerInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, isProManagerInMemory]);

  // Detect active Glory Mode
  const isGloryInMemory = state.gameStarted && state.gameMode === 'glory';

  useEffect(() => {
    if (isGloryInMemory) {
      setGloryInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || state.gloryData?.teamName || 'FC Gloria',
          season: state.gloryData?.season || 1,
          division: state.gloryData?.division || 'segundaRFEF',
          week: state.currentWeek || 1,
        }
      });
      return;
    }
    if (isAuthenticated && user?.uid) {
      hasActiveGlory(user.uid)
        .then(info => setGloryInfo(info))
        .catch(() => setGloryInfo({ hasActive: false, summary: null }));
    } else {
      setGloryInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, isGloryInMemory]);

  // Detect active Career
  const isCareerInMemory = state.gameStarted && (!state.gameMode || state.gameMode === 'career');

  useEffect(() => {
    if (isCareerInMemory) {
      setCareerInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || 'Equipo desconocido',
          teamId: state.teamId,
          season: state.currentSeason || 1,
          week: state.currentWeek || 1,
          money: state.money || 0
        }
      });
      return;
    }
    if (isAuthenticated && user?.uid) {
      hasActiveCareer(user.uid)
        .then(info => setCareerInfo(info))
        .catch(() => setCareerInfo({ hasActive: false, summary: null }));
    } else {
      setCareerInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, isCareerInMemory]);

  // Cerrar Auth cuando el usuario se autentique
  useEffect(() => {
    if (isAuthenticated && showAuth) {
      setShowAuth(false);
    }
  }, [isAuthenticated, showAuth]);
  
  const handlePlay = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    if (careerInfo.hasActive) {
      setShowCareerPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
    }
  };
  
  const handleCareerContinue = async () => {
    if (isCareerInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowCareerPrompt(false);
      return;
    }
    if (!user?.uid) return;
    setLoadingCareer(true);
    try {
      const saveData = await getCareerSave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, gameMode: 'career', rankedMatchId: null } });
        const { getAuth } = await import('firebase/auth');
        const dn = getAuth().currentUser?.displayName;
        if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading career save:', err);
    }
    setLoadingCareer(false);
    setShowCareerPrompt(false);
  };

  const handleCareerNew = () => {
    // Navigate immediately, delete save in background
    if (user?.uid) {
      deleteCareerSave(user.uid).catch(err => console.error('Error deleting old career save:', err));
    }
    if (isCareerInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setCareerInfo({ hasActive: false, summary: null });
    setShowCareerPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    dispatch({ type: 'RESET_GAME' });
    setLoggingOut(false);
  };

  // Contrarreloj handlers
  const handleContrarreloj = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    if (contrarrelojInfo.hasActive) {
      setShowContrarrelojPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' });
    }
  };

  const handleContrarrelojContinue = async () => {
    // If already in memory, just go to office
    if (isContrarrelojInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowContrarrelojPrompt(false);
      return;
    }

    // Otherwise load from Firebase
    if (!user?.uid) return;
    setLoadingContrarreloj(true);
    try {
      const saveData = await getContrarrelojSave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _contrarrelojUserId: user.uid, gameMode: 'contrarreloj', rankedMatchId: null } });
        // Sync manager name from Firebase Auth
        const { getAuth } = await import('firebase/auth');
        const dn = getAuth().currentUser?.displayName;
        if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading contrarreloj save:', err);
    }
    setLoadingContrarreloj(false);
    setShowContrarrelojPrompt(false);
  };

  // ProManager handlers
  const handleProManager = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    if (proManagerInfo.hasActive) {
      setShowProManagerPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'promanager_setup' });
    }
  };

  const handleProManagerContinue = async () => {
    if (isProManagerInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowProManagerPrompt(false);
      return;
    }
    if (!user?.uid) return;
    setLoadingProManager(true);
    try {
      const saveData = await getProManagerSave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _proManagerUserId: user.uid, gameMode: 'promanager', rankedMatchId: null } });
        // Sync manager name from Firebase Auth
        const { getAuth: getAuth2 } = await import('firebase/auth');
        const dn2 = getAuth2().currentUser?.displayName;
        if (dn2) dispatch({ type: 'SET_MANAGER_NAME', payload: dn2 });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading ProManager save:', err);
    }
    setLoadingProManager(false);
    setShowProManagerPrompt(false);
  };

  const handleProManagerNew = () => {
    if (user?.uid) {
      deleteProManagerSave(user.uid).catch(() => {});
    }
    if (isProManagerInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setProManagerInfo({ hasActive: false, summary: null });
    setShowProManagerPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'promanager_setup' });
  };

  // Glory handlers
  const handleGlory = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    dispatch({ type: 'SET_SCREEN', payload: 'glory_menu' });
  };

  const handleGloryContinue = async () => {
    if (isGloryInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowGloryPrompt(false);
      return;
    }
    if (!user?.uid) return;
    setLoadingGlory(true);
    try {
      const saveData = await getGlorySave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        const { getAuth: getAuth3 } = await import('firebase/auth');
        const dn3 = getAuth3().currentUser?.displayName;
        if (dn3) dispatch({ type: 'SET_MANAGER_NAME', payload: dn3 });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading Glory save:', err);
    }
    setLoadingGlory(false);
    setShowGloryPrompt(false);
  };

  const handleGloryNew = () => {
    if (user?.uid) {
      deleteGlorySave(user.uid).catch(() => {});
    }
    if (isGloryInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setGloryInfo({ hasActive: false, summary: null });
    setShowGloryPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'glory_setup' });
  };

  const handleContrarrelojNew = () => {
    if (user?.uid) {
      deleteContrarrelojSave(user.uid).catch(() => {});
    }
    if (isContrarrelojInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setContrarrelojInfo({ hasActive: false, summary: null });
    setShowContrarrelojPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' });
  };
  
  if (showEditionMode) {
    return (
      <EditionMode 
        onBack={() => setShowEditionMode(false)}
        onEditionApplied={() => {
          // EditionMode already handles save deletion
          // Force full page reload to re-fetch data with new names
          window.location.reload();
        }}
      />
    );
  }

  /* Settings rendered as overlay below, not early return */

  if (showAuth) {
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  /* SaveSlots removed — career uses single save like other modes */
  
  return (
    <div className={`main-menu ${animateIn ? 'animate-in' : ''}`}>
      <div className="main-menu__background">
        <div className="main-menu__gradient"></div>
        <div className="main-menu__pattern"></div>
        <div className="main-menu__glow"></div>
        <div className="main-menu__particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`particle particle--${i}`} />
          ))}
        </div>
      </div>
      
      {/* User status — logged in (outside content for proper absolute positioning) */}
      {isAuthenticated && (
        <div className="main-menu__user">
          <div className="main-menu__user-avatar">
            <User size={14} />
          </div>
          <span className="main-menu__user-name">
            {user?.displayName || user?.email?.split('@')[0]}
          </span>
          <button 
            className="main-menu__user-logout" 
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={13} />
            <span>{loggingOut ? t('mainMenu.loggingOut') : t('mainMenu.logout')}</span>
          </button>
        </div>
      )}

      <div className="main-menu__content">
        <div className="main-menu__hero">
          <div className="main-menu__ball">
            <div className="main-menu__ball-inner">
              {isLightTheme 
                ? <span className="hero-ball" role="img" aria-label="balón">⚽</span>
                : <img className="hero-ball-img" src="/ball.jpg" alt="balón" />
              }
            </div>
          </div>
          <h1 className="main-menu__title">
            <span className="pc">P C</span>
            <span className="futbol">{t('mainMenu.title').split(' ')[1] || 'GAFFER'}</span>
          </h1>
          {/* Subtitle and season removed — clean hero */}
        </div>
        
        <nav className="main-menu__nav">
          {!isAuthenticated ? (
            <button 
              className="main-menu__btn main-menu__btn--primary"
              onClick={handlePlay}
              disabled={authLoading}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--primary">
                  <LogIn size={22} />
                </span>
                <div className="text">
                  <span className="label">{t('mainMenu.loginButton')}</span>
                  <span className="sublabel">{t('mainMenu.saveProgress')}</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          ) : (
            <>
              {/* Tab selector */}
              <div className="main-menu__tabs">
                <button 
                  className={`main-menu__tab ${menuTab === 'solo' ? 'active' : ''}`}
                  onClick={() => setMenuTab('solo')}
                >
                  <Gamepad2 size={16} /> {t('mainMenu.tabSolo')}
                </button>
                <div className="main-menu__tab-wrapper main-menu__tab-wrapper--disabled" title={t('mainMenu.comingSoon')}>
                  <button 
                    className={`main-menu__tab`}
                    disabled
                  >
                    <Swords size={16} /> {t('mainMenu.tabMulti')}
                  </button>
                </div>
              </div>

              {/* Solo modes */}
              {menuTab === 'solo' && (
                <div className="main-menu__modes">
                  {/* Carrera */}
                  <button className="main-menu__mode-card" onClick={handlePlay}>
                    <div className="mode-card__icon"><Gamepad2 size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">{t('mainMenu.playButton')}</span>
                      <span className="mode-card__desc">
                        {careerInfo.hasActive
                          ? `${careerInfo.summary?.teamName} · ${t('common.season')} ${careerInfo.summary?.season}`
                          : t('mainMenu.loadOrCreate')
                        }
                      </span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>

                  {/* Contrarreloj */}
                  <button className="main-menu__mode-card" onClick={handleContrarreloj}>
                    <div className="mode-card__icon mode-card__icon--contrarreloj"><Timer size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">{t('mainMenu.contrarreloj')}</span>
                      <span className="mode-card__desc">
                        {contrarrelojInfo.hasActive 
                          ? `${contrarrelojInfo.summary?.teamName} · ${t('common.season')} ${contrarrelojInfo.summary?.season}`
                          : t('mainMenu.reachChampions')
                        }
                      </span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>

                  {/* Mánager Profesional */}
                  <button className="main-menu__mode-card" onClick={handleProManager}>
                    <div className="mode-card__icon mode-card__icon--promanager"><Briefcase size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">{t('proManager.title')}</span>
                      <span className="mode-card__desc">
                        {proManagerInfo.hasActive
                          ? `${proManagerInfo.summary?.teamName} · ${t('proManager.prestige')} ${proManagerInfo.summary?.prestige}`
                          : t('proManager.menuSubtitle')
                        }
                      </span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>

                  {/* Camino a la Gloria */}
                  <button className="main-menu__mode-card" onClick={handleGlory}>
                    <div className="mode-card__icon mode-card__icon--glory"><Mountain size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">Camino a la Gloria</span>
                      <span className="mode-card__desc">
                        {gloryInfo.hasActive 
                          ? `${gloryInfo.summary?.teamName} · Temporada ${gloryInfo.summary?.season || 1}`
                          : 'Crea tu club desde cero. Roguelike con cartas.'}
                      </span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>

                  {/* Modo Mundial */}
                  <button className="main-menu__mode-card" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'worldcup_setup' })}>
                    <div className="mode-card__icon mode-card__icon--worldcup"><Globe size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">Modo Mundial</span>
                      <span className="mode-card__desc">Dirige tu selección. Eventos estilo Reigns.</span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>
                </div>
              )}

              {/* Multi modes */}
              {menuTab === 'multi' && (
                <div className="main-menu__modes">
                  <button className="main-menu__mode-card" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' })}>
                    <div className="mode-card__icon mode-card__icon--ranked"><Swords size={24} /></div>
                    <div className="mode-card__info">
                      <span className="mode-card__name">{t('mainMenu.ranked')}</span>
                      <span className="mode-card__desc">{t('mainMenu.rankedSubtitle')}</span>
                    </div>
                    <ChevronRight size={18} className="mode-card__arrow" />
                  </button>

                  <div className="main-menu__coming-soon">
                    <p>{t('mainMenu.moreModesComingSoon')}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="main-menu__secondary">
            {isAuthenticated && (
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranking' })}
            >
              <Trophy size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.recordsButton')}</span>
            </button>
            )}
            
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => setShowSettings(true)}
            >
              <SettingsIcon size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.optionsButton')}</span>
            </button>

            {isAuthenticated && (
            <button 
              className="main-menu__btn main-menu__btn--small main-menu__btn--edition"
              onClick={() => setShowEditionMode(true)}
            >
              <Package size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.editionButton')}</span>
            </button>
            )}
          </div>
        </nav>

        {/* Career prompt: Continuar / Nueva partida */}
        {showCareerPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowCareerPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Gamepad2 size={24} />
                <h3>{t('mainMenu.careerActive') || 'Carrera Libre en curso'}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{careerInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {careerInfo.summary?.season} · 
                  {t('common.week')} {careerInfo.summary?.week}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button 
                  className="btn-continue" 
                  onClick={handleCareerContinue}
                  disabled={loadingCareer}
                >
                  <Play size={18} />
                  {loadingCareer ? t('common.loading') : t('common.continue')}
                </button>
                <button 
                  className="btn-new" 
                  onClick={handleCareerNew}
                >
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Contrarreloj prompt: Continuar / Nueva partida */}
        {showContrarrelojPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowContrarrelojPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Timer size={24} />
                <h3>{t('mainMenu.contrarrelojActive')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{contrarrelojInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {contrarrelojInfo.summary?.season} · 
                  {t('common.week')} {contrarrelojInfo.summary?.week}
                  {contrarrelojInfo.summary?.trophies > 0 && ` · 🏆 ${contrarrelojInfo.summary.trophies}`}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button 
                  className="btn-continue" 
                  onClick={handleContrarrelojContinue}
                  disabled={loadingContrarreloj}
                >
                  <Play size={18} />
                  {loadingContrarreloj ? t('common.loading') : t('common.continue')}
                </button>
                <button 
                  className="btn-new" 
                  onClick={handleContrarrelojNew}
                >
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {/* ProManager prompt */}
        {showProManagerPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowProManagerPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Briefcase size={24} />
                <h3>{t('proManager.activeCareer')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{proManagerInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {proManagerInfo.summary?.season}
                  {proManagerInfo.summary?.prestige != null && ` · ⭐ ${proManagerInfo.summary.prestige}`}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button
                  className="btn-continue"
                  onClick={handleProManagerContinue}
                  disabled={loadingProManager}
                >
                  <Play size={18} />
                  {loadingProManager ? t('common.loading') : t('common.continue')}
                </button>
                <button className="btn-new" onClick={handleProManagerNew}>
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {showGloryPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowGloryPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Mountain size={24} />
                <h3>Partida en curso</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{gloryInfo.summary?.teamName}</p>
                <p className="details">
                  Temporada {gloryInfo.summary?.season || 1} · Jornada {gloryInfo.summary?.week || 1}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button
                  className="btn-continue"
                  onClick={handleGloryContinue}
                  disabled={loadingGlory}
                >
                  <Play size={18} />
                  {loadingGlory ? t('common.loading') : t('common.continue')}
                </button>
                <button className="btn-new" onClick={handleGloryNew}>
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="main-menu__guest-notice">
            <Lightbulb size={14} className="notice-icon" />
            <p>{t('mainMenu.guestNotice')}</p>
          </div>
        )}
        
        <footer className="main-menu__footer">
          <p>{t('mainMenu.tribute')}</p>
        </footer>
      </div>

      {showSettings && (
        <div className="main-menu__settings-wrapper">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}

    </div>
  );
}
