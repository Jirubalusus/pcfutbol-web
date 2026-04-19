// ============================================================
// POSITION COMPATIBILITY SYSTEM
// Defines how well a player performs when playing out of position
// ============================================================

/**
 * Compatibility table: naturalPosition → { playingPosition: factor }
 * Factor 1.0 = perfect, lower = worse performance
 */
const POSITION_COMPATIBILITY = {
  GK:  { GK: 1.0 },
  CB:  { CB: 1.0, RB: 0.88, LB: 0.88, CDM: 0.82, CM: 0.70 },
  RB:  { RB: 1.0, CB: 0.85, LB: 0.82, RM: 0.80, RWB: 0.95, CDM: 0.72, CM: 0.68 },
  LB:  { LB: 1.0, CB: 0.85, RB: 0.82, LM: 0.80, LWB: 0.95, CDM: 0.72, CM: 0.68 },
  CDM: { CDM: 1.0, CM: 0.92, CB: 0.82, CAM: 0.75, RB: 0.72, LB: 0.72 },
  CM:  { CM: 1.0, CDM: 0.90, CAM: 0.88, RM: 0.78, LM: 0.78, RW: 0.68, LW: 0.68 },
  CAM: { CAM: 1.0, CM: 0.88, CF: 0.85, RW: 0.78, LW: 0.78, CDM: 0.72, ST: 0.72 },
  RM:  { RM: 1.0, RW: 0.92, CM: 0.80, RB: 0.75, LM: 0.78, CAM: 0.72 },
  LM:  { LM: 1.0, LW: 0.92, CM: 0.80, LB: 0.75, RM: 0.78, CAM: 0.72 },
  RW:  { RW: 1.0, RM: 0.92, LW: 0.88, ST: 0.75, CF: 0.78, CAM: 0.72, CM: 0.65 },
  LW:  { LW: 1.0, LM: 0.92, RW: 0.88, ST: 0.75, CF: 0.78, CAM: 0.72, CM: 0.65 },
  ST:  { ST: 1.0, CF: 0.92, RW: 0.75, LW: 0.75, CAM: 0.72, CM: 0.62 },
  CF:  { CF: 1.0, ST: 0.92, CAM: 0.85, RW: 0.78, LW: 0.78, CM: 0.68 },
  // Wing-backs
  RWB: { RWB: 1.0, RB: 0.95, RM: 0.85, CB: 0.75, LB: 0.72, CM: 0.68 },
  LWB: { LWB: 1.0, LB: 0.95, LM: 0.85, CB: 0.75, RB: 0.72, CM: 0.68 },
};

/**
 * Conservative whitelist of plausible secondary positions per natural position.
 * Used to validate or auto-suggest a player's secondaryPositions field.
 *
 * Reglas (estilo PC Fútbol clásico):
 *  - GK no tiene secundarias (especialista absoluto)
 *  - CB ↔ RB/LB (lateral defensivo) y CB → CDM (pivote)
 *  - RB → CB/RM/RWB ; LB → CB/LM/LWB (no se permite RB↔LB: pie dominante)
 *  - CDM ↔ CM ; CM ↔ CDM/CAM
 *  - CAM ↔ CM ; CAM puede ser segunda punta (CF)
 *  - RM ↔ ED (RW) ; LM ↔ EI (LW) (no se cruzan bandas)
 *  - RW ↔ RM ; LW ↔ LM ; ambos pueden caer a CF/ST en ciertos casos
 *  - ST ↔ CF ; ST puede ser RW/LW si es un delantero rápido (lo dejamos como opción)
 *  - CF ↔ ST/CAM (la clásica "media punta")
 *  - RWB → RB/RM ; LWB → LB/LM
 *
 * Importante: NUNCA RM↔LM, RW↔LW, MCO→EI/ED automáticos, MCO→DFC, etc.
 */
