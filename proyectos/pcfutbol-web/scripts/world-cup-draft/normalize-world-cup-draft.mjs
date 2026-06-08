#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_IN = 'artifacts/world-cup-draft/world-cup-squads.json';
const DEFAULT_OUT = 'artifacts/world-cup-draft/normalized/world-cup-draft-database.json';
const DEFAULT_PUBLIC_OUT = 'public/data/world-cup-draft-database.json';
const RATING_MODEL = 'pcgaffer-worldcup-draft-v2-iconic-floors';

const POSITION_GROUP = {
  GK: 'GK', CB: 'DEF', RB: 'DEF', LB: 'DEF', RWB: 'DEF', LWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID',
  RW: 'ATT', LW: 'ATT', ST: 'ATT', CF: 'ATT',
};

const CLUB_PRESTIGE = [
  [/real madrid|barcelona|bayern munich|milan|juventus|manchester united|liverpool/i, 4],
  [/inter(?:nazionale)?|internazionale|arsenal|chelsea|paris saint-germain|psg|ajax|borussia dortmund|atl[eé]tico madrid|valencia|roma|napoli/i, 3],
  [/tottenham|manchester city|porto|benfica|sporting|marseille|lyon|monaco|sevilla|lazio|bayer leverkusen|feyenoord|psv|river plate|boca juniors|santos|flamengo|corinthians|s[aã]o paulo/i, 2],
  [/celtic|rangers|anderlecht|galatasaray|fenerbah[cç]e|besiktas|dinamo|spartak|lokomotiv|cruzeiro|palmeiras|vasco|internacional|gr[eê]mio/i, 1],
];

const TEAM_BASE_OVERRIDES = new Map(Object.entries({
  '1930-Uruguay': 84, '1930-Argentina': 82,
  '1934-Italy': 85, '1934-Czechoslovakia': 80, '1938-Italy': 85, '1938-Hungary': 81,
  '1950-Uruguay': 86, '1950-Brazil': 84,
  '1954-West Germany': 85, '1954-Hungary': 89,
  '1958-Brazil': 89, '1958-Sweden': 81, '1962-Brazil': 88, '1962-Czechoslovakia': 80,
  '1966-England': 86, '1966-West Germany': 84,
  '1970-Brazil': 92, '1970-Italy': 84, '1974-West Germany': 87, '1974-Netherlands': 88,
  '1978-Argentina': 86, '1978-Netherlands': 84,
  '1982-Italy': 86, '1982-Brazil': 87, '1982-West Germany': 84,
  '1986-Argentina': 88, '1986-West Germany': 84, '1986-France': 84, '1986-Brazil': 84,
  '1990-West Germany': 86, '1990-Argentina': 83, '1990-Italy': 84,
  '1994-Brazil': 87, '1994-Italy': 85, '1994-Bulgaria': 81, '1994-Romania': 80,
  '1998-France': 88, '1998-Brazil': 86, '1998-Netherlands': 85, '1998-Croatia': 82,
  '2002-Brazil': 89, '2002-Germany': 84, '2002-Turkey': 80, '2002-South Korea': 79,
  '2006-Italy': 88, '2006-France': 86, '2006-Germany': 84, '2006-Portugal': 84, '2006-Brazil': 87,
  '2010-Spain': 90, '2010-Netherlands': 86, '2010-Germany': 84, '2010-Uruguay': 82,
  '2014-Germany': 89, '2014-Argentina': 86, '2014-Netherlands': 85, '2014-Brazil': 84,
  '2018-France': 89, '2018-Croatia': 85, '2018-Belgium': 86, '2018-England': 83,
  '2022-Argentina': 89, '2022-France': 89, '2022-Croatia': 84, '2022-Morocco': 82,
}));

