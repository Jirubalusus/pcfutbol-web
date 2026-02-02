/**
 * Merge scraped Transfermarkt data with existing team metadata
 * Generates final JS files for PC Fútbol Web
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'proyectos', 'pcfutbol-web', 'src', 'data');

// ============================================================
// EXISTING METADATA (extracted from current team files)
// ============================================================

const EXISTING_META = {
  mls: {
    'inter-miami': { name: 'Inter Miami CF', shortName: 'MIA', city: 'Fort Lauderdale', primary: '#F7B5CD', secondary: '#231F20', stadium: 'Chase Stadium', capacity: 21550, reputation: 5 },
    'lafc': { name: 'Los Angeles FC', shortName: 'LAFC', city: 'Los Ángeles', primary: '#C39E6D', secondary: '#000000', stadium: 'BMO Stadium', capacity: 22000, reputation: 4 },
    'la-galaxy': { name: 'LA Galaxy', shortName: 'LAG', city: 'Carson', primary: '#00245D', secondary: '#FFD200', stadium: 'Dignity Health Sports Park', capacity: 27000, reputation: 4 },
    'atlanta-united': { name: 'Atlanta United FC', shortName: 'ATL', city: 'Atlanta', primary: '#80000A', secondary: '#231F20', stadium: 'Mercedes-Benz Stadium', capacity: 42500, reputation: 4 },
    'seattle-sounders': { name: 'Seattle Sounders FC', shortName: 'SEA', city: 'Seattle', primary: '#236192', secondary: '#68A028', stadium: 'Lumen Field', capacity: 37722, reputation: 4 },
    'columbus-crew': { name: 'Columbus Crew', shortName: 'CLB', city: 'Columbus', primary: '#000000', secondary: '#FFD200', stadium: 'Lower.com Field', capacity: 20371, reputation: 4 },
    'fc-cincinnati': { name: 'FC Cincinnati', shortName: 'CIN', city: 'Cincinnati', primary: '#003087', secondary: '#FE5000', stadium: 'TQL Stadium', capacity: 26000, reputation: 3 },
    'nashville-sc': { name: 'Nashville SC', shortName: 'NSH', city: 'Nashville', primary: '#ECE83A', secondary: '#1F1646', stadium: 'GEODIS Park', capacity: 30000, reputation: 3 },
    'philadelphia-union': { name: 'Philadelphia Union', shortName: 'PHI', city: 'Chester', primary: '#071B2C', secondary: '#B48B42', stadium: 'Subaru Park', capacity: 18500, reputation: 3 },
    'new-york-city-fc': { name: 'New York City FC', shortName: 'NYC', city: 'Nueva York', primary: '#6CACE4', secondary: '#F1612B', stadium: 'Yankee Stadium', capacity: 28743, reputation: 4 },
    'new-york-red-bulls': { name: 'New York Red Bulls', shortName: 'NYRB', city: 'Harrison', primary: '#ED1E36', secondary: '#FFCD00', stadium: 'Red Bull Arena', capacity: 25000, reputation: 3 },
    'portland-timbers': { name: 'Portland Timbers', shortName: 'POR', city: 'Portland', primary: '#004812', secondary: '#D69F00', stadium: 'Providence Park', capacity: 25218, reputation: 3 },
    'austin-fc': { name: 'Austin FC', shortName: 'ATX', city: 'Austin', primary: '#00B140', secondary: '#000000', stadium: 'Q2 Stadium', capacity: 20738, reputation: 3 },
    'real-salt-lake': { name: 'Real Salt Lake', shortName: 'RSL', city: 'Sandy', primary: '#B30838', secondary: '#013A81', stadium: 'America First Field', capacity: 20213, reputation: 3 },
    'minnesota-united': { name: 'Minnesota United FC', shortName: 'MIN', city: 'Saint Paul', primary: '#E4E5E6', secondary: '#8CD2F4', stadium: 'Allianz Field', capacity: 19400, reputation: 3 },
    'orlando-city': { name: 'Orlando City SC', shortName: 'ORL', city: 'Orlando', primary: '#633492', secondary: '#FDE192', stadium: 'Exploria Stadium', capacity: 25500, reputation: 3 },
    'charlotte-fc': { name: 'Charlotte FC', shortName: 'CLT', city: 'Charlotte', primary: '#1A85C8', secondary: '#000000', stadium: 'Bank of America Stadium', capacity: 38000, reputation: 3 },
    'toronto-fc': { name: 'Toronto FC', shortName: 'TOR', city: 'Toronto', primary: '#E31937', secondary: '#A1AAAD', stadium: 'BMO Field', capacity: 30000, reputation: 3 },
    'dc-united': { name: 'D.C. United', shortName: 'DCU', city: 'Washington D.C.', primary: '#000000', secondary: '#EF3E42', stadium: 'Audi Field', capacity: 20000, reputation: 3 },
    'cf-montreal': { name: 'CF Montréal', shortName: 'MTL', city: 'Montreal', primary: '#000000', secondary: '#0033A1', stadium: 'Stade Saputo', capacity: 19619, reputation: 3 },
    // NEW TEAMS (not in original 20)
    'vancouver-whitecaps': { name: 'Vancouver Whitecaps FC', shortName: 'VAN', city: 'Vancouver', primary: '#00245D', secondary: '#9DC2EA', stadium: 'BC Place', capacity: 22120, reputation: 3 },
    'san-diego-fc': { name: 'San Diego FC', shortName: 'SD', city: 'San Diego', primary: '#00205B', secondary: '#C5B783', stadium: 'Snapdragon Stadium', capacity: 35000, reputation: 3 },
    'chicago-fire': { name: 'Chicago Fire FC', shortName: 'CHI', city: 'Chicago', primary: '#AF2626', secondary: '#0A174A', stadium: 'Soldier Field', capacity: 20000, reputation: 3 },
    'houston-dynamo': { name: 'Houston Dynamo FC', shortName: 'HOU', city: 'Houston', primary: '#FF6B00', secondary: '#101820', stadium: 'Shell Energy Stadium', capacity: 22039, reputation: 3 },
    'new-england-revolution': { name: 'New England Revolution', shortName: 'NE', city: 'Foxborough', primary: '#0A2240', secondary: '#CE0E2D', stadium: 'Gillette Stadium', capacity: 20000, reputation: 3 },
    'st-louis-city-sc': { name: 'St. Louis CITY SC', shortName: 'STL', city: 'St. Louis', primary: '#C8102E', secondary: '#0A2240', stadium: 'CityPark', capacity: 22500, reputation: 3 },
    'colorado-rapids': { name: 'Colorado Rapids', shortName: 'COL', city: 'Commerce City', primary: '#862633', secondary: '#8BB8E8', stadium: 'DICK\'S Sporting Goods Park', capacity: 18061, reputation: 3 },
    'fc-dallas': { name: 'FC Dallas', shortName: 'DAL', city: 'Frisco', primary: '#BF0D3E', secondary: '#002D72', stadium: 'Toyota Stadium', capacity: 20500, reputation: 3 },
    'sporting-kansas-city': { name: 'Sporting Kansas City', shortName: 'SKC', city: 'Kansas City', primary: '#93B1D7', secondary: '#002A5C', stadium: 'Children\'s Mercy Park', capacity: 18467, reputation: 3 },
    'san-jose-earthquakes': { name: 'San Jose Earthquakes', shortName: 'SJ', city: 'San José', primary: '#0051A5', secondary: '#000000', stadium: 'PayPal Park', capacity: 18000, reputation: 2 },
  },
  saudi: {
    'al-hilal-sfc': { name: 'Al-Hilal SFC', shortName: 'HIL', city: 'Riad', primary: '#0033A0', secondary: '#FFFFFF', stadium: 'Kingdom Arena', capacity: 67000, reputation: 5 },
    'al-nassr-fc': { name: 'Al-Nassr FC', shortName: 'NAS', city: 'Riad', primary: '#FFCC00', secondary: '#003399', stadium: 'Al-Awwal Park', capacity: 25000, reputation: 5 },
    'al-ahli-sfc': { name: 'Al-Ahli SFC', shortName: 'AHL', city: 'Yeda', primary: '#006633', secondary: '#FFFFFF', stadium: 'King Abdullah Sports City', capacity: 62345, reputation: 5 },
    'al-ittihad-club': { name: 'Al-Ittihad Club', shortName: 'ITT', city: 'Yeda', primary: '#FFD700', secondary: '#000000', stadium: 'King Abdullah Sports City', capacity: 62345, reputation: 4 },
    'al-shabab-fc': { name: 'Al-Shabab FC', shortName: 'SHA', city: 'Riad', primary: '#FFFFFF', secondary: '#000000', stadium: 'Al-Shabab Club Stadium', capacity: 12000, reputation: 3 },
    'al-fateh-sc': { name: 'Al-Fateh SC', shortName: 'FAT', city: 'Al-Hasa', primary: '#006633', secondary: '#FFFFFF', stadium: 'Prince Abdullah bin Jalawi', capacity: 22000, reputation: 3 },
    'al-ettifaq-fc': { name: 'Al-Ettifaq FC', shortName: 'ETT', city: 'Dammam', primary: '#4B0082', secondary: '#FFFFFF', stadium: 'Prince Mohamed bin Fahd', capacity: 35000, reputation: 3 },
    'al-fayha-fc': { name: 'Al-Fayha FC', shortName: 'FAY', city: 'Al-Majma\'ah', primary: '#FF0000', secondary: '#FFFFFF', stadium: 'Al-Majma\'ah Sports City', capacity: 10000, reputation: 2 },
    'al-taawoun-fc': { name: 'Al-Taawoun FC', shortName: 'TAA', city: 'Buraidah', primary: '#FFD700', secondary: '#003366', stadium: 'King Abdullah Sports City', capacity: 25000, reputation: 3 },
    'al-riyadh-sc': { name: 'Al-Riyadh SC', shortName: 'RIY', city: 'Riad', primary: '#003366', secondary: '#FFFFFF', stadium: 'Prince Turki bin Abdulaziz', capacity: 10000, reputation: 2 },
    'al-khaleej-fc': { name: 'Al-Khaleej FC', shortName: 'KHL', city: 'Saihat', primary: '#006633', secondary: '#FFD700', stadium: 'Prince Saud bin Jalawi', capacity: 15000, reputation: 2 },
    'al-okhdood-club': { name: 'Al-Okhdood Club', shortName: 'OKH', city: 'Najrán', primary: '#800080', secondary: '#FFFFFF', stadium: 'Prince Hazza bin Abdulaziz', capacity: 8000, reputation: 2 },
    'damac-fc': { name: 'Damac FC', shortName: 'DAM', city: 'Abha', primary: '#8B4513', secondary: '#FFD700', stadium: 'Prince Sultan bin Abdulaziz', capacity: 12000, reputation: 2 },
    'al-kholood-fc': { name: 'Al-Kholood FC', shortName: 'KHO', city: 'Al-Ahsa', primary: '#00BFFF', secondary: '#FFFFFF', stadium: 'Al-Hasa Sports City', capacity: 10000, reputation: 2 },
    // NEW/CHANGED teams in 25/26
    'al-qadsiah-fc': { name: 'Al-Qadsiah FC', shortName: 'QAD', city: 'Khobar', primary: '#FFD700', secondary: '#000000', stadium: 'Prince Saud bin Jalawi', capacity: 15000, reputation: 3 },
    'neom-sc': { name: 'NEOM SC', shortName: 'NEO', city: 'NEOM', primary: '#1A1A2E', secondary: '#E94560', stadium: 'NEOM Stadium', capacity: 10000, reputation: 3 },
    'al-najma-sc': { name: 'Al-Najma SC', shortName: 'NAJ', city: 'Al-Ahsa', primary: '#FF4500', secondary: '#FFFFFF', stadium: 'Al-Hasa Sports City', capacity: 10000, reputation: 2 },
    'al-hazem-sc': { name: 'Al-Hazem SC', shortName: 'HAZ', city: 'Ar Rass', primary: '#FFD700', secondary: '#800080', stadium: 'Al-Hazem Club Stadium', capacity: 8000, reputation: 2 },
  },
  ligamx: {
    'cf-america': { name: 'Club América', shortName: 'AME', city: 'Ciudad de México', primary: '#FFD200', secondary: '#002D62', stadium: 'Estadio Azteca', capacity: 87523, reputation: 5 },
    'deportivo-guadalajara': { name: 'Guadalajara', shortName: 'GDL', city: 'Guadalajara', primary: '#C8102E', secondary: '#002D72', stadium: 'Estadio Akron', capacity: 49850, reputation: 5 },
    'cd-cruz-azul': { name: 'Cruz Azul', shortName: 'CAZ', city: 'Ciudad de México', primary: '#003DA5', secondary: '#ED1C24', stadium: 'Estadio Azul', capacity: 33042, reputation: 5 },
    'cf-monterrey': { name: 'CF Monterrey', shortName: 'MTY', city: 'Monterrey', primary: '#002D72', secondary: '#FFFFFF', stadium: 'Estadio BBVA', capacity: 51348, reputation: 5 },
    'tigres-uanl': { name: 'Tigres UANL', shortName: 'TIG', city: 'Monterrey', primary: '#FFCC00', secondary: '#002D72', stadium: 'Estadio Universitario', capacity: 42000, reputation: 5 },
    'club-leon-fc': { name: 'Club León', shortName: 'LEO', city: 'León', primary: '#006847', secondary: '#FFFFFF', stadium: 'Estadio León', capacity: 32168, reputation: 4 },
    'deportivo-toluca': { name: 'Deportivo Toluca', shortName: 'TOL', city: 'Toluca', primary: '#CC0000', secondary: '#FFFFFF', stadium: 'Estadio Nemesio Diez', capacity: 27000, reputation: 4 },
    'santos-laguna': { name: 'Santos Laguna', shortName: 'SAN', city: 'Torreón', primary: '#006847', secondary: '#FFFFFF', stadium: 'Estadio Corona', capacity: 30000, reputation: 4 },
    'unam-pumas': { name: 'Pumas UNAM', shortName: 'PUM', city: 'Ciudad de México', primary: '#002D72', secondary: '#CBA052', stadium: 'Estadio Olímpico Universitario', capacity: 63186, reputation: 4 },
    'atlas-guadalajara': { name: 'Atlas', shortName: 'ATL', city: 'Guadalajara', primary: '#BF0811', secondary: '#000000', stadium: 'Estadio Jalisco', capacity: 55000, reputation: 3 },
    'cf-pachuca': { name: 'CF Pachuca', shortName: 'PAC', city: 'Pachuca', primary: '#002D62', secondary: '#FFFFFF', stadium: 'Estadio Hidalgo', capacity: 30000, reputation: 4 },
    'puebla-fc': { name: 'Puebla FC', shortName: 'PUE', city: 'Puebla', primary: '#003DA5', secondary: '#FFFFFF', stadium: 'Estadio Cuauhtémoc', capacity: 40535, reputation: 3 },
    'queretaro-fc': { name: 'Querétaro FC', shortName: 'QRO', city: 'Querétaro', primary: '#003DA5', secondary: '#C8102E', stadium: 'Estadio Corregidora', capacity: 34165, reputation: 3 },
    'club-necaxa': { name: 'Club Necaxa', shortName: 'NEC', city: 'Aguascalientes', primary: '#C8102E', secondary: '#FFFFFF', stadium: 'Estadio Victoria', capacity: 23000, reputation: 3 },
    'mazatlan-fc': { name: 'Mazatlán FC', shortName: 'MAZ', city: 'Mazatlán', primary: '#5B2C6F', secondary: '#FFD700', stadium: 'Estadio El Kraken', capacity: 25000, reputation: 2 },
    'fc-juarez': { name: 'FC Juárez', shortName: 'JUA', city: 'Ciudad Juárez', primary: '#000000', secondary: '#B87333', stadium: 'Estadio Olímpico Benito Juárez', capacity: 19703, reputation: 2 },
    'atletico-de-san-luis': { name: 'Atlético de San Luis', shortName: 'ASL', city: 'San Luis Potosí', primary: '#C8102E', secondary: '#002D72', stadium: 'Estadio Alfonso Lastras', capacity: 25000, reputation: 3 },
    'club-tijuana': { name: 'Club Tijuana', shortName: 'TIJ', city: 'Tijuana', primary: '#C8102E', secondary: '#000000', stadium: 'Estadio Caliente', capacity: 33333, reputation: 3 },
  },
  jleague: {
    'vissel-kobe': { name: 'Vissel Kobe', shortName: 'KOB', city: 'Kobe', primary: '#8B0000', secondary: '#FFFFFF', stadium: 'Noevir Stadium Kobe', capacity: 30132, reputation: 5 },
    'yokohama-f-marinos': { name: 'Yokohama F. Marinos', shortName: 'YFM', city: 'Yokohama', primary: '#0038A8', secondary: '#C8102E', stadium: 'Nissan Stadium', capacity: 72327, reputation: 4 },
    'kawasaki-frontale': { name: 'Kawasaki Frontale', shortName: 'KAW', city: 'Kawasaki', primary: '#009FE3', secondary: '#000000', stadium: 'Todoroki Athletics Stadium', capacity: 26232, reputation: 4 },
    'urawa-red-diamonds': { name: 'Urawa Red Diamonds', shortName: 'URA', city: 'Saitama', primary: '#E4002B', secondary: '#FFFFFF', stadium: 'Saitama Stadium 2002', capacity: 63700, reputation: 4 },
    'fc-tokyo': { name: 'FC Tokyo', shortName: 'TOK', city: 'Tokio', primary: '#003DA5', secondary: '#C8102E', stadium: 'Ajinomoto Stadium', capacity: 49970, reputation: 4 },
    'kashima-antlers': { name: 'Kashima Antlers', shortName: 'KAS', city: 'Kashima', primary: '#800020', secondary: '#002D62', stadium: 'Kashima Soccer Stadium', capacity: 40728, reputation: 4 },
    'cerezo-osaka': { name: 'Cerezo Osaka', shortName: 'OSA', city: 'Osaka', primary: '#E80060', secondary: '#002D62', stadium: 'Yodoko Sakura Stadium', capacity: 24481, reputation: 3 },
    'gamba-osaka': { name: 'Gamba Osaka', shortName: 'GAM', city: 'Suita', primary: '#002D62', secondary: '#000000', stadium: 'Panasonic Stadium Suita', capacity: 39694, reputation: 3 },
    'sanfrecce-hiroshima': { name: 'Sanfrecce Hiroshima', shortName: 'HIR', city: 'Hiroshima', primary: '#7B2D8E', secondary: '#FFFFFF', stadium: 'EDION Peace Wing Stadium', capacity: 28500, reputation: 3 },
    'nagoya-grampus': { name: 'Nagoya Grampus', shortName: 'NAG', city: 'Nagoya', primary: '#E35205', secondary: '#003DA5', stadium: 'Toyota Stadium', capacity: 43739, reputation: 3 },
    'avispa-fukuoka': { name: 'Avispa Fukuoka', shortName: 'FUK', city: 'Fukuoka', primary: '#002D62', secondary: '#009B3A', stadium: 'Best Denki Stadium', capacity: 22563, reputation: 3 },
    'kashiwa-reysol': { name: 'Kashiwa Reysol', shortName: 'REY', city: 'Kashiwa', primary: '#FFD700', secondary: '#000000', stadium: 'Sankyo Frontier Kashiwa', capacity: 15349, reputation: 3 },
    'kyoto-sanga': { name: 'Kyoto Sanga FC', shortName: 'KYO', city: 'Kioto', primary: '#7B2D8E', secondary: '#FFFFFF', stadium: 'Sanga Stadium by KYOCERA', capacity: 21600, reputation: 3 },
    'tokyo-verdy': { name: 'Tokyo Verdy', shortName: 'VER', city: 'Tokio', primary: '#006400', secondary: '#FFFFFF', stadium: 'Ajinomoto Stadium', capacity: 49970, reputation: 3 },
    'machida-zelvia': { name: 'FC Machida Zelvia', shortName: 'MAC', city: 'Machida', primary: '#003DA5', secondary: '#FFD700', stadium: 'Machida GION Stadium', capacity: 15300, reputation: 2 },
    // NEW teams for 2025 J1
    'mito-hollyhock': { name: 'Mito HollyHock', shortName: 'MIT', city: 'Mito', primary: '#003DA5', secondary: '#FFFFFF', stadium: 'K\'s Denki Stadium Mito', capacity: 12000, reputation: 2 },
    'jef-united-chiba': { name: 'JEF United Chiba', shortName: 'JEF', city: 'Chiba', primary: '#006400', secondary: '#FFD700', stadium: 'Fukuda Denshi Arena', capacity: 19781, reputation: 2 },
    'shimizu-s-pulse': { name: 'Shimizu S-Pulse', shortName: 'SHI', city: 'Shizuoka', primary: '#FF6600', secondary: '#FFFFFF', stadium: 'IAI Stadium Nihondaira', capacity: 20248, reputation: 3 },
    'fagiano-okayama': { name: 'Fagiano Okayama', shortName: 'OKA', city: 'Okayama', primary: '#8B0000', secondary: '#FFFFFF', stadium: 'City Light Stadium', capacity: 20000, reputation: 2 },
    'v-varen-nagasaki': { name: 'V-Varen Nagasaki', shortName: 'VVN', city: 'Nagasaki', primary: '#003DA5', secondary: '#FF6600', stadium: 'Peace Stadium', capacity: 20000, reputation: 2 },
  }
};

// ============================================================
// REPUTATION CALCULATION
// ============================================================

function calculateReputation(players) {
  if (!players || players.length === 0) return 2;
  const totalValue = players.reduce((sum, p) => sum + p.value, 0);
  const avgOvr = players.reduce((sum, p) => sum + p.overall, 0) / players.length;
  const maxOvr = Math.max(...players.map(p => p.overall));
  
  if (totalValue > 200000000 || maxOvr >= 88) return 5;
  if (totalValue > 80000000 || maxOvr >= 84) return 4;
  if (totalValue > 30000000 || avgOvr >= 72) return 3;
  return 2;
}

// ============================================================
// NAME MATCHING (fuzzy match scraped names to existing metadata)
// ============================================================

function normalizeForMatch(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/(fc|cf|sc|sfc|club|deportivo)/g, '');
}

// Explicit scraped-ID → meta-key mappings for tricky cases
const EXPLICIT_MAP = {
  'los-angeles-galaxy': 'la-galaxy',
  'real-salt-lake-city': 'real-salt-lake',
  'dc-united': 'dc-united',
  'al-kholood-club': 'al-kholood-fc',
  'al-okhdood-club': 'al-okhdood-club',
  'cd-cruz-azul': 'cd-cruz-azul',
  'atlas-guadalajara': 'atlas-guadalajara',
  'kyoto-sanga': 'kyoto-sanga',
  'machida-zelvia': 'machida-zelvia',
};

function findMetaMatch(scrapedName, metaMap) {
  // Build scraped ID
  const scrapedId = scrapedName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  
  // 1. Explicit mapping
  const explicitKey = EXPLICIT_MAP[scrapedId];
  if (explicitKey && metaMap[explicitKey]) return metaMap[explicitKey];
  
  // 2. Exact ID match
  if (metaMap[scrapedId]) return metaMap[scrapedId];
  
  // 3. Fuzzy match - require at least 5 chars overlap to avoid "la" matching everything
  const norm = normalizeForMatch(scrapedName);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, meta] of Object.entries(metaMap)) {
    const keyNorm = normalizeForMatch(key);
    const nameNorm = normalizeForMatch(meta.name);
    
    // Exact normalized match
    if (norm === keyNorm || norm === nameNorm) return meta;
    
    // Substring match but only if the match portion is >= 5 chars
    if (keyNorm.length >= 5 && (norm.includes(keyNorm) || keyNorm.includes(norm))) {
      const score = keyNorm.length;
      if (score > bestScore) { bestScore = score; bestMatch = meta; }
    }
    if (nameNorm.length >= 5 && (norm.includes(nameNorm) || nameNorm.includes(norm))) {
      const score = nameNorm.length;
      if (score > bestScore) { bestScore = score; bestMatch = meta; }
    }
  }
  
  return bestMatch;
}

// ============================================================
// GENERATE JS FILE
// ============================================================

function generateJS(exportName, leagueName, teams) {
  const lines = [];
  lines.push(`// ============================================================`);
  lines.push(`// ${leagueName} 2025-26 - Real teams and players data (scraped from Transfermarkt)`);
  lines.push(`// ============================================================`);
  lines.push('');
  lines.push(`export const ${exportName} = [`);
  
  teams.forEach((team, idx) => {
    lines.push('  {');
    lines.push(`    id: '${team.id}',`);
    lines.push(`    name: '${esc(team.name)}',`);
    lines.push(`    shortName: '${esc(team.shortName)}',`);
    lines.push(`    city: '${esc(team.city)}',`);
    lines.push(`    colors: { primary: '${team.primary}', secondary: '${team.secondary}' },`);
    lines.push(`    stadium: '${esc(team.stadium)}',`);
    lines.push(`    stadiumCapacity: ${team.capacity},`);
    lines.push(`    reputation: ${team.reputation},`);
    lines.push('    players: [');
    
    team.players.forEach((p, j) => {
      const comma = j < team.players.length - 1 ? ',' : '';
      lines.push(`      { name: '${esc(p.name)}', position: '${p.position}', age: ${p.age}, overall: ${p.overall}, nationality: '${esc(p.nationality)}', value: ${p.value} }${comma}`);
    });
    
    lines.push('    ]');
    lines.push(idx < teams.length - 1 ? '  },' : '  }');
  });
  
  lines.push('];');
  lines.push('');
  
  return lines.join('\n');
}

function esc(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================================
// MAIN MERGE
// ============================================================

function mergeLeague(leagueKey, exportName, leagueName, outputFile) {
  const scrapedPath = path.join(__dirname, `scraped-${leagueKey}.json`);
  if (!fs.existsSync(scrapedPath)) {
    console.log(`No scraped data for ${leagueKey}`);
    return;
  }
  
  const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
  const metaMap = EXISTING_META[leagueKey] || {};
  
  console.log(`\nMerging ${leagueName}: ${scraped.length} teams`);
  
  const teams = scraped.map(team => {
    const meta = findMetaMatch(team.name, metaMap);
    
    // Cap players at 23 (standard squad size)
    let players = team.players;
    if (players.length > 23) {
      // Sort by value desc and keep top 23
      players = [...players].sort((a, b) => b.value - a.value).slice(0, 23);
    }
    
    const rep = meta?.reputation || calculateReputation(players);
    
    const merged = {
      id: meta ? Object.keys(metaMap).find(k => metaMap[k] === meta) || team.id : team.id,
      name: meta?.name || team.name,
      shortName: meta?.shortName || team.shortName,
      city: meta?.city || '',
      primary: meta?.primary || '#000000',
      secondary: meta?.secondary || '#FFFFFF',
      stadium: meta?.stadium || team.stadium || '',
      capacity: meta?.capacity || team.stadiumCapacity || 0,
      reputation: rep,
      players
    };
    
    if (!meta) {
      console.log(`  ⚠️  No metadata match for: ${team.name} (id: ${team.id})`);
    } else {
      console.log(`  ✅ ${team.name} → ${meta.name} (${players.length} players)`);
    }
    
    return merged;
  });
  
  // Fix any remaining untranslated nationalities
  fixNationalities(teams);
  
  const js = generateJS(exportName, leagueName, teams);
  const outPath = path.join(OUTPUT_DIR, outputFile);
  fs.writeFileSync(outPath, js);
  console.log(`  📄 Written to ${outPath} (${(js.length / 1024).toFixed(1)} KB)`);
  
  // Stats
  const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
  const avgOvr = teams.reduce((s, t) => s + t.players.reduce((ps, p) => ps + p.overall, 0), 0) / totalPlayers;
  console.log(`  📊 ${teams.length} teams, ${totalPlayers} players, avg OVR: ${avgOvr.toFixed(1)}`);
}

// Post-process nationality fixes (missed by scraper's map)
const NAT_POSTFIX = {
  "Cote d'Ivoire": 'Costa de Marfil',
  'Türkiye': 'Turquía',
  'The Gambia': 'Gambia',
  'Antigua and Barbuda': 'Antigua y Barbuda',
  'St. Lucia': 'Santa Lucía',
  'Korea, South': 'Corea del Sur',
};

function fixNationalities(teams) {
  for (const team of teams) {
    for (const player of team.players) {
      if (NAT_POSTFIX[player.nationality]) {
        player.nationality = NAT_POSTFIX[player.nationality];
      }
    }
  }
}

// Run
console.log('=== Merging scraped data with existing metadata ===');
mergeLeague('mls', 'mlsTeams', 'MLS', 'teams-mls.js');
mergeLeague('saudi', 'saudiTeams', 'Saudi Pro League', 'teams-saudi.js');
mergeLeague('ligamx', 'ligaMXTeams', 'Liga MX', 'teams-ligamx.js');
mergeLeague('jleague', 'jLeagueTeams', 'J-League', 'teams-jleague.js');
console.log('\n✅ All done!');
