// tierUtils.js — Tier system for Ranked 1v1

export const TIERS = [
  { id: 'bronze_iii', name: 'Bronce III', division: 1, color: '#cd7f32', icon: '🥉' },
  { id: 'bronze_ii', name: 'Bronce II', division: 2, color: '#cd7f32', icon: '🥉' },
  { id: 'bronze_i', name: 'Bronce I', division: 3, color: '#cd7f32', icon: '🥉' },
  { id: 'silver_iii', name: 'Plata III', division: 4, color: '#c0c0c0', icon: '🥈' },
  { id: 'silver_ii', name: 'Plata II', division: 5, color: '#c0c0c0', icon: '🥈' },
  { id: 'silver_i', name: 'Plata I', division: 6, color: '#c0c0c0', icon: '🥈' },
  { id: 'gold_iii', name: 'Oro III', division: 7, color: '#ffd700', icon: '🏅' },
  { id: 'gold_ii', name: 'Oro II', division: 8, color: '#ffd700', icon: '🏅' },
  { id: 'gold_i', name: 'Oro I', division: 9, color: '#ffd700', icon: '🏅' },
  { id: 'platinum_iii', name: 'Platino III', division: 10, color: '#00d4aa', icon: '💎' },
  { id: 'platinum_ii', name: 'Platino II', division: 11, color: '#00d4aa', icon: '💎' },
  { id: 'platinum_i', name: 'Platino I', division: 12, color: '#00d4aa', icon: '💎' },
  { id: 'diamond_iii', name: 'Diamante III', division: 13, color: '#b9f2ff', icon: '💠' },
  { id: 'diamond_ii', name: 'Diamante II', division: 14, color: '#b9f2ff', icon: '💠' },
  { id: 'diamond_i', name: 'Diamante I', division: 15, color: '#b9f2ff', icon: '💠' },
  { id: 'challenger', name: 'Challenger', division: 16, color: '#ff4500', icon: '🔥' },
];

export const LP_PER_DIVISION = 100;

export function getTierById(tierId) {
  return TIERS.find(t => t.id === tierId) || TIERS[0];
}

export function getTierByLP(totalLP) {
  const divIndex = Math.min(Math.floor(totalLP / LP_PER_DIVISION), TIERS.length - 1);
  return TIERS[Math.max(0, divIndex)];
}

export function getLPInDivision(totalLP) {
  return totalLP % LP_PER_DIVISION;
}

export function getTotalLP(tierId, lp) {
  const tier = getTierById(tierId);
  return (tier.division - 1) * LP_PER_DIVISION + lp;
}

// Calculate LP gain/loss based on rival rank difference
export function calculateLPChange(winnerTotalLP, loserTotalLP, isDraw = false) {
  const diff = loserTotalLP - winnerTotalLP;
  const base = isDraw ? 5 : 25;
  // Bonus/penalty based on rank difference
  const modifier = Math.round(diff / 100) * 3;
  const gain = Math.max(5, Math.min(45, base + modifier));
  return gain;
}

// Competition scoring
export const COMPETITION_POINTS = {
  champions_league: 10,
  liga: 6,
  europa_league: 5,
  libertadores: 5,
  conference: 3,
  sudamericana: 3,
  copa: 3,
  supercopa: 1,
};

export function calculateMatchPoints(results) {
  if (!results) return 0;
  let points = 0;
  // Competition trophies
  if (results.championsLeague) points += COMPETITION_POINTS.champions_league;
  if (results.liga) points += COMPETITION_POINTS.liga;
  if (results.europaLeague) points += COMPETITION_POINTS.europa_league;
  if (results.libertadores) points += COMPETITION_POINTS.libertadores;
  if (results.conference) points += COMPETITION_POINTS.conference;
  if (results.sudamericana) points += COMPETITION_POINTS.sudamericana;
  if (results.copa) points += COMPETITION_POINTS.copa;
  if (results.supercopa) points += COMPETITION_POINTS.supercopa;
  // Cup round bonus (reaching QF+)
  const cupRoundPoints = { 'QF': 1, 'SF': 2, 'Final': 3 };
  if (results.cupRound && cupRoundPoints[results.cupRound]) {
    points += cupRoundPoints[results.cupRound];
  }
  // League position bonus
  if (results.finishedAboveRival) points += 2;
  // H2H bonus (max +2) — recalculate from h2hResults if h2hWins missing
  let h2hWins = results.h2hWins || 0;
  if (!h2hWins && results.h2hResults?.length > 0) {
    h2hWins = results.h2hResults.filter(r => r.goalsFor > r.goalsAgainst).length;
  }
  points += Math.min(2, h2hWins);
  return points;
}

export const DEFAULT_PLAYER_DATA = {
  tier: 'bronze_iii',
  lp: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  matchHistory: [],
};
