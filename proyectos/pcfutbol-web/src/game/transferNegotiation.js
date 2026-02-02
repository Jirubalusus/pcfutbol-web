// ============================================================
// TRANSFER NEGOTIATION ENGINE - Sistema de Fichajes Profundo
// ============================================================
// Negociación realista: club + jugador, prestigio, personalidad

import { calculateMarketValue, TEAM_PROFILES, formatTransferPrice } from './globalTransferEngine';

// ============================================================
// SISTEMA DE TIERS (PRESTIGIO)
// ============================================================

export const CLUB_TIERS = {
  // Tier 4: Elite mundial
  4: {
    name: 'Elite Mundial',
    prestige: 95,
    wageMultiplier: 2.0,
    attractiveness: 1.0,
    teams: ['Real Madrid', 'Barcelona', 'Manchester City', 'Bayern München', 'PSG']
  },
  // Tier 3: Top europeo
  3: {
    name: 'Top Europeo',
    prestige: 80,
    wageMultiplier: 1.5,
    attractiveness: 0.85,
    teams: ['Liverpool', 'Chelsea', 'Arsenal', 'Manchester United', 'Atlético Madrid', 
            'Juventus', 'Inter', 'Milan', 'Borussia Dortmund', 'Tottenham', 'Napoli']
  },
  // Tier 2: Primera división consolidado
  2: {
    name: 'Primera División',
    prestige: 60,
    wageMultiplier: 1.0,
    attractiveness: 0.65,
    teams: ['Sevilla', 'Real Sociedad', 'Athletic Club', 'Villarreal', 'Valencia', 
            'Real Betis', 'West Ham', 'Newcastle', 'Aston Villa', 'Brighton',
            'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'RB Leipzig', 'Bayer Leverkusen',
            'Olympique Lyon', 'Monaco', 'Marseille']
  },
  // Tier 1: Primera división modesto / Segunda división top
  1: {
    name: 'Modesto',
    prestige: 40,
    wageMultiplier: 0.7,
    attractiveness: 0.4,
    teams: ['Rayo Vallecano', 'Getafe', 'Osasuna', 'Celta Vigo', 'Mallorca', 'Girona',
            'Alavés', 'Espanyol', 'Valladolid', 'Elche',
            'Bournemouth', 'Fulham', 'Wolves', 'Crystal Palace', 'Brentford',
            'Nottingham Forest', 'Everton', 'Leicester City']
  },
  // Tier 0: Segunda división / Equipos menores
  0: {
    name: 'Menor',
    prestige: 20,
    wageMultiplier: 0.4,
    attractiveness: 0.2,
    teams: [] // El resto
  }
};

/**
 * Obtener tier de un equipo
 */
export function getClubTier(teamName) {
  for (const [tier, data] of Object.entries(CLUB_TIERS)) {
    if (data.teams.includes(teamName)) {
      return parseInt(tier);
    }
  }
  return 0; // Default: tier menor
}

/**
 * Obtener datos del tier
 */
export function getTierData(tier) {
  return CLUB_TIERS[tier] || CLUB_TIERS[0];
}

// ============================================================
// PERSONALIDADES DE JUGADORES
// ============================================================

export const PLAYER_PERSONALITIES = {
  ambitious: {
    name: 'Ambicioso',
    icon: '🔥',
    desc: 'Quiere jugar en los mejores equipos',
    tierUpBonus: 0.3,      // +30% chance si sube de tier
    tierDownPenalty: -0.4, // -40% chance si baja de tier
    moneyInfluence: 0.3,   // El dinero influye poco
    loyaltyFactor: 0.5     // Poca lealtad
  },
  loyal: {
    name: 'Leal',
    icon: '💙',
    desc: 'Muy difícil que deje su club',
    tierUpBonus: 0.1,
    tierDownPenalty: -0.2,
    moneyInfluence: 0.2,
    loyaltyFactor: 1.5     // Muy leal, difícil moverle
  },
  mercenary: {
    name: 'Mercenario',
    icon: '💰',
    desc: 'Solo le importa el dinero',
    tierUpBonus: 0.1,
    tierDownPenalty: 0.0,  // No le importa bajar si le pagan
    moneyInfluence: 0.9,   // El dinero lo es todo
    loyaltyFactor: 0.3
  },
  homesick: {
    name: 'Familiar',
    icon: '🏠',
    desc: 'Prefiere estar cerca de casa',
    tierUpBonus: 0.0,
    tierDownPenalty: -0.1,
    moneyInfluence: 0.4,
    loyaltyFactor: 1.2,
    prefersLocal: true     // Bonus si el equipo es de su país
  },
  professional: {
    name: 'Profesional',
    icon: '⚖️',
    desc: 'Evalúa todo con equilibrio',
    tierUpBonus: 0.15,
    tierDownPenalty: -0.15,
    moneyInfluence: 0.5,
    loyaltyFactor: 0.8
  },
  adventurous: {
    name: 'Aventurero',
    icon: '🌍',
    desc: 'Le gusta cambiar de aires',
    tierUpBonus: 0.2,
    tierDownPenalty: 0.05, // Incluso acepta bajar por la experiencia
    moneyInfluence: 0.4,
    loyaltyFactor: 0.4
  }
};

