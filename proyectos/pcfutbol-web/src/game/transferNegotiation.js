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
            'Alavés', 'Las Palmas', 'Espanyol', 'Valladolid', 'Leganés',
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
 * Asignar personalidad aleatoria a un jugador
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
  let random = Math.random() * total;
  
  for (const [personality, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return personality;
    }
  }
  
  return 'professional';
}

// ============================================================
// NEGOCIACIÓN CON EL CLUB
// ============================================================

/**
 * Evaluar oferta del club comprador
 * @returns {object} { accepted, counter, reason }
 */
export function evaluateClubOffer(offer, player, sellingTeam, buyingTeam) {
  const marketValue = calculateMarketValue(player);
  const sellerTier = getClubTier(sellingTeam.name);
  const buyerTier = getClubTier(buyingTeam.name);
  const sellerProfile = TEAM_PROFILES[Object.keys(TEAM_PROFILES).find(k => 
    TEAM_PROFILES[k].teams?.includes(sellingTeam.name)
  ) || 'lowTable'];
  
  // Factores que afectan el precio pedido
  let askingMultiplier = 1.0;
  
  // Si el comprador es de tier inferior, piden más (no quieren vender ahí)
  if (buyerTier < sellerTier) {
    askingMultiplier += (sellerTier - buyerTier) * 0.15;
  }
  
  // Si el jugador es titular/clave, piden más
  const isKeyPlayer = player.overall >= 80 || player.role?.name === 'Capitán';
  if (isKeyPlayer) {
    askingMultiplier += 0.25;
  }
  
  // Si tiene contrato largo, piden más
  if ((player.contractYears || 2) >= 4) {
    askingMultiplier += 0.15;
  }
  
  // Reluctancia a vender del club
  askingMultiplier += sellerProfile.sellReluctance * 0.2;
  
  const askingPrice = Math.round(marketValue * askingMultiplier);
  const offerRatio = offer.amount / askingPrice;
  
  // Evaluar oferta
  if (offerRatio >= 1.15) {
    // Oferta muy generosa - aceptar
    return { 
      accepted: true, 
      reason: 'Oferta irrechazable',
      finalPrice: offer.amount
    };
  }
  
  if (offerRatio >= 0.95) {
    // Oferta buena - 80% aceptar
    if (Math.random() < 0.8) {
      return { 
        accepted: true, 
        reason: 'Oferta aceptable',
        finalPrice: offer.amount
      };
    }
  }
  
  if (offerRatio >= 0.75) {
    // Oferta razonable - contraoferta
    const counterPrice = Math.round(askingPrice * (0.95 + Math.random() * 0.1));
    return {
      accepted: false,
      counter: counterPrice,
      reason: `Queremos ${formatTransferPrice(counterPrice)}`,
      minAcceptable: Math.round(askingPrice * 0.9)
    };
  }
  
  if (offerRatio >= 0.5) {
    // Oferta baja - contraoferta más agresiva
    const counterPrice = Math.round(askingPrice * (1.05 + Math.random() * 0.15));
    return {
      accepted: false,
      counter: counterPrice,
      reason: `Oferta insuficiente. Mínimo ${formatTransferPrice(counterPrice)}`,
      minAcceptable: askingPrice
    };
  }
  
  // Oferta ridícula - rechazar
  return {
    accepted: false,
    rejected: true,
    reason: 'Oferta irrisoria, no negociamos',
    minAcceptable: askingPrice
  };
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
    // Cada tier de bajada = +30-50% más de salario
    const tierPenalty = tierDiff * (0.3 + Math.random() * 0.2);
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
  FAILED: 'failed'              // Fichaje fallido
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
 * Calcular dificultad del fichaje (para UI)
 */
export function calculateTransferDifficulty(player, sellingTeam, buyingTeam) {
  const sellerTier = getClubTier(sellingTeam.name);
  const buyerTier = getClubTier(buyingTeam.name);
  const tierDiff = sellerTier - buyerTier;
  
  let difficulty = 'Normal';
  let color = '#ffd60a';
  let percentage = 50;
  
  if (tierDiff >= 2) {
    difficulty = 'Muy Difícil';
    color = '#ff453a';
    percentage = 15;
  } else if (tierDiff === 1) {
    difficulty = 'Difícil';
    color = '#ff9f0a';
    percentage = 35;
  } else if (tierDiff === 0) {
    difficulty = 'Normal';
    color = '#ffd60a';
    percentage = 55;
  } else if (tierDiff === -1) {
    difficulty = 'Fácil';
    color = '#30d158';
    percentage = 70;
  } else {
    difficulty = 'Muy Fácil';
    color = '#30d158';
    percentage = 85;
  }
  
  // Ajustar por overall del jugador
  if (player.overall >= 85) {
    percentage -= 15;
  } else if (player.overall >= 80) {
    percentage -= 8;
  }
  
  // Ajustar por personalidad si la conocemos
  const personality = PLAYER_PERSONALITIES[player.personality];
  if (personality) {
    if (tierDiff > 0 && personality.name === 'Ambicioso') {
      percentage -= 15;
      difficulty = percentage < 25 ? 'Casi Imposible' : difficulty;
    }
    if (personality.name === 'Mercenario') {
      percentage += 10;
    }
  }
  
  percentage = Math.max(5, Math.min(90, percentage));
  
  return { difficulty, color, percentage, tierDiff };
}

export default {
  getClubTier,
  getTierData,
  CLUB_TIERS,
  PLAYER_PERSONALITIES,
  assignPersonality,
  evaluateClubOffer,
  evaluatePlayerOffer,
  calculateRequiredSalary,
  createNegotiation,
  sendClubOffer,
  processClubResponse,
  sendPlayerOffer,
  processPlayerResponse,
  calculateTransferDifficulty,
  NEGOTIATION_STATES
};
