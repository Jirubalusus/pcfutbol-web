// Campaign opponent difficulty bands for the Mundial Draft.
//
// The campaign is 7 rounds (3 group games + Octavos/Cuartos/Semifinal/Final).
// Each round draws its opponent from a percentile band of the rating-ascending
// team pool: 0 is the lowest-rated/minor selections, 1 is the elite top end.
// This keeps early matches approachable and ramps difficulty round by round.
export const ROUND_DIFFICULTY_BANDS = [
  [0.00, 0.22], // Grupo 1 — minor / lower-rated selections
  [0.10, 0.40], // Grupo 2 — still modest
  [0.30, 0.58], // Grupo 3 — mid table
  [0.48, 0.74], // Octavos — above average
  [0.62, 0.86], // Cuartos — strong
  [0.78, 0.95], // Semifinal — very strong
  [0.90, 1.00], // Final — elite top end
];

export function bandRange(poolSize, roundIndex) {
  const last = Math.max(0, poolSize - 1);
  const clampedRound = Math.max(0, Math.min(ROUND_DIFFICULTY_BANDS.length - 1, roundIndex));
  const [loFrac, hiFrac] = ROUND_DIFFICULTY_BANDS[clampedRound];
  const lo = Math.max(0, Math.min(last, Math.floor(loFrac * last)));
  const hi = Math.max(lo, Math.min(last, Math.ceil(hiFrac * last)));
  return { lo, hi };
}

export function bandSlice(sortedTeams, roundIndex) {
  if (!Array.isArray(sortedTeams) || !sortedTeams.length) return [];
  const { lo, hi } = bandRange(sortedTeams.length, roundIndex);
  return sortedTeams.slice(lo, hi + 1);
}