/**
 * Asignar personalidad a un jugador (determinista basado en nombre)
 */
export function assignPersonality(player) {
  const personalities = Object.keys(PLAYER_PERSONALITIES);
  const weights = {
    ambitious: player.overall >= 80 ? 0.3 : 0.15,
    loyal: player.age >= 30 ? 0.25 : 0.1,
    mercenary: 0.15,
    homesick: 0.1,
    professional: 0.35,
    adventurous: player.age <= 24 ? 0.2 : 0.1
  };
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  
  // Seeded random basado en el nombre del jugador para que sea consistente
  const seed = (player.name || '').split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  let random = (x - Math.floor(x)) * total;
  
  for (const [personality, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return personality;
    }
  }
  
  return 'professional';
}

// ============================================================
// SISTEMA DE RIVALIDADES
// ============================================================

export const CLUB_RIVALRIES = [
  // España
  ['Real Madrid', 'Barcelona'],
  ['Real Betis', 'Sevilla'],
  ['Atlético Madrid', 'Real Madrid'],
  ['Athletic Club', 'Real Sociedad'],
  ['Valencia', 'Villarreal'],
  ['Espanyol', 'Barcelona'],
  ['Celta Vigo', 'Deportivo de La Coruña'],
  // Inglaterra
  ['Liverpool', 'Manchester United'],
  ['Arsenal', 'Tottenham'],
  ['Manchester City', 'Manchester United'],
  ['Chelsea', 'Arsenal'],
  ['Everton', 'Liverpool'],
  // Italia
  ['Inter', 'Milan'],
  ['Juventus', 'Inter'],
  ['Roma', 'Lazio'],
  ['Napoli', 'Juventus'],
  // Alemania
  ['Bayern München', 'Borussia Dortmund'],
  ['FC Schalke 04', 'Borussia Dortmund'],
  // Francia
  ['PSG', 'Marseille'],
  ['Olympique Lyon', 'AS Saint-Étienne'],
  // Argentina
  ['Boca Juniors', 'River Plate'],
  ['Racing Club', 'Independiente'],
  ['San Lorenzo', 'Huracán'],
  // Brasil
  ['Flamengo', 'Vasco da Gama'],
  ['Corinthians', 'Palmeiras'],
  ['Grêmio', 'Internacional'],
  ['São Paulo', 'Corinthians'],
  // Colombia
  ['Atlético Nacional', 'Independiente Medellín'],
  ['Millonarios', 'Santa Fe'],
  // Chile
  ['Colo-Colo', 'Universidad de Chile'],
  ['Universidad Católica', 'Colo-Colo'],
  // Uruguay
  ['Peñarol', 'Nacional'],
];

/**
 * Check if two teams are rivals (flexible word-boundary matching)
 */
export function areRivals(teamNameA, teamNameB) {
  if (!teamNameA || !teamNameB) return false;
  
  const normalize = (name) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const matchNames = (candidate, reference) => {
    const c = normalize(candidate);
    const r = normalize(reference);
    if (c === r) return true;
    if (r.length < 3) return false;
    // Word-boundary: reference appears as whole word(s) in candidate or vice versa
    const shorter = c.length <= r.length ? c : r;
    const longer = c.length <= r.length ? r : c;
    const regex = new RegExp(`(^|\\s)${escape(shorter)}($|\\s)`);
    return regex.test(longer);
  };
  
  return CLUB_RIVALRIES.some(([r1, r2]) => {
    return (
      (matchNames(teamNameA, r1) && matchNames(teamNameB, r2)) ||
      (matchNames(teamNameA, r2) && matchNames(teamNameB, r1))
    );
  });
}

// ============================================================
// NEGOCIACIÓN CON EL CLUB
// ============================================================

/**
 * Evaluar oferta del club comprador
 * Soporta negociación dinámica por rondas con negotiationContext
 * @param {object} negotiationContext - { round, previousOffers: [amount...], previousCounter }
 * @returns {object} { accepted, rejected, counter, reason, minAcceptable, isRivalry, isFinalOffer, round }
 */
