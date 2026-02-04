import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import SaveSlots from '../SaveSlots/SaveSlots';
import { hasActiveContrarreloj, getContrarrelojSave, deleteContrarrelojSave } from '../../firebase/contrarrelojSaveService';
import { 
  Play, LogIn, LogOut, Save, Trophy, Settings as SettingsIcon, 
  Lightbulb, User, Gamepad2, ChevronRight, Timer
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
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
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _contrarrelojUserId: user.uid } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading contrarreloj save:', err);
    }
    setLoadingContrarreloj(false);
    setShowContrarrelojPrompt(false);
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
              <span className="hero-ball" role="img" aria-label="balón">⚽</span>
            </div>
          </div>
          <h1 className="main-menu__title">
            <span className="pc">P C</span>
            <span className="futbol">{t('mainMenu.title').split(' ')[1] || 'GAFFER'}</span>
          </h1>
          <div className="main-menu__edition">
            <span className="line"></span>
            <span className="text">{t('mainMenu.subtitle')}</span>
            <span className="line"></span>
          </div>
          <p className="main-menu__season">{t('mainMenu.season')}</p>
        </div>
        
        <nav className="main-menu__nav">
          {/* Continuar Partida — solo modo carrera (contrarreloj usa su propio botón) */}
          {state.gameStarted && state.gameMode !== 'contrarreloj' && (
            <button 
              className="main-menu__btn main-menu__btn--continue"
              onClick={handleContinue}
              style={{ '--delay': '0' }}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--continue">
                  <Play size={22} />
                </span>
                <div className="text">
                  <span className="label">{t('mainMenu.continueGame')}</span>
                  <span className="sublabel">{state.team?.name} · {t('common.week')} {state.currentWeek}</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}
          
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

          {/* Guardar Partida — solo modo carrera (NO contrarreloj) */}
          {isAuthenticated && state.gameStarted && state.gameMode !== 'contrarreloj' && (
            <button 
              className="main-menu__btn main-menu__btn--save"
              onClick={() => {
                setSaveSlotsMode('save');
                setShowSaveSlots(true);
              }}
              style={{ '--delay': '2' }}
            >
              <div className="btn-content">
                <span className="icon-wrapper icon-wrapper--save">
                  <Save size={20} />
                </span>
                <div className="text">
                  <span className="label">{t('mainMenu.saveCurrentGame')}</span>
                  <span className="sublabel">{t('mainMenu.saveCurrentProgress')}</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}
          
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
