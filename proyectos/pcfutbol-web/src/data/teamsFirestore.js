// ============================================================
// PC FÚTBOL WEB - TEAMS DATA (Firestore Wrapper)
// Carga datos desde Firestore y los expone en formato compatible
// ============================================================

import teamsService from '../firebase/teamsService';
import { enrichSATeams } from './enrichSATeams';

// Rest of World — local data (not in Firestore)
import { mlsTeams } from './teams-mls';
import { saudiTeams } from './teams-saudi';
import { ligaMXTeams } from './teams-ligamx';
import { jLeagueTeams } from './teams-jleague';

// ============================================================
// Normalización de posiciones: inglés → español
// ============================================================
const POS_MAP = {
  'GK': 'POR', 'CB': 'DFC', 'LB': 'LTI', 'RB': 'LTD',
  'LWB': 'LTI', 'RWB': 'LTD', 'CDM': 'MCD', 'CM': 'MC',
  'CAM': 'MCO', 'LM': 'MI', 'RM': 'MD', 'LW': 'EI',
  'RW': 'ED', 'CF': 'MP', 'ST': 'DC', 'LD': 'LTD', 'LI': 'LTI'
};

function normalizePositions(teams) {
  if (!teams) return teams;
  for (const team of teams) {
    if (!team.players) continue;
    for (const p of team.players) {
      if (p.position && POS_MAP[p.position]) {
        p.position = POS_MAP[p.position];
      }
    }
  }
  return teams;
}

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
export let EREDIVISIE_TEAMS = [];
export let PRIMEIRA_LIGA_TEAMS = [];
export let CHAMPIONSHIP_TEAMS = [];
export let BELGIAN_PRO_TEAMS = [];
export let SUPER_LIG_TEAMS = [];
export let SCOTTISH_PREM_TEAMS = [];
export let SERIE_B_TEAMS = [];
export let BUNDESLIGA2_TEAMS = [];
export let LIGUE2_TEAMS = [];
export let SWISS_TEAMS = [];
export let AUSTRIAN_TEAMS = [];
export let GREEK_TEAMS = [];
export let DANISH_TEAMS = [];
export let CROATIAN_TEAMS = [];
export let CZECH_TEAMS = [];

// Rest of World leagues
// Rest of World leagues
export let MLS_TEAMS = [];
export let SAUDI_TEAMS = [];
export let LIGA_MX_TEAMS = [];
export let J_LEAGUE_TEAMS = [];

// South American leagues
export let ARGENTINA_TEAMS = [];
export let BRASILEIRAO_TEAMS = [];
export let COLOMBIA_TEAMS = [];
export let CHILE_TEAMS = [];
export let URUGUAY_TEAMS = [];
export let ECUADOR_TEAMS = [];
export let PARAGUAY_TEAMS = [];
export let PERU_TEAMS = [];
export let BOLIVIA_TEAMS = [];
export let VENEZUELA_TEAMS = [];

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
export function getEredivisieTeams() { return EREDIVISIE_TEAMS; }
export function getPrimeiraLigaTeams() { return PRIMEIRA_LIGA_TEAMS; }
export function getChampionshipTeams() { return CHAMPIONSHIP_TEAMS; }
export function getBelgianProTeams() { return BELGIAN_PRO_TEAMS; }
export function getSuperLigTeams() { return SUPER_LIG_TEAMS; }
export function getScottishPremTeams() { return SCOTTISH_PREM_TEAMS; }
export function getSerieBTeams() { return SERIE_B_TEAMS; }
export function getBundesliga2Teams() { return BUNDESLIGA2_TEAMS; }
export function getLigue2Teams() { return LIGUE2_TEAMS; }
export function getSwissTeams() { return SWISS_TEAMS; }
export function getAustrianTeams() { return AUSTRIAN_TEAMS; }
export function getGreekTeams() { return GREEK_TEAMS; }
export function getDanishTeams() { return DANISH_TEAMS; }
export function getCroatianTeams() { return CROATIAN_TEAMS; }
export function getCzechTeams() { return CZECH_TEAMS; }

// Rest of World getters
export function getMLSTeams() { return MLS_TEAMS; }
export function getSaudiTeams() { return SAUDI_TEAMS; }
export function getLigaMXTeams() { return LIGA_MX_TEAMS; }
export function getJLeagueTeams() { return J_LEAGUE_TEAMS; }

