// ============================================================
// SISTEMA DE INSTALACIONES CON ESPECIALIZACIONES Y EVENTOS
// ============================================================

// Especializaciones disponibles por instalación
export const FACILITY_SPECIALIZATIONS = {
  youth: {
    name: 'Cantera',
    options: [
      { 
        id: 'offensive', 
        name: 'Ofensiva', 
        icon: '⚔️',
        description: 'Genera más delanteros y extremos',
        effect: { positions: ['ST', 'RW', 'LW', 'CAM'], bonusOvr: 2 }
      },
      { 
        id: 'defensive', 
        name: 'Defensiva', 
        icon: '🛡️',
        description: 'Genera más defensas y porteros',
        effect: { positions: ['GK', 'CB', 'RB', 'LB', 'CDM'], bonusOvr: 2 }
      },
      { 
        id: 'technical', 
        name: 'Técnica', 
        icon: '🎯',
        description: 'Jugadores con mejor pase y regate',
        effect: { attributes: ['passing', 'dribbling'], bonusOvr: 1 }
      },
      { 
        id: 'physical', 
        name: 'Física', 
        icon: '💪',
        description: 'Jugadores más rápidos y fuertes',
        effect: { attributes: ['pace', 'physical'], bonusOvr: 1 }
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
  training: {
    name: 'Entrenamiento',
    options: [
      { 
        id: 'intensive', 
        name: 'Intensivo', 
        icon: '🔥',
        description: '+50% progresión, +50% riesgo lesión',
        effect: { progressBonus: 0.50, injuryRisk: 0.50 }
      },
      { 
        id: 'balanced', 
        name: 'Equilibrado', 
        icon: '⚖️',
        description: 'Progresión y riesgo normales',
        effect: { progressBonus: 0, injuryRisk: 0 }
      },
      { 
        id: 'conservative', 
        name: 'Conservador', 
        icon: '🧘',
        description: '-25% progresión, -50% riesgo lesión',
        effect: { progressBonus: -0.25, injuryRisk: -0.50 }
      }
    ]
  }
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
  
  // Eventos de entrenamiento
  training_breakthrough: {
    type: 'training',
    title: '💡 Progreso excepcional',
    getMessage: (player) => `${player.name} ha tenido un avance notable en los entrenamientos.`,
    choices: [
      { id: 'focus', text: '🎯 Entrenamiento personal', effect: 'big_boost_one' },
      { id: 'share', text: '👥 Compartir con el grupo', effect: 'small_boost_all' },
      { id: 'normal', text: '📋 Seguir plan normal', effect: 'none' }
    ]
  },
  training_conflict: {
    type: 'training',
    title: '😤 Conflicto en el vestuario',
    getMessage: (player1, player2) => `${player1.name} y ${player2?.name || 'otro jugador'} han tenido un enfrentamiento en el entrenamiento.`,
    getChoices: (player1, player2) => [
      { id: 'side_p1', text: `Apoyar a ${player1?.name?.split(' ')[0] || 'Jugador 1'}`, effect: 'boost_p1_hurt_p2' },
      { id: 'side_p2', text: `Apoyar a ${player2?.name?.split(' ')[0] || 'Jugador 2'}`, effect: 'boost_p2_hurt_p1' },
      { id: 'mediate', text: '🤝 Mediar entre ambos', effect: 'small_morale_all' }
    ]
  }
};

// Genera un evento aleatorio basado en las instalaciones
export function generateFacilityEvent(facilities, players, week) {
  const events = [];
  const roll = Math.random();
  
  // 15% de probabilidad de evento por semana
  if (roll > 0.15) return null;
  
  const youthLevel = facilities?.youth || 0;
  const medicalLevel = facilities?.medical || 0;
  const trainingLevel = facilities?.training || 0;
  
  // Más nivel = más probabilidad de eventos positivos
  const eventTypes = [];
  
  if (youthLevel > 0) {
    eventTypes.push('youth_standout', 'youth_offer');
  }
  if (medicalLevel > 0) {
    eventTypes.push('medical_discovery', 'player_discomfort');
  }
  if (trainingLevel > 0) {
    eventTypes.push('training_breakthrough', 'training_conflict');
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

// Genera canterano con especialización
export function generateYouthPlayer(youthLevel, specialization) {
  const minOvr = [55, 60, 65, 70][youthLevel];
  const maxOvr = [65, 72, 78, 85][youthLevel];
  
  // Posiciones según especialización
  let positions;
  let bonusOvr = 0;
  
  const spec = FACILITY_SPECIALIZATIONS.youth.options.find(o => o.id === specialization);
  
  const allPositions = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
  
  if (spec?.effect?.positions) {
    // Calcular probabilidad ajustada para lograr ~70% efectivo
    // P_efectiva = P_directa + (1 - P_directa) * (specPositions / allPositions)
    // 0.70 = X + (1-X) * (spec.effect.positions.length / 10)
    const specCount = spec.effect.positions.length;
    const targetRate = 0.70;
    const adjustedRate = (targetRate - specCount/10) / (1 - specCount/10);
    
    if (Math.random() < adjustedRate) {
      positions = spec.effect.positions;
    } else {
      positions = allPositions;
    }
    bonusOvr = spec.effect.bonusOvr || 0;
  } else {
    positions = allPositions;
  }
  
  const position = positions[Math.floor(Math.random() * positions.length)];
  const overall = Math.min(99, Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr + bonusOvr);
  const age = 17 + Math.floor(Math.random() * 3);
  
  const firstNames = ['Pablo', 'Miguel', 'Carlos', 'David', 'Alejandro', 'Daniel', 'Javier', 'Sergio', 'Adrián', 'Hugo', 'Álvaro', 'Iker', 'Mario', 'Diego', 'Rubén'];
  const lastNames = ['García', 'Martínez', 'López', 'Sánchez', 'Fernández', 'González', 'Rodríguez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Jiménez', 'Navarro'];
  
  return {
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    position,
    age,
    overall,
    potential: Math.min(99, overall + Math.floor(Math.random() * 15) + 5),
    nationality: 'España',
    salary: Math.round(overall * 5000),
    value: Math.round(overall * overall * 10000),
    isYouthProduct: true
  };
}

// Calcula tratamientos médicos disponibles según nivel
export function getMedicalTreatmentsAvailable(medicalLevel, usedThisWeek = 0) {
  const treatmentsPerLevel = [0, 0, 1, 2]; // Nivel 0-1: 0, Nivel 2: 1, Nivel 3: 2
  const maxTreatments = treatmentsPerLevel[medicalLevel] || 0;
  return Math.max(0, maxTreatments - usedThisWeek);
}

// Aplica tratamiento médico a un jugador (reduce lesión a la mitad)
export function applyMedicalTreatment(player) {
  if (!player.injured || !player.injuryWeeksLeft) return player;
  
  const newWeeks = Math.max(1, Math.ceil(player.injuryWeeksLeft / 2));
  return {
    ...player,
    injuryWeeksLeft: newWeeks,
    treated: true // Marca que ya fue tratado esta lesión
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
  
  // Verificar si hay coste
  if (choice.cost && state.money < choice.cost) {
    return { 
      ...state, 
      messages: [{
        id: Date.now(),
        type: 'error',
        title: '❌ Fondos insuficientes',
        content: `No tienes €${(choice.cost/1000000).toFixed(1)}M para esta opción.`,
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
  if (choice.cost) {
    newState.money -= choice.cost;
  }
  
  return {
    ...newState,
    messages: [...messages, ...newState.messages].slice(0, 50),
    pendingEvent: null
  };
}
