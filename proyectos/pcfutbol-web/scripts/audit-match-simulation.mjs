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

const { simulateMatch } = await vite.ssrLoadModule('/src/game/leagueEngine.js');

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
  yellowCards: 0,
  redCards: 0,
  injuries: 0,
  extraTime: 0,
  penalties: 0,
  pathologicalScorerMatches: 0
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
      if (key) scorerCounts.set(key, (scorerCounts.get(key) || 0) + 1);
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

  if (result.penalties && result.homeScore !== result.awayScore) {
    addIssue(hardIssues, matchIndex, 'PENALTIES_WITHOUT_DRAW', 'Penalty shootout exists after a non-draw score');
  }

  if (result.penalties && result.penalties.home === result.penalties.away) {
    addIssue(hardIssues, matchIndex, 'DRAWN_PENALTIES', 'Penalty shootout cannot be tied');
  }

  for (const [scorer, goals] of scorerCounts) {
    const team = scorer.split(':')[0];
    const teamGoals = goalCounts[team] || 0;
    if (goals >= 4 || (teamGoals >= 4 && goals / teamGoals > 0.75)) {
      summary.pathologicalScorerMatches++;
      addIssue(warnings, matchIndex, 'SCORER_CONCENTRATION', `${scorer} scored ${goals}/${teamGoals} team goals`);
      break;
    }
  }

  summary.matches++;
  summary.goals += result.homeScore + result.awayScore;
  summary.yellowCards += statsYellowsHome + statsYellowsAway;
  summary.redCards += statsRedsHome + statsRedsAway;
  summary.injuries += events.filter(e => e.type === 'injury').length;
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

await vite.close();
Math.random = originalRandom;

const report = {
  seed,
  dataSet: 'synthetic-audit-squads',
  ...summary,
  avgGoals: Number((summary.goals / summary.matches).toFixed(2)),
  avgYellows: Number((summary.yellowCards / summary.matches).toFixed(2)),
  avgReds: Number((summary.redCards / summary.matches).toFixed(2)),
  hardIssueCount: hardIssues.length,
  warningCount: warnings.length
};

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
