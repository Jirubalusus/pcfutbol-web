// Audit: scoreline realism. A football match CAN finish 0-0, and scoreless
// draws must arise naturally from the simulation model (low xG, tense/cagey
// games, defensive sides) — never forced, never impossible. Drawn matches must
// also be varied (0-0, 1-1, 2-2, the odd 3-3) instead of almost always 1-1.
// Run: npm run audit:match-scoreline-realism

import assert from 'node:assert/strict';
import { simulateMatchV2 } from '../src/game/matchSimulationV2.js';

const positions = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'ST', 'LW', 'GK', 'CB', 'CM', 'CAM', 'RW', 'ST', 'LB'];
const DEFENSIVE_POSITIONS = new Set(['GK', 'POR', 'RB', 'LB', 'CB']);

const makeTeam = (id, name, baseOverall, reputation) => ({
  id,
  name,
  shortName: name.slice(0, 3).toUpperCase(),
  reputation,
  players: positions.map((position, index) => ({
    id: `${id}-${index}`,
    name: `${name} ${index + 1}`,
    position,
    overall: Math.max(45, Math.min(95, baseOverall + ((index % 5) - 2)))
  }))
});

function sample(home, away, context, n) {
  const counts = {};
  let goalless = 0;
  let draws = 0;
  let totalGoals = 0;
  const goallessMatches = [];
  for (let i = 0; i < n; i++) {
    const match = simulateMatchV2(home.id, away.id, home, away, { ...context });
    const key = `${match.homeScore}-${match.awayScore}`;
    counts[key] = (counts[key] || 0) + 1;
    if (match.homeScore === match.awayScore) draws++;
    if (match.homeScore === 0 && match.awayScore === 0) {
      goalless++;
      if (goallessMatches.length < 40) goallessMatches.push(match);
    }
    totalGoals += match.homeScore + match.awayScore;
  }
  return { counts, goalless, draws, totalGoals, n, goallessMatches };
}

const balanced = sample(
  makeTeam('bal-home', 'Balhome', 74, 72),
  makeTeam('bal-away', 'Balaway', 73, 71),
  { homeTactic: 'balanced', awayTactic: 'balanced' },
  9000
);
const eliteWeak = sample(
  makeTeam('elite-home', 'Elite', 86, 92),
  makeTeam('weak-away', 'Weak', 64, 60),
  { homeTactic: 'possession', awayTactic: 'defensive', attendanceFillRate: 0.92 },
  9000
);
const defensiveRain = sample(
  makeTeam('def-home', 'Defhome', 62, 58),
  makeTeam('def-away', 'Defaway', 61, 57),
  { homeTactic: 'defensive', awayTactic: 'defensive', weather: 'rain' },
  6000
);

const balancedZero = balanced.goalless / balanced.n;
const eliteZero = eliteWeak.goalless / eliteWeak.n;
const defensiveZero = defensiveRain.goalless / defensiveRain.n;
const balancedAvg = balanced.totalGoals / balanced.n;

const drawZeroShare = balanced.goalless / balanced.draws;
const oneOne = (balanced.counts['1-1'] || 0) / balanced.draws;
const twoTwo = (balanced.counts['2-2'] || 0) / balanced.draws;

console.log('Balanced  :', `0-0 ${(balancedZero * 100).toFixed(1)}%`, `draws ${(100 * balanced.draws / balanced.n).toFixed(1)}%`, `avgGoals ${balancedAvg.toFixed(2)}`);
console.log('  draw mix:', `0-0 ${(drawZeroShare * 100).toFixed(0)}%`, `1-1 ${(oneOne * 100).toFixed(0)}%`, `2-2 ${(twoTwo * 100).toFixed(0)}%`);
console.log('EliteWeak :', `0-0 ${(eliteZero * 100).toFixed(1)}%`);
console.log('Defensive :', `0-0 ${(defensiveZero * 100).toFixed(1)}%`);

// 1) 0-0 must be possible.
assert.ok(balanced.goalless > 0, '0-0 must occur for balanced teams over a large sample');
assert.ok(defensiveRain.goalless > 0, '0-0 must occur for cagey defensive matches');

// 2) Balanced normal teams: roughly 5-10%, with generous tolerance for RNG.
assert.ok(balancedZero >= 0.035 && balancedZero <= 0.12,
  `balanced 0-0 rate should be football-like (~5-10%), got ${(balancedZero * 100).toFixed(1)}%`);

// 3) Open elite-vs-weak mismatches: 0-0 should be rarer than balanced — the
//    favourite usually breaks the deadlock.
assert.ok(eliteZero < balancedZero,
  `elite-vs-weak 0-0 (${(eliteZero * 100).toFixed(1)}%) should be rarer than balanced (${(balancedZero * 100).toFixed(1)}%)`);

// 4) Cagey defensive / bad-weather matches: 0-0 can be higher, but still bounded.
assert.ok(defensiveZero > balancedZero && defensiveZero <= 0.40,
  `defensive/rain 0-0 (${(defensiveZero * 100).toFixed(1)}%) should be higher than balanced but not dominate`);

// 5) Draws must be varied: 0-0 is a real share, and 1-1 must not be almost everything.
assert.ok(drawZeroShare >= 0.10, `0-0 should be a meaningful share of draws, got ${(drawZeroShare * 100).toFixed(0)}%`);
assert.ok(oneOne <= 0.72, `draws should not be almost always 1-1, got ${(oneOne * 100).toFixed(0)}%`);
assert.ok(twoTwo >= 0.08, `2-2 draws should still happen, got ${(twoTwo * 100).toFixed(0)}%`);

// 6) Average goals must stay football-like (no overcorrection towards boredom).
assert.ok(balancedAvg >= 1.9 && balancedAvg <= 3.2,
  `balanced average goals should stay football-like, got ${balancedAvg.toFixed(2)}`);

// 7) A 0-0 match must be internally coherent: no goal events, shots>=onTarget>=0,
//    and no goalscorer MOTM (MOTM may be a GK/defender or null).
for (const match of balanced.goallessMatches) {
  assert.equal(match.homeScore, 0);
  assert.equal(match.awayScore, 0);
  const goalEvents = match.events.filter(e => e.type === 'goal');
  assert.equal(goalEvents.length, 0, '0-0 match must contain no goal events');
  for (const side of ['home', 'away']) {
    assert.ok(match.stats.shots[side] >= match.stats.shotsOnTarget[side], 'shots must be >= shots on target');
    assert.ok(match.stats.shotsOnTarget[side] >= 0, 'shots on target must be >= 0');
  }
  if (match.motm) {
    assert.equal(match.motm.goals, 0, '0-0 MOTM cannot have scored');
    assert.ok(match.motm.assists === 0, '0-0 MOTM cannot have assisted');
  }
}

console.log('✅ Match scoreline realism audit passed');
