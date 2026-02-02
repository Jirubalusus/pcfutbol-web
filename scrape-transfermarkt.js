/**
 * Transfermarkt Scraper for PC Fútbol Web
 * Scrapes squad data for MLS, Saudi Pro League, Liga MX, J-League
 */

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG
// ============================================================

const LEAGUES = {
  mls: {
    name: 'MLS',
    url: 'https://www.transfermarkt.com/major-league-soccer/startseite/wettbewerb/MLS1/saison_id/2025',
    seasonId: '2025',
    outputFile: 'teams-mls.js',
    exportName: 'mlsTeams',
    maxTeams: 30 // MLS has ~30 teams
  },
  saudi: {
    name: 'Saudi Pro League',
    url: 'https://www.transfermarkt.com/saudi-professional-league/startseite/wettbewerb/SA1/saison_id/2025',
    seasonId: '2025',
    outputFile: 'teams-saudi.js',
    exportName: 'saudiTeams',
    maxTeams: 18
  },
  ligamx: {
    name: 'Liga MX',
    url: 'https://www.transfermarkt.com/liga-mx-clausura/startseite/wettbewerb/MEX1/saison_id/2025',
    seasonId: '2025',
    outputFile: 'teams-ligamx.js',
    exportName: 'ligaMXTeams',
    maxTeams: 18
  },
  jleague: {
    name: 'J-League',
    url: 'https://www.transfermarkt.com/j1-league/startseite/wettbewerb/JAP1/saison_id/2025',
    seasonId: '2025',
    outputFile: 'teams-jleague.js',
    exportName: 'jLeagueTeams',
    maxTeams: 20
  }
};

const BASE_URL = 'https://www.transfermarkt.com';
const OUTPUT_DIR = path.join(__dirname, 'proyectos', 'pcfutbol-web', 'src', 'data');
const DELAY_MS = 1500; // Delay between requests to avoid rate limiting

// ============================================================
// POSITION MAPPING (Transfermarkt English → PC Fútbol abbreviation)
// ============================================================

const POSITION_MAP = {
  'Goalkeeper': 'POR',
  'Centre-Back': 'DFC',
  'Left-Back': 'LTI',
  'Right-Back': 'LTD',
  'Defensive Midfield': 'MCD',
  'Central Midfield': 'MC',
  'Attacking Midfield': 'MCO',
  'Left Midfield': 'MI',
  'Right Midfield': 'MD',
  'Left Winger': 'EI',
  'Right Winger': 'ED',
  'Second Striker': 'MP',
  'Centre-Forward': 'DC'
};

// ============================================================
// NATIONALITY MAPPING (English → Spanish)
// ============================================================

