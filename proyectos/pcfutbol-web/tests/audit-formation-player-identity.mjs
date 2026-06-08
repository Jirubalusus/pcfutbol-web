// ============================================================
// AUDIT: Formation player identity (homónimos / duplicate fix)
// ------------------------------------------------------------
// Regression guard for the Alineación duplicate-player bug.
//
// Rosters can legitimately hold several DISTINCT players sharing
// a visible name (e.g. multiple "Andrés Martínez"). Identity must
// be tracked by `_pid`, never by name, so that:
//   1. titulares + convocados + noConvocados always partition the
//      roster EXACTLY once (no duplication, no loss), at every step
//      of a sequence of swaps.
//   2. moving one same-name player never moves its homónimo.
//
// Uses the pure helpers from src/game/playerIdentity.js, the same
// code the Formation UI runs.
// ============================================================

import {
  attachRosterIdentities,
  buildSlotIdentityMap,
  categorizeRoster,
  planSwap,
} from '../src/game/playerIdentity.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

// ---- Roster with deliberate duplicate visible names ----------
// No stable id fields → identity falls back to roster-index keys,
// the exact case the bug manifests in. 16 players: 11 starters,
// 5 bench, plus a couple of homónimos that sit out.
const rawRoster = [
  { name: 'Portero Único', position: 'GK', overall: 80, age: 28 },
  { name: 'Andrés Martínez', position: 'CB', overall: 78, age: 27 }, // A1
  { name: 'Andrés Martínez', position: 'CB', overall: 74, age: 24 }, // A2
  { name: 'Defensa Tres', position: 'RB', overall: 73, age: 25 },
  { name: 'Defensa Cuatro', position: 'LB', overall: 72, age: 26 },
  { name: 'Luis Silva', position: 'CDM', overall: 77, age: 29 },     // L1
  { name: 'Luis Silva', position: 'CM', overall: 75, age: 23 },      // L2
  { name: 'Medio Tres', position: 'CM', overall: 71, age: 22 },
  { name: 'Delantero Uno', position: 'ST', overall: 82, age: 30 },
  { name: 'Delantero Dos', position: 'RW', overall: 76, age: 21 },
  { name: 'Delantero Tres', position: 'LW', overall: 74, age: 28 },
  // --- bench / pool ---
  { name: 'Andrés Martínez', position: 'CM', overall: 70, age: 20 }, // A3
  { name: 'Luis Silva', position: 'RB', overall: 69, age: 31 },      // L3
  { name: 'Suplente Uno', position: 'GK', overall: 68, age: 33 },
  { name: 'Suplente Dos', position: 'ST', overall: 67, age: 19 },
  { name: 'Suplente Tres', position: 'CB', overall: 66, age: 34 },
];

const roster = attachRosterIdentities(rawRoster);

// Every player must have a UNIQUE _pid even when names repeat.
const pidSet = new Set(roster.map(p => p._pid));
assert(pidSet.size === roster.length, `all ${roster.length} players have a unique _pid (got ${pidSet.size})`);

// Same-name players must carry DIFFERENT _pids.
const andreses = roster.filter(p => p.name === 'Andrés Martínez');
const luises = roster.filter(p => p.name === 'Luis Silva');
assert(andreses.length === 3, `3 "Andrés Martínez" in roster (got ${andreses.length})`);
assert(luises.length === 3, `3 "Luis Silva" in roster (got ${luises.length})`);
assert(new Set(andreses.map(p => p._pid)).size === 3, 'the 3 "Andrés Martínez" have distinct identities');
assert(new Set(luises.map(p => p._pid)).size === 3, 'the 3 "Luis Silva" have distinct identities');

// ---- Initial lineup / convocados / no-convocados -------------
const SLOTS = Array.from({ length: 11 }, (_, i) => `slot${i}`);
let lineup = {};
roster.slice(0, 11).forEach((p, i) => { lineup[SLOTS[i]] = p; });
let convocadoIdSet = new Set(roster.slice(11, 14).map(p => p._pid)); // 3 convocados

const allPids = roster.map(p => p._pid).sort();

