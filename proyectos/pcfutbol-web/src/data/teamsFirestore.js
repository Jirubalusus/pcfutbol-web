// ============================================================
// PC FÚTBOL WEB - TEAMS DATA (Firestore Wrapper)
// Carga datos desde Firestore y los expone en formato compatible
// ============================================================

import teamsService from '../firebase/teamsService';

// Cache de datos cargados
let dataLoaded = false;
let loadPromise = null;

// Arrays mutables - se llenan cuando loadAllData() termina
export let LALIGA_TEAMS = [];
export let SEGUNDA_TEAMS = [];
export let PRIMERA_RFEF_TEAMS = [];
export let SEGUNDA_RFEF_TEAMS = [];
export let PREMIER_LEAGUE_TEAMS = [];
export let LIGUE1_TEAMS = [];
export let BUNDESLIGA_TEAMS = [];
export let SERIE_A_TEAMS = [];

export let PRIMERA_RFEF_GROUPS = {
  grupo1: { name: 'Grupo 1', teams: [] },
  grupo2: { name: 'Grupo 2', teams: [] }
};

export let SEGUNDA_RFEF_GROUPS = {
  grupo1: { name: 'Grupo 1', teams: [] },
  grupo2: { name: 'Grupo 2', teams: [] },
  grupo3: { name: 'Grupo 3', teams: [] },
  grupo4: { name: 'Grupo 4', teams: [] },
  grupo5: { name: 'Grupo 5', teams: [] }
};

// Funciones getter (para código nuevo)
export function getLaLigaTeams() { return LALIGA_TEAMS; }
export function getSegundaTeams() { return SEGUNDA_TEAMS; }
export function getPrimeraRfefTeams() { return PRIMERA_RFEF_TEAMS; }
export function getSegundaRfefTeams() { return SEGUNDA_RFEF_TEAMS; }
export function getPremierTeams() { return PREMIER_LEAGUE_TEAMS; }
export function getSerieATeams() { return SERIE_A_TEAMS; }
export function getBundesligaTeams() { return BUNDESLIGA_TEAMS; }
export function getLigue1Teams() { return LIGUE1_TEAMS; }
export function getPrimeraRfefGroups() { return PRIMERA_RFEF_GROUPS; }
export function getSegundaRfefGroups() { return SEGUNDA_RFEF_GROUPS; }

export const LEAGUES = {
  laliga: { name: 'La Liga EA Sports', country: 'España' },
  segunda: { name: 'La Liga Hypermotion', country: 'España' },
  primeraRFEF: { name: 'Primera Federación', country: 'España' },
  segundaRFEF: { name: 'Segunda Federación', country: 'España' },
  premierLeague: { name: 'Premier League', country: 'Inglaterra' },
  ligue1: { name: 'Ligue 1', country: 'Francia' },
  bundesliga: { name: 'Bundesliga', country: 'Alemania' },
  serieA: { name: 'Serie A', country: 'Italia' }
};

// Función para cargar todos los datos
export async function loadAllData() {
  if (dataLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log('📦 Cargando datos desde Firestore...');
    const start = Date.now();

    try {
      const [laliga, laliga2, primeraRfef, segundaRfef, premier, seriea, bundesliga, ligue1] = 
        await Promise.all([
          teamsService.getTeamsByLeague('laliga'),
          teamsService.getTeamsByLeague('laliga2'),
          teamsService.getTeamsByLeague('primera-rfef'),
          teamsService.getTeamsByLeague('segunda-rfef'),
          teamsService.getTeamsByLeague('premier'),
          teamsService.getTeamsByLeague('seriea'),
          teamsService.getTeamsByLeague('bundesliga'),
          teamsService.getTeamsByLeague('ligue1')
        ]);

      // Actualizar arrays exportados (mutación in-place)
      LALIGA_TEAMS.length = 0;
      LALIGA_TEAMS.push(...laliga);
      
      SEGUNDA_TEAMS.length = 0;
      SEGUNDA_TEAMS.push(...laliga2);
      
      PRIMERA_RFEF_TEAMS.length = 0;
      PRIMERA_RFEF_TEAMS.push(...primeraRfef);
      
      SEGUNDA_RFEF_TEAMS.length = 0;
      SEGUNDA_RFEF_TEAMS.push(...segundaRfef);
      
      PREMIER_LEAGUE_TEAMS.length = 0;
      PREMIER_LEAGUE_TEAMS.push(...premier);
      
      SERIE_A_TEAMS.length = 0;
      SERIE_A_TEAMS.push(...seriea);
      
      BUNDESLIGA_TEAMS.length = 0;
      BUNDESLIGA_TEAMS.push(...bundesliga);
      
      LIGUE1_TEAMS.length = 0;
      LIGUE1_TEAMS.push(...ligue1);

      // Organizar grupos de RFEF
      const primeraG1 = primeraRfef.slice(0, Math.ceil(primeraRfef.length / 2));
      const primeraG2 = primeraRfef.slice(Math.ceil(primeraRfef.length / 2));
      PRIMERA_RFEF_GROUPS.grupo1.teams = primeraG1;
      PRIMERA_RFEF_GROUPS.grupo2.teams = primeraG2;

      const groupSize = Math.ceil(segundaRfef.length / 5);
      SEGUNDA_RFEF_GROUPS.grupo1.teams = segundaRfef.slice(0, groupSize);
      SEGUNDA_RFEF_GROUPS.grupo2.teams = segundaRfef.slice(groupSize, groupSize * 2);
      SEGUNDA_RFEF_GROUPS.grupo3.teams = segundaRfef.slice(groupSize * 2, groupSize * 3);
      SEGUNDA_RFEF_GROUPS.grupo4.teams = segundaRfef.slice(groupSize * 3, groupSize * 4);
      SEGUNDA_RFEF_GROUPS.grupo5.teams = segundaRfef.slice(groupSize * 4);

      dataLoaded = true;
      const totalTeams = laliga.length + laliga2.length + primeraRfef.length + 
        segundaRfef.length + premier.length + seriea.length + bundesliga.length + ligue1.length;
      console.log(`✅ Datos cargados en ${Date.now() - start}ms (${totalTeams} equipos)`);

      return true;
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      return false;
    }
  })();

  return loadPromise;
}

export function isDataLoaded() { return dataLoaded; }

// Free agents (vacío por ahora)
export const freeAgents = [];

export default {
  loadAllData,
  isDataLoaded,
  LALIGA_TEAMS,
  SEGUNDA_TEAMS,
  PRIMERA_RFEF_TEAMS,
  SEGUNDA_RFEF_TEAMS,
  PRIMERA_RFEF_GROUPS,
  SEGUNDA_RFEF_GROUPS,
  PREMIER_LEAGUE_TEAMS,
  SERIE_A_TEAMS,
  BUNDESLIGA_TEAMS,
  LIGUE1_TEAMS,
  LEAGUES,
  freeAgents
};
