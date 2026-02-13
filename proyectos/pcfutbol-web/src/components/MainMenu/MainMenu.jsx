import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import SaveSlots from '../SaveSlots/SaveSlots';
import { hasActiveContrarreloj, getContrarrelojSave, deleteContrarrelojSave } from '../../firebase/contrarrelojSaveService';
import { hasActiveProManager, getProManagerSave, deleteProManagerSave } from '../../firebase/proManagerService';
import { 
  Play, LogIn, LogOut, Save, Trophy, Settings as SettingsIcon, 
  Lightbulb, User, Gamepad2, ChevronRight, Timer, Swords, Briefcase, Package
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import EditionMode from '../EditionMode/EditionMode';
import { getActiveEditionId } from '../../data/editions/editionService';
import './MainMenu.scss';

export default function MainMenu() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, isEmailVerified, logout, loading: authLoading } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [saveSlotsMode, setSaveSlotsMode] = useState('load');
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Contrarreloj state
  const [contrarrelojInfo, setContrarrelojInfo] = useState({ hasActive: false, summary: null });
  const [showContrarrelojPrompt, setShowContrarrelojPrompt] = useState(false);
  const [loadingContrarreloj, setLoadingContrarreloj] = useState(false);
  const [showEditionMode, setShowEditionMode] = useState(false);
  
  // ProManager state
  const [proManagerInfo, setProManagerInfo] = useState({ hasActive: false, summary: null });
  const [showProManagerPrompt, setShowProManagerPrompt] = useState(false);
  const [loadingProManager, setLoadingProManager] = useState(false);
  
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
          teamName: state.team?.name || 'Equipo desconocido',
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

  // Cerrar Auth cuando el usuario se autentique
  useEffect(() => {
    if (isAuthenticated && showAuth) {
      setShowAuth(false);
    }
  }, [isAuthenticated, showAuth]);
  
  const handlePlay = () => {
    if (isAuthenticated && isEmailVerified) {
      setSaveSlotsMode('load');
      setShowSaveSlots(true);
    } else {
      setShowAuth(true);
    }
  };
  
  const handleContinue = () => {
    if (state.gameStarted) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
    }
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
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading ProManager save:', err);
    }
    setLoadingProManager(false);
    setShowProManagerPrompt(false);
  };

  const handleProManagerNew = async () => {
    if (user?.uid) {
      try { await deleteProManagerSave(user.uid); } catch { /* skip */ }
    }
    if (isProManagerInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setProManagerInfo({ hasActive: false, summary: null });
    setShowProManagerPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'promanager_setup' });
  };

  const handleContrarrelojNew = async () => {
    // Delete old contrarreloj save (Firebase + reset in-memory state)
    if (user?.uid) {
      try {
        await deleteContrarrelojSave(user.uid);
      } catch (err) {
        console.error('Error deleting old contrarreloj save:', err);
      }
    }
    // Reset game state if current game is contrarreloj
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

  if (showSettings) {
    return (
      <div className="main-menu__settings-wrapper">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (showAuth) {
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  if (showSaveSlots) {
    return (
      <SaveSlots 
        mode={saveSlotsMode} 
        onBack={() => setShowSaveSlots(false)}
        onSlotSelected={() => setShowSaveSlots(false)}
      />
    );
  }
  
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
              <img className="hero-ball-img" src="/ball.jpg" alt="balón" />
            </div>
          </div>
          <h1 className="main-menu__title">
            <span className="pc">P C</span>
            <span className="futbol">{t('mainMenu.title').split(' ')[1] || 'GAFFER'}</span>
          </h1>
          {t('mainMenu.subtitle') && !t('mainMenu.subtitle').includes('mainMenu.') && (
            <div className="main-menu__edition">
              <span className="line"></span>
              <span className="text">{t('mainMenu.subtitle')}</span>
              <span className="line"></span>
            </div>
          )}
          {t('mainMenu.season') && !t('mainMenu.season').includes('mainMenu.') && (
            <p className="main-menu__season">{t('mainMenu.season')}</p>
          )}
        </div>
        
        <nav className="main-menu__nav">
          {/* Continuar Partida — solo modo carrera (contrarreloj usa su propio botón) */}
          {/* Continuar Partida — eliminado, todo se gestiona por modo */}
          
          <button 
            className="main-menu__btn main-menu__btn--primary"
            onClick={handlePlay}
            disabled={authLoading}
            style={{ '--delay': (state.gameStarted && state.gameMode !== 'contrarreloj') ? '1' : '0' }}
          >
            <div className="btn-content">
              <span className="icon-wrapper icon-wrapper--primary">
                {isAuthenticated ? <Gamepad2 size={22} /> : <LogIn size={22} />}
              </span>
              <div className="text">
                <span className="label">
                  {isAuthenticated ? t('mainMenu.playButton') : t('mainMenu.loginButton')}
                </span>
                <span className="sublabel">
                  {isAuthenticated 
                    ? t('mainMenu.loadOrCreate') 
                    : t('mainMenu.saveProgress')
                  }
                </span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </div>
          </button>

          {/* Guardar Partida — eliminado, todo autoguardado en Firebase */}
          
          {isAuthenticated && (
            <button
              className="main-menu__btn main-menu__btn--contrarreloj"
              onClick={handleContrarreloj}
              style={{ '--delay': state.gameStarted ? '3' : '1' }}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--contrarreloj">
                  <Timer size={22} />
                </span>
                <div className="text">
                  <span className="label">{t('mainMenu.contrarreloj')}</span>
                  <span className="sublabel">
                    {contrarrelojInfo.hasActive 
                      ? `${contrarrelojInfo.summary?.teamName} · ${t('common.season')} ${contrarrelojInfo.summary?.season}`
                      : t('mainMenu.reachChampions')
                    }
                  </span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}

          {isAuthenticated && (
            <button
              className="main-menu__btn main-menu__btn--ranked"
              onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' })}
              style={{ '--delay': state.gameStarted ? '4' : '2' }}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--ranked">
                  <Swords size={22} />
                </span>
                <div className="text">
                  <span className="label">Ranked 1v1</span>
                  <span className="sublabel">Duelo de temporada competitivo</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}

          {isAuthenticated && (
            <button
              className="main-menu__btn main-menu__btn--promanager"
              onClick={handleProManager}
              style={{ '--delay': state.gameStarted ? '5' : '3' }}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--promanager">
                  <Briefcase size={22} />
                </span>
                <div className="text">
                  <span className="label">{t('proManager.title')}</span>
                  <span className="sublabel">
                    {proManagerInfo.hasActive
                      ? `${proManagerInfo.summary?.teamName} · ${t('proManager.prestige')} ${proManagerInfo.summary?.prestige}`
                      : t('proManager.menuSubtitle')
                    }
                  </span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}

          <div className="main-menu__secondary">
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranking' })}
              style={{ '--delay': state.gameStarted ? '4' : '2' }}
            >
              <Trophy size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.recordsButton')}</span>
            </button>
            
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => setShowSettings(true)}
              style={{ '--delay': state.gameStarted ? '5' : '3' }}
            >
              <SettingsIcon size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.optionsButton')}</span>
            </button>

            <button 
              className="main-menu__btn main-menu__btn--small main-menu__btn--edition"
              onClick={() => setShowEditionMode(true)}
              style={{ '--delay': state.gameStarted ? '6' : '4' }}
            >
              <Package size={20} className="icon-svg" />
              <span className="label">{t('mainMenu.editionButton')}</span>
              {getActiveEditionId() && <span className="main-menu__edition-badge">●</span>}
            </button>
          </div>
        </nav>

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
    </div>
  );
}
