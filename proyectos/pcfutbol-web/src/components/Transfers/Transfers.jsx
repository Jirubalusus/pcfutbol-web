import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  LALIGA_TEAMS, 
  SEGUNDA_TEAMS,
  PREMIER_LEAGUE_TEAMS,
  LIGUE1_TEAMS,
  BUNDESLIGA_TEAMS,
  SERIE_A_TEAMS,
  EREDIVISIE_TEAMS,
  PRIMEIRA_LIGA_TEAMS,
  getTeamsByLeague
} from '../../data/teams';
import { 
  PERSONALITIES, 
  SPECIAL_GOALS, 
  generatePlayerPersonality, 
  evaluateTransferOffer 
} from '../../game/playerPersonality';
import TransferMap from './TransferMap';
import './Transfers.scss';
import './TransferMap.scss';

const ALL_TEAMS = [
  ...LALIGA_TEAMS, 
  ...SEGUNDA_TEAMS,
  ...(PREMIER_LEAGUE_TEAMS || []),
  ...(LIGUE1_TEAMS || []),
  ...(BUNDESLIGA_TEAMS || []),
  ...(SERIE_A_TEAMS || []),
  ...(EREDIVISIE_TEAMS || []),
  ...(PRIMEIRA_LIGA_TEAMS || [])
];

// === CONSTANTES DEL MERCADO ===
const TRANSFER_WINDOWS = {
  summer: { start: 1, end: 8, name: 'Mercado de Verano', urgent: 7 },
  winter: { start: 20, end: 24, name: 'Mercado de Invierno', urgent: 23 }
};

