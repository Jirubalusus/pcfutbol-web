// ============================================================
// GAME SHARED - Constantes y funciones compartidas
// Extraído de leagueEngine.js para romper dependencias circulares
// ============================================================

import { getEffectiveOverall, calculateRoleBonus } from './playerRoles';
import { getPositionFit, getSlotPosition } from './positionSystem';

// ============== CONFIGURACIÓN DE FORMACIONES ==============
export const FORMATIONS = {
  '4-3-3': {
    name: '4-3-3',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'LW', 'ST'],
    style: { attack: 1.1, defense: 0.95, midfield: 1.0 },
    description: 'Equilibrado con extremos peligrosos'
  },
  '4-4-2': {
    name: '4-4-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
    style: { attack: 1.0, defense: 1.0, midfield: 1.05 },
    description: 'Clásico y sólido'
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST'],
    style: { attack: 1.05, defense: 1.05, midfield: 0.95 },
    description: 'Control del centro del campo'
  },
  '3-5-2': {
    name: '3-5-2',
    positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CDM', 'CM', 'CM', 'LM', 'ST', 'ST'],
    style: { attack: 1.15, defense: 0.85, midfield: 1.1 },
    description: 'Ofensivo con carrileros'
  },
  '5-3-2': {
    name: '5-3-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'ST', 'ST'],
    style: { attack: 0.85, defense: 1.2, midfield: 0.95 },
    description: 'Ultra defensivo'
  },
  '4-1-4-1': {
    name: '4-1-4-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'RM', 'CM', 'CM', 'LM', 'ST'],
    style: { attack: 0.9, defense: 1.1, midfield: 1.1 },
    description: 'Compacto y ordenado'
  },
  '3-4-3': {
    name: '3-4-3',
    positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'],
    style: { attack: 1.25, defense: 0.8, midfield: 1.0 },
    description: 'Ultra ofensivo con 3 delanteros'
  },
  '5-4-1': {
    name: '5-4-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST'],
    style: { attack: 0.75, defense: 1.3, midfield: 1.0 },
    description: 'Muralla defensiva'
  },
  '4-5-1': {
    name: '4-5-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST'],
    style: { attack: 0.85, defense: 1.05, midfield: 1.2 },
    description: 'Dominio del centro del campo'
  },
  '4-3-3 (MCO)': {
    name: '4-3-3 (MCO)',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST'],
    style: { attack: 1.15, defense: 0.9, midfield: 1.05 },
    description: 'Mediapunta como enlace ofensivo'
  },
  '4-4-2 (Diamante)': {
    name: '4-4-2 (Diamante)',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    style: { attack: 1.1, defense: 0.95, midfield: 1.1 },
    description: 'Rombo en el centro, potencia arriba'
  },
  '4-1-2-1-2': {
    name: '4-1-2-1-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    style: { attack: 1.1, defense: 1.0, midfield: 1.0 },
    description: 'Estrecho, juego interior con 2 puntas'
  },
  '3-4-1-2': {
    name: '3-4-1-2',
    positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'CAM', 'ST', 'ST'],
    style: { attack: 1.2, defense: 0.85, midfield: 1.05 },
    description: 'Mediapunta con doble punta y carrileros'
  },
  '4-3-2-1': {
    name: '4-3-2-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'LW', 'ST'],
    style: { attack: 1.05, defense: 1.0, midfield: 1.05 },
    description: 'Árbol de Navidad, compacto en ataque'
  },
  '5-2-3': {
    name: '5-2-3',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'ST', 'LW'],
    style: { attack: 1.1, defense: 1.1, midfield: 0.85 },
    description: 'Defensa sólida con tridente ofensivo'
  }
};

// ============== TÁCTICAS ==============
export const TACTICS = {
  balanced:   { name: 'Equilibrado',    attack: 1.0,  defense: 1.0,  fatigue: 1.0,  possession: 1.0  },
  attacking:  { name: 'Ofensivo',       attack: 1.35, defense: 0.7,  fatigue: 1.15, possession: 1.05 },
  defensive:  { name: 'Defensivo',      attack: 0.6,  defense: 1.4,  fatigue: 0.85, possession: 0.85 },
  possession: { name: 'Posesión',       attack: 0.95, defense: 1.1,  fatigue: 0.9,  possession: 1.3  },
  counter:    { name: 'Contraataque',   attack: 1.2,  defense: 1.15, fatigue: 1.1,  possession: 0.75, counter: 1.5 },
  highPress:  { name: 'Presión alta',   attack: 1.25, defense: 0.85, fatigue: 1.3,  possession: 1.1  }
};

