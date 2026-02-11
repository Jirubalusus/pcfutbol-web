// rankedService.js — Firebase logic for Ranked 1v1
import { db, auth } from './config';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  getDocs, increment, arrayUnion, Timestamp, runTransaction
} from 'firebase/firestore';
import { getTierByLP, getTotalLP, calculateLPChange, DEFAULT_PLAYER_DATA, LP_PER_DIVISION, TIERS, calculateMatchPoints } from '../components/Ranked/tierUtils';

// ── Collections ──
const QUEUE_COL = 'ranked_queue';
const MATCHES_COL = 'ranked_matches';
const PLAYERS_COL = 'ranked_players';

// ============================================================
// LEAGUE DEFINITIONS — Real teams from the game
// ============================================================
import {
  LALIGA_TEAMS, SEGUNDA_TEAMS, PREMIER_LEAGUE_TEAMS, SERIE_A_TEAMS,
  BUNDESLIGA_TEAMS, LIGUE1_TEAMS, EREDIVISIE_TEAMS, PRIMEIRA_LIGA_TEAMS,
  ARGENTINA_TEAMS, BRASILEIRAO_TEAMS, COLOMBIA_TEAMS,
  CHAMPIONSHIP_TEAMS, BELGIAN_PRO_TEAMS, SUPER_LIG_TEAMS,
  SCOTTISH_PREM_TEAMS, SERIE_B_TEAMS, BUNDESLIGA2_TEAMS, LIGUE2_TEAMS,
  CHILE_TEAMS, URUGUAY_TEAMS, ECUADOR_TEAMS, LIGA_MX_TEAMS,
  LEAGUES, loadAllData, isDataLoaded
} from '../data/teamsFirestore';
import { EUROPEAN_SPOTS, LEAGUE_MATCHDAYS } from '../game/seasonManager';

// Map of leagueId → teams array getter
const LEAGUE_TEAMS_MAP = {
  laliga: () => LALIGA_TEAMS,
  segunda: () => SEGUNDA_TEAMS,
  premierLeague: () => PREMIER_LEAGUE_TEAMS,
  serieA: () => SERIE_A_TEAMS,
  bundesliga: () => BUNDESLIGA_TEAMS,
  ligue1: () => LIGUE1_TEAMS,
  eredivisie: () => EREDIVISIE_TEAMS,
  primeiraLiga: () => PRIMEIRA_LIGA_TEAMS,
  championship: () => CHAMPIONSHIP_TEAMS,
  belgianPro: () => BELGIAN_PRO_TEAMS,
  superLig: () => SUPER_LIG_TEAMS,
  scottishPrem: () => SCOTTISH_PREM_TEAMS,
  serieB: () => SERIE_B_TEAMS,
  bundesliga2: () => BUNDESLIGA2_TEAMS,
  ligue2: () => LIGUE2_TEAMS,
  argentinaPrimera: () => ARGENTINA_TEAMS,
  brasileiraoA: () => BRASILEIRAO_TEAMS,
  colombiaPrimera: () => COLOMBIA_TEAMS,
  chilePrimera: () => CHILE_TEAMS,
  uruguayPrimera: () => URUGUAY_TEAMS,
  ecuadorLigaPro: () => ECUADOR_TEAMS,
  ligaMX: () => LIGA_MX_TEAMS,
};

// Leagues eligible for ranked (must have enough teams and real match engine support)
const RANKED_LEAGUES = [
  'laliga', 'segunda', 'premierLeague', 'serieA', 'bundesliga', 'ligue1',
  'eredivisie', 'primeiraLiga', 'championship', 'belgianPro',
  'argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
  'uruguayPrimera', 'ligaMX',
];