export function evaluateClubOffer(offer, player, sellingTeam, buyingTeam, negotiationContext = null) {
  const marketValue = calculateMarketValue(player);
  const { askingMultiplier } = calculateTransferDifficulty(player, sellingTeam, buyingTeam);
  let askingPrice = Math.round(marketValue * askingMultiplier);
  
  const rivalry = areRivals(sellingTeam?.name, buyingTeam?.name);
  const round = negotiationContext?.round || 1;
  const maxRounds = rivalry ? 2 : 3;
  const previousOffers = negotiationContext?.previousOffers || [];
  const previousCounter = negotiationContext?.previousCounter || null;
  
  // Rivales: el precio pedido sube un 30%
  if (rivalry) {
    askingPrice = Math.round(askingPrice * 1.3);
  }
  
  const offerRatio = offer.amount / askingPrice;
  const isLastRound = round >= maxRounds;
  
  // Campos base de la respuesta
  const base = { isRivalry: rivalry, round, isFinalOffer: false };
  
  // === RONDA 1 (o sin contexto — compatibilidad) ===
  if (round <= 1) {
    // Rivales: oferta < 70% → rechazo directo
    if (rivalry && offerRatio < 0.7) {
      return { ...base, accepted: false, rejected: true, reason: 'Oferta inaceptable de un rival — no negociamos', minAcceptable: askingPrice };
    }
    
    // Oferta < 50% → RECHAZO DIRECTO sin contraoferta
    if (offerRatio < 0.5) {
      return { ...base, accepted: false, rejected: true, reason: 'Oferta irrisoria, no negociamos', minAcceptable: askingPrice };
    }
    
    // Oferta ≥ 115% → acepta siempre
    if (offerRatio >= 1.15) {
      return { ...base, accepted: true, reason: 'Oferta irrechazable', finalPrice: offer.amount };
    }
    
    // Oferta 95-115% → 80% acepta
    if (offerRatio >= 0.95) {
      if (Math.random() < 0.8) {
        return { ...base, accepted: true, reason: 'Oferta aceptable', finalPrice: offer.amount };
      }
      // 20% cae a contraoferta suave
      const counterPrice = Math.round(askingPrice * (0.98 + Math.random() * 0.05));
      return { ...base, accepted: false, counter: counterPrice, reason: `Queremos un poco más: ${formatTransferPrice(counterPrice)}`, minAcceptable: Math.round(askingPrice * 0.9) };
    }
    
    // Oferta 75-95% → contraoferta (95-105% del asking)
    if (offerRatio >= 0.75) {
      const counterPrice = Math.round(askingPrice * (0.95 + Math.random() * 0.1));
      return { ...base, accepted: false, counter: counterPrice, reason: `Queremos ${formatTransferPrice(counterPrice)}`, minAcceptable: Math.round(askingPrice * 0.9) };
    }
    
    // Oferta 50-75% → contraoferta agresiva (105-120% del asking)
    const counterPrice = Math.round(askingPrice * (1.05 + Math.random() * 0.15));
    return { ...base, accepted: false, counter: counterPrice, reason: `Oferta insuficiente. Mínimo ${formatTransferPrice(counterPrice)}`, minAcceptable: askingPrice };
  }
  
  // === RONDAS 2+ ===
  const lastOffer = previousOffers.length > 0 ? previousOffers[previousOffers.length - 1] : 0;
  const offerIncreased = offer.amount > lastOffer;
  
  // Si la nueva oferta ≥ counter anterior → aceptar (superó la petición)
  if (previousCounter && offer.amount >= previousCounter) {
    return { ...base, accepted: true, reason: 'Acuerdo alcanzado — oferta cumple con lo pedido', finalPrice: offer.amount };
  }
  
  // === ÚLTIMA RONDA ===
  if (isLastRound) {
    // Jugador no subió → rechazo directo
    if (!offerIncreased) {
      return { ...base, accepted: false, rejected: true, reason: 'El club se cansó de negociar — oferta no mejorada', minAcceptable: askingPrice };
    }
    
    // Oferta ≥ 95% → acepta
    if (offerRatio >= 0.95) {
      return { ...base, accepted: true, reason: 'Acuerdo alcanzado', finalPrice: offer.amount };
    }
    
    // Oferta ≥ 90% → alta probabilidad
    if (offerRatio >= 0.9) {
      if (Math.random() < 0.85) {
        return { ...base, accepted: true, reason: 'Acuerdo alcanzado', finalPrice: offer.amount };
      }
    }
    
    // Oferta < 80% → rechazo
    if (offerRatio < 0.8) {
      return { ...base, accepted: false, rejected: true, reason: 'Oferta insuficiente para cerrar el trato', minAcceptable: askingPrice };
    }
    
    // 80-95% → última contraoferta "take it or leave it"
    const finalCounter = Math.round((offer.amount + askingPrice) / 2);
    return { ...base, accepted: false, counter: finalCounter, reason: `Última oferta: ${formatTransferPrice(finalCounter)}. Lo tomas o lo dejas.`, minAcceptable: Math.round(askingPrice * 0.85), isFinalOffer: true };
  }
  
  // === RONDA INTERMEDIA (no última) ===
  if (offerIncreased) {
    // Jugador subió su oferta → club coopera
    
    // Si ≥ 90% asking → alta probabilidad de aceptar
    if (offerRatio >= 0.9) {
      if (Math.random() < 0.7) {
        return { ...base, accepted: true, reason: 'Oferta aceptable', finalPrice: offer.amount };
      }
    }
    
    // Club baja su counter: punto medio entre nueva oferta y counter anterior
    if (previousCounter) {
      const newCounter = Math.round((offer.amount + previousCounter) / 2);
      return { ...base, accepted: false, counter: newCounter, reason: `Contraoferta: ${formatTransferPrice(newCounter)}`, minAcceptable: Math.round(askingPrice * 0.85) };
    }
    
    // Sin counter anterior (fallback)
    const counterPrice = Math.round(askingPrice * (0.95 + Math.random() * 0.1));
    return { ...base, accepted: false, counter: counterPrice, reason: `Contraoferta: ${formatTransferPrice(counterPrice)}`, minAcceptable: Math.round(askingPrice * 0.9) };
  } else {
    // Jugador mantuvo o bajó → club mantiene o sube
    if (previousCounter) {
      const bump = 1 + Math.random() * 0.05; // 0-5% subida
      const newCounter = Math.round(previousCounter * bump);
      return { ...base, accepted: false, counter: newCounter, reason: `El club mantiene su posición: ${formatTransferPrice(newCounter)}`, minAcceptable: askingPrice };
    }
    
    const counterPrice = Math.round(askingPrice * (1.05 + Math.random() * 0.1));
    return { ...base, accepted: false, counter: counterPrice, reason: `El club no cede: ${formatTransferPrice(counterPrice)}`, minAcceptable: askingPrice };
  }
}

