// ============================================================
// LOAN SYSTEM - Sistema de Cesiones
// ============================================================
// Motor de cesiones: préstamos temporales de jugadores entre equipos.
// Integrado con el sistema de transfers global.

import { calculateMarketValue, TEAM_PROFILES } from './globalTransferEngine.js';

// Constantes
const MAX_INCOMING_LOANS_PER_SEASON = 3;
const LOAN_DURATION_WEEKS = 38; // Temporada completa
const PURCHASE_OPTION_MULTIPLIER_MIN = 0.8;
const PURCHASE_OPTION_MULTIPLIER_MAX = 1.3;

const DIRECT_RIVAL_GROUPS = [
  ['real madrid', 'barcelona'],
  ['real betis', 'betis', 'sevilla'],
  ['atletico madrid', 'atlético madrid', 'real madrid'],
  ['athletic club', 'athletic bilbao', 'real sociedad'],
  ['valencia', 'levante'],
  ['espanyol', 'barcelona']
];

const SECOND_TIER_LEAGUE_HINTS = ['segunda', 'serieb', 'serie b', 'championship', 'ligue2', 'ligue 2', 'bundesliga2', '2bundesliga', '2. bundesliga'];

function normalizeMarketText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getLeagueText(team) {
  return normalizeMarketText(`${team?.leagueId || ''} ${team?.league || ''} ${team?.competition || ''} ${team?.country || ''}`);
}

function getLeagueCountry(team) {
  const text = getLeagueText(team);
  if (/spain|espana|laliga|segunda|rfef/.test(text)) return 'spain';
  if (/italy|italia|serie a|serie b|serieb/.test(text)) return 'italy';
  if (/england|inglaterra|premier|championship/.test(text)) return 'england';
  if (/france|francia|ligue/.test(text)) return 'france';
  if (/germany|alemania|bundesliga/.test(text)) return 'germany';
  if (/portugal|primeira/.test(text)) return 'portugal';
  if (/netherlands|paises bajos|eredivisie/.test(text)) return 'netherlands';
  return text || 'unknown';
}

function isSecondTierTeam(team) {
  const text = getLeagueText(team);
  const level = Number(team?.leagueLevel || team?.divisionLevel || team?.tierLevel || 0);
  return level >= 2 || SECOND_TIER_LEAGUE_HINTS.some(hint => text.includes(normalizeMarketText(hint)));
}

function areDirectRivals(teamA, teamB) {
  const a = normalizeMarketText(teamA?.name || teamA?.shortName || teamA?.id || '');
  const b = normalizeMarketText(teamB?.name || teamB?.shortName || teamB?.id || '');
  if (!a || !b) return false;
  return DIRECT_RIVAL_GROUPS.some(group => {
    const aliases = group.map(normalizeMarketText);
    return aliases.some(alias => a === alias || a.includes(alias))
      && aliases.some(alias => b === alias || b.includes(alias))
      && a !== b;
  });
}

function getTeamBudget(team) {
  return Number(team?.transferBudget ?? team?.budget ?? team?.money ?? 0);
}

function getPrestigeScore(team, fallback = 68) {
  const players = Array.isArray(team?.players) ? team.players : [];
  const avg = players.length ? avgOverall(players) : Number(team?.overall || team?.rating || fallback);
  return Math.max(Number(team?.reputation || 0) || fallback, avg || fallback);
}

function getDomesticBias(team) {
  const modestSpanish = getLeagueCountry(team) === 'spain'
    && (isSecondTierTeam(team) || getPrestigeScore(team, 68) <= 76);
  return modestSpanish ? 0.58 : 0.35;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0.01, item.weight || 0.01), 0);
  let pick = Math.random() * total;
  return items.find(item => {
    pick -= Math.max(0.01, item.weight || 0.01);
    return pick <= 0;
  }) || items[items.length - 1];
}

