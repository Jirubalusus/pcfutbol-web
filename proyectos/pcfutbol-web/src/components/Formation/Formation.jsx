import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../Toast/Toast';
import { FORMATIONS, TACTICS, calculateTeamStrength } from '../../game/leagueEngine';
import { Shield, Scale, Swords, Target, Zap, CheckCircle2, Settings, Dumbbell, Heart, AlertTriangle, Lock, Building2, TrendingUp, BarChart3, Activity, X, Check } from 'lucide-react';
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
  ],
  '3-4-3': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'CB1', x: 70, y: 75 },
    { id: 'CB2', x: 50, y: 80 },
    { id: 'CB3', x: 30, y: 75 },
    { id: 'RM', x: 85, y: 50 },
    { id: 'CM1', x: 60, y: 52 },
    { id: 'CM2', x: 40, y: 52 },
    { id: 'LM', x: 15, y: 50 },
    { id: 'RW', x: 75, y: 22 },
    { id: 'ST', x: 50, y: 18 },
    { id: 'LW', x: 25, y: 22 },
  ],
  '5-4-1': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 90, y: 68 },
    { id: 'CB1', x: 70, y: 75 },
    { id: 'CB2', x: 50, y: 78 },
    { id: 'CB3', x: 30, y: 75 },
    { id: 'LB', x: 10, y: 68 },
    { id: 'RM', x: 85, y: 45 },
    { id: 'CM1', x: 60, y: 50 },
    { id: 'CM2', x: 40, y: 50 },
    { id: 'LM', x: 15, y: 45 },
    { id: 'ST', x: 50, y: 18 },
  ],
  '4-5-1': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'RM', x: 88, y: 45 },
    { id: 'CM1', x: 65, y: 50 },
    { id: 'CDM', x: 50, y: 55 },
    { id: 'CM2', x: 35, y: 50 },
    { id: 'LM', x: 12, y: 45 },
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

// Atributos para mostrar en tabla (simplificado: solo MED)
const PLAYER_ATTRIBUTES = [
  { key: 'overall', label: 'MED', short: 'MED' },
];

