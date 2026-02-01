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
    reasons.push(`Posición ${currentPosition}º (se esperaba top ${expectedPosition})`);
  } else if (positionDiff > 6) {
    confidenceChange -= 5;
    reasons.push(`Rendimiento por debajo de expectativas`);
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
    reasons.push(`${consecutiveLosses} derrotas consecutivas`);
  } else if (consecutiveLosses >= 4) {
    confidenceChange -= 10;
    reasons.push(`${consecutiveLosses} derrotas seguidas`);
  } else if (consecutiveLosses >= 3) {
    confidenceChange -= 5;
    reasons.push(`Mala racha de resultados`);
  }
  
  // --- 3. Plantilla demasiado corta ---
  const availablePlayers = team?.players?.filter(p => !p.injured)?.length || 0;
  const totalPlayers = team?.players?.length || 0;
  
  if (totalPlayers < 14) {
    confidenceChange -= 12;
    reasons.push(`Plantilla insuficiente (${totalPlayers} jugadores)`);
  } else if (totalPlayers < 17) {
    confidenceChange -= 5;
    reasons.push(`Plantilla muy corta (${totalPlayers} jugadores)`);
  }
  
  if (availablePlayers < 11) {
    confidenceChange -= 15;
    reasons.push(`Menos de 11 jugadores disponibles`);
  }
  
  // --- 4. Zona de descenso ---
  const relegationZone = totalTeams - 2; // Últimos 3
  if (currentPosition >= relegationZone && currentWeek >= 15) {
    confidenceChange -= 8;
    reasons.push(`En zona de descenso`);
  }
  
  // --- 5. Victoria reciente da un respiro ---
  if (recentForm.length > 0 && recentForm[recentForm.length - 1] === 'W') {
    confidenceChange += 3;
  }
  
  // --- 6. Presupuesto negativo (bancarrota) ---
  if (money < -20_000_000) {
    // Bancarrota grave → despido inmediato
    return {
      confidence: 0,
      warning: 'critical',
      fired: true,
      reason: 'La directiva te ha destituido por llevar al club a la bancarrota.',
      details: [`Presupuesto: €${Math.round(money / 1000)}K`]
    };
  } else if (money < -10_000_000) {
    confidenceChange -= 20;
    reasons.push(`Presupuesto en números rojos (€${Math.round(money / 1_000_000)}M)`);
  } else if (money < -5_000_000) {
    confidenceChange -= 12;
    reasons.push(`Situación financiera crítica`);
  } else if (money < 0) {
    confidenceChange -= 5;
    reasons.push(`Presupuesto negativo`);
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
  let reason = null;
  
  if (newConfidence <= 10) {
    // DESPIDO
    fired = true;
    reason = reasons.length > 0 
      ? `La directiva ha perdido la confianza. ${reasons[0]}.`
      : 'Resultados deportivos insuficientes.';
  } else if (newConfidence <= 25) {
    warning = 'critical';
    reason = `⚠️ La directiva está muy descontenta. ${reasons[0] || 'Mejora los resultados urgentemente.'}`;
  } else if (newConfidence <= 40) {
    warning = 'low';
    reason = `La directiva empieza a impacientarse. ${reasons[0] || 'Se esperan mejores resultados.'}`;
  }
  
  return {
    confidence: newConfidence,
    warning,
    fired,
    reason,
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
