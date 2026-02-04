import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartPulse, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { translatePosition } from '../../game/positionNames';
import './Squad.scss';

// Helper function to normalize positions
const normalizePosition = (pos) => {
  const defenders = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'DFC', 'LD', 'LI', 'CRD', 'CRI', 'LTD', 'LTI'];
  const midfielders = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MED', 'MC', 'MCD', 'MCO', 'MD', 'MI', 'MDD', 'MDI'];
  const forwards = ['ST', 'CF', 'LW', 'RW', 'DEL', 'DC', 'SD', 'ED', 'EI', 'EDD', 'EDI', 'MP'];
  const goalkeepers = ['GK', 'POR'];
  
  if (goalkeepers.includes(pos)) return 'GK';
  if (defenders.includes(pos)) return 'DEF';
  if (midfielders.includes(pos)) return 'MID';
  if (forwards.includes(pos)) return 'FWD';
  return 'MID'; // Default
};

export default function Squad() {
  const { t } = useTranslation();
  const { state } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filter, setFilter] = useState('all'); // all, GK, DEF, MID, FWD
  
  const players = state.team?.players || [];
  
  // Filter players
  const filteredPlayers = filter === 'all' 
    ? players 
    : players.filter(p => normalizePosition(p.position) === filter);
  
  // Sort by position then overall
  const positionOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const posCompare = (positionOrder[normalizePosition(a.position)] || 99) - (positionOrder[normalizePosition(b.position)] || 99);
    if (posCompare !== 0) return posCompare;
    return b.overall - a.overall;
  });
  
  const handleSelectPlayer = (player) => {
    setSelectedPlayer(selectedPlayer?.id === player.id ? null : player);
  };

  const handleBack = () => {
    setSelectedPlayer(null);
  };
  
  const getStatColor = (value) => {
    if (value >= 85) return '#00ff88';
    if (value >= 75) return '#88ff00';
    if (value >= 65) return '#ffffff';
    if (value >= 50) return '#ffaa00';
    return '#ff4444';
  };

  const getPositionColor = (pos) => {
    const normalized = normalizePosition(pos);
    switch(normalized) {
      case 'GK': return '#ffd700';
      case 'DEF': return '#00d4ff';
      case 'MID': return '#30d158';
      case 'FWD': return '#ff453a';
      default: return '#888';
    }
  };

  const getPositionName = (pos) => {
    const normalized = normalizePosition(pos);
    switch(normalized) {
      case 'GK': return t('squad.goalkeeper');
      case 'DEF': return t('squad.defender');
      case 'MID': return t('squad.midfielder');
      case 'FWD': return t('squad.forward');
      default: return pos;
    }
  };

  // Filter button labels (translated position group abbreviations)
  const getFilterLabel = (key) => {
    switch(key) {
      case 'GK': return t('squad.gkShort');
      case 'DEF': return t('squad.defShort');
      case 'MID': return t('squad.midShort');
      case 'FWD': return t('squad.fwdShort');
      default: return key;
    }
  };

  const teamAvg = Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length) || 0;
  const positionCounts = {
    GK: players.filter(p => normalizePosition(p.position) === 'GK').length,
    DEF: players.filter(p => normalizePosition(p.position) === 'DEF').length,
    MID: players.filter(p => normalizePosition(p.position) === 'MID').length,
    FWD: players.filter(p => normalizePosition(p.position) === 'FWD').length,
  };

  // Mobile Detail View
  if (selectedPlayer && window.innerWidth <= 768) {
    const p = selectedPlayer;
    const isInjured = p.injured && p.injuryWeeksLeft > 0;
    
    return (
      <div className="squad squad--detail">
        <button className="squad__back-btn" onClick={handleBack}>
          ← {t('squad.backToSquad')}
        </button>

        <div className="squad__player-hero" style={{ '--pos-color': getPositionColor(p.position) }}>
          <div className="hero-badge">{translatePosition(p.position)}</div>
          <div className="hero-info">
            <h1>{p.name}</h1>
            <span className="hero-pos">{getPositionName(p.position)}</span>
          </div>
          <div className="hero-overall">
            <span className="number">{p.overall}</span>
            <span className="label">OVR</span>
          </div>
        </div>

        {isInjured && (
          <div className="squad__injury-alert">
            <HeartPulse size={14} /> {t('squad.injuredWeeks', { weeks: p.injuryWeeksLeft })}
          </div>
        )}

        <div className="squad__stats-section">
          <h3>{t('formation.statistics')}</h3>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.speed')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.speed || 70}%`, background: getStatColor(p.speed || 70) }}></div>
            </div>
            <span className="stat-num">{p.speed || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.technique')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.technique || 70}%`, background: getStatColor(p.technique || 70) }}></div>
            </div>
            <span className="stat-num">{p.technique || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.passing')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.passing || 70}%`, background: getStatColor(p.passing || 70) }}></div>
            </div>
            <span className="stat-num">{p.passing || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.shooting')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.finishing || 70}%`, background: getStatColor(p.finishing || 70) }}></div>
            </div>
            <span className="stat-num">{p.finishing || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.defense')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.tackling || 70}%`, background: getStatColor(p.tackling || 70) }}></div>
            </div>
            <span className="stat-num">{p.tackling || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">{t('squad.physical')}</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.stamina || 70}%`, background: getStatColor(p.stamina || 70) }}></div>
            </div>
            <span className="stat-num">{p.stamina || 70}</span>
          </div>
        </div>

        <div className="squad__extra-info">
          <div className="info-item">
            <span className="info-label">{t('squad.number')}</span>
            <span className="info-value">#{p.number || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('formation.morale')}</span>
            <span className="info-value">{p.morale || 75}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('formation.energy')}</span>
            <span className="info-value">{p.energy || 100}%</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="squad">
      {/* Header con stats del equipo */}
      <div className="squad__header">
        <div className="squad__team-info">
          <h2>{state.team?.name || t('squad.myTeam')}</h2>
          <span className="player-count">{players.length} {t('plantilla.players')}</span>
        </div>
        <div className="squad__team-avg">
          <span className="avg-number">{teamAvg}</span>
          <span className="avg-label">{t('squad.average')}</span>
        </div>
      </div>

      {/* Filtros por posición */}
      <div className="squad__filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('common.all')} ({players.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'GK' ? 'active' : ''}`}
          onClick={() => setFilter('GK')}
          style={{ '--filter-color': getPositionColor('GK') }}
        >
          {getFilterLabel('GK')} ({positionCounts.GK})
        </button>
        <button 
          className={`filter-btn ${filter === 'DEF' ? 'active' : ''}`}
          onClick={() => setFilter('DEF')}
          style={{ '--filter-color': getPositionColor('DEF') }}
        >
          {getFilterLabel('DEF')} ({positionCounts.DEF})
        </button>
        <button 
          className={`filter-btn ${filter === 'MID' ? 'active' : ''}`}
          onClick={() => setFilter('MID')}
          style={{ '--filter-color': getPositionColor('MID') }}
        >
          {getFilterLabel('MID')} ({positionCounts.MID})
        </button>
        <button 
          className={`filter-btn ${filter === 'FWD' ? 'active' : ''}`}
          onClick={() => setFilter('FWD')}
          style={{ '--filter-color': getPositionColor('FWD') }}
        >
          {getFilterLabel('FWD')} ({positionCounts.FWD})
        </button>
      </div>

      {/* Lista de jugadores */}
      <div className="squad__list">
        {sortedPlayers.map((player, index) => {
          const isInjured = player.injured && player.injuryWeeksLeft > 0;
          const isSelected = selectedPlayer?.id === player.id;
          
          return (
            <div 
              key={player.id || index}
              className={`squad__player ${isInjured ? 'injured' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectPlayer(player)}
            >
              <div 
                className="player-position"
                style={{ background: getPositionColor(player.position) }}
              >
                {translatePosition(player.position)}
              </div>
              
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-meta">
                  {getPositionName(player.position)}
                  {isInjured && <span className="injury-tag"> · <HeartPulse size={12} /> {player.injuryWeeksLeft}s</span>}
                </span>
              </div>
              
              <div className="player-overall" style={{ color: getStatColor(player.overall) }}>
                {player.overall}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Panel lateral con detalles */}
      {selectedPlayer && window.innerWidth > 768 && (
        <div className="squad__desktop-panel">
          <div className="panel-header">
            <h3>{selectedPlayer.name}</h3>
            <button className="close-btn" onClick={handleBack}><X size={16} /></button>
          </div>
          <div className="panel-overall">
            <span className="number">{selectedPlayer.overall}</span>
            <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
              {translatePosition(selectedPlayer.position)}
            </span>
          </div>
          <div className="panel-stats">
            {[
              { key: 'speed', label: t('squad.speed') },
              { key: 'technique', label: t('squad.technique') },
              { key: 'passing', label: t('squad.passing') },
              { key: 'finishing', label: t('squad.shooting') },
              { key: 'tackling', label: t('squad.defense') },
              { key: 'stamina', label: t('squad.physical') }
            ].map(stat => (
              <div key={stat.key} className="panel-stat">
                <span className="label">{stat.label}</span>
                <span className="value">{selectedPlayer[stat.key] || 70}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
