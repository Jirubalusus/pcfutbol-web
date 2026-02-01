// ============================================================
// LOAN SYSTEM - Sistema de Cesiones
// ============================================================
// Motor de cesiones: préstamos temporales de jugadores entre equipos.
// Integrado con el sistema de transfers global.

import { calculateMarketValue, TEAM_PROFILES } from './globalTransferEngine';

// Constantes
const MAX_INCOMING_LOANS_PER_SEASON = 3;
const LOAN_DURATION_WEEKS = 38; // Temporada completa
const PURCHASE_OPTION_MULTIPLIER_MIN = 0.8;
const PURCHASE_OPTION_MULTIPLIER_MAX = 1.3;

// ============================================================
// CÁLCULOS DE CESIÓN
// ============================================================

/**
 * Calcular la fee de cesión (pago único al ceder)
 * Típicamente 10-30% del valor de mercado
 */
export function calculateLoanFee(player, leagueId) {
  const marketValue = calculateMarketValue(player, leagueId);
  
  // Base: 15% del valor de mercado
  let feePercent = 0.15;
  
  // Jugadores jóvenes con potencial → fee más alta (los equipos no quieren regalarlos)
  if (player.age <= 21) feePercent += 0.05;
  else if (player.age <= 23) feePercent += 0.03;
  
  // Jugadores top → fee más alta
  if (player.overall >= 82) feePercent += 0.05;
  else if (player.overall >= 78) feePercent += 0.03;
  
  // Contrato largo → el equipo tiene más poder, fee más alta
  const contractYears = player.contractYears || 2;
  if (contractYears >= 4) feePercent += 0.05;
  else if (contractYears <= 1) feePercent -= 0.05;
  
  // Clamp entre 10% y 30%
  feePercent = Math.max(0.10, Math.min(0.30, feePercent));
  
  const fee = Math.round(marketValue * feePercent);
  return Math.max(100_000, fee); // Mínimo 100K
}

/**
 * Calcular el porcentaje de salario que paga el equipo receptor
 * Retorna un valor 0-1 (0 = paga todo el propietario, 1 = paga todo el receptor)
 */
export function calculateLoanSalaryShare(player, borrowingTeamProfile) {
  // Equipos pequeños recibiendo jugadores de equipos grandes:
  // típicamente pagan 40-60% del salario
  let share = 0.50; // Base: 50/50
  
  const profileName = borrowingTeamProfile?.name || 'Low Table';
  
  // Equipos pequeños pagan menos porcentaje (el equipo grande asume más)
  if (profileName === 'Low Table' || profileName === 'lowTable') {
    share = 0.40;
  } else if (profileName === 'Mid Table' || profileName === 'midTable') {
    share = 0.50;
  } else if (profileName === 'Top Tier' || profileName === 'topTier') {
    share = 0.60;
  } else if (profileName === 'Elite' || profileName === 'elite') {
    share = 0.70; // Equipos elite pagan casi todo cuando reciben
  }
  
  // Jugadores con salario muy alto → el receptor paga menos proporcionalmente
  const weeklySalary = player.salary || 50000;
  if (weeklySalary > 200000) share = Math.max(0.30, share - 0.15);
  else if (weeklySalary > 100000) share = Math.max(0.35, share - 0.10);
  
  return Math.round(share * 100) / 100; // Redondear a 2 decimales
}

/**
 * Generar candidatos disponibles para cesión desde otros equipos
 * Retorna jugadores que podrían ser cedidos al equipo solicitante
 */
