// ============================================================
// AUDIT: Formation highlight targets (green "compatible" glow)
// ------------------------------------------------------------
// Regression guard for the wrong-highlight bug: an ED/MD (RW/RM)
// player was lighting up a DC/ST starter as a valid target because
// the old code used a BIDIRECTIONAL getBestPositionFit ≥ 0.70 check,
// and RW has a loose 0.75 compatibility to ST.
//
// New rule (mirrored here from Formation.jsx::getHighlightFit):
//   - selected NOT a starter  → highlight ONLY starters. A starter slot is a
//     target when the selected can play it EXACTLY (primary/secondary), OR
//     when the directed compatibility selected→slot is a SMALL drop
//     (factor ≥ SOFT_COMPAT_THRESHOLD) — that soft case glows YELLOW.
//   - selected IS a starter   → target = selected's own slot; any OTHER player
//     who can play that slot EXACTLY, OR whose directed compatibility
//     row→slot ≥ threshold (yellow), is a target.
//   - ALWAYS one-directional (selected→target / row→starter-slot), never
//     bidirectional. The soft threshold (0.85) lets MCO→MC (0.88) through but
//     keeps the old ED/MD→DC bug fixed (RW→ST is only 0.75).
//
// Identity is ALWAYS by `_pid`; never by `name` (homónimos safe).
// Uses the real helpers from src/game/positionSystem.js.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { canPlayAt, getSlotPosition, getBestPositionFit } from '../src/game/positionSystem.js';

// Must match Formation.jsx::SOFT_COMPAT_THRESHOLD.
const SOFT_COMPAT_THRESHOLD = 0.85;

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

// ---- Exact mirror of Formation.jsx::getHighlightFit decision ----
// Returns true when `row` should get the green compatible glow given
// the currently selected player and the starter slot map (pid → slotId).
function fitsTowards(player, targetPos) {
  // Exact playable position → target. Else a small directed drop also counts
  // (the yellow "soft compat" case), but a big drop (RW→ST 0.75) does not.
  if (canPlayAt(player, targetPos)) return true;
  return getBestPositionFit(player, targetPos).factor >= SOFT_COMPAT_THRESHOLD;
}

function isHighlightTarget(selected, row, slotByPid) {
  if (!selected || !row || selected._pid === row._pid) return false;

  const selectedSlot = slotByPid[selected._pid];
  if (selectedSlot) {
    // selected is a starter → target is its own slot position
    return fitsTowards(row, getSlotPosition(selectedSlot));
  }

  // selected on the bench / not called → only starters
  const rowSlot = slotByPid[row._pid];
  if (!rowSlot) return false;
  return fitsTowards(selected, getSlotPosition(rowSlot));
}

console.log('Formation highlight-targets audit');

// ---- Roster (Zubeldia = RW + RM, exactly the screenshot case) ----
const winger      = { _pid: 'p_wing',   name: 'Zubeldia',   position: 'RW', secondaryPositions: ['RM'] };
const striker     = { _pid: 'p_strike', name: 'Delantero',  position: 'ST', secondaryPositions: [] };
const rightMid    = { _pid: 'p_rm',     name: 'Medio D.',   position: 'RM', secondaryPositions: ['RW'] };
const pureWinger  = { _pid: 'p_wing2',  name: 'Extremo',    position: 'LW', secondaryPositions: ['LM'] };
const secondFwd   = { _pid: 'p_cf',     name: 'Segundo',    position: 'CF', secondaryPositions: ['ST'] };
// Homónimo of the winger but a DIFFERENT player (distinct _pid).
const wingerTwin  = { _pid: 'p_twin',   name: 'Zubeldia',   position: 'ST', secondaryPositions: [] };
// MCO sin MC en secundarias: NO puede jugar MC "exacto", pero CAM→CM = 0.88
// (bajada pequeña) → debe resaltarse en amarillo.
const attackMid   = { _pid: 'p_cam',    name: 'Mediapunta', position: 'CAM', secondaryPositions: [] };
const centralMid  = { _pid: 'p_cm',     name: 'Medio C.',   position: 'CM',  secondaryPositions: [] };

// Starting XI slot map (4-3-3-ish): pid → slotId
const slotByPid = {
  p_strike: 'ST',   // striker plays ST
  p_rm:     'RW',   // right-mid currently filling the RW slot
  p_wing2:  'LW',   // left winger in LW
};

// =================================================================
// (a) ED/MD (RW/RM) selected from bench → must NOT highlight a ST starter
// =================================================================
assert(
  isHighlightTarget(winger, striker, slotByPid) === false,
  '(a) bench RW/RM does NOT highlight a ST starter'
);