const NATIONALITY_MAP = {
  'Afghanistan': 'Afganistán', 'Albania': 'Albania', 'Algeria': 'Argelia',
  'Andorra': 'Andorra', 'Angola': 'Angola', 'Argentina': 'Argentina',
  'Armenia': 'Armenia', 'Australia': 'Australia', 'Austria': 'Austria',
  'Azerbaijan': 'Azerbaiyán', 'Bahrain': 'Baréin', 'Bangladesh': 'Bangladés',
  'Belarus': 'Bielorrusia', 'Belgium': 'Bélgica', 'Benin': 'Benín',
  'Bolivia': 'Bolivia', 'Bosnia-Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Brazil': 'Brasil', 'Bulgaria': 'Bulgaria', 'Burkina Faso': 'Burkina Faso',
  'Burundi': 'Burundi', 'Cameroon': 'Camerún', 'Canada': 'Canadá',
  'Cape Verde': 'Cabo Verde', 'Central African Republic': 'Rep. Centroafricana',
  'Chad': 'Chad', 'Chile': 'Chile', 'China': 'China', 'Colombia': 'Colombia',
  'Comoros': 'Comoras', 'Congo': 'Congo', 'Congo DR': 'RD Congo',
  'Costa Rica': 'Costa Rica', 'Croatia': 'Croacia', 'Cuba': 'Cuba',
  'Curaçao': 'Curazao', 'Cyprus': 'Chipre', 'Czech Republic': 'Rep. Checa',
  'Czechia': 'Rep. Checa',
  'Denmark': 'Dinamarca', 'Dominican Republic': 'Rep. Dominicana',
  'DR Congo': 'RD Congo',
  'Ecuador': 'Ecuador', 'Egypt': 'Egipto', 'El Salvador': 'El Salvador',
  'England': 'Inglaterra', 'Equatorial Guinea': 'Guinea Ecuatorial',
  'Eritrea': 'Eritrea', 'Estonia': 'Estonia', 'Ethiopia': 'Etiopía',
  'Fiji': 'Fiyi', 'Finland': 'Finlandia', 'France': 'Francia',
  'French Guiana': 'Guayana Francesa', 'Gabon': 'Gabón', 'Gambia': 'Gambia',
  'Georgia': 'Georgia', 'Germany': 'Alemania', 'Ghana': 'Ghana',
  'Greece': 'Grecia', 'Grenada': 'Granada', 'Guadeloupe': 'Guadalupe',
  'Guatemala': 'Guatemala', 'Guinea': 'Guinea', 'Guinea-Bissau': 'Guinea-Bisáu',
  'Guyana': 'Guyana', 'Haiti': 'Haití', 'Honduras': 'Honduras',
  'Hungary': 'Hungría', 'Iceland': 'Islandia', 'India': 'India',
  'Indonesia': 'Indonesia', 'Iran': 'Irán', 'Iraq': 'Irak',
  'Ireland': 'Irlanda', 'Israel': 'Israel', 'Italy': 'Italia',
  'Ivory Coast': 'Costa de Marfil', 'Côte d\'Ivoire': 'Costa de Marfil',
  'Cote d\'Ivoire': 'Costa de Marfil', 'Türkiye': 'Turquía',
  'Jamaica': 'Jamaica', 'Japan': 'Japón',
  'Jordan': 'Jordania', 'Kazakhstan': 'Kazajistán', 'Kenya': 'Kenia',
  'Korea, North': 'Corea del Norte', 'Korea, South': 'Corea del Sur',
  'North Korea': 'Corea del Norte', 'South Korea': 'Corea del Sur',
  'Kosovo': 'Kosovo', 'Kuwait': 'Kuwait', 'Kyrgyzstan': 'Kirguistán',
  'Latvia': 'Letonia', 'Lebanon': 'Líbano', 'Liberia': 'Liberia',
  'Libya': 'Libia', 'Liechtenstein': 'Liechtenstein', 'Lithuania': 'Lituania',
  'Luxembourg': 'Luxemburgo', 'Madagascar': 'Madagascar',
  'Malawi': 'Malaui', 'Malaysia': 'Malasia', 'Mali': 'Malí',
  'Malta': 'Malta', 'Martinique': 'Martinica', 'Mauritania': 'Mauritania',
  'Mauritius': 'Mauricio', 'Mexico': 'México', 'Moldova': 'Moldavia',
  'Monaco': 'Mónaco', 'Mongolia': 'Mongolia', 'Montenegro': 'Montenegro',
  'Morocco': 'Marruecos', 'Mozambique': 'Mozambique', 'Myanmar': 'Myanmar',
  'Namibia': 'Namibia', 'Nepal': 'Nepal', 'Netherlands': 'Países Bajos',
  'New Caledonia': 'Nueva Caledonia', 'New Zealand': 'Nueva Zelanda',
  'Nicaragua': 'Nicaragua', 'Niger': 'Níger', 'Nigeria': 'Nigeria',
  'North Macedonia': 'Macedonia del Norte', 'Northern Ireland': 'Irlanda del Norte',
  'Norway': 'Noruega', 'Oman': 'Omán', 'Pakistan': 'Pakistán',
  'Palestine': 'Palestina', 'Panama': 'Panamá', 'Paraguay': 'Paraguay',
  'Peru': 'Perú', 'Philippines': 'Filipinas', 'Poland': 'Polonia',
  'Portugal': 'Portugal', 'Puerto Rico': 'Puerto Rico', 'Qatar': 'Catar',
  'Romania': 'Rumanía', 'Russia': 'Rusia', 'Rwanda': 'Ruanda',
  'Saudi Arabia': 'Arabia Saudí', 'Scotland': 'Escocia', 'Senegal': 'Senegal',
  'Serbia': 'Serbia', 'Sierra Leone': 'Sierra Leona', 'Singapore': 'Singapur',
  'Slovakia': 'Eslovaquia', 'Slovenia': 'Eslovenia',
  'Somalia': 'Somalia', 'South Africa': 'Sudáfrica', 'South Sudan': 'Sudán del Sur',
  'Spain': 'España', 'Sri Lanka': 'Sri Lanka', 'Sudan': 'Sudán',
  'Suriname': 'Surinam', 'Sweden': 'Suecia', 'Switzerland': 'Suiza',
  'Syria': 'Siria', 'Taiwan': 'Taiwán', 'Tajikistan': 'Tayikistán',
  'Tanzania': 'Tanzania', 'Thailand': 'Tailandia', 'Togo': 'Togo',
  'Trinidad and Tobago': 'Trinidad y Tobago', 'Tunisia': 'Túnez',
  'Turkey': 'Turquía', 'Turkmenistan': 'Turkmenistán',
  'Uganda': 'Uganda', 'Ukraine': 'Ucrania',
  'United Arab Emirates': 'Emiratos Árabes', 'United States': 'Estados Unidos',
  'Uruguay': 'Uruguay', 'Uzbekistan': 'Uzbekistán',
  'Venezuela': 'Venezuela', 'Vietnam': 'Vietnam', 'Wales': 'Gales',
  'Yemen': 'Yemen', 'Zambia': 'Zambia', 'Zimbabwe': 'Zimbabue',
  'Chinese Taipei': 'Taiwán', 'Hong Kong': 'Hong Kong', 'Macau': 'Macao'
};

