// ============================================================
// PC FÚTBOL WEB - DATA LOADER
// Carga datos desde archivos JSON (local o hosting)
// ============================================================

const BASE_URL = import.meta.env.PROD ? '' : '';
const DATA_PATH = `${BASE_URL}/data`;

// Cache para evitar recargas
const cache = new Map();

async function loadJSON(filename) {
  const cacheKey = filename;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`${DATA_PATH}/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error cargando ${filename}:`, error);
    return null;
  }
}

// Loaders específicos por liga
export async function loadLaLiga() {
  return await loadJSON('laliga.json') || [];
}

export async function loadLaLiga2() {
  return await loadJSON('laliga2.json') || [];
}

export async function loadPremier() {
  return await loadJSON('premier.json') || [];
}

export async function loadSerieA() {
  return await loadJSON('seriea.json') || [];
}

export async function loadBundesliga() {
  return await loadJSON('bundesliga.json') || [];
}

export async function loadLigue1() {
  return await loadJSON('ligue1.json') || [];
}

export async function loadFreeAgents() {
  return await loadJSON('free-agents.json') || [];
}

export async function loadPrimeraRFEF() {
  const data = await loadJSON('primera-rfef.json');
  return data?.allTeams || [];
}

export async function loadSegundaRFEF() {
  const data = await loadJSON('segunda-rfef.json');
  return data?.allTeams || [];
}

// South American leagues
export async function loadArgentina() {
  return await loadJSON('argentinaPrimera.json') || [];
}
export async function loadBrasileirao() {
  return await loadJSON('brasileiraoA.json') || [];
}
export async function loadColombia() {
  return await loadJSON('colombiaPrimera.json') || [];
}
export async function loadChile() {
  return await loadJSON('chilePrimera.json') || [];
}
export async function loadUruguay() {
  return await loadJSON('uruguayPrimera.json') || [];
}
export async function loadEcuador() {
  return await loadJSON('ecuadorLigaPro.json') || [];
}
export async function loadParaguay() {
  return await loadJSON('paraguayPrimera.json') || [];
}
export async function loadPeru() {
  return await loadJSON('peruLiga1.json') || [];
}
export async function loadBolivia() {
  return await loadJSON('boliviaPrimera.json') || [];
}
export async function loadVenezuela() {
  return await loadJSON('venezuelaPrimera.json') || [];
}

// Loader de todas las ligas
export async function loadAllTeams() {
  const [laliga, laliga2, premier, seriea, bundesliga, ligue1, primeraRfef, segundaRfef] = await Promise.all([
    loadLaLiga(),
    loadLaLiga2(),
    loadPremier(),
    loadSerieA(),
    loadBundesliga(),
    loadLigue1(),
    loadPrimeraRFEF(),
    loadSegundaRFEF()
  ]);
  
  return {
    laliga,
    laliga2,
    premier,
    seriea,
    bundesliga,
    ligue1,
    primeraRfef,
    segundaRfef,
    all: [...laliga, ...laliga2, ...premier, ...seriea, ...bundesliga, ...ligue1, ...primeraRfef, ...segundaRfef]
  };
}

// Cargar índice con metadata
export async function loadIndex() {
  return await loadJSON('index.json');
}

// Loader por nombre de liga
export async function loadLeague(leagueName) {
  const loaders = {
    'laliga': loadLaLiga,
    'primera': loadLaLiga,
    'laliga2': loadLaLiga2,
    'segunda': loadLaLiga2,
    'premier': loadPremier,
    'premierleague': loadPremier,
    'seriea': loadSerieA,
    'italia': loadSerieA,
    'bundesliga': loadBundesliga,
    'alemania': loadBundesliga,
    'ligue1': loadLigue1,
    'francia': loadLigue1,
    'primera-rfef': loadPrimeraRFEF,
    'primerafederacion': loadPrimeraRFEF,
    'segunda-rfef': loadSegundaRFEF,
    'segundafederacion': loadSegundaRFEF,
    // South America
    'argentina': loadArgentina,
    'argentinaprimera': loadArgentina,
    'brasileirao': loadBrasileirao,
    'brasileiraoa': loadBrasileirao,
    'colombia': loadColombia,
    'colombiaprimera': loadColombia,
    'chile': loadChile,
    'chileprimera': loadChile,
    'uruguay': loadUruguay,
    'uruguayprimera': loadUruguay,
    'ecuador': loadEcuador,
    'ecuadorligapro': loadEcuador,
    'paraguay': loadParaguay,
    'paraguayprimera': loadParaguay,
    'peru': loadPeru,
    'peruliga1': loadPeru,
    'bolivia': loadBolivia,
    'boliviaprimera': loadBolivia,
    'venezuela': loadVenezuela,
    'venezuelaprimera': loadVenezuela,
  };
  
  const loader = loaders[leagueName.toLowerCase()];
  if (loader) {
    return await loader();
  }
  
  // Si no encuentra, cargar todos
  const all = await loadAllTeams();
  return all.all;
}

// Precargar datos críticos
export async function preloadData() {
  console.log('📦 Precargando datos...');
  const start = Date.now();
  
  await Promise.all([
    loadLaLiga(),
    loadLaLiga2(),
    loadPrimeraRFEF(),
    loadSegundaRFEF()
  ]);
  
  console.log(`✅ Datos cargados en ${Date.now() - start}ms`);
}

export default {
  loadLaLiga,
  loadLaLiga2,
  loadPremier,
  loadSerieA,
  loadBundesliga,
  loadLigue1,
  loadPrimeraRFEF,
  loadSegundaRFEF,
  loadFreeAgents,
  loadAllTeams,
  loadLeague,
  loadIndex,
  preloadData
};