const ALLOWED_SECONDARY = {
  GK:  [],
  CB:  ['RB', 'LB', 'CDM'],
  RB:  ['CB', 'RM', 'RWB'],
  LB:  ['CB', 'LM', 'LWB'],
  RWB: ['RB', 'RM'],
  LWB: ['LB', 'LM'],
  CDM: ['CM', 'CB'],
  CM:  ['CDM', 'CAM'],
  CAM: ['CM', 'CF'],
  RM:  ['RW', 'CM'],
  LM:  ['LW', 'CM'],
  RW:  ['RM', 'CF'],
  LW:  ['LM', 'CF'],
  ST:  ['CF', 'RW', 'LW'],
  CF:  ['ST', 'CAM'],
};

const MAX_SECONDARY = 2;

const DEFAULT_FACTOR = 0.60;
const GK_OUT_FACTOR = 0.30;
const NON_GK_IN_GK_FACTOR = 0.30;

import { posToEN } from './positionNames';

/**
 * Calculate how well a player fits in a position
 * @param {string} naturalPosition - Player's natural position (e.g., 'CB', 'ST', or 'DFC', 'DC')
 * @param {string} playingPosition - Position they're playing in (e.g., 'CDM', 'RW', or 'MCD', 'ED')
 * @returns {{ factor: number, level: string }} factor (0.0-1.0) and level name
 */
export function getPositionFit(naturalPosition, playingPosition) {
  if (!naturalPosition || !playingPosition) {
    return { factor: 1.0, level: 'perfect' };
  }

  // Normalizar a inglés (soporta tanto EN como ES)
  const nat = posToEN(naturalPosition).toUpperCase();
  const play = posToEN(playingPosition).toUpperCase();

  // Same position = perfect fit
  if (nat === play) {
    return { factor: 1.0, level: 'perfect' };
  }

  // GK playing outfield → terrible
  if (nat === 'GK') {
    return { factor: GK_OUT_FACTOR, level: 'terrible' };
  }

  // Non-GK playing as GK → terrible
  if (play === 'GK') {
    return { factor: NON_GK_IN_GK_FACTOR, level: 'terrible' };
  }

  // Look up in compatibility table
  const compatMap = POSITION_COMPATIBILITY[nat];
  if (compatMap && compatMap[play] !== undefined) {
    const factor = compatMap[play];
    return { factor, level: getFitLevel(factor) };
  }

  // Not listed → strong penalty
  return { factor: DEFAULT_FACTOR, level: getFitLevel(DEFAULT_FACTOR) };
}

/**
 * Map a numeric factor to a named level
 */
function getFitLevel(factor) {
  if (factor >= 1.0) return 'perfect';
  if (factor >= 0.88) return 'good';
  if (factor >= 0.75) return 'decent';
  if (factor >= 0.55) return 'poor';
  return 'terrible';
}

/**
 * Extract the base position from a formation slot ID
 * e.g., "CB1" → "CB", "ST2" → "ST", "CDM" → "CDM"
 */
export function getSlotPosition(slotId) {
  if (!slotId) return '';
  return slotId.replace(/\d+$/, '').toUpperCase();
}

/**
 * Colors for each fit level (for UI)
 */
export const FIT_COLORS = {
  perfect:  '#30d158',
  good:     '#27ae60',
  decent:   '#ffd60a',
  poor:     '#ff9f0a',
  terrible: '#ff453a',
};

// ============================================================
// MULTI-POSITION HELPERS
// Support for player.secondaryPositions (array of EN/ES codes)
// ============================================================

/**
 * Stable 32-bit string hash. Same player → same derived secondaries forever.
 */
function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministically derive 0–2 secondary positions for a player that doesn't
 * have explicit `secondaryPositions`. Conservative: ~60% get one, ~20% get two,
 * ~20% none. Picks only from ALLOWED_SECONDARY[primary].
 *
 * Goalkeepers always derive []. Players whose primary isn't recognized derive [].
 *
 * @param {object} player
 * @returns {string[]} EN-base codes, length 0..2
 */