const COUNTRY_BASE = new Map(Object.entries({
  Brazil: 82, Argentina: 81, Germany: 82, 'West Germany': 82, Italy: 81, France: 80, Spain: 80,
  Netherlands: 80, England: 79, Portugal: 78, Uruguay: 78, Belgium: 77, Croatia: 77,
  Mexico: 74, Denmark: 74, Sweden: 74, Switzerland: 74, Poland: 74, Russia: 73,
  Colombia: 75, Chile: 75, Paraguay: 72, Peru: 72, Romania: 73, Bulgaria: 73,
  Serbia: 73, Yugoslavia: 75, 'Soviet Union': 76, Czechoslovakia: 75, Hungary: 76,
  Japan: 71, 'South Korea': 71, 'United States': 71, Morocco: 72, Nigeria: 72, Cameroon: 72,
  Senegal: 72, Ghana: 72, Algeria: 71, Tunisia: 70, Australia: 70,
}));

const ICONIC_PLAYER_RATING_FLOORS = [
  ['Pelé', 1970, 98], ['Pele', 1970, 98], ['Diego Maradona', 1986, 98], ['Lionel Messi', 2022, 96], ['Lionel Messi', 2014, 96], ['Lionel Messi', 2010, 94],
  ['Cristiano Ronaldo', 2006, 92], ['Cristiano Ronaldo', 2010, 94], ['Cristiano Ronaldo', 2014, 94], ['Cristiano Ronaldo', 2018, 95], ['Cristiano Ronaldo', 2022, 90],
  ['Ronaldo', 2002, 96], ['Ronaldinho', 2002, 92], ['Rivaldo', 2002, 93], ['Zinedine Zidane', 1998, 96], ['Zinedine Zidane', 2006, 94],
  ['Xavi', 2010, 94], ['Andrés Iniesta', 2010, 94], ['Iker Casillas', 2010, 93], ['David Villa', 2010, 92], ['Carles Puyol', 2010, 91], ['Sergio Ramos', 2010, 91],
  ['Kylian Mbappé', 2018, 91], ['Kylian Mbappé', 2022, 95], ['Antoine Griezmann', 2018, 92], ['Luka Modrić', 2018, 94], ['Luka Modrić', 2022, 91],
  ['Neymar', 2014, 92], ['Neymar', 2018, 93], ['Neymar', 2022, 92], ['Luis Suárez', 2010, 88], ['Luis Suárez', 2014, 92], ['Luis Suárez', 2018, 90],
  ['Gianluigi Buffon', 2006, 94], ['Fabio Cannavaro', 2006, 94], ['Andrea Pirlo', 2006, 91], ['Roberto Baggio', 1994, 95], ['Romário', 1994, 95],
  ['Johan Cruyff', 1974, 97], ['Franz Beckenbauer', 1974, 96], ['Gerd Müller', 1974, 94], ['Michel Platini', 1986, 93], ['Paolo Rossi', 1982, 92],
  ['Ferenc Puskás', 1954, 96], ['Sándor Kocsis', 1954, 95], ['Garrincha', 1962, 96], ['Bobby Charlton', 1966, 94], ['Eusébio', 1966, 96],

  ['Zlatan Ibrahimović', 2002, 84], ['Zlatan Ibrahimović', 2006, 91],
  ['Thierry Henry', 1998, 86], ['Thierry Henry', 2002, 93], ['Thierry Henry', 2006, 92], ['Thierry Henry', 2010, 86],
  ['Didier Drogba', 2006, 90], ['Didier Drogba', 2010, 88], ['Didier Drogba', 2014, 84],
  ['Samuel Eto\'o', 1998, 75], ['Samuel Eto\'o', 2002, 88], ['Samuel Eto\'o', 2010, 91], ['Samuel Eto\'o', 2014, 84],
  ['Andriy Shevchenko', 2006, 91],
  ['Robert Lewandowski', 2018, 92], ['Robert Lewandowski', 2022, 91],
  ['Wayne Rooney', 2006, 90], ['Wayne Rooney', 2010, 91], ['Wayne Rooney', 2014, 86],
  ['David Beckham', 1998, 89], ['David Beckham', 2002, 91], ['David Beckham', 2006, 88],
  ['Kaká', 2002, 84], ['Kaká', 2006, 93], ['Kaká', 2010, 89],
  ['Luís Figo', 2002, 93], ['Luís Figo', 2006, 90],
  ['Raúl', 1998, 88], ['Raúl', 2002, 91], ['Raúl', 2006, 88],
  ['Luka Modrić', 2006, 78], ['Luka Modrić', 2014, 91],
  ['Arjen Robben', 2006, 87], ['Arjen Robben', 2010, 91], ['Arjen Robben', 2014, 93],
  ['Franck Ribéry', 2006, 86], ['Franck Ribéry', 2010, 91],
  ['Paul Scholes', 1998, 88], ['Paul Scholes', 2002, 90],
];

