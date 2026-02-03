/**
 * FUTBIN Scraper v3 - EA FC 26 Player Ratings
 * Simple pattern-based parsing using web_fetch markdown mode
 * 
 * Usage: node scripts/scrape-futbin-v3.mjs
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
  // Tier 3 - Other leagues
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
  segundaRFEF: { futbinId: null, name: 'Segunda RFEF', priority: 6 }, // Not in EA FC
};

const VERSIONS = ['gold_nr', 'silver_nr', 'bronze_nr'];
const DELAY_MS = 1200; // Be respectful
const OUTPUT_FILE = 'scripts/futbin-data.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPageMarkdown(leagueId, version, page) {
  const url = `https://www.futbin.com/26/players?page=${page}&league=${leagueId}&version=${version}`;
  try {
    // Simple HTML fetch and basic parsing
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.log(`    HTTP ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    // Convert to simple text format similar to what I saw
    // Extract player data patterns from HTML
    return simplifyHTML(html);
  } catch (err) {
    console.error(`  ❌ Error fetching ${url}: ${err.message}`);
    return null;
  }
}

function simplifyHTML(html) {
  // Extract player URLs and surrounding data
  let simplified = '';
  const playerRegex = /\/26\/player\/(\d+)\/([\w-]+)/g;
  let match;
  
  while ((match = playerRegex.exec(html)) !== null) {
    const playerStart = match.index;
    const playerEnd = Math.min(playerStart + 2000, html.length);
    const section = html.substring(playerStart, playerEnd);
    
    // Add the player URL
    simplified += `/26/player/${match[1]}/${match[2]}\n`;
    
    // Extract rating (look for 2-digit numbers in appropriate contexts)
    const ratings = section.match(/(?:rating|overall|ovr|>)(\d{2})</gi);
    if (ratings) {
      for (const rating of ratings) {
        const num = rating.match(/\d{2}/)[0];
        if (parseInt(num) >= 60 && parseInt(num) <= 99) {
          simplified += num + '\n';
          break;
        }
      }
    }
    
    // Extract position
    const positions = section.match(/(?:position|pos|>)([A-Z]{2,3})</gi);
    if (positions) {
      for (const pos of positions) {
        const position = pos.match(/[A-Z]{2,3}/)[0];
        const validPositions = ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
        if (validPositions.includes(position)) {
          simplified += position + '\n';
          break;
        }
      }
    }
    
    simplified += '\n'; // Separator between players
  }
  
  return simplified;
}

function parsePlayersFromMarkdown(markdown) {
  const players = [];
  
  // Split into sections by player URLs
  const sections = markdown.split(/\/26\/player\/(\d+)\/([\w-]+)/);
  
  // Process every 3 elements (full match, id, slug)
  for (let i = 0; i < sections.length - 2; i += 3) {
    if (i + 2 >= sections.length) break;
    
    const id = parseInt(sections[i + 1]);
    const slug = sections[i + 2];
    const content = sections[i + 3] || '';
    
    if (!id || !slug) continue;
    
    // Extract data from the content following this player
    const player = extractPlayerData(id, slug, content);
    if (player) {
      players.push(player);
    }
  }
  
  return players;
}

function extractPlayerData(id, slug, content) {
  // Clean the content and split into lines
  const lines = content.split('\\n').map(l => l.trim()).filter(Boolean);
  
  let overall = null;
  let position = null;
  
  // Look for patterns in the first ~20 lines
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    
    // Skip links and non-data lines
    if (line.includes('/') || line.includes('http') || line.includes('?')) continue;
    
    // Look for overall rating (2-digit number, typically 60-99)
    if (!overall && /^\\d{2}$/.test(line)) {
      const rating = parseInt(line);
      if (rating >= 60 && rating <= 99) {
        overall = rating;
      }
    }
    
    // Look for position (2-3 letter codes)
    if (!position && /^[A-Z]{2,3}(\+\+)?$/.test(line)) {
      const validPositions = ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
      const pos = line.replace('++', '');
      if (validPositions.includes(pos)) {
        position = pos;
      }
    }
    
    // Stop once we have both
    if (overall && position) break;
  }
  
  // Only return if we found the essential data
  if (overall && position) {
    return {
      id,
      slug,
      name: slug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase()),
      overall,
      position
    };
  }
  
  return null;
}

async function scrapeLeague(leagueKey, leagueInfo, startPage = 1) {
  if (!leagueInfo.futbinId) {
    console.log(`⏭️  Skipping ${leagueInfo.name} (no FUTBIN ID)`);
    return [];
  }
  
  console.log(`\\n🔍 Scraping ${leagueInfo.name} (ID: ${leagueInfo.futbinId})...`);
  let allPlayers = [];
  
  for (const version of VERSIONS) {
    console.log(`  📋 ${version}...`);
    let page = startPage;
    let emptyPages = 0;
    
    while (emptyPages < 2) { // Stop after 2 empty pages
      console.log(`    Page ${page}...`);
      const markdown = await fetchPageMarkdown(leagueInfo.futbinId, version, page);
      
      if (!markdown) { 
        emptyPages++; 
        page++; 
        await sleep(DELAY_MS);
        continue; 
      }
      
      const players = parsePlayersFromMarkdown(markdown);
      
      if (players.length === 0) {
        emptyPages++;
        console.log(`    Page ${page}: No players found`);
      } else {
        emptyPages = 0;
        // Add only new players (avoid duplicates)
        let newCount = 0;
        for (const p of players) {
          if (!allPlayers.find(ap => ap.id === p.id)) {
            allPlayers.push(p);
            newCount++;
          }
        }
        console.log(`    Page ${page}: +${newCount} new (${players.length} found, ${allPlayers.length} total)`);
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
  console.log('🚀 FUTBIN Scraper v3 - EA FC 26 Player Ratings');
  console.log('=============================================\\n');
  
  // Load existing data if resuming
  let allData = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      allData = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📦 Loaded existing data: ${Object.keys(allData).length} leagues`);
      
      let existingTotal = 0;
      for (const [key, players] of Object.entries(allData)) {
        if (players && players.length > 0) {
          console.log(`  ✓ ${LEAGUES[key]?.name || key}: ${players.length} players`);
          existingTotal += players.length;
        }
      }
      if (existingTotal > 0) {
        console.log(`  📊 Existing total: ${existingTotal} players`);
      }
      console.log('');
    } catch (e) { 
      console.log('📦 Starting fresh...\\n');
    }
  }
  
  // Sort leagues by priority
  const leagueEntries = Object.entries(LEAGUES).sort((a, b) => a[1].priority - b[1].priority);
  
  for (const [key, info] of leagueEntries) {
    if (allData[key] && allData[key].length > 0) {
      console.log(`⏭️  Skipping ${info.name} (already scraped: ${allData[key].length} players)`);
      continue;
    }
    
    try {
      const players = await scrapeLeague(key, info);
      allData[key] = players;
      
      // Save after each league
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
      if (players.length > 0) {
        console.log(`💾 Saved ${players.length} players for ${info.name}`);
      }
      
      // Short break between leagues
      console.log('⏸️  Waiting 3 seconds...');
      await sleep(3000);
      
    } catch (error) {
      console.error(`❌ Error scraping ${info.name}: ${error.message}`);
      allData[key] = []; // Mark as attempted
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
    }
  }
  
  // Final Summary
  console.log('\\n\\n📊 FINAL SUMMARY');
  console.log('================');
  let total = 0;
  const successful = [];
  const failed = [];
  
  for (const [key, players] of Object.entries(allData)) {
    const leagueInfo = LEAGUES[key];
    if (players && players.length > 0) {
      console.log(`  ✅ ${leagueInfo?.name || key}: ${players.length} players`);
      successful.push({ name: leagueInfo?.name || key, count: players.length });
      total += players.length;
    } else {
      console.log(`  ❌ ${leagueInfo?.name || key}: 0 players`);
      failed.push(leagueInfo?.name || key);
    }
  }
  
  console.log(`\\n  🎯 TOTAL SCRAPED: ${total} players`);
  console.log(`  ✅ Successful: ${successful.length} leagues`);
  console.log(`  ❌ Failed: ${failed.length} leagues`);
  
  if (total > 0) {
    console.log(`\\n💾 Data saved to ${OUTPUT_FILE}`);
    console.log('\\n🔄 Next step: Run the data update script to apply these ratings to team files');
  } else {
    console.log('\\n⚠️  No data was scraped. Check network connection or try a different approach.');
  }
}

main().catch(console.error);