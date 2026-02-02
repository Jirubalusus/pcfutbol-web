// ============================================================
// Ranking Service — Firebase shared leaderboard for Contrarreloj
// ============================================================

import { db } from './config';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, 
  query, orderBy, limit, serverTimestamp 
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
    
    // Secondary sort by trophies count (Firestore only supports single orderBy without index)
    entries.sort((a, b) => {
      if (a.seasonsPlayed !== b.seasonsPlayed) return a.seasonsPlayed - b.seasonsPlayed;
      return (b.trophies?.length || 0) - (a.trophies?.length || 0);
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
