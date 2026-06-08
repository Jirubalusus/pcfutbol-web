#!/usr/bin/env node
// ============================================================
// audit-firestore-costs — static Firestore read/listener report
// ------------------------------------------------------------
// Statically scans src/ for Firestore call sites (onSnapshot,
// getDocs, getDoc, getCountFromServer) and reports counts per
// file, highlighting the known read hotspots. Helps catch new
// listeners or collection scans creeping in. Purely static — it
// counts call sites, not runtime reads.
// ============================================================

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const PATTERNS = [
  { key: 'onSnapshot', re: /\bonSnapshot\s*\(/g, note: 'realtime listener (cost: continuous)' },
  { key: 'getDocs', re: /\bgetDocs\s*\(/g, note: 'collection read (cost: N docs)' },
  { key: 'getDoc', re: /\bgetDoc\s*\(/g, note: 'single doc read' },
  { key: 'getCountFromServer', re: /\bgetCountFromServer\s*\(/g, note: 'aggregation count read' },
];

const HOTSPOT_FILES = ['rankingService', 'rankedService', 'teamsService'];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) files.push(full);
  }
  return files;
}

const files = walk(SRC);
const rows = [];
const totals = Object.fromEntries(PATTERNS.map(p => [p.key, 0]));

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const counts = {};
  let any = 0;
  for (const p of PATTERNS) {
    const n = (text.match(p.re) || []).length;
    if (n) { counts[p.key] = n; totals[p.key] += n; any += n; }
  }
  if (any) rows.push({ file: relative(ROOT, file).replace(/\\/g, '/'), counts });
}

console.log('\n🔥 Firestore read/listener audit (src/)');
console.log('═'.repeat(60));
console.log('Legend:');
PATTERNS.forEach(p => console.log(`  ${p.key} — ${p.note}`));

console.log('\n📊 Totals across src/:');
PATTERNS.forEach(p => console.log(`  ${String(totals[p.key]).padStart(4)}  ${p.key}`));

const fmtCounts = (c) => PATTERNS.filter(p => c[p.key]).map(p => `${p.key}×${c[p.key]}`).join(', ');

console.log('\n📄 Per file (sorted by call-site count):');
rows
  .map(r => ({ ...r, total: Object.values(r.counts).reduce((a, b) => a + b, 0) }))
  .sort((a, b) => b.total - a.total)
  .forEach(r => console.log(`  [${String(r.total).padStart(2)}] ${r.file}\n        ${fmtCounts(r.counts)}`));

console.log('\n⭐ Hotspots:');
for (const name of HOTSPOT_FILES) {
  const match = rows.find(r => r.file.includes(name));
  if (match) {
    console.log(`  ${name}: ${fmtCounts(match.counts)}`);
    if (match.counts.getCountFromServer) {
      console.log(`    ↳ getCountFromServer present — ensure aggregate-doc fallback path is preferred.`);
    }
    if (match.counts.onSnapshot) {
      console.log(`    ↳ onSnapshot present — confirm these are required realtime gameplay listeners.`);
    }
  } else {
    console.log(`  ${name}: no Firestore call sites found.`);
  }
}

console.log('\n' + '═'.repeat(60));
console.log('ℹ️  onSnapshot listeners in ranked/draft services are gameplay realtime');
console.log('   (queue/match/ready) and are expected. Aggregate docs + readCache');
console.log('   reduce leaderboard/ranking reads; teams use persisted localStorage.');
console.log('');
