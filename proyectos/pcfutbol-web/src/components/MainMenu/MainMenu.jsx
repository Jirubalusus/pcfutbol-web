import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import Settings from '../Settings/Settings';
import './MainMenu.scss';

export default function MainMenu() {
  const { state, dispatch } = useGame();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);
  
  const handleNewGame = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
  };
  
  const handleContinue = () => {
    if (state.gameStarted) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
    }
  };
  
  if (showSettings) {
    return (
      <div className="main-menu__settings-wrapper">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
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
            onClick={handleNewGame}
          >
            <div className="btn-content">
              <span className="icon">🏟️</span>
              <div className="text">
                <span className="label">Nueva Partida</span>
                <span className="sublabel">Elige tu equipo y comienza</span>
              </div>
            </div>
          </button>
          
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
        
        <footer className="main-menu__footer">
          <p>Un tributo al clásico PC Fútbol 5.0</p>
        </footer>
      </div>
    </div>
  );
}
