#!/usr/bin/env node
/**
 * Audit de cobertura histórica en Transfermarkt para PC Gaffer.
 *
 * No importa datos al juego ni a Firebase: solo comprueba si una liga/temporada
 * tiene página de competición, lista de equipos y opcionalmente plantilla de muestra.
 *
 * Uso:
 *   node scripts/historical-db/audit-transfermarkt-coverage.mjs --from 2026 --to 2000
 *   node scripts/historical-db/audit-transfermarkt-coverage.mjs --from 2026 --to 2024 --major-only
 *   node scripts/historical-db/audit-transfermarkt-coverage.mjs --from 2025 --to 2025 --sample-squads
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'artifacts', 'historical-scrape-audit');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
function hasFlag(name) { return args.includes(name); }

const FROM = Number(argValue('--from', 2026));
const TO = Number(argValue('--to', 2000));
const MAJOR_ONLY = hasFlag('--major-only');
const SAMPLE_SQUADS = hasFlag('--sample-squads');
const SLOW_MS = Number(argValue('--slow-ms', 650));
const TIMEOUT = Number(argValue('--timeout-ms', 30000));
const MAX_LEAGUES = Number(argValue('--max-leagues', 0));
const MODE_SUFFIX = `${MAJOR_ONLY ? 'major' : 'all'}${SAMPLE_SQUADS ? '-sample-squads' : ''}`;

// seasonYear 2025 => temporada 2025/26. seasonYear 2026 normalmente aún no existirá.
const MAJOR_LEAGUES = new Set(['laliga', 'premier', 'bundesliga', 'seriea', 'ligue1']);

// Ligas que ya existen en el proyecto / scripts actuales.
// priority: major = si falla una de estas, esa temporada queda marcada SKIP_MAJOR_MISSING.
// minSeason: competición con formato moderno que no existía antes.
const LEAGUES = [
  { key: 'laliga', name: 'LaLiga', tmId: 'ES1', slug: 'laliga', country: 'ES', tier: 1, priority: 'major' },
  { key: 'laliga2', name: 'LaLiga 2', tmId: 'ES2', slug: 'segunda-division', country: 'ES', tier: 2, priority: 'secondary' },
  { key: 'primeraRfefG1', name: 'Primera Federación G1', tmId: 'E3G1', slug: 'primera-federacion-grupo-1', country: 'ES', tier: 3, priority: 'minor', minSeason: 2021 },
  { key: 'primeraRfefG2', name: 'Primera Federación G2', tmId: 'E3G2', slug: 'primera-federacion-grupo-2', country: 'ES', tier: 3, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG1', name: 'Segunda Federación G1', tmId: 'E4G1', slug: 'segunda-federacion-grupo-1', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG2', name: 'Segunda Federación G2', tmId: 'E4G2', slug: 'segunda-federacion-grupo-2', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG3', name: 'Segunda Federación G3', tmId: 'E4G3', slug: 'segunda-federacion-grupo-3', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG4', name: 'Segunda Federación G4', tmId: 'E4G4', slug: 'segunda-federacion-grupo-4', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG5', name: 'Segunda Federación G5', tmId: 'E4G5', slug: 'segunda-federacion-grupo-5', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'premier', name: 'Premier League', tmId: 'GB1', slug: 'premier-league', country: 'GB', tier: 1, priority: 'major' },
  { key: 'championship', name: 'Championship', tmId: 'GB2', slug: 'championship', country: 'GB', tier: 2, priority: 'secondary' },
  { key: 'bundesliga', name: 'Bundesliga', tmId: 'L1', slug: 'bundesliga', country: 'DE', tier: 1, priority: 'major' },
  { key: 'bundesliga2', name: '2. Bundesliga', tmId: 'L2', slug: '2-bundesliga', country: 'DE', tier: 2, priority: 'secondary' },
  { key: 'seriea', name: 'Serie A', tmId: 'IT1', slug: 'serie-a', country: 'IT', tier: 1, priority: 'major' },
  { key: 'serieB', name: 'Serie B', tmId: 'IT2', slug: 'serie-b', country: 'IT', tier: 2, priority: 'secondary' },
  { key: 'ligue1', name: 'Ligue 1', tmId: 'FR1', slug: 'ligue-1', country: 'FR', tier: 1, priority: 'major' },
  { key: 'ligue2', name: 'Ligue 2', tmId: 'FR2', slug: 'ligue-2', country: 'FR', tier: 2, priority: 'secondary' },
  { key: 'eredivisie', name: 'Eredivisie', tmId: 'NL1', slug: 'eredivisie', country: 'NL', tier: 1, priority: 'secondary' },
  { key: 'primeiraLiga', name: 'Primeira Liga', tmId: 'PO1', slug: 'liga-portugal-betclic', country: 'PT', tier: 1, priority: 'secondary' },
  { key: 'belgianPro', name: 'Jupiler Pro League', tmId: 'BE1', slug: 'jupiler-pro-league', country: 'BE', tier: 1, priority: 'secondary' },
  { key: 'superLig', name: 'Süper Lig', tmId: 'TR1', slug: 'super-lig', country: 'TR', tier: 1, priority: 'secondary' },
  { key: 'scottishPrem', name: 'Scottish Premiership', tmId: 'SC1', slug: 'scottish-premiership', country: 'SC', tier: 1, priority: 'secondary' },
  { key: 'swissSuperLeague', name: 'Swiss Super League', tmId: 'C1', slug: 'super-league', country: 'CH', tier: 1, priority: 'minor' },
  { key: 'austrianBundesliga', name: 'Bundesliga Austria', tmId: 'A1', slug: 'bundesliga', country: 'AT', tier: 1, priority: 'minor' },
  { key: 'greekSuperLeague', name: 'Greek Super League', tmId: 'GR1', slug: 'super-league-1', country: 'GR', tier: 1, priority: 'minor' },
  { key: 'danishSuperliga', name: 'Danish Superliga', tmId: 'DK1', slug: 'superligaen', country: 'DK', tier: 1, priority: 'minor' },
  { key: 'croatianLeague', name: 'HNL Croatia', tmId: 'KR1', slug: 'hrvatska-nogometna-liga', country: 'HR', tier: 1, priority: 'minor' },
  { key: 'czechLeague', name: 'Czech Chance Liga', tmId: 'TS1', slug: 'chance-liga', country: 'CZ', tier: 1, priority: 'minor' },
  { key: 'argentinaPrimera', name: 'Argentina Primera', tmId: 'ARG1', slug: 'torneo-apertura', country: 'AR', tier: 1, priority: 'secondary' },
  { key: 'brasileiraoA', name: 'Brasileirão Série A', tmId: 'BRA1', slug: 'campeonato-brasileiro-serie-a', country: 'BR', tier: 1, priority: 'secondary' },
  { key: 'colombiaPrimera', name: 'Colombia Primera', tmId: 'COL1', slug: 'liga-betplay', country: 'CO', tier: 1, priority: 'minor' },
  { key: 'chilePrimera', name: 'Chile Primera', tmId: 'CLPD', slug: 'liga-de-primera', country: 'CL', tier: 1, priority: 'minor' },
  { key: 'uruguayPrimera', name: 'Uruguay Primera', tmId: 'URU1', slug: 'liga-auf-apertura', country: 'UY', tier: 1, priority: 'minor' },
  { key: 'ecuadorLigaPro', name: 'Ecuador LigaPro', tmId: 'EC1N', slug: 'ligapro-serie-a', country: 'EC', tier: 1, priority: 'minor' },
  { key: 'paraguayPrimera', name: 'Paraguay Primera', tmId: 'PR1A', slug: 'primera-division-apertura', country: 'PY', tier: 1, priority: 'minor' },
  { key: 'peruLiga1', name: 'Perú Liga 1', tmId: 'TDeA', slug: 'liga-1-apertura', country: 'PE', tier: 1, priority: 'minor' },
  { key: 'boliviaPrimera', name: 'Bolivia Primera', tmId: 'BO1A', slug: 'division-profesional', country: 'BO', tier: 1, priority: 'minor' },
  { key: 'venezuelaPrimera', name: 'Venezuela Liga FUTVE', tmId: 'VZ1A', slug: 'liga-futve-apertura', country: 'VE', tier: 1, priority: 'minor' },
  { key: 'mls', name: 'MLS', tmId: 'MLS1', slug: 'major-league-soccer', country: 'US', tier: 1, priority: 'minor' },
  { key: 'ligaMx', name: 'Liga MX', tmId: 'MEX1', slug: 'liga-mx-clausura', country: 'MX', tier: 1, priority: 'minor' },
  { key: 'jleague', name: 'J1 League', tmId: 'JAP1', slug: 'j1-league', country: 'JP', tier: 1, priority: 'minor' },
  { key: 'saudiPro', name: 'Saudi Pro League', tmId: 'SA1', slug: 'saudi-professional-league', country: 'SA', tier: 1, priority: 'minor' }
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function seasonLabel(startYear) { return `${startYear}-${String(startYear + 1).slice(-2)}`; }
function tmUrl(league, season) {
  return `https://www.transfermarkt.es/${league.slug}/startseite/wettbewerb/${league.tmId}/plus/?saison_id=${season}`;
}
function squadUrlFromTeam(teamUrl, season) {
  return teamUrl.replace('/startseite/', '/kader/') + `/saison_id/${season}`;
}

async function probeLeague(page, league, season) {
  if (league.minSeason && season < league.minSeason) {
    return { leagueKey: league.key, leagueName: league.name, priority: league.priority, status: 'not_applicable', reason: `competition starts ${league.minSeason}` };
  }
  const url = tmUrl(league, season);
  const startedAt = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(SLOW_MS);
    const parsed = await page.evaluate(() => {
      const title = document.title;
      const bodyText = document.body?.innerText?.slice(0, 2000) || '';
      const rows = Array.from(document.querySelectorAll('table.items tbody tr'));
      const teams = [];
      const seen = new Set();
      for (const row of rows) {
        const linkEl = row.querySelector('td.hauptlink a[href*="/startseite/verein/"]');
        if (!linkEl) continue;
        const href = linkEl.getAttribute('href') || '';
        const m = href.match(/\/([^/]+)\/startseite\/verein\/(\d+)/);
        if (!m || seen.has(m[2])) continue;
        seen.add(m[2]);
        teams.push({ name: linkEl.textContent.trim().replace(/\s+/g, ' '), slug: m[1], tmId: m[2], url: `https://www.transfermarkt.es${href}` });
      }
      const captcha = /captcha|unusual traffic|Access denied|Pardon Our Interruption/i.test(bodyText + ' ' + title);
      const noData = /No se han encontrado datos|Keine Daten|No data/i.test(bodyText);
      return { title, teamCount: teams.length, teams: teams.slice(0, 3), captcha, noData, sampleText: bodyText.slice(0, 220) };
    });

    let squadSample = null;
    if (SAMPLE_SQUADS && parsed.teams[0]?.url) {
      await page.goto(squadUrlFromTeam(parsed.teams[0].url, season), { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await sleep(SLOW_MS);
      squadSample = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table.items tbody tr'));
        const names = [];
        const seen = new Set();
        for (const row of rows) {
          const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
          if (!nameEl) continue;
          const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
          if (!name || seen.has(name)) continue;
          seen.add(name);
          names.push(name);
        }
        return { playerCount: names.length, samplePlayers: names.slice(0, 5) };
      });
    }

    const ok = parsed.teamCount >= 8 && !parsed.captcha;
    return {
      leagueKey: league.key,
      leagueName: league.name,
      priority: league.priority,
      status: parsed.captcha ? 'blocked' : ok ? 'ok' : parsed.noData ? 'missing' : 'weak',
      teamCount: parsed.teamCount,
      sampleTeams: parsed.teams,
      squadSample,
      url,
      ms: Date.now() - startedAt,
      reason: parsed.captcha ? 'captcha_or_access_denied' : ok ? null : parsed.teamCount ? 'low_team_count' : 'no_teams_parsed'
    };
  } catch (error) {
    return { leagueKey: league.key, leagueName: league.name, priority: league.priority, status: 'error', url, ms: Date.now() - startedAt, reason: error.message };
  }
}

function summarizeSeason(season, leagueResults) {
  const applicable = leagueResults.filter((r) => r.status !== 'not_applicable');
  const ok = applicable.filter((r) => r.status === 'ok');
  const majorMissing = applicable.filter((r) => r.priority === 'major' && r.status !== 'ok');
  const minorMissing = applicable.filter((r) => r.priority !== 'major' && r.status !== 'ok');
  return {
    season,
    label: seasonLabel(season),
    decision: majorMissing.length ? 'skip_year_major_missing' : 'usable_continue_minor_gaps',
    okLeagues: ok.length,
    applicableLeagues: applicable.length,
    majorMissing: majorMissing.map((r) => ({ leagueKey: r.leagueKey, status: r.status, reason: r.reason })),
    minorMissingCount: minorMissing.length,
    totalTeams: ok.reduce((sum, r) => sum + (r.teamCount || 0), 0)
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const leagueList = (MAJOR_ONLY ? LEAGUES.filter((l) => l.priority === 'major') : LEAGUES).slice(0, MAX_LEAGUES || undefined);

async function launchSession() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AppleWebKit/537.36 Chrome/121 Safari/537.36',
    locale: 'es-ES',
    viewport: { width: 1366, height: 768 }
  });
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'media'].includes(type)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function closeSession(session) {
  if (!session?.browser) return;
  try {
    await session.browser.close();
  } catch {
    // El navegador puede estar ya cerrado si Chromium se cayó durante un goto.
  }
}

function isRetryableProbeError(result) {
  return result?.status === 'error' && /Target page, context or browser has been closed|Browser has been closed|Target closed|Timeout \d+ms exceeded/i.test(result.reason || '');
}

const report = { generatedAt: new Date().toISOString(), from: FROM, to: TO, sampleSquads: SAMPLE_SQUADS, leagues: leagueList, seasons: [] };
let session = null;

try {
  for (let season = FROM; season >= TO; season--) {
    console.log(`\n=== ${seasonLabel(season)} (${season}) ===`);
    await closeSession(session);
    session = await launchSession();
    const leagueResults = [];
    for (const league of leagueList) {
      let result = await probeLeague(session.page, league, season);
      if (isRetryableProbeError(result)) {
        console.log(`↻ ${league.key.padEnd(20)} fallo transitorio; relanzando Chromium y reintentando una vez`);
        await closeSession(session);
        session = await launchSession();
        result = await probeLeague(session.page, league, season);
      }
      leagueResults.push(result);
      const icon = result.status === 'ok' ? '✅' : result.status === 'not_applicable' ? '·' : result.priority === 'major' ? '🛑' : '⚠️';
      console.log(`${icon} ${league.key.padEnd(20)} ${String(result.teamCount ?? '-').padStart(2)} equipos ${result.status}${result.reason ? ` (${result.reason})` : ''}`);
    }
    const summary = summarizeSeason(season, leagueResults);
    console.log(`=> ${summary.decision}: ${summary.okLeagues}/${summary.applicableLeagues} ligas OK, ${summary.totalTeams} equipos`);
    report.seasons.push({ ...summary, leagues: leagueResults });

    const partialPath = path.join(OUT_DIR, `transfermarkt-coverage-${MODE_SUFFIX}-${FROM}-${TO}.json`);
    fs.writeFileSync(partialPath, JSON.stringify(report, null, 2));
  }
} finally {
  await closeSession(session);
}

const outJson = path.join(OUT_DIR, `transfermarkt-coverage-${MODE_SUFFIX}-${FROM}-${TO}.json`);
const outMd = path.join(OUT_DIR, `transfermarkt-coverage-${MODE_SUFFIX}-${FROM}-${TO}.md`);
const lines = [];
lines.push(`# Transfermarkt historical coverage audit ${FROM}→${TO}`);
lines.push('');
lines.push(`Generated: ${report.generatedAt}`);
lines.push(`Sample squads: ${SAMPLE_SQUADS ? 'yes' : 'no'}`);
lines.push('');
for (const season of report.seasons) {
  lines.push(`## ${season.label}`);
  lines.push(`Decision: **${season.decision}**`);
  lines.push(`OK: ${season.okLeagues}/${season.applicableLeagues} leagues · teams parsed: ${season.totalTeams}`);
  if (season.majorMissing.length) lines.push(`Major missing: ${season.majorMissing.map((m) => `${m.leagueKey} (${m.status})`).join(', ')}`);
  const weak = season.leagues.filter((l) => l.status !== 'ok' && l.status !== 'not_applicable');
  if (weak.length) lines.push(`Gaps: ${weak.map((l) => `${l.leagueKey}:${l.status}`).join(', ')}`);
  lines.push('');
}
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
fs.writeFileSync(outMd, lines.join('\n'));
console.log(`\nSaved JSON: ${outJson}`);
console.log(`Saved MD:   ${outMd}`);