function parseArgs(argv) {
  const args = { in: DEFAULT_IN, out: DEFAULT_OUT, publicOut: DEFAULT_PUBLIC_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const read = () => arg.includes('=') ? arg.split('=').slice(1).join('=') : argv[++i];
    if (arg === '--in' || arg.startsWith('--in=')) args.in = read();
    else if (arg === '--out' || arg.startsWith('--out=')) args.out = read();
    else if (arg === '--public-out' || arg.startsWith('--public-out=')) args.publicOut = read();
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/world-cup-draft/normalize-world-cup-draft.mjs [--in ${DEFAULT_IN}] [--out ${DEFAULT_OUT}] [--public-out ${DEFAULT_PUBLIC_OUT}]`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function slugify(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function comparablePlayerName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function playerCareerKey(player, team) {
  return `${team.country || ''}::${slugify(player.name || player.sourceName || '')}`;
}

function buildCareerClubIndex(source) {
  const index = new Map();
  for (const edition of source.editions || []) {
    for (const team of edition.teams || []) {
      for (const player of team.players || []) {
        const club = String(player.club || '').trim();
        if (!club) continue;
        const key = playerCareerKey(player, team);
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(club);
      }
    }
  }
  return index;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function round(n) { return Math.round(n); }

function parseAge(dobText, year) {
  const text = String(dobText || '');
  const aged = text.match(/aged\s+(\d{1,2})/i);
  if (aged) return Number(aged[1]);
  const isoYear = text.match(/\b(19\d{2}|20\d{2})[-/]/)?.[1];
  const tailYear = text.match(/\b(19\d{2}|20\d{2})\b/)?.[1];
  const birthYear = Number(isoYear || tailYear);
  if (birthYear && year) return clamp(year - birthYear, 16, 45);
  return null;
}

function normalizePosition(player) {
  const raw = String(player.position || player.positions?.[0] || '').toUpperCase();
  if (POSITION_GROUP[raw]) return { position: raw, positions: [...new Set([raw, ...(player.positions || [])].filter(Boolean))], positionGroup: POSITION_GROUP[raw] };
  if (raw === 'DF') return { position: 'CB', positions: ['CB', 'RB', 'LB'], positionGroup: 'DEF' };
  if (raw === 'MF') return { position: 'CM', positions: ['CM', 'CDM', 'CAM'], positionGroup: 'MID' };
  if (raw === 'FW') return { position: 'ST', positions: ['ST', 'CF', 'RW', 'LW'], positionGroup: 'ATT' };
  if ([1, 12, 13, 22, 23].includes(Number(player.number)) && /goalkeeper|portero/i.test(player.sourceName || '')) return { position: 'GK', positions: ['GK'], positionGroup: 'GK' };
  return { position: 'CM', positions: ['CM', 'CDM', 'CAM'], positionGroup: 'MID' };
}

function clubBonus(club) {
  if (!club) return 0;
  const hit = CLUB_PRESTIGE.find(([re]) => re.test(club));
  return hit ? hit[1] : 0;
}

function ageBonus(age) {
  if (age == null) return 0;
  if (age >= 24 && age <= 30) return 2;
  if (age >= 21 && age <= 33) return 1;
  if (age < 19 || age > 36) return -2;
  if (age < 21 || age > 34) return -1;
  return 0;
}

function baseForTeam(team, year) {
  const override = TEAM_BASE_OVERRIDES.get(`${year}-${team.country}`);
  if (override) return override;
  const country = COUNTRY_BASE.get(team.country) ?? 68;
  const eraCompression = year < 1960 ? -2 : year < 1980 ? -1 : 0;
  return country + eraCompression;
}

function iconicPlayerRatingFloor(name, year) {
  const clean = comparablePlayerName(name);
  const found = ICONIC_PLAYER_RATING_FLOORS.find(([star, starYear]) => starYear === year && clean === comparablePlayerName(star));
  return found ? found[2] : null;
}

function ratePlayer(player, team, year, posData, age) {
  const base = baseForTeam(team, year);
  const caps = Number(player.caps || 0);
  const goals = Number(player.goals || 0);
  const capsBonus = clamp(Math.floor(caps / 25), 0, 4);
  const goalsScale = posData.positionGroup === 'ATT' ? 12 : posData.positionGroup === 'MID' ? 18 : 28;
  const goalsBonus = clamp(Math.floor(goals / goalsScale), 0, posData.positionGroup === 'ATT' ? 3 : 2);
  const primeBonus = ageBonus(age);
  const cBonus = clubBonus(player.club);
  const captainBonus = /\(c\)|captain/i.test(player.sourceName || '') ? 2 : 0;
  const number = Number(player.number);
  const starterNumberBonus = Number.isFinite(number) && number >= 1 && number <= 11 ? 1 : 0;
  const groupBalance = posData.positionGroup === 'GK' ? 0 : posData.positionGroup === 'DEF' ? -1 : posData.positionGroup === 'MID' ? 0 : 1;
  const iconic = iconicPlayerRatingFloor(player.name, year);
  let rating = base + capsBonus + goalsBonus + primeBonus + cBonus + captainBonus + starterNumberBonus + groupBalance - 7;
  if (iconic != null) rating = Math.max(rating, iconic);
  return {
    rating: clamp(round(rating), 50, 99),
    ratingBreakdown: {
      base,
      teamBonus: base - 68,
      capsBonus,
      goalsBonus,
      ageBonus: primeBonus,
      clubBonus: cBonus,
      captainBonus,
      starterNumberBonus,
      groupBalance,
      iconicRatingFloor: iconic,
      iconicOverride: iconic,
    },
  };
}

function topAvg(players, group, count) {
  const list = players.filter((p) => p.positionGroup === group).map((p) => p.rating).sort((a, b) => b - a);
  if (!list.length) return null;
  const picked = list.slice(0, count);
  return round(picked.reduce((a, b) => a + b, 0) / picked.length);
}

function computeTeamRatings(players) {
  const allTop = [...players].sort((a, b) => b.rating - a.rating).slice(0, 11);
  const rating = round(allTop.reduce((s, p) => s + p.rating, 0) / Math.max(1, allTop.length));
  const attack = topAvg(players, 'ATT', 4) ?? rating;
  const midfield = topAvg(players, 'MID', 5) ?? rating;
  const defenseOnly = [topAvg(players, 'DEF', 5), topAvg(players, 'GK', 2)].filter((v) => v != null);
  const defense = defenseOnly.length ? round(defenseOnly.reduce((a, b) => a + b, 0) / defenseOnly.length) : rating;
  return { rating, attack, midfield, defense };
}

function normalizePlayer(player, team, year, index, careerClubIndex) {
  const posData = normalizePosition(player);
  const age = parseAge(player.dobText, year);
  const careerClubs = careerClubIndex.get(playerCareerKey(player, team));
  const clubs = [...new Set([
    player.club,
    ...(careerClubs ? [...careerClubs] : []),
  ].filter(Boolean).map((c) => String(c).trim()).filter(Boolean))];
  const rated = ratePlayer(player, team, year, posData, age);
  const code = team.code || slugify(team.country).slice(0, 3).toUpperCase();
  return {
    id: `worldcup-${year}-${code.toLowerCase()}-${slugify(player.name)}-${index + 1}`,
    name: player.name,
    displayName: player.name,
    nationality: team.country,
    nationalityEs: team.countryEs || team.country,
    countryCode: code,
    flag: team.flag || null,
    year,
    teamId: team.id,
    tournamentTeam: team.country,
    number: player.number ?? null,
    position: posData.position,
    positions: posData.positions,
    positionGroup: posData.positionGroup,
    rating: rated.rating,
    age,
    dobText: player.dobText ?? null,
    club: player.club ?? null,
    clubs,
    caps: player.caps ?? null,
    goals: player.goals ?? null,
    sourceName: player.sourceName ?? player.name,
    ratingBreakdown: rated.ratingBreakdown,
  };
}

function buildSummary(database) {
  const warnings = [];
  const players = database.editions.flatMap((e) => e.teams.flatMap((t) => t.players));
  const ratings = players.map((p) => p.rating).filter(Number.isFinite);
  for (const p of players) {
    if (!p.nationality) warnings.push({ type: 'missing_nationality', player: p.name, year: p.year, teamId: p.teamId });
    if (!p.position) warnings.push({ type: 'missing_position', player: p.name, year: p.year, teamId: p.teamId });
    if (!Number.isInteger(p.rating)) warnings.push({ type: 'missing_rating', player: p.name, year: p.year, teamId: p.teamId });
    if (!Array.isArray(p.clubs)) warnings.push({ type: 'missing_clubs_array', player: p.name, year: p.year, teamId: p.teamId });
  }
  return {
    generatedAt: database.generatedAt,
    ratingModel: RATING_MODEL,
    totals: {
      editions: database.editions.length,
      teams: database.editions.reduce((s, e) => s + e.teams.length, 0),
      players: players.length,
      playersWithRating: ratings.length,
      playersWithAge: players.filter((p) => p.age != null).length,
      playersWithClub: players.filter((p) => p.club).length,
      playersWithNationality: players.filter((p) => p.nationality).length,
      playersWithPosition: players.filter((p) => p.position).length,
      playersWithClubsArray: players.filter((p) => Array.isArray(p.clubs)).length,
      playersWithAtLeastOneClub: players.filter((p) => p.clubs.length > 0).length,
      minRating: Math.min(...ratings),
      maxRating: Math.max(...ratings),
      avgRating: Number((ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length)).toFixed(2)),
      ageMissing: players.filter((p) => p.age == null).length,
      clubMissing: players.filter((p) => !p.club).length,
      warnings: warnings.length,
    },
    warnings,
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceText = await fs.readFile(args.in, 'utf8');
  const source = JSON.parse(sourceText);
  const careerClubIndex = buildCareerClubIndex(source);
  const generatedAt = new Date().toISOString();
  const database = {
    version: 1,
    generatedAt,
    source: { base: args.in, ratingModel: RATING_MODEL },
    editions: source.editions.map((edition) => ({
      year: edition.year,
      source: edition.source,
      teams: edition.teams.map((team) => {
        const players = (team.players || []).map((player, index) => normalizePlayer(player, team, edition.year, index, careerClubIndex));
        const ratings = computeTeamRatings(players);
        return { ...team, ...ratings, players };
      }),
    })),
  };
  const summary = buildSummary(database);
  await writeJson(args.out, database);
  await writeJson(path.join(path.dirname(args.out), 'summary.json'), summary);
  await writeJson(args.publicOut, database);
  console.log(`Wrote ${args.out}`);
  console.log(`Wrote ${args.publicOut}`);
  console.log(JSON.stringify(summary.totals, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
