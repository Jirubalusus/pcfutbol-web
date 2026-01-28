// ============================================================
// PC FÚTBOL WEB - SISTEMA DE ROLES DE JUGADORES
// Los roles dan personalidad y afectan al rendimiento según
// táctica y sinergias (cálculos ocultos al usuario)
// ============================================================

// Roles disponibles por posición
export const ROLES = {
  // PORTEROS
  GK: [
    { id: 'shot_stopper', name: 'Parador', icon: '🧤', desc: 'Especialista en paradas difíciles' },
    { id: 'sweeper_keeper', name: 'Líbero', icon: '🦶', desc: 'Sale bien del área, buen juego con los pies' },
    { id: 'commander', name: 'Comunicador', icon: '📢', desc: 'Organiza la defensa, da seguridad' },
  ],
  
  // DEFENSAS CENTRALES
  CB: [
    { id: 'wall', name: 'Muro', icon: '🧱', desc: 'Imponente en duelos aéreos y físicos' },
    { id: 'leader', name: 'Líder', icon: '📖', desc: 'Organiza la línea, mejora a los compañeros' },
    { id: 'ball_playing', name: 'Constructor', icon: '🎯', desc: 'Buen pase largo, inicia jugadas' },
    { id: 'marker', name: 'Marcador', icon: '👤', desc: 'Anula al delantero rival' },
  ],
  
  // LATERALES
  LB: [
    { id: 'attacking_fb', name: 'Ofensivo', icon: '⚡', desc: 'Sube constantemente al ataque' },
    { id: 'defensive_fb', name: 'Defensivo', icon: '🛡️', desc: 'Prioriza la solidez atrás' },
    { id: 'inverted_fb', name: 'Invertido', icon: '🔄', desc: 'Cierra al centro, crea superioridad' },
  ],
  RB: [
    { id: 'attacking_fb', name: 'Ofensivo', icon: '⚡', desc: 'Sube constantemente al ataque' },
    { id: 'defensive_fb', name: 'Defensivo', icon: '🛡️', desc: 'Prioriza la solidez atrás' },
    { id: 'inverted_fb', name: 'Invertido', icon: '🔄', desc: 'Cierra al centro, crea superioridad' },
  ],
  
  // MEDIOCENTROS DEFENSIVOS
  CDM: [
    { id: 'destroyer', name: 'Destructor', icon: '💥', desc: 'Rompe el juego rival, recupera balones' },
    { id: 'anchor', name: 'Ancla', icon: '⚓', desc: 'Posicional, da equilibrio al equipo' },
    { id: 'deep_playmaker', name: 'Pivote creativo', icon: '🧠', desc: 'Distribuye desde atrás' },
  ],
  
  // CENTROCAMPISTAS
  CM: [
    { id: 'box_to_box', name: 'Box to box', icon: '🚀', desc: 'Incansable, cubre todo el campo' },
    { id: 'playmaker', name: 'Organizador', icon: '🧠', desc: 'Cerebro del equipo, dicta el ritmo' },
    { id: 'mezzala', name: 'Mezzala', icon: '↗️', desc: 'Se incorpora al ataque por los costados' },
  ],
  
  // MEDIAPUNTAS
  CAM: [
    { id: 'classic_10', name: 'Clásico 10', icon: '✨', desc: 'Creador puro, último pase letal' },
    { id: 'shadow_striker', name: 'Segundo punta', icon: '👻', desc: 'Aparece en el área, goleador' },
    { id: 'trequartista', name: 'Trequartista', icon: '🎭', desc: 'Impredecible, busca espacios' },
  ],
  
  // EXTREMOS
  LW: [
    { id: 'winger', name: 'Extremo puro', icon: '💨', desc: 'Velocidad y desborde por banda' },
    { id: 'inverted_winger', name: 'Extremo invertido', icon: '🔄', desc: 'Recorta hacia dentro para disparar' },
    { id: 'wide_playmaker', name: 'Creador de banda', icon: '🎯', desc: 'Baja a recibir y distribuir' },
  ],
  RW: [
    { id: 'winger', name: 'Extremo puro', icon: '💨', desc: 'Velocidad y desborde por banda' },
    { id: 'inverted_winger', name: 'Extremo invertido', icon: '🔄', desc: 'Recorta hacia dentro para disparar' },
    { id: 'wide_playmaker', name: 'Creador de banda', icon: '🎯', desc: 'Baja a recibir y distribuir' },
  ],
  RM: [
    { id: 'winger', name: 'Extremo puro', icon: '💨', desc: 'Velocidad y desborde por banda' },
    { id: 'wide_midfielder', name: 'Volante de banda', icon: '🔁', desc: 'Equilibrado, sube y baja' },
  ],
  LM: [
    { id: 'winger', name: 'Extremo puro', icon: '💨', desc: 'Velocidad y desborde por banda' },
    { id: 'wide_midfielder', name: 'Volante de banda', icon: '🔁', desc: 'Equilibrado, sube y baja' },
  ],
  
  // DELANTEROS
  ST: [
    { id: 'poacher', name: 'Rematador', icon: '🎯', desc: 'Letal en el área, vive del gol' },
    { id: 'speedster', name: 'Velocista', icon: '🏃', desc: 'Ataca los espacios, letal al contra' },
    { id: 'target_man', name: 'Pivote', icon: '🔗', desc: 'Aguanta balones, conecta el juego' },
    { id: 'pressing_forward', name: 'Presionador', icon: '🦊', desc: 'Primer defensor, roba y corre' },
    { id: 'complete_forward', name: 'Completo', icon: '👑', desc: 'Hace de todo, referencia total' },
  ],
  CF: [
    { id: 'false_nine', name: 'Falso 9', icon: '🎭', desc: 'Baja a crear, arrastra marcas' },
    { id: 'poacher', name: 'Rematador', icon: '🎯', desc: 'Letal en el área, vive del gol' },
    { id: 'complete_forward', name: 'Completo', icon: '👑', desc: 'Hace de todo, referencia total' },
  ],
};

