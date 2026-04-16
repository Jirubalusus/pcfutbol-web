// ============================================================
// PC FÚTBOL WEB - TEAMS DATA (Firestore Wrapper)
// Carga datos desde Firestore y los expone en formato compatible
// ============================================================

import teamsService from '../firebase/teamsService';
import { enrichSATeams } from './enrichSATeams';
import { preloadEditionTeamAssets } from './editions/editionAssetsService';
import { getActiveEditionId, getEdition } from './editions/editionService';

// Rest of World — now loaded from Firebase (teams_v2)

// ============================================================
// Normalización de posiciones: inglés → español
// ============================================================
const POS_MAP = {
  'GK': 'POR', 'CB': 'DFC', 'LB': 'LB', 'RB': 'RB',
  'LWB': 'LB', 'RWB': 'RB', 'CDM': 'MCD', 'CM': 'MC',
  'CAM': 'MCO', 'LM': 'MI', 'RM': 'MD', 'LW': 'EI',
  'RW': 'ED', 'CF': 'CF', 'ST': 'DC', 'LD': 'RB', 'LI': 'LB'
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

/**
 * Apply the active edition pack to all loaded team arrays
 * Renames team names, stadium names, and player names in-place
 */
async function applyActiveEdition() {
  const editionId = getActiveEditionId();
  if (!editionId) return;

  try {
    const edition = await getEdition(editionId);
    if (!edition?.teams) return;

    // Apply to all team arrays
    const allArrays = [
      LALIGA_TEAMS, SEGUNDA_TEAMS, PRIMERA_RFEF_TEAMS, SEGUNDA_RFEF_TEAMS,
      PREMIER_LEAGUE_TEAMS, SERIE_A_TEAMS, BUNDESLIGA_TEAMS, LIGUE1_TEAMS,
      EREDIVISIE_TEAMS, PRIMEIRA_LIGA_TEAMS, CHAMPIONSHIP_TEAMS, BELGIAN_PRO_TEAMS,
      SUPER_LIG_TEAMS, SCOTTISH_PREM_TEAMS, SERIE_B_TEAMS, BUNDESLIGA2_TEAMS,
      LIGUE2_TEAMS, SWISS_TEAMS, AUSTRIAN_TEAMS, GREEK_TEAMS, DANISH_TEAMS,
      CROATIAN_TEAMS, CZECH_TEAMS,
      ARGENTINA_TEAMS, BRASILEIRAO_TEAMS, COLOMBIA_TEAMS, CHILE_TEAMS,
      URUGUAY_TEAMS, ECUADOR_TEAMS, PARAGUAY_TEAMS, PERU_TEAMS,
      BOLIVIA_TEAMS, VENEZUELA_TEAMS,
      MLS_TEAMS, SAUDI_TEAMS, LIGA_MX_TEAMS, J_LEAGUE_TEAMS
    ];

    let renamedTeams = 0;
    let renamedPlayers = 0;

    for (const teamArray of allArrays) {
      for (const team of teamArray) {
        // Match by team id or by current name
        const editionTeam = edition.teams[team.id] || edition.teams[team.name];
        if (!editionTeam) continue;

        renamedTeams++;
        if (editionTeam.name) team.name = editionTeam.name;
        if (editionTeam.shortName) team.shortName = editionTeam.shortName;
        if (editionTeam.stadium) team.stadium = editionTeam.stadium;

        if (editionTeam.players && team.players) {
          for (const player of team.players) {
            const newName = editionTeam.players[player.name];
            if (newName) {
              player.name = newName;
              renamedPlayers++;
            }
          }
        }
      }
    }

    console.log(`📝 Edition "${edition.name}" applied: ${renamedTeams} teams, ${renamedPlayers} players renamed`);
  } catch (err) {
    console.error('Error applying edition:', err);
  }
}

async function preloadActiveEditionAssets() {
  const editionId = getActiveEditionId();
  if (!editionId) return;

  try {
    const startedAt = Date.now();
    await preloadEditionTeamAssets(editionId);
    console.log(`🛡️ Edition assets preloaded in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error('Error preloading edition assets:', error);
  }
}

export const LEAGUES = {
  laliga: { name: 'Liga Ibérica', country: 'España' },
  segunda: { name: 'Segunda Ibérica', country: 'España' },
  primeraRFEF: { name: 'Primera Federación', country: 'España' },
  segundaRFEF: { name: 'Segunda Federación', country: 'España' },
  premierLeague: { name: 'First League', country: 'Inglaterra' },
  ligue1: { name: 'Division Première', country: 'Francia' },
  bundesliga: { name: 'Erste Liga', country: 'Alemania' },
  serieA: { name: 'Calcio League', country: 'Italia' },
  eredivisie: { name: 'Dutch First', country: 'Países Bajos' },
  primeiraLiga: { name: 'Liga Lusitana', country: 'Portugal' },
  championship: { name: 'Second League', country: 'Inglaterra' },
  belgianPro: { name: 'Belgian First', country: 'Bélgica' },
  superLig: { name: 'Anatolian League', country: 'Turquía' },
  scottishPrem: { name: 'Highland League', country: 'Escocia' },
  serieB: { name: 'Calcio B', country: 'Italia' },
  bundesliga2: { name: 'Zweite Liga', country: 'Alemania' },
  ligue2: { name: 'Division Seconde', country: 'Francia' },
  swissSuperLeague: { name: 'Alpine League', country: 'Suiza' },
  austrianBundesliga: { name: 'Erste Liga', country: 'Austria' },
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

// Mapping: Firestore league ID → { array, enrich? }
const LEAGUE_MAP = {
  'laliga':             { arr: () => LALIGA_TEAMS },
  'laliga2':            { arr: () => SEGUNDA_TEAMS },
  'primera-rfef':       { arr: () => PRIMERA_RFEF_TEAMS },
  'segunda-rfef':       { arr: () => SEGUNDA_RFEF_TEAMS },
  'premier':            { arr: () => PREMIER_LEAGUE_TEAMS },
  'seriea':             { arr: () => SERIE_A_TEAMS },
  'bundesliga':         { arr: () => BUNDESLIGA_TEAMS },
  'ligue1':             { arr: () => LIGUE1_TEAMS },
  'eredivisie':         { arr: () => EREDIVISIE_TEAMS },
  'primeiraLiga':       { arr: () => PRIMEIRA_LIGA_TEAMS },
  'championship':       { arr: () => CHAMPIONSHIP_TEAMS },
  'belgianPro':         { arr: () => BELGIAN_PRO_TEAMS },
  'superLig':           { arr: () => SUPER_LIG_TEAMS },
  'scottishPrem':       { arr: () => SCOTTISH_PREM_TEAMS },
  'serieB':             { arr: () => SERIE_B_TEAMS },
  'bundesliga2':        { arr: () => BUNDESLIGA2_TEAMS },
  'ligue2':             { arr: () => LIGUE2_TEAMS },
  'swissSuperLeague':   { arr: () => SWISS_TEAMS },
  'austrianBundesliga': { arr: () => AUSTRIAN_TEAMS },
  'greekSuperLeague':   { arr: () => GREEK_TEAMS },
  'danishSuperliga':    { arr: () => DANISH_TEAMS },
  'croatianLeague':     { arr: () => CROATIAN_TEAMS },
  'czechLeague':        { arr: () => CZECH_TEAMS },
  'argentinaPrimera':   { arr: () => ARGENTINA_TEAMS, sa: 'argentinaPrimera' },
  'brasileiraoA':       { arr: () => BRASILEIRAO_TEAMS, sa: 'brasileiraoA' },
  'colombiaPrimera':    { arr: () => COLOMBIA_TEAMS, sa: 'colombiaPrimera' },
  'chilePrimera':       { arr: () => CHILE_TEAMS, sa: 'chilePrimera' },
  'uruguayPrimera':     { arr: () => URUGUAY_TEAMS, sa: 'uruguayPrimera' },
  'ecuadorLigaPro':     { arr: () => ECUADOR_TEAMS, sa: 'ecuadorLigaPro' },
  'paraguayPrimera':    { arr: () => PARAGUAY_TEAMS, sa: 'paraguayPrimera' },
  'peruLiga1':          { arr: () => PERU_TEAMS, sa: 'peruLiga1' },
  'boliviaPrimera':     { arr: () => BOLIVIA_TEAMS, sa: 'boliviaPrimera' },
  'venezuelaPrimera':   { arr: () => VENEZUELA_TEAMS, sa: 'venezuelaPrimera' },
  'mls':                { arr: () => MLS_TEAMS },
  'saudiProLeague':     { arr: () => SAUDI_TEAMS },
  'ligaMX':             { arr: () => LIGA_MX_TEAMS },
  'ligamx':             { arr: () => LIGA_MX_TEAMS },
  'jLeague':            { arr: () => J_LEAGUE_TEAMS },
  'jleague':            { arr: () => J_LEAGUE_TEAMS },
  'segunda-rfef':       { arr: () => SEGUNDA_RFEF_TEAMS },
};

// Función para cargar todos los datos — single Firestore query
// Parse JSON in a Web Worker to avoid blocking the main thread on mobile
function parseJSONInWorker(text) {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([
        `self.onmessage=function(e){self.postMessage(JSON.parse(e.data))}`
      ], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e) => { resolve(e.data); worker.terminate(); URL.revokeObjectURL(url); };
      worker.onerror = () => { resolve(JSON.parse(text)); worker.terminate(); URL.revokeObjectURL(url); };
      worker.postMessage(text);
    } catch {
      resolve(JSON.parse(text));
    }
  });
}

export async function loadAllData() {
  if (dataLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log('📦 Cargando datos...');
    const start = Date.now();

    try {
      // Fetch bundle (CDN: ~240KB brotli) and parse off main thread
      const resp = await fetch('/data/all-teams.json');
      if (!resp.ok) throw new Error('fetch failed');
      const text = await resp.text();
      console.log(`📥 Downloaded in ${Date.now() - start}ms (${(text.length/1024).toFixed(0)}KB)`);
      
      const parseStart = Date.now();
      const byLeague = await parseJSONInWorker(text);
      console.log(`🔄 Parsed in ${Date.now() - parseStart}ms`);

      let totalTeams = 0;
      const leagueIds = Object.keys(LEAGUE_MAP);

      // Distribute into exported arrays
      for (const leagueId of leagueIds) {
        const teams = byLeague[leagueId] || [];
        // Ensure every team has an id (static JSON doesn't include Firestore doc IDs)
        teams.forEach(t => {
          if (!t.id) t.id = (t.shortName || t.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + leagueId;
        });
        normalizePositions(teams);
        
        const def = LEAGUE_MAP[leagueId];
        const target = def.arr();
        target.length = 0;
        if (def.sa) {
          target.push(...enrichSATeams(teams, def.sa));
        } else {
          target.push(...teams);
        }
        totalTeams += teams.length;
      }

      // Organizar grupos de RFEF
      const primeraRfef = PRIMERA_RFEF_TEAMS;
      const primeraG1 = primeraRfef.slice(0, Math.ceil(primeraRfef.length / 2));
      const primeraG2 = primeraRfef.slice(Math.ceil(primeraRfef.length / 2));
      PRIMERA_RFEF_GROUPS.grupo1.teams = primeraG1;
      PRIMERA_RFEF_GROUPS.grupo2.teams = primeraG2;

      const segundaRfef = SEGUNDA_RFEF_TEAMS;
      const groupSize = Math.ceil(segundaRfef.length / 5);
      SEGUNDA_RFEF_GROUPS.grupo1.teams = segundaRfef.slice(0, groupSize);
      SEGUNDA_RFEF_GROUPS.grupo2.teams = segundaRfef.slice(groupSize, groupSize * 2);
      SEGUNDA_RFEF_GROUPS.grupo3.teams = segundaRfef.slice(groupSize * 2, groupSize * 3);
      SEGUNDA_RFEF_GROUPS.grupo4.teams = segundaRfef.slice(groupSize * 3, groupSize * 4);
      SEGUNDA_RFEF_GROUPS.grupo5.teams = segundaRfef.slice(groupSize * 4);

      // Apply active edition pack (rename teams/players)
      await applyActiveEdition();

      // Preload official assets before the UI renders so pack crests do not flash
      await preloadActiveEditionAssets();

      dataLoaded = true;
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