// Matchups tácticos
export const TACTICAL_MATCHUPS = {
  counter:    { strongVs: ['attacking', 'highPress'], weakVs: ['possession', 'defensive'] },
  possession: { strongVs: ['counter', 'defensive'],   weakVs: ['highPress'] },
  attacking:  { strongVs: ['defensive', 'balanced'],   weakVs: ['counter', 'highPress'] },
  defensive:  { strongVs: ['balanced'],                weakVs: ['possession', 'attacking'] },
  highPress:  { strongVs: ['possession', 'balanced'],  weakVs: ['counter'] },
  balanced:   { strongVs: [],                          weakVs: [] }
};

/**
 * Calcular bonus/penalización por matchup táctico
 * @returns number entre -6 y +6
 */
export function getTacticalMatchupBonus(myTactic, opponentTactic) {
  const matchup = TACTICAL_MATCHUPS[myTactic];
  if (!matchup) return 0;
  if (matchup.strongVs.includes(opponentTactic)) return 6;
  if (matchup.weakVs.includes(opponentTactic)) return -4;
  return 0;
}

// ============== HELPERS INTERNOS ==============

// Rating efectivo considerando fitness, moral, lesiones, roles y posición
export function getEffectiveRating(player, tactic = 'balanced', teammates = [], teamMorale = 70, formState = 'normal') {
  if (player.injured) return player.overall * 0.3;
  
  let rating = getEffectiveOverall(player, tactic, teammates, teamMorale);
  
  if (player.playingPosition) {
    const fit = getPositionFit(player.position, player.playingPosition);
    rating *= fit.factor;
  }
  
  if (player.age >= 34) rating *= 0.97;
  if (player.age >= 36) rating *= 0.94;
  if (player.age <= 23 && player.overall >= 75) rating *= 1.02;
  
  const formModifier = 1 + ({ excellent: 0.12, good: 0.05, normal: 0, low: -0.08, terrible: -0.18 }[formState] || 0);
  rating *= formModifier;
  
  return rating;
}

// Seleccionar mejor 11 según posiciones requeridas
export function selectBestLineup(players, requiredPositions) {
  const available = players.filter(p => !p.injured && !p.suspended);
  const lineup = [];
  const used = new Set();
  
  const positionMap = {
    'GK': ['GK'],
    'RB': ['RB', 'RWB', 'CB'],
    'LB': ['LB', 'LWB', 'CB'],
    'CB': ['CB', 'CDM'],
    'CDM': ['CDM', 'CM', 'CB'],
    'CM': ['CM', 'CDM', 'CAM'],
    'CAM': ['CAM', 'CM', 'RW', 'LW'],
    'RM': ['RM', 'RW', 'CM'],
    'LM': ['LM', 'LW', 'CM'],
    'RW': ['RW', 'RM', 'ST', 'CAM'],
    'LW': ['LW', 'LM', 'ST', 'CAM'],
    'ST': ['ST', 'CF', 'CAM', 'RW', 'LW']
  };
  
  for (const pos of requiredPositions) {
    const compatiblePositions = positionMap[pos] || [pos];
    
    let bestPlayer = null;
    let bestScore = -1;
    
    for (const player of available) {
      if (used.has(player.name)) continue;
      
      const posIndex = compatiblePositions.indexOf(player.position);
      if (posIndex === -1) continue;
      
      const score = player.overall - (posIndex * 3);
      
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }
    
    if (bestPlayer) {
      lineup.push({ ...bestPlayer, playingPosition: pos });
      used.add(bestPlayer.name);
    }
  }
  
  return lineup;
}

