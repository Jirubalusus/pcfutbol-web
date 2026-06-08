#!/usr/bin/env node
/**
 * Descarga escudos históricos de Transfermarkt para todos los equipos de los datasets.
 * Usa Playwright APIRequestContext para respetar el flujo de scraping existente.
 *
 * Salida pública:
 *   public/historical-db/crests/tm-team-<id>.png
 *   public/historical-db/crests/manifest.json
 */
import { request } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACT_SEASONS_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'seasons');
const PUBLIC_CREST_ROOT = path.join(PROJECT_ROOT, 'public', 'historical-db', 'crests');
const MANIFEST_PATH = path.join(PUBLIC_CREST_ROOT, 'manifest.json');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
function hasFlag(name) { return args.includes(name); }

const SEASON_ARG = argValue('--seasons', 'all');
const LIMIT = Number(argValue('--limit', 0));
const CONCURRENCY = Math.max(1, Number(argValue('--concurrency', 8)) || 8);
const FORCE = hasFlag('--force');
const TIMEOUT_MS = Number(argValue('--timeout-ms', 30000));

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function seasonDirs() {
  const all = fs.existsSync(ARTIFACT_SEASONS_ROOT)
    ? fs.readdirSync(ARTIFACT_SEASONS_ROOT).filter((name) => fs.existsSync(path.join(ARTIFACT_SEASONS_ROOT, name, 'teams.json'))).sort().reverse()
    : [];
  if (SEASON_ARG === 'all') return all;
  const wanted = new Set(SEASON_ARG.split(',').map((s) => s.trim()).filter(Boolean));
  return all.filter((name) => wanted.has(name));
}
function extractTmId(team) {
  const raw = team?.source?.id || team?.transfermarktId || team?.id || team?.stableId || '';
  const str = String(raw);
  const match = str.match(/(?:tm-team-)?(\d+)/);
  return match?.[1] || '';
}
function collectTeams() {
  const teams = new Map();
  for (const season of seasonDirs()) {
    const file = path.join(ARTIFACT_SEASONS_ROOT, season, 'teams.json');
    let rows = [];
    try { rows = readJson(file); } catch { continue; }
    for (const team of rows) {
      const tmId = extractTmId(team);
      if (!tmId) continue;
      const key = `tm-team-${tmId}`;
      const current = teams.get(key) || {
        id: key,
        transfermarktId: tmId,
        names: new Set(),
        slugs: new Set(),
        seasons: new Set(),
        sourceUrls: new Set()
      };
      if (team.name) current.names.add(team.name);
      if (team.slug) current.slugs.add(team.slug);
      if (team.source?.url) current.sourceUrls.add(team.source.url);
      current.seasons.add(season);
      teams.set(key, current);
    }
  }
  const out = Array.from(teams.values()).map((team) => ({
    ...team,
    names: Array.from(team.names).sort(),
    slugs: Array.from(team.slugs).sort(),
    seasons: Array.from(team.seasons).sort(),
    sourceUrls: Array.from(team.sourceUrls).sort()
  })).sort((a, b) => Number(a.transfermarktId) - Number(b.transfermarktId));
  return LIMIT ? out.slice(0, LIMIT) : out;
}
function loadExistingManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { generatedAt: null, total: 0, crests: {} };
  try { return readJson(MANIFEST_PATH); } catch { return { generatedAt: null, total: 0, crests: {} }; }
}
async function validateAndNormalizePng(buffer, outPath) {
  const image = sharp(buffer, { failOn: 'none' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < 8 || meta.height < 8) {
    throw new Error(`imagen demasiado pequeña o inválida (${meta.width}x${meta.height})`);
  }
  await image.png().toFile(outPath);
  return { width: meta.width, height: meta.height, format: meta.format };
}
async function downloadOne(api, team) {
  const fileName = `${team.id}.png`;
  const outPath = path.join(PUBLIC_CREST_ROOT, fileName);
  const publicPath = `/historical-db/crests/${fileName}`;
  const sourceUrl = `https://tmssl.akamaized.net/images/wappen/head/${team.transfermarktId}.png`;

  if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).size > 500) {
    return { status: 'cached', sourceUrl, publicPath, bytes: fs.statSync(outPath).size };
  }

  const response = await api.get(sourceUrl, {
    timeout: TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': team.sourceUrls[0] || 'https://www.transfermarkt.es/'
    }
  });
  if (!response.ok()) {
    throw new Error(`HTTP ${response.status()}`);
  }
  const contentType = response.headers()['content-type'] || '';
  if (!contentType.includes('image')) {
    throw new Error(`content-type inesperado: ${contentType}`);
  }
  const buffer = Buffer.from(await response.body());
  if (buffer.length < 500) throw new Error(`imagen vacía o placeholder (${buffer.length} bytes)`);
  const meta = await validateAndNormalizePng(buffer, outPath);
  return { status: 'downloaded', sourceUrl, publicPath, bytes: fs.statSync(outPath).size, ...meta };
}
async function runPool(items, worker) {
  let index = 0;
  const results = [];
  async function next() {
    while (index < items.length) {
      const item = items[index++];
      results.push(await worker(item));
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next));
  return results;
}

mkdirp(PUBLIC_CREST_ROOT);
const existingManifest = loadExistingManifest();
const teams = collectTeams();
console.log(`🛡️ Equipos únicos con Transfermarkt ID: ${teams.length}`);
console.log(`📁 Destino: ${PUBLIC_CREST_ROOT}`);

const api = await request.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' }
});

let done = 0;
let downloaded = 0;
let cached = 0;
let failed = 0;
const crests = { ...(existingManifest.crests || {}) };

await runPool(teams, async (team) => {
  try {
    const result = await downloadOne(api, team);
    crests[team.id] = {
      id: team.id,
      transfermarktId: team.transfermarktId,
      names: team.names,
      slugs: team.slugs,
      seasons: team.seasons,
      sourceUrl: result.sourceUrl,
      publicPath: result.publicPath,
      bytes: result.bytes,
      width: result.width || crests[team.id]?.width || null,
      height: result.height || crests[team.id]?.height || null,
      status: 'ready',
      updatedAt: new Date().toISOString()
    };
    if (result.status === 'cached') cached += 1; else downloaded += 1;
  } catch (error) {
    failed += 1;
    crests[team.id] = {
      id: team.id,
      transfermarktId: team.transfermarktId,
      names: team.names,
      slugs: team.slugs,
      seasons: team.seasons,
      sourceUrl: `https://tmssl.akamaized.net/images/wappen/head/${team.transfermarktId}.png`,
      status: 'missing',
      error: String(error?.message || error),
      updatedAt: new Date().toISOString()
    };
    console.warn(`⚠️ ${team.id} ${team.names[0] || ''}: ${error.message}`);
  } finally {
    done += 1;
    if (done % 50 === 0 || done === teams.length) {
      console.log(`Progreso: ${done}/${teams.length} (descargados ${downloaded}, cache ${cached}, fallidos ${failed})`);
    }
  }
});

await api.dispose();

const ready = Object.values(crests).filter((c) => c.status === 'ready').length;
const missing = Object.values(crests).filter((c) => c.status !== 'ready').length;
const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'transfermarkt-team-wappen-head-playwright-request-v1',
  total: Object.keys(crests).length,
  ready,
  missing,
  crests
};
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`✅ Escudos listos: ${ready}`);
console.log(`⚠️ Escudos pendientes/fallidos: ${missing}`);
console.log(`🧾 Manifest: ${MANIFEST_PATH}`);
