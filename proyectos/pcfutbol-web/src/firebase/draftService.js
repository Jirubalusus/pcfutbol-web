// draftService.js — Firebase logic for Draft Ranked mode
import { db, auth } from './config';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  getDocs, increment, arrayUnion, Timestamp, runTransaction
} from 'firebase/firestore';
import { getTierByLP, calculateLPChange, LP_PER_DIVISION } from '../components/Ranked/tierUtils';

// Strip undefined values (Firestore rejects undefined)
function stripUndefined(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) clean[k] = typeof v === 'object' && v !== null && !(v instanceof Timestamp) ? stripUndefined(v) : v;
  }
  return clean;
}

// ── Collections ──
const DRAFT_QUEUE_COL = 'draft_queue';
const DRAFT_MATCHES_COL = 'draft_matches';
const PLAYERS_COL = 'ranked_players'; // shared with ranked

// ── AI League Team Generation ──
// Generate 18 AI teams for the draft league
function generateLeagueTeams() {
  const teamNames = [
    'FC Halcones', 'Atlético Tormenta', 'Real Fénix', 'CD Dragones',
    'Racing Centella', 'Deportivo Titán', 'CF Cometas', 'SD Relámpago',
    'UD Pegaso', 'Sporting Cobra', 'CA Volcán', 'FC Olympus',
    'Atlético Viento', 'Real Sombra', 'CD Trueno', 'CF Águilas',
    'Racing Fuego', 'Deportivo Hielo'
  ];

  return teamNames.map((name, i) => {
    const ovr = Math.floor(Math.random() * 10) + 75; // 75-84 range
    return {
      id: `ai_team_${i}`,
      name,
      shortName: name.split(' ').pop(),
      avgOverall: ovr,
      reputation: Math.floor(Math.random() * 3) + 2,
    };
  });
}

// ── Queue ──
export async function joinDraftQueue(uid, displayName, totalLP) {
  const ref = doc(db, DRAFT_QUEUE_COL, uid);
  await setDoc(ref, {
    uid,
    displayName,
    totalLP: totalLP || 0,
    joinedAt: serverTimestamp(),
    status: 'waiting',
  });
  return ref;
}

export async function leaveDraftQueue(uid) {
  try { await deleteDoc(doc(db, DRAFT_QUEUE_COL, uid)); } catch (e) {}
}

