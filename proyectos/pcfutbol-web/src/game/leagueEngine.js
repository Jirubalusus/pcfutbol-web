// League Engine v2.0 - Motor de simulación realista
import { simulateMatchV2 } from './matchSimulationV2';
import { generateAIForm } from './formSystem';

// Re-export shared constants/functions for backward compatibility
export { FORMATIONS, TACTICS, TACTICAL_MATCHUPS, getTacticalMatchupBonus, calculateTeamStrength } from './gameShared';
import { FORMATIONS, TACTICS, TACTICAL_MATCHUPS, calculateTeamStrength, getEffectiveRating, selectBestLineup } from './gameShared';

// ============== INICIALIZACIÓN DE LIGA ==============
export function initializeLeague(teams, playerTeamId) {
  const table = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    shortName: team.shortName || team.name?.substring(0, 3).toUpperCase() || team.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    homeForm: [],
    awayForm: [],
    isPlayer: team.id === playerTeamId,
    streak: 0, // Positive = wins, negative = losses
    morale: 70 // 0-100
  }));
  
  const fixtures = generateFixtures(teams);
  
  return { table, fixtures };
}

// ============== GENERACIÓN DE CALENDARIO ==============
export function generateFixtures(teams) {
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const fixtures = [];
  
  const teamList = [...teamIds];
  if (n % 2 !== 0) teamList.push(null);
  
  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  const rounds = [];
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamList[match];
      const away = teamList[numTeams - 1 - match];
      
      if (home && away) {
        roundMatches.push({
          id: `${round + 1}_${match}`,
          week: round + 1,
          homeTeam: home,
          awayTeam: away,
          homeScore: null,
          awayScore: null,
          played: false,
          events: []
        });
      }
    }
    
    rounds.push(roundMatches);
    const last = teamList.pop();
    teamList.splice(1, 0, last);
  }
  
  rounds.forEach(roundMatches => fixtures.push(...roundMatches));
  
  // Segunda vuelta
  const secondHalf = rounds.map((roundMatches, roundIdx) => 
    roundMatches.map((match, matchIdx) => ({
      ...match,
      id: `${numRounds + roundIdx + 1}_${matchIdx}`,
      week: numRounds + roundIdx + 1,
      homeTeam: match.awayTeam,
      awayTeam: match.homeTeam
    }))
  );
  
  secondHalf.forEach(roundMatches => fixtures.push(...roundMatches));
  
  return fixtures;
}

// ============== SIMULACIÓN DE PARTIDO ==============
// Ahora usa el motor V2 más realista
export function simulateMatch(homeTeamId, awayTeamId, homeTeamData, awayTeamData, context = {}, playerTeamForm = {}, playerTeamId = null) {
  // Generate form for both teams
  const isHomePlayer = homeTeamData.id === playerTeamId;
  const isAwayPlayer = awayTeamData.id === playerTeamId;
  const homeForm = isHomePlayer ? playerTeamForm : generateAIForm(homeTeamData.players || []);
  const awayForm = isAwayPlayer ? playerTeamForm : generateAIForm(awayTeamData.players || []);
  
  // Add form data to context
  const updatedContext = {
    ...context,
    homeForm,
    awayForm,
    playerTeamId
  };
  // Usar el nuevo motor V2 que respeta jerarquías
  return simulateMatchV2(homeTeamId, awayTeamId, homeTeamData, awayTeamData, updatedContext);
}

