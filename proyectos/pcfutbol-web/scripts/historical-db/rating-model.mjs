#!/usr/bin/env node
/**
 * Historical rating factory for PC Gaffer.
 *
 * Ratings are inferred, not scraped: Transfermarkt gives market value, age,
 * team/league strength and stats. This model turns those signals into a
 * playable overall/potential until a dedicated external ratings source exists.
 */

export const AGE_CURVES = {
  GK:  { peakStart: 28, peakEnd: 34, maxAge: 41, youngPenalty: -3, oldPenalty: -3, potentialBoost: 3 },
  CB:  { peakStart: 26, peakEnd: 32, maxAge: 38, youngPenalty: -3, oldPenalty: -4, potentialBoost: 4 },
  LB:  { peakStart: 24, peakEnd: 30, maxAge: 36, youngPenalty: -2, oldPenalty: -5, potentialBoost: 5 },
  RB:  { peakStart: 24, peakEnd: 30, maxAge: 36, youngPenalty: -2, oldPenalty: -5, potentialBoost: 5 },
  CDM: { peakStart: 25, peakEnd: 32, maxAge: 37, youngPenalty: -2, oldPenalty: -4, potentialBoost: 4 },
  CM:  { peakStart: 24, peakEnd: 31, maxAge: 36, youngPenalty: -2, oldPenalty: -4, potentialBoost: 5 },
  CAM: { peakStart: 23, peakEnd: 30, maxAge: 35, youngPenalty: -1, oldPenalty: -5, potentialBoost: 6 },
  LW:  { peakStart: 22, peakEnd: 29, maxAge: 34, youngPenalty: -1, oldPenalty: -5, potentialBoost: 6 },
  RW:  { peakStart: 22, peakEnd: 29, maxAge: 34, youngPenalty: -1, oldPenalty: -5, potentialBoost: 6 },
  CF:  { peakStart: 24, peakEnd: 30, maxAge: 35, youngPenalty: -1, oldPenalty: -5, potentialBoost: 5 },
  ST:  { peakStart: 24, peakEnd: 31, maxAge: 36, youngPenalty: -1, oldPenalty: -4, potentialBoost: 5 }
};

export const LEAGUE_BASE_BY_TIER = {
  1: 72,
  2: 66,
  3: 59,
  4: 53
};

export const LEAGUE_CAP_BY_TIER = {
  1: 99,
  2: 86,
  3: 79,
  4: 72
};

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function marketValueBonus(value = 0) {
  if (value >= 150_000_000) return 20;
  if (value >= 100_000_000) return 18;
  if (value >= 75_000_000) return 15;
  if (value >= 50_000_000) return 12;
  if (value >= 30_000_000) return 9;
  if (value >= 15_000_000) return 6;
  if (value >= 8_000_000) return 4;
  if (value >= 3_000_000) return 2;
  if (value >= 1_000_000) return 1;
  if (value > 0 && value < 100_000) return -1;
  return 0;
}

export function ageAdjustment(position = 'CM', age = 25) {
  const curve = AGE_CURVES[position] || AGE_CURVES.CM;
  if (age >= curve.peakStart && age <= curve.peakEnd) return 2;
  if (age < curve.peakStart - 4) return curve.youngPenalty - 1;
  if (age < curve.peakStart - 2) return curve.youngPenalty;
  if (age < curve.peakStart) return 0;
  if (age > curve.peakEnd + 5) return curve.oldPenalty - 2;
  if (age > curve.peakEnd + 2) return curve.oldPenalty;
  return -1;
}

export function tableRankAdjustment(rank, totalTeams) {
  if (!rank || !totalTeams) return 0;
  const p = rank / totalTeams;
  if (p <= 0.10) return 5;
  if (p <= 0.20) return 4;
  if (p <= 0.35) return 2;
  if (p >= 0.88) return -3;
  if (p >= 0.75) return -1;
  return 0;
}

export function statsAdjustment(player) {
  const matches = player.matches || 0;
  if (!matches) return 0;
  const goalsPerMatch = (player.goals || 0) / matches;
  const assistsPerMatch = (player.assists || 0) / matches;
  const avgMinutes = (player.minutes || 0) / matches;
  let adj = 0;
  if (['ST', 'CF'].includes(player.position)) {
    if (goalsPerMatch >= 0.7) adj += 5;
    else if (goalsPerMatch >= 0.5) adj += 3;
    else if (goalsPerMatch >= 0.3) adj += 2;
    else if (goalsPerMatch < 0.12 && matches >= 18) adj -= 2;
  } else if (['LW', 'RW', 'CAM'].includes(player.position)) {
    if (goalsPerMatch >= 0.4) adj += 4;
    else if (goalsPerMatch >= 0.25) adj += 2;
    else if (goalsPerMatch >= 0.15) adj += 1;
  } else if (['CM', 'CDM'].includes(player.position)) {
    if (goalsPerMatch >= 0.18) adj += 2;
  }
  if (assistsPerMatch >= 0.35) adj += 4;
  else if (assistsPerMatch >= 0.25) adj += 3;
  else if (assistsPerMatch >= 0.15) adj += 2;
  else if (assistsPerMatch >= 0.10) adj += 1;
  if (avgMinutes >= 75 && matches >= 25) adj += 2;
  else if (avgMinutes >= 60 && matches >= 18) adj += 1;
  else if (avgMinutes < 35 && matches >= 12) adj -= 1;
  return adj;
}

export function inferOverall(player, team, league) {
  const tier = league?.tier || 1;
  let overall = LEAGUE_BASE_BY_TIER[tier] || 68;
  overall += marketValueBonus(player.marketValue || 0);
  overall += ageAdjustment(player.position, player.age || 25);
  overall += tableRankAdjustment(team?.rank, team?.leagueTeamCount || team?.totalTeams);
  overall += statsAdjustment(player);
  return clamp(overall, 42, LEAGUE_CAP_BY_TIER[tier] || 99);
}

export function inferPotential(player, overall, league) {
  const curve = AGE_CURVES[player.position] || AGE_CURVES.CM;
  const age = player.age || 25;
  let potential = overall;
  if (age <= 18) potential += curve.potentialBoost + 7;
  else if (age <= 20) potential += curve.potentialBoost + 5;
  else if (age <= 22) potential += curve.potentialBoost + 3;
  else if (age <= 24) potential += Math.max(2, curve.potentialBoost - 1);
  else if (age <= curve.peakEnd) potential += 1;
  if ((player.marketValue || 0) >= 10_000_000 && age <= 23) potential += 2;
  return clamp(potential, overall, LEAGUE_CAP_BY_TIER[league?.tier || 1] || 99);
}

export function enrichPlayerRatings(player, team, league) {
  const overall = inferOverall(player, team, league);
  const potential = inferPotential(player, overall, league);
  return { ...player, overall, potential, ratingSource: 'inferred_transfermarkt_v1' };
}
