import React from 'react';
import { useGame } from '../../context/GameContext';
import { UserX, Home } from 'lucide-react';
import './ManagerFired.scss';

export default function ManagerFired() {
  const { state, dispatch } = useGame();
  
  const handleBackToMenu = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };
  
  // Buscar posición final
  const position = (state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1) || '?';
  const teamEntry = state.leagueTable?.find(t => t.teamId === state.teamId);
  
  return (
    <div className="manager-fired">
      <div className="manager-fired__overlay" />
      <div className="manager-fired__modal">
        <div className="manager-fired__icon">
          <UserX size={64} strokeWidth={1.5} />
        </div>
        
        <h1>DESTITUIDO</h1>
        <h2>{state.team?.name}</h2>
        
        <p className="manager-fired__reason">
          La junta directiva ha decidido prescindir de sus servicios como entrenador.
        </p>
        
        <div className="manager-fired__stats">
          <div className="stat">
            <span className="label">Posición</span>
            <span className="value">{position}º</span>
          </div>
          <div className="stat">
            <span className="label">Semana</span>
            <span className="value">{state.currentWeek}</span>
          </div>
          <div className="stat">
            <span className="label">Puntos</span>
            <span className="value">{teamEntry?.points || 0}</span>
          </div>
          <div className="stat">
            <span className="label">Balance</span>
            <span className="value">{teamEntry?.won || 0}V {teamEntry?.drawn || 0}E {teamEntry?.lost || 0}D</span>
          </div>
        </div>
        
        <div className="manager-fired__confidence">
          <span className="label">Confianza de la directiva</span>
          <div className="bar">
            <div className="fill" style={{ width: `${state.managerConfidence || 0}%` }} />
          </div>
          <span className="value">{state.managerConfidence || 0}%</span>
        </div>
        
        <button className="manager-fired__btn" onClick={handleBackToMenu}>
          <Home size={20} />
          <span>Volver al Menú Principal</span>
        </button>
      </div>
    </div>
  );
}
