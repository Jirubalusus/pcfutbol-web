// ============================================================
// GLOBAL TRANSFER ENGINE - Mercado Mundial con IA Activa
// ============================================================
// Simula transferencias entre TODOS los equipos (IA ↔ IA)
// Genera noticias, rumores y mantiene el mundo vivo

/**
 * Calcular valor de mercado de un jugador
 */
export function calculateMarketValue(player) {
  const overall = player.overall || 70;
  const age = player.age || 25;
  
  // Realistic base values by overall (in millions)
  const valueTable = {
    60: 0.2, 62: 0.35, 64: 0.5, 66: 0.8, 68: 1.2,
    70: 2, 72: 3.5, 74: 6, 76: 10, 78: 18,
    80: 30, 82: 45, 84: 65, 86: 90, 88: 120,
    90: 150, 92: 180, 94: 220
  };
  
  // Interpolate
  const clamped = Math.max(60, Math.min(94, overall));
  const lower = Math.floor(clamped / 2) * 2;
  const upper = Math.min(94, lower + 2);
  const frac = (clamped - lower) / 2;
  const lowerVal = valueTable[lower] || 0.1;
  const upperVal = valueTable[upper] || lowerVal * 1.5;
  let baseValue = (lowerVal + (upperVal - lowerVal) * frac) * 1_000_000;
  
  // Age modifier (peak at 27)
  let ageMod = 1;
  if (age <= 18) ageMod = 1.8;
  else if (age <= 20) ageMod = 1.6;
  else if (age <= 23) ageMod = 1.4;
  else if (age <= 26) ageMod = 1.2;
  else if (age <= 28) ageMod = 1.0;
  else if (age <= 30) ageMod = 0.8;
  else if (age <= 32) ageMod = 0.55;
  else if (age <= 34) ageMod = 0.3;
  else ageMod = 0.15;
  
  // Position modifier
  const posMod = {
    ST: 1.3, CF: 1.25, RW: 1.2, LW: 1.2,
    CAM: 1.15, CM: 1.0, CDM: 0.95,
    CB: 0.9, RB: 0.85, LB: 0.85,
    RWB: 0.85, LWB: 0.85, RM: 1.0, LM: 1.0,
    GK: 0.7
  }[player.position] || 1.0;
  
  // Contract modifier
  const contractYears = player.contractYears || 2;
  let contractMod = 1;
  if (contractYears <= 1) contractMod = 0.5;
  else if (contractYears <= 2) contractMod = 0.75;
  else if (contractYears >= 5) contractMod = 1.15;
  
  const finalValue = baseValue * ageMod * posMod * contractMod;
  return Math.round(Math.max(100_000, Math.min(300_000_000, finalValue)));
}

// ============================================================
// CONFIGURACIÓN DE EQUIPOS IA
// ============================================================

// Perfiles de fichajes por tipo de equipo
export const TEAM_PROFILES = {
  elite: {
    name: 'Elite',
    budgetRange: [150_000_000, 400_000_000],
    targetOvrMin: 82,
    maxAge: 32,
    preferYouth: true,
    sellReluctance: 0.8, // Difícil que vendan
    wageMultiplier: 1.5,
    teams: ['Real Madrid', 'Barcelona', 'Manchester City', 'PSG', 'Bayern München', 'Liverpool', 'Chelsea', 'Arsenal']
  },
  topTier: {
    name: 'Top Tier',
    budgetRange: [80_000_000, 150_000_000],
    targetOvrMin: 78,
    maxAge: 30,
    preferYouth: true,
    sellReluctance: 0.6,
    wageMultiplier: 1.2,
    teams: ['Atlético Madrid', 'Manchester United', 'Juventus', 'Inter', 'Milan', 'Tottenham', 'Borussia Dortmund', 'Napoli']
  },
  midTable: {
    name: 'Mid Table',
    budgetRange: [30_000_000, 80_000_000],
    targetOvrMin: 72,
    maxAge: 29,
    preferYouth: false,
    sellReluctance: 0.4,
    wageMultiplier: 1.0,
    teams: ['Real Sociedad', 'Athletic Club', 'Villarreal', 'Sevilla', 'Valencia', 'Real Betis', 'West Ham', 'Newcastle', 'Aston Villa', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'RB Leipzig', 'Bayer Leverkusen']
  },
  lowTable: {
    name: 'Low Table',
    budgetRange: [10_000_000, 30_000_000],
    targetOvrMin: 65,
    maxAge: 33,
    preferYouth: false,
    sellReluctance: 0.2,
    wageMultiplier: 0.8,
    teams: [] // El resto
  }
};