export function generateLoanCandidates(allTeams, requestingTeam, playerTeamId) {
  const candidates = [];
  
  if (!allTeams || !requestingTeam) return candidates;
  
  const requestingProfile = getTeamProfileByName(requestingTeam.name);
  const requestingOvrAvg = avgOverall(requestingTeam.players || []);
  
  const teamsArray = allTeams instanceof Map 
    ? Array.from(allTeams.values()) 
    : Array.isArray(allTeams) ? allTeams : [];
  
  for (const team of teamsArray) {
    // No incluir jugadores del propio equipo del jugador ni del equipo solicitante
    if (team.id === requestingTeam.id || team.id === playerTeamId) continue;
    
    const teamProfile = getTeamProfileByName(team.name);
    const teamPlayers = team.players || [];
    const teamOvrAvg = avgOverall(teamPlayers);
    
    for (const player of teamPlayers) {
      // Filtrar jugadores no disponibles
      if (player.injured || player.suspended || player.onLoan) continue;
      
      // Criterios para estar disponible en cesión:
      let isCandidate = false;
      let reason = '';
      
      // 1. Jóvenes de equipos grandes (overall 65-75, edad ≤23)
      if (player.age <= 23 && player.overall >= 65 && player.overall <= 75 
          && (teamProfile.name === 'Elite' || teamProfile.name === 'Top Tier')) {
        isCandidate = true;
        reason = 'Joven buscando minutos';
      }
      
      // 2. Suplentes con contrato largo que no juegan mucho
      if (!isCandidate && player.overall < teamOvrAvg - 3 
          && (player.contractYears || 2) >= 2) {
        isCandidate = true;
        reason = 'Suplente con contrato';
      }
      
      // 3. Jugadores que están por debajo del nivel del equipo
      if (!isCandidate && player.overall < teamOvrAvg - 5) {
        isCandidate = true;
        reason = 'Fuera de los planes';
      }
      
      // 4. Veteranos que el equipo quiere dar minutos fuera
      if (!isCandidate && player.age >= 30 && player.overall >= 70 
          && player.overall < teamOvrAvg) {
        isCandidate = true;
        reason = 'Veterano disponible';
      }
      
      if (!isCandidate) continue;
      
      // El jugador debe ser útil para el equipo solicitante
      // (no demasiado bajo ni demasiado alto para el equipo)
      if (player.overall < requestingOvrAvg - 8) continue;
      if (player.overall > requestingOvrAvg + 15) continue;
      
      const loanFee = calculateLoanFee(player, team.leagueId);
      const salaryShare = calculateLoanSalaryShare(player, requestingProfile);
      
      // Opción de compra (70% de los candidatos la tienen)
      const hasPurchaseOption = Math.random() < 0.70;
      const marketValue = calculateMarketValue(player, team.leagueId);
      const purchaseOption = hasPurchaseOption 
        ? Math.round(marketValue * (PURCHASE_OPTION_MULTIPLIER_MIN + Math.random() * (PURCHASE_OPTION_MULTIPLIER_MAX - PURCHASE_OPTION_MULTIPLIER_MIN)))
        : null;
      
      candidates.push({
        ...player,
        teamId: team.id,
        teamName: team.name,
        leagueId: team.leagueId,
        loanFee,
        salaryShare,
        purchaseOption,
        reason,
        marketValue
      });
    }
  }
  
  // Ordenar por overall descendente
  return candidates.sort((a, b) => b.overall - a.overall);
}

/**
 * Generar ofertas de cesión entrantes para jugadores del usuario
 * Otros equipos quieren llevarse a tus jugadores en cesión
 */
