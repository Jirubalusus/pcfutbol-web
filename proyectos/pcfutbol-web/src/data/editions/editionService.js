/**
 * Edition Mode Service
 * Manages community edition packs that override team/player names
 * Editions are stored in Firebase and cached in localStorage
 */
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const EDITIONS_COLLECTION = 'editions';
const ACTIVE_EDITION_KEY = 'pcgaffer_active_edition';

/**
 * Get all available edition packs from Firebase
 */
export async function getEditions() {
  try {
    const q = query(collection(db, EDITIONS_COLLECTION), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading editions:', err);
    return [];
  }
}

/**
 * Get a single edition pack by ID
 */
export async function getEdition(editionId) {
  try {
    const snap = await getDoc(doc(db, EDITIONS_COLLECTION, editionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Error loading edition:', err);
    return null;
  }
}

/**
 * Upload/save an edition pack to Firebase
 */
export async function saveEdition(editionId, data) {
  try {
    await setDoc(doc(db, EDITIONS_COLLECTION, editionId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error saving edition:', err);
    return false;
  }
}

/**
 * Delete an edition pack
 */
export async function deleteEdition(editionId) {
  try {
    await deleteDoc(doc(db, EDITIONS_COLLECTION, editionId));
    return true;
  } catch (err) {
    console.error('Error deleting edition:', err);
    return false;
  }
}

/**
 * Apply an edition pack — saves the edition ID as active
 * Returns the edition data with team/player mappings
 */
export function setActiveEdition(editionId) {
  if (editionId) {
    localStorage.setItem(ACTIVE_EDITION_KEY, editionId);
  } else {
    localStorage.removeItem(ACTIVE_EDITION_KEY);
  }
}

/**
 * Get the currently active edition ID
 */
export function getActiveEditionId() {
  return localStorage.getItem(ACTIVE_EDITION_KEY);
}

/**
 * Clear active edition (revert to default names)
 */
export function clearActiveEdition() {
  localStorage.removeItem(ACTIVE_EDITION_KEY);
}

/**
 * Apply edition mappings to a team object
 * Edition format:
 * {
 *   teams: {
 *     "real_madrid": {
 *       name: "Real Madrid CF",
 *       stadium: "Santiago Bernabéu",
 *       players: {
 *         "Teodoro Castaño": "Thibaut Courtois",
 *         "Kaique Monteiro": "Kylian Mbappé",
 *         ...
 *       }
 *     }
 *   }
 * }
 */
export function applyEditionToTeam(team, teamId, edition) {
  if (!edition?.teams?.[teamId]) return team;
  
  const editionTeam = edition.teams[teamId];
  const result = { ...team };
  
  if (editionTeam.name) result.name = editionTeam.name;
  if (editionTeam.shortName) result.shortName = editionTeam.shortName;
  if (editionTeam.stadium) result.stadium = editionTeam.stadium;
  
  if (editionTeam.players && result.players) {
    result.players = result.players.map(player => {
      const newName = editionTeam.players[player.name];
      if (newName) {
        return { ...player, name: newName };
      }
      return player;
    });
  }
  
  return result;
}

/**
 * Apply edition to all teams in a dataset
 */
export function applyEditionToAllTeams(teamsObj, edition) {
  if (!edition?.teams) return teamsObj;
  
  const result = {};
  for (const [teamId, team] of Object.entries(teamsObj)) {
    result[teamId] = applyEditionToTeam(team, teamId, edition);
  }
  return result;
}
