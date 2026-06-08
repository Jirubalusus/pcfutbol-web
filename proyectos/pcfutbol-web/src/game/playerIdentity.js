// ============================================================
// PLAYER IDENTITY (Formation-scoped, stable)
// ------------------------------------------------------------
// Rosters can legitimately contain several DISTINCT players that
// share the same visible name (e.g. multiple "Andrés Martínez" in
// historical/generated squads). Using `player.name` as identity
// makes every same-name player collapse into one, which causes the
// Alineación screen to duplicate/misclassify rows when a player is
// moved between titulares / convocados / no convocados.
//
// This module centralises a stable identity for a roster:
//   - prefer a real stable id field if the player has one
//   - else fall back to the player's name when it is UNIQUE in the
//     roster (legacy-friendly, matches name-based storage)
//   - else use a deterministic roster-index key so duplicate names
//     stay distinguishable.
// Display names are never changed.
// ============================================================

const STABLE_ID_FIELDS = ['id', 'playerId', 'uid', '_id', 'playerUid'];

/** Return a stable id from a player object, or null if none exists. */
export function getStableId(player) {
  if (!player) return null;
  for (const field of STABLE_ID_FIELDS) {
    const value = player[field];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return null;
}

/**
 * Attach a roster-scoped stable identity (`_pid`) and the original
 * roster index (`_rosterIndex`) to every player. Returns a NEW array
 * of shallow-cloned players; the input is not mutated.
 */
export function attachRosterIdentities(players) {
  if (!Array.isArray(players)) return [];

  const nameCounts = new Map();
  for (const p of players) {
    const name = p?.name ?? '';
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }

  return players.map((p, index) => {
    const stable = getStableId(p);
    let pid;
    if (stable) {
      pid = `id:${stable}`;
    } else {
      const name = p?.name ?? '';
      if ((nameCounts.get(name) || 0) > 1) {
        // Duplicate visible name → index makes it unambiguous.
        pid = `idx:${index}:${name}`;
      } else {
        // Unique name → keep name-based id (legacy-compatible).
        pid = `name:${name}`;
      }
    }
    return { ...p, _pid: pid, _rosterIndex: index };
  });
}

/**
 * Identity for a single player. Uses an already-attached `_pid` when
 * present, otherwise a stable id, otherwise a fallback index, otherwise
 * the name. Useful for snapshots that may predate identity attachment.
 */
export function getPlayerIdentity(player, fallbackIndex) {
  if (player?._pid) return player._pid;
  const stable = getStableId(player);
  if (stable) return `id:${stable}`;
  if (typeof fallbackIndex === 'number') {
    return `idx:${fallbackIndex}:${player?.name ?? ''}`;
  }
  return `name:${player?.name ?? ''}`;
}

/** True when two player objects refer to the same roster identity. */
export function samePlayer(a, b) {
  if (!a || !b) return false;
  return getPlayerIdentity(a) === getPlayerIdentity(b);
}

/**
 * Resolve a (possibly legacy) lineup snapshot to a roster player's
 * `_pid`. Tries, in order: exact `_pid`, stable id, rich field match
 * (name+position+age+overall), then name-only. `used` guarantees each
 * roster player is claimed at most once so two same-name snapshots
 * never collapse onto the same roster entry.
 */
function resolveSnapshotPid(snapshot, rosterWithIds, byPid, used) {
  if (!snapshot) return null;

  if (snapshot._pid && byPid.has(snapshot._pid) && !used.has(snapshot._pid)) {
    return snapshot._pid;
  }

  const stable = getStableId(snapshot);
  if (stable) {
    const match = rosterWithIds.find(
      p => !used.has(p._pid) && getStableId(p) === stable
    );
    if (match) return match._pid;
  }

  const rich = rosterWithIds.find(
    p => !used.has(p._pid) &&
      p.name === snapshot.name &&
      p.position === snapshot.position &&
      p.age === snapshot.age &&
      p.overall === snapshot.overall
  );
  if (rich) return rich._pid;

  const byName = rosterWithIds.find(
    p => !used.has(p._pid) && p.name === snapshot.name
  );
  return byName ? byName._pid : null;
}

/**
 * Build bidirectional maps between formation slots and roster identities
 * from a lineup object ({ slotId: playerSnapshot }).
 * Returns { slotToPid, pidToSlot }.
 */
export function buildSlotIdentityMap(lineup, rosterWithIds) {
  const slotToPid = {};
  const pidToSlot = {};
  if (!lineup || !Array.isArray(rosterWithIds)) {
    return { slotToPid, pidToSlot };
  }
  const byPid = new Map(rosterWithIds.map(p => [p._pid, p]));
  const used = new Set();

  for (const [slotId, snapshot] of Object.entries(lineup)) {
    if (!snapshot) continue;
    const pid = resolveSnapshotPid(snapshot, rosterWithIds, byPid, used);
    if (pid) {
      slotToPid[slotId] = pid;
      pidToSlot[pid] = slotId;
      used.add(pid);
    }
  }
  return { slotToPid, pidToSlot };
}

/**
 * Partition a roster (already carrying `_pid`) into titulares /
 * convocados / noConvocados with a HARD guarantee that every roster
 * player lands in exactly one bucket (no duplication, no loss).
 *
 * - `lineupIdSet`: Set of `_pid` that are starters.
 * - `convocadoNames`: legacy name list. Consumed once per name so a
 *   single same-name entry promotes only ONE matching player.
 * - When the name list is empty, auto-pick the first N healthy players.
 */
export function categorizeRoster(rosterWithIds, lineupIdSet, convocadoNames = [], options = {}) {
  const autoConvocadoCount = options.autoConvocadoCount ?? 5;
  const titulares = [];
  const convocados = [];
  const noConvocados = [];

  const roster = Array.isArray(rosterWithIds) ? rosterWithIds : [];
  const starters = lineupIdSet instanceof Set ? lineupIdSet : new Set(lineupIdSet || []);
  const hasManual = Array.isArray(convocadoNames) && convocadoNames.length > 0;

  // Per-name quota so each convocado name promotes exactly one player.
  const quota = new Map();
  if (hasManual) {
    for (const name of convocadoNames) {
      quota.set(name, (quota.get(name) || 0) + 1);
    }
  }

  const nonStarters = [];
  for (const p of roster) {
    if (starters.has(p._pid)) {
      titulares.push(p);
    } else {
      nonStarters.push(p);
    }
  }

  for (const p of nonStarters) {
    if (hasManual) {
      const left = quota.get(p.name) || 0;
      if (left > 0) {
        quota.set(p.name, left - 1);
        convocados.push(p);
      } else {
        noConvocados.push(p);
      }
    } else if (!p.injured && convocados.length < autoConvocadoCount) {
      convocados.push(p);
    } else {
      noConvocados.push(p);
    }
  }

  // Backfill: a manual list may have lost members to the lineup.
  if (hasManual && convocados.length < autoConvocadoCount) {
    const needed = autoConvocadoCount - convocados.length;
    const backfill = noConvocados.filter(p => !p.injured).slice(0, needed);
    for (const p of backfill) {
      convocados.push(p);
      noConvocados.splice(noConvocados.indexOf(p), 1);
    }
  }

  return { titulares, convocados, noConvocados };
}

/**
 * Pure click/swap planner shared by the UI and the audit. Given the
 * current lineup, the set of convocado identities and the pid→slot map,
 * computes the next lineup + convocado identity set when two distinct
 * players are clicked. Operates entirely by identity (`_pid`) so
 * homónimos move independently.
 *
 * Returns { lineup, convocadoIds: Set, lineupChanged, blocked }.
 * When `blocked` is true (a suspended/injured player would enter the
 * pitch) nothing changes.
 */
export function planSwap(context, player1, player2) {
  const { lineup, convocadoIdSet, pidToSlot } = context;
  const id1 = player1._pid;
  const id2 = player2._pid;
  const slot1 = pidToSlot[id1];
  const slot2 = pidToSlot[id2];

  if (slot1 && !slot2 && (player2.suspended || player2.injured)) {
    return { lineup, convocadoIds: new Set(convocadoIdSet), lineupChanged: false, blocked: true };
  }
  if (!slot1 && slot2 && (player1.suspended || player1.injured)) {
    return { lineup, convocadoIds: new Set(convocadoIdSet), lineupChanged: false, blocked: true };
  }

  const newLineup = { ...lineup };
  const convocadoIds = new Set(convocadoIdSet);
  let lineupChanged = false;

  if (slot1 && slot2) {
    // Ambos titulares → intercambian slot.
    newLineup[slot1] = player2;
    newLineup[slot2] = player1;
    lineupChanged = true;
  } else if (slot1 && !slot2) {
    // player2 entra al slot de player1; player1 hereda la categoría de player2.
    newLineup[slot1] = player2;
    lineupChanged = true;
    convocadoIds.delete(id1);
    convocadoIds.delete(id2);
    if (convocadoIdSet.has(id2)) convocadoIds.add(id1);
  } else if (!slot1 && slot2) {
    newLineup[slot2] = player1;
    lineupChanged = true;
    convocadoIds.delete(id1);
    convocadoIds.delete(id2);
    if (convocadoIdSet.has(id1)) convocadoIds.add(id2);
  } else {
    // Ninguno titular → alternan convocado/no convocado si difieren.
    const c1 = convocadoIdSet.has(id1);
    const c2 = convocadoIdSet.has(id2);
    if (c1 !== c2) {
      if (c1) { convocadoIds.delete(id1); convocadoIds.add(id2); }
      else { convocadoIds.delete(id2); convocadoIds.add(id1); }
    }
  }

  return { lineup: newLineup, convocadoIds, lineupChanged, blocked: false };
}
