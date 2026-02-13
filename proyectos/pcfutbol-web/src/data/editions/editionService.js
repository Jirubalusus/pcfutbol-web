/**
 * Edition Mode Service
 * Manages community edition packs that override team/player names
 * Editions are stored in Firebase and cached in localStorage
 */
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

const EDITIONS_COLLECTION = 'editions';
const PENDING_COLLECTION = 'editions_pending'; // Packs pending review
const ACTIVE_EDITION_KEY = 'pcgaffer_active_edition';

// ============================================================
// PUBLIC EDITIONS (approved)
// ============================================================

/**
 * Get all approved edition packs
 */
export async function getEditions() {
  try {
    const snapshot = await getDocs(collection(db, EDITIONS_COLLECTION));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (err) {
    console.error('Error loading editions:', err);
    return [];
  }
}

/**
 * Get a single edition pack by ID (with caching)
 */
let editionCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // BUG 18 fix: 5 minute TTL
export async function getEdition(editionId) {
  const cached = editionCache[editionId];
  if (cached && (Date.now() - cached._ts) < CACHE_TTL_MS) return cached.data;
  try {
    const snap = await getDoc(doc(db, EDITIONS_COLLECTION, editionId));
    if (!snap.exists()) return null;
    const edition = { id: snap.id, ...snap.data() };
    editionCache[editionId] = { data: edition, _ts: Date.now() };
    return edition;
  } catch (err) {
    console.error('Error loading edition:', err);
    return null;
  }
}

export function clearEditionCache() {
  editionCache = {};
}

// ============================================================
// PENDING EDITIONS (user submissions, need admin approval)
// ============================================================

/**
 * Submit a pack for review (goes to editions_pending)
 */
export async function submitEdition(data, userId) {
  try {
    const pendingId = `pending_${Date.now()}_${userId || 'anon'}`;
    await setDoc(doc(db, PENDING_COLLECTION, pendingId), {
      ...data,
      submittedBy: userId || 'anonymous',
      submittedAt: new Date().toISOString(),
      status: 'pending' // pending | approved | rejected
    });
    return pendingId;
  } catch (err) {
    console.error('Error submitting edition:', err);
    return null;
  }
}

/**
 * Get pending editions (admin only)
 */
export async function getPendingEditions() {
  try {
    const snapshot = await getDocs(collection(db, PENDING_COLLECTION));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.status === 'pending')
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  } catch (err) {
    console.error('Error loading pending editions:', err);
    return [];
  }
}

/**
 * Approve a pending edition (move to public editions collection)
 */
export async function approveEdition(pendingId) {
  try {
    const snap = await getDoc(doc(db, PENDING_COLLECTION, pendingId));
    if (!snap.exists()) return false;
    
    const data = snap.data();
    const editionId = data.id || `edition_${Date.now()}`;
    
    // BUG 16 fix: exclude submittedBy and status when copying to public collection
    const { submittedBy, status, ...publicData } = data;
    await setDoc(doc(db, EDITIONS_COLLECTION, editionId), {
      ...publicData,
      id: editionId,
      approvedAt: new Date().toISOString()
    });
    
    // Update pending status
    await setDoc(doc(db, PENDING_COLLECTION, pendingId), {
      ...data,
      status: 'approved'
    });
    
    return true;
  } catch (err) {
    console.error('Error approving edition:', err);
    return false;
  }
}

/**
 * Reject a pending edition
 */
export async function rejectEdition(pendingId) {
  try {
    await deleteDoc(doc(db, PENDING_COLLECTION, pendingId));
    return true;
  } catch (err) {
    console.error('Error rejecting edition:', err);
    return false;
  }
}

// ============================================================
// ACTIVE EDITION MANAGEMENT
// ============================================================

/**
 * Set active edition (stored in localStorage for fast access)
 */
export function setActiveEdition(editionId) {
  if (editionId) {
    localStorage.setItem(ACTIVE_EDITION_KEY, editionId);
  } else {
    localStorage.removeItem(ACTIVE_EDITION_KEY);
  }
  clearEditionCache();
}

export function getActiveEditionId() {
  return localStorage.getItem(ACTIVE_EDITION_KEY);
}

export function clearActiveEdition() {
  localStorage.removeItem(ACTIVE_EDITION_KEY);
  clearEditionCache();
}

// ============================================================
// SAVE DELETION (when applying/removing edition)
// ============================================================

/**
 * Delete ALL saves for a user (career slots + contrarreloj)
 */
export async function deleteAllSaves(userId) {
  if (!userId) return;
  
  try {
    // Delete contrarreloj save
    const { deleteContrarrelojSave } = await import('../../firebase/contrarrelojSaveService');
    await deleteContrarrelojSave(userId).catch(() => {});
    
    // Delete career save slots
    const savesSnapshot = await getDocs(
      query(collection(db, 'saves'), where('userId', '==', userId))
    );
    const deletePromises = savesSnapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    
    // Also try save slots collection
    const slotsSnapshot = await getDocs(
      query(collection(db, 'save_slots'), where('userId', '==', userId))
    );
    const slotDeletes = slotsSnapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(slotDeletes);
    
    // Clear localStorage saves
    localStorage.removeItem('pcfutbol_local_save');
    localStorage.removeItem('pcfutbol_saveId');
    
    console.log('🗑️ All saves deleted for user', userId);
  } catch (err) {
    console.error('Error deleting saves:', err);
  }
}
