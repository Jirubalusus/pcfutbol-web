#!/usr/bin/env node
// ============================================================
// audit-hosting-costs — report Firebase Hosting payload size
// ------------------------------------------------------------
// Walks dist/ and reports total size, largest files, and the
// audio/data/assets subtotals that dominate Hosting storage +
// transfer cost. Warns loudly if forbidden bulky folders that
// must NEVER ship (raw, transfermarkt, …) leaked into the build.
// Compressed historical-db data is allowed, but redundant raw JSON
// beside .json.gz is a hard deploy blocker.
// Read-only; safe to run anytime after a build.
// ============================================================

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

// Folders that must never be deployed inside dist.
const FORBIDDEN_DIRS = ['raw', 'transfermarkt', 'screenshots', 'tmp'];
const HISTORICAL_DB = join(DIST, 'historical-db');
const PRESERVE_HISTORICAL_JSON_RE = /(?:manifest|index|metadata)/i;

// Soft thresholds (bytes) for warnings.
const WARN_TOTAL = 60 * 1024 * 1024;   // dist over 60MB → investigate
const WARN_FILE = 3 * 1024 * 1024;     // single file over 3MB → review

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      const st = statSync(full);
      files.push({ path: full, size: st.size });
    }
  }
  return files;
}

function topLevelDir(relPath) {
  const i = relPath.indexOf('/');
  return i === -1 ? relPath : relPath.slice(0, i);
}

function isRedundantHistoricalRawJson(file) {
  const rel = relative(HISTORICAL_DB, file.path).replace(/\\/g, '/');
  if (rel.startsWith('../') || rel === '..' || rel.startsWith('/')) return false;

  const name = rel.split('/').pop() || '';
  if (!name.endsWith('.json')) return false;
  if (PRESERVE_HISTORICAL_JSON_RE.test(name)) return false;

  return existsSync(`${file.path}.gz`);
}

if (!existsSync(DIST)) {
  console.error('❌ dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const files = walk(DIST);
const total = files.reduce((s, f) => s + f.size, 0);

// Subtotals by top-level dir within dist.
const byDir = {};
for (const f of files) {
  const rel = relative(DIST, f.path).replace(/\\/g, '/');
  const top = topLevelDir(rel);
  byDir[top] = (byDir[top] || 0) + f.size;
}

console.log('\n📦 Firebase Hosting cost audit (dist/)');
console.log('═'.repeat(48));
console.log(`Total dist size:   ${fmt(total)}  (${files.length} files)`);

console.log('\n📁 By top-level entry:');
Object.entries(byDir)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dir, size]) => console.log(`  ${fmt(size).padStart(8)}  ${dir}`));

console.log('\n🔝 Largest files:');
files
  .sort((a, b) => b.size - a.size)
  .slice(0, 12)
  .forEach(f => console.log(`  ${fmt(f.size).padStart(8)}  ${relative(DIST, f.path).replace(/\\/g, '/')}`));

// ── Warnings ──
const warnings = [];
const blockers = [];

const leaked = FORBIDDEN_DIRS.filter(d => existsSync(join(DIST, d)));
if (leaked.length) {
  blockers.push(`Forbidden folder(s) present in dist — DO NOT DEPLOY: ${leaked.join(', ')}`);
}

const redundantHistoricalRawJson = files.filter(isRedundantHistoricalRawJson);
if (redundantHistoricalRawJson.length) {
  const redundantBytes = redundantHistoricalRawJson.reduce((s, f) => s + f.size, 0);
  blockers.push(
    `Redundant raw historical JSON present beside .json.gz: ${redundantHistoricalRawJson.length} file(s), ${fmt(redundantBytes)}`
  );
}

if (total > WARN_TOTAL) {
  warnings.push(`dist total ${fmt(total)} exceeds ${fmt(WARN_TOTAL)} — review largest files/folders.`);
}

const bigFiles = files.filter(f => f.size > WARN_FILE);
for (const f of bigFiles) {
  warnings.push(`Large file ${fmt(f.size)}: ${relative(DIST, f.path).replace(/\\/g, '/')}`);
}

// ── Cache-header verification (warnings only) ──
// Repeat-visit transfer cost is dominated by the heavy static folders. Confirm
// firebase.json gives each one a long-lived Cache-Control on BOTH hosting
// targets, while keeping the app shell uncacheable. Purely advisory: missing
// headers never block a deploy, they just flag a cost-reduction regression.
const CACHED_STATIC = ['/historical-db/**', '/images/**', '/audio/**', '/data/**'];
const NO_STORE_PATHS = ['/', '/index.html', '/sw.js'];
try {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf8'));
  const targets = Array.isArray(cfg.hosting) ? cfg.hosting : [cfg.hosting].filter(Boolean);
  console.log('\n🧊 Cache-Control headers (firebase.json):');
  for (const t of targets) {
    const label = t.target || t.site || t.public || 'hosting';
    const ccFor = (src) => (t.headers || [])
      .find(h => h.source === src)?.headers?.find(k => k.key === 'Cache-Control')?.value;
    const missing = CACHED_STATIC.filter(src => !ccFor(src));
    const shellLeaks = NO_STORE_PATHS.filter(src => !/no-store/.test(ccFor(src) || ''));
    if (missing.length) {
      warnings.push(`[${label}] heavy folder(s) without Cache-Control: ${missing.join(', ')} — repeat-visit transfer cost not reduced.`);
    }
    if (shellLeaks.length) {
      warnings.push(`[${label}] app shell path(s) not no-store: ${shellLeaks.join(', ')} — stale code/SW risk.`);
    }
    CACHED_STATIC.forEach(src => console.log(`  [${label}] ${src.padEnd(20)} ${ccFor(src) || '— (none)'}`));
  }
} catch (err) {
  warnings.push(`Could not verify firebase.json cache headers: ${err?.message || err}`);
}

console.log('\n' + '═'.repeat(48));
if (blockers.length) {
  console.log('❌ Deploy blockers:');
  blockers.forEach(w => console.log(`  - ${w}`));
  redundantHistoricalRawJson
    .slice(0, 20)
    .forEach(f => console.log(`    ${fmt(f.size).padStart(8)}  ${relative(DIST, f.path).replace(/\\/g, '/')}`));
  if (redundantHistoricalRawJson.length > 20) {
    console.log(`    ... ${redundantHistoricalRawJson.length - 20} more redundant raw JSON file(s)`);
  }
}

if (warnings.length) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`  - ${w}`));
}

if (!blockers.length && !warnings.length) {
  console.log('✅ No hosting cost warnings.');
}
console.log('');

// Exit non-zero only for deploy blockers. Large compressed historical data remains a warning.
process.exit(blockers.length ? 1 : 0);

