// ============================================================
// SISTEMA DE INSTALACIONES CON ESPECIALIZACIONES Y EVENTOS
// ============================================================

import { getFacilityCostMultiplier } from './leagueTiers';

// Especializaciones disponibles por instalación
export const FACILITY_SPECIALIZATIONS = {
  training: {
    name: 'Entrenamiento',
    options: [
      { 
        id: 'physical', 
        name: 'Físico', 
        icon: '💪',
        description: 'Mayor progresión física, menos lesiones de entrenamiento',
        effect: { progressBonus: 0.15, injuryReduction: 0.5 }
      },
      { 
        id: 'tactical', 
        name: 'Táctico', 
        icon: '🧠',
        description: 'Mejor rendimiento táctico en partidos',
        effect: { matchBonus: 0.02 }
      },
      { 
        id: 'technical', 
        name: 'Técnico', 
        icon: '⚽',
        description: 'Mayor progresión para jóvenes (<23)',
        effect: { youthProgressBonus: 0.3 }
      }
    ]
  },
  youth: {
    name: 'Cantera',
    options: [
      { 
        id: 'goalkeeper', 
        name: 'Portero', 
        icon: '🧤',
        description: 'Genera porteros',
        effect: { positions: ['GK'], bonusOvr: 2 }
      },
      { 
        id: 'defense', 
        name: 'Defensa', 
        icon: '🛡️',
        description: 'Genera defensas (CB, RB, LB)',
        effect: { positions: ['CB', 'RB', 'LB'], bonusOvr: 2 }
      },
      { 
        id: 'midfield', 
        name: 'Medio', 
        icon: '🎯',
        description: 'Genera centrocampistas (CDM, CM, CAM)',
        effect: { positions: ['CDM', 'CM', 'CAM'], bonusOvr: 2 }
      },
      { 
        id: 'forward', 
        name: 'Delantero', 
        icon: '⚽',
        description: 'Genera delanteros y extremos (ST, RW, LW)',
        effect: { positions: ['ST', 'RW', 'LW'], bonusOvr: 2 }
      }
    ]
  },
  medical: {
    name: 'Centro Médico',
    options: [
      { 
        id: 'prevention', 
        name: 'Prevención', 
        icon: '🛡️',
        description: 'Reduce probabilidad de lesiones (-30%)',
        effect: { injuryChanceReduction: 0.30 }
      },
      { 
        id: 'recovery', 
        name: 'Recuperación', 
        icon: '⚡',
        description: 'Reduce tiempo de lesiones (-50%)',
        effect: { recoveryBonus: 0.50 }
      },
      { 
        id: 'performance', 
        name: 'Rendimiento', 
        icon: '📈',
        description: 'Jugadores rinden mejor tras lesión',
        effect: { postInjuryBonus: 0.10 }
      }
    ]
  },
};

