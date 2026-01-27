/**
 * Transfermarkt Scraper - Incremental
 * Guarda progreso después de cada equipo para poder reanudar
 */

const fs = require('fs');
const path = require('path');

// Configuración
const BASE_URL = 'https://www.transfermarkt.es';
const OUTPUT_DIR = path.join(__dirname, '..', 'scraped-data', 'transfermarkt');
const PROGRESS_FILE = path.join(OUTPUT_DIR, '_progress.json');
const DELAY_MS = 2000; // 2 segundos entre requests para no saturar

// Headers para simular navegador
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

// Todas las ligas a scrapear
const LEAGUES = [
  { id: 'ES1', name: 'LaLiga', file: 'laliga.json' },
  { id: 'ES2', name: '2ª División', file: 'segunda.json' },
  { id: 'E3G1', name: 'Primera Federación Gr.1', file: 'primera-fed-g1.json' },
  { id: 'E3G2', name: 'Primera Federación Gr.2', file: 'primera-fed-g2.json' },
  { id: 'E4G1', name: 'Segunda Federación Gr.1', file: 'segunda-fed-g1.json' },
  { id: 'E4G2', name: 'Segunda Federación Gr.2', file: 'segunda-fed-g2.json' },
  { id: 'E4G3', name: 'Segunda Federación Gr.3', file: 'segunda-fed-g3.json' },
  { id: 'E4G4', name: 'Segunda Federación Gr.4', file: 'segunda-fed-g4.json' },
  { id: 'E4G5', name: 'Segunda Federación Gr.5', file: 'segunda-fed-g5.json' },
];

// Utilidades
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { completedLeagues: [], currentLeague: null, completedTeams: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadLeagueData(filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }
  return { liga: null, equipos: [] };
}

function saveLeagueData(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Parsear HTML de lista de equipos
function parseTeamsList(html, leagueId) {
  const teams = [];
  
  // Buscar enlaces a equipos con formato /equipo/kader/verein/ID
  const teamRegex = /\/([^\/]+)\/kader\/verein\/(\d+)\/saison_id\/2025/g;
  const seen = new Set();
  
  let match;
  while ((match = teamRegex.exec(html)) !== null) {
    const [, slug, id] = match;
    const key = id;
    if (!seen.has(key)) {
      seen.add(key);
      teams.push({
        id: id,
        slug: slug,
        url: `${BASE_URL}/${slug}/kader/verein/${id}/saison_id/2025`
      });
    }
  }
  
  return teams;
}

// Parsear nombre del equipo
function parseTeamName(html) {
  // Buscar en el título o en headers
  const titleMatch = html.match(/<title>([^-]+)/);
  if (titleMatch) {
    return titleMatch[1].trim().replace(' - Plantilla detallada', '').trim();
  }
  return 'Desconocido';
}

// Parsear jugadores de una página de plantilla
function parsePlayers(html) {
  const players = [];
  
  // El HTML de Transfermarkt tiene una estructura específica
  // Buscar cada fila de jugador
  
  // Patrón para encontrar jugadores con sus datos
  // Nombre y enlace al perfil
  const playerBlockRegex = /<td class="hauptlink"[^>]*>[\s\S]*?<a[^>]*href="\/([^\/]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  
  let match;
  const playerData = new Map();
  
  while ((match = playerBlockRegex.exec(html)) !== null) {
    const [, slug, id, name] = match;
    if (!playerData.has(id)) {
      playerData.set(id, { 
        id, 
        slug, 
        nombre: name.trim(),
        posicion: null,
        edad: null,
        nacionalidad: null,
        dorsal: null,
        finContrato: null,
        valorMercado: null
      });
    }
  }
  
  // Si no encontramos con el patrón anterior, intentar otro enfoque
  if (playerData.size === 0) {
    // Buscar en formato más simple
    const simpleRegex = /href="\/([^"]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;
    while ((match = simpleRegex.exec(html)) !== null) {
      const [, slug, id, name] = match;
      // Filtrar nombres que parecen ser de jugadores (no URLs ni texto basura)
      if (name.length > 2 && name.length < 50 && !name.includes('/') && !playerData.has(id)) {
        playerData.set(id, { 
          id, 
          slug, 
          nombre: name.trim(),
          posicion: null,
          edad: null,
          nacionalidad: null,
          dorsal: null,
          finContrato: null,
          valorMercado: null
        });
      }
    }
  }
  
  // Extraer posiciones
  const positions = [
    'Portero', 'Defensa central', 'Lateral izquierdo', 'Lateral derecho',
    'Mediocentro defensivo', 'Mediocentro', 'Mediocentro ofensivo',
    'Mediapunta', 'Extremo izquierdo', 'Extremo derecho',
    'Delantero centro', 'Segundo delantero'
  ];
  
  // Buscar posiciones cerca de cada jugador
  for (const [id, player] of playerData) {
    // Buscar posición después del nombre del jugador
    const nameIndex = html.indexOf(`spieler/${id}`);
    if (nameIndex !== -1) {
      const chunk = html.substring(nameIndex, nameIndex + 500);
      
      for (const pos of positions) {
        if (chunk.includes(pos)) {
          player.posicion = pos;
          break;
        }
      }
      
      // Buscar edad (número de 2 dígitos seguido de años o solo)
      const ageMatch = chunk.match(/(\d{2})\s*(?:años|<\/td>)/);
      if (ageMatch) {
        player.edad = parseInt(ageMatch[1]);
      }
      
      // Buscar valor de mercado
      const valueMatch = chunk.match(/(\d+(?:[.,]\d+)?)\s*(mil|mill\.?)\s*€/i);
      if (valueMatch) {
        let value = parseFloat(valueMatch[1].replace(',', '.'));
        if (valueMatch[2].toLowerCase().startsWith('mill')) {
          value *= 1000000;
        } else {
          value *= 1000;
        }
        player.valorMercado = value;
      }
    }
  }
  
  return Array.from(playerData.values());
}

