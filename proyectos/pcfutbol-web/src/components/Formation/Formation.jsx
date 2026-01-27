import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { FORMATIONS, TACTICS, calculateTeamStrength } from '../../game/leagueEngine';
import './Formation.scss';

// Posiciones del campo para cada formación
const FORMATION_POSITIONS = {
  '4-3-3': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CM1', x: 70, y: 50 },
    { id: 'CDM', x: 50, y: 55 },
    { id: 'CM2', x: 30, y: 50 },
    { id: 'RW', x: 80, y: 25 },
    { id: 'ST', x: 50, y: 18 },
    { id: 'LW', x: 20, y: 25 },
  ],
  '4-4-2': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'RM', x: 85, y: 48 },
    { id: 'CM1', x: 60, y: 52 },
    { id: 'CM2', x: 40, y: 52 },
    { id: 'LM', x: 15, y: 48 },
    { id: 'ST1', x: 60, y: 20 },
    { id: 'ST2', x: 40, y: 20 },
  ],
  '4-2-3-1': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CDM1', x: 60, y: 55 },
    { id: 'CDM2', x: 40, y: 55 },
    { id: 'RW', x: 75, y: 35 },
    { id: 'CAM', x: 50, y: 35 },
    { id: 'LW', x: 25, y: 35 },
    { id: 'ST', x: 50, y: 15 },
  ],
  '3-5-2': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'CB1', x: 75, y: 75 },
    { id: 'CB2', x: 50, y: 80 },
    { id: 'CB3', x: 25, y: 75 },
    { id: 'RM', x: 90, y: 48 },
    { id: 'CM1', x: 65, y: 50 },
    { id: 'CDM', x: 50, y: 55 },
    { id: 'CM2', x: 35, y: 50 },
    { id: 'LM', x: 10, y: 48 },
    { id: 'ST1', x: 60, y: 20 },
    { id: 'ST2', x: 40, y: 20 },
  ],
  '5-3-2': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 90, y: 65 },
    { id: 'CB1', x: 70, y: 75 },
    { id: 'CB2', x: 50, y: 80 },
    { id: 'CB3', x: 30, y: 75 },
    { id: 'LB', x: 10, y: 65 },
    { id: 'CM1', x: 65, y: 48 },
    { id: 'CDM', x: 50, y: 52 },
    { id: 'CM2', x: 35, y: 48 },
    { id: 'ST1', x: 60, y: 20 },
    { id: 'ST2', x: 40, y: 20 },
  ],
  '4-1-4-1': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CDM', x: 50, y: 58 },
    { id: 'RM', x: 85, y: 40 },
    { id: 'CM1', x: 60, y: 45 },
    { id: 'CM2', x: 40, y: 45 },
    { id: 'LM', x: 15, y: 40 },
    { id: 'ST', x: 50, y: 18 },
  ]
};