// Tipos de eventos de instalaciones
export const FACILITY_EVENTS = {
  // Eventos de cantera
  youth_standout: {
    type: 'youth',
    title: '🌟 Canterano destacado',
    getMessage: (player) => `${player.name} (${player.position}, ${player.age} años) está brillando en el filial. ¿Lo subes al primer equipo?`,
    choices: [
      { id: 'promote', text: '⬆️ Subir al primer equipo', effect: 'add_player' },
      { id: 'wait', text: '⏳ Esperar una temporada más', effect: 'boost_potential' },
      { id: 'loan', text: '📋 Cederlo para que coja experiencia', effect: 'loan_boost' }
    ]
  },
  youth_offer: {
    type: 'youth',
    title: '💰 Oferta por canterano',
    getMessage: (player, amount) => `Un club ofrece €${(amount/1000000).toFixed(1)}M por ${player.name}. Es canterano, ¿lo vendes?`,
    choices: [
      { id: 'sell', text: '💰 Vender', effect: 'sell' },
      { id: 'negotiate', text: '📈 Pedir más', effect: 'negotiate' },
      { id: 'reject', text: '❌ Rechazar', effect: 'reject_boost_morale' }
    ]
  },
  
  // Eventos médicos
  medical_discovery: {
    type: 'medical',
    title: '🔬 Nueva técnica descubierta',
    getMessage: () => 'El equipo médico ha desarrollado una nueva técnica de recuperación.',
    choices: [
      { id: 'implement', text: '✅ Implementar (€500K)', effect: 'temp_recovery_boost', cost: 500000 },
      { id: 'study', text: '📚 Estudiar más', effect: 'small_permanent_boost' },
      { id: 'ignore', text: '❌ Ignorar', effect: 'none' }
    ]
  },
  player_discomfort: {
    type: 'medical',
    title: '⚠️ Jugador con molestias',
    getMessage: (player) => `${player.name} tiene molestias musculares. El médico recomienda descanso.`,
    choices: [
      { id: 'rest', text: '🛌 Descansar (1 semana)', effect: 'rest_prevent_injury' },
      { id: 'play', text: '⚽ Jugar igual', effect: 'risk_injury' },
      { id: 'treatment', text: '💉 Tratamiento intensivo (€100K)', effect: 'quick_fix', cost: 100000 }
    ]
  },
  
};

// Genera un evento aleatorio basado en las instalaciones
export function generateFacilityEvent(facilities, players, week) {
  const events = [];
  const roll = Math.random();
  
  // 15% de probabilidad de evento por semana
  if (roll > 0.15) return null;
  
  const youthLevel = facilities?.youth || 0;
  const medicalLevel = facilities?.medical || 0;
  // Más nivel = más probabilidad de eventos positivos
  const eventTypes = [];
  
  if (youthLevel > 0) {
    eventTypes.push('youth_standout', 'youth_offer');
  }
  if (medicalLevel > 0) {
    eventTypes.push('medical_discovery', 'player_discomfort');
  }
  
  if (eventTypes.length === 0) return null;
  
  const selectedType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const eventTemplate = FACILITY_EVENTS[selectedType];
  
  // Seleccionar jugador(es) relevante(s)
  const availablePlayers = players?.filter(p => !p.injured) || [];
  if (availablePlayers.length === 0) return null;
  
  const player1 = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
  const player2 = availablePlayers.filter(p => p.name !== player1.name)[Math.floor(Math.random() * (availablePlayers.length - 1))];
  
  const amount = Math.round(player1.value * (0.8 + Math.random() * 0.4));
  
  // Obtener choices - pueden ser estáticos o dinámicos
  const choices = eventTemplate.getChoices 
    ? eventTemplate.getChoices(player1, player2)
    : eventTemplate.choices;
  
  return {
    id: `event_${Date.now()}`,
    title: eventTemplate.title,
    type: eventTemplate.type,
    message: eventTemplate.getMessage(player1, selectedType === 'youth_offer' ? amount : player2),
    choices: choices,
    player: player1,
    player2: player2,
    amount: amount,
    week: week
  };
}

// ============================================================
// SISTEMA DE CANTERA — "HIJOS" DE JUGADORES RETIRADOS
// ============================================================

