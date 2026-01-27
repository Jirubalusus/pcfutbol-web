/**
 * Scraper de Transfermarkt con Playwright
 * Extrae equipos y plantillas de cualquier temporada
 * 
 * Uso:
 *   node scrape-playwright.mjs                      # Todas las ligas, temporada actual
 *   node scrape-playwright.mjs --season 2010        # Todas las ligas, temporada 2010-11
 *   node scrape-playwright.mjs laliga --season 2015 # Solo LaLiga 2015-16
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CURRENT_SEASON = 2025;

// Configuración de ligas con bases de overall
const LEAGUES = {
  // España
  laliga: { 
    url: 'https://www.transfermarkt.es/laliga/startseite/wettbewerb/ES1', 
    id: 'ES1', 
    country: 'ES',
    baseOverall: 75,
    tier: 1
  },
  laliga2: { 
    url: 'https://www.transfermarkt.es/segunda-division/startseite/wettbewerb/ES2', 
    id: 'ES2', 
    country: 'ES',
    baseOverall: 68,
    tier: 2
  },
  primeraRfefG1: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1', 
    id: 'E3G1', 
    country: 'ES',
    baseOverall: 62,
    tier: 3,
    minSeason: 2021
  },
  primeraRfefG2: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2', 
    id: 'E3G2', 
    country: 'ES',
    baseOverall: 62,
    tier: 3,
    minSeason: 2021
  },
  // Europa Top 5
  premier: { 
    url: 'https://www.transfermarkt.es/premier-league/startseite/wettbewerb/GB1', 
    id: 'GB1', 
    country: 'GB',
    baseOverall: 76,
    tier: 1
  },
  bundesliga: { 
    url: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/L1', 
    id: 'L1', 
    country: 'DE',
    baseOverall: 74,
    tier: 1
  },
  seriea: { 
    url: 'https://www.transfermarkt.es/serie-a/startseite/wettbewerb/IT1', 
    id: 'IT1', 
    country: 'IT',
    baseOverall: 74,
    tier: 1
  },
  ligue1: { 
    url: 'https://www.transfermarkt.es/ligue-1/startseite/wettbewerb/FR1', 
    id: 'FR1', 
    country: 'FR',
    baseOverall: 73,
    tier: 1
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calcular overall basado en múltiples factores
function calculateOverall(player, teamRank, totalTeams, leagueConfig) {
  const { baseOverall, tier } = leagueConfig;
  let overall = baseOverall;
  
  // Ajuste por posición en la tabla (del equipo)
  if (teamRank && totalTeams) {
    const position = teamRank / totalTeams;
    if (position <= 0.2) overall += 5;      // Top 20%
    else if (position <= 0.4) overall += 2; // Top 40%
    else if (position >= 0.85) overall -= 3; // Bottom 15%
  }
  
  // Ajuste por valor de mercado del jugador
  const mv = player.marketValue || 0;
  if (mv >= 100000000) overall += 15;
  else if (mv >= 50000000) overall += 12;
  else if (mv >= 30000000) overall += 9;
  else if (mv >= 15000000) overall += 6;
  else if (mv >= 5000000) overall += 3;
  else if (mv >= 1000000) overall += 1;
  
  // Ajuste por edad (pico 26-30)
  const age = player.age || 25;
  if (age >= 26 && age <= 30) overall += 2;
  else if (age < 21) overall -= 2;
  else if (age > 34) overall -= 4;
  else if (age > 32) overall -= 2;
  
  // Limitar rango
  return Math.max(50, Math.min(99, Math.round(overall)));
}

// Parsear valor de mercado en texto a número
function parseMarketValue(text) {
  if (!text) return 0;
  const clean = text.replace(/[^\d,\.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  
  if (text.includes('mil mill') || text.includes('bn')) return num * 1000000000;
  if (text.includes('mill') || text.includes('M')) return num * 1000000;
  if (text.includes('miles') || text.includes('K') || text.includes('k')) return num * 1000;
  return num;
}

// Mapear posición a código estándar
function mapPosition(posEs) {
  if (!posEs) return 'CM';
  const pos = posEs.toLowerCase();
  if (pos.includes('portero')) return 'GK';
  if (pos.includes('central')) return 'CB';
  if (pos.includes('lateral izq')) return 'LB';
  if (pos.includes('lateral der')) return 'RB';
  if (pos.includes('lateral')) return 'RB';
  if (pos.includes('defensa')) return 'CB';
  if (pos.includes('pivote') || pos.includes('med. centro def')) return 'CDM';
  if (pos.includes('mediocentro') || pos.includes('centrocampista')) return 'CM';
  if (pos.includes('interior')) return 'CM';
  if (pos.includes('mediapunta') || pos.includes('med. ofensivo')) return 'CAM';
  if (pos.includes('extremo izq')) return 'LW';
  if (pos.includes('extremo der')) return 'RW';
  if (pos.includes('extremo')) return 'RW';
  if (pos.includes('delantero centro') || pos.includes('ariete')) return 'ST';
  if (pos.includes('delantero')) return 'ST';
  if (pos.includes('segundo delantero')) return 'CF';
  return 'CM';
}

async function scrapeTeamSquad(page, teamUrl, season) {
  const squadUrl = teamUrl.replace('/startseite/', '/kader/') + `/saison_id/${season}`;
  
  await page.goto(squadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);
  
  // Extraer jugadores de la tabla
  const players = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.items > tbody > tr');
    const playerList = [];
    const seenNames = new Set();
    
    rows.forEach(row => {
      try {
        // Solo filas con clase odd/even (filas de jugadores reales)
        if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
        
        // Nombre - buscar en el link principal
        const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
        if (!nameEl) return;
        const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
        
        // Evitar duplicados
        if (seenNames.has(name)) return;
        seenNames.add(name);
        
        // Posición - del atributo title de la celda con número de dorsal
        const dorsalCell = row.querySelector('td.rueckennummer, td[title*="Portero"], td[title*="Defensa"], td[title*="Centrocampista"], td[title*="Delantero"]');
        let position = dorsalCell?.getAttribute('title') || '';
        
        // Si no hay posición en el dorsal, buscar en la tabla interna
        if (!position) {
          const inlineTable = row.querySelector('table.inline-table');
          if (inlineTable) {
            const posRow = inlineTable.querySelector('tr:last-child td');
            position = posRow?.textContent?.trim() || '';
          }
        }
        
        // Edad - buscar celdas centradas con números de 2 dígitos
        let age = 25;
        const cells = row.querySelectorAll('td.zentriert');
        for (const cell of cells) {
          const text = cell.textContent.trim();
          if (/^\d{1,2}$/.test(text)) {
            const num = parseInt(text);
            if (num >= 15 && num <= 45) {
              age = num;
              break;
            }
          }
        }
        
        // Nacionalidad - del título de la imagen de bandera
        const flagImg = row.querySelector('img.flaggenrahmen');
        const nationality = flagImg?.getAttribute('title') || 'Desconocido';
        
        // Valor de mercado - buscar en la última celda con link
        const valueEl = row.querySelector('td.rechts.hauptlink a');
        const valueText = valueEl?.textContent?.trim() || '0';
        
        playerList.push({
          name,
          position,
          age,
          nationality,
          valueText
        });
      } catch (e) {
        // Ignorar errores de filas malformadas
      }
    });
    
    return playerList;
  });
  
  // Procesar valores fuera del browser
  return players.map(p => ({
    name: p.name,
    position: mapPosition(p.position),
    positionRaw: p.position,
    age: p.age,
    nationality: p.nationality,
    marketValue: parseMarketValue(p.valueText),
    marketValueText: p.valueText
  }));
}

async function scrapeLeague(page, leagueKey, season) {
  const league = LEAGUES[leagueKey];
  if (!league) throw new Error(`Liga desconocida: ${leagueKey}`);
  
  // Verificar temporada válida
  if (league.minSeason && season < league.minSeason) {
    console.log(`   ⚠️ ${leagueKey} no existe antes de ${league.minSeason}`);
    return null;
  }
  if (league.maxSeason && season > league.maxSeason) {
    console.log(`   ⚠️ ${leagueKey} no existe después de ${league.maxSeason}`);
    return null;
  }
  
  const leagueUrl = `${league.url}/plus/?saison_id=${season}`;
  console.log(`\n📥 Scrapeando ${leagueKey} (${season}-${(season+1).toString().slice(-2)})...`);
  
  await page.goto(leagueUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  
  // Extraer equipos
  const seasonStr = `${season}-${(season+1).toString().slice(-2)}`;
  const teams = await page.evaluate(({ leagueId, seasonStr }) => {
    const rows = document.querySelectorAll('table.items tbody tr');
    const teamList = [];
    let rank = 0;
    
    rows.forEach(row => {
      rank++;
      const linkEl = row.querySelector('td.hauptlink a[href*="/startseite/verein/"]');
      if (!linkEl) return;
      
      const href = linkEl.getAttribute('href');
      const match = href.match(/\/([^\/]+)\/startseite\/verein\/(\d+)/);
      if (!match) return;
      
      const [, slug, teamId] = match;
      const name = linkEl.textContent.trim();
      
      // Valor de mercado del equipo
      const valueEl = row.querySelector('td.rechts a, td:last-child');
      const valueText = valueEl?.textContent?.trim() || '0';
      
      teamList.push({
        id: `tm-${teamId}`,
        name,
        slug,
        transfermarktId: teamId,
        teamUrl: `https://www.transfermarkt.es${href}`,
        marketValueText: valueText,
        league: leagueId,
        season: seasonStr,
        rank
      });
    });
    
    return teamList;
  }, { leagueId: leagueKey, seasonStr });
  
  if (teams.length === 0) {
    console.log(`   ⚠️ No se encontraron equipos`);
    return null;
  }
  
  console.log(`   Encontrados ${teams.length} equipos`);
  const totalTeams = teams.length;
  
  // Scrapear plantilla de cada equipo
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    console.log(`   [${i+1}/${teams.length}] ${team.name}...`);
    
    try {
      team.players = await scrapeTeamSquad(page, team.teamUrl, season);
      
      // Calcular overalls
      team.players = team.players.map(player => ({
        ...player,
        overall: calculateOverall(player, team.rank, totalTeams, league)
      }));
      
      team.avgOverall = team.players.length > 0
        ? Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length)
        : league.baseOverall;
      
      team.marketValue = parseMarketValue(team.marketValueText);
      
      console.log(`      ✓ ${team.players.length} jugadores, avg ${team.avgOverall}`);
      
      await sleep(1500); // Rate limiting
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      team.players = [];
      team.avgOverall = league.baseOverall;
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
  console.log('🏟️ Transfermarkt Scraper (Playwright)');
  console.log('=====================================\n');
  
  const { leagues, season } = parseArgs(process.argv.slice(2));
  const seasonStr = `${season}-${(season + 1).toString().slice(-2)}`;
  
  console.log(`📅 Temporada: ${seasonStr}`);
  console.log(`🏆 Ligas: ${leagues.join(', ')}\n`);
  
  // Crear directorio de salida
  const outputDir = path.join(process.cwd(), 'scraped-data', seasonStr);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Lanzar browser
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-ES'
  });
  
  const page = await context.newPage();
  
  const summary = { season: seasonStr, leagues: {}, scrapedAt: new Date().toISOString() };
  
  try {
    for (const leagueKey of leagues) {
      if (!LEAGUES[leagueKey]) {
        console.log(`\n❌ Liga desconocida: ${leagueKey}`);
        continue;
      }
      
      try {
        const teams = await scrapeLeague(page, leagueKey, season);
        
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
  } finally {
    await browser.close();
  }
  
  // Guardar resumen
  const summaryFile = path.join(outputDir, '_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n=====================================');
  console.log(`✅ Scraping ${seasonStr} completado!`);
  console.log(`📁 Datos guardados en: ${outputDir}`);
}

main().catch(console.error);
