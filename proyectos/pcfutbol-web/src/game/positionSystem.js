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
