import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useToast } from '../Toast/Toast';
import { FORMATIONS, TACTICS, calculateTeamStrength } from '../../game/leagueEngine';
import { getPositionFit, getSlotPosition, FIT_COLORS } from '../../game/positionSystem';
import { translatePosition, posToEN } from '../../game/positionNames';
import { FORM_STATES } from '../../game/formSystem';
import { Shield, Scale, Swords, Target, Zap, CheckCircle2, Settings, Dumbbell, Heart, AlertTriangle, Lock, Building2, TrendingUp, BarChart3, Activity, X, Check, HeartPulse, Square, Star, Trophy, Coins, Clock } from 'lucide-react';
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
  ],
  '4-3-3 (MCO)': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CM1', x: 65, y: 52 },
    { id: 'CM2', x: 35, y: 52 },
    { id: 'CAM', x: 50, y: 40 },
    { id: 'RW', x: 80, y: 25 },
    { id: 'ST', x: 50, y: 18 },
    { id: 'LW', x: 20, y: 25 },
  ],
  '4-4-2 (Diamante)': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CDM', x: 50, y: 58 },
    { id: 'CM1', x: 70, y: 48 },
    { id: 'CM2', x: 30, y: 48 },
    { id: 'CAM', x: 50, y: 35 },
    { id: 'ST1', x: 60, y: 20 },
    { id: 'ST2', x: 40, y: 20 },
  ],
  '4-1-2-1-2': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CDM', x: 50, y: 58 },
    { id: 'CM1', x: 65, y: 46 },
    { id: 'CM2', x: 35, y: 46 },
    { id: 'CAM', x: 50, y: 34 },
    { id: 'ST1', x: 60, y: 20 },
    { id: 'ST2', x: 40, y: 20 },
  ],
  '3-4-1-2': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'CB1', x: 70, y: 75 },
    { id: 'CB2', x: 50, y: 80 },
    { id: 'CB3', x: 30, y: 75 },
    { id: 'RM', x: 85, y: 50 },
    { id: 'CM1', x: 60, y: 52 },
    { id: 'CM2', x: 40, y: 52 },
    { id: 'LM', x: 15, y: 50 },
    { id: 'CAM', x: 50, y: 35 },
    { id: 'ST1', x: 60, y: 22 },
    { id: 'ST2', x: 40, y: 22 },
  ],
  '4-3-2-1': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 85, y: 70 },
    { id: 'CB1', x: 65, y: 78 },
    { id: 'CB2', x: 35, y: 78 },
    { id: 'LB', x: 15, y: 70 },
    { id: 'CDM', x: 50, y: 55 },
    { id: 'CM1', x: 65, y: 48 },
    { id: 'CM2', x: 35, y: 48 },
    { id: 'RW', x: 70, y: 32 },
    { id: 'LW', x: 30, y: 32 },
    { id: 'ST', x: 50, y: 18 },
  ],
  '5-2-3': [
    { id: 'GK', x: 50, y: 90 },
    { id: 'RB', x: 90, y: 65 },
    { id: 'CB1', x: 70, y: 75 },
    { id: 'CB2', x: 50, y: 80 },
    { id: 'CB3', x: 30, y: 75 },
    { id: 'LB', x: 10, y: 65 },
    { id: 'CM1', x: 60, y: 48 },
    { id: 'CM2', x: 40, y: 48 },
    { id: 'RW', x: 78, y: 25 },
    { id: 'ST', x: 50, y: 18 },
    { id: 'LW', x: 22, y: 25 },
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
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [lineup, setLineup] = useState(state.lineup || {});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('titulares');

  // Modales de gestión
  const [showInjuredModal, setShowInjuredModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTacticModal, setShowTacticModal] = useState(false);

  const selectedFormation = state.formation || '4-3-3';
  const selectedTactic = state.tactic || 'balanced';

  const formationPositions = FORMATION_POSITIONS[selectedFormation] || FORMATION_POSITIONS['4-3-3'];
  const players = state.team?.players || [];
  const teamStrength = calculateTeamStrength(state.team, selectedFormation, selectedTactic);

  // Sync global lineup → local cuando cambia externamente (ej: limpieza por suspensiones/lesiones)
  useEffect(() => {
    const globalStr = JSON.stringify(state.lineup || {});
    const localStr = JSON.stringify(lineup);
    if (globalStr !== localStr) {
      setLineup(state.lineup || {});
    }
  }, [state.lineup]);

  // Guardar lineup en el estado global cuando cambia localmente
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
        // Auto: primeros 5 no lesionados como suplentes (estilo PC Fútbol 5.0)
        if (!player.injured && convocados.length < 5) {
          convocados.push(playerWithNumber);
        } else {
          noConvocados.push(playerWithNumber);
        }
      }
    });

    // Backfill: si la lista manual dejó menos de 5 convocados
    // (porque algunos pasaron a titulares al cambiar formación),
    // rellenar con los mejores no convocados no lesionados
    if (hasManualConvocados && convocados.length < 5) {
      const needed = 5 - convocados.length;
      const backfill = noConvocados
        .filter(p => !p.injured)
        .slice(0, needed);
      backfill.forEach(p => {
        convocados.push(p);
        noConvocados.splice(noConvocados.indexOf(p), 1);
      });
    }

    // Titulares: ordenar por SLOT de la formación (GK → DEF → MED → DEL fijo)
    // Así el orden refleja la formación elegida, no la posición natural del jugador
    const slotOrder = {};
    formationPositions.forEach((pos, idx) => { slotOrder[pos.id] = idx; });
    const lineupEntries = Object.entries(lineup);
    titulares.sort((a, b) => {
      const slotA = lineupEntries.find(([_, p]) => p?.name === a.name)?.[0];
      const slotB = lineupEntries.find(([_, p]) => p?.name === b.name)?.[0];
      return (slotOrder[slotA] ?? 99) - (slotOrder[slotB] ?? 99);
    });
    // Suplentes y no convocados: ordenar por posición natural
    convocados.sort(sortByPosition);
    noConvocados.sort(sortByPosition);

    return { titulares, convocados, noConvocados };
  }, [players, lineup, manualConvocados]);

  // Mapa playerName → slotId para saber en qué slot juega cada titular
  const playerSlotMap = useMemo(() => {
    const map = {};
    Object.entries(lineup).forEach(([slotId, player]) => {
      if (player?.name) {
        map[player.name] = slotId;
      }
    });
    return map;
  }, [lineup]);

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
      const slotPos = getSlotPosition(pos.id);
      const best = players
        .filter(p => !used.has(p.name) && !p.injured && !p.suspended)
        .sort((a, b) => {
          // Usar compatibilidad gradual (factor 0.0-1.0) para elegir mejor jugador
          const fitA = getPositionFit(a.position, slotPos);
          const fitB = getPositionFit(b.position, slotPos);
          // Puntuación: factor de posición × overall (así un 80 en posición perfecta > 85 fuera de posición)
          const scoreA = fitA.factor * a.overall;
          const scoreB = fitB.factor * b.overall;
          return scoreB - scoreA;
        })[0];

      if (best) {
        newLineup[pos.id] = best;
        used.add(best.name);
      }
    });

    setLineup(newLineup);
    // Guardar inmediatamente
    dispatch({ type: 'SET_LINEUP', payload: newLineup });

    // Recalcular convocados tras el auto-fill
    const newLineupNames = new Set(Object.values(newLineup).map(p => p?.name).filter(Boolean));
    const currentConv = (state.convocados || []).filter(n => !newLineupNames.has(n));
    if (currentConv.length < 5) {
      const needed = 5 - currentConv.length;
      const available = players
        .filter(p => !newLineupNames.has(p.name) && !currentConv.includes(p.name) && !p.injured)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, needed)
        .map(p => p.name);
      currentConv.push(...available);
    }
    dispatch({ type: 'SET_CONVOCADOS', payload: currentConv });
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

    // Bloquear si un sancionado/lesionado intenta entrar a la alineación
    if (slot1 && !slot2 && (player2.suspended || player2.injured)) {
      setSelectedPlayer(null);
      return;
    }
    if (!slot1 && slot2 && (player1.suspended || player1.injured)) {
      setSelectedPlayer(null);
      return;
    }

    const newLineup = { ...lineup };

    if (slot1 && slot2) {
      // Ambos en lineup → intercambiar posiciones
      newLineup[slot1] = player2;
      newLineup[slot2] = player1;
    } else if (slot1 && !slot2) {
      // Solo player1 en lineup → player2 entra, player1 sale
      newLineup[slot1] = player2;
      // Player1 sale del campo. Debe ir adonde estaba player2 (convocado o no convocado).
      const newConvocados = manualConvocados.length > 0
        ? [...manualConvocados]
        : categorizedPlayers.convocados.map(p => p.name);
      const player2WasConvocado = newConvocados.includes(player2.name);

      if (player2WasConvocado) {
        // Player2 era convocado → player1 hereda su puesto como convocado
        // Quitar player2 de convocados (entra al campo) y añadir player1
        const finalConvocados = newConvocados.filter(n => n !== player2.name);
        finalConvocados.push(player1.name);
        dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
      } else {
        // Player2 era no-convocado → player1 va a no-convocados
        // Solo quitar player2 de convocados (por si acaso) sin añadir player1
        const finalConvocados = newConvocados.filter(n => n !== player2.name && n !== player1.name);
        dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
      }
    } else if (!slot1 && slot2) {
      // Solo player2 en lineup → player1 entra, player2 sale
      newLineup[slot2] = player1;
      // Player2 sale del campo. Debe ir adonde estaba player1 (convocado o no convocado).
      const newConvocados = manualConvocados.length > 0
        ? [...manualConvocados]
        : categorizedPlayers.convocados.map(p => p.name);
      const player1WasConvocado = newConvocados.includes(player1.name);

      if (player1WasConvocado) {
        // Player1 era convocado → player2 hereda su puesto como convocado
        const finalConvocados = newConvocados.filter(n => n !== player1.name);
        finalConvocados.push(player2.name);
        dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
      } else {
        // Player1 era no-convocado → player2 va a no-convocados
        const finalConvocados = newConvocados.filter(n => n !== player1.name && n !== player2.name);
        dispatch({ type: 'SET_CONVOCADOS', payload: finalConvocados });
      }
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

  // Compatibilidad de intercambio basada en el sistema de posiciones real
  // Usa getPositionFit bidireccional: ¿puede player2 jugar en el puesto de player1, o viceversa?
  const SWAP_THRESHOLD = 0.70;

  const getSwapFit = (player1, player2) => {
    if (!player1 || !player2) return null;
    if (player1.name === player2.name) return null;

    // Posiciones efectivas (slot si es titular, posición natural si no)
    const slot1 = playerSlotMap[player1.name];
    const effectivePos1 = slot1 ? getSlotPosition(slot1) : player1.position;
    const slot2 = playerSlotMap[player2.name];
    const effectivePos2 = slot2 ? getSlotPosition(slot2) : player2.position;

    // Bidireccional: ¿player2 puede jugar en pos1, o player1 en pos2?
    const fit1 = getPositionFit(player2.position, effectivePos1);
    const fit2 = getPositionFit(player1.position, effectivePos2);

    return fit1.factor >= fit2.factor ? fit1 : fit2;
  };

  const isCompatibleSwap = (player1, player2) => {
    const fit = getSwapFit(player1, player2);
    return fit !== null && fit.factor >= SWAP_THRESHOLD;
  };

  const getPositionColor = (pos) => {
    const p = posToEN(pos);
    if (p === 'GK') return '#f1c40f';
    if (['RB', 'CB', 'LB', 'RWB', 'LWB'].includes(p)) return '#3498db';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p)) return '#2ecc71';
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
    const p = posToEN(pos);
    if (p === 'GK') return 'pos-gk';
    if (['RB', 'CB', 'LB', 'RWB', 'LWB', 'DF'].includes(p)) return 'pos-def';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM', 'MF'].includes(p)) return 'pos-mid';
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
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} className={i < count ? 'star-filled' : 'star-empty'} fill={i < count ? 'currentColor' : 'none'} />
    ));
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
          <h1>{t('formation.title').toUpperCase()}</h1>
        </div>
        <div className="pcf-header__info">
          <div className="date-display">
            <span className="label">{t('calendar.date')}</span>
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
              <span className="col-name">{t('plantilla.player')}</span>
              <span className="col-status"></span>
              {PLAYER_ATTRIBUTES.map(attr => (
                <span key={attr.key} className="col-attr">{attr.short}</span>
              ))}
              <span className="col-pos">{t('common.position').substring(0, 3).toUpperCase()}</span>
            </div>

            <div className="table-body">
              {categorizedPlayers.titulares.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                const slotId = playerSlotMap[player.name];
                const slotPos = slotId ? getSlotPosition(slotId) : null;
                const fit = slotPos ? getPositionFit(player.position, slotPos) : null;
                const swapFit = isCompatible ? getSwapFit(selectedPlayer, player) : null;
                const swapClass = swapFit ? (swapFit.level === 'perfect' ? 'swap-perfect' : swapFit.level === 'good' ? 'swap-good' : 'swap-decent') : '';
                return (
                <div
                  key={player.name}
                  className={`table-row titulares ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? `compatible-swap ${swapClass}` : ''} ${player.injured ? 'injured' : ''} ${player.suspended ? (player.suspensionType === 'red' ? 'suspended-red' : 'suspended-yellow') : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">{player.name}</span>
                  <span className="col-status">
                    {/* Form arrow */}
                    {(() => {
                      const form = (state.playerForm || {})[player.name] || 'normal';
                      const formInfo = FORM_STATES[form];
                      // Mostrar siempre la flecha (como PES6)
                      return (
                        <span
                          className={`form-arrow form-${form}`}
                          style={{ color: formInfo.color }}
                          title={`Forma: ${formInfo.label} (${formInfo.matchBonus > 0 ? '+' : ''}${Math.round(formInfo.matchBonus * 100)}%)`}
                        >
                          {formInfo.arrow}
                        </span>
                      );
                    })()}
                    {player.injured && player.injuryWeeksLeft > 0 && <span className="status-icon injury"><HeartPulse size={12} />{player.injuryWeeksLeft}s</span>}
                    {player.suspended && player.suspensionType === 'red' && <span className="status-icon red"><Square size={12} className="card-red" />{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'double_yellow' && <span className="status-icon red"><><Square size={12} className="card-yellow" /><Square size={12} className="card-yellow" /></>{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'yellow' && <span className="status-icon yellow"><Square size={12} className="card-yellow" />×5</span>}
                    {!player.suspended && !player.injured && player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0 && <span className="status-icon boost"><TrendingUp size={12} />{player.postInjuryWeeksLeft}s</span>}
                    {!player.suspended && !player.injured && !(player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0) && (player.yellowCards || 0) >= 4 && <span className="status-icon warning"><AlertTriangle size={12} /></span>}
                  </span>
                  {PLAYER_ATTRIBUTES.map(attr => {
                    const baseOvr = player.overall + (player.postInjuryBonus || 0);
                    const adjOvr = fit ? Math.round(baseOvr * fit.factor) : baseOvr;
                    const hasBoosted = player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0;
                    const fitClass = fit ? `fit-${fit.level}` : '';
                    const boostClass = hasBoosted ? 'boosted' : '';
                    return (
                      <span
                        key={attr.key}
                        className={`col-attr ${fitClass || (adjOvr >= 80 ? 'high' : adjOvr <= 60 ? 'low' : '')} ${boostClass}`}
                        title={hasBoosted ? `${player.overall} + ${player.postInjuryBonus} bonus (${player.postInjuryWeeksLeft}w)` : fit && fit.level !== 'perfect' ? `${player.overall} → ${adjOvr} (${translatePosition(player.position)} ${t('formation.playingAs')} ${translatePosition(slotPos)})` : ''}
                      >
                        {adjOvr}
                      </span>
                    );
                  })}
                  <span className="col-pos" style={getPositionStyle(slotPos || player.position)}>
                    {translatePosition(slotPos || player.position)}
                  </span>
                </div>
              )})}
            </div>
          </div>

          {/* CONVOCADOS */}
          <div className="pcf-section-header convocados">{t('formation.reserves').toUpperCase()}</div>
          <div className="pcf-table">
            <div className="table-body">
              {categorizedPlayers.convocados.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                const swapFit = isCompatible ? getSwapFit(selectedPlayer, player) : null;
                const swapClass = swapFit ? (swapFit.level === 'perfect' ? 'swap-perfect' : swapFit.level === 'good' ? 'swap-good' : 'swap-decent') : '';
                return (
                <div
                  key={player.name}
                  className={`table-row convocados ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? `compatible-swap ${swapClass}` : ''} ${player.injured ? 'injured' : ''} ${player.suspended ? (player.suspensionType === 'red' ? 'suspended-red' : 'suspended-yellow') : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">{player.name}</span>
                  <span className="col-status">
                    {/* Form arrow */}
                    {(() => {
                      const form = (state.playerForm || {})[player.name] || 'normal';
                      const formInfo = FORM_STATES[form];
                      // Mostrar siempre la flecha (como PES6)
                      return (
                        <span
                          className={`form-arrow form-${form}`}
                          style={{ color: formInfo.color }}
                          title={`Forma: ${formInfo.label} (${formInfo.matchBonus > 0 ? '+' : ''}${Math.round(formInfo.matchBonus * 100)}%)`}
                        >
                          {formInfo.arrow}
                        </span>
                      );
                    })()}
                    {player.injured && player.injuryWeeksLeft > 0 && <span className="status-icon injury"><HeartPulse size={12} />{player.injuryWeeksLeft}s</span>}
                    {player.suspended && player.suspensionType === 'red' && <span className="status-icon red"><Square size={12} className="card-red" />{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'double_yellow' && <span className="status-icon red"><><Square size={12} className="card-yellow" /><Square size={12} className="card-yellow" /></>{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'yellow' && <span className="status-icon yellow"><Square size={12} className="card-yellow" />×5</span>}
                    {!player.suspended && !player.injured && player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0 && <span className="status-icon boost"><TrendingUp size={12} />{player.postInjuryWeeksLeft}s</span>}
                    {!player.suspended && !player.injured && !(player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0) && (player.yellowCards || 0) >= 4 && <span className="status-icon warning"><AlertTriangle size={12} /></span>}
                  </span>
                  {PLAYER_ATTRIBUTES.map(attr => {
                    const boostedOvr = (player[attr.key] || player.overall) + (player.postInjuryBonus || 0);
                    const hasBoosted = player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0;
                    return (
                    <span
                      key={attr.key}
                      className={`col-attr ${
                        boostedOvr >= 80 ? 'high' :
                        boostedOvr <= 60 ? 'low' : ''
                      } ${hasBoosted ? 'boosted' : ''}`}
                    >
                      {boostedOvr}
                    </span>
                    );
                  })}
                  <span className="col-pos" style={getPositionStyle(player.position)}>
                    {translatePosition(player.position)}
                  </span>
                </div>
              )})}
            </div>
          </div>

          {/* NO CONVOCADOS */}
          <div className="pcf-section-header noconvocados">{t('formation.notCalled').toUpperCase()}</div>
          <div className="pcf-table pcf-table--noconvocados">
            <div className="table-body table-body--scroll">
              {categorizedPlayers.noConvocados.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                const swapFit = isCompatible ? getSwapFit(selectedPlayer, player) : null;
                const swapClass = swapFit ? (swapFit.level === 'perfect' ? 'swap-perfect' : swapFit.level === 'good' ? 'swap-good' : 'swap-decent') : '';
                return (
                <div
                  key={player.name}
                  className={`table-row noconvocados ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? `compatible-swap ${swapClass}` : ''} ${player.injured ? 'injured' : ''} ${player.suspended ? (player.suspensionType === 'red' ? 'suspended-red' : 'suspended-yellow') : ''}`}
                  onClick={() => handleRowClick(player)}
                >
                  <span className="col-num">{player.number}</span>
                  <span className="col-name">{player.name}</span>
                  <span className="col-status">
                    {/* Form arrow */}
                    {(() => {
                      const form = (state.playerForm || {})[player.name] || 'normal';
                      const formInfo = FORM_STATES[form];
                      // Mostrar siempre la flecha (como PES6)
                      return (
                        <span
                          className={`form-arrow form-${form}`}
                          style={{ color: formInfo.color }}
                          title={`Forma: ${formInfo.label} (${formInfo.matchBonus > 0 ? '+' : ''}${Math.round(formInfo.matchBonus * 100)}%)`}
                        >
                          {formInfo.arrow}
                        </span>
                      );
                    })()}
                    {player.injured && player.injuryWeeksLeft > 0 && <span className="status-icon injury"><HeartPulse size={12} />{player.injuryWeeksLeft}s</span>}
                    {player.suspended && player.suspensionType === 'red' && <span className="status-icon red"><Square size={12} className="card-red" />{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'double_yellow' && <span className="status-icon red"><><Square size={12} className="card-yellow" /><Square size={12} className="card-yellow" /></>{player.suspensionMatches}p</span>}
                    {player.suspended && player.suspensionType === 'yellow' && <span className="status-icon yellow"><Square size={12} className="card-yellow" />×5</span>}
                    {!player.suspended && !player.injured && player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0 && <span className="status-icon boost"><TrendingUp size={12} />{player.postInjuryWeeksLeft}s</span>}
                    {!player.suspended && !player.injured && !(player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0) && (player.yellowCards || 0) >= 4 && <span className="status-icon warning"><AlertTriangle size={12} /></span>}
                  </span>
                  {PLAYER_ATTRIBUTES.map(attr => {
                    const boostedOvr = (player[attr.key] || player.overall) + (player.postInjuryBonus || 0);
                    const hasBoosted = player.postInjuryBonus > 0 && player.postInjuryWeeksLeft > 0;
                    return (
                    <span
                      key={attr.key}
                      className={`col-attr ${
                        boostedOvr >= 80 ? 'high' :
                        boostedOvr <= 60 ? 'low' : ''
                      } ${hasBoosted ? 'boosted' : ''}`}
                    >
                      {boostedOvr}
                    </span>
                    );
                  })}
                  <span className="col-pos" style={getPositionStyle(player.position)}>
                    {translatePosition(player.position)}
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
              const slotPos = getSlotPosition(pos.id);
              const fit = player ? getPositionFit(player.position, slotPos) : null;
              const baseOvr = (player?.overall || 0) + (player?.postInjuryBonus || 0);
              const adjOvr = player && fit ? Math.round(baseOvr * fit.factor) : baseOvr || undefined;
              const borderColor = fit ? FIT_COLORS[fit.level] : '#fff';
              const hasBoosted = player?.postInjuryBonus > 0 && player?.postInjuryWeeksLeft > 0;
              return (
                <div
                  key={pos.id}
                  className={`pitch-slot ${player ? 'filled' : 'empty'} ${hasBoosted ? 'boosted' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => handleSlotClick(pos.id)}
                >
                  {player ? (
                    <div className="player-dot" style={{ background: getPositionColor(player.position), borderColor, boxShadow: hasBoosted ? '0 0 10px 3px rgba(48, 209, 88, 0.6)' : undefined }}>
                      <span className="ovr">{adjOvr}</span>
                      {/* Form arrow on pitch */}
                      {(() => {
                        const form = (state.playerForm || {})[player.name] || 'normal';
                        const formInfo = FORM_STATES[form];
                        // Mostrar siempre la flecha (como PES6)
                        return (
                          <span
                            className={`pitch-form-arrow form-${form}`}
                            style={{
                              position: 'absolute',
                              top: '-10px',
                              right: '-10px',
                              color: formInfo.color,
                              fontWeight: 'bold',
                              fontSize: '12px',
                              lineHeight: 1,
                              textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                              zIndex: 5
                            }}
                            title={`Forma: ${formInfo.label} (${formInfo.matchBonus > 0 ? '+' : ''}${Math.round(formInfo.matchBonus * 100)}%)`}
                          >
                            {formInfo.arrow}
                          </span>
                        );
                      })()}
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
            <div className="params-header">{t('formation.parameters')}</div>

            <div className="params-section">
              <div className="param-item">
                <span className="label">{t('formation.rating')}</span>
                <span className="stars">{renderStars(getStarRating(teamStrength.overall))}</span>
              </div>
              <div className="param-item">
                <span className="label">{t('formation.teamAverage')}</span>
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
                    <span className="label">{t('common.age')}</span>
                    <span className="value">{selectedPlayer.age} {t('formation.years')}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('common.position')}</span>
                    <span className="value">{selectedPlayer.position}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTONES */}
          <div className="pcf-buttons">
            <button className="pcf-btn" onClick={() => setShowInjuredModal(true)}><Heart size={16} /> {t('formation.injured').toUpperCase()}</button>
            <button className="pcf-btn" onClick={() => setShowStatsModal(true)}><BarChart3 size={16} /> {t('formation.statistics').toUpperCase()}</button>
            <button className="pcf-btn" onClick={() => setShowTacticModal(true)}><Target size={16} /> {t('formation.tactic').toUpperCase()}</button>
          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN */}
      {showModal && (
        <div className="pcf-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pcf-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('formation.selectPlayer')}</h3>
              <button onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {players
                .filter(p => !p.injured && !p.suspended)
                .sort((a, b) => {
                  const slotPos = getSlotPosition(selectedSlot);
                  const fitA = getPositionFit(a.position, slotPos);
                  const fitB = getPositionFit(b.position, slotPos);
                  if (fitB.factor !== fitA.factor) return fitB.factor - fitA.factor;
                  return b.overall - a.overall;
                })
                .map(player => {
                  const slotPos = getSlotPosition(selectedSlot);
                  const fit = getPositionFit(player.position, slotPos);
                  const fitClass = fit.level === 'perfect' ? 'fit-perfect' :
                                   fit.level === 'good' ? 'fit-good' :
                                   fit.level === 'decent' ? 'fit-decent' : '';
                  const isInLineup = Object.values(lineup).some(p => p?.name === player.name);
                  return (
                    <div
                      key={player.name}
                      className={`modal-player ${fitClass} ${isInLineup ? 'in-lineup' : ''}`}
                      onClick={() => handlePlayerSelect(player)}
                    >
                      <span className="pos" style={{ color: getPositionColor(player.position) }}>
                        {translatePosition(player.position)}
                      </span>
                      <span className="name">{player.name}</span>
                      <span className="ovr">{player.overall}</span>
                      {fit.level === 'perfect' && <span className="badge"><Check size={10} /></span>}
                      {fit.level === 'good' && <span className="badge good">≈</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
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
          leagueTable={state.leagueTable}
          teamId={state.teamId}
          playerSeasonStats={state.playerSeasonStats}
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
                const slotPos = getSlotPosition(pos.id);
                const best = players
                  .filter(p => !used.has(p.name) && !p.injured && !p.suspended)
                  .sort((a, b) => {
                    const fitA = getPositionFit(a.position, slotPos);
                    const fitB = getPositionFit(b.position, slotPos);
                    const scoreA = fitA.factor * a.overall;
                    const scoreB = fitB.factor * b.overall;
                    return scoreB - scoreA;
                  })[0];

                if (best) {
                  newLineup[pos.id] = best;
                  used.add(best.name);
                }
              });

              setLineup(newLineup);
              dispatch({ type: 'SET_LINEUP', payload: newLineup });

              // Recalcular convocados: los de la lista manual que NO son titulares,
              // + backfill de los mejores disponibles hasta llegar a 5
              const newLineupNames = new Set(Object.values(newLineup).map(p => p?.name).filter(Boolean));
              const currentConvocados = (state.convocados || []).filter(n => !newLineupNames.has(n));
              if (currentConvocados.length < 5) {
                const needed = 5 - currentConvocados.length;
                const available = players
                  .filter(p => !newLineupNames.has(p.name) && !currentConvocados.includes(p.name) && !p.injured)
                  .sort((a, b) => b.overall - a.overall)
                  .slice(0, needed)
                  .map(p => p.name);
                currentConvocados.push(...available);
              }
              dispatch({ type: 'SET_CONVOCADOS', payload: currentConvocados });
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
// TrainingModal removed - training system eliminated

function _TrainingModal_REMOVED({ onClose, players, facilities, dispatch, currentIntensity }) {
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
              <span className="icon"><Check size={14} /></span>
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
                        <span className="pos">{translatePosition(player.position)}</span>
                        <span className="name">{player.name}</span>
                        <span className="ovr">{player.overall}</span>
                      </div>
                      <div className="injury-info">
                        <span className={`weeks ${wasTreated ? 'reduced' : ''}`}>
                          <Clock size={12} /> {adjustedWeeks} semana{adjustedWeeks !== 1 ? 's' : ''}
                          {wasTreated && <span className="treat-badge"><Check size={10} /></span>}
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
function StatsModal({ onClose, players, team, leagueTable, teamId, playerSeasonStats }) {
  const [tab, setTab] = useState('equipo');

  // Stats del equipo
  const avgOverall = Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length) || 0;
  const totalValue = players.reduce((s, p) => s + (p.value || 0), 0);
  const avgAge = Math.round(players.reduce((s, p) => s + (p.age || 25), 0) / players.length) || 0;

  // Top jugadores
  const topOverall = [...players].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const topValue = [...players].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5);

  // Stats de temporada - derivar de leagueTable (fuente real)
  const teamEntry = (leagueTable || []).find(t => t.teamId === teamId);
  const stats = teamEntry
    ? {
        played: teamEntry.played || 0,
        won: teamEntry.won || 0,
        drawn: teamEntry.drawn || 0,
        lost: teamEntry.lost || 0,
        goalsFor: teamEntry.goalsFor || 0,
        goalsAgainst: teamEntry.goalsAgainst || 0
      }
    : { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };

  // Stats individuales de jugadores - de playerSeasonStats
  const pStats = playerSeasonStats || {};
  const teamPlayerNames = new Set(players.map(p => p.name));

  // Goleadores (solo jugadores actuales del equipo)
  const topScorers = Object.entries(pStats)
    .filter(([name, s]) => teamPlayerNames.has(name) && s.goals > 0)
    .sort((a, b) => b[1].goals - a[1].goals)
    .slice(0, 5);

  // Asistentes
  const topAssisters = Object.entries(pStats)
    .filter(([name, s]) => teamPlayerNames.has(name) && s.assists > 0)
    .sort((a, b) => b[1].assists - a[1].assists)
    .slice(0, 5);

  // Más partidos
  const topAppearances = Object.entries(pStats)
    .filter(([name, s]) => teamPlayerNames.has(name) && s.matchesPlayed > 0)
    .sort((a, b) => b[1].matchesPlayed - a[1].matchesPlayed)
    .slice(0, 5);

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
          <button className={tab === 'jugadores' ? 'active' : ''} onClick={() => setTab('jugadores')}>Jugadores</button>
          <button className={tab === 'top' ? 'active' : ''} onClick={() => setTab('top')}>Top</button>
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

          {tab === 'jugadores' && (
            <div className="top-players">
              {topScorers.length > 0 && (
                <div className="top-section">
                  <h4>Goleadores</h4>
                  {topScorers.map(([name, s], i) => (
                    <div key={name} className="top-row">
                      <span className="rank">{i + 1}</span>
                      <span className="name">{name}</span>
                      <span className="value">{s.goals} gol{s.goals !== 1 ? 'es' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {topAssisters.length > 0 && (
                <div className="top-section">
                  <h4>Asistentes</h4>
                  {topAssisters.map(([name, s], i) => (
                    <div key={name} className="top-row">
                      <span className="rank">{i + 1}</span>
                      <span className="name">{name}</span>
                      <span className="value">{s.assists} asist.</span>
                    </div>
                  ))}
                </div>
              )}
              {topAppearances.length > 0 && (
                <div className="top-section">
                  <h4>Más partidos</h4>
                  {topAppearances.map(([name, s], i) => (
                    <div key={name} className="top-row">
                      <span className="rank">{i + 1}</span>
                      <span className="name">{name}</span>
                      <span className="value">{s.matchesPlayed} PJ</span>
                    </div>
                  ))}
                </div>
              )}
              {topScorers.length === 0 && topAssisters.length === 0 && topAppearances.length === 0 && (
                <p style={{ color: '#8899aa', textAlign: 'center', padding: '2rem 0' }}>Sin estadísticas aún - juega partidos para generar datos</p>
              )}
            </div>
          )}

          {tab === 'top' && (
            <div className="top-players">
              <div className="top-section">
                <h4><Trophy size={14} /> Mejor valorados</h4>
                {topOverall.map((p, i) => (
                  <div key={p.name} className="top-row">
                    <span className="rank">{i + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="value">{p.overall}</span>
                  </div>
                ))}
              </div>
              <div className="top-section">
                <h4><Coins size={14} /> Más valiosos</h4>
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
/** Mini-campo SVG para preview de formación */
function MiniPitch({ positions, isActive }) {
  return (
    <svg viewBox="0 0 100 120" className="mini-pitch">
      {/* Campo */}
      <rect x="2" y="2" width="96" height="116" rx="3" fill={isActive ? '#1a3a2a' : '#0d1a14'} stroke={isActive ? '#2d8a4e' : '#1a2f22'} strokeWidth="1" />
      {/* Línea central */}
      <line x1="2" y1="60" x2="98" y2="60" stroke={isActive ? '#2d8a4e' : '#1a2f22'} strokeWidth="0.5" />
      {/* Círculo central */}
      <circle cx="50" cy="60" r="10" fill="none" stroke={isActive ? '#2d8a4e' : '#1a2f22'} strokeWidth="0.5" />
      {/* Áreas */}
      <rect x="25" y="2" width="50" height="18" fill="none" stroke={isActive ? '#2d8a4e' : '#1a2f22'} strokeWidth="0.5" />
      <rect x="25" y="100" width="50" height="18" fill="none" stroke={isActive ? '#2d8a4e' : '#1a2f22'} strokeWidth="0.5" />
      {/* Puntos de jugadores */}
      {positions.map((pos, i) => {
        const py = 4 + (pos.y / 100) * 112;
        const px = 2 + (pos.x / 100) * 96;
        const isGK = pos.id === 'GK';
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={isGK ? 3.5 : 3} fill={isActive ? (isGK ? '#ffd60a' : '#30d158') : (isGK ? '#aa8800' : '#446655')} />
            <text x={px} y={py + 7} textAnchor="middle" fontSize="4.5" fontWeight="bold" fill={isActive ? '#fff' : '#556'}>
              {translatePosition(pos.id)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TacticModal({ onClose, currentTactic, currentFormation, dispatch, onFormationChange }) {
  const { t } = useTranslation();
  const [tactic, setTactic] = useState(currentTactic);
  const [formation, setFormation] = useState(currentFormation);
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState('formation');

  const formationGroups = [
    {
      label: '4 Defensas',
      formations: ['4-3-3', '4-3-3 (MCO)', '4-4-2', '4-4-2 (Diamante)', '4-2-3-1', '4-1-4-1', '4-5-1', '4-1-2-1-2', '4-3-2-1']
    },
    {
      label: '3 Defensas',
      formations: ['3-5-2', '3-4-3', '3-4-1-2']
    },
    {
      label: '5 Defensas',
      formations: ['5-3-2', '5-4-1', '5-2-3']
    }
  ];

  const tacticOptions = [
    { id: 'defensive', name: 'Defensiva', desc: 'Muro atrás, pocas ocasiones', iconType: 'shield', bonus: '+40% defensa, -40% ataque', detail: 'Fuerte vs Equilibrada · Débil vs Posesión y Ofensiva', color: '#0a84ff' },
    { id: 'balanced', name: 'Equilibrada', desc: 'Sin sorpresas, sin riesgos', iconType: 'scale', bonus: 'Sin modificadores', detail: 'No tiene ventajas ni desventajas tácticas', color: '#8e8e93' },
    { id: 'attacking', name: 'Ofensiva', desc: 'A por todas, riesgo alto', iconType: 'swords', bonus: '+35% ataque, -30% defensa', detail: 'Fuerte vs Defensiva · Débil vs Contra y Presión', color: '#ff453a' },
    { id: 'possession', name: 'Posesión', desc: 'Dominar el balón y cansar', iconType: 'target', bonus: '+30% posesión, +10% defensa', detail: 'Fuerte vs Contra · Débil vs Presión alta', color: '#30d158' },
    { id: 'counter', name: 'Contraataque', desc: 'Ceder balón, matar a la contra', iconType: 'zap', bonus: '+20% ataque, +15% defensa, -25% posesión', detail: 'Fuerte vs Ofensiva y Presión · Débil vs Posesión', color: '#ff9f0a' },
  ];

  // Posiciones únicas de la formación seleccionada (sin GK)
  const selectedPositions = useMemo(() => {
    const fp = FORMATION_POSITIONS[formation];
    if (!fp) return [];
    return fp.filter(p => p.id !== 'GK').map(p => translatePosition(p.id));
  }, [formation]);

  const handleSave = () => {
    dispatch({ type: 'SET_TACTIC', payload: tactic });
    if (formation !== currentFormation && onFormationChange) {
      onFormationChange(formation);
    }
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
          <h3><Target size={20} style={{ marginRight: 8 }} /> {t('formation.tacticAndFormation')}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="tactic-tabs">
          <button className={`tab ${activeTab === 'formation' ? 'active' : ''}`} onClick={() => setActiveTab('formation')}>
            ⚽ {t('formation.formation')}
          </button>
          <button className={`tab ${activeTab === 'tactic' ? 'active' : ''}`} onClick={() => setActiveTab('tactic')}>
            🎯 {t('formation.tactic')}
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'formation' && (
            <div className="formation-visual-selector">
              {formationGroups.map(group => (
                <div key={group.label} className="formation-group">
                  <div className="group-label">{group.label}</div>
                  <div className="formation-grid">
                    {group.formations.map(f => {
                      const fp = FORMATION_POSITIONS[f];
                      if (!fp) return null;
                      const isActive = formation === f;
                      return (
                        <div
                          key={f}
                          className={`formation-card ${isActive ? 'active' : ''}`}
                          onClick={() => setFormation(f)}
                        >
                          <MiniPitch positions={fp} isActive={isActive} />
                          <div className="formation-name">{f}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Detalle de la formación seleccionada */}
              <div className="formation-detail">
                <div className="detail-header">
                  <span className="detail-name">{formation}</span>
                  <span className="detail-desc">{FORMATIONS[formation]?.description}</span>
                </div>
                <div className="detail-positions">
                  {selectedPositions.map((p, i) => (
                    <span key={i} className="pos-tag">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tactic' && (
            <div className="tactic-options">
              {tacticOptions.map(opt => {
                const IconComponent = {
                  shield: Shield,
                  scale: Scale,
                  swords: Swords,
                  target: Target,
                  zap: Zap
                }[opt.iconType] || Settings;

                return (
                  <div
                    key={opt.id}
                    className={`tactic-option ${tactic === opt.id ? 'active' : ''}`}
                    onClick={() => setTactic(opt.id)}
                    style={{ '--tactic-color': opt.color }}
                  >
                    <span className="icon" style={{ color: opt.color }}>
                      <IconComponent size={24} />
                    </span>
                    <div className="info">
                      <span className="name">{opt.name}</span>
                      <span className="desc">{opt.desc}</span>
                      <span className="bonus">{opt.bonus}</span>
                      {opt.detail && <span className="detail">{opt.detail}</span>}
                    </div>
                    {tactic === opt.id && <CheckCircle2 size={20} className="check" style={{ color: opt.color }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-confirm" onClick={handleSave}>Aplicar</button>
        </div>

        {showToast && (
          <div className="tactic-toast">
            <Check size={14} /> {formation} · {tacticOptions.find(opt => opt.id === tactic)?.name}
          </div>
        )}
      </div>
    </div>
  );
}

