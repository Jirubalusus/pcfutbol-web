// ============================================================
// Ranking Service — Firebase shared leaderboard for Contrarreloj
// ============================================================

import { db } from './config';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, getCountFromServer,
  query, orderBy, limit, where, serverTimestamp 
} from 'firebase/firestore';

const COLLECTION = 'contrarreloj_ranking';

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
    // Fallback to localStorage
    try {
      const data = localStorage.getItem('pcfutbol_contrarreloj_ranking');
      const ranking = data ? JSON.parse(data) : [];
      ranking.push({ ...entry, id: Date.now().toString() });
      localStorage.setItem('pcfutbol_contrarreloj_ranking', JSON.stringify(ranking));
    } catch { /* ignore */ }
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
    
    // Multi-criteria sort (Firestore only supports single orderBy without index)
    // 1. Menor score ponderado = mejor (score = temporadas - ascensos necesarios)
    // 2. Más trofeos = mejor
    // 3. Mayor % victorias = mejor
    // 4. Menos partidos jugados = mejor
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
    console.error('Error loading ranking:', err);
    // Fallback to localStorage
    try {
      const data = localStorage.getItem('pcfutbol_contrarreloj_ranking');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Get ranking position for a given seasonsPlayed count.
 * Returns { position, total } — position is 1-indexed.
 * Players with fewer seasons are ranked higher.
 */
export async function getRankingPosition(seasonsPlayed) {
  try {
    const col = collection(db, COLLECTION);
    
    // Count entries with fewer seasons (better than us)
    const betterQuery = query(col, where('seasonsPlayed', '<', seasonsPlayed));
    const betterSnap = await getCountFromServer(betterQuery);
    const betterCount = betterSnap.data().count;
    
    // Count entries with same seasons (tied)
    const sameQuery = query(col, where('seasonsPlayed', '==', seasonsPlayed));
    const sameSnap = await getCountFromServer(sameQuery);
    const sameCount = sameSnap.data().count;
    
    // Total entries
    const totalSnap = await getCountFromServer(col);
    const total = totalSnap.data().count;
    
    // Position: all better + half of tied (generous midpoint)
    const position = betterCount + Math.ceil(sameCount / 2);
    
    return { position: Math.max(1, position), total };
  } catch (err) {
    console.error('Error getting ranking position:', err);
    // Fallback localStorage
    try {
      const data = localStorage.getItem('pcfutbol_contrarreloj_ranking');
      const ranking = data ? JSON.parse(data) : [];
      const sorted = ranking.sort((a, b) => a.seasonsPlayed - b.seasonsPlayed);
      const idx = sorted.findIndex(e => e.seasonsPlayed >= seasonsPlayed);
      return { position: idx >= 0 ? idx + 1 : sorted.length + 1, total: sorted.length };
    } catch {
      return { position: 1, total: 1 };
    }
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
    localStorage.removeItem('pcfutbol_contrarreloj_ranking');
    console.log('🗑️ Ranking cleared');
  } catch (err) {
    console.error('Error clearing ranking:', err);
    localStorage.removeItem('pcfutbol_contrarreloj_ranking');
  }
}
