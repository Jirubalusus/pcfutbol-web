// ============================================================
// Ranking Service — Firebase shared leaderboard for Contrarreloj
// ------------------------------------------------------------
// Cost optimization: prefer a single aggregate document
// (leaderboard_aggregates/contrarreloj_top) over scanning the
// contrarreloj_ranking collection and running 3x getCountFromServer.
// Reads are cached in memory + localStorage. Every aggregate path
// falls back to the legacy collection queries when the aggregate is
// missing or unreadable, so existing UX is preserved even before the
// aggregate doc exists in production.
// ============================================================

import { db } from './config';
import {
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, getCountFromServer,
  query, orderBy, limit, where, serverTimestamp
} from 'firebase/firestore';
import { getCached, setCached, clearCached, TTL } from './readCache';

const COLLECTION = 'contrarreloj_ranking';

// Aggregate document — one read replaces a full collection scan / count queries.
const AGG_COL = 'leaderboard_aggregates';
const AGG_DOC = 'contrarreloj_top';
const AGG_MAX_ENTRIES = 100; // cap entries kept inside the aggregate doc

const CACHE_KEY = 'ranking:contrarreloj_top';
const CACHE_TTL = TTL.TEN_MIN;

const isPermissionError = (err) => err?.code === 'permission-denied' || /insufficient permissions/i.test(err?.message || '');

// ── Sanitization ──────────────────────────────────────────
// Keep only known, serializable fields so aggregate entries stay small
// and never carry Firestore sentinels (serverTimestamp is illegal inside
// array fields).
function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const trophies = Array.isArray(entry.trophies)
    ? entry.trophies.filter(t => t != null).map(t => (typeof t === 'object' ? { ...t } : t))
    : [];
  let date = entry.date;
  if (date && typeof date?.toDate === 'function') {
    try { date = date.toDate().toISOString(); } catch { date = null; }
  } else if (typeof date !== 'string') {
    date = null;
  }
  return {
    id: entry.id || null,
    playerName: entry.playerName || 'Gaffer',
    teamName: entry.teamName || '',
    leagueName: entry.leagueName || '',
    seasonsPlayed: entry.seasonsPlayed || 0,
    trophies,
    wonCompetition: entry.wonCompetition || null,
    totalWins: entry.totalWins || 0,
    totalDraws: entry.totalDraws || 0,
    totalLosses: entry.totalLosses || 0,
    totalMatches: entry.totalMatches || 0,
    bestPlayer: entry.bestPlayer
      ? { name: entry.bestPlayer.name, overall: entry.bestPlayer.overall, position: entry.bestPlayer.position }
      : null,
    difficultyBonus: entry.difficultyBonus || 0,
    weightedScore: typeof entry.weightedScore === 'number'
      ? entry.weightedScore
      : (entry.seasonsPlayed || 0) - (entry.difficultyBonus || 0),
    date,
  };
}

// Canonical ranking sort: lower weighted score first, then more trophies,
// then better win rate, then fewer matches.
function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aScore = (a.seasonsPlayed || 0) - (a.difficultyBonus || 0);
    const bScore = (b.seasonsPlayed || 0) - (b.difficultyBonus || 0);
    if (aScore !== bScore) return aScore - bScore;
    const trophyDiff = (b.trophies?.length || 0) - (a.trophies?.length || 0);
    if (trophyDiff !== 0) return trophyDiff;
    const aWinRate = (a.totalMatches || 0) > 0 ? (a.totalWins || 0) / a.totalMatches : 0;
    const bWinRate = (b.totalMatches || 0) > 0 ? (b.totalWins || 0) / b.totalMatches : 0;
    if (Math.abs(bWinRate - aWinRate) > 0.001) return bWinRate - aWinRate;
    return (a.totalMatches || 0) - (b.totalMatches || 0);
  });
}

// ── Aggregate read (cached) ───────────────────────────────
// Returns { entries, total } or null when the aggregate is unavailable.
async function readAggregate() {
  const cached = getCached(CACHE_KEY);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, AGG_COL, AGG_DOC));
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    const entries = sortEntries((data.entries || []).map(sanitizeEntry).filter(Boolean));
    const total = typeof data.total === 'number' ? data.total : entries.length;
    const result = { entries, total };
    setCached(CACHE_KEY, result, CACHE_TTL);
    return result;
  } catch (err) {
    if (!isPermissionError(err)) console.warn('Ranking aggregate read failed, falling back:', err?.message || err);
    return null;
  }
}