// ============================================================
// CLASE PRINCIPAL: GlobalTransferEngine
// ============================================================

export class GlobalTransferEngine {
  constructor(allTeams, playerTeamId) {
    this.allTeams = allTeams; // Map de todos los equipos {teamId: {name, players, budget, ...}}
    this.playerTeamId = playerTeamId; // El equipo del jugador (no lo toca la IA)
    this.transferHistory = []; // Historial de fichajes
    this.activeRumors = []; // Rumores activos
    this.pendingDeals = []; // Ofertas en proceso
    this.season = 1;
    this.week = 1;
    this.isWindowOpen = false;
    this.windowType = null; // 'summer' | 'winter'
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  /**
   * Inicializar equipos con presupuestos y perfiles
   */
  initializeTeams(teamsData) {
    const teams = new Map();
    
    teamsData.forEach(team => {
      const profile = this.getTeamProfile(team.name);
      const [minBudget, maxBudget] = profile.budgetRange;
      const budget = Math.round(minBudget + Math.random() * (maxBudget - minBudget));
      
      teams.set(team.id, {
        ...team,
        budget,
        originalBudget: budget,
        profile: profile.name,
        transferActivity: [], // Fichajes de esta temporada
        needs: this.calculateTeamNeeds(team),
        sellPriority: this.calculateSellPriority(team)
      });
    });
    
    this.allTeams = teams;
    return teams;
  }

  /**
   * Obtener perfil de un equipo por nombre
   */
  getTeamProfile(teamName) {
    for (const [key, profile] of Object.entries(TEAM_PROFILES)) {
      if (profile.teams.includes(teamName)) {
        return profile;
      }
    }
    return TEAM_PROFILES.lowTable;
  }

  /**
   * Calcular necesidades de un equipo (posiciones débiles)
   */
  calculateTeamNeeds(team) {
    const needs = [];
    const players = team.players || [];
    
    // Contar jugadores por posición
    const positionCount = {
      GK: players.filter(p => p.position === 'GK').length,
      DEF: players.filter(p => ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p.position)).length,
      MID: players.filter(p => ['CM', 'CDM', 'CAM', 'RM', 'LM'].includes(p.position)).length,
      FWD: players.filter(p => ['ST', 'CF', 'RW', 'LW'].includes(p.position)).length
    };
    
    // Calcular media por posición
    const positionAvg = {
      GK: this.avgOverall(players.filter(p => p.position === 'GK')),
      DEF: this.avgOverall(players.filter(p => ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p.position))),
      MID: this.avgOverall(players.filter(p => ['CM', 'CDM', 'CAM', 'RM', 'LM'].includes(p.position))),
      FWD: this.avgOverall(players.filter(p => ['ST', 'CF', 'RW', 'LW'].includes(p.position)))
    };
    
    // Determinar necesidades
    if (positionCount.GK < 2) needs.push({ position: 'GK', priority: 'high', reason: 'Falta portero suplente' });
    if (positionCount.DEF < 5) needs.push({ position: 'DEF', priority: 'high', reason: 'Defensa corta' });
    if (positionCount.MID < 5) needs.push({ position: 'MID', priority: 'medium', reason: 'Mediocampo justo' });
    if (positionCount.FWD < 3) needs.push({ position: 'FWD', priority: 'high', reason: 'Falta profundidad atacante' });
    
    // Necesidades por calidad
    const profile = this.getTeamProfile(team.name);
    if (positionAvg.GK < profile.targetOvrMin) needs.push({ position: 'GK', priority: 'medium', reason: 'Portero de baja calidad' });
    if (positionAvg.DEF < profile.targetOvrMin) needs.push({ position: 'DEF', priority: 'medium', reason: 'Defensa débil' });
    if (positionAvg.MID < profile.targetOvrMin) needs.push({ position: 'MID', priority: 'medium', reason: 'Mediocampo mejorable' });
    if (positionAvg.FWD < profile.targetOvrMin) needs.push({ position: 'FWD', priority: 'high', reason: 'Ataque insuficiente' });
    
