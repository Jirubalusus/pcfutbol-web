// ============================================================
// FORM SYSTEM v2 — "Ganas de Jugar"
// ============================================================
// Basado en descanso/fatiga, NO en rendimiento.
// Jugar mucho → se quema. Descansar → tiene hambre.
// Estilo PES6 pero con lógica detrás.

export const FORM_STATES = {
  excellent: { label: 'Excelente', arrow: '▲', color: '#00a8ff', matchBonus: 0.12 },
  good:      { label: 'Buena',     arrow: '▲', color: '#7ed321', matchBonus: 0.05 },
  normal:    { label: 'Normal',    arrow: '►', color: '#999999', matchBonus: 0 },
  low:       { label: 'Baja',      arrow: '▼', color: '#ff9500', matchBonus: -0.08 },
  terrible:  { label: 'Pésima',    arrow: '▼', color: '#ff3b30', matchBonus: -0.18 }
};

const FORM_ORDER = ['terrible', 'low', 'normal', 'good', 'excellent'];

/**
 * Consistencia del jugador (1-5).
 * Alta consistencia = la forma se pega más a la tendencia base.
 * Baja consistencia = más variación random, puede sorprender.
 */
export function getPlayerConsistency(player, isCaptain = false) {
  let consistency = 3;
  
  if (player.age >= 30) consistency += 1;
  else if (player.age >= 27) consistency += 0.5;
  else if (player.age <= 21) consistency -= 1;
  else if (player.age <= 23) consistency -= 0.5;
  
  if (player.overall >= 82) consistency += 0.5;
  if (isCaptain) consistency += 1;
  
  const personality = player.personality?.type;
  if (personality === 'professional' || personality === 'leader') consistency += 1;
  if (personality === 'emotional' || personality === 'moody') consistency -= 1;
  
  return Math.max(1, Math.min(5, Math.round(consistency)));
}

/**
 * Calcula la TENDENCIA BASE de forma según ciclo juego/descanso.
 * 
 * @param {number} consecutivePlayed - Partidos seguidos jugados
 * @param {number} weeksSincePlay - Semanas sin jugar
 * @returns {number} Índice base en FORM_ORDER (0=terrible, 4=excellent)
 */
function getBaseTendency(consecutivePlayed, weeksSincePlay) {
  // Caso: jugador está jugando partidos
  if (weeksSincePlay === 0 || consecutivePlayed > 0) {
    if (consecutivePlayed <= 3) return 3;    // 1-3 partidos: buena (fresco, con ritmo)
    if (consecutivePlayed <= 5) return 2.5;  // 4-5: normal-buena
    if (consecutivePlayed <= 7) return 2;    // 6-7: normal
    if (consecutivePlayed <= 9) return 1;    // 8-9: baja (cansancio mental)
    return 0.5;                               // 10+: terrible (quemado)
  }
  
  // Caso: jugador está descansando
  if (weeksSincePlay <= 2) return 3.5;   // 1-2 sem: buena-excelente (hambriento)
  if (weeksSincePlay <= 4) return 4;     // 3-4 sem: excelente (muy fresco, con ganas)
  if (weeksSincePlay <= 6) return 3;     // 5-6 sem: buena (empieza a perder ritmo)
  if (weeksSincePlay <= 8) return 2;     // 7-8 sem: normal 
  return 1;                               // 9+ sem: baja (desconectado)
}

/**
 * Genera la forma semanal para toda la plantilla.
 * 
 * @param {object} currentForm - { [playerName]: formState }
 * @param {array} players - Lista de jugadores
 * @param {object} matchTracker - { [playerName]: { consecutivePlayed, weeksSincePlay } }
 * @param {object} context - { rejectedTransfers, captainName, newSignings[] }
 * @returns {object} { [playerName]: formState }
 */
