/**
 * Scraper masivo de Transfermarkt - Todas las temporadas
 * Guarda datos RAW para post-proceso posterior
 * 
 * Uso:
 *   node scrape-all-seasons.mjs                    # Todas las ligas, 2025→2004
 *   node scrape-all-seasons.mjs --from 2020 --to 2015  # Rango específico
 *   node scrape-all-seasons.mjs laliga             # Solo LaLiga
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SEASON_START = 2025;  // Temporada más reciente (2025-26)
const SEASON_END = 2004;    // Temporada más antigua (2004-05)

const LEAGUES = {
  // España - Prioridad alta
  laliga: { 
    url: 'https://www.transfermarkt.es/laliga/startseite/wettbewerb/ES1', 
    id: 'ES1', 
    country: 'ES',
    tier: 1
  },
  laliga2: { 
    url: 'https://www.transfermarkt.es/segunda-division/startseite/wettbewerb/ES2', 
    id: 'ES2', 
    country: 'ES',
    tier: 2
  },
  // Primera RFEF solo desde 2021
  primeraRfefG1: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1', 
    id: 'E3G1', 
    country: 'ES',
    tier: 3,
    minSeason: 2021
  },
  primeraRfefG2: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2', 
    id: 'E3G2', 
    country: 'ES',
    tier: 3,
    minSeason: 2021
  },
  // Europa Top 5
  premier: { 
    url: 'https://www.transfermarkt.es/premier-league/startseite/wettbewerb/GB1', 
    id: 'GB1', 
    country: 'GB',
    tier: 1
  },
  bundesliga: { 
    url: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/L1', 
    id: 'L1', 
    country: 'DE',
    tier: 1
  },
  seriea: { 
    url: 'https://www.transfermarkt.es/serie-a/startseite/wettbewerb/IT1', 
    id: 'IT1', 
    country: 'IT',
    tier: 1
  },
  ligue1: { 
    url: 'https://www.transfermarkt.es/ligue-1/startseite/wettbewerb/FR1', 
    id: 'FR1', 
    country: 'FR',
    tier: 1
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function mapPosition(posEs) {
  if (!posEs) return 'CM';
  const pos = posEs.toLowerCase();
  if (pos.includes('portero')) return 'GK';
  if (pos.includes('central')) return 'CB';
  if (pos.includes('lateral izq') || pos.includes('defensa izq')) return 'LB';
  if (pos.includes('lateral der') || pos.includes('defensa der')) return 'RB';
  if (pos.includes('lateral')) return 'RB';
  if (pos.includes('defensa')) return 'CB';
  if (pos.includes('pivote') || pos.includes('med. centro def') || pos.includes('mediocentro def')) return 'CDM';
  if (pos.includes('mediocentro') || pos.includes('centrocampista')) return 'CM';
  if (pos.includes('interior')) return 'CM';
  if (pos.includes('mediapunta') || pos.includes('med. ofensivo')) return 'CAM';
  if (pos.includes('extremo izq')) return 'LW';
  if (pos.includes('extremo der')) return 'RW';
  if (pos.includes('extremo')) return 'RW';
  if (pos.includes('delantero centro') || pos.includes('ariete')) return 'ST';
  if (pos.includes('delantero')) return 'ST';
  if (pos.includes('segundo delantero') || pos.includes('media punta')) return 'CF';
  return 'CM';
}

// Extraer estadísticas
async function scrapeTeamStats(page, teamSlug, teamId, season) {
  const statsUrl = `https://www.transfermarkt.es/${teamSlug}/leistungsdaten/verein/${teamId}/plus/1?saison_id=${season}`;
  
  try {
    await page.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1200);
    
    const stats = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.items > tbody > tr');
      const playerStats = {};
      
      rows.forEach(row => {
        try {
          if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
          
          const nameEl = row.querySelector('td.hauptlink');
          if (!nameEl) return;
          let name = nameEl.textContent.trim().split('\n')[0].trim();
          if (name.length > 10) {
            const half = Math.floor(name.length / 2);
            const first = name.substring(0, half);
            const second = name.substring(half);
            if (second.startsWith(first.substring(0, 3))) {
              name = first;
            }
          }
          
          const cells = row.querySelectorAll('td');
          let matches = 0, goals = 0, assists = 0, minutes = 0, yellowCards = 0, redCards = 0;
          
          if (cells[7]) matches = parseInt(cells[7].textContent.trim()) || 0;
          if (cells[9]) {
            const g = cells[9].textContent.trim();
            if (g !== '-') goals = parseInt(g) || 0;
          }
          if (cells[10]) {
            const a = cells[10].textContent.trim();
            if (a !== '-') assists = parseInt(a) || 0;
          }
          if (cells[11]) {
            const y = cells[11].textContent.trim();
            if (y !== '-') yellowCards = parseInt(y) || 0;
          }
          if (cells[12]) {
            const r = cells[12].textContent.trim();
            if (r !== '-') redCards = parseInt(r) || 0;
          }
          
          for (let i = cells.length - 1; i >= 0; i--) {
            const text = cells[i].textContent.trim();
            if (text.includes("'")) {
              minutes = parseInt(text.replace(/[^\d]/g, '')) || 0;
              break;
            }
          }
          
          const nameKey = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          playerStats[nameKey] = { matches, goals, assists, minutes, yellowCards, redCards, originalName: name };
        } catch (e) {}
      });
      
      return playerStats;
    });
    
    return stats;
  } catch (err) {
    return {};
  }
}

// Extraer plantilla
async function scrapeTeamSquad(page, teamUrl, season) {
  const squadUrl = teamUrl.replace('/startseite/', '/kader/') + `/saison_id/${season}`;
  
  await page.goto(squadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);
  
  const players = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.items > tbody > tr');
    const playerList = [];
    const seenNames = new Set();
    
    rows.forEach(row => {
      try {
        if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
        
        const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
        if (!nameEl) return;
        const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
        
        if (seenNames.has(name)) return;
        seenNames.add(name);
        
        // Player ID from URL
        const href = nameEl.getAttribute('href') || '';
        const idMatch = href.match(/\/spieler\/(\d+)/);
        const playerId = idMatch ? idMatch[1] : null;
        
        const dorsalCell = row.querySelector('td.rueckennummer, td[title*="Portero"], td[title*="Defensa"], td[title*="Centrocampista"], td[title*="Delantero"]');
        let position = dorsalCell?.getAttribute('title') || '';
        
        if (!position) {
          const inlineTable = row.querySelector('table.inline-table');
          if (inlineTable) {
            const posRow = inlineTable.querySelector('tr:last-child td');
            position = posRow?.textContent?.trim() || '';
          }
        }
        
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
        
        const flagImg = row.querySelector('img.flaggenrahmen');
        const nationality = flagImg?.getAttribute('title') || 'Desconocido';
        
        const valueEl = row.querySelector('td.rechts.hauptlink a');
        const valueText = valueEl?.textContent?.trim() || '0';
        
        // Dorsal
        const dorsalEl = row.querySelector('td.rueckennummer div.rn_nummer');
        const dorsal = dorsalEl ? parseInt(dorsalEl.textContent.trim()) || null : null;
        
        playerList.push({ name, playerId, position, age, nationality, valueText, dorsal });
      } catch (e) {}
    });
    
    return playerList;
  });
  
  return players.map(p => ({
    name: p.name,
    playerId: p.playerId,
    position: mapPosition(p.position),
    positionRaw: p.position,
    age: p.age,
    nationality: p.nationality,
    marketValue: parseMarketValue(p.valueText),
    dorsal: p.dorsal
  }));
}

async function scrapeLeague(page, leagueKey, season, outputDir) {
  const league = LEAGUES[leagueKey];
  if (!league) return null;
  
  if (league.minSeason && season < league.minSeason) {
    console.log(`   ⏭️ ${leagueKey} no existe en ${season}`);
    return null;
  }
  
  const seasonStr = `${season}-${(season+1).toString().slice(-2)}`;
  const leagueUrl = `${league.url}/plus/?saison_id=${season}`;
  
  console.log(`\n   📥 ${leagueKey} (${seasonStr})...`);
  
  await page.goto(leagueUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500);
  
  // Extraer equipos
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
    console.log(`      ⚠️ Sin equipos`);
    return null;
  }
  
  console.log(`      ${teams.length} equipos`);
  
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    process.stdout.write(`      [${i+1}/${teams.length}] ${team.name.substring(0, 20)}...`);
    
    try {
      team.players = await scrapeTeamSquad(page, team.teamUrl, season);
      const stats = await scrapeTeamStats(page, team.slug, team.transfermarktId, season);
      
      // Merge stats
      team.players = team.players.map(player => {
        const nameKey = player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        let playerStats = stats[nameKey];
        if (!playerStats) {
          const keys = Object.keys(stats);
          for (const key of keys) {
            if (key.includes(nameKey.substring(0, 8)) || nameKey.includes(key.substring(0, 8))) {
              playerStats = stats[key];
              break;
            }
          }
        }
        playerStats = playerStats || {};
        return {
          ...player,
          goals: playerStats.goals || 0,
          assists: playerStats.assists || 0,
          matches: playerStats.matches || 0,
          minutes: playerStats.minutes || 0,
          yellowCards: playerStats.yellowCards || 0,
          redCards: playerStats.redCards || 0
        };
      });
      
      team.marketValue = parseMarketValue(team.marketValueText);
      delete team.marketValueText;
      
      const totalGoals = team.players.reduce((s, p) => s + p.goals, 0);
      console.log(` ✓ ${team.players.length}p, ${totalGoals}g`);
      
      await sleep(800);
    } catch (err) {
      console.log(` ✗`);
      team.players = [];
    }
  }
  
  // Guardar liga
  const outFile = path.join(outputDir, `${leagueKey}.json`);
  fs.writeFileSync(outFile, JSON.stringify(teams, null, 2));
  
  const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
  const totalGoals = teams.reduce((s, t) => t.players.reduce((g, p) => g + p.goals, 0) + s, 0);
  console.log(`      💾 ${totalPlayers} jugadores, ${totalGoals} goles`);
  
  return { teams: teams.length, players: totalPlayers, goals: totalGoals };
}

function parseArgs(args) {
  const result = { 
    leagues: [], 
    fromSeason: SEASON_START, 
    toSeason: SEASON_END 
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      result.fromSeason = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--to' && args[i + 1]) {
      result.toSeason = parseInt(args[i + 1]);
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
  console.log('🏟️ Transfermarkt Scraper - Todas las Temporadas');
  console.log('================================================\n');
  
  const { leagues, fromSeason, toSeason } = parseArgs(process.argv.slice(2));
  
  console.log(`📅 Temporadas: ${fromSeason}-${fromSeason+1} → ${toSeason}-${toSeason+1}`);
  console.log(`🏆 Ligas: ${leagues.join(', ')}`);
  console.log(`📊 Total: ${fromSeason - toSeason + 1} temporadas × ${leagues.length} ligas\n`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'es-ES'
  });
  
  const page = await context.newPage();
  
  const globalSummary = { 
    scrapedAt: new Date().toISOString(),
    seasons: {}
  };
  
  try {
    // Iterar temporadas de más reciente a más antigua
    for (let season = fromSeason; season >= toSeason; season--) {
      const seasonStr = `${season}-${(season + 1).toString().slice(-2)}`;
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🗓️ TEMPORADA ${seasonStr}`);
      console.log(`${'='.repeat(50)}`);
      
      const outputDir = path.join(process.cwd(), 'scraped-data', 'raw', seasonStr);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const seasonSummary = { leagues: {} };
      
      for (const leagueKey of leagues) {
        const result = await scrapeLeague(page, leagueKey, season, outputDir);
        if (result) {
          seasonSummary.leagues[leagueKey] = result;
        }
        await sleep(2000);
      }
      
      // Guardar summary de la temporada
      const summaryFile = path.join(outputDir, '_summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(seasonSummary, null, 2));
      
      globalSummary.seasons[seasonStr] = seasonSummary;
      
      console.log(`\n   ✅ Temporada ${seasonStr} completada`);
    }
  } finally {
    await browser.close();
  }
  
  // Guardar summary global
  const globalSummaryFile = path.join(process.cwd(), 'scraped-data', 'raw', '_global_summary.json');
  fs.writeFileSync(globalSummaryFile, JSON.stringify(globalSummary, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ SCRAPING COMPLETO');
  console.log('='.repeat(50));
  console.log(`📁 Datos en: scraped-data/raw/`);
}

main().catch(console.error);
