#!/usr/bin/env node
/** Resolve remaining missing historical crests by visiting Transfermarkt pages with Playwright. */
import { chromium, request } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SEASON_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'historical-db', 'seasons');
const PUBLIC_CREST_ROOT = path.join(PROJECT_ROOT, 'public', 'historical-db', 'crests');
const MANIFEST_PATH = path.join(PUBLIC_CREST_ROOT, 'manifest.json');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function extractTmId(team) {
  const raw = team?.source?.id || team?.transfermarktId || team?.id || team?.stableId || '';
  const match = String(raw).match(/(?:tm-team-)?(\d+)/);
  return match?.[1] || '';
}
function collectTeamsById() {
  const map = new Map();
  for (const season of fs.readdirSync(SEASON_ROOT).sort()) {
    const file = path.join(SEASON_ROOT, season, 'teams.json');
    if (!fs.existsSync(file)) continue;
    for (const team of readJson(file)) {
      const tmId = extractTmId(team);
      if (!tmId) continue;
      const id = `tm-team-${tmId}`;
      const current = map.get(id) || { id, transfermarktId: tmId, names: new Set(), slugs: new Set(), seasons: new Set(), sourceUrls: new Set() };
      if (team.name) current.names.add(team.name);
      if (team.slug) current.slugs.add(team.slug);
      if (team.source?.url) current.sourceUrls.add(team.source.url);
      current.seasons.add(season);
      map.set(id, current);
    }
  }
  return map;
}
async function normalizeAndWrite(buffer, outPath) {
  const img = sharp(buffer, { failOn: 'none' });
  const meta = await img.metadata();
  if (!meta.width || !meta.height || buffer.length < 500) throw new Error(`invalid image ${meta.width}x${meta.height} bytes=${buffer.length}`);
  await img.png().toFile(outPath);
  return { width: meta.width, height: meta.height, format: meta.format, bytes: fs.statSync(outPath).size };
}
async function downloadImage(api, url, referer, outPath) {
  const res = await api.get(url, {
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': referer || 'https://www.transfermarkt.es/'
    }
  });
  if (!res.ok()) throw new Error(`HTTP ${res.status()} ${url}`);
  return normalizeAndWrite(Buffer.from(await res.body()), outPath);
}

const manifest = readJson(MANIFEST_PATH);
const teamsById = collectTeamsById();
const missing = Object.values(manifest.crests || {}).filter((c) => c.status !== 'ready');
console.log(`Playwright fallback missing=${missing.length}`);
if (!missing.length) process.exit(0);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
  locale: 'es-ES',
  extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' }
});
const api = await request.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' }
});

for (const crest of missing) {
  const team = teamsById.get(crest.id);
  const urls = Array.from(team?.sourceUrls || []);
  const fallbackUrl = `https://www.transfermarkt.es/-/startseite/verein/${crest.transfermarktId}`;
  const pageUrl = urls[0] || fallbackUrl;
  const outPath = path.join(PUBLIC_CREST_ROOT, `${crest.id}.png`);
  try {
    console.log(`→ ${crest.id} ${team?.names ? Array.from(team.names)[0] : crest.names?.[0] || ''}`);
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const candidates = await page.evaluate((tmId) => {
      const srcs = Array.from(document.images).map((img) => img.currentSrc || img.src).filter(Boolean);
      const htmlMatches = Array.from(document.documentElement.innerHTML.matchAll(/https?:\/\/[^"'<>\s]+images\/wappen\/[^"'<>\s]+/g)).map((m) => m[0]);
      return Array.from(new Set([...srcs, ...htmlMatches]))
        .filter((src) => src.includes('/wappen/') || src.includes(`/verein/${tmId}`));
    }, crest.transfermarktId);
    await page.close();

    const directCandidates = [
      `https://tmssl.akamaized.net/images/wappen/head/${crest.transfermarktId}.png`,
      `https://tmssl.akamaized.net/images/wappen/normal/${crest.transfermarktId}.png`,
      `https://tmssl.akamaized.net/images/wappen/medium/${crest.transfermarktId}.png`,
      ...candidates
    ];
    let saved = null;
    let lastError = null;
    for (const src of Array.from(new Set(directCandidates))) {
      try {
        saved = await downloadImage(api, src, pageUrl, outPath);
        manifest.crests[crest.id] = {
          ...crest,
          names: Array.from(team?.names || crest.names || []).sort(),
          slugs: Array.from(team?.slugs || crest.slugs || []).sort(),
          seasons: Array.from(team?.seasons || crest.seasons || []).sort(),
          sourceUrl: src,
          publicPath: `/historical-db/crests/${crest.id}.png`,
          status: 'ready',
          error: null,
          updatedAt: new Date().toISOString(),
          ...saved
        };
        console.log(`  ✅ ${src} ${saved.width}x${saved.height}`);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!saved) throw lastError || new Error('no image candidate worked');
  } catch (error) {
    console.warn(`  ⚠️ ${crest.id}: ${error.message}`);
    manifest.crests[crest.id] = { ...crest, error: `playwright-fallback: ${error.message}`, updatedAt: new Date().toISOString() };
  }
}

await api.dispose();
await browser.close();
manifest.generatedAt = new Date().toISOString();
manifest.ready = Object.values(manifest.crests).filter((c) => c.status === 'ready').length;
manifest.missing = Object.values(manifest.crests).filter((c) => c.status !== 'ready').length;
manifest.total = Object.keys(manifest.crests).length;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`Done ready=${manifest.ready} missing=${manifest.missing}`);
