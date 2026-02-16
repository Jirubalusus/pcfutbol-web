// ============================================================
// MANAGER EVALUATION - Sistema de evaluación y despido del míster
// ============================================================

/**
 * Posición esperada según reputación del equipo en la liga
 * Equipos top → se espera top 4
 * Equipos medios → mitad de tabla
 * Equipos modestos → evitar descenso
 */
function getExpectedPosition(teamReputation, totalTeams = 20) {
  if (teamReputation >= 90) return 1;   // Elite → campeón
  if (teamReputation >= 85) return 3;   // Top → top 3
  if (teamReputation >= 80) return 5;   // Fuerte → top 5
  if (teamReputation >= 75) return 8;   // Bueno → top 8
  if (teamReputation >= 70) return 12;  // Medio-alto → mitad alta
  if (teamReputation >= 65) return 15;  // Medio → mitad baja
  if (teamReputation >= 60) return 17;  // Modesto → evitar descenso
  return totalTeams - 1;                // Débil → sobrevivir
}

/**
 * Evaluar el rendimiento del míster y decidir si hay riesgo de despido
 * Se llama cada semana desde ADVANCE_WEEK
 * 
 * Returns: { 
 *   confidence: 0-100 (confianza de la directiva),
 *   warning: null | 'low' | 'critical',
 *   fired: boolean,
 *   reason: string | null
 * }
 */
export function evaluateManager(state) {
  const {
    team,
    leagueTable,
    teamId,
    currentWeek,
    preseasonPhase,
    managerConfidence = 75,
    money = 0
  } = state;
  
  // No evaluar durante pretemporada o primeras 5 jornadas
  if (preseasonPhase || currentWeek <= 5) {
    return { confidence: managerConfidence, warning: null, fired: false, reason: null };
  }
  
  const totalTeams = leagueTable?.length || 20;
  const teamEntry = leagueTable?.find(t => t.teamId === teamId);
  const currentPosition = leagueTable?.findIndex(t => t.teamId === teamId) + 1 || totalTeams;
  const expectedPosition = getExpectedPosition(team?.reputation || 70, totalTeams);
  
  // ============================================================
  // FACTORES DE CONFIANZA
  // ============================================================
  
  let confidenceChange = 0;
  let reasons = [];
  
  // --- 1. Posición vs esperada ---
  const positionDiff = currentPosition - expectedPosition;
  if (positionDiff > 10) {
    confidenceChange -= 8;  // Muy por debajo: -8/semana
    reasons.push({ key: 'gameMessages.reasonPosition', params: { position: currentPosition, expected: expectedPosition } });
  } else if (positionDiff > 6) {
    confidenceChange -= 5;
    reasons.push({ key: 'gameMessages.reasonUnderperformance' });
  } else if (positionDiff > 3) {
    confidenceChange -= 2;
  } else if (positionDiff <= 0) {
    confidenceChange += 2;  // Mejor de lo esperado
  }
  
  // --- 2. Racha de derrotas ---
  const form = teamEntry?.form || [];
  const recentForm = form.slice(-5); // Últimos 5 partidos
  const consecutiveLosses = countConsecutiveLosses(recentForm);
  
  if (consecutiveLosses >= 5) {
    confidenceChange -= 15;
    reasons.push({ key: 'gameMessages.reasonConsecutiveLosses', params: { count: consecutiveLosses } });
  } else if (consecutiveLosses >= 4) {
    confidenceChange -= 10;
    reasons.push({ key: 'gameMessages.reasonLossStreak', params: { count: consecutiveLosses } });
  } else if (consecutiveLosses >= 3) {
    confidenceChange -= 5;
    reasons.push({ key: 'gameMessages.reasonBadForm' });
  }
  
  // --- 3. Plantilla demasiado corta ---
  const availablePlayers = team?.players?.filter(p => !p.injured)?.length || 0;
  const totalPlayers = team?.players?.length || 0;
  
  if (totalPlayers < 14) {
    confidenceChange -= 12;
    reasons.push({ key: 'gameMessages.reasonSmallSquad', params: { count: totalPlayers } });
  } else if (totalPlayers < 17) {
    confidenceChange -= 5;
    reasons.push({ key: 'gameMessages.reasonVerySmallSquad', params: { count: totalPlayers } });
  }
  
  if (availablePlayers < 11) {
    confidenceChange -= 15;
    reasons.push({ key: 'gameMessages.reasonNotEnoughPlayers' });
  }
  
  // --- 4. Zona de descenso ---
  const relegationZone = totalTeams - 2; // Últimos 3
  if (currentPosition >= relegationZone && currentWeek >= 15) {
    confidenceChange -= 8;
    reasons.push({ key: 'gameMessages.reasonRelegation' });
  }
  
  // --- 5. Victoria reciente da un respiro ---
  if (recentForm.length > 0 && recentForm[recentForm.length - 1] === 'W') {
    confidenceChange += 3;
  }
  
  // --- 6. Presupuesto negativo (bancarrota) → despido inmediato ---
  if (money < 0) {
    return {
      confidence: 0,
      warning: 'critical',
      fired: true,
      reasonKey: 'gameMessages.firedBankruptcy',
      details: [`Presupuesto: €${Math.round(money / 1000)}K`]
    };
  }
  
  // ============================================================
  // CALCULAR NUEVA CONFIANZA
  // ============================================================
  
  const newConfidence = Math.max(0, Math.min(100, managerConfidence + confidenceChange));
  
  // ============================================================
  // DETERMINAR ESTADO
  // ============================================================
  
  let warning = null;
  let fired = false;
  let reasonKey = null;
  let reasonParams = {};
  
  if (newConfidence <= 10) {
    // DESPIDO
    fired = true;
    reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardLostConfidence';
    reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};
  } else if (newConfidence <= 25) {
    warning = 'critical';
    reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardVeryUnhappy';
      reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};
  } else if (newConfidence <= 40) {
    warning = 'low';
    reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardImpatient';
      reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};
  }
  
  return {
    confidence: newConfidence,
    warning,
    fired,
    reasonKey,
    reasonParams,
    details: reasons
  };
}

/**
 * Contar derrotas consecutivas desde el final
 */
function countConsecutiveLosses(form) {
  let count = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] === 'L') count++;
    else break;
  }
  return count;
}

/**
 * Generar mensaje de advertencia para el buzón
 */
export function generateWarningMessage(evaluation, currentWeek) {
  if (!evaluation.warning && !evaluation.fired) return null;
  
  if (evaluation.fired) {
    return {
      id: Date.now() + Math.random(),
      type: 'firing',
      title: '🔴 DESTITUIDO',
      content: evaluation.reason,
      date: `Semana ${currentWeek}`,
      urgent: true
    };
  }
  
  if (evaluation.warning === 'critical') {
    return {
      id: Date.now() + Math.random(),
      type: 'warning',
      title: '⚠️ Ultimátum de la directiva',
      content: evaluation.reason,
      date: `Semana ${currentWeek}`,
      urgent: true
    };
  }
  
  if (evaluation.warning === 'low') {
    return {
      id: Date.now() + Math.random(),
      type: 'warning',
      title: '📋 Comunicado de la directiva',
      content: evaluation.reason,
      date: `Semana ${currentWeek}`
    };
  }
  
  return null;
}
