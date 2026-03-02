import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import ContrarrelojProgress from '../ContrarrelojProgress/ContrarrelojProgress';
import { useTranslation } from 'react-i18next';
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
  Filter,
  Award,
  Flame,
  Shield,
  Zap,
  Info,
  Users,
  Calendar,
  Star,
  Briefcase
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './Objectives.scss';

export default function Objectives() {
  const { state } = useGame();
  const { t } = useTranslation();

  // Modo contrarreloj: mostrar panel de progreso en vez de objetivos
  if (state.gameMode === 'contrarreloj') {
    return <ContrarrelojProgress />;
  }

  const objectives = Array.isArray(state.seasonObjectives) ? state.seasonObjectives : [];
  const [filter, setFilter] = useState('all');
  
  // Helper: resolve translatable objective name/description
  const objName = (obj) => obj.nameKey ? t(obj.nameKey) : (obj.name || '');
  const objDesc = (obj) => obj.descKey ? t(obj.descKey) : (obj.description || '');
  
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
    
    const isEndOfSeasonObjective = obj.type === 'league_position' && obj.target >= 17;
    const seasonFinished = state.currentWeek >= 38;
    
    switch (obj.type) {
      case 'league_position':
        if (isEndOfSeasonObjective && !seasonFinished) {
          if (teamStats.position <= obj.target) return 95;
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
        return { icon: Flame, label: t('objectives.critical'), color: '#ff453a' };
      case 'high':
        return { icon: Zap, label: t('objectives.high'), color: '#ff9f0a' };
      case 'medium':
        return { icon: Target, label: t('objectives.medium'), color: '#0a84ff' };
      case 'low':
        return { icon: FootballIcon, label: t('objectives.low'), color: '#8e8e93' };
      default:
        return { icon: FootballIcon, label: t('objectives.objective'), color: '#8e8e93' };
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
        return { icon: CheckCircle2, label: t('objectives.completed'), color: '#30d158' };
      case 'on-track':
        return { icon: Clock, label: t('objectives.onTrack'), color: '#0a84ff' };
      case 'warning':
        return { icon: AlertTriangle, label: t('objectives.atRisk'), color: '#ff9f0a' };
      case 'danger':
        return { icon: XCircle, label: t('objectives.danger'), color: '#ff453a' };
      default:
        return { icon: Clock, label: t('objectives.pending'), color: '#8e8e93' };
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount <= -1000000) return `-€${(Math.abs(amount) / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  const getProgressExplanation = (obj) => {
    if (!teamStats) return t('common.loading');
    
    switch (obj.type) {
      case 'league_position':
        return t('objectives.positionExplanation', { position: teamStats.position, target: obj.target });
      case 'goal_difference':
        return t('objectives.goalDiffExplanation', { current: `${teamStats.goalDifference > 0 ? '+' : ''}${teamStats.goalDifference}`, target: `${obj.target > 0 ? '+' : ''}${obj.target}` });
      case 'financial':
        return t('objectives.financialExplanation', { budget: formatMoney(state.money) });
      default:
        return '';
    }
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

  const isGlory = state.gameMode === 'glory';
  const confidence = state.managerConfidence ?? 75;
  const confidenceColor = confidence > 60 ? '#30d158' : confidence > 35 ? '#ff9f0a' : '#ff453a';
  const confidenceLabel = confidence > 75 ? 'Excelente' : confidence > 60 ? 'Buena' : confidence > 35 ? 'En riesgo' : confidence > 15 ? 'Crítica' : 'Despido inminente';
  const gloryData = state.gloryData;
  const totalPlayers = state.team?.players?.length || 0;
  const avgOvr = useMemo(() => {
    const players = state.team?.players || [];
    if (!players.length) return 0;
    const sorted = [...players].sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const top11 = sorted.slice(0, Math.min(11, sorted.length));
    return Math.round(top11.reduce((s, p) => s + (p.overall || 50), 0) / top11.length);
  }, [state.team?.players]);

  return (
    <div className="objectives fade-in-up">
      {/* Glory Mode: Board Panel */}
      {isGlory && (
        <div className="objectives__board">
          <div className="objectives__board-header">
            <Briefcase size={20} />
            <div>
              <h2>Directiva</h2>
              <span className="objectives__board-season">Temporada {state.currentSeason} · Semana {state.currentWeek}/38</span>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="objectives__confidence">
            <div className="objectives__confidence-top">
              <span className="objectives__confidence-label">Confianza de la directiva</span>
              <span className="objectives__confidence-value" style={{ color: confidenceColor }}>{confidence}%</span>
            </div>
            <div className="objectives__confidence-bar">
              <div className="objectives__confidence-fill" style={{ width: `${confidence}%`, background: confidenceColor }} />
              <div className="objectives__confidence-danger-zone" />
            </div>
            <span className="objectives__confidence-status" style={{ color: confidenceColor }}>{confidenceLabel}</span>
          </div>

          {/* Key stats grid */}
          <div className="objectives__board-stats">
            <div className="objectives__board-stat">
              <Trophy size={15} />
              <div>
                <span className="value">{teamStats?.position || '-'}º</span>
                <span className="label">Posición</span>
              </div>
            </div>
            <div className="objectives__board-stat">
              <Star size={15} />
              <div>
                <span className="value">{avgOvr}</span>
                <span className="label">OVR medio</span>
              </div>
            </div>
            <div className="objectives__board-stat">
              <Users size={15} />
              <div>
                <span className="value">{totalPlayers}</span>
                <span className="label">Plantilla</span>
              </div>
            </div>
            <div className="objectives__board-stat">
              <Wallet size={15} />
              <div>
                <span className="value" style={{ color: state.money >= 0 ? '#4ade80' : '#ff453a' }}>{formatMoney(state.money)}</span>
                <span className="label">Presupuesto</span>
              </div>
            </div>
            <div className="objectives__board-stat">
              {teamStats?.goalDifference >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              <div>
                <span className="value">{teamStats?.goalDifference > 0 ? '+' : ''}{teamStats?.goalDifference || 0}</span>
                <span className="label">Dif. goles</span>
              </div>
            </div>
            <div className="objectives__board-stat">
              <Calendar size={15} />
              <div>
                <span className="value">{gloryData?.currentDivision || 1}</span>
                <span className="label">División</span>
              </div>
            </div>
          </div>

          {/* Record */}
          {teamStats && (
            <div className="objectives__board-record">
              <span className="objectives__board-record-item win">{teamStats.wins}V</span>
              <span className="objectives__board-record-item draw">{teamStats.draws}E</span>
              <span className="objectives__board-record-item loss">{teamStats.losses}D</span>
              <span className="objectives__board-record-pts">{teamStats.points} pts</span>
            </div>
          )}
        </div>
      )}

      {/* Glory Mode: only board panel, no objectives */}
      {isGlory && (
        <>
          {/* Tip */}
          <div className="objectives__tip">
            <div className="objectives__tip-icon">
              <Info size={16} />
            </div>
            <p>
              La directiva evalúa tu rendimiento cada 4 semanas. Si la confianza cae por debajo del 10%, serás destituido.
            </p>
          </div>
        </>
      )}

      {/* Hero Card (non-glory) */}
      {!isGlory && (
      <div className="objectives__hero">
        <div className="objectives__hero-bg" />
        <div className="objectives__hero-content">
          <div className="objectives__hero-icon">
            <Target size={26} />
          </div>
          <div className="objectives__hero-info">
            <span className="objectives__hero-label">{t('objectives.seasonObjectives')}</span>
            <span className="objectives__hero-title">
              {t('office.seasonInfo', { season: state.currentSeason })}
            </span>
            <span className="objectives__hero-subtitle">
              {t('office.weekInfo', { week: state.currentWeek })}/38
            </span>
          </div>
        </div>
        <div className="objectives__hero-stats">
          <div className="objectives__hero-stat">
            <div className="objectives__hero-stat-icon completed">
              <CheckCircle2 size={14} />
            </div>
            <div className="objectives__hero-stat-info">
              <span className="objectives__hero-stat-value">{stats.completed}/{stats.total}</span>
              <span className="objectives__hero-stat-label">{t('objectives.completed')}</span>
            </div>
          </div>
          <div className="objectives__hero-stat">
            <div className="objectives__hero-stat-icon position">
              <Trophy size={14} />
            </div>
            <div className="objectives__hero-stat-info">
              <span className="objectives__hero-stat-value">{teamStats?.position || '-'}º</span>
              <span className="objectives__hero-stat-label">{t('ranking.position')}</span>
            </div>
          </div>
          <div className="objectives__hero-stat">
            <div className={`objectives__hero-stat-icon ${teamStats?.goalDifference >= 0 ? 'positive' : 'negative'}`}>
              {teamStats?.goalDifference >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <div className="objectives__hero-stat-info">
              <span className="objectives__hero-stat-value">
                {teamStats?.goalDifference > 0 ? '+' : ''}{teamStats?.goalDifference || 0}
              </span>
              <span className="objectives__hero-stat-label">{t('objectives.goalDifference')}</span>
            </div>
          </div>
          <div className="objectives__hero-stat">
            <div className={`objectives__hero-stat-icon ${state.money >= 0 ? 'positive' : 'negative'}`}>
              <Wallet size={14} />
            </div>
            <div className="objectives__hero-stat-info">
              <span className="objectives__hero-stat-value">{formatMoney(state.money)}</span>
              <span className="objectives__hero-stat-label">{t('objectives.budget')}</span>
            </div>
          </div>
          {stats.atRisk > 0 && (
            <div className="objectives__hero-stat objectives__hero-stat--alert">
              <div className="objectives__hero-stat-icon danger">
                <AlertTriangle size={14} />
              </div>
              <div className="objectives__hero-stat-info">
                <span className="objectives__hero-stat-value">{stats.atRisk}</span>
                <span className="objectives__hero-stat-label">{t('objectives.atRisk')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Filters (non-glory only) */}
      {!isGlory && <div className="objectives__filters">
        <button 
          className={`objectives__filter ${filter === 'all' ? 'objectives__filter--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('objectives.all')} ({stats.total})
        </button>
        <button 
          className={`objectives__filter ${filter === 'completed' ? 'objectives__filter--active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <CheckCircle2 size={12} /> {t('objectives.completed')}
        </button>
        <button 
          className={`objectives__filter ${filter === 'in-progress' ? 'objectives__filter--active' : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          <Clock size={12} /> {t('objectives.inProgress')}
        </button>
        <button 
          className={`objectives__filter ${filter === 'at-risk' ? 'objectives__filter--active' : ''}`}
          onClick={() => setFilter('at-risk')}
        >
          <AlertTriangle size={12} /> {t('objectives.atRisk')}
        </button>
      </div>}

      {!isGlory && <>
      {/* Objectives List */}
      {filteredObjectives.length > 0 && (
        <div className="objectives__card">
          <div className="objectives__card-body">
            {filteredObjectives.map(obj => {
              const progress = getObjectiveProgress(obj);
              const status = getObjectiveStatus(obj);
              const statusConfig = getStatusConfig(status);
              const TypeIcon = getTypeIcon(obj.type);
              const StatusIcon = statusConfig.icon;
              const priorityConfig = getPriorityConfig(obj.priority);
              const PriorityIcon = priorityConfig.icon;
              
              return (
                <div key={obj.id} className="objectives__item">
                  <div className="objectives__item-header">
                    <div className="objectives__item-icon" style={{ background: `${statusConfig.color}1f`, color: statusConfig.color }}>
                      <TypeIcon size={16} />
                    </div>
                    <div className="objectives__item-info">
                      <span className="objectives__item-name">{objName(obj)}</span>
                      <span className="objectives__item-detail">{getProgressExplanation(obj)}</span>
                    </div>
                    <span className="objectives__item-priority" style={{ color: priorityConfig.color, background: `${priorityConfig.color}1f` }}>
                      <PriorityIcon size={10} />
                      {priorityConfig.label}
                    </span>
                  </div>
                  <div className="objectives__item-progress">
                    <div className="objectives__item-bar">
                      <div 
                        className="objectives__item-fill"
                        style={{ width: `${Math.min(100, progress)}%`, background: statusConfig.color }}
                      />
                    </div>
                    <span className="objectives__item-value">{progress}%</span>
                    <div className="objectives__item-status" style={{ color: statusConfig.color }}>
                      <StatusIcon size={14} />
                    </div>
                  </div>
                  {(obj.reward > 0 || obj.penalty < 0) && (
                    <div className="objectives__item-rewards">
                      {obj.reward > 0 && (
                        <span className="objectives__item-reward objectives__item-reward--positive">
                          <Award size={12} /> {formatMoney(obj.reward)}
                        </span>
                      )}
                      {obj.penalty < 0 && (
                        <span className="objectives__item-reward objectives__item-reward--negative">
                          <Shield size={12} /> {formatMoney(obj.penalty)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty states */}
      {objectives.length === 0 && (
        <div className="objectives__empty">
          <div className="objectives__empty-icon">
            <Target size={32} />
          </div>
          <h3>{t('objectives.noObjectives')}</h3>
          <p>{t('objectives.objectivesWillGenerate')}</p>
        </div>
      )}

      {objectives.length > 0 && filteredObjectives.length === 0 && (
        <div className="objectives__empty">
          <div className="objectives__empty-icon">
            <Filter size={32} />
          </div>
          <h3>{t('objectives.noResults')}</h3>
          <p>{t('objectives.noResultsDesc')}</p>
        </div>
      )}

      {/* Tip */}
      <div className="objectives__tip">
        <div className="objectives__tip-icon">
          <Info size={16} />
        </div>
        <p>
          <strong>{t('objectives.tip')}:</strong> {t('objectives.tipContent')}
        </p>
      </div>
      </>}
    </div>
  );
}