export function generateLoanOffers(playerTeam, allTeams, teamId) {
  const offers = [];
  
  if (!playerTeam?.players || !allTeams) return offers;
  
  const teamPlayers = playerTeam.players.filter(p => {
    // No ofrecer por jugadores en cesión, lesionados o sancionados
    if (p.onLoan || p.injured || p.suspended) return false;
    // Candidatos: suplentes, jóvenes, jugadores con contrato largo
    const isYoung = p.age <= 23;
    const isBackup = p.overall < avgOverall(playerTeam.players) - 2;
    return isYoung || isBackup;
  });
  
  if (teamPlayers.length === 0) return offers;
  
  // Elegir 1 jugador al azar de los candidatos
  const targetPlayer = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
  
  const teamsArray = allTeams instanceof Map 
    ? Array.from(allTeams.values()) 
    : Array.isArray(allTeams) ? allTeams : [];
  
  // Buscar equipo interesado
  const interestedTeams = teamsArray.filter(t => {
    if (t.id === teamId) return false;
    const profile = getTeamProfileByName(t.name);
    const teamAvg = avgOverall(t.players || []);
    // El jugador debe encajar en el equipo (no demasiado bueno ni malo)
    return targetPlayer.overall >= teamAvg - 5 && targetPlayer.overall <= teamAvg + 10
      && (t.budget || 0) >= 1_000_000;
  });
  
  if (interestedTeams.length === 0) return offers;
  
  const requestingTeam = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
  const requestingProfile = getTeamProfileByName(requestingTeam.name);
  
  const loanFee = calculateLoanFee(targetPlayer, playerTeam.leagueId || '');
  const salaryShare = calculateLoanSalaryShare(targetPlayer, requestingProfile);
  const marketValue = calculateMarketValue(targetPlayer, playerTeam.leagueId || '');
  
  // Opción de compra (60% de las ofertas entrantes la incluyen)
  const hasPurchaseOption = Math.random() < 0.60;
  const purchaseOption = hasPurchaseOption
    ? Math.round(marketValue * (0.9 + Math.random() * 0.3))
    : null;
  
  offers.push({
    id: `loan_offer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    playerId: targetPlayer.name,
    playerData: {
      name: targetPlayer.name,
      position: targetPlayer.position,
      overall: targetPlayer.overall,
      age: targetPlayer.age,
      salary: targetPlayer.salary
    },
    fromTeamId: teamId,
    fromTeamName: playerTeam.name || '',
    toTeamId: requestingTeam.id,
    toTeamName: requestingTeam.name,
    loanFee,
    salaryShare,
    purchaseOption,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días
  });
  
  return offers;
}

/**
 * IA evalúa si acepta una solicitud de cesión del jugador
 * (Cuando el usuario pide un jugador en cesión a otro equipo)
 */
export function evaluateLoanRequest(ownerTeam, player, requestingTeam, offer) {
  let acceptChance = 0.50; // Base 50%
  
  const ownerProfile = getTeamProfileByName(ownerTeam.name);
  const ownerAvg = avgOverall(ownerTeam.players || []);
  
  // El jugador es suplente → más fácil que acepten
  if (player.overall < ownerAvg - 3) acceptChance += 0.20;
  else if (player.overall < ownerAvg) acceptChance += 0.10;
  
  // Joven que necesita minutos → equipo grande suele aceptar
  if (player.age <= 23 && (ownerProfile.name === 'Elite' || ownerProfile.name === 'Top Tier')) {
    acceptChance += 0.15;
  }
  
  // Contrato largo → más tranquilos para ceder
  if ((player.contractYears || 2) >= 3) acceptChance += 0.10;
  
  // Fee de cesión alta → más incentivo
  const marketValue = calculateMarketValue(player, ownerTeam.leagueId);
  if (offer.loanFee >= marketValue * 0.20) acceptChance += 0.10;
  
  // Opción de compra buena → les interesa
  if (offer.purchaseOption && offer.purchaseOption >= marketValue * 0.90) {
    acceptChance += 0.10;
  }
  
  // Equipos elite son más reluctantes
  if (ownerProfile.sellReluctance > 0.6) acceptChance -= 0.15;
  
  // Jugador estrella → muy difícil
  if (player.overall >= 83) acceptChance -= 0.25;
  
  // Clamp
  acceptChance = Math.max(0.10, Math.min(0.90, acceptChance));
  
  const accepted = Math.random() < acceptChance;
  
  return {
    accepted,
    acceptChance: Math.round(acceptChance * 100),
    reasons: getEvaluationReasons(player, ownerTeam, ownerProfile, ownerAvg)
  };
}

/**
 * Procesar fin de cesiones — devolver jugadores a sus equipos
 */
export function expireLoans(activeLoans, allTeams) {
  const expiredLoans = [];
  const remainingLoans = [];
  const messages = [];
  
  for (const loan of activeLoans) {
    if (loan.status !== 'active') {
      remainingLoans.push(loan);
      continue;
    }
    
    // La cesión ha expirado
    expiredLoans.push({
      ...loan,
      status: 'expired'
    });
    
    messages.push({
      type: 'loan',
      title: '🔄 Cesión finalizada',
      content: `${loan.playerData?.name || loan.playerId} vuelve a ${loan.fromTeamName} tras su cesión en ${loan.toTeamName}`
    });
  }
  
  return { expiredLoans, remainingLoans, messages };
}

/**
 * Ejecutar opción de compra de una cesión
 */
export function exercisePurchaseOption(loan, buyingTeam) {
  if (!loan.purchaseOption || loan.status !== 'active') {
    return { success: false, reason: 'No hay opción de compra o cesión inactiva' };
  }
  
  if ((buyingTeam.budget || buyingTeam.money || 0) < loan.purchaseOption) {
    return { success: false, reason: 'Presupuesto insuficiente' };
  }
  
  return {
    success: true,
    price: loan.purchaseOption,
    player: loan.playerData,
    fromTeamId: loan.fromTeamId,
    toTeamId: loan.toTeamId
  };
}

/**
 * Crear objeto de cesión
 */
export function createLoan(player, fromTeam, toTeam, loanFee, salaryShare, purchaseOption) {
  return {
    id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    playerId: player.name,
    playerData: {
      name: player.name,
      position: player.position,
      overall: player.overall,
      age: player.age,
      salary: player.salary || 50000,
      value: player.value || 0
    },
    fromTeamId: fromTeam.id || fromTeam,
    fromTeamName: fromTeam.name || fromTeam,
    toTeamId: toTeam.id || toTeam,
    toTeamName: toTeam.name || toTeam,
    loanFee,
    salaryShare,
    purchaseOption: purchaseOption || null,
    duration: 'season',
    startedAt: Date.now(),
    weeksRemaining: LOAN_DURATION_WEEKS,
    status: 'active'
  };
}

/**
 * Verificar restricciones de cesión
 */
export function canLoanPlayer(player, state, direction = 'out') {
  const errors = [];
  
  // Solo durante ventana de mercado
  // (La verificación de ventana se hace en el componente, aquí verificamos el estado del jugador)
  
  if (direction === 'out') {
    // Ceder jugador propio
    if (player.injured) errors.push('No se puede ceder un jugador lesionado');
    if (player.suspended) errors.push('No se puede ceder un jugador sancionado');
    if (player.onLoan) errors.push('Este jugador ya está en cesión');
  }
  
  if (direction === 'in') {
    // Recibir jugador en cesión
    const activeIncomingLoans = (state.activeLoans || []).filter(
      l => l.toTeamId === state.teamId && l.status === 'active'
    );
    if (activeIncomingLoans.length >= MAX_INCOMING_LOANS_PER_SEASON) {
      errors.push(`Máximo ${MAX_INCOMING_LOANS_PER_SEASON} cesiones entrantes por temporada`);
    }
  }
  
  return {
    canLoan: errors.length === 0,
    errors
  };
}

// ============================================================
// SIMULACIÓN IA — Cesiones entre equipos IA
// ============================================================

/**
 * Simular cesiones IA durante una semana de mercado
 */
export function simulateAILoans(allTeams, playerTeamId, activeLoans) {
  const events = [];
  
  const teamsArray = allTeams instanceof Map 
    ? Array.from(allTeams.values()) 
    : Array.isArray(allTeams) ? allTeams : [];
  
  const aiTeams = teamsArray.filter(t => t.id !== playerTeamId);
  
  // 15% chance de que un equipo IA intente una cesión
  for (const team of aiTeams) {
    if (Math.random() >= 0.15) continue;
    
    const teamProfile = getTeamProfileByName(team.name);
    
    // Equipos grandes ceden jóvenes
    if (teamProfile.name === 'Elite' || teamProfile.name === 'Top Tier') {
      const youngPlayers = (team.players || []).filter(p => 
        p.age <= 23 && p.overall >= 65 && p.overall <= 75 
        && !p.injured && !p.suspended && !p.onLoan
      );
      
      if (youngPlayers.length > 0) {
        const player = youngPlayers[Math.floor(Math.random() * youngPlayers.length)];
        
        // Buscar equipo receptor (más pequeño)
        const receivers = aiTeams.filter(t => {
          if (t.id === team.id) return false;
          const profile = getTeamProfileByName(t.name);
          return profile.name === 'Mid Table' || profile.name === 'Low Table';
        });
        
        if (receivers.length > 0) {
          const receiver = receivers[Math.floor(Math.random() * receivers.length)];
          const loanFee = calculateLoanFee(player, team.leagueId);
          
          events.push({
            type: 'ai_loan',
            player: { name: player.name, position: player.position, overall: player.overall, age: player.age },
            from: { id: team.id, name: team.name },
            to: { id: receiver.id, name: receiver.name },
            loanFee
          });
        }
      }
    }
    
    // Equipos pequeños piden cesiones de jugadores de equipos grandes
    if (teamProfile.name === 'Mid Table' || teamProfile.name === 'Low Table') {
      const bigTeams = aiTeams.filter(t => {
        const profile = getTeamProfileByName(t.name);
        return profile.name === 'Elite' || profile.name === 'Top Tier';
      });
      
      if (bigTeams.length > 0 && Math.random() < 0.30) {
        const bigTeam = bigTeams[Math.floor(Math.random() * bigTeams.length)];
        const teamAvg = avgOverall(bigTeam.players || []);
        
        const availablePlayers = (bigTeam.players || []).filter(p =>
          p.overall < teamAvg - 2 && !p.injured && !p.suspended && !p.onLoan
          && p.overall >= 65
        );
        
        if (availablePlayers.length > 0) {
          const player = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
          const loanFee = calculateLoanFee(player, bigTeam.leagueId);
          
          events.push({
            type: 'ai_loan',
            player: { name: player.name, position: player.position, overall: player.overall, age: player.age },
            from: { id: bigTeam.id, name: bigTeam.name },
            to: { id: team.id, name: team.name },
            loanFee
          });
        }
      }
    }
  }
  
  return events;
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

function getTeamProfileByName(teamName) {
  for (const [key, profile] of Object.entries(TEAM_PROFILES)) {
    if (profile.teams?.includes(teamName)) {
      return profile;
    }
  }
  return TEAM_PROFILES.lowTable;
}

function avgOverall(players) {
  if (!players.length) return 0;
  return Math.round(players.reduce((sum, p) => sum + (p.overall || 70), 0) / players.length);
}

function getEvaluationReasons(player, ownerTeam, ownerProfile, ownerAvg) {
  const reasons = [];
  
  if (player.overall < ownerAvg - 3) {
    reasons.push({ text: 'Es suplente en su equipo', positive: true });
  } else {
    reasons.push({ text: 'Es titular en su equipo', positive: false });
  }
  
  if (player.age <= 23) {
    reasons.push({ text: 'Joven que necesita minutos', positive: true });
  }
  
  if ((player.contractYears || 2) >= 3) {
    reasons.push({ text: 'Contrato largo, equipo tranquilo', positive: true });
  } else if ((player.contractYears || 2) <= 1) {
    reasons.push({ text: 'Contrato corto, no quieren perderlo', positive: false });
  }
  
  if (ownerProfile.sellReluctance > 0.6) {
    reasons.push({ text: 'Equipo grande, difícil negociar', positive: false });
  }
  
  if (player.overall >= 83) {
    reasons.push({ text: 'Jugador estrella, improbable cesión', positive: false });
  }
  
  return reasons;
}

export default {
  calculateLoanFee,
  calculateLoanSalaryShare,
  generateLoanCandidates,
  generateLoanOffers,
  evaluateLoanRequest,
  expireLoans,
  exercisePurchaseOption,
  createLoan,
  canLoanPlayer,
  simulateAILoans
};