// ── Queue Listener (mirrors rankedService.onQueueChange) ──
export function onDraftQueueChange(uid, callback) {
  return onSnapshot(doc(db, DRAFT_QUEUE_COL, uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ── Matchmaking (mirrors rankedService.findAndCreateMatch exactly) ──
export async function findAndCreateDraftMatch(uid, displayName, totalLP) {
  return await runTransaction(db, async (transaction) => {
    const q = query(collection(db, DRAFT_QUEUE_COL), where('status', '==', 'waiting'));
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

    if (!best) return null;

    // Deterministic: lower uid creates match
    if (uid >= best.id) return null;

    const myQueueRef = doc(db, DRAFT_QUEUE_COL, uid);
    const opponentQueueRef = doc(db, DRAFT_QUEUE_COL, best.id);
    const mySnap = await transaction.get(myQueueRef);
    const oppSnap = await transaction.get(opponentQueueRef);

    if (!mySnap.exists() || mySnap.data().status !== 'waiting') return null;
    if (!oppSnap.exists() || oppSnap.data().status !== 'waiting') return null;

    transaction.update(myQueueRef, { status: 'matching' });
    transaction.update(opponentQueueRef, { status: 'matching' });

    return best;
  }).then(async (opponent) => {
    if (!opponent) return null;

    // Create match outside transaction (same pattern as 1v1)
    const matchRef = doc(collection(db, DRAFT_MATCHES_COL));
    const leagueTeams = generateLeagueTeams();

    const matchData = {
      id: matchRef.id,
      player1: {
        uid,
        displayName,
        totalLP: totalLP || 0,
        formation: null,
        picks: [],
        team: null,
      },
      player2: {
        uid: opponent.uid || opponent.id,
        displayName: opponent.displayName,
        totalLP: opponent.totalLP || 0,
        formation: null,
        picks: [],
        team: null,
      },
      player1Uid: uid,
      player2Uid: opponent.uid || opponent.id,
      phase: 'formation_pick',
      phaseDeadline: Timestamp.fromDate(new Date(Date.now() + 30 * 1000)),
      leagueTeams,
      simulation1: null,
      simulation2: null,
      results: null,
      winner: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
      heartbeats: {},
    };

    await setDoc(matchRef, matchData);

    // Clean up queue (same as 1v1)
    try { await deleteDoc(doc(db, DRAFT_QUEUE_COL, uid)); } catch {}
    try { await deleteDoc(doc(db, DRAFT_QUEUE_COL, opponent.id)); } catch {}

    return { id: matchRef.id, ...matchData };
  });
}

// ── Match Listener ──
export function onDraftMatchChange(matchId, callback) {
  return onSnapshot(doc(db, DRAFT_MATCHES_COL, matchId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ── Formation Submission ──
export async function submitFormation(matchId, uid, formationId) {
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(matchRef);
    if (!snap.exists()) throw new Error('Match not found');
    const data = snap.data();
    if (data.phase !== 'formation_pick') throw new Error('Not in formation pick phase');

    const playerKey = data.player1.uid === uid ? 'player1' : 'player2';
    transaction.update(matchRef, {
      [`${playerKey}.formation`]: formationId,
      updatedAt: serverTimestamp(),
    });
  });
}

// ── Pick Submission ──
export async function submitPick(matchId, uid, pick) {
  // pick = { position, player, slotIndex }
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(matchRef);
    if (!snap.exists()) throw new Error('Match not found');
    const data = snap.data();
    if (data.phase !== 'drafting') throw new Error('Not in drafting phase');

    const playerKey = data.player1.uid === uid ? 'player1' : 'player2';
    const currentPicks = data[playerKey].picks || [];

    transaction.update(matchRef, {
      [`${playerKey}.picks`]: [...currentPicks, pick],
      updatedAt: serverTimestamp(),
    });
  });
}

// ── Submit Final Draft Team ──
export async function submitDraftTeam(matchId, uid, team) {
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);
  await updateDoc(matchRef, {
    [`${await getPlayerKey(matchId, uid)}.team`]: team,
    updatedAt: serverTimestamp(),
  });
}

// Helper to get player key
async function getPlayerKey(matchId, uid) {
  const snap = await getDoc(doc(db, DRAFT_MATCHES_COL, matchId));
  if (!snap.exists()) throw new Error('Match not found');
  const data = snap.data();
  return data.player1.uid === uid ? 'player1' : 'player2';
}

// ── Submit Changes (after half season) ──
export async function submitChanges(matchId, uid, changes) {
  // changes = array of { outPlayer, inPlayer } (max 3)
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);
  const playerKey = await getPlayerKey(matchId, uid);

  await updateDoc(matchRef, {
    [`${playerKey}.changes`]: changes,
    updatedAt: serverTimestamp(),
  });
}

