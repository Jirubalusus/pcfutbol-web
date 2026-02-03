/**
 * Update Team Data - Replace calcOverall with EA FC 26 ratings
 * 
 * This script:
 * 1. Loads scraped FUTBIN data (scripts/futbin-data.json)
 * 2. Updates all src/data/teams-*.js files
 * 3. Replaces calcOverall() calls with real EA FC ratings
 * 4. Uses fuzzy matching to link player names
 * 
 * Usage: node scripts/update-team-data.mjs
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
    console.log('💡 Run the scraper first: node scripts/scrape-futbin-v3.mjs');
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
  
  // 2. Partial match (common for different name formats)
  for (const player of leaguePlayers) {
    const normalizedPlayer = normalizePlayerName(player.name);
    const targetWords = normalizedTarget.split(' ');
    const playerWords = normalizedPlayer.split(' ');
    
    // Check if all target words are in player name
    if (targetWords.every(word => playerWords.some(pw => pw.includes(word) || word.includes(pw)))) {
      return player.overall;
    }
  }
  
  // 3. Reverse partial match
  for (const player of leaguePlayers) {
    const normalizedPlayer = normalizePlayerName(player.name);
    const targetWords = normalizedTarget.split(' ');
    const playerWords = normalizedPlayer.split(' ');
    
    // Check if all player words are in target name
    if (playerWords.every(word => targetWords.some(tw => tw.includes(word) || word.includes(tw)))) {
      return player.overall;
    }
  }
  
  return null;
}

function calculateFallbackOverall(valueM, age) {
  // Improved curve based on EA FC rating distribution
  let ovr;
  if (valueM >= 120) ovr = 91;      // World class
  else if (valueM >= 80) ovr = 88;  // Elite
  else if (valueM >= 50) ovr = 85;  // High quality
  else if (valueM >= 30) ovr = 82;  // Good
  else if (valueM >= 20) ovr = 79;  // Decent
  else if (valueM >= 12) ovr = 76;  // Average
  else if (valueM >= 7) ovr = 73;   // Below average
  else if (valueM >= 4) ovr = 70;   // Low
  else if (valueM >= 2) ovr = 67;   // Poor
  else if (valueM >= 1) ovr = 64;   // Very poor
  else ovr = 62;                    // Minimum
  
  // Age adjustments
  if (age <= 21) ovr += 2;          // Young bonus
  else if (age >= 35) ovr -= 3;     // Old penalty
  else if (age >= 32) ovr -= 1;     // Decline
  
  return Math.max(60, Math.min(94, ovr));
}

function updateTeamFile(filePath, leaguePlayers, leagueName) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Find all createPlayer calls
  const playerRegex = /createPlayer\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*(\d+),\s*([\d.]+)\)/g;
  
  let updatedContent = content;
  let playersUpdated = 0;
  let playersWithEAData = 0;
  let playersWithFallback = 0;
  
  // Remove the calcOverall function
  updatedContent = updatedContent.replace(
    /function calcOverall\(valueM, age\) \{[\s\S]*?\}/,
    '// calcOverall function removed - using EA FC 26 ratings'
  );
  
  // Update createPlayer function calls
  let match;
  while ((match = playerRegex.exec(content)) !== null) {
    const [fullMatch, playerName, position, age, valueM] = match;
    
    // Find EA rating
    const eaRating = findPlayerRating(playerName, leaguePlayers);
    let newOverall;
    let source;
    
    if (eaRating) {
      newOverall = eaRating;
      source = 'EA FC 26';
      playersWithEAData++;
    } else {
      newOverall = calculateFallbackOverall(parseFloat(valueM), parseInt(age));
      source = 'calculated';
      playersWithFallback++;
    }
    
    // Replace the createPlayer call to use direct overall value
    const newMatch = `createPlayer('${playerName}', '${position}', ${age}, ${valueM}, ${newOverall})`;
    updatedContent = updatedContent.replace(fullMatch, newMatch);
    playersUpdated++;
  }
  
  // Update the createPlayer function definition to accept overall parameter
  updatedContent = updatedContent.replace(
    /function createPlayer\(name, position, age, valueM\) \{/,
    'function createPlayer(name, position, age, valueM, overall = null) {'
  );
  
  // Update the overall property in createPlayer
  updatedContent = updatedContent.replace(
    /overall: calcOverall\(valueM, age\)/,
    'overall: overall || calculateFallbackOverall(valueM, age)'
  );
  
  // Add the fallback function if players without EA data exist
  if (playersWithFallback > 0) {
    const fallbackFunction = `
function calculateFallbackOverall(valueM, age) {
  let ovr;
  if (valueM >= 120) ovr = 91;
  else if (valueM >= 80) ovr = 88;
  else if (valueM >= 50) ovr = 85;
  else if (valueM >= 30) ovr = 82;
  else if (valueM >= 20) ovr = 79;
  else if (valueM >= 12) ovr = 76;
  else if (valueM >= 7) ovr = 73;
  else if (valueM >= 4) ovr = 70;
  else if (valueM >= 2) ovr = 67;
  else if (valueM >= 1) ovr = 64;
  else ovr = 62;
  
  if (age <= 21) ovr += 2;
  else if (age >= 35) ovr -= 3;
  else if (age >= 32) ovr -= 1;
  
  return Math.max(60, Math.min(94, ovr));
}`;
    
    // Insert after the calcOverall removal
    updatedContent = updatedContent.replace(
      '// calcOverall function removed - using EA FC 26 ratings',
      '// calcOverall function removed - using EA FC 26 ratings' + fallbackFunction
    );
  }
  
  // Write the updated file
  writeFileSync(filePath, updatedContent);
  
  console.log(`  ✅ ${leagueName}: ${playersUpdated} players updated`);
  console.log(`      🎯 ${playersWithEAData} with EA FC data, ${playersWithFallback} with fallback`);
  
  return { total: playersUpdated, eaData: playersWithEAData, fallback: playersWithFallback };
}

function main() {
  console.log('🔄 Updating Team Data with EA FC 26 Ratings');
  console.log('=============================================\\n');
  
  // Load FUTBIN data
  const futbinData = loadFutbinData();
  if (!futbinData) return;
  
  // Get all team files
  const teamFiles = readdirSync(DATA_DIR)
    .filter(file => file.startsWith('teams') && file.endsWith('.js'))
    .sort();
  
  console.log(`\\n📁 Found ${teamFiles.length} team files to update\\n`);
  
  let totalStats = { total: 0, eaData: 0, fallback: 0 };
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
    
    try {
      const stats = updateTeamFile(filePath, leaguePlayers, leagueName);
      totalStats.total += stats.total;
      totalStats.eaData += stats.eaData;
      totalStats.fallback += stats.fallback;
      processedLeagues++;
    } catch (error) {
      console.error(`  ❌ ${file}: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\\n\\n📊 UPDATE SUMMARY');
  console.log('==================');
  console.log(`  📁 Leagues processed: ${processedLeagues}`);
  console.log(`  👥 Players updated: ${totalStats.total}`);
  console.log(`  🎯 EA FC 26 ratings: ${totalStats.eaData} (${(totalStats.eaData/totalStats.total*100).toFixed(1)}%)`);
  console.log(`  🔧 Fallback ratings: ${totalStats.fallback} (${(totalStats.fallback/totalStats.total*100).toFixed(1)}%)`);
  
  if (totalStats.eaData > 0) {
    console.log('\\n✅ SUCCESS! Real EA FC 26 ratings have been applied.');
    console.log('\\n🚀 Next steps:');
    console.log('   npm run build');
    console.log('   npm run deploy');
  } else {
    console.log('\\n⚠️  No EA FC ratings were applied. Check the FUTBIN data.');
  }
}

main();