// ── Player Profile ──
export async function getOrCreatePlayer(uid, displayName) {
  const ref = doc(db, PLAYERS_COL, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Update displayName if changed
    if (displayName && snap.data().displayName !== displayName) {
      await updateDoc(ref, { displayName, updatedAt: serverTimestamp() });
    }
    return { id: snap.id, ...snap.data() };
  }
  const data = {
    ...DEFAULT_PLAYER_DATA,
    displayName: displayName || 'Jugador',
    totalLP: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { id: uid, ...data };
}

export async function getPlayer(uid) {
  const snap = await getDoc(doc(db, PLAYERS_COL, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function onPlayerChange(uid, callback) {
  return onSnapshot(doc(db, PLAYERS_COL, uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ── Matchmaking Queue ──
export async function joinQueue(uid, displayName, totalLP) {
  const ref = doc(db, QUEUE_COL, uid);
  await setDoc(ref, {
    uid,
    displayName,
    totalLP: totalLP || 0,
    joinedAt: serverTimestamp(),
    status: 'waiting',
  });
  return ref;
}

export async function leaveQueue(uid) {
  try { await deleteDoc(doc(db, QUEUE_COL, uid)); } catch(e) {}
}

export function onQueueChange(uid, callback) {
  return onSnapshot(doc(db, QUEUE_COL, uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// Find closest LP opponent in queue (simple query, no composite index needed)
export async function findOpponent(uid, totalLP) {
  // Simple query: just get all waiting entries (queue is small)
  const q = query(
    collection(db, QUEUE_COL),
    where('status', '==', 'waiting'),
  );
  const snap = await getDocs(q);
  let best = null;
  let bestDiff = Infinity;
  snap.forEach(d => {
    if (d.id === uid) return;
    const diff = Math.abs((d.data().totalLP || 0) - totalLP);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = { id: d.id, ...d.data() };
    }
  });
  return best;
}

// ============================================================
// TEAM SELECTION — Pick 3 similar-level teams from a random league
// ============================================================
function pickRandomLeagueAndTeams() {
  // Ensure data is loaded
  if (!isDataLoaded()) {
    console.warn('Team data not loaded yet for ranked');
    return null;
  }
  
  // Pick random league
  const availableLeagues = RANKED_LEAGUES.filter(id => {
    const teams = LEAGUE_TEAMS_MAP[id]?.();
    return teams && teams.length >= 6;
  });
  
  if (availableLeagues.length === 0) return null;
  
  const leagueId = availableLeagues[Math.floor(Math.random() * availableLeagues.length)];
  const leagueTeams = LEAGUE_TEAMS_MAP[leagueId]();
  const leagueInfo = LEAGUES[leagueId] || { name: leagueId };
  
  // Calculate average overall for each team
  const teamsWithStrength = leagueTeams.map(team => {
    const avgOverall = team.players
      ? team.players.reduce((sum, p) => sum + (p.overall || 65), 0) / Math.max(1, team.players.length)
      : 65;
    return { ...team, avgOverall };
  });
  
  // Pick a random "base" team, then find 2 more within ±5 overall
  const base = teamsWithStrength[Math.floor(Math.random() * teamsWithStrength.length)];
  const similar = teamsWithStrength.filter(t => 
    t.id !== base.id && Math.abs(t.avgOverall - base.avgOverall) <= 5
  );
  
  // Shuffle and pick 2
  const shuffled = similar.sort(() => Math.random() - 0.5);
  const picked = [base, ...shuffled.slice(0, 2)];
  
  // If we couldn't get 3, expand range
  if (picked.length < 3) {
    const wider = teamsWithStrength.filter(t => 
      !picked.find(p => p.id === t.id) && Math.abs(t.avgOverall - base.avgOverall) <= 10
    ).sort(() => Math.random() - 0.5);
    while (picked.length < 3 && wider.length > 0) {
      picked.push(wider.shift());
    }
  }
  
  // Determine European spots for these positions
  const spots = EUROPEAN_SPOTS[leagueId] || {};
  const matchdays = LEAGUE_MATCHDAYS[leagueId] || 38;
  
  return {
    leagueId,
    leagueName: leagueInfo.name,
    leagueCountry: leagueInfo.country,
    matchdays,
    europeanSpots: spots,
    teams: picked.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName || t.name,
      avgOverall: Math.round(t.avgOverall),
      reputation: t.reputation || 3,
      playerCount: t.players?.length || 0,
      stadium: t.stadium || t.stadiumName || 'Estadio',
      budget: t.transferBudget || t.budget || 5000000,
    }))
  };
}

// ============================================================
// MATCH CREATION
// ============================================================
export async function createMatch(player1, player2) {
  // Pick real teams from a real league
  const leagueData = pickRandomLeagueAndTeams();
  
  if (!leagueData) {
    throw new Error('No se pudieron cargar equipos. Intenta de nuevo.');
  }
  
  const matchRef = doc(collection(db, MATCHES_COL));
  const matchData = {
    id: matchRef.id,
    player1: {
      uid: player1.uid || player1.id,
      displayName: player1.displayName,
      totalLP: player1.totalLP || 0,
      team: null,
      config: null, // formation, tactic, transfers
    },
    player2: {
      uid: player2.uid || player2.id,
      displayName: player2.displayName,
      totalLP: player2.totalLP || 0,
      team: null,
      config: null,
    },
    leagueId: leagueData.leagueId,
    leagueName: leagueData.leagueName,
    leagueCountry: leagueData.leagueCountry,
    matchdays: leagueData.matchdays,
    europeanSpots: leagueData.europeanSpots,
    teams: leagueData.teams,
    phase: 'team_selection',
    phaseDeadline: Timestamp.fromDate(new Date(Date.now() + 60 * 1000)), // 60s
    round1Data: {},
    round2Data: {},
    simulation1: null, // Half season results
    simulation2: null, // Full season results
    transfers: { player1: [], player2: [] }, // Transfer history
    blockedTransfers: { player1: [], player2: [] }, // Rejected = blocked until next round
    results: null,
    winner: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    disconnectCheck: { player1Last: serverTimestamp(), player2Last: serverTimestamp() },
  };
  
  await setDoc(matchRef, matchData);
  
  // Remove both from queue
  await Promise.all([
    deleteDoc(doc(db, QUEUE_COL, player1.uid || player1.id)).catch(() => {}),
    deleteDoc(doc(db, QUEUE_COL, player2.uid || player2.id)).catch(() => {}),
  ]);
  
  return { id: matchRef.id, ...matchData };
}

// ── Match State ──
export function onMatchChange(matchId, callback) {
  return onSnapshot(doc(db, MATCHES_COL, matchId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function selectTeam(matchId, uid, teamId) {
  const matchRef = doc(db, MATCHES_COL, matchId);
  
  // Use transaction to prevent race condition
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(matchRef);
    if (!snap.exists()) throw new Error('Partida no encontrada');
    const data = snap.data();
    
    if (data.phase !== 'team_selection') throw new Error('Ya no se puede elegir equipo');
    
    // Check team not already taken
    const otherPlayer = data.player1.uid === uid ? 'player2' : 'player1';
    if (data[otherPlayer].team === teamId) throw new Error('Equipo ya elegido por el rival');
    
    const playerKey = data.player1.uid === uid ? 'player1' : 'player2';
    if (data[playerKey].team) throw new Error('Ya has elegido equipo');
    
    const update = {
      [`${playerKey}.team`]: teamId,
      updatedAt: serverTimestamp(),
    };
    
    // Check if both will have selected after this
    const otherTeam = data[otherPlayer].team;
    if (otherTeam) {
      update.phase = 'round1';
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 180 * 1000)); // 3 min
    }
    
    transaction.update(matchRef, update);
  });
}

// ============================================================
// ROUND ACTIONS — Formation, tactic, transfers
// ============================================================
export async function submitRoundConfig(matchId, uid, config) {
  const matchRef = doc(db, MATCHES_COL, matchId);
  const snap = await getDoc(matchRef);
  const data = snap.data();
  const playerKey = data.player1.uid === uid ? 'player1' : 'player2';
  const roundKey = data.phase === 'round1' ? 'round1Data' : 'round2Data';
  
  await updateDoc(matchRef, {
    [`${playerKey}.config`]: config,
    [`${roundKey}.${playerKey}`]: { ...config, ready: true, timestamp: Date.now() },
    updatedAt: serverTimestamp(),
  });
}

// Attempt a transfer during a round
export async function attemptRankedTransfer(matchId, uid, targetPlayerId, targetTeamId) {
  const matchRef = doc(db, MATCHES_COL, matchId);
  const snap = await getDoc(matchRef);
  const data = snap.data();
  const playerKey = data.player1.uid === uid ? 'player1' : 'player2';
  
  // Check if this transfer is blocked
  const blocked = data.blockedTransfers?.[playerKey] || [];
  if (blocked.includes(targetPlayerId)) {
    return { success: false, reason: 'Fichaje bloqueado hasta la siguiente ronda' };
  }
  
  // Load actual team data to evaluate transfer
  const leagueTeams = LEAGUE_TEAMS_MAP[data.leagueId]?.();
  if (!leagueTeams) return { success: false, reason: 'Error cargando equipos' };
  
  const myTeamId = data[playerKey].team;
  const myTeam = leagueTeams.find(t => t.id === myTeamId);
  const sellerTeam = leagueTeams.find(t => t.id === targetTeamId);
  
  if (!myTeam || !sellerTeam) return { success: false, reason: 'Equipo no encontrado' };
  
  const player = sellerTeam.players?.find(p => p.name === targetPlayerId || p.id === targetPlayerId);
  if (!player) return { success: false, reason: 'Jugador no encontrado' };
  
  // Import transfer logic
  const { attemptTransfer, executeTransfer } = await import('../game/rankedSimulation');
  const result = attemptTransfer(myTeam, sellerTeam, player, leagueTeams);
  
  if (result.success) {
    // Execute the transfer in-memory (both players see it via Firestore)
    executeTransfer(myTeam, sellerTeam, player);
    
    // Record in Firestore
    await updateDoc(matchRef, {
      [`transfers.${playerKey}`]: arrayUnion({
        player: player.name,
        from: sellerTeam.name,
        to: myTeam.name,
        value: result.value,
        timestamp: Date.now(),
      }),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Block this transfer until next round
    await updateDoc(matchRef, {
      [`blockedTransfers.${playerKey}`]: arrayUnion(targetPlayerId),
      updatedAt: serverTimestamp(),
    });
  }
  
  return result;
}

// ============================================================
// PHASE ADVANCEMENT & SIMULATION
// ============================================================
export async function advancePhase(matchId) {
  const matchRef = doc(db, MATCHES_COL, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const data = snap.data();
  
  const transitions = {
    team_selection: 'round1',
    round1: 'simulating1',
    simulating1: 'round2',
    round2: 'simulating2',
    simulating2: 'results',
  };
  
  const nextPhase = transitions[data.phase];
  if (!nextPhase) return;
  
  const update = { phase: nextPhase, updatedAt: serverTimestamp() };
  
  if (nextPhase === 'round1') {
    update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 180 * 1000));
  } else if (nextPhase === 'simulating1') {
    // Run half season simulation
    try {
      const sim = await runHalfSeasonSimulation(data);
      update.simulation1 = sim;
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 8000)); // 8s viewing
    } catch (e) {
      console.error('Half season simulation error:', e);
      update.simulation1 = generateFallbackSimulation(data);
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 5000));
    }
  } else if (nextPhase === 'round2') {
    update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 180 * 1000));
    // Unblock all transfers
    update.blockedTransfers = { player1: [], player2: [] };
  } else if (nextPhase === 'simulating2') {
    // Run full season simulation
    try {
      const sim = await runFullSeasonSimulation(data);
      update.simulation2 = sim;
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 8000));
    } catch (e) {
      console.error('Full season simulation error:', e);
      update.simulation2 = generateFallbackSimulation(data);
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 5000));
    }
  } else if (nextPhase === 'results') {
    // Calculate final results
    const sim = data.simulation2 || update.simulation2;
    if (sim) {
      const p1Results = sim.player1;
      const p2Results = sim.player2;
      
      const p1Points = calculateMatchPoints(p1Results);
      const p2Points = calculateMatchPoints(p2Results);
      
      let winner = null;
      if (p1Points > p2Points) winner = data.player1.uid;
      else if (p2Points > p1Points) winner = data.player2.uid;
      // Tie: better league position wins
      else if (p1Results.leaguePosition < p2Results.leaguePosition) winner = data.player1.uid;
      else if (p2Results.leaguePosition < p1Results.leaguePosition) winner = data.player2.uid;
      
      update.results = {
        player1Points: p1Points,
        player2Points: p2Points,
        simulation: sim,
      };
      update.winner = winner;
    }
  }
  
  await updateDoc(matchRef, update);
  
  // If results, update player stats
  if (nextPhase === 'results' && update.results) {
    const hasEuropeanAdvantage = detectEuropeanAdvantage(data, update.results.simulation);
    await updatePlayerStats(
      data.player1.uid, data.player2.uid,
      update.winner,
      data.player1.totalLP || 0, data.player2.totalLP || 0,
      hasEuropeanAdvantage
    );
  }
}

