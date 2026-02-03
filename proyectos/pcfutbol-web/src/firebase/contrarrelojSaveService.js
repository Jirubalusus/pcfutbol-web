import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'contrarreloj_saves';

function getSaveId(userId) {
  return `${userId}_contrarreloj`;
}

/**
 * Get the active contrarreloj save for a user (or null)
 */
export async function getContrarrelojSave(userId) {
  const docRef = doc(db, COLLECTION, getSaveId(userId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();

  // Sanitize Firestore arrays (same logic as savesService)
  const _toArr = (v) => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        return keys.sort((a, b) => +a - +b).map(k => v[k]);
      }
    }
    return v;
  };

  const arrayFields = [
    'leagueTable', 'fixtures', 'results', 'messages', 'transferOffers',
    'playerMarket', 'freeAgents', 'seasonObjectives', 'jobOffers',
    'blockedPlayers', 'activeLoans', 'loanHistory', 'incomingLoanOffers',
    'convocados', 'preseasonMatches'
  ];
  for (const key of arrayFields) {
    if (key in data) data[key] = _toArr(data[key]) || [];
  }
  if (data.team?.players) {
    data.team = { ...data.team, players: _toArr(data.team.players) || [] };
  }

  return data;
}

/**
 * Check if the user has an active (non-finished) contrarreloj run
 */
export async function hasActiveContrarreloj(userId) {
  const save = await getContrarrelojSave(userId);
  if (!save) return { hasActive: false, summary: null };

  const finished = save.contrarrelojData?.finished || false;
  if (finished) {
    // Clean up finished saves automatically
    await deleteContrarrelojSave(userId);
    return { hasActive: false, summary: null };
  }

  return {
    hasActive: true,
    summary: {
      teamName: save.team?.name || 'Equipo desconocido',
      teamId: save.teamId,
      leagueId: save.leagueId || save.playerLeagueId,
      season: save.contrarrelojData?.seasonsPlayed || 1,
      week: save.currentWeek || 1,
      money: save.money || 0,
      trophies: save.contrarrelojData?.trophies?.length || 0
    }
  };
}

/**
 * Save contrarreloj game state (auto-save)
 */
export async function saveContrarreloj(userId, gameState) {
  const saveId = getSaveId(userId);
  const saveData = {
    ...gameState,
    userId,
    lastSaved: serverTimestamp(),
    _type: 'contrarreloj'
  };

  // Remove non-serializable / transient fields
  delete saveData.loaded;

  await setDoc(doc(db, COLLECTION, saveId), saveData);
}

/**
 * Delete the contrarreloj save (on finish or new game)
 */
export async function deleteContrarrelojSave(userId) {
  await deleteDoc(doc(db, COLLECTION, getSaveId(userId)));
}
