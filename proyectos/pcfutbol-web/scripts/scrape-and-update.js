#!/usr/bin/env node
/**
 * SoFIFA Full Scraping & Update Script
 * 
 * This script reads pre-scraped data from sofifa-data-full.json
 * and updates the team .js files with EA FC 26 overall ratings.
 * 
 * The actual scraping is done via browser automation (separate step).
 * This script handles the matching and updating.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SOFIFA_FILE = path.join(__dirname, 'sofifa-data-full.json');

// League configuration: maps sofifa league IDs to game files
const LEAGUES = {
  53: { file: 'teams.js', name: 'LaLiga', exportName: 'laLigaTeams' },
  54: { file: 'teams-segunda.js', name: 'Segunda División', exportName: 'segundaTeams' },
  13: { file: 'teams-premier.js', name: 'Premier League', exportName: 'premierLeagueTeams' },
  31: { file: 'teams-seriea.js', name: 'Serie A', exportName: 'serieATeams' },
  19: { file: 'teams-bundesliga.js', name: 'Bundesliga', exportName: 'bundesligaTeams' },
  16: { file: 'teams-ligue1.js', name: 'Ligue 1', exportName: 'ligue1Teams' },
  10: { file: 'teams-eredivisie.js', name: 'Eredivisie', exportName: 'eredivisieTeams' },
  308: { file: 'teams-primeira-liga.js', name: 'Primeira Liga', exportName: 'primeiraLigaTeams' },
  14: { file: 'teams-championship.js', name: 'Championship', exportName: 'championshipTeams' },
  4: { file: 'teams-belgian-pro.js', name: 'Belgian Pro League', exportName: 'belgianProTeams' },
  68: { file: 'teams-super-lig.js', name: 'Süper Lig', exportName: 'superLigTeams' },
  50: { file: 'teams-scottish-prem.js', name: 'Scottish Premiership', exportName: 'scottishPremTeams' },
  32: { file: 'teams-serie-b.js', name: 'Serie B', exportName: 'serieBTeams' },
  20: { file: 'teams-bundesliga2.js', name: '2. Bundesliga', exportName: 'bundesliga2Teams' },
  17: { file: 'teams-ligue2.js', name: 'Ligue 2', exportName: 'ligue2Teams' },
  189: { file: 'teams-swiss.js', name: 'Swiss Super League', exportName: 'swissTeams' },
  80: { file: 'teams-austrian.js', name: 'Austrian Bundesliga', exportName: 'austrianTeams' },
  63: { file: 'teams-greek.js', name: 'Greek Super League', exportName: 'greekTeams' },
  1: { file: 'teams-danish.js', name: 'Danish Superliga', exportName: 'danishTeams' },
  317: { file: 'teams-croatian.js', name: 'Croatian HNL', exportName: 'croatianTeams' },
  319: { file: 'teams-czech.js', name: 'Czech Liga', exportName: 'czechTeams' },
  353: { file: null, name: 'Argentina Primera', exportName: null, firestore: 'argentinaPrimera' },
  7: { file: null, name: 'Brasileirão', exportName: null, firestore: 'brasileiraoA' },
  336: { file: 'teams-mls.js', name: 'MLS', exportName: 'mlsTeams' },
  350: { file: 'teams-saudi.js', name: 'Saudi Pro League', exportName: 'saudiTeams' },
  341: { file: 'teams-ligamx.js', name: 'Liga MX', exportName: 'ligaMxTeams' },
  349: { file: 'teams-jleague.js', name: 'J1 League', exportName: 'jLeagueTeams' },
};

// Normalize names for matching
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Get last name(s) for matching
function getLastName(name) {
  const parts = normalizeName(name).split(' ');
  if (parts.length <= 1) return parts[0] || '';
  return parts.slice(-1)[0]; // Last word
}

// Get initials + last name pattern (e.g., "K. Mbappé" -> "k mbappe")
function getInitialLastName(name) {
  const norm = normalizeName(name);
  const parts = norm.split(' ');
  if (parts.length <= 1) return norm;
  return parts[0][0] + ' ' + parts.slice(1).join(' ');
}

// Fuzzy match score between two names (0-1)
function nameMatchScore(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return 1.0;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Compare last names
  const ln1 = getLastName(name1);
  const ln2 = getLastName(name2);
  if (ln1 === ln2 && ln1.length > 2) return 0.8;
  
  // Check if SoFIFA abbreviated name matches (e.g. "K. Mbappé" matches "Kylian Mbappé")
  const il1 = getInitialLastName(name1);
  const il2 = getInitialLastName(name2);
  if (il1 === n2 || il2 === n1 || il1 === il2) return 0.85;
  
  // Check first initial + last name
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  if (parts1.length > 1 && parts2.length > 1) {
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];
    if (last1 === last2 && parts1[0][0] === parts2[0][0]) return 0.75;
  }
  
  // Levenshtein-based similarity
  const lev = levenshtein(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  const similarity = 1 - (lev / maxLen);
  
  return similarity;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

// Find best match for a player in SoFIFA data
function findBestMatch(player, sofifaPlayers, teamName) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const sp of sofifaPlayers) {
    let score = nameMatchScore(player.name, sp.name);
    
    // Bonus for same team (normalize team names too)
    const teamScore = nameMatchScore(teamName || '', sp.team || '');
    if (teamScore > 0.7) {
      score += 0.1; // Bonus for team match
    }
    
    if (score > bestScore && score >= 0.65) {
      bestScore = score;
      bestMatch = sp;
    }
  }
  
  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

// Main update function
function updateLeagueFile(leagueId, sofifaPlayers) {
  const config = LEAGUES[leagueId];
  if (!config || !config.file) {
    console.log(`  Skipping ${config?.name || leagueId} (no file/Firestore only)`);
    return { updated: 0, notFound: 0, total: 0 };
  }
  
  const filePath = path.join(DATA_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${config.file}`);
    return { updated: 0, notFound: 0, total: 0 };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = 0;
  let notFound = [];
  let totalPlayers = 0;
  
  // Parse teams and players from the file
  // The files have structure: { name: 'Team', players: [{ name: '...', rating: XX }] }
  
  // Find all player entries with ratings
  const playerRegex = /\{\s*name:\s*'([^']+)',\s*position:\s*'([^']+)',\s*rating:\s*(\d+)\s*\}/g;
  
  // We need to also track which team each player belongs to
  // Find team blocks
  const teamBlocks = [];
  const teamRegex = /name:\s*'([^']+)',\s*\n\s*players:\s*\[/g;
  let match;
  
  while ((match = teamRegex.exec(content)) !== null) {
    teamBlocks.push({ teamName: match[1], startIdx: match.index });
  }
  
  // For each player, find their team
  function getTeamForIndex(idx) {
    for (let i = teamBlocks.length - 1; i >= 0; i--) {
      if (teamBlocks[i].startIdx < idx) return teamBlocks[i].teamName;
    }
    return '';
  }
  
  // Process all player entries
  const replacements = [];
  let pmatch;
  const regex = /\{\s*name:\s*'([^']+)',\s*position:\s*'([^']+)',\s*rating:\s*(\d+)\s*\}/g;
  
  while ((pmatch = regex.exec(content)) !== null) {
    totalPlayers++;
    const playerName = pmatch[1];
    const position = pmatch[2];
    const currentRating = parseInt(pmatch[3]);
    const teamName = getTeamForIndex(pmatch.index);
    
    const result = findBestMatch({ name: playerName }, sofifaPlayers, teamName);
    
    if (result && result.match) {
      const newRating = result.match.overall;
      if (newRating !== currentRating) {
        replacements.push({
          old: pmatch[0],
          new: pmatch[0].replace(`rating: ${currentRating}`, `rating: ${newRating}`),
          player: playerName,
          team: teamName,
          oldRating: currentRating,
          newRating: newRating,
          sofifaName: result.match.name,
          score: result.score
        });
      }
      updated++;
    } else {
      notFound.push({ name: playerName, team: teamName });
    }
  }
  
  // Apply replacements
  for (const r of replacements) {
    content = content.replace(r.old, r.new);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  return { 
    updated, 
    notFound: notFound.length, 
    total: totalPlayers,
    changes: replacements.length,
    notFoundList: notFound 
  };
}

// Run the update
function main() {
  if (!fs.existsSync(SOFIFA_FILE)) {
    console.error('Error: sofifa-data-full.json not found. Run scraping first.');
    process.exit(1);
  }
  
  const sofifaData = JSON.parse(fs.readFileSync(SOFIFA_FILE, 'utf8'));
  const report = {};
  
  console.log('=== SoFIFA Rating Update ===\n');
  
  for (const [leagueId, config] of Object.entries(LEAGUES)) {
    const players = sofifaData[leagueId];
    if (!players) {
      console.log(`[${config.name}] No SoFIFA data found (league ${leagueId})`);
      report[leagueId] = { name: config.name, status: 'NO_DATA' };
      continue;
    }
    
    console.log(`[${config.name}] Processing ${players.length} SoFIFA players...`);
    const result = updateLeagueFile(leagueId, players);
    report[leagueId] = { name: config.name, ...result, sofifaPlayers: players.length };
    
    if (result.changes > 0) {
      console.log(`  ✓ ${result.changes} ratings changed, ${result.updated}/${result.total} matched, ${result.notFound} not found`);
    } else if (result.total > 0) {
      console.log(`  = ${result.updated}/${result.total} matched (no changes needed), ${result.notFound} not found`);
    }
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'update-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${reportPath}`);
}

main();
