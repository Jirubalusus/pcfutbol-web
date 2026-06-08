import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_YEARS = [2010];
const DEFAULT_OUT = 'artifacts/world-cup-draft';
const MIN_EXPECTED_PLAYERS = 11;

const COUNTRY_META = new Map([
  ['Algeria', { countryEs: 'Argelia', code: 'ALG', flag: '🇩🇿' }],
  ['Angola', { countryEs: 'Angola', code: 'ANG', flag: '🇦🇴' }],
  ['Argentina', { countryEs: 'Argentina', code: 'ARG', flag: '🇦🇷' }],
  ['Australia', { countryEs: 'Australia', code: 'AUS', flag: '🇦🇺' }],
  ['Austria', { countryEs: 'Austria', code: 'AUT', flag: '🇦🇹' }],
  ['Belgium', { countryEs: 'Bélgica', code: 'BEL', flag: '🇧🇪' }],
  ['Bolivia', { countryEs: 'Bolivia', code: 'BOL', flag: '🇧🇴' }],
  ['Bosnia and Herzegovina', { countryEs: 'Bosnia y Herzegovina', code: 'BIH', flag: '🇧🇦' }],
  ['Brazil', { countryEs: 'Brasil', code: 'BRA', flag: '🇧🇷' }],
  ['Bulgaria', { countryEs: 'Bulgaria', code: 'BUL', flag: '🇧🇬' }],
  ['Cameroon', { countryEs: 'Camerún', code: 'CMR', flag: '🇨🇲' }],
  ['Canada', { countryEs: 'Canadá', code: 'CAN', flag: '🇨🇦' }],
  ['Chile', { countryEs: 'Chile', code: 'CHI', flag: '🇨🇱' }],
  ['China PR', { countryEs: 'China', code: 'CHN', flag: '🇨🇳' }],
  ['Colombia', { countryEs: 'Colombia', code: 'COL', flag: '🇨🇴' }],
  ['Costa Rica', { countryEs: 'Costa Rica', code: 'CRC', flag: '🇨🇷' }],
  ['Croatia', { countryEs: 'Croacia', code: 'CRO', flag: '🇭🇷' }],
  ['Cuba', { countryEs: 'Cuba', code: 'CUB', flag: '🇨🇺' }],
  ['Czechoslovakia', { countryEs: 'Checoslovaquia', code: 'TCH', flag: '🇨🇿' }],
  ['Czechia', { countryEs: 'Chequia', code: 'CZE', flag: '🇨🇿' }],
  ['Denmark', { countryEs: 'Dinamarca', code: 'DEN', flag: '🇩🇰' }],
  ['Dutch East Indies', { countryEs: 'Indias Orientales Neerlandesas', code: 'DEI', flag: '🇮🇩' }],
  ['East Germany', { countryEs: 'Alemania Oriental', code: 'GDR', flag: '🇩🇪' }],
  ['Ecuador', { countryEs: 'Ecuador', code: 'ECU', flag: '🇪🇨' }],
  ['Egypt', { countryEs: 'Egipto', code: 'EGY', flag: '🇪🇬' }],
  ['El Salvador', { countryEs: 'El Salvador', code: 'SLV', flag: '🇸🇻' }],
  ['England', { countryEs: 'Inglaterra', code: 'ENG', flag: '🏴' }],
  ['FR Yugoslavia', { countryEs: 'RF Yugoslavia', code: 'YUG', flag: '🇷🇸' }],
  ['France', { countryEs: 'Francia', code: 'FRA', flag: '🇫🇷' }],
  ['Germany', { countryEs: 'Alemania', code: 'GER', flag: '🇩🇪' }],
  ['Ghana', { countryEs: 'Ghana', code: 'GHA', flag: '🇬🇭' }],
  ['Greece', { countryEs: 'Grecia', code: 'GRE', flag: '🇬🇷' }],
  ['Haiti', { countryEs: 'Haití', code: 'HAI', flag: '🇭🇹' }],
  ['Honduras', { countryEs: 'Honduras', code: 'HON', flag: '🇭🇳' }],
  ['Hungary', { countryEs: 'Hungría', code: 'HUN', flag: '🇭🇺' }],
  ['Iceland', { countryEs: 'Islandia', code: 'ISL', flag: '🇮🇸' }],
  ['Iran', { countryEs: 'Irán', code: 'IRN', flag: '🇮🇷' }],
  ['Ireland', { countryEs: 'Irlanda', code: 'IRL', flag: '🇮🇪' }],
  ['Iraq', { countryEs: 'Irak', code: 'IRQ', flag: '🇮🇶' }],
  ['Israel', { countryEs: 'Israel', code: 'ISR', flag: '🇮🇱' }],
  ['Italy', { countryEs: 'Italia', code: 'ITA', flag: '🇮🇹' }],
  ['Ivory Coast', { countryEs: 'Costa de Marfil', code: 'CIV', flag: '🇨🇮' }],
  ['Jamaica', { countryEs: 'Jamaica', code: 'JAM', flag: '🇯🇲' }],
  ['Japan', { countryEs: 'Japón', code: 'JPN', flag: '🇯🇵' }],
  ['Kuwait', { countryEs: 'Kuwait', code: 'KUW', flag: '🇰🇼' }],
  ['Mexico', { countryEs: 'México', code: 'MEX', flag: '🇲🇽' }],
  ['Morocco', { countryEs: 'Marruecos', code: 'MAR', flag: '🇲🇦' }],
  ['Netherlands', { countryEs: 'Países Bajos', code: 'NED', flag: '🇳🇱' }],
  ['New Zealand', { countryEs: 'Nueva Zelanda', code: 'NZL', flag: '🇳🇿' }],
  ['Nigeria', { countryEs: 'Nigeria', code: 'NGA', flag: '🇳🇬' }],
  ['Northern Ireland', { countryEs: 'Irlanda del Norte', code: 'NIR', flag: '🏴' }],
  ['North Korea', { countryEs: 'Corea del Norte', code: 'PRK', flag: '🇰🇵' }],
  ['Norway', { countryEs: 'Noruega', code: 'NOR', flag: '🇳🇴' }],
  ['Panama', { countryEs: 'Panamá', code: 'PAN', flag: '🇵🇦' }],
  ['Paraguay', { countryEs: 'Paraguay', code: 'PAR', flag: '🇵🇾' }],
  ['Peru', { countryEs: 'Perú', code: 'PER', flag: '🇵🇪' }],
  ['Poland', { countryEs: 'Polonia', code: 'POL', flag: '🇵🇱' }],
  ['Portugal', { countryEs: 'Portugal', code: 'POR', flag: '🇵🇹' }],
  ['Qatar', { countryEs: 'Qatar', code: 'QAT', flag: '🇶🇦' }],
  ['Romania', { countryEs: 'Rumanía', code: 'ROU', flag: '🇷🇴' }],
  ['Russia', { countryEs: 'Rusia', code: 'RUS', flag: '🇷🇺' }],
  ['Saudi Arabia', { countryEs: 'Arabia Saudí', code: 'KSA', flag: '🇸🇦' }],
  ['Scotland', { countryEs: 'Escocia', code: 'SCO', flag: '🏴' }],
  ['Senegal', { countryEs: 'Senegal', code: 'SEN', flag: '🇸🇳' }],
  ['Serbia', { countryEs: 'Serbia', code: 'SRB', flag: '🇷🇸' }],
  ['Serbia and Montenegro', { countryEs: 'Serbia y Montenegro', code: 'SCG', flag: '🇷🇸' }],
  ['Slovakia', { countryEs: 'Eslovaquia', code: 'SVK', flag: '🇸🇰' }],
  ['Slovenia', { countryEs: 'Eslovenia', code: 'SVN', flag: '🇸🇮' }],
  ['South Africa', { countryEs: 'Sudáfrica', code: 'RSA', flag: '🇿🇦' }],
  ['South Korea', { countryEs: 'Corea del Sur', code: 'KOR', flag: '🇰🇷' }],
  ['Soviet Union', { countryEs: 'Unión Soviética', code: 'URS', flag: '🇷🇺' }],
  ['Spain', { countryEs: 'España', code: 'ESP', flag: '🇪🇸' }],
  ['Sweden', { countryEs: 'Suecia', code: 'SWE', flag: '🇸🇪' }],
  ['Switzerland', { countryEs: 'Suiza', code: 'SUI', flag: '🇨🇭' }],
  ['Togo', { countryEs: 'Togo', code: 'TOG', flag: '🇹🇬' }],
  ['Trinidad and Tobago', { countryEs: 'Trinidad y Tobago', code: 'TRI', flag: '🇹🇹' }],
  ['Tunisia', { countryEs: 'Túnez', code: 'TUN', flag: '🇹🇳' }],
  ['Turkey', { countryEs: 'Turquía', code: 'TUR', flag: '🇹🇷' }],
  ['Ukraine', { countryEs: 'Ucrania', code: 'UKR', flag: '🇺🇦' }],
  ['United Arab Emirates', { countryEs: 'Emiratos Árabes Unidos', code: 'UAE', flag: '🇦🇪' }],
  ['United States', { countryEs: 'Estados Unidos', code: 'USA', flag: '🇺🇸' }],
  ['Uruguay', { countryEs: 'Uruguay', code: 'URU', flag: '🇺🇾' }],
  ['Wales', { countryEs: 'Gales', code: 'WAL', flag: '🏴' }],
  ['West Germany', { countryEs: 'Alemania Federal', code: 'FRG', flag: '🇩🇪' }],
  ['Yugoslavia', { countryEs: 'Yugoslavia', code: 'YUG', flag: '🇷🇸' }],
  ['Zaire', { countryEs: 'Zaire', code: 'ZAI', flag: '🇨🇩' }],
]);

