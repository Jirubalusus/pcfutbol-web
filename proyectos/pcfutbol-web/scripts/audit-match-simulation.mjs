import { createServer } from 'vite';

const args = new Map(
  process.argv.slice(2).map(arg => {
    const [key, value = true] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const matchCount = Number(args.get('matches') || 500);
const seed = Number(args.get('seed') || 20260424);
const maxPrintedIssues = Number(args.get('maxIssues') || 25);

function mulberry32(initialSeed) {
  let t = initialSeed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const seededRandom = mulberry32(seed);
const originalRandom = Math.random;
Math.random = seededRandom;

const vite = await createServer({
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom'
});

const { simulateMatch, simulateWeekMatches } = await vite.ssrLoadModule('/src/game/leagueEngine.js');

function createPlayer(name, position, overall, starter = false) {
  return {
    name,
    position,
    overall,
    age: 20 + Math.floor(Math.random() * 16),
    morale: 70,
    fitness: 100,
    starter
  };
}

function createAuditTeam(index, ratingBase) {
  const positions = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'GK', 'CB', 'LB', 'CM', 'CM', 'RW', 'LW', 'ST', 'ST'];
  return {
    id: `audit_team_${index}`,
    name: `Audit Team ${index}`,
    shortName: `AT${index}`,
    reputation: Math.max(45, Math.min(96, ratingBase + 6)),
    stadiumCapacity: 12000 + index * 3500,
    players: positions.map((position, playerIndex) => {
      const starter = playerIndex < 11;
      const drift = starter ? Math.floor(Math.random() * 9) - 3 : Math.floor(Math.random() * 12) - 8;
      return createPlayer(`AT${index} ${position} ${playerIndex + 1}`, position, Math.max(45, Math.min(95, ratingBase + drift)), starter);
    })
  };
}

const teams = Array.from({ length: 20 }, (_, index) => createAuditTeam(index + 1, 58 + Math.floor(index * 1.7)));

const summary = {
  matches: 0,
  goals: 0,
  homeWins: 0,
  awayWins: 0,
  draws: 0,
  highScoreMatches: 0,
  yellowCards: 0,
  redCards: 0,
  injuries: 0,
  extraTime: 0,
  penalties: 0,
  penaltyGoals: 0,
  penaltyMasterMatches: 0,
  penaltyMasterGoals: 0,
  stoppageTimeMatches: 0,
  stoppageTimeGoals: 0,
  pathologicalScorerMatches: 0,
  defenderMultiGoalMatches: 0,
  cpuFixturesPlayed: 0,
  cpuFixtureEvents: 0,
  totalXg: 0,
  bigChances: 0,
  storyLines: 0
};

const hardIssues = [];
const warnings = [];

function playerName(player) {
  return typeof player === 'object' ? player?.name : player;
}

function playerKey(team, player) {
  const name = playerName(player);
  return name ? `${team}:${name}` : null;
}

function playerPosition(player) {
  return typeof player === 'object' ? player?.position : null;
}

function playerPlayingPosition(player) {
  return typeof player === 'object' ? player?.playingPosition : null;
}

function isDefensivePosition(position) {
  return ['CB', 'RB', 'LB', 'RWB', 'LWB', 'GK'].includes((position || '').split(',')[0].trim().toUpperCase());
}

function addIssue(collection, matchIndex, code, message, event = null) {
  collection.push({
    match: matchIndex,
    code,
    message,
    event
  });
}

function validateMatch(result, homeTeam, awayTeam, matchIndex) {
  const events = result.events || [];
  const sentOff = new Map();
  const yellowCounts = new Map();
  const goalCounts = { home: 0, away: 0 };
  const scorerCounts = new Map();
  const scorerMeta = new Map();
  let previousMinute = -Infinity;

  for (const event of events) {
    const minute = Number(event.minute);
    const key = playerKey(event.team, event.player);
    const assistKey = playerKey(event.team, event.assist);

    if (!Number.isInteger(minute) || minute < 1 || minute > 120) {
      addIssue(hardIssues, matchIndex, 'INVALID_MINUTE', `Invalid event minute ${event.minute}`, event);
    }

    if (minute < previousMinute) {
      addIssue(hardIssues, matchIndex, 'EVENT_ORDER', 'Events are not ordered by minute', event);
    }
    previousMinute = minute;

    for (const involvedKey of [key, assistKey]) {
      if (!involvedKey || !sentOff.has(involvedKey)) continue;
      const redMinute = sentOff.get(involvedKey);
      if (minute > redMinute && ['goal', 'yellow_card', 'red_card', 'injury'].includes(event.type)) {
        addIssue(hardIssues, matchIndex, 'SENT_OFF_PLAYER_EVENT', `${involvedKey} has ${event.type} after red card`, event);
      }
    }

    if (event.type === 'goal') {
      goalCounts[event.team]++;
      if (event.goalType === 'penalty') summary.penaltyGoals++;
      if (!result.extraTime && minute > 90) summary.stoppageTimeGoals++;
      if (key) {
        scorerCounts.set(key, (scorerCounts.get(key) || 0) + 1);
        scorerMeta.set(key, {
          position: playerPosition(event.player),
          playingPosition: playerPlayingPosition(event.player)
        });
      }
    }

    if (event.type === 'yellow_card' && key) {
      const nextCount = (yellowCounts.get(key) || 0) + 1;
      yellowCounts.set(key, nextCount);
      if (nextCount > 2) {
        addIssue(hardIssues, matchIndex, 'TOO_MANY_YELLOWS', `${key} has ${nextCount} yellow cards`, event);
      }
      if (sentOff.has(key)) {
        addIssue(hardIssues, matchIndex, 'YELLOW_AFTER_RED', `${key} receives yellow after red`, event);
      }
    }

    if (event.type === 'red_card' && key) {
      if (sentOff.has(key)) {
        addIssue(hardIssues, matchIndex, 'DUPLICATE_RED', `${key} has duplicate red cards`, event);
      }

      const yellows = yellowCounts.get(key) || 0;
      if (event.isSecondYellow || event.reason === 'Segunda amarilla') {
        if (yellows < 2) {
          addIssue(hardIssues, matchIndex, 'SECOND_YELLOW_WITHOUT_TWO_YELLOWS', `${key} red card has only ${yellows} yellow(s)`, event);
        }
      }

      sentOff.set(key, minute);
    }
  }

  if (goalCounts.home !== result.homeScore || goalCounts.away !== result.awayScore) {
    addIssue(
      hardIssues,
      matchIndex,
      'SCORE_EVENT_MISMATCH',
      `${homeTeam.shortName || homeTeam.id} ${result.homeScore}-${result.awayScore} ${awayTeam.shortName || awayTeam.id}, events ${goalCounts.home}-${goalCounts.away}`
    );
  }

  const statsYellowsHome = events.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const statsYellowsAway = events.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const statsRedsHome = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const statsRedsAway = events.filter(e => e.type === 'red_card' && e.team === 'away').length;

  if (result.stats?.yellowCards?.home !== statsYellowsHome || result.stats?.yellowCards?.away !== statsYellowsAway) {
    addIssue(hardIssues, matchIndex, 'YELLOW_STATS_MISMATCH', 'Yellow-card stats do not match events');
  }

  if (result.stats?.redCards?.home !== statsRedsHome || result.stats?.redCards?.away !== statsRedsAway) {
    addIssue(hardIssues, matchIndex, 'RED_STATS_MISMATCH', 'Red-card stats do not match events');
  }

  const stats = result.stats || {};
  const numericStatPairs = [
    ['shots', stats.shots?.home, stats.shots?.away],
    ['shotsOnTarget', stats.shotsOnTarget?.home, stats.shotsOnTarget?.away],
    ['xg', stats.xg?.home, stats.xg?.away],
    ['bigChances', stats.bigChances?.home, stats.bigChances?.away],
    ['saves', stats.saves?.home, stats.saves?.away]
  ];
  for (const [name, homeValue, awayValue] of numericStatPairs) {
    if (!Number.isFinite(Number(homeValue)) || !Number.isFinite(Number(awayValue))) {
      addIssue(hardIssues, matchIndex, 'CHANCE_STATS_MISSING', `${name} is missing or non numeric`, stats);
    }
  }
  if ((stats.shotsOnTarget?.home ?? 0) > (stats.shots?.home ?? 0) || (stats.shotsOnTarget?.away ?? 0) > (stats.shots?.away ?? 0)) {
    addIssue(hardIssues, matchIndex, 'SHOTS_ON_TARGET_OVER_SHOTS', 'Shots on target cannot exceed total shots', stats);
  }
  if ((stats.shotsOnTarget?.home ?? 0) < result.homeScore || (stats.shotsOnTarget?.away ?? 0) < result.awayScore) {
    addIssue(hardIssues, matchIndex, 'GOALS_OVER_SHOTS_ON_TARGET', 'Goals cannot exceed shots on target', stats);
  }
  if (!Array.isArray(stats.matchStory) || stats.matchStory.length === 0) {
    addIssue(warnings, matchIndex, 'MATCH_STORY_MISSING', 'Match story has no explanatory lines', stats.matchStory);
  }

  if (result.penalties && result.homeScore !== result.awayScore) {
    addIssue(hardIssues, matchIndex, 'PENALTIES_WITHOUT_DRAW', 'Penalty shootout exists after a non-draw score');
  }

  if (result.penalties && result.penalties.home === result.penalties.away) {
    addIssue(hardIssues, matchIndex, 'DRAWN_PENALTIES', 'Penalty shootout cannot be tied');
  }

  if (!Number.isInteger(result.stoppageTime) || result.stoppageTime < 1 || result.stoppageTime > 8) {
    addIssue(hardIssues, matchIndex, 'INVALID_STOPPAGE_TIME', `Invalid stoppage time ${result.stoppageTime}`);
  }

  const latestRegulationMinute = Math.max(0, ...events.filter(e => e.minute <= 100).map(e => Number(e.minute) || 0));
  if (!result.extraTime && latestRegulationMinute > 90 && latestRegulationMinute > 90 + (result.stoppageTime || 0)) {
    addIssue(hardIssues, matchIndex, 'STOPPAGE_EVENT_OUT_OF_RANGE', `Event at ${latestRegulationMinute}' with +${result.stoppageTime}`);
  }

  for (const [scorer, goals] of scorerCounts) {
    const team = scorer.split(':')[0];
    const teamGoals = goalCounts[team] || 0;
    const meta = scorerMeta.get(scorer);
    const defensiveScorer = isDefensivePosition(meta?.position) && !['ST', 'CF', 'RW', 'LW', 'CAM'].includes((meta?.playingPosition || '').toUpperCase());
    if (goals >= 4 || (teamGoals >= 4 && goals / teamGoals > 0.75)) {
      summary.pathologicalScorerMatches++;
      addIssue(warnings, matchIndex, 'SCORER_CONCENTRATION', `${scorer} scored ${goals}/${teamGoals} team goals`);
      break;
    }
    if (defensiveScorer && goals >= 2) {
      summary.defenderMultiGoalMatches++;
      addIssue(warnings, matchIndex, 'DEFENDER_MULTI_GOAL', `${scorer} (${meta?.position || '?'}) scored ${goals}/${teamGoals} team goals`);
      break;
    }
  }

  summary.matches++;
  summary.goals += result.homeScore + result.awayScore;
  if (result.homeScore > result.awayScore) summary.homeWins++;
  else if (result.homeScore < result.awayScore) summary.awayWins++;
  else summary.draws++;
  if (result.homeScore + result.awayScore >= 6) summary.highScoreMatches++;
  summary.yellowCards += statsYellowsHome + statsYellowsAway;
  summary.redCards += statsRedsHome + statsRedsAway;
  summary.totalXg += (result.stats?.xg?.home || 0) + (result.stats?.xg?.away || 0);
  summary.bigChances += (result.stats?.bigChances?.home || 0) + (result.stats?.bigChances?.away || 0);
  summary.storyLines += Array.isArray(result.stats?.matchStory) ? result.stats.matchStory.length : 0;
  summary.injuries += events.filter(e => e.type === 'injury').length;
  if (!result.extraTime && (events || []).some(e => Number(e.minute) > 90)) summary.stoppageTimeMatches++;
  if (result.extraTime) summary.extraTime++;
  if (result.penalties) summary.penalties++;
}

for (let i = 0; i < matchCount; i++) {
  const homeIndex = Math.floor(Math.random() * teams.length);
  let awayIndex = Math.floor(Math.random() * teams.length);
  if (awayIndex === homeIndex) awayIndex = (awayIndex + 1) % teams.length;

  const homeTeam = teams[homeIndex];
  const awayTeam = teams[awayIndex];
  const knockout = Math.random() < 0.12;
  const result = simulateMatch(homeTeam.id, awayTeam.id, homeTeam, awayTeam, {
    homeMorale: 45 + Math.floor(Math.random() * 56),
    awayMorale: 45 + Math.floor(Math.random() * 56),
    homeSeasonMomentum: Math.floor(Math.random() * 11) - 5,
    awaySeasonMomentum: Math.floor(Math.random() * 11) - 5,
    homeTactic: ['balanced', 'attacking', 'defensive', 'possession', 'counter'][Math.floor(Math.random() * 5)],
    awayTactic: ['balanced', 'attacking', 'defensive', 'possession', 'counter'][Math.floor(Math.random() * 5)],
    referee: ['neutral', 'strict', 'lenient'][Math.floor(Math.random() * 3)],
    knockout,
    grassCondition: 55 + Math.floor(Math.random() * 46),
    attendanceFillRate: 0.35 + Math.random() * 0.65
  }, {}, null);

  validateMatch(result, homeTeam, awayTeam, i + 1);
}

const penaltyMasterProbeMatches = 200;
for (let i = 0; i < penaltyMasterProbeMatches; i++) {
  const homeTeam = teams[i % teams.length];
  const awayTeam = teams[(i + 7) % teams.length];
  const side = i % 2 === 0 ? 'home' : 'away';
  const result = simulateMatch(homeTeam.id, awayTeam.id, homeTeam, awayTeam, {
    homeMorale: 70,
    awayMorale: 70,
    homeTactic: 'balanced',
    awayTactic: 'balanced',
    referee: 'neutral',
    penaltyMaster: side
  }, {}, side === 'home' ? homeTeam.id : awayTeam.id);
  const sidePenaltyGoals = (result.events || []).filter(e => e.type === 'goal' && e.team === side && e.goalType === 'penalty').length;
  if (sidePenaltyGoals > 0) {
    summary.penaltyMasterMatches++;
    summary.penaltyMasterGoals += sidePenaltyGoals;
  }
  validateMatch(result, homeTeam, awayTeam, `penalty-master-${i + 1}`);
}
if (summary.penaltyMasterMatches <= 0) {
  addIssue(hardIssues, 'penalty-master', 'PENALTY_MASTER_NOT_OBSERVED', 'Penalty Master never produced a penalty goal in probe matches');
}

const cpuFixtures = [
  { week: 1, homeTeam: teams[0].id, awayTeam: teams[1].id, played: false },
  { week: 1, homeTeam: teams[2].id, awayTeam: teams[3].id, played: false },
  { week: 1, homeTeam: teams[4].id, awayTeam: teams[5].id, played: false },
  { week: 1, homeTeam: teams[6].id, awayTeam: teams[7].id, played: false }
];
const cpuTable = teams.map(team => ({
  teamId: team.id,
  teamName: team.name,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
  homeForm: [],
  awayForm: [],
  morale: 70,
  streak: 0
}));
const cpuWeek = simulateWeekMatches(cpuFixtures, cpuTable, 1, teams[19].id, teams);
const playedCpuFixtures = cpuWeek.fixtures.filter(f => f.played);
summary.cpuFixturesPlayed = playedCpuFixtures.length;
summary.cpuFixtureEvents = playedCpuFixtures.reduce((sum, f) => sum + (f.events?.length || 0), 0);
if (playedCpuFixtures.length !== cpuFixtures.length) {
  addIssue(hardIssues, 'cpu-week', 'CPU_FIXTURES_NOT_PLAYED', `Expected ${cpuFixtures.length}, got ${playedCpuFixtures.length}`);
}
playedCpuFixtures.forEach((fixture, idx) => {
  if (!Number.isInteger(fixture.homeScore) || !Number.isInteger(fixture.awayScore)) {
    addIssue(hardIssues, 'cpu-week', 'CPU_SCORE_MISSING', 'CPU fixture has no score', fixture);
  }
  if (!Array.isArray(fixture.events) || !fixture.stats || !Number.isInteger(fixture.stoppageTime)) {
    addIssue(hardIssues, 'cpu-week', 'CPU_EVENTS_STATS_MISSING', 'CPU fixture has no events/stats/stoppage payload', fixture);
  }
  const homeTeam = teams.find(t => t.id === fixture.homeTeam);
  const awayTeam = teams.find(t => t.id === fixture.awayTeam);
  validateMatch({
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    events: fixture.events || [],
    stats: fixture.stats || {},
    stoppageTime: fixture.stoppageTime
  }, homeTeam, awayTeam, `cpu-${idx + 1}`);
});

await vite.close();
Math.random = originalRandom;

const report = {
  seed,
  dataSet: 'synthetic-audit-squads',
  ...summary,
  avgGoals: Number((summary.goals / summary.matches).toFixed(2)),
  homeWinPct: Number((summary.homeWins / summary.matches * 100).toFixed(1)),
  drawPct: Number((summary.draws / summary.matches * 100).toFixed(1)),
  awayWinPct: Number((summary.awayWins / summary.matches * 100).toFixed(1)),
  highScorePct: Number((summary.highScoreMatches / summary.matches * 100).toFixed(1)),
  avgYellows: Number((summary.yellowCards / summary.matches).toFixed(2)),
  avgReds: Number((summary.redCards / summary.matches).toFixed(2)),
  avgInjuries: Number((summary.injuries / summary.matches).toFixed(2)),
  avgXg: Number((summary.totalXg / summary.matches).toFixed(2)),
  avgBigChances: Number((summary.bigChances / summary.matches).toFixed(2)),
  avgStoryLines: Number((summary.storyLines / summary.matches).toFixed(2)),
  penaltyGoalPct: Number((summary.penaltyGoals / Math.max(1, summary.goals) * 100).toFixed(1)),
  stoppageGoalPct: Number((summary.stoppageTimeGoals / Math.max(1, summary.goals) * 100).toFixed(1)),
  hardIssueCount: hardIssues.length,
  warningCount: warnings.length
};

if (report.avgGoals < 2.35 || report.avgGoals > 3.05) {
  addIssue(warnings, 'aggregate', 'AVG_GOALS_RANGE', `Average goals ${report.avgGoals} outside target 2.35-3.05`);
}
if (report.highScorePct > 10) {
  addIssue(warnings, 'aggregate', 'HIGH_SCORE_RATE', `High-score matches ${report.highScorePct}% above target <=10%`);
}
if (report.penaltyGoalPct < 5 || report.penaltyGoalPct > 14) {
  addIssue(warnings, 'aggregate', 'PENALTY_GOAL_RATE', `Penalty goals ${report.penaltyGoalPct}% outside target 5-14%`);
}
if (summary.stoppageTimeGoals <= 0) {
  addIssue(hardIssues, 'aggregate', 'NO_STOPPAGE_GOALS', 'No goals after 90 minutes were generated');
}
report.hardIssueCount = hardIssues.length;
report.warningCount = warnings.length;

console.log('Simulation audit summary');
console.table(report);

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}, showing ${Math.min(maxPrintedIssues, warnings.length)}):`);
  console.table(warnings.slice(0, maxPrintedIssues));
}

if (hardIssues.length > 0) {
  console.error(`\nHard invariant failures (${hardIssues.length}, showing ${Math.min(maxPrintedIssues, hardIssues.length)}):`);
  console.table(hardIssues.slice(0, maxPrintedIssues));
  process.exitCode = 1;
} else {
  console.log('\nNo hard invariant failures detected.');
}