// Bonus/penalización por táctica (valores ocultos)
// Positivo = el rol rinde mejor con esa táctica
// Negativo = el rol sufre con esa táctica
const TACTIC_BONUSES = {
  // Táctica: { rol: bonus }
  defensive: {
    wall: 4, leader: 3, marker: 4, defensive_fb: 3, anchor: 4, destroyer: 3,
    shot_stopper: 2, commander: 2,
    attacking_fb: -2, winger: -2, trequartista: -3, speedster: -1,
  },
  balanced: {
    box_to_box: 3, anchor: 2, playmaker: 2, mezzala: 2,
    leader: 1, ball_playing: 2,
    // Sin grandes penalizaciones
  },
  attacking: {
    attacking_fb: 4, winger: 3, inverted_winger: 3, classic_10: 3,
    shadow_striker: 3, poacher: 2, speedster: 2, trequartista: 2,
    defensive_fb: -2, anchor: -1, wall: -1,
  },
  possession: {
    playmaker: 5, deep_playmaker: 4, ball_playing: 4, classic_10: 4,
    anchor: 3, mezzala: 2, wide_playmaker: 3, false_nine: 4,
    commander: 2, sweeper_keeper: 3,
    destroyer: -2, speedster: -3, pressing_forward: -2, poacher: -1,
  },
  counter: {
    speedster: 5, winger: 4, pressing_forward: 3, destroyer: 3,
    box_to_box: 3, poacher: 2, inverted_winger: 2,
    shot_stopper: 2, defensive_fb: 2,
    playmaker: -2, classic_10: -2, trequartista: -3, false_nine: -3,
    ball_playing: -1,
  },
};

// Sinergias entre roles (bonus cuando ambos están en el campo)
const SYNERGIES = [
  // [rol1, rol2, bonus, descripción]
  ['classic_10', 'poacher', 3, 'El creador encuentra al rematador'],
  ['playmaker', 'box_to_box', 2, 'Organización y despliegue físico'],
  ['leader', 'wall', 3, 'Defensa sólida y organizada'],
  ['winger', 'target_man', 3, 'Centros al pivote'],
  ['inverted_winger', 'attacking_fb', 2, 'Superioridad en banda'],
  ['deep_playmaker', 'speedster', 2, 'Pases largos al velocista'],
  ['destroyer', 'playmaker', 2, 'Recupera y distribuye'],
  ['pressing_forward', 'destroyer', 2, 'Presión coordinada'],
  ['commander', 'leader', 2, 'Comunicación defensiva'],
  ['sweeper_keeper', 'ball_playing', 2, 'Salida de balón limpia'],
  ['shadow_striker', 'target_man', 3, 'Pivote y llegador'],
  ['false_nine', 'winger', 3, 'Espacios para los extremos'],
  ['mezzala', 'defensive_fb', 2, 'Equilibrio en banda'],
];