// ============================================================
// OVR CALCULATION from Market Value + Age
// ============================================================

function parseValue(valueStr) {
  if (!valueStr || valueStr === '-') return 0;
  const clean = valueStr.replace('€', '').trim();
  if (clean.endsWith('m')) return parseFloat(clean) * 1000000;
  if (clean.endsWith('k')) return parseFloat(clean) * 1000;
  return parseFloat(clean) || 0;
}

function calculateOVR(valueInEuros, age, position) {
  const v = valueInEuros / 1000000; // Convert to millions
  
  // Base OVR from market value
  let ovr;
  if (v >= 100) ovr = 91;
  else if (v >= 70) ovr = 89;
  else if (v >= 50) ovr = 87;
  else if (v >= 35) ovr = 85;
  else if (v >= 25) ovr = 83;
  else if (v >= 18) ovr = 81;
  else if (v >= 12) ovr = 79;
  else if (v >= 8) ovr = 77;
  else if (v >= 5) ovr = 75;
  else if (v >= 3.5) ovr = 73;
  else if (v >= 2) ovr = 71;
  else if (v >= 1.2) ovr = 69;
  else if (v >= 0.7) ovr = 67;
  else if (v >= 0.4) ovr = 65;
  else if (v >= 0.15) ovr = 63;
  else if (v >= 0.05) ovr = 61;
  else ovr = 59;
  
  // Age adjustment: young players with high value → slight boost (potential realized)
  if (age <= 21 && v >= 3) ovr = Math.min(ovr + 1, 92);
  // Aging legends: high value despite age → honor their level
  if (age >= 36 && v >= 10) ovr = Math.max(ovr, 85);
  else if (age >= 34 && v >= 5) ovr = Math.max(ovr, Math.min(ovr + 2, 85));
  
  // Goalkeepers tend to maintain value longer
  if (position === 'POR' && age >= 30 && age <= 36 && v >= 1) {
    ovr = Math.max(ovr, ovr + 1);
  }
  
  return Math.min(Math.max(ovr, 55), 93);
}

// ============================================================
// TEAM METADATA (colors, stadiums, etc.)
// We'll generate IDs and keep existing metadata where possible
// ============================================================