// Leyendas para la cantera del jugador (nombres mutados con gracia)
const LEGENDARY_SONS = [
  // Nombre original → nombre "hijo", posición, OVR referencia del padre
  { parent: 'Pelé', son: 'Pelú', pos: 'ST', parentOvr: 97 },
  { parent: 'Maradona', son: 'Maradoni', pos: 'CAM', parentOvr: 96 },
  { parent: 'Cruyff', son: 'Cruyfi', pos: 'CAM', parentOvr: 95 },
  { parent: 'Messi', son: 'Massi', pos: 'RW', parentOvr: 96 },
  { parent: 'Ronaldo Nazário', son: 'Roneldo', pos: 'ST', parentOvr: 95 },
  { parent: 'Cristiano Ronaldo', son: 'Cristiani', pos: 'LW', parentOvr: 94 },
  { parent: 'Zidane', son: 'Zidani', pos: 'CAM', parentOvr: 95 },
  { parent: 'Ronaldinho', son: 'Ronaldino', pos: 'CAM', parentOvr: 93 },
  { parent: 'Beckenbauer', son: 'Beckenbau', pos: 'CB', parentOvr: 95 },
  { parent: 'Maldini', son: 'Maldino', pos: 'CB', parentOvr: 94 },
  { parent: 'Pirlo', son: 'Pirli', pos: 'CM', parentOvr: 91 },
  { parent: 'Xavi', son: 'Xabi', pos: 'CM', parentOvr: 92 },
  { parent: 'Iniesta', son: 'Iniesti', pos: 'CM', parentOvr: 92 },
  { parent: 'Buffon', son: 'Baffon', pos: 'GK', parentOvr: 93 },
  { parent: 'Casillas', son: 'Casillos', pos: 'GK', parentOvr: 92 },
  { parent: 'Puyol', son: 'Puyel', pos: 'CB', parentOvr: 90 },
  { parent: 'Roberto Carlos', son: 'Roberto Carles', pos: 'LB', parentOvr: 91 },
  { parent: 'Cafu', son: 'Cafú Jr.', pos: 'RB', parentOvr: 91 },
  { parent: 'Henry', son: 'Hanry', pos: 'ST', parentOvr: 93 },
  { parent: 'Van Basten', son: 'Van Bisten', pos: 'ST', parentOvr: 94 },
  { parent: 'Platini', son: 'Platoni', pos: 'CAM', parentOvr: 94 },
  { parent: 'Di Stéfano', son: 'Di Stefini', pos: 'ST', parentOvr: 95 },
  { parent: 'Puskas', son: 'Puskis', pos: 'ST', parentOvr: 94 },
  { parent: 'Eusébio', son: 'Eusebiu', pos: 'ST', parentOvr: 93 },
  { parent: 'Garrincha', son: 'Garrinchi', pos: 'RW', parentOvr: 93 },
  { parent: 'Matthäus', son: 'Mattheus', pos: 'CDM', parentOvr: 92 },
  { parent: 'Rummenigge', son: 'Rummenigi', pos: 'ST', parentOvr: 91 },
  { parent: 'Bergkamp', son: 'Bergkump', pos: 'ST', parentOvr: 91 },
  { parent: 'Raúl', son: 'Raúlito', pos: 'ST', parentOvr: 90 },
  { parent: 'Rivaldo', son: 'Rivaldu', pos: 'LW', parentOvr: 91 },
  { parent: 'Nedved', son: 'Nedvid', pos: 'LW', parentOvr: 90 },
  { parent: 'Baggio', son: 'Bagio', pos: 'CAM', parentOvr: 92 },
  { parent: 'Riquelme', son: 'Riquelmi', pos: 'CAM', parentOvr: 90 },
  { parent: 'Laudrup', son: 'Laudrip', pos: 'CAM', parentOvr: 90 },
  { parent: 'Drogba', son: 'Drogbi', pos: 'ST', parentOvr: 89 },
  { parent: 'Scholes', son: 'Scholis', pos: 'CM', parentOvr: 89 },
  { parent: 'Gerrard', son: 'Gerrurd', pos: 'CM', parentOvr: 89 },
  { parent: 'Lampard', son: 'Lampord', pos: 'CM', parentOvr: 89 },
  { parent: 'Nesta', son: 'Nisti', pos: 'CB', parentOvr: 92 },
  { parent: 'Cannavaro', son: 'Cannavero', pos: 'CB', parentOvr: 91 },
  { parent: 'Terry', son: 'Tarry', pos: 'CB', parentOvr: 89 },
  { parent: 'Yashin', son: 'Yashun', pos: 'GK', parentOvr: 94 },
  { parent: 'Neuer', son: 'Nouer', pos: 'GK', parentOvr: 92 },
  { parent: 'Ramos', son: 'Ramas', pos: 'CB', parentOvr: 90 },
  { parent: 'Lahm', son: 'Lahmi', pos: 'RB', parentOvr: 90 },
  { parent: 'Seedorf', son: 'Seedurf', pos: 'CM', parentOvr: 89 },
  { parent: 'Vieira', son: 'Viera', pos: 'CDM', parentOvr: 90 },
  { parent: 'Romário', son: 'Romariu', pos: 'ST', parentOvr: 93 },
  { parent: 'Stoichkov', son: 'Stoichkuv', pos: 'LW', parentOvr: 91 },
  { parent: 'Batistuta', son: 'Batistuti', pos: 'ST', parentOvr: 91 },
];

