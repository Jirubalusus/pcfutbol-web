// ============================================================
// PC FÚTBOL WEB - TEAMS SERVICE (Firestore)
// Consume datos desde Firebase Firestore
// ============================================================

import { db } from './config.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';

// ============================================================
// Collection names — v2 = renamed/fictional data
// Original collections (teams, leagues) preserved for reference
// ============================================================
const TEAMS_COL = 'teams_v2';
const LEAGUES_COL = 'leagues_v2';

// Cache local para reducir lecturas
const cache = {
  teams: new Map(),
  leagues: new Map(),
  timestamp: null,
  TTL: 5 * 60 * 1000 // 5 minutos
};

function isCacheValid() {
  return cache.timestamp && (Date.now() - cache.timestamp < cache.TTL);
}

// ============================================================
// LIGAS
// ============================================================

export async function getLeagues() {
  if (isCacheValid() && cache.leagues.size > 0) {
    return Array.from(cache.leagues.values());
  }
  
  const snapshot = await getDocs(collection(db, LEAGUES_COL));
  const leagues = [];
  
  snapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    cache.leagues.set(doc.id, data);
    leagues.push(data);
  });
  
  cache.timestamp = Date.now();
  return leagues;
}

export async function getLeague(leagueId) {
  if (cache.leagues.has(leagueId)) {
    return cache.leagues.get(leagueId);
  }
  
  const docRef = doc(db, LEAGUES_COL, leagueId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = { id: docSnap.id, ...docSnap.data() };
    cache.leagues.set(leagueId, data);
    return data;
  }
  
  return null;
}

// ============================================================
// EQUIPOS
// ============================================================

export async function getTeamsByLeague(leagueId) {
  const cacheKey = `league_${leagueId}`;
  
  if (isCacheValid() && cache.teams.has(cacheKey)) {
    return cache.teams.get(cacheKey);
  }
  
  // Query simple sin orderBy para evitar necesidad de índices
  const q = query(
    collection(db, TEAMS_COL),
    where('league', '==', leagueId)
  );
  
  const snapshot = await getDocs(q);
  const teams = [];
  
  snapshot.forEach(doc => {
    teams.push({ id: doc.id, ...doc.data() });
  });
  
  // Ordenar localmente por avgOverall
  teams.sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0));
  
  cache.teams.set(cacheKey, teams);
  cache.timestamp = Date.now();
  
  return teams;
}

export async function getTeam(teamId) {
  if (cache.teams.has(teamId)) {
    return cache.teams.get(teamId);
  }
  
  const docRef = doc(db, TEAMS_COL, teamId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = { id: docSnap.id, ...docSnap.data() };
    cache.teams.set(teamId, data);
    return data;
  }
  
  return null;
}

export async function searchTeams(searchTerm, leagueFilter = null) {
  // Firestore no soporta búsqueda de texto completo
  // Cargamos todos los equipos de la liga y filtramos localmente
  let teams;
  
  if (leagueFilter) {
    teams = await getTeamsByLeague(leagueFilter);
  } else {
    // Cargar todas las ligas
    const leagues = await getLeagues();
    const allTeams = await Promise.all(
      leagues.map(l => getTeamsByLeague(l.id))
    );
    teams = allTeams.flat();
  }
  
  const term = searchTerm.toLowerCase();
  return teams.filter(t => 
    t.name.toLowerCase().includes(term) ||
    t.city?.toLowerCase().includes(term) ||
    t.shortName?.toLowerCase().includes(term)
  );
}

// ============================================================
// JUGADORES (dentro de equipos)
// ============================================================

export async function getPlayersByTeam(teamId) {
  const team = await getTeam(teamId);
  return team?.players || [];
}

export async function searchPlayers(searchTerm, filters = {}) {
  const { league, position, minOverall, maxOverall, maxAge } = filters;
  
  let teams;
  if (league) {
    teams = await getTeamsByLeague(league);
  } else {
    const leagues = await getLeagues();
    const allTeams = await Promise.all(
      leagues.map(l => getTeamsByLeague(l.id))
    );
    teams = allTeams.flat();
  }
  
  const term = searchTerm?.toLowerCase() || '';
  const players = [];
  
  for (const team of teams) {
    for (const player of (team.players || [])) {
      // Filtrar por término de búsqueda
      if (term && !player.name.toLowerCase().includes(term)) continue;
      
      // Filtrar por posición
      if (position && player.position !== position) continue;
      
      // Filtrar por overall
      if (minOverall && player.overall < minOverall) continue;
      if (maxOverall && player.overall > maxOverall) continue;
      
      // Filtrar por edad
      if (maxAge && player.age > maxAge) continue;
      
      players.push({
        ...player,
        teamId: team.id,
        teamName: team.name,
        league: team.league
      });
    }
  }
  
  // Ordenar por overall descendente
  return players.sort((a, b) => b.overall - a.overall);
}

// ============================================================
// UTILIDADES
// ============================================================

export function clearCache() {
  cache.teams.clear();
  cache.leagues.clear();
  cache.timestamp = null;
}

export async function getStats() {
  const docRef = doc(db, 'metadata', 'stats_v2');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  getLeagues,
  getLeague,
  getTeamsByLeague,
  getTeam,
  searchTeams,
  getPlayersByTeam,
  searchPlayers,
  clearCache,
  getStats
};