// ============================================================
// SIMULATION RUNNERS
// ============================================================
async function runHalfSeasonSimulation(matchData) {
  const { simulateHalfSeason } = await import('../game/rankedSimulation');
  const leagueTeams = LEAGUE_TEAMS_MAP[matchData.leagueId]?.();
  if (!leagueTeams || leagueTeams.length < 4) throw new Error('Not enough teams');
  
  // Deep clone teams to avoid mutation
  const teams = JSON.parse(JSON.stringify(leagueTeams));
  
  const result = simulateHalfSeason(
    teams,
    matchData.player1.team,
    matchData.player2.team,
    matchData.player1.config || {},
    matchData.player2.config || {},
    matchData.leagueId
  );
  
  // Return serializable data (no full fixtures, just table + key stats)
  return {
    table: result.table.slice(0, 10).map(t => ({
      teamId: t.teamId,
      teamName: t.teamName,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      points: t.points,
    })),
    player1Position: result.table.findIndex(t => t.teamId === matchData.player1.team) + 1,
    player2Position: result.table.findIndex(t => t.teamId === matchData.player2.team) + 1,
    h2h: result.h2h,
    _fullState: null, // Can't store full state in Firestore, re-simulate in full
  };
}

async function runFullSeasonSimulation(matchData) {
  const { simulateHalfSeason, simulateFullSeason } = await import('../game/rankedSimulation');
  const leagueTeams = LEAGUE_TEAMS_MAP[matchData.leagueId]?.();
  if (!leagueTeams || leagueTeams.length < 4) throw new Error('Not enough teams');
  
  const teams = JSON.parse(JSON.stringify(leagueTeams));
  
  // Re-run full season (both halves) to get complete results
  const halfState = simulateHalfSeason(
    teams,
    matchData.player1.team,
    matchData.player2.team,
    matchData.player1.config || {},
    matchData.player2.config || {},
    matchData.leagueId
  );
  
  const fullResult = simulateFullSeason(
    halfState, teams,
    matchData.player1.team,
    matchData.player2.team,
    matchData.player1.config || {},
    matchData.player2.config || {}
  );
  
  return {
    player1: fullResult.player1,
    player2: fullResult.player2,
    table: fullResult.table.slice(0, 10).map(t => ({
      teamId: t.teamId,
      teamName: t.teamName,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDifference: t.goalDifference,
      points: t.points,
    })),
  };
}

