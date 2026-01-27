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

// League configurations
const LEAGUES = {
  primeraFederacion: {
    name: 'Primera Federación',
    groups: [
      { id: 'E3G1', name: 'Grupo 1', url: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1' },
      { id: 'E3G2', name: 'Grupo 2', url: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2' },
    ]
  },
  segundaFederacion: {
    name: 'Segunda Federación',
    groups: [
      { id: 'E4G1', name: 'Grupo 1', url: 'https://www.transfermarkt.es/segunda-federacion-grupo-1/startseite/wettbewerb/E4G1' },
      { id: 'E4G2', name: 'Grupo 2', url: 'https://www.transfermarkt.es/segunda-federacion-grupo-2/startseite/wettbewerb/E4G2' },
      { id: 'E4G3', name: 'Grupo 3', url: 'https://www.transfermarkt.es/segunda-federacion-grupo-3/startseite/wettbewerb/E4G3' },
      { id: 'E4G4', name: 'Grupo 4', url: 'https://www.transfermarkt.es/segunda-federacion-grupo-4/startseite/wettbewerb/E4G4' },
      { id: 'E4G5', name: 'Grupo 5', url: 'https://www.transfermarkt.es/segunda-federacion-grupo-5/startseite/wettbewerb/E4G5' },
    ]
  }
};

async function fetchPage(url) {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.text();
}

async function scrapeTeamsFromGroup(groupUrl) {
  const html = await fetchPage(groupUrl);
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
          squadUrl: `https://www.transfermarkt.es${teamHref.replace('/startseite/', '/kader/')}`
        });
      }
    }
  });
  
  return teams;
}

async function scrapeSquad(team) {
  const squadUrl = `https://www.transfermarkt.es/${team.name.toLowerCase().replace(/\s+/g, '-')}/kader/verein/${team.id}/saison_id/2025`;
  
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
  console.log('🏈 Football Manager Scraper\n');
  
  const allData = {
    leagues: {},
    teams: {},
    players: {},
    scrapedAt: new Date().toISOString()
  };
  
  for (const [leagueKey, league] of Object.entries(LEAGUES)) {
    console.log(`\n📋 ${league.name}`);
    allData.leagues[leagueKey] = {
      name: league.name,
      groups: {}
    };
    
    for (const group of league.groups) {
      console.log(`\n  📁 ${group.name}`);
      
      try {
        const teams = await scrapeTeamsFromGroup(group.url);
        console.log(`    Found ${teams.length} teams`);
        
        allData.leagues[leagueKey].groups[group.id] = {
          name: group.name,
          teamIds: teams.map(t => t.id)
        };
        
        for (const team of teams) {
          console.log(`\n    🏟️  ${team.name}`);
          
          // Store team
          allData.teams[team.id] = {
            id: team.id,
            name: team.name,
            league: leagueKey,
            group: group.id,
            marketValue: parseMarketValue(team.marketValue),
            marketValueDisplay: team.marketValue,
            playerIds: []
          };
          
          // Scrape players
          await delay(1500); // Be nice to the server
          const players = await scrapeSquad(team);
          console.log(`      ${players.length} players`);
          
          for (const player of players) {
            allData.players[player.id] = {
              ...player,
              teamId: team.id,
              marketValueNum: parseMarketValue(player.marketValue)
            };
            allData.teams[team.id].playerIds.push(player.id);
          }
        }
        
        // Save progress after each group
        fs.writeFileSync(
          path.join(DATA_DIR, 'football-data.json'),
          JSON.stringify(allData, null, 2)
        );
        console.log(`\n    💾 Progress saved`);
        
      } catch (error) {
        console.error(`    Error with ${group.name}: ${error.message}`);
      }
      
      await delay(2000);
    }
  }
  
  // Final save
  fs.writeFileSync(
    path.join(DATA_DIR, 'football-data.json'),
    JSON.stringify(allData, null, 2)
  );
  
  console.log(`\n\n✅ Scraping complete!`);
  console.log(`   Teams: ${Object.keys(allData.teams).length}`);
  console.log(`   Players: ${Object.keys(allData.players).length}`);
  console.log(`   Data saved to: src/data/football-data.json`);
}

main().catch(console.error);