// =================================================================
// (b) ED/MD selected from bench → DOES highlight RW/RM starter slots
// =================================================================
assert(
  isHighlightTarget(winger, rightMid, slotByPid) === true,
  '(b) bench RW/RM highlights the starter occupying the RW slot'
);
// The winger can play RM, so a starter occupying an RM slot is a valid
// target regardless of who occupies it. Move the right-mid into an RM slot:
const rmSlotMap = { p_strike: 'ST', p_rm: 'RM', p_wing2: 'LW' };
assert(
  isHighlightTarget(winger, rightMid, rmSlotMap) === true,
  '(b) bench RW/RM highlights a starter occupying the RM slot'
);

// =================================================================
// (c) Selected starter in ST/DC → highlight only players with ST in their
//     exact playable positions, NOT wingers merely 0.75-compatible.
// =================================================================
// striker is the selected starter (slot ST). Targets:
assert(
  isHighlightTarget(striker, pureWinger, slotByPid) === false,
  '(c) selected ST starter does NOT highlight a pure winger (0.75 compat only)'
);
assert(
  isHighlightTarget(striker, winger, slotByPid) === false,
  '(c) selected ST starter does NOT highlight an RW/RM winger'
);
assert(
  isHighlightTarget(striker, secondFwd, slotByPid) === true,
  '(c) selected ST starter DOES highlight a CF/ST player (ST in playable set)'
);

// =================================================================
// Bench-vs-bench must never highlight (mode 1 only targets starters)
// =================================================================
assert(
  isHighlightTarget(winger, secondFwd, slotByPid) === false,
  '(extra) bench selection does not highlight another bench player'
);

// =================================================================
// (e) SOFT compat: MCO/CAM without CM secondary DOES highlight a CM/MC slot.
//     Directed CAM→CM = 0.88 ≥ 0.85 threshold → yellow, even though the CAM
//     cannot play CM "exactly". This is the behavior the user asked to restore.
// =================================================================
const camBenchMap = { p_cm: 'CM1', p_strike: 'ST', p_wing2: 'LW' };
// Guard the fixture: the CAM truly has no exact CM, so this MUST be the soft path.
assert(
  canPlayAt(attackMid, 'CM') === false,
  '(e) fixture: CAM/MCO has NO exact CM in its playable positions'
);
assert(
  isHighlightTarget(attackMid, centralMid, camBenchMap) === true,
  '(e) bench CAM/MCO softly highlights a CM/MC starter slot (0.88 ≥ threshold)'
);
// And as a selected starter (CAM in a CM slot), other CM players are targets too.
const camStarterMap = { p_cam: 'CM1', p_cm: 'CM2', p_strike: 'ST' };
assert(
  isHighlightTarget(attackMid, centralMid, camStarterMap) === true,
  '(e) selected CAM/MCO starter softly highlights another CM/MC player'
);
// Sanity: the soft threshold must NOT promote the 0.75 RW→ST case.
assert(
  getBestPositionFit(winger, 'ST').factor < SOFT_COMPAT_THRESHOLD,
  '(e) RW→ST (0.75) stays below the soft threshold — ED/MD→DC bug stays fixed'
);

// =================================================================
// (d) Decision must NOT depend on player.name identity.
//     wingerTwin shares the name "Zubeldia" but is a distinct ST player.
//     Selecting the bench winger must treat the twin purely by _pid/slot.
// =================================================================
// Put the twin in the ST slot; the bench winger must STILL not highlight it.
const twinSlotMap = { p_twin: 'ST', p_rm: 'RW', p_wing2: 'LW' };
assert(
  isHighlightTarget(winger, wingerTwin, twinSlotMap) === false,
  '(d) same-name twin in ST slot is NOT highlighted by the bench winger'
);
// And the homónimo is not treated as "self": different _pid → still evaluated.
assert(
  winger.name === wingerTwin.name && winger._pid !== wingerTwin._pid,
  '(d) the two "Zubeldia" share a name but have distinct _pid'
);

// =================================================================
// Source guard: the component must use the exact-position helper and
// must NOT fall back to the old bidirectional swap-threshold logic.
// =================================================================
const here = dirname(fileURLToPath(import.meta.url));
const formationSrc = readFileSync(
  join(here, '..', 'src', 'components', 'Formation', 'Formation.jsx'),
  'utf8'
);
assert(/getHighlightFit/.test(formationSrc),
  '(src) Formation.jsx defines getHighlightFit');
assert(/canPlayAt/.test(formationSrc),
  '(src) Formation.jsx uses canPlayAt for exact-position highlight');
assert(!/isCompatibleSwap|SWAP_THRESHOLD/.test(formationSrc),
  '(src) Formation.jsx no longer uses isCompatibleSwap / SWAP_THRESHOLD');

if (failures > 0) {
  console.error(`\n✗ Formation highlight-targets audit FAILED (${failures} assertion${failures === 1 ? '' : 's'})`);
  process.exit(1);
}
console.log('\n✓ Formation highlight-targets audit passed');
