import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { FORMATIONS, TACTICS, calculateTeamStrength } from '../../game/leagueEngine';
import './Formation.scss';

const FORMATION_VISUALS = {
  '4-3-3': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'RB', x: 85, y: 70, label: 'LD' },
      { id: 'CB1', x: 65, y: 75, label: 'DFC' },
      { id: 'CB2', x: 35, y: 75, label: 'DFC' },
      { id: 'LB', x: 15, y: 70, label: 'LI' },
      { id: 'CM1', x: 70, y: 50, label: 'MC' },
      { id: 'CDM', x: 50, y: 55, label: 'MCD' },
      { id: 'CM2', x: 30, y: 50, label: 'MC' },
      { id: 'RW', x: 80, y: 25, label: 'ED' },
      { id: 'ST', x: 50, y: 20, label: 'DC' },
      { id: 'LW', x: 20, y: 25, label: 'EI' },
    ]
  },
  '4-4-2': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'RB', x: 85, y: 70, label: 'LD' },
      { id: 'CB1', x: 65, y: 75, label: 'DFC' },
      { id: 'CB2', x: 35, y: 75, label: 'DFC' },
      { id: 'LB', x: 15, y: 70, label: 'LI' },
      { id: 'RM', x: 85, y: 45, label: 'MD' },
      { id: 'CM1', x: 60, y: 50, label: 'MC' },
      { id: 'CM2', x: 40, y: 50, label: 'MC' },
      { id: 'LM', x: 15, y: 45, label: 'MI' },
      { id: 'ST1', x: 60, y: 20, label: 'DC' },
      { id: 'ST2', x: 40, y: 20, label: 'DC' },
    ]
  },
  '4-2-3-1': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'RB', x: 85, y: 70, label: 'LD' },
      { id: 'CB1', x: 65, y: 75, label: 'DFC' },
      { id: 'CB2', x: 35, y: 75, label: 'DFC' },
      { id: 'LB', x: 15, y: 70, label: 'LI' },
      { id: 'CDM1', x: 60, y: 55, label: 'MCD' },
      { id: 'CDM2', x: 40, y: 55, label: 'MCD' },
      { id: 'RW', x: 75, y: 35, label: 'MD' },
      { id: 'CAM', x: 50, y: 35, label: 'MP' },
      { id: 'LW', x: 25, y: 35, label: 'MI' },
      { id: 'ST', x: 50, y: 15, label: 'DC' },
    ]
  },
  '3-5-2': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'CB1', x: 75, y: 75, label: 'DFC' },
      { id: 'CB2', x: 50, y: 78, label: 'DFC' },
      { id: 'CB3', x: 25, y: 75, label: 'DFC' },
      { id: 'RM', x: 90, y: 50, label: 'CAD' },
      { id: 'CM1', x: 65, y: 50, label: 'MC' },
      { id: 'CDM', x: 50, y: 55, label: 'MCD' },
      { id: 'CM2', x: 35, y: 50, label: 'MC' },
      { id: 'LM', x: 10, y: 50, label: 'CAI' },
      { id: 'ST1', x: 60, y: 20, label: 'DC' },
      { id: 'ST2', x: 40, y: 20, label: 'DC' },
    ]
  },
  '5-3-2': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'RB', x: 90, y: 65, label: 'CAD' },
      { id: 'CB1', x: 70, y: 75, label: 'DFC' },
      { id: 'CB2', x: 50, y: 78, label: 'DFC' },
      { id: 'CB3', x: 30, y: 75, label: 'DFC' },
      { id: 'LB', x: 10, y: 65, label: 'CAI' },
      { id: 'CM1', x: 65, y: 48, label: 'MC' },
      { id: 'CDM', x: 50, y: 52, label: 'MCD' },
      { id: 'CM2', x: 35, y: 48, label: 'MC' },
      { id: 'ST1', x: 60, y: 20, label: 'DC' },
      { id: 'ST2', x: 40, y: 20, label: 'DC' },
    ]
  },
  '4-1-4-1': {
    positions: [
      { id: 'GK', x: 50, y: 90, label: 'POR' },
      { id: 'RB', x: 85, y: 70, label: 'LD' },
      { id: 'CB1', x: 65, y: 75, label: 'DFC' },
      { id: 'CB2', x: 35, y: 75, label: 'DFC' },
      { id: 'LB', x: 15, y: 70, label: 'LI' },
      { id: 'CDM', x: 50, y: 58, label: 'MCD' },
      { id: 'RM', x: 85, y: 40, label: 'MD' },
      { id: 'CM1', x: 60, y: 45, label: 'MC' },
      { id: 'CM2', x: 40, y: 45, label: 'MC' },
      { id: 'LM', x: 15, y: 40, label: 'MI' },
      { id: 'ST', x: 50, y: 18, label: 'DC' },
    ]
  }
};

