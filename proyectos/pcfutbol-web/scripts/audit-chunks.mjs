#!/usr/bin/env node
// ============================================================
// audit-chunks — report largest built JS chunks
// ------------------------------------------------------------
// Run AFTER `npm run build`. Lists the largest JS chunks in
// dist/assets and warns about any chunk over 500KB so heavy
// bundles (three, react-three, firebase) stay isolated and
// lazy-loaded rather than landing on the main-menu critical path.
// Read-only.
// ============================================================

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ASSETS = join(ROOT, 'dist', 'assets');
const WARN_CHUNK = 500 * 1024; // 500KB

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${bytes}B`;
}

if (!existsSync(ASSETS)) {
  console.error('❌ dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const chunks = readdirSync(ASSETS)
  .filter(n => n.endsWith('.js'))
  .map(n => ({ name: n, size: statSync(join(ASSETS, n)).size }))
  .sort((a, b) => b.size - a.size);

console.log('\n🧩 JS chunk audit (dist/assets)');
console.log('═'.repeat(56));

const totalJs = chunks.reduce((s, c) => s + c.size, 0);
console.log(`Total JS: ${fmt(totalJs)} across ${chunks.length} chunks\n`);

console.log('🔝 Largest chunks:');
chunks.slice(0, 15).forEach(c => {
  const flag = c.size > WARN_CHUNK ? ' ⚠️ >500KB' : '';
  console.log(`  ${fmt(c.size).padStart(8)}  ${c.name}${flag}`);
});

const big = chunks.filter(c => c.size > WARN_CHUNK);
console.log('\n' + '═'.repeat(56));
if (big.length) {
  console.log(`⚠️  ${big.length} chunk(s) over 500KB:`);
  big.forEach(c => console.log(`  - ${c.name} (${fmt(c.size)})`));
  console.log('\n  Heavy libs (three / react-three / firebase) should be isolated');
  console.log('  chunks loaded lazily (CityMode / 3D / online features), not on the');
  console.log('  main-menu critical path. Verify via dynamic import boundaries.');
} else {
  console.log('✅ No chunks over 500KB.');
}
console.log('');
