#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CREST_ROOT = path.join(PROJECT_ROOT, 'public', 'historical-db', 'crests');
const MANIFEST_PATH = path.join(CREST_ROOT, 'manifest.json');

const sources = [
  {
    id: 'tm-team-12074',
    url: 'https://images.seeklogo.com/logo-png/6/1/guaros-de-lara-fc-logo-png_seeklogo-64051.png',
    source: 'seeklogo-guaros-de-lara-fc',
  },
  {
    id: 'tm-team-30491',
    url: 'https://forovinotinto.com/imagenes/equipos/perfiles/car.png',
    source: 'forovinotinto-caroni-fc-profile',
  },
  {
    id: 'tm-team-102385',
    url: 'https://escudosdefutbolyequipaciones.com/images_esc3/CONM/VENEZUELA/escudos_jpg/escudo-real%20esppor%20club.jpg',
    source: 'escudosdefutbolyequipaciones-real-esppor-club',
  }
];

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
for (const item of sources) {
  console.log(`→ ${item.id} ${item.url}`);
  const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${item.id} HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(CREST_ROOT, `${item.id}.png`);
  const img = sharp(buffer, { failOn: 'none' });
  const meta = await img.metadata();
  if (!meta.width || !meta.height || buffer.length < 500) throw new Error(`${item.id} invalid ${meta.width}x${meta.height} bytes=${buffer.length}`);
  await img.png().toFile(outPath);
  const finalMeta = await sharp(outPath).metadata();
  const prev = manifest.crests[item.id] || { id: item.id };
  manifest.crests[item.id] = {
    ...prev,
    id: item.id,
    publicPath: `/historical-db/crests/${item.id}.png`,
    sourceUrl: item.url,
    source: item.source,
    bytes: fs.statSync(outPath).size,
    width: finalMeta.width,
    height: finalMeta.height,
    status: 'ready',
    error: null,
    updatedAt: new Date().toISOString()
  };
  console.log(`  ✅ ${finalMeta.width}x${finalMeta.height} ${fs.statSync(outPath).size} bytes`);
}
manifest.generatedAt = new Date().toISOString();
manifest.ready = Object.values(manifest.crests).filter((c) => c.status === 'ready').length;
manifest.missing = Object.values(manifest.crests).filter((c) => c.status !== 'ready').length;
manifest.total = Object.keys(manifest.crests).length;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`ready=${manifest.ready} missing=${manifest.missing}`);
