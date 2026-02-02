import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import SaveSlots from '../SaveSlots/SaveSlots';
import { 
  Play, LogIn, LogOut, Save, Trophy, Settings as SettingsIcon, 
  Lightbulb, User, Gamepad2, ChevronRight, Timer
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './MainMenu.scss';

export default function MainMenu() {
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, isEmailVerified, logout, loading: authLoading } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [saveSlotsMode, setSaveSlotsMode] = useState('load');
  const [loggingOut, setLoggingOut] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

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
            <span>{loggingOut ? 'Saliendo...' : 'Salir'}</span>
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
            <span className="futbol">FÚTBOL</span>
          </h1>
          <div className="main-menu__edition">
            <span className="line"></span>
            <span className="text">WEB EDITION</span>
            <span className="line"></span>
          </div>
          <p className="main-menu__season">Temporada 2025-2026</p>
        </div>
        
        <nav className="main-menu__nav">
          {state.gameStarted && (
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
                  <span className="label">Continuar Partida</span>
                  <span className="sublabel">{state.team?.name} · Semana {state.currentWeek}</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}
          
          <button 
            className="main-menu__btn main-menu__btn--primary"
            onClick={handlePlay}
            disabled={authLoading}
            style={{ '--delay': state.gameStarted ? '1' : '0' }}
          >
            <div className="btn-content">
              <span className="icon-wrapper icon-wrapper--primary">
                {isAuthenticated ? <Gamepad2 size={22} /> : <LogIn size={22} />}
              </span>
              <div className="text">
                <span className="label">
                  {isAuthenticated ? 'Jugar' : 'Iniciar Sesión'}
                </span>
                <span className="sublabel">
                  {isAuthenticated 
                    ? 'Cargar partida o crear nueva' 
                    : 'Guarda tu progreso en la nube'
                  }
                </span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </div>
          </button>

          {isAuthenticated && state.gameStarted && (
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
                  <span className="label">Guardar Partida</span>
                  <span className="sublabel">Guarda tu progreso actual</span>
                </div>
                <ChevronRight size={18} className="chevron" />
              </div>
            </button>
          )}
          
          <button
            className="main-menu__btn main-menu__btn--contrarreloj"
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' })}
            style={{ '--delay': state.gameStarted ? '3' : '1' }}
          >
            <div className="btn-content">
              <span className="icon-wrapper icon-wrapper--contrarreloj">
                <Timer size={22} />
              </span>
              <div className="text">
                <span className="label">Contrarreloj</span>
                <span className="sublabel">Llega a la Champions desde abajo</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </div>
          </button>

          <div className="main-menu__secondary">
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranking' })}
              style={{ '--delay': state.gameStarted ? '4' : '2' }}
            >
              <Trophy size={20} className="icon-svg" />
              <span className="label">Récords</span>
            </button>
            
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => setShowSettings(true)}
              style={{ '--delay': state.gameStarted ? '5' : '3' }}
            >
              <SettingsIcon size={20} className="icon-svg" />
              <span className="label">Opciones</span>
            </button>
          </div>
        </nav>

        {!isAuthenticated && (
          <div className="main-menu__guest-notice">
            <Lightbulb size={14} className="notice-icon" />
            <p>Inicia sesión para guardar tu progreso en la nube</p>
          </div>
        )}
        
        <footer className="main-menu__footer">
          <p>Un tributo al clásico PC Fútbol 5.0</p>
        </footer>
      </div>
    </div>
  );
}
