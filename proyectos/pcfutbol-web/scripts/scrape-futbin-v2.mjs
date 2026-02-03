/**
 * FUTBIN Scraper v2 - EA FC 26 Player Ratings
 * Improved HTML parsing for FUTBIN player data
 * 
 * Usage: node scripts/scrape-futbin-v2.mjs
 * Output: scripts/futbin-data.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

// FUTBIN League IDs (EA FC 26) - Priority order
const LEAGUES = {
  // Tier 1 - Top 5 (Priority)
  laliga: { futbinId: 53, name: 'LaLiga', priority: 1 },
  segunda: { futbinId: 54, name: 'Segunda División', priority: 1 },
  premierLeague: { futbinId: 13, name: 'Premier League', priority: 1 },
  seriea: { futbinId: 31, name: 'Serie A', priority: 1 },
  bundesliga: { futbinId: 19, name: 'Bundesliga', priority: 1 },
  ligue1: { futbinId: 16, name: 'Ligue 1', priority: 1 },
  // Tier 2 - Second divisions
  championship: { futbinId: 14, name: 'Championship', priority: 2 },
  bundesliga2: { futbinId: 20, name: '2. Bundesliga', priority: 2 },
  ligue2: { futbinId: 17, name: 'Ligue 2', priority: 2 },
  serieB: { futbinId: 32, name: 'Serie B', priority: 2 },
  // Tier 3 - Other European
  eredivisie: { futbinId: 10, name: 'Eredivisie', priority: 3 },
  primeiraLiga: { futbinId: 308, name: 'Liga Portugal', priority: 3 },
  scottishPrem: { futbinId: 50, name: 'Scottish Premiership', priority: 3 },
  superLig: { futbinId: 68, name: 'Süper Lig', priority: 3 },
  belgianPro: { futbinId: 4, name: 'Belgian Pro League', priority: 3 },
  austrian: { futbinId: 80, name: 'Austrian Bundesliga', priority: 3 },
  swiss: { futbinId: 189, name: 'Super League (Swiss)', priority: 3 },
  danish: { futbinId: 1, name: 'Danish Superliga', priority: 3 },
  greek: { futbinId: 63, name: 'Super League Greece', priority: 3 },
  czech: { futbinId: 319, name: 'Czech First League', priority: 3 },
  croatian: { futbinId: 317, name: 'Croatian HNL', priority: 3 },
  // Americas & Asia
  ligamx: { futbinId: 341, name: 'Liga MX', priority: 4 },
  mls: { futbinId: 39, name: 'MLS', priority: 4 },
  saudi: { futbinId: 350, name: 'Saudi Pro League', priority: 4 },
  jleague: { futbinId: 349, name: 'J1 League', priority: 4 },
  // Spanish lower
  primeraRFEF: { futbinId: 2076, name: 'Primera Federación', priority: 5 },
  segundaRFEF: { futbinId: null, name: 'Segunda RFEF', priority: 6 }, // Probably not in EA FC
};

const VERSIONS = ['gold_nr', 'silver_nr', 'bronze_nr'];
const BASE_URL = 'https://www.futbin.com/26/players';
const DELAY_MS = 1000; // Be polite
const OUTPUT_FILE = 'scripts/futbin-data.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(leagueId, version, page) {
  const url = `${BASE_URL}?page=${page}&league=${leagueId}&version=${version}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    if (!response.ok) {
      console.log(`    ${response.status} ${response.statusText}`);
      return null;
    }
    const html = await response.text();
    return html;
  } catch (err) {
    console.error(`  ❌ Error fetching ${url}: ${err.message}`);
    return null;
  }
}

function parsePlayersFromHTML(html, leagueKey) {
  const players = [];
  
  // Try multiple patterns to find player data
  
  // Pattern 1: Look for player table rows with data-player-id
  let playerMatches = html.matchAll(/<tr[^>]*data-player-id="(\d+)"[^>]*>(.*?)<\/tr>/gs);
  
  for (const match of playerMatches) {
    const [fullMatch, playerId, rowContent] = match;
    
    // Extract player data from the row
    const player = extractPlayerFromRow(rowContent, parseInt(playerId));
    if (player) {
      players.push(player);
    }
  }
  
  // Pattern 2: Look for player URLs and surrounding content
  if (players.length === 0) {
    const urlMatches = html.matchAll(/\/26\/player\/(\d+)\/([\w-]+)/g);
    const foundIds = new Set();
    
    for (const urlMatch of urlMatches) {
      const [fullUrl, id, slug] = urlMatch;
      const playerId = parseInt(id);
      
      if (foundIds.has(playerId)) continue;
      foundIds.add(playerId);
      
      // Find the context around this URL
      const urlIndex = html.indexOf(fullUrl);
      const contextStart = Math.max(0, urlIndex - 1000);
      const contextEnd = Math.min(html.length, urlIndex + 1000);
      const context = html.substring(contextStart, contextEnd);
      
      const player = extractPlayerFromContext(context, playerId, slug);
      if (player) {
        players.push(player);
      }
    }
  }
  
  return players;
}

function extractPlayerFromRow(rowHtml, playerId) {
  // Extract data from a table row
  const player = { id: playerId };
  
  // Overall rating
  const ovrMatch = rowHtml.match(/<span[^>]*class="[^"]*rating[^"]*"[^>]*>(\d{2})<\/span>/i);
  if (ovrMatch) {
    player.overall = parseInt(ovrMatch[1]);
  }
  
  // Position
  const posMatch = rowHtml.match(/<span[^>]*class="[^"]*position[^"]*"[^>]*>(\w{2,3})<\/span>/i);
  if (posMatch) {
    player.position = posMatch[1];
  }
  
  // Player name
  const nameMatch = rowHtml.match(/<a[^>]*class="[^"]*player_name[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                   rowHtml.match(/data-original-title="([^"]+)"/i);
  if (nameMatch) {
    player.name = nameMatch[1].trim();
  }
  
  // Club ID
  const clubMatch = rowHtml.match(/club=(\d+)/);
  if (clubMatch) {
    player.clubId = parseInt(clubMatch[1]);
  }
  
  // Get slug from URL if available
  const slugMatch = rowHtml.match(/\/26\/player\/\d+\/([\w-]+)/);
  if (slugMatch) {
    player.slug = slugMatch[1];
  }
  
  // Only return if we have the essential data
  return (player.overall && player.position && (player.name || player.slug)) ? player : null;
}

function extractPlayerFromContext(context, playerId, slug) {
  const player = { id: playerId, slug };
  
  // Generate name from slug
  player.name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  // Look for ratings and positions near the URL
  const numbers = context.match(/\b(\d{2})\b/g);
  const positions = context.match(/\b([A-Z]{2,3})\b/g);
  
  // Try to find reasonable overall rating (60-99)
  if (numbers) {
    for (const num of numbers) {
      const rating = parseInt(num);
      if (rating >= 60 && rating <= 99) {
        player.overall = rating;
        break;
      }
    }
  }
  
  // Try to find valid position
  if (positions) {
    const validPositions = ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
    for (const pos of positions) {
      if (validPositions.includes(pos)) {
        player.position = pos;
        break;
      }
    }
  }
  
  // Club ID
  const clubMatch = context.match(/club=(\d+)/);
  if (clubMatch) {
    player.clubId = parseInt(clubMatch[1]);
  }
  
  return (player.overall && player.position) ? player : null;
}

async function scrapeLeague(leagueKey, leagueInfo) {
  if (!leagueInfo.futbinId) {
    console.log(`⏭️  Skipping ${leagueInfo.name} (no FUTBIN ID)`);
    return [];
  }
  
  console.log(`\n🔍 Scraping ${leagueInfo.name} (ID: ${leagueInfo.futbinId})...`);
  let allPlayers = [];
  
  for (const version of VERSIONS) {
    console.log(`  📋 ${version}...`);
    let page = 1;
    let emptyPages = 0;
    
    while (emptyPages < 3) { // Stop after 3 empty pages
      console.log(`    Page ${page}...`);
      const html = await fetchPage(leagueInfo.futbinId, version, page);
      if (!html) { 
        emptyPages++; 
        page++; 
        await sleep(DELAY_MS);
        continue; 
      }
      
      const players = parsePlayersFromHTML(html, leagueKey);
      
      if (players.length === 0) {
        emptyPages++;
        console.log(`    Page ${page}: No players found`);
      } else {
        emptyPages = 0;
        // Add only new players (avoid duplicates)
        let newCount = 0;
        for (const p of players) {
          if (!allPlayers.find(ap => ap.id === p.id || (ap.slug === p.slug && ap.name === p.name))) {
            allPlayers.push(p);
            newCount++;
          }
        }
        console.log(`    Page ${page}: +${newCount} new players (${players.length} total on page, ${allPlayers.length} unique)`);
      }
      
      page++;
      await sleep(DELAY_MS);
      
      if (page > 50) break; // Safety limit
    }
  }
  
  console.log(`✅ ${leagueInfo.name}: ${allPlayers.length} players total`);
  return allPlayers;
}

async function main() {
  console.log('🚀 FUTBIN Scraper v2 - EA FC 26 Player Ratings');
  console.log('=============================================\n');
  
  // Load existing data if resuming
  let allData = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      allData = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📦 Loaded existing data: ${Object.keys(allData).length} leagues`);
      
      // Show what we have
      for (const [key, players] of Object.entries(allData)) {
        if (players && players.length > 0) {
          console.log(`  ✓ ${LEAGUES[key]?.name || key}: ${players.length} players`);
        }
      }
      console.log('');
    } catch (e) { 
      console.log('📦 Starting fresh...\n');
    }
  }
  
  // Sort leagues by priority
  const leagueEntries = Object.entries(LEAGUES).sort((a, b) => a[1].priority - b[1].priority);
  
  for (const [key, info] of leagueEntries) {
    if (allData[key] && allData[key].length > 0) {
      console.log(`⏭️  Skipping ${info.name} (already scraped: ${allData[key].length} players)`);
      continue;
    }
    
    const players = await scrapeLeague(key, info);
    if (players.length > 0) {
      allData[key] = players;
      // Save incrementally
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
      console.log(`💾 Saved progress (${players.length} players)`);
    } else {
      // Save empty array to avoid re-scraping failed leagues
      allData[key] = [];
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
    }
    
    // Short break between leagues
    await sleep(2000);
  }
  
  // Summary
  console.log('\n\n📊 FINAL SUMMARY');
  console.log('================');
  let total = 0;
  for (const [key, players] of Object.entries(allData)) {
    if (players.length > 0) {
      console.log(`  ✅ ${LEAGUES[key]?.name || key}: ${players.length} players`);
      total += players.length;
    } else {
      console.log(`  ❌ ${LEAGUES[key]?.name || key}: 0 players (failed or not available)`);
    }
  }
  console.log(`\n  🎯 TOTAL: ${total} players scraped`);
  console.log(`\n💾 Final data saved to ${OUTPUT_FILE}`);
  
  if (total === 0) {
    console.log('\n⚠️  No players were scraped. This could be due to:');
    console.log('   - FUTBIN blocking requests (try VPN or different user agent)');
    console.log('   - HTML structure changes (scraper needs updating)');
    console.log('   - Network issues');
    console.log('\n   Try running one league manually to debug.');
  }
}

main().catch(console.error);