// Fetch con reintentos
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) {
        return await response.text();
      }
      if (response.status === 429) {
        // Rate limited - esperar más
        console.log(`  ⏳ Rate limited, esperando 30s...`);
        await sleep(30000);
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i < retries - 1) {
        console.log(`  ⚠️ Error, reintentando (${i + 1}/${retries})...`);
        await sleep(5000);
      } else {
        throw err;
      }
    }
  }
}

// Scrapear equipos de una liga
async function scrapeLeagueTeams(leagueId) {
  // Mapeo de IDs a URLs
  const urlMap = {
    'ES1': '/laliga/startseite/wettbewerb/ES1',
    'ES2': '/segunda-division/startseite/wettbewerb/ES2',
    'E3G1': '/primera-federacion-grupo-1/startseite/wettbewerb/E3G1',
    'E3G2': '/primera-federacion-grupo-2/startseite/wettbewerb/E3G2',
    'E4G1': '/segunda-federacion-grupo-1/startseite/wettbewerb/E4G1',
    'E4G2': '/segunda-federacion-grupo-2/startseite/wettbewerb/E4G2',
    'E4G3': '/segunda-federacion-grupo-3/startseite/wettbewerb/E4G3',
    'E4G4': '/segunda-federacion-grupo-4/startseite/wettbewerb/E4G4',
    'E4G5': '/segunda-federacion-grupo-5/startseite/wettbewerb/E4G5',
  };
  
  const url = `${BASE_URL}${urlMap[leagueId]}`;
  console.log(`📥 Obteniendo lista de equipos: ${url}`);
  
  const html = await fetchWithRetry(url);
  
  // Parsear equipos
  const teams = [];
  
  // Buscar todos los enlaces a plantillas
  const teamRegex = /href="\/([^"]+)\/kader\/verein\/(\d+)\/saison_id\/2025"/g;
  const seen = new Set();
  
  let match;
  while ((match = teamRegex.exec(html)) !== null) {
    const [, slug, id] = match;
    if (!seen.has(id)) {
      seen.add(id);
      
      // Extraer nombre del equipo del slug
      const name = slug.split('/')[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      teams.push({
        id,
        slug: slug.split('/')[0],
        nombre: name,
        url: `${BASE_URL}/${slug.split('/')[0]}/kader/verein/${id}/saison_id/2025`
      });
    }
  }
  
  return teams;
}

// Scrapear plantilla de un equipo
async function scrapeTeamSquad(team) {
  console.log(`  📋 Scrapeando: ${team.nombre || team.slug}`);
  
  const html = await fetchWithRetry(team.url);
  
  // Obtener nombre real del equipo
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const realName = titleMatch ? titleMatch[1].trim() : team.nombre;
  
  // Parsear jugadores
  const players = [];
  
  // Buscar tabla de jugadores - cada fila tiene los datos
  // Patrón: dorsal, foto, nombre+posición, edad, nacionalidad, contrato, valor
  
  // Encontrar jugadores por sus enlaces de perfil
  const playerRegex = /href="\/([^"\/]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  const playerMap = new Map();
  
  let m;
  while ((m = playerRegex.exec(html)) !== null) {
    const [fullMatch, slug, id, name] = m;
    // Solo nombres razonables (evitar URLs, etc)
    if (name.length >= 3 && name.length <= 40 && !name.includes('/')) {
      const cleanName = name.trim();
      if (!playerMap.has(id) && cleanName !== 'Ver perfil') {
        playerMap.set(id, {
          id,
          nombre: cleanName,
          posicion: null,
          edad: null,
          dorsal: null,
          nacionalidad: null,
          valorMercado: null
        });
      }
    }
  }
  
  // Ahora buscar datos adicionales para cada jugador
  const positions = [
    'Portero', 'Defensa central', 'Lateral izquierdo', 'Lateral derecho',
    'Mediocentro defensivo', 'Mediocentro', 'Mediocentro ofensivo', 'Pivote',
    'Interior derecho', 'Interior izquierdo', 'Mediapunta',
    'Extremo izquierdo', 'Extremo derecho',
    'Delantero centro', 'Segundo delantero', 'Media punta'
  ];
  
  for (const [id, player] of playerMap) {
    const playerIndex = html.indexOf(`spieler/${id}`);
    if (playerIndex !== -1) {
      // Buscar en un rango alrededor del jugador
      const start = Math.max(0, playerIndex - 500);
      const end = Math.min(html.length, playerIndex + 800);
      const chunk = html.substring(start, end);
      
      // Posición
      for (const pos of positions) {
        if (chunk.includes(pos)) {
          player.posicion = pos;
          break;
        }
      }
      
      // Edad - buscar número de 2 dígitos que sea razonable (16-45)
      const ageMatches = chunk.match(/>(\d{2})</g);
      if (ageMatches) {
        for (const am of ageMatches) {
          const age = parseInt(am.replace(/[><]/g, ''));
          if (age >= 16 && age <= 45) {
            player.edad = age;
            break;
          }
        }
      }
      
      // Valor de mercado
      const valueMatch = chunk.match(/(\d+(?:[.,]\d+)?)\s*(mil|mill\.?)\s*€/i);
      if (valueMatch) {
        let value = parseFloat(valueMatch[1].replace(',', '.'));
        if (valueMatch[2].toLowerCase().startsWith('mill')) {
          value *= 1000000;
        } else {
          value *= 1000;
        }
        player.valorMercado = value;
      }
      
      // Dorsal - buscar al principio de la fila
      const dorsalMatch = chunk.match(/<td[^>]*>(\d{1,2})<\/td>/);
      if (dorsalMatch) {
        player.dorsal = parseInt(dorsalMatch[1]);
      }
    }
  }
  
  return {
    id: team.id,
    nombre: realName,
    slug: team.slug,
    jugadores: Array.from(playerMap.values())
  };
}