// Anti-sinergias (penalización)
const ANTI_SYNERGIES = [
  ['poacher', 'false_nine', -2, 'Dos delanteros que quieren el mismo espacio'],
  ['trequartista', 'classic_10', -2, 'Demasiada creatividad, poca finalización'],
  ['speedster', 'speedster', -1, 'Sin servicio, corren sin balón'],
  ['destroyer', 'destroyer', -1, 'Demasiado músculo, poca creación'],
];

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

/**
 * Asigna un rol a un jugador basándose en su posición, stats y edad
 */
export function assignRole(player) {
  const position = player.position;
  const availableRoles = ROLES[position] || ROLES['CM']; // Default a CM
  
  if (!availableRoles || availableRoles.length === 0) {
    return { id: 'unknown', name: 'Versátil', icon: '⚽', desc: 'Jugador polivalente' };
  }
  
  // Factores para elegir rol
  const age = player.age || 25;
  const overall = player.overall || 70;
  const pace = player.pace || player.speed || overall;
  const passing = player.passing || overall;
  const shooting = player.shooting || overall;
  const defending = player.defending || player.tackling || overall;
  const physical = player.physical || player.stamina || overall;
  
  // Pesos según características
  const weights = availableRoles.map(role => {
    let weight = 10; // Base
    
    switch(role.id) {
      // Porteros
      case 'shot_stopper': weight += overall * 0.3; break;
      case 'sweeper_keeper': weight += (pace + passing) * 0.2; break;
      case 'commander': weight += (age > 28 ? 15 : 0) + (overall > 78 ? 10 : 0); break;
      
      // Defensas
      case 'wall': weight += (physical + defending) * 0.3; break;
      case 'leader': weight += (age > 27 ? 20 : 0) + (overall > 75 ? 15 : 0); break;
      case 'ball_playing': weight += passing * 0.4; break;
      case 'marker': weight += defending * 0.4; break;
      
      // Laterales
      case 'attacking_fb': weight += (pace + passing) * 0.25; break;
      case 'defensive_fb': weight += defending * 0.4; break;
      case 'inverted_fb': weight += passing * 0.35; break;
      
      // Mediocentros
      case 'destroyer': weight += (physical + defending) * 0.3; break;
      case 'anchor': weight += (defending + passing) * 0.2; break;
      case 'deep_playmaker': weight += passing * 0.5; break;
      case 'box_to_box': weight += (physical + pace) * 0.25; break;
      case 'playmaker': weight += passing * 0.5 + (age > 26 ? 10 : 0); break;
      case 'mezzala': weight += (pace + shooting) * 0.2; break;
      
      // Mediapuntas
      case 'classic_10': weight += passing * 0.5; break;
      case 'shadow_striker': weight += shooting * 0.4; break;
      case 'trequartista': weight += (passing + pace) * 0.2 + Math.random() * 20; break;
      
      // Extremos
      case 'winger': weight += pace * 0.5; break;
      case 'inverted_winger': weight += shooting * 0.4; break;
      case 'wide_playmaker': weight += passing * 0.4; break;
      case 'wide_midfielder': weight += (physical + defending) * 0.2; break;
      
      // Delanteros
      case 'poacher': weight += shooting * 0.5; break;
      case 'speedster': weight += pace * 0.5; break;
      case 'target_man': weight += physical * 0.5; break;
      case 'pressing_forward': weight += (physical + pace) * 0.25; break;
      case 'complete_forward': weight += overall * 0.3 + (overall > 82 ? 20 : 0); break;
      case 'false_nine': weight += passing * 0.4; break;
    }
    
    // Añadir algo de aleatoriedad para variedad
    weight += Math.random() * 15;
    
    return { role, weight };
  });
  
  // Ordenar por peso y elegir el mejor
  weights.sort((a, b) => b.weight - a.weight);
  return weights[0].role;
}

/**
 * Calcula el bonus total de un jugador según táctica y sinergias
 * (Esta función se usa internamente, el usuario no ve los números)
 */