// ============================================================
// NEGOCIACIÓN CON EL JUGADOR
// ============================================================

/**
 * Calcular salario requerido por el jugador
 */
export function calculateRequiredSalary(player, currentTeam, newTeam) {
  const currentTier = getClubTier(currentTeam.name);
  const newTier = getClubTier(newTeam.name);
  const tierDiff = currentTier - newTier;
  const currentSalary = player.salary || 50000;
  const personality = PLAYER_PERSONALITIES[player.personality || 'professional'];
  
  let salaryMultiplier = 1.1; // Mínimo 10% de subida para moverse
  
  // Si baja de tier, necesita compensación
  if (tierDiff > 0) {
    // Cada tier de bajada = +40% más de salario (determinista)
    const tierPenalty = tierDiff * 0.4;
    salaryMultiplier += tierPenalty;
    
    // La personalidad afecta cuánto extra pide
    if (personality.name === 'Ambicioso') {
      salaryMultiplier += tierDiff * 0.2; // Pide AÚN más
    } else if (personality.name === 'Mercenario') {
      salaryMultiplier += tierDiff * 0.15; // Acepta con menos, pero quiere pasta
    } else if (personality.name === 'Aventurero') {
      salaryMultiplier -= tierDiff * 0.1; // No le importa tanto
    }
  }
  
  // Si sube de tier, acepta menos aumento (o incluso igual)
  if (tierDiff < 0) {
    salaryMultiplier = Math.max(1.0, salaryMultiplier - Math.abs(tierDiff) * 0.1);
  }
  
  // Jugadores mayores piden más (última oportunidad)
  if (player.age >= 30) {
    salaryMultiplier += 0.1;
  }
  if (player.age >= 33) {
    salaryMultiplier += 0.15;
  }
  
  return Math.round(currentSalary * salaryMultiplier);
}

/**
 * Evaluar si el jugador acepta la oferta
 * @returns {object} { accepted, reason, requiredSalary, probability }
 */
