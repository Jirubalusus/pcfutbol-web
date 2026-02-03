/**
 * Improve Existing Ratings - Update files that already have 5-parameter createPlayer format
 * This handles files that were already modified by the previous update script
 * 
 * Usage: node scripts/improve-existing-ratings.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = 'src/data';
const FUTBIN_FILE = 'scripts/futbin-data.json';

// League mapping: file suffix -> futbin league key
const LEAGUE_MAPPING = {
  'teams.js': 'laliga',                    // LaLiga (main file)
  'teams-segunda.js': 'segunda',           // Segunda División
  'teams-premier.js': 'premierLeague',     // Premier League
  'teams-seriea.js': 'seriea',            // Serie A
  'teams-bundesliga.js': 'bundesliga',     // Bundesliga
  'teams-ligue1.js': 'ligue1',            // Ligue 1
  'teams-championship.js': 'championship', // Championship
  'teams-bundesliga2.js': 'bundesliga2',   // 2. Bundesliga
  'teams-ligue2.js': 'ligue2',            // Ligue 2
  'teams-serie-b.js': 'serieB',           // Serie B
  'teams-eredivisie.js': 'eredivisie',     // Eredivisie
  'teams-primeira-liga.js': 'primeiraLiga', // Liga Portugal
  'teams-scottish-prem.js': 'scottishPrem', // Scottish Premiership
  'teams-super-lig.js': 'superLig',       // Süper Lig
  'teams-belgian-pro.js': 'belgianPro',   // Belgian Pro League
  'teams-austrian.js': 'austrian',        // Austrian Bundesliga
  'teams-swiss.js': 'swiss',              // Super League (Swiss)
  'teams-danish.js': 'danish',            // Danish Superliga
  'teams-greek.js': 'greek',              // Super League Greece
  'teams-czech.js': 'czech',              // Czech First League
  'teams-croatian.js': 'croatian',        // Croatian HNL
  'teams-ligamx.js': 'ligamx',            // Liga MX
  'teams-mls.js': 'mls',                  // MLS
  'teams-saudi.js': 'saudi',              // Saudi Pro League
  'teams-jleague.js': 'jleague',          // J1 League
  'teams-primera-rfef.js': 'primeraRFEF', // Primera Federación
  'teams-segunda-rfef.js': 'segundaRFEF', // Segunda RFEF (won't have EA data)
};

function loadFutbinData() {
  try {
    const data = JSON.parse(readFileSync(FUTBIN_FILE, 'utf-8'));
    let total = 0;
    for (const [league, players] of Object.entries(data)) {
      if (players && players.length > 0) {
        total += players.length;
      }
    }
    console.log(`📦 Loaded FUTBIN data: ${total} players across ${Object.keys(data).length} leagues`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading FUTBIN data: ${error.message}`);
    return null;
  }
}

function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/['-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPlayerRating(playerName, leaguePlayers) {
  if (!leaguePlayers || leaguePlayers.length === 0) return null;
  
  const normalizedTarget = normalizePlayerName(playerName);
  
  // 1. Exact match
  for (const player of leaguePlayers) {
    if (normalizePlayerName(player.name) === normalizedTarget) {
      return player.overall;
    }
  }
  
  // 2. Contains match (first name + last name in either order)
  const targetWords = normalizedTarget.split(' ').filter(w => w.length > 2);
  for (const player of leaguePlayers) {
    const normalizedPlayer = normalizePlayerName(player.name);
    const playerWords = normalizedPlayer.split(' ').filter(w => w.length > 2);
    
    // Check if target contains most player words
    let matches = 0;
    for (const pWord of playerWords) {
      for (const tWord of targetWords) {
        if (tWord.includes(pWord) || pWord.includes(tWord)) {
          matches++;
          break;
        }
      }
    }
    if (matches >= Math.min(playerWords.length, 2)) { // At least 2 matches or all player words
      return player.overall;
    }
  }
  
  // 3. Partial name matches (commonly used shortened names)
  for (const player of leaguePlayers) {
    const normalizedPlayer = normalizePlayerName(player.name);
    
    // Common name patterns
    if (normalizedTarget.includes('mbappe') && normalizedPlayer.includes('mbappe')) return player.overall;
    if (normalizedTarget.includes('lewandowski') && normalizedPlayer.includes('lewandowski')) return player.overall;
    if (normalizedTarget.includes('haaland') && normalizedPlayer.includes('haaland')) return player.overall;
    if (normalizedTarget.includes('de bruyne') && normalizedPlayer.includes('de bruyne')) return player.overall;
    if (normalizedTarget.includes('salah') && normalizedPlayer.includes('salah')) return player.overall;
    if (normalizedTarget.includes('kane') && normalizedPlayer.includes('kane')) return player.overall;
    if (normalizedTarget.includes('musiala') && normalizedPlayer.includes('musiala')) return player.overall;
    if (normalizedTarget.includes('bellingham') && normalizedPlayer.includes('bellingham')) return player.overall;
    if (normalizedTarget.includes('vinicius') && normalizedPlayer.includes('vinicius')) return player.overall;
  }
  
  return null;
}

function updateTeamFileWithExistingFormat(filePath, leaguePlayers, leagueName) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Find all createPlayer calls with 5 parameters
  const playerRegex = /createPlayer\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*(\d+),\s*([\d.]+),\s*(\d+)\)/g;
  
  let updatedContent = content;
  let playersChecked = 0;
  let playersWithEAData = 0;
  let playersImproved = 0;
  
  let match;
  while ((match = playerRegex.exec(content)) !== null) {
    const [fullMatch, playerName, position, age, valueM, currentOverall] = match;
    const currentRating = parseInt(currentOverall);
    playersChecked++;
    
    // Find EA rating
    const eaRating = findPlayerRating(playerName, leaguePlayers);
    
    if (eaRating) {
      playersWithEAData++;
      if (eaRating !== currentRating) {
        // Replace with EA rating
        const newMatch = `createPlayer('${playerName}', '${position}', ${age}, ${valueM}, ${eaRating})`;
        updatedContent = updatedContent.replace(fullMatch, newMatch);
        playersImproved++;
        
        console.log(`    📊 ${playerName}: ${currentRating} → ${eaRating} (EA FC)`);
      }
    }
  }
  
  // Write the updated file only if changes were made
  if (playersImproved > 0) {
    writeFileSync(filePath, updatedContent);
    console.log(`  ✅ ${leagueName}: ${playersImproved} players improved with EA FC ratings`);
  } else {
    console.log(`  📋 ${leagueName}: No improvements needed (${playersWithEAData}/${playersChecked} already have EA FC data)`);
  }
  
  return { checked: playersChecked, eaData: playersWithEAData, improved: playersImproved };
}

function main() {
  console.log('🔄 Improving Existing Ratings with EA FC 26 Data');
  console.log('===============================================\\n');
  
  // Load FUTBIN data
  const futbinData = loadFutbinData();
  if (!futbinData) return;
  
  // Get all team files
  const teamFiles = readdirSync(DATA_DIR)
    .filter(file => file.startsWith('teams') && file.endsWith('.js'))
    .sort();
  
  console.log(`\\n📁 Found ${teamFiles.length} team files to check\\n`);
  
  let totalStats = { checked: 0, eaData: 0, improved: 0 };
  let processedLeagues = 0;
  
  for (const file of teamFiles) {
    const filePath = join(DATA_DIR, file);
    const leagueKey = LEAGUE_MAPPING[file];
    
    if (!leagueKey) {
      console.log(`  ⚠️  ${file}: No league mapping found, skipping`);
      continue;
    }
    
    const leaguePlayers = futbinData[leagueKey] || [];
    const leagueName = file.replace('teams-', '').replace('.js', '').replace('teams', 'LaLiga');
    
    if (leaguePlayers.length === 0) {
      console.log(`  📋 ${leagueName}: No EA FC data available, skipping`);
      continue;
    }
    
    try {
      const stats = updateTeamFileWithExistingFormat(filePath, leaguePlayers, leagueName);
      totalStats.checked += stats.checked;
      totalStats.eaData += stats.eaData;
      totalStats.improved += stats.improved;
      processedLeagues++;
    } catch (error) {
      console.error(`  ❌ ${file}: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\\n\\n📊 IMPROVEMENT SUMMARY');
  console.log('======================');
  console.log(`  📁 Leagues processed: ${processedLeagues}`);
  console.log(`  👥 Players checked: ${totalStats.checked}`);
  console.log(`  🎯 Players with EA FC data: ${totalStats.eaData}`);
  console.log(`  🔧 Players improved: ${totalStats.improved}`);
  
  if (totalStats.improved > 0) {
    console.log('\\n✅ SUCCESS! Player ratings have been improved with EA FC 26 data.');
    console.log('\\n🚀 Next steps:');
    console.log('   npm run build');
    console.log('   npm run deploy');
  } else if (totalStats.eaData > 0) {
    console.log('\\n✅ All available EA FC ratings are already applied!');
  } else {
    console.log('\\n⚠️  No EA FC data matches found. Player names may need better normalization.');
  }
}

main();