// ============== SIMULACIÓN DE PARTIDO (LEGACY - para referencia) ==============
function simulateMatchLegacy(homeTeamId, awayTeamId, homeTeamData, awayTeamData, context = {}) {
  const {
    homeFormation = '4-3-3',
    awayFormation = '4-3-3',
    homeTactic = 'balanced',
    awayTactic = 'balanced',
    homeMorale = 70,
    awayMorale = 70,
    isDerby = false,
    importance = 'normal', // normal, crucial, final
    attendanceFillRate = 0.7, // Ocupación del estadio (0.0 - 1.0)
    grassCondition = 100, // Estado del césped (0-100), afecta lesiones del local
    playerTeamForm = {},
    playerTeamId = null
  } = context;
  
  // Generate form for both teams
  const homeForm = homeTeamData.id === playerTeamId ? playerTeamForm : generateAIForm(homeTeamData.players || []);
  const awayForm = awayTeamData.id === playerTeamId ? playerTeamForm : generateAIForm(awayTeamData.players || []);
  const homeStrength = calculateTeamStrength(homeTeamData, homeFormation, homeTactic, homeMorale, null, homeForm);
  const awayStrength = calculateTeamStrength(awayTeamData, awayFormation, awayTactic, awayMorale, null, awayForm);
  
  // Ventaja de local - depende del tamaño del estadio Y de la asistencia
  const stadiumCapacity = homeTeamData.stadiumCapacity || 20000;
  const baseHomeAdvantage = 4 + Math.min(4, stadiumCapacity / 25000); // 4-8 puntos base
  
  // La asistencia modula la ventaja local:
  // - Estadio lleno (100%): 100% del bonus
  // - Estadio a medias (50%): ~65% del bonus
  // - Estadio vacío (20%): ~35% del bonus
  const crowdFactor = 0.3 + (attendanceFillRate * 0.7);
  // Grass condition reduces home advantage: <70 slight penalty, <40 bigger penalty
  const grassFactor = grassCondition >= 70 ? 1.0 : grassCondition >= 40 ? 0.85 : 0.7;
  const homeAdvantage = baseHomeAdvantage * crowdFactor * grassFactor;
  
  // Factor moral (rachas afectan MÁS)
  const homeMoraleFactor = 0.85 + (homeMorale / 100) * 0.3;
  const awayMoraleFactor = 0.85 + (awayMorale / 100) * 0.3;
  
  // Factor derby (más impredecible)
  const derbyFactor = isDerby ? 0.8 : 1.0;
  
  // FACTOR FORMA DEL DÍA - Variación que permite sorpresas
  const homeFormFactor = 0.96 + Math.random() * 0.08; // 0.96-1.04
  const awayFormFactor = 0.96 + Math.random() * 0.08;
  
  // Comprimir diferencias - balance entre jerarquía y sorpresas
  // Los grandes son favoritos pero no invencibles
  const compressStrength = (strength) => 70 + (strength - 70) * 0.7;
  
  // Fuerza ajustada (usa effectiveOverall para simulación, incluye roles y tácticas)
  const adjustedHome = compressStrength((homeStrength.effectiveOverall || homeStrength.overall) + homeAdvantage) * homeMoraleFactor * derbyFactor * homeFormFactor;
  const adjustedAway = compressStrength(awayStrength.effectiveOverall || awayStrength.overall) * awayMoraleFactor * derbyFactor * awayFormFactor;
  
  // Simular el partido minuto a minuto
  const matchSimulation = simulateMatchMinuteByMinute(
    adjustedHome, 
    adjustedAway,
    homeStrength,
    awayStrength,
    homeTeamData,
    awayTeamData,
    TACTICS[homeTactic],
    TACTICS[awayTactic],
    grassCondition
  );
  
  return matchSimulation;
}