export function evaluatePlayerOffer(offer, player, currentTeam, newTeam) {
  const currentTier = getClubTier(currentTeam.name);
  const newTier = getClubTier(newTeam.name);
  const tierDiff = currentTier - newTier;
  const personality = PLAYER_PERSONALITIES[player.personality || 'professional'];
  
  const currentSalary = player.salary || 50000;
  const offeredSalary = offer.salary || currentSalary;
  const requiredSalary = calculateRequiredSalary(player, currentTeam, newTeam);
  const salaryRatio = offeredSalary / requiredSalary;
  
  // Base probability: 50%
  let probability = 0.5;
  
  // === FACTOR TIER ===
  if (tierDiff > 0) {
    // Baja de tier - penalización base
    probability -= tierDiff * 0.15;
    probability += personality.tierDownPenalty;
  } else if (tierDiff < 0) {
    // Sube de tier - bonus
    probability += Math.abs(tierDiff) * 0.1;
    probability += personality.tierUpBonus;
  }
  
  // === FACTOR SALARIO ===
  if (salaryRatio >= 1.5) {
    // Le doblas el sueldo - muy tentador
    probability += 0.3 * personality.moneyInfluence + 0.15;
  } else if (salaryRatio >= 1.2) {
    // Buen aumento
    probability += 0.2 * personality.moneyInfluence + 0.1;
  } else if (salaryRatio >= 1.0) {
    // Cumple mínimo
    probability += 0.1 * personality.moneyInfluence;
  } else if (salaryRatio >= 0.8) {
    // Por debajo - penalización
    probability -= 0.15;
  } else {
    // Muy por debajo - casi imposible
    probability -= 0.35;
  }
  
  // === FACTOR EDAD ===
  if (player.age >= 32) {
    // Veterano - más dispuesto a moverse por último contrato
    probability += 0.1;
  }
  if (player.age <= 23) {
    // Joven - más dispuesto a la aventura
    probability += 0.05;
  }
  
  // === FACTOR ROL ACTUAL ===
  const isStarter = player.role?.name?.includes('Titular') || player.overall >= (currentTeam.avgOverall || 75);
  if (isStarter && tierDiff > 0) {
    // Es titular y le ofrecen bajar - muy difícil
    probability -= 0.2;
  }
  if (!isStarter && tierDiff <= 0) {
    // Es suplente y le ofrecen subir/mantener - más fácil
    probability += 0.15;
  }
  
  // === FACTOR LEALTAD ===
  const yearsAtClub = player.yearsAtClub || Math.floor(Math.random() * 5);
  if (yearsAtClub >= 5) {
    probability -= 0.1 * personality.loyaltyFactor;
  }
  if (yearsAtClub >= 8) {
    probability -= 0.15 * personality.loyaltyFactor;
  }
  
  // Clamp probability
  probability = Math.max(0.02, Math.min(0.95, probability));
  
  // Decisión final
  const accepted = Math.random() < probability;
  
  // Generar razón
  let reason = '';
  if (accepted) {
    if (tierDiff < 0) reason = 'Quiere dar el salto a un club más grande';
    else if (salaryRatio >= 1.3) reason = 'La oferta económica es muy atractiva';
    else if (!isStarter) reason = 'Busca más minutos de juego';
    else reason = 'Acepta el nuevo reto';
  } else {
    if (tierDiff > 1) reason = 'No quiere dar un paso atrás en su carrera';
    else if (salaryRatio < 0.9) reason = 'La oferta salarial es insuficiente';
    else if (yearsAtClub >= 5) reason = 'Tiene un vínculo especial con el club';
    else reason = 'No le convence el proyecto deportivo';
  }
  
  return {
    accepted,
    reason,
    probability: Math.round(probability * 100),
    requiredSalary,
    personalityEffect: personality.name,
    tierDiff
  };
}

// ============================================================
// PROCESO COMPLETO DE FICHAJE
// ============================================================

/**
 * Estado de una negociación
 */
export const NEGOTIATION_STATES = {
  INITIAL: 'initial',           // Inicio - preparar oferta
  CLUB_OFFER: 'club_offer',     // Oferta enviada al club
  CLUB_COUNTER: 'club_counter', // Club hizo contraoferta
  CLUB_ACCEPTED: 'club_accepted', // Club acepta - pasar a jugador
  CLUB_REJECTED: 'club_rejected', // Club rechaza definitivamente
  PLAYER_OFFER: 'player_offer', // Negociando con jugador
  PLAYER_COUNTER: 'player_counter', // Jugador quiere más
  COMPLETED: 'completed',       // Fichaje completado
  FAILED: 'failed',             // Fichaje fallido
  FREE_AGENT_OFFER: 'free_agent_offer',     // Negociando con jugador libre
  FREE_AGENT_COUNTER: 'free_agent_counter', // Libre pide más
  PRE_CONTRACT: 'pre_contract',             // Pre-contrato (contrato expira pronto)
  PRE_CONTRACT_ACCEPTED: 'pre_contract_accepted' // Pre-contrato aceptado
};

/**
 * Crear nueva negociación
 */
export function createNegotiation(player, sellingTeam, buyingTeam) {
  const marketValue = calculateMarketValue(player);
  const sellerTier = getClubTier(sellingTeam.name);
  const buyerTier = getClubTier(buyingTeam.name);
  
  return {
    id: `neg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    player: {
      name: player.name,
      position: player.position,
      overall: player.overall,
      age: player.age,
      salary: player.salary || 50000,
      personality: player.personality || assignPersonality(player),
      contractYears: player.contractYears || 2
    },
    sellingTeam: {
      id: sellingTeam.id,
      name: sellingTeam.name,
      tier: sellerTier
    },
    buyingTeam: {
      id: buyingTeam.id,
      name: buyingTeam.name,
      tier: buyerTier
    },
    marketValue,
    state: NEGOTIATION_STATES.INITIAL,
    clubOffer: null,
    clubResponse: null,
    playerOffer: null,
    playerResponse: null,
    history: [],
    createdAt: Date.now()
  };
}

/**
 * Crear negociación con jugador libre (sin club)
 * Solo se negocia prima de fichaje + salario
 */
export function createFreeAgentNegotiation(player, buyingTeam) {
  const marketValue = calculateMarketValue(player);
  const buyerTier = getClubTier(buyingTeam.name);
  
  return {
    id: `neg_free_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'free_agent',
    player: {
      name: player.name,
      position: player.position,
      overall: player.overall,
      age: player.age,
      salary: player.salary || 50000,
      personality: player.personality || assignPersonality(player),
      contractYears: 0
    },
    sellingTeam: null,
    buyingTeam: {
      id: buyingTeam.id,
      name: buyingTeam.name,
      tier: buyerTier
    },
    marketValue,
    state: NEGOTIATION_STATES.FREE_AGENT_OFFER,
    signingBonus: null,
    playerOffer: null,
    playerResponse: null,
    history: [],
    createdAt: Date.now()
  };
}

