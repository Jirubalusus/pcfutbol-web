import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Seasons to scrape (saison_id in Transfermarkt = first year of season)
// 2025 = 2025/26, 2024 = 2024/25, etc.
const SEASONS = [2025, 2024, 2023, 2022, 2021];

// League configurations - Top European leagues
const LEAGUES = {
  // ========== ESPAÑA ==========
  laliga: {
    name: 'LaLiga',
    country: 'Spain',
    startYear: 1928,
    groups: [
      { id: 'ES1', name: 'LaLiga', baseUrl: 'https://www.transfermarkt.es/laliga/startseite/wettbewerb/ES1' },
    ]
  },
  laliga2: {
    name: 'LaLiga 2',
    country: 'Spain',
    startYear: 1928,
    groups: [
      { id: 'ES2', name: 'LaLiga 2', baseUrl: 'https://www.transfermarkt.es/laliga2/startseite/wettbewerb/ES2' },
    ]
  },
  primeraFederacion: {
    name: 'Primera Federación',
    country: 'Spain',
    startYear: 2021,
    groups: [
      { id: 'E3G1', name: 'Grupo 1', baseUrl: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1' },
      { id: 'E3G2', name: 'Grupo 2', baseUrl: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2' },
    ]
  },
  segundaFederacion: {
    name: 'Segunda Federación',
    country: 'Spain',
    startYear: 2021,
    groups: [
      { id: 'E4G1', name: 'Grupo 1', baseUrl: 'https://www.transfermarkt.es/segunda-federacion-grupo-1/startseite/wettbewerb/E4G1' },
      { id: 'E4G2', name: 'Grupo 2', baseUrl: 'https://www.transfermarkt.es/segunda-federacion-grupo-2/startseite/wettbewerb/E4G2' },
      { id: 'E4G3', name: 'Grupo 3', baseUrl: 'https://www.transfermarkt.es/segunda-federacion-grupo-3/startseite/wettbewerb/E4G3' },
      { id: 'E4G4', name: 'Grupo 4', baseUrl: 'https://www.transfermarkt.es/segunda-federacion-grupo-4/startseite/wettbewerb/E4G4' },
      { id: 'E4G5', name: 'Grupo 5', baseUrl: 'https://www.transfermarkt.es/segunda-federacion-grupo-5/startseite/wettbewerb/E4G5' },
    ]
  },

  // ========== ENGLAND ==========
  premierLeague: {
    name: 'Premier League',
    country: 'England',
    startYear: 1992,
    groups: [
      { id: 'GB1', name: 'Premier League', baseUrl: 'https://www.transfermarkt.es/premier-league/startseite/wettbewerb/GB1' },
    ]
  },
  championship: {
    name: 'Championship',
    country: 'England',
    startYear: 2004,
    groups: [
      { id: 'GB2', name: 'Championship', baseUrl: 'https://www.transfermarkt.es/championship/startseite/wettbewerb/GB2' },
    ]
  },
  leagueOne: {
    name: 'League One',
    country: 'England',
    startYear: 2004,
    groups: [
      { id: 'GB3', name: 'League One', baseUrl: 'https://www.transfermarkt.es/league-one/startseite/wettbewerb/GB3' },
    ]
  },
  leagueTwo: {
    name: 'League Two',
    country: 'England',
    startYear: 2004,
    groups: [
      { id: 'GB4', name: 'League Two', baseUrl: 'https://www.transfermarkt.es/league-two/startseite/wettbewerb/GB4' },
    ]
  },

  // ========== GERMANY ==========
  bundesliga: {
    name: 'Bundesliga',
    country: 'Germany',
    startYear: 1963,
    groups: [
      { id: 'L1', name: 'Bundesliga', baseUrl: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/L1' },
    ]
  },
  bundesliga2: {
    name: '2. Bundesliga',
    country: 'Germany',
    startYear: 1974,
    groups: [
      { id: 'L2', name: '2. Bundesliga', baseUrl: 'https://www.transfermarkt.es/2-bundesliga/startseite/wettbewerb/L2' },
    ]
  },
  liga3: {
    name: '3. Liga',
    country: 'Germany',
    startYear: 2008,
    groups: [
      { id: 'L3', name: '3. Liga', baseUrl: 'https://www.transfermarkt.es/3-liga/startseite/wettbewerb/L3' },
    ]
  },

  // ========== ITALY ==========
  serieA: {
    name: 'Serie A',
    country: 'Italy',
    startYear: 1929,
    groups: [
      { id: 'IT1', name: 'Serie A', baseUrl: 'https://www.transfermarkt.es/serie-a/startseite/wettbewerb/IT1' },
    ]
  },
  serieB: {
    name: 'Serie B',
    country: 'Italy',
    startYear: 1929,
    groups: [
      { id: 'IT2', name: 'Serie B', baseUrl: 'https://www.transfermarkt.es/serie-b/startseite/wettbewerb/IT2' },
    ]
  },

  // ========== FRANCE ==========
  ligue1: {
    name: 'Ligue 1',
    country: 'France',
    startYear: 1932,
    groups: [
      { id: 'FR1', name: 'Ligue 1', baseUrl: 'https://www.transfermarkt.es/ligue-1/startseite/wettbewerb/FR1' },
    ]
  },
  ligue2: {
    name: 'Ligue 2',
    country: 'France',
    startYear: 1933,
    groups: [
      { id: 'FR2', name: 'Ligue 2', baseUrl: 'https://www.transfermarkt.es/ligue-2/startseite/wettbewerb/FR2' },
    ]
  },
};

// Build URL with season parameter
function buildSeasonUrl(baseUrl, seasonId) {
  // Transfermarkt URLs: /startseite/wettbewerb/XXX → /startseite/wettbewerb/XXX/plus/?saison_id=YYYY
  return `${baseUrl}/plus/?saison_id=${seasonId}`;
}

async function fetchPage(url) {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.text();
}

async function scrapeTeamsFromGroup(groupUrl, seasonId) {
  const url = buildSeasonUrl(groupUrl, seasonId);
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const teams = [];
  
  // Find team links in the table
  $('table.items tbody tr').each((_, row) => {
    const $row = $(row);
    const teamLink = $row.find('td.hauptlink a').first();
    const teamName = teamLink.text().trim();
    const teamHref = teamLink.attr('href');
    
    if (teamHref && teamName) {
      // Extract team ID from URL like /real-madrid-castilla/kader/verein/6767/saison_id/2025
      const idMatch = teamHref.match(/verein\/(\d+)/);
      const teamId = idMatch ? idMatch[1] : null;
      
      // Get squad size and average age
      const squadSize = parseInt($row.find('td').eq(2).text().trim()) || 0;
      const avgAge = parseFloat($row.find('td').eq(3).text().replace(',', '.')) || 0;
      const foreigners = parseInt($row.find('td').eq(4).text().trim()) || 0;
      const marketValue = $row.find('td').last().text().trim();
      
      if (teamId) {
        teams.push({
          id: teamId,
          name: teamName,
          squadSize,
          avgAge,
          foreigners,
          marketValue,
          seasonId,
          squadUrl: `https://www.transfermarkt.es${teamHref.replace('/startseite/', '/kader/')}`
        });
      }
    }
  });
  
  return teams;
}

async function scrapeSquad(team, seasonId) {
  const squadUrl = `https://www.transfermarkt.es/${team.name.toLowerCase().replace(/\s+/g, '-')}/kader/verein/${team.id}/saison_id/${seasonId}`;
  
  try {
    const html = await fetchPage(squadUrl);
    const $ = cheerio.load(html);
    const players = [];
    
    $('table.items tbody tr').each((_, row) => {
      const $row = $(row);
      
      // Skip rows without player data
      if ($row.find('td.posrela').length === 0) return;
      
      const playerLink = $row.find('td.hauptlink a').first();
      const playerName = playerLink.text().trim();
      const playerHref = playerLink.attr('href');
      
      if (!playerName) return;
      
      // Extract player ID
      const idMatch = playerHref?.match(/spieler\/(\d+)/);
      const playerId = idMatch ? idMatch[1] : `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Position
      const position = $row.find('td.posrela table tr').last().text().trim();
      
      // Date of birth / Age
      const ageCell = $row.find('td.zentriert').eq(1).text().trim();
      const ageMatch = ageCell.match(/\((\d+)\)/);
      const age = ageMatch ? parseInt(ageMatch[1]) : null;
      const birthDate = ageCell.replace(/\s*\(\d+\)/, '').trim();
      
      // Nationality
      const nationFlags = [];
      $row.find('td.zentriert img.flaggenrahmen').each((_, img) => {
        nationFlags.push($(img).attr('title') || '');
      });
      
      // Market value
      const marketValue = $row.find('td.rechts').last().text().trim();
      
      // Number
      const number = $row.find('td.rn_nummer').text().trim() || null;
      
      players.push({
        id: playerId,
        name: playerName,
        position: mapPosition(position),
        positionOriginal: position,
        age,
        birthDate,
        nationalities: nationFlags,
        marketValue,
        number: number ? parseInt(number) : null,
      });
    });
    
    return players;
  } catch (error) {
    console.error(`  Error scraping ${team.name}: ${error.message}`);
    return [];
  }
}

function mapPosition(pos) {
  const posLower = pos.toLowerCase();
  if (posLower.includes('portero') || posLower.includes('keeper')) return 'GK';
  if (posLower.includes('central')) return 'CB';
  if (posLower.includes('lateral derecho') || posLower.includes('right-back')) return 'RB';
  if (posLower.includes('lateral izquierdo') || posLower.includes('left-back')) return 'LB';
  if (posLower.includes('pivote') || posLower.includes('defensive mid')) return 'CDM';
  if (posLower.includes('mediocentro') || posLower.includes('central mid')) return 'CM';
  if (posLower.includes('mediapunta') || posLower.includes('attacking mid')) return 'CAM';
  if (posLower.includes('extremo derecho') || posLower.includes('right wing')) return 'RW';
  if (posLower.includes('extremo izquierdo') || posLower.includes('left wing')) return 'LW';
  if (posLower.includes('delantero centro') || posLower.includes('centre-forward')) return 'ST';
  if (posLower.includes('defensa')) return 'CB';
  if (posLower.includes('centrocampista') || posLower.includes('midfield')) return 'CM';
  if (posLower.includes('atacante') || posLower.includes('attack')) return 'ST';
  return 'CM'; // default
}

function parseMarketValue(valueStr) {
  if (!valueStr) return 0;
  const cleaned = valueStr.toLowerCase().replace(/[€.]/g, '').trim();
  
  let multiplier = 1;
  if (cleaned.includes('mil mill')) multiplier = 1000000000;
  else if (cleaned.includes('mill')) multiplier = 1000000;
  else if (cleaned.includes('mil')) multiplier = 1000;
  
  const numMatch = cleaned.match(/([\d,]+)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(',', '.'));
    return Math.round(num * multiplier);
  }
  return 0;
}

async function main() {
  console.log('⚽ Football Manager Scraper - Multi-Season\n');
  console.log(`📅 Seasons to scrape: ${SEASONS.map(s => `${s}/${s+1}`).join(', ')}\n`);
  
  // Master data structure - organized by season
  const masterData = {
    seasons: {},
    scrapedAt: new Date().toISOString()
  };
  
  for (const seasonId of SEASONS) {
    const seasonLabel = `${seasonId}/${seasonId + 1}`;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🗓️  SEASON ${seasonLabel}`);
    console.log(`${'='.repeat(60)}`);
    
    const seasonData = {
      seasonId,
      seasonLabel,
      leagues: {},
      teams: {},
      players: {},
      scrapedAt: new Date().toISOString()
    };
    
    for (const [leagueKey, league] of Object.entries(LEAGUES)) {
      // Skip seasons before the league existed
      if (seasonId < league.startYear) {
        console.log(`\n⏭️  Skipping ${league.name} (didn't exist in ${seasonLabel})`);
        continue;
      }
      
      console.log(`\n📋 ${league.name}`);
      seasonData.leagues[leagueKey] = {
        name: league.name,
        groups: {}
      };
      
      for (const group of league.groups) {
        console.log(`\n  📁 ${group.name}`);
        
        try {
          const teams = await scrapeTeamsFromGroup(group.baseUrl, seasonId);
          console.log(`    Found ${teams.length} teams`);
          
          if (teams.length === 0) {
            console.log(`    ⚠️  No teams found, skipping group`);
            continue;
          }
          
          seasonData.leagues[leagueKey].groups[group.id] = {
            name: group.name,
            teamIds: teams.map(t => t.id)
          };
          
          for (const team of teams) {
            console.log(`\n    🏟️  ${team.name}`);
            
            // Unique key for team in this season
            const teamSeasonKey = `${team.id}_${seasonId}`;
            
            // Store team
            seasonData.teams[teamSeasonKey] = {
              id: team.id,
              name: team.name,
              league: leagueKey,
              group: group.id,
              seasonId,
              marketValue: parseMarketValue(team.marketValue),
              marketValueDisplay: team.marketValue,
              squadSize: team.squadSize,
              avgAge: team.avgAge,
              foreigners: team.foreigners,
              playerIds: []
            };
            
            // Scrape players
            await delay(1500); // Be nice to the server
            const players = await scrapeSquad(team, seasonId);
            console.log(`      ${players.length} players`);
            
            for (const player of players) {
              // Unique key for player in this season (player can be in multiple seasons)
              const playerSeasonKey = `${player.id}_${seasonId}`;
              
              seasonData.players[playerSeasonKey] = {
                ...player,
                seasonId,
                teamId: team.id,
                teamSeasonKey,
                marketValueNum: parseMarketValue(player.marketValue)
              };
              seasonData.teams[teamSeasonKey].playerIds.push(playerSeasonKey);
            }
          }
          
        } catch (error) {
          console.error(`    ❌ Error with ${group.name}: ${error.message}`);
        }
        
        await delay(2000);
      }
    }
    
    // Store season data
    masterData.seasons[seasonId] = seasonData;
    
    // Save progress after each season (individual file)
    const seasonFileName = `football-data-${seasonId}.json`;
    fs.writeFileSync(
      path.join(DATA_DIR, seasonFileName),
      JSON.stringify(seasonData, null, 2)
    );
    console.log(`\n💾 Season ${seasonLabel} saved to ${seasonFileName}`);
    
    // Also save master file with all seasons so far
    fs.writeFileSync(
      path.join(DATA_DIR, 'football-data-all.json'),
      JSON.stringify(masterData, null, 2)
    );
  }
  
  // Generate summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('✅ SCRAPING COMPLETE!');
  console.log(`${'='.repeat(60)}`);
  
  let totalTeams = 0;
  let totalPlayers = 0;
  
  for (const [seasonId, data] of Object.entries(masterData.seasons)) {
    const teams = Object.keys(data.teams).length;
    const players = Object.keys(data.players).length;
    totalTeams += teams;
    totalPlayers += players;
    console.log(`  ${seasonId}/${parseInt(seasonId)+1}: ${teams} teams, ${players} players`);
  }
  
  console.log(`\n  TOTAL: ${totalTeams} team-seasons, ${totalPlayers} player-seasons`);
  console.log(`\n  Files saved to: src/data/`);
  console.log(`    - football-data-YYYY.json (per season)`);
  console.log(`    - football-data-all.json (combined)`);
}

main().catch(console.error);