// Simulación detallada minuto a minuto
function simulateMatchMinuteByMinute(homeRating, awayRating, homeStrength, awayStrength, homeTeam, awayTeam, homeTactic, awayTactic, grassCondition = 100, options = {}) {
  const events = [];
  let homeScore = 0;
  let awayScore = 0;
  
  // Stats del partido
  let homePossession = 50;
  let awayPossession = 50;
  let homeShots = 0;
  let awayShotsTotal = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homeCorners = 0;
  let awayCorners = 0;
  
  // Calcular dominio de posesión
  const midBattle = homeStrength.midfield - awayStrength.midfield;
  const possessionBonus = homeTactic.possession || 1;
  homePossession = Math.max(30, Math.min(70, 50 + midBattle / 3 * possessionBonus));
  awayPossession = 100 - homePossession;
  
  // Calcular probabilidades base de gol por minuto
  const homeGoalChance = calculateGoalChance(homeRating, awayRating, homeStrength, awayStrength, true);
  const awayGoalChance = calculateGoalChance(awayRating, homeRating, awayStrength, homeStrength, false);
  
  // Variables de estado del partido
  let momentum = 0; // -100 a 100, positivo favorece local
  let intensity = 1.0;
  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeYellowCount = 0;
  let awayYellowCount = 0;
  const homeYellows = new Set();
  const awayYellows = new Set();
  
  // Simular cada minuto
  for (let minute = 1; minute <= 90; minute++) {
    // Ajustar intensidad según momento del partido
    if (minute <= 15) intensity = 0.8; // Inicio cauteloso
    else if (minute <= 30) intensity = 1.0;
    else if (minute <= 45) intensity = 1.1; // Pre-descanso
    else if (minute <= 60) intensity = 0.95; // Post-descanso
    else if (minute <= 75) intensity = 1.05;
    else intensity = 1.2; // Recta final
    
    // Momentum shift basado en eventos recientes
    const recentGoals = events.filter(e => e.type === 'goal' && e.minute > minute - 10);
    if (recentGoals.length > 0) {
      const lastGoal = recentGoals[recentGoals.length - 1];
      momentum += lastGoal.team === 'home' ? 15 : -15;
    }
    momentum *= 0.95; // Decay
    
    // Factor de penalización por expulsiones
    const homeCardPenalty = 1 - (homeRedCards * 0.12);
    const awayCardPenalty = 1 - (awayRedCards * 0.12);
    
    // Calcular probabilidad de evento ofensivo
    const homeAttackChance = (homeGoalChance * intensity * homeCardPenalty * (1 + momentum/200)) * (homePossession / 50);
    const awayAttackChance = (awayGoalChance * intensity * awayCardPenalty * (1 - momentum/200)) * (awayPossession / 50);
    
    // Intentar gol local
    if (Math.random() < homeAttackChance) {
      homeShots++;
      const shotQuality = Math.random();
      
      // On target?
      if (shotQuality > 0.4) {
        homeShotsOnTarget++;
        
        // Gol?
        const goalThreshold = 0.7 - (homeStrength.attack / 500) + (awayStrength.goalkeeper / 400);
        if (shotQuality > goalThreshold) {
          homeScore++;
          const scorer = selectScorer(homeTeam, homeStrength.lineup);
          const assister = Math.random() > 0.35 ? selectAssister(homeTeam, homeStrength.lineup, scorer) : null;
          
          events.push({
            type: 'goal',
            team: 'home',
            minute,
            player: scorer.name,
            assist: assister?.name || null,
            goalType: determineGoalType(minute, shotQuality)
          });
          
          momentum += 20;
        }
      } else if (shotQuality > 0.25) {
        // Corner
        homeCorners++;
        if (Math.random() < 0.08) {
          homeScore++;
          const scorer = selectSetPieceScorer(homeTeam, homeStrength.lineup);
          events.push({
            type: 'goal',
            team: 'home',
            minute,
            player: scorer.name,
            assist: null,
            goalType: 'corner'
          });
        }
      }
    }
    
    // Intentar gol visitante
    if (Math.random() < awayAttackChance) {
      awayShotsTotal++;
      const shotQuality = Math.random();
      
      if (shotQuality > 0.4) {
        awayShotsOnTarget++;
        
        const goalThreshold = 0.7 - (awayStrength.attack / 500) + (homeStrength.goalkeeper / 400);
        if (shotQuality > goalThreshold) {
          awayScore++;
          const scorer = selectScorer(awayTeam, awayStrength.lineup);
          const assister = Math.random() > 0.35 ? selectAssister(awayTeam, awayStrength.lineup, scorer) : null;
          
          events.push({
            type: 'goal',
            team: 'away',
            minute,
            player: scorer.name,
            assist: assister?.name || null,
            goalType: determineGoalType(minute, shotQuality)
          });
          
          momentum -= 20;
        }
      } else if (shotQuality > 0.25) {
        awayCorners++;
        if (Math.random() < 0.08) {
          awayScore++;
          const scorer = selectSetPieceScorer(awayTeam, awayStrength.lineup);
          events.push({
            type: 'goal',
            team: 'away',
            minute,
            player: scorer.name,
            assist: null,
            goalType: 'corner'
          });
        }
      }
    }
    
    // Tarjetas (más probables con alta intensidad y diferencia de goles)
    const cardChance = 0.008 * intensity * (1 + Math.abs(homeScore - awayScore) * 0.1);
    
    if (Math.random() < cardChance) {
      const isHome = Math.random() > 0.5;
      const team = isHome ? homeTeam : awayTeam;
      const yellows = isHome ? homeYellows : awayYellows;
      const player = selectCardPlayer(team);
      
      if (yellows.has(player.name)) {
        // Segunda amarilla = roja (count the yellow too)
        if (isHome) homeYellowCount++; else awayYellowCount++;
        events.push({ type: 'red_card', team: isHome ? 'home' : 'away', minute, player: player.name, reason: 'Segunda amarilla' });
        if (isHome) homeRedCards++; else awayRedCards++;
        yellows.delete(player.name);
      } else {
        if (isHome) homeYellowCount++; else awayYellowCount++;
        events.push({ type: 'yellow_card', team: isHome ? 'home' : 'away', minute, player: player.name });
        yellows.add(player.name);
      }
    }
    
    // Roja directa (~1 cada 8-10 partidos por equipo)
    if (Math.random() < 0.003 * intensity) {
      const isHome = Math.random() > 0.5;
      const team = isHome ? homeTeam : awayTeam;
      const player = selectCardPlayer(team);
      events.push({ type: 'red_card', team: isHome ? 'home' : 'away', minute, player: player.name, reason: 'Roja directa' });
      if (isHome) homeRedCards++; else awayRedCards++;
    }
    
    // Lesiones - el césped malo aumenta riesgo del LOCAL
    // Césped 100% = riesgo normal, 50% = +50% riesgo local, 0% = +100% riesgo local
    const grassPenalty = grassCondition < 100 ? (100 - grassCondition) / 100 : 0;
    // Prevención del centro médico reduce probabilidad de lesiones
    const medicalPrevention = options?.medicalPrevention || 0; // 0 a 0.30
    const baseInjuryChance = 0.002 * intensity;
    
    // Calcular reducción por prevención médica según equipo
    const playerIsHome = options?.playerIsHome;
    const awayInjuryChance = baseInjuryChance * (playerIsHome === false ? (1 - medicalPrevention) : 1);
    const homeInjuryChance = baseInjuryChance * (1 + grassPenalty) * (playerIsHome === true ? (1 - medicalPrevention) : 1);
    
    // Check lesión visitante
    if (Math.random() < awayInjuryChance) {
      const player = selectInjuryPlayer(awayTeam);
      const severity = generateInjurySeverity();
      events.push({
        type: 'injury',
        team: 'away',
        minute,
        player: player.name,
        severity: severity.type,
        weeksOut: severity.weeks
      });
    }
    
    // Check lesión local (riesgo aumentado si césped malo)
    if (Math.random() < homeInjuryChance) {
      const player = selectInjuryPlayer(homeTeam);
      const severity = generateInjurySeverity();
      events.push({
        type: 'injury',
        team: 'home',
        minute,
        player: player.name,
        severity: severity.type,
        weeksOut: severity.weeks,
        grassRelated: grassCondition < 70
      });
    }
  }
  
  // Tiempo añadido (1-5 minutos según eventos)
  const addedTime = Math.min(5, 1 + Math.floor(events.length / 4));
  for (let minute = 91; minute <= 90 + addedTime; minute++) {
    // Últimos minutos dramáticos
    const desperation = (homeScore !== awayScore) ? 1.3 : 1.1;
    
    if (Math.random() < homeGoalChance * desperation * 0.8) {
      if (Math.random() > 0.6) {
        homeScore++;
        const scorer = selectScorer(homeTeam, homeStrength.lineup);
        events.push({
          type: 'goal',
          team: 'home',
          minute,
          player: scorer.name,
          assist: null,
          goalType: 'late'
        });
      }
    }
    
    if (Math.random() < awayGoalChance * desperation * 0.8) {
      if (Math.random() > 0.6) {
        awayScore++;
        const scorer = selectScorer(awayTeam, awayStrength.lineup);
        events.push({
          type: 'goal',
          team: 'away',
          minute,
          player: scorer.name,
          assist: null,
          goalType: 'late'
        });
      }
    }
  }
  
  // Ordenar eventos
  events.sort((a, b) => a.minute - b.minute);
  
  return {
    homeScore,
    awayScore,
    events,
    stats: {
      possession: { home: Math.round(homePossession), away: Math.round(awayPossession) },
      shots: { home: homeShots, away: awayShotsTotal },
      shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget },
      corners: { home: homeCorners, away: awayCorners },
      yellowCards: { home: homeYellowCount, away: awayYellowCount },
      redCards: { home: homeRedCards, away: awayRedCards }
    }
  };
}

