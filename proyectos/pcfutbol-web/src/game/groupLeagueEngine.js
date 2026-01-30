// ============================================================
// GROUP LEAGUE ENGINE - Motor para ligas con estructura de grupos
// Soporta Primera RFEF (2 grupos) y Segunda RFEF (5 grupos)
// ============================================================

import { initializeLeague, simulateMatch, updateTable, generateFixtures, getWeekFixtures } from './leagueEngine';

/**
 * Inicializa una liga con estructura de grupos
 * @param {Object} groupsData - { grupo1: [teams], grupo2: [teams], ... }
 * @param {string|null} playerTeamId - ID del equipo del jugador (si está en esta liga)
 * @returns {Object} - { groups: { grupo1: { table, fixtures }, ... }, playerGroup: string|null }
 */
export function initializeGroupLeague(groupsData, playerTeamId = null) {
  const groups = {};
  let playerGroup = null;

  Object.entries(groupsData).forEach(([groupId, teams]) => {
    if (!teams || teams.length === 0) {
      groups[groupId] = { table: [], fixtures: [] };
      return;
    }

    // Check if player's team is in this group
    const isPlayerGroup = playerTeamId && teams.some(t => t.id === playerTeamId);
    if (isPlayerGroup) {
      playerGroup = groupId;
    }

    const { table, fixtures } = initializeLeague(teams, isPlayerGroup ? playerTeamId : null);
    groups[groupId] = { table, fixtures };
  });

  return { groups, playerGroup };
}

/**
 * Simula los partidos de una semana para una liga de grupos (ligas donde NO juega el jugador)
 * @param {Object} groupLeague - Estado de la liga de grupos { groups: {...} }
 * @param {number} week - Semana a simular
 * @param {Object} allGroupTeams - { grupo1: [teams], grupo2: [teams], ... }
 * @returns {Object} - Liga de grupos actualizada
 */
export function simulateGroupLeagueWeek(groupLeague, week, allGroupTeams) {
  const updatedGroups = {};

  Object.entries(groupLeague.groups).forEach(([groupId, groupData]) => {
    if (!groupData.fixtures || groupData.fixtures.length === 0) {
      updatedGroups[groupId] = groupData;
      return;
    }

    const teams = allGroupTeams[groupId];
    if (!teams || teams.length === 0) {
      updatedGroups[groupId] = groupData;
      return;
    }

    let updatedTable = [...groupData.table];
    const updatedFixtures = groupData.fixtures.map(fixture => {
      if (fixture.week !== week || fixture.played) return fixture;

      const homeTeam = teams.find(t => t.id === fixture.homeTeam);
      const awayTeam = teams.find(t => t.id === fixture.awayTeam);

      if (!homeTeam || !awayTeam) return fixture;

      const homeEntry = updatedTable.find(t => t.teamId === fixture.homeTeam);
      const awayEntry = updatedTable.find(t => t.teamId === fixture.awayTeam);

      const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70
      });

      updatedTable = updateTable(updatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);

      return {
        ...fixture,
        played: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.events,
        stats: result.stats
      };
    });

    updatedGroups[groupId] = {
      table: updatedTable,
      fixtures: updatedFixtures
    };
  });

  return {
    ...groupLeague,
    groups: updatedGroups
  };
}

/**
 * Obtiene la clasificación de un grupo específico
 */
export function getGroupTable(groupLeague, groupId) {
  return groupLeague?.groups?.[groupId]?.table || [];
}

/**
 * Obtiene todas las clasificaciones de todos los grupos
 * @returns {Object} - { grupo1: table, grupo2: table, ... }
 */
export function getAllGroupTables(groupLeague) {
  const tables = {};
  if (!groupLeague?.groups) return tables;
  
  Object.entries(groupLeague.groups).forEach(([groupId, groupData]) => {
    tables[groupId] = groupData.table || [];
  });
  return tables;
}

/**
 * Obtiene los fixtures de un grupo específico
 */
export function getGroupFixtures(groupLeague, groupId) {
  return groupLeague?.groups?.[groupId]?.fixtures || [];
}

