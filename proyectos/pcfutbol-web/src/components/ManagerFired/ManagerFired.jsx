import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { UserX, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ManagerFired.scss';

export default function ManagerFired() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
  
  // Redirect dispatches moved to useEffect to avoid dispatching during render
  useEffect(() => {
    if (state.gameMode === 'contrarreloj') {
      if (!state.contrarrelojData?.finished) {
        dispatch({ type: 'CONTRARRELOJ_LOSE', payload: { reason: 'fired' } });
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_end' });
      }
      return;
    }
    
    if (state.gameMode === 'promanager') {
      if (state.proManagerData) {
        dispatch({ type: 'SET_PROMANAGER_DATA', payload: { ...state.proManagerData, fired: true, boardConfidence: 0 } });
      }
      dispatch({ type: 'SET_SCREEN', payload: 'promanager_season_end' });
      return;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Don't render anything for contrarreloj/promanager modes (effect will redirect)
  if (state.gameMode === 'contrarreloj' || state.gameMode === 'promanager') {
    return null;
  }
  
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
        
        <h1>{t('managerFired.title')}</h1>
        <h2>{state.team?.name}</h2>
        
        <p className="manager-fired__reason">
          {state.managerFiredReason 
            ? (state.managerFiredReason.startsWith('managerFired.') ? t(state.managerFiredReason) : state.managerFiredReason)
            : t('managerFired.defaultReason')}
        </p>
        
        <div className="manager-fired__stats">
          <div className="stat">
            <span className="label">{t('ranking.position')}</span>
            <span className="value">{position}º</span>
          </div>
          <div className="stat">
            <span className="label">{t('common.week')}</span>
            <span className="value">{state.currentWeek}</span>
          </div>
          <div className="stat">
            <span className="label">{t('leagueTable.points')}</span>
            <span className="value">{teamEntry?.points || 0}</span>
          </div>
          <div className="stat">
            <span className="label">{t('managerFired.balance')}</span>
            <span className="value">{teamEntry?.won || 0}V {teamEntry?.drawn || 0}E {teamEntry?.lost || 0}D</span>
          </div>
        </div>
        
        <div className="manager-fired__confidence">
          <span className="label">{t('managerFired.confidence')}</span>
          <div className="bar">
            <div className="fill" style={{ width: `${state.managerConfidence || 0}%` }} />
          </div>
          <span className="value">{state.managerConfidence || 0}%</span>
        </div>
        
        <button className="manager-fired__btn" onClick={handleBackToMenu}>
          <Home size={20} />
          <span>{t('managerFired.backToMenu')}</span>
        </button>
      </div>
    </div>
  );
}
