// ============================================================
// PC FÚTBOL WEB - ÍNDICE DE DATOS
// ============================================================

import { teams, teamsArray, freeAgents } from './teams.js';
import { segundaTeams, segundaTeamsArray } from './teams-segunda.js';
import { premierTeams, premierTeamsArray } from './teams-premier.js';
import { serieATeams } from './teams-seriea.js';
import { bundesligaTeams } from './teams-bundesliga.js';
import { ligue1Teams } from './teams-ligue1.js';

// Convertir Serie A a formato objeto y array
const serieATeamsObj = serieATeams.reduce((acc, team) => {
  acc[team.id] = team;
  return acc;
}, {});
const serieATeamsArray = serieATeams;

// Convertir Bundesliga a formato objeto y array
const bundesligaTeamsObj = bundesligaTeams.reduce((acc, team) => {
  acc[team.id] = team;
  return acc;
}, {});
const bundesligaTeamsArray = bundesligaTeams;

// Convertir Ligue 1 a formato objeto y array
const ligue1TeamsObj = ligue1Teams.reduce((acc, team) => {
  acc[team.id] = team;
  return acc;
}, {});
const ligue1TeamsArray = ligue1Teams;

// Combinar todas las ligas
export const allTeams = {
  ...teams,
  ...segundaTeams,
  ...premierTeams,
  ...serieATeamsObj,
  ...bundesligaTeamsObj,
  ...ligue1TeamsObj
};

export const allTeamsArray = [
  ...teamsArray,
  ...segundaTeamsArray,
  ...premierTeamsArray,
  ...serieATeamsArray,
  ...bundesligaTeamsArray,
  ...ligue1TeamsArray
];

// Filtros por liga
export const getTeamsByLeague = (league) => {
  if (league === 'laliga' || league === 'primera') {
    return teamsArray;
  }
  if (league === 'segunda') {
    return segundaTeamsArray;
  }
  if (league === 'premier' || league === 'premierleague') {
    return premierTeamsArray;
  }
  if (league === 'seriea' || league === 'italia') {
    return serieATeamsArray;
  }
  if (league === 'bundesliga' || league === 'alemania') {
    return bundesligaTeamsArray;
  }
  if (league === 'ligue1' || league === 'francia') {
    return ligue1TeamsArray;
  }
  return allTeamsArray;
};

// Estadísticas
export const stats = {
  totalTeams: allTeamsArray.length,
  totalPlayers: allTeamsArray.reduce((sum, t) => sum + t.players.length, 0),
  laligaTeams: teamsArray.length,
  segundaTeams: segundaTeamsArray.length,
  premierTeams: premierTeamsArray.length,
  serieATeams: serieATeamsArray.length,
  bundesligaTeams: bundesligaTeamsArray.length,
  ligue1Teams: ligue1TeamsArray.length,
  freeAgents: freeAgents.length
};

// Re-exportar todo
export { teams, teamsArray, freeAgents };
export { segundaTeams, segundaTeamsArray };
export { premierTeams, premierTeamsArray };
export { serieATeams, serieATeamsArray };
export { bundesligaTeams, bundesligaTeamsArray };
export { ligue1Teams, ligue1TeamsArray };
export default allTeams;
