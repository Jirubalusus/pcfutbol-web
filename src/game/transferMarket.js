// ============================================================
// TRANSFER MARKET ENGINE - Sistema Completo de Fichajes
// ============================================================
// Incluye: Préstamos, Ofertas entrantes IA, Negociación con jugador,
// Deadline Day, Cláusulas, Guerras de ofertas

import { PERSONALITIES, evaluateTransferOffer, calculatePlayerHappiness } from './playerPersonality.js';

// ============================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================

export const TRANSFER_WINDOWS = {
  summer: { start: { month: 7, day: 1 }, end: { month: 8, day: 31 }, name: 'Mercado de Verano' },
  winter: { start: { month: 1, day: 1 }, end: { month: 1, day: 31 }, name: 'Mercado de Invierno' }
};

export const LOAN_TYPES = {
  standard: { name: 'Cesión', hasOption: false, hasMandatory: false },
  withOption: { name: 'Cesión con opción', hasOption: true, hasMandatory: false },
  withMandatory: { name: 'Cesión con obligación', hasOption: false, hasMandatory: true },
  withWageSplit: { name: 'Cesión compartiendo salario', wageSplit: true }
};

export const OFFER_STATUS = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  countered: 'countered',
  playerRejected: 'player_rejected',
  expired: 'expired',
  withdrawn: 'withdrawn'
};

export const DEADLINE_DAY_HOURS = {
  normal: { urgencyMultiplier: 1.0, responseTime: 48 }, // horas
  lastWeek: { urgencyMultiplier: 1.2, responseTime: 24 },
  lastDay: { urgencyMultiplier: 1.5, responseTime: 6 },
  lastHours: { urgencyMultiplier: 2.0, responseTime: 1 }
};

export const AGENT_TYPES = {
  mendes: { name: 'Jorge Mendes', fee: 0.15, greed: 0.9, influence: 0.95, network: ['portugal', 'spain'] },
  raiola_legacy: { name: 'Rafaela Pimenta', fee: 0.12, greed: 0.85, influence: 0.9, network: ['italy', 'netherlands'] },
  zahavi: { name: 'Pini Zahavi', fee: 0.10, greed: 0.8, influence: 0.85, network: ['israel', 'eastern_europe'] },
  barnett: { name: 'Jonathan Barnett', fee: 0.08, greed: 0.7, influence: 0.8, network: ['england', 'wales'] },
  generic: { name: 'Agente', fee: 0.05, greed: 0.5, influence: 0.5, network: [] },
  familyMember: { name: 'Familiar', fee: 0.03, greed: 0.3, influence: 0.3, network: [] },
  noAgent: { name: 'Sin agente', fee: 0, greed: 0, influence: 0.2, network: [] }
};

export const CLAUSE_TYPES = {
  release: 'Cláusula de rescisión',
  relegation: 'Cláusula por descenso',
  promotion: 'Bonus por ascenso',
  appearances: 'Bonus por partidos',
  goals: 'Bonus por goles',
  titles: 'Bonus por títulos',
  sell_on: 'Porcentaje de futura venta',
  loyalty: 'Bonus de fidelidad',
  image_rights: 'Derechos de imagen'
};

// ============================================================
// CLASE PRINCIPAL: TransferMarket
// ============================================================

export class TransferMarket {
  constructor(gameState) {
    this.gameState = gameState;
    this.offers = [];
    this.loanOffers = [];
    this.rumors = [];
    this.completedDeals = [];
    this.deadlineDayActive = false;
    this.currentHour = 12; // Para deadline day
  }

  // ============================================================
  // 1. SISTEMA DE PRÉSTAMOS
  // ============================================================

  /**
   * Crear oferta de préstamo
   */
  createLoanOffer({
    playerId,
    fromTeamId,
    toTeamId,
    duration = 12, // meses (6, 12, 18, 24)
    loanFee = 0,
    wageSplit = 100, // % que paga el equipo que recibe
    buyOption = null, // { amount, mandatory: false }
    conditions = [] // ['minutes_bonus', 'goals_bonus', etc.]
  }) {
    const player = this.getPlayer(playerId);
    const fromTeam = this.getTeam(fromTeamId);
    const toTeam = this.getTeam(toTeamId);

    if (!player || !fromTeam || !toTeam) {
      return { success: false, error: 'Datos inválidos' };
    }

    // Validaciones
    if (player.age > 32 && duration > 12) {
      return { success: false, error: 'Jugadores mayores de 32 solo pueden cederse por una temporada' };
    }

    if (player.onLoan) {
      return { success: false, error: 'El jugador ya está cedido' };
    }

    // Calcular coste total para el equipo receptor
    const annualWage = player.salary * 52;
    const wageCost = (annualWage * (duration / 12)) * (wageSplit / 100);
    const totalCost = loanFee + wageCost;

    if (toTeam.budget < totalCost * 0.3) { // Necesita al menos 30% del coste
      return { success: false, error: 'Presupuesto insuficiente' };
    }

    const offer = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'loan',
      playerId,
      playerName: player.name,
      fromTeamId,
      fromTeamName: fromTeam.name,
      toTeamId,
      toTeamName: toTeam.name,
      duration,
      loanFee,
      wageSplit,
      buyOption,
      conditions,
      status: OFFER_STATUS.pending,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.getResponseTime() * 3600000,
      negotiations: [],
      playerResponse: null
    };

    this.loanOffers.push(offer);
    this.createRumor(offer, 'loan_interest');