export function updateWeeklyForm(currentForm, players, matchTracker, context) {
  const newForm = {};
  const {
    rejectedTransfers = {},
    captainName = null,
  } = context;
  
  // Captain's form gives stability
  const captainForm = currentForm[captainName] || 'normal';
  const captainIdx = FORM_ORDER.indexOf(captainForm);
  const captainStabilizes = captainIdx >= 3; // Captain in good/excellent form stabilizes
  
  players.forEach(player => {
    const name = player.name;
    const tracker = matchTracker[name] || { consecutivePlayed: 0, weeksSincePlay: 0 };
    const consistency = getPlayerConsistency(player, name === captainName);
    
    // === FORCED STATES ===
    
    // Rejected transfer: DECAYING penalty
    const rejection = rejectedTransfers[name];
    if (rejection && rejection.weeksLeft > 0) {
      // Gradual decay: first third → terrible, middle third → low, last third → normal release
      const totalWeeks = rejection.totalWeeks || rejection.weeksLeft;
      const elapsed = totalWeeks - rejection.weeksLeft;
      const phase = elapsed / totalWeeks;
      
      if (phase < 0.35) {
        newForm[name] = 'terrible';
      } else if (phase < 0.70) {
        newForm[name] = 'low';
      } else {
        newForm[name] = 'normal'; // Recovering
      }
      return;
    }
    
    // New signing (first 3 weeks): always good or excellent (eager to impress)
    if (player.isNewSigning && (player.newSigningWeeks || 0) > 0) {
      newForm[name] = Math.random() > 0.4 ? 'excellent' : 'good';
      return;
    }
    
    // === CALCULATE FORM FROM PLAY/REST CYCLE (con inercia) ===
    
    const baseTendency = getBaseTendency(tracker.consecutivePlayed, tracker.weeksSincePlay);
    
    // INERCIA: mezclar tendencia nueva con forma anterior
    // 60% tendencia nueva + 40% forma anterior = cambios graduales
    // Un jugador quemado (idx 0) que descansa 1 semana (tendencia 3.5):
    //   Semana 1: 0*0.4 + 3.5*0.6 = 2.1 → normal (no salta a buena de golpe)
    //   Semana 2: 2.1*0.4 + 3.5*0.6 = 2.94 → buena (se va recuperando)
    //   Semana 3: 2.94*0.4 + 4.0*0.6 = 3.58 → excelente (ya recuperado)
    const previousIdx = FORM_ORDER.indexOf(currentForm[name] || 'normal');
    const blendedTendency = (previousIdx * 0.40) + (baseTendency * 0.60);
    
    // Random variation based on consistency
    // High consistency (5): deviation of ±0.5 from blended
    // Low consistency (1): deviation of ±2.0 from blended
    const maxDeviation = 2.5 - (consistency * 0.4); // 2.1 (cons=1) to 0.5 (cons=5)
    const randomShift = (Math.random() - 0.5) * 2 * maxDeviation;
    
    let finalIdx = Math.round(blendedTendency + randomShift);
    
    // Captain stabilization: reduce negative outcomes for team
    if (captainStabilizes && finalIdx < 2 && name !== captainName) {
      if (Math.random() < 0.20) finalIdx += 1; // 20% chance captain pulls teammate up
    }
    
    // Clamp to valid range
    finalIdx = Math.max(0, Math.min(4, finalIdx));
    newForm[name] = FORM_ORDER[finalIdx];
  });
  
  return newForm;
}

/**
 * Actualiza el matchTracker después de un partido.
 * @param {object} tracker - { [playerName]: { consecutivePlayed, weeksSincePlay } }
 * @param {array} allPlayers - Todos los jugadores de la plantilla
 * @param {array} playedNames - Nombres de jugadores que jugaron (convocados/lineup)
 * @returns {object} Tracker actualizado
 */
export function updateMatchTracker(tracker, allPlayers, playedNames) {
  const updated = {};
  const playedSet = new Set(playedNames || []);
  
  allPlayers.forEach(player => {
    const name = player.name;
    const prev = tracker[name] || { consecutivePlayed: 0, weeksSincePlay: 4 }; // Default: 4 weeks rest
    
    if (playedSet.has(name)) {
      updated[name] = {
        consecutivePlayed: prev.consecutivePlayed + 1,
        weeksSincePlay: 0
      };
    } else {
      updated[name] = {
        consecutivePlayed: 0,
        weeksSincePlay: prev.weeksSincePlay + 1
      };
    }
  });
  
  return updated;
}

/**
 * Decrementa penalizaciones de traspaso rechazado.
 */
export function tickRejectedTransfers(rejectedTransfers) {
  const updated = {};
  Object.entries(rejectedTransfers || {}).forEach(([name, data]) => {
    if (data.weeksLeft > 1) {
      updated[name] = { ...data, weeksLeft: data.weeksLeft - 1 };
    }
  });
  return updated;
}

/**
 * Genera forma ALEATORIA para equipos de IA en el momento del partido.
 * Distribución: 12% excellent, 25% good, 35% normal, 18% low, 10% terrible
 */
export function generateAIForm(players) {
  const form = {};
  (players || []).forEach(p => {
    const roll = Math.random();
    if (roll < 0.10) form[p.name] = 'terrible';
    else if (roll < 0.28) form[p.name] = 'low';
    else if (roll < 0.63) form[p.name] = 'normal';
    else if (roll < 0.88) form[p.name] = 'good';
    else form[p.name] = 'excellent';
  });
  return form;
}

/**
 * Genera forma inicial para una plantilla nueva (inicio de temporada o nueva partida).
 * Ponderada por consistencia.
 */
export function generateInitialForm(players, captainName = null) {
  const form = {};
  players.forEach(player => {
    const consistency = getPlayerConsistency(player, player.name === captainName);
    // Higher consistency → more likely to be normal/good
    // Lower consistency → more spread out
    const roll = Math.random();
    
    if (consistency >= 4) {
      // Very consistent: mostly normal/good
      if (roll < 0.05) form[player.name] = 'terrible';
      else if (roll < 0.12) form[player.name] = 'low';
      else if (roll < 0.45) form[player.name] = 'normal';
      else if (roll < 0.80) form[player.name] = 'good';
      else form[player.name] = 'excellent';
    } else if (consistency >= 3) {
      // Normal: standard distribution
      if (roll < 0.08) form[player.name] = 'terrible';
      else if (roll < 0.22) form[player.name] = 'low';
      else if (roll < 0.55) form[player.name] = 'normal';
      else if (roll < 0.82) form[player.name] = 'good';
      else form[player.name] = 'excellent';
    } else {
      // Inconsistent: wide spread
      if (roll < 0.15) form[player.name] = 'terrible';
      else if (roll < 0.30) form[player.name] = 'low';
      else if (roll < 0.55) form[player.name] = 'normal';
      else if (roll < 0.78) form[player.name] = 'good';
      else form[player.name] = 'excellent';
    }
  });
  return form;
}

/**
 * Obtiene el modificador de partido para un estado de forma.
 */
export function getFormMatchModifier(formState) {
  return 1 + (FORM_STATES[formState]?.matchBonus || 0);
}