// Map player positions to formation slots
const POSITION_COMPATIBILITY = {
  'GK': ['GK'],
  'RB': ['RB', 'RWB'],
  'CB1': ['CB'],
  'CB2': ['CB'],
  'CB3': ['CB'],
  'LB': ['LB', 'LWB'],
  'CDM': ['CDM', 'CM'],
  'CDM1': ['CDM', 'CM'],
  'CDM2': ['CDM', 'CM'],
  'CM1': ['CM', 'CDM', 'CAM'],
  'CM2': ['CM', 'CDM', 'CAM'],
  'RM': ['RM', 'RW', 'RB'],
  'LM': ['LM', 'LW', 'LB'],
  'CAM': ['CAM', 'CM', 'ST'],
  'RW': ['RW', 'RM', 'ST'],
  'LW': ['LW', 'LM', 'ST'],
  'ST': ['ST', 'CAM', 'RW', 'LW'],
  'ST1': ['ST', 'CAM', 'RW', 'LW'],
  'ST2': ['ST', 'CAM', 'RW', 'LW'],
};

const TACTIC_ICONS = {
  balanced: '⚖️',
  attacking: '⚔️',
  defensive: '🛡️',
  possession: '🎯',
  counter: '⚡',
  highPress: '🔥'
};

export default function Formation() {
  const { state, dispatch } = useGame();
  const [lineup, setLineup] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  
  const selectedFormation = state.formation || '4-3-3';
  const selectedTactic = state.tactic || 'balanced';
  
  const formationVisual = FORMATION_VISUALS[selectedFormation];
  const formationData = FORMATIONS[selectedFormation];
  const tacticData = TACTICS[selectedTactic];
  const players = state.team?.players || [];
  
  // Calculate team strength with current formation and tactic
  const teamStrength = calculateTeamStrength(state.team, selectedFormation, selectedTactic);
  
  // Get players not in lineup
  const getAvailablePlayers = (slotId) => {
    const usedPlayerNames = Object.values(lineup).map(p => p?.name);
    const compatiblePositions = POSITION_COMPATIBILITY[slotId] || [];
    
    return players
      .filter(p => !usedPlayerNames.includes(p.name) && !p.injured)
      .sort((a, b) => {
        const aCompat = compatiblePositions.includes(a.position) ? 1 : 0;
        const bCompat = compatiblePositions.includes(b.position) ? 1 : 0;
        if (bCompat !== aCompat) return bCompat - aCompat;
        return b.overall - a.overall;
      });
  };
  
  const benchPlayers = players.filter(p => 
    !Object.values(lineup).some(lp => lp?.name === p.name)
  );
  
  const injuredPlayers = players.filter(p => p.injured);
  
  const handleSlotClick = (slotId) => {
    setSelectedSlot(slotId);
    setShowPlayerPicker(true);
  };
  
  const handlePlayerSelect = (player) => {
    setLineup(prev => ({ ...prev, [selectedSlot]: player }));
    setShowPlayerPicker(false);
    setSelectedSlot(null);
  };
  
  const handleRemovePlayer = (slotId) => {
    setLineup(prev => {
      const newLineup = { ...prev };
      delete newLineup[slotId];
      return newLineup;
    });
  };
  
  const handleFormationChange = (newFormation) => {
    dispatch({ type: 'SET_FORMATION', payload: newFormation });
    setLineup({}); // Reset lineup when changing formation
  };
  
  const handleTacticChange = (newTactic) => {
    dispatch({ type: 'SET_TACTIC', payload: newTactic });
  };
  
  const autoFillLineup = () => {
    const newLineup = {};
    const usedPlayers = new Set();
    
    formationVisual.positions.forEach(pos => {
      const compatiblePositions = POSITION_COMPATIBILITY[pos.id] || [];
      const availablePlayer = players
        .filter(p => !usedPlayers.has(p.name) && !p.injured)
        .sort((a, b) => {
          const aCompat = compatiblePositions.includes(a.position) ? 1 : 0;
          const bCompat = compatiblePositions.includes(b.position) ? 1 : 0;
          if (bCompat !== aCompat) return bCompat - aCompat;
          return b.overall - a.overall;
        })[0];
      
      if (availablePlayer) {
        newLineup[pos.id] = availablePlayer;
        usedPlayers.add(availablePlayer.name);
      }
    });
    
    setLineup(newLineup);
  };
  
  const getLineupRating = () => {
    const lineupPlayers = Object.values(lineup);
    if (lineupPlayers.length === 0) return 0;
    return (lineupPlayers.reduce((sum, p) => sum + (p?.overall || 0), 0) / lineupPlayers.length).toFixed(1);
  };
  
  const getPositionColor = (pos) => {
    if (pos === 'GK') return '#f1c40f';
    if (['RB', 'CB', 'CB1', 'CB2', 'CB3', 'LB', 'RWB', 'LWB'].includes(pos)) return '#3498db';
    if (['CDM', 'CDM1', 'CDM2', 'CM', 'CM1', 'CM2', 'RM', 'LM', 'CAM'].includes(pos)) return '#2ecc71';
    return '#e74c3c';
  };
  
  return (
    <div className="formation">
      <div className="formation__header">
        <h2>Alineación y Táctica</h2>
        <div className="formation__controls">
          <div className="control-group">
            <label>Formación</label>
            <select 
              value={selectedFormation} 
              onChange={e => handleFormationChange(e.target.value)}
            >
              {Object.keys(FORMATIONS).map(f => (
                <option key={f} value={f}>{f} - {FORMATIONS[f].description}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Táctica</label>
            <select 
              value={selectedTactic} 
              onChange={e => handleTacticChange(e.target.value)}
            >
              {Object.entries(TACTICS).map(([key, tactic]) => (
                <option key={key} value={key}>{TACTIC_ICONS[key]} {tactic.name}</option>
              ))}
            </select>
          </div>
          <button className="auto-fill" onClick={autoFillLineup}>
            ⚡ Auto
          </button>
        </div>
      </div>
      
      {/* Tactic Info Bar */}
      <div className="formation__tactic-info">
        <div className="tactic-stat">
          <span className="icon">⚔️</span>
          <span className="label">Ataque</span>
          <span className={`value ${tacticData.attack > 1 ? 'high' : tacticData.attack < 1 ? 'low' : ''}`}>
            {Math.round(tacticData.attack * 100)}%
          </span>
        </div>
        <div className="tactic-stat">
          <span className="icon">🛡️</span>
          <span className="label">Defensa</span>
          <span className={`value ${tacticData.defense > 1 ? 'high' : tacticData.defense < 1 ? 'low' : ''}`}>
            {Math.round(tacticData.defense * 100)}%
          </span>
        </div>
        <div className="tactic-stat">
          <span className="icon">🏃</span>
          <span className="label">Cansancio</span>
          <span className={`value ${tacticData.fatigue > 1 ? 'high' : ''}`}>
            {Math.round(tacticData.fatigue * 100)}%
          </span>
        </div>
        <div className="formation-style">
          {formationData.description}
        </div>
      </div>
      
      <div className="formation__content">
        <div className="formation__pitch">
          <div className="pitch-markings">
            <div className="center-circle"></div>
            <div className="center-line"></div>
            <div className="penalty-area top"></div>
            <div className="penalty-area bottom"></div>
            <div className="goal-area top"></div>
            <div className="goal-area bottom"></div>
          </div>
          
          {formationVisual.positions.map(pos => {
            const player = lineup[pos.id];
            const isInjured = player?.injured;
            return (
              <div
                key={pos.id}
                className={`formation__slot ${player ? 'filled' : 'empty'} ${selectedSlot === pos.id ? 'selected' : ''} ${isInjured ? 'injured' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => handleSlotClick(pos.id)}
              >
                {player ? (
                  <>
                    <div className="player-circle" style={{ borderColor: getPositionColor(player.position) }}>
                      <span className="overall">{player.overall}</span>
                    </div>
                    <span className="player-name">{player.name.split(' ').pop()}</span>
                    <button 
                      className="remove-btn"
                      onClick={(e) => { e.stopPropagation(); handleRemovePlayer(pos.id); }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <div className="empty-circle">
                      <span className="pos-label">{pos.label}</span>
                    </div>
                    <span className="add-label">+ Añadir</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="formation__sidebar">
          <div className="formation__strength">
            <h3>Fuerza del Equipo</h3>
            <div className="strength-bars">
              <div className="strength-item">
                <span className="label">🧤 Portería</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${teamStrength.goalkeeper}%` }}></div>
                </div>
                <span className="value">{Math.round(teamStrength.goalkeeper)}</span>
              </div>
              <div className="strength-item">
                <span className="label">🛡️ Defensa</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${teamStrength.defense}%` }}></div>
                </div>
                <span className="value">{Math.round(teamStrength.defense)}</span>
              </div>
              <div className="strength-item">
                <span className="label">🎯 Medio</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${teamStrength.midfield}%` }}></div>
                </div>
                <span className="value">{Math.round(teamStrength.midfield)}</span>
              </div>
              <div className="strength-item">
                <span className="label">⚔️ Ataque</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${teamStrength.attack}%` }}></div>
                </div>
                <span className="value">{Math.round(teamStrength.attack)}</span>
              </div>
            </div>
            <div className="overall-rating">
              <span className="label">Media Global</span>
              <span className="value">{Math.round(teamStrength.overall)}</span>
            </div>
            {teamStrength.starPlayers > 0 && (
              <div className="star-players">
                ⭐ {teamStrength.starPlayers} jugador{teamStrength.starPlayers > 1 ? 'es' : ''} estrella
              </div>
            )}
          </div>
          
          {injuredPlayers.length > 0 && (
            <div className="formation__injured">
              <h3>🏥 Lesionados ({injuredPlayers.length})</h3>
              <div className="injured-list">
                {injuredPlayers.map((player, idx) => (
                  <div key={idx} className="injured-player">
                    <span className="name">{player.name}</span>
                    <span className="weeks">{player.injuryWeeksLeft}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="formation__bench">
            <h3>Banquillo ({benchPlayers.filter(p => !p.injured).length})</h3>
            <div className="bench-list">
              {benchPlayers.filter(p => !p.injured).slice(0, 7).map((player, idx) => (
                <div key={idx} className="bench-player">
                  <span className="pos" style={{ color: getPositionColor(player.position) }}>
                    {player.position}
                  </span>
                  <span className="name">{player.name}</span>
                  <span className="ovr">{player.overall}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {showPlayerPicker && (
        <div className="formation__modal-overlay" onClick={() => setShowPlayerPicker(false)}>
          <div className="formation__modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Jugador</h3>
              <button onClick={() => setShowPlayerPicker(false)}>✕</button>
            </div>
            <div className="modal-content">
              {getAvailablePlayers(selectedSlot).map((player, idx) => {
                const isCompatible = POSITION_COMPATIBILITY[selectedSlot]?.includes(player.position);
                return (
                  <div 
                    key={idx} 
                    className={`modal-player ${isCompatible ? 'compatible' : ''}`}
                    onClick={() => handlePlayerSelect(player)}
                  >
                    <span className="pos" style={{ color: getPositionColor(player.position) }}>
                      {player.position}
                    </span>
                    <span className="name">{player.name}</span>
                    <span className="ovr">{player.overall}</span>
                    {isCompatible && <span className="compat-badge">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
