#!/usr/bin/env node
/** Compresses generated historical JSON datasets to .json.gz for Firebase Storage. */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
const season = argValue('--season', '');
const root = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'seasons');
const seasons = season ? [season] : (fs.existsSync(root) ? fs.readdirSync(root) : []);
const datasetFiles = ['teams.json', 'players.json', 'squads.json', 'leagues.json'];

let written = 0;
for (const s of seasons) {
  const dir = path.join(root, s);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
  for (const file of datasetFiles) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    const gz = zlib.gzipSync(fs.readFileSync(p), { level: 9 });
    fs.writeFileSync(`${p}.gz`, gz);
    written++;
    console.log(`✅ ${s}/${file}.gz ${(gz.length / 1024).toFixed(1)} KB`);
  }
  const manifestPath = path.join(dir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.files = {
      teams: 'teams.json.gz',
      players: 'players.json.gz',
      squads: 'squads.json.gz',
      leagues: 'leagues.json.gz'
    };
    manifest.compressed = true;
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
console.log(`Comprimidos: ${written}`);