// Calcular probabilidad de gol por minuto
function calculateGoalChance(attackRating, defendRating, attackStrength, defendStrength, isHome) {
  // baseChance ajustado para ~2.5 goles por partido
  const baseChance = 0.032;
  
  // Factor de ataque - equipos buenos atacan mejor
  const attackFactor = 0.85 + (attackStrength.attack / 80) * 0.25;
  
  // Factor de defensa - defensas débiles conceden más
  const defenseFactor = 0.85 + (80 / Math.max(55, defendStrength.defense)) * 0.25;
  
  // Factor de portero
  const goalieBlockFactor = 0.88 + (80 / Math.max(55, defendStrength.goalkeeper)) * 0.12;
  
  // Diferencia de rating importa
  const ratingDiff = (attackRating - defendRating) / 80;
  
  // Variación por partido - permite sorpresas
  const matchVariation = 0.92 + Math.random() * 0.16; // 0.92-1.08
  
  // Ventaja local pronunciada (+15% en casa)
  const homeFactor = isHome ? 1.15 : 1;
  
  return baseChance * attackFactor * defenseFactor * goalieBlockFactor * (1 + ratingDiff) * homeFactor * matchVariation;
}

// Seleccionar goleador (ponderado por posición y overall)
function selectScorer(team, lineup) {
  if (!team) return { name: 'Desconocido' };
  const scorerPositions = ['ST', 'CF', 'RW', 'LW', 'CAM', 'CM'];
  const candidates = (lineup || team.players || []).filter(p => 
    scorerPositions.includes(p.position) || scorerPositions.includes(p.playingPosition)
  );
  
  if (candidates.length === 0) return { name: 'Desconocido' };
  
  // Ponderar por overall y posición
  const weights = candidates.map(p => {
    let weight = p.overall;
    if (['ST', 'CF'].includes(p.position)) weight *= 2;
    else if (['RW', 'LW'].includes(p.position)) weight *= 1.3;
    else if (p.position === 'CAM') weight *= 1.1;
    return weight;
  });
  
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return candidates[i];
  }
  
  return candidates[0];
}