const PLAYER_ROLES = {
  star: { name: 'Estrella', icon: '⭐', minutesPromise: 90, salaryMultiplier: 1.3 },
  starter: { name: 'Titular', icon: '🟢', minutesPromise: 75, salaryMultiplier: 1.1 },
  rotation: { name: 'Rotación', icon: '🟡', minutesPromise: 50, salaryMultiplier: 1.0 },
  backup: { name: 'Suplente', icon: '🟠', minutesPromise: 25, salaryMultiplier: 0.9 },
  youth: { name: 'Proyecto', icon: '🔵', minutesPromise: 15, salaryMultiplier: 0.8 }
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
  
  ALL_TEAMS.forEach((team, idx) => {
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
    ALL_TEAMS.forEach(team => {
      if (team.id === state.teamId || !team.players) return;
      
      // Determinar la liga del equipo
      const teamLeague = team.leagueId || 
        (LALIGA_TEAMS.some(t => t.id === team.id) ? 'laliga' :
         SEGUNDA_TEAMS.some(t => t.id === team.id) ? 'segunda' :
         PREMIER_LEAGUE_TEAMS?.some(t => t.id === team.id) ? 'premierLeague' :
         LIGUE1_TEAMS?.some(t => t.id === team.id) ? 'ligue1' :
         BUNDESLIGA_TEAMS?.some(t => t.id === team.id) ? 'bundesliga' :
         SERIE_A_TEAMS?.some(t => t.id === team.id) ? 'serieA' :
         EREDIVISIE_TEAMS?.some(t => t.id === team.id) ? 'eredivisie' :
         PRIMEIRA_LIGA_TEAMS?.some(t => t.id === team.id) ? 'primeiraLiga' : null);
      
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
  useEffect(() => {
    if (state.team?.players && state.currentWeek > 1 && transferWindow.isOpen) {
      const existingOfferCount = state.transferOffers?.length || 0;
      const offerChance = transferWindow.isUrgent ? 0.5 : 0.3;
      
      if (existingOfferCount < 5 && Math.random() < offerChance) {
        generateIncomingOffer();
      }
    }
  }, [state.currentWeek]);
  
  const generateIncomingOffer = useCallback(() => {
    const players = state.team?.players || [];
    if (players.length === 0) return;
    
    // Seleccionar jugador objetivo (no siempre los mejores)
    const weightedPlayers = players.map(p => ({
      ...p,
      weight: p.value * (p.overall >= 80 ? 1.5 : 1) * (p.age <= 27 ? 1.3 : 1)
    }));
    weightedPlayers.sort((a, b) => b.weight - a.weight);
    
    const targetIndex = Math.floor(Math.random() * Math.min(8, weightedPlayers.length));
    const targetPlayer = weightedPlayers[targetIndex];
    
    // Seleccionar equipo que hace la oferta (coherente con el nivel del jugador)
    const suitableTeams = ALL_TEAMS.filter(t => {
      if (t.id === state.teamId) return false;
      const repDiff = Math.abs((t.reputation || 70) - targetPlayer.overall);
      return repDiff < 20 && (t.budget || 50000000) > targetPlayer.value * 0.4;
    });
    
    if (suitableTeams.length === 0) return;
    const offeringTeam = suitableTeams[Math.floor(Math.random() * suitableTeams.length)];
    
    // Calcular oferta
    const basePercent = 0.65 + Math.random() * 0.35;
    const urgencyBonus = transferWindow.isUrgent ? 0.1 : 0;
    const teamBonus = (offeringTeam.reputation || 70) > (state.team?.reputation || 70) ? 0.05 : 0;
    const offerPercent = Math.min(1.2, basePercent + urgencyBonus + teamBonus);
    const offerAmount = Math.round(targetPlayer.value * offerPercent);
    
    if (state.transferOffers?.some(o => o.player === targetPlayer.name)) return;
    
    const offer = {
      id: Date.now() + Math.random(),
      player: targetPlayer.name,
      playerPosition: targetPlayer.position,
      playerOverall: targetPlayer.overall,
      playerValue: targetPlayer.value,
      playerAge: targetPlayer.age,
      teamId: offeringTeam.id,
      team: offeringTeam.name,
      teamShortName: offeringTeam.shortName,
      teamReputation: offeringTeam.reputation || 70,
      amount: offerAmount,
      offerPercent: Math.round(offerPercent * 100),
      week: state.currentWeek,
      negotiationRound: 0,
      maxNegotiations: 3,
      expiresIn: transferWindow.isUrgent ? 1 : 3,
      isUrgent: transferWindow.isUrgent
    };
    
    dispatch({ type: 'ADD_TRANSFER_OFFER', payload: offer });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer_offer',
        title: `📨 Oferta por ${targetPlayer.name}`,
        content: `${offeringTeam.name} ofrece ${formatMoney(offerAmount)} (${offer.offerPercent}% del valor)${offer.isUrgent ? ' ⚡ URGENTE' : ''}`,
        date: `Semana ${state.currentWeek}`
      }
    });
  }, [state.team, state.teamId, state.currentWeek, state.transferOffers, transferWindow, dispatch]);
  
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
          title: `😤 Fichaje robado`,
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
          title: `✅ ¡Fichaje cerrado!`,
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
          title: `❌ Fichaje fallido`,
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
        title: `✅ Agente libre fichado`,
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
        title: `💰 Venta completada`,
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
          title: `💔 Negociación rota`,
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
          title: `💰 Negociación exitosa`,
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
          title: `💬 Nueva oferta`,
          content: `${offer.team} mejora: ${formatMoney(newAmount)} por ${offer.player}`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
  }, [state.currentWeek, dispatch]);
  
  const handleRejectOffer = useCallback((offer) => {
    dispatch({ type: 'REMOVE_TRANSFER_OFFER', payload: offer.id });
  }, [dispatch]);
  
  const toggleWatchlist = useCallback((player) => {
    setWatchlist(prev => 
      prev.some(p => p.id === player.id) 
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  }, []);
  
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
            {transferWindow.isUrgent && <span className="urgent-icon">⚡</span>}
            {transferWindow.name}
            {transferWindow.isUrgent && <span className="urgent-text">¡Últimos días!</span>}
          </div>
        </div>
        <div className="transfers__header-actions">
          <button className="map-btn" onClick={() => setShowMap(true)}>
            🌍 Explorar Mapa
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
          <button className="clear" onClick={() => setSelectedLeague(null)}>✕ Quitar filtro</button>
        </div>
      )}
      
      {/* Tabs */}
      <div className="transfers__tabs">
        <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}>
          🛒 Mercado <span className="count">{marketPlayers.length}</span>
        </button>
        <button className={tab === 'freeagents' ? 'active' : ''} onClick={() => setTab('freeagents')}>
          📋 Libres <span className="count">{freeAgents.length}</span>
        </button>
        <button className={tab === 'watchlist' ? 'active' : ''} onClick={() => setTab('watchlist')}>
          ⭐ Seguimiento <span className="count">{watchlist.length}</span>
        </button>
        <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>
          💰 Vender
        </button>
        <button 
          className={`${tab === 'offers' ? 'active' : ''} ${state.transferOffers?.length > 0 ? 'has-offers' : ''}`}
          onClick={() => setTab('offers')}
        >
          📩 Ofertas {state.transferOffers?.length > 0 && <span className="badge">{state.transferOffers.length}</span>}
        </button>
      </div>
      
      {/* Market/Free Agents/Watchlist */}
      {(tab === 'market' || tab === 'freeagents' || tab === 'watchlist') && (
        <div className="transfers__market">
          {/* Filtros */}
          <div className="transfers__filters">
            <input 
              type="text" 
              placeholder="🔍 Buscar jugador o equipo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
              <option value="all">Todas las posiciones</option>
              <option value="GK">🧤 Portero</option>
              <option value="CB">🛡️ Central</option>
              <option value="RB">➡️ Lateral Der.</option>
              <option value="LB">⬅️ Lateral Izq.</option>
              <option value="CDM">⚓ Pivote</option>
              <option value="CM">🎯 Centrocampista</option>
              <option value="CAM">✨ Mediapunta</option>
              <option value="RW">🏃 Extremo Der.</option>
              <option value="LW">🏃 Extremo Izq.</option>
              <option value="ST">⚽ Delantero</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="overall">📊 Mayor media</option>
              <option value="price_low">💰 Menor precio</option>
              <option value="price_high">💎 Mayor precio</option>
              <option value="age_young">👶 Más joven</option>
              <option value="value">📈 Mejor valor</option>
              <option value="easy">✅ Más fácil</option>
            </select>
            <button 
              className={`filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              ⚙️
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
            {scoutingLevel > 0 && <span className="scout-info">🔭 Scouting Nv.{scoutingLevel}</span>}
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
                        🔥 {player.aiInterest.length} equipo{player.aiInterest.length > 1 ? 's' : ''} interesado{player.aiInterest.length > 1 ? 's' : ''}
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
                      {watchlist.some(p => p.id === player.id) ? '⭐' : '☆'}
                    </button>
                  )}
                  <button 
                    className="info-btn"
                    onClick={() => setSelectedPlayer(player)}
                    title="Ver información"
                  >
                    ℹ️
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
            {state.team?.players?.sort((a, b) => b.value - a.value).map((player, idx) => (
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
              <span className="icon">📭</span>
              <p>No tienes ofertas pendientes</p>
              <p className="hint">Las ofertas llegan durante las ventanas de mercado</p>
            </div>
          ) : (
            <div className="transfers__offers-list">
              {state.transferOffers.map(offer => (
                <div key={offer.id} className={`transfers__offer ${offer.isUrgent ? 'urgent' : ''}`}>
                  {offer.isUrgent && <div className="urgent-banner">⚡ OFERTA URGENTE</div>}
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
                      ✓ Aceptar
                    </button>
                    <button className="counter" onClick={() => handleCounterOffer(offer)}>
                      💬 Negociar
                    </button>
                    <button className="reject" onClick={() => handleRejectOffer(offer)}>
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Modal de información del jugador */}
      {selectedPlayer && (
        <div className="transfers__modal-overlay" onClick={() => setSelectedPlayer(null)}>
          <div className="transfers__modal player-info" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Información del Jugador</h3>
              <button className="close-btn" onClick={() => setSelectedPlayer(null)}>✕</button>
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
                  <h5>🔥 Competencia</h5>
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
              <button className="close-btn" onClick={() => setNegotiation(null)}>✕</button>
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
                  <span className="icon">⚠️</span>
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
                        {r.positive ? '✓' : '✗'} {r.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Contraoferta recibida */}
              {negotiation.stage === 'counter' && (
                <div className="counter-offer">
                  <h4>📨 Contraoferta recibida</h4>
                  <div className="counter-details">
                    <p>El club pide <strong>{formatMoney(negotiation.counterAmount)}</strong></p>
                    <p>Salario: <strong>{formatMoney(negotiation.counterSalary)}/sem</strong></p>
                    {negotiation.counterRole !== negotiation.promisedRole && (
                      <p>El jugador quiere ser <strong>{PLAYER_ROLES[negotiation.counterRole]?.name}</strong></p>
                    )}
                  </div>
                  <div className="counter-actions">
                    <button className="accept-counter" onClick={acceptCounter}>
                      ✓ Aceptar contraoferta
                    </button>
                    <button className="reject-counter" onClick={() => setNegotiation(null)}>
                      ✗ Abandonar
                    </button>
                  </div>
                </div>
              )}
              
              {/* Formulario de oferta */}
              {negotiation.stage !== 'counter' && (
                <div className="offer-form">
                  {/* Traspaso */}
                  <div className="form-group">
                    <label>💰 Oferta de traspaso</label>
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
                    <label>📋 Salario semanal</label>
                    <div className="input-with-buttons">
                      <button onClick={() => updateNegotiationOffer('offerSalary', Math.max(10000, negotiation.offerSalary - 10000))}>-10K</button>
                      <span className="amount-display">{formatMoney(negotiation.offerSalary)}</span>
                      <button onClick={() => updateNegotiationOffer('offerSalary', negotiation.offerSalary + 10000)}>+10K</button>
                    </div>
                  </div>
                  
                  {/* Rol prometido */}
                  <div className="form-group">
                    <label>🎯 Rol prometido</label>
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
                    <label>📅 Duración del contrato</label>
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
                        ? `✓ Te quedarían ${formatMoney(state.money - negotiation.offerAmount)}`
                        : `✗ Te faltan ${formatMoney(negotiation.offerAmount - state.money)}`
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