// South American getters
export function getArgentinaTeams() { return ARGENTINA_TEAMS; }
export function getBrasileiraoTeams() { return BRASILEIRAO_TEAMS; }
export function getColombiaTeams() { return COLOMBIA_TEAMS; }
export function getChileTeams() { return CHILE_TEAMS; }
export function getUruguayTeams() { return URUGUAY_TEAMS; }
export function getEcuadorTeams() { return ECUADOR_TEAMS; }
export function getParaguayTeams() { return PARAGUAY_TEAMS; }
export function getPeruTeams() { return PERU_TEAMS; }
export function getBoliviaTeams() { return BOLIVIA_TEAMS; }
export function getVenezuelaTeams() { return VENEZUELA_TEAMS; }

export const LEAGUES = {
  laliga: { name: 'La Liga EA Sports', country: 'España' },
  segunda: { name: 'La Liga Hypermotion', country: 'España' },
  primeraRFEF: { name: 'Primera Federación', country: 'España' },
  segundaRFEF: { name: 'Segunda Federación', country: 'España' },
  premierLeague: { name: 'Premier League', country: 'Inglaterra' },
  ligue1: { name: 'Ligue 1', country: 'Francia' },
  bundesliga: { name: 'Bundesliga', country: 'Alemania' },
  serieA: { name: 'Serie A', country: 'Italia' },
  eredivisie: { name: 'Eredivisie', country: 'Países Bajos' },
  primeiraLiga: { name: 'Primeira Liga', country: 'Portugal' },
  championship: { name: 'Championship', country: 'Inglaterra' },
  belgianPro: { name: 'Jupiler Pro League', country: 'Bélgica' },
  superLig: { name: 'Süper Lig', country: 'Turquía' },
  scottishPrem: { name: 'Scottish Premiership', country: 'Escocia' },
  serieB: { name: 'Serie B', country: 'Italia' },
  bundesliga2: { name: '2. Bundesliga', country: 'Alemania' },
  ligue2: { name: 'Ligue 2', country: 'Francia' },
  swissSuperLeague: { name: 'Super League', country: 'Suiza' },
  austrianBundesliga: { name: 'Bundesliga', country: 'Austria' },
  greekSuperLeague: { name: 'Super League', country: 'Grecia' },
  danishSuperliga: { name: 'Superligaen', country: 'Dinamarca' },
  croatianLeague: { name: 'HNL', country: 'Croacia' },
  czechLeague: { name: 'Chance Liga', country: 'Chequia' },
  // South America
  argentinaPrimera: { name: 'Liga Profesional', country: 'Argentina' },
  brasileiraoA: { name: 'Série A', country: 'Brasil' },
  colombiaPrimera: { name: 'Liga BetPlay', country: 'Colombia' },
  chilePrimera: { name: 'Primera División', country: 'Chile' },
  uruguayPrimera: { name: 'Primera División', country: 'Uruguay' },
  ecuadorLigaPro: { name: 'LigaPro', country: 'Ecuador' },
  paraguayPrimera: { name: 'División de Honor', country: 'Paraguay' },
  peruLiga1: { name: 'Liga 1', country: 'Perú' },
  boliviaPrimera: { name: 'División Profesional', country: 'Bolivia' },
  venezuelaPrimera: { name: 'Liga FUTVE', country: 'Venezuela' },
  // Rest of World
  mls: { name: 'Major League Soccer', country: 'USA' },
  saudiPro: { name: 'Saudi Pro League', country: 'Arabia Saudí' },
  ligaMX: { name: 'Liga MX', country: 'México' },
  jLeague: { name: 'J1 League', country: 'Japón' }
};