// Seleccionar asistente
function selectAssister(team, lineup, scorer) {
  const assistPositions = ['CAM', 'CM', 'RW', 'LW', 'RB', 'LB', 'CDM'];
  const candidates = (lineup || team.players || []).filter(p => 
    p.name !== scorer.name && assistPositions.includes(p.position)
  );
  
  if (candidates.length === 0) return null;
  
  const weights = candidates.map(p => {
    let weight = p.overall;
    if (['CAM', 'CM'].includes(p.position)) weight *= 1.5;
    else if (['RW', 'LW'].includes(p.position)) weight *= 1.3;
    return weight;
  });
  
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return candidates[i];
  }
  
  return candidates[0];
}

// Seleccionar goleador de balón parado
function selectSetPieceScorer(team, lineup) {
  const candidates = (lineup || team.players || []).filter(p => 
    ['CB', 'ST', 'CDM'].includes(p.position)
  );
  
  if (candidates.length === 0) return { name: 'Desconocido' };
  
  // Favorece centrales altos (simplificado)
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Seleccionar jugador para tarjeta
function selectCardPlayer(team) {
  if (!team) return { name: 'Desconocido' };
  const cardPositions = ['CDM', 'CB', 'CM', 'RB', 'LB', 'ST'];
  const candidates = (team.players || []).filter(p => cardPositions.includes(p.position));
  
  if (candidates.length === 0) return { name: 'Desconocido' };
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Seleccionar jugador para lesión
function selectInjuryPlayer(team) {
  if (!team) return { name: 'Desconocido' };
  const players = team.players || [];
  if (players.length === 0) return { name: 'Desconocido' };
  return players[Math.floor(Math.random() * players.length)];
}

// Determinar tipo de gol
function determineGoalType(minute, quality) {
  if (minute >= 85) return 'late';
  if (quality > 0.95) return 'golazo';
  if (quality > 0.9) return 'great_strike';
  if (Math.random() < 0.1) return 'penalty';
  if (Math.random() < 0.08) return 'header';
  if (Math.random() < 0.15) return 'tap_in';
  return 'goal';
}

// Generar severidad de lesión
function generateInjurySeverity() {
  const roll = Math.random();
  
  if (roll < 0.5) return { type: 'minor', weeks: Math.floor(Math.random() * 2) + 1 };
  if (roll < 0.85) return { type: 'moderate', weeks: Math.floor(Math.random() * 4) + 3 };
  return { type: 'serious', weeks: Math.floor(Math.random() * 9) + 8 };
}

// ============== ACTUALIZACIÓN DE CLASIFICACIÓN ==============
export function updateTable(table, homeTeamId, awayTeamId, homeScore, awayScore) {
  const newTable = table.map(entry => {
    if (entry.teamId === homeTeamId) {
      const won = homeScore > awayScore ? 1 : 0;
      const drawn = homeScore === awayScore ? 1 : 0;
      const lost = homeScore < awayScore ? 1 : 0;
      const points = won * 3 + drawn;
      const result = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D';
      const form = [...entry.form, result].slice(-5);
      const homeForm = [...(entry.homeForm || []), result].slice(-5);
      
      // Actualizar racha y moral
      let streak = entry.streak || 0;
      let morale = entry.morale || 70;
      
      if (won) {
        streak = streak >= 0 ? streak + 1 : 1;
        morale = Math.min(100, morale + 5);
      } else if (lost) {
        streak = streak <= 0 ? streak - 1 : -1;
        morale = Math.max(20, morale - 8);
      } else {
        streak = 0;
        morale = Math.max(40, Math.min(85, morale - 2));
      }
      
      return {
        ...entry,
        played: entry.played + 1,
        won: entry.won + won,
        drawn: entry.drawn + drawn,
        lost: entry.lost + lost,
        goalsFor: entry.goalsFor + homeScore,
        goalsAgainst: entry.goalsAgainst + awayScore,
        goalDifference: entry.goalDifference + homeScore - awayScore,
        points: entry.points + points,
        form,
        homeForm,
        streak,
        morale
      };
    }
    
    if (entry.teamId === awayTeamId) {
      const won = awayScore > homeScore ? 1 : 0;
      const drawn = homeScore === awayScore ? 1 : 0;
      const lost = awayScore < homeScore ? 1 : 0;
      const points = won * 3 + drawn;
      const result = awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D';
      const form = [...entry.form, result].slice(-5);
      const awayForm = [...(entry.awayForm || []), result].slice(-5);
      
      let streak = entry.streak || 0;
      let morale = entry.morale || 70;
      
      if (won) {
        streak = streak >= 0 ? streak + 1 : 1;
        morale = Math.min(100, morale + 7); // Ganar fuera da más moral
      } else if (lost) {
        streak = streak <= 0 ? streak - 1 : -1;
        morale = Math.max(20, morale - 5); // Perder fuera es más normal
      } else {
        streak = 0;
        morale = Math.max(40, Math.min(85, morale));
      }
      
      return {
        ...entry,
        played: entry.played + 1,
        won: entry.won + won,
        drawn: entry.drawn + drawn,
        lost: entry.lost + lost,
        goalsFor: entry.goalsFor + awayScore,
        goalsAgainst: entry.goalsAgainst + homeScore,
        goalDifference: entry.goalDifference + awayScore - homeScore,
        points: entry.points + points,
        form,
        awayForm,
        streak,
        morale
      };
    }
    
    return entry;
  });
  
  return sortTable(newTable);
}

export function sortTable(table) {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

// ============== UTILIDADES ==============
export function getWeekFixtures(fixtures, week) {
  return fixtures.filter(f => f.week === week);
}

export function getNextFixture(fixtures, teamId, currentWeek) {
  return fixtures.find(f => 
    f.week >= currentWeek && 
    !f.played && 
    (f.homeTeam === teamId || f.awayTeam === teamId)
  );
}

export function simulateWeekMatches(fixtures, table, week, playerTeamId, allTeams) {
  let updatedTable = [...table];
  
  const updatedFixtures = fixtures.map(fixture => {
    if (fixture.played || fixture.week !== week) return fixture;
    if (fixture.homeTeam === playerTeamId || fixture.awayTeam === playerTeamId) return fixture;
    
    const homeTeam = allTeams.find(t => t.id === fixture.homeTeam);
    const awayTeam = allTeams.find(t => t.id === fixture.awayTeam);
    
    if (!homeTeam || !awayTeam) return fixture;
    
    // Obtener moral de la clasificación
    const homeEntry = updatedTable.find(t => t.teamId === fixture.homeTeam);
    const awayEntry = updatedTable.find(t => t.teamId === fixture.awayTeam);
    
    // For AI vs AI matches, both teams are AI so no playerTeamForm needed
    // Add random tactics and momentum for variety
    const aiTactics = ['balanced', 'attacking', 'defensive', 'possession', 'counter'];
    const pickTactic = () => aiTactics[Math.floor(Math.random() * aiTactics.length)];
    const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
      homeMorale: homeEntry?.morale || 70,
      awayMorale: awayEntry?.morale || 70,
      homeTactic: pickTactic(),
      awayTactic: pickTactic(),
      homeSeasonMomentum: homeEntry?.streak || 0,
      awaySeasonMomentum: awayEntry?.streak || 0
    }, {}, null); // No player team, so both get AI form
    
    updatedTable = updateTable(updatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
    
    return {
      ...fixture,
      played: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events,
      stats: result.stats
    };
  });
  
  return { fixtures: updatedFixtures, table: updatedTable };
}

export function getWeekResults(fixtures, week) {
  return fixtures.filter(f => f.week === week && f.played);
}