const COUNTRY_ALIASES = new Map([
  ['Czech Republic', 'Czechia'],
  ["Côte d'Ivoire", 'Ivory Coast'],
  ['Korea DPR', 'North Korea'],
  ['Korea Republic', 'South Korea'],
  ['Republic of Ireland', 'Ireland'],
  ['United States of America', 'United States'],
]);

const POSITION_MAP = new Map([
  ['GK', { position: 'GK', positions: ['GK'] }],
  ['GOALKEEPER', { position: 'GK', positions: ['GK'] }],
  ['DF', { position: 'CB', positions: ['CB', 'RB', 'LB'] }],
  ['DEFENDER', { position: 'CB', positions: ['CB', 'RB', 'LB'] }],
  ['CB', { position: 'CB', positions: ['CB'] }],
  ['RB', { position: 'RB', positions: ['RB'] }],
  ['LB', { position: 'LB', positions: ['LB'] }],
  ['MF', { position: 'CM', positions: ['CM', 'CDM', 'CAM'] }],
  ['MIDFIELDER', { position: 'CM', positions: ['CM', 'CDM', 'CAM'] }],
  ['CM', { position: 'CM', positions: ['CM'] }],
  ['DM', { position: 'CDM', positions: ['CDM', 'CM'] }],
  ['CDM', { position: 'CDM', positions: ['CDM'] }],
  ['AM', { position: 'CAM', positions: ['CAM', 'CM'] }],
  ['CAM', { position: 'CAM', positions: ['CAM'] }],
  ['FW', { position: 'ST', positions: ['ST', 'CF', 'RW', 'LW'] }],
  ['FORWARD', { position: 'ST', positions: ['ST', 'CF', 'RW', 'LW'] }],
  ['ST', { position: 'ST', positions: ['ST'] }],
  ['CF', { position: 'CF', positions: ['CF', 'ST'] }],
  ['RW', { position: 'RW', positions: ['RW', 'ST'] }],
  ['LW', { position: 'LW', positions: ['LW', 'ST'] }],
]);

