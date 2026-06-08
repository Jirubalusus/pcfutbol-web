#!/usr/bin/env node
/**
 * Scrapea una temporada histórica desde Transfermarkt y genera datasets normalizados.
 *
 * Uso:
 *   node scripts/historical-db/scrape-historical-season.mjs --season 2011 --leagues laliga
 *   node scripts/historical-db/scrape-historical-season.mjs --season 2025 --major-only
 *   node scripts/historical-db/scrape-historical-season.mjs --season 2025 --max-teams 2 --skip-stats
 *
 * Salida:
 *   artifacts/historical-db/raw/transfermarkt/<season>/<league>.json
 *   artifacts/historical-db/seasons/<season>/manifest.json
 *   artifacts/historical-db/seasons/<season>/teams.json
 *   artifacts/historical-db/seasons/<season>/players.json
 *   artifacts/historical-db/seasons/<season>/squads.json
 *   artifacts/historical-db/seasons/<season>/leagues.json
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HISTORICAL_LEAGUES, seasonLabel, transfermarktLeagueUrl, transfermarktSquadUrl, isLeagueApplicable } from './historical-leagues.mjs';
import { enrichPlayerRatings, LEAGUE_BASE_BY_TIER } from './rating-model.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACT_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db');
const RAW_ROOT = path.join(ARTIFACT_ROOT, 'raw', 'transfermarkt');
const SEASON_ROOT = path.join(ARTIFACT_ROOT, 'seasons');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
function hasFlag(name) { return args.includes(name); }

const SEASON = Number(argValue('--season', 2025));
const LEAGUE_ARG = argValue('--leagues', '');
const MAJOR_ONLY = hasFlag('--major-only');
const SKIP_STATS = hasFlag('--skip-stats');
const MAX_TEAMS = Number(argValue('--max-teams', 0));
const MAX_LEAGUES = Number(argValue('--max-leagues', 0));
const TIMEOUT = Number(argValue('--timeout-ms', 30000));
const SLOW_MS = Number(argValue('--slow-ms', 300));
const MERGE_EXISTING_RAW = hasFlag('--merge-existing-raw');

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function normalizeText(text = '') { return text.trim().replace(/\s+/g, ' '); }
function slugify(text = '') {
  return normalizeText(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function parseMarketValue(text = '') {
  if (!text || text === '-' || /sin valor/i.test(text)) return 0;
  const clean = text.replace(/[^\d,\.]/g, '').replace(',', '.');
  const num = Number.parseFloat(clean);
  if (!Number.isFinite(num)) return 0;
  const lower = text.toLowerCase();
  if (lower.includes('mil mill') || lower.includes('bn')) return Math.round(num * 1_000_000_000);
  if (lower.includes('mill') || /m\b/i.test(text)) return Math.round(num * 1_000_000);
  if (lower.includes('mil') || /k\b/i.test(text)) return Math.round(num * 1_000);
  return Math.round(num);
}
function mapPosition(raw = '') {
  const pos = raw.toLowerCase();
  if (pos.includes('portero') || pos.includes('goalkeeper')) return 'GK';
  if (pos.includes('central') || pos.includes('centre-back')) return 'CB';
  if (pos.includes('lateral izquierdo') || pos.includes('defensa izquierdo') || pos.includes('left-back')) return 'LB';
  if (pos.includes('lateral derecho') || pos.includes('defensa derecho') || pos.includes('right-back')) return 'RB';
  if (pos.includes('defensa')) return 'CB';
  if (pos.includes('pivote') || pos.includes('defensivo') || pos.includes('defensive midfield')) return 'CDM';
  if (pos.includes('mediapunta') || pos.includes('ofensivo') || pos.includes('attacking midfield')) return 'CAM';
  if (pos.includes('extremo izquierdo') || pos.includes('left winger')) return 'LW';
  if (pos.includes('extremo derecho') || pos.includes('right winger')) return 'RW';
  if (pos.includes('extremo')) return 'RW';
  if (pos.includes('delantero centro') || pos.includes('ariete') || pos.includes('centre-forward')) return 'ST';
  if (pos.includes('segundo delantero') || pos.includes('second striker')) return 'CF';
  if (pos.includes('delantero') || pos.includes('forward')) return 'ST';
  if (pos.includes('centrocampista') || pos.includes('mediocentro') || pos.includes('midfield')) return 'CM';
  return 'CM';
}
function minutesToNumber(text = '') { return Number.parseInt(text.replace(/[^\d]/g, ''), 10) || 0; }
function isRetryableScrapeError(error) {
  const message = String(error?.message || error || '');
  return /Timeout \d+ms exceeded|Target page, context or browser has been closed|Page closed|browser has been closed|net::ERR_/i.test(message);
}

function pickLeagues() {
  let leagues = HISTORICAL_LEAGUES.filter((l) => isLeagueApplicable(l, SEASON));
  if (MAJOR_ONLY) leagues = leagues.filter((l) => l.priority === 'major');
  if (LEAGUE_ARG) {
    const wanted = new Set(LEAGUE_ARG.split(',').map((s) => s.trim()).filter(Boolean));
    leagues = leagues.filter((l) => wanted.has(l.key));
  }
  if (MAX_LEAGUES) leagues = leagues.slice(0, MAX_LEAGUES);
  return leagues;
}

async function launch() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
    locale: 'es-ES',
    viewport: { width: 1366, height: 768 }
  });
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'media'].includes(type)) return route.abort();
    return route.continue();
  });
  return { browser, page: await context.newPage() };
}

async function scrapeLeagueTeams(page, league) {
  const url = transfermarktLeagueUrl(league, SEASON);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await sleep(SLOW_MS);
  const teams = await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    let rank = 0;
    for (const row of document.querySelectorAll('table.items tbody tr')) {
      const linkEl = row.querySelector('td.hauptlink a[href*="/startseite/verein/"]');
      if (!linkEl) continue;
      const href = linkEl.getAttribute('href') || '';
      const m = href.match(/\/([^/]+)\/startseite\/verein\/(\d+)/);
      if (!m || seen.has(m[2])) continue;
      seen.add(m[2]);
      rank += 1;
      const valueEl = row.querySelector('td.rechts a, td.rechts, td:last-child');
      out.push({
        name: linkEl.textContent.trim().replace(/\s+/g, ' '),
        slug: m[1],
        transfermarktId: m[2],
        teamUrl: `https://www.transfermarkt.es${href}`,
        marketValueText: valueEl?.textContent?.trim() || '',
        rank
      });
    }
    return out;
  });
  return teams.map((team) => ({
    ...team,
    id: `tm-team-${team.transfermarktId}`,
    stableId: `tm-team-${team.transfermarktId}`,
    leagueId: league.key,
    season: seasonLabel(SEASON),
    marketValue: parseMarketValue(team.marketValueText),
    source: { provider: 'transfermarkt', url: team.teamUrl, id: team.transfermarktId }
  }));
}

async function scrapeTeamSquad(page, team) {
  const squadUrl = transfermarktSquadUrl(team.teamUrl, SEASON);
  await page.goto(squadUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await sleep(SLOW_MS);
  const players = await page.evaluate(() => {
    const playerList = [];
    const seen = new Set();
    for (const row of document.querySelectorAll('table.items > tbody > tr')) {
      if (!row.classList.contains('odd') && !row.classList.contains('even')) continue;
      const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
      if (!nameEl) continue;
      const href = nameEl.getAttribute('href') || '';
      const idMatch = href.match(/\/profil\/spieler\/(\d+)/);
      const tmId = idMatch?.[1] || '';
      const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
      if (!name || seen.has(tmId || name)) continue;
      seen.add(tmId || name);
      const inline = row.querySelector('table.inline-table');
      const positionRaw = inline?.querySelector('tr:last-child td')?.textContent?.trim() || '';
      const zCells = Array.from(row.querySelectorAll('td.zentriert'));
      let number = null;
      let age = null;
      let birthDate = '';
      for (const cell of zCells) {
        const txt = cell.textContent.trim();
        const title = cell.getAttribute('title') || '';
        if (!birthDate && /\d{1,2}\.\d{1,2}\.\d{4}/.test(title)) birthDate = title;
        if (number === null && /^\d{1,3}$/.test(txt)) number = Number(txt);
        const n = Number(txt);
        if (age === null && Number.isFinite(n) && n >= 15 && n <= 45) age = n;
      }
      const flags = Array.from(row.querySelectorAll('img.flaggenrahmen')).map((img) => img.getAttribute('title')).filter(Boolean);
      const valueEl = row.querySelector('td.rechts.hauptlink a, td.rechts.hauptlink, td.rechts a');
      playerList.push({
        name,
        transfermarktId: tmId,
        profileUrl: href ? `https://www.transfermarkt.es${href}` : '',
        number,
        positionRaw,
        age: age || 25,
        birthDate,
        nationalities: flags,
        nationality: flags[0] || 'Desconocido',
        marketValueText: valueEl?.textContent?.trim() || ''
      });
    }
    return playerList;
  });
  return players;
}

async function scrapeTeamStats(page, team) {
  if (SKIP_STATS) return {};
  const url = `https://www.transfermarkt.es/${team.slug}/leistungsdaten/verein/${team.transfermarktId}/plus/1?saison_id=${SEASON}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(SLOW_MS);
    return await page.evaluate(() => {
      const stats = {};
      const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      for (const row of document.querySelectorAll('table.items > tbody > tr')) {
        if (!row.classList.contains('odd') && !row.classList.contains('even')) continue;
        const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]') || row.querySelector('td.hauptlink');
        if (!nameEl) continue;
        const name = nameEl.textContent.trim().split('\n')[0].trim().replace(/\s+/g, ' ');
        const href = nameEl.getAttribute?.('href') || '';
        const id = href.match(/\/profil\/spieler\/(\d+)/)?.[1] || '';
        const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent.trim());
        let matches = 0, goals = 0, assists = 0, minutes = 0;
        for (const txt of cells) {
          if (txt.includes("'") && !minutes) minutes = Number.parseInt(txt.replace(/[^\d]/g, ''), 10) || 0;
        }
        // Transfermarkt cambia columnas por temporada; estos índices son robustos para la tabla ES actual.
        matches = Number.parseInt(cells[7], 10) || 0;
        goals = cells[9] && cells[9] !== '-' ? Number.parseInt(cells[9], 10) || 0 : 0;
        assists = cells[10] && cells[10] !== '-' ? Number.parseInt(cells[10], 10) || 0 : 0;
        const value = { matches, goals, assists, minutes, statName: name };
        if (id) stats[`id:${id}`] = value;
        stats[`name:${normalize(name)}`] = value;
      }
      return stats;
    });
  } catch (error) {
    return { _error: error.message };
  }
}

function matchStats(player, stats) {
  if (!stats || stats._error) return {};
  const idHit = player.transfermarktId ? stats[`id:${player.transfermarktId}`] : null;
  if (idHit) return idHit;
  const key = `name:${player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()}`;
  return stats[key] || {};
}

function normalizeSeasonDataset(rawLeagues) {
  const teams = [];
  const players = [];
  const squads = [];
  const leagues = [];

  for (const rawLeague of rawLeagues) {
    const { league, rawTeams } = rawLeague;
    let leaguePlayerCount = 0;
    for (const rawTeam of rawTeams) {
      const team = {
        id: rawTeam.stableId,
        name: rawTeam.name,
        slug: slugify(rawTeam.name),
        leagueId: league.key,
        country: league.country,
        tier: league.tier,
        rank: rawTeam.rank,
        marketValue: rawTeam.marketValue,
        source: rawTeam.source
      };
      const teamPlayers = [];
      for (const rawPlayer of rawTeam.players || []) {
        const playerBase = {
          id: rawPlayer.transfermarktId ? `tm-player-${rawPlayer.transfermarktId}` : `hist-player-${slugify(rawPlayer.name)}-${rawTeam.stableId}`,
          name: rawPlayer.name,
          position: mapPosition(rawPlayer.positionRaw),
          positionRaw: rawPlayer.positionRaw,
          age: rawPlayer.age || 25,
          birthDate: rawPlayer.birthDate || '',
          nationality: rawPlayer.nationality || 'Desconocido',
          nationalities: rawPlayer.nationalities || [],
          marketValue: parseMarketValue(rawPlayer.marketValueText),
          marketValueText: rawPlayer.marketValueText,
          matches: rawPlayer.matches || 0,
          goals: rawPlayer.goals || 0,
          assists: rawPlayer.assists || 0,
          minutes: rawPlayer.minutes || 0,
          source: { provider: 'transfermarkt', id: rawPlayer.transfermarktId, url: rawPlayer.profileUrl }
        };
        const enriched = enrichPlayerRatings(playerBase, { ...team, leagueTeamCount: rawTeams.length }, league);
        players.push(enriched);
        teamPlayers.push(enriched.id);
        squads.push({ season: seasonLabel(SEASON), leagueId: league.key, teamId: team.id, playerId: enriched.id, number: rawPlayer.number, role: null });
      }
      team.playerIds = teamPlayers;
      team.playerCount = teamPlayers.length;
      team.avgOverall = teamPlayers.length ? Math.round(teamPlayers.reduce((sum, id) => sum + (players.find((p) => p.id === id)?.overall || 0), 0) / teamPlayers.length) : (LEAGUE_BASE_BY_TIER?.[league.tier] || 65);
      leaguePlayerCount += team.playerCount;
      teams.push(team);
    }
    leagues.push({
      id: league.key,
      name: league.name,
      country: league.country,
      tier: league.tier,
      priority: league.priority,
      teamCount: rawTeams.length,
      playerCount: leaguePlayerCount,
      source: { provider: 'transfermarkt', competitionId: league.tmId, url: transfermarktLeagueUrl(league, SEASON) }
    });
  }
  return { teams, players, squads, leagues };
}

async function main() {
  const label = seasonLabel(SEASON);
  const leagues = pickLeagues();
  if (!leagues.length) throw new Error('No hay ligas aplicables para esa temporada/filtro');

  const rawDir = path.join(RAW_ROOT, label);
  const seasonDir = path.join(SEASON_ROOT, label);
  mkdirp(rawDir); mkdirp(seasonDir);

  console.log(`🏟️ Scraping histórico ${label}: ${leagues.map((l) => l.key).join(', ')}`);
  const rawLeagueResults = [];
  let browser = null;
  let page = null;

  async function restartBrowser(reason = '') {
    if (browser) await browser.close().catch(() => {});
    if (reason) console.log(`↻ Reiniciando Chromium${reason ? ` (${reason})` : ''}`);
    const launched = await launch();
    browser = launched.browser;
    page = launched.page;
  }

  async function scrapeLeagueWithRetry(league) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (!page) await restartBrowser('inicio');
        const teams = await scrapeLeagueTeams(page, league);
        const selectedTeams = MAX_TEAMS ? teams.slice(0, MAX_TEAMS) : teams;
        console.log(`Equipos: ${selectedTeams.length}/${teams.length}`);
        for (let i = 0; i < selectedTeams.length; i++) {
          const team = selectedTeams[i];
          try {
            const squad = await scrapeTeamSquad(page, team);
            const stats = await scrapeTeamStats(page, team);
            team.players = squad.map((p) => ({ ...p, ...matchStats(p, stats) }));
            console.log(`  [${i + 1}/${selectedTeams.length}] ${team.name}: ${team.players.length} jugadores`);
          } catch (error) {
            if (isRetryableScrapeError(error)) {
              await restartBrowser(`fallo en equipo ${team.name}; se continúa con el siguiente`);
            }
            team.players = [];
            team.error = error.message;
            console.log(`  [${i + 1}/${selectedTeams.length}] ${team.name}: ERROR ${error.message}`);
          }
          await sleep(SLOW_MS);
        }
        return { league, season: label, rawTeams: selectedTeams, scrapedAt: new Date().toISOString() };
      } catch (error) {
        if (attempt < 2 && isRetryableScrapeError(error)) {
          console.log(`⚠️ ${league.key}: ${error.message}; relanzando Chromium y reintentando una vez`);
          await restartBrowser(`retry ${league.key}`);
          await sleep(Math.max(SLOW_MS, 1000));
          continue;
        }
        if (league.priority !== 'major') {
          console.log(`⚠️ ${league.key}: se omite liga menor tras error: ${error.message}`);
          return { league, season: label, rawTeams: [], scrapedAt: new Date().toISOString(), error: error.message };
        }
        throw error;
      }
    }
    throw new Error(`No se pudo scrapear ${league.key}`);
  }

  try {
    await restartBrowser('inicio');
    for (const league of leagues) {
      console.log(`\n=== ${league.key} ===`);
      const rawLeague = await scrapeLeagueWithRetry(league);
      fs.writeFileSync(path.join(rawDir, `${league.key}.json`), JSON.stringify(rawLeague, null, 2));
      rawLeagueResults.push(rawLeague);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  if (MERGE_EXISTING_RAW) {
    const scrapedKeys = new Set(rawLeagueResults.map((result) => result?.league?.key).filter(Boolean));
    const existingFiles = fs.existsSync(rawDir)
      ? fs.readdirSync(rawDir).filter((file) => file.endsWith('.json'))
      : [];
    for (const file of existingFiles) {
      const fullPath = path.join(rawDir, file);
      try {
        const rawLeague = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const key = rawLeague?.league?.key || file.replace(/\.json$/, '');
        if (!key || scrapedKeys.has(key)) continue;
        rawLeagueResults.push(rawLeague);
      } catch (error) {
        console.warn(`⚠️ No se pudo reutilizar raw existente ${file}: ${error.message}`);
      }
    }
    rawLeagueResults.sort((a, b) => {
      const ai = HISTORICAL_LEAGUES.findIndex((league) => league.key === a?.league?.key && league.name === a?.league?.name);
      const bi = HISTORICAL_LEAGUES.findIndex((league) => league.key === b?.league?.key && league.name === b?.league?.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    console.log(`🔁 Merge raw activo: ${rawLeagueResults.length} ligas normalizadas para ${label}`);
  }

  const dataset = normalizeSeasonDataset(rawLeagueResults);
  fs.writeFileSync(path.join(seasonDir, 'teams.json'), JSON.stringify(dataset.teams, null, 2));
  fs.writeFileSync(path.join(seasonDir, 'players.json'), JSON.stringify(dataset.players, null, 2));
  fs.writeFileSync(path.join(seasonDir, 'squads.json'), JSON.stringify(dataset.squads, null, 2));
  fs.writeFileSync(path.join(seasonDir, 'leagues.json'), JSON.stringify(dataset.leagues, null, 2));
  const manifest = {
    id: label,
    seasonStartYear: SEASON,
    label,
    generatedAt: new Date().toISOString(),
    source: 'transfermarkt',
    ratingSource: 'inferred_transfermarkt_v1',
    files: {
      teams: 'teams.json', players: 'players.json', squads: 'squads.json', leagues: 'leagues.json'
    },
    counts: {
      leagues: dataset.leagues.length,
      teams: dataset.teams.length,
      players: dataset.players.length,
      squads: dataset.squads.length
    },
    leagueIds: dataset.leagues.map((l) => l.id)
  };
  fs.writeFileSync(path.join(seasonDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Dataset ${label}: ${manifest.counts.leagues} ligas, ${manifest.counts.teams} equipos, ${manifest.counts.players} jugadores`);
  console.log(`📁 ${seasonDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
