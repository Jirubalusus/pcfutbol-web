// ============================================================
// RANKED 1v1 SERVICE - Firestore operations for ranked matches
// All queries use single-field filters + client-side sorting
// to avoid needing composite indexes
// ============================================================

import { db } from './config';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, Timestamp, limit
} from 'firebase/firestore';

const MATCHES_COL = 'ranked_matches';
const PLAYERS_COL = 'ranked_players';
const QUEUE_COL = 'ranked_queue';

// ============================================================
// PLAYER PROFILE
// ============================================================

export async function getOrCreatePlayerProfile(userId, displayName) {
  try {
    const ref = doc(db, PLAYERS_COL, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      // Update displayName if changed
      const data = snap.data();
      if (data.displayName !== displayName) {
        await updateDoc(ref, { displayName, updatedAt: serverTimestamp() });
      }
      return { id: snap.id, ...data, displayName };
    }
    const profile = {
      displayName: displayName || 'Jugador',
      elo: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return { id: userId, ...profile };
  } catch (err) {
    console.error('Error getting/creating player profile:', err);
    throw new Error('No se pudo cargar el perfil de jugador');
  }
}

export async function getPlayerProfile(userId) {
  try {
    const ref = doc(db, PLAYERS_COL, userId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('Error getting player profile:', err);
    return null;
  }
}

// ============================================================
// MATCHMAKING QUEUE
// ============================================================

export async function joinQueue(userId, displayName) {
  try {
    const ref = doc(db, QUEUE_COL, userId);
    await setDoc(ref, {
      userId,
      displayName: displayName || 'Jugador',
      joinedAt: serverTimestamp(),
      status: 'waiting',
    });
    return true;
  } catch (err) {
    console.error('Error joining queue:', err);
    throw new Error('Error al unirse a la cola');
  }
}

export async function leaveQueue(userId) {
  try {
    await deleteDoc(doc(db, QUEUE_COL, userId));
  } catch (err) {
    console.error('Error leaving queue:', err);
  }
}

// Listen for queue changes - find an opponent
// Uses single where clause (status == 'waiting'), client-side filter
export function listenToQueue(userId, onMatch) {
  const q = query(
    collection(db, QUEUE_COL),
    where('status', '==', 'waiting'),
    limit(10)
  );

  return onSnapshot(q, (snapshot) => {
    const waitingPlayers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId !== userId) {
        waitingPlayers.push({ id: doc.id, ...data });
      }
    });

    // Sort client-side by joinedAt
    waitingPlayers.sort((a, b) => {
      const aTime = a.joinedAt?.toMillis?.() || 0;
      const bTime = b.joinedAt?.toMillis?.() || 0;
      return aTime - bTime;
    });

    if (waitingPlayers.length > 0) {
      onMatch(waitingPlayers[0]);
    }
  }, (err) => {
    console.error('Queue listener error:', err);
  });
}

// ============================================================
// MATCH CREATION & MANAGEMENT
// ============================================================

export async function createMatch(player1Id, player1Name, player2Id, player2Name) {
  try {
    const matchRef = doc(collection(db, MATCHES_COL));
    const matchData = {
      player1: { userId: player1Id, displayName: player1Name, team: null, ready: false },
      player2: { userId: player2Id, displayName: player2Name, team: null, ready: false },
      phase: 'team_selection',
      round: 0,
      scores: { player1: [null, null], player2: [null, null] },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
      timer: {
        phaseStart: Timestamp.now(),
        phaseDuration: 60, // 60 seconds for team selection
      },
    };
    await setDoc(matchRef, matchData);

    // Remove both players from queue
    await Promise.all([
      deleteDoc(doc(db, QUEUE_COL, player1Id)),
      deleteDoc(doc(db, QUEUE_COL, player2Id)),
    ]);

    return matchRef.id;
  } catch (err) {
    console.error('Error creating match:', err);
    throw new Error('Error al crear la partida');
  }
}

// Listen to match state changes
export function listenToMatch(matchId, callback) {
  return onSnapshot(doc(db, MATCHES_COL, matchId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Match listener error:', err);
    callback(null);
  });
}

