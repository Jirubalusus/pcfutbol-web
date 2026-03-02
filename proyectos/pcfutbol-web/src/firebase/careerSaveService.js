import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'career_saves';

function getSaveId(userId) {
  return `${userId}_career`;
}

export async function getCareerSave(userId) {
  const docRef = doc(db, COLLECTION, getSaveId(userId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
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
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) return keys.sort((a, b) => +a - +b).map(k => v[k]);
      if (v._isArray) {
        const len = v._length || Object.keys(v).filter(k => /^\d+$/.test(k)).length;
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(v[i] !== undefined ? v[i] : null);
        return arr;
      }
    }
    return v;
  };
  const arrayFields = ['leagueTable','fixtures','results','messages','transferOffers','playerMarket','freeAgents','seasonObjectives','jobOffers','blockedPlayers','activeLoans','loanHistory','incomingLoanOffers','convocados','preseasonMatches'];
  for (const key of arrayFields) { if (key in data) data[key] = _toArr(data[key]) || []; }
  if (data.team?.players) data.team = { ...data.team, players: _toArr(data.team.players) || [] };
  // Defaults for stripped reconstructible fields (BUG-02)
  if (!data.europeanCompetitions) data.europeanCompetitions = null;
  if (!data.saCompetitions) data.saCompetitions = null;
  if (!data.cupCompetition) data.cupCompetition = null;
  if (!data.playerMarket) data.playerMarket = [];
  if (!data.freeAgents) data.freeAgents = [];
  return data;
}

export async function hasActiveCareer(userId) {
  const save = await getCareerSave(userId);
  if (!save) return { hasActive: false, summary: null };
  return { hasActive: true, summary: { teamName: save.team?.name || 'Equipo desconocido', teamId: save.teamId, season: save.currentSeason || 1, week: save.currentWeek || 1, money: save.money || 0 } };
}

function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(item => Array.isArray(item) ? (() => { const m = {}; item.forEach((el, j) => { m[j] = stripUndefined(el); }); m._isArray = true; m._length = item.length; return m; })() : stripUndefined(item));
  if (typeof obj === 'object' && obj.constructor === Object) { const c = {}; for (const [k, v] of Object.entries(obj)) { if (v !== undefined) c[k] = stripUndefined(v); } return c; }
  return obj;
}

// Strip reconstructible fields to reduce save size (BUG-02)
function stripReconstructibleFields(inputData) {
  // Work on a shallow copy to avoid mutating the original
  const data = { ...inputData };
  // Remove fully reconstructible competition structures
  delete data.europeanCompetitions;
  delete data.saCompetitions;
  delete data.cupCompetition;
  // Remove market data (regenerated each week)
  delete data.playerMarket;
  delete data.freeAgents;
  // Keep only unplayed fixtures
  if (Array.isArray(data.fixtures)) {
    data.fixtures = data.fixtures.filter(f => !f.played);
  }
  // Keep only summary stats from results
  if (Array.isArray(data.results) && data.results.length > 0) {
    data.results = data.results.map(r => ({
      week: r.week,
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      played: r.played,
    }));
  }
  return data;
}

export async function saveCareer(userId, gameState) {
  const saveId = getSaveId(userId);
  const saveData = stripUndefined({ ...gameState, userId, lastSaved: serverTimestamp(), _type: 'career' });
  delete saveData.loaded; delete saveData.leagueTeams; delete saveData.otherLeagues;
  const cleanedData = stripReconstructibleFields(saveData);
  await setDoc(doc(db, COLLECTION, saveId), cleanedData);
}

export async function deleteCareerSave(userId) {
  await deleteDoc(doc(db, COLLECTION, getSaveId(userId)));
}
