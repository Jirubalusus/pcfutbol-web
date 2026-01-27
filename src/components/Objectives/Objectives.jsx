import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import './Objectives.scss';

export default function Objectives() {
  const { state } = useGame();
  const objectives = state.seasonObjectives || [];
  
  const teamStats = useMemo(() => {
    const teamData = state.leagueTable?.find(t => t.teamId === state.teamId);
    if (!teamData) return null;
    
    return {
      position: state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1,
      points: teamData.points,
      goalsFor: teamData.goalsFor,
      goalsAgainst: teamData.goalsAgainst,
      goalDifference: teamData.goalsFor - teamData.goalsAgainst,
      wins: teamData.won,
      draws: teamData.drawn,
      losses: teamData.lost
    };
  }, [state.leagueTable, state.teamId]);

  const getObjectiveProgress = (obj) => {
    if (!teamStats) return 0;
    
    switch (obj.type) {
      case 'league_position':
        // Progreso basado en posición actual vs objetivo
        if (teamStats.position <= obj.target) return 100;
        const totalTeams = state.leagueTable?.length || 20;
        return Math.max(0, Math.round((1 - (teamStats.position - obj.target) / (totalTeams - obj.target)) * 100));
        
      case 'goal_difference':
        if (teamStats.goalDifference >= obj.target) return 100;
        return Math.max(0, Math.min(100, 50 + teamStats.goalDifference * 5));
        
      case 'financial':
        if (state.money >= 0) return 100;
        return Math.max(0, Math.round(100 + (state.money / 10000000) * 100));
        
      default:
        return 50;
    }
  };

  const getObjectiveStatus = (obj) => {
    const progress = getObjectiveProgress(obj);
    if (progress >= 100) return 'completed';
    if (progress >= 70) return 'on-track';
    if (progress >= 40) return 'warning';
    return 'danger';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🎯';
      case 'high': return '⭐';
      case 'medium': return '📊';
      case 'low': return '📝';
      default: return '•';
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount <= -1000000) return `-€${(Math.abs(amount) / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  const completedCount = objectives.filter(obj => getObjectiveProgress(obj) >= 100).length;
  const criticalObjectives = objectives.filter(obj => obj.priority === 'critical');
  const otherObjectives = objectives.filter(obj => obj.priority !== 'critical');

  return (
    <div className="objectives">
      <div className="objectives__header">
        <h2>🎯 Objetivos de Temporada</h2>
        <p className="objectives__subtitle">
          Temporada {state.currentSeason} · Semana {state.currentWeek}/38
        </p>
      </div>

      {/* Resumen */}
      <div className="objectives__summary">
        <div className="summary-card">
          <span className="icon">✅</span>
          <div className="content">
            <span className="value">{completedCount}/{objectives.length}</span>
            <span className="label">Completados</span>
          </div>
        </div>
        
        <div className="summary-card">
          <span className="icon">🏆</span>
          <div className="content">
            <span className="value">{teamStats?.position || '-'}º</span>
            <span className="label">Posición actual</span>
          </div>
        </div>
        
        <div className="summary-card">
          <span className="icon">⚽</span>
          <div className="content">
            <span className={`value ${teamStats?.goalDifference >= 0 ? 'positive' : 'negative'}`}>
              {teamStats?.goalDifference > 0 ? '+' : ''}{teamStats?.goalDifference || 0}
            </span>
            <span className="label">Dif. goles</span>
          </div>
        </div>
        
        <div className="summary-card">
          <span className="icon">💰</span>
          <div className="content">
            <span className={`value ${state.money >= 0 ? 'positive' : 'negative'}`}>
              {formatMoney(state.money)}
            </span>
            <span className="label">Presupuesto</span>
          </div>
        </div>
      </div>

      {/* Objetivos Críticos */}
      {criticalObjectives.length > 0 && (
        <section className="objectives__section">
          <h3>Objetivos Principales</h3>
          <div className="objectives__list">
            {criticalObjectives.map(obj => {
              const progress = getObjectiveProgress(obj);
              const status = getObjectiveStatus(obj);
              
              return (
                <div key={obj.id} className={`objectives__item objectives__item--${status}`}>
                  <div className="objective-header">
                    <span className="priority">{getPriorityIcon(obj.priority)}</span>
                    <span className="name">{obj.name}</span>
                    <span className={`status status--${status}`}>
                      {status === 'completed' ? '✓ Cumplido' :
                       status === 'on-track' ? 'En camino' :
                       status === 'warning' ? 'En riesgo' : 'Peligro'}
                    </span>
                  </div>
                  
                  <p className="description">{obj.description}</p>
                  
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill progress-fill--${status}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                  
                  <div className="objective-rewards">
                    {obj.reward > 0 && (
                      <span className="reward">
                        ✓ {formatMoney(obj.reward)}
                      </span>
                    )}
                    {obj.penalty < 0 && (
                      <span className="penalty">
                        ✗ {formatMoney(obj.penalty)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Objetivos Secundarios */}
      {otherObjectives.length > 0 && (
        <section className="objectives__section">
          <h3>Objetivos Secundarios</h3>
          <div className="objectives__list objectives__list--compact">
            {otherObjectives.map(obj => {
              const progress = getObjectiveProgress(obj);
              const status = getObjectiveStatus(obj);
              
              return (
                <div key={obj.id} className={`objectives__item objectives__item--compact objectives__item--${status}`}>
                  <div className="objective-header">
                    <span className="priority">{getPriorityIcon(obj.priority)}</span>
                    <span className="name">{obj.name}</span>
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill progress-fill--${status}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mensaje si no hay objetivos */}
      {objectives.length === 0 && (
        <div className="objectives__empty">
          <span className="icon">📋</span>
          <p>Los objetivos de temporada se generarán al comenzar la liga.</p>
        </div>
      )}

      {/* Nota informativa */}
      <div className="objectives__info">
        <p>
          💡 <strong>Consejo:</strong> Cumplir los objetivos críticos es esencial para mantener tu puesto. 
          Un buen rendimiento puede atraer ofertas de equipos más grandes.
        </p>
      </div>
    </div>
  );
}
