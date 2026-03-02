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
    if (Array.isArray(v)) return v.map(item => {
      if (item && typeof item === 'object' && item._isArray) {
        const len = item._length || Object.keys(item).filter(k => /^\d+$/.test(k)).length;
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(item[i] !== undefined ? item[i] : null);
        return arr;
      }
      return item;
    });
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        return keys.sort((a, b) => +a - +b).map(k => v[k]);
      }
      if (v._isArray) {
        const len = v._length || Object.keys(v).filter(k => /^\d+$/.test(k)).length;
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(v[i] !== undefined ? v[i] : null);
        return arr;
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
 * Recursively strip undefined values from an object (Firebase rejects them)
 */
function stripUndefined(obj, depth = 0) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    // Firestore doesn't support nested arrays — convert inner arrays to objects with numeric keys
    return obj.map((item, i) => {
      if (Array.isArray(item)) {
        const mapped = {};
        item.forEach((el, j) => { mapped[j] = stripUndefined(el, depth + 1); });
        mapped._isArray = true;
        mapped._length = item.length;
        return mapped;
      }
      return stripUndefined(item, depth + 1);
    });
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v, depth + 1);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Save contrarreloj game state (auto-save)
 */
export async function saveContrarreloj(userId, gameState) {
  const saveId = getSaveId(userId);
  const saveData = stripUndefined({
    ...gameState,
    userId,
    lastSaved: serverTimestamp(),
    _type: 'contrarreloj'
  });

  // Remove non-serializable / transient / heavy fields to stay under 1MB
  delete saveData.loaded;
  delete saveData.leagueTeams;
  delete saveData.otherLeagues;
  delete saveData.matchLog;
  delete saveData.cupCompetition;
  delete saveData.europeanCompetition;
  delete saveData.europeanCompetitions;
  delete saveData.saCompetitions;
  delete saveData.playerMarket;
  delete saveData.freeAgents;
  // Keep only unplayed fixtures
  if (Array.isArray(saveData.fixtures)) {
    saveData.fixtures = saveData.fixtures.filter(f => !f.played);
  }
  // Compact results to summary only
  if (Array.isArray(saveData.results) && saveData.results.length > 0) {
    saveData.results = saveData.results.map(r => ({
      week: r.week, homeTeamId: r.homeTeamId, awayTeamId: r.awayTeamId,
      homeGoals: r.homeGoals, awayGoals: r.awayGoals, played: r.played,
    }));
  }
  // Strip heavy per-player fields
  if (saveData.team?.players) {
    saveData.team = { ...saveData.team, players: saveData.team.players.map(p => {
      const { matchHistory, seasonStats, ...rest } = p;
      return rest;
    })};
  }
  // Cap transferHistory and seasonHistory to last 3 seasons
  if (Array.isArray(saveData.transferHistory)) saveData.transferHistory = saveData.transferHistory.slice(-50);
  if (Array.isArray(saveData.seasonHistory)) saveData.seasonHistory = saveData.seasonHistory.slice(-5);

  // Final deep clean: ensure no undefined values survive (Firestore rejects them)
  const deepClean = (o) => {
    if (o === null || o === undefined) return null;
    if (Array.isArray(o)) return o.map(deepClean);
    if (typeof o === 'object' && o.constructor === Object) {
      const c = {};
      for (const [k, v] of Object.entries(o)) {
        if (v !== undefined) c[k] = deepClean(v);
      }
      return c;
    }
    return o;
  };
  await setDoc(doc(db, COLLECTION, saveId), deepClean(saveData));
}

/**
 * Delete the contrarreloj save (on finish or new game)
 */
export async function deleteContrarrelojSave(userId) {
  await deleteDoc(doc(db, COLLECTION, getSaveId(userId)));
}