/**
 * Obtiene todos los fixtures de todos los grupos para una semana
 */
export function getGroupLeagueWeekFixtures(groupLeague, week) {
  const allFixtures = [];
  if (!groupLeague?.groups) return allFixtures;

  Object.entries(groupLeague.groups).forEach(([groupId, groupData]) => {
    const weekFixtures = (groupData.fixtures || [])
      .filter(f => f.week === week)
      .map(f => ({ ...f, groupId }));
    allFixtures.push(...weekFixtures);
  });
  return allFixtures;
}

/**
 * Calcula el número total de jornadas de una liga de grupos
 * (basado en el grupo con más jornadas)
 */
export function getGroupLeagueMaxWeek(groupLeague) {
  let maxWeek = 0;
  if (!groupLeague?.groups) return maxWeek;

  Object.values(groupLeague.groups).forEach(groupData => {
    const fixtures = groupData.fixtures || [];
    const lastWeek = fixtures.reduce((max, f) => Math.max(max, f.week || 0), 0);
    maxWeek = Math.max(maxWeek, lastWeek);
  });
  return maxWeek;
}

/**
 * Verifica si la liga de grupos ha terminado (todos los partidos jugados)
 */
export function isGroupLeagueFinished(groupLeague) {
  if (!groupLeague?.groups) return true;

  return Object.values(groupLeague.groups).every(groupData => {
    const fixtures = groupData.fixtures || [];
    return fixtures.length === 0 || fixtures.every(f => f.played);
  });
}

/**
 * Obtiene los equipos que ascienden de una liga de grupos
 * @param {Object} groupLeague - Estado de la liga de grupos
 * @param {number} spotsPerGroup - Cuántos ascienden por grupo (default: 1)
 * @returns {Array} - Array de { teamId, teamName, groupId, position }
 */
export function getPromotedFromGroups(groupLeague, spotsPerGroup = 1) {
  const promoted = [];
  if (!groupLeague?.groups) return promoted;

  Object.entries(groupLeague.groups).forEach(([groupId, groupData]) => {
    const table = groupData.table || [];
    for (let i = 0; i < spotsPerGroup && i < table.length; i++) {
      promoted.push({
        teamId: table[i].teamId,
        teamName: table[i].teamName,
        groupId,
        position: i + 1
      });
    }
  });
  return promoted;
}

/**
 * Obtiene los equipos que descienden de una liga de grupos
 * @param {Object} groupLeague - Estado de la liga de grupos
 * @param {number} spotsPerGroup - Cuántos descienden por grupo (default: 1)
 * @returns {Array} - Array de { teamId, teamName, groupId, position }
 */
export function getRelegatedFromGroups(groupLeague, spotsPerGroup = 1) {
  const relegated = [];
  if (!groupLeague?.groups) return relegated;

  Object.entries(groupLeague.groups).forEach(([groupId, groupData]) => {
    const table = groupData.table || [];
    const totalTeams = table.length;
    for (let i = 0; i < spotsPerGroup && i < totalTeams; i++) {
      const pos = totalTeams - 1 - i;
      relegated.push({
        teamId: table[pos].teamId,
        teamName: table[pos].teamName,
        groupId,
        position: pos + 1
      });
    }
  });
  return relegated;
}

/**
 * Redistribuye equipos en grupos equilibrados
 * @param {Array} allTeams - Todos los equipos de la liga
 * @param {number} numGroups - Número de grupos
 * @returns {Object} - { grupo1: [teams], grupo2: [teams], ... }
 */
export function distributeTeamsInGroups(allTeams, numGroups) {
  const groups = {};
  const teamsPerGroup = Math.ceil(allTeams.length / numGroups);
  
  // Shuffle teams for random distribution
  const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < numGroups; i++) {
    const groupId = `grupo${i + 1}`;
    const start = i * teamsPerGroup;
    const end = Math.min(start + teamsPerGroup, shuffled.length);
    groups[groupId] = shuffled.slice(start, end);
  }
  
  return groups;
}