/**
 * Crear pre-contrato con jugador cuyo contrato expira
 * Se negocia directamente con el jugador (legal si contrato <= 6 meses)
 */
export function createPreContractNegotiation(player, currentTeam, buyingTeam) {
  const marketValue = calculateMarketValue(player);
  const buyerTier = getClubTier(buyingTeam.name);
  const sellerTier = getClubTier(currentTeam.name);
  
  return {
    id: `neg_pre_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'pre_contract',
    player: {
      name: player.name,
      position: player.position,
      overall: player.overall,
      age: player.age,
      salary: player.salary || 50000,
      personality: player.personality || assignPersonality(player),
      contractYears: player.contractYears || 1,
      currentTeamName: currentTeam.name
    },
    sellingTeam: {
      id: currentTeam.id,
      name: currentTeam.name,
      tier: sellerTier
    },
    buyingTeam: {
      id: buyingTeam.id,
      name: buyingTeam.name,
      tier: buyerTier
    },
    marketValue,
    state: NEGOTIATION_STATES.PRE_CONTRACT,
    signingBonus: null,
    playerOffer: null,
    playerResponse: null,
    history: [],
    createdAt: Date.now()
  };
}

/**
 * Enviar oferta a jugador libre o pre-contrato
 * @param signingBonus - Prima de fichaje (dinero directo al jugador)
 * @param salary - Salario semanal/mensual
 * @param contractYears - Duración del contrato
 */
export function sendFreeAgentOffer(negotiation, signingBonus, salary, contractYears = 3) {
  const offer = { signingBonus, salary, contractYears, timestamp: Date.now() };
  negotiation.playerOffer = offer;
  negotiation.signingBonus = signingBonus;
  
  if (negotiation.type === 'pre_contract') {
    negotiation.state = NEGOTIATION_STATES.PRE_CONTRACT;
  } else {
    negotiation.state = NEGOTIATION_STATES.FREE_AGENT_OFFER;
  }
  
  negotiation.history.push({
    type: 'free_agent_offer',
    signingBonus,
    salary,
    contractYears,
    timestamp: Date.now()
  });
  
  return negotiation;
}

/**
 * Procesar respuesta de jugador libre / pre-contrato
 */
export function processFreeAgentResponse(negotiation, buyingTeamData) {
  const player = negotiation.player;
  const offer = negotiation.playerOffer;
  const personality = PLAYER_PERSONALITIES[player.personality] || PLAYER_PERSONALITIES.professional;
  const buyerTier = negotiation.buyingTeam.tier;
  
  // Salario mínimo que espera el jugador
  const baseExpectedSalary = calculateRequiredSalary(player, 0, buyerTier);
  
  // Jugadores libres esperan más salario (compensar falta de traspaso)
  const freeAgentMultiplier = negotiation.type === 'free_agent' ? 1.3 : 1.15;
  const expectedSalary = Math.round(baseExpectedSalary * freeAgentMultiplier);
  
  // Prima de fichaje esperada (% del valor de mercado)
  const expectedBonus = Math.round(negotiation.marketValue * (negotiation.type === 'free_agent' ? 0.15 : 0.1));
  
  // Evaluar oferta
  const salaryRatio = offer.salary / expectedSalary;
  const bonusRatio = expectedBonus > 0 ? (offer.signingBonus || 0) / expectedBonus : 1;
  
  let probability = 0.5;
  
  // Salario
  if (salaryRatio >= 1.2) probability += 0.25;
  else if (salaryRatio >= 1.0) probability += 0.15;
  else if (salaryRatio >= 0.8) probability -= 0.1;
  else probability -= 0.3;
  
  // Prima de fichaje
  if (bonusRatio >= 1.5) probability += 0.15;
  else if (bonusRatio >= 1.0) probability += 0.1;
  else if (bonusRatio >= 0.5) probability += 0;
  else probability -= 0.15;
  
  // Tier del equipo comprador
  if (buyerTier >= 3) probability += 0.15;
  else if (buyerTier >= 2) probability += 0.05;
  else if (buyerTier <= 0) probability -= 0.15;
  
  // Personalidad
  probability += personality.moneyInfluence * (salaryRatio - 1) * 0.3;
  if (player.overall >= 85 && buyerTier < 3) probability -= 0.2;
  
  // Contrato largo = más compromiso, jugadores mayores lo ven bien
  if (offer.contractYears >= 4 && player.age >= 30) probability += 0.1;
  
  probability = Math.max(0.05, Math.min(0.95, probability));
  const accepted = Math.random() < probability;
  
  let reason;
  if (accepted) {
    if (salaryRatio >= 1.2) reason = 'La oferta económica es excelente';
    else if (buyerTier >= 3) reason = 'Le entusiasma el proyecto deportivo';
    else reason = 'Acepta la propuesta';
  } else {
    if (salaryRatio < 0.8) reason = 'La oferta salarial es insuficiente';
    else if (bonusRatio < 0.5) reason = 'Espera una prima de fichaje mayor';
    else if (buyerTier <= 1 && player.overall >= 80) reason = 'No le convence el nivel del equipo';
    else reason = 'No le convence la oferta global';
  }
  
  const response = {
    accepted,
    reason,
    probability: Math.round(probability * 100),
    expectedSalary,
    expectedBonus,
    personalityEffect: personality.name
  };
  
  negotiation.playerResponse = response;
  negotiation.history.push({
    type: 'free_agent_response',
    response,
    timestamp: Date.now()
  });
  
  if (accepted) {
    if (negotiation.type === 'pre_contract') {
      negotiation.state = NEGOTIATION_STATES.PRE_CONTRACT_ACCEPTED;
    } else {
      negotiation.state = NEGOTIATION_STATES.COMPLETED;
    }
  } else {
    if (offer.salary < expectedSalary * 1.5) {
      negotiation.state = negotiation.type === 'pre_contract' 
        ? NEGOTIATION_STATES.PRE_CONTRACT 
        : NEGOTIATION_STATES.FREE_AGENT_COUNTER;
    } else {
      negotiation.state = NEGOTIATION_STATES.FAILED;
    }
  }
  
  return negotiation;
}

/**
 * Enviar oferta al club
 */
export function sendClubOffer(negotiation, amount) {
  const offer = { amount, timestamp: Date.now() };
  negotiation.clubOffer = offer;
  negotiation.state = NEGOTIATION_STATES.CLUB_OFFER;
  negotiation.history.push({
    type: 'club_offer',
    amount,
    timestamp: Date.now()
  });
  
  // Simular respuesta del club (en juego real, esperar respuesta)
  // Por ahora, evaluamos inmediatamente
  return negotiation;
}

/**
 * Procesar respuesta del club
 */
export function processClubResponse(negotiation, sellingTeam, buyingTeam) {
  const playerData = {
    ...negotiation.player,
    role: { name: 'Titular' } // Simplificado
  };
  
  const response = evaluateClubOffer(
    negotiation.clubOffer,
    playerData,
    sellingTeam,
    buyingTeam
  );
  
  negotiation.clubResponse = response;
  negotiation.history.push({
    type: 'club_response',
    response,
    timestamp: Date.now()
  });
  
  if (response.accepted) {
    negotiation.state = NEGOTIATION_STATES.CLUB_ACCEPTED;
    negotiation.agreedPrice = response.finalPrice || negotiation.clubOffer.amount;
  } else if (response.rejected) {
    negotiation.state = NEGOTIATION_STATES.CLUB_REJECTED;
  } else {
    negotiation.state = NEGOTIATION_STATES.CLUB_COUNTER;
  }
  
  return negotiation;
}

/**
 * Enviar oferta al jugador
 */
export function sendPlayerOffer(negotiation, salary, contractYears = 4) {
  if (negotiation.state !== NEGOTIATION_STATES.CLUB_ACCEPTED) {
    throw new Error('Primero debe aceptar el club');
  }
  
  const offer = { salary, contractYears, timestamp: Date.now() };
  negotiation.playerOffer = offer;
  negotiation.state = NEGOTIATION_STATES.PLAYER_OFFER;
  negotiation.history.push({
    type: 'player_offer',
    salary,
    contractYears,
    timestamp: Date.now()
  });
  
  return negotiation;
}

/**
 * Procesar respuesta del jugador
 */
export function processPlayerResponse(negotiation, currentTeamData, newTeamData) {
  const response = evaluatePlayerOffer(
    negotiation.playerOffer,
    negotiation.player,
    currentTeamData,
    newTeamData
  );
  
  negotiation.playerResponse = response;
  negotiation.history.push({
    type: 'player_response',
    response,
    timestamp: Date.now()
  });
  
  if (response.accepted) {
    negotiation.state = NEGOTIATION_STATES.COMPLETED;
  } else {
    // Dar opción de mejorar oferta
    if (negotiation.playerOffer.salary < response.requiredSalary * 1.5) {
      negotiation.state = NEGOTIATION_STATES.PLAYER_COUNTER;
    } else {
      negotiation.state = NEGOTIATION_STATES.FAILED;
    }
  }
  
  return negotiation;
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Obtener descripción del tier
 */
export function getTierDescription(tier) {
  const data = getTierData(tier);
  return data.name;
}

/**
 * Calcular dificultad del fichaje (para UI Y negociación)
 * 
 * La dificultad es ÚNICA por jugador y determina:
 * - Cuánto por encima del valor mostrado debes ofrecer
 * - La probabilidad de contraoferta del club
 * 
 * askingMultiplier: 
 *   1.0 = el valor mostrado es suficiente
 *   1.3 = necesitas ofrecer ~30% más del valor
 *   1.6+ = necesitas ofrecer mucho más
 */
export function calculateTransferDifficulty(player, sellingTeam, buyingTeam) {
  const sellerTier = getClubTier(sellingTeam?.name);
  const buyerTier = getClubTier(buyingTeam?.name);
  const tierDiff = sellerTier - buyerTier;
  
  // === BASE: tier difference ===
  let score = 50; // 0-100, higher = easier
  score -= tierDiff * 12; // cada tier de diferencia = -12 puntos
  
  // === OVERALL del jugador ===
  // Estrellas son más difíciles de fichar
  if (player.overall >= 90) score -= 25;
  else if (player.overall >= 85) score -= 15;
  else if (player.overall >= 80) score -= 8;
  else if (player.overall <= 70) score += 10;
  else if (player.overall <= 65) score += 18;
  
  // === EDAD ===
  // Jóvenes promesas: más difícil (los clubes no venden)
  // Veteranos: más fácil (los clubes aceptan antes)
  if (player.age <= 21) score -= 10;
  else if (player.age <= 23) score -= 5;
  else if (player.age >= 33) score += 15;
  else if (player.age >= 30) score += 8;
  
  // === CONTRATO ===
  // Contrato largo = difícil; corto = fácil
  const contract = player.contractYears || player.contract || 2;
  if (contract >= 4) score -= 10;
  else if (contract >= 3) score -= 4;
  else if (contract <= 1) score += 15;
  
  // === PERSONALIDAD ===
  const personality = PLAYER_PERSONALITIES[player.personality];
  if (personality) {
    if (personality.name === 'Leal') score -= 12;
    else if (personality.name === 'Ambicioso' && tierDiff > 0) score -= 10;
    else if (personality.name === 'Mercenario') score += 12;
    else if (personality.name === 'Aventurero') score += 8;
    // Profesional y Familiar: neutro
  }
  
  // === VARIACIÓN DETERMINISTA por nombre (cada jugador es único) ===
  const nameHash = (player.name || '').split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const variation = ((nameHash % 20) - 10); // -10 a +9
  score += variation;
  
  // Clamp
  score = Math.max(5, Math.min(95, score));
  
  // === MAPEAR SCORE A DIFICULTAD ===
  let difficulty, color;
  if (score >= 75) {
    difficulty = 'Muy Fácil';
    color = '#30d158';
  } else if (score >= 60) {
    difficulty = 'Fácil';
    color = '#30d158';
  } else if (score >= 40) {
    difficulty = 'Normal';
    color = '#ffd60a';
  } else if (score >= 25) {
    difficulty = 'Difícil';
    color = '#ff9f0a';
  } else if (score >= 12) {
    difficulty = 'Muy Difícil';
    color = '#ff453a';
  } else {
    difficulty = 'Casi Imposible';
    color = '#ff453a';
  }
  
  // === ASKING MULTIPLIER (usado en evaluateClubOffer) ===
  // score 90 → mult 0.95 (te aceptan incluso por debajo del valor)
  // score 50 → mult 1.15 (necesitas +15%)
  // score 20 → mult 1.45 (necesitas +45%)
  // score 5  → mult 1.70 (necesitas +70%)
  const askingMultiplier = 1.70 - (score / 100) * 0.75; // Rango: 0.95 a 1.70
  
  return { difficulty, color, percentage: score, tierDiff, askingMultiplier };
}

export default {
  getClubTier,
  getTierData,
  CLUB_TIERS,
  CLUB_RIVALRIES,
  areRivals,
  PLAYER_PERSONALITIES,
  assignPersonality,
  evaluateClubOffer,
  evaluatePlayerOffer,
  calculateRequiredSalary,
  createNegotiation,
  createFreeAgentNegotiation,
  createPreContractNegotiation,
  sendFreeAgentOffer,
  processFreeAgentResponse,
  sendClubOffer,
  processClubResponse,
  sendPlayerOffer,
  processPlayerResponse,
  calculateTransferDifficulty,
  NEGOTIATION_STATES
};