/**
 * Save a contrarreloj result to the shared ranking.
 * Always writes to the legacy collection. Best-effort: also folds the
 * entry into the aggregate doc so leaderboard reads stay cheap. Aggregate
 * failures (e.g. permission denied) never block the save or gameplay.
 */
export async function saveRankingEntry(entry) {
  let docId = null;
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...entry,
      createdAt: serverTimestamp()
    });
    docId = docRef.id;
    console.log('🏆 Ranking entry saved:', docId);
  } catch (err) {
    console.error('Error saving ranking entry:', err);
    return null;
  }

  // Aggregate docs are read-only from the browser for security/cost hygiene.
  // A trusted Admin SDK job can rebuild leaderboard_aggregates/contrarreloj_top;
  // until then readers fall back to the legacy collection query.
  clearCached(CACHE_KEY);
  return docId;
}

/**
 * Load ranking entries, sorted by weighted score.
 * Tries the aggregate doc (one read) first, falls back to the legacy
 * collection query. Result is cached for CACHE_TTL.
 */
export async function loadRanking(maxEntries = 50) {
  const agg = await readAggregate();
  if (agg) {
    return agg.entries.slice(0, maxEntries);
  }

  // Fallback: legacy collection query.
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('seasonsPlayed', 'asc'),
      limit(Math.max(maxEntries, AGG_MAX_ENTRIES))
    );
    const snapshot = await getDocs(q);
    const entries = sortEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    // Cache the fallback result so we don't re-scan within the TTL window.
    setCached(CACHE_KEY, { entries: entries.map(sanitizeEntry).filter(Boolean), total: entries.length }, TTL.FIVE_MIN);
    return entries.slice(0, maxEntries);
  } catch (err) {
    if (isPermissionError(err)) {
      console.warn('Ranking unavailable: missing Firebase read permissions. Showing empty leaderboard.');
    } else {
      console.error('Error loading ranking:', err);
    }
    return [];
  }
}

/**
 * Get ranking position for a given seasonsPlayed count.
 * Prefers the aggregate doc (approximate position from cached top entries
 * + total). Falls back to 3x getCountFromServer only when no aggregate.
 */
export async function getRankingPosition(seasonsPlayed) {
  const agg = await readAggregate();
  if (agg && agg.entries.length > 0) {
    const better = agg.entries.filter(e => (e.seasonsPlayed || 0) < seasonsPlayed).length;
    const same = agg.entries.filter(e => (e.seasonsPlayed || 0) === seasonsPlayed).length;
    const position = better + Math.ceil(same / 2);
    const total = agg.total || agg.entries.length;
    return { position: Math.max(1, position), total: Math.max(total, position) };
  }

  // Fallback: exact counts via aggregation queries.
  try {
    const col = collection(db, COLLECTION);

    const betterQuery = query(col, where('seasonsPlayed', '<', seasonsPlayed));
    const betterSnap = await getCountFromServer(betterQuery);
    const betterCount = betterSnap.data().count;

    const sameQuery = query(col, where('seasonsPlayed', '==', seasonsPlayed));
    const sameSnap = await getCountFromServer(sameQuery);
    const sameCount = sameSnap.data().count;

    const totalSnap = await getCountFromServer(col);
    const total = totalSnap.data().count;

    const position = betterCount + Math.ceil(sameCount / 2);

    return { position: Math.max(1, position), total };
  } catch (err) {
    if (isPermissionError(err)) {
      console.warn('Ranking position unavailable: missing Firebase read permissions.');
    } else {
      console.error('Error getting ranking position:', err);
    }
    return { position: 1, total: 1 };
  }
}

/**
 * Clear all ranking entries (admin only). Best-effort clears the aggregate too.
 */
export async function clearRanking() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, COLLECTION, d.id)));
    await Promise.all(deletePromises);
    console.log('🗑️ Ranking cleared');
  } catch (err) {
    console.error('Error clearing ranking:', err);
  }
  // Best-effort aggregate reset.
  try {
    await deleteDoc(doc(db, AGG_COL, AGG_DOC));
  } catch (err) {
    if (!isPermissionError(err)) console.warn('Ranking aggregate clear skipped:', err?.message || err);
  }
  clearCached(CACHE_KEY);
}