export function derivePlayerSecondaries(player) {
  if (!player || !player.position) return [];
  const primary = posToEN(player.position).toUpperCase();
  if (primary === 'GK') return [];
  const pool = ALLOWED_SECONDARY[primary];
  if (!Array.isArray(pool) || pool.length === 0) return [];

  const key = `${player.id || ''}|${player.name || ''}|${primary}`;
  const h = stableHash(key);
  const chance = h % 100;            // 0..99
  let count;
  if (chance < 20) count = 0;        // specialist
  else if (chance < 80) count = 1;   // common case
  else count = Math.min(2, pool.length);

  if (count === 0) return [];

  const out = [];
  // Pick deterministically from the pool, skipping duplicates.
  let idx = (h >>> 8) % pool.length;
  for (let i = 0; i < pool.length && out.length < count; i++) {
    const candidate = pool[(idx + i) % pool.length];
    if (!out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/**
 * Returns the player's secondary positions as a normalized EN array.
 * Falls back to derivePlayerSecondaries() when the field is undefined,
 * so legacy player data still gets realistic options without rewrites.
 * An explicit `secondaryPositions: []` opts out (specialist).
 *
 * @param {object} player
 * @returns {string[]} unique EN-base secondary positions (max MAX_SECONDARY)
 */
export function getSecondaryPositions(player) {
  if (!player) return [];
  const raw = player.secondaryPositions;
  const primaryEN = player.position ? posToEN(player.position).toUpperCase() : '';

  // Explicit array (even empty) takes precedence over derivation.
  const source = Array.isArray(raw) ? raw : derivePlayerSecondaries(player);
  if (source.length === 0) return [];

  const seen = new Set();
  const out = [];
  for (const code of source) {
    if (!code) continue;
    const en = posToEN(code).toUpperCase();
    if (!en) continue;
    if (en === primaryEN) continue;
    if (en === 'GK' || primaryEN === 'GK') continue;
    if (seen.has(en)) continue;
    seen.add(en);
    out.push(en);
    if (out.length >= MAX_SECONDARY) break;
  }
  return out;
}

/**
 * All positions the player can play (primary first, then valid secondaries).
 * @param {object} player
 * @returns {string[]} EN-base position codes
 */
export function getAllPlayablePositions(player) {
  if (!player) return [];
  const primary = player.position ? posToEN(player.position).toUpperCase() : '';
  const secs = getSecondaryPositions(player);
  return primary ? [primary, ...secs] : secs;
}

/**
 * Whether `secondary` is a plausible secondary position for someone whose
 * natural/primary position is `primary`. Conservative whitelist (no MD↔MI,
 * no MCO→EI/ED, no DC→DFC, etc.).
 * @param {string} primary
 * @param {string} secondary
 */
export function isAllowedSecondary(primary, secondary) {
  if (!primary || !secondary) return false;
  const p = posToEN(primary).toUpperCase();
  const s = posToEN(secondary).toUpperCase();
  if (p === s) return false;
  const allowed = ALLOWED_SECONDARY[p];
  return Array.isArray(allowed) && allowed.includes(s);
}

/**
 * The list of plausible secondary positions for a given primary position.
 * @param {string} primary
 * @returns {string[]} EN codes
 */
export function getAllowedSecondaries(primary) {
  if (!primary) return [];
  const p = posToEN(primary).toUpperCase();
  return [...(ALLOWED_SECONDARY[p] || [])];
}

/**
 * Best fit considering the player's primary AND secondary positions.
 * Useful for formation slot assignment / AI scouting / lineup auto-fill.
 * @param {object} player
 * @param {string} playingPosition
 * @returns {{ factor: number, level: string, source: 'primary'|'secondary' }}
 */
export function getBestPositionFit(player, playingPosition) {
  if (!player || !playingPosition) {
    return { factor: 1.0, level: 'perfect', source: 'primary' };
  }
  const primaryFit = getPositionFit(player.position, playingPosition);
  let best = { ...primaryFit, source: 'primary' };

  for (const sec of getSecondaryPositions(player)) {
    const fit = getPositionFit(sec, playingPosition);
    if (fit.factor > best.factor) {
      best = { ...fit, source: 'secondary' };
    }
  }
  return best;
}

/**
 * True if the player has the position in their primary or secondary list
 * (exact, no compatibility lookup). For "Also plays here" UI badges.
 * @param {object} player
 * @param {string} position
 */
export function canPlayAt(player, position) {
  if (!player || !position) return false;
  const target = posToEN(position).toUpperCase();
  return getAllPlayablePositions(player).includes(target);
}

export const POSITION_LIMITS = { MAX_SECONDARY };
