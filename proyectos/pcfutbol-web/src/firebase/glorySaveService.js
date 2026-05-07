import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'glory_saves';

function getSaveId(userId) {
  return `${userId}_glory`;
}

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

const _isNumericKeyObject = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every(k => /^\d+$/.test(k));
};

function sanitizeForFirestore(value, insideArray = false) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    const sanitized = value.map(item => sanitizeForFirestore(item, true));
    if (!insideArray) return sanitized;

    // Firestore rejects arrays nested inside arrays. When an array appears as an
    // item of another array, store it as an index-keyed map and restore it on load.
    return sanitized.reduce((acc, item, index) => {
      acc[index] = item;
      return acc;
    }, {});
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item !== undefined) acc[key] = sanitizeForFirestore(item, false);
    return acc;
  }, {});
}

function restoreFromFirestore(value) {
  if (Array.isArray(value)) return value.map(restoreFromFirestore);
  if (!value || typeof value !== 'object') return value;

  if (_isNumericKeyObject(value)) {
    return Object.keys(value)
      .sort((a, b) => +a - +b)
      .map(key => restoreFromFirestore(value[key]));
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    acc[key] = restoreFromFirestore(item);
    return acc;
  }, {});
}

export const sanitizeGlorySaveForFirestore = sanitizeForFirestore;
export const restoreGlorySaveFromFirestore = restoreFromFirestore;

export async function getGlorySave(userId) {
  const docRef = doc(db, COLLECTION, getSaveId(userId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = restoreFromFirestore(snap.data());

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
  if (data.gloryData?.pickedCards) {
    data.gloryData = { ...data.gloryData, pickedCards: _toArr(data.gloryData.pickedCards) || [] };
  }
  if (data.gloryData?.history) {
    data.gloryData = { ...data.gloryData, history: _toArr(data.gloryData.history) || [] };
  }

  return data;
}

export async function hasActiveGlory(userId) {
  const save = await getGlorySave(userId);
  if (!save) return { hasActive: false, summary: null };

  return {
    hasActive: true,
    summary: {
      teamName: save.team?.name || save.gloryData?.teamName || 'FC Gloria',
      season: save.gloryData?.season || 1,
      division: save.gloryData?.division || 'segundaRFEF',
      week: save.currentWeek || 1,
      cards: (save.gloryData?.pickedCards || []).length,
    }
  };
}

export async function saveGlory(userId, gameState) {
  const saveId = getSaveId(userId);
  const saveData = sanitizeForFirestore(JSON.parse(JSON.stringify({
    ...gameState,
    userId,
    _type: 'glory'
  })));

  delete saveData.loaded;
  delete saveData.leagueTeams;
  delete saveData.otherLeagues;
  delete saveData._gloryUserId;

  // Apply serverTimestamp after JSON round-trip (sentinel can't survive stringify)
  saveData.lastSaved = serverTimestamp();

  await setDoc(doc(db, COLLECTION, saveId), saveData);
}

export async function deleteGlorySave(userId) {
  await deleteDoc(doc(db, COLLECTION, getSaveId(userId)));
}
