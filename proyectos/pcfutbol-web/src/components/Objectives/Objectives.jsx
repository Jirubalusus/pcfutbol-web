import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  Target,
  Trophy,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  Award,
  Flame,
  Shield,
  Zap,
  Info,
  CircleDot
} from 'lucide-react';
import './Objectives.scss';

export default function Objectives() {
  const { state } = useGame();
  const objectives = state.seasonObjectives || [];
  const [filter, setFilter] = useState('all'); // all, completed, in-progress, at-risk
  const [expandedId, setExpandedId] = useState(null);
  
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
    
    // Determinar si es un objetivo que NO puede completarse hasta fin de temporada
    const isEndOfSeasonObjective = obj.type === 'league_position' && obj.target >= 17; // Evitar descenso
    const seasonFinished = state.currentWeek >= 38;
    
    switch (obj.type) {
      case 'league_position':
        // Para "evitar descenso", no marcar como 100% hasta última jornada
        if (isEndOfSeasonObjective && !seasonFinished) {
          // Mostrar progreso basado en posición pero nunca 100%
          if (teamStats.position <= obj.target) return 95; // En buena posición pero no completado
          const totalTeams = state.leagueTable?.length || 20;
          return Math.max(0, Math.round((1 - (teamStats.position - obj.target) / (totalTeams - obj.target)) * 90));
        }
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

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'critical':
        return { icon: Flame, label: 'Crítico', color: '#ff453a' };
      case 'high':
        return { icon: Zap, label: 'Principal', color: '#ff9f0a' };
      case 'medium':
        return { icon: Target, label: 'Secundario', color: '#0a84ff' };
      case 'low':
        return { icon: CircleDot, label: 'Opcional', color: '#8e8e93' };
      default:
        return { icon: CircleDot, label: 'Objetivo', color: '#8e8e93' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'league_position': return Trophy;
      case 'goal_difference': return TrendingUp;
      case 'financial': return Wallet;
      default: return Target;
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle2, label: 'Cumplido', color: '#30d158' };
      case 'on-track':
        return { icon: Clock, label: 'En camino', color: '#0a84ff' };
      case 'warning':
        return { icon: AlertTriangle, label: 'En riesgo', color: '#ff9f0a' };
      case 'danger':
        return { icon: XCircle, label: 'Peligro', color: '#ff453a' };
      default:
        return { icon: Clock, label: 'Pendiente', color: '#8e8e93' };
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount <= -1000000) return `-€${(Math.abs(amount) / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  // Estadísticas de objetivos
  const stats = useMemo(() => {
    const completed = objectives.filter(obj => getObjectiveProgress(obj) >= 100).length;
    const inProgress = objectives.filter(obj => {
      const status = getObjectiveStatus(obj);
      return status === 'on-track';
    }).length;
    const atRisk = objectives.filter(obj => {
      const status = getObjectiveStatus(obj);
      return status === 'warning' || status === 'danger';
    }).length;
    return { completed, inProgress, atRisk, total: objectives.length };
  }, [objectives, teamStats]);

  // Filtrar objetivos
  const filteredObjectives = useMemo(() => {
    if (filter === 'all') return objectives;
    return objectives.filter(obj => {
      const status = getObjectiveStatus(obj);
      if (filter === 'completed') return status === 'completed';
      if (filter === 'in-progress') return status === 'on-track';
      if (filter === 'at-risk') return status === 'warning' || status === 'danger';
      return true;
    });
  }, [objectives, filter, teamStats]);

  // Separar por prioridad
  const criticalObjectives = filteredObjectives.filter(obj => obj.priority === 'critical');
  const otherObjectives = filteredObjectives.filter(obj => obj.priority !== 'critical');

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getProgressExplanation = (obj) => {
    if (!teamStats) return 'Cargando datos...';
    
    switch (obj.type) {
      case 'league_position':
        return `Posición actual: ${teamStats.position}º | Objetivo: Top ${obj.target}`;
      case 'goal_difference':
        return `Diferencia actual: ${teamStats.goalDifference > 0 ? '+' : ''}${teamStats.goalDifference} | Objetivo: ${obj.target > 0 ? '+' : ''}${obj.target}`;
      case 'financial':
        return `Presupuesto: ${formatMoney(state.money)} | Objetivo: Mantener saldo positivo`;
      default:
        return '';
    }
  };

  return (
    <div className="objectives">
      {/* Header */}
      <header className="objectives__header">
        <div className="header-title">
          <Target size={28} className="header-icon" />
          <div>
            <h1>Objetivos de Temporada</h1>
            <p className="subtitle">Temporada {state.currentSeason} · Semana {state.currentWeek}/38</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="objectives__stats">
        <div className="stat-card stat-card--completed">
          <CheckCircle2 size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.completed}/{stats.total}</span>
            <span className="stat-label">Completados</span>
          </div>
        </div>
        
        <div className="stat-card stat-card--position">
          <Trophy size={24} />
          <div className="stat-content">
            <span className="stat-value">{teamStats?.position || '-'}º</span>
            <span className="stat-label">Posición</span>
          </div>
        </div>
        
        <div className={`stat-card ${teamStats?.goalDifference >= 0 ? 'stat-card--positive' : 'stat-card--negative'}`}>
          {teamStats?.goalDifference >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          <div className="stat-content">
            <span className="stat-value">
              {teamStats?.goalDifference > 0 ? '+' : ''}{teamStats?.goalDifference || 0}
            </span>
            <span className="stat-label">Dif. goles</span>
          </div>
        </div>
        
        <div className={`stat-card ${state.money >= 0 ? 'stat-card--positive' : 'stat-card--negative'}`}>
          <Wallet size={24} />
          <div className="stat-content">
            <span className="stat-value">{formatMoney(state.money)}</span>
            <span className="stat-label">Presupuesto</span>
          </div>
        </div>
      </div>

      {/* Alerta de objetivos en riesgo */}
      {stats.atRisk > 0 && (
        <div className="objectives__alert">
          <AlertTriangle size={20} />
          <span>
            <strong>{stats.atRisk} objetivo{stats.atRisk > 1 ? 's' : ''}</strong> en riesgo. 
            Revisa tu estrategia para evitar penalizaciones.
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="objectives__filters">
        <Filter size={18} />
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({stats.total})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <CheckCircle2 size={14} /> Cumplidos ({stats.completed})
        </button>
        <button 
          className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          <Clock size={14} /> En progreso ({stats.inProgress})
        </button>
        <button 
          className={`filter-btn ${filter === 'at-risk' ? 'active' : ''}`}
          onClick={() => setFilter('at-risk')}
        >
          <AlertTriangle size={14} /> En riesgo ({stats.atRisk})
        </button>
      </div>

      {/* Objetivos Críticos */}
      {criticalObjectives.length > 0 && (
        <section className="objectives__section">
          <h2 className="section-title">
            <Flame size={20} className="section-icon section-icon--critical" />
            Objetivos Críticos
          </h2>
          <div className="objectives__list">
            {criticalObjectives.map(obj => {
              const progress = getObjectiveProgress(obj);
              const status = getObjectiveStatus(obj);
              const statusConfig = getStatusConfig(status);
              const TypeIcon = getTypeIcon(obj.type);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedId === obj.id;
              
              return (
                <div 
                  key={obj.id} 
                  className={`objective-card objective-card--${status}`}
                  onClick={() => toggleExpand(obj.id)}
                >
                  <div className="objective-main">
                    <div className="objective-icon">
                      <TypeIcon size={24} />
                    </div>
                    
                    <div className="objective-content">
                      <div className="objective-header">
                        <h3 className="objective-name">{obj.name}</h3>
                        <div className="objective-status" style={{ '--status-color': statusConfig.color }}>
                          <StatusIcon size={16} />
                          <span>{statusConfig.label}</span>
                        </div>
                      </div>
                      
                      <p className="objective-desc">{obj.description}</p>
                      
                      <div className="objective-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${Math.min(100, progress)}%`,
                              background: statusConfig.color
                            }}
                          />
                        </div>
                        <span className="progress-value">{progress}%</span>
                      </div>
                    </div>
                    
                    <div className="objective-expand">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="objective-details">
                      <div className="detail-row">
                        <Info size={16} />
                        <span>{getProgressExplanation(obj)}</span>
                      </div>
                      
                      <div className="objective-rewards">
                        {obj.reward > 0 && (
                          <div className="reward reward--positive">
                            <Award size={16} />
                            <span>Recompensa: {formatMoney(obj.reward)}</span>
                          </div>
                        )}
                        {obj.penalty < 0 && (
                          <div className="reward reward--negative">
                            <Shield size={16} />
                            <span>Penalización: {formatMoney(obj.penalty)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Objetivos Secundarios */}
      {otherObjectives.length > 0 && (
        <section className="objectives__section">
          <h2 className="section-title">
            <Target size={20} className="section-icon" />
            Objetivos Secundarios
          </h2>
          <div className="objectives__list objectives__list--compact">
            {otherObjectives.map(obj => {
              const progress = getObjectiveProgress(obj);
              const status = getObjectiveStatus(obj);
              const statusConfig = getStatusConfig(status);
              const TypeIcon = getTypeIcon(obj.type);
              const priorityConfig = getPriorityConfig(obj.priority);
              const PriorityIcon = priorityConfig.icon;
              
              return (
                <div 
                  key={obj.id} 
                  className={`objective-card objective-card--compact objective-card--${status}`}
                >
                  <div className="objective-icon objective-icon--small">
                    <TypeIcon size={18} />
                  </div>
                  
                  <div className="objective-content">
                    <div className="objective-header">
                      <h3 className="objective-name">{obj.name}</h3>
                      <span 
                        className="priority-badge" 
                        style={{ '--priority-color': priorityConfig.color }}
                      >
                        <PriorityIcon size={12} />
                        {priorityConfig.label}
                      </span>
                    </div>
                    
                    <div className="objective-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(100, progress)}%`,
                            background: statusConfig.color
                          }}
                        />
                      </div>
                      <span className="progress-value">{progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sin objetivos */}
      {objectives.length === 0 && (
        <div className="objectives__empty">
          <Target size={48} />
          <h3>Sin objetivos definidos</h3>
          <p>Los objetivos de temporada se generarán al comenzar la liga.</p>
        </div>
      )}

      {/* Sin resultados de filtro */}
      {objectives.length > 0 && filteredObjectives.length === 0 && (
        <div className="objectives__empty">
          <Filter size={48} />
          <h3>Sin resultados</h3>
          <p>No hay objetivos que coincidan con el filtro seleccionado.</p>
        </div>
      )}

      {/* Tip */}
      <div className="objectives__tip">
        <Info size={18} />
        <p>
          <strong>Consejo:</strong> Cumplir los objetivos críticos es esencial para mantener tu puesto. 
          Un buen rendimiento puede atraer ofertas de equipos más grandes.
        </p>
      </div>
    </div>
  );
}