// ============== CÁLCULO DE FUERZA DEL EQUIPO ==============
export function calculateTeamStrength(team, formation = '4-3-3', tactic = 'balanced', teamMorale = 70, customLineup = null, playerForm = {}) {
  if (!team || !team.players || team.players.length === 0) {
    return { overall: team?.reputation || 50, attack: 50, midfield: 50, defense: 50, goalkeeper: 50, lineup: [] };
  }
  
  const formationData = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const tacticData = TACTICS[tactic] || TACTICS.balanced;
  
  let lineup;
  if (customLineup && Object.keys(customLineup).length >= 11) {
    lineup = Object.entries(customLineup)
      .filter(([_, p]) => p && p.name)
      .map(([slotId, p]) => {
        const freshPlayer = team.players.find(tp => tp.name === p.name) || p;
        const playingPos = getSlotPosition(slotId) || p.position;
        return { ...freshPlayer, playingPosition: playingPos };
      })
      .filter(p => !p.injured && !p.suspended);
    
    if (lineup.length < 11) {
      const usedNames = new Set(lineup.map(p => p.name));
      const remaining = selectBestLineup(
        team.players.filter(p => !usedNames.has(p.name)),
        formationData.positions.slice(lineup.length)
      );
      lineup = [...lineup, ...remaining];
    }
  } else {
    lineup = selectBestLineup(team.players, formationData.positions);
  }
  
  const getLinePos = (p) => p.playingPosition || p.position;
  const gkPlayers = lineup.filter(p => getLinePos(p) === 'GK');
  const defPlayers = lineup.filter(p => ['CB', 'RB', 'LB'].includes(getLinePos(p)));
  const midPlayers = lineup.filter(p => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(getLinePos(p)));
  const attPlayers = lineup.filter(p => ['ST', 'RW', 'LW', 'CF'].includes(getLinePos(p)));
  
  const baseGoalkeeper = gkPlayers.length > 0 
    ? gkPlayers.reduce((sum, p) => sum + p.overall, 0) / gkPlayers.length : 60;
  const baseDefense = defPlayers.length > 0 
    ? defPlayers.reduce((sum, p) => sum + p.overall, 0) / defPlayers.length : 60;
  const baseMidfield = midPlayers.length > 0 
    ? midPlayers.reduce((sum, p) => sum + p.overall, 0) / midPlayers.length : 60;
  const baseAttack = attPlayers.length > 0 
    ? attPlayers.reduce((sum, p) => sum + p.overall, 0) / attPlayers.length : 60;
  
  const visualOverall = lineup.length > 0 
    ? Math.round(lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length) : 60;
  
  const effectiveGoalkeeper = gkPlayers.length > 0 
    ? gkPlayers.reduce((sum, p) => sum + getEffectiveRating(p, tactic, lineup, teamMorale, playerForm[p.name] || 'normal'), 0) / gkPlayers.length : 60;
  const effectiveDefense = defPlayers.length > 0 
    ? defPlayers.reduce((sum, p) => sum + getEffectiveRating(p, tactic, lineup, teamMorale, playerForm[p.name] || 'normal'), 0) / defPlayers.length : 60;
  const effectiveMidfield = midPlayers.length > 0 
    ? midPlayers.reduce((sum, p) => sum + getEffectiveRating(p, tactic, lineup, teamMorale, playerForm[p.name] || 'normal'), 0) / midPlayers.length : 60;
  const effectiveAttack = attPlayers.length > 0 
    ? attPlayers.reduce((sum, p) => sum + getEffectiveRating(p, tactic, lineup, teamMorale, playerForm[p.name] || 'normal'), 0) / attPlayers.length : 60;
  
  const finalDefense = effectiveDefense * formationData.style.defense * tacticData.defense;
  const finalMidfield = effectiveMidfield * formationData.style.midfield;
  const finalAttack = effectiveAttack * formationData.style.attack * tacticData.attack;
  
  const effectiveOverall = (effectiveGoalkeeper * 0.15 + finalDefense * 0.25 + finalMidfield * 0.3 + finalAttack * 0.3);
  
  const effectiveStarPlayers = lineup.filter(p => p.overall >= 85).length;
  const starBonus = effectiveStarPlayers * 1.0;
  
  let synergyBonus = 0;
  lineup.forEach(player => {
    if (player.role) {
      const bonus = calculateRoleBonus(player, tactic, lineup);
      synergyBonus += bonus * 0.1;
    }
  });
  
  return {
    overall: visualOverall,
    effectiveOverall: Math.min(99, effectiveOverall + starBonus + synergyBonus),
    attack: finalAttack,
    midfield: finalMidfield,
    defense: finalDefense,
    goalkeeper: effectiveGoalkeeper,
    lineup,
    starPlayers: effectiveStarPlayers,
    synergyBonus: Math.round(synergyBonus * 10) / 10
  };
}