function isPlausibleLoanRequester(requestingTeam, player, ownerTeam, marketValue) {
  if (!requestingTeam || !player || !ownerTeam) return false;
  if (requestingTeam.id === ownerTeam.id) return false;
  if (areDirectRivals(requestingTeam, ownerTeam)) return false;

  const budget = getTeamBudget(requestingTeam);
  const annualWage = Number(player.salary || 50000) * 52;
  if (budget > 0 && budget < Math.max(500000, annualWage * 0.25)) return false;

  const playerOverall = Number(player.overall || 70);
  const requesterLevel = getPrestigeScore(requestingTeam, 68);

  // Cesiones de estrellas absolutas son raras y solo para clubes de primer nivel.
  if (playerOverall >= 84) {
    if (isSecondTierTeam(requestingTeam)) return false;
    if (requesterLevel < playerOverall - 10) return false;
    if (budget > 0 && budget < marketValue * 0.25) return false;
  }

  // Jóvenes/suplentes pueden bajar un escalón, pero no dos mundos deportivos.
  if (playerOverall >= 76 && requesterLevel < playerOverall - 16) return false;
  if (playerOverall < 76 && requesterLevel < playerOverall - 22) return false;

  return true;
}

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
  
  const marketValue = calculateMarketValue(targetPlayer, playerTeam.leagueId || '');
  const sellerCountry = getLeagueCountry(playerTeam);
  const domesticBias = getDomesticBias(playerTeam);

  // Buscar equipo interesado con filtros de coherencia: nivel, presupuesto,
  // mercado doméstico para modestos españoles y veto de rivalidades.
  const interestedTeams = teamsArray
    .filter(t => {
      if (!isPlausibleLoanRequester(t, targetPlayer, playerTeam, marketValue)) return false;
      const teamAvg = avgOverall(t.players || []);
      const fallbackLevel = getPrestigeScore(t, 68);
      const effectiveAvg = teamAvg || fallbackLevel;
      // El jugador debe encajar en el equipo (no demasiado bueno ni malo)
      return targetPlayer.overall >= effectiveAvg - 7 && targetPlayer.overall <= effectiveAvg + 12
        && getTeamBudget(t) >= 1_000_000;
    })
    .map(team => {
      const domestic = sellerCountry !== 'unknown' && getLeagueCountry(team) === sellerCountry;
      const levelFit = 1 / (1 + Math.abs(getPrestigeScore(team, 68) - targetPlayer.overall) / 18);
      return {
        team,
        weight: (domestic ? (domesticBias > 0.5 ? 0.68 : 1 + domesticBias * 0.15) : 1) * (0.75 + levelFit)
      };
    });
  
  if (interestedTeams.length === 0) return offers;
  
  const requestingTeam = weightedPick(interestedTeams).team;
  const requestingProfile = getTeamProfileByName(requestingTeam.name);
  
  const loanFee = calculateLoanFee(targetPlayer, playerTeam.leagueId || '');
  const salaryShare = calculateLoanSalaryShare(targetPlayer, requestingProfile);
  
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
export function expireLoans(activeLoans) {
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
      titleKey: 'gameMessages.loanExpired',
        contentKey: 'gameMessages.loanExpiredContent', contentParams: { player: loan.playerData?.name || loan.playerId, from: loan.fromTeamName, to: loan.toTeamName }
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
  
  // Prevent loaning free agents (no team) — only for incoming loans
  // For outgoing loans, the player is already in your squad so they're not a free agent
  if (direction === 'in' && !player.teamId && !player.loanFromTeamId) {
    errors.push('No se puede ceder un agente libre');
  }
  
  // Prevent double loan (player already on loan being loaned again)
  if (player.onLoan && direction === 'in') {
    errors.push('Este jugador ya está cedido en otro equipo');
  }
  
  if (direction === 'out') {
    // Ceder jugador propio
    if (player.injured) errors.push('No se puede ceder un jugador lesionado');
    if (player.suspended) errors.push('No se puede ceder un jugador sancionado');
    if (player.onLoan) errors.push('Este jugador ya está en cesión');
    
    // Minimum squad check: at least 14 players must remain
    const currentSquadSize = (state.team?.players || []).length;
    if (currentSquadSize <= 14) {
      errors.push('Plantilla demasiado pequeña (mínimo 14 jugadores)');
    }
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
  const loanedThisBatch = new Set();
  const alreadyLoaned = new Set((activeLoans || []).map(loan => `${loan.fromTeamId || ''}|${loan.playerId || loan.playerData?.id || loan.playerData?.name || ''}`));
  const makeLoanKey = (team, player) => `${team.id || team.name}|${player.id || `${player.name}|${player.position}|${player.age}|${player.overall}`}`;
  const canQueueLoan = (team, player) => {
    const key = makeLoanKey(team, player);
    return !loanedThisBatch.has(key) && !alreadyLoaned.has(key);
  };
  const markQueuedLoan = (team, player) => loanedThisBatch.add(makeLoanKey(team, player));
  
  // Ritmo moderado de cesiones IA: con 900+ clubes, 15% generaba demasiados movimientos.
  for (const team of aiTeams) {
    if (Math.random() >= 0.06) continue;
    
    const teamProfile = getTeamProfileByName(team.name);
    
    // Equipos grandes ceden jóvenes
    if (teamProfile.name === 'Elite' || teamProfile.name === 'Top Tier') {
      const youngPlayers = (team.players || []).filter(p => 
        p.age <= 23 && p.overall >= 65 && p.overall <= 75 
        && !p.injured && !p.suspended && !p.onLoan
      );
      
      if (youngPlayers.length > 0) {
        const player = youngPlayers[Math.floor(Math.random() * youngPlayers.length)];
        if (!canQueueLoan(team, player)) continue;
        
        // Buscar equipo receptor (más pequeño)
        const receivers = aiTeams.filter(t => {
          if (t.id === team.id) return false;
          const profile = getTeamProfileByName(t.name);
          return profile.name === 'Mid Table' || profile.name === 'Low Table';
        });
        
        if (receivers.length > 0) {
          const receiver = receivers[Math.floor(Math.random() * receivers.length)];
          const loanFee = calculateLoanFee(player, team.leagueId);
          markQueuedLoan(team, player);
          
          events.push({
            type: 'ai_loan',
            player: { ...player },
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
      
      if (bigTeams.length > 0 && Math.random() < 0.12) {
        const bigTeam = bigTeams[Math.floor(Math.random() * bigTeams.length)];
        const teamAvg = avgOverall(bigTeam.players || []);
        
        const availablePlayers = (bigTeam.players || []).filter(p =>
          p.overall < teamAvg - 2 && !p.injured && !p.suspended && !p.onLoan
          && p.overall >= 65
        );
        
        if (availablePlayers.length > 0) {
          const player = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
          if (!canQueueLoan(bigTeam, player)) continue;
          const loanFee = calculateLoanFee(player, bigTeam.leagueId);
          markQueuedLoan(bigTeam, player);
          
          events.push({
            type: 'ai_loan',
            player: { ...player },
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
  for (const profile of Object.values(TEAM_PROFILES)) {
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
