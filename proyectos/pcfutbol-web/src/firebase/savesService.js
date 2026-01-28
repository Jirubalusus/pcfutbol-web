import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

const MAX_SLOTS = 5;

// Get save ID for a slot
function getSaveId(userId, slotIndex) {
  return `${userId}_slot_${slotIndex}`;
}

// Get all saves for a user
export async function getUserSaves(userId) {
  const saves = [];
  
  for (let i = 0; i < MAX_SLOTS; i++) {
    const saveId = getSaveId(userId, i);
    const docRef = doc(db, 'saves', saveId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      saves.push({
        slotIndex: i,
        ...docSnap.data()
      });
    } else {
      saves.push({
        slotIndex: i,
        empty: true
      });
    }
  }
  
  return saves;
}

// Save game to a slot
export async function saveGameToSlot(userId, slotIndex, gameState) {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    throw new Error('Invalid slot index');
  }
  
  const saveId = getSaveId(userId, slotIndex);
  const saveData = {
    ...gameState,
    userId,
    slotIndex,
    lastSaved: serverTimestamp(),
    // Summary for slot preview
    summary: {
      teamName: gameState.team?.name || 'Unknown',
      teamId: gameState.teamId,
      season: gameState.currentSeason || 1,
      week: gameState.currentWeek || 1,
      money: gameState.money || 0,
      position: getLeaguePosition(gameState)
    }
  };
  
  await setDoc(doc(db, 'saves', saveId), saveData);
  return saveId;
}

// Load game from a slot
export async function loadGameFromSlot(userId, slotIndex) {
  const saveId = getSaveId(userId, slotIndex);
  const docRef = doc(db, 'saves', saveId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  
  return null;
}

// Delete a save slot
export async function deleteSaveSlot(userId, slotIndex) {
  const saveId = getSaveId(userId, slotIndex);
  await deleteDoc(doc(db, 'saves', saveId));
}

// Helper to get league position from state
function getLeaguePosition(gameState) {
  if (!gameState.leagueTable || !gameState.teamId) return null;
  
  const teamEntry = gameState.leagueTable.find(t => t.teamId === gameState.teamId);
  return teamEntry ? gameState.leagueTable.indexOf(teamEntry) + 1 : null;
}

// Check if user has any saves
export async function hasAnySaves(userId) {
  const saves = await getUserSaves(userId);
  return saves.some(s => !s.empty);
}