// Assert the three buckets partition the roster exactly once by _pid,
// driving categorizeRoster through the SAME name round-trip the UI uses
// (convocado identities → names → quota). Returns the live pidToSlot.
function assertPartition(label, lineupObj, convIds) {
  const { pidToSlot } = buildSlotIdentityMap(lineupObj, roster);
  const lineupIdSet = new Set(Object.keys(pidToSlot));
  const convocadoNames = [...convIds]
    .map(pid => roster.find(p => p._pid === pid)?.name)
    .filter(Boolean);
  const { titulares, convocados, noConvocados } =
    categorizeRoster(roster, lineupIdSet, convocadoNames, { autoConvocadoCount: 5 });

  const bucketPids = [
    ...titulares.map(p => p._pid),
    ...convocados.map(p => p._pid),
    ...noConvocados.map(p => p._pid),
  ];
  const seen = new Map();
  for (const pid of bucketPids) seen.set(pid, (seen.get(pid) || 0) + 1);

  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([pid]) => pid);
  const sortedPids = [...bucketPids].sort();

  assert(bucketPids.length === roster.length,
    `[${label}] buckets hold all ${roster.length} players (got ${bucketPids.length})`);
  assert(dupes.length === 0,
    `[${label}] no player appears in two buckets (dupes: ${dupes.join(', ') || 'none'})`);
  assert(JSON.stringify(sortedPids) === JSON.stringify(allPids),
    `[${label}] bucket pids exactly equal the roster pids`);
  assert(titulares.length === 11,
    `[${label}] exactly 11 titulares (got ${titulares.length})`);

  return pidToSlot;
}

console.log('Formation player-identity audit');
assertPartition('initial', lineup, convocadoIdSet);

// ---- A sequence of swaps, asserting the partition after each -----
// Each entry picks two roster players by index to "click".
const clickPairs = [
  [1, 11],  // Andrés A1 (titular) ↔ Andrés A3 (convocado)  — homónimo swap
  [5, 12],  // Luis L1 (titular)   ↔ Luis L3 (no convocado) — homónimo, promote a sitter
  [2, 6],   // Andrés A2 (titular) ↔ Luis L2 (titular)      — two starters swap slots
  [11, 13], // Andrés A3 (now titular) ↔ Suplente Uno       — back out
  [8, 14],  // Delantero Uno ↔ Suplente Dos                 — unique-name swap
  [1, 2],   // the two remaining Andreses, whatever state   — homónimo vs homónimo
];

for (const [i, j] of clickPairs) {
  const p1 = roster[i];
  const p2 = roster[j];

  // Snapshot homónimo state BEFORE the swap for independence checks.
  const before = roster.map((p, idx) => {
    const { pidToSlot } = buildSlotIdentityMap(lineup, roster);
    return { idx, pid: p._pid, slot: pidToSlot[p._pid] || null, conv: convocadoIdSet.has(p._pid) };
  });

  const res = planSwap({ lineup, convocadoIdSet, pidToSlot: before.reduce((m, b) => {
    if (b.slot) m[b.pid] = b.slot; return m;
  }, {}) }, p1, p2);

  if (!res.blocked) {
    lineup = res.lineup;
    convocadoIdSet = res.convocadoIds;
  }

  const label = `swap ${p1.name}#${i} ↔ ${p2.name}#${j}`;
  assertPartition(label, lineup, convocadoIdSet);

  // Independence: any same-name player NOT one of the two clicked must
  // keep its exact slot + convocado state across the swap.
  const { pidToSlot: afterSlots } = buildSlotIdentityMap(lineup, roster);
  for (const b of before) {
    if (b.idx === i || b.idx === j) continue;
    const sharesName =
      roster[b.idx].name === p1.name || roster[b.idx].name === p2.name;
    if (!sharesName) continue;
    const slotNow = afterSlots[b.pid] || null;
    const convNow = convocadoIdSet.has(b.pid);
    assert(slotNow === b.slot && convNow === b.conv,
      `[${label}] homónimo ${roster[b.idx].name}#${b.idx} untouched (slot ${b.slot}→${slotNow}, conv ${b.conv}→${convNow})`);
  }
}

// ---- Final identity-vs-name sanity ------------------------------
// After all the shuffling every roster _pid is still distinct and
// every same-name group still has fully distinct identities.
const finalPids = new Set(roster.map(p => p._pid));
assert(finalPids.size === roster.length, 'identities remain unique after all swaps');

if (failures > 0) {
  console.error(`\n✗ Formation player-identity audit FAILED (${failures} assertion${failures === 1 ? '' : 's'})`);
  process.exit(1);
}
console.log('\n✓ Formation player-identity audit passed');
