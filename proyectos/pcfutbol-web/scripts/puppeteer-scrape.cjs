#!/usr/bin/env node
/**
 * SoFIFA Scraper using Puppeteer - connects to existing Chrome instance
 * Scrapes all leagues and saves to sofifa-data-full.json
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'sofifa-data-full.json');

// All leagues to scrape
const LEAGUES = [
  { id: 31, name: 'Serie A' },
  { id: 19, name: 'Bundesliga' },
  { id: 16, name: 'Ligue 1' },
  { id: 10, name: 'Eredivisie' },
  { id: 308, name: 'Primeira Liga' },
  { id: 14, name: 'Championship' },
  { id: 4, name: 'Belgian Pro League' },
  { id: 68, name: 'Süper Lig' },
  { id: 50, name: 'Scottish Premiership' },
  { id: 32, name: 'Serie B' },
  { id: 20, name: '2. Bundesliga' },
  { id: 17, name: 'Ligue 2' },
  { id: 189, name: 'Swiss Super League' },
  { id: 80, name: 'Austrian Bundesliga' },
  { id: 63, name: 'Greek Super League' },
  { id: 1, name: 'Danish Superliga' },
  { id: 317, name: 'Croatian HNL' },
  { id: 319, name: 'Czech Liga' },
  { id: 353, name: 'Argentina Primera' },
  { id: 7, name: 'Brasileirão' },
  { id: 336, name: 'MLS' },
  { id: 350, name: 'Saudi Pro League' },
  { id: 341, name: 'Liga MX' },
  { id: 349, name: 'J1 League' },
  // Also re-scrape the 3 already done for completeness with FC 26 data
  { id: 53, name: 'LaLiga' },
  { id: 54, name: 'Segunda División' },
  { id: 13, name: 'Premier League' },
];

const EXTRACT_FUNCTION = `
function() {
  const rows = document.querySelectorAll('table tbody tr');
  return Array.from(rows).map(row => {
    const c = row.querySelectorAll('td');
    if (c.length < 6) return null;
    const nl = c[1] && c[1].querySelector('a[href*="/player/"]');
    const pl = c[1] && c[1].querySelectorAll('a[href*="pn="]');
    const ov = (c[3] && c[3].querySelector('em')) ? c[3].querySelector('em').textContent.trim() : (c[3] ? c[3].textContent.trim() : '');
    const pt = (c[4] && c[4].querySelector('em')) ? c[4].querySelector('em').textContent.trim() : (c[4] ? c[4].textContent.trim() : '');
    const tl = c[5] && c[5].querySelector('a[href*="/team/"]');
    const tidM = tl ? (tl.getAttribute('href') || '').match(/\\/team\\/(\\d+)\\//) : null;
    return {
      name: nl ? nl.textContent.trim() : null,
      position: pl ? Array.from(pl).map(a => a.textContent.trim()).join(',') : '',
      age: parseInt(c[2] ? c[2].textContent.trim() : '0'),
      overall: parseInt(ov),
      potential: parseInt(pt),
      team: tl ? tl.textContent.trim() : null,
      teamId: tidM ? tidM[1] : null
    };
  }).filter(p => p && p.name && !isNaN(p.overall));
}
`;

async function scrapeLeague(page, leagueId, leagueName) {
  console.log(`\nScraping ${leagueName} (lg=${leagueId})...`);
  let allPlayers = [];
  let offset = 0;
  let pageNum = 1;
  
  while (true) {
    const url = `https://sofifa.com/players?lg=${leagueId}&showCol%5B%5D=pi&showCol%5B%5D=ae&showCol%5B%5D=oa&showCol%5B%5D=pt&showCol%5B%5D=tc&offset=${offset}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
      
      const players = await page.evaluate(new Function('return (' + EXTRACT_FUNCTION + ')()'));
      
      if (!players || players.length === 0) {
        console.log(`  Page ${pageNum}: no more players`);
        break;
      }
      
      allPlayers.push(...players);
      console.log(`  Page ${pageNum}: ${players.length} players (total: ${allPlayers.length})`);
      
      offset += 60;
      pageNum++;
      
      if (offset > 2000) {
        console.log(`  Safety limit reached at offset ${offset}`);
        break;
      }
      
      // Small delay to be nice to the server
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.log(`  Error on page ${pageNum}: ${err.message}`);
      break;
    }
  }
  
  console.log(`  Total for ${leagueName}: ${allPlayers.length} players`);
  return allPlayers;
}

async function main() {
  // Load existing data if any (to resume)
  let allData = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      allData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      console.log(`Loaded existing data with ${Object.keys(allData).length} leagues`);
    } catch(e) {
      console.log('Starting fresh');
    }
  }
  
  // Connect to existing Chrome
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:18800',
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Set a reasonable user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
  
  for (const league of LEAGUES) {
    // Skip if already scraped (unless it's one of the re-scrape targets)
    if (allData[league.id] && allData[league.id].length > 0) {
      console.log(`\nSkipping ${league.name} (already have ${allData[league.id].length} players)`);
      continue;
    }
    
    try {
      const players = await scrapeLeague(page, league.id, league.name);
      allData[league.id] = players;
      
      // Save after each league
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
      console.log(`  Saved to ${OUTPUT_FILE}`);
      
      // Delay between leagues
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Error scraping ${league.name}: ${err.message}`);
      allData[league.id] = [];
    }
  }
  
  await page.close();
  
  // Print summary
  console.log('\n=== SCRAPING SUMMARY ===');
  for (const league of LEAGUES) {
    const count = allData[league.id]?.length || 0;
    console.log(`  ${league.name} (${league.id}): ${count} players`);
  }
  
  console.log(`\nTotal leagues: ${Object.keys(allData).length}`);
  console.log(`Total players: ${Object.values(allData).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
