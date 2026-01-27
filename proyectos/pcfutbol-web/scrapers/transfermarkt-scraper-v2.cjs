/**
 * Transfermarkt Scraper v2 - Parser mejorado
 * Captura 100% de jugadores analizando la estructura HTML real
 */

const fs = require('fs');
const path = require('path');

// Configuración
const BASE_URL = 'https://www.transfermarkt.es';
const OUTPUT_DIR = path.join(__dirname, '..', 'scraped-data', 'transfermarkt');
const PROGRESS_FILE = path.join(OUTPUT_DIR, '_progress.json');
const DELAY_MS = 2500; // 2.5 segundos entre requests

// Headers para simular navegador
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

// Ligas a scrapear
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

// URL mapping
const URL_MAP = {
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

// Fetch con reintentos
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) {
        return await response.text();
      }
      if (response.status === 429) {
        console.log(`  ⏳ Rate limited, esperando 60s...`);
        await sleep(60000);
        continue;
      }
      if (response.status === 403) {
        console.log(`  ⚠️ 403 Forbidden, esperando 30s...`);
        await sleep(30000);
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i < retries - 1) {
        console.log(`  ⚠️ Error: ${err.message}, reintentando (${i + 1}/${retries})...`);
        await sleep(5000 * (i + 1));
      } else {
        throw err;
      }
    }
  }
}

// Decodificar entidades HTML
function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/€/g, '€')
    .trim();
}

// Parsear lista de equipos de una liga
function parseTeamsList(html) {
  const teams = [];
  const seen = new Set();
  
  // Buscar enlaces a plantillas: /equipo/kader/verein/ID/saison_id/2025
  const regex = /href="\/([^"]+)\/kader\/verein\/(\d+)\/saison_id\/2025"/g;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [, slug, id] = match;
    if (!seen.has(id)) {
      seen.add(id);
      
      // Extraer nombre del slug
      const namePart = slug.split('/')[0];
      const name = namePart
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      teams.push({
        id,
        slug: namePart,
        nombre: name,
        url: `${BASE_URL}/${namePart}/kader/verein/${id}/saison_id/2025`
      });
    }
  }
  
  return teams;
}

// Parser mejorado de jugadores - divide por filas y extrae todos los campos
function parsePlayersV2(html) {
  const players = [];
  
  const positionMap = {
    'bg_Torwart': 'Portero',
    'bg_Abwehr': 'Defensa',
    'bg_Mittelfeld': 'Centrocampista',
    'bg_Sturm': 'Delantero'
  };
  
  // Dividir por filas de jugador
  const parts = html.split(/<tr class="(?:odd|even)">/);
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part.includes('rueckennummer')) continue;
    
    // Cortar hasta el final de esta fila
    const endIndex = part.indexOf('</tr>\n<tr');
    const rowHtml = endIndex > 0 ? part.substring(0, endIndex + 5) : part.split('</tbody>')[0];
    
    try {
      const player = {
        id: null,
        nombre: null,
        posicion: null,
        edad: null,
        dorsal: null,
        nacionalidad: null,
        finContrato: null,
        valorMercado: null
      };
      
      // 1. Dorsal
      const dorsalMatch = rowHtml.match(/class=rn_nummer>(\d+)<\/div>/);
      if (dorsalMatch) player.dorsal = parseInt(dorsalMatch[1]);
      
      // 2. Posicion general
      for (const [cssClass, pos] of Object.entries(positionMap)) {
        if (rowHtml.includes(cssClass)) { player.posicion = pos; break; }
      }
      
      // 3. Nombre e ID
      const playerMatch = rowHtml.match(/\/profil\/spieler\/(\d+)"[^>]*>\s*([^<]+)</);
      if (playerMatch) {
        player.id = playerMatch[1];
        player.nombre = decodeHTML(playerMatch[2]);
      }
      
      if (!player.id) continue;
      
      // 4. Edad - buscar después del cierre de inline-table
      const afterTable = rowHtml.split('</table>').pop() || rowHtml;
      const ageMatch = afterTable.match(/<td class="zentriert">(\d{2})<\/td>/);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age >= 15 && age <= 50) player.edad = age;
      }
      
      // 5. Nacionalidad
      const natMatch = rowHtml.match(/title="([^"]+)"[^>]*alt="[^"]*"[^>]*class="flaggenrahmen"/);
      if (natMatch) player.nacionalidad = decodeHTML(natMatch[1]);
      
      // 6. Fin de contrato
      const contractMatch = rowHtml.match(/<td class="zentriert">(\d{2}\/\d{2}\/\d{4})<\/td>/);
      if (contractMatch) player.finContrato = contractMatch[1];
      
      // 7. Valor de mercado (mill antes que mil para match correcto)
      const valueMatch = rowHtml.match(/marktwertverlauf\/spieler\/\d+">([^<]+)</);
      if (valueMatch) {
        const numMatch = valueMatch[1].match(/([\d,\.]+)\s*(mill|mil)/i);
        if (numMatch) {
          let val = parseFloat(numMatch[1].replace(',', '.'));
          if (numMatch[2].toLowerCase().startsWith('mill')) val *= 1000000;
          else val *= 1000;
          player.valorMercado = val;
        }
      }
      
      players.push(player);
    } catch (err) {
      continue;
    }
  }
  
  return players;
}