function generateFallbackSimulation(matchData) {
  // Fallback random simulation if real engine fails
  const rand = () => Math.floor(Math.random() * 4);
  const pos1 = Math.floor(Math.random() * 20) + 1;
  const pos2 = Math.floor(Math.random() * 20) + 1;
  
  return {
    player1: {
      teamId: matchData.player1.team,
      teamName: matchData.teams?.find(t => t.id === matchData.player1.team)?.name || 'Equipo 1',
      leaguePosition: pos1, leaguePoints: 90 - pos1 * 3,
      liga: pos1 === 1, copa: Math.random() < 0.12,
      championsLeague: false, europaLeague: false, conference: false,
      libertadores: false, sudamericana: false, supercopa: false,
      h2hResults: [{ goalsFor: rand(), goalsAgainst: rand() }],
      h2hWins: 0, finishedAboveRival: pos1 < pos2,
    },
    player2: {
      teamId: matchData.player2.team,
      teamName: matchData.teams?.find(t => t.id === matchData.player2.team)?.name || 'Equipo 2',
      leaguePosition: pos2, leaguePoints: 90 - pos2 * 3,
      liga: pos2 === 1, copa: Math.random() < 0.12,
      championsLeague: false, europaLeague: false, conference: false,
      libertadores: false, sudamericana: false, supercopa: false,
      h2hResults: [{ goalsFor: rand(), goalsAgainst: rand() }],
      h2hWins: 0, finishedAboveRival: pos2 < pos1,
    },
    table: [],
  };
}