// Track de leyendas ya usadas (para evitar duplicados en una partida)
let usedLegendIndices = new Set();

/**
 * Muta un nombre de jugador para crear el "hijo"
 * Reglas: cambiar vocales, endings, alternar letras
 */
export function mutatePlayerName(fullName) {
  const parts = fullName.split(' ');
  
  // Mutar el apellido (última parte) — es lo más reconocible
  const lastName = parts[parts.length - 1];
  const mutated = mutateWord(lastName);
  
  // Generar un nombre de pila random
  const firstNames = [
    'Pablo', 'Miguel', 'Carlos', 'Leo', 'Adrián', 'Hugo', 'Iker', 'Sergio',
    'Lucas', 'Marco', 'André', 'João', 'Pierre', 'Luca', 'Mohammed', 'Kevin',
    'Jack', 'James', 'Thomas', 'Jan', 'Lars', 'Sven', 'Ali', 'Omar'
  ];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  
  return `${firstName} ${mutated}`;
}

function mutateWord(word) {
  if (word.length <= 2) return word + 'i';
  
  const mutations = [
    // Cambiar última vocal
    (w) => {
      const vowels = 'aeiouáéíóú';
      const replacements = { a: 'i', e: 'a', i: 'u', o: 'e', u: 'o', á: 'í', é: 'á', í: 'ú', ó: 'é', ú: 'ó' };
      for (let i = w.length - 1; i >= 0; i--) {
        if (vowels.includes(w[i])) {
          return w.slice(0, i) + (replacements[w[i]] || 'i') + w.slice(i + 1);
        }
      }
      return w + 'i';
    },
    // Cambiar ending
    (w) => {
      const endings = [
        [/ez$/, 'iz'], [/es$/, 'os'], [/o$/, 'i'], [/a$/, 'o'],
        [/er$/, 'ar'], [/on$/, 'un'], [/ini$/, 'oni'], [/ard$/, 'urd'],
        [/en$/, 'an'], [/is$/, 'us'], [/an$/, 'en']
      ];
      for (const [pattern, replacement] of endings) {
        if (pattern.test(w)) return w.replace(pattern, replacement);
      }
      return w + 'i';
    },
    // Duplicar o quitar una consonante
    (w) => {
      const idx = Math.floor(w.length * 0.6);
      const c = w[idx];
      if (c && !'aeiouáéíóú '.includes(c)) {
        return Math.random() < 0.5 
          ? w.slice(0, idx) + c + w.slice(idx)  // duplicar
          : w.slice(0, idx) + w.slice(idx + 1); // quitar
      }
      return w + 'o';
    },
    // Swap dos letras adyacentes
    (w) => {
      const idx = 1 + Math.floor(Math.random() * (w.length - 2));
      return w.slice(0, idx) + w[idx + 1] + w[idx] + w.slice(idx + 2);
    }
  ];
  
  const mutation = mutations[Math.floor(Math.random() * mutations.length)];
  return mutation(word);
}

/**
 * Genera un "hijo" de un jugador retirado (para equipos IA)
 * Hereda posición, su potential se acerca al OVR del padre
 */