// ── Phase Advancement ──
export async function advanceDraftPhase(matchId) {
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);

  let data;
  let currentPhase;
  try {
    data = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(matchRef);
      if (!snap.exists()) return null;
      return snap.data();
    });
  } catch (e) {
    console.error('advanceDraftPhase: error reading match:', e);
    return;
  }
  if (!data) return;
  currentPhase = data.phase;

  const transitions = {
    formation_pick: 'drafting',
    drafting: 'reveal',
    reveal: 'simulating1',
    simulating1: 'changes',
    changes: 'simulating2',
    simulating2: 'results',
  };

  const nextPhase = transitions[currentPhase];
  if (!nextPhase) return;

  console.log(`🔄 advanceDraftPhase: ${currentPhase} → ${nextPhase}`);

  const update = { phase: nextPhase, updatedAt: serverTimestamp() };

  if (nextPhase === 'drafting') {
    update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 180 * 1000)); // 3 min
  } else if (nextPhase === 'reveal') {
    // Reveal lasts ~11s (1s per player card)
    update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 15 * 1000));
  } else if (nextPhase === 'simulating1') {
    // Run half season simulation
    try {
      const { simulateHalfSeason } = await import('../game/rankedSimulation');
      // Build league: 18 AI teams + 2 player teams
      const allTeams = buildLeagueTeams(data);
      const result = simulateHalfSeason(
        allTeams,
        'draft_player1',
        'draft_player2',
        { formation: data.player1.formation, tactic: 'balanced' },
        { formation: data.player2.formation, tactic: 'balanced' },
        'draft'
      );
      update.simulation1 = {
        table: result.table.map(t => ({
          teamId: t.teamId,
          teamName: t.teamName,
          played: t.played || 0,
          won: t.won || 0,
          drawn: t.drawn || 0,
          lost: t.lost || 0,
          goalsFor: t.goalsFor || 0,
          goalsAgainst: t.goalsAgainst || 0,
          goalDifference: (t.goalsFor || 0) - (t.goalsAgainst || 0),
          points: t.points || 0,
        })),
        h2h: result.h2h,
      };
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 8000));
    } catch (e) {
      console.error('Draft half season simulation error:', e);
      update.simulation1 = generateDraftFallbackSimulation(data);
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 5000));
    }
  } else if (nextPhase === 'changes') {
    update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 60 * 1000)); // 60s for changes
  } else if (nextPhase === 'simulating2') {
    // Run full season
    try {
      const { simulateHalfSeason, simulateFullSeason } = await import('../game/rankedSimulation');
      const allTeams = buildLeagueTeams(data, true); // apply changes
      const halfState = simulateHalfSeason(
        allTeams,
        'draft_player1',
        'draft_player2',
        { formation: data.player1.formation, tactic: 'balanced' },
        { formation: data.player2.formation, tactic: 'balanced' },
        'draft'
      );
      const fullResult = simulateFullSeason(
        halfState, allTeams,
        'draft_player1',
        'draft_player2',
        { formation: data.player1.formation, tactic: 'balanced' },
        { formation: data.player2.formation, tactic: 'balanced' }
      );

      // Determine winner by league position
      const p1Entry = fullResult.table.find(t => t.teamId === 'draft_player1');
      const p2Entry = fullResult.table.find(t => t.teamId === 'draft_player2');
      const p1Pos = fullResult.table.indexOf(p1Entry) + 1;
      const p2Pos = fullResult.table.indexOf(p2Entry) + 1;

      let winner = null;
      if (p1Pos < p2Pos) winner = data.player1.uid;
      else if (p2Pos < p1Pos) winner = data.player2.uid;

      // Calculate LP changes
      const isDraw = !winner;
      let p1LPChange = 0, p2LPChange = 0;
      if (isDraw) {
        p1LPChange = 5;
        p2LPChange = 5;
      } else {
        const winnerLP = winner === data.player1.uid ? (data.player1.totalLP || 0) : (data.player2.totalLP || 0);
        const loserLP = winner === data.player1.uid ? (data.player2.totalLP || 0) : (data.player1.totalLP || 0);
        const baseLPChange = calculateLPChange(winnerLP, loserLP, false);
        const winnerIsP1 = winner === data.player1.uid;
        if (winnerIsP1) {
          p1LPChange = baseLPChange;
          p2LPChange = -Math.min(Math.ceil(baseLPChange * 0.7), data.player2.totalLP || 0);
        } else {
          p2LPChange = baseLPChange;
          p1LPChange = -Math.min(Math.ceil(baseLPChange * 0.7), data.player1.totalLP || 0);
        }
      }

      update.simulation2 = {
        table: fullResult.table.map(t => ({
          teamId: t.teamId,
          teamName: t.teamName,
          played: t.played || 0,
          won: t.won || 0,
          drawn: t.drawn || 0,
          lost: t.lost || 0,
          goalsFor: t.goalsFor || 0,
          goalsAgainst: t.goalsAgainst || 0,
          goalDifference: t.goalDifference || 0,
          points: t.points || 0,
        })),
        player1: fullResult.player1,
        player2: fullResult.player2,
      };
      update.winner = winner;
      update.results = {
        player1LPChange: p1LPChange,
        player2LPChange: p2LPChange,
        player1Position: p1Pos,
        player2Position: p2Pos,
      };
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 8000));
    } catch (e) {
      console.error('Draft full season simulation error:', e);
      update.simulation2 = generateDraftFallbackSimulation(data);
      update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 5000));
    }
  } else if (nextPhase === 'results') {
    // Results phase — just display
    update.status = 'finished';
  }

  // Write with optimistic locking
  try {
    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(matchRef);
      if (!freshSnap.exists()) return;
      const freshData = freshSnap.data();
      if (freshData.phase !== currentPhase) {
        console.log(`⚠️ advanceDraftPhase: phase already changed, aborting`);
        return;
      }
      transaction.update(matchRef, stripUndefined(update));
    });
  } catch (e) {
    console.error('advanceDraftPhase: error writing update:', e);
    return;
  }

  // Update player stats if we have results
  if (update.results && update.winner !== undefined) {
    await updateDraftPlayerStats(
      data.player1.uid, data.player2.uid,
      update.winner,
      update.results.player1LPChange,
      update.results.player2LPChange
    );
  }
}

