/**
 * Scraper de Transfermarkt para PC Fútbol Web
 * Extrae equipos y plantillas de cualquier temporada
 * 
 * Uso:
 *   node scrape-transfermarkt.mjs                    # Todas las ligas, temporada actual
 *   node scrape-transfermarkt.mjs --season 2010     # Todas las ligas, temporada 2010-11
 *   node scrape-transfermarkt.mjs laliga            # Solo LaLiga, temporada actual
 *   node scrape-transfermarkt.mjs laliga --season 2015  # Solo LaLiga 2015-16
 */

import fs from 'fs';
import path from 'path';

// Temporada actual (año de inicio)
const CURRENT_SEASON = 2025;

const LEAGUES = {
  // España
  laliga: { url: 'https://www.transfermarkt.es/laliga/startseite/wettbewerb/ES1', id: 'ES1', country: 'ES' },
  laliga2: { url: 'https://www.transfermarkt.es/segunda-division/startseite/wettbewerb/ES2', id: 'ES2', country: 'ES' },
  primeraRfefG1: { url: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1', id: 'E3G1', country: 'ES' },
  primeraRfefG2: { url: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2', id: 'E3G2', country: 'ES' },
  // Europa Top 5
  premier: { url: 'https://www.transfermarkt.es/premier-league/startseite/wettbewerb/GB1', id: 'GB1', country: 'GB' },
  bundesliga: { url: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/L1', id: 'L1', country: 'DE' },
  seriea: { url: 'https://www.transfermarkt.es/serie-a/startseite/wettbewerb/IT1', id: 'IT1', country: 'IT' },
  ligue1: { url: 'https://www.transfermarkt.es/ligue-1/startseite/wettbewerb/FR1', id: 'FR1', country: 'FR' }
};

// Ligas históricas de España (antes de Primera RFEF, era Segunda B)
const HISTORICAL_LEAGUES = {
  // Segunda División B existió hasta 2020-21, luego se creó Primera RFEF
  segundaBG1: { url: 'https://www.transfermarkt.es/segunda-division-b-grupo-i-20-21-/startseite/wettbewerb/ES3A', id: 'ES3A', country: 'ES', maxSeason: 2020 },
  segundaBG2: { url: 'https://www.transfermarkt.es/segunda-division-b-grupo-ii-20-21-/startseite/wettbewerb/ES3B', id: 'ES3B', country: 'ES', maxSeason: 2020 },
  segundaBG3: { url: 'https://www.transfermarkt.es/segunda-division-b-grupo-iii-20-21-/startseite/wettbewerb/ES3C', id: 'ES3C', country: 'ES', maxSeason: 2020 },
  segundaBG4: { url: 'https://www.transfermarkt.es/segunda-division-b-grupo-iv-20-21-/startseite/wettbewerb/ES3D', id: 'ES3D', country: 'ES', maxSeason: 2020 },
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

async function fetchPage(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extraer equipos de la página de liga
function parseLeagueTeams(html, leagueId, season) {
  const teams = [];
  
  // Buscar filas de equipos en la tabla
  const teamRows = html.match(/<tr[^>]*class="[^"]*odd[^"]*"[^>]*>[\s\S]*?<\/tr>|<tr[^>]*class="[^"]*even[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of teamRows) {
    // Extraer nombre y URL del equipo
    const nameMatch = row.match(/href="\/([^\/]+)\/startseite\/verein\/(\d+)[^"]*"[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;
    
    const [, slug, teamId, name] = nameMatch;
    
    // Extraer valor de mercado
    const valueMatch = row.match(/(\d+(?:,\d+)?)\s*(mil mill\.|mill\.)\s*€/i);
    let marketValue = 0;
    if (valueMatch) {
      const num = parseFloat(valueMatch[1].replace(',', '.'));
      marketValue = valueMatch[2].includes('mil') ? num * 1000000000 : num * 1000000;
    }
    
    // URL de plantilla con temporada
    const squadUrl = `https://www.transfermarkt.es/${slug}/kader/verein/${teamId}/saison_id/${season}`;
    
    teams.push({
      id: `tm-${teamId}`,
      name: name.trim(),
      slug,
      transfermarktId: teamId,
      squadUrl,
      marketValue,
      league: leagueId,
      season: `${season}-${(season + 1).toString().slice(-2)}`
    });
  }
  
  return teams;
}

// Extraer plantilla de un equipo
function parseSquad(html, teamInfo) {
  const players = [];
  
  // Buscar filas de jugadores
  const playerRows = html.match(/<tr[^>]*class="[^"]*odd[^"]*"[^>]*>[\s\S]*?<\/tr>|<tr[^>]*class="[^"]*even[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of playerRows) {
    // Nombre del jugador
    const nameMatch = row.match(/class="hauptlink"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;
    
    // Posición
    const posMatch = row.match(/<td[^>]*>([^<]*(?:Portero|Defensa|Centrocampista|Mediocentro|Extremo|Delantero|Lateral|Interior|Mediapunta|Pivote)[^<]*)<\/td>/i);
    
    // Edad
    const ageMatch = row.match(/<td[^>]*class="[^"]*zentriert[^"]*"[^>]*>(\d{1,2})<\/td>/i);
    
    // Valor de mercado del jugador
    const valueMatch = row.match(/(\d+(?:,\d+)?)\s*(mill\.|miles)\s*€/i);
    let marketValue = 0;
    if (valueMatch) {
      const num = parseFloat(valueMatch[1].replace(',', '.'));
      marketValue = valueMatch[2].includes('mill') ? num * 1000000 : num * 1000;
    }
    
    // Nacionalidad
    const nationMatch = row.match(/title="([^"]+)"[^>]*class="[^"]*flaggenrahmen[^"]*"/i);
    
    const name = nameMatch[1].trim();
    const position = posMatch ? mapPosition(posMatch[1].trim()) : 'CM';
    const age = ageMatch ? parseInt(ageMatch[1]) : 25;
    
    players.push({
      name,
      position,
      age,
      nationality: nationMatch ? nationMatch[1] : 'Desconocido',
      marketValue,
      overall: estimateOverall(marketValue, age, position)
    });
  }
  
  return players;
}

function mapPosition(posEs) {
  const pos = posEs.toLowerCase();
  if (pos.includes('portero')) return 'GK';
  if (pos.includes('central') || pos.includes('defensa')) return 'CB';
  if (pos.includes('lateral')) return pos.includes('izquierdo') ? 'LB' : 'RB';
  if (pos.includes('mediocentro') || pos.includes('pivote')) return 'CDM';
  if (pos.includes('interior') || pos.includes('centrocampista')) return 'CM';
  if (pos.includes('mediapunta')) return 'CAM';
  if (pos.includes('extremo')) return pos.includes('izquierdo') ? 'LW' : 'RW';
  if (pos.includes('delantero')) return 'ST';
  return 'CM';
}

function estimateOverall(marketValue, age, position) {
  // Estimar overall basado en valor de mercado
  if (marketValue >= 100000000) return Math.min(94, 88 + Math.floor(marketValue / 50000000));
  if (marketValue >= 50000000) return 82 + Math.floor((marketValue - 50000000) / 10000000);
  if (marketValue >= 20000000) return 78 + Math.floor((marketValue - 20000000) / 10000000);
  if (marketValue >= 10000000) return 74 + Math.floor((marketValue - 10000000) / 5000000);
  if (marketValue >= 5000000) return 70 + Math.floor((marketValue - 5000000) / 2500000);
  if (marketValue >= 1000000) return 65 + Math.floor((marketValue - 1000000) / 1000000);
  if (marketValue >= 100000) return 60 + Math.floor(marketValue / 250000);
  // Sin valor de mercado - estimar por liga/nivel
  return 58;
}

async function scrapeLeague(leagueKey, season) {
  const league = LEAGUES[leagueKey] || HISTORICAL_LEAGUES[leagueKey];
  if (!league) throw new Error(`Liga desconocida: ${leagueKey}`);
  
  // Verificar si la liga existe para esta temporada
  if (league.maxSeason && season > league.maxSeason) {
    console.log(`   ⚠️ ${leagueKey} no existe en temporada ${season}-${season+1}`);
    return null;
  }
  if (league.minSeason && season < league.minSeason) {
    console.log(`   ⚠️ ${leagueKey} no existe en temporada ${season}-${season+1}`);
    return null;
  }
  
  // URL con temporada
  const leagueUrl = `${league.url}/plus/?saison_id=${season}`;
  console.log(`\n📥 Scrapeando ${leagueKey} (${season}-${(season+1).toString().slice(-2)})...`);
  
  const html = await fetchPage(leagueUrl);
  const teams = parseLeagueTeams(html, leagueKey, season);
  
  if (teams.length === 0) {
    console.log(`   ⚠️ No se encontraron equipos (¿temporada no disponible?)`);
    return null;
  }
  
  console.log(`   Encontrados ${teams.length} equipos`);
  
  // Scrapear plantilla de cada equipo (con delay para no saturar)
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    console.log(`   [${i+1}/${teams.length}] ${team.name}...`);
    
    try {
      await sleep(1500); // Respetar rate limit
      const squadHtml = await fetchPage(team.squadUrl);
      team.players = parseSquad(squadHtml, team);
      team.avgOverall = team.players.length > 0 
        ? Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length)
        : 65;
      console.log(`      ✓ ${team.players.length} jugadores, avg ${team.avgOverall}`);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      team.players = [];
      team.avgOverall = 65;
    }
  }
  
  return teams;
}

function parseArgs(args) {
  const result = { leagues: [], season: CURRENT_SEASON };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--season' && args[i + 1]) {
      result.season = parseInt(args[i + 1]);
      i++;
    } else if (!args[i].startsWith('--')) {
      result.leagues.push(args[i]);
    }
  }
  
  if (result.leagues.length === 0) {
    result.leagues = Object.keys(LEAGUES);
  }
  
  return result;
}

async function main() {
  console.log('🏟️ Transfermarkt Scraper para PC Fútbol Web');
  console.log('==========================================\n');
  
  const { leagues, season } = parseArgs(process.argv.slice(2));
  const seasonStr = `${season}-${(season + 1).toString().slice(-2)}`;
  
  console.log(`📅 Temporada: ${seasonStr}`);
  console.log(`🏆 Ligas: ${leagues.join(', ')}\n`);
  
  // Crear directorio de salida por temporada
  const outputDir = path.join(process.cwd(), 'scraped-data', seasonStr);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const summary = { season: seasonStr, leagues: {}, scrapedAt: new Date().toISOString() };
  
  for (const leagueKey of leagues) {
    try {
      const teams = await scrapeLeague(leagueKey, season);
      
      if (!teams) continue;
      
      // Guardar JSON
      const outFile = path.join(outputDir, `${leagueKey}.json`);
      fs.writeFileSync(outFile, JSON.stringify(teams, null, 2));
      console.log(`\n   💾 Guardado: ${outFile}`);
      
      // Resumen
      const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
      console.log(`   📊 ${teams.length} equipos, ${totalPlayers} jugadores total`);
      
      summary.leagues[leagueKey] = { teams: teams.length, players: totalPlayers };
      
    } catch (err) {
      console.error(`\n❌ Error en ${leagueKey}:`, err.message);
    }
    
    await sleep(3000); // Pausa entre ligas
  }
  
  // Guardar resumen
  const summaryFile = path.join(outputDir, '_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n==========================================');
  console.log(`✅ Scraping ${seasonStr} completado!`);
  console.log(`📁 Datos guardados en: ${outputDir}`);
}

main().catch(console.error);
