import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  getLaLigaTeams,
  getSegundaTeams,
  getPremierTeams,
  getLigue1Teams,
  getBundesligaTeams,
  getSerieATeams
} from '../../data/teamsFirestore';
import { 
  PERSONALITIES, 
  SPECIAL_GOALS, 
  generatePlayerPersonality, 
  evaluateTransferOffer 
} from '../../game/playerPersonality';
import {
  generateLoanCandidates,
  evaluateLoanRequest,
  canLoanPlayer
} from '../../game/loanSystem';
import TransferMap from './TransferMap';
import { Star, Circle, Zap, Globe, X, ShoppingCart, ClipboardList, DollarSign, Mail, Inbox, Search, Settings, Flame, AlertTriangle, Info, MessageSquare, Target, Calendar, Check, XCircle, CheckCircle } from 'lucide-react';
import { getLeagueTier, getMaxTierJumpByAge, getPositionPerformanceMultiplier, getTransferValueMultiplier } from '../../game/leagueTiers';
import './Transfers.scss';
import './TransferMap.scss';

// Función helper para obtener todos los equipos
function getAllTeams() {
  return [
    ...getLaLigaTeams(),
    ...getSegundaTeams(),
    ...getPremierTeams(),
    ...getLigue1Teams(),
    ...getBundesligaTeams(),
    ...getSerieATeams()
  ];
}

// Función helper para obtener equipos por liga
function getTeamsByLeague(league) {
  switch(league) {
    case 'laliga': return getLaLigaTeams();
    case 'segunda': return getSegundaTeams();
    case 'premier': return getPremierTeams();
    case 'ligue1': return getLigue1Teams();
    case 'bundesliga': return getBundesligaTeams();
    case 'seriea': return getSerieATeams();
    default: return [];
  }
}

// === CONSTANTES DEL MERCADO ===
const TRANSFER_WINDOWS = {
  summer: { start: 1, end: 8, name: 'Mercado de Verano', urgent: 7 },
  winter: { start: 20, end: 24, name: 'Mercado de Invierno', urgent: 23 }
};

const PLAYER_ROLES = {
  star: { name: 'Estrella', icon: <Star size={14} style={{fill:'currentColor'}} />, minutesPromise: 90, salaryMultiplier: 1.3 },
  starter: { name: 'Titular', icon: <Circle size={14} style={{fill:'#30d158',color:'#30d158'}} />, minutesPromise: 75, salaryMultiplier: 1.1 },
  rotation: { name: 'Rotación', icon: <Circle size={14} style={{fill:'#ffd60a',color:'#ffd60a'}} />, minutesPromise: 50, salaryMultiplier: 1.0 },
  backup: { name: 'Suplente', icon: <Circle size={14} style={{fill:'#ff9f0a',color:'#ff9f0a'}} />, minutesPromise: 25, salaryMultiplier: 0.9 },
  youth: { name: 'Proyecto', icon: <Circle size={14} style={{fill:'#3498db',color:'#3498db'}} />, minutesPromise: 15, salaryMultiplier: 0.8 }
};

// === UTILIDADES ===
const formatMoney = (amount) => {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
  return `€${amount}`;
};

const getPositionColor = (pos) => {
  if (pos === 'GK') return 'var(--color-warning)';
  if (['RB', 'CB', 'LB'].includes(pos)) return '#3498db';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return 'var(--color-success)';
  return 'var(--color-danger)';
};