    return needs;
  }

  /**
   * Calcular prioridad de venta (jugadores que el equipo quiere vender)
   */
  calculateSellPriority(team) {
    const players = team.players || [];
    const profile = this.getTeamProfile(team.name);
    
    return players
      .filter(p => {
        // No vender jugadores clave
        if (p.overall >= 85 && profile.name !== 'lowTable') return false;
        
        // Candidatos a venta:
        // - Suplentes con salario alto
        // - Jugadores mayores
        // - Bajo rendimiento
        // - Contrato corto (mejor vender que perder gratis)
        const isOld = p.age > profile.maxAge;
        const isLowContract = (p.contractYears || 2) <= 1;
        const isBelowLevel = p.overall < profile.targetOvrMin - 5;
        
        return isOld || isLowContract || isBelowLevel;
      })
      .map(p => ({
        playerId: p.id || p.name,
        name: p.name,
        reason: p.age > profile.maxAge ? 'Edad' : 
                (p.contractYears || 2) <= 1 ? 'Contrato expira' : 'Nivel insuficiente',
        askingPrice: Math.round(calculateMarketValue(p) * 0.9) // 10% descuento
      }));
  }

  avgOverall(players) {
    if (!players.length) return 0;
    return Math.round(players.reduce((sum, p) => sum + (p.overall || 70), 0) / players.length);
  }

  // ============================================================
  // SIMULACIÓN DE MERCADO
  // ============================================================

  /**
   * Simular una semana de mercado
   */
  simulateWeek(currentWeek, isWindowOpen, windowType) {
    this.week = currentWeek;
    this.isWindowOpen = isWindowOpen;
    this.windowType = windowType;
    
    const events = [];
    
    if (!isWindowOpen) {
      // Fuera de ventana: solo rumores
      const newRumors = this.generateRumors(2);
      events.push(...newRumors.map(r => ({ type: 'rumor', data: r })));
      return events;
    }
    
    // Ventana abierta: simular actividad
    const aiTeams = Array.from(this.allTeams.values())
      .filter(t => t.id !== this.playerTeamId);
    
    // Cada equipo IA tiene chance de actuar
    for (const team of aiTeams) {
      // 30% chance de buscar fichaje
      if (Math.random() < 0.30 && team.needs.length > 0) {
        const signing = this.attemptSigning(team);
        if (signing) {
          events.push({ type: 'transfer', data: signing });
        }
      }
      
      // 15% chance de vender
      if (Math.random() < 0.15 && team.sellPriority.length > 0) {
        const sale = this.attemptSale(team);
        if (sale) {
          events.push({ type: 'transfer', data: sale });
        }
      }
    }
    
    // Generar rumores
    const newRumors = this.generateRumors(Math.random() < 0.5 ? 1 : 2);
    events.push(...newRumors.map(r => ({ type: 'rumor', data: r })));
    
    return events;
  }

  /**
   * Intentar fichar un jugador
   */
  attemptSigning(buyingTeam) {
    const need = buyingTeam.needs[Math.floor(Math.random() * buyingTeam.needs.length)];
    if (!need) return null;
    
    // Buscar jugadores disponibles
    const candidates = this.findTransferTargets(buyingTeam, need.position);
    if (candidates.length === 0) return null;
    
    // Elegir uno
    const target = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
    const sellingTeam = this.allTeams.get(target.teamId);
    
    if (!sellingTeam || sellingTeam.id === this.playerTeamId) return null;
    
    // Calcular precio
    const marketValue = calculateMarketValue(target);
    const sellingProfile = this.getTeamProfile(sellingTeam.name);
    const askingPrice = Math.round(marketValue * (1 + sellingProfile.sellReluctance * 0.3));
    
    // ¿Puede pagarlo?
    if (buyingTeam.budget < askingPrice * 0.7) return null;
    
    // Negociación simplificada
    const offerPrice = Math.round(askingPrice * (0.8 + Math.random() * 0.3));
    const accepted = offerPrice >= askingPrice * 0.85 || Math.random() < 0.3;
    
    if (!accepted) return null;
    
    // ¡Fichaje!
    return this.executeTransfer(target, sellingTeam, buyingTeam, offerPrice);
  }

  /**
   * Intentar vender un jugador
   */
  attemptSale(sellingTeam) {
    const sellTarget = sellingTeam.sellPriority[Math.floor(Math.random() * sellingTeam.sellPriority.length)];
    if (!sellTarget) return null;
    
    const player = sellingTeam.players.find(p => (p.id || p.name) === sellTarget.playerId);
    if (!player) return null;
    
    // Buscar comprador interesado
    const interestedTeams = Array.from(this.allTeams.values())
      .filter(t => {
        if (t.id === sellingTeam.id || t.id === this.playerTeamId) return false;
        const profile = this.getTeamProfile(t.name);
        return player.overall >= profile.targetOvrMin - 3 && t.budget >= sellTarget.askingPrice * 0.7;
      });
    
    if (interestedTeams.length === 0) return null;
    
    const buyer = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
    const finalPrice = Math.round(sellTarget.askingPrice * (0.85 + Math.random() * 0.2));
    
    return this.executeTransfer(player, sellingTeam, buyer, finalPrice);
  }

  /**
   * Buscar objetivos de fichaje
   */
  findTransferTargets(buyingTeam, positionType) {
    const profile = this.getTeamProfile(buyingTeam.name);
    const targets = [];
    
    const positionMap = {
      GK: ['GK'],
      DEF: ['CB', 'RB', 'LB', 'RWB', 'LWB'],
      MID: ['CM', 'CDM', 'CAM', 'RM', 'LM'],
      FWD: ['ST', 'CF', 'RW', 'LW']
    };
    
    const validPositions = positionMap[positionType] || [];
    
    for (const [teamId, team] of this.allTeams) {
      if (teamId === buyingTeam.id || teamId === this.playerTeamId) continue;
      
      const sellProfile = this.getTeamProfile(team.name);
      
      for (const player of (team.players || [])) {
        if (!validPositions.includes(player.position)) continue;
        if (player.overall < profile.targetOvrMin - 5) continue;
        if (player.overall > profile.targetOvrMin + 15) continue; // No demasiado caro
        if (player.age > profile.maxAge + 2) continue;
        
        // Los equipos grandes no venden fácil
        if (player.overall >= 83 && sellProfile.sellReluctance > 0.6 && Math.random() > 0.3) continue;
        
        targets.push({
          ...player,
          teamId,
          teamName: team.name
        });
      }
    }
    
    // Ordenar por idoneidad
    return targets.sort((a, b) => {
      const aScore = a.overall - Math.abs(a.age - 26) * 0.5;
      const bScore = b.overall - Math.abs(b.age - 26) * 0.5;
      return bScore - aScore;
    });
  }

  /**
   * Ejecutar una transferencia
   */
  executeTransfer(player, fromTeam, toTeam, price) {
    // Actualizar plantillas
    fromTeam.players = fromTeam.players.filter(p => p.name !== player.name);
    
    const newPlayer = {
      ...player,
      teamId: toTeam.id,
      contractYears: 4,
      salary: Math.round((player.salary || 50000) * 1.2) // Aumento salarial
    };
    toTeam.players.push(newPlayer);
    
    // Actualizar presupuestos
    fromTeam.budget += price;
    toTeam.budget -= price;
    
    // Recalcular necesidades
    fromTeam.needs = this.calculateTeamNeeds(fromTeam);
    toTeam.needs = this.calculateTeamNeeds(toTeam);
    fromTeam.sellPriority = this.calculateSellPriority(fromTeam);
    toTeam.sellPriority = this.calculateSellPriority(toTeam);
    
    // Registrar
    const transfer = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      player: {
        name: player.name,
        position: player.position,
        overall: player.overall,
        age: player.age
      },
      from: { id: fromTeam.id, name: fromTeam.name },
      to: { id: toTeam.id, name: toTeam.name },
      price,
      season: this.season,
      week: this.week,
      date: new Date().toISOString()
    };
    
    this.transferHistory.push(transfer);
    fromTeam.transferActivity.push({ ...transfer, type: 'sale' });
    toTeam.transferActivity.push({ ...transfer, type: 'purchase' });
    
    return transfer;
  }

  // ============================================================
  // RUMORES Y NOTICIAS
  // ============================================================

  /**
   * Generar rumores de mercado
   */
  generateRumors(count = 1) {
    const rumors = [];
    const templates = [
      { type: 'interest', text: '{to} está interesado en {player} ({from})' },
      { type: 'bid', text: '{to} prepara oferta de {price} por {player}' },
      { type: 'negotiation', text: '{player} negocia su salida de {from}' },
      { type: 'close', text: '{player} a punto de firmar por {to}' },
      { type: 'rejected', text: '{from} rechaza oferta por {player}' }
    ];
    
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Elegir equipos y jugador random
      const teams = Array.from(this.allTeams.values()).filter(t => t.id !== this.playerTeamId);
      const fromTeam = teams[Math.floor(Math.random() * teams.length)];
      const toTeam = teams.filter(t => t.id !== fromTeam.id)[Math.floor(Math.random() * (teams.length - 1))];
      
      if (!fromTeam?.players?.length || !toTeam) continue;
      
      const player = fromTeam.players[Math.floor(Math.random() * fromTeam.players.length)];
      if (!player) continue;
      
      const price = calculateMarketValue(player);
      
      const rumor = {
        id: `rumor_${Date.now()}_${i}`,
        type: template.type,
        text: template.text
          .replace('{player}', player.name)
          .replace('{from}', fromTeam.name)
          .replace('{to}', toTeam.name)
          .replace('{price}', `€${(price / 1_000_000).toFixed(0)}M`),
        player: { name: player.name, position: player.position, overall: player.overall },
        from: fromTeam.name,
        to: toTeam.name,
        reliability: Math.round(30 + Math.random() * 50), // 30-80%
        willHappen: Math.random() < 0.3, // 30% se cumplen
        createdAt: Date.now()
      };
      
      this.activeRumors.push(rumor);
      rumors.push(rumor);
    }
    
    // Limpiar rumores viejos
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.activeRumors = this.activeRumors.filter(r => r.createdAt > oneWeekAgo);
    
    return rumors;
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  /**
   * Obtener resumen del mercado
   */
  getMarketSummary() {
    const recentTransfers = this.transferHistory.slice(-20);
    
    // Top fichajes por precio
    const topDeals = [...this.transferHistory]
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);
    
    // Equipos más activos
    const teamActivity = {};
    this.transferHistory.forEach(t => {
      teamActivity[t.to.name] = (teamActivity[t.to.name] || 0) + 1;
    });
    
    const mostActive = Object.entries(teamActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, purchases: count }));
    
    return {
      totalTransfers: this.transferHistory.length,
      totalSpent: this.transferHistory.reduce((sum, t) => sum + t.price, 0),
      recentTransfers,
      topDeals,
      mostActive,
      activeRumors: this.activeRumors.slice(-10)
    };
  }

  /**
   * Obtener historial de un equipo
   */
  getTeamHistory(teamId) {
    const team = this.allTeams.get(teamId);
    if (!team) return null;
    
    return {
      team: team.name,
      budget: team.budget,
      activity: team.transferActivity || [],
      needs: team.needs,
      sellPriority: team.sellPriority
    };
  }

  /**
   * Serializar estado para guardar
   */
  serialize() {
    return {
      allTeams: Array.from(this.allTeams.entries()),
      transferHistory: this.transferHistory,
      activeRumors: this.activeRumors,
      season: this.season,
      week: this.week
    };
  }

  /**
   * Restaurar desde guardado
   */
  static deserialize(data, playerTeamId) {
    const engine = new GlobalTransferEngine(new Map(), playerTeamId);
    engine.allTeams = new Map(data.allTeams);
    engine.transferHistory = data.transferHistory || [];
    engine.activeRumors = data.activeRumors || [];
    engine.season = data.season || 1;
    engine.week = data.week || 1;
    return engine;
  }
}

