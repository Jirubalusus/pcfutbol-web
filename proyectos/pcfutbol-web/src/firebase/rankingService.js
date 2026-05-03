// ============================================================
// Ranking Service — Firebase shared leaderboard for Contrarreloj
// ============================================================

import { db } from './config';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, getCountFromServer,
  query, orderBy, limit, where, serverTimestamp 
} from 'firebase/firestore';

const COLLECTION = 'contrarreloj_ranking';

const isPermissionError = (err) => err?.code === 'permission-denied' || /insufficient permissions/i.test(err?.message || '');

/**
 * Save a contrarreloj result to the shared ranking
 */
export async function saveRankingEntry(entry) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...entry,
      createdAt: serverTimestamp()
    });
    console.log('🏆 Ranking entry saved:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('Error saving ranking entry:', err);
    return null;
  }
}

/**
 * Load all ranking entries, sorted by seasonsPlayed ASC, trophies DESC
 */
export async function loadRanking(maxEntries = 50) {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('seasonsPlayed', 'asc'),
      limit(maxEntries)
    );
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    entries.sort((a, b) => {
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
    
    return entries;
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
 */
export async function getRankingPosition(seasonsPlayed) {
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
 * Clear all ranking entries (admin only)
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
}