// Compatibilidad de posiciones
const POSITION_COMPAT = {
  'GK': ['GK'],
  'RB': ['RB', 'RWB', 'CB'],
  'CB1': ['CB'],
  'CB2': ['CB'],
  'CB3': ['CB'],
  'LB': ['LB', 'LWB', 'CB'],
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

// Atributos para mostrar en tabla
const PLAYER_ATTRIBUTES = [
  { key: 'overall', label: 'MED', short: 'MED' },
  { key: 'pace', label: 'VEL', short: 'VE' },
  { key: 'shooting', label: 'TIR', short: 'TI' },
  { key: 'passing', label: 'PAS', short: 'PA' },
  { key: 'dribbling', label: 'REG', short: 'RE' },
  { key: 'defending', label: 'DEF', short: 'DE' },
  { key: 'physical', label: 'FIS', short: 'FI' },
];

export default function Formation() {
  const { state, dispatch } = useGame();
  const [lineup, setLineup] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('titulares');
  
  const selectedFormation = state.formation || '4-3-3';
  const selectedTactic = state.tactic || 'balanced';
  
  const formationPositions = FORMATION_POSITIONS[selectedFormation] || FORMATION_POSITIONS['4-3-3'];
  const players = state.team?.players || [];
  const teamStrength = calculateTeamStrength(state.team, selectedFormation, selectedTactic);
  
  // Dividir jugadores por categoría
  const categorizedPlayers = useMemo(() => {
    const lineupIds = Object.values(lineup).map(p => p?.name);
    const titulares = [];
    const convocados = [];
    const noConvocados = [];
    
    players.forEach((player, idx) => {
      const isInLineup = lineupIds.includes(player.name);
      const playerWithNumber = { ...player, number: idx + 1 };
      
      if (isInLineup) {
        titulares.push(playerWithNumber);
      } else if (!player.injured && convocados.length < 7) {
        convocados.push(playerWithNumber);
      } else {
        noConvocados.push(playerWithNumber);
      }
    });
    
    return { titulares, convocados, noConvocados };
  }, [players, lineup]);
  
  // Auto-fill lineup al cargar
  useEffect(() => {
    if (Object.keys(lineup).length === 0 && players.length >= 11) {
      autoFillLineup();
    }
  }, [players]);
  
  const autoFillLineup = () => {
    const newLineup = {};
    const used = new Set();
    
    formationPositions.forEach(pos => {
      const compat = POSITION_COMPAT[pos.id] || [];
      const best = players
        .filter(p => !used.has(p.name) && !p.injured)
        .sort((a, b) => {
          const aMatch = compat.includes(a.position) ? 1 : 0;
          const bMatch = compat.includes(b.position) ? 1 : 0;
          if (bMatch !== aMatch) return bMatch - aMatch;
          return b.overall - a.overall;
        })[0];
      
      if (best) {
        newLineup[pos.id] = best;
        used.add(best.name);
      }
    });
    
    setLineup(newLineup);
  };
  
  const handleSlotClick = (slotId) => {
    setSelectedSlot(slotId);
    setShowModal(true);
  };
  
  const handlePlayerSelect = (player) => {
    if (selectedSlot) {
      // Quitar de otra posición si ya está
      const newLineup = { ...lineup };
      Object.keys(newLineup).forEach(key => {
        if (newLineup[key]?.name === player.name) {
          delete newLineup[key];
        }
      });
      newLineup[selectedSlot] = player;
      setLineup(newLineup);
    }
    setSelectedPlayer(player);
    setShowModal(false);
    setSelectedSlot(null);
  };
  
  const handleRowClick = (player) => {
    setSelectedPlayer(player);
  };
  
  const handleFormationChange = (e) => {
    dispatch({ type: 'SET_FORMATION', payload: e.target.value });
    setLineup({});
    setTimeout(autoFillLineup, 100);
  };
  
  const handleTacticChange = (e) => {
    dispatch({ type: 'SET_TACTIC', payload: e.target.value });
  };
  
  const getPositionColor = (pos) => {
    if (pos === 'GK') return '#f1c40f';
    if (['RB', 'CB', 'LB', 'RWB', 'LWB'].includes(pos)) return '#3498db';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos)) return '#2ecc71';
    return '#e74c3c';
  };
  
  const getStarRating = (overall) => {
    if (overall >= 85) return 5;
    if (overall >= 80) return 4;
    if (overall >= 75) return 3;
    if (overall >= 70) return 2;
    return 1;
  };
  
  const renderStars = (count) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };
  
  // Formatear fecha actual
  const currentDate = state.currentDate ? new Date(state.currentDate) : new Date();
  const dateStr = currentDate.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric',
    month: 'long'
  });
  
  return (
    <div className="pcf-formation">
      {/* HEADER */}
      <div className="pcf-header">
        <div className="pcf-header__team">
          <div className="team-badge">{state.team?.name?.charAt(0) || 'E'}</div>
          <span className="team-name">{state.team?.name || 'Mi Equipo'}</span>
        </div>
        <div className="pcf-header__title">
          <h1>ALINEACIÓN</h1>
        </div>
        <div className="pcf-header__info">
          <div className="date-display">
            <span className="label">Fecha</span>
            <span className="value">{dateStr}</span>
          </div>
        </div>
      </div>
      
      {/* CONTROLES */}
      <div className="pcf-controls">
        <div className="control-item">
          <label>Formación</label>
          <select value={selectedFormation} onChange={handleFormationChange}>
            {Object.keys(FORMATIONS).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="control-item">
          <label>Táctica</label>
          <select value={selectedTactic} onChange={handleTacticChange}>
            {Object.entries(TACTICS).map(([key, t]) => (
              <option key={key} value={key}>{t.name}</option>
            ))}
          </select>
        </div>
        <button className="btn-auto" onClick={autoFillLineup}>
          ⚡ AUTO
        </button>
      </div>
      
      {/* CONTENIDO PRINCIPAL */}
      <div className="pcf-content">
        {/* TABLA DE JUGADORES */}
        <div className="pcf-table-container">
          {/* Tabs */}
          <div className="pcf-tabs">
            <button 
              className={`tab ${activeTab === 'titulares' ? 'active' : ''}`}
              onClick={() => setActiveTab('titulares')}
            >
              Titulares ({categorizedPlayers.titulares.length})
            </button>
            <button 
              className={`tab ${activeTab === 'convocados' ? 'active' : ''}`}
              onClick={() => setActiveTab('convocados')}
            >
              Convocados ({categorizedPlayers.convocados.length})
            </button>
            <button 
              className={`tab ${activeTab === 'noconvocados' ? 'active' : ''}`}
              onClick={() => setActiveTab('noconvocados')}
            >
              No Conv. ({categorizedPlayers.noConvocados.length})
            </button>
          </div>
          
          {/* Tabla */}
          <div className="pcf-table">
            <div className="table-header">
              <span className="col-num">Nº</span>
              <span className="col-name">JUGADOR</span>
              {PLAYER_ATTRIBUTES.map(attr => (
                <span key={attr.key} className="col-attr">{attr.short}</span>
              ))}
              <span className="col-pos">POS</span>
            </div>
            
            <div className="table-body">
              {(activeTab === 'titulares' ? categorizedPlayers.titulares :
                activeTab === 'convocados' ? categorizedPlayers.convocados :
                categorizedPlayers.noConvocados
              ).map((player, idx) => (
                <div 
                  key={player.name}
                  className={`table-row ${activeTab} ${selectedPlayer?.name === player.name ? 'selected' : ''} ${player.injured ? 'injured' : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">
                    {player.injured && <span className="injury-icon">🏥</span>}
                    {player.name}
                  </span>
                  {PLAYER_ATTRIBUTES.map(attr => (
                    <span 
                      key={attr.key} 
                      className={`col-attr ${
                        (player[attr.key] || player.overall) >= 80 ? 'high' : 
                        (player[attr.key] || player.overall) <= 60 ? 'low' : ''
                      }`}
                    >
                      {player[attr.key] || player.overall}
                    </span>
                  ))}
                  <span className="col-pos" style={{ color: getPositionColor(player.position) }}>
                    {player.position}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* PANEL DERECHO */}
        <div className="pcf-sidebar">
          {/* CAMPO */}
          <div className="pcf-pitch">
            <div className="pitch-bg">
              <div className="pitch-line center"></div>
              <div className="pitch-circle"></div>
              <div className="pitch-area top"></div>
              <div className="pitch-area bottom"></div>
            </div>
            
            {formationPositions.map(pos => {
              const player = lineup[pos.id];
              return (
                <div
                  key={pos.id}
                  className={`pitch-slot ${player ? 'filled' : 'empty'}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => handleSlotClick(pos.id)}
                >
                  {player ? (
                    <div className="player-dot" style={{ background: getPositionColor(player.position) }}>
                      <span className="ovr">{player.overall}</span>
                    </div>
                  ) : (
                    <div className="empty-dot">
                      <span>+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* PARÁMETROS */}
          <div className="pcf-params">
            <div className="params-header">PARÁMETROS</div>
            
            <div className="params-section">
              <div className="param-item">
                <span className="label">CALIFICACIÓN</span>
                <span className="stars">{renderStars(getStarRating(teamStrength.overall))}</span>
              </div>
              <div className="param-item">
                <span className="label">MEDIA EQUIPO</span>
                <span className="value big">{Math.round(teamStrength.overall)}</span>
              </div>
            </div>
            
            {selectedPlayer && (
              <div className="params-player">
                <div className="player-name">{selectedPlayer.name}</div>
                <div className="player-bars">
                  <div className="bar-item">
                    <span className="label">PORTERO</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.position === 'GK' ? selectedPlayer.overall : 20}%` }}></div>
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="label">DEFENSA</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.defending || selectedPlayer.overall * 0.8}%` }}></div>
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="label">PASE</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.passing || selectedPlayer.overall * 0.9}%` }}></div>
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="label">REGATE</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.dribbling || selectedPlayer.overall * 0.85}%` }}></div>
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="label">REMATE</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.shooting || selectedPlayer.overall * 0.75}%` }}></div>
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="label">TIRO</span>
                    <div className="bar">
                      <div className="fill" style={{ width: `${selectedPlayer.physical || selectedPlayer.overall * 0.8}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* BOTONES */}
          <div className="pcf-buttons">
            <button className="pcf-btn">🏋️ ENTRENAMIENTO</button>
            <button className="pcf-btn">🏥 LESIONADOS</button>
            <button className="pcf-btn">📊 ESTADÍSTICAS</button>
            <button className="pcf-btn">⚽ TÁCTICA</button>
          </div>
        </div>
      </div>
      
      {/* MODAL DE SELECCIÓN */}
      {showModal && (
        <div className="pcf-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pcf-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Jugador</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {players
                .filter(p => !p.injured)
                .sort((a, b) => {
                  const compat = POSITION_COMPAT[selectedSlot] || [];
                  const aMatch = compat.includes(a.position) ? 1 : 0;
                  const bMatch = compat.includes(b.position) ? 1 : 0;
                  if (bMatch !== aMatch) return bMatch - aMatch;
                  return b.overall - a.overall;
                })
                .map(player => {
                  const isCompat = POSITION_COMPAT[selectedSlot]?.includes(player.position);
                  const isInLineup = Object.values(lineup).some(p => p?.name === player.name);
                  return (
                    <div 
                      key={player.name}
                      className={`modal-player ${isCompat ? 'compatible' : ''} ${isInLineup ? 'in-lineup' : ''}`}
                      onClick={() => handlePlayerSelect(player)}
                    >
                      <span className="pos" style={{ color: getPositionColor(player.position) }}>
                        {player.position}
                      </span>
                      <span className="name">{player.name}</span>
                      <span className="ovr">{player.overall}</span>
                      {isCompat && <span className="badge">✓</span>}
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