export function generateSonPlayer(retiredPlayer) {
  const name = mutatePlayerName(retiredPlayer.name);
  const position = retiredPlayer.position || 'CM';
  const age = 17 + Math.floor(Math.random() * 2); // 17-18
  const initialOvr = 50 + Math.floor(Math.random() * 10); // 50-59
  
  // Potential = OVR del padre ± varianza (-5 a +3)
  const parentOvr = retiredPlayer.overall || 70;
  const variance = Math.floor(Math.random() * 9) - 5; // -5 a +3
  const potential = Math.max(60, Math.min(99, parentOvr + variance));
  
  return {
    name,
    position,
    age,
    overall: initialOvr,
    potential,
    parentName: retiredPlayer.name,
    parentOvr,
    nationality: retiredPlayer.nationality || 'Desconocida',
    salary: Math.max(1500, Math.round(2000 * Math.pow(2, (initialOvr - 55) / 5) * 0.5)),
    value: Math.round(initialOvr * initialOvr * 10000),
    contractYears: 4,
    isYouthProduct: true,
    isSon: true
  };
}

/**
 * Genera canterano para el equipo del JUGADOR
 * Usa nombres de leyendas mutados + nivel de cantera
 */
export function generateYouthPlayer(youthLevel, specialization) {
  const minOvr = [50, 55, 58, 62][youthLevel];
  const maxOvr = [60, 65, 70, 75][youthLevel];
  
  // Posición según especialización (80% de la zona elegida, 20% aleatoria)
  let positions;
  let bonusOvr = 0;
  
  const spec = FACILITY_SPECIALIZATIONS.youth.options.find(o => o.id === specialization);
  const allPositions = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
  
  if (spec?.effect?.positions) {
    if (Math.random() < 0.80) {
      positions = spec.effect.positions;
    } else {
      positions = allPositions;
    }
    bonusOvr = spec.effect.bonusOvr || 0;
  } else {
    positions = allPositions;
  }
  
  const position = positions[Math.floor(Math.random() * positions.length)];
  const baseOvr = Math.min(99, Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr + bonusOvr);
  const age = 17 + Math.floor(Math.random() * 2);
  
  // Intentar buscar una leyenda que encaje con la posición (o cualquiera)
  let legend = null;
  
  // Filtrar leyendas de la misma zona posicional
  const positionZone = getPositionZone(position);
  const matchingLegends = LEGENDARY_SONS
    .map((l, idx) => ({ ...l, idx }))
    .filter(l => !usedLegendIndices.has(l.idx) && getPositionZone(l.pos) === positionZone);
  
  if (matchingLegends.length > 0) {
    legend = matchingLegends[Math.floor(Math.random() * matchingLegends.length)];
  } else {
    // Sin leyendas de esa zona, coger cualquiera no usada
    const anyLegends = LEGENDARY_SONS
      .map((l, idx) => ({ ...l, idx }))
      .filter(l => !usedLegendIndices.has(l.idx));
    if (anyLegends.length > 0) {
      legend = anyLegends[Math.floor(Math.random() * anyLegends.length)];
    } else {
      // Todas usadas — resetear y empezar de nuevo
      usedLegendIndices = new Set();
      legend = LEGENDARY_SONS[Math.floor(Math.random() * LEGENDARY_SONS.length)];
    }
  }
  
  if (legend) {
    usedLegendIndices.add(legend.idx);
    
    // Potential basado en el OVR de la leyenda + nivel de cantera
    const legendVariance = Math.floor(Math.random() * 9) - 5; // -5 a +3
    const potential = Math.max(65, Math.min(99, legend.parentOvr + legendVariance));
    
    return {
      name: legend.son,
      position: legend.pos, // Usar la posición natural de la leyenda
      age,
      overall: baseOvr,
      potential,
      parentName: legend.parent,
      parentOvr: legend.parentOvr,
      nationality: 'España',
      salary: Math.max(1500, Math.round(2000 * Math.pow(2, (baseOvr - 55) / 5) * 0.5)),
      value: Math.round(baseOvr * baseOvr * 10000),
      contractYears: 4,
      isYouthProduct: true,
      isSon: true,
      isLegendSon: true
    };
  }
  
  // Fallback: nombre genérico (no debería llegar aquí)
  const firstNames = ['Pablo', 'Miguel', 'Carlos', 'David', 'Hugo', 'Iker', 'Mario', 'Diego'];
  const lastNames = ['García', 'Martínez', 'López', 'Fernández', 'González', 'Rodríguez', 'Pérez'];
  return {
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    position,
    age,
    overall: baseOvr,
    potential: Math.min(99, baseOvr + Math.floor(Math.random() * 15) + 5),
    nationality: 'España',
    salary: Math.max(1500, Math.round(2000 * Math.pow(2, (baseOvr - 55) / 5) * 0.5)),
    value: Math.round(baseOvr * baseOvr * 10000),
    contractYears: 4,
    isYouthProduct: true
  };
}