// Extraer nombre real del equipo
function parseTeamName(html) {
  // Buscar en el título de la página
  const titleMatch = html.match(/<title>([^-<]+)/);
  if (titleMatch) {
    return decodeHTML(titleMatch[1]).replace(' - Plantilla detallada', '').trim();
  }
  
  // Buscar en h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) {
    return decodeHTML(h1Match[1]).trim();
  }
  
  return null;
}

// Scrapear plantilla de un equipo
async function scrapeTeamSquad(team) {
  console.log(`  📋 Scrapeando: ${team.nombre}`);
  
  const html = await fetchWithRetry(team.url);
  
  // Obtener nombre real del equipo
  const realName = parseTeamName(html) || team.nombre;
  
  // Parsear jugadores con el nuevo parser
  const players = parsePlayersV2(html);
  
  return {
    id: team.id,
    nombre: realName,
    slug: team.slug,
    jugadores: players
  };
}

// Scrapear lista de equipos de una liga
async function scrapeLeagueTeams(leagueId) {
  const url = `${BASE_URL}${URL_MAP[leagueId]}`;
  console.log(`📥 Obteniendo lista de equipos: ${url}`);
  
  const html = await fetchWithRetry(url);
  return parseTeamsList(html);
}

// Main
async function main() {
  console.log('🚀 Transfermarkt Scraper v2 - Parser Mejorado\n');
  
  ensureDir(OUTPUT_DIR);
  
  // Resetear progreso para usar el nuevo parser
  let progress = { completedLeagues: [], currentLeague: null, completedTeams: [] };
  saveProgress(progress);
  
  console.log(`📊 Iniciando scraping de ${LEAGUES.length} ligas\n`);
  
  for (const league of LEAGUES) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏆 ${league.name} (${league.id})`);
    console.log(`${'='.repeat(50)}\n`);
    
    let leagueData = { 
      liga: league.name, 
      ligaId: league.id,
      equipos: [] 
    };
    
    progress.currentLeague = league.id;
    progress.completedTeams = [];
    saveProgress(progress);
    
    // Obtener lista de equipos
    const teams = await scrapeLeagueTeams(league.id);
    console.log(`📋 ${teams.length} equipos encontrados\n`);
    
    await sleep(DELAY_MS);
    
    // Scrapear cada equipo
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      try {
        const teamData = await scrapeTeamSquad(team);
        leagueData.equipos.push(teamData);
        
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
  let grandTotal = 0;
  for (const league of LEAGUES) {
    const data = loadLeagueData(league.file);
    if (data.equipos) {
      const players = data.equipos.reduce((sum, e) => sum + e.jugadores.length, 0);
      grandTotal += players;
      console.log(`  ${league.name}: ${data.equipos.length} equipos, ${players} jugadores`);
    }
  }
  console.log(`\n  TOTAL: ${grandTotal} jugadores`);
}

main().catch(console.error);