// Build league teams array for simulation
function buildLeagueTeams(data, applyChanges = false) {
  const aiTeams = (data.leagueTeams || []).map(t => ({
    id: t.id,
    name: t.name,
    players: generateAIPlayers(t.avgOverall),
  }));

  const p1Team = {
    id: 'draft_player1',
    name: data.player1.displayName,
    players: (data.player1.team || data.player1.picks || []).map(p => ({
      ...p.player,
      position: p.position,
    })),
  };

  const p2Team = {
    id: 'draft_player2',
    name: data.player2.displayName,
    players: (data.player2.team || data.player2.picks || []).map(p => ({
      ...p.player,
      position: p.position,
    })),
  };

  // Apply changes if in second half
  if (applyChanges) {
    applyDraftChanges(p1Team, data.player1.changes);
    applyDraftChanges(p2Team, data.player2.changes);
  }

  return [...aiTeams, p1Team, p2Team];
}

function generateAIPlayers(avgOverall) {
  const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CM', 'LW', 'RW', 'ST'];
  return positions.map((pos, i) => ({
    name: `AI Player ${i + 1}`,
    position: pos,
    overall: avgOverall + Math.floor(Math.random() * 6) - 3,
  }));
}

function applyDraftChanges(team, changes) {
  if (!changes || !Array.isArray(changes)) return;
  for (const change of changes) {
    const idx = team.players.findIndex(p => p.name === change.outPlayer?.name);
    if (idx !== -1 && change.inPlayer) {
      team.players[idx] = { ...change.inPlayer, position: team.players[idx].position };
    }
  }
}

function generateDraftFallbackSimulation(data) {
  const teams = [...(data.leagueTeams || []).map(t => t.name), data.player1.displayName, data.player2.displayName];
  const table = teams.map((name, i) => ({
    teamId: i < 18 ? `ai_team_${i}` : (i === 18 ? 'draft_player1' : 'draft_player2'),
    teamName: name,
    played: 34,
    won: Math.floor(Math.random() * 20) + 5,
    drawn: Math.floor(Math.random() * 10),
    lost: 0, goalsFor: Math.floor(Math.random() * 40) + 30,
    goalsAgainst: Math.floor(Math.random() * 40) + 20,
    goalDifference: 0, points: 0,
  })).map(t => ({
    ...t,
    lost: t.played - t.won - t.drawn,
    points: t.won * 3 + t.drawn,
    goalDifference: t.goalsFor - t.goalsAgainst,
  })).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

  return { table, h2h: null };
}