function getPositionZone(pos) {
  if (pos === 'GK') return 'gk';
  if (['CB', 'RB', 'LB'].includes(pos)) return 'def';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return 'mid';
  return 'fwd'; // ST, RW, LW
}

// Nuevo sistema médico: cada médico se queda con un jugador hasta que se cure

// Slots de médicos por nivel (cada slot = 1 médico)
export function getMedicalSlots(medicalLevel) {
  const slotsPerLevel = [0, 1, 2, 2, 3, 3]; // Nivel 0: 0, Nivel 1: 1, Nivel 2-3: 2, Nivel 4-5: 3
  return slotsPerLevel[medicalLevel] || 0;
}

// Semanas que cura cada tratamiento según nivel
export function getMedicalHealingWeeks(medicalLevel) {
  const weeksPerLevel = [0, 1, 2, 3, 4, 5]; // Nivel 1: 1 sem, Nivel 5: 5 sem
  return weeksPerLevel[medicalLevel] || 0;
}

// Coste por tratamiento según nivel (más nivel = menos coste)
export function getMedicalTreatmentCost(medicalLevel, leagueId) {
  const costPerLevel = [500000, 500000, 400000, 300000, 200000, 100000]; // €500K a €100K
  return costPerLevel[medicalLevel] || 500000;
}

// Calcula tratamientos médicos disponibles (slots totales - slots ocupados)
export function getMedicalTreatmentsAvailable(medicalLevel, occupiedSlots = []) {
  const totalSlots = getMedicalSlots(medicalLevel);
  const usedSlots = Array.isArray(occupiedSlots) ? occupiedSlots.length : 0;
  return Math.max(0, totalSlots - usedSlots);
}

// Aplica tratamiento médico a un jugador (reduce semanas según nivel)
export function applyMedicalTreatment(player, medicalLevel) {
  if (!player.injured || !player.injuryWeeksLeft) return player;
  
  const healingWeeks = getMedicalHealingWeeks(medicalLevel);
  const newWeeks = Math.max(0, player.injuryWeeksLeft - healingWeeks);
  
  return {
    ...player,
    injuryWeeksLeft: newWeeks,
    injured: newWeeks > 0,
    treated: true, // Marca que está siendo tratado
    treatedBy: true // Tiene médico asignado
  };
}

// Calcula estadísticas de impacto de instalaciones (para feedback)
export function calculateFacilityStats(state) {
  const stats = {
    medical: {
      weeksSaved: state.facilityStats?.medical?.weeksSaved || 0,
      injuriesPrevented: state.facilityStats?.medical?.injuriesPrevented || 0
    },
    youth: {
      playersGenerated: state.facilityStats?.youth?.playersGenerated || 0,
      avgOverall: state.facilityStats?.youth?.avgOverall || 0,
      promoted: state.facilityStats?.youth?.promoted || 0
    },
    training: {
      totalProgress: state.facilityStats?.training?.totalProgress || 0,
      playersImproved: state.facilityStats?.training?.playersImproved || 0
    }
  };
  
  return stats;
}