// Función para cargar todos los datos
export async function loadAllData() {
  if (dataLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log('📦 Cargando datos desde Firestore...');
    const start = Date.now();

    try {
      const [laliga, laliga2, primeraRfef, segundaRfef, premier, seriea, bundesliga, ligue1,
             eredivisie, primeiraLiga, championship, belgianPro, superLig, scottishPrem,
             serieB, bundesliga2, ligue2, swiss, austrian, greek, danish, croatian, czech,
             argentina, brasileirao, colombia, chile, uruguay, ecuador, paraguay, peru, bolivia, venezuela] = 
        await Promise.all([
          teamsService.getTeamsByLeague('laliga'),
          teamsService.getTeamsByLeague('laliga2'),
          teamsService.getTeamsByLeague('primera-rfef'),
          teamsService.getTeamsByLeague('segunda-rfef'),
          teamsService.getTeamsByLeague('premier'),
          teamsService.getTeamsByLeague('seriea'),
          teamsService.getTeamsByLeague('bundesliga'),
          teamsService.getTeamsByLeague('ligue1'),
          teamsService.getTeamsByLeague('eredivisie'),
          teamsService.getTeamsByLeague('primeiraLiga'),
          teamsService.getTeamsByLeague('championship'),
          teamsService.getTeamsByLeague('belgianPro'),
          teamsService.getTeamsByLeague('superLig'),
          teamsService.getTeamsByLeague('scottishPrem'),
          teamsService.getTeamsByLeague('serieB'),
          teamsService.getTeamsByLeague('bundesliga2'),
          teamsService.getTeamsByLeague('ligue2'),
          teamsService.getTeamsByLeague('swissSuperLeague'),
          teamsService.getTeamsByLeague('austrianBundesliga'),
          teamsService.getTeamsByLeague('greekSuperLeague'),
          teamsService.getTeamsByLeague('danishSuperliga'),
          teamsService.getTeamsByLeague('croatianLeague'),
          teamsService.getTeamsByLeague('czechLeague'),
          // South America
          teamsService.getTeamsByLeague('argentinaPrimera'),
          teamsService.getTeamsByLeague('brasileiraoA'),
          teamsService.getTeamsByLeague('colombiaPrimera'),
          teamsService.getTeamsByLeague('chilePrimera'),
          teamsService.getTeamsByLeague('uruguayPrimera'),
          teamsService.getTeamsByLeague('ecuadorLigaPro'),
          teamsService.getTeamsByLeague('paraguayPrimera'),
          teamsService.getTeamsByLeague('peruLiga1'),
          teamsService.getTeamsByLeague('boliviaPrimera'),
          teamsService.getTeamsByLeague('venezuelaPrimera')
        ]);

      // Normalizar posiciones inglés → español en TODOS los datos de Firestore
      [laliga, laliga2, primeraRfef, segundaRfef, premier, seriea, bundesliga, ligue1,
       eredivisie, primeiraLiga, championship, belgianPro, superLig, scottishPrem,
       serieB, bundesliga2, ligue2, swiss, austrian, greek, danish, croatian, czech,
       argentina, brasileirao, colombia, chile, uruguay, ecuador, paraguay, peru, bolivia, venezuela
      ].forEach(normalizePositions);

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

      EREDIVISIE_TEAMS.length = 0;
      EREDIVISIE_TEAMS.push(...eredivisie);

      PRIMEIRA_LIGA_TEAMS.length = 0;
      PRIMEIRA_LIGA_TEAMS.push(...primeiraLiga);

      CHAMPIONSHIP_TEAMS.length = 0;
      CHAMPIONSHIP_TEAMS.push(...championship);

      BELGIAN_PRO_TEAMS.length = 0;
      BELGIAN_PRO_TEAMS.push(...belgianPro);

      SUPER_LIG_TEAMS.length = 0;
      SUPER_LIG_TEAMS.push(...superLig);

      SCOTTISH_PREM_TEAMS.length = 0;
      SCOTTISH_PREM_TEAMS.push(...scottishPrem);

      SERIE_B_TEAMS.length = 0;
      SERIE_B_TEAMS.push(...serieB);

      BUNDESLIGA2_TEAMS.length = 0;
      BUNDESLIGA2_TEAMS.push(...bundesliga2);

      LIGUE2_TEAMS.length = 0;
      LIGUE2_TEAMS.push(...ligue2);

      SWISS_TEAMS.length = 0;
      SWISS_TEAMS.push(...swiss);

      AUSTRIAN_TEAMS.length = 0;
      AUSTRIAN_TEAMS.push(...austrian);

      GREEK_TEAMS.length = 0;
      GREEK_TEAMS.push(...greek);

      DANISH_TEAMS.length = 0;
      DANISH_TEAMS.push(...danish);

      CROATIAN_TEAMS.length = 0;
      CROATIAN_TEAMS.push(...croatian);

      CZECH_TEAMS.length = 0;
      CZECH_TEAMS.push(...czech);

      // South American leagues — enrich with metadata (stadium, budget, etc.)
      ARGENTINA_TEAMS.length = 0;
      ARGENTINA_TEAMS.push(...enrichSATeams(argentina, 'argentinaPrimera'));

      BRASILEIRAO_TEAMS.length = 0;
      BRASILEIRAO_TEAMS.push(...enrichSATeams(brasileirao, 'brasileiraoA'));

      COLOMBIA_TEAMS.length = 0;
      COLOMBIA_TEAMS.push(...enrichSATeams(colombia, 'colombiaPrimera'));

      CHILE_TEAMS.length = 0;
      CHILE_TEAMS.push(...enrichSATeams(chile, 'chilePrimera'));

      URUGUAY_TEAMS.length = 0;
      URUGUAY_TEAMS.push(...enrichSATeams(uruguay, 'uruguayPrimera'));

      ECUADOR_TEAMS.length = 0;
      ECUADOR_TEAMS.push(...enrichSATeams(ecuador, 'ecuadorLigaPro'));

      PARAGUAY_TEAMS.length = 0;
      PARAGUAY_TEAMS.push(...enrichSATeams(paraguay, 'paraguayPrimera'));

      PERU_TEAMS.length = 0;
      PERU_TEAMS.push(...enrichSATeams(peru, 'peruLiga1'));

      BOLIVIA_TEAMS.length = 0;
      BOLIVIA_TEAMS.push(...enrichSATeams(bolivia, 'boliviaPrimera'));

      VENEZUELA_TEAMS.length = 0;
      VENEZUELA_TEAMS.push(...enrichSATeams(venezuela, 'venezuelaPrimera'));

      // Rest of World — loaded from local static data (not in Firestore)
      MLS_TEAMS.length = 0;
      MLS_TEAMS.push(...mlsTeams);
      SAUDI_TEAMS.length = 0;
      SAUDI_TEAMS.push(...saudiTeams);
      LIGA_MX_TEAMS.length = 0;
      LIGA_MX_TEAMS.push(...ligaMXTeams);
      J_LEAGUE_TEAMS.length = 0;
      J_LEAGUE_TEAMS.push(...jLeagueTeams);

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
        segundaRfef.length + premier.length + seriea.length + bundesliga.length + ligue1.length +
        eredivisie.length + primeiraLiga.length + championship.length + belgianPro.length +
        superLig.length + scottishPrem.length + serieB.length + bundesliga2.length +
        ligue2.length + swiss.length + austrian.length + greek.length + 
        danish.length + croatian.length + czech.length +
        argentina.length + brasileirao.length + colombia.length + chile.length +
        uruguay.length + ecuador.length + paraguay.length + peru.length +
        bolivia.length + venezuela.length +
        MLS_TEAMS.length + SAUDI_TEAMS.length + LIGA_MX_TEAMS.length + J_LEAGUE_TEAMS.length;
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
  EREDIVISIE_TEAMS,
  PRIMEIRA_LIGA_TEAMS,
  CHAMPIONSHIP_TEAMS,
  BELGIAN_PRO_TEAMS,
  SUPER_LIG_TEAMS,
  SCOTTISH_PREM_TEAMS,
  SERIE_B_TEAMS,
  BUNDESLIGA2_TEAMS,
  LIGUE2_TEAMS,
  SWISS_TEAMS,
  AUSTRIAN_TEAMS,
  GREEK_TEAMS,
  DANISH_TEAMS,
  CROATIAN_TEAMS,
  CZECH_TEAMS,
  // South America
  ARGENTINA_TEAMS,
  BRASILEIRAO_TEAMS,
  COLOMBIA_TEAMS,
  CHILE_TEAMS,
  URUGUAY_TEAMS,
  ECUADOR_TEAMS,
  PARAGUAY_TEAMS,
  PERU_TEAMS,
  BOLIVIA_TEAMS,
  VENEZUELA_TEAMS,
  // Rest of World
  MLS_TEAMS,
  SAUDI_TEAMS,
  LIGA_MX_TEAMS,
  J_LEAGUE_TEAMS,
  LEAGUES,
  freeAgents
};
