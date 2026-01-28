import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import SaveSlots from '../SaveSlots/SaveSlots';
import './MainMenu.scss';

export default function MainMenu() {
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, isEmailVerified, logout, loading: authLoading } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [saveSlotsMode, setSaveSlotsMode] = useState('load');
  
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
    await logout();
    dispatch({ type: 'RESET_GAME' });
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
      </div>
      
      <div className="main-menu__content">
        {/* User status */}
        {isAuthenticated && (
          <div className="main-menu__user">
            <span className="main-menu__user-name">
              👤 {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <button className="main-menu__user-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}

        <div className="main-menu__hero">
          <div className="main-menu__ball">⚽</div>
          <h1 className="main-menu__title">
            <span className="pc">PC</span>
            <span className="futbol">FÚTBOL</span>
          </h1>
          <div className="main-menu__edition">
            <span className="line"></span>
            <span className="text">WEB EDITION</span>
            <span className="line"></span>
          </div>
          <p className="main-menu__season">Temporada 2024-2025</p>
        </div>
        
        <nav className="main-menu__nav">
          {state.gameStarted && (
            <button 
              className="main-menu__btn main-menu__btn--continue"
              onClick={handleContinue}
            >
              <div className="btn-content">
                <span className="icon">▶️</span>
                <div className="text">
                  <span className="label">Continuar Partida</span>
                  <span className="sublabel">{state.team?.name} · Semana {state.currentWeek}</span>
                </div>
              </div>
            </button>
          )}
          
          <button 
            className="main-menu__btn main-menu__btn--primary"
            onClick={handlePlay}
            disabled={authLoading}
          >
            <div className="btn-content">
              <span className="icon">🏟️</span>
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
            </div>
          </button>

          {isAuthenticated && state.gameStarted && (
            <button 
              className="main-menu__btn main-menu__btn--save"
              onClick={() => {
                setSaveSlotsMode('save');
                setShowSaveSlots(true);
              }}
            >
              <div className="btn-content">
                <span className="icon">💾</span>
                <div className="text">
                  <span className="label">Guardar Partida</span>
                  <span className="sublabel">Guarda tu progreso actual</span>
                </div>
              </div>
            </button>
          )}
          
          <div className="main-menu__secondary">
            <button className="main-menu__btn main-menu__btn--small" disabled>
              <span className="icon">🏆</span>
              <span className="label">Récords</span>
            </button>
            
            <button 
              className="main-menu__btn main-menu__btn--small"
              onClick={() => setShowSettings(true)}
            >
              <span className="icon">⚙️</span>
              <span className="label">Opciones</span>
            </button>
          </div>
        </nav>

        {!isAuthenticated && (
          <div className="main-menu__guest-notice">
            <p>💡 Inicia sesión para guardar tu progreso en la nube</p>
          </div>
        )}
        
        <footer className="main-menu__footer">
          <p>Un tributo al clásico PC Fútbol 5.0</p>
        </footer>
      </div>
    </div>
  );
}
