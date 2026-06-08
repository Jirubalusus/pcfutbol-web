#!/usr/bin/env node
/** Builds a global index/manifest from generated historical season datasets. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SEASONS_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'seasons');
const OUT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'index.json');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function exists(p) { return fs.existsSync(p); }
function isPlayableManifest(manifest) {
  const counts = manifest?.counts || {};
  return counts.leagues >= 1 && counts.teams >= 1 && counts.players >= 1 && counts.squads >= 1;
}

const seasons = [];
const skipped = [];
if (exists(SEASONS_ROOT)) {
  for (const dir of fs.readdirSync(SEASONS_ROOT).sort().reverse()) {
    const full = path.join(SEASONS_ROOT, dir);
    const manifestPath = path.join(full, 'manifest.json');
    if (!fs.statSync(full).isDirectory() || !exists(manifestPath)) continue;
    const manifest = readJson(manifestPath);
    if (!isPlayableManifest(manifest)) {
      skipped.push({ id: manifest.id || dir, reason: 'non_playable_or_empty_counts', counts: manifest.counts || null });
      continue;
    }
    seasons.push({
      id: manifest.id,
      label: manifest.label,
      seasonStartYear: manifest.seasonStartYear,
      source: manifest.source,
      ratingSource: manifest.ratingSource,
      counts: manifest.counts,
      leagueIds: manifest.leagueIds,
      basePath: `seasons/${manifest.id}`,
      manifest: `seasons/${manifest.id}/manifest.json`
    });
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  version: 1,
  storageLayout: 'artifacts/historical-db/seasons/{season}/',
  notes: [
    'Datasets completos van a Firebase Storage / object storage como JSON o JSON.gz.',
    'Firestore solo debe guardar este índice/metadata y referencias a ficheros.',
    'Una partida histórica usa este estado inicial y luego la simulación diverge libremente.'
  ],
  skipped,
  seasons
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index, null, 2));
console.log(`✅ Historical index: ${seasons.length} seasons → ${OUT}`);
