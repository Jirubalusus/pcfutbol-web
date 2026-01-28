import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './Squad.scss';

// Helper function to normalize positions
const normalizePosition = (pos) => {
  const defenders = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'];
  const midfielders = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MED'];
  const forwards = ['ST', 'CF', 'LW', 'RW', 'DEL'];
  const goalkeepers = ['GK', 'POR'];
  
  if (goalkeepers.includes(pos)) return 'POR';
  if (defenders.includes(pos)) return 'DEF';
  if (midfielders.includes(pos)) return 'MED';
  if (forwards.includes(pos)) return 'DEL';
  return 'MED'; // Default
};

export default function Squad() {
  const { state } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filter, setFilter] = useState('all'); // all, POR, DEF, MED, DEL
  
  const players = state.team?.players || [];
  
  // Filter players
  const filteredPlayers = filter === 'all' 
    ? players 
    : players.filter(p => normalizePosition(p.position) === filter);
  
  // Sort by position then overall
  const positionOrder = { POR: 0, DEF: 1, MED: 2, DEL: 3 };
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
      case 'POR': return '#ffd700';
      case 'DEF': return '#00d4ff';
      case 'MED': return '#30d158';
      case 'DEL': return '#ff453a';
      default: return '#888';
    }
  };

  const getPositionName = (pos) => {
    const normalized = normalizePosition(pos);
    switch(normalized) {
      case 'POR': return 'Portero';
      case 'DEF': return 'Defensa';
      case 'MED': return 'Centrocampista';
      case 'DEL': return 'Delantero';
      default: return pos;
    }
  };

  const teamAvg = Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length) || 0;
  const positionCounts = {
    POR: players.filter(p => normalizePosition(p.position) === 'POR').length,
    DEF: players.filter(p => normalizePosition(p.position) === 'DEF').length,
    MED: players.filter(p => normalizePosition(p.position) === 'MED').length,
    DEL: players.filter(p => normalizePosition(p.position) === 'DEL').length,
  };

  // Mobile Detail View
  if (selectedPlayer && window.innerWidth <= 768) {
    const p = selectedPlayer;
    const isInjured = p.injured && p.injuryWeeksLeft > 0;
    
    return (
      <div className="squad squad--detail">
        <button className="squad__back-btn" onClick={handleBack}>
          ← Volver a plantilla
        </button>

        <div className="squad__player-hero" style={{ '--pos-color': getPositionColor(p.position) }}>
          <div className="hero-badge">{p.position}</div>
          <div className="hero-info">
            <h1>{p.name}</h1>
            <span className="hero-pos">{getPositionName(p.position)}</span>
          </div>
          <div className="hero-overall">
            <span className="number">{p.overall}</span>
            <span className="label">MED</span>
          </div>
        </div>

        {isInjured && (
          <div className="squad__injury-alert">
            🏥 Lesionado · {p.injuryWeeksLeft} semana{p.injuryWeeksLeft > 1 ? 's' : ''} de baja
          </div>
        )}

        <div className="squad__stats-section">
          <h3>Estadísticas</h3>
          
          <div className="stat-row">
            <span className="stat-name">Velocidad</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.speed || 70}%`, background: getStatColor(p.speed || 70) }}></div>
            </div>
            <span className="stat-num">{p.speed || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">Técnica</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.technique || 70}%`, background: getStatColor(p.technique || 70) }}></div>
            </div>
            <span className="stat-num">{p.technique || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">Pase</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.passing || 70}%`, background: getStatColor(p.passing || 70) }}></div>
            </div>
            <span className="stat-num">{p.passing || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">Remate</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.finishing || 70}%`, background: getStatColor(p.finishing || 70) }}></div>
            </div>
            <span className="stat-num">{p.finishing || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">Defensa</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.tackling || 70}%`, background: getStatColor(p.tackling || 70) }}></div>
            </div>
            <span className="stat-num">{p.tackling || 70}</span>
          </div>
          
          <div className="stat-row">
            <span className="stat-name">Físico</span>
            <div className="stat-bar-container">
              <div className="stat-bar" style={{ width: `${p.stamina || 70}%`, background: getStatColor(p.stamina || 70) }}></div>
            </div>
            <span className="stat-num">{p.stamina || 70}</span>
          </div>
        </div>

        <div className="squad__extra-info">
          <div className="info-item">
            <span className="info-label">Dorsal</span>
            <span className="info-value">#{p.number || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Moral</span>
            <span className="info-value">{p.morale || 75}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Energía</span>
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
          <h2>{state.team?.name || 'Mi Equipo'}</h2>
          <span className="player-count">{players.length} jugadores</span>
        </div>
        <div className="squad__team-avg">
          <span className="avg-number">{teamAvg}</span>
          <span className="avg-label">Media</span>
        </div>
      </div>

      {/* Filtros por posición */}
      <div className="squad__filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({players.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'POR' ? 'active' : ''}`}
          onClick={() => setFilter('POR')}
          style={{ '--filter-color': getPositionColor('POR') }}
        >
          POR ({positionCounts.POR})
        </button>
        <button 
          className={`filter-btn ${filter === 'DEF' ? 'active' : ''}`}
          onClick={() => setFilter('DEF')}
          style={{ '--filter-color': getPositionColor('DEF') }}
        >
          DEF ({positionCounts.DEF})
        </button>
        <button 
          className={`filter-btn ${filter === 'MED' ? 'active' : ''}`}
          onClick={() => setFilter('MED')}
          style={{ '--filter-color': getPositionColor('MED') }}
        >
          MED ({positionCounts.MED})
        </button>
        <button 
          className={`filter-btn ${filter === 'DEL' ? 'active' : ''}`}
          onClick={() => setFilter('DEL')}
          style={{ '--filter-color': getPositionColor('DEL') }}
        >
          DEL ({positionCounts.DEL})
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
                {player.position}
              </div>
              
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-meta">
                  {getPositionName(player.position)}
                  {isInjured && <span className="injury-tag"> · 🏥 {player.injuryWeeksLeft}s</span>}
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
            <button className="close-btn" onClick={handleBack}>✕</button>
          </div>
          <div className="panel-overall">
            <span className="number">{selectedPlayer.overall}</span>
            <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
              {selectedPlayer.position}
            </span>
          </div>
          <div className="panel-stats">
            {['speed', 'technique', 'passing', 'finishing', 'tackling', 'stamina'].map(stat => (
              <div key={stat} className="panel-stat">
                <span className="label">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                <span className="value">{selectedPlayer[stat] || 70}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