export async function selectTeam(matchId, playerKey, team) {
  try {
    const ref = doc(db, MATCHES_COL, matchId);
    await updateDoc(ref, {
      [`${playerKey}.team`]: team,
      [`${playerKey}.ready`]: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error selecting team:', err);
    throw new Error('Error al seleccionar equipo');
  }
}

export async function advancePhase(matchId, newPhase, extraData = {}) {
  try {
    const ref = doc(db, MATCHES_COL, matchId);
    const update = {
      phase: newPhase,
      updatedAt: serverTimestamp(),
      'timer.phaseStart': Timestamp.now(),
      ...extraData,
    };

    // Set phase-specific durations
    const durations = {
      team_selection: 60,
      round1: 30,
      simulating1: 10,
      round2: 30,
      simulating2: 10,
      results: 30,
    };
    if (durations[newPhase]) {
      update['timer.phaseDuration'] = durations[newPhase];
    }

    await updateDoc(ref, update);
  } catch (err) {
    console.error('Error advancing phase:', err);
    throw new Error('Error al avanzar de fase');
  }
}

export async function submitRoundResult(matchId, round, player1Score, player2Score) {
  try {
    const ref = doc(db, MATCHES_COL, matchId);
    const roundIdx = round - 1;
    await updateDoc(ref, {
      [`scores.player1.${roundIdx}`]: player1Score,
      [`scores.player2.${roundIdx}`]: player2Score,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error submitting round result:', err);
    throw new Error('Error al guardar resultado');
  }
}

export async function finishMatch(matchId, winnerId, loserId, isDraw = false) {
  try {
    const ref = doc(db, MATCHES_COL, matchId);
    await updateDoc(ref, {
      status: 'finished',
      winnerId: winnerId || null,
      isDraw,
      finishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update player profiles
    if (isDraw) {
      await updatePlayerStats(winnerId, 'draw');
      await updatePlayerStats(loserId, 'draw');
    } else if (winnerId) {
      await updatePlayerStats(winnerId, 'win');
      if (loserId) await updatePlayerStats(loserId, 'loss');
    }
  } catch (err) {
    console.error('Error finishing match:', err);
  }
}

async function updatePlayerStats(userId, result) {
  try {
    const ref = doc(db, PLAYERS_COL, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const updates = {
      matchesPlayed: (data.matchesPlayed || 0) + 1,
      updatedAt: serverTimestamp(),
    };

    // ELO calculation
    const K = 32;
    const currentElo = data.elo || 1000;

    if (result === 'win') {
      updates.wins = (data.wins || 0) + 1;
      updates.elo = currentElo + Math.round(K * 0.6); // Simplified ELO
    } else if (result === 'loss') {
      updates.losses = (data.losses || 0) + 1;
      updates.elo = Math.max(100, currentElo - Math.round(K * 0.4));
    } else {
      updates.draws = (data.draws || 0) + 1;
      updates.elo = currentElo + Math.round(K * 0.05);
    }

    await updateDoc(ref, updates);
  } catch (err) {
    console.error('Error updating player stats:', err);
  }
}

// ============================================================
// DISCONNECT HANDLING
// ============================================================

export async function reportDisconnect(matchId, disconnectedPlayerKey) {
  try {
    const ref = doc(db, MATCHES_COL, matchId);
    await updateDoc(ref, {
      status: 'abandoned',
      [`${disconnectedPlayerKey}.disconnected`]: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error reporting disconnect:', err);
  }
}

// Check if user has an active match (single where clause)
export async function getActiveMatch(userId) {
  try {
    // Check as player1
    const q1 = query(
      collection(db, MATCHES_COL),
      where('player1.userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const doc = snap1.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // Check as player2
    const q2 = query(
      collection(db, MATCHES_COL),
      where('player2.userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const doc = snap2.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    return null;
  } catch (err) {
    console.error('Error checking active match:', err);
    return null;
  }
}

// ============================================================
// LEADERBOARD - Single field query, client-side sort
// ============================================================

export async function getLeaderboard(maxResults = 50) {
  try {
    // Query all players with at least 1 match, sort client-side
    const q = query(
      collection(db, PLAYERS_COL),
      where('matchesPlayed', '>', 0),
      limit(100)
    );
    const snap = await getDocs(q);
    const players = [];
    snap.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });

    // Sort by ELO descending client-side
    players.sort((a, b) => (b.elo || 0) - (a.elo || 0));
    return players.slice(0, maxResults);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
}

// Listen for queue entry for current user (to detect being matched)
export function listenToMyQueueEntry(userId, callback) {
  return onSnapshot(doc(db, QUEUE_COL, userId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Queue entry listener error:', err);
    callback(null);
  });
}

// Listen for matches where I'm a player (to detect being matched)
export function listenForMyMatch(userId, callback) {
  // Listen for matches where user is player1
  const q1 = query(
    collection(db, MATCHES_COL),
    where('player1.userId', '==', userId),
    where('status', '==', 'active'),
    limit(1)
  );

  const q2 = query(
    collection(db, MATCHES_COL),
    where('player2.userId', '==', userId),
    where('status', '==', 'active'),
    limit(1)
  );

  let matchFound = false;

  const unsub1 = onSnapshot(q1, (snap) => {
    if (!matchFound && !snap.empty) {
      matchFound = true;
      const doc = snap.docs[0];
      callback({ id: doc.id, ...doc.data() });
    }
  });

  const unsub2 = onSnapshot(q2, (snap) => {
    if (!matchFound && !snap.empty) {
      matchFound = true;
      const doc = snap.docs[0];
      callback({ id: doc.id, ...doc.data() });
    }
  });

  return () => {
    unsub1();
    unsub2();
  };
}
