// ============================================================
// AUDIT: discipline + injury ratios
// ------------------------------------------------------------
// Regression guard for unrealistic disciplinary/injury outcomes:
// - Goalkeepers must be possible but rare yellow/red recipients.
// - Yellow/red/injury rates must stay in plausible football ranges.
// - A second-yellow dismissal must not add an extra accumulated yellow.
// - A player on 4 accumulated yellows who receives the 5th gets a 1-match ban.
// ============================================================

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const MATCHES = Number(process.env.DISCIPLINE_AUDIT_MATCHES || 1400);
const SEED = Number(process.env.DISCIPLINE_AUDIT_SEED || 20260602);

function mulberry32(initialSeed) {
  let t = initialSeed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function player(name, position, overall = 70, extra = {}) {
  return {
    name,
    position,
    playingPosition: position,
    overall,
    stamina: 78,
    fitness: 100,
    morale: 70,
    age: 24,
    ...extra
  };
}

const STARTERS = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
const BENCH = ['GK', 'CB', 'LB', 'CM', 'CM', 'RW', 'LW', 'ST'];

function makeTeam(id, rating = 70) {
  const starters = STARTERS.map((pos, i) => player(`${id}_${pos}_${i + 1}`, pos, rating + ((i % 3) - 1), { starter: true }));
  const bench = BENCH.map((pos, i) => player(`${id}_SUB_${pos}_${i + 1}`, pos, rating - 3 + (i % 2), { starter: false }));
  return {
    id,
    name: `Audit ${id}`,
    reputation: rating,
    stadiumCapacity: 18000,
    players: [...starters, ...bench]
  };
}

function nameOf(value) {
  return typeof value === 'object' ? value?.name : value;
}

const KNOWN_POSITIONS = new Set(['GK', 'POR', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'CDM', 'DM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF']);

function posFromName(name) {
  // Names are `team_POS_n` / `team_SUB_POS_n`; team ids may contain underscores.
  return String(name || '').split('_').find(part => KNOWN_POSITIONS.has(part)) || 'UNK';
}

function roleFromPosition(pos) {
  if (['GK', 'POR'].includes(pos)) return 'goalkeeper';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB', 'CDM', 'DM'].includes(pos)) return 'defensive';
  if (['ST', 'CF', 'RW', 'LW'].includes(pos)) return 'attacking';
  return 'midfield';
}

function blankSummary(label) {
  return {
    label,
    matches: 0,
    yellows: 0,
    accumulationYellows: 0,
    secondYellowYellows: 0,
    reds: 0,
    directReds: 0,
    secondYellowReds: 0,
    injuries: 0,
    yellowByRole: { goalkeeper: 0, defensive: 0, midfield: 0, attacking: 0 },
    redByRole: { goalkeeper: 0, defensive: 0, midfield: 0, attacking: 0 },
    injuryByRole: { goalkeeper: 0, defensive: 0, midfield: 0, attacking: 0 }
  };
}

function addEvent(summary, event) {
  const name = nameOf(event.player);
  const role = roleFromPosition(posFromName(name));
  if (event.type === 'yellow_card') {
    summary.yellows++;
    if (event.countsForAccumulation === false || event.isSecondYellow) summary.secondYellowYellows++;
    else summary.accumulationYellows++;
    summary.yellowByRole[role] = (summary.yellowByRole[role] || 0) + 1;
  }
  if (event.type === 'red_card') {
    summary.reds++;
    if (event.isSecondYellow || event.reason === 'Segunda amarilla') summary.secondYellowReds++;
    else summary.directReds++;
    summary.redByRole[role] = (summary.redByRole[role] || 0) + 1;
  }
  if (event.type === 'injury') {
    summary.injuries++;
    summary.injuryByRole[role] = (summary.injuryByRole[role] || 0) + 1;
  }
}

function rate(summary, key) {
  return summary[key] / summary.matches;
}

async function runMatchSample(simulateMatch, label, referee, seedOffset) {
  Math.random = mulberry32(SEED + seedOffset);
  const home = makeTeam(`${label}_HOME`, 71);
  const away = makeTeam(`${label}_AWAY`, 70);
  const summary = blankSummary(label);

  for (let i = 0; i < MATCHES; i++) {
    const result = simulateMatch(home.id, away.id, home, away, {
      referee,
      homeTactic: i % 4 === 0 ? 'pressing' : i % 4 === 1 ? 'balanced' : i % 4 === 2 ? 'counter' : 'possession',
      awayTactic: i % 3 === 0 ? 'balanced' : i % 3 === 1 ? 'defensive' : 'attacking',
      grassCondition: 92,
      medicalPrevention: 0.10,
      playerIsHome: true
    }, {}, home.id);
    summary.matches++;
    for (const event of result.events || []) addEvent(summary, event);
  }

  return summary;
}

function assertRange(value, min, max, label) {
  assert.ok(value >= min && value <= max, `${label}: expected ${min}..${max}, got ${value.toFixed(4)}`);
}

function verifySourceFilters() {
  const matchDay = readFileSync('src/components/MatchDay/MatchDay.jsx', 'utf8');
  const office = readFileSync('src/components/Office/Office.jsx', 'utf8');
  assert.ok(matchDay.includes('countsForAccumulation !== false') && matchDay.includes('!e.isSecondYellow'), 'MatchDay excludes second-yellow yellows from accumulated-yellow dispatch');
  assert.ok(office.includes('countsForAccumulation !== false') && office.includes('!e.isSecondYellow'), 'Office batch simulation excludes second-yellow yellows from accumulated-yellow dispatch');
}

function verifyFifthYellowSuspension(gameReducer) {
  const players = [
    player('Four Yellow GK', 'GK', 72, { yellowCards: 4 }),
    ...STARTERS.slice(1).map((pos, i) => player(`Starter_${pos}_${i}`, pos, 70)),
    ...BENCH.map((pos, i) => player(`Bench_${pos}_${i}`, pos, 66))
  ];
  const lineup = Object.fromEntries(players.slice(0, 11).map((p, i) => [`slot${i}`, p]));
  const state = {
    team: { id: 'susp-audit', name: 'Susp Audit', players },
    teamId: 'susp-audit',
    formation: '4-3-3',
    lineup,
    gloryData: { perks: {} }
  };

  const suspendedState = gameReducer(state, {
    type: 'ADD_YELLOW_CARDS',
    payload: { cards: [{ playerName: 'Four Yellow GK' }] }
  });
  const suspendedPlayer = suspendedState.team.players.find(p => p.name === 'Four Yellow GK');
  assert.equal(suspendedPlayer.yellowCards, 0, '5th yellow resets accumulated-card counter');
  assert.equal(suspendedPlayer.suspended, true, '5th yellow marks player as suspended');
  assert.equal(suspendedPlayer.suspensionType, 'yellow', '5th-yellow suspension type is yellow');
  assert.equal(suspendedPlayer.suspensionMatches, 1, '5th yellow creates a one-match ban');
  assert.equal(Object.values(suspendedState.lineup || {}).some(p => p?.name === 'Four Yellow GK'), false, '5th-yellow suspended player is removed from lineup');

  const servedState = gameReducer(suspendedState, { type: 'SERVE_SUSPENSIONS' });
  const servedPlayer = servedState.team.players.find(p => p.name === 'Four Yellow GK');
  assert.equal(servedPlayer.suspended, false, 'one served official match clears yellow suspension');
  assert.equal(servedPlayer.suspensionMatches, 0, 'served yellow suspension has zero matches left');
}

const originalRandom = Math.random;
const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { simulateMatch } = await vite.ssrLoadModule('/src/game/leagueEngine.js');
  const { gameReducer } = await vite.ssrLoadModule('/src/context/GameContext.jsx');

  verifySourceFilters();
  verifyFifthYellowSuspension(gameReducer);

  const neutral = await runMatchSample(simulateMatch, 'neutral', 'neutral', 0);
  const strict = await runMatchSample(simulateMatch, 'strict', 'strict', 100000);
  const lenient = await runMatchSample(simulateMatch, 'lenient', 'lenient', 200000);

  const neutralYellowRate = rate(neutral, 'yellows');
  const neutralRedRate = rate(neutral, 'reds');
  const neutralDirectRedRate = rate(neutral, 'directReds');
  const neutralInjuryRate = rate(neutral, 'injuries');
  const gkYellowShare = neutral.yellowByRole.goalkeeper / Math.max(1, neutral.yellows);
  const gkRedShare = neutral.redByRole.goalkeeper / Math.max(1, neutral.reds);
  const gkInjuryShare = neutral.injuryByRole.goalkeeper / Math.max(1, neutral.injuries);

  assertRange(neutralYellowRate, 3.2, 5.6, 'neutral yellow cards per match');
  assertRange(neutralRedRate, 0.06, 0.35, 'neutral combined red cards per match');
  assertRange(neutralDirectRedRate, 0.02, 0.18, 'neutral direct red cards per match');
  assertRange(neutralInjuryRate, 0.12, 0.34, 'neutral match injuries per match');

  assert.ok(gkYellowShare <= 0.035, `goalkeeper yellow-card share must be rare (got ${(gkYellowShare * 100).toFixed(2)}%)`);
  assert.ok(gkRedShare <= 0.030, `goalkeeper red-card share must be very rare (got ${(gkRedShare * 100).toFixed(2)}%)`);
  assert.ok(gkInjuryShare <= 0.070, `goalkeeper injury share must not dominate (got ${(gkInjuryShare * 100).toFixed(2)}%)`);

  assert.ok(neutral.yellowByRole.defensive > neutral.yellowByRole.attacking, 'defensive/holding roles receive more yellows than attackers');
  assert.ok(strict.yellows / strict.matches > neutralYellowRate, 'strict referee raises yellow-card rate');
  assert.ok(lenient.yellows / lenient.matches < neutralYellowRate, 'lenient referee lowers yellow-card rate');

  // When a second yellow is emitted, that yellow event must be marked out of accumulated cards.
  // The red card still carries the one-match second-yellow reason.
  assert.ok(neutral.secondYellowReds + strict.secondYellowReds + lenient.secondYellowReds > 0, 'sample includes second-yellow dismissals');
  assert.equal(neutral.secondYellowYellows, neutral.secondYellowReds, 'neutral second-yellow yellow events are marked one-for-one with second-yellow reds');
  assert.equal(strict.secondYellowYellows, strict.secondYellowReds, 'strict second-yellow yellow events are marked one-for-one with second-yellow reds');
  assert.equal(lenient.secondYellowYellows, lenient.secondYellowReds, 'lenient second-yellow yellow events are marked one-for-one with second-yellow reds');

  const summary = {
    ok: true,
    marker: 'discipline-ratios-gk-suspension-20260602',
    matchesPerReferee: MATCHES,
    neutral: {
      yellowsPerMatch: Number(neutralYellowRate.toFixed(3)),
      redsPerMatch: Number(neutralRedRate.toFixed(3)),
      directRedsPerMatch: Number(neutralDirectRedRate.toFixed(3)),
      injuriesPerMatch: Number(neutralInjuryRate.toFixed(3)),
      goalkeeperYellowShare: Number(gkYellowShare.toFixed(4)),
      goalkeeperRedShare: Number(gkRedShare.toFixed(4)),
      goalkeeperInjuryShare: Number(gkInjuryShare.toFixed(4)),
      yellowByRole: neutral.yellowByRole,
      redByRole: neutral.redByRole,
      injuryByRole: neutral.injuryByRole,
      secondYellowReds: neutral.secondYellowReds
    },
    strict: { yellowsPerMatch: Number((strict.yellows / strict.matches).toFixed(3)), redsPerMatch: Number((strict.reds / strict.matches).toFixed(3)) },
    lenient: { yellowsPerMatch: Number((lenient.yellows / lenient.matches).toFixed(3)), redsPerMatch: Number((lenient.reds / lenient.matches).toFixed(3)) }
  };
  console.log(JSON.stringify(summary, null, 2));
} finally {
  Math.random = originalRandom;
  await vite.close();
}