// ============================================================
// FUNCIONES HELPER PARA INTEGRACIÓN
// ============================================================

/**
 * Crear motor global desde el estado del juego
 */
export function createGlobalEngine(gameState) {
  const allTeamsData = [];
  
  // Añadir equipo del jugador
  if (gameState.team) {
    allTeamsData.push({
      id: gameState.teamId,
      name: gameState.team.name,
      players: gameState.team.players,
      budget: gameState.money,
      leagueId: gameState.team.leagueId
    });
  }
  
  // Añadir resto de equipos de la liga
  if (gameState.leagueTeams) {
    gameState.leagueTeams.forEach(team => {
      if (team.id !== gameState.teamId) {
        allTeamsData.push(team);
      }
    });
  }
  
  const engine = new GlobalTransferEngine(new Map(), gameState.teamId);
  engine.initializeTeams(allTeamsData);
  engine.season = gameState.currentSeason || 1;
  
  return engine;
}

/**
 * Verificar si el mercado está abierto
 * @param {number} week - Semana actual de liga
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.preseasonPhase - Si estamos en pretemporada
 * @param {number} options.totalWeeks - Total de jornadas de liga (38 para 20 equipos)
 */
export function isTransferWindowOpen(week, options = {}) {
  const { preseasonPhase = false, totalWeeks = 38 } = options;
  
  // Mercado de verano: SOLO durante pretemporada
  if (preseasonPhase) return { open: true, type: 'summer' };
  
  // Mercado de invierno: SOLO la jornada exacta de mitad de liga
  const midWeek = Math.ceil(totalWeeks / 2); // jornada 19 para 38 jornadas
  if (week === midWeek) return { open: true, type: 'winter' };
  
  return { open: false, type: null };
}

/**
 * Formatear precio para mostrar
 */
export function formatTransferPrice(price) {
  // Siempre formato M para consistencia
  const m = price / 1_000_000;
  if (m >= 100) return `€${Math.round(m)}M`;
  return `€${m.toFixed(1)}M`;
}

export default GlobalTransferEngine;
