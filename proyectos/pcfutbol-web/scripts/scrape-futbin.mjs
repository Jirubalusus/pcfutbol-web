/**
 * FUTBIN Scraper - EA FC 26 Player Ratings
 * Scrapes base card ratings for all leagues used in pcfutbol-web
 * 
 * Usage: node scripts/scrape-futbin.mjs
 * Output: scripts/futbin-data.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

// FUTBIN League IDs (EA FC 26)
const LEAGUES = {
  // Tier 1 - Top 5
  laliga: { futbinId: 53, name: 'LaLiga' },
  premierLeague: { futbinId: 13, name: 'Premier League' },
  seriea: { futbinId: 31, name: 'Serie A' },
  bundesliga: { futbinId: 19, name: 'Bundesliga' },
  ligue1: { futbinId: 16, name: 'Ligue 1' },
  // Tier 2 - Second divisions
  segunda: { futbinId: 54, name: 'Segunda División' },
  championship: { futbinId: 14, name: 'Championship' },
  bundesliga2: { futbinId: 20, name: '2. Bundesliga' },
  ligue2: { futbinId: 17, name: 'Ligue 2' },
  serieB: { futbinId: 32, name: 'Serie B' },
  // Tier 3 - Other European
  eredivisie: { futbinId: 10, name: 'Eredivisie' },
  primeiraLiga: { futbinId: 308, name: 'Liga Portugal' },
  scottishPrem: { futbinId: 50, name: 'Scottish Premiership' },
  superLig: { futbinId: 68, name: 'Süper Lig' },
  belgianPro: { futbinId: 4, name: 'Belgian Pro League' },
  austrian: { futbinId: 80, name: 'Austrian Bundesliga' },
  swiss: { futbinId: 189, name: 'Super League (Swiss)' },
  danish: { futbinId: 1, name: 'Danish Superliga' },
  greek: { futbinId: 63, name: 'Super League Greece' },
  czech: { futbinId: 319, name: 'Czech First League' },
  croatian: { futbinId: 317, name: 'Croatian HNL' },
  // Americas & Asia
  ligamx: { futbinId: 341, name: 'Liga MX' },
  mls: { futbinId: 39, name: 'MLS' },
  saudi: { futbinId: 350, name: 'Saudi Pro League' },
  jleague: { futbinId: 349, name: 'J1 League' },
  // Spanish lower
  primeraRFEF: { futbinId: 2076, name: 'Primera Federación' },
  segundaRFEF: { futbinId: null, name: 'Segunda RFEF' }, // Probably not in EA FC
};

const VERSIONS = ['gold_nr', 'silver_nr', 'bronze_nr'];
const BASE_URL = 'https://www.futbin.com/26/players';
const DELAY_MS = 800; // Be polite
const OUTPUT_FILE = 'scripts/futbin-data.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse FUTBIN HTML to extract player data.
 * The markdown from readability is messy, so we parse patterns.
 */
function parsePlayers(text, leagueId) {
  const players = [];
  
  // Pattern: /26/player/{id}/{slug} followed by rating and position
  // Enhanced regex to match the structure
  const playerRegex = /\/26\/player\/(\d+)\/([\w-]+)\s*\n\s*(?:\/players\?club=(\d+)[^\n]*\n\s*(?:\/players\?[^\n]*\n\s*)*)?(?:Normal\s*\n\s*)?(\d{2})\s*\n\s*(\w+(?:\+\+)?)\s*\n\s*([\w\s,+]*?)(?:\n|$)/g;
  
  let match;
  while ((match = playerRegex.exec(text)) !== null) {
    const [_, id, slug, clubId, ovr, position, altPositions] = match;
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    players.push({
      id: parseInt(id),
      slug,
      name,
      clubId: clubId ? parseInt(clubId) : null,
      overall: parseInt(ovr),
      position: position.replace('++', ''),
      altPositions: altPositions ? altPositions.trim().split(', ').filter(Boolean) : []
    });
  }
  
  // Fallback: simpler pattern matching
  if (players.length === 0) {
    // Try line-by-line parsing
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const urlMatch = lines[i].match(/\/26\/player\/(\d+)\/([\w-]+)/);
      if (urlMatch) {
        const [_, id, slug] = urlMatch;
        // Look ahead for OVR (2-digit number on its own line) and position
        let ovr = null, pos = null;
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          if (!ovr && /^\d{2}$/.test(lines[j])) {
            ovr = parseInt(lines[j]);
          } else if (ovr && !pos && /^[A-Z]{2,3}(\+\+)?$/.test(lines[j])) {
            pos = lines[j].replace('++', '');
            break;
          }
        }
        if (ovr && pos) {
          // Check for club ID
          let clubId = null;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const clubMatch = lines[j].match(/club=(\d+)/);
            if (clubMatch) { clubId = parseInt(clubMatch[1]); break; }
          }
          
          const name = slug.replace(/-/g, ' ');
          // Avoid duplicates (same player ID)
          if (!players.find(p => p.id === parseInt(id))) {
            players.push({
              id: parseInt(id),
              slug,
              name,
              clubId,
              overall: ovr,
              position: pos,
            });
          }
        }
      }
    }
  }
  
  return players;
}

