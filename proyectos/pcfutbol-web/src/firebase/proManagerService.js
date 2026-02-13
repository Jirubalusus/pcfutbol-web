import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'promanager_saves';

function getSaveId(userId) {
  return `${userId}_promanager`;
}

/**
 * Get the active ProManager save for a user (or null)
 */
export async function getProManagerSave(userId) {
  const docRef = doc(db, COLLECTION, getSaveId(userId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();

  // Sanitize Firestore arrays
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
  if (data.proManagerData?.careerHistory) {
    data.proManagerData.careerHistory = _toArr(data.proManagerData.careerHistory) || [];
  }

  return data;
}

/**
 * Check if the user has an active ProManager career
 */
export async function hasActiveProManager(userId) {
  const save = await getProManagerSave(userId);
  if (!save) return { hasActive: false, summary: null };

  const finished = save.proManagerData?.finished || false;
  if (finished) {
    await deleteProManagerSave(userId);
    return { hasActive: false, summary: null };
  }

  return {
    hasActive: true,
    summary: {
      teamName: save.team?.name || 'Unknown',
      teamId: save.teamId,
      leagueId: save.leagueId || save.playerLeagueId,
      season: save.proManagerData?.seasonsManaged || 1,
      week: save.currentWeek || 1,
      prestige: save.proManagerData?.prestige || 10,
      boardConfidence: save.proManagerData?.boardConfidence || 60,
      titles: save.proManagerData?.titles || 0
    }
  };
}

/**
 * Save ProManager game state (auto-save)
 */
function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
}

export async function saveProManager(userId, gameState) {
  const saveId = getSaveId(userId);
  const saveData = stripUndefined({
    ...gameState,
    userId,
    lastSaved: serverTimestamp(),
    _type: 'promanager'
  });

  delete saveData.loaded;
  delete saveData.leagueTeams;
  delete saveData.otherLeagues;

  await setDoc(doc(db, COLLECTION, saveId), saveData);
}

/**
 * Delete the ProManager save
 */
export async function deleteProManagerSave(userId) {
  await deleteDoc(doc(db, COLLECTION, getSaveId(userId)));
}