export function calculateRoleBonus(player, tactic, teammates) {
  if (!player.role) return 0;
  
  let bonus = 0;
  const roleId = player.role.id;
  
  // 1. Bonus por táctica
  const tacticBonuses = TACTIC_BONUSES[tactic] || {};
  bonus += tacticBonuses[roleId] || 0;
  
  // 2. Sinergias con compañeros
  const teammateRoles = teammates
    .filter(t => t.name !== player.name && t.role)
    .map(t => t.role.id);
  
  SYNERGIES.forEach(([role1, role2, synergyBonus]) => {
    if (roleId === role1 && teammateRoles.includes(role2)) {
      bonus += synergyBonus;
    }
    if (roleId === role2 && teammateRoles.includes(role1)) {
      bonus += synergyBonus;
    }
  });
  
  // 3. Anti-sinergias
  ANTI_SYNERGIES.forEach(([role1, role2, penalty]) => {
    if (roleId === role1 && teammateRoles.includes(role2)) {
      bonus += penalty;
    }
  });
  
  // Limitar el bonus total (-5 a +8)
  return Math.max(-5, Math.min(8, bonus));
}

/**
 * Calcula el overall efectivo de un jugador en un partido
 */
export function getEffectiveOverall(player, tactic, teammates, morale = 75) {
  const baseOverall = player.overall || 70;
  
  // Bonus de rol (oculto)
  const roleBonus = calculateRoleBonus(player, tactic, teammates);
  
  // Bonus de moral (-3 a +3)
  const moraleBonus = Math.round((morale - 75) / 10);
  
  // Bonus de forma/fitness (-2 a 0)
  const fitness = player.fitness ?? player.energy ?? 100;
  const fitnessBonus = fitness < 70 ? -2 : fitness < 85 ? -1 : 0;
  
  // Calcular overall efectivo
  const effective = baseOverall + roleBonus + moraleBonus + fitnessBonus;
  
  // Limitar entre 40 y 99
  return Math.max(40, Math.min(99, effective));
}

/**
 * Obtiene un mensaje de feedback sobre la alineación (sin números)
 * Para dar pistas al usuario sin revelar el sistema
 */
export function getLineupFeedback(lineup, tactic) {
  const players = Object.values(lineup).filter(p => p && p.role);
  const feedback = [];
  
  if (players.length < 11) {
    return ['⚠️ Alineación incompleta'];
  }
  
  const roles = players.map(p => p.role.id);
  
  // Detectar buenas combinaciones
  const hasPlaymaker = roles.includes('playmaker') || roles.includes('classic_10') || roles.includes('deep_playmaker');
  const hasFinisher = roles.includes('poacher') || roles.includes('shadow_striker');
  const hasWingers = roles.filter(r => r === 'winger' || r === 'inverted_winger').length >= 1;
  const hasDestroyer = roles.includes('destroyer') || roles.includes('anchor');
  const hasLeader = roles.includes('leader') || roles.includes('commander');
  
  // Feedback positivo
  if (hasPlaymaker && hasFinisher) {
    feedback.push('✨ Buena conexión entre creación y remate');
  }
  if (hasWingers && roles.includes('target_man')) {
    feedback.push('✨ Peligro por las bandas con un buen referente');
  }
  if (hasDestroyer && hasPlaymaker) {
    feedback.push('✨ Equilibrio entre recuperación y distribución');
  }
  if (hasLeader) {
    feedback.push('✨ Liderazgo en el campo');
  }
  
  // Feedback de advertencia
  if (!hasPlaymaker && tactic === 'possession') {
    feedback.push('⚠️ Falta un organizador para tu estilo de posesión');
  }
  if (!hasFinisher && (tactic === 'attacking' || tactic === 'counter')) {
    feedback.push('⚠️ Podrías necesitar más punch en ataque');
  }
  if (roles.filter(r => r === 'speedster').length >= 2 && !hasPlaymaker) {
    feedback.push('⚠️ Mucha velocidad pero ¿quién les pone el balón?');
  }
  if (!hasDestroyer && tactic === 'defensive') {
    feedback.push('⚠️ Tu táctica defensiva pide más contención');
  }
  
  // Si no hay nada especial
  if (feedback.length === 0) {
    feedback.push('📊 Alineación equilibrada');
  }
  
  return feedback;
}

/**
 * Obtiene el rol de un jugador (para mostrar en UI)
 */
export function getPlayerRole(player) {
  return player.role || { id: 'unknown', name: 'Versátil', icon: '⚽', desc: 'Jugador polivalente' };
}

export default {
  ROLES,
  assignRole,
  calculateRoleBonus,
  getEffectiveOverall,
  getLineupFeedback,
  getPlayerRole,
};