    return { success: true, offer };
  }

  /**
   * Responder a oferta de préstamo (club)
   */
  respondToLoanOffer(offerId, response, counterTerms = null) {
    const offer = this.loanOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== OFFER_STATUS.pending) {
      return { success: false, error: 'Oferta no válida' };
    }

    if (response === 'accept') {
      // Ahora toca negociar con el jugador
      const playerDecision = this.negotiateWithPlayerForLoan(offer);
      
      if (playerDecision.accepts) {
        return this.executeLoan(offer);
      } else {
        offer.status = OFFER_STATUS.playerRejected;
        offer.playerResponse = playerDecision;
        return { 
          success: false, 
          error: 'El jugador ha rechazado la cesión',
          playerReasons: playerDecision.reasons
        };
      }
    } else if (response === 'reject') {
      offer.status = OFFER_STATUS.rejected;
      return { success: true, message: 'Oferta rechazada' };
    } else if (response === 'counter' && counterTerms) {
      offer.status = OFFER_STATUS.countered;
      offer.negotiations.push({
        type: 'counter',
        from: offer.fromTeamId,
        terms: counterTerms,
        timestamp: Date.now()
      });
      return { success: true, message: 'Contraoferta enviada', newTerms: counterTerms };
    }

    return { success: false, error: 'Respuesta no válida' };
  }

  /**
   * Negociar préstamo con jugador
   */
  negotiateWithPlayerForLoan(offer) {
    const player = this.getPlayer(offer.playerId);
    const fromTeam = this.getTeam(offer.fromTeamId);
    const toTeam = this.getTeam(offer.toTeamId);
    const personality = PERSONALITIES[player.personality?.type || 'professional'];

    let score = 0;
    const reasons = [];

    // Factor minutos: si no juega, quiere irse
    const minutesPlayed = player.personality?.minutesPlayed || 50;
    if (minutesPlayed < 30) {
      score += 40;
      reasons.push({ positive: true, text: '⚽ Necesita minutos de juego' });
    } else if (minutesPlayed < 50) {
      score += 20;
      reasons.push({ positive: true, text: 'Busca más protagonismo' });
    } else if (minutesPlayed >= 70) {
      score -= 25;
      reasons.push({ positive: false, text: 'Ya es titular aquí' });
    }

    // Factor reputación del equipo destino
    const repDiff = (toTeam.reputation || 60) - (fromTeam.reputation || 70);
    if (repDiff > 10) {
      score += 25 * personality.priorities.reputation;
      reasons.push({ positive: true, text: 'Equipo de mayor nivel' });
    } else if (repDiff < -20) {
      score -= 30 * personality.priorities.reputation;
      reasons.push({ positive: false, text: 'Paso atrás deportivo' });
    }

    // Factor edad y desarrollo
    if (player.age <= 23) {
      score += 20; // Jóvenes quieren jugar
      reasons.push({ positive: true, text: 'Necesita experiencia' });
    } else if (player.age >= 30) {
      score -= 15; // Veteranos prefieren estabilidad
      reasons.push({ positive: false, text: 'Prefiere estabilidad' });
    }

    // Factor objetivo especial
    if (player.personality?.specialGoal === 'worldCup' && minutesPlayed < 60) {
      score += 35;
      reasons.push({ positive: true, text: '🌍 Necesita jugar para ir al Mundial' });
    }
    if (player.personality?.specialGoal === 'breakThrough') {
      score += 25;
      reasons.push({ positive: true, text: '⭐ Quiere demostrar su valía' });
    }

    // Factor lealtad
    const yearsAtClub = player.personality?.loyaltyYears || 0;
    if (yearsAtClub >= 5 && personality.priorities.loyalty) {
      score -= 20 * personality.priorities.loyalty;
      reasons.push({ positive: false, text: '❤️ Muy arraigado al club' });
    }

    // Factor felicidad actual
    const happiness = player.personality?.happiness || 50;
    if (happiness <= 35) {
      score += 30;
      reasons.push({ positive: true, text: '😤 Descontento con su situación' });
    } else if (happiness >= 75) {
      score -= 20;
      reasons.push({ positive: false, text: '😊 Feliz en el club' });
    }

    // Opción de compra atractiva
    if (offer.buyOption && offer.buyOption.mandatory) {
      if ((toTeam.reputation || 60) > (fromTeam.reputation || 70)) {
        score += 15;
        reasons.push({ positive: true, text: 'Puede ser traspaso definitivo' });
      }
    }

    const probability = Math.max(10, Math.min(90, 50 + score));
    const accepts = Math.random() * 100 < probability;

    return {
      accepts,
      probability,
      reasons,
      score
    };
  }

  /**
   * Ejecutar préstamo
   */
  executeLoan(offer) {
    const player = this.getPlayer(offer.playerId);
    const fromTeam = this.getTeam(offer.fromTeamId);
    const toTeam = this.getTeam(offer.toTeamId);

    // Registrar préstamo
    player.onLoan = true;
    player.loanDetails = {
      originalTeamId: offer.fromTeamId,
      currentTeamId: offer.toTeamId,
      startDate: Date.now(),
      endDate: Date.now() + offer.duration * 30 * 24 * 3600000,
      fee: offer.loanFee,
      wageSplit: offer.wageSplit,
      buyOption: offer.buyOption,
      conditions: offer.conditions
    };

    // Mover jugador temporalmente
    player.teamId = offer.toTeamId;

    // Transacciones económicas
    if (offer.loanFee > 0) {
      toTeam.budget -= offer.loanFee;
      fromTeam.budget += offer.loanFee;
    }

    offer.status = OFFER_STATUS.accepted;
    this.completedDeals.push({
      ...offer,
      completedAt: Date.now(),
      type: 'loan'
    });

    this.createRumor(offer, 'loan_completed');

    return {
      success: true,
      message: `${player.name} cedido al ${toTeam.name}`,
      deal: offer
    };
  }

  /**
   * Procesar fin de préstamo
   */
  processLoanEnd(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.onLoan) return null;

    const loanDetails = player.loanDetails;
    const originalTeam = this.getTeam(loanDetails.originalTeamId);
    const currentTeam = this.getTeam(loanDetails.currentTeamId);

    // Verificar opción/obligación de compra
    if (loanDetails.buyOption) {
      if (loanDetails.buyOption.mandatory) {
        // Obligación de compra - ejecutar automáticamente
        return this.executeBuyOption(player, loanDetails);
      } else {
        // Opción de compra - el equipo decide
        return {
          type: 'option_available',
          player,
          amount: loanDetails.buyOption.amount,
          deadline: Date.now() + 7 * 24 * 3600000 // 7 días para decidir
        };
      }
    }

    // Volver al equipo original
    player.teamId = loanDetails.originalTeamId;
    player.onLoan = false;
    player.loanDetails = null;

    return {
      type: 'returned',
      player,
      to: originalTeam.name
    };
  }

  /**
   * Ejecutar opción de compra
   */
  executeBuyOption(player, loanDetails) {
    const originalTeam = this.getTeam(loanDetails.originalTeamId);
    const buyingTeam = this.getTeam(loanDetails.currentTeamId);
    const amount = loanDetails.buyOption.amount;

    if (buyingTeam.budget < amount) {
      // No puede pagar - vuelve
      player.teamId = loanDetails.originalTeamId;
      player.onLoan = false;
      player.loanDetails = null;
      return { type: 'option_failed', reason: 'budget' };
    }

    // Ejecutar compra
    buyingTeam.budget -= amount;
    originalTeam.budget += amount;
    player.onLoan = false;
    player.loanDetails = null;
    // player.teamId ya es el del equipo comprador

    this.completedDeals.push({
      type: 'buy_option_exercised',
      playerId: player.id,
      playerName: player.name,
      fromTeamId: loanDetails.originalTeamId,
      toTeamId: loanDetails.currentTeamId,
      amount,
      completedAt: Date.now()
    });

    return {
      type: 'option_exercised',
      player,
      amount,
      by: buyingTeam.name
    };
  }

  // ============================================================
  // 2. OFERTAS ENTRANTES (IA)
  // ============================================================

  /**
   * Generar ofertas de IA por jugadores del equipo del jugador
   */
  generateAIOffers(playerTeamId) {
    const playerTeam = this.getTeam(playerTeamId);
    if (!playerTeam) return [];

    const generatedOffers = [];
    const allTeams = this.getAllTeams().filter(t => t.id !== playerTeamId);

    // Evaluar cada jugador del equipo
    for (const playerId of playerTeam.playerIds || []) {
      const player = this.getPlayer(playerId);
      if (!player) continue;

      // Probabilidad de recibir oferta basada en calidad
      const offerChance = this.calculateOfferChance(player, playerTeam);
      
      if (Math.random() < offerChance) {
        // Seleccionar equipo interesado
        const interestedTeams = this.findInterestedTeams(player, allTeams);
        
        for (const team of interestedTeams.slice(0, 2)) { // Max 2 ofertas por jugador
          const offer = this.generateAIOffer(player, playerTeam, team);
          if (offer) {
            generatedOffers.push(offer);
            this.offers.push(offer);
            this.createRumor(offer, 'incoming_interest');
          }
        }
      }
    }

    return generatedOffers;
  }

  /**
   * Calcular probabilidad de recibir oferta
   */
  calculateOfferChance(player, team) {
    let chance = 0.05; // Base 5%

    // Factor overall
    if (player.overall >= 85) chance += 0.25;
    else if (player.overall >= 80) chance += 0.15;
    else if (player.overall >= 75) chance += 0.08;
    else if (player.overall >= 70) chance += 0.03;

    // Factor edad (jóvenes más demandados)
    if (player.age <= 23) chance += 0.12;
    else if (player.age <= 26) chance += 0.08;
    else if (player.age >= 32) chance -= 0.05;

    // Factor rendimiento (si tiene stats)
    if (player.seasonStats) {
      if (player.seasonStats.goals >= 15) chance += 0.15;
      else if (player.seasonStats.goals >= 10) chance += 0.08;
      if (player.seasonStats.assists >= 10) chance += 0.08;
    }

    // Factor felicidad (infelices = más ofertas porque se rumorea)
    if (player.personality?.happiness <= 40) {
      chance += 0.10;
    }
    if (player.personality?.wantsToLeave) {
      chance += 0.20;
    }

    // Factor liga del equipo (equipos de ligas bajas reciben más ofertas)
    const leagueLevel = team.leagueLevel || 1;
    chance += (leagueLevel - 1) * 0.05;

    // Deadline day multiplica chances
    if (this.deadlineDayActive) {
      chance *= 1.5;
    }

    return Math.min(0.6, chance); // Max 60%
  }

  /**
   * Encontrar equipos interesados en un jugador
   */
  findInterestedTeams(player, allTeams) {
    const validTeams = allTeams.filter(team => {
      // Puede permitirse el salario
      const annualWage = player.salary * 52 * 1.2; // Asumen que pedirá más
      if ((team.wageBudget || team.budget * 0.5) < annualWage) return false;

      // Puede permitirse el traspaso (aproximado)
      const estimatedFee = this.calculateMarketValue(player) * 0.8;
      if (team.budget < estimatedFee) return false;

      // Necesita esa posición o es muy bueno
      const hasNeed = this.teamNeedsPosition(team, player.position);
      const isExceptional = player.overall >= 80;

      return hasNeed || isExceptional;
    });

    // Ordenar por probabilidad de interés
    return validTeams
      .map(team => ({
        team,
        interest: this.calculateTeamInterest(team, player)
      }))
      .filter(t => t.interest > 0.3)
      .sort((a, b) => b.interest - a.interest)
      .map(t => t.team);
  }

  /**
   * Calcular interés de un equipo en un jugador
   */
  calculateTeamInterest(team, player) {
    let interest = 0.5;

    // Necesidad posicional
    if (this.teamNeedsPosition(team, player.position)) {
      interest += 0.25;
    }

    // Mejora sobre lo que tienen
    const bestInPosition = this.getBestPlayerInPosition(team, player.position);
    if (!bestInPosition || player.overall > bestInPosition.overall) {
      interest += 0.2;
    }

    // Reputación del equipo vs calidad del jugador
    const repDiff = (team.reputation || 70) - player.overall;
    if (repDiff > 5) interest -= 0.15; // Equipo grande, jugador pequeño
    if (repDiff < -5) interest += 0.1; // Jugador estrella para el equipo

    // Presupuesto disponible
    const budgetRatio = team.budget / this.calculateMarketValue(player);
    if (budgetRatio > 3) interest += 0.1;
    if (budgetRatio < 1) interest -= 0.3;

    return Math.max(0, Math.min(1, interest));
  }

  /**
   * Generar oferta de IA
   */
  generateAIOffer(player, sellingTeam, buyingTeam) {
    const marketValue = this.calculateMarketValue(player);
    
    // IA calcula cuánto ofrecer
    let offerMultiplier = 0.75 + Math.random() * 0.3; // 75-105% del valor

    // Ajustes según situación
    if (player.personality?.wantsToLeave) {
      offerMultiplier -= 0.1; // Saben que quiere irse
    }
    if (this.deadlineDayActive) {
      offerMultiplier += 0.15; // Urgencia
    }
    if (buyingTeam.reputation > sellingTeam.reputation + 15) {
      offerMultiplier -= 0.1; // Equipo grande, menos urgencia
    }

    const offerAmount = Math.round(marketValue * offerMultiplier);

    // Propuesta salarial
    const currentSalary = player.salary || 10000;
    let salaryOffer = currentSalary * (1.1 + Math.random() * 0.3); // 10-40% más
    if (buyingTeam.reputation > sellingTeam.reputation + 10) {
      salaryOffer *= 1.2; // Equipos grandes pagan más
    }

    // Contrato
    let contractYears = 4;
    if (player.age >= 30) contractYears = 2;
    else if (player.age >= 28) contractYears = 3;
    else if (player.age <= 22) contractYears = 5;

    const offer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'transfer',
      playerId: player.id,
      playerName: player.name,
      fromTeamId: sellingTeam.id,
      fromTeamName: sellingTeam.name,
      toTeamId: buyingTeam.id,
      toTeamName: buyingTeam.name,
      amount: offerAmount,
      salaryOffer: Math.round(salaryOffer),
      contractYears,
      status: OFFER_STATUS.pending,
      isAIOffer: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.getResponseTime() * 3600000,
      negotiations: [],
      urgency: this.deadlineDayActive ? 'high' : 'normal'
    };

    return offer;
  }

  /**
   * Manejar guerra de ofertas
   */
  handleBiddingWar(playerId) {
    const activeOffers = this.offers.filter(o => 
      o.playerId === playerId && 
      o.status === OFFER_STATUS.pending
    );

    if (activeOffers.length < 2) return null;

    // Ordenar por cantidad
    activeOffers.sort((a, b) => b.amount - a.amount);

    // Notificar a todos los equipos de la competencia
    const biddingWar = {
      playerId,
      playerName: activeOffers[0].playerName,
      offers: activeOffers.map(o => ({
        teamId: o.toTeamId,
        teamName: o.toTeamName,
        amount: o.amount
      })),
      highestBid: activeOffers[0].amount,
      deadline: Math.min(...activeOffers.map(o => o.expiresAt))
    };

    // IA puede subir ofertas
    for (const offer of activeOffers.slice(1)) { // Todos menos el más alto
      const team = this.getTeam(offer.toTeamId);
      if (!team) continue; // Skip if team not found
      
      const canAffordMore = team.budget > offer.amount * 1.15;
      const wantsToRaise = Math.random() < 0.6; // 60% de subir

      if (canAffordMore && wantsToRaise) {
        const newAmount = Math.round(biddingWar.highestBid * (1.05 + Math.random() * 0.1));
        offer.amount = newAmount;
        offer.negotiations = offer.negotiations || [];
        offer.negotiations.push({
          type: 'raise',
          amount: newAmount,
          timestamp: Date.now()
        });
        this.createRumor({ ...offer, amount: newAmount }, 'bid_raised');
        
        // Update bidding war with new amount
        const warOffer = biddingWar.offers.find(o => o.teamId === offer.toTeamId);
        if (warOffer) warOffer.amount = newAmount;
        if (newAmount > biddingWar.highestBid) {
          biddingWar.highestBid = newAmount;
        }
      }
    }

    // Re-sort offers after raises
    biddingWar.offers.sort((a, b) => b.amount - a.amount);

    return biddingWar;
  }

  // ============================================================
  // 3. NEGOCIACIÓN CON JUGADOR
  // ============================================================

  /**
   * Negociar transferencia con jugador (después de que clubes acuerden)
   */
  negotiateWithPlayer(offerId) {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer) return { success: false, error: 'Oferta no encontrada' };

    const player = this.getPlayer(offer.playerId);
    const currentTeam = this.getTeam(offer.fromTeamId);
    const newTeam = this.getTeam(offer.toTeamId);

    // Usar el sistema de personalidad existente
    const evaluation = evaluateTransferOffer(
      player,
      currentTeam,
      newTeam,
      {
        salary: offer.salaryOffer,
        promisedRole: offer.promisedRole || 'rotation',
        contractYears: offer.contractYears
      }
    );

    // Añadir factores adicionales
    let adjustedScore = evaluation.score;
    const additionalReasons = [];

    // Factor cláusula de rescisión (si existe y se paga, el jugador DEBE negociar)
    if (offer.isReleaseClause) {
      adjustedScore += 30;
      additionalReasons.push({ 
        positive: true, 
        text: '📋 Se ha pagado la cláusula - obligado a negociar' 
      });
    }

    // Factor deadline day
    if (this.deadlineDayActive) {
      if (player.personality?.wantsToLeave) {
        adjustedScore += 20;
        additionalReasons.push({ 
          positive: true, 
          text: '⏰ Última oportunidad de salir' 
        });
      } else {
        adjustedScore -= 10;
        additionalReasons.push({ 
          positive: false, 
          text: '⏰ Demasiada presión, prefiere esperar' 
        });
      }
    }

    // Factor proyecto deportivo
    if (newTeam.recentResults) {
      if (newTeam.recentResults.leaguePosition <= 3) {
        adjustedScore += 15;
        additionalReasons.push({ 
          positive: true, 
          text: '🏆 Equipo puntero luchando por títulos' 
        });
      } else if (newTeam.recentResults.leaguePosition >= 15) {
        adjustedScore -= 20;
        additionalReasons.push({ 
          positive: false, 
          text: '📉 Equipo en mala situación deportiva' 
        });
      }
    }

    // Calcular probabilidad final
    const finalProbability = Math.max(5, Math.min(95, 50 + adjustedScore));
    const allReasons = [...evaluation.reasons, ...additionalReasons];

    // Determinar respuesta
    let response;
    let counterDemand = null;

    if (finalProbability >= 70) {
      response = 'accept';
    } else if (finalProbability >= 35) {
      response = 'negotiate';
      // Generar contra-demanda
      counterDemand = this.generatePlayerCounterDemand(player, offer, finalProbability);
    } else {
      response = 'reject';
    }

    // Actualizar oferta
    offer.playerNegotiation = {
      response,
      probability: finalProbability,
      reasons: allReasons,
      counterDemand,
      timestamp: Date.now()
    };

    if (response === 'reject') {
      offer.status = OFFER_STATUS.playerRejected;
    }

    return {
      success: true,
      response,
      probability: finalProbability,
      reasons: allReasons,
      counterDemand
    };
  }

  /**
   * Generar contra-demanda del jugador
   */
  generatePlayerCounterDemand(player, offer, currentProbability) {
    const personality = PERSONALITIES[player.personality?.type || 'professional'];
    const gap = 70 - currentProbability; // Cuánto falta para aceptar

    const demand = {
      salary: offer.salaryOffer,
      contractYears: offer.contractYears,
      signingBonus: 0,
      releaseClause: null,
      conditions: []
    };

    // Más salario
    const salaryIncrease = 1 + (gap * 0.01) + (personality.priorities.money * 0.1);
    demand.salary = Math.round(offer.salaryOffer * salaryIncrease);

    // Prima de fichaje
    if (gap > 20 || personality.priorities.money > 1.5) {
      demand.signingBonus = Math.round(offer.amount * 0.1); // 10% del traspaso
    }

    // Cláusula de rescisión (para poder irse si no va bien)
    if (player.overall >= 80 || player.age <= 24) {
      demand.releaseClause = Math.round(offer.amount * 2.5);
    }

    // Condiciones especiales
    if (player.personality?.specialGoal === 'worldCup') {
      demand.conditions.push({
        type: 'minutes_guarantee',
        text: 'Garantía de minutos (60%+ de partidos)',
        required: true
      });
    }

    if (personality.type === 'competitor') {
      demand.conditions.push({
        type: 'starter_promise',
        text: 'Promesa de titularidad',
        required: false
      });
    }

    // Años de contrato
    if (player.age <= 25) {
      demand.contractYears = Math.max(offer.contractYears, 4);
    } else if (player.age >= 30 && personality.priorities.money > 1) {
      demand.contractYears = Math.max(offer.contractYears, 3); // Quiere seguridad
    }

    return demand;
  }

  /**
   * Responder a contra-demanda del jugador
   */
  respondToPlayerDemand(offerId, response, adjustedTerms = null) {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer || !offer.playerNegotiation) {
      return { success: false, error: 'Negociación no encontrada' };
    }

    if (response === 'accept') {
      // Aceptamos las demandas del jugador
      const demand = offer.playerNegotiation.counterDemand;
      offer.salaryOffer = demand.salary;
      offer.contractYears = demand.contractYears;
      offer.signingBonus = demand.signingBonus;
      offer.releaseClause = demand.releaseClause;
      offer.playerConditions = demand.conditions;
      
      return this.executeTransfer(offer);
    } else if (response === 'counter' && adjustedTerms) {
      // Proponemos términos intermedios
      return this.continuePlayerNegotiation(offer, adjustedTerms);
    } else if (response === 'withdraw') {
      offer.status = OFFER_STATUS.withdrawn;
      return { success: true, message: 'Negociación cancelada' };
    }

    return { success: false, error: 'Respuesta no válida' };
  }

  /**
   * Continuar negociación con jugador
   */
  continuePlayerNegotiation(offer, newTerms) {
    const player = this.getPlayer(offer.playerId);
    const demand = offer.playerNegotiation.counterDemand;

    // Calcular cuánto nos acercamos a sus demandas
    let satisfactionScore = 0;

    // Salario
    const salaryRatio = newTerms.salary / demand.salary;
    if (salaryRatio >= 1) satisfactionScore += 30;
    else if (salaryRatio >= 0.9) satisfactionScore += 20;
    else if (salaryRatio >= 0.8) satisfactionScore += 10;
    else satisfactionScore -= 10;

    // Prima de fichaje
    if (demand.signingBonus > 0) {
      const bonusRatio = (newTerms.signingBonus || 0) / demand.signingBonus;
      if (bonusRatio >= 1) satisfactionScore += 15;
      else if (bonusRatio >= 0.5) satisfactionScore += 5;
      else satisfactionScore -= 5;
    }

    // Condiciones aceptadas
    const acceptedConditions = (newTerms.acceptedConditions || []).length;
    const totalConditions = demand.conditions.filter(c => c.required).length;
    if (totalConditions > 0) {
      if (acceptedConditions >= totalConditions) satisfactionScore += 20;
      else satisfactionScore -= 15;
    }

    // Paciencia del jugador (cada ronda reduce)
    const negotiationRounds = offer.playerNegotiation.rounds || 0;
    satisfactionScore -= negotiationRounds * 5;

    // Deadline day aumenta urgencia del jugador también
    if (this.deadlineDayActive && player.personality?.wantsToLeave) {
      satisfactionScore += 15;
    }

    const newProbability = Math.max(5, Math.min(95, 50 + satisfactionScore));
    
    offer.playerNegotiation.rounds = negotiationRounds + 1;
    offer.playerNegotiation.probability = newProbability;
    offer.playerNegotiation.lastOffer = newTerms;

    if (newProbability >= 65) {
      // Acepta
      offer.salaryOffer = newTerms.salary;
      offer.signingBonus = newTerms.signingBonus;
      offer.playerConditions = newTerms.acceptedConditions || [];
      return this.executeTransfer(offer);
    } else if (negotiationRounds >= 3) {
      // Demasiadas rondas, se cansa
      offer.status = OFFER_STATUS.playerRejected;
      return { 
        success: false, 
        error: 'El jugador se ha cansado de negociar',
        message: `${player.name} ha decidido quedarse tras ${negotiationRounds} rondas sin acuerdo`
      };
    } else {
      // Sigue negociando pero ajusta demandas ligeramente
      const adjustedDemand = { ...demand };
      adjustedDemand.salary = Math.round(demand.salary * 0.95);
      if (adjustedDemand.signingBonus) {
        adjustedDemand.signingBonus = Math.round(demand.signingBonus * 0.9);
      }
      offer.playerNegotiation.counterDemand = adjustedDemand;

      return {
        success: true,
        status: 'negotiating',
        probability: newProbability,
        newDemand: adjustedDemand,
        message: 'El jugador ha rebajado ligeramente sus pretensiones'
      };
    }
  }

  // ============================================================
  // 4. DEADLINE DAY
  // ============================================================

  /**
   * Iniciar Deadline Day
   */
  startDeadlineDay() {
    this.deadlineDayActive = true;
    this.currentHour = 8; // Empieza a las 8:00
    this.deadlineDayEvents = [];

    // Generar oleada inicial de ofertas
    this.generateDeadlineDayOffers();

    return {
      active: true,
      startHour: 8,
      endHour: 23,
      message: '⏰ ¡DEADLINE DAY! El mercado cierra a las 23:00'
    };
  }

  /**
   * Avanzar hora en Deadline Day
   */
  advanceDeadlineDayHour() {
    if (!this.deadlineDayActive) return null;

    this.currentHour++;
    
    // Verificar cierre ANTES de procesar eventos
    if (this.currentHour >= 23) {
      return this.endDeadlineDay();
    }

    const hoursRemaining = 23 - this.currentHour;
    const events = [];

    // Generar eventos según la hora
    if (this.currentHour >= 20) {
      // Últimas 3 horas - caos
      events.push(...this.generateLastMinuteOffers());
      events.push(...this.processDesperateDecisions());
    } else if (this.currentHour >= 16) {
      // Tarde - negociaciones intensas
      events.push(...this.accelerateNegotiations());
    } else if (this.currentHour >= 12) {
      // Mediodía - actividad normal aumentada
      events.push(...this.generateDeadlineDayOffers(0.3));
    }

    // Actualizar urgencia de todas las ofertas
    this.updateOfferUrgency();

    return {
      active: true,
      hour: this.currentHour,
      hoursRemaining,
      events,
      urgencyLevel: this.getUrgencyLevel(),
      pendingDeals: this.offers.filter(o => o.status === OFFER_STATUS.pending).length
    };
  }

  /**
   * Generar ofertas de Deadline Day
   */
  generateDeadlineDayOffers(multiplier = 0.5) {
    const events = [];
    const playerTeam = this.getPlayerTeam();

    // Ofertas por nuestros jugadores
    if (playerTeam) {
      const aiOffers = this.generateAIOffers(playerTeam.id);
      for (const offer of aiOffers) {
        if (Math.random() < multiplier) {
          events.push({
            type: 'incoming_offer',
            offer,
            message: `📥 ¡${offer.toTeamName} hace una oferta por ${offer.playerName}!`,
            urgent: true
          });
        }
      }
    }

    // Oportunidades de mercado
    const opportunities = this.generateMarketOpportunities();
    for (const opp of opportunities) {
      if (Math.random() < multiplier) {
        events.push({
          type: 'opportunity',
          ...opp,
          message: `💡 Oportunidad: ${opp.playerName} disponible por ${this.formatMoney(opp.price)}`,
          urgent: this.currentHour >= 18
        });
      }
    }

    return events;
  }

  /**
   * Generar ofertas de último minuto
   */
  generateLastMinuteOffers() {
    const events = [];
    const hoursLeft = 23 - this.currentHour;

    // Equipos desesperados hacen ofertas infladas
    const allTeams = this.getAllTeams();
    
    for (const team of allTeams) {
      if (Math.random() < 0.1 * (4 - hoursLeft)) { // Más probable cuanto menos tiempo
        // Buscar jugador aleatorio de otro equipo
        const targetTeam = allTeams[Math.floor(Math.random() * allTeams.length)];
        if (targetTeam.id === team.id) continue;

        const players = (targetTeam.playerIds || []).map(id => this.getPlayer(id)).filter(Boolean);
        if (players.length === 0) continue;

        const targetPlayer = players[Math.floor(Math.random() * players.length)];
        const marketValue = this.calculateMarketValue(targetPlayer);
        const panicPremium = 1.3 + (Math.random() * 0.4); // 130-170% del valor

        const offer = {
          id: `panic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'transfer',
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          fromTeamId: targetTeam.id,
          fromTeamName: targetTeam.name,
          toTeamId: team.id,
          toTeamName: team.name,
          amount: Math.round(marketValue * panicPremium),
          salaryOffer: Math.round((targetPlayer.salary || 10000) * 1.5),
          contractYears: 4,
          status: OFFER_STATUS.pending,
          isAIOffer: true,
          isPanicBuy: true,
          createdAt: Date.now(),
          expiresAt: Date.now() + hoursLeft * 3600000,
          urgency: 'critical'
        };

        this.offers.push(offer);
        events.push({
          type: 'panic_offer',
          offer,
          message: `🚨 ¡OFERTA DE PÁNICO! ${team.name} ofrece ${this.formatMoney(offer.amount)} por ${targetPlayer.name}`,
          urgent: true
        });
      }
    }

    return events;
  }

  /**
   * Procesar decisiones desesperadas
   */
  processDesperateDecisions() {
    const events = [];

    // Jugadores descontentos que piden salir
    const playerTeam = this.getPlayerTeam();
    if (playerTeam) {
      for (const playerId of playerTeam.playerIds || []) {
        const player = this.getPlayer(playerId);
        if (!player) continue;

        if (player.personality?.wantsToLeave && player.personality?.happiness <= 30) {
          const pendingOffersForPlayer = this.offers.filter(o => 
            o.playerId === playerId && o.status === OFFER_STATUS.pending
          );

          if (pendingOffersForPlayer.length > 0) {
            events.push({
              type: 'player_pressure',
              playerId,
              playerName: player.name,
              message: `😤 ${player.name} presiona para aceptar una de las ofertas existentes`,
              offers: pendingOffersForPlayer,
              urgent: true
            });
          }
        }
      }
    }

    // Oportunidades que expiran
    const expiringOffers = this.offers.filter(o => 
      o.status === OFFER_STATUS.pending &&
      o.expiresAt - Date.now() < 2 * 3600000 // Menos de 2 horas
    );

    for (const offer of expiringOffers) {
      events.push({
        type: 'expiring_offer',
        offer,
        message: `⏳ La oferta de ${offer.toTeamName} por ${offer.playerName} expira pronto`,
        urgent: true
      });
    }

    return events;
  }

  /**
   * Acelerar negociaciones en curso
   */
  accelerateNegotiations() {
    const events = [];

    for (const offer of this.offers) {
      if (offer.status !== OFFER_STATUS.pending) continue;

      // Reducir tiempo de respuesta
      if (offer.playerNegotiation && offer.playerNegotiation.response === 'negotiate') {
        // El jugador está más dispuesto a cerrar
        offer.playerNegotiation.probability = Math.min(90, offer.playerNegotiation.probability + 10);
        
        events.push({
          type: 'negotiation_accelerated',
          offer,
          message: `📝 ${offer.playerName} más receptivo a la oferta de ${offer.toTeamName}`,
          newProbability: offer.playerNegotiation.probability
        });
      }
    }

    return events;
  }

  /**
   * Obtener nivel de urgencia actual
   */
  getUrgencyLevel() {
    const hoursLeft = 23 - this.currentHour;
    if (hoursLeft <= 1) return 'critical';
    if (hoursLeft <= 3) return 'high';
    if (hoursLeft <= 6) return 'medium';
    return 'normal';
  }

  /**
   * Actualizar urgencia de ofertas
   */
  updateOfferUrgency() {
    const urgencyLevel = this.getUrgencyLevel();

    for (const offer of this.offers) {
      if (offer.status === OFFER_STATUS.pending) {
        offer.urgency = urgencyLevel;

        // Reducir tiempo de expiración
        const hoursLeft = 23 - this.currentHour;
        offer.expiresAt = Math.min(offer.expiresAt, Date.now() + hoursLeft * 3600000);
      }
    }
  }

  /**
   * Finalizar Deadline Day
   */
  endDeadlineDay() {
    this.deadlineDayActive = false;

    // Rechazar todas las ofertas pendientes
    const expiredOffers = this.offers.filter(o => o.status === OFFER_STATUS.pending);
    for (const offer of expiredOffers) {
      offer.status = OFFER_STATUS.expired;
    }

    const summary = {
      completed: this.completedDeals.filter(d => d.completedAt > Date.now() - 24 * 3600000).length,
      expired: expiredOffers.length,
      totalValue: this.completedDeals
        .filter(d => d.completedAt > Date.now() - 24 * 3600000)
        .reduce((sum, d) => sum + (d.amount || 0), 0)
    };

    return {
      active: false,
      message: '🔔 ¡El mercado ha cerrado!',
      summary
    };
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  /**
   * Ejecutar transferencia
   */
  executeTransfer(offer) {
    const player = this.getPlayer(offer.playerId);
    const fromTeam = this.getTeam(offer.fromTeamId);
    const toTeam = this.getTeam(offer.toTeamId);

    if (!player || !fromTeam || !toTeam) {
      return { success: false, error: 'Datos inválidos' };
    }

    // Transacción económica
    toTeam.budget -= offer.amount;
    if (offer.signingBonus) {
      toTeam.budget -= offer.signingBonus;
    }
    fromTeam.budget += offer.amount;

    // Mover jugador
    fromTeam.playerIds = (fromTeam.playerIds || []).filter(id => id !== player.id);
    toTeam.playerIds = toTeam.playerIds || [];
    toTeam.playerIds.push(player.id);

    // Actualizar jugador
    player.teamId = offer.toTeamId;
    player.salary = offer.salaryOffer;
    player.contractYears = offer.contractYears;
    if (offer.releaseClause) {
      player.releaseClause = offer.releaseClause;
    }

    // Resetear estado emocional
    if (player.personality) {
      player.personality.happiness = 70;
      player.personality.wantsToLeave = false;
      player.personality.loyaltyYears = 0;
    }

    // Registrar
    offer.status = OFFER_STATUS.accepted;
    this.completedDeals.push({
      ...offer,
      completedAt: Date.now(),
      type: 'transfer'
    });

    this.createRumor(offer, 'transfer_completed');

    return {
      success: true,
      message: `✅ ${player.name} fichado por ${this.formatMoney(offer.amount)}`,
      deal: offer
    };
  }

  /**
   * Calcular valor de mercado (REALISTA 2026)
   * Basado en valoraciones reales de Transfermarkt
   */
  calculateMarketValue(player) {
    if (!player) return 0;

    // Tabla de referencia por overall (en millones)
    // Basada en valores reales: Mbappe ~180M, Haaland ~180M, Bellingham ~150M
    // Jugadores de 75 OVR suelen valer 5-15M
    const valueTable = {
      60: 0.2, 62: 0.35, 64: 0.5, 66: 0.8, 68: 1.2,
      70: 2, 72: 3.5, 74: 6, 76: 10, 78: 18,
      80: 30, 82: 45, 84: 65, 86: 90, 88: 120,
      90: 150, 92: 180, 94: 220, 96: 280, 98: 350
    };

    // Interpolar valor base
    const ovr = Math.max(60, Math.min(98, player.overall));
    const lowerOvr = Math.floor(ovr / 2) * 2; // Redondear a par inferior
    const upperOvr = Math.min(98, lowerOvr + 2);
    const fraction = (ovr - lowerOvr) / 2;
    
    const lowerValue = valueTable[lowerOvr] || 0.1;
    const upperValue = valueTable[upperOvr] || lowerValue * 1.5;
    const baseValueMillions = lowerValue + (upperValue - lowerValue) * fraction;
    const baseValue = baseValueMillions * 1000000;

    // Modificador edad (CRÍTICO - la edad es el factor más importante)
    let ageMod = 1;
    if (player.age <= 18) ageMod = 1.8;       // Wonderkids premium
    else if (player.age <= 20) ageMod = 1.6;  // Promesa confirmada
    else if (player.age <= 23) ageMod = 1.4;  // Explosión
    else if (player.age <= 26) ageMod = 1.2;  // Prime temprano
    else if (player.age <= 28) ageMod = 1.0;  // Peak
    else if (player.age <= 30) ageMod = 0.8;  // Madurez tardía
    else if (player.age <= 32) ageMod = 0.55; // Declive
    else if (player.age <= 34) ageMod = 0.3;  // Veterano
    else ageMod = 0.15;                       // Leyenda

    // Modificador posición (atacantes y mediapuntas más caros)
    let posMod = 1;
    if (player.position === 'ST') posMod = 1.2;
    else if (['CAM', 'RW', 'LW'].includes(player.position)) posMod = 1.15;
    else if (['CM'].includes(player.position)) posMod = 1.05;
    else if (['CDM', 'CB'].includes(player.position)) posMod = 0.95;
    else if (['RB', 'LB'].includes(player.position)) posMod = 0.85;
    else if (player.position === 'GK') posMod = 0.65;

    // Modificador contrato
    const contractYears = player.contractYears || 2;
    let contractMod = 1;
    if (contractYears <= 1) contractMod = 0.5;
    else if (contractYears <= 2) contractMod = 0.75;
    else if (contractYears >= 5) contractMod = 1.15;
    else if (contractYears >= 4) contractMod = 1.05;

    // Modificador potencial (para jóvenes)
    let potentialMod = 1;
    if (player.age <= 23 && player.potential) {
      const potentialGap = player.potential - player.overall;
      if (potentialGap >= 10) potentialMod = 1.4;
      else if (potentialGap >= 5) potentialMod = 1.2;
    }

    const finalValue = baseValue * ageMod * posMod * contractMod * potentialMod;
    
    // Mínimo 50K, máximo 400M
    return Math.round(Math.max(50000, Math.min(400000000, finalValue)));
  }

  /**
   * Crear rumor
   */
  createRumor(data, type) {
    const rumor = {
      id: `rumor_${Date.now()}`,
      type,
      data,
      createdAt: Date.now(),
      reliability: 0.5 + Math.random() * 0.4 // 50-90% fiable
    };

    this.rumors.push(rumor);

    // Mantener solo últimos 50 rumores
    if (this.rumors.length > 50) {
      this.rumors = this.rumors.slice(-50);
    }

    return rumor;
  }

  /**
   * Obtener tiempo de respuesta según periodo
   */
  getResponseTime() {
    if (this.deadlineDayActive) {
      const hoursLeft = 23 - this.currentHour;
      if (hoursLeft <= 1) return 0.5; // 30 minutos
      if (hoursLeft <= 3) return 1;
      if (hoursLeft <= 6) return 2;
      return 4;
    }
    return 48; // 48 horas normal
  }

  /**
   * Generar oportunidades de mercado
   */
  generateMarketOpportunities() {
    const opportunities = [];
    const freeAgents = this.getFreeAgents();

    for (const player of freeAgents.slice(0, 5)) {
      opportunities.push({
        type: 'free_agent',
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        overall: player.overall,
        age: player.age,
        price: 0,
        salaryDemand: this.calculateFreeAgentSalary(player)
      });
    }

    return opportunities;
  }

  /**
   * Calcular salario de agente libre
   */
  calculateFreeAgentSalary(player) {
    const baseWeekly = player.overall * 500;
    const ageMod = player.age <= 26 ? 1.2 : player.age >= 32 ? 0.7 : 1;
    return Math.round(baseWeekly * ageMod);
  }

  /**
   * Verificar si equipo necesita posición
   */
  teamNeedsPosition(team, position) {
    const players = (team.playerIds || []).map(id => this.getPlayer(id)).filter(Boolean);
    const inPosition = players.filter(p => p.position === position).length;
    
    const ideal = { 'GK': 2, 'CB': 4, 'RB': 2, 'LB': 2, 'CDM': 2, 'CM': 3, 'CAM': 2, 'RW': 2, 'LW': 2, 'ST': 3 };
    return inPosition < (ideal[position] || 2);
  }

  /**
   * Obtener mejor jugador en posición
   */
  getBestPlayerInPosition(team, position) {
    const players = (team.playerIds || []).map(id => this.getPlayer(id)).filter(Boolean);
    const inPosition = players.filter(p => p.position === position);
    if (inPosition.length === 0) return null;
    return inPosition.reduce((best, p) => p.overall > best.overall ? p : best);
  }

  // ============================================================
  // CLÁUSULAS DE RESCISIÓN
  // ============================================================

  /**
   * Pagar cláusula de rescisión (bypass negotiation con club)
   */
  payReleaseClause(playerId, buyingTeamId) {
    const player = this.getPlayer(playerId);
    const buyingTeam = this.getTeam(buyingTeamId);

    if (!player || !buyingTeam) {
      return { success: false, error: 'Datos inválidos' };
    }

    if (!player.releaseClause) {
      return { success: false, error: 'El jugador no tiene cláusula de rescisión' };
    }

    if (buyingTeam.budget < player.releaseClause) {
      return { success: false, error: 'Presupuesto insuficiente para pagar la cláusula' };
    }

    // Crear oferta automáticamente aceptada por el club
    const sellingTeam = this.getTeam(player.teamId);
    const offer = {
      id: `clause_${Date.now()}`,
      type: 'transfer',
      playerId: player.id,
      playerName: player.name,
      fromTeamId: player.teamId,
      fromTeamName: sellingTeam?.name || 'Desconocido',
      toTeamId: buyingTeamId,
      toTeamName: buyingTeam.name,
      amount: player.releaseClause,
      isReleaseClause: true,
      status: OFFER_STATUS.pending,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600000,
      negotiations: []
    };

    // Calcular salario a ofrecer (el club debe negociar con el jugador)
    const marketValue = this.calculateMarketValue(player);
    offer.salaryOffer = Math.round((player.salary || 10000) * 1.3); // 30% más
    offer.contractYears = player.age <= 26 ? 5 : (player.age >= 30 ? 3 : 4);

    this.offers.push(offer);

    return {
      success: true,
      offer,
      message: `Cláusula de ${this.formatMoney(player.releaseClause)} pagada. Ahora debe negociar con el jugador.`,
      nextStep: 'negotiate_player'
    };
  }

  /**
   * Negociar cláusula de rescisión en renovación
   */
  negotiateReleaseClause(playerId, proposedClause) {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, error: 'Jugador no encontrado' };

    const marketValue = this.calculateMarketValue(player);
    const currentClause = player.releaseClause || marketValue * 3;
    const personality = PERSONALITIES[player.personality?.type || 'professional'];

    // Factor ambición del jugador
    const minAcceptable = marketValue * (1 + personality.priorities.ambition);

    // Factor agente (si tiene)
    const agent = AGENT_TYPES[player.agent || 'generic'];
    const agentInfluence = 1 + (agent.greed * 0.3);

    const finalMinimum = minAcceptable * agentInfluence;

    if (proposedClause < finalMinimum) {
      return {
        success: false,
        error: 'Cláusula demasiado baja',
        demanded: Math.round(finalMinimum * 1.1),
        reasons: [
          proposedClause < marketValue ? 'Por debajo del valor de mercado' : null,
          agent.greed > 0.6 ? `${agent.name} exige una cláusula más alta` : null,
          personality.priorities.ambition > 1 ? 'El jugador tiene grandes ambiciones' : null
        ].filter(Boolean)
      };
    }

    return {
      success: true,
      accepted: proposedClause,
      message: 'Cláusula aceptada'
    };
  }

  // ============================================================
  // SISTEMA DE AGENTES
  // ============================================================

  /**
   * Asignar agente a jugador
   */
  assignAgent(playerId, agentType = 'generic') {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // Probabilidad de tener agente top basada en calidad
    if (agentType === 'auto') {
      if (player.overall >= 88) {
        const topAgents = ['mendes', 'raiola_legacy', 'zahavi', 'barnett'];
        agentType = topAgents[Math.floor(Math.random() * topAgents.length)];
      } else if (player.overall >= 80) {
        agentType = Math.random() < 0.7 ? 'generic' : 'barnett';
      } else if (player.overall >= 70) {
        agentType = Math.random() < 0.3 ? 'generic' : 'familyMember';
      } else {
        agentType = Math.random() < 0.5 ? 'familyMember' : 'noAgent';
      }
    }

    player.agent = agentType;
    return true;
  }

  /**
   * Calcular comisión del agente
   */
  calculateAgentFee(player, transferAmount) {
    const agent = AGENT_TYPES[player.agent || 'generic'];
    const baseFee = transferAmount * agent.fee;

    // Agentes codiciosos piden más en fichajes grandes
    let greedMultiplier = 1;
    if (transferAmount > 50000000 && agent.greed > 0.7) {
      greedMultiplier = 1 + (agent.greed - 0.7);
    }

    return Math.round(baseFee * greedMultiplier);
  }

  /**
   * Influencia del agente en la decisión del jugador
   */
  getAgentInfluenceOnDecision(player, offer) {
    const agent = AGENT_TYPES[player.agent || 'generic'];
    const reasons = [];
    let modifier = 0;

    // El agente favorece fichajes que le den más comisión
    const potentialFee = this.calculateAgentFee(player, offer.amount);
    if (potentialFee > 1000000) {
      modifier += 10 * agent.greed;
      reasons.push({ 
        positive: true, 
        text: `🤝 ${agent.name} recomienda el fichaje (comisión: ${this.formatMoney(potentialFee)})` 
      });
    }

    // El agente tiene contactos en ciertos países
    const buyingTeam = this.getTeam(offer.toTeamId);
    if (buyingTeam?.country && agent.network.includes(buyingTeam.country)) {
      modifier += 15;
      reasons.push({ 
        positive: true, 
        text: `${agent.name} tiene buenos contactos en ese país` 
      });
    }

    // Agentes poderosos pueden presionar al jugador
    if (agent.influence > 0.8 && modifier > 0) {
      modifier *= agent.influence;
    }

    return { modifier, reasons, agentFee: potentialFee };
  }

  // ============================================================
  // CONTRAOFERTAS Y NEGOCIACIÓN AVANZADA
  // ============================================================

  /**
   * Generar contraoferta del club vendedor
   */
  generateSellerCounterOffer(offer) {
    const player = this.getPlayer(offer.playerId);
    const sellingTeam = this.getTeam(offer.fromTeamId);
    const marketValue = this.calculateMarketValue(player);

    // Factores para la contraoferta
    let multiplier = 1.15; // Base: pedir 15% más

    // Si el jugador es importante, pedir más
    const isKeyPlayer = player.overall >= 80 || player.personality?.minutesPlayed >= 70;
    if (isKeyPlayer) multiplier += 0.2;

    // Si es deadline day, pueden ser más flexibles
    if (this.deadlineDayActive) {
      multiplier -= 0.1;
    }

    // Si el equipo tiene problemas financieros
    if (sellingTeam?.budget < 0) {
      multiplier -= 0.15;
    }

    // Si el jugador quiere irse
    if (player.personality?.wantsToLeave) {
      multiplier -= 0.1;
    }

    const counterAmount = Math.round(Math.max(offer.amount * multiplier, marketValue));

    // Condiciones adicionales
    const conditions = [];

    // Porcentaje de futura venta si el jugador es joven
    if (player.age <= 24) {
      conditions.push({
        type: 'sell_on',
        value: 15 + Math.floor(Math.random() * 10), // 15-25%
        text: 'Porcentaje de futura venta'
      });
    }

    // Bonus por objetivos
    if (Math.random() < 0.4) {
      conditions.push({
        type: 'appearances',
        value: Math.round(counterAmount * 0.05),
        threshold: 30,
        text: 'Bonus por 30 partidos'
      });
    }

    return {
      amount: counterAmount,
      conditions,
      message: counterAmount > offer.amount * 1.3 
        ? 'Piden bastante más de lo ofrecido'
        : 'Contraoferta razonable'
    };
  }

  /**
   * Rechazar oferta con razón
   */
  rejectOfferWithReason(offerId, reason = 'generic') {
    const offer = this.offers.find(o => o.id === offerId);
    if (!offer) return { success: false };

    offer.status = OFFER_STATUS.rejected;
    
    const reasons = {
      generic: 'El club ha rechazado la oferta',
      lowball: 'La oferta está muy por debajo del valor del jugador',
      key_player: 'El jugador es intransferible',
      rival: 'No vendemos a rivales directos',
      timing: 'No es buen momento para vender',
      no_replacement: 'No tenemos recambio para esa posición'
    };

    offer.rejectionReason = reasons[reason] || reasons.generic;
    
    return { 
      success: true, 
      message: offer.rejectionReason 
    };
  }

  // ============================================================
  // UTILIDADES ADICIONALES
  // ============================================================

  /**
   * Obtener historial de fichajes de un jugador
   */
  getPlayerTransferHistory(playerId) {
    return this.completedDeals
      .filter(d => d.playerId === playerId)
      .sort((a, b) => b.completedAt - a.completedAt);
  }

  /**
   * Obtener mejores fichajes de la ventana
   */
  getTopTransfersInWindow() {
    const oneMonthAgo = Date.now() - 30 * 24 * 3600000;
    return this.completedDeals
      .filter(d => d.completedAt > oneMonthAgo && d.type === 'transfer')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }

  /**
   * Obtener ofertas activas para un equipo
   */
  getActiveOffersForTeam(teamId, type = 'all') {
    return this.offers.filter(o => {
      if (o.status !== OFFER_STATUS.pending) return false;
      if (type === 'incoming') return o.fromTeamId === teamId;
      if (type === 'outgoing') return o.toTeamId === teamId;
      return o.fromTeamId === teamId || o.toTeamId === teamId;
    });
  }

  /**
   * Obtener estado completo del mercado
   */
  getMarketStatus() {
    const windowStatus = isTransferWindowOpen(this.gameState?.currentDate || new Date().toISOString());
    
    return {
      windowOpen: windowStatus.open,
      windowName: windowStatus.name,
      deadlineDayActive: this.deadlineDayActive,
      currentHour: this.deadlineDayActive ? this.currentHour : null,
      totalOffers: this.offers.length,
      pendingOffers: this.offers.filter(o => o.status === OFFER_STATUS.pending).length,
      completedDeals: this.completedDeals.length,
      totalSpent: this.completedDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      rumors: this.rumors.slice(-10),
      urgencyLevel: this.deadlineDayActive ? this.getUrgencyLevel() : 'normal'
    };
  }

  /**
   * Limpiar ofertas expiradas
   */
  cleanupExpiredOffers() {
    const now = Date.now();
    let cleaned = 0;

    for (const offer of this.offers) {
      if (offer.status === OFFER_STATUS.pending && offer.expiresAt < now) {
        offer.status = OFFER_STATUS.expired;
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Simular actividad de mercado diaria (para IA)
   */
  simulateDailyMarketActivity() {
    const events = [];

    // Limpiar ofertas expiradas
    const cleaned = this.cleanupExpiredOffers();
    if (cleaned > 0) {
      events.push({ type: 'cleanup', count: cleaned });
    }

    // Generar ofertas aleatorias entre equipos IA
    const allTeams = this.getAllTeams();
    for (const team of allTeams) {
      if (team.id === this.gameState?.playerTeamId) continue; // Skip player team

      if (Math.random() < 0.1) { // 10% chance per team
        // Buscar fichaje
        const targetPlayer = this.findRandomTransferTarget(team);
        if (targetPlayer) {
          const offer = this.generateAIOffer(
            targetPlayer, 
            this.getTeam(targetPlayer.teamId), 
            team
          );
          if (offer) {
            this.offers.push(offer);
            events.push({ type: 'ai_offer', offer });
          }
        }
      }
    }

    // Procesar respuestas a ofertas pendientes de IA
    for (const offer of this.offers) {
      if (offer.status !== OFFER_STATUS.pending) continue;
      if (!offer.isAIOffer) continue;

      // Simular decisión del club vendedor
      if (Math.random() < 0.3) { // 30% chance de procesar
        const marketValue = this.calculateMarketValue(this.getPlayer(offer.playerId));
        const offerRatio = offer.amount / marketValue;

        if (offerRatio >= 1.1) {
          // Buena oferta - negociar con jugador
          const playerDecision = Math.random() < 0.7; // 70% acepta
          if (playerDecision) {
            this.executeTransfer(offer);
            events.push({ type: 'ai_transfer', offer });
          } else {
            offer.status = OFFER_STATUS.playerRejected;
          }
        } else if (offerRatio >= 0.85) {
          // Contraoferta
          const counter = this.generateSellerCounterOffer(offer);
          offer.status = OFFER_STATUS.countered;
          offer.counterAmount = counter.amount;
          events.push({ type: 'ai_counter', offer, counter });
        } else {
          // Rechazar
          offer.status = OFFER_STATUS.rejected;
        }
      }
    }

    return events;
  }

  /**
   * Encontrar objetivo de fichaje aleatorio para un equipo
   */
  findRandomTransferTarget(team) {
    const needed = this.getTeamNeeds(team);
    if (needed.length === 0) return null;

    const targetPosition = needed[Math.floor(Math.random() * needed.length)];
    const allPlayers = Object.values(this.gameState?.players || {});

    const candidates = allPlayers.filter(p => {
      if (!p.teamId || p.teamId === team.id) return false;
      if (p.position !== targetPosition) return false;
      
      const value = this.calculateMarketValue(p);
      return value < team.budget * 0.5; // Puede permitirse
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Obtener necesidades de un equipo
   */
  getTeamNeeds(team) {
    const positions = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
    const needs = [];

    for (const pos of positions) {
      if (this.teamNeedsPosition(team, pos)) {
        needs.push(pos);
      }
    }

    return needs;
  }

  // Helpers para acceder a datos del juego
  getPlayer(id) { return this.gameState?.players?.[id] || this.gameState?.getPlayer?.(id); }
  getTeam(id) { return this.gameState?.teams?.[id] || this.gameState?.getTeam?.(id); }
  getAllTeams() { return Object.values(this.gameState?.teams || {}); }
  getPlayerTeam() { return this.getTeam(this.gameState?.playerTeamId); }
  getFreeAgents() { return Object.values(this.gameState?.players || {}).filter(p => !p.teamId); }
  formatMoney(n) { return n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`; }
}

// ============================================================
// FUNCIONES DE AYUDA EXPORTADAS
// ============================================================

/**
 * Crear instancia del mercado
 */
export function createTransferMarket(gameState) {
  return new TransferMarket(gameState);
}

/**
 * Verificar si ventana de fichajes está abierta
 */
export function isTransferWindowOpen(currentDate) {
  const date = new Date(currentDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Verano: 1 Jul - 31 Ago
  if (month === 7 || month === 8) return { open: true, window: 'summer', name: 'Mercado de Verano' };
  
  // Invierno: 1-31 Enero
  if (month === 1) return { open: true, window: 'winter', name: 'Mercado de Invierno' };

  return { open: false, nextWindow: month < 7 ? 'summer' : 'winter' };
}

/**
 * Calcular días hasta cierre
 */
export function daysUntilWindowClose(currentDate, window) {
  const date = new Date(currentDate);
  let closeDate;

  if (window === 'summer') {
    closeDate = new Date(date.getFullYear(), 7, 31); // 31 Agosto
  } else {
    closeDate = new Date(date.getFullYear(), 0, 31); // 31 Enero
  }

  const diff = closeDate.getTime() - date.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 3600000)));
}

/**
 * Formatear oferta para mostrar
 */
export function formatOffer(offer) {
  const formatMoney = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`;

  return {
    ...offer,
    amountFormatted: formatMoney(offer.amount),
    salaryFormatted: offer.salaryOffer ? `${formatMoney(offer.salaryOffer * 52)}/año` : null,
    urgencyIcon: offer.urgency === 'critical' ? '🚨' : offer.urgency === 'high' ? '⚠️' : '',
    statusIcon: {
      [OFFER_STATUS.pending]: '⏳',
      [OFFER_STATUS.accepted]: '✅',
      [OFFER_STATUS.rejected]: '❌',
      [OFFER_STATUS.countered]: '🔄',
      [OFFER_STATUS.playerRejected]: '🙅',
      [OFFER_STATUS.expired]: '⌛',
      [OFFER_STATUS.withdrawn]: '🚫'
    }[offer.status] || ''
  };
}

export default TransferMarket;