function parseArgs(argv) {
  const args = { years: DEFAULT_YEARS, out: DEFAULT_OUT, slowMs: 0 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = () => {
      const inline = arg.split('=').slice(1).join('=');
      if (inline) return inline;
      i += 1;
      return argv[i];
    };

    if (arg === '--years' || arg.startsWith('--years=')) {
      args.years = readValue()
        .split(',')
        .map((year) => Number.parseInt(year.trim(), 10))
        .filter(Number.isInteger);
    } else if (arg === '--out' || arg.startsWith('--out=')) {
      args.out = readValue();
    } else if (arg === '--slow-ms' || arg.startsWith('--slow-ms=')) {
      args.slowMs = Math.max(0, Number.parseInt(readValue(), 10) || 0);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.years.length === 0) {
    throw new Error('No valid years supplied. Example: --years 2010,2014');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/world-cup-draft/scrape-world-cup-squads.mjs [--years 2010,2014] [--out artifacts/world-cup-draft] [--slow-ms 100]

Defaults:
  --years ${DEFAULT_YEARS.join(',')}
  --out ${DEFAULT_OUT}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceUrlForYear(year) {
  return `https://en.wikipedia.org/wiki/${year}_FIFA_World_Cup_squads`;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[‡†*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPlayerName(value) {
  return cleanText(value)
    .replace(/\s*\((?:captain|vice-captain|c)\)\s*/gi, ' ')
    .replace(/\s+on loan.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseInteger(value) {
  const match = cleanText(value).match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function normalizeCountry(country) {
  return COUNTRY_ALIASES.get(country) ?? country;
}

function normalizePosition(value) {
  const raw = cleanText(value).toUpperCase().replace(/^\d+/, '');
  const direct = POSITION_MAP.get(raw);
  if (direct) return direct;

  const token = raw.match(/\b(GK|CB|RB|LB|CDM|CM|CAM|DM|AM|RW|LW|ST|CF|DF|MF|FW)\b/)?.[1];
  return POSITION_MAP.get(token) ?? { position: null, positions: [] };
}

function findColumn(headers, candidates) {
  return headers.findIndex((header) => candidates.some((candidate) => header === candidate || header.includes(candidate)));
}

function normalizeTeam({ year, country, rows }) {
  const normalizedCountry = normalizeCountry(cleanText(country));
  const meta = COUNTRY_META.get(normalizedCountry) ?? {};

  const players = rows
    .map((row) => {
      const headers = row.headers.map((header) => cleanText(header).toLowerCase());
      const numberIndex = findColumn(headers, ['no.', 'no', 'number']);
      const positionIndex = findColumn(headers, ['pos.', 'pos', 'position']);
      const playerIndex = findColumn(headers, ['player']);
      const dobIndex = findColumn(headers, ['date of birth', 'dob']);
      const capsIndex = findColumn(headers, ['caps']);
      const goalsIndex = findColumn(headers, ['goals']);
      const clubIndex = findColumn(headers, ['club']);

      if (playerIndex < 0) return null;

      const sourceName = cleanText(row.cells[playerIndex]);
      const name = cleanPlayerName(sourceName);
      if (!name) return null;

      const positionData = normalizePosition(row.cells[positionIndex]);

      return {
        name,
        number: numberIndex >= 0 ? parseInteger(row.cells[numberIndex]) : null,
        position: positionData.position,
        positions: positionData.positions,
        club: clubIndex >= 0 ? cleanText(row.cells[clubIndex]) || null : null,
        age: null,
        dobText: dobIndex >= 0 ? cleanText(row.cells[dobIndex]) || null : null,
        caps: capsIndex >= 0 ? parseInteger(row.cells[capsIndex]) : null,
        goals: goalsIndex >= 0 ? parseInteger(row.cells[goalsIndex]) : null,
        rating: null,
        sourceName,
      };
    })
    .filter(Boolean);

  return {
    id: `worldcup-${year}-${slugify(normalizedCountry)}`,
    year,
    country: normalizedCountry,
    countryEs: meta.countryEs ?? normalizedCountry,
    code: meta.code ?? null,
    confederation: null,
    ...(meta.flag ? { flag: meta.flag } : {}),
    players,
  };
}

async function scrapeYear(page, year) {
  const url = sourceUrlForYear(year);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('table.wikitable', { timeout: 30_000 });

  const rawTeams = await page.evaluate(() => {
    const clean = (value) => String(value ?? '')
      .replace(/\[[^\]]*]/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isLikelyTeamHeading = (text) => {
      if (!text) return false;
      if (/^(group|knockout|statistics|references|external links|notes|see also|match officials|final squad|preliminary squad)\b/i.test(text)) return false;
      if (/\bsquads?\b/i.test(text)) return false;
      return true;
    };

    const cellText = (cell) => {
      const clone = cell.cloneNode(true);
      clone.querySelectorAll('sup, style, script').forEach((node) => node.remove());
      return clean(clone.textContent);
    };

    const content = document.querySelector('#mw-content-text .mw-parser-output') ?? document.body;
    const teams = [];
    let currentTeam = null;

    for (const element of Array.from(content.querySelectorAll('h2, h3, table.wikitable'))) {
      if (/^H[23]$/.test(element.tagName)) {
        const headline = element.querySelector('.mw-headline') ?? element;
        const headingText = clean(headline.textContent).replace(/\s*\[edit]\s*$/i, '');
        currentTeam = isLikelyTeamHeading(headingText) ? headingText : null;
        continue;
      }

      if (!element.matches?.('table.wikitable')) continue;

      const headerCells = Array.from(element.querySelectorAll('tr'))
        .map((row) => Array.from(row.children).filter((cell) => cell.tagName === 'TH').map(cellText))
        .find((headers) => headers.some((header) => /^player$/i.test(header)) && headers.length >= 3);

      if (!currentTeam || !headerCells) continue;

      const rows = [];
      for (const row of Array.from(element.querySelectorAll('tbody tr'))) {
        const cells = Array.from(row.children).map(cellText);
        if (cells.length < 3) continue;
        if (cells.every((cell, index) => cell === headerCells[index])) continue;
        rows.push({ headers: headerCells, cells: cells.slice(0, headerCells.length) });
      }

      if (rows.length > 0) {
        teams.push({ country: currentTeam, rows });
      }
    }

    return teams;
  });

  const seen = new Set();
  const teams = rawTeams
    .map((team) => normalizeTeam({ year, country: team.country, rows: team.rows }))
    .filter((team) => {
      if (seen.has(team.id)) return false;
      seen.add(team.id);
      return team.players.length > 0;
    });

  return {
    source: { provider: 'wikipedia', url },
    teams,
  };
}

function buildSummary(editions) {
  const warnings = [];
  const editionSummaries = editions.map((edition) => {
    const expectedTeamsByYear = {
      1930: 13,
      1934: 16,
      1938: 15,
      1950: 13,
    };
    const expectedTeams = expectedTeamsByYear[edition.year] ?? (edition.year <= 1978 ? 16 : edition.year <= 1994 ? 24 : 32);
    if (edition.teams.length < expectedTeams) {
      warnings.push({
        year: edition.year,
        type: 'low_team_count',
        message: `${edition.year} has ${edition.teams.length} teams; expected at least ${expectedTeams}.`,
      });
    }

    for (const team of edition.teams) {
      if (team.players.length < MIN_EXPECTED_PLAYERS) {
        warnings.push({
          year: edition.year,
          team: team.country,
          type: 'low_player_count',
          message: `${edition.year} ${team.country} has ${team.players.length} players; expected at least ${MIN_EXPECTED_PLAYERS}.`,
        });
      }
    }

    return {
      year: edition.year,
      teams: edition.teams.length,
      players: edition.teams.reduce((total, team) => total + team.players.length, 0),
      teamsWithCodes: edition.teams.filter((team) => team.code).length,
      teamsWithFlags: edition.teams.filter((team) => team.flag).length,
      playersWithClub: edition.teams.reduce((total, team) => total + team.players.filter((player) => player.club).length, 0),
      playersWithNumber: edition.teams.reduce((total, team) => total + team.players.filter((player) => player.number != null).length, 0),
      playersWithCaps: edition.teams.reduce((total, team) => total + team.players.filter((player) => player.caps != null).length, 0),
      playersWithGoals: edition.teams.reduce((total, team) => total + team.players.filter((player) => player.goals != null).length, 0),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    provider: 'wikipedia',
    editions: editionSummaries,
    totals: {
      editions: editions.length,
      teams: editionSummaries.reduce((total, edition) => total + edition.teams, 0),
      players: editionSummaries.reduce((total, edition) => total + edition.players, 0),
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
  const browser = await chromium.launch({ headless: true, slowMo: args.slowMs });
  const page = await browser.newPage({
    userAgent: 'pcfutbol-web world-cup-draft data scraper (Wikipedia factual squad tables)',
  });

  const editions = [];

  try {
    for (const year of args.years) {
      console.log(`Scraping ${year} FIFA World Cup squads...`);
      const scraped = await scrapeYear(page, year);
      const edition = {
        year,
        source: scraped.source,
        teams: scraped.teams,
      };
      editions.push(edition);

      await writeJson(path.join(args.out, 'raw', 'wikipedia', `${year}.json`), edition);
      console.log(`  ${edition.teams.length} teams, ${edition.teams.reduce((total, team) => total + team.players.length, 0)} players`);

      if (args.slowMs > 0) await sleep(args.slowMs);
    }
  } finally {
    await browser.close();
  }

  const aggregate = { editions };
  const summary = buildSummary(editions);

  await writeJson(path.join(args.out, 'world-cup-squads.json'), aggregate);
  await writeJson(path.join(args.out, 'summary.json'), summary);

  console.log(`Wrote ${path.join(args.out, 'world-cup-squads.json')}`);
  console.log(`Warnings: ${summary.totals.warnings}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
