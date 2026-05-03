/* eslint-disable no-unused-vars, react-hooks/immutability, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { translatePosition, posToEN } from '../../game/positionNames';
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
import TeamCrest from '../TeamCrest/TeamCrest';
import { Zap, Globe, X, ShoppingCart, ClipboardList, DollarSign, Mail, Inbox, Search, Check, ArrowRightLeft } from 'lucide-react';
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
  summer: { start: 1, end: 8, nameKey: 'transfers.summerMarket', urgent: 7 },
  winter: { start: 20, end: 24, nameKey: 'transfers.winterMarket', urgent: 23 }
};

const PLAYER_ROLES = {
  star: { nameKey: 'transfers.roleStar', icon: <Star size={14} style={{fill:'currentColor'}} />, minutesPromise: 90, salaryMultiplier: 1.3 },
  starter: { nameKey: 'transfers.roleStarter', icon: <Circle size={14} style={{fill:'#30d158',color:'#30d158'}} />, minutesPromise: 75, salaryMultiplier: 1.1 },
  rotation: { nameKey: 'transfers.roleRotation', icon: <Circle size={14} style={{fill:'#ffd60a',color:'#ffd60a'}} />, minutesPromise: 50, salaryMultiplier: 1.0 },
  backup: { nameKey: 'transfers.roleBackup', icon: <Circle size={14} style={{fill:'#ff9f0a',color:'#ff9f0a'}} />, minutesPromise: 25, salaryMultiplier: 0.9 },
  youth: { nameKey: 'transfers.roleYouth', icon: <Circle size={14} style={{fill:'#3498db',color:'#3498db'}} />, minutesPromise: 15, salaryMultiplier: 0.8 }
};

// === UTILIDADES ===
const formatMoney = (amount) => {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
  return `€${amount}`;
};

const getPositionColor = (pos) => {
  const p = posToEN(pos);
  if (p === 'GK') return 'var(--color-warning)';
  if (['RB', 'CB', 'LB'].includes(p)) return '#3498db';
  if (['CDM', 'CM', 'CAM'].includes(p)) return 'var(--color-success)';
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
  return { nameKey: 'transfers.marketClosed', isOpen: false, isUrgent: false };
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
        teamName: 'Free Agent',
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
    if (state._batchMode) return;
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
    
    // Budget guard
    if (state.money < offerAmount) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'transfer',
          title: 'Fondos insuficientes',
          content: `No tienes suficiente presupuesto para fichar a ${player.name} (necesitas ${formatMoney(offerAmount)}, tienes ${formatMoney(state.money)})`,
          date: `Semana ${state.currentWeek}`
        }
      });
      setNegotiation(null);
      return;
    }
    
    // Counter-offer accepted = done deal
    if (negotiation.stage === 'final') {
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
          fee: offerAmount,
          fromTeamId: player.teamId
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
      return;
    }
    
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
          fee: offerAmount,
          fromTeamId: player.teamId
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
  }, [negotiation, state.currentWeek, state.money, dispatch]);
  
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
        title: 'Agente libre fichado',
        content: `${player.name} firma como agente libre (prima: ${formatMoney(totalCost)})`,
        date: `Semana ${state.currentWeek}`
      }
    });
  }, [state.money, state.currentWeek, dispatch]);
  
  // === MANEJO DE OFERTAS ENTRANTES ===
  const handleAcceptOffer = useCallback((offer) => {
    dispatch({ type: 'SELL_PLAYER', payload: { playerName: offer.player, fee: offer.amount, buyerTeamId: offer.teamId } });
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
      dispatch({ type: 'SELL_PLAYER', payload: { playerName: offer.player, fee: finalAmount, buyerTeamId: offer.teamId } });
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

  if (showMap) {
    return <TransferMap onSelectLeague={handleLeagueSelect} onClose={() => setShowMap(false)} />;
  }

  const roleLabels = { star: 'Estrella', starter: 'Titular', rotation: 'Rotación', backup: 'Suplente', youth: 'Joven' };
  const teamName = state.team?.name || 'Tu equipo';
  const shortlist = filteredPlayers.slice(0, 8);
  const priorityPlayers = filteredPlayers.filter(p => !p.isFreeAgent).slice(0, 3);
  const firstLoanCandidate = loanCandidates[0];
  const activeIncomingOffers = Array.isArray(state.transferOffers) ? state.transferOffers : [];
  const activeCount = activeIncomingOffers.length + pendingLoanOffers.length + (firstLoanCandidate ? 1 : 0) + priorityPlayers.length;
  const getOperationLabel = (player) => {
    if (player.isFreeAgent) return 'Libre';
    if (player.isForSale) return 'En venta';
    if (player.contractExpiring) return 'Fin contrato';
    if (player.isUnhappy) return 'Oportunidad';
    return 'Traspaso';
  };

  const TransferCard = ({ player, compact = false }) => (
    <article className={`transfers__simple-player ${compact ? 'compact' : ''}`}>
      <div className="transfers__club-line">
        <TeamCrest teamId={player.teamId || 'free-agent'} size={compact ? 30 : 36} />
        <div><strong>{player.name}</strong><span>{player.teamName || 'Agente libre'}</span></div>
      </div>
      <div className="transfers__simple-meta">
        <span className="pos" style={{ color: getPositionColor(player.position) }}>{translatePosition(player.position)}</span>
        <span>{player.age} años</span><span className="ovr">{player.overall}</span>
      </div>
      <div className="transfers__simple-footer">
        <div><small>{getOperationLabel(player)}</small><b>{player.isFreeAgent ? `Prima ${formatMoney(player.signingBonus)}` : formatMoney(player.askingPrice)}</b></div>
        <button className="transfers__primary-action" onClick={() => player.isFreeAgent ? signFreeAgent(player) : startNegotiation(player)} disabled={player.isFreeAgent ? state.money < player.signingBonus : state.money < player.askingPrice * 0.3}>{player.isFreeAgent ? 'Fichar' : 'Negociar'}</button>
      </div>
    </article>
  );

  const LoanCard = ({ candidate }) => (
    <article className="transfers__simple-player transfers__simple-player--loan">
      <div className="transfers__club-line"><TeamCrest teamId={candidate.teamId || 'loan'} size={36} /><div><strong>{candidate.name}</strong><span>{candidate.teamName}</span></div></div>
      <div className="transfers__simple-meta"><span className="pos" style={{ color: getPositionColor(candidate.position) }}>{translatePosition(candidate.position)}</span><span>{candidate.age} años</span><span className="ovr">{candidate.overall}</span></div>
      <p className="transfers__microcopy">{candidate.reason || 'Disponible para minutos'}</p>
      <div className="transfers__simple-footer"><div><small>Cesión</small><b>{formatMoney(candidate.loanFee)}</b></div><button className="transfers__primary-action" onClick={() => handleRequestLoan(candidate)} disabled={!transferWindow.isOpen || state.money < candidate.loanFee}>Pedir cesión</button></div>
    </article>
  );

  const OfferCard = ({ offer }) => (
    <article className="transfers__operation-card">
      <div className="transfers__club-line"><TeamCrest teamId={offer.teamId || offer.teamShortName || 'buyer'} size={34} /><div><strong>{offer.team}</strong><span>Quiere a {offer.player}</span></div></div>
      <div className="transfers__operation-price"><small>Oferta</small><b>{formatMoney(offer.amount)}</b></div>
      <div className="transfers__operation-actions"><button onClick={() => handleAcceptOffer(offer)}><Check size={13} /> Aceptar</button><button onClick={() => handleCounterOffer(offer)}>Negociar</button><button className="danger" onClick={() => handleRejectOffer(offer)}><X size={13} /> Rechazar</button></div>
    </article>
  );

  const LoanOfferCard = ({ offer }) => (
    <article className="transfers__operation-card">
      <div className="transfers__club-line"><TeamCrest teamId={offer.toTeamId || 'loan-offer'} size={34} /><div><strong>{offer.toTeamName}</strong><span>Solicita a {offer.playerData?.name || offer.playerId}</span></div></div>
      <div className="transfers__operation-price"><small>Fee + salario</small><b>{formatMoney(offer.loanFee)} · {Math.round(offer.salaryShare * 100)}%</b></div>
      <div className="transfers__operation-actions"><button onClick={() => handleAcceptLoanOffer(offer)}><Check size={13} /> Aceptar</button><button className="danger" onClick={() => handleRejectLoanOffer(offer)}><X size={13} /> Rechazar</button></div>
    </article>
  );

  return (
    <div className="transfers transfers--simple">
      <div className="transfers__simple-header"><div><p className="transfers__eyebrow">Mercado de fichajes</p><h2>Fichajes</h2><p>Decide rápido: necesidades, operaciones activas y mercado completo.</p></div><div className="transfers__money-box"><span>Presupuesto</span><strong>{formatMoney(state.money)}</strong></div></div>

      <div className="transfers__tabs transfers__tabs--simple">
        <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}><ShoppingCart size={14} /> Mercado <span className="count">{marketPlayers.length}</span></button>
        <button className={tab === 'loans' ? 'active' : ''} onClick={() => setTab('loans')}><ArrowRightLeft size={14} /> Cesiones <span className="count">{loanCandidates.length}</span></button>
        <button className={tab === 'freeagents' ? 'active' : ''} onClick={() => setTab('freeagents')}><ClipboardList size={14} /> Libres <span className="count">{freeAgents.length}</span></button>
        <button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}><Mail size={14} /> Ofertas {activeIncomingOffers.length > 0 && <span className="badge">{activeIncomingOffers.length}</span>}</button>
        <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}><DollarSign size={14} /> Vender</button>
        <button onClick={() => setShowMap(true)}><Globe size={14} /> Mapa</button>
      </div>

      <section className="transfers__market-roadmap">
        <article className="transfers__main-card">
          <div className="transfers__section-head"><div><p className="transfers__eyebrow">Tu mercado</p><h3>{teamName}</h3></div><span className={`transfers__status-pill ${transferWindow.isOpen ? 'open' : 'closed'}`}>{transferWindow.isOpen ? 'Mercado abierto' : 'Mercado cerrado'}</span></div>
          <div className="transfers__need-grid"><div><small>Objetivo principal</small><strong>Refuerzo inmediato</strong><span>Prioriza jugadores negociables y cesiones útiles.</span></div><div><small>Operaciones vivas</small><strong>{activeCount}</strong><span>Fichajes, ofertas y cesiones pendientes.</span></div><div><small>Scouting</small><strong>Nv. {scoutingLevel}</strong><span>{selectedLeague ? 'Filtro de liga activo' : 'Todas las ligas visibles'}</span></div></div>
        </article>
        <aside className="transfers__next-card"><div className="transfers__section-head compact"><div><p className="transfers__eyebrow">Próximos movimientos</p><h3>Hoy</h3></div><Zap size={18} /></div><div className="transfers__next-list">
          {priorityPlayers.slice(0, 2).map(player => <button key={player.id} onClick={() => startNegotiation(player)}><TeamCrest teamId={player.teamId} size={28} /><span>{player.name}</span><b>{formatMoney(player.askingPrice)}</b></button>)}
          {firstLoanCandidate && <button onClick={() => handleRequestLoan(firstLoanCandidate)}><TeamCrest teamId={firstLoanCandidate.teamId} size={28} /><span>Cesión: {firstLoanCandidate.name}</span><b>{formatMoney(firstLoanCandidate.loanFee)}</b></button>}
          {activeIncomingOffers[0] && <button onClick={() => setTab('offers')}><TeamCrest teamId={activeIncomingOffers[0].teamId} size={28} /><span>Oferta por {activeIncomingOffers[0].player}</span><b>{formatMoney(activeIncomingOffers[0].amount)}</b></button>}
        </div></aside>
      </section>

      {tab === 'market' && <section className="transfers__simple-section"><div className="transfers__section-head"><div><p className="transfers__eyebrow">Mercado completo</p><h3>Candidatos recomendados</h3></div><div className="transfers__search-box"><Search size={14} /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar jugador o club" /></div></div><div className="transfers__simple-grid">{shortlist.map(player => <TransferCard key={player.id} player={player} />)}</div></section>}
      {tab === 'freeagents' && <section className="transfers__simple-section"><div className="transfers__section-head"><div><p className="transfers__eyebrow">Sin traspaso</p><h3>Agentes libres</h3></div></div><div className="transfers__simple-grid">{filteredPlayers.slice(0, 8).map(player => <TransferCard key={player.id} player={player} />)}</div></section>}

      {tab === 'loans' && <section className="transfers__simple-section transfers__simple-section--loans"><div className="transfers__section-head"><div><p className="transfers__eyebrow">Cesiones</p><h3>Refuerzos temporales</h3></div><div className="transfers__loan-switch"><button className={loanSubTab === 'available' ? 'active' : ''} onClick={() => setLoanSubTab('available')}>Disponibles</button><button className={loanSubTab === 'myLoans' ? 'active' : ''} onClick={() => setLoanSubTab('myLoans')}>Cedidos</button><button className={loanSubTab === 'received' ? 'active' : ''} onClick={() => setLoanSubTab('received')}>Recibidos</button><button className={loanSubTab === 'offers' ? 'active' : ''} onClick={() => setLoanSubTab('offers')}>Ofertas</button></div></div>
        {loanSubTab === 'available' && (loanCandidates.length === 0 ? <div className="transfers__empty"><Inbox size={20} /><p>No hay cesiones disponibles ahora.</p></div> : <div className="transfers__simple-grid">{loanCandidates.slice(0, 8).map((candidate, idx) => <LoanCard key={`${candidate.teamId}_${candidate.name}_${idx}`} candidate={candidate} />)}</div>)}
        {loanSubTab === 'myLoans' && <div className="transfers__operations-list">{myLoanedOut.length === 0 ? <div className="transfers__empty"><Inbox size={20} /><p>No tienes jugadores cedidos fuera.</p></div> : myLoanedOut.map(loan => <article key={loan.id} className="transfers__operation-card"><div className="transfers__club-line"><TeamCrest teamId={loan.toTeamId} size={34} /><div><strong>{loan.playerData?.name || loan.playerId}</strong><span>En {loan.toTeamName}</span></div></div><div className="transfers__operation-price"><small>Restan</small><b>{loan.weeksRemaining} sem.</b></div></article>)}</div>}
        {loanSubTab === 'received' && <div className="transfers__operations-list">{myLoanedIn.length === 0 ? <div className="transfers__empty"><Inbox size={20} /><p>No tienes jugadores recibidos en cesión.</p></div> : myLoanedIn.map(loan => <article key={loan.id} className="transfers__operation-card"><div className="transfers__club-line"><TeamCrest teamId={loan.fromTeamId} size={34} /><div><strong>{loan.playerData?.name || loan.playerId}</strong><span>Propiedad de {loan.fromTeamName}</span></div></div><div className="transfers__operation-price"><small>Restan</small><b>{loan.weeksRemaining} sem.</b></div>{loan.purchaseOption && <div className="transfers__operation-actions"><button onClick={() => handleExercisePurchaseOption(loan)} disabled={state.money < loan.purchaseOption}>Comprar {formatMoney(loan.purchaseOption)}</button></div>}</article>)}</div>}
        {loanSubTab === 'offers' && <div className="transfers__operations-list">{pendingLoanOffers.length === 0 ? <div className="transfers__empty"><Inbox size={20} /><p>No hay ofertas de cesión pendientes.</p></div> : pendingLoanOffers.map(offer => <LoanOfferCard key={offer.id} offer={offer} />)}</div>}
      </section>}

      {tab === 'offers' && <section className="transfers__simple-section"><div className="transfers__section-head"><div><p className="transfers__eyebrow">Bandeja</p><h3>Ofertas recibidas</h3></div></div><div className="transfers__operations-list">{activeIncomingOffers.length === 0 ? <div className="transfers__empty"><Inbox size={20} /><p>No hay ofertas pendientes.</p></div> : activeIncomingOffers.map(offer => <OfferCard key={offer.id} offer={offer} />)}</div></section>}
      {tab === 'sell' && <section className="transfers__simple-section"><div className="transfers__section-head"><div><p className="transfers__eyebrow">Ventas</p><h3>Tu plantilla</h3></div></div><div className="transfers__simple-grid">{(state.team?.players || []).filter(p => !p.onLoan).sort((a, b) => b.value - a.value).slice(0, 8).map((player, idx) => <article key={`${player.name}_${idx}`} className="transfers__simple-player"><div className="transfers__club-line"><TeamCrest teamId={state.teamId} size={36} /><div><strong>{player.name}</strong><span>{teamName}</span></div></div><div className="transfers__simple-meta"><span className="pos" style={{ color: getPositionColor(player.position) }}>{translatePosition(player.position)}</span><span>{player.age} años</span><span className="ovr">{player.overall}</span></div><div className="transfers__simple-footer"><div><small>Valor</small><b>{formatMoney(player.value)}</b></div><button className="transfers__primary-action" onClick={() => { if (window.confirm(`¿Vender a ${player.name} por ${formatMoney(Math.round(player.value * 0.85))}?`)) { const buyers = (state.leagueTeams || []).filter(t => t.id !== state.teamId); const buyerId = buyers.length > 0 ? buyers[Math.floor(Math.random() * buyers.length)].id : null; dispatch({ type: 'SELL_PLAYER', payload: { playerName: player.name, fee: Math.round(player.value * 0.85), buyerTeamId: buyerId } }); } }}>Vender</button></div></article>)}</div></section>}

      {negotiation && <div className="transfers__modal-overlay transfers__modal-overlay--clean" onClick={() => setNegotiation(null)}><div className="transfers__modal transfers__deal-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><p className="transfers__eyebrow">Negociación</p><h3>Oferta de traspaso</h3></div><button className="close-btn" onClick={() => setNegotiation(null)}><X size={16} /></button></div><div className="transfers__deal-route"><div className="transfers__club-line"><TeamCrest teamId={negotiation.player.teamId} size={42} /><div><strong>{negotiation.player.teamName}</strong><span>Club vendedor</span></div></div><ArrowRightLeft size={18} /><div className="transfers__club-line"><TeamCrest teamId={state.teamId} size={42} /><div><strong>{teamName}</strong><span>Tu club</span></div></div></div><div className="transfers__modal-player"><strong>{negotiation.player.name}</strong><span>{translatePosition(negotiation.player.position)} · {negotiation.player.age} años · {negotiation.player.overall} OVR</span></div>{negotiation.stage === 'counter' ? <div className="transfers__counter-box"><h4>Contraoferta recibida</h4><p>El club pide <strong>{formatMoney(negotiation.counterAmount)}</strong> y salario de <strong>{formatMoney(negotiation.counterSalary)}/sem</strong>.</p><div className="transfers__modal-actions"><button onClick={acceptCounter}>Aceptar contraoferta</button><button className="danger" onClick={() => setNegotiation(null)}>Abandonar</button></div></div> : <div className="transfers__deal-form"><label><span>Oferta de traspaso</span><b>Recomendado: {formatMoney(negotiation.player.askingPrice)}</b></label><div className="transfers__stepper"><button onClick={() => updateNegotiationOffer('offerAmount', Math.max(0, negotiation.offerAmount - 1000000))}>-1M</button><strong>{formatMoney(negotiation.offerAmount)}</strong><button onClick={() => updateNegotiationOffer('offerAmount', negotiation.offerAmount + 1000000)}>+1M</button></div><div className="transfers__quick-actions"><button onClick={() => updateNegotiationOffer('offerAmount', Math.round(negotiation.player.value * 0.8))}>80%</button><button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.value)}>Valor</button><button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.askingPrice)}>Precio</button><button onClick={() => updateNegotiationOffer('offerAmount', negotiation.player.releaseClause)}>Cláusula</button></div><label><span>Salario semanal</span><b>Actual: {formatMoney(negotiation.player.salary)}/sem</b></label><div className="transfers__stepper"><button onClick={() => updateNegotiationOffer('offerSalary', Math.max(10000, negotiation.offerSalary - 10000))}>-10K</button><strong>{formatMoney(negotiation.offerSalary)}</strong><button onClick={() => updateNegotiationOffer('offerSalary', negotiation.offerSalary + 10000)}>+10K</button></div><label><span>Rol prometido</span></label><div className="transfers__role-grid">{Object.keys(PLAYER_ROLES).map(key => <button key={key} className={negotiation.promisedRole === key ? 'active' : ''} onClick={() => updateNegotiationOffer('promisedRole', key)}>{roleLabels[key]}</button>)}</div><label><span>Contrato</span></label><div className="transfers__role-grid compact">{[1, 2, 3, 4, 5].map(years => <button key={years} className={negotiation.contractYears === years ? 'active' : ''} onClick={() => updateNegotiationOffer('contractYears', years)}>{years}a</button>)}</div><div className="transfers__deal-summary"><span>Coste inmediato</span><strong>{formatMoney(negotiation.offerAmount)}</strong><small>{state.money >= negotiation.offerAmount ? `Te quedarían ${formatMoney(state.money - negotiation.offerAmount)}` : `Te faltan ${formatMoney(negotiation.offerAmount - state.money)}`}</small></div><div className="transfers__modal-actions"><button className="ghost" onClick={() => setNegotiation(null)}>Cancelar</button><button onClick={submitOffer} disabled={state.money < negotiation.offerAmount}>Enviar oferta</button></div></div>}</div></div>}

      {loanNegotiation && <div className="transfers__modal-overlay transfers__modal-overlay--clean" onClick={() => setLoanNegotiation(null)}><div className="transfers__modal transfers__deal-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><p className="transfers__eyebrow">Cesión</p><h3>Solicitud de cesión</h3></div><button className="close-btn" onClick={() => setLoanNegotiation(null)}><X size={16} /></button></div><div className="transfers__deal-route"><div className="transfers__club-line"><TeamCrest teamId={loanNegotiation.candidate.teamId} size={42} /><div><strong>{loanNegotiation.candidate.teamName}</strong><span>Propietario</span></div></div><ArrowRightLeft size={18} /><div className="transfers__club-line"><TeamCrest teamId={state.teamId} size={42} /><div><strong>{teamName}</strong><span>Tu club</span></div></div></div><div className="transfers__modal-player"><strong>{loanNegotiation.candidate.name}</strong><span>{translatePosition(loanNegotiation.candidate.position)} · {loanNegotiation.candidate.age} años · {loanNegotiation.candidate.overall} OVR</span></div><div className="transfers__deal-form"><label><span>Fee de cesión</span><b>Recomendado: {formatMoney(loanNegotiation.candidate.loanFee)}</b></label><div className="transfers__stepper"><button onClick={() => setLoanNegotiation(prev => ({ ...prev, loanFee: Math.max(0, prev.loanFee - 500000) }))}>-0.5M</button><strong>{formatMoney(loanNegotiation.loanFee)}</strong><button onClick={() => setLoanNegotiation(prev => ({ ...prev, loanFee: prev.loanFee + 500000 }))}>+0.5M</button></div><label><span>Parte del salario que pagas</span><b>{Math.round(loanNegotiation.salaryShare * 100)}%</b></label><div className="transfers__role-grid compact">{[0.25, 0.5, 0.75, 1].map(share => <button key={share} className={loanNegotiation.salaryShare === share ? 'active' : ''} onClick={() => setLoanNegotiation(prev => ({ ...prev, salaryShare: share }))}>{Math.round(share * 100)}%</button>)}</div><label><span>Opción de compra</span></label><div className="transfers__stepper"><button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: prev.purchaseOption ? Math.max(0, prev.purchaseOption - 1000000) : null }))}>-1M</button><strong>{loanNegotiation.purchaseOption ? formatMoney(loanNegotiation.purchaseOption) : 'Sin opción'}</strong><button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: (prev.purchaseOption || prev.candidate.marketValue || 5000000) + 1000000 }))}>+1M</button></div><div className="transfers__quick-actions"><button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: null }))}>Sin opción</button><button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: Math.round((prev.candidate.marketValue || 5000000) * 0.9) }))}>90%</button><button onClick={() => setLoanNegotiation(prev => ({ ...prev, purchaseOption: prev.candidate.marketValue || 5000000 }))}>100%</button></div><div className="transfers__deal-summary"><span>Coste inmediato</span><strong>{formatMoney(loanNegotiation.loanFee)}</strong><small>{state.money >= loanNegotiation.loanFee ? `Te quedarían ${formatMoney(state.money - loanNegotiation.loanFee)}` : `Te faltan ${formatMoney(loanNegotiation.loanFee - state.money)}`}</small></div><div className="transfers__modal-actions"><button className="ghost" onClick={() => setLoanNegotiation(null)}>Cancelar</button><button onClick={submitLoanRequest} disabled={state.money < loanNegotiation.loanFee}>Enviar solicitud</button></div></div></div></div>}
    </div>
  );
}