// ============================================================
// EUROPEAN ADVANTAGE DETECTION (for LP fairness)
// ============================================================
function detectEuropeanAdvantage(matchData, simulation) {
  if (!simulation) return { player1Advantage: 0, player2Advantage: 0 };
  
  const p1Comp = simulation.player1?.europeanCompetition;
  const p2Comp = simulation.player2?.europeanCompetition;
  
  const compValue = (comp) => {
    if (comp === 'champions' || comp === 'libertadores') return 3;
    if (comp === 'europaLeague' || comp === 'sudamericana') return 2;
    if (comp === 'conference') return 1;
    return 0;
  };
  
  const p1Val = compValue(p1Comp);
  const p2Val = compValue(p2Comp);
  
  return {
    player1Advantage: p1Val - p2Val, // positive = p1 has advantage
    player2Advantage: p2Val - p1Val,
  };
}

// ============================================================
// PLAYER STATS UPDATE (with LP fairness)
// ============================================================
async function updatePlayerStats(uid1, uid2, winnerUid, lp1, lp2, europeanAdvantage) {
  const isDraw = !winnerUid;
  
  // Base LP change from rank difference
  let baseLPChange = calculateLPChange(
    winnerUid === uid1 ? lp1 : lp2,
    winnerUid === uid1 ? lp2 : lp1,
    isDraw
  );
  
  // Adjust LP based on European competition fairness
  // If winner had European advantage: less LP gained, more lost
  // If winner had disadvantage: more LP gained, less lost
  const advantage = europeanAdvantage || { player1Advantage: 0, player2Advantage: 0 };
  
  const p1Ref = doc(db, PLAYERS_COL, uid1);
  const p2Ref = doc(db, PLAYERS_COL, uid2);
  
  if (isDraw) {
    await Promise.all([
      updateDoc(p1Ref, { draws: increment(1), totalLP: increment(5), updatedAt: serverTimestamp() }),
      updateDoc(p2Ref, { draws: increment(1), totalLP: increment(5), updatedAt: serverTimestamp() }),
    ]);
    return;
  }
  
  // Winner LP: base ± advantage adjustment
  const winnerIsP1 = winnerUid === uid1;
  const winnerAdvantage = winnerIsP1 ? advantage.player1Advantage : advantage.player2Advantage;
  
  // If winner had advantage (more European comps): reduce gain
  // If winner had disadvantage: increase gain
  let winnerLP = baseLPChange;
  let loserLP = Math.ceil(baseLPChange * 0.7); // Losers lose ~70% of winner gain
  
  if (winnerAdvantage > 0) {
    // Winner had more European comps — reduce reward
    winnerLP = Math.max(8, baseLPChange - winnerAdvantage * 4);
    loserLP = Math.max(5, loserLP - winnerAdvantage * 3);
  } else if (winnerAdvantage < 0) {
    // Winner had fewer European comps — increase reward
    winnerLP = Math.min(45, baseLPChange + Math.abs(winnerAdvantage) * 5);
    loserLP = Math.max(3, loserLP - Math.abs(winnerAdvantage) * 2);
  }
  
  if (winnerIsP1) {
    await Promise.all([
      updateDoc(p1Ref, { wins: increment(1), totalLP: increment(winnerLP), updatedAt: serverTimestamp() }),
      updateDoc(p2Ref, { losses: increment(1), totalLP: increment(-Math.min(loserLP, lp2)), updatedAt: serverTimestamp() }),
    ]);
  } else {
    await Promise.all([
      updateDoc(p2Ref, { wins: increment(1), totalLP: increment(winnerLP), updatedAt: serverTimestamp() }),
      updateDoc(p1Ref, { losses: increment(1), totalLP: increment(-Math.min(loserLP, lp1)), updatedAt: serverTimestamp() }),
    ]);
  }
}