// Main
async function main() {
  console.log('🚀 Transfermarkt Scraper - Modo Incremental\n');
  
  ensureDir(OUTPUT_DIR);
  
  const progress = loadProgress();
  console.log(`📊 Progreso: ${progress.completedLeagues.length}/${LEAGUES.length} ligas completadas\n`);
  
  for (const league of LEAGUES) {
    // Saltar ligas ya completadas
    if (progress.completedLeagues.includes(league.id)) {
      console.log(`✅ ${league.name} - ya completada, saltando...\n`);
      continue;
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏆 ${league.name} (${league.id})`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Cargar datos existentes de esta liga
    let leagueData = loadLeagueData(league.file);
    
    // Si es una liga nueva o diferente, resetear
    if (progress.currentLeague !== league.id) {
      progress.currentLeague = league.id;
      progress.completedTeams = [];
      leagueData = { 
        liga: league.name, 
        ligaId: league.id,
        equipos: [] 
      };
      saveProgress(progress);
    }
    
    // Obtener lista de equipos
    const teams = await scrapeLeagueTeams(league.id);
    console.log(`📋 ${teams.length} equipos encontrados\n`);
    
    await sleep(DELAY_MS);
    
    // Scrapear cada equipo
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      // Saltar equipos ya scrapeados
      if (progress.completedTeams.includes(team.id)) {
        console.log(`  ✓ ${team.nombre} - ya scrapeado`);
        continue;
      }
      
      try {
        const teamData = await scrapeTeamSquad(team);
        
        // Actualizar o añadir equipo
        const existingIndex = leagueData.equipos.findIndex(e => e.id === team.id);
        if (existingIndex >= 0) {
          leagueData.equipos[existingIndex] = teamData;
        } else {
          leagueData.equipos.push(teamData);
        }
        
        // Guardar progreso
        progress.completedTeams.push(team.id);
        saveLeagueData(league.file, leagueData);
        saveProgress(progress);
        
        console.log(`    ✓ ${teamData.jugadores.length} jugadores`);
        
        // Esperar entre requests
        if (i < teams.length - 1) {
          await sleep(DELAY_MS);
        }
        
      } catch (err) {
        console.log(`    ❌ Error: ${err.message}`);
        // Guardar progreso incluso con error
        saveLeagueData(league.file, leagueData);
        saveProgress(progress);
      }
    }
    
    // Marcar liga como completada
    progress.completedLeagues.push(league.id);
    progress.currentLeague = null;
    progress.completedTeams = [];
    saveProgress(progress);
    
    // Stats de la liga
    const totalPlayers = leagueData.equipos.reduce((sum, e) => sum + e.jugadores.length, 0);
    console.log(`\n✅ ${league.name} completada: ${leagueData.equipos.length} equipos, ${totalPlayers} jugadores`);
    
    await sleep(DELAY_MS);
  }
  
  console.log('\n🎉 ¡Scraping completado!');
  
  // Resumen final
  console.log('\n📊 Resumen:');
  for (const league of LEAGUES) {
    const data = loadLeagueData(league.file);
    if (data.equipos) {
      const players = data.equipos.reduce((sum, e) => sum + e.jugadores.length, 0);
      console.log(`  ${league.name}: ${data.equipos.length} equipos, ${players} jugadores`);
    }
  }
}

main().catch(console.error);
