#!/usr/bin/env node
import { request } from 'playwright';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const SEASON_ROOT = path.join(PROJECT_ROOT, 'public', 'historical-db', 'seasons');
const BASE_URL = process.argv[2] || 'http://127.0.0.1:4173';
const REPORT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'playwright-crest-http-report.json');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function extractTmId(team) {
  const raw = team?.source?.id || team?.transfermarktId || team?.id || team?.stableId || '';
  const match = String(raw).match(/(?:tm-team-)?(\d+)/);
  return match?.[1] || '';
}
async function runPool(items, limit, worker) {
  let i = 0;
  const out = [];
  async function next() {
    while (i < items.length) {
      const item = items[i++];
      out.push(await worker(item));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

const api = await request.newContext();
const seasons = fs.readdirSync(SEASON_ROOT).filter((name) => fs.existsSync(path.join(SEASON_ROOT, name, 'teams.json'))).sort();
const rows = [];
for (const season of seasons) {
  const teams = readJson(path.join(SEASON_ROOT, season, 'teams.json'));
  const unique = new Map();
  for (const team of teams) {
    const tmId = extractTmId(team);
    if (tmId) unique.set(`tm-team-${tmId}`, team);
  }
  let ok = 0;
  const failures = [];
  await runPool(Array.from(unique.entries()), 24, async ([id, team]) => {
    const url = `${BASE_URL}/historical-db/crests/${id}.png`;
    try {
      const res = await api.get(url, { timeout: 20000 });
      const ct = res.headers()['content-type'] || '';
      const body = await res.body();
      if (res.ok() && ct.includes('image') && body.length > 500) ok += 1;
      else failures.push({ id, name: team.name, status: res.status(), contentType: ct, bytes: body.length });
    } catch (error) {
      failures.push({ id, name: team.name, error: String(error?.message || error) });
    }
  });
  rows.push({ season, teams: teams.length, uniqueCrests: unique.size, ok, missing: unique.size - ok, failures: failures.slice(0, 20) });
  console.log(`${season}: ${ok}/${unique.size} imágenes HTTP OK missing=${unique.size - ok}`);
  if (failures.length) console.log('  ejemplos:', failures.slice(0, 5).map((f) => `${f.name} [${f.id}]`).join(', '));
}
await api.dispose();
fs.writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, seasons: rows }, null, 2));
console.log(`REPORT ${REPORT}`);
if (rows.some((row) => row.missing > 0)) process.exit(1);
