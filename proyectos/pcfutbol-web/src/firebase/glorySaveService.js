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

export async function getGlorySave(userId) {
  const docRef = doc(db, COLLECTION, getSaveId(userId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();

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
  const saveData = JSON.parse(JSON.stringify({
    ...gameState,
    userId,
    _type: 'glory'
  }));

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
