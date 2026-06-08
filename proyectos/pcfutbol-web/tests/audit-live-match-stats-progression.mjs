// Audit: live MatchDay shots / shots-on-target counters must progress with the
// clock instead of showing the final aggregate totals from the first tick.
//
// Regression guard for the bug where the EN DIRECTO scoreboard showed e.g.
// "Tiros 18/18, A puerta 7/7" at minute 6 with a 0-0 scoreline and the event
// feed still saying "El partido está arrancando".
//
// Run: npm run audit:live-match-stats

import { progressiveLiveStat, progressiveLiveXg, progressiveLivePossession, buildMomentumBuckets, deriveLivePlayerRatings } from '../src/game/liveMatchStats.js';

let failures = 0;
const check = (label, cond, detail) => {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

// Representative final stats from the reported screenshot.
const FINAL = { shots: 18, onTarget: 7 };
const FULL_TIME = 95; // 90 + 5 stoppage
const progressAt = (minute) => Math.max(0, Math.min(1, minute / FULL_TIME));

console.log('1) Kickoff is empty');
check('shots at minute 0 are 0', progressiveLiveStat(FINAL.shots, progressAt(0), 0) === 0);
check('on-target at minute 0 are 0', progressiveLiveStat(FINAL.onTarget, progressAt(0), 0) === 0);

console.log('2) Minute 6 is low, never the full total');
const shots6 = progressiveLiveStat(FINAL.shots, progressAt(6), 0);
const onTarget6 = progressiveLiveStat(FINAL.onTarget, progressAt(6), 0);
check(`shots at 6' (${shots6}) well below final ${FINAL.shots}`, shots6 < FINAL.shots && shots6 <= 3, `got ${shots6}`);
check(`on-target at 6' (${onTarget6}) well below final ${FINAL.onTarget}`, onTarget6 < FINAL.onTarget && onTarget6 <= 2, `got ${onTarget6}`);

console.log('3) Monotonic non-decreasing across the match');
let prevShots = -1;
let prevOnTarget = -1;
let monotonic = true;
for (let m = 0; m <= FULL_TIME; m += 1) {
  const s = progressiveLiveStat(FINAL.shots, progressAt(m), 0);
  const o = progressiveLiveStat(FINAL.onTarget, progressAt(m), 0);
  if (s < prevShots || o < prevOnTarget) { monotonic = false; break; }
  prevShots = s;
  prevOnTarget = o;
}
check('values never decrease as the clock advances', monotonic);

console.log('4) Converges to the real totals at full time');
check('shots at full time equal final total', progressiveLiveStat(FINAL.shots, progressAt(FULL_TIME), 0) === FINAL.shots);
check('on-target at full time equal final total', progressiveLiveStat(FINAL.onTarget, progressAt(FULL_TIME), 0) === FINAL.onTarget);
check('progress > 1 still clamps to final total', progressiveLiveStat(FINAL.shots, progressAt(120), 0) === FINAL.shots);

console.log('5) Goals floor: a scored goal counts as a shot and an on-target shot');
// Early goal: minute 8, 1 goal already scored, but final on-target is small.
const earlyOnTarget = progressiveLiveStat(5, progressAt(8), 1); // floor = goals = 1
check('on-target >= goals scored so far', earlyOnTarget >= 1, `got ${earlyOnTarget}`);
const earlyShots = Math.max(progressiveLiveStat(9, progressAt(8), 1), earlyOnTarget);
check('shots >= on-target (>= goals)', earlyShots >= earlyOnTarget, `shots ${earlyShots} < onTarget ${earlyOnTarget}`);

console.log('6) Defensive: result never exceeds max(final, floor)');
check('mid-match value within cap', progressiveLiveStat(2, 0.99, 9) <= Math.max(2, 9));
check('cap = max(final, floor) at full time', progressiveLiveStat(2, 1, 9) === 9);

console.log('7) Handles missing / undefined stats gracefully');
check('undefined final -> 0', progressiveLiveStat(undefined, 0.5, 0) === 0);
check('null final with goal floor -> floor', progressiveLiveStat(null, 0.5, 1) === 1);

console.log('8) Momentum chart buckets are progressive and deterministic');
const momEvents = [
  { type: 'goal', team: 'home', minute: 12 },
  { type: 'goal', team: 'away', minute: 67 }
];
const momArgs = { fullTimeMinute: 95, possessionHome: 58, events: momEvents, seed: 1234 };
const momEarly = buildMomentumBuckets({ ...momArgs, currentMinute: 10 });
const momLate = buildMomentumBuckets({ ...momArgs, currentMinute: 90 });
check('chart exposes a fixed number of buckets', momEarly.length === momLate.length && momEarly.length > 0);
check('early in the match most buckets are still inactive', momEarly.filter(b => b.active).length < momLate.filter(b => b.active).length);
check('later in the match more buckets have filled in', momLate.filter(b => b.active).length >= momEarly.filter(b => b.active).length);
check('inactive buckets carry no momentum value', momEarly.every(b => b.active || b.value === 0));
check('values stay within [-100, 100]', momLate.every(b => b.value >= -100 && b.value <= 100));
const momLateRepeat = buildMomentumBuckets({ ...momArgs, currentMinute: 90 });
check('same inputs produce identical buckets (deterministic)', JSON.stringify(momLate) === JSON.stringify(momLateRepeat));
const homeGoalBucket = momLate.find(b => b.goals.includes('home'));
const awayGoalBucket = momLate.find(b => b.goals.includes('away'));
check('home goal is marked in its time bucket and leans home (>0)', !!homeGoalBucket && homeGoalBucket.value > 0);
check('away goal is marked in its time bucket and leans away (<0)', !!awayGoalBucket && awayGoalBucket.value < 0);
const activeValues = momLate.filter(b => b.active).map(b => b.value);
let longestSameSignRun = 0;
let currentRun = 0;
let lastSign = 0;
activeValues.forEach(value => {
  const sign = value > 8 ? 1 : value < -8 ? -1 : 0;
  if (sign !== 0 && sign === lastSign) currentRun += 1;
  else currentRun = sign === 0 ? 0 : 1;
  lastSign = sign;
  longestSameSignRun = Math.max(longestSameSignRun, currentRun);
});
check('momentum has multi-bucket dominance runs, not isolated noise', longestSameSignRun >= 2, `longest run ${longestSameSignRun}`);

console.log('9) Live possession moves smoothly and converges');
const possArgs = { finalHome: 61, fullTimeMinute: 95, events: momEvents, seed: 1234 };
const poss0 = progressiveLivePossession({ ...possArgs, currentMinute: 0 });
const poss25 = progressiveLivePossession({ ...possArgs, currentMinute: 25 });
const poss55 = progressiveLivePossession({ ...possArgs, currentMinute: 55 });
const poss95 = progressiveLivePossession({ ...possArgs, currentMinute: 95 });
check('possession starts near neutral', poss0.home >= 45 && poss0.home <= 55, `got ${poss0.home}`);
check('possession changes during live play', new Set([poss0.home, poss25.home, poss55.home]).size > 1, `${poss0.home}/${poss25.home}/${poss55.home}`);
check('live possession stays plausible', [poss0, poss25, poss55].every(p => p.home >= 34 && p.home <= 66 && p.home + p.away === 100));
check('full time possession equals final stat', poss95.home === 61 && poss95.away === 39, `got ${poss95.home}/${poss95.away}`);

console.log('10) Live player ratings are deterministic, sorted and event-aware');
const lineup = [
  { name: 'Keeper', overall: 80, position: 'GK' },
  { name: 'Scorer', overall: 72, position: 'ST' },
  { name: 'Booked', overall: 78, position: 'CB' }
];
const ratingEvents = [
  { type: 'goal', team: 'home', minute: 30, player: { name: 'Scorer' } },
  { type: 'yellow_card', team: 'home', minute: 40, player: { name: 'Booked' } }
];
const ratedA = deriveLivePlayerRatings(lineup, ratingEvents, 'home', 0.6);
const ratedB = deriveLivePlayerRatings(lineup, ratingEvents, 'home', 0.6);
check('ratings are deterministic across calls', JSON.stringify(ratedA) === JSON.stringify(ratedB));
check('output is sorted best-first', ratedA.every((p, i) => i === 0 || ratedA[i - 1].rating >= p.rating));
const scorer = ratedA.find(p => p.name === 'Scorer');
const noEventBaseline = deriveLivePlayerRatings(lineup, [], 'home', 0.6).find(p => p.name === 'Scorer');
check('a goal boosts the scorer rating', scorer.rating > noEventBaseline.rating && scorer.goals === 1);
const bookedWith = ratedA.find(p => p.name === 'Booked');
const bookedWithout = deriveLivePlayerRatings(lineup, [], 'home', 0.6).find(p => p.name === 'Booked');
check('a yellow card lowers the booked player rating', bookedWith.rating < bookedWithout.rating);
check('ratings stay within the 4.5–10 band', ratedA.every(p => p.rating >= 4.5 && p.rating <= 10));
check('empty lineup yields no ratings', deriveLivePlayerRatings([], ratingEvents, 'home', 0.5).length === 0);

console.log('11) Live xG (goles esperados) starts low, keeps decimals and converges');
const FINAL_XG = 1.8;
check('xG at minute 0 is 0', progressiveLiveXg(FINAL_XG, progressAt(0), 0) === 0);
const xg6 = progressiveLiveXg(FINAL_XG, progressAt(6), 0);
check(`xG at 6' (${xg6}) well below final ${FINAL_XG}`, xg6 < FINAL_XG && xg6 <= 0.4, `got ${xg6}`);
let prevXg = -1;
let xgMonotonic = true;
for (let m = 0; m <= FULL_TIME; m += 1) {
  const x = progressiveLiveXg(FINAL_XG, progressAt(m), 0);
  if (x < prevXg - 1e-9) { xgMonotonic = false; break; }
  prevXg = x;
}
check('xG never decreases as the clock advances', xgMonotonic);
check('xG keeps a tenths-scale decimal (not integer-rounded)', progressiveLiveXg(1.5, 0.5, 0) === 0.8, `got ${progressiveLiveXg(1.5, 0.5, 0)}`);
check('xG at full time equals the final stat', progressiveLiveXg(FINAL_XG, progressAt(FULL_TIME), 0) === FINAL_XG);
check('progress > 1 still clamps xG to the final total', progressiveLiveXg(FINAL_XG, progressAt(120), 0) === FINAL_XG);
// A goal scored early must NOT snap xG to 1.0 — xG is chance quality, not goals.
const xgEarlyGoal = progressiveLiveXg(1.6, progressAt(8), 1 * 0.3); // 1 goal, modest floor
check('an early goal does not force xG to 1.0', xgEarlyGoal < 1.0 && xgEarlyGoal >= 0.3, `got ${xgEarlyGoal}`);
check('xG floor never exceeds the real final total', progressiveLiveXg(0.5, 0.1, 3 * 0.3) <= 0.5, `got ${progressiveLiveXg(0.5, 0.1, 3 * 0.3)}`);
check('undefined final xG -> 0', progressiveLiveXg(undefined, 0.5, 0) === 0);

if (failures > 0) {
  console.error(`\n❌ ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\n✅ Live match stats progression audit passed');
