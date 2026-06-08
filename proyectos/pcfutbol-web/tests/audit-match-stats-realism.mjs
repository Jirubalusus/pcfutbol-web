// Audit: final match stats should look like football stats, not fixed arcade
// counters. Run: npm run audit:match-stats-realism

import assert from 'node:assert/strict';
import { simulateMatchV2 } from '../src/game/matchSimulationV2.js';
import { progressiveLiveStat, progressiveLivePossession } from '../src/game/liveMatchStats.js';

const positions = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'ST', 'LW', 'GK', 'CB', 'CM', 'CAM', 'RW', 'ST', 'LB'];

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

const scenarios = [
  {
    home: makeTeam('elite-home', 'Elite', 86, 92),
    away: makeTeam('modest-away', 'Modest', 68, 64),
    context: { homeTactic: 'possession', awayTactic: 'defensive', attendanceFillRate: 0.92 }
  },
  {
    home: makeTeam('mid-home', 'Midhome', 74, 72),
    away: makeTeam('mid-away', 'Midaway', 73, 71),
    context: { homeTactic: 'balanced', awayTactic: 'counter', attendanceFillRate: 0.72 }
  },
  {
    home: makeTeam('press-home', 'Press', 78, 78),
    away: makeTeam('tech-away', 'Tech', 81, 83),
    context: { homeTactic: 'highPress', awayTactic: 'possession', attendanceFillRate: 0.82 }
  },
  {
    home: makeTeam('low-home', 'Lowhome', 62, 58),
    away: makeTeam('low-away', 'Lowaway', 61, 57),
    context: { homeTactic: 'defensive', awayTactic: 'balanced', weather: 'rain', attendanceFillRate: 0.55 }
  }
];

const samples = [];
for (let i = 0; i < 96; i++) {
  const scenario = scenarios[i % scenarios.length];
  samples.push(simulateMatchV2(
    scenario.home.id,
    scenario.away.id,
    scenario.home,
    scenario.away,
    {
      ...scenario.context,
      homeSeasonMomentum: (i % 7) - 3,
      awaySeasonMomentum: 3 - (i % 7),
      importance: i % 11 === 0 ? 'crucial' : 'normal'
    }
  ));
}

const sides = samples.flatMap(match => [
  {
    shots: match.stats.shots.home,
    onTarget: match.stats.shotsOnTarget.home,
    goals: match.homeScore,
    possession: match.stats.possession.home
  },
  {
    shots: match.stats.shots.away,
    onTarget: match.stats.shotsOnTarget.away,
    goals: match.awayScore,
    possession: match.stats.possession.away
  }
]);

const bothSixteenOnTarget = samples.filter(match =>
  match.stats.shotsOnTarget.home >= 14 && match.stats.shotsOnTarget.away >= 14
);
const onTargetEqualsShots = sides.filter(side => side.shots > 0 && side.onTarget === side.shots);
const commonOnTarget = sides.filter(side => side.onTarget >= 2 && side.onTarget <= 7);
const highOnTarget = sides.filter(side => side.onTarget > 9);
const possessions = samples.map(match => match.stats.possession.home);
const uniquePossessions = new Set(possessions);

assert.equal(bothSixteenOnTarget.length, 0, 'both teams should not repeatedly land 14+ shots on target');
assert.ok(onTargetEqualsShots.length <= Math.max(1, Math.floor(sides.length * 0.015)), `on-target equals total shots too often: ${onTargetEqualsShots.length}/${sides.length}`);
assert.ok(commonOnTarget.length / sides.length >= 0.72, 'most teams should finish with 2-7 shots on target');
assert.ok(highOnTarget.length / sides.length <= 0.08, '10+ shots on target should be rare');
assert.ok(sides.every(side => side.onTarget >= side.goals), 'shots on target must be at least goals');
assert.ok(sides.every(side => side.shots >= side.onTarget), 'total shots must be at least shots on target');
assert.ok(sides.every(side => side.shots >= side.goals), 'total shots must be at least goals');
assert.ok(sides.every(side => side.possession >= 35 && side.possession <= 65), 'possession should stay in plausible 35-65 range');
assert.ok(uniquePossessions.size >= 12, `home possession should vary across scenarios, got ${uniquePossessions.size} unique values`);
assert.ok(possessions.some(value => value <= 45) && possessions.some(value => value >= 55), 'possession should reflect different matchups');

const representative = samples.find(match => match.stats.possession.home !== 50) || samples[0];
const fullTime = 90 + (representative.stoppageTime || 5);
const liveMidShots = progressiveLiveStat(representative.stats.shots.home, 0.5, Math.floor(representative.homeScore / 2));
const liveFinalShots = progressiveLiveStat(representative.stats.shots.home, 1, representative.homeScore);
const liveFinalPoss = progressiveLivePossession({
  finalHome: representative.stats.possession.home,
  currentMinute: fullTime,
  fullTimeMinute: fullTime,
  events: representative.events,
  seed: representative.stats.shots.home * 31 + representative.stats.shots.away * 17 + representative.stats.possession.home
});

assert.ok(liveMidShots < representative.stats.shots.home || representative.stats.shots.home <= representative.homeScore, 'live shots should be progressive before full time');
assert.equal(liveFinalShots, representative.stats.shots.home, 'live shots must converge to final shots');
assert.equal(liveFinalPoss.home, representative.stats.possession.home, 'live possession must converge to final possession');
assert.equal(liveFinalPoss.away, representative.stats.possession.away, 'live possession away must converge to final possession');

console.log('✅ Match stats realism audit passed');