function generateTeamId(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateShortName(name) {
  // Common abbreviations
  const abbrevs = {
    'Inter Miami CF': 'MIA', 'Los Angeles FC': 'LAFC', 'LA Galaxy': 'LAG',
    'Atlanta United FC': 'ATL', 'New York Red Bulls': 'NYRB', 'New York City FC': 'NYC',
    'Seattle Sounders FC': 'SEA', 'Portland Timbers': 'POR', 'Columbus Crew': 'CLB',
    'FC Cincinnati': 'CIN', 'Charlotte FC': 'CLT', 'Nashville SC': 'NSH',
    'Orlando City SC': 'ORL', 'Philadelphia Union': 'PHI', 'New England Revolution': 'NE',
    'D.C. United': 'DCU', 'CF Montréal': 'MTL', 'Toronto FC': 'TOR',
    'Chicago Fire FC': 'CHI', 'FC Dallas': 'DAL', 'Houston Dynamo FC': 'HOU',
    'Minnesota United FC': 'MIN', 'Sporting Kansas City': 'SKC', 'Colorado Rapids': 'COL',
    'Real Salt Lake': 'RSL', 'Austin FC': 'ATX', 'San Jose Earthquakes': 'SJ',
    'Vancouver Whitecaps FC': 'VAN', 'St. Louis CITY SC': 'STL', 'San Diego FC': 'SD',
    'St. Louis City SC': 'STL',
    // Saudi
    'Al-Hilal SFC': 'HIL', 'Al-Nassr FC': 'NAS', 'Al-Ahli Saudi FC': 'AHL',
    'Al-Ittihad Club': 'ITT', 'Al-Shabab FC': 'SHA', 'Al-Raed Club': 'RAE',
    'Al-Fateh SC': 'FAT', 'Al-Ettifaq FC': 'ETT', 'Al-Fayha FC': 'FAY',
    'Al-Taawoun FC': 'TAA', 'Al-Riyadh Club': 'RIY', 'Al-Wehda Club': 'WEH',
    'Al-Khaleej FC': 'KHL', 'Al-Okhdood Club': 'OKH', 'Damac FC': 'DAM',
    'Al-Qadisiyah FC': 'QAD', 'Al-Orubah FC': 'ORU', 'Al-Kholood FC': 'KHO',
    // Liga MX
    'Club América': 'AME', 'Guadalajara': 'GDL', 'Cruz Azul': 'CAZ',
    'CF Monterrey': 'MTY', 'Tigres UANL': 'TIG', 'Club León': 'LEO',
    'Toluca': 'TOL', 'Santos Laguna': 'SAN', 'Pumas UNAM': 'PUM',
    'Atlas': 'ATL', 'Pachuca': 'PAC', 'Puebla': 'PUE',
    'Querétaro': 'QRO', 'Necaxa': 'NEC', 'Mazatlán FC': 'MAZ',
    'FC Juárez': 'JUA', 'Atlético de San Luis': 'ASL', 'Tijuana': 'TIJ',
    // J-League  
    'Vissel Kobe': 'KOB', 'Yokohama F. Marinos': 'YFM', 'Kawasaki Frontale': 'KAW',
    'Urawa Red Diamonds': 'URA', 'FC Tokyo': 'TOK', 'Kashima Antlers': 'KAS',
    'Cerezo Osaka': 'OSA', 'Gamba Osaka': 'GAM', 'Sanfrecce Hiroshima': 'HIR',
    'Nagoya Grampus': 'NAG', 'Sagan Tosu': 'SAG', 'Avispa Fukuoka': 'FUK',
    'Consadole Sapporo': 'SAP', 'Kashiwa Reysol': 'REY', 'Kyoto Sanga FC': 'KYO',
    'Tokyo Verdy': 'VER', 'Machida Zelvia': 'MAC', 'Jubilo Iwata': 'IWA',
    'Albirex Niigata': 'NII', 'FC Machida Zelvia': 'MAC'
  };
  
  if (abbrevs[name]) return abbrevs[name];
  
  // Generate from name
  const words = name.replace(/FC|CF|SC|SFC|Club/g, '').trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

// ============================================================
// FETCH WITH RETRY AND DELAY
// ============================================================

async function fetchPage(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.transfermarkt.com/'
  };
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        console.log(`  Rate limited, waiting 10s...`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      if (!res.ok) {
        console.log(`  HTTP ${res.status} for ${url}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.log(`  Error fetching ${url}: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// EXTRACT TEAM LIST FROM LEAGUE PAGE
// ============================================================

async function getTeamList(leagueUrl) {
  console.log(`Fetching league page: ${leagueUrl}`);
  const html = await fetchPage(leagueUrl);
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const teams = [];
  
  // Teams are in the main table with class "items"
  // Each team row has a link to the team page
  $('table.items tbody tr').each((i, row) => {
    const teamLink = $(row).find('td.hauptlink a').first();
    if (teamLink.length) {
      const href = teamLink.attr('href');
      const name = teamLink.text().trim();
      if (href && name && href.includes('/startseite/verein/')) {
        // Extract verein ID from URL
        const match = href.match(/\/verein\/(\d+)/);
        if (match) {
          teams.push({
            name,
            vereinId: match[1],
            href
          });
        }
      }
    }
  });
  
  // Deduplicate
  const seen = new Set();
  return teams.filter(t => {
    if (seen.has(t.vereinId)) return false;
    seen.add(t.vereinId);
    return true;
  });
}

// ============================================================
// EXTRACT SQUAD FROM TEAM KADER PAGE
// ============================================================

async function getSquad(teamName, vereinId, seasonId) {
  // Use the /plus/1 detailed view for nationality
  const slug = teamName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  
  const url = `${BASE_URL}/${slug}/kader/verein/${vereinId}/saison_id/${seasonId}/plus/1`;
  console.log(`  Fetching squad: ${teamName} (${url})`);
  
  let html = await fetchPage(url);
  
  // If 404, try with just the verein ID (slug might be wrong)
  if (!html) {
    // Try alternative URL with a simpler approach
    const altUrl = `${BASE_URL}/x/kader/verein/${vereinId}/saison_id/${seasonId}/plus/1`;
    console.log(`  Retrying with alt URL...`);
    html = await fetchPage(altUrl);
  }
  
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const players = [];
  
  // Also try to get stadium info from the page
  let stadium = '';
  let stadiumCapacity = 0;
  const stadiumLink = $('li:contains("Stadium:") a, li:contains("Stadion:") a').first();
  if (stadiumLink.length) {
    stadium = stadiumLink.text().trim();
    const capMatch = stadiumLink.parent().text().match(/([\d.]+)\s*Seats/);
    if (capMatch) stadiumCapacity = parseInt(capMatch[1].replace('.', ''));
  }
  
  // Extract players from the items table
  $('table.items > tbody > tr').each((i, row) => {
    const $row = $(row);
    
    // Get player name
    const nameLink = $row.find('td.hauptlink a[href*="/profil/spieler/"]').first();
    if (!nameLink.length) return;
    
    const name = nameLink.text().trim();
    if (!name) return;
    
    // Get position
    const posCell = $row.find('table.inline-table tr:last-child td').first();
    const posText = posCell.text().trim();
    const position = POSITION_MAP[posText] || posText;
    
    // Skip if position is not in our map (likely a header row or invalid)
    if (!POSITION_MAP[posText]) return;
    
    // Get age
    let age = 0;
    $row.find('td.zentriert').each((j, cell) => {
      const text = $(cell).text().trim();
      const ageMatch = text.match(/\((\d+)\)/);
      if (ageMatch) age = parseInt(ageMatch[1]);
    });
    
    // Get nationality (from flag image title attributes)
    const nationalities = [];
    $row.find('td.zentriert img.flaggenrahmen').each((j, flag) => {
      const title = $(flag).attr('title') || $(flag).attr('alt') || '';
      if (title) nationalities.push(title);
    });
    
    // Get market value
    const valueLink = $row.find('td.rechts a[href*="/marktwertverlauf/"]').first();
    const valueStr = valueLink.length ? valueLink.text().trim() : '';
    const valueNum = parseValue(valueStr);
    
    // Only add if we have valid data
    if (name && position && age > 0) {
      const nat = nationalities[0] || 'Unknown';
      const natEs = NATIONALITY_MAP[nat] || nat;
      const ovr = calculateOVR(valueNum, age, position);
      
      players.push({
        name,
        position,
        age,
        overall: ovr,
        nationality: natEs,
        value: valueNum
      });
    }
  });
  
  return { players, stadium, stadiumCapacity };
}

// ============================================================
// GET TEAM METADATA FROM TEAM PAGE
// ============================================================

async function getTeamMeta(vereinId) {
  const url = `${BASE_URL}/x/datenfakten/verein/${vereinId}`;
  // We'll extract from the kader page header instead since we already fetch it
  return {};
}

// ============================================================
// GENERATE OUTPUT FILE
// ============================================================

function generateOutputFile(league, teams) {
  const lines = [];
  lines.push(`// ============================================================`);
  lines.push(`// ${league.name} 2025-26 - Real teams and players data (scraped from Transfermarkt)`);
  lines.push(`// ============================================================`);
  lines.push('');
  lines.push(`export const ${league.exportName} = [`);
  
  teams.forEach((team, idx) => {
    lines.push('  {');
    lines.push(`    id: '${team.id}',`);
    lines.push(`    name: '${team.name.replace(/'/g, "\\'")}',`);
    lines.push(`    shortName: '${team.shortName}',`);
    lines.push(`    city: '${(team.city || '').replace(/'/g, "\\'")}',`);
    lines.push(`    colors: { primary: '${team.colors?.primary || '#000000'}', secondary: '${team.colors?.secondary || '#FFFFFF'}' },`);
    lines.push(`    stadium: '${(team.stadium || '').replace(/'/g, "\\'")}',`);
    lines.push(`    stadiumCapacity: ${team.stadiumCapacity || 0},`);
    lines.push(`    reputation: ${team.reputation || 3},`);
    lines.push('    players: [');
    
    team.players.forEach((p, j) => {
      const comma = j < team.players.length - 1 ? ',' : '';
      lines.push(`      { name: '${p.name.replace(/'/g, "\\'")}', position: '${p.position}', age: ${p.age}, overall: ${p.overall}, nationality: '${p.nationality.replace(/'/g, "\\'")}', value: ${p.value} }${comma}`);
    });
    
    lines.push('    ]');
    lines.push(idx < teams.length - 1 ? '  },' : '  }');
  });
  
  lines.push('];');
  lines.push('');
  
  return lines.join('\n');
}

// ============================================================
// MAIN
// ============================================================

async function scrapeLeague(leagueKey) {
  const league = LEAGUES[leagueKey];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping ${league.name}...`);
  console.log('='.repeat(60));
  
  // Step 1: Get team list
  const teamList = await getTeamList(league.url);
  console.log(`Found ${teamList.length} teams`);
  
  if (teamList.length === 0) {
    console.log(`ERROR: No teams found for ${league.name}! Trying alternative URL...`);
    return null;
  }
  
  // Step 2: Scrape each team
  const teams = [];
  for (let i = 0; i < teamList.length; i++) {
    const t = teamList[i];
    console.log(`\n[${i + 1}/${teamList.length}] ${t.name}`);
    
    await sleep(DELAY_MS);
    
    const result = await getSquad(t.name, t.vereinId, league.seasonId);
    
    if (!result || !result.players || result.players.length === 0) {
      console.log(`  WARNING: No players found for ${t.name}, skipping`);
      continue;
    }
    
    console.log(`  Found ${result.players.length} players`);
    
    teams.push({
      id: generateTeamId(t.name),
      name: t.name,
      shortName: generateShortName(t.name),
      city: '', // Will need to fill from existing data or manually
      colors: { primary: '#000000', secondary: '#FFFFFF' },
      stadium: result.stadium || '',
      stadiumCapacity: result.stadiumCapacity || 0,
      reputation: 3,
      players: result.players
    });
  }
  
  console.log(`\nTotal teams scraped: ${teams.length}`);
  
  // Save raw JSON for reference
  const jsonPath = path.join(__dirname, `scraped-${leagueKey}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(teams, null, 2));
  console.log(`Raw data saved to ${jsonPath}`);
  
  return teams;
}

async function main() {
  const args = process.argv.slice(2);
  const leaguesToScrape = args.length > 0 ? args : Object.keys(LEAGUES);
  
  console.log(`Starting Transfermarkt scraper for: ${leaguesToScrape.join(', ')}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  for (const key of leaguesToScrape) {
    if (!LEAGUES[key]) {
      console.log(`Unknown league: ${key}`);
      continue;
    }
    
    const teams = await scrapeLeague(key);
    if (teams && teams.length > 0) {
      console.log(`\nSuccessfully scraped ${teams.length} teams for ${LEAGUES[key].name}`);
    }
  }
  
  console.log('\n\nDone! JSON files saved. Run merge script to combine with existing metadata.');
}

main().catch(console.error);