export default function Formation() {
  const { state, dispatch } = useGame();
  const [lineup, setLineup] = useState(state.lineup || {});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('titulares');
  
  // Modales de gestión
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showInjuredModal, setShowInjuredModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTacticModal, setShowTacticModal] = useState(false);
  
  const selectedFormation = state.formation || '4-3-3';
  const selectedTactic = state.tactic || 'balanced';
  
  const formationPositions = FORMATION_POSITIONS[selectedFormation] || FORMATION_POSITIONS['4-3-3'];
  const players = state.team?.players || [];
  const teamStrength = calculateTeamStrength(state.team, selectedFormation, selectedTactic);
  
  // Guardar lineup en el estado global cuando cambia
  useEffect(() => {
    if (Object.keys(lineup).length > 0) {
      dispatch({ type: 'SET_LINEUP', payload: lineup });
    }
  }, [lineup, dispatch]);
  
  // Lista manual de convocados (nombres)
  const manualConvocados = state.convocados || [];
  
  // Dividir jugadores por categoría
  const categorizedPlayers = useMemo(() => {
    const lineupNames = Object.values(lineup).map(p => p?.name).filter(Boolean);
    const titulares = [];
    const convocados = [];
    const noConvocados = [];
    
    // Orden de posiciones estilo PC Fútbol 5.0: POR → DEF → MED → DEL
    const posOrder = { 
      'GK': 0, 
      'CB': 1, 'RB': 2, 'LB': 3, 'RWB': 4, 'LWB': 5,
      'CDM': 6, 'CM': 7, 'RM': 8, 'LM': 9, 'CAM': 10,
      'RW': 11, 'LW': 12, 'CF': 13, 'ST': 14
    };
    
    // Función para ordenar por posición
    const sortByPosition = (a, b) => {
      const orderA = posOrder[a.position] ?? 99;
      const orderB = posOrder[b.position] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.overall - a.overall; // Mismo tipo de posición: por overall
    };
    
    // Ordenar jugadores por overall para mejor distribución inicial
    const sortedPlayers = [...players].sort((a, b) => b.overall - a.overall);
    
    // Si hay lista manual de convocados, usarla
    const hasManualConvocados = manualConvocados.length > 0;
    
    sortedPlayers.forEach((player, idx) => {
      const isInLineup = lineupNames.includes(player.name);
      const playerWithNumber = { ...player, number: idx + 1 };
      
      if (isInLineup) {
        titulares.push(playerWithNumber);
      } else if (hasManualConvocados) {
        // Usar lista manual
        if (manualConvocados.includes(player.name)) {
          convocados.push(playerWithNumber);
        } else {
          noConvocados.push(playerWithNumber);
        }
      } else {
        // Auto: primeros 7 no lesionados
        if (!player.injured && convocados.length < 7) {
          convocados.push(playerWithNumber);
        } else {
          noConvocados.push(playerWithNumber);
        }
      }
    });
    
    // Ordenar TODAS las categorías por posición (estilo PC Fútbol)
    titulares.sort(sortByPosition);
    convocados.sort(sortByPosition);
    noConvocados.sort(sortByPosition);
    
    return { titulares, convocados, noConvocados };
  }, [players, lineup, manualConvocados]);
  
  // Cargar lineup del estado global al montar
  useEffect(() => {
    if (state.lineup && Object.keys(state.lineup).length > 0) {
      setLineup(state.lineup);
    }
  }, []);
  
  // Auto-fill lineup al cargar (solo si no hay lineup guardado)
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
    // Guardar inmediatamente
    dispatch({ type: 'SET_LINEUP', payload: newLineup });
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
      // Guardar inmediatamente en el estado global
      dispatch({ type: 'SET_LINEUP', payload: newLineup });
    }
    setSelectedPlayer(player);
    setShowModal(false);
    setSelectedSlot(null);
  };
  
  const handleRowClick = (player) => {
    // Si no hay jugador seleccionado, seleccionar este
    if (!selectedPlayer) {
      setSelectedPlayer(player);
      return;
    }
    
    // Si es el mismo jugador, deseleccionar
    if (selectedPlayer.name === player.name) {
      setSelectedPlayer(null);
      return;
    }
    
    // INTERCAMBIO: hay dos jugadores distintos
    const player1 = selectedPlayer;
    const player2 = player;
    
    // Buscar en qué slot está cada uno
    const slot1 = Object.entries(lineup).find(([_, p]) => p?.name === player1.name)?.[0];
    const slot2 = Object.entries(lineup).find(([_, p]) => p?.name === player2.name)?.[0];
    
    const newLineup = { ...lineup };
    
    if (slot1 && slot2) {
      // Ambos en lineup → intercambiar posiciones
      newLineup[slot1] = player2;
      newLineup[slot2] = player1;
    } else if (slot1 && !slot2) {
      // Solo player1 en lineup → player2 entra, player1 sale
      newLineup[slot1] = player2;
      // Player1 (que sale) debe ir a convocados, player2 (que entra) sale de convocados
      const newConvocados = manualConvocados.length > 0 
        ? [...manualConvocados] 
        : categorizedPlayers.convocados.map(p => p.name);
      // Añadir player1 a convocados (el que sale del campo)
      if (!newConvocados.includes(player1.name)) {
        newConvocados.push(player1.name);
      }
      // Quitar player2 de convocados (el que entra al campo)
      const finalConvocados = newConvocados.filter(n => n !== player2.name);
      dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
    } else if (!slot1 && slot2) {
      // Solo player2 en lineup → player1 entra, player2 sale
      newLineup[slot2] = player1;
      // Player2 (que sale) debe ir a convocados, player1 (que entra) sale de convocados
      const newConvocados = manualConvocados.length > 0 
        ? [...manualConvocados] 
        : categorizedPlayers.convocados.map(p => p.name);
      // Añadir player2 a convocados (el que sale del campo)
      if (!newConvocados.includes(player2.name)) {
        newConvocados.push(player2.name);
      }
      // Quitar player1 de convocados (el que entra al campo)
      const finalConvocados = newConvocados.filter(n => n !== player1.name);
      dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
    } else {
      // NINGUNO en lineup → intercambiar entre convocados/no convocados
      const isPlayer1Convocado = manualConvocados.includes(player1.name) || 
        (!manualConvocados.length && categorizedPlayers.convocados.some(p => p.name === player1.name));
      const isPlayer2Convocado = manualConvocados.includes(player2.name) || 
        (!manualConvocados.length && categorizedPlayers.convocados.some(p => p.name === player2.name));
      
      // Solo intercambiar si están en categorías diferentes
      if (isPlayer1Convocado !== isPlayer2Convocado) {
        let newConvocados;
        
        if (manualConvocados.length > 0) {
          // Hay lista manual - modificarla
          newConvocados = [...manualConvocados];
          if (isPlayer1Convocado) {
            // player1 sale de convocados, player2 entra
            newConvocados = newConvocados.filter(n => n !== player1.name);
            newConvocados.push(player2.name);
          } else {
            // player2 sale de convocados, player1 entra
            newConvocados = newConvocados.filter(n => n !== player2.name);
            newConvocados.push(player1.name);
          }
        } else {
          // No hay lista manual - crear una basada en los actuales
          newConvocados = categorizedPlayers.convocados.map(p => p.name);
          if (isPlayer1Convocado) {
            newConvocados = newConvocados.filter(n => n !== player1.name);
            newConvocados.push(player2.name);
          } else {
            newConvocados = newConvocados.filter(n => n !== player2.name);
            newConvocados.push(player1.name);
          }
        }
        
        dispatch({ type: 'SET_CONVOCADOS', payload: newConvocados });
      }
    }
    
    if (slot1 || slot2) {
      setLineup(newLineup);
      dispatch({ type: 'SET_LINEUP', payload: newLineup });
    }
    setSelectedPlayer(null); // Deseleccionar después del intercambio
  };
  
  const handleFormationChange = (e) => {
    dispatch({ type: 'SET_FORMATION', payload: e.target.value });
    setLineup({});
    setTimeout(autoFillLineup, 100);
  };
  
  const handleTacticChange = (e) => {
    dispatch({ type: 'SET_TACTIC', payload: e.target.value });
  };
  
  // Determinar si dos jugadores son compatibles para intercambio (misma zona del campo)
  const isCompatibleSwap = (player1, player2) => {
    if (!player1 || !player2) return false;
    if (player1.name === player2.name) return false;
    
    const positionGroups = {
      GK: ['GK'],
      DEF: ['CB', 'RB', 'LB', 'RWB', 'LWB'],
      MID: ['CDM', 'CM', 'CAM', 'RM', 'LM'],
      FWD: ['RW', 'LW', 'CF', 'ST']
    };
    
    const getGroup = (pos) => {
      for (const [group, positions] of Object.entries(positionGroups)) {
        if (positions.includes(pos)) return group;
      }
      return 'MID'; // default
    };
    
    return getGroup(player1.position) === getGroup(player2.position);
  };
  
  const getPositionColor = (pos) => {
    if (pos === 'GK') return '#f1c40f';
    if (['RB', 'CB', 'LB', 'RWB', 'LWB'].includes(pos)) return '#3498db';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos)) return '#2ecc71';
    return '#e74c3c';
  };
  
  // Estilos para el badge de posición
  const getPositionStyle = (pos) => {
    const color = getPositionColor(pos);
    return {
      color: color,
      background: `${color}33`,
      border: `1px solid ${color}66`,
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontWeight: 700,
      fontSize: '0.75rem',
      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
    };
  };
  
  // Clase CSS según posición (para colores de fila)
  const getPositionClass = (pos) => {
    if (pos === 'GK') return 'pos-gk';
    if (['RB', 'CB', 'LB', 'RWB', 'LWB', 'DF'].includes(pos)) return 'pos-def';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM', 'MF'].includes(pos)) return 'pos-mid';
    return 'pos-fwd'; // ST, RW, LW, CF, FW
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
      
      {/* CONTENIDO PRINCIPAL */}
      <div className="pcf-content">
        {/* TABLA DE JUGADORES - ESTILO PC FÚTBOL CLÁSICO */}
        <div className="pcf-table-container">
          {/* TITULARES */}
          <div className="pcf-table">
            <div className="table-header titulares">
              <span className="col-num">Nº</span>
              <span className="col-name">JUGADOR</span>
              {PLAYER_ATTRIBUTES.map(attr => (
                <span key={attr.key} className="col-attr">{attr.short}</span>
              ))}
              <span className="col-pos">POS</span>
            </div>
            
            <div className="table-body">
              {categorizedPlayers.titulares.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                return (
                <div 
                  key={player.name}
                  className={`table-row titulares ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? 'compatible-swap' : ''} ${player.injured ? 'injured' : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">
                    {player.injured && <span className="injury-icon">+</span>}
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
                  <span className="col-pos" style={getPositionStyle(player.position)}>
                    {player.position}
                  </span>
                </div>
              )})}
            </div>
          </div>
          
          {/* CONVOCADOS */}
          <div className="pcf-section-header convocados">JUGADORES CONVOCADOS</div>
          <div className="pcf-table">
            <div className="table-body">
              {categorizedPlayers.convocados.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                return (
                <div 
                  key={player.name}
                  className={`table-row convocados ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? 'compatible-swap' : ''} ${player.injured ? 'injured' : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">
                    {player.injured && <span className="injury-icon">+</span>}
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
                  <span className="col-pos" style={getPositionStyle(player.position)}>
                    {player.position}
                  </span>
                </div>
              )})}
            </div>
          </div>
          
          {/* NO CONVOCADOS */}
          <div className="pcf-section-header noconvocados">JUGADORES NO CONVOCADOS</div>
          <div className="pcf-table">
            <div className="table-body">
              {categorizedPlayers.noConvocados.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                return (
                <div 
                  key={player.name}
                  className={`table-row noconvocados ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? 'compatible-swap' : ''} ${player.injured ? 'injured' : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">
                    {player.injured && <span className="injury-icon">+</span>}
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
                  <span className="col-pos" style={getPositionStyle(player.position)}>
                    {player.position}
                  </span>
                </div>
              )})}
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
                
                {/* ROL DEL JUGADOR */}
                {selectedPlayer.role && (
                  <div className="player-role">
                    <span className="role-icon">{selectedPlayer.role.icon}</span>
                    <span className="role-name">{selectedPlayer.role.name}</span>
                  </div>
                )}
                {selectedPlayer.role?.desc && (
                  <div className="role-desc">{selectedPlayer.role.desc}</div>
                )}
                
                <div className="player-info-grid">
                  <div className="info-item">
                    <span className="label">Edad</span>
                    <span className="value">{selectedPlayer.age} años</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Posición</span>
                    <span className="value">{selectedPlayer.position}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* BOTONES */}
          <div className="pcf-buttons">
            <button className="pcf-btn" onClick={() => setShowTrainingModal(true)}><Dumbbell size={16} /> ENTRENAMIENTO</button>
            <button className="pcf-btn" onClick={() => setShowInjuredModal(true)}><Heart size={16} /> LESIONADOS</button>
            <button className="pcf-btn" onClick={() => setShowStatsModal(true)}><BarChart3 size={16} /> ESTADÍSTICAS</button>
            <button className="pcf-btn" onClick={() => setShowTacticModal(true)}><Target size={16} /> TÁCTICA</button>
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
      
      {/* MODAL ENTRENAMIENTO */}
      {showTrainingModal && (
        <TrainingModal 
          onClose={() => setShowTrainingModal(false)}
          players={players}
          facilities={state.facilities}
          dispatch={dispatch}
          currentIntensity={state.training?.intensity}
        />
      )}
      
      {/* MODAL LESIONADOS */}
      {showInjuredModal && (
        <InjuredModal 
          onClose={() => setShowInjuredModal(false)}
          players={players}
          facilities={state.team?.facilities}
          dispatch={dispatch}
          budget={state.team?.budget}
        />
      )}
      
      {/* MODAL ESTADÍSTICAS */}
      {showStatsModal && (
        <StatsModal 
          onClose={() => setShowStatsModal(false)}
          players={players}
          team={state.team}
          seasonStats={state.seasonStats}
        />
      )}
      
      {/* MODAL TÁCTICA */}
      {showTacticModal && (
        <TacticModal 
          onClose={() => setShowTacticModal(false)}
          currentTactic={selectedTactic}
          currentFormation={selectedFormation}
          dispatch={dispatch}
          onFormationChange={(newFormation) => {
            dispatch({ type: 'SET_FORMATION', payload: newFormation });
            // Limpiar lineup y auto-rellenar con nueva formación
            setLineup({});
            setTimeout(() => {
              const newLineup = {};
              const used = new Set();
              const newPositions = FORMATION_POSITIONS[newFormation] || FORMATION_POSITIONS['4-3-3'];
              
              newPositions.forEach(pos => {
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
              dispatch({ type: 'SET_LINEUP', payload: newLineup });
            }, 50);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL: ENTRENAMIENTO (Rediseñado)
// ============================================================
function TrainingModal({ onClose, players, facilities, dispatch, currentIntensity }) {
  const toast = useToast();
  const [intensity, setIntensity] = useState(currentIntensity || 'normal');
  const isLocked = currentIntensity !== null && currentIntensity !== undefined;
  
  const intensities = [
    { 
      id: 'light', 
      name: 'Suave', 
      risk: 5, 
      boost: '+0.6%', 
      color: '#30d158',
      gradient: 'linear-gradient(135deg, #30d158 0%, #28a745 100%)',
      icon: Activity,
      desc: 'Recuperación activa',
      details: 'Ideal para veteranos y post-lesión. Menos carga física, prioriza técnica.'
    },
    { 
      id: 'normal', 
      name: 'Normal', 
      risk: 15, 
      boost: '+1.1%', 
      color: '#ffd60a',
      gradient: 'linear-gradient(135deg, #ffd60a 0%, #f0ad4e 100%)',
      icon: Dumbbell,
      desc: 'Equilibrio perfecto',
      details: 'Balance entre progresión y riesgo. Recomendado para la mayoría de plantillas.'
    },
    { 
      id: 'intense', 
      name: 'Intenso', 
      risk: 30, 
      boost: '+1.7%', 
      color: '#ff453a',
      gradient: 'linear-gradient(135deg, #ff453a 0%, #dc3545 100%)',
      icon: Zap,
      desc: 'Máximo rendimiento',
      details: 'Para plantillas jóvenes con buen centro médico. Alto riesgo, alta recompensa.'
    },
  ];
  
  const facilityLevel = facilities?.training || 0;
  const maxBoost = 1 + (facilityLevel * 0.1);
  
  const handleConfirm = () => {
    if (isLocked) {
      onClose();
      return;
    }
    
    const selectedIntensity = intensities.find(i => i.id === intensity);
    
    dispatch({
      type: 'SET_TRAINING',
      payload: {
        intensity,
        lockedUntilPreseason: true
      }
    });
    
    toast.success(`Intensidad fijada: ${selectedIntensity?.name} (hasta próxima pretemporada)`);
    onClose();
  };
  
  return (
    <div className="pcf-modal-overlay" onClick={onClose}>
      <div className="pcf-modal pcf-modal--training-v2" onClick={e => e.stopPropagation()}>
        <div className="modal-header-v2">
          <div className="header-title">
            <Dumbbell size={24} />
            <h3>Intensidad de Entrenamiento</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body-v2">
          {isLocked ? (
            <div className="training-locked-v2">
              <div className="locked-icon-container">
                <Lock size={48} />
              </div>
              <h4>Intensidad bloqueada</h4>
              <p>Has elegido <strong style={{ color: intensities.find(i => i.id === currentIntensity)?.color }}>
                {intensities.find(i => i.id === currentIntensity)?.name}
              </strong> para esta temporada.</p>
              <p className="hint">Podrás cambiarla al inicio de la próxima pretemporada.</p>
            </div>
          ) : (
            <>
              <p className="training-subtitle">
                Selecciona la intensidad de entrenamiento para toda la temporada. 
                Esta decisión es <strong>permanente</strong> hasta la próxima pretemporada.
              </p>
              
              <div className="intensity-grid">
                {intensities.map(i => {
                  const IconComponent = i.icon;
                  return (
                    <div
                      key={i.id}
                      className={`intensity-card-v2 ${intensity === i.id ? 'active' : ''}`}
                      onClick={() => setIntensity(i.id)}
                    >
                      <div className="card-glow" style={{ background: i.gradient }}></div>
                      <div className="card-content">
                        <div className="card-icon" style={{ color: i.color }}>
                          <IconComponent size={32} />
                        </div>
                        <div className="card-title">{i.name}</div>
                        <div className="card-desc">{i.desc}</div>
                        <div className="card-details">{i.details}</div>
                        <div className="card-stats">
                          <div className="stat-item positive">
                            <TrendingUp size={14} />
                            <span>Progresión: {i.boost}</span>
                          </div>
                          <div className="stat-item negative">
                            <AlertTriangle size={14} />
                            <span>Riesgo lesión: {i.risk}%</span>
                          </div>
                        </div>
                        {intensity === i.id && (
                          <div className="selected-badge">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="facility-info-v2">
            <Building2 size={18} />
            <span>Nivel instalaciones: <strong>{facilityLevel}/3</strong></span>
            <span className="bonus">(×{maxBoost.toFixed(1)} bonus)</span>
          </div>
        </div>
        
        <div className="modal-footer-v2">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          {!isLocked && (
            <button className="btn-primary" onClick={handleConfirm}>
              <Check size={18} />
              Confirmar intensidad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: LESIONADOS
// ============================================================
function InjuredModal({ onClose, players, facilities, dispatch, budget }) {
  const toast = useToast();
  const injuredPlayers = players.filter(p => p.injured && p.injuryWeeksLeft > 0);
  const medicalLevel = facilities?.medicalCenter || 1;
  const maxTreatments = medicalLevel + 1; // 2-6 tratamientos según nivel
  const [treatmentsUsed, setTreatmentsUsed] = useState(0);
  const [treatedPlayers, setTreatedPlayers] = useState([]); // Track tratados localmente
  const treatmentCost = 500000; // €500k por tratamiento
  const weeksReduced = 1 + Math.floor(medicalLevel / 2);
  
  const handleTreat = (player) => {
    if (treatmentsUsed >= maxTreatments) return;
    if (budget < treatmentCost) return;
    
    dispatch({
      type: 'TREAT_INJURY',
      payload: {
        playerId: player.id || player.name,
        weeksReduced: weeksReduced,
        cost: treatmentCost
      }
    });
    setTreatmentsUsed(prev => prev + 1);
    setTreatedPlayers(prev => [...prev, player.name]);
    toast.success(`${player.name} tratado (-${weeksReduced} semanas)`);
  };
  
  return (
    <div className="pcf-modal-overlay" onClick={onClose}>
      <div className="pcf-modal pcf-modal--injured" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Heart size={20} style={{ marginRight: 8 }} /> Lesionados</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="modal-body">
          {injuredPlayers.length === 0 ? (
            <div className="no-injured">
              <span className="icon">✅</span>
              <p>No hay jugadores lesionados</p>
            </div>
          ) : (
            <>
              <div className="injured-info">
                <span>Tratamientos disponibles: {maxTreatments - treatmentsUsed}/{maxTreatments}</span>
                <span>Coste por tratamiento: €{(treatmentCost/1000).toFixed(0)}K</span>
              </div>
              
              <div className="injured-list">
                {injuredPlayers.map(player => {
                  const wasTreated = treatedPlayers.includes(player.name);
                  const adjustedWeeks = wasTreated 
                    ? Math.max(0, player.injuryWeeksLeft - weeksReduced) 
                    : player.injuryWeeksLeft;
                  
                  return (
                    <div key={player.name} className={`injured-player ${wasTreated ? 'treated' : ''}`}>
                      <div className="player-info">
                        <span className="pos">{player.position}</span>
                        <span className="name">{player.name}</span>
                        <span className="ovr">{player.overall}</span>
                      </div>
                      <div className="injury-info">
                        <span className={`weeks ${wasTreated ? 'reduced' : ''}`}>
                          ⏱️ {adjustedWeeks} semana{adjustedWeeks !== 1 ? 's' : ''}
                          {wasTreated && <span className="treat-badge">✓</span>}
                        </span>
                      </div>
                      {wasTreated ? (
                        <span className="treated-label">Tratado</span>
                      ) : (
                        <button 
                          className="btn-treat"
                          onClick={() => handleTreat(player)}
                          disabled={treatmentsUsed >= maxTreatments || budget < treatmentCost}
                        >
                          Tratar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="medical-info">
            <span><Building2 size={14} style={{ marginRight: 4 }} /> Nivel centro médico: {medicalLevel}/5</span>
            <span className="hint">Mejora las instalaciones para más tratamientos</span>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-confirm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: ESTADÍSTICAS
// ============================================================
function StatsModal({ onClose, players, team, seasonStats }) {
  const [tab, setTab] = useState('equipo');
  
  // Stats del equipo
  const avgOverall = Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length) || 0;
  const totalValue = players.reduce((s, p) => s + (p.value || 0), 0);
  const avgAge = Math.round(players.reduce((s, p) => s + (p.age || 25), 0) / players.length) || 0;
  
  // Top jugadores
  const topOverall = [...players].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const topValue = [...players].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);
  
  // Stats de temporada
  const stats = seasonStats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
  
  return (
    <div className="pcf-modal-overlay" onClick={onClose}>
      <div className="pcf-modal pcf-modal--stats" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><BarChart3 size={20} style={{ marginRight: 8 }} /> Estadísticas</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="modal-tabs">
          <button className={tab === 'equipo' ? 'active' : ''} onClick={() => setTab('equipo')}>Equipo</button>
          <button className={tab === 'temporada' ? 'active' : ''} onClick={() => setTab('temporada')}>Temporada</button>
          <button className={tab === 'top' ? 'active' : ''} onClick={() => setTab('top')}>Top Jugadores</button>
        </div>
        
        <div className="modal-body">
          {tab === 'equipo' && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="value">{players.length}</span>
                <span className="label">Jugadores</span>
              </div>
              <div className="stat-card">
                <span className="value">{avgOverall}</span>
                <span className="label">Media OVR</span>
              </div>
              <div className="stat-card">
                <span className="value">{avgAge}</span>
                <span className="label">Edad media</span>
              </div>
              <div className="stat-card">
                <span className="value">€{(totalValue/1000000).toFixed(1)}M</span>
                <span className="label">Valor plantilla</span>
              </div>
            </div>
          )}
          
          {tab === 'temporada' && (
            <div className="season-stats">
              <div className="stats-row">
                <span className="label">Partidos</span>
                <span className="value">{stats.played}</span>
              </div>
              <div className="stats-row">
                <span className="label">Victorias</span>
                <span className="value win">{stats.won}</span>
              </div>
              <div className="stats-row">
                <span className="label">Empates</span>
                <span className="value draw">{stats.drawn}</span>
              </div>
              <div className="stats-row">
                <span className="label">Derrotas</span>
                <span className="value loss">{stats.lost}</span>
              </div>
              <div className="stats-row">
                <span className="label">Goles a favor</span>
                <span className="value">{stats.goalsFor}</span>
              </div>
              <div className="stats-row">
                <span className="label">Goles en contra</span>
                <span className="value">{stats.goalsAgainst}</span>
              </div>
              <div className="stats-row highlight">
                <span className="label">Diferencia</span>
                <span className={`value ${stats.goalsFor - stats.goalsAgainst >= 0 ? 'positive' : 'negative'}`}>
                  {stats.goalsFor - stats.goalsAgainst >= 0 ? '+' : ''}{stats.goalsFor - stats.goalsAgainst}
                </span>
              </div>
            </div>
          )}
          
          {tab === 'top' && (
            <div className="top-players">
              <div className="top-section">
                <h4>🏆 Mejor valorados</h4>
                {topOverall.map((p, i) => (
                  <div key={p.name} className="top-row">
                    <span className="rank">{i + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="value">{p.overall}</span>
                  </div>
                ))}
              </div>
              <div className="top-section">
                <h4>💰 Más valiosos</h4>
                {topValue.map((p, i) => (
                  <div key={p.name} className="top-row">
                    <span className="rank">{i + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="value">€{((p.value || 0)/1000000).toFixed(1)}M</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn-confirm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: TÁCTICA
// ============================================================
function TacticModal({ onClose, currentTactic, currentFormation, dispatch, onFormationChange }) {
  const [tactic, setTactic] = useState(currentTactic);
  const [formation, setFormation] = useState(currentFormation);
  const [showToast, setShowToast] = useState(false);
  
  const formationOptions = [
    '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-1-4-1', '4-5-1'
  ];
  
  const tacticOptions = [
    { id: 'defensive', name: 'Defensiva', desc: 'Prioriza no encajar goles', iconType: 'shield', bonus: '+15% defensa, -10% ataque', color: '#0a84ff' },
    { id: 'balanced', name: 'Equilibrada', desc: 'Balance ataque-defensa', iconType: 'scale', bonus: 'Sin modificadores', color: '#8e8e93' },
    { id: 'attacking', name: 'Ofensiva', desc: 'Máxima presión adelante', iconType: 'swords', bonus: '+15% ataque, -10% defensa', color: '#ff453a' },
    { id: 'possession', name: 'Posesión', desc: 'Control del balón', iconType: 'target', bonus: '+10% posesión, +5% pases', color: '#30d158' },
    { id: 'counter', name: 'Contraataque', desc: 'Transiciones rápidas', iconType: 'zap', bonus: '+20% contraataque, -5% posesión', color: '#ff9f0a' },
  ];
  
  const handleSave = () => {
    dispatch({ type: 'SET_TACTIC', payload: tactic });
    if (formation !== currentFormation && onFormationChange) {
      onFormationChange(formation);
    }
    
    // Mostrar toast
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 1500);
  };
  
  return (
    <div className="pcf-modal-overlay" onClick={onClose}>
      <div className="pcf-modal pcf-modal--tactic" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Target size={20} style={{ marginRight: 8 }} /> Táctica</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="modal-body">
          {/* Selector de formación */}
          <div className="formation-selector">
            <label>Formación:</label>
            <div className="formation-options">
              {formationOptions.map(f => (
                <button 
                  key={f}
                  className={`formation-btn ${formation === f ? 'active' : ''}`}
                  onClick={() => setFormation(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="tactic-options">
            {tacticOptions.map(t => {
              const IconComponent = {
                shield: Shield,
                scale: Scale,
                swords: Swords,
                target: Target,
                zap: Zap
              }[t.iconType] || Settings;
              
              return (
                <div 
                  key={t.id}
                  className={`tactic-option ${tactic === t.id ? 'active' : ''}`}
                  onClick={() => setTactic(t.id)}
                  style={{ '--tactic-color': t.color }}
                >
                  <span className="icon" style={{ color: t.color }}>
                    <IconComponent size={24} />
                  </span>
                  <div className="info">
                    <span className="name">{t.name}</span>
                    <span className="desc">{t.desc}</span>
                    <span className="bonus">{t.bonus}</span>
                  </div>
                  {tactic === t.id && <CheckCircle2 size={20} className="check" style={{ color: t.color }} />}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-confirm" onClick={handleSave}>Aplicar táctica</button>
        </div>
        
        {showToast && (
          <div className="tactic-toast">
            ✅ Táctica actualizada: {formation} {tacticOptions.find(t => t.id === tactic)?.name}
          </div>
        )}
      </div>
    </div>
  );
}

