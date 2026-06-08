#!/usr/bin/env node
/**
 * Audita cobertura de escudos históricos por temporada contra public/historical-db/crests/manifest.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SEASON_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'seasons');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'public', 'historical-db', 'crests', 'manifest.json');
const REPORT_PATH = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'crest-coverage-report.json');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function extractTmId(team) {
  const raw = team?.source?.id || team?.transfermarktId || team?.id || team?.stableId || '';
  const str = String(raw);
  const match = str.match(/(?:tm-team-)?(\d+)/);
  return match?.[1] || '';
}

const manifest = fs.existsSync(MANIFEST_PATH) ? readJson(MANIFEST_PATH) : { crests: {} };
const crests = manifest.crests || {};
const seasons = fs.existsSync(SEASON_ROOT)
  ? fs.readdirSync(SEASON_ROOT).filter((name) => fs.existsSync(path.join(SEASON_ROOT, name, 'teams.json'))).sort().reverse()
  : [];

const report = [];
for (const season of seasons) {
  const teams = readJson(path.join(SEASON_ROOT, season, 'teams.json'));
  const missing = [];
  let ready = 0;
  for (const team of teams) {
    const tmId = extractTmId(team);
    const key = tmId ? `tm-team-${tmId}` : '';
    if (key && crests[key]?.status === 'ready') {
      ready += 1;
    } else {
      missing.push({ id: team.id, name: team.name, leagueId: team.leagueId, tmId: tmId || null });
    }
  }
  report.push({ season, teams: teams.length, ready, missing: missing.length, coveragePct: teams.length ? Number(((ready / teams.length) * 100).toFixed(2)) : 0, missingTeams: missing.slice(0, 25) });
}
fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), manifest: { total: manifest.total, ready: manifest.ready, missing: manifest.missing }, seasons: report }, null, 2));
for (const row of report) {
  console.log(`${row.season}: ${row.ready}/${row.teams} (${row.coveragePct}%) missing=${row.missing}`);
  if (row.missing) console.log('  ejemplos:', row.missingTeams.slice(0, 5).map((t) => `${t.name} [${t.id}]`).join(', '));
}
console.log(`REPORT ${REPORT_PATH}`);