// ── Player Stats Update ──
async function updateDraftPlayerStats(uid1, uid2, winnerUid, p1LPChange, p2LPChange) {
  const isDraw = !winnerUid;
  const p1Ref = doc(db, PLAYERS_COL, uid1);
  const p2Ref = doc(db, PLAYERS_COL, uid2);

  if (isDraw) {
    await Promise.all([
      updateDoc(p1Ref, { draws: increment(1), totalLP: increment(p1LPChange || 5), updatedAt: serverTimestamp() }),
      updateDoc(p2Ref, { draws: increment(1), totalLP: increment(p2LPChange || 5), updatedAt: serverTimestamp() }),
    ]);
    return;
  }

  const winnerIsP1 = winnerUid === uid1;
  const winnerRef = winnerIsP1 ? p1Ref : p2Ref;
  const loserRef = winnerIsP1 ? p2Ref : p1Ref;
  const winnerLP = winnerIsP1 ? p1LPChange : p2LPChange;
  const loserLP = winnerIsP1 ? p2LPChange : p1LPChange;

  await runTransaction(db, async (transaction) => {
    const loserSnap = await transaction.get(loserRef);
    const loserData = loserSnap.exists() ? loserSnap.data() : {};
    const currentLoserLP = loserData.totalLP || 0;
    const lpChange = Math.max(loserLP, -currentLoserLP);

    transaction.update(winnerRef, { wins: increment(1), totalLP: increment(winnerLP), updatedAt: serverTimestamp() });
    transaction.update(loserRef, { losses: increment(1), totalLP: increment(lpChange), updatedAt: serverTimestamp() });
  });
}

// ── Heartbeat ──
export async function sendDraftHeartbeat(matchId, uid) {
  try {
    const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);
    await updateDoc(matchRef, {
      [`heartbeats.${uid}`]: serverTimestamp(),
    });
  } catch (e) {}
}

export async function checkDraftDisconnect(matchId, uid) {
  try {
    const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const otherUid = data.player1.uid === uid ? data.player2.uid : data.player1.uid;
    const lastPing = data.heartbeats?.[otherUid]?.toDate?.();
    if (!lastPing) return false;
    return (Date.now() - lastPing.getTime()) > 15000;
  } catch { return false; }
}

export async function claimDraftDisconnectWin(matchId, uid) {
  const matchRef = doc(db, DRAFT_MATCHES_COL, matchId);
  let data;
  try {
    data = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(matchRef);
      if (!snap.exists()) return null;
      const d = snap.data();
      if (d.phase === 'results' || d.winner) return null;

      transaction.update(matchRef, {
        phase: 'results',
        winner: uid,
        status: 'finished',
        results: {
          disconnection: true,
          player1LPChange: d.player1.uid === uid ? 20 : -15,
          player2LPChange: d.player2.uid === uid ? 20 : -15,
        },
        updatedAt: serverTimestamp(),
      });
      return d;
    });
  } catch (e) {
    console.error('claimDraftDisconnectWin error:', e);
    return;
  }
  if (!data) return;

  const p1LP = data.player1.uid === uid ? 20 : -15;
  const p2LP = data.player2.uid === uid ? 20 : -15;
  await updateDraftPlayerStats(data.player1.uid, data.player2.uid, uid, p1LP, p2LP);
}

// ── Find Active Draft Match ──
export async function findMyActiveDraftMatch(uid) {
  const MAX_AGE_MS = 30 * 60 * 1000;
  const now = Date.now();

  const checkDocs = async (snap) => {
    for (const d of snap.docs) {
      const data = d.data();
      if (data.status === 'active' && data.phase !== 'results') {
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        const age = createdAt ? now - new Date(createdAt).getTime() : Infinity;
        if (age > MAX_AGE_MS) {
          try { await updateDoc(d.ref, { status: 'finished', phase: 'results', updatedAt: serverTimestamp() }); } catch {}
          continue;
        }
        return { id: d.id, ...data };
      }
    }
    return null;
  };

  // Use flat uid fields (no nested field index needed)
  const q1 = query(collection(db, DRAFT_MATCHES_COL), where('player1Uid', '==', uid));
  const result1 = await checkDocs(await getDocs(q1));
  if (result1) return result1;

  const q2 = query(collection(db, DRAFT_MATCHES_COL), where('player2Uid', '==', uid));
  return await checkDocs(await getDocs(q2));
}