// ── Heartbeat (disconnect detection) ──
export async function sendHeartbeat(matchId, uid) {
  try {
    const matchRef = doc(db, MATCHES_COL, matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const playerKey = data.player1.uid === uid ? 'player1Last' : 'player2Last';
    await updateDoc(matchRef, {
      [`disconnectCheck.${playerKey}`]: serverTimestamp(),
    });
  } catch(e) {}
}

export async function checkDisconnect(matchId, uid) {
  try {
    const matchRef = doc(db, MATCHES_COL, matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const otherKey = data.player1.uid === uid ? 'player2Last' : 'player1Last';
    const lastPing = data.disconnectCheck?.[otherKey]?.toDate?.();
    if (!lastPing) return false;
    return (Date.now() - lastPing.getTime()) > 30000;
  } catch { return false; }
}

export async function claimDisconnectWin(matchId, uid) {
  const matchRef = doc(db, MATCHES_COL, matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.phase === 'results') return;
  
  await updateDoc(matchRef, {
    phase: 'results',
    winner: uid,
    results: { disconnection: true, player1Points: 0, player2Points: 0 },
    updatedAt: serverTimestamp(),
  });
  
  const loserUid = data.player1.uid === uid ? data.player2.uid : data.player1.uid;
  await updatePlayerStats(uid, loserUid, uid, data.player1.totalLP || 0, data.player2.totalLP || 0, null);
}

// ── Leaderboard ──
export async function getLeaderboard(limitCount = 100) {
  const q = query(
    collection(db, PLAYERS_COL),
    orderBy('totalLP', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ id: d.id, rank: i + 1, ...d.data() }));
}

// ── Match History ──
export async function getMatchHistory(uid, limitCount = 20) {
  // Simple queries without composite indexes
  try {
    const q1 = query(
      collection(db, MATCHES_COL),
      where('player1.uid', '==', uid),
      limit(50)
    );
    const q2 = query(
      collection(db, MATCHES_COL),
      where('player2.uid', '==', uid),
      limit(50)
    );
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const matches = [
      ...s1.docs.map(d => ({ id: d.id, ...d.data() })),
      ...s2.docs.map(d => ({ id: d.id, ...d.data() })),
    ].filter(m => m.phase === 'results'); // Filter client-side
    matches.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return matches.slice(0, limitCount);
  } catch(e) {
    console.error('Error loading match history:', e);
    return [];
  }
}

// ── Get all teams for a league (for transfer browsing) ──
export function getLeagueTeamsForMatch(leagueId) {
  if (!isDataLoaded()) return [];
  return LEAGUE_TEAMS_MAP[leagueId]?.() || [];
}

// Legacy export for backward compatibility
export { submitRoundConfig as submitRoundActions };