async function fetchPage(leagueId, version, page) {
  const url = `${BASE_URL}?page=${page}&league=${leagueId}&version=${version}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    return html;
  } catch (err) {
    console.error(`  Error fetching ${url}: ${err.message}`);
    return null;
  }
}

function parsePlayersFromHTML(html) {
  const players = [];
  
  // Find all player table rows by looking for player URLs
  // Pattern in HTML: data-url="/26/player/ID/slug"
  const rowRegex = /data-url="\/26\/player\/(\d+)\/([\w-]+)"/g;
  let urlMatch;
  const playerUrls = [];
  while ((urlMatch = rowRegex.exec(html)) !== null) {
    playerUrls.push({ id: parseInt(urlMatch[1]), slug: urlMatch[2], index: urlMatch.index });
  }
  
  // For each player URL, extract data from nearby HTML
  for (const { id, slug, index } of playerUrls) {
    // Get surrounding context (2000 chars after the URL)
    const context = html.substring(index, index + 2000);
    
    // Extract club ID
    const clubMatch = context.match(/club=(\d+)/);
    const clubId = clubMatch ? parseInt(clubMatch[1]) : null;
    
    // Extract OVR - look for the rating in the format class
    const ovrMatch = context.match(/class="[^"]*rating[^"]*"[^>]*>(\d{2})</) 
      || context.match(/<span[^>]*>(\d{2})<\/span>/);
    const ovr = ovrMatch ? parseInt(ovrMatch[1]) : null;
    
    // Extract position
    const posMatch = context.match(/class="[^"]*position[^"]*"[^>]*>(\w{2,3})</);
    const pos = posMatch ? posMatch[1] : null;
    
    // Extract player name from the page
    const nameMatch = context.match(/class="[^"]*player_name_players_table[^"]*"[^>]*>([^<]+)</);
    const displayName = nameMatch ? nameMatch[1].trim() : slug.replace(/-/g, ' ');
    
    if (ovr && pos) {
      if (!players.find(p => p.id === id)) {
        players.push({
          id,
          slug,
          name: displayName,
          clubId,
          overall: ovr,
          position: pos.replace('+', ''),
        });
      }
    }
  }
  
  return players;
}

async function scrapeLeague(leagueKey, leagueInfo) {
  if (!leagueInfo.futbinId) {
    console.log(`⏭️  Skipping ${leagueInfo.name} (no FUTBIN ID)`);
    return [];
  }
  
  console.log(`\n🔍 Scraping ${leagueInfo.name} (ID: ${leagueInfo.futbinId})...`);
  let allPlayers = [];
  
  for (const version of VERSIONS) {
    let page = 1;
    let emptyPages = 0;
    
    while (emptyPages < 2) { // Stop after 2 empty pages
      const html = await fetchPage(leagueInfo.futbinId, version, page);
      if (!html) { emptyPages++; page++; continue; }
      
      const players = parsePlayersFromHTML(html);
      
      if (players.length === 0) {
        emptyPages++;
      } else {
        emptyPages = 0;
        // Add only new players (avoid duplicates across versions)
        for (const p of players) {
          if (!allPlayers.find(ap => ap.id === p.id || ap.slug === p.slug)) {
            allPlayers.push(p);
          }
        }
        console.log(`  ${version} p${page}: +${players.length} players (total: ${allPlayers.length})`);
      }
      
      page++;
      await sleep(DELAY_MS);
      
      if (page > 30) break; // Safety limit
    }
  }
  
  console.log(`✅ ${leagueInfo.name}: ${allPlayers.length} players total`);
  return allPlayers;
}

async function main() {
  console.log('🚀 FUTBIN Scraper - EA FC 26 Player Ratings');
  console.log('============================================\n');
  
  // Load existing data if resuming
  let allData = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      allData = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📦 Loaded existing data: ${Object.keys(allData).length} leagues`);
    } catch (e) { /* start fresh */ }
  }
  
  for (const [key, info] of Object.entries(LEAGUES)) {
    if (allData[key] && allData[key].length > 0) {
      console.log(`⏭️  Skipping ${info.name} (already scraped: ${allData[key].length} players)`);
      continue;
    }
    
    const players = await scrapeLeague(key, info);
    if (players.length > 0) {
      allData[key] = players;
      // Save incrementally
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
    }
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  let total = 0;
  for (const [key, players] of Object.entries(allData)) {
    console.log(`  ${LEAGUES[key]?.name || key}: ${players.length} players`);
    total += players.length;
  }
  console.log(`\n  TOTAL: ${total} players`);
  console.log(`\n💾 Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