// Aplicar efecto de decisión de evento
export function applyEventChoice(state, event, choiceId) {
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) return state;
  
  let newState = { ...state };
  let messages = [];
  
  // Verificar si hay coste - escalar por tier
  const scaledCost = choice.cost || 0;
  if (scaledCost && state.money < scaledCost) {
    return { 
      ...state, 
      messages: [{
        id: Date.now(),
        type: 'error',
        title: '❌ Fondos insuficientes',
        content: `No tienes €${(scaledCost/1000000).toFixed(1)}M para esta opción.`,
        date: `Semana ${state.currentWeek}`
      }, ...state.messages]
    };
  }
  
  switch (choice.effect) {
    case 'add_player':
      // Subir canterano al primer equipo
      newState.team = {
        ...newState.team,
        players: [...newState.team.players, {
          ...event.player,
          overall: event.player.overall + 2, // Bonus por promoción
          isPromoted: true
        }]
      };
      messages.push({
        id: Date.now(),
        type: 'success',
        title: '⬆️ Canterano promocionado',
        content: `${event.player.name} se une al primer equipo.`,
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    case 'boost_potential':
      // Boost de potencial para el siguiente año
      messages.push({
        id: Date.now(),
        type: 'info',
        title: '📈 Desarrollo en curso',
        content: `${event.player.name} seguirá desarrollándose en el filial.`,
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    case 'sell':
      newState.money += event.amount;
      messages.push({
        id: Date.now(),
        type: 'success',
        title: '💰 Venta completada',
        content: `${event.player.name} vendido por €${(event.amount/1000000).toFixed(1)}M.`,
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    case 'rest_prevent_injury':
      // Marcar jugador para descanso
      newState.team = {
        ...newState.team,
        players: newState.team.players.map(p => 
          p.name === event.player.name 
            ? { ...p, resting: true, restWeeks: 1 }
            : p
        )
      };
      messages.push({
        id: Date.now(),
        type: 'info',
        title: '🛌 Jugador descansando',
        content: `${event.player.name} descansará esta semana.`,
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    case 'risk_injury':
      // 40% de lesión
      if (Math.random() < 0.4) {
        const weeks = 1 + Math.floor(Math.random() * 3);
        newState.team = {
          ...newState.team,
          players: newState.team.players.map(p => 
            p.name === event.player.name 
              ? { ...p, injured: true, injuryWeeksLeft: weeks, injuryType: 'forced' }
              : p
          )
        };
        messages.push({
          id: Date.now(),
          type: 'danger',
          title: '🏥 Lesión',
          content: `${event.player.name} se ha lesionado por ${weeks} semanas.`,
          date: `Semana ${state.currentWeek}`
        });
      }
      break;
      
    case 'big_boost_one':
      newState.team = {
        ...newState.team,
        players: newState.team.players.map(p => 
          p.name === event.player.name 
            ? { ...p, overall: Math.min(99, p.overall + 1), trainingProgress: (p.trainingProgress || 0) + 0.5 }
            : p
        )
      };
      messages.push({
        id: Date.now(),
        type: 'success',
        title: '📈 Mejora notable',
        content: `${event.player.name} ha mejorado significativamente (+1 OVR).`,
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    case 'small_boost_all':
      newState.team = {
        ...newState.team,
        players: newState.team.players.map(p => ({
          ...p,
          trainingProgress: (p.trainingProgress || 0) + 0.1
        }))
      };
      messages.push({
        id: Date.now(),
        type: 'success',
        title: '👥 Mejora grupal',
        content: 'Todo el equipo se ha beneficiado del entrenamiento.',
        date: `Semana ${state.currentWeek}`
      });
      break;
      
    default:
      break;
  }
  
  // Aplicar coste si existe
  if (scaledCost) {
    newState.money -= scaledCost;
  }
  
  return {
    ...newState,
    messages: [...messages, ...newState.messages].slice(0, 50),
    pendingEvent: null
  };
}