const getInterestColor = (interest) => {
  if (interest >= 70) return 'var(--color-success)';
  if (interest >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

// Seeded random para consistencia
const seededRandom = (seed, offset = 0) => {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
};

// === CÁLCULOS ===
const calculateReleaseClause = (player, teamReputation) => {
  const baseClause = player.value * 1.5;
  const starBonus = player.overall >= 85 ? 2.5 : player.overall >= 80 ? 1.8 : 1.2;
  const youngBonus = player.age <= 23 ? 1.4 : 1;
  const teamBonus = teamReputation >= 85 ? 1.8 : teamReputation >= 75 ? 1.3 : 1;
  return Math.round(baseClause * starBonus * youngBonus * teamBonus);
};

const calculateScoutKnowledge = (player, scoutingLevel, week) => {
  // Nivel de conocimiento 0-100 basado en scouting y tiempo
  const baseSeed = player.name.length * 1000 + week;
  const baseKnowledge = 20 + scoutingLevel * 15; // 20-80 base
  const variation = seededRandom(baseSeed) * 20;
  return Math.min(100, Math.round(baseKnowledge + variation));
};

const calculateAIInterest = (player, week, teamId) => {
  // Simular interés de otros equipos
  const seed = player.name.length * 100 + week * 10;
  const interestedTeams = [];
  
  getAllTeams().forEach((team, idx) => {
    if (team.id === teamId) return;
    const teamInterest = seededRandom(seed + idx * 7);
    
    // Equipos grandes más interesados en estrellas
    const reputationMatch = Math.abs((team.reputation || 70) - player.overall) < 15;
    const canAfford = (team.budget || 50000000) > player.value * 0.5;
    
    if (teamInterest < 0.15 && reputationMatch && canAfford) {
      interestedTeams.push({
        team: team.name,
        shortName: team.shortName,
        reputation: team.reputation || 70,
        likelihood: Math.round(20 + seededRandom(seed + idx * 13) * 60)
      });
    }
  });
  
  return interestedTeams.slice(0, 3); // Máximo 3 equipos interesados
};

const getTransferWindow = (week) => {
  if (week >= TRANSFER_WINDOWS.summer.start && week <= TRANSFER_WINDOWS.summer.end) {
    return { ...TRANSFER_WINDOWS.summer, isOpen: true, isUrgent: week >= TRANSFER_WINDOWS.summer.urgent };
  }
  if (week >= TRANSFER_WINDOWS.winter.start && week <= TRANSFER_WINDOWS.winter.end) {
    return { ...TRANSFER_WINDOWS.winter, isOpen: true, isUrgent: week >= TRANSFER_WINDOWS.winter.urgent };
  }
  return { name: 'Mercado Cerrado', isOpen: false, isUrgent: false };
};

// === COMPONENTE PRINCIPAL ===
export default function Transfers() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState(500);
  const [minOverall, setMinOverall] = useState(60);
  const [maxAge, setMaxAge] = useState(40);
  const [sortBy, setSortBy] = useState('overall');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [negotiation, setNegotiation] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  
  const scoutingLevel = state.facilities?.scouting || 0;
  const transferWindow = getTransferWindow(state.currentWeek);

  const handleLeagueSelect = (leagueId) => {
    setSelectedLeague(leagueId);
    setShowMap(false);
    setTab('market');
  };
  
  // === GENERAR MERCADO ===
  const marketPlayers = useMemo(() => {
    const players = [];
    const seed = state.currentWeek * 12345 + (state.currentSeason || 1) * 999;
    
    let playerIndex = 0;
    getAllTeams().forEach(team => {
      if (team.id === state.teamId || !team.players) return;
      
      // Determinar la liga del equipo
      const teamLeague = team.leagueId || 
        (getLaLigaTeams().some(t => t.id === team.id) ? 'laliga' :
         getSegundaTeams().some(t => t.id === team.id) ? 'segunda' :
         getPremierTeams().some(t => t.id === team.id) ? 'premier' :
         getLigue1Teams().some(t => t.id === team.id) ? 'ligue1' :
         getBundesligaTeams().some(t => t.id === team.id) ? 'bundesliga' :
         getSerieATeams().some(t => t.id === team.id) ? 'seriea' : null);
      
      team.players.forEach(player => {
        playerIndex++;
        
        // Disponibilidad basada en varios factores
        const availabilityRoll = seededRandom(seed, playerIndex);
        const isForSale = seededRandom(seed, playerIndex + 500) < 0.12;
        const isUnhappy = seededRandom(seed, playerIndex + 600) < 0.08;
        const contractExpiring = seededRandom(seed, playerIndex + 700) < 0.1;
        
        // 25% base + bonuses
        const availability = 0.25 + (isForSale ? 0.3 : 0) + (isUnhappy ? 0.2 : 0) + (contractExpiring ? 0.15 : 0);
        
        if (availabilityRoll < availability) {
          const releaseClause = calculateReleaseClause(player, team.reputation || 70);
          const scoutKnowledge = calculateScoutKnowledge(player, scoutingLevel, state.currentWeek);
          const aiInterest = calculateAIInterest(player, state.currentWeek, state.teamId);
          
          // Precio según situación
          let priceMultiplier = 0.9 + seededRandom(seed, playerIndex + 1000) * 0.3;
          if (isForSale) priceMultiplier *= 0.8;
          if (isUnhappy) priceMultiplier *= 0.85;
          if (contractExpiring) priceMultiplier *= 0.7;
          if (aiInterest.length > 1) priceMultiplier *= 1.1; // Competencia sube precio
          
          const askingPrice = Math.round(player.value * priceMultiplier);
          const personality = generatePlayerPersonality(player, seed + playerIndex);
          
          players.push({
            ...player,
            id: `${team.id}_${player.name}_${playerIndex}`,
            teamId: team.id,
            teamName: team.name,
            teamShortName: team.shortName,
            teamReputation: team.reputation || 70,
            leagueId: teamLeague,
            askingPrice,
            releaseClause,
            isForSale,
            isUnhappy,
            contractExpiring,
            contractYears: contractExpiring ? 1 : 1 + Math.floor(seededRandom(seed, playerIndex + 2000) * 4),
            scoutKnowledge,
            aiInterest,
            personality,
            difficulty: aiInterest.length > 0 ? 'competitive' : isForSale ? 'easy' : 'normal'
          });
        }
      });
    });
    
    return players;
  }, [state.currentWeek, state.currentSeason, state.teamId, scoutingLevel]);
  
  // === AGENTES LIBRES ===
  const freeAgents = useMemo(() => {
    const agents = [];
    const positions = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
    const firstNames = ['Marco', 'Luis', 'Pablo', 'Diego', 'Carlos', 'Adrián', 'Javier', 'Miguel', 'Fernando', 'Alberto', 'Raúl', 'Sergio', 'David', 'Óscar', 'Iván', 'Álex', 'Hugo', 'Rubén', 'Iker', 'Unai'];
    const lastNames = ['García', 'Martínez', 'López', 'Rodríguez', 'Fernández', 'González', 'Sánchez', 'Pérez', 'Ruiz', 'Díaz', 'Moreno', 'Álvarez', 'Torres', 'Navarro', 'Romero'];
    
    const seed = (state.currentSeason || 1) * 54321 + state.currentWeek;
    const count = 8 + Math.floor(seededRandom(seed, 0) * 7); // 8-14 agentes
    
    for (let i = 0; i < count; i++) {
      const pos = positions[Math.floor(seededRandom(seed, i + 100) * positions.length)];
      const overall = 58 + Math.floor(seededRandom(seed, i + 200) * 22); // 58-79
      const age = 20 + Math.floor(seededRandom(seed, i + 300) * 16); // 20-35
      const value = Math.round((overall - 50) * 180000 + seededRandom(seed, i + 400) * 800000);
      const firstName = firstNames[Math.floor(seededRandom(seed, i + 500) * firstNames.length)];
      const lastName = lastNames[Math.floor(seededRandom(seed, i + 600) * lastNames.length)];
      
      agents.push({
        id: `free_${i}_${seed}`,
        name: `${firstName} ${lastName}`,
        position: pos,
        overall,
        age,
        value,
        salary: Math.round(value * 0.0018 + 8000),
        teamName: 'Agente Libre',
        teamShortName: 'FREE',
        askingPrice: 0,
        isFreeAgent: true,
        signingBonus: Math.round(value * 0.25),
        personality: generatePlayerPersonality({ name: `${firstName} ${lastName}`, overall, age }, seed + i)
      });
    }
    
    return agents;
  }, [state.currentSeason, state.currentWeek]);
  
  // === FILTRADO ===
  const filteredPlayers = useMemo(() => {
    const source = tab === 'freeagents' ? freeAgents : tab === 'watchlist' ? watchlist : marketPlayers;
    
    let result = source.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'all' || p.position === positionFilter;
      const matchesPrice = p.askingPrice <= maxPrice * 1000000;
      const matchesOverall = p.overall >= minOverall;
      const matchesAge = p.age <= maxAge;
      const matchesLeague = !selectedLeague || p.leagueId === selectedLeague;
      return matchesSearch && matchesPosition && matchesPrice && matchesOverall && matchesAge && matchesLeague;
    });
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'overall': return b.overall - a.overall;
        case 'price_low': return a.askingPrice - b.askingPrice;
        case 'price_high': return b.askingPrice - a.askingPrice;
        case 'age_young': return a.age - b.age;
        case 'value': return (b.overall / Math.max(1, b.askingPrice)) - (a.overall / Math.max(1, a.askingPrice));
        case 'easy': return (a.aiInterest?.length || 0) - (b.aiInterest?.length || 0);
        default: return b.overall - a.overall;
      }
    });
    
    return result;
  }, [marketPlayers, freeAgents, watchlist, tab, searchTerm, positionFilter, maxPrice, minOverall, maxAge, sortBy]);
  
  // === OFERTAS ENTRANTES ===
  // Tier del jugador para filtrar ofertas cross-tier
  const playerTier = getLeagueTier(state.leagueId);
  
  useEffect(() => {
    if (state.team?.players && state.currentWeek > 1 && transferWindow.isOpen) {
      const existingOfferCount = state.transferOffers?.length || 0;
      const stats = state.playerSeasonStats || {};
      
      // Check if we have standout performers (per position!)
      const hasStarPerformer = state.team.players.some(p => {
        const pStats = stats[p.name] || {};
        const perfMult = getPositionPerformanceMultiplier(p, pStats);
        return perfMult >= 1.8; // Rendimiento muy destacado en su posición
      });
      
      let offerChance = transferWindow.isUrgent ? 0.5 : 0.3;
      if (hasStarPerformer) offerChance += 0.15;
      
      const maxOffers = hasStarPerformer ? 7 : 5;
      
      if (existingOfferCount < maxOffers && Math.random() < offerChance) {
        generateIncomingOffer();
      }
    }
  }, [state.currentWeek, generateIncomingOffer, state.playerSeasonStats]);
  
  const generateIncomingOffer = useCallback(() => {
    const players = state.team?.players || [];
    if (players.length === 0) return;
    const stats = state.playerSeasonStats || {};
    
    // === 1. RENDIMIENTO POR POSICIÓN ===
    // Cada posición tiene métricas diferentes (goles, asistencias, clean sheets)
    const weightedPlayers = players.map(p => {
      const pStats = stats[p.name] || { goals: 0, assists: 0, cleanSheets: 0, matchesPlayed: 0 };
      
      // Multiplicador basado en posición + stats reales
      const performanceMultiplier = getPositionPerformanceMultiplier(p, pStats);
      
      // Base weight from value/overall/age
      let baseWeight = (p.value || 100000);
      if (p.overall >= 80) baseWeight *= 1.5;
      if (p.age <= 23) baseWeight *= 1.4;
      else if (p.age <= 27) baseWeight *= 1.2;
      else if (p.age >= 32) baseWeight *= 0.5;
      
      // Contract expiring = bargain opportunity
      if ((p.contractYears || 2) <= 1) baseWeight *= 1.8;
      
      return {
        ...p,
        pStats,
        performanceMultiplier,
        weight: baseWeight * performanceMultiplier
      };
    });
    
    weightedPlayers.sort((a, b) => b.weight - a.weight);
    
    // Weighted random from top pool
    const poolSize = Math.min(6, weightedPlayers.length);
    const pool = weightedPlayers.slice(0, poolSize);
    const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let targetPlayer = pool[0];
    for (const p of pool) {
      rand -= p.weight;
      if (rand <= 0) { targetPlayer = p; break; }
    }
    
    // No duplicar ofertas
    if (state.transferOffers?.some(o => o.player === targetPlayer.name)) return;
    
    // === 2. FILTRO DE EDAD PARA CROSS-TIER ===
    const isExceptional = targetPlayer.performanceMultiplier >= 1.5;
    const maxTierJump = getMaxTierJumpByAge(targetPlayer.age, isExceptional);
    
    // === 3. SELECCIONAR EQUIPO COMPRADOR (tier-aware + age-gated) ===
    const suitableTeams = getAllTeams().filter(t => {
      if (t.id === state.teamId) return false;
      
      // Estimar tier del equipo comprador por su leagueId o reputation
      const buyerTier = t.leagueId ? getLeagueTier(t.leagueId) : 
        (t.reputation >= 5 ? 1 : t.reputation >= 4 ? 2 : t.reputation >= 3 ? 3 : 4);
      
      // Filtro de edad: un equipo de tier superior solo puja si la edad lo permite
      const tierDiff = playerTier - buyerTier; // positivo = comprador es de liga superior
      if (tierDiff > maxTierJump) return false; // Demasiado salto para esta edad
      
      // El comprador no puede ser de un tier MUY inferior (no tiene sentido)
      if (buyerTier > playerTier + 1) return false;
      
      // Coherencia de nivel: el comprador puede pagar
      const canAfford = (t.budget || 5000000) > targetPlayer.value * 0.3;
      
      // Coherencia de overall: el jugador encaja en el equipo
      const teamAvgOvr = t.reputation ? (t.reputation * 12 + 25) : 70;
      const ovrDiff = targetPlayer.overall - teamAvgOvr;
      
      if (tierDiff > 0) {
        // Club de liga superior: busca rendimiento, no solo OVR
        return canAfford && targetPlayer.performanceMultiplier > 1.15;
      } else {
        // Mismo tier o inferior: busca por OVR/valor
        return canAfford && Math.abs(ovrDiff) < 18;
      }
    });
    
    if (suitableTeams.length === 0) return;
    const offeringTeam = suitableTeams[Math.floor(Math.random() * suitableTeams.length)];
    
    // === 4. CALCULAR OFERTA (tier-aware + performance + capped) ===
    const buyerTier = offeringTeam.leagueId ? getLeagueTier(offeringTeam.leagueId) :
      (offeringTeam.reputation >= 5 ? 1 : offeringTeam.reputation >= 4 ? 2 : offeringTeam.reputation >= 3 ? 3 : 4);
    const tierGap = Math.max(0, playerTier - buyerTier); // > 0 si comprador es de liga superior
    
    const basePercent = 0.70 + Math.random() * 0.30; // 70-100%
    const urgencyBonus = transferWindow.isUrgent ? 0.10 : 0;
    const teamBonus = (offeringTeam.reputation || 3) > (state.team?.reputation || 3) ? 0.10 : 0;
    
    // Performance premium basado en posición (no solo goles)
    const posPerf = targetPlayer.performanceMultiplier - 1; // 0 = normal
    const performanceBonus = Math.min(0.50, posPerf * 0.30);
    
    // Tier gap premium: clubs superiores pagan +20% por cada tier de diferencia
    const tierPremium = tierGap * 0.20;
    
    let offerPercent = Math.min(1.60, basePercent + urgencyBonus + teamBonus + performanceBonus + tierPremium);
    let offerAmount = Math.round(targetPlayer.value * offerPercent);
    
    // CAP: la oferta no puede superar lo que costaría un jugador similar en la liga compradora
    // Un jugador del mismo OVR en la liga del comprador vale aprox:
    if (tierGap > 0) {
      const buyerTierMult = getTransferValueMultiplier(offeringTeam.leagueId || '');
      const sellerTierMult = getTransferValueMultiplier(state.leagueId || '');
      // Ratio de valor entre tiers: cuánto más vale un jugador "allí" vs "aquí"
      const tierValueRatio = buyerTierMult / Math.max(0.01, sellerTierMult);
      // El cap es 60% del valor que tendría ese OVR en la liga compradora
      const capValue = Math.round(targetPlayer.value * tierValueRatio * 0.60);
      offerAmount = Math.min(offerAmount, capValue);
    }
    
    // Recalcular offerPercent real
    offerPercent = targetPlayer.value > 0 ? offerAmount / targetPlayer.value : 1;
    
    // Calidad de la oferta
    let offerQuality = 'normal';
    if (offerPercent >= 1.20) offerQuality = 'excellent';
    else if (offerPercent >= 0.95) offerQuality = 'good';
    else if (offerPercent < 0.75) offerQuality = 'low';
    
    // Descripción del rendimiento para el mensaje
    const pos = targetPlayer.position || 'CM';
    let performanceDesc = '';
    if (targetPlayer.performanceMultiplier > 1.3) {
      if (['ST', 'CF', 'RW', 'LW', 'CAM'].includes(pos) && targetPlayer.pStats.goals > 5) {
        performanceDesc = ` — impresionados por sus ${targetPlayer.pStats.goals} goles`;
      } else if (['CM', 'CAM'].includes(pos) && targetPlayer.pStats.assists > 4) {
        performanceDesc = ` — destacan sus ${targetPlayer.pStats.assists} asistencias`;
      } else if (['CB', 'RB', 'LB', 'CDM'].includes(pos) && targetPlayer.pStats.cleanSheets > 5) {
        performanceDesc = ` — valoran su solidez defensiva (${targetPlayer.pStats.cleanSheets} porterías a cero)`;
      } else if (pos === 'GK' && targetPlayer.pStats.cleanSheets > 5) {
        performanceDesc = ` — impresionados por sus ${targetPlayer.pStats.cleanSheets} porterías a cero`;
      }
    }
    
    // Contexto del tipo de oferta
    let offerContext = '';
    if (tierGap >= 2 && targetPlayer.age <= 23) {
      offerContext = ' (buscan talento joven en divisiones inferiores)';
    } else if (tierGap >= 1 && targetPlayer.age <= 28) {
      offerContext = ' (quieren reforzarse con talento probado)';
    }
    
    const offer = {
      id: Date.now() + Math.random(),
      player: targetPlayer.name,
      playerPosition: targetPlayer.position,
      playerOverall: targetPlayer.overall,
      playerValue: targetPlayer.value,
      playerAge: targetPlayer.age,
      playerGoals: targetPlayer.pStats.goals || 0,
      playerAssists: targetPlayer.pStats.assists || 0,
      playerCleanSheets: targetPlayer.pStats.cleanSheets || 0,
      teamId: offeringTeam.id,
      team: offeringTeam.name,
      teamShortName: offeringTeam.shortName,
      teamReputation: offeringTeam.reputation || 3,
      buyerTier,
      amount: offerAmount,
      offerPercent: Math.round(offerPercent * 100),
      offerQuality,
      week: state.currentWeek,
      negotiationRound: 0,
      maxNegotiations: 3,
      expiresIn: transferWindow.isUrgent ? 1 : 3,
      isUrgent: transferWindow.isUrgent
    };
    
    dispatch({ type: 'ADD_TRANSFER_OFFER', payload: offer });
    
    // Mensajes diferenciados por contexto
    let messageTitle, messageContent;
    
    if (offerQuality === 'excellent') {
      messageTitle = `💰 ¡OFERTÓN por ${targetPlayer.name}!`;
      messageContent = `${offeringTeam.name} ofrece ${formatMoney(offerAmount)} (${offer.offerPercent}% del valor)${performanceDesc}`;
    } else if (offerQuality === 'good') {
      messageTitle = `📩 Buena oferta por ${targetPlayer.name}`;
      messageContent = `${offeringTeam.name} ofrece ${formatMoney(offerAmount)} (${offer.offerPercent}% del valor)${performanceDesc}`;
    } else if (offerQuality === 'low') {
      messageTitle = `📩 Oferta baja por ${targetPlayer.name}`;
      messageContent = `${offeringTeam.name} tantea con ${formatMoney(offerAmount)} (${offer.offerPercent}% del valor)`;
    } else {
      messageTitle = `📩 Oferta por ${targetPlayer.name}`;
      messageContent = `${offeringTeam.name} ofrece ${formatMoney(offerAmount)} (${offer.offerPercent}% del valor)${performanceDesc}`;
    }
    
    messageContent += offerContext;
    if (offer.isUrgent) messageContent += ' ⚡ URGENTE';
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer_offer',
        title: messageTitle,
        content: messageContent,
        date: `Semana ${state.currentWeek}`
      }
    });
  }, [state.team, state.teamId, state.currentWeek, state.transferOffers, state.playerSeasonStats, state.leagueId, playerTier, transferWindow, dispatch]);
  
  // === NEGOCIACIÓN ===
  const startNegotiation = useCallback((player) => {
    const personality = PERSONALITIES[player.personality?.type || 'professional'];
    const specialGoal = player.personality?.specialGoal ? SPECIAL_GOALS[player.personality.specialGoal] : null;
    
    // Evaluación inicial
    const initialEvaluation = evaluateTransferOffer(
      player,
      { reputation: player.teamReputation },
      { reputation: state.team?.reputation || 80 },
      { salary: player.salary * 1.1, promisedRole: 'rotation' }
    );
    
    setNegotiation({
      player,
      offerAmount: player.askingPrice,
      offerSalary: Math.round(player.salary * 1.1),
      promisedRole: 'rotation',
      contractYears: 4,
      playerInterest: initialEvaluation.probability,
      personality,
      specialGoal,
      evaluation: initialEvaluation,
      stage: 'initial',
      rounds: 0,
      maxRounds: 3,
      aiCompetitors: player.aiInterest || [],
      deadline: transferWindow.isUrgent
    });
    setSelectedPlayer(null);
  }, [state.team?.reputation, transferWindow.isUrgent]);
  
  const updateNegotiationOffer = useCallback((field, value) => {
    if (!negotiation) return;
    
    const newNegotiation = { ...negotiation, [field]: value };
    
    // Recalcular evaluación
    const evaluation = evaluateTransferOffer(
      negotiation.player,
      { reputation: negotiation.player.teamReputation },
      { reputation: state.team?.reputation || 80 },
      { salary: newNegotiation.offerSalary, promisedRole: newNegotiation.promisedRole }
    );
    
    newNegotiation.evaluation = evaluation;
    newNegotiation.playerInterest = evaluation.probability;
    
    setNegotiation(newNegotiation);
  }, [negotiation, state.team?.reputation]);
  
  const submitOffer = useCallback(() => {
    if (!negotiation) return;
    
    const { player, offerAmount, offerSalary, promisedRole, contractYears, rounds, evaluation, aiCompetitors } = negotiation;
    
    // Pagar cláusula = aceptación automática
    const paidClause = offerAmount >= player.releaseClause;
    
    // Competencia de IA puede arruinar el fichaje
    let aiSteals = false;
    if (aiCompetitors.length > 0 && !paidClause) {
      const stealChance = aiCompetitors.reduce((sum, c) => sum + c.likelihood, 0) / 300;
      aiSteals = Math.random() < stealChance * (1 - evaluation.probability / 100);
    }
    
    if (aiSteals) {
      const stealingTeam = aiCompetitors[Math.floor(Math.random() * aiCompetitors.length)];
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `Fichaje robado`,
          content: `${stealingTeam.team} se ha adelantado y ha fichado a ${player.name}`,
          date: `Semana ${state.currentWeek}`
        }
      });
      setNegotiation(null);
      return;
    }
    
    // Determinar aceptación
    let accepted = paidClause || (evaluation.wouldAccept && Math.random() < (evaluation.probability / 100 + 0.15));
    
    // El club también debe aceptar
    if (!paidClause && accepted) {
      const clubAcceptChance = offerAmount >= player.askingPrice ? 0.92 : 
                               offerAmount >= player.value ? 0.75 : 
                               offerAmount >= player.value * 0.8 ? 0.45 : 0.2;
      accepted = Math.random() < clubAcceptChance;
    }
    
    if (accepted) {
      // ¡FICHAJE CERRADO!
      dispatch({
        type: 'SIGN_PLAYER',
        payload: {
          player: {
            name: player.name,
            position: player.position,
            overall: player.overall,
            age: player.age,
            value: player.value,
            salary: offerSalary,
            personality: {
              ...player.personality,
              contractYears,
              happiness: promisedRole === 'star' ? 85 : promisedRole === 'starter' ? 75 : 65,
              minutesPlayed: PLAYER_ROLES[promisedRole]?.minutesPromise || 50,
              loyaltyYears: 0
            }
          },
          fee: offerAmount
        }
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `¡Fichaje cerrado!`,
          content: `${player.name} firma por ${formatMoney(offerAmount)} + ${formatMoney(offerSalary)}/sem (${contractYears} años)`,
          date: `Semana ${state.currentWeek}`
        }
      });
      
      setNegotiation(null);
    } else if (rounds < 2) {
      // Contraoferta
      const counterMultiplier = 1.08 + Math.random() * 0.12;
      const counterAmount = Math.round(Math.max(offerAmount * counterMultiplier, player.askingPrice));
      const counterSalary = Math.round(offerSalary * (1.05 + Math.random() * 0.1));
      
      // El jugador puede pedir otro rol
      let counterRole = promisedRole;
      if (evaluation.probability < 50 && player.overall >= 78) {
        counterRole = promisedRole === 'rotation' ? 'starter' : promisedRole === 'backup' ? 'rotation' : promisedRole;
      }
      
      setNegotiation({
        ...negotiation,
        counterAmount,
        counterSalary,
        counterRole,
        stage: 'counter',
        rounds: rounds + 1
      });
    } else {
      // RECHAZADO
      const rejectionReasons = evaluation.reasons
        .filter(r => !r.positive)
        .map(r => r.text)
        .slice(0, 2)
        .join('. ');
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `Fichaje fallido`,
          content: rejectionReasons || `${player.name} no está interesado en fichar`,
          date: `Semana ${state.currentWeek}`
        }
      });
      
      setNegotiation(null);
    }
  }, [negotiation, state.currentWeek, dispatch]);
  
  const acceptCounter = useCallback(() => {
    if (!negotiation?.counterAmount) return;
    
    setNegotiation({
      ...negotiation,
      offerAmount: negotiation.counterAmount,
      offerSalary: negotiation.counterSalary,
      promisedRole: negotiation.counterRole || negotiation.promisedRole,
      stage: 'final'
    });
  }, [negotiation]);
  
  const signFreeAgent = useCallback((player) => {
    const totalCost = player.signingBonus;
    if (state.money < totalCost) return;
    
    dispatch({
      type: 'SIGN_PLAYER',
      payload: {
        player: {
          name: player.name,
          position: player.position,
          overall: player.overall,
          age: player.age,
          value: player.value,
          salary: player.salary,
          personality: player.personality
        },
        fee: totalCost
      }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: `Agente libre fichado`,
        content: `${player.name} firma como agente libre (prima: ${formatMoney(totalCost)})`,
        date: `Semana ${state.currentWeek}`
      }
    });
  }, [state.money, state.currentWeek, dispatch]);
  
  // === MANEJO DE OFERTAS ENTRANTES ===
  const handleAcceptOffer = useCallback((offer) => {
    dispatch({ type: 'SELL_PLAYER', payload: { playerName: offer.player, fee: offer.amount } });
    dispatch({ type: 'REMOVE_TRANSFER_OFFER', payload: offer.id });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: `Venta completada`,
        content: `${offer.player} vendido a ${offer.team} por ${formatMoney(offer.amount)}`,
        date: `Semana ${state.currentWeek}`
      }
    });
  }, [state.currentWeek, dispatch]);
  
  const handleCounterOffer = useCallback((offer) => {
    if (offer.negotiationRound >= offer.maxNegotiations) {
      dispatch({ type: 'REMOVE_TRANSFER_OFFER', payload: offer.id });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `Negociación rota`,
          content: `${offer.team} se retira de la negociación por ${offer.player}`,
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    const counterAmount = Math.round(offer.playerValue * 1.15);
    const acceptChance = 0.25 + (offer.negotiationRound * 0.15) + (offer.isUrgent ? 0.2 : 0);
    
    if (Math.random() < acceptChance && offer.amount * 1.1 >= counterAmount * 0.9) {
      const finalAmount = Math.round((offer.amount * 1.05 + counterAmount * 0.95) / 2);
      dispatch({ type: 'SELL_PLAYER', payload: { playerName: offer.player, fee: finalAmount } });
      dispatch({ type: 'REMOVE_TRANSFER_OFFER', payload: offer.id });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `Negociación exitosa`,
          content: `${offer.player} vendido a ${offer.team} por ${formatMoney(finalAmount)}`,
          date: `Semana ${state.currentWeek}`
        }
      });
    } else {
      const newAmount = Math.round(offer.amount * (1.06 + Math.random() * 0.06));
      dispatch({
        type: 'UPDATE_TRANSFER_OFFER',
        payload: { ...offer, amount: newAmount, negotiationRound: offer.negotiationRound + 1, offerPercent: Math.round((newAmount / offer.playerValue) * 100) }
      });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: `Nueva oferta`,
          content: `${offer.team} mejora: ${formatMoney(newAmount)} por ${offer.player}`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
  }, [state.currentWeek, dispatch]);
  
  const handleRejectOffer = useCallback((offer) => {
    dispatch({ type: 'REMOVE_TRANSFER_OFFER', payload: offer.id });
    
    // If rejecting a good offer, penalize player form
    if (offer.offerQuality === 'excellent' || offer.offerQuality === 'good') {
      dispatch({
        type: 'REJECT_TRANSFER_PENALTY',
        payload: { playerName: offer.player, offerQuality: offer.offerQuality }
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 1,
          type: 'warning',
          title: `⚠️ ${offer.player} está afectado`,
          content: `${offer.player} está muy afectado por el bloqueo de su traspaso a ${offer.team}. Su forma bajará durante ${offer.offerQuality === 'excellent' ? '8' : '4'} semanas.`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
  }, [dispatch, state.currentWeek]);
  
  const toggleWatchlist = useCallback((player) => {
    setWatchlist(prev => 
      prev.some(p => p.id === player.id) 
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  }, []);
  
  // === CESIONES (LOANS) ===
  const [loanNegotiation, setLoanNegotiation] = useState(null);
  const [loanSubTab, setLoanSubTab] = useState('available'); // 'available', 'myLoans', 'received', 'offers'
  
  // Generar candidatos a cesión
  const loanCandidates = useMemo(() => {
    if (tab !== 'loans' || loanSubTab !== 'available') return [];
    const allTeams = state.leagueTeams || [];
    const requestingTeam = {
      id: state.teamId,
      name: state.team?.name || '',
      players: state.team?.players || []
    };
    return generateLoanCandidates(allTeams, requestingTeam, state.teamId);
  }, [tab, loanSubTab, state.leagueTeams, state.teamId, state.team, state.currentWeek]);
  
  // Mis jugadores cedidos fuera
  const myLoanedOut = useMemo(() => {
    return (state.activeLoans || []).filter(
      l => l.fromTeamId === state.teamId && l.status === 'active'
    );
  }, [state.activeLoans, state.teamId]);
  
  // Jugadores que tengo en cesión (recibidos)
  const myLoanedIn = useMemo(() => {
    return (state.activeLoans || []).filter(
      l => l.toTeamId === state.teamId && l.status === 'active'
    );
  }, [state.activeLoans, state.teamId]);
  
  // Ofertas de cesión entrantes
  const pendingLoanOffers = useMemo(() => {
    return (state.incomingLoanOffers || []).filter(o => o.status === 'pending');
  }, [state.incomingLoanOffers]);
  
  // Pedir cesión a otro equipo
  const handleRequestLoan = useCallback((candidate) => {
    if (!transferWindow.isOpen) return;
    
    // Verificar restricciones
    const check = canLoanPlayer(candidate, state, 'in');
    if (!check.canLoan) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⚠️ Cesión no posible',
          content: check.errors.join('. '),
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    setLoanNegotiation({
      candidate,
      loanFee: candidate.loanFee,
      salaryShare: candidate.salaryShare,
      purchaseOption: candidate.purchaseOption,
      stage: 'negotiation'
    });
  }, [transferWindow.isOpen, state, dispatch]);
  
  const submitLoanRequest = useCallback(() => {
    if (!loanNegotiation) return;
    
    const { candidate, loanFee, salaryShare, purchaseOption } = loanNegotiation;
    
    // Verificar presupuesto
    if (state.money < loanFee) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⚠️ Presupuesto insuficiente',
          content: `Necesitas ${formatMoney(loanFee)} para la fee de cesión`,
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    // Evaluar si el equipo propietario acepta
    const ownerTeam = (state.leagueTeams || []).find(t => t.id === candidate.teamId);
    if (!ownerTeam) return;
    
    const evaluation = evaluateLoanRequest(
      ownerTeam,
      candidate,
      { id: state.teamId, name: state.team?.name },
      { loanFee, salaryShare, purchaseOption }
    );
    
    if (evaluation.accepted) {
      // ¡Cesión aceptada!
      dispatch({
        type: 'LOAN_IN_PLAYER',
        payload: {
          player: {
            name: candidate.name,
            position: candidate.position,
            overall: candidate.overall,
            age: candidate.age,
            salary: candidate.salary || 50000,
            value: candidate.value || candidate.marketValue || 0
          },
          fromTeamId: candidate.teamId,
          fromTeamName: candidate.teamName,
          loanFee,
          salaryShare,
          purchaseOption
        }
      });
    } else {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: '❌ Cesión rechazada',
          content: `${candidate.teamName} no acepta ceder a ${candidate.name}. ${evaluation.reasons.filter(r => !r.positive).map(r => r.text).join('. ')}`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
    
    setLoanNegotiation(null);
  }, [loanNegotiation, state, dispatch]);
  
  const handleAcceptLoanOffer = useCallback((offer) => {
    const player = state.team?.players?.find(p => p.name === offer.playerId);
    if (!player) return;
    
    // Verificar restricciones
    const check = canLoanPlayer(player, state, 'out');
    if (!check.canLoan) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⚠️ No se puede ceder',
          content: check.errors.join('. '),
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    dispatch({ type: 'ACCEPT_LOAN_OFFER', payload: offer });
  }, [state, dispatch]);
  
  const handleRejectLoanOffer = useCallback((offer) => {
    dispatch({ type: 'REJECT_LOAN_OFFER', payload: offer });
  }, [dispatch]);
  
  const handleExercisePurchaseOption = useCallback((loan) => {
    if (!loan.purchaseOption || state.money < loan.purchaseOption) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⚠️ No se puede ejecutar',
          content: loan.purchaseOption ? 'Presupuesto insuficiente' : 'Esta cesión no tiene opción de compra',
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    if (window.confirm(`¿Ejecutar opción de compra de ${loan.playerData?.name} por ${formatMoney(loan.purchaseOption)}?`)) {
      dispatch({ type: 'EXERCISE_LOAN_PURCHASE', payload: { loanId: loan.id } });
    }
  }, [state.money, dispatch]);
  
  // === RENDER ===

  // Mostrar mapa de fichajes
  if (showMap) {
    return <TransferMap onSelectLeague={handleLeagueSelect} onClose={() => setShowMap(false)} />;
  }

  const LEAGUE_NAMES = {
    laliga: '🇪🇸 La Liga',
    segunda: '🇪🇸 Segunda',
    premierLeague: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier',
    ligue1: '🇫🇷 Ligue 1',
    bundesliga: '🇩🇪 Bundesliga',
    serieA: '🇮🇹 Serie A',
    eredivisie: '🇳🇱 Eredivisie',
    primeiraLiga: '🇵🇹 Liga Portugal',
  };

  return (
    <div className="transfers">
      {/* Header con estado del mercado */}
      <div className="transfers__header">
        <div className="transfers__title-section">
          <h2>Mercado de Fichajes</h2>
          <div className={`transfers__window ${transferWindow.isOpen ? 'open' : 'closed'} ${transferWindow.isUrgent ? 'urgent' : ''}`}>
            {transferWindow.isUrgent && <span className="urgent-icon"><Zap size={14} /></span>}
            {transferWindow.name}
            {transferWindow.isUrgent && <span className="urgent-text">¡Últimos días!</span>}
          </div>
        </div>
        <div className="transfers__header-actions">
          <button className="map-btn" onClick={() => setShowMap(true)}>
            <Globe size={14} /> Explorar Mapa
          </button>
          <div className="transfers__budget">
            <span className="label">Presupuesto:</span>
            <span className="value">{formatMoney(state.money)}</span>
          </div>
        </div>
      </div>

      {/* Filtro de liga activo */}
      {selectedLeague && (
        <div className="transfers__league-filter">
          <span className="label">Filtrando por:</span>
          <span className="league">{LEAGUE_NAMES[selectedLeague]}</span>
          <button className="clear" onClick={() => setSelectedLeague(null)}><X size={14} /> Quitar filtro</button>
        </div>
      )}
      
      {/* Tabs */}
      <div className="transfers__tabs">
        <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}>
          <ShoppingCart size={14} /> Mercado <span className="count">{marketPlayers.length}</span>
        </button>
        <button className={tab === 'freeagents' ? 'active' : ''} onClick={() => setTab('freeagents')}>
          <ClipboardList size={14} /> Libres <span className="count">{freeAgents.length}</span>
        </button>
        <button className={tab === 'watchlist' ? 'active' : ''} onClick={() => setTab('watchlist')}>
          <Star size={14} /> Seguimiento <span className="count">{watchlist.length}</span>
        </button>
        <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>
          <DollarSign size={14} /> Vender
        </button>
        <button 
          className={`${tab === 'offers' ? 'active' : ''} ${state.transferOffers?.length > 0 ? 'has-offers' : ''}`}
          onClick={() => setTab('offers')}
        >
          <Mail size={14} /> Ofertas {state.transferOffers?.length > 0 && <span className="badge">{state.transferOffers.length}</span>}
        </button>
        <button 
          className={`${tab === 'loans' ? 'active' : ''} ${(state.incomingLoanOffers?.length || 0) > 0 ? 'has-offers' : ''}`}
          onClick={() => setTab('loans')}
        >
          🤝 Cesiones {(state.incomingLoanOffers?.length || 0) > 0 && <span className="badge">{state.incomingLoanOffers.length}</span>}
        </button>
      </div>
      
      {/* Market/Free Agents/Watchlist */}
      {(tab === 'market' || tab === 'freeagents' || tab === 'watchlist') && (
        <div className="transfers__market">
          {/* Filtros */}
          <div className="transfers__filters">
            <input 
              type="text" 
              placeholder="Buscar jugador o equipo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
              <option value="all">Todas las posiciones</option>
              <option value="GK">Portero</option>
              <option value="CB">Central</option>
              <option value="RB">Lateral Der.</option>
              <option value="LB">Lateral Izq.</option>
              <option value="CDM">Pivote</option>
              <option value="CM">Centrocampista</option>
              <option value="CAM">Mediapunta</option>
              <option value="RW">Extremo Der.</option>
              <option value="LW">Extremo Izq.</option>
              <option value="ST">Delantero</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="overall">Mayor media</option>
              <option value="price_low">Menor precio</option>
              <option value="price_high">Mayor precio</option>
              <option value="age_young">Más joven</option>
              <option value="value">Mejor valor</option>
              <option value="easy">Más fácil</option>
            </select>
            <button 
              className={`filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Settings size={14} />
            </button>
          </div>
          
          {showAdvancedFilters && (
            <div className="transfers__advanced-filters">
              <div className="filter-group">
                <label>Precio máx: {formatMoney(maxPrice * 1000000)}</label>
                <input type="range" min="1" max="500" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
              </div>
              <div className="filter-group">
                <label>Media mín: {minOverall}</label>
                <input type="range" min="50" max="90" value={minOverall} onChange={e => setMinOverall(Number(e.target.value))} />
              </div>
              <div className="filter-group">
                <label>Edad máx: {maxAge} años</label>
                <input type="range" min="18" max="40" value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} />
              </div>
            </div>
          )}
          
          <div className="transfers__results-info">
            <span>{filteredPlayers.length} jugadores encontrados</span>
            {scoutingLevel > 0 && <span className="scout-info"><Search size={14} /> Scouting Nv.{scoutingLevel}</span>}
          </div>
          
          {/* Lista de jugadores */}
          <div className="transfers__list">
            {filteredPlayers.slice(0, 50).map((player) => (
              <div 
                key={player.id} 
                className={`transfers__player ${player.isForSale ? 'for-sale' : ''} ${player.isUnhappy ? 'unhappy' : ''} ${player.difficulty}`}
              >
                <div className="player-main">
                  <span className="pos" style={{ color: getPositionColor(player.position) }}>
                    {player.position}
                  </span>
                  <div className="details">
                    <span className="name">
                      {player.name}
                      {player.personality?.type && (
                        <span className="personality-icon" title={PERSONALITIES[player.personality.type]?.name}>
                          {PERSONALITIES[player.personality.type]?.icon}
                        </span>
                      )}
                    </span>
                    <span className="team">{player.teamName}</span>
                    {player.aiInterest?.length > 0 && (
                      <span className="competition">
                        <Flame size={14} /> {player.aiInterest.length} equipo{player.aiInterest.length > 1 ? 's' : ''} interesado{player.aiInterest.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="stats">
                    <span className="ovr">{player.overall}</span>
                    <span className="age">{player.age} años</span>
                  </div>
                </div>
                
                <div className="player-status">
                  {player.isForSale && <span className="tag sale">EN VENTA</span>}
                  {player.isUnhappy && <span className="tag unhappy">DESCONTENTO</span>}
                  {player.contractExpiring && <span className="tag expiring">FIN CONTRATO</span>}
                </div>
                
                <div className="player-price">
                  {player.isFreeAgent ? (
                    <>
                      <span className="free-label">GRATIS</span>
                      <span className="bonus">Prima: {formatMoney(player.signingBonus)}</span>
                    </>
                  ) : (
                    <>
                      <span className="price">{formatMoney(player.askingPrice)}</span>
                      {player.scoutKnowledge && player.scoutKnowledge < 50 && (
                        <span className="unknown">~aprox</span>
                      )}
                    </>
                  )}
                </div>
                
                <div className="player-actions">
                  {!player.isFreeAgent && (
                    <button 
                      className={`watchlist-btn ${watchlist.some(p => p.id === player.id) ? 'active' : ''}`}
                      onClick={() => toggleWatchlist(player)}
                      title={watchlist.some(p => p.id === player.id) ? 'Quitar de seguimiento' : 'Añadir a seguimiento'}
                    >
                      {watchlist.some(p => p.id === player.id) ? <Star size={14} style={{fill:'currentColor'}} /> : <Star size={14} />}
                    </button>
                  )}
                  <button 
                    className="info-btn"
                    onClick={() => setSelectedPlayer(player)}
                    title="Ver información"
                  >
                    <Info size={14} />
                  </button>
                  {player.isFreeAgent ? (
                    <button 
                      className="sign-btn"
                      onClick={() => signFreeAgent(player)}
                      disabled={state.money < player.signingBonus}
                    >
                      Fichar
                    </button>
                  ) : (
                    <button 
                      className="negotiate-btn"
                      onClick={() => startNegotiation(player)}
                      disabled={state.money < player.askingPrice * 0.3}
                    >
                      Negociar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Vender */}
      {tab === 'sell' && (
        <div className="transfers__sell">
          <div className="transfers__list">
            {state.team?.players?.filter(p => !p.onLoan).sort((a, b) => b.value - a.value).map((player, idx) => (
              <div key={idx} className="transfers__player">
                <div className="player-main">
                  <span className="pos" style={{ color: getPositionColor(player.position) }}>
                    {player.position}
                  </span>
                  <div className="details">
                    <span className="name">{player.name}</span>
                    <span className="team">Valor: {formatMoney(player.value)}</span>
                  </div>
                  <div className="stats">
                    <span className="ovr">{player.overall}</span>
                    <span className="age">{player.age} años</span>
                  </div>
                </div>
                <div className="player-price">
                  <span className="price">{formatMoney(Math.round(player.value * 0.85))}</span>
                  <span className="percent">Venta directa (85%)</span>
                </div>
                <div className="player-actions">
                  <button 
                    className="sell-btn"
                    onClick={() => {
                      if (window.confirm(`¿Vender a ${player.name} por ${formatMoney(Math.round(player.value * 0.85))}?`)) {
                        dispatch({ type: 'SELL_PLAYER', payload: { playerName: player.name, fee: Math.round(player.value * 0.85) } });
                      }
                    }}
                  >
                    Vender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Ofertas recibidas */}
      {tab === 'offers' && (
        <div className="transfers__offers">
          {(!state.transferOffers || state.transferOffers.length === 0) ? (
            <div className="transfers__empty">
              <span className="icon"><Inbox size={20} /></span>
              <p>No tienes ofertas pendientes</p>
              <p className="hint">Las ofertas llegan durante las ventanas de mercado</p>
            </div>
          ) : (
            <div className="transfers__offers-list">
              {state.transferOffers.map(offer => (
                <div key={offer.id} className={`transfers__offer ${offer.isUrgent ? 'urgent' : ''}`}>
                  {offer.isUrgent && <div className="urgent-banner"><Zap size={14} /> OFERTA URGENTE</div>}
                  <div className="offer-header">
                    <div className="offer-team">
                      <span className="badge">{offer.teamShortName}</span>
                      <div className="team-info">
                        <span className="name">{offer.team}</span>
                        <span className="reputation">Rep: {offer.teamReputation}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="offer-player">
                    <span className="pos" style={{ color: getPositionColor(offer.playerPosition) }}>
                      {offer.playerPosition}
                    </span>
                    <div className="player-info">
                      <span className="name">{offer.player}</span>
                      <span className="details">{offer.playerAge} años · Valor: {formatMoney(offer.playerValue)}</span>
                    </div>
                    <span className="ovr">{offer.playerOverall}</span>
                  </div>
                  
                  <div className="offer-details">
                    <div className="amount-row">
                      <span className="label">Oferta:</span>
                      <span className="value">{formatMoney(offer.amount)}</span>
                      <span className={`percent ${offer.offerPercent >= 100 ? 'good' : offer.offerPercent >= 85 ? 'fair' : 'low'}`}>
                        {offer.offerPercent}%
                      </span>
                    </div>
                    {offer.negotiationRound > 0 && (
                      <div className="negotiation-progress">
                        Ronda {offer.negotiationRound}/{offer.maxNegotiations}
                      </div>
                    )}
                  </div>
                  
                  <div className="offer-actions">
                    <button className="accept" onClick={() => handleAcceptOffer(offer)}>
                      <Check size={14} /> Aceptar
                    </button>
                    <button className="counter" onClick={() => handleCounterOffer(offer)}>
                      <MessageSquare size={14} /> Negociar
                    </button>
                    <button className="reject" onClick={() => handleRejectOffer(offer)}>
                      <X size={14} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Cesiones (Loans) */}
      {tab === 'loans' && (
        <div className="transfers__loans">
          {/* Sub-tabs de cesiones */}
          <div className="transfers__loan-tabs">
            <button className={loanSubTab === 'available' ? 'active' : ''} onClick={() => setLoanSubTab('available')}>
              🔍 Disponibles
            </button>
            <button className={loanSubTab === 'myLoans' ? 'active' : ''} onClick={() => setLoanSubTab('myLoans')}>
              📤 Cedidos ({myLoanedOut.length})
            </button>
            <button className={loanSubTab === 'received' ? 'active' : ''} onClick={() => setLoanSubTab('received')}>
              📥 Recibidos ({myLoanedIn.length})
            </button>
            <button 
              className={`${loanSubTab === 'offers' ? 'active' : ''} ${pendingLoanOffers.length > 0 ? 'has-offers' : ''}`} 
              onClick={() => setLoanSubTab('offers')}
            >
              📩 Ofertas {pendingLoanOffers.length > 0 && <span className="badge">{pendingLoanOffers.length}</span>}
            </button>
          </div>
          
          {/* Disponibles para cesión */}
          {loanSubTab === 'available' && (
            <div className="transfers__loan-section">
              {!transferWindow.isOpen ? (
                <div className="transfers__empty">
                  <span className="icon">🔒</span>
                  <p>El mercado está cerrado</p>
                  <p className="hint">Las cesiones solo se pueden realizar durante ventanas de mercado</p>
                </div>
              ) : loanCandidates.length === 0 ? (
                <div className="transfers__empty">
                  <span className="icon">🤷</span>
                  <p>No hay jugadores disponibles para cesión</p>
                </div>
              ) : (
                <>
                  <div className="transfers__results-info">
                    <span>{loanCandidates.length} jugadores disponibles en cesión</span>
                  </div>
                  <div className="transfers__list">
                    {loanCandidates.slice(0, 30).map((candidate, idx) => (
                      <div key={`loan_${idx}`} className="transfers__player loan-candidate">
                        <div className="player-main">
                          <span className="pos" style={{ color: getPositionColor(candidate.position) }}>
                            {candidate.position}
                          </span>
                          <div className="details">
                            <span className="name">{candidate.name}</span>
                            <span className="team">{candidate.teamName}</span>
                            <span className="loan-reason">{candidate.reason}</span>
                          </div>
                          <div className="stats">
                            <span className="ovr">{candidate.overall}</span>
                            <span className="age">{candidate.age} años</span>
                          </div>
                        </div>
                        <div className="player-price">
                          <span className="price">Fee: {formatMoney(candidate.loanFee)}</span>
                          <span className="percent">Salario: {Math.round(candidate.salaryShare * 100)}% tuyo</span>
                          {candidate.purchaseOption && (
                            <span className="purchase-option">Compra: {formatMoney(candidate.purchaseOption)}</span>
                          )}
                        </div>
                        <div className="player-actions">
                          <button 
                            className="negotiate-btn"
                            onClick={() => handleRequestLoan(candidate)}
                            disabled={state.money < candidate.loanFee}
                          >
                            Pedir cesión
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Mis jugadores cedidos fuera */}
          {loanSubTab === 'myLoans' && (
            <div className="transfers__loan-section">
              {myLoanedOut.length === 0 ? (
                <div className="transfers__empty">
                  <span className="icon">📤</span>
                  <p>No tienes jugadores cedidos a otros equipos</p>
                </div>
              ) : (
                <div className="transfers__list">
                  {myLoanedOut.map(loan => (
                    <div key={loan.id} className="transfers__player loan-active">
                      <div className="player-main">
                        <span className="pos" style={{ color: getPositionColor(loan.playerData?.position || 'CM') }}>
                          {loan.playerData?.position || '?'}
                        </span>
                        <div className="details">
                          <span className="name">{loan.playerData?.name || loan.playerId}</span>
                          <span className="team">📍 En {loan.toTeamName}</span>
                        </div>
                        <div className="stats">
                          <span className="ovr">{loan.playerData?.overall || '?'}</span>
                          <span className="age">{loan.playerData?.age || '?'} años</span>
                        </div>
                      </div>
                      <div className="player-price">
                        <span className="price">⏱️ {loan.weeksRemaining} sem. restantes</span>
                        {loan.purchaseOption && (
                          <span className="purchase-option">Opción de compra: {formatMoney(loan.purchaseOption)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Jugadores recibidos en cesión */}
          {loanSubTab === 'received' && (
            <div className="transfers__loan-section">
              {myLoanedIn.length === 0 ? (
                <div className="transfers__empty">
                  <span className="icon">📥</span>
                  <p>No tienes jugadores en cesión recibidos</p>
                </div>
              ) : (
                <div className="transfers__list">
                  {myLoanedIn.map(loan => (
                    <div key={loan.id} className="transfers__player loan-active received">
                      <div className="player-main">
                        <span className="pos" style={{ color: getPositionColor(loan.playerData?.position || 'CM') }}>
                          {loan.playerData?.position || '?'}
                        </span>
                        <div className="details">
                          <span className="name">{loan.playerData?.name || loan.playerId}</span>
                          <span className="team">🏠 Propiedad de {loan.fromTeamName}</span>
                        </div>
                        <div className="stats">
                          <span className="ovr">{loan.playerData?.overall || '?'}</span>
                          <span className="age">{loan.playerData?.age || '?'} años</span>
                        </div>
                      </div>
                      <div className="player-price">
                        <span className="price">⏱️ {loan.weeksRemaining} sem. restantes</span>
                        {loan.purchaseOption && (
                          <span className="purchase-option">Compra: {formatMoney(loan.purchaseOption)}</span>
                        )}
                      </div>
                      <div className="player-actions">
                        {loan.purchaseOption && (
                          <button 
                            className="negotiate-btn"
                            onClick={() => handleExercisePurchaseOption(loan)}
                            disabled={state.money < loan.purchaseOption}
                            title={`Ejecutar opción de compra: ${formatMoney(loan.purchaseOption)}`}
                          >
                            💰 Comprar ({formatMoney(loan.purchaseOption)})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Ofertas de cesión entrantes */}
          {loanSubTab === 'offers' && (
            <div className="transfers__loan-section">
              {pendingLoanOffers.length === 0 ? (
                <div className="transfers__empty">
                  <span className="icon"><Inbox size={20} /></span>
                  <p>No tienes ofertas de cesión pendientes</p>
                  <p className="hint">Otros equipos pueden querer llevarse a tus jugadores en cesión</p>
                </div>
              ) : (
                <div className="transfers__offers-list">
                  {pendingLoanOffers.map(offer => (
                    <div key={offer.id} className="transfers__offer loan-offer">
                      <div className="offer-header">
                        <div className="offer-team">
                          <span className="badge">🤝</span>
                          <div className="team-info">
                            <span className="name">{offer.toTeamName}</span>
                            <span className="reputation">Quiere cesión</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="offer-player">
                        <span className="pos" style={{ color: getPositionColor(offer.playerData?.position || 'CM') }}>
                          {offer.playerData?.position || '?'}
                        </span>
                        <div className="player-info">
                          <span className="name">{offer.playerData?.name || offer.playerId}</span>
                          <span className="details">{offer.playerData?.age} años · {offer.playerData?.overall} OVR</span>
                        </div>
                      </div>
                      
                      <div className="offer-details">
                        <div className="amount-row">
                          <span className="label">Fee de cesión:</span>
                          <span className="value">{formatMoney(offer.loanFee)}</span>
                        </div>
                        <div className="amount-row">
                          <span className="label">Salario receptor:</span>
                          <span className="value">{Math.round(offer.salaryShare * 100)}%</span>
                        </div>
                        {offer.purchaseOption && (
                          <div className="amount-row">
                            <span className="label">Opción de compra:</span>
                            <span className="value">{formatMoney(offer.purchaseOption)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="offer-actions">
                        <button className="accept" onClick={() => handleAcceptLoanOffer(offer)}>
                          <Check size={14} /> Aceptar cesión
                        </button>
                        <button className="reject" onClick={() => handleRejectLoanOffer(offer)}>
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Modal de negociación de cesión */}
      {loanNegotiation && (
        <div className="transfers__modal-overlay" onClick={() => setLoanNegotiation(null)}>
          <div className="transfers__modal negotiation" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Negociar Cesión</h3>
              <button className="close-btn" onClick={() => setLoanNegotiation(null)}><X size={16} /></button>
            </div>
            
            <div className="modal-content">
              <div className="negotiation-player">
                <div className="player-summary">
                  <span className="pos" style={{ background: getPositionColor(loanNegotiation.candidate.position) }}>
                    {loanNegotiation.candidate.position}
                  </span>
                  <div className="info">
                    <span className="name">{loanNegotiation.candidate.name}</span>
                    <span className="team">de {loanNegotiation.candidate.teamName}</span>
                  </div>
                  <span className="ovr">{loanNegotiation.candidate.overall}</span>
                </div>
              </div>
              
              <div className="offer-form">
                {/* Fee de cesión */}
                <div className="form-group">
                  <label><DollarSign size={14} /> Fee de cesión</label>
                  <div className="input-with-buttons">
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, loanFee: Math.max(100000, prev.loanFee - 500000) }))}>-0.5M</button>
                    <span className="amount-display">{formatMoney(loanNegotiation.loanFee)}</span>
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, loanFee: prev.loanFee + 500000 }))}>+0.5M</button>
                  </div>
                </div>
                
                {/* Opción de compra */}
                <div className="form-group">
                  <label><Target size={14} /> Opción de compra</label>
                  <div className="input-with-buttons">
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: prev.purchaseOption ? Math.max(0, prev.purchaseOption - 1000000) : null }))}>-1M</button>
                    <span className="amount-display">{loanNegotiation.purchaseOption ? formatMoney(loanNegotiation.purchaseOption) : 'Sin opción'}</span>
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: (prev.purchaseOption || prev.candidate.marketValue || 5000000) + 1000000 }))}>+1M</button>
                  </div>
                  <div className="quick-buttons">
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: null }))}>Sin opción</button>
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: Math.round((prev.candidate.marketValue || 5000000) * 0.9) }))}>90% valor</button>
                    <button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: prev.candidate.marketValue || 5000000 }))}>100% valor</button>
                  </div>
                </div>
                
                {/* Resumen */}
                <div className="offer-summary">
                  <div className="summary-row">
                    <span>Fee de cesión:</span>
                    <strong>{formatMoney(loanNegotiation.loanFee)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Tu parte del salario ({Math.round(loanNegotiation.salaryShare * 100)}%):</span>
                    <strong>{formatMoney(Math.round((loanNegotiation.candidate.salary || 50000) * loanNegotiation.salaryShare))}/sem</strong>
                  </div>
                  {loanNegotiation.purchaseOption && (
                    <div className="summary-row">
                      <span>Opción de compra:</span>
                      <strong>{formatMoney(loanNegotiation.purchaseOption)}</strong>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Coste inmediato:</span>
                    <strong>{formatMoney(loanNegotiation.loanFee)}</strong>
                  </div>
                  <div className={`budget-check ${state.money >= loanNegotiation.loanFee ? 'ok' : 'error'}`}>
                    {state.money >= loanNegotiation.loanFee 
                      ? <><Check size={12} /> Te quedarían {formatMoney(state.money - loanNegotiation.loanFee)}</>
                      : <><X size={12} /> Te faltan {formatMoney(loanNegotiation.loanFee - state.money)}</>
                    }
                  </div>
                </div>
                
                <button 
                  className="submit-offer"
                  onClick={submitLoanRequest}
                  disabled={state.money < loanNegotiation.loanFee}
                >
                  Enviar solicitud de cesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de información del jugador */}
      {selectedPlayer && (
        <div className="transfers__modal-overlay" onClick={() => setSelectedPlayer(null)}>
          <div className="transfers__modal player-info" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Información del Jugador</h3>
              <button className="close-btn" onClick={() => setSelectedPlayer(null)}><X size={16} /></button>
            </div>
            
            <div className="modal-content">
              <div className="player-card">
                <div className="card-header">
                  <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                    {selectedPlayer.position}
                  </span>
                  <span className="ovr">{selectedPlayer.overall}</span>
                </div>
                <h4>{selectedPlayer.name}</h4>
                <p className="team">{selectedPlayer.teamName}</p>
                
                {selectedPlayer.personality && (
                  <div className="personality-badge">
                    <span className="icon">{PERSONALITIES[selectedPlayer.personality.type]?.icon}</span>
                    <span className="name">{PERSONALITIES[selectedPlayer.personality.type]?.name}</span>
                  </div>
                )}
              </div>
              
              <div className="player-stats">
                <div className="stat"><span>Edad</span><span>{selectedPlayer.age} años</span></div>
                <div className="stat"><span>Valor</span><span>{formatMoney(selectedPlayer.value)}</span></div>
                <div className="stat"><span>Salario</span><span>{formatMoney(selectedPlayer.salary)}/sem</span></div>
                <div className="stat"><span>Precio</span><span>{formatMoney(selectedPlayer.askingPrice)}</span></div>
                {selectedPlayer.releaseClause && (
                  <div className="stat highlight">
                    <span>Cláusula</span>
                    <span>{formatMoney(selectedPlayer.releaseClause)}</span>
                  </div>
                )}
                {selectedPlayer.contractYears && (
                  <div className="stat"><span>Contrato</span><span>{selectedPlayer.contractYears} año{selectedPlayer.contractYears > 1 ? 's' : ''}</span></div>
                )}
              </div>
              
              {/* Info de competencia */}
              {selectedPlayer.aiInterest?.length > 0 && (
                <div className="competition-info">
                  <h5><Flame size={16} /> Competencia</h5>
                  <div className="competitors">
                    {selectedPlayer.aiInterest.map((c, i) => (
                      <div key={i} className="competitor">
                        <span className="name">{c.shortName}</span>
                        <span className="likelihood">{c.likelihood}% interés</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Info de personalidad */}
              {selectedPlayer.personality?.specialGoal && (
                <div className="special-goal-info">
                  <h5>{SPECIAL_GOALS[selectedPlayer.personality.specialGoal]?.icon} Objetivo personal</h5>
                  <p>{SPECIAL_GOALS[selectedPlayer.personality.specialGoal]?.description}</p>
                </div>
              )}
              
              <button className="negotiate-full" onClick={() => {
                setSelectedPlayer(null);
                startNegotiation(selectedPlayer);
              }}>
                Iniciar Negociación
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de negociación */}
      {negotiation && (
        <div className="transfers__modal-overlay">
          <div className="transfers__modal negotiation" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Negociación</h3>
              <button className="close-btn" onClick={() => setNegotiation(null)}><X size={16} /></button>
            </div>
            
            <div className="modal-content">
              {/* Info del jugador */}
              <div className="negotiation-player">
                <div className="player-summary">
                  <span className="pos" style={{ background: getPositionColor(negotiation.player.position) }}>
                    {negotiation.player.position}
                  </span>
                  <div className="info">
                    <span className="name">{negotiation.player.name}</span>
                    <span className="team">de {negotiation.player.teamName}</span>
                  </div>
                  <span className="ovr">{negotiation.player.overall}</span>
                </div>
                
                {negotiation.personality && (
                  <div className="personality-info">
                    <span className="badge">
                      {negotiation.personality.icon} {negotiation.personality.name}
                    </span>
                    {negotiation.specialGoal && (
                      <span className="goal">{negotiation.specialGoal.icon} {negotiation.specialGoal.name}</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Competidores */}
              {negotiation.aiCompetitors?.length > 0 && (
                <div className="competitors-warning">
                  <span className="icon"><AlertTriangle size={16} /></span>
                  <span>Otros equipos interesados: {negotiation.aiCompetitors.map(c => c.shortName).join(', ')}</span>
                </div>
              )}
              
              {/* Barra de interés */}
              <div className="interest-section">
                <div className="interest-header">
                  <span>Interés del jugador</span>
                  <span style={{ color: getInterestColor(negotiation.playerInterest) }}>
                    {negotiation.playerInterest}%
                  </span>
                </div>
                <div className="interest-bar">
                  <div 
                    className="fill" 
                    style={{ 
                      width: `${negotiation.playerInterest}%`,
                      background: getInterestColor(negotiation.playerInterest)
                    }}
                  />
                </div>
                
                {/* Razones */}
                {negotiation.evaluation?.reasons && (
                  <div className="reasons">
                    {negotiation.evaluation.reasons.slice(0, 4).map((r, i) => (
                      <span key={i} className={r.positive ? 'positive' : 'negative'}>
                        {r.positive ? <Check size={12} /> : <X size={12} />} {r.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Contraoferta recibida */}
              {negotiation.stage === 'counter' && (
                <div className="counter-offer">
                  <h4><Mail size={16} /> Contraoferta recibida</h4>
                  <div className="counter-details">
                    <p>El club pide <strong>{formatMoney(negotiation.counterAmount)}</strong></p>
                    <p>Salario: <strong>{formatMoney(negotiation.counterSalary)}/sem</strong></p>
                    {negotiation.counterRole !== negotiation.promisedRole && (
                      <p>El jugador quiere ser <strong>{PLAYER_ROLES[negotiation.counterRole]?.name}</strong></p>
                    )}
                  </div>
                  <div className="counter-actions">
                    <button className="accept-counter" onClick={acceptCounter}>
                      <Check size={14} /> Aceptar contraoferta
                    </button>
                    <button className="reject-counter" onClick={() => setNegotiation(null)}>
                      <X size={14} /> Abandonar
                    </button>
                  </div>
                </div>
              )}
              
              {/* Formulario de oferta */}
              {negotiation.stage !== 'counter' && (
                <div className="offer-form">
                  {/* Traspaso */}
                  <div className="form-group">
                    <label><DollarSign size={14} /> Oferta de traspaso</label>
                    <div className="input-with-buttons">
                      <button onClick={() => updateNegotiationOffer('offerAmount', Math.max(0, negotiation.offerAmount - 1000000))}>-1M</button>
                      <span className="amount-display">{formatMoney(negotiation.offerAmount)}</span>
                      <button onClick={() => updateNegotiationOffer('offerAmount', negotiation.offerAmount + 1000000)}>+1M</button>
                    </div>
                    <div className="quick-buttons">
                      <button onClick={() => updateNegotiationOffer('offerAmount', Math.round(negotiation.player.value * 0.8))}>80%</button>
                      <button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.value)}>100%</button>
                      <button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.askingPrice)}>Precio</button>
                      <button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.releaseClause)}>Cláusula</button>
                    </div>
                  </div>
                  
                  {/* Salario */}
                  <div className="form-group">
                    <label><ClipboardList size={14} /> Salario semanal</label>
                    <div className="input-with-buttons">
                      <button onClick={() => updateNegotiationOffer('offerSalary', Math.max(10000, negotiation.offerSalary - 10000))}>-10K</button>
                      <span className="amount-display">{formatMoney(negotiation.offerSalary)}</span>
                      <button onClick={() => updateNegotiationOffer('offerSalary', negotiation.offerSalary + 10000)}>+10K</button>
                    </div>
                  </div>
                  
                  {/* Rol prometido */}
                  <div className="form-group">
                    <label><Target size={14} /> Rol prometido</label>
                    <div className="role-selector">
                      {Object.entries(PLAYER_ROLES).map(([key, role]) => (
                        <button
                          key={key}
                          className={negotiation.promisedRole === key ? 'active' : ''}
                          onClick={() => updateNegotiationOffer('promisedRole', key)}
                        >
                          {role.icon} {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Años de contrato */}
                  <div className="form-group">
                    <label><Calendar size={14} /> Duración del contrato</label>
                    <div className="contract-selector">
                      {[1, 2, 3, 4, 5].map(years => (
                        <button
                          key={years}
                          className={negotiation.contractYears === years ? 'active' : ''}
                          onClick={() => updateNegotiationOffer('contractYears', years)}
                        >
                          {years} año{years > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Resumen */}
                  <div className="offer-summary">
                    <div className="summary-row">
                      <span>Traspaso:</span>
                      <strong>{formatMoney(negotiation.offerAmount)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Salario anual:</span>
                      <strong>{formatMoney(negotiation.offerSalary * 52)}</strong>
                    </div>
                    <div className="summary-row total">
                      <span>Coste total ({negotiation.contractYears}a):</span>
                      <strong>{formatMoney(negotiation.offerAmount + negotiation.offerSalary * 52 * negotiation.contractYears)}</strong>
                    </div>
                    <div className={`budget-check ${state.money >= negotiation.offerAmount ? 'ok' : 'error'}`}>
                      {state.money >= negotiation.offerAmount 
                        ? <><Check size={12} /> Te quedarían {formatMoney(state.money - negotiation.offerAmount)}</>
                        : <><X size={12} /> Te faltan {formatMoney(negotiation.offerAmount - state.money)}</>
                      }
                    </div>
                  </div>
                  
                  <button 
                    className="submit-offer"
                    onClick={submitOffer}
                    disabled={state.money < negotiation.offerAmount}
                  >
                    Enviar Oferta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
