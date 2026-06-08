#!/usr/bin/env node
// ============================================================
// audit-media-assets — read-only media optimization REPORT
// ------------------------------------------------------------
// Scans the shipped static media folders (public/{images,audio,icons,
// textures}) and reports the heaviest files plus obvious, *manual*
// optimization candidates (large PNG/JPEG that could be WebP/AVIF,
// oversized audio). It NEVER modifies, re-encodes, or replaces any
// asset — Pablo's generated art is left untouched. Use the output to
// decide, by hand, whether a specific asset is worth re-exporting at
// equal visual quality. Purely advisory: always exits 0.
// ============================================================

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const MEDIA_DIRS = ['images', 'audio', 'icons', 'textures'].map(d => join(ROOT, 'public', d));

// Heuristic review thresholds (bytes). Above these, a file is worth a
// human look — not an automatic rewrite.
const PNG_JPEG_REVIEW = 300 * 1024;   // raster image over 300KB
const AUDIO_REVIEW = 1.5 * 1024 * 1024; // audio over 1.5MB

const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg']);
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac']);

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) files.push({ path: full, size: statSync(full).size });
  }
  return files;
}

const present = MEDIA_DIRS.filter(existsSync);
if (!present.length) {
  console.log('ℹ️  No public/{images,audio,icons,textures} folders found — nothing to audit.');
  process.exit(0);
}

const files = present.flatMap(d => walk(d));
const total = files.reduce((s, f) => s + f.size, 0);

const byExt = {};
for (const f of files) {
  const ext = (extname(f.path) || '(none)').toLowerCase();
  byExt[ext] = byExt[ext] || { count: 0, size: 0 };
  byExt[ext].count++;
  byExt[ext].size += f.size;
}

console.log('\n🎨 Media asset audit (public/{images,audio,icons,textures})');
console.log('═'.repeat(60));
console.log(`Total media: ${fmt(total)} across ${files.length} files\n`);

console.log('📁 By extension:');
Object.entries(byExt)
  .sort((a, b) => b[1].size - a[1].size)
  .forEach(([ext, v]) => console.log(`  ${fmt(v.size).padStart(8)}  ${ext.padEnd(8)} (${v.count})`));

console.log('\n🔝 Largest media files:');
files
  .sort((a, b) => b.size - a.size)
  .slice(0, 15)
  .forEach(f => console.log(`  ${fmt(f.size).padStart(8)}  ${relative(ROOT, f.path).replace(/\\/g, '/')}`));

// ── Manual optimization candidates (advisory only) ──
const candidates = [];
for (const f of files) {
  const ext = extname(f.path).toLowerCase();
  if (RASTER_EXT.has(ext) && f.size > PNG_JPEG_REVIEW) {
    candidates.push({ f, why: `large ${ext.slice(1)} — consider WebP/AVIF at equal quality` });
  } else if (AUDIO_EXT.has(ext) && f.size > AUDIO_REVIEW) {
    candidates.push({ f, why: 'large audio — consider lower bitrate / trimming silence' });
  }
}

console.log('\n' + '═'.repeat(60));
if (candidates.length) {
  console.log(`🔍 ${candidates.length} manual review candidate(s) (NOT auto-changed):`);
  candidates
    .sort((a, b) => b.f.size - a.f.size)
    .slice(0, 20)
    .forEach(c => console.log(`  ${fmt(c.f.size).padStart(8)}  ${relative(ROOT, c.f.path).replace(/\\/g, '/')}\n            ↳ ${c.why}`));
  if (candidates.length > 20) console.log(`  ... ${candidates.length - 20} more`);
  console.log('\n  Re-export by hand only if visual/audio quality is preserved.');
  console.log('  Do NOT replace generated art with procedural placeholders.');
} else {
  console.log('✅ No oversized media optimization candidates.');
}
console.log('');

// Advisory report — never fails a build/deploy.
process.exit(0);
